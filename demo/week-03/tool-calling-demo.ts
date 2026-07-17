/**
 * Demo 2：Tool-calling 演示 — 理解 Function Calling 完整流程
 *
 * 功能：逐步展示模型如何"决定调用工具"→"输出 JSON"→"代码执行"→"结果回传"
 * 技术：Node.js + TypeScript + ollama-js
 *
 * 使用方式：
 *   cd demo/week-03
 *   npm install
 *   npx tsx tool-calling-demo.ts
 *
 * 场景选择：
 *   1. 天气查询（需要工具）— 演示完整的 tool-calling 流程
 *   2. 普通聊天（不需要工具）— 演示模型如何判断"不需要调工具"
 *   3. 自定义问题 — 你自己输入，看模型怎么决策
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

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

// ============================================================
// 模拟工具：天气查询
// ============================================================

/** 模拟天气数据（实际项目中会调用真实 API） */
function getWeather(city: string): string {
  const weatherData: Record<string, string> = {
    '北京': '晴天，25°C，湿度 45%，风力 3 级',
    '上海': '多云，28°C，湿度 65%，风力 2 级',
    '深圳': '阵雨，30°C，湿度 80%，风力 4 级',
    '杭州': '阴天，22°C，湿度 55%，风力 2 级',
    '成都': '小雨，20°C，湿度 70%，风力 1 级',
  };

  return weatherData[city] ?? `未找到 ${city} 的天气数据。支持的城市：${Object.keys(weatherData).join('、')}`;
}

// ============================================================
// 工具定义（JSON Schema）
// ============================================================

const WEATHER_TOOL = {
  type: 'function' as const,
  function: {
    name: 'getWeather',
    description: '获取指定城市的当前天气信息，返回温度、湿度、天气状况、风力。城市名用中文，如 "北京"、"上海"。',
    parameters: {
      type: 'object' as const,
      properties: {
        city: {
          type: 'string' as const,
          description: '城市名称，用中文，如 "北京"、"上海"、"深圳"',
        },
      },
      required: ['city'],
    },
  },
};

// ============================================================
// 辅助函数
// ============================================================

function divider(title: string): void {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

function printJson(label: string, obj: unknown): void {
  console.log(`\n📋 ${label}:`);
  console.log(JSON.stringify(obj, null, 2));
}

// ============================================================
// 核心：Tool-calling 流程
// ============================================================

async function demo1_weatherQuery(): Promise<void> {
  divider('场景 1：天气查询（需要调用工具）');

  const messages: Message[] = [
    { role: 'user', content: '北京今天天气怎么样？' },
  ];

  // ═══ Step 1：发送请求（带工具定义） ═══
  console.log('\n📤 Step 1：发送请求给模型');
  printJson('请求内容', {
    model: 'qwen2.5:3b',
    messages,
    tools: [WEATHER_TOOL],
  });

  console.log('\n⏳ 等待模型响应...');

  const response1 = await ollama.chat({
    model: 'qwen2.5:3b',
    messages,
    tools: [WEATHER_TOOL],
  });

  // ═══ Step 2：检查模型是否想调用工具 ═══
  console.log('\n📥 Step 2：模型返回了以下响应');
  printJson('原始响应', {
    role: response1.message.role,
    content: response1.message.content || '(空 — 模型决定调用工具，不生成文本)',
    tool_calls: response1.message.tool_calls || '(无)',
  });

  const toolCalls = response1.message.tool_calls as ToolCall[] | undefined;

  if (!toolCalls || toolCalls.length === 0) {
    console.log('\n⚠️  模型没有调用工具，直接回答了（可能不需要工具）');
    console.log(`\n🤖 回答: ${response1.message.content}`);
    return;
  }

  // ═══ Step 3：解析工具调用 ═══
  divider('Step 3：解析 tool_call → 你的代码执行函数');

  const toolCall = toolCalls[0]!;
  console.log(`\n🔧 模型想调用: ${toolCall.function.name}`);
  console.log(`📝 参数: ${JSON.stringify(toolCall.function.arguments)}`);
  console.log(`🆔 调用 ID: ${toolCall.id}`);

  console.log('\n💡 关键洞察：模型没有"执行"函数——它只是输出了一段 JSON。');
  console.log('   是你的代码读取了这个 JSON，然后去调用真正的函数。');

  // ═══ Step 4：执行工具 ═══
  const city = toolCall.function.arguments.city as string;
  console.log(`\n⚡ 你的代码执行: getWeather("${city}")`);
  const weatherResult = getWeather(city);
  console.log(`📊 执行结果: ${weatherResult}`);

  // ═══ Step 5：结果回传 ═══
  divider('Step 5：结果回传给模型');

  messages.push(response1.message as Message);
  messages.push({
    role: 'tool',
    content: weatherResult,
    tool_call_id: toolCall.id,
  });

  printJson('当前消息历史', messages.map(m => ({
    role: m.role,
    content: m.content.length > 60 ? m.content.slice(0, 60) + '...' : m.content,
    ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
  })));

  console.log('\n⏳ 模型收到工具结果，生成最终回答...');

  const response2 = await ollama.chat({
    model: 'qwen2.5:3b',
    messages,
    tools: [WEATHER_TOOL],
  });

  // ═══ Step 6：最终回答 ═══
  divider('Step 6：模型基于工具结果生成最终回答');
  console.log(`\n🤖 最终回答:\n\n   ${response2.message.content}\n`);

  // ═══ 总结 ═══
  divider('流程总结');
  console.log(`
   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ 用户提问  │ ──→ │ 模型决策  │ ──→ │ 代码执行  │ ──→ │ 模型回答  │
   │          │     │ 输出JSON  │     │ 真实函数  │     │ 生成文本  │
   └──────────┘     └──────────┘     └──────────┘     └──────────┘
      文字             结构化数据          真实世界           文字
                      (tool_call)        (getWeather)      (自然语言)

  🔑 关键点：
  • 模型 = 大脑（决策用哪个工具、传什么参数）
  • 代码 = 手（执行工具、返回结果）
  • 模型不执行任何代码——它只输出 JSON 告诉代码"帮我做这件事"
  `);
}

async function demo2_fallbackChat(): Promise<void> {
  divider('场景 2：普通聊天（不需要工具）');

  const messages: Message[] = [
    { role: 'user', content: '用 TypeScript 写一个 Hello World' },
  ];

  console.log('\n📤 发送请求（带了工具定义，但问题不需要工具）...');
  console.log(`\n   用户问题: "用 TypeScript 写一个 Hello World"`);
  console.log(`   可用工具: getWeather（获取天气）`);
  console.log(`\n   💡 模型需要判断：这个问题需要调用 getWeather 吗？`);

  const response = await ollama.chat({
    model: 'qwen2.5:3b',
    messages,
    tools: [WEATHER_TOOL],
  });

  console.log('\n📥 模型响应:');
  console.log(`   content: "${response.message.content?.slice(0, 100)}..."`);
  console.log(`   tool_calls: ${response.message.tool_calls ? '有工具调用' : '(无) — 模型判断不需要工具'}`);

  console.log('\n💡 关键洞察：模型智能地判断了"这个问题不需要工具"，直接生成了文本回答。');
  console.log('   这就是 tool_choice: "auto" 的行为——模型自己决定要不要调工具。');
  console.log(`\n🤖 完整回答:\n\n${response.message.content}\n`);
}

async function demo3_customQuestion(): Promise<void> {
  divider('场景 3：自定义问题');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = await new Promise<string>((resolve) => {
    rl.question('\n💬 请输入你的问题（例如"上海天气"、"写个排序算法"）:\n   > ', (answer) => {
      resolve(answer.trim());
    });
  });
  rl.close();

  if (!question) {
    console.log('❌ 问题不能为空');
    return;
  }

  const messages: Message[] = [
    { role: 'user', content: question },
  ];

  console.log('\n⏳ 发送请求（带 getWeather 工具）...');

  const response = await ollama.chat({
    model: 'qwen2.5:3b',
    messages,
    tools: [WEATHER_TOOL],
  });

  const toolCalls = response.message.tool_calls as ToolCall[] | undefined;

  if (toolCalls && toolCalls.length > 0) {
    const toolCall = toolCalls[0]!;
    console.log(`\n🔧 模型决定调用工具: ${toolCall.function.name}(${JSON.stringify(toolCall.function.arguments)})`);

    // 执行工具
    const city = toolCall.function.arguments.city as string;
    const result = getWeather(city);
    console.log(`📊 工具执行结果: ${result}`);

    // 回传
    messages.push(response.message as Message);
    messages.push({ role: 'tool', content: result, tool_call_id: toolCall.id });

    const response2 = await ollama.chat({
      model: 'qwen2.5:3b',
      messages,
      tools: [WEATHER_TOOL],
    });

    console.log(`\n🤖 最终回答:\n\n   ${response2.message.content}\n`);
  } else {
    console.log(`\n📝 模型直接回答（不需要工具）:\n\n   ${response.message.content}\n`);
  }
}

// ============================================================
// 主菜单
// ============================================================

async function main() {
  console.clear();
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🔧 AI Agent 学习 — Demo 2: Tool-calling 演示                   ║
║                                                                  ║
║   第 3 周 Day 1  ·  理解 Function Calling 完整流程                ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

  console.log('请选择演示场景：');
  console.log('  1. 天气查询 — 完整 tool-calling 流程（推荐先看这个）');
  console.log('  2. 普通聊天 — 看模型如何判断"不需要工具"');
  console.log('  3. 自定义问题 — 你自己输入，看模型怎么决策');
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const choice = await new Promise<string>((resolve) => {
    rl.question('👉 请输入数字 (1/2/3): ', (answer) => {
      resolve(answer.trim());
    });
  });
  rl.close();

  console.log('');

  try {
    switch (choice) {
      case '1':
        await demo1_weatherQuery();
        break;
      case '2':
        await demo2_fallbackChat();
        break;
      case '3':
        await demo3_customQuestion();
        break;
      default:
        console.log('❌ 无效选择，请输入 1、2 或 3');
    }
  } catch (err) {
    console.error(`\n❌ 错误: ${err instanceof Error ? err.message : String(err)}`);
    console.error('💡 提示：确保 Ollama 正在运行 (ollama serve)');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('启动失败:', err);
  console.error('请确保 Ollama 正在运行: ollama serve');
  process.exit(1);
});