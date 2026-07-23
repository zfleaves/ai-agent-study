# 知识库管理平台 — 项目设计文档

> 作品集主线项目 · 贯穿 16 周学习计划
> 每个学习阶段对应一个模块的开发

---

## 一、项目概述

一个基于 AI Agent 的知识库管理平台，支持从文档中自动提取知识、构建知识图谱、人工审核确认、最终形成可查询的知识网络。

**核心价值：** 把"文档"变成"可查询、可推理的知识网络"

**产品形态：** Web 应用（Next.js + React），本地运行（Ollama + 本地模型）

---

## 二、四大菜单

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

### 菜单 1：📄 文档上传

| 功能 | 说明 |
|---|---|
| 文件选择 | 支持 Markdown / PDF / 纯文本 / 代码文件 |
| 格式解析 | 自动识别格式，提取文本内容 |
| 分段预览 | Chunking 后展示分段结果，可调参数 |
| 上传状态 | 上传进度、处理状态、索引状态 |

### 菜单 2：✅ 知识核准（核心流程）

5 步流水线，每步可独立执行和回退：

```
Step 1: 知识打标（Agent 自动提取）
  ├─ 实体提取：人、组织、概念、术语
  ├─ 关系提取：属于、依赖、关联、导致、...
  ├─ 事实提取：断言、定义、规则
  └─ 质量评分：完整性 / 准确性 / 置信度

Step 2: 别名确认（实体消歧）
  ├─ 自动检测：同义名、缩写、翻译名
  ├─ 合并建议：Agent 建议合并 + 人工确认
  └─ 别名库：建立别名映射表

Step 3: 内容确认（人工审核）
  ├─ 逐条审核：接受 / 修改 / 驳回
  ├─ 置信度标注：高 / 中 / 低
  └─ 来源引用：追溯到原文段落

Step 4: 图谱构建（实体 + 关系 → 图）
  ├─ 节点：实体 / 概念（类型、属性）
  ├─ 边：关系（类型、权重、来源）
  └─ 图结构：JSON → 可视化

Step 5: 知识问题测试（自动 QA 验证）
  ├─ 题目生成：基于图谱自动出题
  ├─ LLM 回答：用模型回答测试题
  └─ 验证闭环：答案 vs 图谱事实 → 发现知识漏洞
```

### 菜单 3：🔍 图谱展示

| 功能 | 说明 |
|---|---|
| 关系图可视化 | 力导向图，节点=实体，边=关系 |
| 实体检索 | 搜索实体，高亮关联路径 |
| 路径分析 | 两实体间最短路径 / 所有路径 |
| 导出 | JSON / PNG / CSV |

### 菜单 4：👁️ 图谱审核

| 功能 | 说明 |
|---|---|
| 待审核列表 | 按时间/置信度/类型排序 |
| 审核操作 | 通过 / 驳回（附理由） |
| 修改建议 | Agent 自动建议修改方案 |
| 版本对比 | 修改前后对比 |

---

## 三、技术架构

```
┌─────────────────────────────────────────┐
│              前端 (Next.js)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 文档上传页 │ │ 知识核准页 │ │ 图谱展示页 │ │
│  │ 图谱审核页 │ │ 仪表盘    │ │ 设置页    │ │
│  └──────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────┤
│            API 层 (Next.js API Routes)   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 文档 API  │ │ 核准 API  │ │ 图谱 API  │ │
│  │ 审核 API  │ │ Agent API │ │ 导出 API  │ │
│  └──────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────┤
│              Agent 层 (TypeScript)       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 提取Agent │ │ 消歧Agent │ │ 审核Agent │ │
│  │ 出题Agent │ │ 校验Agent │ │ 编排引擎  │ │
│  └──────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────┤
│              数据层                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ SQLite   │ │ LanceDB  │ │ 文件系统  │ │
│  │结构化数据 │ │ 向量存储  │ │ 原始文档  │ │
│  └──────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────┤
│          模型层 (Ollama 本地)             │
│  ┌──────────┐ ┌──────────┐              │
│  │ 对话模型  │ │ Embedding│              │
│  │qwen2.5:3b│ │nomic-embed│             │
│  └──────────┘ └──────────┘              │
└─────────────────────────────────────────┘
```

### 数据模型

```typescript
// 文档
interface Document {
  id: string
  name: string
  path: string
  type: 'markdown' | 'pdf' | 'text' | 'code'
  status: 'uploading' | 'chunking' | 'indexed' | 'error'
  uploadedAt: Date
}

// 文本块
interface Chunk {
  id: string
  documentId: string
  content: string
  index: number
  embedding?: number[]
}

// 实体（知识图谱节点）
interface Entity {
  id: string
  name: string
  type: 'person' | 'organization' | 'concept' | 'term' | 'event'
  aliases: string[]
  properties: Record<string, string>
  sourceChunkId: string
  confidence: number
  status: 'draft' | 'pending_review' | 'approved' | 'rejected'
}

// 关系（知识图谱边）
interface Relation {
  id: string
  sourceId: string
  targetId: string
  type: 'belongs_to' | 'depends_on' | 'related_to' | 'causes' | 'defines' | 'example_of'
  description: string
  sourceChunkId: string
  confidence: number
  status: 'draft' | 'pending_review' | 'approved' | 'rejected'
}

// 核准任务
interface VerificationTask {
  id: string
  documentId: string
  currentStep: 'knowledge_standard' | 'alias_confirmation' | 'content_review' | 'graph_generation' | 'qa_test'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  entities: Entity[]
  relations: Relation[]
  createdAt: Date
  updatedAt: Date
}

// 审核记录
interface ReviewRecord {
  id: string
  taskId: string
  entityId?: string
  relationId?: string
  action: 'approved' | 'rejected' | 'modified'
  reason?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  reviewedAt: Date
}
```

---

## 四、与学习计划的映射

| 周 | 学习主题 | 项目模块 | 产出 |
|---|---|---|---|
| 1-2 | LLM 基础 + Ollama 环境 | 项目脚手架 + 环境搭建 | 项目初始化、技术选型确认 |
| 3 | Tool-calling | 文档解析工具 + 知识提取工具 | 工具集（parseDoc / extractEntities / extractRelations） |
| 4 | Agent 核心循环 | **知识核准流水线**（知识打标 + 状态管理） | 核准任务状态机、Step 1 Agent |
| 5 | RAG 原理 | **文档上传模块**（解析→分段→Embedding→存储） | 菜单 1 完成 |
| 6 | 本地知识库 | 向量检索 + 混合检索 + 文档管理 | 检索增强的知识提取 |
| 7 | Vercel AI SDK | 前端框架搭建 + 知识核准 UI | 菜单 2 前端 |
| 8 | MCP 协议 | 工具标准化（MCP Server 封装） | 提取/消歧/审核工具 MCP 化 |
| 9 | 记忆系统 | 审核历史持久化 + 状态恢复 | 核准记录永不丢失 |
| 10 | 多 Agent 协作 | 别名确认 Agent + 内容审核 Agent + 出题 Agent | 菜单 2 完整流水线 |
| 11-12 | Java 企业级 | Java 版后端 | Java 版知识核准引擎 |
| 13-14 | Python 生态 | Python 版后端 | Python 版知识核准引擎 |
| 15 | 微调+部署 | 图谱可视化 + Docker 部署 | 菜单 3 + 菜单 4 + 生产部署 |
| 16 | 综合集成 | 全模块联调 + 作品集 | 完整知识库管理平台 |

---

## 五、开发阶段

### 阶段 1：MVP（第 3-6 周）
- 文档上传 + 基础解析
- 知识打标 Agent（提取实体和关系）
- SQLite 存储
- 命令行交互

### 阶段 2：前端 + 核准流程（第 7-9 周）
- Next.js 前端框架
- 知识核准完整 UI（5 步流水线）
- 图谱展示（力导向图）
- 审核历史持久化

### 阶段 3：高级功能（第 10-12 周）
- 多 Agent 协作
- 别名消歧 + 自动出题
- 图谱审核 + 版本对比
- Java 版后端

### 阶段 4：生产化（第 13-16 周）
- Python 版后端
- 三语言对比
- Docker 部署
- 作品集 README + 演示视频

---

## 六、关键设计决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 图存储 | 先用 SQLite 建模，后续可选 Neo4j | 学习曲线平缓，SQLite 够用 |
| 前端框架 | Next.js + React + Tailwind | 全栈 TS，前后端统一 |
| 图可视化 | D3.js force-directed graph | 灵活、生态好、可定制 |
| 模型 | 本地 Ollama（qwen2.5:3b） | 免费、隐私、可离线 |
| 部署 | Docker Compose | 一键启动，适合作品集演示 |

---

*创建日期：2026-07-23 · 版本：v1.0*