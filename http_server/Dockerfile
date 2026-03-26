# ============================================================
#  Dockerfile — 完整版（Full）
#  包含全部 42 个音乐源，支持 TIDAL/Apple/YouTube/Deezer 等
#  镜像体积 ~460MB
# ============================================================

# ── Stage 1: 前端构建 ──
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend
COPY http_server/frontend/package.json http_server/frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY http_server/frontend/ ./
RUN npm run build

# ── Stage 2: Python 依赖编译 ──
FROM python:3.12-alpine AS python-builder

RUN apk add --no-cache \
        gcc g++ musl-dev libffi-dev curl-dev openssl-dev

WORKDIR /build

COPY musicdl/ /build/musicdl/
RUN pip install --no-cache-dir --prefix=/install /build/musicdl/ \
    && pip install --no-cache-dir --prefix=/install pycryptodomex

COPY http_server/requirements.txt /build/
RUN pip install --no-cache-dir --prefix=/install -r /build/requirements.txt

# 瘦身
RUN set -eux; \
    SITE=/install/lib/python3.12/site-packages; \
    # nodejs-wheel 内嵌 Node.js 二进制（~120MB），容器内用系统 nodejs 替代
    rm -rf "$SITE"/nodejs_wheel/bin \
           "$SITE"/nodejs_wheel/include \
           "$SITE"/nodejs_wheel/lib \
           "$SITE"/nodejs_wheel/share; \
    mkdir -p "$SITE"/nodejs_wheel/bin; \
    # pip / setuptools 运行时不需要
    rm -rf "$SITE"/pip "$SITE"/pip-*.dist-info \
           "$SITE"/setuptools "$SITE"/setuptools-*.dist-info; \
    # 清理 __pycache__
    find /install -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true; \
    find /install -name '*.pyc' -delete 2>/dev/null || true; \
    find /install -path '*.dist-info/RECORD' -delete 2>/dev/null || true

# ── Stage 3: 运行时镜像 ──
FROM python:3.12-alpine

RUN apk add --no-cache \
        libcurl \
        ffmpeg \
        nodejs \
        tini \
    && mkdir -p /app/workdir

COPY --from=python-builder /install /usr/local

# 符号链接：让 nodejs_wheel 找到系统 node
RUN ln -sf /usr/bin/node \
    "$(python -c 'import nodejs_wheel.executable; print(nodejs_wheel.executable.ROOT_DIR)')/bin/node"

WORKDIR /app
COPY http_server/server.py http_server/api_handler.py ./
COPY http_server/templates/ ./templates/
COPY --from=frontend-builder /build/static/dist/ ./static/dist/

ENV PYTHONUNBUFFERED=1 \
    MUSICDL_WORK_DIR=/app/workdir

EXPOSE 8866
VOLUME ["/app/workdir"]

ENTRYPOINT ["tini", "--"]
CMD ["python", "server.py", "--host", "0.0.0.0", "--port", "8866"]
