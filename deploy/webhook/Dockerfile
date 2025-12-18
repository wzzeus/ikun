FROM python:3.11-slim

WORKDIR /webhook

# 安装依赖
RUN pip install --no-cache-dir flask gunicorn

# 安装 docker cli（用于执行部署命令）
RUN apt-get update && apt-get install -y \
    curl \
    git \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# 复制应用
COPY app.py .
COPY deploy.sh .
RUN chmod +x deploy.sh

# 创建日志目录
RUN mkdir -p /webhook/logs

EXPOSE 9000

CMD ["gunicorn", "--bind", "0.0.0.0:9000", "--workers", "1", "--timeout", "120", "app:app"]
