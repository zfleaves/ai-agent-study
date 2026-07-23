# 知识库管理平台 — 环境搭建清单

> 从零开始搭建完整开发环境，适用于 Windows 10/11

---

## 一、硬件要求

| 项目 | 最低配置 | 推荐配置 |
|---|---|---|
| CPU | 4 核 | 8 核+ |
| 内存 | 8 GB | 16 GB+ |
| 磁盘 | 20 GB 可用 | 50 GB+ SSD |
| 网络 | 可访问云端 API | 稳定宽带 |

> 本项目使用云端 API 做推理，不需要 GPU，普通开发机即可

---

## 二、基础软件

### 2.1 必须安装

| 软件 | 版本 | 用途 | 下载/安装 |
|---|---|---|---|
| **Python** | 3.11+ | 后端 Agent 逻辑 | `winget install Python.Python.3.11` 或 [python.org](https://python.org) |
| **Node.js** | 18 LTS+ | Next.js 前端 + 简单接口 | `winget install OpenJS.NodeJS.LTS` 或 [nodejs.org](https://nodejs.org) |
| **Git** | 最新版 | 版本控制 | `winget install Git.Git` |
| **VS Code** | 最新版 | 编辑器 | `winget install Microsoft.VisualStudioCode` |

### 2.2 可选安装

| 软件 | 用途 | 说明 |
|---|---|---|
| Ollama | 本地模型调试备用 | 非必须，所有实战用云端 API |
| Docker Desktop | 最终部署 | Week 16 才需要 |
| DBeaver / TablePlus | 数据库管理 | 查看 SQLite/PostgreSQL 数据 |

### 2.3 验证安装

```powershell
# 验证 Python
python --version    # 应输出 Python 3.11.x 或更高

# 验证 Node.js
node --version      # 应输出 v18.x.x 或更高
npm --version       # 应输出 9.x.x 或更高

# 验证 Git
git --version
```

---

## 三、Python 环境

### 3.1 创建虚拟环境

```powershell
# 在项目目录下
cd E:\gaoyang\loop_web
python -m venv venv

# 激活虚拟环境（Windows PowerShell）
.\venv\Scripts\Activate.ps1

# 如果报执行策略错误，先执行：
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3.2 安装核心依赖

```bash
# requirements.txt（创建在项目根目录）
pip install -r requirements.txt
```

**`requirements.txt` 内容：**

```txt
# LLM API
openai>=1.0.0

# Web 框架
fastapi>=0.110.0
uvicorn[standard]>=0.27.0

# 数据模型
pydantic>=2.0.0
pydantic-settings>=2.0.0

# 环境变量
python-dotenv>=1.0.0

# 文档解析
markdown-it-py>=3.0.0
PyPDF2>=3.0.0
python-docx>=1.0.0

# 文本处理
jieba>=0.42.0           # 中文分词
tiktoken>=0.5.0         # Token 计数

# 向量数据库
lancedb>=0.6.0

# 图计算
networkx>=3.2

# 数据处理
numpy>=1.26.0

# HTTP 客户端（调用 Next.js 接口）
httpx>=0.27.0

# 异步支持
aiofiles>=23.0.0

# 工具
python-multipart>=0.0.9   # 文件上传
```

### 3.3 验证 Python 环境

```powershell
# 激活 venv 后
python -c "import fastapi; print('FastAPI OK')"
python -c "import openai; print('OpenAI SDK OK')"
python -c "import pydantic; print('Pydantic OK')"
python -c "import lancedb; print('LanceDB OK')"
python -c "import networkx; print('NetworkX OK')"
```

---

## 四、Node.js 环境（Next.js 前端 + 简单接口）

### 4.1 安装依赖

```powershell
# 进入 loop_web 前端目录
cd E:\gaoyang\loop_web

# 安装依赖（如果还没装）
npm install

# 或使用 pnpm（推荐）
npm install -g pnpm
pnpm install
```

### 4.2 验证前端

```powershell
# 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

### 4.3 前端项目结构（关键目录）

```
loop_web/
  src/
    pages/
      etl-process/           ← 知识核准 5 步流程页面
        index.tsx             ← 任务列表页
        ProcessDetail.tsx     ← 流程控制器（步骤切换）
        steps/
          Step1Tagging.tsx    ← 知识打标
          Step2Alias.tsx      ← 别名确认
          Step3Content.tsx    ← 内容确认
          Step4Graph.tsx      ← 图谱构建
          Step5QA.tsx         ← 知识问答
        components/
          KnowledgeGraph/     ← 图谱可视化组件
      etl-upload/             ← 文档上传页面
    services/
      etlProcess.ts           ← ETL 流程 API 调用
    models/
      etlProcess.ts           ← ETL 流程数据模型
```

---

## 五、数据库

### 5.1 SQLite（结构化数据）

```powershell
# SQLite 是 Python 内置的，无需额外安装
# 验证：
python -c "import sqlite3; print('SQLite OK:', sqlite3.sqlite_version)"
```

**用途：** 存储任务状态、实体、关系、审核记录等结构化数据

### 5.2 LanceDB（向量存储）

```powershell
# 已通过 pip install lancedb 安装
# 验证：
python -c "import lancedb; db = lancedb.connect('./.lancedb'); print('LanceDB OK')"
```

**用途：** 存储文档 Chunk Embedding、实体 Embedding，用于相似度搜索

### 5.3 Neo4j（图数据库，可选）

```powershell
# 方案 A：Docker 安装（推荐）
docker run -d --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password123 \
  neo4j:5

# 方案 B：使用 networkx 替代（更轻量，Week 13 先用这个）
# networkx 已在 requirements.txt 中
```

**用途：** 存储知识图谱，支持图查询、路径分析（Week 13+）

---

## 六、环境变量配置

### 6.1 创建 `.env` 文件

在项目根目录（`E:\gaoyang\loop_web\`）创建 `.env`：

```bash
# ============================================================
# 云端 API 配置
# ============================================================
API_KEY=sk-your-api-key-here
BASE_URL=https://api.deepseek.com/v1

# ============================================================
# 多模型配置（按任务分配，可按需切换对比性能）
# ============================================================

# 知识打标（Step 1）— 强推理，准确识别实体/关系/事实
MODEL_EXTRACTION=deepseek-chat

# 别名消歧（Step 2）— 语义理解，判断实体是否同义
MODEL_DISAMBIGUATION=deepseek-chat

# 内容审核辅助（Step 3）— 辅助建议，中等推理
MODEL_REVIEW=deepseek-chat

# 题目生成（Step 5）— 强推理，生成多样化题目
MODEL_QA_GENERATION=deepseek-chat

# 判分（Step 5）— 语义对比，判断答案正确性
MODEL_QA_SCORING=deepseek-chat

# 默认模型（兜底）
MODEL_DEFAULT=deepseek-chat

# ============================================================
# 数据库配置
# ============================================================
SQLITE_PATH=./data/knowledge_vault.db
LANCEDB_PATH=./.lancedb

# ============================================================
# 服务端口
# ============================================================
PYTHON_API_PORT=8000
NEXTJS_PORT=3000
```

### 6.2 读取 `.env` 的 Python 代码模板

```python
# config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    API_KEY = os.getenv("API_KEY", "")
    BASE_URL = os.getenv("BASE_URL", "https://api.deepseek.com/v1")
    
    MODEL_EXTRACTION = os.getenv("MODEL_EXTRACTION", "deepseek-chat")
    MODEL_DISAMBIGUATION = os.getenv("MODEL_DISAMBIGUATION", "deepseek-chat")
    MODEL_REVIEW = os.getenv("MODEL_REVIEW", "deepseek-chat")
    MODEL_QA_GENERATION = os.getenv("MODEL_QA_GENERATION", "deepseek-chat")
    MODEL_QA_SCORING = os.getenv("MODEL_QA_SCORING", "deepseek-chat")
    MODEL_DEFAULT = os.getenv("MODEL_DEFAULT", "deepseek-chat")
    
    SQLITE_PATH = os.getenv("SQLITE_PATH", "./data/knowledge_vault.db")
    LANCEDB_PATH = os.getenv("LANCEDB_PATH", "./.lancedb")
    
    PYTHON_API_PORT = int(os.getenv("PYTHON_API_PORT", "8000"))
    NEXTJS_PORT = int(os.getenv("NEXTJS_PORT", "3000"))

config = Config()
```

---

## 七、项目目录结构

```
E:\gaoyang\
  loop_web/                          ← 现有前端项目
    .env                             ← 环境变量
    src/
      pages/etl-process/             ← 知识核准页面（已就绪）
      pages/etl-upload/              ← 文档上传页面（已就绪）
      services/etlProcess.ts         ← API 调用
      models/etlProcess.ts           ← 数据模型
    package.json

  gaoyang-study/                     ← 学习课件项目
    STUDY-PLAN.md                    ← 学习计划 v3.0
    NOTES.md                         ← 学习笔记
    projects/
      knowledge-vault/
        DESIGN.md                    ← 产品设计
        PIPELINE-DESIGN.md           ← 流水线设计
        ENVIRONMENT.md               ← 本文件

  knowledge-vault-backend/           ← 新建：Python 后端
    venv/                            ← Python 虚拟环境
    requirements.txt                 ← Python 依赖
    .env                             ← 环境变量（软链或复制）
    config.py                        ← 配置读取
    main.py                          ← FastAPI 入口
    agents/                          ← Agent 模块
      extraction_agent.py            ← 知识打标 Agent
      disambiguation_agent.py        ← 别名消歧 Agent
      review_agent.py                ← 审核辅助 Agent
      qa_agent.py                    ← 出题判分 Agent
    models/                          ← Pydantic 数据模型
      entity.py
      relation.py
      graph.py
      task.py
    services/                        ← 业务逻辑
      document_service.py            ← 文档解析
      chunking_service.py            ← 分段
      extraction_service.py          ← 知识提取
      graph_service.py               ← 图谱构建
    api/                             ← FastAPI 路由
      upload.py                      ← 文件上传
      extraction.py                  ← 知识打标
      alias.py                       ← 别名确认
      review.py                      ← 内容确认
      graph.py                       ← 图谱构建 + 展示
      qa.py                          ← 知识问答
      audit.py                       ← 图谱审核
    db/                              ← 数据库
      sqlite_client.py               ← SQLite 操作
      lancedb_client.py              ← LanceDB 操作
      migrations/                    ← 建表 SQL
    data/                            ← 数据目录
      knowledge_vault.db             ← SQLite 数据库
    .lancedb/                        ← LanceDB 数据
```

---

## 八、快速启动（最终目标）

```powershell
# ============================================================
# 启动所有服务（Week 16 最终状态）
# ============================================================

# 1. 启动 Python 后端
cd E:\gaoyang\knowledge-vault-backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --port 8000 --reload

# 2. 启动 Next.js 前端
cd E:\gaoyang\loop_web
npm run dev

# 3. 访问
# 前端：http://localhost:3000
# Python API 文档：http://localhost:8000/docs
# Next.js API：http://localhost:3000/api
```

---

## 九、检查清单

一步一步来，做完一项勾一项：

### 基础环境
- [ ] Python 3.11+ 已安装
- [ ] Node.js 18+ 已安装
- [ ] Git 已安装
- [ ] VS Code 已安装

### Python 环境
- [ ] 虚拟环境已创建并激活
- [ ] requirements.txt 依赖已安装
- [ ] 所有 import 验证通过

### Node.js 环境
- [ ] npm install 完成
- [ ] npm run dev 能启动

### 配置
- [ ] .env 文件已创建
- [ ] API_KEY 已填入真实 key
- [ ] BASE_URL 已配置
- [ ] 多模型变量已配置

### 数据库
- [ ] SQLite 可用
- [ ] LanceDB 可用
- [ ] Neo4j / networkx 可用（按需）

### 验证
- [ ] Python API 能启动（`uvicorn main:app`）
- [ ] 前端能访问（`http://localhost:3000`）
- [ ] 前端能调通 Python API

---

*创建日期：2026-07-23 · 版本：v1.0*