#!/usr/bin/env bash
# 更新实例：合并上游 → 重建镜像 → 重启（迁移由容器启动命令自动执行）
set -euo pipefail

cd "$(dirname "$0")/.."

if git remote get-url upstream >/dev/null 2>&1; then
	echo "==> git fetch upstream"
	git fetch upstream
	echo "==> git merge upstream/develop"
	git merge "upstream/develop" --no-edit || {
		echo "合并有冲突，请手动解决后重新运行本脚本" >&2
		exit 1
	}
else
	echo "(没有 upstream remote，跳过上游合并。可执行: git remote add upstream https://github.com/misskey-dev/misskey.git)" >&2
fi

bash deploy/gen-config.sh

echo "==> build + restart"
docker compose -f deploy/docker-compose.prod.yml up -d --build

echo "==> 等待健康检查"
sleep 10
docker compose -f deploy/docker-compose.prod.yml ps
