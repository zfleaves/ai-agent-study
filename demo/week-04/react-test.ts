/**
 * Day 1 实验：验证云端 API + ReAct Thought 输出对比
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

const MODEL = env.MODEL || 'deepseek-v4-pro';

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
          city: { type: 'string', description: '城市名称，支持：北京、上海、深圳、杭州、成都' },
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

const SYSTEM_BASIC = `你是一个智能助手，可以调用工具来完成任务。

工具选择规则：
1. 天气查询 → getWeather（城市名用中文）
2. 数学计算 → calculate（纯数学表达式）
3. 当前时间 → getCurrentTime`;

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
// 结果存储
// ============================================================

interface TestResult {
  label: string;
  system: 'basic' | 'react';
  ms: number;
  hasThought: boolean;
  thoughtPreview: string;
  toolNames: string[];
  isParallel: boolean;
}

const results: TestResult[] = [];

// ============================================================
// 表格渲染
// ============================================================

function pad(s: string, len: number): string {
  const cleaned = s.replace(/\x1b\[[0-9;]*m/g, '');
  // 中文字符占 2 个宽度
  let visual = 0;
  for (const ch of cleaned) {
    visual += /[一-鿿　-〿＀-￯]/.test(ch) ? 2 : 1;
  }
  const padding = len - visual;
  return cleaned + ' '.repeat(Math.max(0, padding));
}

function printSummaryTable(): void {
  console.log(`\n${'═'.repeat(92)}`);
  console.log('  📊 对比结果汇总');
  console.log(`${'═'.repeat(92)}`);

  // 表头
  const hdr = [
    pad('实验', 6),
    pad('Prompt', 8),
    pad('💭 Thought', 24),
    pad('🔧 工具调用', 26),
    pad('⚡并行', 6),
    pad('⏱耗时', 8),
  ];
  console.log(`│ ${hdr[0]}│ ${hdr[1]}│ ${hdr[2]}│ ${hdr[3]}│ ${hdr[4]}│ ${hdr[5]}│`);
  console.log(`│${'─'.repeat(7)}│${'─'.repeat(9)}│${'─'.repeat(25)}│${'─'.repeat(27)}│${'─'.repeat(7)}│${'─'.repeat(9)}│`);

  for (const r of results) {
    const thought = r.hasThought
      ? `\x1b[32m✅ ${r.thoughtPreview}\x1b[0m`
      : '\x1b[31m❌ 无\x1b[0m';
    const tools = r.toolNames.length > 0
      ? `\x1b[36m✅ ${r.toolNames.join(', ')}\x1b[0m`
      : '\x1b[31m❌ 未调用\x1b[0m';
    const parallel = r.isParallel
      ? '\x1b[32m✅ 是\x1b[0m'
      : r.toolNames.length > 1 ? '\x1b[33m⚠️ 否\x1b[0m' : '\x1b[90m—\x1b[0m';

    const cols = [
      pad(r.label, 6),
      pad(r.system === 'basic' ? 'Basic' : 'ReAct', 8),
      thought,
      tools,
      parallel,
      pad(`${r.ms}ms`, 8),
    ];
    console.log(`│ ${cols[0]}│ ${cols[1]}│ ${cols[2]}│ ${cols[3]}│ ${cols[4]}│ ${cols[5]}│`);
  }
  console.log(`${'═'.repeat(92)}`);
}

// ============================================================
// 测试函数
// ============================================================

async function runTest(
  prompt: string,
  system: string,
  label: string,
  sysType: 'basic' | 'react',
): Promise<void> {
  console.log(`\n${'─'.repeat(56)}`);
  console.log(`🧪 ${label}  [${sysType === 'react' ? 'ReAct' : 'Basic'}]`);
  console.log(`   Q: "${prompt}"`);
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
  const hasThought = !!(msg?.content && msg.content.trim().length > 0);
  const thoughtPreview = hasThought ? msg!.content!.trim().slice(0, 18) : '';
  const toolCalls = msg?.tool_calls ?? [];
  const toolNames = toolCalls.map(tc => (tc as ChatCompletionMessageFunctionToolCall).function.name);
  const isParallel = toolCalls.length > 1;

  results.push({ label, system: sysType, ms, hasThought, thoughtPreview, toolNames, isParallel });

  console.log(`   ⏱  ${ms}ms  |  finish: ${res.choices[0]?.finish_reason}`);
  if (hasThought) {
    console.log(`   💭 "${msg!.content!.trim().slice(0, 100)}${msg!.content!.trim().length > 100 ? '...' : ''}"`);
  } else {
    console.log(`   💭 (无 Thought)`);
  }
  if (toolCalls.length > 0) {
    for (const tc of toolCalls) {
      const ftc = tc as ChatCompletionMessageFunctionToolCall;
      console.log(`   🔧 → ${ftc.function.name}(${ftc.function.arguments})`);
    }
  }
}

// ============================================================
// 完整 ReAct 循环演示
// ============================================================

function getWeather(city: string): string {
  const data: Record<string, string> = {
    '北京': '晴天，25°C，湿度 45%，风力 3 级',
    '深圳': '阵雨，30°C，湿度 80%，风力 4 级',
    '上海': '多云，28°C，湿度 65%，风力 2 级',
  };
  return data[city] ?? `未找到 "${city}" 的天气数据`;
}

async function fullReActCycle(): Promise<void> {
  const prompt = '查一下深圳天气，如果下雨就提醒我带伞，如果晴天就告诉我不用带';
  console.log(`\n${'─'.repeat(56)}`);
  console.log(`🧪 完整 ReAct 循环演示`);
  console.log(`   Q: "${prompt}"`);
  console.log(`${'─'.repeat(56)}`);

  const messages: any[] = [
    { role: 'system', content: SYSTEM_BASIC },
    { role: 'user', content: prompt },
  ];

  const start = Date.now();
  let step = 0;

  while (step < 4) {
    step++;
    const res = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
    });
    const msg = res.choices[0]?.message;

    // Thought
    if (msg?.content) {
      console.log(`\n  📍 Step ${step}  💭 Thought: "${msg.content.trim().slice(0, 80)}${msg.content.trim().length > 80 ? '...' : ''}"`);
    } else {
      console.log(`\n  📍 Step ${step}  💭 (无 Thought)`);
    }

    // 最终回答
    if (!msg?.tool_calls || msg.tool_calls.length === 0) {
      const ms = Date.now() - start;
      console.log(`  ✅ 最终回答: "${msg?.content?.trim().slice(0, 120)}${(msg?.content?.trim().length ?? 0) > 120 ? '...' : ''}"`);
      console.log(`\n  ⏱  总耗时 ${ms}ms，共 ${step} 步`);
      return;
    }

    // 工具调用
    messages.push(msg as any);
    for (const tc of msg.tool_calls) {
      const ftc = tc as ChatCompletionMessageFunctionToolCall;
      const args = JSON.parse(ftc.function.arguments);
      console.log(`  🔧 Action: ${ftc.function.name}(${JSON.stringify(args)})`);

      let result: string;
      if (ftc.function.name === 'getWeather') {
        result = getWeather(args.city as string);
      } else if (ftc.function.name === 'calculate') {
        try { result = `${args.expr} = ${Function('"use strict"; return (' + args.expr + ')')()}`; }
        catch (e: any) { result = `计算失败: ${e.message}`; }
      } else if (ftc.function.name === 'getCurrentTime') {
        result = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      } else {
        result = `未知工具: ${ftc.function.name}`;
      }
      console.log(`  👁  Observation: "${result}"`);
      messages.push({ role: 'tool', content: result, tool_call_id: ftc.id });
    }
  }
}

// ============================================================
// 主函数
// ============================================================

async function main() {
  console.clear();
  console.log('🧠 ReAct 实验：Basic vs ReAct Prompt 对比');
  console.log(`   模型: ${MODEL}  |  端点: ${env.BASE_URL}`);
  console.log('');

  // 实验 1：简单任务
  console.log('\n═══ 实验 1：简单任务（单工具调用） ═══');
  await runTest('北京今天天气怎么样？', SYSTEM_BASIC, 'A1', 'basic');
  await runTest('北京今天天气怎么样？', SYSTEM_REACT, 'A2', 'react');

  // 实验 2：条件式任务
  console.log('\n═══ 实验 2：条件式任务（需要推理） ═══');
  await runTest('查一下深圳天气，如果下雨就提醒我带伞，如果晴天就告诉我不用带', SYSTEM_BASIC, 'B1', 'basic');
  await runTest('查一下深圳天气，如果下雨就提醒我带伞，如果晴天就告诉我不用带', SYSTEM_REACT, 'B2', 'react');

  // 实验 3：多步任务
  console.log('\n═══ 实验 3：多步任务（多工具并行） ═══');
  await runTest('现在几点了？顺便帮我算一下 2025 × 2026 等于多少', SYSTEM_BASIC, 'C1', 'basic');
  await runTest('现在几点了？顺便帮我算一下 2025 × 2026 等于多少', SYSTEM_REACT, 'C2', 'react');

  // 汇总对比表
  printSummaryTable();

  // 实验 4：完整 ReAct 循环
  console.log('\n═══ 实验 4：完整 ReAct 循环（Thought → Action → Observation → Answer） ═══');
  await fullReActCycle();

  console.log(`\n${'═'.repeat(56)}`);
  console.log('✅ 实验完成');
  console.log('');
  console.log('  观察要点：');
  console.log('  1. 强模型(deepseek-v4-pro)天然输出 Thought，ReAct Prompt 不一定更好');
  console.log('  2. 并行能力：多步任务能正确识别独立子任务并一次调用');
  console.log('  3. 完整循环：Thought → Action → Observation → Thought → Answer');
  console.log('');
}

main().catch(err => {
  console.error('❌ 错误:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});