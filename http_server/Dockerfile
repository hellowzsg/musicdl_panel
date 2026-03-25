
# ============================================================
# 阶段1: 构建前端（Vue 3 + Vite）
# ============================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# 先拷贝依赖描述文件，利用 Docker 缓存层
# 注意：构建上下文为项目根目录，需要使用 http_server/frontend/ 前缀
COPY http_server/frontend/package.json http_server/frontend/package-lock.json ./

# 安装前端依赖
RUN npm ci

# 拷贝前端源码
COPY http_server/frontend/ ./

# 构建前端产物（输出到 ../static/dist，即 /build/static/dist）
RUN npm run build


# ============================================================
# 阶段2: Python 运行环境
# ============================================================
FROM python:3.12-slim AS runtime

# 安装系统级依赖（部分 Python 包编译需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libffi-dev \
    libxml2-dev \
    libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先拷贝并安装 musicdl 核心库
COPY musicdl/ /app/musicdl/

# 拷贝 http_server 的依赖文件并安装
COPY http_server/requirements.txt /app/http_server/requirements.txt
RUN pip install --no-cache-dir -r /app/http_server/requirements.txt

# 以可编辑模式安装 musicdl（使其可被 import）
RUN cd /app/musicdl && pip install --no-cache-dir -e .

# 拷贝 http_server 后端代码
COPY http_server/server.py /app/http_server/
COPY http_server/api_handler.py /app/http_server/
COPY http_server/templates/ /app/http_server/templates/

# 从第一阶段拷贝前端构建产物
COPY --from=frontend-builder /build/static/dist/ /app/http_server/static/dist/

# 创建工作目录（用于存放下载文件和任务记录）
RUN mkdir -p /app/workdir

# 环境变量（可在 docker-compose.yaml 中通过 environment 覆盖）
ENV MUSICDL_WORK_DIR=/app/workdir
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8866
ENV SERVER_DEBUG=""
ENV PYTHONUNBUFFERED=1

# 暴露端口
EXPOSE 8866

# 启动服务（使用 shell 形式，让环境变量在运行时解析）
WORKDIR /app/http_server
CMD python server.py --host ${SERVER_HOST} --port ${SERVER_PORT} ${SERVER_DEBUG} --work-dir ${MUSICDL_WORK_DIR}
