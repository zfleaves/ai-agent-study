# AI Agent 开发工程师 — 12 周完整学习计划

> 以 Hermes Agent 为核心载体，从前端到 AI Agent 全栈，每日 30-60 分钟
> **全链路 TypeScript**，类型安全贯穿始终

**⚠️ 开始前必读：[环境准备清单](./reference/environment-setup.html)** — 硬件、软件、模型下载、前置知识检查

---

## 📐 学习路线总览

```
第 1-2 周    第 3-4 周      第 5-6 周      第 7-8 周      第 9-10 周     第 11-12 周
  地基         本地运行        Agent核心      知识库RAG       进阶模式       项目落地
                                                                              
  ██░░░░░░░    ████░░░░░     ██████░░░     ████████░░    █████████░░   ████████████
  LLM概念      Ollama环境     Tool-calling   向量数据库      多Agent       综合项目
  Agent全景    模型对话        Agent循环      RAG系统        MCP协议        作品集
  Token/Context  Prompt工程    函数调用        文档管道       记忆系统        部署上线
```

---

## 📅 第 1 周：认知地基 — "AI Agent 到底是什么"

### 本周目标
理解 LLM、Agent、Token 等核心概念，建立完整的认知地图，安装好开发环境。

| 天 | 主题 | 学习内容 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|---|
| **Day 1** | Agent 全景认知 | ✅ 已完成：Hermes Agent 概览（第 1 课） | LLM vs Agent 区别、Hermes 生态两大分支 | — | 30min |
| **Day 2** | LLM 核心概念 | 什么是 LLM？Token、Context Window、Temperature、推理过程 | Token 化原理、上下文窗口含义、Top-p/Top-k 采样 | 在 HuggingFace 浏览 Hermes 3 模型卡 | 40min |
| **Day 3** | Agent 工作原理 | Agent 三要素：感知→思考→行动。ReAct 模式简介 | ReAct 循环（Reasoning + Acting）、Tool-use 概念 | 画一张 Agent 工作流程图 | 35min |
| **Day 4** | 技术生态地图 | 2026 年 AI Agent 技术栈全景：模型层、框架层、工具层、应用层 | Ollama/Vercel AI SDK/LangChain.js/MCP 各自定位 | 手绘/脑图：技术栈关系图 | 40min |
| **Day 5** | 复盘 + 小测 | 回顾本周 5 个核心概念，完成自测 | 复盘：LLM vs Agent、Token、ReAct、生态地图 | 回答 5 个自测题 | 30min |

### 📝 第 1 周复盘模板
```
【本周学了什么】5 个核心概念（用自己的话写）
【最模糊的概念】哪个还不太懂？
【最有趣的点】哪个让你最兴奋？
【下周想深入】有什么特别想深入的方向？
```

---

## 📅 第 2 周：Ollama 环境 + 第一个本地模型

### 本周目标
在 Windows 上安装 Ollama，拉取 Hermes 3.1 模型，用 JS 代码与模型对话。

| 天 | 主题 | 学习内容 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|---|
| **Day 1** | Ollama 安装与配置 | 安装 Ollama for Windows，了解模型文件格式（GGUF）、量化概念 | GGUF 格式、Q4/Q8 量化、模型大小 vs 质量 | 安装 Ollama，拉取 Hermes 3.1 8B | 40min |
| **Day 2** | 命令行对话 | `ollama run` 命令、模型参数调整、System Prompt 设定 | System Prompt 作用、Temperature 调节、多轮对话 | 在终端用不同 Prompt 和 Hermes 对话 | 35min |
| **Day 3** | JS SDK 接入 | 使用 `ollama-js` 在 Node.js + TypeScript 中调用模型，处理流式响应 | Streaming 原理、SSE、异步迭代、类型定义 | 写一个 TS 脚本：流式对话 Hermes | 45min |
| **Day 4** | Prompt 工程基础 | 角色设定、Few-shot、Chain-of-Thought 提示技巧 | Zero-shot vs Few-shot、CoT 思维链、System Prompt 设计 | 设计 3 种 Prompt 模板，对比效果 | 40min |
| **Day 5** | 复盘 + Demo | 本周知识点回顾，完成第一个 Demo | 本周复盘 | **Demo 1：命令行聊天机器人**（Node.js + Hermes） | 45min |

### 🎯 Demo 1：命令行聊天机器人
```
功能：终端输入文字 → Hermes 流式回复 → 支持多轮对话
技术：Node.js + TypeScript + ollama-js + readline
关键点：流式输出、对话历史管理、类型安全、Ctrl+C 退出
```

### 📝 第 2 周复盘模板
```
【本周动手做了什么】Demo 1 完成了吗？遇到什么坑？
【最有收获的操作】哪个步骤让你最有"懂了"的感觉？
【Prompt 设计心得】什么样的 Prompt 效果好？
【模型表现观察】Hermes 回答质量如何？中文怎么样？
```

---

## 📅 第 3 周：Tool-calling — 让模型"做事"

### 本周目标
理解 Function Calling 机制，让 Hermes 能调用你定义的 JS 函数，这是 Agent 的核心能力。

| 天 | 主题 | 学习内容 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|---|
| **Day 1** | Tool-calling 原理 | 什么是 Function Calling？请求格式、响应格式、工具注册 | JSON Schema 定义工具、tool_choice 参数、Hermes 的 tool-calling 格式 | 阅读 Hermes 3 的 tool-calling 文档 | 40min |
| **Day 2** | 定义第一个工具 | 用 JS 定义一个工具函数，注册给 Hermes，让它调用 | 工具描述（description）、参数 Schema（parameters）、必填/可选 | 写一个 `getWeather(city)` 工具，让 Hermes 调用 | 45min |
| **Day 3** | 工具调用循环 | 模型输出 tool_call → 执行函数 → 返回结果 → 模型继续推理 | 多轮 tool-calling、工具链式调用、错误处理 | 实现完整的 tool-call 循环（JS） | 50min |
| **Day 4** | 多工具编排 | 同时注册多个工具，让模型自主选择调用哪个 | 工具选择逻辑、并行调用 vs 串行调用、工具冲突 | 注册 3 个工具（天气/搜索/计算器） | 45min |
| **Day 5** | 复盘 + Demo | 本周知识点回顾，完成 Tool-calling Demo | 本周复盘 | **Demo 2：工具调用 Agent**（多工具 + 循环） | 50min |

### 🎯 Demo 2：工具调用 Agent
```
功能：用户自然语言提问 → Agent 自动选择工具 → 执行 → 返回结果
工具：getWeather(city) / searchWeb(query) / calculate(expr) / getCurrentTime()
技术：Node.js + TypeScript + ollama-js + Hermes 3.1 tool-calling
关键点：工具注册、调用循环、结果格式化、错误兜底
```

---

## 📅 第 4 周：Agent 核心循环 — 从"调用"到"自主"

### 本周目标
深入理解 Agent 的决策循环，实现 ReAct 模式，让 Agent 能自主规划和执行多步任务。

| 天 | 主题 | 学习内容 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|---|
| **Day 1** | ReAct 模式深入 | Reasoning + Acting 的完整循环：Thought → Action → Observation → ... | Agent 循环终止条件、最大步数限制、Thought 质量 | 手写 ReAct 循环的伪代码 | 40min |
| **Day 2** | Agent 状态管理 | 对话历史、工具调用历史、当前状态追踪 | State 设计、消息角色（user/assistant/tool/system）、历史截断策略 | 实现 Agent 状态管理器（JS Class） | 45min |
| **Day 3** | 错误处理与重试 | 工具调用失败、超时、格式错误、幻觉调用 | 重试策略、降级方案、安全护栏 | 给 Agent 加错误处理和重试机制 | 45min |
| **Day 4** | Agent 规划能力 | 复杂任务分解、子目标设定、Plan-Execute 模式 | Task Decomposition、Plan-then-Act vs ReAct、子任务依赖 | 让 Agent 先做计划再执行 | 40min |
| **Day 5** | 复盘 + Demo | 本周知识点回顾，完成 Agent 循环 Demo | 周复盘 | **Demo 3：自主任务 Agent**（规划+执行+错误恢复） | 50min |

### 🎯 Demo 3：自主任务 Agent
```
功能：用户给一个复杂任务 → Agent 自动分解 → 逐步执行 → 汇报结果
示例："帮我查一下北京天气，如果下雨就提醒我带伞，然后查明天的高铁到上海"
技术：Node.js + TypeScript + Hermes + 多工具 + ReAct 循环 + 状态管理
关键点：任务分解、多步执行、中间状态可视化、最终总结
```

### 📝 第 3-4 周复盘（中期复盘）
```
【Agent 核心理解】用自己的话解释"Agent 是怎么工作的"
【Tool-calling 心得】什么情况下模型选错了工具？
【最难的 Bug】Agent 开发中遇到什么坑？
【Demo 效果】Agent 能自主完成多步任务吗？质量如何？
【下半程期待】接下来最想学 RAG 还是多 Agent？
```

---

## 📅 第 5 周：RAG 原理 — 让模型"读你的文档"

### 本周目标
理解 RAG（检索增强生成）的完整原理，搭建文档处理管道。

| 天 | 主题 | 学习内容 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|---|
| **Day 1** | RAG 全景原理 | 为什么需要 RAG？检索→增强→生成三步走 | RAG vs 微调、上下文注入、知识截止问题 | 画 RAG 架构图 | 35min |
| **Day 2** | 文档处理管道 | 文档加载、文本分割（Chunking）、清洗 | Markdown/PDF 解析、Chunk Size/Overlap 策略、中文分块技巧 | 用 JS 实现文档分割器 | 45min |
| **Day 3** | Embedding 向量化 | 什么是 Embedding？文本→向量的过程、语义相似度 | Embedding 模型选型、余弦相似度、向量维度含义 | 用 Ollama 生成文本 Embedding | 45min |
| **Day 4** | 向量数据库 | 向量存储与检索原理、ANN 近似最近邻、索引类型 | Chroma/LanceDB 对比、HNSW 索引、Metadata 过滤 | 安装 LanceDB，存入 + 检索向量 | 45min |
| **Day 5** | 复盘 + Demo | 打通 RAG 全链路 | 周复盘 | **Demo 4：文档问答系统**（单文档 RAG） | 50min |

### 🎯 Demo 4：文档问答系统
```
功能：上传一篇 Markdown 文档 → 分割 → 向量化 → 存储 → 提问 → 检索+回答
技术：Node.js + TypeScript + LanceDB + Ollama Embedding + Hermes 3.1
关键点：文档分割策略、检索精度、答案引用原文
```

---

## 📅 第 6 周：本地知识库 — 生产级 RAG

### 本周目标
从单文档 RAG 升级到多文档知识库，优化检索质量，处理中文文档。

| 天 | 主题 | 学习内容 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|---|
| **Day 1** | 多文档索引 | 批量文档导入、目录递归、Metadata 管理 | 文档来源标记、更新策略、增量索引 | 实现对项目代码库的索引 | 45min |
| **Day 2** | 检索优化 | 混合检索（关键词+语义）、重排序（Rerank）、多路召回 | BM25 + 向量混合、Cross-encoder Reranker、检索质量评估 | 实现混合检索 + Rerank | 50min |
| **Day 3** | 中文优化 | 中文分词、中文 Embedding 模型、多语言处理 | jieba 分词、BGE 中文 Embedding、中英混合检索 | 切换中文 Embedding 模型对比效果 | 45min |
| **Day 4** | RAG 高级模式 | 摘要索引、分层索引、查询改写、HyDE | 查询扩展、假设文档嵌入、父子文档检索 | 实现查询改写 + 分层检索 | 45min |
| **Day 5** | 复盘 + Demo | 本周知识点回顾，多文档知识库 | 周复盘 | **Demo 5：本地知识库系统**（多文档 + 优化检索） | 50min |

### 🎯 Demo 5：本地知识库系统
```
功能：导入整个文件夹（Markdown/代码/笔记）→ 智能检索 → 对话问答
技术：Node.js + TypeScript + LanceDB + Ollama + Hermes 3.1 + 混合检索
关键点：多文档管理、检索精度、引用来源、对话历史集成
```

### 📝 第 5-6 周复盘（中期复盘）
```
【RAG 核心理解】用自己的话解释 RAG 的完整流程
【检索质量】检索结果准确吗？什么情况下找不到相关内容？
【Chunking 策略】多大的 Chunk 最好？Overlap 怎么设？
【中文效果】中文文档检索效果如何？需要哪些优化？
【下一步】知识库和 Agent 如何结合？
```

---

## 📅 第 7 周：Vercel AI SDK — 前端原生 Agent 框架

### 本周目标
掌握 Vercel AI SDK，用前端最熟悉的方式构建 Agent 应用。

| 天 | 主题 | 学习内容 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|---|
| **Day 1** | AI SDK 入门 | `useChat` hook、Provider 模式、Streaming 响应 | Vercel AI SDK 架构、多 Provider 适配、React Server Components | 用 AI SDK 连接 Hermes 实现对话 | 45min |
| **Day 2** | Tool-calling with AI SDK | `tool()` 函数定义、自动工具执行、UI 状态 | AI SDK 的 tool 定义方式、maxSteps、onToolCall 回调 | 用 AI SDK 实现 Tool-calling UI | 50min |
| **Day 3** | Agent 模式 | `generateText` + `streamText`、Agent 循环、错误处理 | AI SDK 的 Agent 实现方式、与手写循环的对比 | 用 AI SDK 重构 Demo 3 的 Agent | 50min |
| **Day 4** | RAG with AI SDK | `useRag` 模式、向量检索集成、Source 展示 | AI SDK 的 RAG 支持、自定义数据源、引用 UI | 用 AI SDK 重构 Demo 5 的知识库 | 50min |
| **Day 5** | 复盘 + Demo | 前端 Agent 应用 | 周复盘 | **Demo 6：Agent 对话 UI**（React + AI SDK + Hermes） | 50min |

### 🎯 Demo 6：Agent 对话 UI
```
功能：React 前端 → 对话界面 → Agent 工具调用可视化 → 流式响应
技术：Next.js/React + TypeScript + Vercel AI SDK + Ollama + Hermes
关键点：Streaming UI、工具调用状态展示、错误展示、移动端适配
```

---

## 📅 第 8 周：MCP 协议 — 2026 年 Agent 工具标准

### 本周目标
学习 Model Context Protocol（MCP），2026 年 Agent 工具集成的行业标准。

| 天 | 主题 | 学习内容 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|---|
| **Day 1** | MCP 协议概述 | 什么是 MCP？为什么需要标准协议？ | MCP vs 自定义 Tool、Client-Server 架构、传输层（stdio/SSE） | 阅读 MCP 官方规范文档 | 40min |
| **Day 2** | MCP Server 开发 | 用 JS 写一个 MCP Server，暴露工具 | MCP Server SDK、工具注册、资源暴露、Prompt 模板 | 写一个 MCP Server（天气+搜索） | 50min |
| **Day 3** | MCP Client 集成 | 在 Agent 中集成 MCP Client，动态发现工具 | MCP Client SDK、工具发现、动态工具列表 | 让 Hermes Agent 连接 MCP Server | 50min |
| **Day 4** | MCP 生态 | 社区 MCP Server、资源市场、最佳实践 | 文件系统 Server、数据库 Server、Web 搜索 Server | 集成 3 个社区 MCP Server | 45min |
| **Day 5** | 复盘 + Demo | 标准工具协议 | 周复盘 | **Demo 7：MCP Agent**（通过 MCP 协议动态加载工具） | 50min |

### 🎯 Demo 7：MCP Agent
```
功能：Agent 启动 → 连接多个 MCP Server → 动态发现工具 → 执行任务
技术：Node.js + TypeScript + MCP SDK + Hermes + 3 个 MCP Server
关键点：动态工具发现、多 Server 管理、工具冲突处理
```

---

## 📅 第 9 周：Agent 记忆系统 — 让 Agent"记住"你

### 本周目标
实现 Agent 的记忆系统：短期记忆（对话历史）、长期记忆（用户偏好）、工作记忆（当前任务状态）。

| 天 | 主题 | 学习内容 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|---|
| **Day 1** | 记忆系统架构 | 三层记忆：Working / Short-term / Long-term | 认知架构、记忆衰减、优先级策略 | 设计记忆系统架构图 | 40min |
| **Day 2** | 短期记忆 | 对话窗口管理、滑动窗口、摘要压缩 | Token 预算分配、历史截断策略、关键信息保留 | 实现对话历史管理器（窗口+摘要） | 45min |
| **Day 3** | 长期记忆 | 用户偏好存储、向量化记忆检索、记忆更新 | 记忆向量化、相关性检索、记忆合并策略 | 用 LanceDB 实现长期记忆存储 | 50min |
| **Day 4** | 记忆整合 | 三层记忆联动、记忆注入 Prompt、遗忘机制 | 记忆优先级、Prompt 拼接策略、过期清理 | 给 Agent 加上完整记忆系统 | 50min |
| **Day 5** | 复盘 + Demo | 有记忆的 Agent | 周复盘 | **Demo 8：记忆 Agent**（记得你是谁、聊过什么、偏好什么） | 50min |

### 🎯 Demo 8：记忆 Agent
```
功能：Agent 记住用户的名字、偏好、历史话题 → 跨会话保持记忆
技术：Node.js + TypeScript + LanceDB + Hermes + 三层记忆架构
关键点：跨会话记忆恢复、偏好学习、记忆衰减、遗忘策略
```

---

## 📅 第 10 周：多 Agent 协作 — 团队作战

### 本周目标
理解多 Agent 协作模式，实现 Agent 团队分工和通信。

| 天 | 主题 | 学习内容 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|---|
| **Day 1** | 多 Agent 模式 | Supervisor、Peer-to-Peer、Hierarchical、Swarm | 各模式适用场景、通信协议、任务分配 | 设计一个多 Agent 系统架构 | 40min |
| **Day 2** | Agent 通信 | Agent 间消息传递、任务委托、结果汇总 | 消息格式、委托协议、冲突解决 | 实现两个 Agent 的通信 | 45min |
| **Day 3** | 角色分工 | 专家 Agent 设计、任务路由、质量审查 | 角色定义、专长领域、审查 Agent | 实现 3 个角色 Agent（研究员/编码/审查） | 50min |
| **Day 4** | 工作流编排 | 串行流水线、并行执行、条件分支、人工审批 | DAG 工作流、状态机、中断点 | 实现 Agent 工作流引擎 | 50min |
| **Day 5** | 复盘 + Demo | 多 Agent 系统 | 周复盘 | **Demo 9：Agent 团队**（3 个 Agent 协作完成任务） | 60min |

### 🎯 Demo 9：Agent 团队
```
功能：用户给任务 → Supervisor 分配 → 研究员查资料 → 编码者写代码 → 审查者检查
技术：Node.js + TypeScript + Hermes + 多 Agent 框架 + 通信协议
关键点：任务分解、角色调度、结果汇总、质量保证
```

---

## 📅 第 11 周：综合项目 — 本地知识库 Agent 应用

### 本周目标
融合前三周所学，构建一个完整的本地知识库 Agent 应用，可作为作品集项目。

| 天 | 主题 | 学习内容 | 动手 | 时长 |
|---|---|---|---|---|
| **Day 1** | 项目设计 | 需求分析、技术选型、架构设计 | 写项目设计文档（架构图 + 技术栈 + 数据流） | 45min |
| **Day 2** | 后端搭建 | Agent 核心 + RAG 管道 + 工具集成 | 实现后端 API（Agent 对话 + 知识库检索 + 工具调用） | 60min |
| **Day 3** | 前端搭建 | React 对话界面 + 知识库管理 UI + 工具可视化 | 实现前端（Streaming 对话 + 文档上传 + 检索结果展示） | 60min |
| **Day 4** | 联调 + 优化 | 前后端联调、性能优化、错误处理 | 全链路联调、响应速度优化、边界情况处理 | 60min |
| **Day 5** | 复盘 + 测试 | 端到端测试、Bug 修复、文档完善 | **Demo 10：完整项目**（本地知识库 Agent 应用） | 60min |

### 🎯 Demo 10：本地知识库 Agent 应用（作品集项目）
```
功能：
  - 📁 文档管理：上传 Markdown/PDF/代码文件，自动索引
  - 💬 智能对话：基于知识库的问答，引用原文来源
  - 🔧 工具调用：网络搜索、代码执行、计算器等
  - 🧠 记忆系统：记住用户偏好和历史对话
  - 🎨 美观 UI：Streaming 响应、工具调用可视化、暗色模式

技术栈：
  - 前端：Next.js + TypeScript + Vercel AI SDK + Tailwind CSS
  - 后端：Node.js + TypeScript + Ollama + Hermes 3.1
  - 知识库：LanceDB + Ollama Embedding
  - 工具：MCP Server 集成

关键指标：
  - 检索延迟 < 1s
  - 回答准确率 > 80%
  - 支持 100+ 文档
  - 流式首字响应 < 2s
```

---

## 📅 第 12 周：工程化 + 部署 + 总结

### 本周目标
将项目工程化，学习部署方案，做最终总结和未来方向规划。

| 天 | 主题 | 学习内容 | 动手 | 时长 |
|---|---|---|---|---|
| **Day 1** | 性能优化 | 模型量化、缓存策略、并发处理 | 对 Demo 10 做性能优化（量化模型、缓存 Embedding、并发检索） | 50min |
| **Day 2** | 测试与监控 | Agent 评估方法、日志系统、监控指标 | 加入日志系统、Agent 评估指标、错误追踪 | 45min |
| **Day 3** | 部署方案 | Docker 化、本地部署 vs 云部署、CI/CD | 将项目 Docker 化，写部署文档 | 50min |
| **Day 4** | 作品集整理 | 项目 README、Demo 视频、技术博客大纲 | 写项目 README + 技术分享大纲 | 40min |
| **Day 5** | 最终复盘 | 12 周学习总结、技能地图、下一步方向 | 完成最终复盘报告 + 未来学习路线 | 45min |

### 📝 最终复盘模板
```
【12 周技能地图】
  - Agent 开发：___/10
  - RAG 知识库：___/10
  - 工具集成：___/10
  - 前端集成：___/10
  - 工程化部署：___/10

【最满意的 Demo】哪个 Demo 做得最好？
【最大的成长】和 12 周前相比，最大的变化是什么？
【遗留问题】还有哪些没搞懂的地方？
【下一步方向】想继续深入哪个方向？
  - [ ] Agent 微调（训练自己的 Agent 模型）
  - [ ] 生产级部署（云服务、K8s）
  - [ ] 垂直领域 Agent（客服、编码、数据分析）
  - [ ] 多模态 Agent（图像、语音、视频）
  - [ ] 其他：______
```

---

## 📊 学习节奏总览

| 阶段 | 周数 | 主题 | Demo 产出 | 核心技能 |
|---|---|---|---|---|
| 地基 | 1-2 | LLM 概念 + 本地运行 | Demo 1：聊天机器人 | Ollama、Prompt、JS SDK |
| Agent 核心 | 3-4 | Tool-calling + Agent 循环 | Demo 2-3：工具 Agent | Function Calling、ReAct 循环 |
| 知识库 | 5-6 | RAG + 本地知识库 | Demo 4-5：知识库 | Embedding、向量数据库、检索 |
| 框架 | 7-8 | Vercel AI SDK + MCP | Demo 6-7：前端 Agent | AI SDK、MCP 协议 |
| 进阶 | 9-10 | 记忆系统 + 多 Agent | Demo 8-9：记忆/团队 | 记忆架构、Agent 协作 |
| 落地 | 11-12 | 综合项目 + 工程化 | Demo 10：完整应用 | 全栈、部署、作品集 |

---

## 🔄 每日学习模板

```
【日期】2026-07-XX  第 X 周 Day X
【今日主题】_______________
【学习时长】___ 分钟
【核心知识点】
  1. 
  2. 
  3. 
【动手做了什么】
  - 
【遇到的问题】
  - 
【解决方案】
  - 
【今日收获（一句话）】
  _______________
【明日计划】
  _______________
```

---

## 🧪 10 个 Demo 总览

| # | Demo 名称 | 周 | 核心技能 | 产出 |
|---|---|---|---|---|
| 1 | 命令行聊天机器人 | 2 | Ollama + JS SDK | 终端对话程序 |
| 2 | 工具调用 Agent | 3 | Tool-calling | 多工具 Agent |
| 3 | 自主任务 Agent | 4 | ReAct 循环 | 规划执行 Agent |
| 4 | 文档问答系统 | 5 | 单文档 RAG | RAG 问答 |
| 5 | 本地知识库系统 | 6 | 多文档 RAG | 知识库应用 |
| 6 | Agent 对话 UI | 7 | Vercel AI SDK | React Agent 界面 |
| 7 | MCP Agent | 8 | MCP 协议 | 标准工具协议 |
| 8 | 记忆 Agent | 9 | 记忆系统 | 个性化 Agent |
| 9 | Agent 团队 | 10 | 多 Agent | 协作 Agent |
| 10 | 完整知识库 Agent | 11-12 | 全栈 | 作品集项目 |

---

## 📋 关键知识点清单（Checklist）

### LLM 基础
- [ ] Token 和 Tokenization 原理
- [ ] Context Window 和上下文管理
- [ ] Temperature / Top-p / Top-k 采样
- [ ] System Prompt vs User Prompt
- [ ] Few-shot / Zero-shot / Chain-of-Thought

### TypeScript 工程化
- [ ] 项目 tsconfig 配置（strict mode + ESM）
- [ ] Agent 相关类型定义（Message / Tool / State / Memory）
- [ ] Zod Schema → TypeScript Type 自动推导
- [ ] 异步流式处理的类型安全（AsyncGenerator / ReadableStream）
- [ ] 工具函数的类型安全定义（Zod + TypeScript 泛型）

### Agent 核心
- [ ] ReAct 循环（Reasoning + Acting）
- [ ] Function Calling / Tool-use 机制
- [ ] JSON Schema 工具定义
- [ ] Agent 状态管理
- [ ] 错误处理与重试策略
- [ ] Plan-Execute 模式

### RAG 知识库
- [ ] RAG 三阶段：检索→增强→生成
- [ ] 文档分割（Chunking）策略
- [ ] Embedding 向量化原理
- [ ] 向量数据库（LanceDB/Chroma）
- [ ] 混合检索（BM25 + 向量）
- [ ] Rerank 重排序
- [ ] 查询改写与扩展

### 框架与协议
- [ ] Vercel AI SDK（useChat / generateText / streamText）
- [ ] MCP 协议（Server / Client / Transport）
- [ ] LangChain.js 基础
- [ ] Ollama API 与模型管理

### 进阶
- [ ] Agent 记忆系统（三层架构）
- [ ] 多 Agent 协作模式
- [ ] Agent 评估方法
- [ ] 部署方案（Docker / 本地）

---

*计划版本：v1.0 · 最后更新：2026-07-09*