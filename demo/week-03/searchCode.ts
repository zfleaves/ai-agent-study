/**
 * searchCode 工具 — 在项目代码库中搜索
 *
 * 这是一个独立的工具模块，可以被其他 Agent 文件 import 使用。
 * 包含完整的工具定义 + 实现 + 类型。
 *
 * 使用方式：
 *   import { SEARCH_CODE_TOOL, searchCode } from './searchCode.js';
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================
// 类型
// ============================================================

export interface SearchResult {
  file: string;
  line: number;
  content: string;
}

export interface ToolDef {
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
// 工具定义
// ============================================================

export const SEARCH_CODE_TOOL: ToolDef = {
  type: 'function',
  function: {
    name: 'searchCode',
    description:
      // ✅ 三要素：做什么 + 返回什么 + 怎么用（带例子）
      "在项目代码库中搜索指定关键词，返回匹配的文件路径、行号和代码片段。" +
      "适用于查找函数定义、API 调用、类型定义、import 语句等。" +
      // ✅ 与 searchWeb 的区别（避免工具重叠）
      "与 searchWeb 的区别：searchCode 只在项目本地代码中搜索，不访问互联网。" +
      "例如搜索 'useState' 找到所有使用该 Hook 的组件，搜索 'interface' 找到所有类型定义。",
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: "搜索关键词，支持部分匹配。如 'useEffect'、'import.*from'、'ToolDef'",
        },
        lang: {
          type: 'string',
          // ✅ enum 限制可选值，减少模型传错的可能
          enum: ['ts', 'tsx', 'js', 'jsx', 'json', 'css'],
          description: "限定编程语言，不传则搜索所有文件类型。可选值：ts, tsx, js, jsx, json, css",
        },
        maxResults: {
          // ✅ integer 而非 number，写了默认值和范围
          type: 'integer',
          description: "最多返回的搜索结果条数，默认 10。范围 1-50",
        },
      },
      // ✅ 只有 query 在 required 中，另外两个是可选的
      required: ['query'],
    },
  },
};

// ============================================================
// 工具实现
// ============================================================

/**
 * 在指定目录中搜索代码
 *
 * @param query    搜索关键词
 * @param searchDir  搜索目录（默认当前目录）
 * @param lang      限定语言（可选）
 * @param maxResults 最大结果数（默认 10）
 */
export function searchCode(
  query: string,
  searchDir: string = '.',
  lang?: string,
  maxResults: number = 10,
): SearchResult[] {
  const results: SearchResult[] = [];

  try {
    const files = fs.readdirSync(searchDir);
    const targetFiles = files.filter(f => {
      if (lang && !f.endsWith(`.${lang}`)) return false;
      return f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx');
    });

    for (const file of targetFiles) {
      if (results.length >= maxResults) break;
      const filePath = path.join(searchDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (results.length >= maxResults) break;
          const line = lines[i];
          if (line && line.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              file,
              line: i + 1,
              content: line.trim(),
            });
          }
        }
      } catch {
        // 跳过无法读取的文件
      }
    }
  } catch {
    // 目录不存在等情况
  }

  return results;
}

/**
 * 格式化搜索结果（用于回传给模型）
 */
export function formatSearchResults(results: SearchResult[], query: string): string {
  if (results.length === 0) {
    return `在项目代码中未找到 "${query}"。提示：尝试换一个关键词，或不限定语言类型。`;
  }

  const lines = results.map(
    r => `${r.file}:${r.line} — ${r.content.slice(0, 120)}`,
  );
  return `找到 ${results.length} 处 "${query}" 的匹配:\n${lines.join('\n')}`;
}

/**
 * 给 Agent 用的封装函数（返回字符串，适合直接回传）
 */
export function searchCodeForAgent(args: {
  query: string;
  lang?: string;
  maxResults?: number;
}): string {
  const results = searchCode(
    args.query,
    '.',
    args.lang,
    args.maxResults ?? 10,
  );
  return formatSearchResults(results, args.query);
}