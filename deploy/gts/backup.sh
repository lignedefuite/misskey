#!/usr/bin/env bash
# GoToSocial 备份（SQLite + 媒体文件）。建议 cron：
#   30 4 * * * cd /srv/gts && bash backup.sh >> backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")"

STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p backups

echo "[$STAMP] 停止 GTS 以保证 SQLite 一致性"
docker compose stop gotosocial

echo "[$STAMP] 打包 data + config"
tar czf "backups/gts-$STAMP.tar.gz" data config.yaml

echo "[$STAMP] 启动 GTS"
docker compose start gotosocial

# 保留最近 14 天
find backups -name 'gts-*.tar.gz' -mtime +14 -delete
echo "[$STAMP] 完成:"
ls -lh backups | tail -n 3
