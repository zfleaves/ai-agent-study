import ollama from 'ollama';

const MODEL = 'qwen2.5:3b';
const PROMPT = '用 TypeScript 写一个冒泡排序函数，带类型定义';

async function streamChat() {
  const startTime = Date.now();
  let firstTokenTime = 0;
  let totalTokens = 0;

  const stream = await ollama.chat({
    model: MODEL,
    messages: [{ role: 'user', content: PROMPT }],
    stream: true,
  });

  for await (const chunk of stream) {
    if (firstTokenTime === 0) {
      firstTokenTime = Date.now();
    }
    totalTokens++;
    process.stdout.write(chunk.message.content);
  }

  const endTime = Date.now();
  const ttft = firstTokenTime - startTime;
  const total = endTime - startTime;

  console.log(`\n\n--- 性能报告 ---`);
  console.log(`模型: ${MODEL}`);
  console.log(`首 token 延迟 (TTFT): ${ttft}ms`);
  console.log(`总耗时: ${total}ms`);
  console.log(`生成 token 数: ${totalTokens} chunks`);
  console.log(`Decode 耗时: ${total - ttft}ms`);
}

streamChat().catch(console.error);