/**
 * Demo 1：命令行聊天机器人 + 速度报告
 *
 * 功能：终端输入文字 → 模型流式回复 → 支持多轮对话
 * 技术：Node.js + TypeScript + ollama-js + readline
 *
 * 使用方式：
 *   npx tsx chatbot.ts
 *
 * 交互命令：
 *   输入文字 → 发送消息
 *   /model <name> → 切换模型（hermes3:8b / qwen2.5:3b）
 *   /speed → 显示当前会话的速度统计
 *   /clear → 清空对话历史
 *   /exit 或 Ctrl+C → 退出
 */

import * as readline from 'node:readline';
import ollama from 'ollama';

// ============================================================
// 类型定义
// ============================================================

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface TurnStats {
  turn: number;
  model: string;
  promptLen: number;
  ttft: number;   // 首 token 延迟 (ms)
  total: number;  // 本轮总耗时 (ms)
  outputLen: number;
}

// ============================================================
// 配置
// ============================================================

const SYSTEM_PROMPT: Message = {
  role: 'system',
  content: '你是一个友好的 AI 助手。用中文回答，回答简洁（不超过 200 字），代码示例用 TypeScript。',
};

// 默认模型用 3B，响应快，交互流畅
let currentModel = 'qwen2.5:3b';

// 对话历史
let messages: Message[] = [SYSTEM_PROMPT];

// 速度统计
let stats: TurnStats[] = [];
let turnCount = 0;

// ============================================================
// 核心：流式对话
// ============================================================

async function chat(userInput: string): Promise<void> {
  turnCount++;

  // 添加用户消息到历史
  messages.push({ role: 'user', content: userInput });

  const startTime = Date.now();
  let firstTokenTime = 0;
  let output = '';

  process.stdout.write(`\n🤖 `);

  const stream = await ollama.chat({
    model: currentModel,
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    if (firstTokenTime === 0) {
      firstTokenTime = Date.now();
    }
    output += chunk.message.content;
    process.stdout.write(chunk.message.content);
  }

  const endTime = Date.now();
  const ttft = firstTokenTime - startTime;
  const total = endTime - startTime;

  // 添加助手回复到历史
  messages.push({ role: 'assistant', content: output });

  // 记录本轮统计
  const turnStats: TurnStats = {
    turn: turnCount,
    model: currentModel,
    promptLen: userInput.length,
    ttft,
    total,
    outputLen: output.length,
  };
  stats.push(turnStats);

  // 显示本轮指标
  console.log(`\n\n⏱️  TTFT: ${ttft}ms | 总耗时: ${total}ms | 输出: ${output.length} 字符`);
}

// ============================================================
// 交互命令
// ============================================================

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🤖 Demo 1: 命令行聊天机器人                              ║
╠══════════════════════════════════════════════════════════╣
║  输入文字    → 发送消息                                   ║
║  /model      → 切换模型 (hermes3:8b / qwen2.5:3b)          ║
║  /speed      → 显示速度统计                                ║
║  /report     → 显示完整速度对比报告                         ║
║  /history    → 显示对话历史长度                             ║
║  /clear      → 清空对话历史                                ║
║  /help       → 显示此帮助                                  ║
║  /exit       → 退出                                        ║
╚══════════════════════════════════════════════════════════╝
`);
}

function showSpeed(): void {
  if (stats.length === 0) {
    console.log('📊 还没有对话记录。先聊几句吧！');
    return;
  }

  const last = stats[stats.length - 1]!;
  const avgTTFT = stats.reduce((s, r) => s + r.ttft, 0) / stats.length;
  const avgTotal = stats.reduce((s, r) => s + r.total, 0) / stats.length;
  const totalOutput = stats.reduce((s, r) => s + r.outputLen, 0);

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 速度统计                                              ║
╠══════════════════════════════════════════════════════════╣
║  当前模型:   ${currentModel.padEnd(25)}        ║
║  对话轮数:   ${String(stats.length).padEnd(25)}        ║
║  平均 TTFT:  ${String(Math.round(avgTTFT) + 'ms').padEnd(25)}        ║
║  平均总耗时:  ${String(Math.round(avgTotal) + 'ms').padEnd(25)}        ║
║  最近 TTFT:  ${String(last.ttft + 'ms').padEnd(25)}        ║
║  总输出字符:  ${String(totalOutput).padEnd(25)}        ║
╚══════════════════════════════════════════════════════════╝
`);
}

function showReport(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════════╗
║  📊 模型速度对比报告（基于 Day 2-4 实测数据）                                      ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  指标              │ hermes3:8b (4.7GB)  │ qwen2.5:3b (1.9GB)  │ 差异             ║
║  ─────────────────┼────────────────────┼────────────────────┼───────────────    ║
║  模型大小          │ 8B Q4_K_M            │ 3B Q4_K_M            │ 8B 大 2.7x      ║
║  磁盘占用          │ 4.7 GB               │ 1.9 GB               │ 8B 大 2.5x      ║
║  内存占用(空闲)     │ ~5.5 GB              │ ~2.5 GB              │ 8B 大 2.2x      ║
║  首 Token 延迟     │ 600-1200ms           │ 200-500ms            │ 8B 慢 2-3x      ║
║  生成速度          │ 8-15 tok/s           │ 20-35 tok/s          │ 3B 快 2-3x      ║
║  中文质量          │ ⭐⭐⭐ 较好            │ ⭐⭐ 一般             │ 8B 明显更好      ║
║  代码质量          │ ⭐⭐⭐ 较好            │ ⭐⭐⭐ 不错            │ 接近             ║
║  逻辑推理          │ ⭐⭐⭐ 较好            │ ⭐⭐ 一般             │ 8B 更好          ║
║                                                                                  ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║  🎯 选型建议                                                                     ║
║  ────────────────────────────────────────────────────────────────────────────    ║
║  开发调试 → qwen2.5:3b（响应快，反馈即时）                                         ║
║  复杂推理 → hermes3:8b（质量优先，值得等待）                                       ║
║  生产环境 → 按任务复杂度动态路由（简单任务走 3B，复杂任务走 8B）                      ║
╚══════════════════════════════════════════════════════════════════════════════════╝
`);
}

function showHistory(): void {
  const userMsgs = messages.filter(m => m.role === 'user').length;
  const totalChars = messages.reduce((s, m) => s + m.content.length, 0);
  console.log(`📜 对话历史: ${userMsgs} 轮, ${messages.length} 条消息, 共 ${totalChars} 字符`);
}

function clearHistory(): void {
  messages = [SYSTEM_PROMPT];
  stats = [];
  turnCount = 0;
  console.log('🧹 对话历史已清空，统计数据已重置');
}

function switchModel(modelName: string): void {
  const validModels = ['hermes3:8b', 'qwen2.5:3b'];
  if (!validModels.includes(modelName)) {
    console.log(`❌ 未知模型: ${modelName}。可用: ${validModels.join(', ')}`);
    return;
  }
  currentModel = modelName;
  console.log(`🔄 已切换到 ${modelName}`);
}

// ============================================================
// 主循环
// ============================================================

async function main() {
  console.clear();
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🤖 AI Agent 学习 — Demo 1: 命令行聊天机器人              ║
║                                                          ║
║   第 2 周 Day 5  ·  复盘 + 第一个 Demo                     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);
  showHelp();
  console.log(`🔧 当前模型: ${currentModel} | 输入 /help 查看命令 | /exit 退出\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '💬 > ',
  });

  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    // 处理命令
    switch (input.toLowerCase()) {
      case '/exit':
        console.log('\n👋 再见！本周学习完成，下周进入 Tool-calling！');
        rl.close();
        return;
      case '/help':
        showHelp();
        rl.prompt();
        return;
      case '/speed':
        showSpeed();
        rl.prompt();
        return;
      case '/report':
        showReport();
        rl.prompt();
        return;
      case '/history':
        showHistory();
        rl.prompt();
        return;
      case '/clear':
        clearHistory();
        rl.prompt();
        return;
      default:
        break;
    }

    if (input.startsWith('/model ')) {
      switchModel(input.slice(7).trim());
      rl.prompt();
      return;
    }

    // 正常对话
    try {
      await chat(input);
    } catch (err) {
      console.error(`\n❌ 错误: ${err instanceof Error ? err.message : String(err)}`);
      console.error('💡 提示：确保 Ollama 正在运行 (ollama serve)');
    }

    rl.prompt();
  });

  rl.on('close', () => {
    // 退出前显示最终统计
    if (stats.length > 0) {
      showSpeed();
    }
    process.exit(0);
  });

  // 优雅处理 Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n');
    rl.close();
  });
}

main().catch((err) => {
  console.error('启动失败:', err);
  console.error('请确保 Ollama 正在运行: ollama serve');
  process.exit(1);
});