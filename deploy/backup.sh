#!/usr/bin/env bash
# 备份：数据库 + 上传文件 + 配置。建议 cron 每天跑一次。
#   0 4 * * *  cd /srv/misskey && bash deploy/backup.sh >> deploy/data/backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p deploy/data/backup

set -a
# shellcheck disable=SC1091
source deploy/.env
set +a

STAMP=$(date +%Y%m%d-%H%M%S)
COMPOSE="docker compose -f deploy/docker-compose.prod.yml"

echo "[$STAMP] dumping database..."
$COMPOSE exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "deploy/data/backup/db-$STAMP.sql.gz"

echo "[$STAMP] archiving files + config..."
tar czf "deploy/data/backup/files-$STAMP.tar.gz" -C . files .config 2>/dev/null

# 只保留最近 14 天
find deploy/data/backup -name 'db-*.sql.gz' -mtime +14 -delete
find deploy/data/backup -name 'files-*.tar.gz' -mtime +14 -delete

echo "[$STAMP] done:"
ls -lh deploy/data/backup | tail -n 5
