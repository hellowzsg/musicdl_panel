
# 🎵 MusicDL Panel

一站式音乐搜索与下载的 Web 服务，基于 [musicdl](https://github.com/hellowzsg/musicdl) 核心库构建，提供美观的 Web 界面和完整的 RESTful API。

## ✨ 功能特性

- 🔍 **多源聚合搜索** — 支持 40+ 音乐源并发搜索（QQ 音乐、网易云、酷狗、酷我、咪咕、Spotify、YouTube 等）
- ⬇️ **一键下载** — 支持 HTTP 直链和 HLS 流下载，自动补全音频标签和歌词
- 📋 **歌单解析** — 支持解析各平台歌单链接，批量下载
- 📝 **歌词搜索** — 独立的歌词搜索接口
- 🖥️ **Web 管理面板** — 基于 Vue 3 + TDesign 的现代化前端界面
- 🔌 **RESTful API** — 完整的 HTTP API，支持同步/异步任务模式
- 📦 **任务管理** — 异步任务队列，支持状态查询、文件管理
- 🐳 **Docker 一键部署** — 多阶段构建镜像，开箱即用

## 🏗️ 技术架构

```
music/
├── musicdl/              # 核心库（Git Submodule，40+ 音乐源客户端）
├── http_server/
│   ├── server.py         # Flask HTTP 服务主入口
│   ├── api_handler.py    # API 业务逻辑处理层（与路由解耦）
│   ├── Dockerfile        # 多阶段构建（Node 构建前端 + Python 运行时）
│   ├── frontend/         # Vue 3 + Vite + TDesign 前端项目
│   │   └── src/
│   ├── templates/        # API 文档页面
│   └── static/dist/      # 前端构建产物
├── docker-compose.yaml   # Docker Compose 编排
└── workdir/              # 运行时工作目录（下载文件 + 任务记录）
```

**后端**: Python 3.12 + Flask + musicdl  
**前端**: Vue 3 + Vite + Pinia + TDesign  
**部署**: Docker 多阶段构建 + GitHub Actions CI/CD

## 🚀 快速开始

### 方式一：Docker Compose（推荐）

```bash
wget https://raw.githubusercontent.com/hellowzsg/musicdl_panel/refs/heads/master/docker-compose.yaml

# 一键启动
docker compose up -d

# 访问 http://localhost:58866
```

### 方式二：本地构建 Docker 镜像

如果你想自行修改代码后构建镜像，或在无法拉取预构建镜像时使用：

```bash
# 1. 克隆代码（含 musicdl submodule）
git clone --recurse-submodules https://github.com/hellowzsg/musicdl_panel.git
cd musicdl_panel

# 如果已克隆但 musicdl/ 目录为空，补拉 submodule
git submodule update --init --recursive

# 2. 构建镜像（在项目根目录执行，构建上下文必须为项目根目录）
docker build -f http_server/Dockerfile -t musicdl-panel .

# 3. 运行容器
docker run -d \
  --name musicdl-panel \
  -p 8866:8866 \
  -v ./workdir:/app/workdir \
  musicdl-panel

# 访问 http://localhost:8866
```

提供两个版本的 Dockerfile，可按需选择：

| 版本 | Dockerfile | 镜像体积 | 音乐源 | 说明 |
|------|-----------|---------|-------|------|
| **完整版** | `http_server/Dockerfile` | ~460MB | 42 个 | 全部功能，含 TIDAL / Apple / YouTube 等所有源 |
| **精简版** | `http_server/Dockerfile.tiny` | ~149MB | 39 个 | 移除 TIDAL / Apple Music / YouTube 及其重型依赖 |

构建精简版：

```bash
docker build -f http_server/Dockerfile.tiny -t musicdl-panel:tiny .
```

> **精简版说明**：仅移除 YouTube、TIDAL、Apple Music 三个源及其专属依赖（av/PyAV、aigpy、nodejs-wheel、ytmusicapi、pywidevine），同时不再需要安装系统级的 ffmpeg 和 nodejs。其余 39 个源完整保留。缺少依赖的源在服务启动时自动跳过并输出警告，不影响其他源正常使用。

### 方式三：本地开发运行

```bash
# 初始化 submodule
git submodule update --init --recursive

# 安装 Python 依赖
pip install -r http_server/requirements.txt
cd musicdl && pip install -e . && cd ..

# 构建前端（可选，不构建则无 Web 界面）
cd http_server/frontend
npm install && npm run build
cd ../..

# 启动服务
python http_server/server.py --port 8866 --work-dir ./workdir
```

## 🔧 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `SERVER_HOST` | `0.0.0.0` | 监听地址 |
| `SERVER_PORT` | `8866` | 监听端口 |
| `SERVER_DEBUG` | _(空)_ | 调试模式（设为 `--debug` 开启） |
| `MUSICDL_WORK_DIR` | `/app/workdir` | 工作目录（下载文件和任务记录存放位置） |
| `LOCAL_ONLY` | _(空)_ | 仅允许本地/内网访问（设为 `true` 开启） |
| `ALLOWED_IPS` | _(空)_ | 额外 IP 白名单（逗号分隔，支持 CIDR，如 `192.168.1.0/24`） |

## 📡 API 接口

启动服务后访问 `http://localhost:58866/api/docs` 查看完整的交互式 API 文档。

### 核心接口一览

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/sources` | 获取所有已注册音乐源列表 |
| `POST` | `/api/search` | 搜索音乐（同步） |
| `POST` | `/api/search/async` | 搜索音乐（异步任务） |
| `POST` | `/api/download` | 下载音乐（异步任务） |
| `POST` | `/api/search_and_download` | 搜索并自动下载 |
| `POST` | `/api/playlist/parse` | 解析歌单 |
| `POST` | `/api/playlist/download` | 解析歌单并下载 |
| `POST` | `/api/lyrics/search` | 搜索歌词 |
| `GET` | `/api/tasks/<task_id>` | 查询任务状态 |
| `GET` | `/api/tasks` | 获取任务列表 |
| `DELETE` | `/api/tasks/<task_id>` | 删除任务 |
| `GET` | `/api/files/list` | 列出已下载文件 |
| `GET` | `/api/files/download?path=...` | 下载文件 |
| `DELETE` | `/api/files/delete` | 删除文件 |
| `GET` | `/api/health` | 健康检查 |

### 搜索示例

```bash
curl -X POST http://localhost:58866/api/search \
  -H "Content-Type: application/json" \
  -d '{"keyword": "周杰伦 稻香"}'
```

## 📁 数据持久化

通过 Docker Volume 挂载 `./workdir` 目录，包含：

- `workdir/musicdl_outputs/` — 按音乐源分目录存放下载的音频文件和歌词
- `workdir/tasks/` — 异步任务记录（JSON 文件持久化，服务重启后自动恢复）

## 📄 License

本项目基于 [musicdl](https://github.com/hellowzsg/musicdl) 核心库，遵循其开源许可协议。
