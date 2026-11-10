#!/usr/bin/env bash
# VPS 系统初始化（幂等，可反复执行，不会因为重复运行出错）
# 用法：bash vps-init.sh            或  bash vps-init.sh 2>&1 | tee /root/vps-init.log
#
# 注意：本脚本先放行 22 端口再启用 ufw，不会把你锁在门外。
# 不包含 apt upgrade（可选且耗时长，需要时单独执行）。

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

echo "==> [1/4] apt update + 基础工具"
apt-get update -y
apt-get install -y curl git ca-certificates ufw

echo "==> [2/4] 防火墙（先放行，再启用）"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

echo "==> [3/4] swap（已挂载则跳过）"
if ! swapon --show | grep -q '/swapfile'; then
	if ! fallocate -l 4G /swapfile 2>/dev/null; then
		dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
	fi
	chmod 600 /swapfile
	mkswap /swapfile
	swapon /swapfile
	grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
	grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
	sysctl -q -p
else
	echo "swap 已存在，跳过"
fi
swapon --show

echo "==> [4/4] Docker（已安装则跳过）"
if ! command -v docker >/dev/null 2>&1; then
	curl -fsSL https://get.docker.com | sh
fi
docker --version
docker compose version || docker compose -v || true

echo
echo "==> 初始化完成。下一步："
echo "    git clone https://github.com/misskey-dev/misskey.git /srv/misskey"
echo "    cd /srv/misskey && MISSKEY_HOST=iwashi.rip ACME_EMAIL=你的邮箱 bash deploy/bootstrap.sh"
