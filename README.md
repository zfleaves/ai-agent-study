# AI Agent 学习工作区

> 从 0 到 1，前端工程师 → AI Agent 开发工程师
> 以 Hermes Agent 为核心载体，全链路 TypeScript

---

## 快速开始

```bash
# 克隆工作区
git clone https://github.com/zfleaves/ai-agent-study.git
cd ai-agent-study

# 安装环境（参考详细指南）
# 打开 reference/environment-setup.html

# 开始学习
# 在 Claude Code 中打开此目录，说"继续学习"
```

## 学习路线

| 阶段 | 周数 | 主题 | Demo |
|---|---|---|---|
| 地基 | 1-2 | LLM 概念 + 本地运行 | 命令行聊天机器人 |
| Agent 核心 | 3-4 | Tool-calling + Agent 循环 | 工具调用 Agent / 自主任务 Agent |
| 知识库 | 5-6 | RAG + 本地知识库 | 文档问答 / 知识库系统 |
| 框架 | 7-8 | Vercel AI SDK + MCP | Agent 对话 UI / MCP Agent |
| 进阶 | 9-10 | 记忆系统 + 多 Agent | 记忆 Agent / Agent 团队 |
| 落地 | 11-12 | 综合项目 + 工程化 | 完整知识库 Agent 应用 |

## 技术栈

```
TypeScript（strict）贯穿全栈
├── 模型：Ollama + Hermes 3.1 / Qwen 2.5
├── Agent 框架：Vercel AI SDK（TS 原生）
├── RAG：LanceDB + Ollama Embedding
├── 工具协议：MCP SDK
└── 前端：Next.js + React + Tailwind CSS
```

## 文件结构

```
├── MISSION.md           # 学习目标
├── STUDY-PLAN.md        # 12 周详细计划
├── NOTES.md             # 偏好与进度
├── RESOURCES.md         # 学习资源
├── lessons/             # 课程文件（HTML）
├── reference/           # 术语表、环境准备清单
├── learning-records/    # 学习记录
└── assets/              # 共享样式
```

## 进度

```
当前：第 1 周 Day 1 ✅ — 下一步：Day 2（LLM 核心概念）
```

## 环境要求

- Windows 10+ / macOS / Linux
- Node.js 18+
- 16GB+ 内存（推荐）
- [Ollama](https://ollama.com/)