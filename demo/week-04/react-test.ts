/**
 * Day 1 实验：验证云端 API + ReAct Thought 输出
 *
 * 使用方式：
 *   cd demo/week-04
 *   npx tsx react-test.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import type { ChatCompletionMessageFunctionToolCall } from 'openai/resources/chat/completions/completions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// 从 .env 读取配置
// ============================================================

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
  return env;
}

const env = loadEnv();

// ============================================================
// 配置
// ============================================================

const client = new OpenAI({
  apiKey: env.API_KEY,
  baseURL: env.BASE_URL,
});

const MODEL = env.MODEL || 'qwen2.5:3b';

// ============================================================
// 工具定义（复用 Demo 2 的工具）
// ============================================================

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'getWeather',
      description: '获取指定城市的当前天气信息。城市名用中文，如 "北京"。仅支持中国主要城市。',
      parameters: {
        type: 'object' as const,
        properties: {
          city: { type: 'string', description: '城市名称，用中文。支持：北京、上海、深圳、杭州、成都' },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'calculate',
      description: '计算数学表达式，如 "256 * 128"、"Math.sqrt(144)"。',
      parameters: {
        type: 'object' as const,
        properties: {
          expr: { type: 'string', description: '数学表达式' },
        },
        required: ['expr'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getCurrentTime',
      description: '获取当前日期和时间（中国时区）。不需要参数。',
      parameters: { type: 'object' as const, properties: {}, required: [] },
    },
  },
];

// ============================================================
// 两种 System Prompt 对比
// ============================================================

// 第 3 周风格的 System Prompt（无 Thought 要求）
const SYSTEM_BASIC = `你是一个智能助手，可以调用工具来完成任务。

工具选择规则：
1. 天气查询 → getWeather（城市名用中文）
2. 数学计算 → calculate（纯数学表达式）
3. 当前时间 → getCurrentTime`;

// ReAct 风格的 System Prompt（强制 Thought）
const SYSTEM_REACT = `你是一个使用 ReAct 模式工作的智能助手。

每次行动前，你必须先输出 Thought（思考），解释为什么要做这个行动。

输出格式：
  Thought: <你的推理过程>
  然后调用相应的工具

当信息足够时，直接输出最终回答。

工具选择规则：
1. 天气查询 → getWeather（城市名用中文）
2. 数学计算 → calculate（纯数学表达式）
3. 当前时间 → getCurrentTime`;

// ============================================================
// 测试
// ============================================================

async function test(prompt: string, system: string, label: string): Promise<void> {
  console.log(`\n${'─'.repeat(56)}`);
  console.log(`🧪 ${label}`);
  console.log(`   System: ${system === SYSTEM_REACT ? 'ReAct（强制 Thought）' : 'Basic（无 Thought 要求）'}`);
  console.log(`   Question: "${prompt}"`);
  console.log(`${'─'.repeat(56)}`);

  const start = Date.now();
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    tools: TOOLS,
  });
  const ms = Date.now() - start;

  const msg = res.choices[0]?.message;
  console.log(`   ⏱  ${ms}ms`);
  console.log(`   🎯 finish_reason: ${res.choices[0]?.finish_reason}`);

  // 检查是否有 Thought
  if (msg?.content) {
    console.log(`   💭 Thought: "${msg.content.slice(0, 150)}${msg.content.length > 150 ? '...' : ''}"`);
  } else {
    console.log(`   💭 Thought: (无 — 模型直接行动)`);
  }

  // 检查工具调用
  if (msg?.tool_calls && msg.tool_calls.length > 0) {
    console.log(`   🔧 工具调用: ${msg.tool_calls.length} 个`);
    for (const tc of msg.tool_calls) {
      const ftc = tc as ChatCompletionMessageFunctionToolCall;
      console.log(`      → ${ftc.function.name}(${ftc.function.arguments})`);
    }
  } else {
    console.log(`   📝 直接回答: "${msg?.content?.slice(0, 100) || '(无)'}"`);
  }
}

// ============================================================
// 完整 ReAct 循环演示
// ============================================================

// 模拟工具实现
function getWeather(city: string): string {
  const data: Record<string, string> = {
    '北京': '晴天，25°C，湿度 45%，风力 3 级',
    '深圳': '阵雨，30°C，湿度 80%，风力 4 级',
    '上海': '多云，28°C，湿度 65%，风力 2 级',
  };
  return data[city] ?? `未找到 "${city}" 的天气数据`;
}

async function fullReActCycle(prompt: string, system: string, label: string): Promise<void> {
  console.log(`\n${'─'.repeat(56)}`);
  console.log(`🧪 完整 ReAct 循环: ${label}`);
  console.log(`   Question: "${prompt}"`);
  console.log(`${'─'.repeat(56)}`);

  const messages: Array<{ role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string }> = [
    { role: 'system', content: system },
    { role: 'user', content: prompt },
  ];

  const start = Date.now();
  let step = 0;
  const MAX_STEPS = 4;

  while (step < MAX_STEPS) {
    step++;
    const res = await client.chat.completions.create({
      model: MODEL,
      messages: messages as any,
      tools: TOOLS,
    });
    const msg = res.choices[0]?.message;

    // 打印 Thought
    if (msg?.content) {
      console.log(`\n  📍 Step ${step}: 💭 Thought: "${msg.content.trim()}"`);
    } else {
      console.log(`\n  📍 Step ${step}: 💭 (无 Thought — 直接行动)`);
    }

    // 没有工具调用 → 最终回答
    if (!msg?.tool_calls || msg.tool_calls.length === 0) {
      console.log(`  ✅ 最终回答: "${msg?.content?.trim()}"`);
      const ms = Date.now() - start;
      console.log(`\n  ⏱  总耗时 ${ms}ms，共 ${step} 步`);
      return;
    }

    // 有工具调用
    console.log(`  🔧 调用 ${msg.tool_calls.length} 个工具:`);
    messages.push(msg as any);

    for (const tc of msg.tool_calls) {
      const ftc = tc as ChatCompletionMessageFunctionToolCall;
      const toolName = ftc.function.name;
      const args = JSON.parse(ftc.function.arguments);
      console.log(`     → ${toolName}(${JSON.stringify(args)})`);

      // 执行工具
      let result: string;
      if (toolName === 'getWeather') {
        result = getWeather(args.city as string);
      } else if (toolName === 'calculate') {
        const expr = args.expr as string;
        try {
          result = `${expr} = ${Function('"use strict"; return (' + expr + ')')()}`;
        } catch (e: any) {
          result = `计算失败: ${e.message}`;
        }
      } else if (toolName === 'getCurrentTime') {
        result = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      } else {
        result = `未知工具: ${toolName}`;
      }

      console.log(`  👁  Observation: "${result}"`);

      // 回传结果
      messages.push({
        role: 'tool',
        content: result,
        tool_call_id: ftc.id,
      } as any);
    }
  }

  console.log(`  ⚠️  达到最大步数 ${MAX_STEPS}`);
}

// ============================================================
// 主函数
// ============================================================

async function main() {
  console.clear();
  console.log('🧠 ReAct 实验：云端 API + Thought 输出对比');
  console.log(`   模型: ${MODEL}`);
  console.log(`   端点: ${env.BASE_URL}`);
  console.log('');

  // 实验 1：简单任务 — 有无 Thought 的对比
  console.log('\n═══ 实验 1：简单任务（单工具调用） ═══');

  await test('北京今天天气怎么样？', SYSTEM_BASIC, 'A1');
  await test('北京今天天气怎么样？', SYSTEM_REACT, 'A2');

  // 实验 2：条件式任务 — 需要推理
  console.log('\n═══ 实验 2：条件式任务（需要推理） ═══');

  await test('查一下深圳天气，如果下雨就提醒我带伞，如果晴天就告诉我不用带', SYSTEM_BASIC, 'B1');
  await test('查一下深圳天气，如果下雨就提醒我带伞，如果晴天就告诉我不用带', SYSTEM_REACT, 'B2');

  // 实验 3：多步任务 — 需要多个工具
  console.log('\n═══ 实验 3：多步任务（多工具） ═══');

  await test('现在几点了？顺便帮我算一下 2025 × 2026 等于多少', SYSTEM_BASIC, 'C1');
  await test('现在几点了？顺便帮我算一下 2025 × 2026 等于多少', SYSTEM_REACT, 'C2');

  // 实验 4：完整 ReAct 循环 — Thought → Action → Observation → Thought → Answer
  console.log('\n═══ 实验 4：完整 ReAct 循环（条件式推理） ═══');

  await fullReActCycle(
    '查一下深圳天气，如果下雨就提醒我带伞，如果晴天就告诉我不用带',
    SYSTEM_BASIC,
    'D：完整循环'
  );

  console.log(`\n${'═'.repeat(56)}`);
  console.log('✅ 实验完成。观察两组对比：');
  console.log('   1. ReAct Prompt 是否让模型输出了 Thought？');
  console.log('   2. 有 Thought 时工具选择是否更准确？');
  console.log('   3. 条件式任务中，Thought 是否帮助模型理清依赖关系？');
  console.log('');
}

main().catch(err => {
  console.error('❌ 错误:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});