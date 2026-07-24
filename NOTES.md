# Notes

## 用户偏好

- 中文教学，英文术语保留原名
- 每次 session 不宜过长，保持 10-20 分钟
- 偏好实操 > 理论推导
- 最终目标是能在自己的项目中落地
- **前端工程师（JS/TS 熟练）**——工具链优先 JS 生态
- **TypeScript 优先**——所有代码、Demo、项目统一使用 TypeScript
- **Java 零基础**——需要从零学习，作为企业级交付的第二语言（Spring AI / LangChain4j）
- Python 能力待确认，先假设不熟

## 当前状态

- 2026-07-23: **学习计划升级 v3.0**，终局项目：知识库管理平台
  - 技术栈：Python（后端 Agent）+ Next.js（简单接口 + 前端）+ 云端 API（LLM）
  - 5 步流水线：知识打标 → 别名确认 → 内容确认 → 图谱构建 → 知识问答
  - 现有前端：loop_web/src/pages/etl-process/（React + TS + Ant Design）
  - 设计文档：projects/knowledge-vault/DESIGN.md + PIPELINE-DESIGN.md
- 用户已明确真实目标：AI Agent 全栈落地（不止 Hermes）
- 三大学习支柱：① Agent 开发 ② 本地知识库(RAG) ③ 项目落地
- 第 1 课（Hermes 概览）已完成 ✅
- 环境准备清单已生成，学习计划已确立
- TypeScript 优先原则已确认
- 工作区已初始化 Git 仓库

## 📍 当前进度（换电脑/新会话时读这里）

```
当前阶段：第 4 周 — Agent 核心循环（从"调用"到"自主"）
计划版本：v3.0（16 周，Python + Next.js + 云端 API）
已完成：  第 1 周 ✅（5/5 天）
        第 2 周 ✅（5/5 天）
          Day 1 ✅ Ollama 安装 + 模型选型
          Day 2 ✅ 命令行对话 + System Prompt + Temperature + 速度实测
          Day 3 ✅ TS SDK 接入 + Streaming 流式响应
          Day 4 ✅ Prompt 工程 + 瘦身实验（Zero-shot/Few-shot/CoT）+ 追问解答
          Day 5 ✅ 复盘 + Demo 1 命令行聊天机器人 (chatbot.ts)
        第 3 周 ✅（5/5 天）
          Day 1 ✅ Tool-calling 入门（Function Calling 机制、JSON Schema 工具定义）
          Day 2 ✅ 定义第一个工具（Description 三要素、TS→JSON Schema 映射、多工具选择）
          Day 3 ✅ 工具调用循环（Agent 循环、链式/并行调用、错误处理、终止条件）
          Day 4 ✅ 多工具编排（5 工具选择、并行 vs 串行、工具重叠处理、searchCode 工具）
          Day 5 ✅ 复盘 + Demo 2 工具调用 Agent 综合实战 (agent-demo.ts)
        第 4 周 🔄
          Day 1 ✅ ReAct 模式深入（Thought→Action→Observation 循环、自回归约束机制）
          Day 2 ✅ Agent 状态管理（消息角色、State 设计、历史截断、TS Class 实现）
        已安装模型：hermes3:8b (4.7GB)、qwen2.5:3b (1.9GB)
下一步：  第 4 周 Day 3 — 错误处理与重试（重试策略、降级、安全护栏）
```

## 已确认的先验知识

- 前端开发（JS/TS 熟练）
- Web 基础（HTTP、API、异步编程）
- AI/ML 领域是新手——概念需要从零讲起
- 不了解 Transformer、Fine-tuning 等概念

## 技术栈方向（混合架构）

- **后端 Agent（核心）**：**Python** — FastAPI + openai SDK + Pydantic
- **后端简单接口**：**Next.js API Routes**（TypeScript）— CRUD、文件上传
- **前端**：**React + TypeScript + Ant Design**（现有 loop_web 项目）
- **模型**：**云端 API**（deepseek-v4-pro，多模型按 Step 可切换）
- **向量数据库**：LanceDB
- **图存储**：Neo4j / networkx
- **本地模型**：Ollama（仅开发调试备用）

## 环境变量规范（.env）

所有课件统一从 `.env` 读取配置，不硬编码。换电脑/换模型只改 `.env`：

```
API_KEY=xxx                       # 云端 API Key
BASE_URL=xxx/v1                   # 云端 API 地址（需含 /v1 路径）
MODEL_EXTRACTION=deepseek-v4-pro  # 知识提取（Step 1）
MODEL_DISAMBIGUATION=deepseek-v4-pro # 别名消歧（Step 2）
MODEL_REVIEW=deepseek-v4-pro      # 审核辅助（Step 3）
MODEL_QA_GENERATION=deepseek-v4-pro # 题目生成（Step 5）
MODEL_QA_SCORING=deepseek-v4-pro  # 判分（Step 5）
MODEL_DEFAULT=deepseek-v4-pro     # 默认模型
LOCAL_MODEL=qwen2.5:3b            # 本地备用（仅调试）
```

使用规则：
- **所有实战统一用云端 API**，本地 Ollama 仅用于开发调试快速测试
- 每个流水线步骤可配置不同模型，方便后续性能对比
- 代码中 `process.env.MODEL_XXX` 读取对应模型名

## 技术栈方向（Java — 第二语言，第 9 周起）

- 语言：**Java 17+**（LTS 版本）
- 构建工具：Maven（市场主流）
- Agent 框架：Spring AI / LangChain4j
- 场景：企业级 Agent 部署、与现有 Java 后端集成
- 学习策略：用 TS 学会 Agent 概念 → 用 Java 复现核心 Demo → 理解两面写法