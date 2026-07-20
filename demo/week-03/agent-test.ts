/**
 * 🤖 Demo 2：工具调用 Agent 综合实战
 *
 * 第 3 周收官 Demo — 整合本周全部知识点：
 *   Day 1: Function Calling 机制
 *   Day 2: 工具定义 & JSON Schema
 *   Day 3: Agent 调用循环
 *   Day 4: 多工具编排 & 选择
 *
 * 功能：用户自然语言提问 → Agent 自动选择工具 → 执行 → 返回结果
 * 工具：getWeather / calculate / getCurrentTime / searchWeb / searchCode
 *
 * 使用方式：
 *   cd demo/week-03
 *   npx tsx agent-demo.ts
 *
 * 预设场景（推荐顺序）：
 *   1. 基础工具调用 — 单工具，验证 Function Calling 通不通
 *   2. 工具选择 — 5 个工具，模型选哪个？
 *   3. 并行调用 — 多个独立任务同时执行
 *   4. 条件式编排 — "如果...就..." 的串行推理
 *   5. 自由对话 — 自定义问题，完整 Agent 循环
 */

import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import ollama from 'ollama';

// ============================================================
// 配置
// ============================================================
const MODEL = process.env.MODEL || 'qwen2.5:3b'
const MAX_STEPS = 6;

// ============================================================
// 类型定义
// ============================================================
/** 对话消息 */
interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string,
    tool_call_id?: string
}

/** 工具定义（JSON Schema） */
interface ToolDef {
    type: 'function';
    function: {
        name: string,
        description: string,
        parameters: {
            type: 'object',
            properties: Record<string, {
                type: string,
                description: string,
                enum?: string[],
                items?: { type: string };
            }>
            required: string[]
        }
    }
}

/** 模型返回的工具调用 */
interface ToolCall {
    id: string;
    type: 'function';
    function: { name: string; arguments: Record<string, unknown> };
}

/** Agent 状态快照 */
interface AgentState {
    step: number;
    toolCallsMade: { name: string; args: Record<string, unknown>; result: string }[];
    finalAnswer: string | null;
    totalTimeMs: number;
    totalSteps: number;
}

// ============================================================
// System Prompt
// ============================================================

const SYSTEM_PROMPT = `你是一个智能助手，可以调用工具来完成任务。

工具选择规则：
1. 天气查询 → getWeather（城市名用中文）
2. 数学计算 → calculate（纯数学表达式）
3. 当前时间 → getCurrentTime
4. 外部知识/最新资讯 → searchWeb（React、TypeScript、Node.js 等技术问题）
5. 项目代码查找 → searchCode（函数定义、接口、import 语句等）

调用策略：
- 多个独立任务（如"查A和B的天气"）→ 并行调用，一次返回多个 tool_call
- 条件式任务（如"如果A就B"）→ 串行：先调A，看结果，再决定是否调B
- 收到工具结果后，先判断用户条件是否满足，再决定下一步
- 只调用用户明确需要的工具，不要加无关工具
- 缺少必填参数时先向用户询问`;

// ============================================================
// 工具实现
// ============================================================

function getWeather(city: string): string {
    const data: Record<string, string> = {
        '北京': '晴天，25°C，湿度 45%，风力 3 级',
        '上海': '多云，28°C，湿度 65%，风力 2 级',
        '深圳': '阵雨，30°C，湿度 80%，风力 4 级',
        '杭州': '阴天，22°C，湿度 55%，风力 2 级',
        '成都': '小雨，20°C，湿度 70%，风力 1 级',
    };
    return data[city] ?? `未找到 "${city}" 的天气数据。支持的城市：${Object.keys(data).join('、')}`;
}

function calculate(expr: string): string {
    try {
        // 安全校验：只允许数学表达式字符
        const safe = /^[\d\s+\-*/().%Math.powMath.sqrtMath.absMath.roundMath.floorMath.ceil, ]+$/;
        if (!safe.test(expr)) {
            return `错误：表达式包含不安全的字符。请使用纯数学表达式。`;
        }
        const result = Function(`"use strict"; return (${expr})`)();
        return `${expr} = ${result}`;
    } catch (e) {
        return `计算失败: ${e instanceof Error ? e.message : String(e)}`;
    }
}

function getCurrentTime(): string {
    return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

function searchWeb(query: string): string {
    const mockResults: Record<string, string> = {
        'react': 'React 19（2025 年发布）：Server Components 稳定版、Actions API、use() hook、Suspense 改进、ref 作为 prop。',
        'typescript': 'TypeScript 7.0 最新特性：Decorators 稳定、类型推断增强、ignoreDeprecations 配置、ESM 支持改进。',
        'node': 'Node.js 24 LTS：默认 ESM 模块、原生 WebSocket 客户端、权限模型、原生 SQLite 支持。',
        'ai': '2026 AI Agent 趋势：MCP 协议成为标准、Vercel AI SDK 4.0、多 Agent 协作模式、本地模型推理性能大幅提升。',
    };
    const match = Object.entries(mockResults).find(([k]) => query.toLowerCase().includes(k));
    return match
        ? `🔍 搜索结果（模拟）: "${query}"\n\n${match[1]}\n\n⚠️ 这是模拟数据，实际项目需接入 Tavily/SerpAPI 等真实搜索 API。`
        : `🔍 搜索 "${query}" 暂无结果。\n\n提示：试试搜索 "React"、"TypeScript"、"Node.js"、"AI" 等关键词。`;
}

function searchCode(query: string, lang?: string, maxResults: number = 10): string {
    const demoDir = path.resolve(__dirname || '.');
    const results: string[] = [];

    try {
        const files = fs.readdirSync(demoDir);
        const targetFiles = files.filter(f => {
            if (lang && !f.endsWith(`.${lang}`)) return false;
            return f.endsWith('.ts');
        });

        for (const file of targetFiles) {
            if (results.length >= maxResults) break;
            const content = fs.readFileSync(path.join(demoDir, file), 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                if (results.length >= maxResults) break;
                if (lines[i] && lines[i]!.toLowerCase().includes(query.toLowerCase())) {
                    results.push(`${file}:${i + 1}  ${lines[i]!.trim().slice(0, 100)}`);
                }
            }
        }
    } catch {
        // 文件读取失败，返回模拟数据
        const mock: Record<string, string> = {
            'interface': 'src/types.ts:3  interface Message { role: string; content: string; }',
            'tool': 'agent-loop.ts:27  interface ToolDef { type: "function"; ... }',
            'ollama': 'src/agent.ts:1  import ollama from "ollama";',
            'max_steps': 'agent-loop.ts:52  const MAX_STEPS = 6;',
        };
        const match = Object.entries(mock).find(([k]) => query.toLowerCase().includes(k));
        return match
            ? `📁 找到 "${query}" 的匹配:\n   ${match[1]}`
            : `📁 在项目代码中未找到 "${query}"。`;
    }

    if (results.length === 0) return `📁 在项目代码中未找到 "${query}"。`;
    return `📁 找到 ${results.length} 处 "${query}" 的匹配:\n   ${results.join('\n   ')}`;
}


// ============================================================
// 工具注册表
// ============================================================

const TOOLS: ToolDef[] = [
    {
        type: 'function',
        function: {
            name: 'getWeather',
            description: '获取指定城市的当前天气信息（温度、湿度、天气状况、风力）。城市名用中文，如 "北京"。仅支持中国主要城市。',
            parameters: {
                type: 'object',
                properties: {
                    city: { type: 'string', description: '城市名称，用中文。支持：北京、上海、深圳、杭州、成都' },
                },
                required: ['city'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'calculate',
            description: '计算数学表达式。支持加减乘除、括号、幂运算、Math 函数。输入是纯数学表达式字符串，如 "1234 * 5678"、"Math.sqrt(144)"。',
            parameters: {
                type: 'object',
                properties: {
                    expr: { type: 'string', description: '数学表达式，如 "256 * 128"、"Math.pow(2, 10)"' },
                },
                required: ['expr'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getCurrentTime',
            description: '获取当前日期和时间（中国时区 Asia/Shanghai）。不需要任何参数。',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'searchWeb',
            description: '搜索互联网获取最新信息。适用于：模型知识截止后的内容、最新技术文档、实时资讯。不适用于：查找项目代码、本地文件。与 searchCode 的区别：searchWeb 查外部知识，searchCode 查项目本地代码。',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: '搜索关键词，如 "React 19 新特性"、"TypeScript 最新版本"' },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'searchCode',
            description: '在项目代码库中搜索指定关键词，返回匹配的文件路径、行号和代码片段。适用于：查找函数定义、API 调用方式、类型定义、import 语句。不适用于：查外部知识、最新技术资讯。与 searchWeb 的区别：searchCode 只查本地代码，不访问互联网。',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: '搜索关键词，支持部分匹配。如 "useEffect"、"import.*from"、"interface"、"MAX_STEPS"',
                    },
                    lang: {
                        type: 'string',
                        enum: ['ts', 'tsx', 'js', 'jsx', 'json', 'css'],
                        description: '限定编程语言，不传则搜索所有文件类型',
                    },
                    maxResults: {
                        type: 'integer',
                        description: '最多返回的搜索结果条数，默认 10。范围 1-50',
                    },
                },
                required: ['query'],
            },
        },
    },
]

// ============================================================
// 工具执行器
// ============================================================
function executeTool(name: string, args: Record<string, unknown>): string {
    switch (name) {
        case 'getWeather': return getWeather(args.city as string);
        case 'calculate': return calculate(args.expr as string);
        case 'getCurrentTime': return getCurrentTime();
        case 'searchWeb': return searchWeb(args.query as string);
        case 'searchCode':
            return searchCode(
                args.query as string,
                args.lang as string | undefined,
                args.maxResults as number | undefined,
            );
        default: return `❌ 未知工具: ${name}`;
    }
}

// ============================================================
// 终端美化
// ============================================================

const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m',
};

function hr(text?: string): void {
    if (text) {
        console.log(`\n${C.dim}━━━ ${text} ${'─'.repeat(50 - text.length)}${C.reset}`);
    } else {
        console.log(`${C.dim}${'─'.repeat(56)}${C.reset}`);
    }
}

function box(title: string, content: string, color: string = C.blue): void {
    console.log(`\n${color}┌─ ${title} ${'─'.repeat(50 - title.length)}┐${C.reset}`);
    for (const line of content.trim().split('\n')) {
        console.log(`${color}│${C.reset} ${line}`);
    }
    console.log(`${color}└${'─'.repeat(54)}┘${C.reset}`);
}

function stat(label: string, value: string | number): void {
    console.log(`  ${C.dim}${label}:${C.reset} ${C.bold}${value}${C.reset}`);
}

// ============================================================
// 核心：Agent 循环
// ============================================================

async function agentLoop(userInput: string): Promise<AgentState> {
    const messages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userInput },
    ]

    const state: AgentState = {
        step: 0,
        toolCallsMade: [],
        finalAnswer: null,
        totalTimeMs: 0,
        totalSteps: 0,
    };

    const startTime = Date.now();

    console.log(`\n${C.bold}${'═'.repeat(56)}${C.reset}`);
    console.log(`  🤖 Agent 启动`);
    console.log(`  输入: "${userInput.slice(0, 60)}${userInput.length > 60 ? '...' : ''}"`);
    console.log(`  工具: ${TOOLS.map(t => t.function.name).join(' | ')} (共 ${TOOLS.length} 个)`);
    console.log(`${C.bold}${'═'.repeat(56)}${C.reset}`);

    while (state.step < MAX_STEPS) {
        state.step++;
        console.log(`\n${C.yellow}━━━ Step ${state.step}/${MAX_STEPS} ━━━${C.reset}`);

        // ① 调用模型
        const stepStart = Date.now();
        let response;
        try {
            response = await ollama.chat({ model: MODEL, messages: messages, tools: TOOLS });
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.log(`  ${C.red}❌ 模型调用失败: ${errMsg}${C.reset}`);
            state.finalAnswer = `[错误] 模型调用失败: ${errMsg}`;
            break;
        }

        const stepMs = Date.now() - stepStart;
        console.log(`  ${C.dim}⏱  模型响应: ${stepMs}ms${C.reset}`);

        const toolCalls = response.message.tool_calls as ToolCall[] | undefined;

        // ② 模型直接回答（不需要工具）
        if (!toolCalls || toolCalls.length === 0) {
            console.log(`  ${C.green}✅ 任务完成 — 模型输出最终回答${C.reset}`);
            state.finalAnswer = response.message.content;
            state.totalSteps = state.step;
            state.totalTimeMs = Date.now() - startTime;
            break;
        }

        // ③ 模型想调工具
        const isParallel = toolCalls.length > 1;
        console.log(`  ${C.blue}🔧 请求 ${toolCalls.length} 个工具${isParallel ? ' ⚡并行' : ''}:${C.reset}`);
        for (const tc of toolCalls) {
            console.log(`     → ${C.bold}${tc.function.name}${C.reset}(${JSON.stringify(tc.function.arguments)})`);
        }
        // 保存 assistant 消息
        messages.push(response.message as Message);

        // ④ 执行工具
        if (isParallel) {
            const results = await Promise.all(
                toolCalls.map(async (tc) => {
                    try {
                        const result = executeTool(tc.function.name, tc.function.arguments);
                        console.log(`     ${C.green}←${C.reset} ${tc.function.name}: ${result.slice(0, 60)}${result.length > 60 ? '...' : ''}`);
                        return { tc, result };
                    } catch (err) {
                        const errMsg = err instanceof Error ? err.message : String(err);
                        console.log(`     ${C.red}←${C.reset} ${tc.function.name}: ❌ ${errMsg}`);
                        return { tc, result: `工具执行失败: ${errMsg}` };
                    }
                })
            );

            for (const { tc, result } of results) {
                state.toolCallsMade.push({ name: tc.function.name, args: tc.function.arguments, result });
                messages.push({ role: 'tool', content: result, tool_call_id: tc.id });
            }
        } else {
            const tc = toolCalls[0]!;
            try {
                const result = executeTool(tc.function.name, tc.function.arguments);
                console.log(`     ${C.green}←${C.reset} 结果: ${result.slice(0, 80)}${result.length > 80 ? '...' : ''}`);
                state.toolCallsMade.push({ name: tc.function.name, args: tc.function.arguments, result });
                messages.push({ role: 'tool', content: result, tool_call_id: tc.id });
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                console.log(`     ${C.red}←${C.reset} ❌ ${errMsg}`);
                messages.push({ role: 'tool', content: `工具执行失败: ${errMsg}`, tool_call_id: tc.id });
            }
        }
    }

    // 达到最大步数 → 强制总结
    if (!state.finalAnswer && state.step >= MAX_STEPS) {
        console.log(`\n  ${C.yellow}⚠️  达到最大步数 (${MAX_STEPS})，强制模型总结${C.reset}`);
        try {
            const final = await ollama.chat({
                model: MODEL,
                messages: [...messages, { role: 'user', content: '请基于已有信息给出最终回答，不要再调用工具。' }],
            });
            state.finalAnswer = final.message.content;
        } catch {
            state.finalAnswer = '[错误] 达到最大步数，且无法生成最终回答。';
        }
        state.totalSteps = state.step;
        state.totalTimeMs = Date.now() - startTime;
    }

    return state;
}

// ============================================================
// 预设场景
// ============================================================

async function scene1_basicToolCall(): Promise<void> {
  console.clear();
  console.log(`\n${C.bold}🎬 场景 1：基础工具调用${C.reset}`);
  console.log(`  验证 Function Calling 基本流程是否通畅\n`);
  console.log(`  测试问题：`);
  console.log(`    1. "北京今天天气怎么样？" → 期望调用 getWeather`);
  console.log(`    2. "帮我算一下 256 × 128" → 期望调用 calculate`);
  console.log(`    3. "现在几点了？" → 期望调用 getCurrentTime\n`);

  const tests = [
    { q: '北京今天天气怎么样？', expected: 'getWeather' },
    { q: '帮我算一下 256 × 128 等于多少', expected: 'calculate' },
    { q: '现在几点了？', expected: 'getCurrentTime' },
  ];

  let correct = 0;
  for (const { q, expected } of tests) {
    hr(`测试: "${q}"`);
    const res = await ollama.chat({
      model: MODEL,
      messages: [{ role: 'user', content: q }],
      tools: TOOLS,
    });
    const calls = res.message.tool_calls as ToolCall[] | undefined;
    const actual = calls?.[0]?.function.name;
    const ok = actual === expected;
    if (ok) correct++;
    console.log(`  期望: ${expected}  →  实际: ${actual || '(无工具调用)'}  ${ok ? C.green + '✅' : C.red + '❌'}${C.reset}`);
    if (!ok && actual) {
      console.log(`  ${C.yellow}💡 模型可能因为 description 语义相近而选错${C.reset}`);
    }
  }

  console.log(`\n  ${C.bold}准确率: ${correct}/3${C.reset}`);
}

async function scene2_toolSelection(): Promise<void> {
  console.clear();
  console.log(`\n${C.bold}🎬 场景 2：工具选择 — 5 选 1${C.reset}`);
  console.log(`  测试模型如何从 5 个工具中选出正确的那个\n`);

  const tests = [
    { q: '上海今天天气如何？', expected: 'getWeather' },
    { q: '帮我算一下 1024 × 768', expected: 'calculate' },
    { q: '现在是什么时间？', expected: 'getCurrentTime' },
    { q: 'React 19 有什么新特性？', expected: 'searchWeb' },
    { q: '项目里 ToolDef 接口是怎么定义的？', expected: 'searchCode' },
  ];

  let correct = 0;
  for (const { q, expected } of tests) {
    hr(`"${q}"`);
    const res = await ollama.chat({
      model: MODEL,
      messages: [{ role: 'user', content: q }],
      tools: TOOLS,
    });
    const calls = res.message.tool_calls as ToolCall[] | undefined;
    const actual = calls?.[0]?.function.name;
    const ok = actual === expected;
    if (ok) correct++;
    console.log(`  期望: ${C.bold}${expected}${C.reset}  →  实际: ${actual ? C.bold + actual + C.reset : '(无调用)'}  ${ok ? C.green + '✅' : C.red + '❌'}${C.reset}`);
  }

  console.log(`\n  ${C.bold}准确率: ${correct}/5${C.reset}`);
  if (correct < 5) {
    console.log(`  ${C.yellow}💡 选错通常是 description 区分度不够，尝试在 description 中明确"适用于/不适用于"${C.reset}`);
  }
}

async function scene3_parallelCalls(): Promise<void> {
  console.clear();
  console.log(`\n${C.bold}🎬 场景 3：并行调用${C.reset}`);
  console.log(`  测试模型是否能识别独立任务并一次性发起多个 tool_call\n`);

  const tests = [
    '查一下北京、上海、深圳三个城市的天气',
    '现在几点了？顺便帮我算 1024 × 768',
  ];

  for (const q of tests) {
    hr(`"${q}"`);
    const res = await ollama.chat({
      model: MODEL,
      messages: [{ role: 'user', content: q }],
      tools: TOOLS,
    });
    const calls = res.message.tool_calls as ToolCall[] | undefined;
    if (calls && calls.length > 1) {
      console.log(`  ${C.green}⚡ 并行！${C.reset} 一次返回 ${calls.length} 个 tool_call:`);
      for (const tc of calls) {
        console.log(`     → ${tc.function.name}(${JSON.stringify(tc.function.arguments)})`);
      }
    } else if (calls?.[0]) {
      console.log(`  ${C.yellow}🔧 只有 1 个 tool_call${C.reset}: ${calls[0].function.name}`);
      console.log(`  ${C.dim}💡 3b 小模型并行能力较弱，8b 模型通常能正确并行${C.reset}`);
    } else {
      console.log(`  ${C.red}📝 未调用工具${C.reset}`);
    }
  }
}

async function scene4_conditionalOrchestration(): Promise<void> {
  console.clear();
  console.log(`\n${C.bold}🎬 场景 4：条件式编排 — 完整 Agent 循环${C.reset}`);
  console.log(`  测试模型的串行推理能力："如果...就..."\n`);

  console.log(`  ${C.dim}问题: "查一下深圳天气，如果下雨就帮我算一下需要带多少天伞（假设每天一把）"${C.reset}`);
  console.log(`  ${C.dim}预期: 先调 getWeather("深圳") → 发现是阵雨 → 不满足"需要计算"的条件 → 直接回答${C.reset}\n`);

  const state = await agentLoop('查一下深圳天气，如果下雨就提醒我带伞');

  // 输出结果
  hr('Agent 执行摘要');
  stat('总步数', state.totalSteps);
  stat('总耗时', `${state.totalTimeMs}ms`);
  stat('工具调用', state.toolCallsMade.length);
  for (const tc of state.toolCallsMade) {
    console.log(`     → ${tc.name}(${JSON.stringify(tc.args)}) → ${tc.result.slice(0, 60)}...`);
  }

  box('最终回答', state.finalAnswer || '(无)', C.green);
}

async function scene5_interactive(): Promise<void> {
  console.clear();
  console.log(`\n${C.bold}🎬 场景 5：自由对话${C.reset}`);
  console.log(`  完整的 Agent 循环，你可以输入任意问题\n`);
  console.log(`  ${C.dim}可用工具: getWeather | calculate | getCurrentTime | searchWeb | searchCode${C.reset}`);
  console.log(`  ${C.dim}建议尝试:${C.reset}`);
  console.log(`     • "项目里 MAX_STEPS 设的是多少？"`);
  console.log(`     • "同时查北京和上海天气"`);
  console.log(`     • "搜一下 AI Agent 最新趋势，然后告诉我现在几点"`);
  console.log(`     • "如果北京天气好，就算一下明天出门要带多少钱"`);
  console.log(`  ${C.dim}输入 /back 返回主菜单${C.reset}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  while (true) {
    const input = await new Promise<string>(resolve => rl.question(`${C.bold}💬 > ${C.reset}`, resolve));
    if (!input.trim()) continue;
    if (input.trim() === '/back') break;

    const state = await agentLoop(input.trim());

    hr('执行摘要');
    stat('步数', state.totalSteps);
    stat('耗时', `${state.totalTimeMs}ms`);
    stat('工具调用', state.toolCallsMade.length);

    box('最终回答', state.finalAnswer || '(无)', C.green);
    console.log();
  }

  rl.close();
}

// ============================================================
// 主菜单
// ============================================================

async function main() {
  console.clear();
  console.log(`
${C.bold}${C.blue}╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🤖 Demo 2：工具调用 Agent 综合实战                       ║
║                                                          ║
║   第 3 周收官  ·  Function Calling + Agent 循环 + 多工具编排 ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝${C.reset}
`);
  console.log(`  ${C.dim}模型: ${MODEL}  |  工具: getWeather | calculate | getCurrentTime | searchWeb | searchCode${C.reset}`);
  console.log(`  ${C.dim}工作目录: ${path.resolve(__dirname || '.')}${C.reset}`);
  console.log('');
  console.log('  选择场景（推荐按顺序）：');
  console.log(`    ${C.bold}1${C.reset}. 基础工具调用 — 验证 Function Calling 通不通`);
  console.log(`    ${C.bold}2${C.reset}. 工具选择     — 5 个工具，模型选哪个？`);
  console.log(`    ${C.bold}3${C.reset}. 并行调用     — 多个独立任务同时执行`);
  console.log(`    ${C.bold}4${C.reset}. 条件式编排   — "如果...就..." 完整 Agent 循环`);
  console.log(`    ${C.bold}5${C.reset}. 自由对话     — 自定义问题，交互式 Agent`);
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const choice = await new Promise<string>(resolve => rl.question(`${C.bold}👉 输入数字 (1/2/3/4/5): ${C.reset}`, resolve));
  rl.close();

  console.log('');

  try {
    switch (choice.trim()) {
      case '1': await scene1_basicToolCall(); break;
      case '2': await scene2_toolSelection(); break;
      case '3': await scene3_parallelCalls(); break;
      case '4': await scene4_conditionalOrchestration(); break;
      case '5': await scene5_interactive(); break;
      default: console.log(`${C.red}❌ 无效选择，请输入 1-5${C.reset}`);
    }
  } catch (err) {
    console.error(`\n${C.red}❌ 错误: ${err instanceof Error ? err.message : String(err)}${C.reset}`);
    console.error(`${C.yellow}💡 确保 Ollama 正在运行: ollama serve${C.reset}`);
    process.exit(1);
  }

  console.log(`\n${C.dim}👋 Demo 2 结束。第 3 周完成！下周进入 Agent 核心循环 (ReAct)。${C.reset}\n`);
}

main().catch(err => {
  console.error('启动失败:', err);
  console.error('请确保 Ollama 正在运行: ollama serve');
  process.exit(1);
});