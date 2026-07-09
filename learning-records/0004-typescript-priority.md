# TypeScript 优先原则确立

用户明确要求所有代码、Demo、项目使用 TypeScript。这是前端工程师的天然优势，也是 2026 年 AI Agent 开发的最佳实践（Vercel AI SDK、LangChain.js、LanceDB 均原生支持 TS）。

**Evidence**: 用户明确表述："优先TS"。

**Implications**:
- 所有 Demo 代码统一使用 TypeScript（strict mode）
- 课程中引入 Zod 做运行时类型校验 + TypeScript 类型推导
- Agent 状态、工具定义、消息格式等核心接口均定义 type/interface
- 技术栈选择优先 TS 原生支持的库（Vercel AI SDK > LangChain.js Python）
- 复习材料中增加"TypeScript 在 Agent 中的最佳实践"专题