# 第 3 周：Tool-calling — 让模型"做事"

> 日期：2026-07-14 ~ 2026-07-20
> 目标：理解 Function Calling 机制，让模型能调用 TypeScript 函数，实现 Agent 核心能力
> 完成度：5/5 ✅

---

## 本周目标

理解 Function Calling 的完整流程：从工具定义（JSON Schema）到 Agent 调用循环，再到多工具编排。让模型从"只会聊天"升级为"能做事"。

## 课程列表

| Day | 主题 | 文件 | 状态 |
|-----|------|------|------|
| Day 1 | Tool-calling 原理 | [0011-tool-calling-intro.html](./0011-tool-calling-intro.html) | ✅ |
| Day 2 | 定义第一个工具 | [0012-first-tool.html](./0012-first-tool.html) | ✅ |
| Day 3 | 工具调用循环 | [0013-tool-call-loop.html](./0013-tool-call-loop.html) | ✅ |
| Day 4 | 多工具编排 | [0014-multi-tool-orchestration.html](./0014-multi-tool-orchestration.html) | ✅ |
| Day 5 | 复盘 + Demo 2 | — | ✅ |

## 本周核心知识点

1. **Function Calling 机制**：模型不"执行"代码，它只输出 JSON 告诉代码"帮我做这件事"。模型 = 大脑，代码 = 手。
2. **JSON Schema 工具定义**：每个工具是一个 JSON Schema 对象，包含 name、description、parameters。description 质量决定工具选择准确率。
3. **Agent 调用循环**：user → model → tool_call → execute → result → model → ... → answer。循环是 Agent 的"心跳"。
4. **多工具编排**：模型从多个工具中自主选择。并行调用（独立任务）vs 串行调用（条件依赖）。
5. **工具重叠处理**：语义相近的工具（如 searchWeb vs searchCode）必须在 description 中明确区分"适用于/不适用于"。

## Demo 2：工具调用 Agent 综合实战

```
文件：demo/week-03/agent-demo.ts
功能：用户自然语言提问 → Agent 自动选择工具 → 执行 → 返回结果
工具：getWeather / calculate / getCurrentTime / searchWeb / searchCode（5 个）
技术：Node.js + TypeScript + ollama-js
关键点：工具注册、Agent 循环、并行/串行执行、错误兜底、状态追踪

5 个预设场景：
  1. 基础工具调用 — 验证 Function Calling 通不通
  2. 工具选择 — 5 个工具，模型选哪个？
  3. 并行调用 — 多个独立任务同时执行
  4. 条件式编排 — "如果...就..." 完整 Agent 循环
  5. 自由对话 — 自定义问题，交互式 Agent

运行方式：
  cd demo/week-03
  npx tsx agent-demo.ts
```

## 验证结果

| 场景 | 结果 | 说明 |
|------|------|------|
| 基础工具调用 | 3/3 ✅ | getWeather / calculate / getCurrentTime 全部正确调用 |
| 工具选择（5 选 1） | 4/5 ✅ | searchCode 偶尔未触发（3b 小模型正常） |
| 条件式 Agent 循环 | ✅ | 调工具→读结果→判断→回答，2 步完成 |

## 常见坑

- 小模型（3b）并行调用能力弱，一次只调一个工具
- 工具描述太像会导致模型选错工具
- 工具执行失败时模型可能陷入重试死循环 → 必须设 MAX_STEPS
- `__dirname` 在 ESM 下不可用，需用 `import.meta.url` + `fileURLToPath`

## 下周预告

**第 4 周：Agent 核心循环 — 从"调用"到"自主"**
- ReAct 模式深入（Reasoning + Acting 完整循环）
- Agent 状态管理（对话历史、工具调用历史、历史截断）
- 错误处理与重试（超时、格式错误、幻觉调用）
- Agent 规划能力（任务分解、Plan-then-Act vs ReAct）
- Demo 3：自主任务 Agent（规划+执行+错误恢复）