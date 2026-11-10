#!/usr/bin/env bash
# 从 deploy/.env 生成 .config/default.yml（幂等，重复执行覆盖）
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f deploy/.env ]]; then
	echo "缺少 deploy/.env，先执行: cp deploy/.env.example deploy/.env 并填写" >&2
	exit 1
fi

set -a
# shellcheck disable=SC1091
source deploy/.env
set +a

if [[ -z "${MISSKEY_HOST:-}" || "${MISSKEY_HOST}" == "mi.example.com" ]]; then
	echo "deploy/.env 里的 MISSKEY_HOST 还是占位值，请改成你的真实域名" >&2
	exit 1
fi

mkdir -p .config

cat > .config/default.yml <<EOF
# 由 deploy/gen-config.sh 生成；要改配置请改 deploy/.env 后重新生成
url: https://${MISSKEY_HOST}/
port: 3000

db:
  host: db
  port: 5432
  db: ${POSTGRES_DB}
  user: ${POSTGRES_USER}
  pass: ${POSTGRES_PASSWORD}

redis:
  host: redis
  port: 6379

id: 'aidx'

# 位于 Caddy 反向代理之后
trustProxy: true
EOF

echo "已生成 .config/default.yml (url=https://${MISSKEY_HOST}/)"
