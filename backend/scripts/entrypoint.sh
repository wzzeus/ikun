#!/usr/bin/env bash
set -euo pipefail

AUTO_MIGRATE="${AUTO_MIGRATE:-true}"

if [ "$AUTO_MIGRATE" = "true" ]; then
  echo "[entrypoint] 开始自动数据库迁移"
  /app/scripts/run_migrations.sh
  echo "[entrypoint] 数据库迁移完成"
else
  echo "[entrypoint] AUTO_MIGRATE=false，跳过数据库迁移"
fi

exec "$@"
