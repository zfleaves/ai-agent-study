# 知识核准流水线 — 详细设计

> 这是整个知识库管理平台的核心引擎。5 步流水线将原始文档转化为结构化、可验证的知识图谱。
> 设计原则：每一步独立可执行、可回退、可重跑，状态持久化。

---

## 一、流水线总览

```
文档上传完成
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 1: 知识打标    ──→  Agent 自动提取实体/关系/事实         │
│     ↓                                                        │
│  Step 2: 别名确认    ──→  Agent 建议 + 人工确认实体消歧        │
│     ↓                                                        │
│  Step 3: 内容确认    ──→  人工逐条审核（接受/修改/驳回）        │
│     ↓                                                        │
│  Step 4: 图谱构建    ──→  算法生成图结构（节点+边+布局）        │
│     ↓                                                        │
│  Step 5: 知识问答    ──→  Agent 出题 + LLM 回答 + 验证闭环     │
│     ↓                                                        │
│  知识入库 ✅                                                   │
└──────────────────────────────────────────────────────────────┘
```

### 状态机

```
                    ┌─────────┐
                    │  DRAFT  │  新建任务
                    └────┬────┘
                         │ 开始
                         ▼
              ┌──────────────────────┐
              │  DOCUMENT_TAGGING  │  Step 1: Agent 自动提取
              └────────┬─────────────┘
                       │ 完成 / 跳过
                       ▼
              ┌──────────────────────┐
              │  ALIAS_CONFIRMATION  │  Step 2: 消歧 + 人工确认
              └────────┬─────────────┘
                       │ 完成 / 跳过
                       ▼
              ┌──────────────────────┐
              │  CONTENT_CONFIRMATION│  Step 3: 人工逐条审核
              └────────┬─────────────┘
                       │ 完成
                       ▼
              ┌──────────────────────┐
              │   GRAPH_BUILDING     │  Step 4: 算法生成图谱
              └────────┬─────────────┘
                       │ 完成
                       ▼
              ┌──────────────────────┐
              │   KNOWLEDGE_QA       │  Step 5: 出题 + 验证
              └────────┬─────────────┘
                       │ 完成
                       ▼
              ┌──────────────────────┐
              │     COMPLETED        │  知识入库
              └──────────────────────┘

  任意步骤 ──→ FAILED（记录错误，可重试）
  任意步骤 ──→ 回退到上一步（后续步骤结果失效）
```

### 步骤状态

```typescript
type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

// 每个步骤的状态转换：
// pending → in_progress → completed
//                       → failed → in_progress (重试)
// pending → skipped (管理员跳过)
```

---

## 二、Step 1：知识打标（Agent 自动提取）

### 2.1 目标

从文档中自动提取结构化知识：实体、关系、事实。这是整个流水线的起点，质量直接影响后续所有步骤。

### 2.2 输入

```
输入源：文档分块列表 (Chunk[])
每个 Chunk: { id, content, index, documentId }
```

### 2.3 提取内容定义

#### 实体 (Entity) — 7 种类型

| 类型 | 说明 | 示例 |
|---|---|---|
| `person` | 人物 | 高阳、Linus Torvalds |
| `organization` | 组织/公司 | Anthropic、OpenAI |
| `concept` | 抽象概念 | AI Agent、ReAct 模式 |
| `term` | 技术术语 | Token、Embedding |
| `event` | 事件 | 2026 年 AI 大会 |
| `tool` | 工具/框架 | Ollama、Vercel AI SDK |
| `artifact` | 产出物（文档/代码/项目） | DESIGN.md、Demo 3 |

#### 关系 (Relation) — 6 种类型

| 类型 | 说明 | 示例 |
|---|---|---|
| `belongs_to` | 归属/包含 | Token 属于 LLM 概念 |
| `depends_on` | 依赖 | ReAct 依赖 Tool-calling |
| `related_to` | 关联 | Vercel AI SDK 关联 Next.js |
| `defines` | 定义 | MISSION.md 定义学习目标 |
| `uses` | 使用 | Demo 3 使用 ReAct 循环 |
| `produces` | 产出 | 知识核准流程 产出 知识图谱 |

#### 事实 (Fact) — 3 种类型

| 类型 | 说明 | 示例 |
|---|---|---|
| `definition` | 定义 | "AI Agent 是能自主感知、思考、行动的 AI 系统" |
| `assertion` | 断言 | "Hermes 3.1 支持 tool-calling" |
| `rule` | 规则/约束 | "所有代码必须使用 TypeScript strict mode" |

### 2.4 Agent 执行流程

```
┌─────────────────────────────────────────────────────┐
│                  知识打标 Agent                       │
│                                                       │
│  1. 加载文档所有 Chunk                                 │
│  2. 逐 Chunk 分析（或批量，视 Chunk 大小）              │
│                                                       │
│  对每个 Chunk:                                        │
│    a. 识别候选实体（调用 extractEntity 工具）           │
│    b. 识别实体间关系（调用 extractRelation 工具）       │
│    c. 识别事实陈述（调用 extractFact 工具）             │
│                                                       │
│  3. 跨 Chunk 实体去重合并                              │
│  4. 质量自评（完整性/准确性/置信度）                     │
│  5. 输出提取结果                                       │
└─────────────────────────────────────────────────────┘
```

### 2.5 工具定义（JSON Schema）

```typescript
// 工具 1: extractEntity
const extractEntityTool = {
  name: 'extractEntity',
  description: '从文档中提取一个知识实体',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '实体名称' },
      type: {
        type: 'string',
        enum: ['person', 'organization', 'concept', 'term', 'event', 'tool', 'artifact'],
        description: '实体类型'
      },
      description: { type: 'string', description: '实体的一句话描述' },
      properties: {
        type: 'object',
        description: '实体的附加属性（键值对）',
        additionalProperties: { type: 'string' }
      },
      sourceChunkIndex: { type: 'number', description: '来源 Chunk 索引' },
      sourceQuote: { type: 'string', description: '原文引用（关键句）' },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: '置信度：high=原文明确提及，medium=可以推断，low=不确定'
      }
    },
    required: ['name', 'type', 'description', 'sourceChunkIndex', 'sourceQuote', 'confidence']
  }
}

// 工具 2: extractRelation
const extractRelationTool = {
  name: 'extractRelation',
  description: '从文档中提取两个实体之间的关系',
  parameters: {
    type: 'object',
    properties: {
      sourceEntityName: { type: 'string', description: '源实体名称' },
      targetEntityName: { type: 'string', description: '目标实体名称' },
      type: {
        type: 'string',
        enum: ['belongs_to', 'depends_on', 'related_to', 'defines', 'uses', 'produces'],
        description: '关系类型'
      },
      description: { type: 'string', description: '关系的一句话描述' },
      sourceChunkIndex: { type: 'number', description: '来源 Chunk 索引' },
      sourceQuote: { type: 'string', description: '原文引用' },
      confidence: {
        type: 'string',
        enum: ['high', 'medium', 'low']
      }
    },
    required: ['sourceEntityName', 'targetEntityName', 'type', 'description', 'sourceChunkIndex', 'sourceQuote', 'confidence']
  }
}

// 工具 3: extractFact
const extractFactTool = {
  name: 'extractFact',
  description: '从文档中提取一个事实陈述',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['definition', 'assertion', 'rule'],
        description: '事实类型'
      },
      content: { type: 'string', description: '事实的完整陈述' },
      relatedEntities: {
        type: 'array',
        items: { type: 'string' },
        description: '相关实体名称列表'
      },
      sourceChunkIndex: { type: 'number' },
      sourceQuote: { type: 'string' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
    },
    required: ['type', 'content', 'sourceChunkIndex', 'sourceQuote', 'confidence']
  }
}
```

### 2.6 Agent Prompt 模板

```
你是一个知识提取专家。你的任务是从给定的文档中提取结构化的知识。

## 提取规则

### 实体提取（调用 extractEntity 工具）
- 识别文档中提到的所有重要实体：人物、组织、概念、术语、事件、工具、产出物
- 每个实体必须标注类型和置信度
- 置信度判断标准：
  · high：原文明确命名并描述
  · medium：原文提及但未详细描述
  · low：需要推断，原文隐含
- 必须引用原文（sourceQuote），不能凭空编造

### 关系提取（调用 extractRelation 工具）
- 只提取原文明确描述的关系
- 关系必须在两个已提取的实体之间
- 每种关系类型的使用场景：
  · belongs_to：A 是 B 的一部分/子类
  · depends_on：A 需要 B 才能工作
  · related_to：A 和 B 有一般关联
  · defines：A 定义了 B 的含义
  · uses：A 使用 B 作为工具/方法
  · produces：A 产出/创建 B

### 事实提取（调用 extractFact 工具）
- 提取原文中的定义、断言、规则
- 每个事实要关联到相关实体
- 事实应该是可以独立验证的陈述

## 重要提示
- 宁可少提取，不要提取不确定的内容
- sourceQuote 必须逐字引用原文
- 同一实体在多个 Chunk 中出现时，使用最详细的那次描述
```

### 2.7 跨 Chunk 去重合并

Agent 提取完成后，执行后处理：

```
1. 按实体名称分组（精确匹配 + 模糊匹配）
2. 合并规则：
   - 同名实体 → 合并，保留最详细描述
   - 名称相似度 > 80% → 标记为候选别名，留给 Step 2 处理
3. 关系去重：同源+同目标+同类型 → 合并
4. 事实去重：内容相似度 > 90% → 合并
```

### 2.8 输出

```typescript
interface ExtractionResult {
  entities: Entity[]       // 去重后的实体列表
  relations: Relation[]    // 去重后的关系列表
  facts: Fact[]            // 去重后的事实列表
  stats: {
    totalChunks: number
    processedChunks: number
    rawEntityCount: number     // 去重前
    mergedEntityCount: number  // 去重后
    rawRelationCount: number
    mergedRelationCount: number
    factCount: number
    averageConfidence: number
    duration: number           // 提取耗时 ms
  }
}
```

---

## 三、Step 2：别名确认（实体消歧）

### 3.1 目标

识别指向同一事物的不同名称，合并去重。例如 "高阳" = "gaoyang" = "用户高阳"。

### 3.2 消歧类型

| 类型 | 说明 | 示例 | 检测方法 |
|---|---|---|---|
| 名称变体 | 同一实体的大小写/中英文/缩写 | 高阳 ↔ gaoyang | 字符串相似度 |
| 同义词 | 不同表述但同义 | AI Agent ↔ 智能代理 | Embedding 相似度 |
| 上下文消歧 | 同名但不同实体 | 苹果（公司）vs 苹果（水果） | 上下文向量对比 |
| 包含关系 | 一个名称是另一个的子集 | 知识核准 ↔ 知识核准流水线 | 子串匹配 |

### 3.3 自动检测算法

```
输入：Step 1 输出的实体列表

1. 候选对生成：
   - 对所有实体两两配对（或使用 Embedding 索引加速）
   - 过滤：名称完全相同 → 直接合并（不进入候选）
   - 过滤：类型不同且名称不相似 → 排除

2. 相似度计算（多维度加权）：
   ┌─────────────────────┬──────────┬─────────────────────┐
   │ 维度                 │ 权重     │ 算法                 │
   ├─────────────────────┼──────────┼─────────────────────┤
   │ 编辑距离相似度        │ 0.25     │ Levenshtein 归一化  │
   │ 拼音/音译相似度       │ 0.15     │ 拼音映射 + 编辑距离  │
   │ Embedding 余弦相似度  │ 0.35     │ text-embedding 模型  │
   │ 上下文相似度           │ 0.15     │ 来源 Chunk Embedding │
   │ 类型匹配              │ 0.10     │ 同类型 = 1，否则 = 0  │
   └─────────────────────┴──────────┴─────────────────────┘

3. 合并建议生成：
   - 综合得分 > 0.7 → 高置信度建议（可自动合并）
   - 综合得分 0.4-0.7 → 中置信度建议（需人工确认）
   - 综合得分 < 0.4 → 不合并
```

### 3.4 Agent 辅助判断

对于算法拿不准的候选对（0.4-0.7），调用 Agent 做语义判断：

```
你是一个实体消歧专家。请判断以下两个实体是否指向同一事物。

实体 A：{name: "高阳", type: "person", context: "高阳是一名前端工程师..."}
实体 B：{name: "gaoyang", type: "person", context: "gaoyang 正在学习 AI Agent..."}

请回答：
1. 是否同一实体？（是/否/不确定）
2. 合并后的首选名称（推荐用哪个名字）
3. 理由
4. 置信度（high/medium/low）
```

### 3.5 人工确认 UI

```
┌─────────────────────────────────────────────────────────┐
│  别名确认 — 发现 3 对候选合并                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ 候选 1 ─── 置信度：高 (0.89) ─────────────────────┐  │
│  │  🅰️ 高阳 (person)                                   │  │
│  │    来源：NOTES.md "高阳是一名前端工程师"              │  │
│  │                                                      │  │
│  │  🅱️ gaoyang (person)                                 │  │
│  │    来源：NOTES.md "gaoyang 正在学习 AI Agent"         │  │
│  │                                                      │  │
│  │  合并后名称：[高阳    ▼]  ← 首选名称                   │  │
│  │  别名列表：  [gaoyang, 用户高阳]  ← 可编辑             │  │
│  │                                                      │  │
│  │  [✓ 确认合并]  [✗ 不是同一实体]  [↩ 跳过]            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ 候选 2 ─── 置信度：中 (0.55) ─────────────────────┐  │
│  │  🅰️ ReAct (concept)                                  │  │
│  │  🅱️ ReAct 模式 (concept)                              │  │
│  │  💡 Agent 建议：合并，这是同一概念的全称和简称         │  │
│  │  [✓ 确认合并]  [✗ 不是同一实体]  [↩ 跳过]            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ 候选 3 ─── 置信度：低 (0.42) ─────────────────────┐  │
│  │  🅰️ 苹果 (organization) — 来源讨论科技公司            │  │
│  │  🅱️ 苹果 (term) — 来源讨论水果                        │  │
│  │  💡 Agent 建议：不合并，同名但不同实体                 │  │
│  │  [✓ 确认合并]  [✗ 不是同一实体]  [↩ 跳过]            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                          │
│  [全部确认]  [全部跳过]  [继续 →]                         │
└─────────────────────────────────────────────────────────┘
```

### 3.6 输出

```typescript
interface AliasResult {
  merges: {
    id: string
    entityAId: string
    entityBId: string
    similarityScore: number
    agentJudgment?: string
    mergedName: string
    aliases: string[]
    status: 'confirmed' | 'rejected' | 'skipped'
    confirmedBy?: 'auto' | 'human'
  }[]
  mergedEntities: Entity[]    // 合并后的实体列表
  stats: {
    originalCount: number
    mergedCount: number
    mergeCount: number
    autoConfirmed: number
    humanConfirmed: number
    rejected: number
  }
}
```

---

## 四、Step 3：内容确认（人工审核）

### 4.1 目标

人工逐条审核实体和关系，确保知识库的准确性。这是 Human-in-the-loop 的核心环节。

### 4.2 审核维度

| 维度 | 检查内容 | 判断标准 |
|---|---|---|
| 准确性 | 实体/关系描述是否正确 | 与原文对照 |
| 完整性 | 是否遗漏了重要属性 | 检查实体属性表 |
| 置信度 | Agent 标注的置信度是否合理 | 人工判断调整 |
| 引用 | 来源引用是否准确 | 点击跳转原文 |

### 4.3 审核 UI 设计

```
┌──────────────────────────────────────────────────────────────┐
│  内容确认 — 实体审核 (12/45)                      进度 27%    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  筛选：[全部 ▼] [类型 ▼] [置信度 ▼]  排序：[时间 ▼]          │
│                                                               │
│  ┌─ 实体 #1 ──────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │  名称：AI Agent                   类型：concept          │  │
│  │  置信度：███░░ high               Agent 提取             │  │
│  │                                                          │  │
│  │  描述：能自主感知环境、做出决策、执行动作的 AI 系统        │  │
│  │                                                          │  │
│  │  属性：                                                   │  │
│  │    核心能力：Tool-calling, ReAct 循环, 记忆系统           │  │
│  │    学习载体：Hermes 3.1                                   │  │
│  │    [编辑属性]                                             │  │
│  │                                                          │  │
│  │  📄 来源：MISSION.md Chunk 3                              │  │
│  │  💬 "目标是转型为 AI Agent 开发工程师..."  [查看原文 →]   │  │
│  │                                                          │  │
│  │  关联关系（3 条）：                                       │  │
│  │    · AI Agent → uses → Tool-calling                      │  │
│  │    · AI Agent → uses → ReAct 循环                        │  │
│  │    · AI Agent → related_to → Hermes 3.1                  │  │
│  │                                                          │  │
│  │  ─────────────────────────────────────────────           │  │
│  │  [✓ 通过]  [✎ 修改]  [✗ 驳回]  [↩ 跳过]                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ 实体 #2 ──────────────────────────────────────────────┐  │
│  │  ...（同上结构）                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                               │
│  ────────────────────────────────────────────────────────     │
│  批量操作：[通过所有 high 置信度] [通过当前筛选结果]           │
│                                                               │
│  [← 上一步]                              [保存并继续 →]       │
└──────────────────────────────────────────────────────────────┘
```

### 4.4 修改操作

```typescript
// 修改类型
type ReviewAction = 
  | { type: 'approve'; entityId: string }                    // 通过
  | { type: 'reject'; entityId: string; reason: string }     // 驳回
  | { type: 'modify'; entityId: string; changes: {           // 修改
      name?: string
      type?: EntityType
      description?: string
      properties?: Record<string, string>
      confidence?: Confidence
    }
  }
  | { type: 'skip'; entityId: string }                       // 跳过
```

### 4.5 审核记录

每次审核操作记录到 ReviewRecord，支持：
- 审核历史回溯
- 版本对比（修改前后）
- 审核人追踪（单人模式可省略）

### 4.6 输出

```typescript
interface ReviewResult {
  entities: Entity[]    // 审核后的实体列表（status 已更新）
  relations: Relation[] // 审核后的关系列表
  records: ReviewRecord[]
  stats: {
    total: number
    approved: number
    rejected: number
    modified: number
    skipped: number
    remaining: number   // 未审核的
  }
}
```

---

## 五、Step 4：图谱生成（算法生成）

### 5.1 目标

将审核通过的实体和关系转化为图数据结构，用于可视化和查询。

### 5.2 这一步是算法，不是 Agent

Step 4 不需要 Agent 参与——它是确定性的数据转换：

```
审核通过的实体/关系 → 图数据结构 → 可视化布局
```

### 5.3 图数据模型

```typescript
interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  metadata: {
    totalNodes: number
    totalEdges: number
    entityTypeDistribution: Record<string, number>
    relationTypeDistribution: Record<string, number>
    averageDegree: number
    density: number
    generatedAt: Date
  }
}

interface GraphNode {
  id: string
  label: string
  type: EntityType
  // 可视化属性
  color: string       // 按类型着色
  size: number        // 按关联边数量决定大小
  group: string       // 按类型分组
  // 数据属性
  description: string
  aliases: string[]
  properties: Record<string, string>
  entityId: string    // 回链到 Entity
  // 图算法指标
  degree: number      // 度（关联边数）
  betweenness?: number // 介数中心性（可选计算）
}

interface GraphEdge {
  id: string
  source: string      // node id
  target: string      // node id
  label: string
  type: RelationType
  // 可视化属性
  color: string       // 按关系类型着色
  width: number       // 按置信度/权重
  dashes: boolean     // 低置信度用虚线
  arrows: 'to' | 'from' | 'both' | 'none'
  // 数据属性
  description: string
  confidence: number
  sourceQuote: string
  relationId: string  // 回链到 Relation
}
```

### 5.4 节点着色方案

```typescript
const ENTITY_COLORS: Record<EntityType, string> = {
  person:         '#FF6B6B',  // 红色 — 人物
  organization:   '#4ECDC4',  // 青色 — 组织
  concept:        '#45B7D1',  // 蓝色 — 概念
  term:           '#96CEB4',  // 绿色 — 术语
  event:          '#FFEAA7',  // 黄色 — 事件
  tool:           '#DDA0DD',  // 紫色 — 工具
  artifact:       '#F0B27A',  // 橙色 — 产出物
}

const RELATION_COLORS: Record<RelationType, string> = {
  belongs_to:   '#666',     // 灰色 — 归属
  depends_on:   '#E74C3C',  // 红色 — 依赖（强关系）
  related_to:   '#999',     // 浅灰 — 关联（弱关系）
  defines:      '#2ECC71',  // 绿色 — 定义
  uses:         '#3498DB',  // 蓝色 — 使用
  produces:     '#F39C12',  // 橙色 — 产出
}
```

### 5.5 节点大小算法

```
nodeSize = baseSize + degree * scaleFactor

// 按关联边数量分档：
// degree 0-1   → size 20  (孤立节点)
// degree 2-5   → size 30  (普通节点)
// degree 6-10  → size 40  (重要节点)
// degree 11+   → size 50  (核心节点)
```

### 5.6 图统计指标

```typescript
interface GraphMetrics {
  // 基础统计
  nodeCount: number
  edgeCount: number
  averageDegree: number
  density: number              // 实际边数 / 最大可能边数
  
  // 类型分布
  entityTypeDistribution: Record<EntityType, number>
  relationTypeDistribution: Record<RelationType, number>
  
  // 连通性
  connectedComponents: number  // 连通分量数
  largestComponentSize: number
  isolatedNodes: number        // 孤立节点数
  
  // 中心性（可选，计算量大）
  topNodesByDegree: { id: string; label: string; degree: number }[]
  topNodesByBetweenness?: { id: string; label: string; betweenness: number }[]
}
```

### 5.7 输出

生成的 `GraphData` 直接可用于 D3.js 力导向图渲染，也存入数据库供 "图谱展示" 和 "图谱审核" 菜单使用。

---

## 六、Step 5：知识问题测试（自动 QA 验证）

### 6.1 目标

基于图谱自动生成测试题，用 LLM 回答，验证知识库的准确性和完整性。这是一个"用 AI 验证 AI 提取的知识"的闭环。

### 6.2 题目类型（6 种）

| 类型 | 模板 | 示例 | 答案来源 |
|---|---|---|---|
| 实体类型 | "{实体} 属于什么类型？" | "AI Agent 属于什么类型？" | 图谱 entity.type |
| 关系查询 | "{实体A} 和 {实体B} 是什么关系？" | "ReAct 和 Tool-calling 是什么关系？" | 图谱 edge |
| 定义查询 | "{实体} 的定义是什么？" | "RAG 的定义是什么？" | 图谱 entity.description |
| 属性查询 | "{实体} 的 {属性} 是什么？" | "AI Agent 的核心能力有哪些？" | 图谱 entity.properties |
| 反向关系 | "哪些东西属于 {实体}？" | "哪些概念属于 AI Agent 核心？" | 图谱反向边 |
| 路径查询 | "从 {实体A} 到 {实体B} 经过哪些节点？" | "从文档上传到知识图谱经过哪些步骤？" | 图谱路径 |

### 6.3 出题策略

```
输入：图谱中的所有实体和关系

出题规则：
1. 对每个实体至少生成 1 道题（优先实体类型题或定义题）
2. 对每条关系生成 1 道关系查询题
3. 对 degree > 3 的核心实体，额外生成反向关系题
4. 对最长路径（> 2 跳）生成路径查询题
5. 题目数量上限：实体数 × 2 + 关系数（可配置）
6. 题目去重：语义相似度 > 0.8 的题目只保留一个
```

### 6.4 Agent 出题 Prompt

```
你是一个知识测试专家。请基于以下知识图谱数据生成测试题。

## 图谱数据
实体列表：
- AI Agent (concept): 能自主感知环境、做出决策、执行动作的 AI 系统
- ReAct 循环 (concept): Reasoning + Acting 的循环模式
- Tool-calling (concept): 模型调用外部工具的能力
...

关系列表：
- AI Agent → uses → Tool-calling
- AI Agent → uses → ReAct 循环
- ReAct 循环 → depends_on → Tool-calling
...

## 出题要求
- 每题必须基于图谱中的事实
- 题目类型多样化：实体类型、关系查询、定义查询、属性查询、反向关系
- 每题有唯一正确答案
- 答案必须是图谱中明确存在的信息
- 生成 {count} 道题

对每道题调用 generateQuestion 工具。
```

### 6.5 验证流程

```
┌─────────────────────────────────────────────────────────┐
│                    知识测试验证流程                        │
│                                                           │
│  1. 出题                                                  │
│     图谱数据 → Agent 生成题目 → QA 列表                    │
│                                                           │
│  2. 答题                                                  │
│     对每道题：                                             │
│       a. 将题目发送给 LLM（不带图谱上下文）                 │
│       b. LLM 基于自身知识回答                              │
│       c. 记录 LLM 的答案                                  │
│                                                           │
│  3. 判分                                                  │
│     对每道题：                                             │
│       a. 从图谱中提取正确答案                              │
│       b. 用 Agent 对比 LLM 答案 vs 正确答案               │
│       c. 评分：✅ 正确 / ⚠️ 部分正确 / ❌ 错误             │
│                                                           │
│  4. 分析                                                  │
│      发现知识漏洞：LLM 答错的题 → 图谱知识可能不完整        │
│      发现知识冲突：LLM 答案与图谱不一致但 LLM 可能是对的     │
│                                                           │
│  5. 报告                                                  │
│      生成测试报告：正确率、漏洞列表、建议补充的知识         │
└─────────────────────────────────────────────────────────┘
```

### 6.6 判分 Agent Prompt

```
你是一个知识验证专家。请对比以下两个答案，判断 LLM 的回答是否正确。

题目：{question}
正确答案（图谱）：{graphAnswer}
LLM 回答：{llmAnswer}

判断标准：
- ✅ 正确：LLM 回答与正确答案语义一致，核心事实匹配
- ⚠️ 部分正确：LLM 回答方向正确但不完整或不够精确
- ❌ 错误：LLM 回答与正确答案矛盾或完全无关

请给出评分和理由。
```

### 6.7 输出

```typescript
interface QATestResult {
  questions: {
    id: string
    type: QuestionType
    question: string
    graphAnswer: string
    llmAnswer: string
    score: 'correct' | 'partial' | 'incorrect'
    reasoning: string   // 判分理由
    relatedEntityIds: string[]
  }[]
  stats: {
    total: number
    correct: number
    partial: number
    incorrect: number
    accuracy: number     // correct / total
    knowledgeGaps: {     // 知识漏洞
      entityId: string
      entityName: string
      issue: string
      suggestion: string
    }[]
  }
}
```

---

## 七、完整数据流

```
┌──────────┐    ┌──────────────────┐    ┌──────────────────┐
│ 文档上传   │───→│ Step 1: 知识打标   │───→│ Step 2: 别名确认   │
│ Chunk[]   │    │ 输出: Entity[]    │    │ 输出: 合并后Entity[]│
│           │    │       Relation[]  │    │       AliasMerge[] │
│           │    │       Fact[]      │    │                    │
└──────────┘    └──────────────────┘    └──────────────────┘
                                                │
                                                ▼
┌──────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Step 5:  │←───│ Step 4: 图谱生成   │←───│ Step 3: 内容确认   │
│ 知识测试   │    │ 输出: GraphData   │    │ 输出: 审核后Entity[]│
│ 输出: QA  │    │       GraphMetrics│    │       审核记录     │
│         │    │                  │    │                    │
└────┬─────┘    └──────────────────┘    └──────────────────┘
     │
     │ 通过验证
     ▼
┌──────────┐
│ 知识入库   │
│ SQLite +  │
│ LanceDB   │
└──────────┘
```

---

## 八、状态持久化

```sql
-- 核准任务表
CREATE TABLE verification_tasks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft|in_progress|completed|failed
  current_step TEXT NOT NULL DEFAULT 'document_tagging',
  step_statuses TEXT NOT NULL DEFAULT '{}',  -- JSON: {document_tagging: 'pending', ...}
  
  -- 每步的输出（JSON）
  step1_output TEXT,  -- ExtractionResult
  step2_output TEXT,  -- AliasResult
  step3_output TEXT,  -- ReviewResult
  step4_output TEXT,  -- GraphData
  step5_output TEXT,  -- QATestResult
  
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 实体表
CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  aliases TEXT NOT NULL DEFAULT '[]',  -- JSON array
  properties TEXT NOT NULL DEFAULT '{}',  -- JSON object
  source_chunk_id TEXT,
  source_quote TEXT,
  confidence TEXT,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft|pending_review|approved|rejected
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 关系表
CREATE TABLE relations (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  target_entity_id TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  source_chunk_id TEXT,
  source_quote TEXT,
  confidence TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 审核记录表
CREATE TABLE review_records (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  entity_id TEXT,
  relation_id TEXT,
  action TEXT NOT NULL,  -- approve|reject|modify|skip
  changes TEXT,  -- JSON: 修改前后对比
  reason TEXT,
  reviewed_at TEXT NOT NULL
);
```

---

## 九、关键技术决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 模型层 | **全部云端 API** | 所有实战统一用云端模型（强推理），本地 Ollama 仅调试备用 |
| 多模型配置 | 每个 Step 独立 MODEL_XXX 环境变量 | 可针对不同任务用不同模型，方便后续性能对比 |
| Agent 框架 | 手写 ReAct 循环 + Vercel AI SDK | 第 4 周学完手写，第 7 周切换到 AI SDK |
| Step 1 提取方式 | Agent 逐 Chunk 调用工具 | 确保每个提取有来源引用 |
| Step 2 消歧方式 | 算法初筛 + Agent 辅助 + 人工确认 | 算法处理明显的，Agent 处理模糊的，人做最终决定 |
| Step 3 审核方式 | 纯人工（Agent 可辅助建议） | 知识准确性必须人来把关 |
| Step 4 图谱生成 | 纯算法（确定性转换） | 不需要 Agent，数据转换即可 |
| Step 5 出题方式 | Agent 生成 + 算法判分 | 出题需要创意（Agent），判分需要一致性（算法+Agent） |
| 状态存储 | SQLite（better-sqlite3） | 轻量、零配置、适合本地项目 |
| 向量存储 | LanceDB | TS 原生、嵌入式、存 Embedding 和元数据 |

### 模型分配策略

```
.env 配置 → 每个 Step 独立模型 → 后续可切换对比性能

Step 1 知识打标    → MODEL_EXTRACTION     (强推理，提取实体/关系/事实)
Step 2 别名确认    → MODEL_DISAMBIGUATION  (语义理解，判断同义)
Step 3 内容确认    → MODEL_REVIEW          (辅助建议，中推理)
Step 5 出题        → MODEL_QA_GENERATION   (强推理，生成多样化题目)
Step 5 判分        → MODEL_QA_SCORING      (语义对比，判断正确性)
兜底              → MODEL_DEFAULT
```

---

*创建日期：2026-07-23 · 版本：v1.0*