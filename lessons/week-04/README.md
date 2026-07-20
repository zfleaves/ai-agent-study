# 第 4 周：Agent 核心循环 — 从"调用"到"自主"

> 日期：2026-07-21 ~ 2026-07-25
> 目标：深入理解 Agent 的决策循环，实现 ReAct 模式，让 Agent 能自主规划和执行多步任务
> 完成度：1/5 🔄

---

## 本周目标

从第 3 周的"模型会调工具"升级到"Agent 会自主推理"。掌握 ReAct（Reasoning + Acting）模式，学会状态管理、错误恢复和任务分解。

## 课程列表

| Day | 主题 | 文件 | 状态 |
|-----|------|------|------|
| Day 1 | ReAct 模式深入 | [0016-react-pattern.html](./0016-react-pattern.html) | ✅ |
| Day 2 | Agent 状态管理 | 0017-agent-state.html | ⬜ |
| Day 3 | 错误处理与重试 | 0018-error-handling.html | ⬜ |
| Day 4 | Agent 规划能力 | 0019-agent-planning.html | ⬜ |
| Day 5 | 复盘 + Demo 3 | 0020-week4-review.html | ⬜ |

## 本周核心知识点

1. **ReAct 模式**：Thought → Action → Observation 循环，自回归约束机制让模型在行动前显式思考
2. **Agent 状态管理**：State 设计、消息角色（user/assistant/tool/system）、历史截断策略
3. **错误处理与重试**：工具调用失败、超时、格式错误、幻觉调用的处理策略
4. **Agent 规划能力**：Task Decomposition、Plan-then-Act vs ReAct、子任务依赖

## Demo 3：自主任务 Agent（预告）

```
功能：用户给一个复杂任务 → Agent 自动分解 → 逐步执行 → 汇报结果
示例："帮我查一下北京天气，如果下雨就提醒我带伞，然后查明天的高铁到上海"
技术：Node.js + TypeScript + Hermes + 多工具 + ReAct 循环 + 状态管理
关键点：任务分解、多步执行、中间状态可视化、最终总结
```

## 下周预告

**第 5 周：RAG 原理 — 让模型"读你的文档"**
- RAG 全景原理（检索→增强→生成）
- 文档处理管道（Chunking）
- Embedding 向量化
- 向量数据库（LanceDB）
- Demo 4：文档问答系统