# AI Agent 落地开发 学习资源

## Knowledge —— 模型与基础

- [Ollama 官方文档](https://ollama.com/)
  本地运行开源 LLM 的轻量工具，一条命令下载模型。Windows 原生支持。Use for: 所有本地模型部署。

- [Nous Research Hermes 3 模型卡 (HuggingFace)](https://huggingface.co/NousResearch/Hermes-3-Llama-3.1-8B)
  Hermes 3 官方模型卡。包含模型架构、训练数据、tool-calling 格式说明。Use for: 了解 Hermes 模型的能力边界。

- [Qwen2.5 模型卡 (HuggingFace)](https://huggingface.co/Qwen)
  阿里通义千问开源系列，中文能力最强，7B 模型本地可跑。Use for: 中文场景首选模型。

- [HuggingFace Open LLM Leaderboard](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard)
  开源 LLM 排行榜，对比各模型性能。Use for: 技术选型时的性能参考。

## Knowledge —— JS 生态工具链

- [Vercel AI SDK 官方文档](https://sdk.vercel.ai/docs)
  前端友好的 AI 开发框架，支持 React/Next.js，内置 streaming、tool-calling。Use for: Agent 前端集成首选。

- [LangChain.js 官方文档](https://js.langchain.com/)
  LangChain 的 JS 版本，完整的 Agent/RAG/Chain 工具链。Use for: 复杂的 Agent 工作流编排。

- [Ollama JS 客户端](https://github.com/ollama/ollama-js)
  Ollama 的官方 JS SDK，在 Node.js 中调用本地模型。Use for: 后端/脚本中集成 Ollama。

## Knowledge —— RAG / 本地知识库

- [Chroma 向量数据库](https://www.trychroma.com/)
  轻量开源向量数据库，JS 客户端可用，适合本地知识库。Use for: 文档向量存储与检索。

- [LanceDB](https://lancedb.com/)
  更轻量的向量数据库，无服务端，直接文件存储。Use for: 超轻量本地 RAG 方案。

- [LlamaIndex TS](https://ts.llamaindex.ai/)
  LlamaIndex 的 TypeScript 版，专注 RAG 数据管道。Use for: 文档加载、分割、索引一条龙。

## Knowledge —— 概念与理论

- [OpenAI Function Calling 文档](https://platform.openai.com/docs/guides/function-calling)
  Tool-calling 的标准范式。虽然 API 是 OpenAI 的，但概念在所有开源模型中通用。Use for: 理解 tool-calling。

- [DPO 论文 (Stanford)](https://arxiv.org/abs/2305.18290)
  偏好对齐的核心算法。Use for: 理解 Agent 如何"学好"（选读，需要时再看）。

- [Building LLM Apps 教程 (Vercel)](https://sdk.vercel.ai/docs/guides)
  Vercel 官方的 LLM 应用构建教程，JS 原生。Use for: 快速上手实战。

## Wisdom (Communities)

- [r/LocalLLaMA](https://reddit.com/r/LocalLLaMA)
  本地 LLM 部署最活跃社区，模型选型、硬件配置、排障。Use for: 部署问题排障。

- [Vercel AI SDK Discord](https://discord.gg/vercel)
  Vercel AI SDK 官方社区。Use for: JS Agent 开发问题。

- [LangChain Discord](https://discord.gg/langchain)
  LangChain 社区，JS 频道活跃。Use for: Agent/RAG 架构问题。

- [HuggingFace 论坛](https://discuss.huggingface.co/)
  模型使用和微调讨论。Use for: 模型层面的技术问题。

## Gaps

- 中文的"前端 → AI Agent"系统教程极少，需要从英文资源提炼
- JS 生态的 Agent 教程以 Vercel/LangChain 为主，需确认哪个更适合初学者
- 本地知识库的完整 JS 方案（文档→向量化→检索→LLM）需要自己组装，没有一站式教程