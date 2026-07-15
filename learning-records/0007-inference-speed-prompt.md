# 推理速度测量与 Prompt 参数

用户学会了用 `--verbose` 测量模型的推理速度，理解了三个阶段：Load（加载模型到内存）→ Prefill（理解 Prompt）→ Decode（逐 token 生成）。掌握了两个核心参数：System Prompt（定义角色和行为）和 Temperature（控制输出随机性，0.0 保守 → 1.0+ 创意）。能够用 `eval rate (tok/s)` 对比不同模型的推理速度。

**Evidence**: 用户尝试了 `/set system` 设置角色，体验了 `/set parameter temperature` 对输出的影响，已理解 `--verbose` 输出的各项指标含义。

**Implications**:
- 代码生成场景应使用低 Temperature（0.0-0.3），对话场景可用 0.7-0.9
- 模型加载（Load）只在冷启动时发生，连续对话无需重复等待
- `eval rate` 是衡量模型在你电脑上实际表现的最核心指标
- `/set parameter` 是 Ollama 交互模式中修改参数的正确语法（非 `/set`）