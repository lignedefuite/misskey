#!/usr/bin/env bash
# 首次部署前执行一次：创建数据目录并把上传目录交给容器内的 misskey 用户(uid 991)
# 重复执行是安全的。
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p files deploy/data/db deploy/data/redis deploy/data/caddy

# Misskey 容器内以 uid/gid 991 的非 root 用户运行，宿主机目录必须可写
chown -R 991:991 files
chmod 755 files

echo "目录已就绪:"
ls -ld files deploy/data
