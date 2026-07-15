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
当前阶段：第 2 周 — Ollama 环境 + 第一个本地模型
计划版本：v2.0（16 周，3 语言）
已完成：  第 1 周 ✅（5/5 天）
        第 2 周 Day 1 ✅（Ollama 安装 + 模型选型：GGUF量化、Q4/Q8、8B vs 3B vs 1.5B）
        已安装模型：hermes3:8b (4.7GB)、qwen2.5:3b (1.9GB)
        硬件确认：GTX 1050 2GB显存（无法GPU推理8B），CPU推理8B约2-5 tok/s
下一步：  Day 2（命令行对话 + 速度实测 + System Prompt）
待准备：  用 --verbose 实测两个模型的 tok/s 差异
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

## 技术栈方向（Java — 第二语言，第 9 周起）

- 语言：**Java 17+**（LTS 版本）
- 构建工具：Maven（市场主流）
- Agent 框架：Spring AI / LangChain4j
- 场景：企业级 Agent 部署、与现有 Java 后端集成
- 学习策略：用 TS 学会 Agent 概念 → 用 Java 复现核心 Demo → 理解两面写法