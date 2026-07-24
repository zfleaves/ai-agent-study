/**
 * 交互式 Agent 对话 — 带状态管理 + / 命令切换截断策略
 *
 * 使用方式：
 *   cd demo/week-04
 *   npx tsx chat.ts
 *
 * 命令：
 *   /help              查看所有命令
 *   /state             查看当前状态摘要
 *   /history           查看最近对话历史
 *   /truncate <策略>    切换截断策略 (sliding-window | keep-system-and-last | summarize)
 *   /tokens            查看 token 估算
 *   /clear             清空对话历史
 *   /save <文件名>      保存当前会话
 *   /load <文件名>      加载已保存会话
 *   /exit              退出
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// 从 .env 读取配置
// ============================================================

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
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
const client = new OpenAI({ apiKey: env.API_KEY, baseURL: env.BASE_URL });
const MODEL = env.MODEL_DEFAULT || 'deepseek-v4-pro';

// ============================================================
// 消息角色 & AgentState（精简版，复用核心逻辑）
// ============================================================

type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

interface AgentMessage {
  role: MessageRole;
  content: string;
  toolCallId?: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  timestamp: number;
  step: number;
}

type TruncationStrategy = 'sliding-window' | 'keep-system-and-last' | 'summarize';

class AgentState {
  readonly sessionId: string;
  private systemMessage: AgentMessage | null = null;
  private history: AgentMessage[] = [];
  private stepCount: number = 0;
  strategy: TruncationStrategy = 'keep-system-and-last';
  private maxTokens: number = 8000;
  private windowSize: number = 20;

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? `session-${Date.now().toString(36)}`;
  }

  setSystem(content: string): void {
    this.systemMessage = { role: 'system', content, timestamp: Date.now(), step: 0 };
  }

  addUserMessage(content: string): void {
    this.history.push({ role: 'user', content, timestamp: Date.now(), step: this.stepCount });
  }

  addAssistantMessage(content: string | null, toolCalls?: AgentMessage['toolCalls']): void {
    const msg: AgentMessage = {
      role: 'assistant',
      content: content ?? '',
      timestamp: Date.now(),
      step: this.stepCount,
    };
    if (toolCalls) msg.toolCalls = toolCalls;
    this.history.push(msg);
  }

  addToolResult(toolCallId: string, content: string): void {
    this.history.push({
      role: 'tool', content, toolCallId, timestamp: Date.now(), step: this.stepCount,
    });
  }

  incrementStep(): number { return ++this.stepCount; }

  getMessages(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    if (this.systemMessage) {
      msgs.push({ role: 'system', content: this.systemMessage.content });
    }
    for (const m of this.history) {
      const msg: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
        role: m.role as any,
        content: m.content,
      };
      if (m.toolCallId) (msg as any).tool_call_id = m.toolCallId;
      if (m.toolCalls) (msg as any).tool_calls = m.toolCalls;
      msgs.push(msg);
    }
    return msgs;
  }

  get messageCount(): number { return this.history.length; }
  get currentStep(): number { return this.stepCount; }

  estimateTokens(text: string): number {
    let chinese = 0, other = 0;
    for (const ch of text) {
      if (/[一-鿿]/.test(ch)) chinese++; else other++;
    }
    return Math.ceil(chinese / 1.5 + other / 4);
  }

  estimateTotalTokens(): number {
    let total = 0;
    if (this.systemMessage) total += this.estimateTokens(this.systemMessage.content);
    for (const m of this.history) {
      total += this.estimateTokens(m.content);
      if (m.toolCalls) {
        for (const tc of m.toolCalls) total += this.estimateTokens(JSON.stringify(tc.function));
      }
    }
    return total;
  }

  truncate(): number {
    switch (this.strategy) {
      case 'sliding-window':
        return this.truncateSliding();
      case 'keep-system-and-last':
        return this.truncateKeepLast();
      case 'summarize':
        return this.truncateSummarize();
      default:
        return 0;
    }
  }

  private truncateSliding(): number {
    if (this.history.length <= this.windowSize) return 0;
    const removed = this.history.length - this.windowSize;
    this.history = this.history.slice(-this.windowSize);
    return removed;
  }

  private truncateKeepLast(): number {
    let removed = 0;
    while (this.history.length > 0 && this.estimateTotalTokens() > this.maxTokens) {
      const first = this.history[0]!;
      if (first.role === 'tool') {
        this.history.splice(0, 2); removed += 2;
      } else if (first.role === 'assistant' && first.toolCalls?.length && this.history[1]?.role === 'tool') {
        this.history.splice(0, 2); removed += 2;
      } else {
        this.history.splice(0, 1); removed += 1;
      }
    }
    return removed;
  }

  private truncateSummarize(): number {
    if (this.history.length <= this.windowSize) return 0;
    const toSummarize = this.history.slice(0, -this.windowSize);
    const keep = this.history.slice(-this.windowSize);
    const parts = toSummarize
      .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
      .slice(0, 5)
      .map(m => `[${m.role}]: ${m.content.slice(0, 60)}...`);
    const summary = `[会话摘要] ${parts.join('；')}`;
    this.history = [
      { role: 'user', content: summary, timestamp: Date.now(), step: this.stepCount },
      ...keep,
    ];
    return toSummarize.length;
  }

  printSummary(): void {
    const bar = '─'.repeat(48);
    console.log(`\n  ${bar}`);
    console.log(`  📊 状态摘要`);
    console.log(`  ${bar}`);
    console.log(`  Session:  ${this.sessionId}`);
    console.log(`  步数:     ${this.stepCount}`);
    console.log(`  消息数:   ${this.history.length}`);
    console.log(`  Token:    ~${this.estimateTotalTokens()} / ${this.maxTokens}`);
    console.log(`  策略:     ${this.strategy}  (窗口: ${this.windowSize})`);
    const roles = { system: this.systemMessage ? 1 : 0, user: 0, assistant: 0, tool: 0 };
    for (const m of this.history) roles[m.role]++;
    console.log(`  角色:     system:${roles.system} user:${roles.user} assistant:${roles.assistant} tool:${roles.tool}`);
    console.log(`  ${bar}\n`);
  }

  printHistory(n: number = 10): void {
    const recent = this.history.slice(-n);
    console.log(`\n  📝 最近 ${recent.length} 条消息:`);
    for (const m of recent) {
      const content = m.content.replace(/\n/g, ' ').slice(0, 80);
      const tc = m.toolCalls ? ` 🔧→${m.toolCalls.map(t => t.function.name).join(',')}` : '';
      const tid = m.toolCallId ? ` [${m.toolCallId.slice(0, 8)}]` : '';
      console.log(`  [${m.role}] step${m.step} ${content}${tid}${tc}`);
    }
    console.log('');
  }

  toJSON(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      systemMessage: this.systemMessage,
      history: this.history,
      stepCount: this.stepCount,
      strategy: this.strategy,
      maxTokens: this.maxTokens,
      windowSize: this.windowSize,
    }, null, 2);
  }

  static fromJSON(json: string): AgentState {
    const d = JSON.parse(json);
    const s = new AgentState(d.sessionId);
    s.systemMessage = d.systemMessage;
    s.history = d.history;
    s.stepCount = d.stepCount;
    s.strategy = d.strategy ?? 'keep-system-and-last';
    s.maxTokens = d.maxTokens ?? 8000;
    s.windowSize = d.windowSize ?? 20;
    return s;
  }
}

// ============================================================
// 工具定义 & 执行
// ============================================================

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'getWeather',
      description: '获取指定城市的当前天气。城市名用中文，如 "北京"。',
      parameters: {
        type: 'object' as const,
        properties: { city: { type: 'string', description: '城市名' } },
        required: ['city'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'calculate',
      description: '计算数学表达式。如 "256 * 128"、"Math.sqrt(144)"。',
      parameters: {
        type: 'object' as const,
        properties: { expr: { type: 'string', description: '数学表达式' } },
        required: ['expr'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getCurrentTime',
      description: '获取当前日期和时间。不需要参数。',
      parameters: { type: 'object' as const, properties: {}, required: [] },
    },
  },
];

function executeTool(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'getWeather': {
      const data: Record<string, string> = {
        '北京': '晴天，25°C，湿度 45%，风力 3 级',
        '上海': '多云，28°C，湿度 65%，风力 2 级',
        '深圳': '阵雨，30°C，湿度 80%，风力 4 级',
        '杭州': '阴天，22°C，湿度 70%，风力 2 级',
        '成都': '小雨，20°C，湿度 85%，风力 1 级',
      };
      return data[args.city as string] ?? `未找到 "${args.city}" 的天气数据`;
    }
    case 'calculate': {
      try {
        return `${args.expr} = ${Function('"use strict"; return (' + (args.expr as string) + ')')()}`;
      } catch (e: any) {
        return `计算失败: ${e.message}`;
      }
    }
    case 'getCurrentTime':
      return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    default:
      return `未知工具: ${name}`;
  }
}

// ============================================================
// System Prompt
// ============================================================

const SYSTEM_PROMPT = `你是一个使用 ReAct 模式的智能助手。

工作方式：先思考（Thought）→ 再行动（Action）→ 观察结果（Observation）→ 再思考...直到能回答用户。

输出格式：
  Thought: <你的推理>
  然后调用工具（如果需要）

工具说明：
- getWeather: 查天气，城市名用中文
- calculate: 算数学表达式
- getCurrentTime: 获取当前时间

当信息足够时，直接给出最终回答，不需要再调工具。`;

// ============================================================
// Agent 循环
// ============================================================

async function agentLoop(state: AgentState, userInput: string): Promise<string> {
  state.addUserMessage(userInput);
  state.incrementStep();

  const MAX_STEPS = 5;
  let step = 0;

  while (step < MAX_STEPS) {
    step++;
    state.incrementStep();

    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: state.getMessages(),
      tools: TOOLS,
      stream: true,
    });

    // 累积流式输出的 content 和 tool_calls
    let content = '';
    const toolCallMap = new Map<number, { id: string; name: string; args: string }>();

    let firstChunk = true;
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      // 流式输出 content（Thought 或最终回答）
      if (delta.content) {
        if (firstChunk) {
          process.stdout.write('  💭 ');
          firstChunk = false;
        }
        content += delta.content;
        process.stdout.write(delta.content);
      }

      // 累积 tool_calls（流式模式下 tool_calls 是增量传递的）
      if (delta.tool_calls) {
        for (const tcDelta of delta.tool_calls) {
          const idx = tcDelta.index;
          if (!toolCallMap.has(idx)) {
            toolCallMap.set(idx, { id: tcDelta.id ?? '', name: '', args: '' });
          }
          const entry = toolCallMap.get(idx)!;
          if (tcDelta.id) entry.id = tcDelta.id;
          if (tcDelta.function?.name) entry.name += tcDelta.function.name;
          if (tcDelta.function?.arguments) entry.args += tcDelta.function.arguments;
        }
      }
    }

    if (content) console.log(''); // 换行

    const toolCalls = Array.from(toolCallMap.values())
      .filter(tc => tc.name)
      .map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.args },
      }));

    // 最终回答（无工具调用）
    if (toolCalls.length === 0) {
      state.addAssistantMessage(content);
      return content || '（空响应）';
    }

    // 工具调用
    state.addAssistantMessage(content || null, toolCalls);

    for (const tc of toolCalls) {
      const args = JSON.parse(tc.function.arguments);
      console.log(`\n  🔧 ${tc.function.name}(${JSON.stringify(args)})`);
      const result = executeTool(tc.function.name, args);
      console.log(`  👁  ${result}`);
      state.addToolResult(tc.id, result);
    }
    console.log(''); // 空行分隔下一轮
  }

  const final = '（达到最大步数，请简化问题）';
  state.addAssistantMessage(final);
  return final;
}

// ============================================================
// 命令处理
// ============================================================

const STRATEGY_NAMES: Record<string, TruncationStrategy> = {
  'sliding': 'sliding-window',
  'sliding-window': 'sliding-window',
  'window': 'sliding-window',
  'keep': 'keep-system-and-last',
  'keep-system-and-last': 'keep-system-and-last',
  'keep-last': 'keep-system-and-last',
  'summary': 'summarize',
  'summarize': 'summarize',
};

function handleCommand(input: string, state: AgentState): string | null {
  const trimmed = input.trim();

  if (trimmed === '/help') {
    return `
  ┌─────────────────────────────────────────────┐
  │  📋 可用命令                                  │
  ├─────────────────────────────────────────────┤
  │  /help              查看所有命令              │
  │  /state             查看当前状态摘要          │
  │  /history [n]       查看最近 n 条消息（默认10）│
  │  /truncate <策略>    切换截断策略              │
  │                      sliding-window           │
  │                      keep-system-and-last     │
  │                      summarize                │
  │  /tokens            查看 token 估算           │
  │  /clear             清空对话历史              │
  │  /save <文件名>      保存当前会话              │
  │  /load <文件名>      加载已保存会话            │
  │  /exit              退出                      │
  └─────────────────────────────────────────────┘`;
  }

  if (trimmed === '/state') {
    state.printSummary();
    return 'ok';
  }

  if (trimmed.startsWith('/history')) {
    const n = parseInt(trimmed.split(' ')[1] ?? '10') || 10;
    state.printHistory(n);
    return 'ok';
  }

  if (trimmed.startsWith('/truncate')) {
    const name = trimmed.split(' ')[1]?.toLowerCase();
    if (!name || !STRATEGY_NAMES[name]) {
      return `  ❌ 未知策略: "${name}"。可选: sliding-window | keep-system-and-last | summarize`;
    }
    state.strategy = STRATEGY_NAMES[name];
    console.log(`  ✅ 截断策略已切换为: ${state.strategy}`);
    // 立即执行一次截断
    const removed = state.truncate();
    if (removed > 0) console.log(`  🧹 截断了 ${removed} 条旧消息`);
    return 'ok';
  }

  if (trimmed === '/tokens') {
    console.log(`  🪙 估算 Token: ~${state.estimateTotalTokens()} / 8000`);
    console.log(`  📊 消息数: ${state.messageCount}  |  步数: ${state.currentStep}`);
    return 'ok';
  }

  if (trimmed === '/clear') {
    const count = state.messageCount;
    // 重建 state，保留 system
    const sysContent = (state as any).systemMessage?.content;
    const newState = new AgentState(state.sessionId);
    newState.strategy = state.strategy;
    if (sysContent) newState.setSystem(sysContent);
    // 复制到原引用
    Object.assign(state, newState);
    console.log(`  🧹 已清空 ${count} 条消息，system 消息保留`);
    return 'ok';
  }

  if (trimmed.startsWith('/save')) {
    const filename = trimmed.split(' ').slice(1).join(' ') || `chat-${state.sessionId}.json`;
    const savePath = path.resolve(__dirname, filename);
    fs.writeFileSync(savePath, state.toJSON(), 'utf-8');
    console.log(`  💾 已保存到: ${savePath}`);
    return 'ok';
  }

  if (trimmed.startsWith('/load')) {
    const filename = trimmed.split(' ').slice(1).join(' ');
    if (!filename) return '  ❌ 用法: /load <文件名>';
    const loadPath = path.resolve(__dirname, filename);
    if (!fs.existsSync(loadPath)) return `  ❌ 文件不存在: ${loadPath}`;
    try {
      const loaded = AgentState.fromJSON(fs.readFileSync(loadPath, 'utf-8'));
      // 复制到当前 state
      Object.assign(state, loaded);
      console.log(`  📂 已从 ${filename} 恢复会话 (${state.messageCount} 条消息)`);
      state.printSummary();
      return 'ok';
    } catch (e: any) {
      return `  ❌ 加载失败: ${e.message}`;
    }
  }

  return null; // 不是命令
}

// ============================================================
// 主函数
// ============================================================

async function main() {
  console.clear();
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  🤖 Agent 对话 — 状态管理 + 截断策略切换     ║');
  console.log('║     输入 /help 查看命令  |  /exit 退出       ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  模型: ${MODEL}`);
  console.log('');

  const state = new AgentState();
  state.setSystem(SYSTEM_PROMPT);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\n🧑 你: ',
  });

  // 追踪是否有正在处理的异步操作，防止非交互模式下过早退出
  let processing = false;
  let shouldExit = false;

  const tryExit = () => {
    if (!processing) {
      const autoSavePath = path.resolve(__dirname, `chat-${state.sessionId}.json`);
      fs.writeFileSync(autoSavePath, state.toJSON(), 'utf-8');
      console.log(`  💾 会话已自动保存到: chat-${state.sessionId}.json`);
      process.exit(0);
    }
  };

  // 启动后自动截断
  const autoTruncate = () => {
    const removed = state.truncate();
    if (removed > 0) {
      console.log(`  ⚡ 自动截断: 删除了 ${removed} 条旧消息 (token: ~${state.estimateTotalTokens()})`);
    }
  };

  const ask = () => {
    rl.prompt();
  };

  rl.on('line', async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) { ask(); return; }

    // 命令处理（同步，不需要 processing 标记）
    const cmdResult = handleCommand(trimmed, state);
    if (cmdResult === 'ok') { ask(); return; }
    if (cmdResult !== null) {
      console.log(cmdResult);
      ask();
      return;
    }

    // 退出
    if (trimmed === '/exit') {
      console.log('\n  👋 再见！');
      shouldExit = true;
      tryExit();
      return;
    }

    // 正常对话
    processing = true;
    try {
      console.log('');
      const reply = await agentLoop(state, trimmed);
      console.log(`\n🤖 助手: ${reply}`);
      // 自动截断
      autoTruncate();
    } catch (err: any) {
      console.log(`\n  ❌ 错误: ${err.message}`);
    } finally {
      processing = false;
      if (shouldExit) {
        tryExit();
      } else {
        ask();
      }
    }
  });

  rl.on('close', () => {
    shouldExit = true;
    tryExit();
  });

  ask();
}

main().catch(err => {
  console.error('❌ 启动失败:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});