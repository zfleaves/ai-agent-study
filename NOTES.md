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

- 2026-07-09: 首次接触 AI Agent，从 Hermes Agent 概览开始
- 用户已明确真实目标：AI Agent 全栈落地（不止 Hermes）
- 三大学习支柱：① Agent 开发 ② 本地知识库(RAG) ③ 项目落地
- 第 1 课（Hermes 概览）已完成 ✅
- 环境准备清单已生成，学习计划已确立
- TypeScript 优先原则已确认
- 工作区已初始化 Git 仓库

## 📍 当前进度（换电脑/新会话时读这里）

```
当前阶段：第 4 周 — Agent 核心循环（从"调用"到"自主"）
计划版本：v2.0（16 周，3 语言）
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
        已安装模型：hermes3:8b (4.7GB)、qwen2.5:3b (1.9GB)
下一步：  第 4 周 Day 1 — ReAct 模式深入（Reasoning + Acting 完整循环）
```

## 已确认的先验知识

- 前端开发（JS/TS 熟练）
- Web 基础（HTTP、API、异步编程）
- AI/ML 领域是新手——概念需要从零讲起
- 不了解 Transformer、Fine-tuning 等概念

## 技术栈方向（全部 TypeScript）

- 语言：**TypeScript（strict mode）**——所有代码统一 TS
- 运行时：Node.js 18+ + tsx（TypeScript 直接执行）
- 模型部署：Ollama（本地模型部署）
- Agent 框架：Vercel AI SDK（TS 原生）、LangChain.js（TS 版）
- 向量数据库：LanceDB（TS SDK 原生）、Chroma（TS 客户端）
- 模型：Hermes 3.1 / Qwen 2.5（按需切换）
- 前端：Next.js + React + Tailwind CSS（TS 全栈）
- 类型定义：所有工具、Agent 状态、RAG 管道均定义 interface/type

## 环境变量规范（.env）

所有课件统一从 `.env` 读取配置，不硬编码。换电脑/换模型只改 `.env`：

```
API_KEY=xxx          # 云端 API Key（强推理场景用）
BASE_URL=xxx         # 云端 API 地址
MODEL=qwen2.5:3b     # 模型名（Ollama 本地 + 云端 API 共用）
```

使用规则：
- **简单任务**（工具选择、基础对话）→ 本地 Ollama + `MODEL`
- **强推理**（ReAct 循环、条件式编排、多 Agent 协作）→ 云端 API + `API_KEY` + `BASE_URL`
- 代码中 `process.env.MODEL` 读取，不改代码

## 技术栈方向（Java — 第二语言，第 9 周起）

- 语言：**Java 17+**（LTS 版本）
- 构建工具：Maven（市场主流）
- Agent 框架：Spring AI / LangChain4j
- 场景：企业级 Agent 部署、与现有 Java 后端集成
- 学习策略：用 TS 学会 Agent 概念 → 用 Java 复现核心 Demo → 理解两面写法