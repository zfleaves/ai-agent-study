# 第 2 周：Ollama 环境 + 第一个本地模型 + 推理优化

> 日期：2026-07-14 ~ 2026-07-18
> 目标：在 Windows 上安装 Ollama，拉取 Hermes 3.1 模型，用 TypeScript 代码与模型对话
> 完成度：0/5

---

## 本周目标

理解模型大小、量化级别与推理速度的关系，学会选模型。在 Windows 上安装 Ollama，用 TypeScript 流式调用本地模型。

## 课程列表

| Day | 主题 | 文件 | 状态 |
|-----|------|------|------|
| Day 1 | Ollama 安装 + 模型选型 | — | ⬜ |
| Day 2 | 命令行对话 + 速度实测 | — | ⬜ |
| Day 3 | TS SDK 接入 + Streaming | — | ⬜ |
| Day 4 | Prompt 工程 + 瘦身实验 | — | ⬜ |
| Day 5 | 复盘 + Demo 1 | — | ⬜ |

## 本周核心知识点

1. **GGUF 格式**：量化模型的通用文件格式，Ollama 使用的模型格式
2. **量化级别**：Q4/Q8/Q3 的含义，精度 vs 速度的权衡
3. **模型选型**：8B vs 3B vs 1.5B，不同场景选不同大小
4. **Streaming**：流式响应原理，首 token 延迟 vs 总延迟
5. **Prompt 工程**：System Prompt、Few-shot、CoT 思维链

## Demo 1：命令行聊天机器人 + 速度报告

```
功能：终端输入文字 → Hermes 流式回复 → 支持多轮对话
技术：Node.js + TypeScript + ollama-js + readline
额外输出：模型速度对比报告（8B Q4 vs 3B Q4 vs 1.5B Q4）
```

## 下周预告

**第 3 周：Tool-calling — 让模型"做事"**
- Function Calling 机制
- JSON Schema 工具定义
- 工具调用循环
- Demo 2：工具调用 Agent