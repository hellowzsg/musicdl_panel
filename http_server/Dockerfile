
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
# 阶段2: 编译 Python 依赖（含编译工具链，仅用于构建）
# ============================================================
FROM python:3.12-slim AS python-builder

# 安装编译所需的系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libffi-dev \
    libxml2-dev \
    libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 拷贝 musicdl 核心库
COPY musicdl/ /app/musicdl/

# 拷贝 http_server 的依赖文件
COPY http_server/requirements.txt /app/http_server/requirements.txt

# 将所有依赖安装到独立目录，方便后续拷贝
RUN pip install --no-cache-dir --prefix=/install -r /app/http_server/requirements.txt \
    && cd /app/musicdl && pip install --no-cache-dir --prefix=/install .


# ============================================================
# 阶段3: 精简运行时镜像（不包含编译工具链）
# ============================================================
FROM python:3.12-slim AS runtime

# 仅安装运行时需要的系统库（不安装 gcc/g++ 等编译工具）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libffi8 \
    libxml2 \
    libxslt1.1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 从构建阶段拷贝已编译好的 Python 依赖
COPY --from=python-builder /install /usr/local

# 拷贝 http_server 后端代码（整目录拷贝，新增文件无需修改 Dockerfile）
# .dockerignore 已排除 node_modules 和 static，此处再清理阶段3不需要的内容
COPY http_server/ /app/http_server/
RUN rm -rf /app/http_server/frontend /app/http_server/Dockerfile /app/http_server/requirements.txt

# 从第一阶段拷贝前端构建产物
COPY --from=frontend-builder /build/static/dist/ /app/http_server/static/dist/

# 创建工作目录（用于存放下载文件和任务记录）
RUN mkdir -p /app/workdir

# 环境变量（可在 docker-compose.yaml 中通过 environment 覆盖）
ENV MUSICDL_WORK_DIR=/app/workdir
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8866
ENV SERVER_DEBUG=""
ENV LOCAL_ONLY=""
ENV ALLOWED_IPS=""
ENV PYTHONUNBUFFERED=1

# 暴露端口
EXPOSE 8866

# 启动服务（使用 shell 形式，让环境变量在运行时解析）
WORKDIR /app/http_server
CMD python server.py --host ${SERVER_HOST} --port ${SERVER_PORT} ${SERVER_DEBUG} --work-dir ${MUSICDL_WORK_DIR}
