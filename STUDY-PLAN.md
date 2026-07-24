# AI Agent 开发工程师 — 学习计划 v3.0

> **终局项目：知识库管理平台**（4 大菜单：文档上传 / 知识核准 / 图谱展示 / 图谱审核）
> **技术栈：Python（后端 Agent） + Next.js（简单接口 + 前端） + 云端 API（LLM）**
> 每日 30-60 分钟 · 5 天/周 · 中文教学

**⚠️ 项目设计文档：** [DESIGN.md](./projects/knowledge-vault/DESIGN.md) — 产品架构 + 四大菜单
**⚠️ 流水线设计：** [PIPELINE-DESIGN.md](./projects/knowledge-vault/PIPELINE-DESIGN.md) — 5 步流水线详细设计
**⚠️ 现有前端：** `loop_web/src/pages/etl-process/` — 5 步页面 + 图谱展示 + 图谱审核

---

## 📐 技术栈

```
┌─────────────────────────────────────────────┐
│              前端（已就绪）                    │
│  React + TypeScript + Ant Design             │
│  loop_web/src/pages/etl-process/             │
├─────────────────────────────────────────────┤
│              接口层                           │
│  简单 CRUD → Next.js API Routes (TS)         │
│  复杂业务 → Python FastAPI                   │
├─────────────────────────────────────────────┤
│              Agent 层 (Python)               │
│  知识打标 / 别名消歧 / 内容审核 / 出题 / 判分  │
├─────────────────────────────────────────────┤
│              模型层                           │
│  云端 API (deepseek-v4-pro)                  │
│  多模型可切换，按 Step 独立配置               │
├─────────────────────────────────────────────┤
│              数据层                           │
│  SQLite / PostgreSQL + LanceDB (向量)        │
│  图数据库 / networkx                          │
└─────────────────────────────────────────────┘
```

---

## 🎯 终局项目：知识库管理平台

```
┌──────────────────────────────────────────────────────────┐
│                    知识库管理平台                           │
├────────────┬────────────┬────────────┬───────────────────┤
│  📄 文档上传 │  ✅ 知识核准 │  🔍 图谱展示 │  👁️ 图谱审核      │
├────────────┼────────────┼────────────┼───────────────────┤
│            │ 知识打标 →  │ 关系图可视化  │ 待审核节点列表       │
│ 文件选择    │ 别名确认 →  │ 实体检索     │ 审核通过/驳回        │
│ 格式解析    │ 内容确认 →  │ 路径分析     │ 修改建议            │
│ 分段预览    │ 图谱构建 →  │ 导出         │ 版本对比            │
│ 上传状态    │ 知识问答    │            │                   │
└────────────┴────────────┴────────────┴───────────────────┘
```

---

## 📅 学习路线总览

```
第 1-4 周      第 5-6 周       第 7-8 周       第 9-15 周                   第 16 周
  地基           Python后端       Agent实战       知识库管理平台(4大菜单)        打磨+作品集

  ██░░░░░░      ████░░░░░      ██████░░░░      ██████████████░░░           ████████████████
  LLM概念        Python速通      Tool-calling     文档上传/知识核准(5步)       全流程联调
  Agent循环      FastAPI入门     ReAct循环       图谱展示/图谱审核            作品集整理
```

---

## 📅 第 1-4 周：地基 — Agent 概念 + TypeScript 实战

> ⚠️ **第 1-3 周已完成 ✅，第 4 周进行中 🔄**

### 第 1 周：认知地基 ✅
### 第 2 周：Ollama 环境 + 本地模型 ✅
### 第 3 周：Tool-calling ✅

### 第 4 周：Agent 核心循环 🔄

| 天 | 主题 | 知识点 | 动手 |
|---|---|---|---|
| Day 1 ✅ | ReAct 模式深入 | Thought→Action→Observation、自回归约束 | ReAct 循环实验 |
| **Day 2** ✅ | **Agent 状态管理** | **State 设计、消息角色、历史截断、TS Class** | **状态管理器实现** |
| Day 3 | 错误处理与重试 | 重试策略、降级、安全护栏 | 错误处理机制 |
| Day 4 | Agent 规划能力 | Task Decomposition、Plan-Execute | 先计划再执行 |
| Day 5 | 复盘 + Demo 3 | 自主任务 Agent | 规划+执行+错误恢复 |

---

## 📅 第 5-6 周：Python 后端速通

> 🎯 **目标**：从 TypeScript 开发者视角快速掌握 Python，能写 Agent 后端代码

### 第 5 周：Python 语法 + 工程基础

| 天 | 主题 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|
| Day 1 | 环境搭建 + 语法对照 | venv、pip、pyproject.toml；类型注解 vs TS 类型 | 搭建 Python 项目，`python-dotenv` 读 `.env` | 45min |
| Day 2 | 数据结构 + 控制流 | list/dict/set/tuple vs TS Array/Map/Set；comprehension | 写数据转换函数（Entity/Relation 模型类） | 45min |
| Day 3 | 函数 + 类 + 异步 | async/await 差异；dataclass vs TS interface；Pydantic | 用 Pydantic 定义知识打标的 Entity/Relation Schema | 45min |
| Day 4 | 文件 IO + 字符串处理 | 文件读写、JSON、正则、文本处理 | 读 Markdown 文件 → 分段 → 清洗 | 40min |
| Day 5 | 复盘 + 小项目 | 本周知识点回顾 | **Python CLI 工具：读文件 → 分段 → 输出统计** | 45min |

### 第 6 周：FastAPI + LLM API 集成

| 天 | 主题 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|
| Day 1 | FastAPI 入门 | 路由、请求体、响应模型、自动文档 | 搭建 FastAPI 项目，写 `/health` + `/documents` CRUD | 45min |
| Day 2 | 调用云端 LLM API | openai SDK、streaming、错误处理、重试 | 写一个 `/api/chat` 端点，流式返回 | 50min |
| Day 3 | 多模型配置 | 按 Step 独立模型、环境变量管理、模型切换 | 实现模型工厂：根据 task 类型选择不同 MODEL_XXX | 45min |
| Day 4 | 异步任务处理 | Background Tasks、任务状态查询、长任务处理 | 实现打标任务的异步执行 + 状态轮询 | 50min |
| Day 5 | 复盘 + Demo | FastAPI + LLM 集成 | **Agent API：接收文本 → 调用 LLM → 返回结构化结果** | 50min |

---

## 📅 第 7-8 周：Agent 实战（Python 版）

> 🎯 **目标**：在 Python 中实现 Agent 核心能力——Tool Calling、ReAct、状态管理

### 第 7 周：Tool Calling + Agent 循环（Python）

| 天 | 主题 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|
| Day 1 | Tool Calling 原理复习 | 回顾 Function Calling 机制（用 Python 重新理解） | 用 Python openai SDK 实现单工具调用 | 40min |
| Day 2 | 多工具注册 + 选择 | JSON Schema 工具定义、tool_choice、多工具调度 | 注册 3 个工具，测试模型选择 | 45min |
| Day 3 | Agent 循环实现 | 多轮 tool-call 循环、终止条件、步数限制 | 实现完整的 Agent Loop（Python） | 50min |
| Day 4 | 结构化输出 | JSON Mode、Pydantic 解析、输出校验 | 让 LLM 输出符合 Pydantic Schema 的结构化数据 | 45min |
| Day 5 | 复盘 + Demo | Python Agent 核心 | **知识提取 Agent：输入文本 → 输出 Entity[] + Relation[]** | 50min |

### 第 8 周：Agent 进阶 + 知识打标 Agent V1

| 天 | 主题 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|
| Day 1 | Agent 状态管理 | State 设计、会话持久化、历史管理 | 实现 AgentState 类（Python dataclass） | 45min |
| Day 2 | 错误处理 + 重试 | 工具调用失败、超时、格式错误、重试策略 | 给 Agent 加完整的错误处理 + 重试 | 45min |
| Day 3 | 知识打标 Agent V1（上） | 实体提取 Prompt 设计、工具定义、生成策略 | 写 extractEntity / extractRelation 工具 + Prompt | 50min |
| Day 4 | 知识打标 Agent V1（下） | 跨 Chunk 去重合并、置信度评估、来源引用 | 实现后处理：去重 → 合并 → 置信度计算 | 50min |
| Day 5 | 复盘 + 集成测试 | 知识打标端到端 | **Demo：输入 Markdown 文件 → 输出结构化 Entity[] + Relation[]** | 50min |

---

## 📅 第 9-15 周：知识库管理平台 — 4 大菜单完整实现

> 🎯 **目标**：逐模块实现完整平台，每个模块包含 Python 后端 + 接口 + 对接现有前端
> 📁 现有前端：`loop_web/src/pages/etl-process/`（5 步页面已就绪）

---

### 第 9 周：菜单 1 — 📄 文档上传

```
┌─────────────────────────────────────────────────────────────┐
│  菜单 1: 文档上传                                             │
│                                                               │
│  功能：文件选择 → 格式解析 → 分段预览 → 上传入库              │
│  输入：Markdown / PDF / 纯文本 / 代码文件                      │
│  输出：Chunk[]（已分段、已入库、可被 Step 1 消费）             │
│                                                               │
│  接口：Next.js API Routes（上传 + 分段）                      │
│  后端：Python（文档解析 + Chunking + 入库）                   │
└─────────────────────────────────────────────────────────────┘
```

| 天 | 主题 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|
| Day 1 | 文件上传流程设计 | 上传流程、文件类型检测、大小限制 | 设计上传 API 接口 + 数据模型 | 40min |
| Day 2 | Next.js 文件上传接口 | FormData 解析、文件存储 | 实现 Next.js 文件上传 API Route | 45min |
| Day 3 | Python 文档解析服务 | Markdown/PDF/文本解析库、编码处理 | 写 Python 文档解析函数：读文件 → 提取纯文本 | 45min |
| Day 4 | 分段（Chunking）策略 | Chunk Size、Overlap、中文分块 | 实现分段函数 + 分段预览 API | 50min |
| Day 5 | 复盘 + 前端对接 | 上传→解析→分段→入库 全链路 | **文件上传 → 分段预览 → 入库成功** | 50min |

**检查点：** 选择一个 Markdown 文件 → 上传 → 前端展示分段结果 → 存入数据库

---

### 第 10 周：菜单 2 — ✅ 知识核准 · Step 1 知识打标

| 天 | 主题 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|
| Day 1 | 打标 Agent 架构设计 | 系统架构、数据流、API 设计 | 画架构图 + 定义 API 接口 | 40min |
| Day 2 | Prompt 工程精调 | 实体/关系类型定义、Prompt 模板优化、Few-shot | 写 3 套 Prompt 模板，A/B 测试 | 50min |
| Day 3 | 工具调用优化 | 批量调用、并行提取、速率限制 | 批量 Chunk 提取 + 并发控制 | 50min |
| Day 4 | 后处理管道 | 实体去重、关系合并、置信度归一化 | 完整后处理管道 | 50min |
| Day 5 | 复盘 + 前端对接 | 对齐 Step1Tagging.tsx | **文件上传 → 打标 → 前端展示打标结果** | 50min |

---

### 第 11 周：菜单 2 — ✅ 知识核准 · Step 2 别名确认

| 天 | 主题 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|
| Day 1 | 消歧算法设计 | 编辑距离、Embedding 相似度、多维度加权 | 候选对生成算法 | 45min |
| Day 2 | Agent 辅助消歧 | 模糊 case 的 Prompt 设计、Agent 判断 | 消歧 Agent：判断两个实体是否同义 | 45min |
| Day 3 | 别名组管理 API | 合并、拆分、编辑别名组 | 别名组 CRUD API | 50min |
| Day 4 | 批量操作 + 前端对接 | 批量确认、自动合并、对齐 Step2Alias.tsx | 批量操作 API + 前端对接 | 50min |
| Day 5 | 复盘 + 集成测试 | Step 1 → Step 2 | **打标结果 → 别名消歧 → 前端确认** | 50min |

---

### 第 12 周：菜单 2 — ✅ 知识核准 · Step 3 内容确认

| 天 | 主题 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|
| Day 1 | 审核系统设计 | 审核状态机、操作类型、记录表设计 | ReviewRecord 模型 + API 设计 | 40min |
| Day 2 | 审核 API 实现 | 逐条审核、批量审核、审核历史 | approve/reject/modify/skip API | 45min |
| Day 3 | Agent 辅助审核 | 修改建议、冲突检测、质量提示 | 审核辅助 Agent | 45min |
| Day 4 | 前端对接 + 交互优化 | 对齐 Step3Content.tsx、批量操作 | 审核列表 UI 对接 | 50min |
| Day 5 | 复盘 + 集成测试 | Step 1 → 2 → 3 | **打标 → 消歧 → 审核 全链路** | 50min |

---

### 第 13 周：菜单 2 — ✅ 知识核准 · Step 4 图谱构建

| 天 | 主题 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|
| Day 1 | 图数据模型设计 | 节点/边结构、属性映射、图存储方案 | GraphNode / GraphEdge 模型 + 转换函数 | 40min |
| Day 2 | 图构建算法 | 实体→节点、关系→边、着色/大小算法 | buildGraph() 函数 | 45min |
| Day 3 | 图统计指标 | 度、中心性、连通分量、密度 | 图统计计算（networkx） | 45min |
| Day 4 | 图谱 API + 前端对接 | 图数据 API、对齐 Step4Graph.tsx | 图谱查询 API + KnowledgeGraph 组件对接 | 50min |
| Day 5 | 复盘 + 集成测试 | Step 1 → 2 → 3 → 4 | **审核通过 → 图谱生成 → 前端可视化** | 50min |

---

### 第 14 周：菜单 2 — ✅ 知识核准 · Step 5 知识问答

| 天 | 主题 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|
| Day 1 | 出题策略设计 | 6 种题型模板、出题规则、去重 | 出题算法：图谱→题目列表 | 45min |
| Day 2 | 出题 Agent 实现 | Prompt 设计、题目生成、多样性控制 | generateQuestion Agent | 50min |
| Day 3 | 答题 + 判分 | LLM 答题、判分 Agent、正确/部分正确/错误 | 答题循环 + 判分逻辑 | 50min |
| Day 4 | 漏洞分析 + 前端对接 | 知识漏洞发现、对齐 Step5QA.tsx | 漏洞报告 + 对话测试 UI 对接 | 45min |
| Day 5 | 复盘 + 全链路测试 | **菜单 2 全链路跑通！** | **文档上传 → 打标 → 消歧 → 审核 → 图谱 → QA** | 50min |

**检查点：** 🎉 菜单 2 知识核准 5 步全链路跑通！

---

### 第 15 周：菜单 3 🔍 图谱展示 + 菜单 4 👁️ 图谱审核

```
┌─────────────────────────────────────────────────────────────┐
│  菜单 3: 图谱展示                                             │
│  关系图可视化 + 实体检索 + 路径分析 + 导出                     │
│  技术：D3.js / vis-network（现有 KnowledgeGraph 组件）        │
├─────────────────────────────────────────────────────────────┤
│  菜单 4: 图谱审核                                             │
│  待审核节点列表 + 审核通过/驳回 + 修改建议 + 版本对比          │
└─────────────────────────────────────────────────────────────┘
```

| 天 | 主题 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|
| Day 1 | 图谱展示 API | 图谱查询、实体搜索、子图过滤 | 图谱查询 API（按类型/关系/关键词） | 45min |
| Day 2 | 路径分析 + 导出 | 最短路径、所有路径、JSON/PNG 导出 | 路径分析 API + 导出功能 | 50min |
| Day 3 | 图谱审核系统 | 审核列表、审核操作、状态流转 | 审核列表 API + approve/reject 操作 | 50min |
| Day 4 | 版本对比 | 版本快照存储、差异对比 | 版本快照 API + 前后对比 | 50min |
| Day 5 | 复盘 + 全菜单联调 | 4 大菜单全部对接 | **文档上传 → 知识核准 → 图谱展示 → 图谱审核** | 50min |

**检查点：** 4 大菜单全部可用，前端后端数据流通

---

### 第 16 周：全流程串联 + 部署 + 作品集

| 天 | 主题 | 知识点 | 动手 | 时长 |
|---|---|---|---|---|
| Day 1 | 全流程串联调试 | 端到端测试、数据流验证、Bug 修复 | **完整走通 4 大菜单全流程** | 50min |
| Day 2 | Next.js 简单接口补全 | 任务管理 API、状态查询、前端对接 | 补全所有 Next.js 中间层接口 | 50min |
| Day 3 | Docker 部署 | Dockerfile、docker-compose、环境变量 | 一键部署脚本 | 50min |
| Day 4 | 最终复盘 + 作品集 | 16 周技能地图、项目 README、演示准备 | 最终复盘报告 + 项目 README | 45min |
| Day 5 | 未来方向 | 下一步学习方向、技术趋势 | 制定后续学习计划 | 30min |

---

## 🧪 Demo 产出总览

| # | Demo | 周 | 语言 | 对应项目模块 |
|---|---|---|---|---|
| 1 | 命令行聊天机器人 | 2 | TS | 项目脚手架 |
| 2 | 工具调用 Agent | 3 | TS | 工具集基础 |
| 3 | 自主任务 Agent | 4 | TS | Agent 循环 |
| 4 | Python CLI 文档处理 | 5 | Python | 文档分段 |
| 5 | FastAPI + LLM Agent API | 6 | Python | API 层 |
| 6 | 知识提取 Agent V1 | 7 | Python | 提取工具 |
| 7 | 知识打标 Agent V2 | 8 | Python | Step 1 核心 |
| 8 | 文档上传模块 | 9 | Python+TS | **菜单 1** |
| 9 | 知识打标（生产级） | 10 | Python | **Step 1** |
| 10 | 别名确认 | 11 | Python | **Step 2** |
| 11 | 内容确认 | 12 | Python | **Step 3** |
| 12 | 图谱构建 | 13 | Python | **Step 4** |
| 13 | 知识问答 | 14 | Python | **Step 5** |
| 14 | 图谱展示 + 图谱审核 | 15 | Python+TS | **菜单 3+4** |
| 15 | **完整知识库管理平台** | 16 | Python+TS | **作品集** |

---

## 📋 前置知识清单（Checklist）

进入第 9 周（项目实战）前，必须掌握：

### Python 基础
- [ ] venv 虚拟环境创建和管理
- [ ] pip 包管理、pyproject.toml
- [ ] 类型注解（Type Hints）+ Pydantic 数据模型
- [ ] async/await 异步编程
- [ ] 文件读写、JSON 处理、正则表达式

### FastAPI
- [ ] 路由定义（GET/POST/PUT/DELETE）
- [ ] 请求体/响应模型（Pydantic）
- [ ] 后台任务（Background Tasks）
- [ ] 自动文档（Swagger UI）

### LLM API 集成
- [ ] openai SDK 调用云端 API
- [ ] 流式响应（Streaming）
- [ ] 多模型配置切换
- [ ] 错误处理 + 重试

### Agent 核心
- [ ] Tool Calling 实现（工具定义 + 调用循环）
- [ ] ReAct 循环（Thought → Action → Observation）
- [ ] 结构化输出（JSON Mode + Pydantic 解析）
- [ ] Agent 状态管理

### 前端理解
- [ ] 理解现有 loop_web 的 4 大菜单结构
- [ ] 理解 ProcessDetail.tsx 的步骤切换逻辑
- [ ] 理解每个 Step 组件的数据接口

---

## 📊 学习节奏总览

| 阶段 | 周数 | 主题 | 核心产出 |
|---|---|---|---|
| 地基 | 1-4 | Agent 概念 + TS 实战 | 理解 Agent 核心概念 |
| Python 后端 | 5-6 | Python + FastAPI + LLM | Python 后端能力 |
| Agent 实战 | 7-8 | Agent 在 Python 中的实现 | 知识打标 Agent V1 |
| 知识库平台 | 9-15 | 4 大菜单逐模块实现 | 完整平台跑通 |
| 打磨 | 16 | 联调 + 部署 + 作品集 | 可演示的完整项目 |

---

*计划版本：v3.0 · 创建日期：2026-07-23*
*变更：技术栈 Python + Next.js 混合架构，以知识库管理平台 4 大菜单为终局*