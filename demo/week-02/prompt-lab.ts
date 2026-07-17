import ollama from 'ollama';

const MODEL = 'qwen2.5:3b';

// 同一个任务，三种 Prompt
const TASK = '用 TypeScript 写一个函数，输入 CSV 字符串，返回解析后的对象数组';

/**
 * 💡 实验设计思路：
 * 同一个任务用三种策略各跑一次，对比 TTFT（首 token 延迟）和总耗时。
 * 记住：TTFT 主要取决于 Prompt 长度（Prefill O(N²)），
 * 总耗时 = Prefill + Decode，Decode 取决于输出长度。
 *
 * 关键观察点：
 * - Zero-shot：Prompt 最短 → TTFT 最快，但输出质量可能不稳定
 * - Few-shot：Prompt 中等 → TTFT 中等，输出格式最可控（In-Context Learning）
 * - CoT：Prompt 最长 → TTFT 最慢，但复杂推理准确率最高（自回归约束）
 *
 * 🎯 按需升级原则：先试 Zero-shot，不够再加 Few-shot，还不够才用 CoT。
 */
const prompts: Record<string, string> = {
  zeroShot: TASK,

  // Few-shot：给 1-2 个输入→输出例子，让模型通过 In-Context Learning 模仿格式
  // 注意：1-2 个例子就够了，第 3 个例子的边际收益几乎为零，但 token 成本线性增长
  fewShot: `${TASK}

示例输入：
"name,age,city\n张三,28,北京\n李四,35,上海"

示例输出：
[
  { name: "张三", age: 28, city: "北京" },
  { name: "李四", age: 35, city: "上海" }
]

请按以上格式输出。`,

  // CoT：要求模型先写出推理步骤，再给出答案
  // 本质：中间 token 约束后续 token 的概率分布 → 降低最终答案的出错概率
  // 代价：Prompt 更长 → Prefill 更久 → TTFT 更大
  cot: `${TASK}

请按以下步骤思考：
1. 分析 CSV 的结构（第一行是表头，后面是数据行）
2. 确定解析策略（按换行分割 → 按逗号分割 → 组合成对象）
3. 考虑边界情况（空行、引号内的逗号、值中有换行）
4. 写出完整代码，带 TypeScript 类型`,

};

interface PromptResult {
  label: string;
  promptLen: number;
  ttft: number;
  total: number;
  chunkCount: number;
  outputLen: number;
}

async function testPrompt(label: string, prompt: string): Promise<PromptResult> {
  const startTime = Date.now();
  let firstTokenTime = 0;
  let chunkCount = 0;
  let output = '';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 ${label}`);
  console.log(`Prompt 长度: ${prompt.length} 字符`);
  console.log(`${'='.repeat(60)}`);

  const stream = await ollama.chat({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of stream) {
    if (firstTokenTime === 0) firstTokenTime = Date.now();
    chunkCount++;
    output += chunk.message.content;
    process.stdout.write(chunk.message.content);
  }

  const endTime = Date.now();
  const ttft = firstTokenTime - startTime;
  const total = endTime - startTime;

  console.log(`\n--- 指标 ---`);
  console.log(`TTFT: ${ttft}ms | 总耗时: ${total}ms | Chunks: ${chunkCount}`);
  console.log(`输出长度: ${output.length} 字符`);

  return { label, promptLen: prompt.length, ttft, total, chunkCount, outputLen: output.length };
}

async function main() {
  console.log(`🤖 模型: ${MODEL}`);
  console.log(`📋 任务: ${TASK}\n`);

  const results: PromptResult[] = [];

  for (const [name, prompt] of Object.entries(prompts)) {
    results.push(await testPrompt(name, prompt));
  }

  // 汇总对比表
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`📊 汇总对比`);
  console.log(`${'='.repeat(60)}`);
  console.table(results.map(r => ({
    策略: r.label,
    'Prompt长度(字符)': r.promptLen,
    'TTFT(ms)': r.ttft,
    '总耗时(ms)': r.total,
    'Chunks': r.chunkCount,
    '输出长度(字符)': r.outputLen,
  })));

  // 性价比分析
  const fastest = results.reduce((a, b) => a.ttft < b.ttft ? a : b);
  const slowest = results.reduce((a, b) => a.ttft > b.ttft ? a : b);
  console.log(`\n💡 分析：`);
  console.log(`  最快 TTFT: ${fastest.label} (${fastest.ttft}ms)`);
  console.log(`  最慢 TTFT: ${slowest.label} (${slowest.ttft}ms)`);
  console.log(`  TTFT 差距: ${slowest.ttft - fastest.ttft}ms (${((slowest.ttft / fastest.ttft - 1) * 100).toFixed(0)}%)`);
}

main().catch(console.error);