/**
 * Demo 4：多工具编排 — 5 个工具，模型自主选择与编排
 *
 * 功能：测试模型在多个工具间的选择行为、并行调用、工具重叠处理
 * 技术：Node.js + TypeScript + ollama-js
 *
 * 使用方式：
 *   cd demo/week-03
 *   npx tsx multi-tool-orchestration.ts
 *
 * 核心：从"能调工具"升级到"会选工具"——理解模型的选择机制
 */

import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import ollama from 'ollama';

// ============================================================
// 类型定义
// ============================================================

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
}

interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required: string[];
    };
  };
}

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: Record<string, unknown> };
}

// ============================================================
// 配置
// ============================================================

const MAX_STEPS = 6;
const MODEL = process.env.MODEL || 'qwen2.5:3b';

// ============================================================
// System Prompt（增加了工具选择规则）
// ============================================================

const SYSTEM_PROMPT = `你是一个智能助手，可以调用多个工具来完成任务。

工具选择规则：
1. 涉及项目代码的问题（如"XX函数在哪"、"项目里怎么用YY"）→ 用 searchCode
2. 涉及外部知识、最新资讯的问题（如"React 19 新特性"）→ 用 searchWeb
3. 涉及天气、时间、计算的问题 → 用对应的专用工具
4. 如果工具返回空结果，可以尝试换一个工具
5. 只调用用户明确需要的工具，不要自己额外加工具
6. 缺少必填参数时先向用户询问，不要猜测

调用策略（重要！）：
- 如果用户只说"查A和B"（多个独立任务），可以并行调用
- 如果用户说"如果A就B"（条件式），必须串行：先调A，看结果，再决定是否调B
- 收到工具结果后，先判断用户的条件是否满足，再决定下一步
- 用户问什么就调什么，不要加无关工具（比如用户没问时间就别调 getCurrentTime）`;

// ============================================================
// 工具实现
// ============================================================

function getWeather(city: string): string {
  const data: Record<string, string> = {
    '北京': '晴天 25°C 湿度45% 风力3级',
    '上海': '多云 28°C 湿度65% 风力2级',
    '深圳': '阵雨 30°C 湿度80% 风力4级',
    '杭州': '阴天 22°C 湿度55% 风力2级',
    '成都': '小雨 20°C 湿度70% 风力1级',
  };
  return data[city] ?? `未找到 ${city} 的天气数据。支持：${Object.keys(data).join('、')}`;
}

function calculate(expr: string): string {
  try {
    if (!/^[\d\s+\-*/().%Math.powMath.sqrtMath.absMath.roundMath.floorMath.ceil, ]+$/.test(expr)) {
      return `错误：表达式包含不安全的字符。只允许数字、运算符和 Math 函数。`;
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
    'react': 'React 19 于 2025 年发布，主要特性：Server Components 稳定版、Actions、优化 Suspense、use() hook。',
    'typescript': 'TypeScript 7.0 最新特性：Decorators 稳定、类型推断增强、ignoreDeprecations 配置。',
    'node': 'Node.js 24 LTS 最新版本，支持 ESM 默认模块、WebSocket 客户端、权限模型。',
  };
  const match = Object.entries(mockResults).find(([k]) => query.toLowerCase().includes(k));
  return match ? match[1] : `搜索 "${query}" 暂无结果。这是一个模拟搜索，实际项目需接入真实 API。`;
}

/**
 * searchCode — 在项目代码库中搜索
 * 模拟实现：扫描 demo/week-03 目录下的 .ts 文件
 */
function searchCode(query: string, lang?: string, maxResults: number = 10): string {
  const demoDir = path.resolve(__dirname || '.');
  const results: string[] = [];

  try {
    const files = fs.readdirSync(demoDir);
    const tsFiles = files.filter(f => {
      if (lang && !f.endsWith(`.${lang}`)) return false;
      return f.endsWith('.ts');
    });

    for (const file of tsFiles) {
      if (results.length >= maxResults) break;
      const filePath = path.join(demoDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (results.length >= maxResults) break;
        const line = lines[i];
        if (!line) continue;
        if (line.toLowerCase().includes(query.toLowerCase())) {
          results.push(`${file}:${i + 1} — ${line.trim().slice(0, 100)}`);
        }
      }
    }
  } catch {
    // 如果读文件失败，返回模拟数据
    const mockCodebase: Record<string, string> = {
      'usestate':  'src/App.tsx:12 — const [count, setCount] = useState(0);',
      'interface': 'src/types.ts:3 — interface Message { role: string; content: string; }',
      'ollama':    'src/agent.ts:1 — import ollama from "ollama";',
      'tool':      'agent-loop.ts:27 — interface ToolDef { type: "function"; ... }',
    };
    const match = Object.entries(mockCodebase)
      .find(([k]) => query.toLowerCase().includes(k));
    return match
      ? `找到 "${query}" 的匹配:\n${match[1]}`
      : `在项目代码中未找到 "${query}"。`;
  }

  if (results.length === 0) {
    return `在项目代码中未找到 "${query}"。`;
  }

  return `找到 ${results.length} 处 "${query}" 的匹配:\n${results.join('\n')}`;
}

// ============================================================
// 工具注册表（5 个工具）
// ============================================================

const TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'getWeather',
      description: '获取指定城市的当前天气信息，返回温度、湿度、天气状况和风力。城市名用中文，如 "北京"、"上海"。仅支持中国主要城市。',
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
      description: '计算数学表达式。支持加减乘除、括号、幂运算、Math 函数。输入是纯数学表达式字符串。',
      parameters: {
        type: 'object',
        properties: {
          expr: { type: 'string', description: '数学表达式，如 "1234 * 5678"、"Math.sqrt(144)"、"Math.pow(2,10)"' },
        },
        required: ['expr'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCurrentTime',
      description: '获取当前日期和时间（中国时区）。不需要参数。',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchWeb',
      description: '搜索互联网获取最新信息。适用于：模型知识截止后的内容、最新技术文档、实时资讯。不适用于：查找项目代码、本地文件。',
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
      description: '在项目代码库中搜索指定关键词，返回匹配的文件路径、行号和代码片段。适用于：查找函数定义、API 调用、类型定义、import 语句。与 searchWeb 的区别：searchCode 只在项目本地代码中搜索，不访问互联网。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词，支持部分匹配。如 "useEffect"、"import.*from"、"interface"',
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
];

// ============================================================
// 工具执行器
// ============================================================

function executeTool(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'getWeather':     return getWeather(args.city as string);
    case 'calculate':      return calculate(args.expr as string);
    case 'getCurrentTime': return getCurrentTime();
    case 'searchWeb':      return searchWeb(args.query as string);
    case 'searchCode':     return searchCode(args.query as string, args.lang as string | undefined, args.maxResults as number | undefined);
    default:               return `错误：未知工具 ${name}`;
  }
}

// ============================================================
// 核心：Agent 循环（支持并行工具执行）
// ============================================================

async function agentLoop(userInput: string): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userInput },
  ];

  let stepCount = 0;
  const startTime = Date.now();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  🤖 Agent 循环开始`);
  console.log(`  用户输入: "${userInput}"`);
  console.log(`  可用工具: ${TOOLS.map(t => t.function.name).join(', ')} (共 ${TOOLS.length} 个)`);
  console.log(`${'═'.repeat(60)}`);

  while (stepCount < MAX_STEPS) {
    stepCount++;
    console.log(`\n━━━ Step ${stepCount}/${MAX_STEPS} ━━━`);

    // ① 调用模型
    const stepStart = Date.now();
    const response = await ollama.chat({
      model: MODEL,
      messages,
      tools: TOOLS,
    });
    const stepMs = Date.now() - stepStart;
    console.log(`  ⏱  模型响应: ${stepMs}ms`);

    const toolCalls = response.message.tool_calls as ToolCall[] | undefined;

    // ② 判断：模型想调工具还是直接回答？
    if (!toolCalls || toolCalls.length === 0) {
      console.log(`  ✅ 模型决定直接回答（不需要更多工具）`);
      const totalMs = Date.now() - startTime;
      console.log(`\n${'─'.repeat(40)}`);
      console.log(`  🤖 最终回答:\n`);
      console.log(`  ${response.message.content}`);
      console.log(`${'─'.repeat(40)}`);
      console.log(`\n  📊 循环结束：共 ${stepCount} 步，总耗时 ${totalMs}ms`);
      return response.message.content;
    }

    // ③ 有工具调用 → 判断并行还是串行
    const isParallel = toolCalls.length > 1;
    console.log(`  🔧 模型请求调用 ${toolCalls.length} 个工具${isParallel ? '（⚡ 并行）' : ''}:`);

    // 保存 assistant 消息
    messages.push(response.message as Message);

    // ④ 执行工具（并行或串行）
    if (isParallel) {
      // 并行执行：所有工具同时跑
      const parallelResults = await Promise.all(
        toolCalls.map(async (tc) => {
          console.log(`     → ${tc.function.name}(${JSON.stringify(tc.function.arguments)}) [并行]`);
          try {
            const result = executeTool(tc.function.name, tc.function.arguments);
            console.log(`     ← ${tc.function.name}: ${result.slice(0, 60)}${result.length > 60 ? '...' : ''}`);
            return { tc, result, error: null };
          } catch (err) {
            const errMsg = `工具执行失败: ${err instanceof Error ? err.message : String(err)}`;
            console.log(`     ← ${tc.function.name}: ❌ ${errMsg}`);
            return { tc, result: `错误: ${errMsg}`, error: errMsg };
          }
        })
      );

      // 所有结果一起回传
      for (const { tc, result } of parallelResults) {
        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: tc.id,
        });
      }
    } else {
      // 单个工具调用，串行执行
      const tc = toolCalls[0];
      if (!tc) {
        console.log(`  ⚠️  工具调用为空，跳过`);
        continue;
      }
      console.log(`     → ${tc.function.name}(${JSON.stringify(tc.function.arguments)})`);

      try {
        const result = executeTool(tc.function.name, tc.function.arguments);
        console.log(`     ← 结果: ${result.slice(0, 80)}${result.length > 80 ? '...' : ''}`);
        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: tc.id,
        });
      } catch (err) {
        const errMsg = `工具执行失败: ${err instanceof Error ? err.message : String(err)}`;
        console.log(`     ← ❌ ${errMsg}`);
        messages.push({
          role: 'tool',
          content: `错误: ${errMsg}`,
          tool_call_id: tc.id,
        });
      }
    }

    console.log(`  🔄 结果已回传，让模型继续决策...`);
  }

  // 达到最大步数 → 强制结束
  console.log(`\n  ⚠️  达到最大步数 (${MAX_STEPS})，强制结束循环`);
  const finalResponse = await ollama.chat({
    model: MODEL,
    messages: [...messages, { role: 'user', content: '请基于已有信息给出最终回答，不要再调用工具。' }],
  });
  console.log(`\n  🤖 最终回答:\n  ${finalResponse.message.content}`);
  return finalResponse.message.content;
}

// ============================================================
// 预设场景
// ============================================================

async function scene1_toolSelection(): Promise<void> {
  console.clear();
  console.log('\n🎬 场景 1：工具选择 — 5 个工具，模型选哪个？');
  console.log('   测试模型如何从 5 个工具中选出正确的那个');
  console.log('   可用工具: getWeather / calculate / getCurrentTime / searchWeb / searchCode\n');

  const tests = [
    { q: '上海今天天气如何？', expected: 'getWeather' },
    { q: '帮我算一下 256 × 128 等于多少', expected: 'calculate' },
    { q: '现在几点了？', expected: 'getCurrentTime' },
    { q: 'React 19 有什么新特性？', expected: 'searchWeb' },
    { q: '项目里 interface 是怎么定义的？', expected: 'searchCode' },
  ];

  for (const { q, expected } of tests) {
    console.log(`${'─'.repeat(50)}`);
    console.log(`💬 "${q}"`);
    console.log(`   🎯 期望选择: ${expected}`);

    const res = await ollama.chat({
      model: MODEL,
      messages: [{ role: 'user', content: q }],
      tools: TOOLS,
    });

    const calls = res.message.tool_calls as ToolCall[] | undefined;
    if (calls?.[0]) {
      const actual = calls[0].function.name;
      const correct = actual === expected;
      console.log(`   🔧 实际选择: ${actual} ${correct ? '✅' : '❌ 选错了！'}`);
      if (!correct) {
        console.log(`   💡 分析：模型可能因为 description 语义相近而选错`);
      }
    } else {
      console.log(`   📝 模型没有调用工具，直接回答`);
    }
    console.log('');
  }
}

async function scene2_parallelCalls(): Promise<void> {
  console.clear();
  console.log('\n🎬 场景 2：并行调用 — 模型一次返回多个 tool_call');
  console.log('   测试模型是否能识别"互不依赖"的工具调用并并行发起\n');

  const tests = [
    '查一下北京、上海、深圳三个城市的天气',
    '现在几点了？顺便帮我算一下 1024 × 768',
    '搜一下 React 19 和 TypeScript 7.0 的最新信息',
  ];

  for (const q of tests) {
    console.log(`${'─'.repeat(50)}`);
    console.log(`💬 "${q}"`);

    const res = await ollama.chat({
      model: MODEL,
      messages: [{ role: 'user', content: q }],
      tools: TOOLS,
    });

    const calls = res.message.tool_calls as ToolCall[] | undefined;
    if (calls && calls.length > 1) {
      console.log(`   ⚡ 模型一次返回了 ${calls.length} 个 tool_call（并行！）:`);
      for (const tc of calls) {
        console.log(`      → ${tc.function.name}(${JSON.stringify(tc.function.arguments)})`);
      }
    } else if (calls?.[0]) {
      console.log(`   🔧 模型只返回了 1 个 tool_call: ${calls[0].function.name}`);
      console.log(`   💡 可能原因：模型没有识别出并行机会，或 3b 模型并行能力较弱`);
    } else {
      console.log(`   📝 模型直接回答（未调用工具）`);
    }
    console.log('');
  }
}

async function scene3_toolOverlap(): Promise<void> {
  console.clear();
  console.log('\n🎬 场景 3：工具重叠 — searchWeb vs searchCode');
  console.log('   两个"搜索"工具，description 区分了使用场景');
  console.log('   测试模型是否能正确区分\n');

  const tests = [
    { q: '帮我查一下 React 19 的 use() hook 怎么用', expect: 'searchWeb', reason: '外部知识，不在项目代码中' },
    { q: '项目里怎么调用的 ollama chat？', expect: 'searchCode', reason: '项目代码中的实现细节' },
    { q: 'TypeScript 5.0 的装饰器语法是什么样的', expect: 'searchWeb', reason: '语言特性，外部知识' },
    { q: 'agent-loop.ts 里 MAX_STEPS 设的是多少？', expect: 'searchCode', reason: '项目文件中的具体值' },
  ];

  for (const { q, expect: expected, reason } of tests) {
    console.log(`${'─'.repeat(50)}`);
    console.log(`💬 "${q}"`);
    console.log(`   🎯 期望: ${expected}（${reason}）`);

    const res = await ollama.chat({
      model: MODEL,
      messages: [{ role: 'user', content: q }],
      tools: TOOLS,
    });

    const calls = res.message.tool_calls as ToolCall[] | undefined;
    if (calls?.[0]) {
      const actual = calls[0].function.name;
      const correct = actual === expected;
      console.log(`   🔧 实际: ${actual} ${correct ? '✅' : '❌'}`);
    } else {
      console.log(`   📝 模型直接回答（未调用工具）`);
    }
    console.log('');
  }
}

async function scene4_complexOrchestration(): Promise<void> {
  console.clear();
  console.log('\n🎬 场景 4：复杂编排 — 多步任务，多工具混合');
  console.log('   测试模型在复杂任务中的工具编排能力\n');

  await agentLoop('先查一下上海天气，然后搜一下 TypeScript 最新版本，再算一下 2025 × 2026。最后告诉我现在几点了。');
}

async function scene5_custom(): Promise<void> {
  console.clear();
  console.log('\n🎬 场景 5：自定义测试 — 自由输入问题');
  console.log('   可用工具: getWeather / calculate / getCurrentTime / searchWeb / searchCode');
  console.log('   建议尝试：');
  console.log('   - 工具选择："项目里 ToolDef 接口是怎么定义的？"');
  console.log('   - 并行测试："同时查北京天气和深圳天气"');
  console.log('   - 复杂编排："查深圳天气，如果下雨就算一下带伞的天数"');
  console.log('   - 输入 /back 返回主菜单\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  while (true) {
    const input = await new Promise<string>(resolve => rl.question('💬 > ', resolve));
    if (!input.trim()) continue;
    if (input === '/back') break;
    await agentLoop(input);
    console.log('');
  }

  rl.close();
}

// ============================================================
// 主菜单
// ============================================================

async function main() {
  console.clear();
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🎯 AI Agent 学习 — Demo 4: 多工具编排                          ║
║                                                                  ║
║   第 3 周 Day 4  ·  5 个工具，模型自主选择与编排                   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

  console.log('可用工具: getWeather | calculate | getCurrentTime | searchWeb | searchCode');
  console.log('');
  console.log('选择场景：');
  console.log('  1. 工具选择 — 5 个工具，模型选哪个？（推荐先看）');
  console.log('  2. 并行调用 — 模型能否一次发起多个独立调用？');
  console.log('  3. 工具重叠 — searchWeb vs searchCode，模型怎么区分？');
  console.log('  4. 复杂编排 — 多步任务，多工具混合');
  console.log('  5. 自定义 — 自由输入任意问题');
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const choice = await new Promise<string>(resolve => rl.question('👉 输入数字 (1/2/3/4/5): ', resolve));
  rl.close();

  try {
    switch (choice) {
      case '1': await scene1_toolSelection(); break;
      case '2': await scene2_parallelCalls(); break;
      case '3': await scene3_toolOverlap(); break;
      case '4': await scene4_complexOrchestration(); break;
      case '5': await scene5_custom(); break;
      default: console.log('❌ 无效选择');
    }
  } catch (err) {
    console.error(`\n❌ 错误: ${err instanceof Error ? err.message : String(err)}`);
    console.error('💡 确保 Ollama 正在运行: ollama serve');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});