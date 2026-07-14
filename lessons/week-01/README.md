# 第 1 周：认知地基 — "AI Agent 到底是什么"

> 日期：2026-07-09 ~ 2026-07-14
> 目标：理解 LLM、Agent、Token 等核心概念，建立完整的认知地图
> 完成度：4/5 ✅

---

## 本周目标

理解 LLM、Agent、Token 等核心概念，建立完整的认知地图，为下周动手安装环境做好准备。

## 课程列表

| Day | 主题 | 文件 | 状态 |
|-----|------|------|------|
| Day 1 | Agent 全景认知 | [0001-hermes-agent-overview.html](./0001-hermes-agent-overview.html) | ✅ |
| Day 2 | LLM 核心概念 | [0002-llm-core-concepts.html](./0002-llm-core-concepts.html) | ✅ |
| Day 3 | Agent 工作原理 | [0003-agent-workflow.html](./0003-agent-workflow.html) | ✅ |
| Day 4 | 技术生态地图 | [0004-tech-ecosystem.html](./0004-tech-ecosystem.html) | ✅ |
| Day 5 | 复盘 + 小测 | — | ⬜ |

## 本周核心知识点

1. **LLM vs Agent**：LLM 是"脑子"（推理），Agent 是 LLM + 工具 = 有"手"的 LLM
2. **Token**：模型读写的最小单位，中文 1 字 ≈ 1-2 token，英文 1 词 ≈ 1-2 token
3. **Context Window**：模型一次能"看到"的最大 token 数，决定了对话记忆的上限
4. **ReAct 模式**：Reasoning + Acting 交替循环，Agent 的核心工作模式
5. **四层架构**：模型层 → 工具&数据层 → 框架层 → 应用层

## 复盘模板

```
【本周学了什么】5 个核心概念（用自己的话写）
【最模糊的概念】哪个还不太懂？
【最有趣的点】哪个让你最兴奋？
【下周想深入】有什么特别想深入的方向？
```

## 下周预告

**第 2 周：Ollama 环境 + 第一个本地模型**
- 安装 Ollama，拉取 Hermes 3.1 模型
- 用 TypeScript 代码与模型对话
- 流式响应、Prompt 工程
- Demo 1：命令行聊天机器人