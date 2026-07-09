# NVM + Node.js v22.3.0 + Codex CLI + cc-switch 完整部署手册

> **适用平台**：Windows 10/11  
> **最后更新**：2026-07-09  
> **目标**：在一台 Windows 机器上完成 Node.js 版本管理、Codex CLI 安装、以及 Claude Code ↔ Codex CLI 无缝切换

---

## 目录

1. [前置检查](#1-前置检查)
2. [NVM for Windows 安装](#2-nvm-for-windows-安装)
3. [Node.js v22.3.0 安装与配置](#3-nodejs-v2230-安装与配置)
4. [Codex CLI 安装与配置](#4-codex-cli-安装与配置)
5. [cc-switch 安装与使用](#5-cc-switch-安装与使用)
6. [日常使用流程](#6-日常使用流程)
7. [故障排查](#7-故障排查)
8. [附录：环境变量速查](#8-附录环境变量速查)

---

## 1. 前置检查

### 1.1 确认系统信息

打开 PowerShell（**以管理员身份运行**），执行：

```powershell
# 查看系统信息
systeminfo | Select-String "OS Name"
systeminfo | Select-String "Total Physical Memory"

# 查看当前 Node.js 状态（如果已安装）
node --version
npm --version

# 查看 PATH 环境变量（确认没有旧 Node 残留）
$env:PATH -split ';' | Select-String -Pattern 'node|npm|nvm'
```

### 1.2 清理旧 Node.js（重要！）

> ⚠️ **如果之前通过 nodejs.org 安装过 Node.js，必须先卸载，否则会和 nvm 冲突。**

```powershell
# 方法 1：通过 Windows 设置卸载
# 设置 → 应用 → 应用和功能 → 搜索 "Node.js" → 卸载

# 方法 2：检查残留目录，手动删除
# 删除以下目录（如果存在）：
#   C:\Program Files\nodejs
#   C:\Program Files (x86)\nodejs
#   %USERPROFILE%\AppData\Roaming\npm
#   %USERPROFILE%\AppData\Roaming\npm-cache
```

---

## 2. NVM for Windows 安装

> NVM for Windows 是 Node.js 的版本管理工具，和 Linux 的 `nvm` 不是同一个项目。  
> 官方仓库：https://github.com/coreybutler/nvm-windows

### 2.1 下载安装

**方式一：使用安装包（推荐）**

1. 打开浏览器，访问：https://github.com/coreybutler/nvm-windows/releases
2. 找到最新 Release，下载 `nvm-setup.exe`
3. 运行安装程序，注意以下选项：
   - **NVM 安装路径**：`C:\Users\<用户名>\AppData\Roaming\nvm`（默认即可）
   - **Node.js Symlink 路径**：`C:\Program Files\nodejs`（默认即可）
   - ⚠️ 安装路径中**不要有空格和中文字符**

**方式二：使用 winget（Windows 包管理器）**

```powershell
winget install CoreyButler.NVMforWindows
```

### 2.2 验证安装

安装完成后，**重新打开一个 PowerShell 窗口**（必须以管理员身份运行），执行：

```powershell
nvm version
```

预期输出类似：`1.1.12`

### 2.3 配置 NVM

```powershell
# 查看可用的 Node.js 版本
nvm list available

# 配置镜像加速（中国大陆用户建议配置）
nvm node_mirror https://npmmirror.com/mirrors/node/
nvm npm_mirror https://npmmirror.com/mirrors/npm/
```

---

## 3. Node.js v22.3.0 安装与配置

### 3.1 安装 Node.js v22.3.0

```powershell
# 安装 Node.js v22.3.0
nvm install 22.3.0

# 使用该版本
nvm use 22.3.0

# 验证
node --version   # 应输出 v22.3.0
npm --version    # 应输出 10.x.x
```

### 3.2 设置为默认版本

```powershell
# 设置 v22.3.0 为默认版本（每次打开新终端自动使用）
nvm on
```

### 3.3 多版本管理（可选）

```powershell
# 查看已安装的版本
nvm list

# 安装其他版本
nvm install 18.20.0   # LTS 备用
nvm install 20.12.0   # 另一个 LTS

# 切换版本
nvm use 18.20.0
nvm use 22.3.0

# 卸载某个版本
nvm uninstall 18.20.0
```

### 3.4 配置 npm

```powershell
# 配置 npm 全局安装路径（避免权限问题）
npm config set prefix "C:\Users\$env:USERNAME\AppData\Roaming\nvm\v22.3.0"

# 配置镜像加速（中国大陆用户）
npm config set registry https://registry.npmmirror.com

# 验证配置
npm config list
```

---

## 4. Codex CLI 安装与配置

> Codex CLI 是 OpenAI 推出的命令行 AI 编程助手，类似于 Claude Code。  
> 官方文档：https://github.com/openai/codex

### 4.1 安装 Codex CLI

```powershell
# 全局安装 Codex CLI
npm install -g @openai/codex

# 验证安装
codex --version
```

### 4.2 配置 API Key

Codex CLI 需要 OpenAI API Key。

```powershell
# 方法 1：设置环境变量（推荐，当前会话生效）
$env:OPENAI_API_KEY = "sk-your-api-key-here"

# 方法 2：永久设置（用户级）
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-your-api-key-here", "User")

# 方法 3：通过 codex 命令配置
codex setup
```

### 4.3 验证 Codex CLI 可用

```powershell
# 测试基本对话
codex "Hello, introduce yourself in one sentence"

# 查看帮助
codex --help

# 查看当前配置
codex config show
```

### 4.4 Codex CLI 常用命令

```powershell
# 交互式对话
codex

# 单次提问
codex "explain this code"

# 指定工作目录
codex --project /path/to/project

# 查看会话历史
codex history
```

---

## 5. cc-switch 安装与使用

> `cc-switch` 是一个轻量级 CLI 工具，用于在 **Claude Code** 和 **Codex CLI** 之间快速切换配置。  
> 它主要管理：API Key 环境变量、默认模型配置、以及各工具的专属设置。

### 5.1 什么是 cc-switch

在日常开发中，你可能需要在两个 AI 编程助手之间切换：

| 工具 | 公司 | API Key 环境变量 | 默认模型 |
|------|------|-----------------|---------|
| **Claude Code** | Anthropic | `ANTHROPIC_API_KEY` | Claude Sonnet / Opus |
| **Codex CLI** | OpenAI | `OPENAI_API_KEY` | GPT-4o / o3 |

每次手动切换环境变量很繁琐，`cc-switch` 帮你一键切换。

### 5.2 安装 cc-switch

```powershell
# 全局安装
npm install -g cc-switch

# 验证安装
cc-switch --version
```

### 5.3 配置 cc-switch

```powershell
# 初始化配置（交互式）
cc-switch init

# 或者手动编辑配置文件
# 配置文件位置：%USERPROFILE%\.cc-switch\config.json
```

配置文件示例 (`%USERPROFILE%\.cc-switch\config.json`)：

```json
{
  "profiles": {
    "claude": {
      "name": "Claude Code",
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-xxxxxxxxxxxxx",
        "ANTHROPIC_MODEL": "claude-sonnet-5"
      },
      "shell": {
        "prompt_prefix": "[Claude]"
      }
    },
    "codex": {
      "name": "Codex CLI",
      "env": {
        "OPENAI_API_KEY": "sk-xxxxxxxxxxxxx",
        "OPENAI_MODEL": "gpt-4o"
      },
      "shell": {
        "prompt_prefix": "[Codex]"
      }
    }
  },
  "default": "claude"
}
```

### 5.4 使用 cc-switch

```powershell
# 切换到 Claude Code 模式
cc-switch use claude

# 切换到 Codex CLI 模式
cc-switch use codex

# 查看当前使用的模式
cc-switch current

# 列出所有可用配置
cc-switch list

# 查看当前环境变量状态
cc-switch status
```

### 5.5 cc-switch 工作原理

当你执行 `cc-switch use claude` 时，它会：

1. 读取 `config.json` 中 `claude` 配置的 `env` 字段
2. 将对应的 API Key 写入当前会话的环境变量
3. 更新 `%USERPROFILE%\.cc-switch\current` 文件记录当前状态
4. 可选：更新 PowerShell Profile 中的提示符前缀

### 5.6 无 cc-switch 的替代方案（手写脚本）

如果 `cc-switch` 安装遇到问题，可以用以下 PowerShell 函数替代：

```powershell
# 将以下内容添加到你的 PowerShell Profile
# 编辑方式：notepad $PROFILE

function Switch-AI {
    param(
        [ValidateSet("claude", "codex")]
        [string]$Tool
    )

    switch ($Tool) {
        "claude" {
            $env:ANTHROPIC_API_KEY = "sk-ant-xxxxxxxxxxxxx"
            Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
            Write-Host "[✓] 已切换到 Claude Code" -ForegroundColor Green
        }
        "codex" {
            $env:OPENAI_API_KEY = "sk-xxxxxxxxxxxxx"
            Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
            Write-Host "[✓] 已切换到 Codex CLI" -ForegroundColor Green
        }
    }
}

# 使用方式
# Switch-AI claude   → 切换到 Claude Code
# Switch-AI codex    → 切换到 Codex CLI
```

---

## 6. 日常使用流程

### 6.1 每日启动检查清单

```powershell
# 1. 确认 Node.js 版本
node --version   # 应为 v22.3.0

# 2. 确认 NVM 状态
nvm list         # v22.3.0 前面应有 * 标记

# 3. 确认 AI 工具可用
codex --version  # Codex CLI 版本
claude --version # Claude Code 版本（如已安装）

# 4. 选择工作模式
cc-switch use claude   # 或 cc-switch use codex
cc-switch current       # 确认当前模式
```

### 6.2 项目切换流程

```powershell
# 切换到不同项目，可能需要不同 Node 版本
nvm use 22.3.0   # 本项目使用 v22.3.0
nvm use 18.20.0  # 其他项目可能需要 LTS

# 切换 AI 工具
cc-switch use claude  # 使用 Claude Code 写代码
cc-switch use codex   # 使用 Codex CLI 写代码
```

### 6.3 新项目初始化

```powershell
# 确保 Node 版本正确
nvm use 22.3.0

# 初始化项目
mkdir my-ai-agent && cd my-ai-agent
npm init -y

# 安装 TypeScript
npm install -D typescript @types/node tsx
npx tsc --init
```

---

## 7. 故障排查

### 7.1 NVM 问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| `nvm` 命令找不到 | 未安装或 PATH 未生效 | 重启终端，或以管理员身份运行 |
| `nvm use` 报权限错误 | 终端不是管理员 | 以管理员身份运行 PowerShell |
| `nvm install` 下载慢 | 网络问题 | 配置镜像：`nvm node_mirror https://npmmirror.com/mirrors/node/` |
| `node` 命令指向旧版本 | nvm 未正确接管 | 确保 `C:\Program Files\nodejs` 是 nvm 创建的 symlink |

### 7.2 Node.js 问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| `npm install -g` 权限错误 | npm 全局路径权限不足 | 执行 `npm config set prefix` 指向用户目录 |
| 某些包安装失败 | 缺少 C++ 编译工具 | 安装 `windows-build-tools`：`npm install -g windows-build-tools` |
| `tsx` 命令找不到 | 未全局安装 | `npm install -g tsx` |

### 7.3 Codex CLI 问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| `codex` 命令找不到 | npm 全局路径未加入 PATH | 将 `%APPDATA%\npm` 加入 PATH |
| 认证失败 | API Key 未设置或过期 | 检查 `$env:OPENAI_API_KEY` |
| 网络超时 | 代理或防火墙问题 | 配置代理：`$env:HTTPS_PROXY = "http://127.0.0.1:7890"` |

### 7.4 cc-switch 问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| `cc-switch` 命令找不到 | 未全局安装或 PATH 问题 | `npm install -g cc-switch` |
| 配置文件不存在 | 未执行 init | `cc-switch init` |
| 切换后 API Key 不生效 | 环境变量未刷新 | 重启终端，或执行 `refreshenv` |

### 7.5 通用诊断命令

```powershell
# 检查所有 Node 相关路径
where.exe node
where.exe npm
where.exe nvm

# 检查环境变量
$env:PATH -split ';' | Select-String -Pattern 'node|npm|nvm|codex|cc-switch'

# 检查 npm 全局安装列表
npm list -g --depth=0

# 检查 NVM 状态
nvm list
nvm version
```

---

## 8. 附录：环境变量速查

### 8.1 完整环境变量配置

以下为推荐的环境变量设置（添加到 PowerShell Profile 或系统环境变量）：

```powershell
# === Node.js & NVM ===
# NVM 自动管理，无需手动设置

# === npm ===
$env:NPM_CONFIG_REGISTRY = "https://registry.npmmirror.com"  # 国内镜像

# === Claude Code ===
$env:ANTHROPIC_API_KEY = "sk-ant-xxxxxxxxxxxxx"

# === Codex CLI ===
$env:OPENAI_API_KEY = "sk-xxxxxxxxxxxxx"

# === 代理配置（如需要） ===
# $env:HTTP_PROXY = "http://127.0.0.1:7890"
# $env:HTTPS_PROXY = "http://127.0.0.1:7890"
```

### 8.2 PowerShell Profile 推荐配置

编辑 `$PROFILE`（`notepad $PROFILE`），添加以下内容：

```powershell
# ============================================
# AI Agent 开发环境 — PowerShell Profile
# ============================================

# 显示当前 Node 版本和 AI 工具模式
function prompt {
    $nodeVer = (node --version 2>$null) -replace 'v', ''
    $aiMode = if (Test-Path "$env:USERPROFILE\.cc-switch\current") {
        Get-Content "$env:USERPROFILE\.cc-switch\current"
    } else { "none" }
    Write-Host "[Node:$nodeVer]" -NoNewline -ForegroundColor Green
    Write-Host "[AI:$aiMode]" -NoNewline -ForegroundColor Cyan
    return " PS $($executionContext.SessionState.Path.CurrentLocation)$('>' * ($nestedPromptLevel + 1)) "
}

# cc-switch 函数（替代方案）
function Switch-AI {
    param(
        [ValidateSet("claude", "codex")]
        [string]$Tool
    )
    switch ($Tool) {
        "claude" {
            $env:ANTHROPIC_API_KEY = "sk-ant-xxxxxxxxxxxxx"
            Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
            "claude" | Out-File "$env:USERPROFILE\.cc-switch\current"
            Write-Host "[✓] 已切换到 Claude Code" -ForegroundColor Green
        }
        "codex" {
            $env:OPENAI_API_KEY = "sk-xxxxxxxxxxxxx"
            Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
            "codex" | Out-File "$env:USERPROFILE\.cc-switch\current"
            Write-Host "[✓] 已切换到 Codex CLI" -ForegroundColor Green
        }
    }
}

Write-Host "AI Agent 开发环境已就绪 | Node $(node --version) | npm $(npm --version)" -ForegroundColor Magenta
```

### 8.3 关键路径速查

| 路径 | 说明 |
|------|------|
| `C:\Users\<用户名>\AppData\Roaming\nvm` | NVM 安装目录 |
| `C:\Program Files\nodejs` | Node.js 符号链接（NVM 管理） |
| `%APPDATA%\npm` | npm 全局包安装目录 |
| `%USERPROFILE%\.cc-switch\` | cc-switch 配置目录 |
| `%USERPROFILE%\.claude\` | Claude Code 配置目录 |
| `%USERPROFILE%\.codex\` | Codex CLI 配置目录 |

---

## 9. 快速安装脚本（一键部署）

将以下内容保存为 `setup-ai-env.ps1`，以管理员身份运行：

```powershell
# setup-ai-env.ps1 — AI Agent 开发环境一键部署
# 以管理员身份运行此脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " AI Agent 开发环境 — 一键部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 安装 NVM for Windows
Write-Host "[1/4] 安装 NVM for Windows..." -ForegroundColor Yellow
if (-not (Get-Command nvm -ErrorAction SilentlyContinue)) {
    winget install CoreyButler.NVMforWindows --accept-package-agreements
    Write-Host "  [✓] NVM 安装完成，请重启终端后继续" -ForegroundColor Green
    Write-Host "  重启后重新运行此脚本以继续后续步骤" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "  [✓] NVM 已安装" -ForegroundColor Green
}

# 2. 安装 Node.js v22.3.0
Write-Host "[2/4] 安装 Node.js v22.3.0..." -ForegroundColor Yellow
nvm install 22.3.0
nvm use 22.3.0
Write-Host "  [✓] Node.js v22.3.0 安装完成" -ForegroundColor Green

# 3. 配置 npm
Write-Host "[3/4] 配置 npm..." -ForegroundColor Yellow
npm config set registry https://registry.npmmirror.com
Write-Host "  [✓] npm 配置完成" -ForegroundColor Green

# 4. 安装 Codex CLI 和 cc-switch
Write-Host "[4/4] 安装全局工具..." -ForegroundColor Yellow
npm install -g @openai/codex
npm install -g cc-switch
Write-Host "  [✓] 全局工具安装完成" -ForegroundColor Green

# 验证
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " 安装完成！版本信息：" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Node.js : $(node --version)" -ForegroundColor White
Write-Host "  npm     : $(npm --version)" -ForegroundColor White
Write-Host "  Codex   : $(codex --version 2>$null)" -ForegroundColor White
Write-Host ""

# 后续步骤提示
Write-Host "后续步骤：" -ForegroundColor Yellow
Write-Host "  1. 运行 'cc-switch init' 配置 AI 工具切换" -ForegroundColor White
Write-Host "  2. 设置你的 API Keys：" -ForegroundColor White
Write-Host "     - Claude Code: `$env:ANTHROPIC_API_KEY = 'sk-ant-...'`" -ForegroundColor White
Write-Host "     - Codex CLI:   `$env:OPENAI_API_KEY = 'sk-...'`" -ForegroundColor White
Write-Host "  3. 运行 'cc-switch use claude' 或 'cc-switch use codex' 开始工作" -ForegroundColor White
```

---

> **手册版本**：v1.0  
> **适用环境**：Windows 10/11 + PowerShell 5.1+  
> **相关文档**：[环境准备清单](./reference/environment-setup.html) | [学习计划](./STUDY-PLAN.md)