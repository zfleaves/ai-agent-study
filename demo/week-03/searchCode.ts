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
// query：搜索关键词，必填
// lang：编程语言过滤（如 'ts'、'js'），可选
// maxResults：最多返回条数，可选，默认 10
// 在项目代码库中搜索
// function searchCode(query: string, lang?: string, maxResults?: number): SearchResult[]

const SEARCH_CODE: ToolDef = {
    type: 'function',
    function: {
        name: 'searchCode',
        description: "在项目代码库中搜索指定关键词，返回匹配的文件路径、行号和代码片段。" +
      "适用于查找函数定义、API 调用、类型定义等。例如搜索 'useState' 找到所有使用该 Hook 的组件。",
      parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: "搜索关键词，支持部分匹配。如 'useEffect'、'import.*from'",
            },
            lang: {
                type: 'string',
                enum: ['ts", "tsx", "js", "jsx", "json", "css'],
                description: "限定编程语言，不传则搜索所有文件类型。可选值：ts, tsx, js, jsx, json, css",
            },
            maxResults: {
                type: "integer",
                description: "最多返回的搜索结果条数，默认 10。范围 1-50",
            },
        },
        required: ['query']
      }
    }
}
// ✅ 函数 description 包含三要素：做什么 + 返回什么 + 怎么用（带例子）
// ✅ query 的 description 写了匹配方式
// ✅ lang 用了 enum 限制可选值，减少模型传错的可能
// ✅ maxResults 用 integer 而非 number，写了默认值和范围
// ✅ 只有 query 在 required 中，另外两个是可选的