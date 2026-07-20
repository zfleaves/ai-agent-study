# ReAct 自回归约束：为什么"写出来"比"心里想"好

用户理解了 ReAct（Reasoning + Acting）的核心机制——Thought → Action → Observation 循环。关键洞察：Transformer 自回归特性意味着已生成的 Thought token 会锁定后续 token 的概率分布。当模型显式写下"Thought: 需要先判断是否下雨，如果下雨就提醒带伞"时，这些 token 通过注意力机制约束后续 Action 和 Answer 的生成方向。不写 Thought 等价于推理不存在——模型容易在复杂多步任务中"忘记"依赖条件。

**Evidence**: 用户在第 3 周 Demo 2 中观察到工具选择错误（searchCode 不触发），理解了 System Prompt 对工具选择的关键作用。本课将这一经验提升为理论——ReAct 的 Thought 机制解释了 System Prompt 为什么有效。

**Implications**:
- 多步推理（"如果A就B，否则C"）→ 必须用 ReAct 或至少显式推理
- 单工具调用 → 不需要 Thought，纯 Tool-calling 更高效
- 小模型（3b）不会自动输出 Thought → 需要 System Prompt 强制
- 开发阶段强制 Thought 做 debug，生产环境按需启用
- 对比 CoT：ReAct = CoT + 工具调用，是 CoT 在 Agent 场景的扩展