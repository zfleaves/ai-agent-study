/**
 * Day 2 实验：Agent 状态管理 — 消息历史、角色管理、截断策略
 *
 * 使用方式：
 *   cd demo/week-04
 *   npx tsx agent-state.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL = 'deepseek-v4-pro';

// ============================================================
// 消息角色定义
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
  /** 元数据：时间戳，用于调试 */
  timestamp: number;
  /** 元数据：步数，用于追踪 Agent 循环步数 */
  step: number;
}

// ============================================================
// 截断策略定义
// ============================================================

type TruncationStrategy = 'sliding-window' | 'keep-system-and-last' | 'summarize';

interface TruncationConfig {
  /** 策略 */
  strategy: TruncationStrategy;
  /** 最大消息数（sliding-window 模式） */
  maxMessages?: number;
  /** 估计的最大 token 数 */
  maxTokens?: number;
  /** 滑动窗口保留最近 N 条 */
  windowSize?: number;
}

// ============================================================
// AgentState 类
// ============================================================

class AgentState {
  /** 会话 ID */
  readonly sessionId: string;
  /** 系统消息（独立存储，始终保留） */
  private systemMessage: AgentMessage | null = null;
  /** 对话历史（不含 system message） */
  private history: AgentMessage[] = [];
  /** 当前步数 */
  private stepCount: number = 0;
  /** 会话元数据 */
  private metadata: Record<string, unknown> = {};
  /** 截断配置 */
  private truncationConfig: TruncationConfig = {
    strategy: 'keep-system-and-last',
    maxTokens: 8000,
    windowSize: 20,
  };

  constructor(sessionId?: string) {
    this.sessionId = sessionId ?? `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // ============================================================
  // 消息管理
  // ============================================================

  /** 设置系统消息 */
  setSystem(content: string): void {
    this.systemMessage = {
      role: 'system',
      content,
      timestamp: Date.now(),
      step: 0,
    };
  }

  /** 添加用户消息 */
  addUserMessage(content: string): void {
    this.history.push({
      role: 'user',
      content,
      timestamp: Date.now(),
      step: this.stepCount,
    });
  }

  /** 添加助手消息（含可选的 tool_calls） */
  addAssistantMessage(
    content: string | null,
    toolCalls?: AgentMessage['toolCalls'],
  ): void {
    const msg: AgentMessage = {
      role: 'assistant',
      content: content ?? '',
      timestamp: Date.now(),
      step: this.stepCount,
    };
    if (toolCalls) {
      msg.toolCalls = toolCalls;
    }
    this.history.push(msg);
  }

  /** 添加工具返回消息 */
  addToolResult(toolCallId: string, content: string): void {
    this.history.push({
      role: 'tool',
      content,
      toolCallId,
      timestamp: Date.now(),
      step: this.stepCount,
    });
  }

  /** 步数 +1 */
  incrementStep(): number {
    return ++this.stepCount;
  }

  // ============================================================
  // 查询方法
  // ============================================================

  /** 获取完整消息列表（system + history），用于发送给 LLM */
  getMessages(): Array<{
    role: MessageRole;
    content: string;
    tool_call_id?: string;
    tool_calls?: AgentMessage['toolCalls'];
  }> {
    const msgs: Array<{
      role: MessageRole;
      content: string;
      tool_call_id?: string;
      tool_calls?: AgentMessage['toolCalls'];
    }> = [];

    if (this.systemMessage) {
      msgs.push({ role: 'system', content: this.systemMessage.content });
    }

    for (const m of this.history) {
      const msg: {
        role: MessageRole;
        content: string;
        tool_call_id?: string;
        tool_calls?: AgentMessage['toolCalls'];
      } = {
        role: m.role,
        content: m.content,
      };
      if (m.toolCallId) {
        msg.tool_call_id = m.toolCallId;
      }
      if (m.toolCalls) {
        msg.tool_calls = m.toolCalls;
      }
      msgs.push(msg);
    }

    return msgs;
  }

  /** 获取历史消息数（不含 system） */
  get messageCount(): number {
    return this.history.length;
  }

  /** 获取当前步数 */
  get currentStep(): number {
    return this.stepCount;
  }

  /** 获取最近 N 条消息 */
  getRecent(n: number): AgentMessage[] {
    return this.history.slice(-n);
  }

  /** 按角色筛选消息 */
  getByRole(role: MessageRole): AgentMessage[] {
    return this.history.filter(m => m.role === role);
  }

  // ============================================================
  // Token 估算
  // ============================================================

  /**
   * 粗略估算消息的 token 数。
   * 规则：中文 ~1.5 char/token，英文 ~4 char/token，混合取 ~2.5
   * 这不是精确计数，但足够用于截断判断。
   */
  estimateTokens(text: string): number {
    let chineseChars = 0;
    let otherChars = 0;
    for (const ch of text) {
      if (/[一-鿿　-〿＀-￯]/.test(ch)) {
        chineseChars++;
      } else {
        otherChars++;
      }
    }
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  /** 估算当前完整消息列表的总 token 数 */
  estimateTotalTokens(): number {
    let total = 0;
    if (this.systemMessage) {
      total += this.estimateTokens(this.systemMessage.content);
    }
    for (const m of this.history) {
      total += this.estimateTokens(m.content);
      if (m.toolCalls) {
        for (const tc of m.toolCalls) {
          total += this.estimateTokens(JSON.stringify(tc.function));
        }
      }
    }
    return total;
  }

  // ============================================================
  // 截断策略
  // ============================================================

  /** 配置截断策略 */
  setTruncation(config: Partial<TruncationConfig>): void {
    this.truncationConfig = { ...this.truncationConfig, ...config };
  }

  /**
   * 执行截断。
   * 返回被移除的消息数。
   */
  truncate(): number {
    const { strategy, maxTokens, windowSize } = this.truncationConfig;

    switch (strategy) {
      case 'sliding-window':
        return this.truncateSlidingWindow(windowSize ?? 20);

      case 'keep-system-and-last':
        return this.truncateKeepSystemAndLast(maxTokens ?? 8000);

      case 'summarize':
        return this.truncateSummarize(maxTokens ?? 8000, windowSize ?? 10);

      default:
        return 0;
    }
  }

  /** 滑动窗口：只保留最近 N 条消息 */
  private truncateSlidingWindow(windowSize: number): number {
    if (this.history.length <= windowSize) return 0;
    const removed = this.history.length - windowSize;
    this.history = this.history.slice(-windowSize);
    return removed;
  }

  /**
   * 保留 system + 最近消息：逐条从头部删除，直到 token 数低于阈值。
   * 确保不删除最近的 tool_calls 配对（assistant + tool 必须成对保留）。
   */
  private truncateKeepSystemAndLast(maxTokens: number): number {
    let removed = 0;
    while (this.history.length > 0 && this.estimateTotalTokens() > maxTokens) {
      // 找到第一条可安全删除的消息位置
      // 规则：不能孤立删除 tool 消息（需要配对 assistant 的 tool_calls）
      const first = this.history[0]!;
      if (first.role === 'tool') {
        // tool 消息依赖前一条 assistant 消息的 tool_calls，成对删除
        this.history.splice(0, 2);
        removed += 2;
      } else if (
        first.role === 'assistant' &&
        first.toolCalls &&
        first.toolCalls.length > 0 &&
        this.history[1]?.role === 'tool'
      ) {
        // assistant（含 tool_calls）后紧跟 tool 消息，成对删除
        this.history.splice(0, 2);
        removed += 2;
      } else {
        this.history.splice(0, 1);
        removed += 1;
      }
    }
    return removed;
  }

  /**
   * 摘要截断：将早期消息压缩为一条摘要消息。
   * 这是一个简化实现——真实场景会调用 LLM 生成摘要。
   */
  private truncateSummarize(_maxTokens: number, windowSize: number): number {
    if (this.history.length <= windowSize) return 0;

    const toSummarize = this.history.slice(0, -windowSize);
    const keep = this.history.slice(-windowSize);

    // 简化摘要：拼接前几条消息的开头
    const summaryParts = toSummarize
      .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
      .slice(0, 5)
      .map(m => `[${m.role}]: ${m.content.slice(0, 80)}...`);

    const summary = `[历史摘要] 之前的对话涉及：${summaryParts.join('；')}`;

    this.history = [
      {
        role: 'user',
        content: summary,
        timestamp: Date.now(),
        step: this.stepCount,
      },
      ...keep,
    ];

    return toSummarize.length;
  }

  // ============================================================
  // 序列化 / 反序列化
  // ============================================================

  /** 导出为可持久化的 JSON */
  toJSON(): string {
    return JSON.stringify(
      {
        sessionId: this.sessionId,
        systemMessage: this.systemMessage,
        history: this.history,
        stepCount: this.stepCount,
        metadata: this.metadata,
        truncationConfig: this.truncationConfig,
      },
      null,
      2,
    );
  }

  /** 从 JSON 恢复状态 */
  static fromJSON(json: string): AgentState {
    const data = JSON.parse(json);
    const state = new AgentState(data.sessionId);
    state.systemMessage = data.systemMessage;
    state.history = data.history;
    state.stepCount = data.stepCount;
    state.metadata = data.metadata ?? {};
    state.truncationConfig = data.truncationConfig ?? {};
    return state;
  }

  /** 保存到文件 */
  saveToFile(filePath: string): void {
    fs.writeFileSync(filePath, this.toJSON(), 'utf-8');
  }

  /** 从文件加载 */
  static loadFromFile(filePath: string): AgentState {
    if (!fs.existsSync(filePath)) {
      throw new Error(`状态文件不存在: ${filePath}`);
    }
    return AgentState.fromJSON(fs.readFileSync(filePath, 'utf-8'));
  }

  // ============================================================
  // 调试方法
  // ============================================================

  /** 打印状态摘要 */
  printSummary(): void {
    console.log(`\n📊 AgentState 摘要`);
    console.log(`   Session: ${this.sessionId}`);
    console.log(`   步数:    ${this.stepCount}`);
    console.log(`   消息数:  ${this.history.length} (不含 system)`);
    console.log(`   估算 Token: ~${this.estimateTotalTokens()}`);
    console.log(`   截断策略: ${this.truncationConfig.strategy}`);
    console.log(`   角色分布:`);
    for (const role of ['system', 'user', 'assistant', 'tool'] as MessageRole[]) {
      const count = role === 'system'
        ? (this.systemMessage ? 1 : 0)
        : this.history.filter(m => m.role === role).length;
      if (count > 0) {
        console.log(`     ${role}: ${count} 条`);
      }
    }
  }

  /** 打印最近 N 条消息的简要信息 */
  printRecent(n: number = 5): void {
    console.log(`\n📝 最近 ${Math.min(n, this.history.length)} 条消息:`);
    const recent = this.history.slice(-n);
    for (const m of recent) {
      const preview = m.content.slice(0, 60).replace(/\n/g, ' ');
      const marker = m.role === 'tool' ? ` [tool_call_id: ${m.toolCallId}]` : '';
      console.log(`  [${m.role}] step${m.step} ${preview}${preview.length < m.content.length ? '...' : ''}${marker}`);
    }
  }
}

// ============================================================
// 演示：模拟完整 Agent 对话
// ============================================================

async function demo() {
  console.clear();
  console.log('🧠 Agent 状态管理 — State 设计、历史截断、TS Class 实现');
  console.log(`   模型: ${MODEL}`);
  console.log('');

  // ============================================================
  // 实验 1：创建 AgentState 并模拟多轮对话
  // ============================================================
  console.log('═══ 实验 1：消息历史自然增长 ═══');

  const state = new AgentState();
  state.setSystem('你是一个智能助手，可以调用工具完成任务。');

  // 模拟 3 轮对话
  const conversations = [
    { user: '北京今天天气怎么样？', tool: 'getWeather', args: { city: '北京' }, result: '晴天，25°C' },
    { user: '那深圳呢？', tool: 'getWeather', args: { city: '深圳' }, result: '阵雨，30°C' },
    { user: '帮我算一下 256 × 128', tool: 'calculate', args: { expr: '256 * 128' }, result: '32768' },
  ];

  for (const conv of conversations) {
    state.addUserMessage(conv.user);
    state.incrementStep();

    state.addAssistantMessage(
      `我来帮你处理。`,
      [{
        id: `call_${Date.now()}`,
        type: 'function',
        function: { name: conv.tool, arguments: JSON.stringify(conv.args) },
      }],
    );

    state.addToolResult(`call_${Date.now() - 1}`, conv.result);
    state.incrementStep();

    state.addAssistantMessage(`结果是：${conv.result}`);
  }

  state.printSummary();
  state.printRecent(6);

  // ============================================================
  // 实验 2：Token 估算
  // ============================================================
  console.log('\n═══ 实验 2：Token 估算 ═══');

  const testTexts = [
    'Hello, world!',
    '你好，世界！',
    '这是中文测试文本，用于验证 token 估算的准确性。',
    'Mixed 混合 text 文本 for testing。',
  ];

  console.log('  文本                       估算 Token');
  console.log('  ─────                      ──────────');
  for (const t of testTexts) {
    const tokens = state.estimateTokens(t);
    console.log(`  ${t.padEnd(30)} ${tokens}`);
  }

  // ============================================================
  // 实验 3：截断策略对比
  // ============================================================
  console.log('\n═══ 实验 3：截断策略对比 ═══');

  // 创建一个有很多消息的 state
  const fatState = new AgentState();
  fatState.setSystem('你是一个智能助手。');

  // 生成 30 条模拟消息
  for (let i = 0; i < 15; i++) {
    fatState.addUserMessage(`第 ${i + 1} 轮用户问题：这是一个比较长的消息，用来测试截断策略的效果。`);
    fatState.addAssistantMessage(`第 ${i + 1} 轮助手回答：这也是一个比较长的回复，包含了一些有用的信息。`);
  }

  console.log(`  截断前: ${fatState.messageCount} 条消息, ~${fatState.estimateTotalTokens()} tokens`);

  // 策略 1：滑动窗口，保留最近 6 条
  const s1 = cloneState(fatState);
  s1.setTruncation({ strategy: 'sliding-window', windowSize: 6 });
  const removed1 = s1.truncate();
  console.log(`  sliding-window(6): 删除 ${removed1} 条, 剩余 ${s1.messageCount} 条, ~${s1.estimateTotalTokens()} tokens`);

  // 策略 2：保留 system + 最近，限制 500 tokens
  const s2 = cloneState(fatState);
  s2.setTruncation({ strategy: 'keep-system-and-last', maxTokens: 500 });
  const removed2 = s2.truncate();
  console.log(`  keep-system-and-last(500t): 删除 ${removed2} 条, 剩余 ${s2.messageCount} 条, ~${s2.estimateTotalTokens()} tokens`);

  // 策略 3：摘要截断，保留最近 6 条，其余压缩
  const s3 = cloneState(fatState);
  s3.setTruncation({ strategy: 'summarize', windowSize: 6 });
  const removed3 = s3.truncate();
  console.log(`  summarize(6): 删除 ${removed3} 条, 剩余 ${s3.messageCount} 条, ~${s3.estimateTotalTokens()} tokens`);
  console.log(`  摘要消息预览: "${s3.getRecent(1)[0]?.content.slice(0, 100)}..."`);

  // ============================================================
  // 实验 4：序列化与恢复
  // ============================================================
  console.log('\n═══ 实验 4：序列化与恢复 ═══');

  const savePath = path.resolve(__dirname, 'agent-state-snapshot.json');
  state.saveToFile(savePath);
  console.log(`  ✅ 已保存到 ${savePath}`);

  const loaded = AgentState.loadFromFile(savePath);
  console.log(`  ✅ 已从文件恢复: sessionId=${loaded.sessionId}, 消息数=${loaded.messageCount}`);

  // 验证一致性
  const originalJSON = state.toJSON();
  const loadedJSON = loaded.toJSON();
  console.log(`  ✅ 数据一致性: ${originalJSON === loadedJSON ? '完全一致' : '有差异（时间戳正常）'}`);

  // 清理
  fs.unlinkSync(savePath);
  console.log(`  🧹 已清理临时文件`);

  // ============================================================
  // 实验 5：真实场景 — 带截断的 Agent 循环
  // ============================================================
  console.log('\n═══ 实验 5：真实场景 — 长对话自动截断 ═══');

  const realState = new AgentState();
  realState.setSystem('你是一个智能助手，可以调用工具完成任务。');
  realState.setTruncation({ strategy: 'keep-system-and-last', maxTokens: 2000 });

  // 模拟 8 轮对话，每轮后检查并截断
  console.log('  轮次  消息数  估算Token  操作');
  console.log('  ────  ─────  ────────   ────');

  const topics = ['天气', '计算', '时间', '翻译', '搜索', '天气', '计算', '总结'];

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    realState.addUserMessage(`第 ${i + 1} 轮（${topic}）：这是一个测试消息，用来模拟真实对话中的消息积累。内容较长以便观察 token 增长。`);
    realState.incrementStep();
    realState.addAssistantMessage(`这里是第 ${i + 1} 轮的助手回复，关于 ${topic} 的处理结果。回复内容也保持一定长度，让 token 估算更明显。`);
    realState.incrementStep();

    const removed = realState.truncate();
    const afterTokens = realState.estimateTotalTokens();

    const action = removed > 0 ? `⚠️ 截断 ${removed} 条` : '—';
    console.log(`  ${i + 1}     ${realState.messageCount}      ~${afterTokens}        ${action}`);
  }

  realState.printSummary();

  console.log('\n✅ 所有实验完成');
  console.log('');
  console.log('  核心要点：');
  console.log('  1. AgentState 封装了消息管理、角色、截断、序列化');
  console.log('  2. 四种消息角色 system/user/assistant/tool 各有职责');
  console.log('  3. 三种截断策略 cover 了大部分场景');
  console.log('  4. 序列化让会话可以跨进程/跨天恢复');
  console.log('  5. tool 消息必须与 assistant 的 tool_calls 成对处理');
  console.log('');
}

// ============================================================
// 辅助函数
// ============================================================

function cloneState(state: AgentState): AgentState {
  return AgentState.fromJSON(state.toJSON());
}

// ============================================================
// 启动
// ============================================================

demo().catch(err => {
  console.error('❌ 错误:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});