#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 iwashi
# SPDX-License-Identifier: AGPL-3.0-only
#
# 根域名 iwashi.rip 开关：公开 / 私密 / 下线 / 跳转
# 原理：Caddyfile 的 apex 站点块 import /data/apex-mode.caddy，
#       本脚本改写该片段后热重载 Caddy（不中断 mk.iwashi.rip 的连接）。

set -euo pipefail
cd "$(dirname "$0")"

MODE_FILE="data/caddy/apex-mode.caddy"
CADDY="misskey-caddy-1"

usage() {
	cat <<'EOF'
用法: ./apex.sh <模式> [参数]

  public              公开：任何人访问 iwashi.rip 都能看到首页
  private <密码>      私密：需输入密码（HTTP Basic Auth，用户名 iwashi）
  offline [提示语]    下线：返回 503「维护中」，站点内容不提供
  redirect            整个根域名 301 到 Misskey 站
  status              查看当前模式 + 线上探测
  validate            仅校验 Caddy 配置，不生效

示例:
  ./apex.sh private 'YourPassword'
  ./apex.sh public
  ./apex.sh offline '正在更新内容，稍后回来'
EOF
}

reload_caddy() {
	docker exec "$CADDY" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
	docker exec "$CADDY" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
}

ensure_mode_file() {
	mkdir -p "$(dirname "$MODE_FILE")"
	if [ ! -f "$MODE_FILE" ]; then
		printf 'file_server\n' > "$MODE_FILE"
	fi
}

case "${1:-status}" in
	public)
		printf 'file_server\n' > "$MODE_FILE"
		reload_caddy
		echo "OK: 已切换为「公开」"
		;;
	private)
		pw="${2:-}"
		if [ -z "$pw" ]; then
			echo "错误: 私密模式需要密码，例如 ./apex.sh private 'YourPassword'"
			exit 1
		fi
		hash="$(docker exec "$CADDY" caddy hash-password --plaintext "$pw" | tr -d '\r')"
		printf 'basic_auth {\n\tiwashi %s\n}\nfile_server\n' "$hash" > "$MODE_FILE"
		reload_caddy
		echo "OK: 已切换为「私密」（用户名 iwashi）"
		;;
	offline)
		msg="${2:-维护中，稍后回来。}"
		printf 'respond "%s" 503\n' "$msg" > "$MODE_FILE"
		reload_caddy
		echo "OK: 已切换为「下线」（503）"
		;;
	redirect)
		printf 'redir https://mk.iwashi.rip{uri} permanent\n' > "$MODE_FILE"
		reload_caddy
		echo "OK: 已切换为「跳转到 mk.iwashi.rip」"
		;;
	validate)
		docker exec "$CADDY" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
		;;
	status)
		ensure_mode_file
		echo "当前模式片段 ($MODE_FILE):"
		sed 's/^/    /' "$MODE_FILE"
		echo
		echo "线上探测:"
		curl -sS -o /dev/null -w '    https://iwashi.rip/          -> %{http_code}\n' https://iwashi.rip/ || true
		curl -sS -o /dev/null -w '    https://iwashi.rip/index.html -> %{http_code}\n' https://iwashi.rip/index.html || true
		;;
	*)
		usage
		;;
esac
