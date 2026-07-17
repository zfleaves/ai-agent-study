/**
 * Demo 2b：工具定义工坊 — 理解"好 description"和"坏 description"的区别
 *
 * 功能：对比不同质量的工具描述，看模型如何响应。亲手定义工具，立刻测试。
 * 技术：Node.js + TypeScript + ollama-js
 *
 * 使用方式：
 *   cd demo/week-03
 *   npx tsx tool-workshop.ts
 *
 * 场景：
 *   1. 好描述 vs 坏描述 — 同一个工具，不同 description，模型行为差异
 *   2. 必填参数缺失 — 模型如何提示用户补充信息
 *   3. 多工具选择 — 注册 3 个工具，看模型选哪个
 */

import * as readline from 'node:readline';
import ollama from 'ollama';

// ============================================================
// 类型
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

// ============================================================
// 模拟工具实现
// ============================================================

function getWeather(city: string): string {
  const data: Record<string, string> = {
    '北京': '晴天 25°C 湿度45%',
    '上海': '多云 28°C 湿度65%',
    '深圳': '阵雨 30°C 湿度80%',
  };
  return data[city] ?? `未找到 ${city} 的天气`;
}

function calculate(expr: string): string {
  try {
    const result = Function(`"use strict"; return (${expr})`)();
    return `${expr} = ${result}`;
  } catch {
    return `无法计算: ${expr}`;
  }
}

function getCurrentTime(_tz?: string): string {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

// ============================================================
// 工具定义：好 vs 坏
// ============================================================

const BAD_WEATHER_TOOL: ToolDef = {
  type: 'function',
  function: {
    name: 'getWeather',
    description: '获取天气',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: '城市' },
      },
      required: ['city'],
    },
  },
};

const GOOD_WEATHER_TOOL: ToolDef = {
  type: 'function',
  function: {
    name: 'getWeather',
    description: '获取指定城市的当前天气信息，返回温度、湿度、天气状况。城市名必须用中文，如 "北京"、"上海"、"深圳"。',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称，用中文。支持：北京、上海、深圳、杭州、成都',
        },
      },
      required: ['city'],
    },
  },
};

const CALCULATOR_TOOL: ToolDef = {
  type: 'function',
  function: {
    name: 'calculate',
    description: '计算数学表达式。支持加减乘除、括号、幂运算。输入必须是纯数学表达式字符串，如 "2 + 3 * 4"、"Math.pow(2, 10)"。',
    parameters: {
      type: 'object',
      properties: {
        expr: {
          type: 'string',
          description: '数学表达式，如 "1234 * 5678"、"Math.sqrt(144)"',
        },
      },
      required: ['expr'],
    },
  },
};

const TIME_TOOL: ToolDef = {
  type: 'function',
  function: {
    name: 'getCurrentTime',
    description: '获取当前日期和时间。不需要任何参数。',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
};

// ============================================================
// 辅助
// ============================================================

function divider(title: string): void {
  console.log(`\n${'─'.repeat(56)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(56)}`);
}

function printTool(tool: ToolDef): void {
  console.log(`\n   name: ${tool.function.name}`);
  console.log(`   description: "${tool.function.description}"`);
  console.log(`   parameters: ${JSON.stringify(tool.function.parameters, null, 2).replace(/^/gm, '     ')}`);
}

// ============================================================
// 场景 1：好描述 vs 坏描述
// ============================================================

async function scene1_goodVsBad(): Promise<void> {
  divider('场景 1：好描述 vs 坏描述');

  const question = 'What\'s the weather in Beijing?';

  console.log('\n📋 同一个问题，同一个工具，不同的 description：');
  console.log(`\n   用户问题: "${question}"\n`);

  // --- 坏描述 ---
  console.log('❌ 坏描述:');
  printTool(BAD_WEATHER_TOOL);
  console.log('\n   ⚠️  问题：description 太模糊，没有说明城市名格式');

  console.log('\n⏳ 测试坏描述...');
  const badRes = await ollama.chat({
    model: 'qwen2.5:3b',
    messages: [{ role: 'user', content: question }],
    tools: [BAD_WEATHER_TOOL],
  });

  const badCalls = badRes.message.tool_calls as any[] | undefined;
  if (badCalls?.[0]) {
    console.log(`\n   🔧 模型调用: getWeather(${JSON.stringify(badCalls[0].function.arguments)})`);
    console.log(`   💡 注意：参数可能传了 "Beijing"（英文）而不是 "北京"（中文）`);
  }

  // --- 好描述 ---
  console.log('\n✅ 好描述:');
  printTool(GOOD_WEATHER_TOOL);
  console.log('\n   ✅ 改进：明确了返回内容、城市名格式、示例城市');

  console.log('\n⏳ 测试好描述...');
  const goodRes = await ollama.chat({
    model: 'qwen2.5:3b',
    messages: [{ role: 'user', content: question }],
    tools: [GOOD_WEATHER_TOOL],
  });

  const goodCalls = goodRes.message.tool_calls as any[] | undefined;
  if (goodCalls?.[0]) {
    console.log(`\n   🔧 模型调用: getWeather(${JSON.stringify(goodCalls[0].function.arguments)})`);
    console.log(`   💡 好描述能引导模型传正确的参数格式`);
  }

  console.log('\n📝 结论：description 写得好 = 模型犯错的概率低。');
  console.log('   写 description 的三个要素：① 功能说明 ② 返回格式 ③ 参数示例');
}

// ============================================================
// 场景 2：必填参数缺失
// ============================================================

async function scene2_requiredParam(): Promise<void> {
  divider('场景 2：必填参数缺失 — 模型如何应对');

  const question = '今天天气怎么样？';

  console.log(`\n📋 用户问题: "${question}"`);
  console.log('   ⚠️  问题没有指定城市，但 getWeather 的 city 参数是必填的');
  console.log(`\n   工具定义: getWeather(city: string, required)`);

  console.log('\n⏳ 发送请求...');
  const res = await ollama.chat({
    model: 'qwen2.5:3b',
    messages: [{ role: 'user', content: question }],
    tools: [GOOD_WEATHER_TOOL],
  });

  const calls = res.message.tool_calls as any[] | undefined;
  if (calls?.[0]) {
    console.log(`\n   🔧 模型仍然调用了工具: getWeather(${JSON.stringify(calls[0].function.arguments)})`);
    console.log('   ⚠️  模型可能"猜"了一个城市（如北京），这可能导致不准确');
    console.log('   💡 更好的做法：在 System Prompt 中要求模型"缺少必填信息时先询问用户"');
  } else {
    console.log(`\n   📝 模型没有调用工具，而是回复: "${res.message.content}"`);
    console.log('   ✅ 模型正确识别了"信息不足"并询问用户');
  }
}

// ============================================================
// 场景 3：多工具选择
// ============================================================

async function scene3_multiTool(): Promise<void> {
  divider('场景 3：多工具选择 — 注册 3 个工具，看模型选哪个');

  const tools = [GOOD_WEATHER_TOOL, CALCULATOR_TOOL, TIME_TOOL];

  console.log('\n📋 已注册 3 个工具:');
  console.log('   1. getWeather — 查天气');
  console.log('   2. calculate — 算数学题');
  console.log('   3. getCurrentTime — 查时间');

  const tests = [
    '上海今天天气如何？',
    '帮我算一下 1234 × 5678 等于多少',
    '现在几点了？',
    '用 TypeScript 写一个冒泡排序',
  ];

  for (const question of tests) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`💬 "${question}"`);
    console.log('⏳ 模型决策中...');

    const res = await ollama.chat({
      model: 'qwen2.5:3b',
      messages: [{ role: 'user', content: question }],
      tools,
    });

    const calls = res.message.tool_calls as any[] | undefined;
    if (calls?.[0]) {
      console.log(`   🔧 选择工具: ${calls[0].function.name}(${JSON.stringify(calls[0].function.arguments)})`);

      // 执行工具
      let result = '';
      switch (calls[0].function.name) {
        case 'getWeather':
          result = getWeather(calls[0].function.arguments.city as string);
          break;
        case 'calculate':
          result = calculate(calls[0].function.arguments.expr as string);
          break;
        case 'getCurrentTime':
          result = getCurrentTime();
          break;
      }
      console.log(`   📊 执行结果: ${result}`);
    } else {
      console.log(`   📝 直接回答（不需要工具）: "${res.message.content?.slice(0, 80)}..."`);
    }
  }
}

// ============================================================
// 场景 4：自定义工具测试
// ============================================================

async function scene4_custom(): Promise<void> {
  divider('场景 4：自定义工具测试');

  console.log('\n   输入你想测试的问题，看看模型会选择哪个工具');
  console.log('   已注册工具: getWeather / calculate / getCurrentTime');
  console.log('   输入 /exit 返回主菜单\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = (): Promise<string> => new Promise(resolve => {
    rl.question('💬 > ', resolve);
  });

  const tools = [GOOD_WEATHER_TOOL, CALCULATOR_TOOL, TIME_TOOL];

  while (true) {
    const input = await ask();
    if (!input.trim()) continue;
    if (input === '/exit') break;

    console.log('⏳ ...');
    const res = await ollama.chat({
      model: 'qwen2.5:3b',
      messages: [{ role: 'user', content: input }],
      tools,
    });

    const calls = res.message.tool_calls as any[] | undefined;
    if (calls?.[0]) {
      console.log(`🔧 调用: ${calls[0].function.name}(${JSON.stringify(calls[0].function.arguments)})`);

      let result = '';
      switch (calls[0].function.name) {
        case 'getWeather':
          result = getWeather(calls[0].function.arguments.city as string);
          break;
        case 'calculate':
          result = calculate(calls[0].function.arguments.expr as string);
          break;
        case 'getCurrentTime':
          result = getCurrentTime();
          break;
      }
      console.log(`📊 结果: ${result}`);

      // 回传结果给模型
      const msgs: Message[] = [
        { role: 'user', content: input },
        res.message as Message,
        { role: 'tool', content: result, tool_call_id: calls[0].id },
      ];
      const final = await ollama.chat({ model: 'qwen2.5:3b', messages: msgs, tools });
      console.log(`🤖 ${final.message.content}\n`);
    } else {
      console.log(`📝 ${res.message.content}\n`);
    }
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
║   🔧 AI Agent 学习 — Demo 2b: 工具定义工坊                        ║
║                                                                  ║
║   第 3 周 Day 2  ·  写好工具定义，让模型选对工具                    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

  console.log('选择场景：');
  console.log('  1. 好描述 vs 坏描述 — 同一工具，不同 description，结果差异');
  console.log('  2. 必填参数缺失 — 模型如何应对缺少信息的情况');
  console.log('  3. 多工具选择 — 3 个工具，模型如何自动选（推荐）');
  console.log('  4. 自定义测试 — 自己输入问题，自由实验');
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const choice = await new Promise<string>(resolve => rl.question('👉 输入数字 (1/2/3/4): ', resolve));
  rl.close();

  try {
    switch (choice) {
      case '1': await scene1_goodVsBad(); break;
      case '2': await scene2_requiredParam(); break;
      case '3': await scene3_multiTool(); break;
      case '4': await scene4_custom(); break;
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