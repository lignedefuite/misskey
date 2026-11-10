#!/usr/bin/env bash
# 一键部署（在 VPS 上的仓库根目录执行）：
#   MISSKEY_HOST=iwashi.rip ACME_EMAIL=you@example.com bash deploy/bootstrap.sh
#
# 做的事：生成 deploy/.env（随机数据库密码）→ 生成 .config/default.yml →
#         准备目录权限 → 构建镜像并启动 → 等健康检查
set -euo pipefail

cd "$(dirname "$0")/.."

HOST="${MISSKEY_HOST:-}"
EMAIL="${ACME_EMAIL:-}"

if [[ -z "$HOST" ]]; then
	echo "用法: MISSKEY_HOST=你的域名 ACME_EMAIL=你的邮箱 bash deploy/bootstrap.sh" >&2
	exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
	echo "没装 Docker，先执行: curl -fsSL https://get.docker.com | sh" >&2
	exit 1
fi

if [[ ! -f deploy/.env ]]; then
	if command -v openssl >/dev/null 2>&1; then
		PASS="$(openssl rand -hex 24)"
	else
		PASS="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 48)"
	fi
	cat > deploy/.env <<EOF
MISSKEY_HOST=$HOST
ACME_EMAIL=$EMAIL
POSTGRES_USER=misskey
POSTGRES_PASSWORD=$PASS
POSTGRES_DB=misskey
EOF
	chmod 600 deploy/.env
	echo "==> 已生成 deploy/.env（数据库密码为随机值）"
else
	echo "==> 复用已有的 deploy/.env"
fi

bash deploy/gen-config.sh
bash deploy/prepare.sh

echo "==> 构建并启动（首次约 10-25 分钟，取决于机器和网络）"
docker compose -f deploy/docker-compose.prod.yml up -d --build

echo "==> 等待 web 容器健康"
for i in $(seq 1 60); do
	STATE="$(docker compose -f deploy/docker-compose.prod.yml ps --format '{{.Health}}' 2>/dev/null | sort -u | tr -d '\n')"
	if [[ "$STATE" == *healthy* ]]; then
		echo "==> web 已健康"
		break
	fi
	sleep 5
done

docker compose -f deploy/docker-compose.prod.yml ps
echo
echo "下一步：浏览器打开 https://$HOST 完成管理员初始化（setup 页）。"
