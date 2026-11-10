# 部署到 VPS —— 个人 Misskey 实例

这套文件让"拿到 VPS 和域名之后"只剩几条命令。核心特点：

- 用**你自己的 fork** 构建镜像（改过的代码就是线上跑的代码）
- **Caddy** 自动申请并续期 Let's Encrypt 证书，自动 HTTP→HTTPS
- 只有 80/443 对外，数据库/Redis/Misskey 都在 Docker 内网
- 数据库、Redis、上传文件都是绑定挂载，备份 = 打包几个目录

---

## 0. 需要准备的东西

| 项目 | 要求 |
|---|---|
| VPS | **2 vCPU / 4GB RAM / 40GB SSD**，Ubuntu 24.04 LTS；建议海外机房（日本、新加坡、美西、欧洲） |
| 域名 | 一个子域，例如 $mi.example.com$；A 记录指向 VPS 的 IPv4（有 IPv6 再加 AAAA） |
| 访问方式 | SSH 密钥登录（root 或 sudo 用户） |

为什么是 4GB：$docker build$ 里前端编译 + pnpm 安装的内存峰值约 2–3GB，2GB 机器会 OOM（也可用 2GB swap 兜底）。

为什么建议海外：中国大陆机房需要 ICP 备案；而且部分机房对 80/443 出站、以及联邦流量不友好。

---

## 1. 服务器初始化（Ubuntu 24.04）

~~~bash
apt update && apt upgrade -y
apt install -y git curl ca-certificates ufw

# Docker（官方脚本）
curl -fsSL https://get.docker.com | sh

# 防火墙：只开 SSH / HTTP / HTTPS
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 2GB swap（4GB 内存可跳过；2GB 机器必做）
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
~~~

验证 DNS 已生效（必须能查到你的 VPS IP，否则申请证书会失败）：

~~~bash
dig +short mi.example.com
~~~

---

## 2. 拉取你的 fork

~~~bash
git clone https://github.com/<你的账号>/misskey.git /srv/misskey
cd /srv/misskey
git remote add upstream https://github.com/misskey-dev/misskey.git
git checkout develop
~~~

（如果还没建 fork，先在 GitHub 上 fork $misskey-dev/misskey$，再把上面的地址换成你的 fork。）

---

## 3. 填配置

~~~bash
cd /srv/misskey
cp deploy/.env.example deploy/.env
~~~

编辑 $deploy/.env$，三件事：

~~~ini
MISSKEY_HOST=mi.example.com          # 你的域名，不带 https://
ACME_EMAIL=you@example.com           # 证书到期通知邮箱
POSTGRES_PASSWORD=<openssl rand -hex 24 的输出>
~~~

生成 Misskey 运行配置（$.config/default.yml$ 已被 git 忽略，不会泄漏密码）：

~~~bash
bash deploy/gen-config.sh
~~~

---

## 4. 启动

先执行一次目录准备（把上传目录交给容器内的 misskey 用户 uid 991，否则上传会 permission denied）：

~~~bash
sudo bash deploy/prepare.sh
~~~

想一条命令走完（生成 .env 随机密码 → 配置 → 目录 → 构建 → 启动 → 等健康）：

~~~bash
MISSKEY_HOST=mi.example.com ACME_EMAIL=you@example.com bash deploy/bootstrap.sh
~~~

或者手动分步：

~~~bash
docker compose -f deploy/docker-compose.prod.yml up -d --build
~~~

首次会拉基础镜像并编译整个 Misskey，**10–25 分钟**。之后：

~~~bash
docker compose -f deploy/docker-compose.prod.yml ps
docker compose -f deploy/docker-compose.prod.yml logs -f web     # 迁移与启动日志
docker compose -f deploy/docker-compose.prod.yml logs -f caddy   # 证书申请日志
~~~

看到证书签发成功、web 容器 healthy 后，浏览器打开：

    https://mi.example.com

---

## 5. 首次登录后必做的三件事

1. **第一个注册的账号自动成为管理员**，注册完立刻去 控制面板 → 关闭注册。
2. **联邦默认关闭**（后端 Meta 默认 $federation: 'none'$）。控制面板 → 联邦 里三选一：
   - $none$：完全不与外界通信，最省心，适合"只给自己看"
   - $specified$：只和白名单实例互相通信（在 $federationHosts$ 填域名），个人推荐起步值
   - $all$：全联邦，会收到陌生实例内容与举报，需要你自己处理
3. 设置实例名称/描述/图标，并在 控制面板 → 填上你 fork 的 **Repository URL**（AGPLv3 要求）。

可选：邮件（密码重置/通知）在控制面板配 SMTP；对象存储（S3/R2）也在控制面板启用，个人用量一般用本地 $files$ 目录就够。

---

## 6. 备份（强烈建议）

~~~bash
bash deploy/backup.sh          # 先手动跑一次，确认产物正常

crontab -e                     # 每天 04:00 自动备份，保留 14 天
# 0 4 * * * cd /srv/misskey && bash deploy/backup.sh >> deploy/data/backup.log 2>&1
~~~

产物在 $deploy/data/backup/$：$db-*.sql.gz$（数据库）+ $files-*.tar.gz$（上传文件与配置）。
**定期拉回本地或同步到对象存储**，服务器挂掉才算真有备份。

恢复：

~~~bash
gunzip -c db-YYYYMMDD-HHMMSS.sql.gz | docker compose -f deploy/docker-compose.prod.yml exec -T db psql -U misskey misskey
tar xzf files-YYYYMMDD-HHMMSS.tar.gz -C /srv/misskey
~~~

---

## 7. 更新（带上你的改动 + 跟上上游）

~~~bash
cd /srv/misskey
bash deploy/update.sh
~~~

流程：$git fetch upstream$ → 合并 $upstream/develop$（冲突会停下）→ 重新生成配置 → 重建镜像并重启。数据库迁移由容器启动命令自动执行。

想更稳就把 $develop$ 换成上游 stable（$git merge upstream/master$），beta 偶尔有坑。

---

## 8. 常见问题

**构建被 OOM kill**
加 swap（第 1 步），或在本地构建后传镜像：

~~~bash
docker build -t misskey-personal:local .
docker save misskey-personal:local | gzip > mk.tar.gz
# 上传到 VPS 后：
gunzip -c mk.tar.gz | docker load
docker compose -f deploy/docker-compose.prod.yml up -d      # 不加 --build
~~~

**证书申请失败**
$dig +short 你的域名$ 是否指向本机 IP；$ss -lntp | grep :80$ 看 80 是否被占；云厂商安全组是否也放行了 80/443（ufw 之外还有一层）。

**Docker Hub 拉取超时**
国内机器常见。换镜像加速器（$/etc/docker/daemon.json$ 加 $registry-mirrors$），或用上面的"本地构建再传镜像"。

**访问 502 / web 起不来**
$docker compose -f deploy/docker-compose.prod.yml logs --tail 100 web$。常见原因是 $.config/default.yml$ 的数据库密码和 $deploy/.env$ 不一致（改过 .env 要重跑 $gen-config.sh$ 再 $up -d$）。

**上传大文件失败**
Caddyfile 里是 $max_size 300MB$，Misskey 默认 $maxFileSize$ 是 250MB，两个都要改；还要注意云厂商/CDN 的单请求大小限制。
