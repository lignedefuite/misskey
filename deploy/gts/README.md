# GoToSocial 部署（gts.iwashi.rip）

## 文件

| 文件 | 说明 |
|---|---|
| docker-compose.yml | GTS 容器，接入 Misskey 的 external 网络，由 Caddy 反代 |
| config.yaml | GTS 配置（host / sqlite / 联邦 blocklist） |
| backup.sh | 备份 data + config（先停容器保证 SQLite 一致） |

## 部署步骤（服务器上）

~~~bash
mkdir -p /srv/gts
# 把这三个文件放到 /srv/gts/
cd /srv/gts
docker compose up -d
docker compose logs -f --tail 50 gotosocial
~~~

## Caddy 需要在 /srv/misskey/deploy/Caddyfile 里加：

~~~caddyfile
gts.iwashi.rip {
	encode zstd gzip
	reverse_proxy gts:8080 {
		transport http {
			read_timeout 360s
		}
	}
	header {
		-Server
	}
}
~~~

然后 ~~~bash docker compose -f /srv/misskey/deploy/docker-compose.prod.yml restart caddy ~~~

## 创建第一个账号

~~~bash
docker compose exec gotosocial /gotosocial/gotosocial admin account create --username=你的名字 --email=你的邮箱 --password='强密码'
docker compose exec gotosocial /gotosocial/gotosocial admin account confirm --username=你的名字
~~~

## 客户端

GTS 没有完整 Web 客户端，用 Mastodon 客户端连接（Tusky / Phanpy / Elk），登录地址填 https://gts.iwashi.rip
