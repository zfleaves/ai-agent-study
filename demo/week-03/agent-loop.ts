/**
 * Demo 3：Agent 循环 — 完整的多轮 Tool-calling + 错误处理
 *
 * 功能：实现 ReAct 循环，让 Agent 自主决策、调用工具、处理错误、直到任务完成
 * 技术：Node.js + TypeScript + ollama-js
 *
 * 使用方式：
 *   cd demo/week-03
 *   npx tsx agent-loop.ts
 *
 * 核心：这是 Agent 开发的"心脏"——理解了循环，就理解了 Agent 怎么工作
 */

import * as readline from 'node:readline';
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

const MAX_STEPS = 5; // 最多 5 步，防止无限循环
const MODEL = 'qwen2.5:3b';

// ============================================================
// System Prompt
// ============================================================

const SYSTEM_PROMPT = `你是一个智能助手，可以调用工具来获取信息和执行任务。

工具使用规则：
1. 当需要实时数据或计算时，必须调用工具，不要编造答案
2. 如果缺少工具的必填参数，先向用户询问，不要猜测
3. 拿到工具结果后，判断是否还需要更多信息——如果需要，继续调用工具
4. 如果任务已经完成，用自然语言总结结果
5. 如果工具返回错误，告知用户并尝试其他方案
6. 一个工具的结果可能需要作为另一个工具的输入——请链式调用`;

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
    // 安全计算：只允许数学表达式
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
  // 模拟搜索（实际项目替换为真实 API）
  const mockResults: Record<string, string> = {
    'react': 'React 19 于 2025 年发布，主要特性：Server Components 稳定版、Actions、优化 Suspense。',
    'typescript': 'TypeScript 7.0 最新特性：Decorators 稳定、类型推断增强、ignoreDeprecations 配置。',
    'node': 'Node.js 24 LTS 最新版本，支持 ESM 默认模块、WebSocket 客户端、权限模型。',
  };
  const match = Object.entries(mockResults).find(([k]) => query.toLowerCase().includes(k));
  return match ? match[1] : `搜索 "${query}" 暂无结果。这是一个模拟搜索，实际项目需接入真实 API。`;
}

// ============================================================
// 工具注册表
// ============================================================

const TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'getWeather',
      description: '获取指定城市的当前天气信息，返回温度、湿度、天气状况和风力。城市名用中文，如 "北京"、"上海"。',
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
      description: '搜索互联网获取最新信息。适用于模型知识截止后的事件、最新技术文档、实时资讯。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词，如 "React 19 新特性"、"TypeScript 最新版本"' },
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
    case 'getWeather':    return getWeather(args.city as string);
    case 'calculate':     return calculate(args.expr as string);
    case 'getCurrentTime': return getCurrentTime();
    case 'searchWeb':     return searchWeb(args.query as string);
    default:              return `错误：未知工具 ${name}`;
  }
}

// ============================================================
// 核心：Agent 循环
// ============================================================

async function agentLoop(userInput: string): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userInput },
  ];

  let stepCount = 0;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  🤖 Agent 循环开始`);
  console.log(`  用户输入: "${userInput}"`);
  console.log(`  可用工具: ${TOOLS.map(t => t.function.name).join(', ')}`);
  console.log(`${'═'.repeat(60)}`);

  while (stepCount < MAX_STEPS) {
    stepCount++;
    console.log(`\n━━━ Step ${stepCount}/${MAX_STEPS} ━━━`);

    // ① 调用模型
    console.log(`  📤 发送请求 (messages: ${messages.length} 条)`);
    const response = await ollama.chat({
      model: MODEL,
      messages,
      tools: TOOLS,
    });

    const toolCalls = response.message.tool_calls as ToolCall[] | undefined;

    // ② 判断：模型想调工具还是直接回答？
    if (!toolCalls || toolCalls.length === 0) {
      // 没有工具调用 → 任务完成
      console.log(`  ✅ 模型决定直接回答（不需要更多工具）`);
      console.log(`\n${'─'.repeat(40)}`);
      console.log(`  🤖 最终回答:\n`);
      console.log(`  ${response.message.content}`);
      console.log(`${'─'.repeat(40)}`);
      console.log(`\n  📊 循环结束：共 ${stepCount} 步`);
      return response.message.content;
    }

    // ③ 有工具调用 → 执行
    console.log(`  🔧 模型请求调用 ${toolCalls.length} 个工具:`);

    // 先保存 assistant 消息
    messages.push(response.message as Message);

    // 逐个执行工具
    for (const tc of toolCalls) {
      console.log(`     → ${tc.function.name}(${JSON.stringify(tc.function.arguments)})`);

      try {
        const result = executeTool(tc.function.name, tc.function.arguments);
        console.log(`     ← 结果: ${result.slice(0, 80)}${result.length > 80 ? '...' : ''}`);

        // ④ 工具结果回传
        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: tc.id,
        });
      } catch (err) {
        // ⑤ 错误处理
        const errMsg = `工具执行失败: ${err instanceof Error ? err.message : String(err)}`;
        console.log(`     ← ❌ ${errMsg}`);

        messages.push({
          role: 'tool',
          content: `错误: ${errMsg}`,
          tool_call_id: tc.id,
        });
      }
    }

    // 回到循环顶部，让模型基于工具结果继续决策
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

async function scene1_singleTool(): Promise<void> {
  console.clear();
  console.log('\n🎬 场景 1：单工具调用 — 最简单的循环');
  console.log('   用户问天气 → 模型调工具 → 执行 → 回传 → 回答');
  await agentLoop('北京今天天气怎么样？');
}

async function scene2_chainCall(): Promise<void> {
  console.clear();
  console.log('\n🎬 场景 2：链式调用 — 多步推理');
  console.log('   用户问复杂问题 → 模型可能需要多步工具调用');
  await agentLoop('帮我查一下北京和上海的天气，如果北京温度更高，就帮我算一下 25×365 是多少');
}

async function scene3_multiTool(): Promise<void> {
  console.clear();
  console.log('\n🎬 场景 3：多工具混合 — 自主选择');
  console.log('   用户的问题涉及多个工具，模型自主决定调用顺序');
  await agentLoop('现在几点了？帮我搜一下 React 19 有什么新特性，然后算一下 2025×2026 等于多少');
}

async function scene4_errorHandling(): Promise<void> {
  console.clear();
  console.log('\n🎬 场景 4：错误处理 — 工具失败时怎么办');
  console.log('   用户问一个工具不支持的城市，看 Agent 怎么处理');
  await agentLoop('东京今天天气怎么样？');
}

async function scene5_custom(): Promise<void> {
  console.clear();
  console.log('\n🎬 场景 5：自定义 — 自由输入你想测试的问题');
  console.log('   建议尝试：');
  console.log('   - 简单问题："现在几点了？"');
  console.log('   - 复杂问题："深圳天气如何？如果下雨就帮我算一下带伞的天数"');
  console.log('   - 知识问题："React 19 有什么新特性？"（需要搜索）');
  console.log('   - 混合问题："先查时间，再算 2^10，最后查上海天气"');
  console.log('   输入 /back 返回主菜单\n');

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
║   🔄 AI Agent 学习 — Demo 3: Agent 循环                          ║
║                                                                  ║
║   第 3 周 Day 3  ·  完整的多轮 Tool-calling + 错误处理            ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

  console.log('选择场景：');
  console.log('  1. 单工具调用 — 查天气（看最基本的循环）');
  console.log('  2. 链式调用 — 多城市天气 + 计算（看多步推理）');
  console.log('  3. 多工具混合 — 时间 + 搜索 + 计算（看自主选择）');
  console.log('  4. 错误处理 — 查不存在的城市（看容错）');
  console.log('  5. 自定义 — 自由输入任意问题');
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const choice = await new Promise<string>(resolve => rl.question('👉 输入数字 (1/2/3/4/5): ', resolve));
  rl.close();

  try {
    switch (choice) {
      case '1': await scene1_singleTool(); break;
      case '2': await scene2_chainCall(); break;
      case '3': await scene3_multiTool(); break;
      case '4': await scene4_errorHandling(); break;
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