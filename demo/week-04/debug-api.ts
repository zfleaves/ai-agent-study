/**
 * 快速调试：检查云端 API 返回格式
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import OpenAI from 'openai';

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
console.log('API_KEY:', env.API_KEY?.slice(0, 10) + '...');
console.log('BASE_URL:', env.BASE_URL);
console.log('MODEL:', env.MODEL);

const client = new OpenAI({
  apiKey: env.API_KEY,
  baseURL: env.BASE_URL,
});

async function main() {
  // 列出可用模型
  try {
    const list = await client.models.list();
    console.log('可用模型:');
    for (const m of list.data) {
      console.log(`  - ${m.id}`);
    }
  } catch (err: any) {
    console.error('列出模型失败:', err.message);
  }
}

main();