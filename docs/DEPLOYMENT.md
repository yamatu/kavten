# 部署与回滚

面向 kavten.com 的上线流程。所有命令在仓库根目录执行。

## 0. 前置

- Docker / Docker Compose v2
- 域名 `kavten.com`（apex 为规范域名，`www` 只做 301 跳转）
- 一份能签 TLS 证书的环境（acme.sh / certbot / 前置 CDN 均可）

> 规范域名由 `SITE_URL` 决定，页面 `<link rel="canonical">`、`og:url`、`sitemap.xml`、
> `robots.txt` 的 `Sitemap:` 行全部从它派生。改域名只改 `SITE_URL` 与
> `NEXT_PUBLIC_SITE_URL`（两者必须一致），不要在代码里散改。

## 1. 配置 .env

```bash
cp .env.docker.example .env
# 逐项填写：MySQL 密码、JWT_SECRET、REVALIDATE_SECRET、SETTINGS_ENCRYPTION_KEY、SITE_URL…
bash scripts/preflight-env.sh .env          # 生产模式，有 ERROR 就不要上线
chmod 600 .env
```

`preflight-env.sh` 会拦下：占位密码、过短密钥、`JWT_SECRET` 与 `REVALIDATE_SECRET` 相同、
`SITE_URL` 指到 localhost / 用 www、`CORS_ORIGINS` 通配、缺失 `SETTINGS_ENCRYPTION_KEY`、
过短的默认管理员密码；并提示 `TRUSTED_PROXIES`、`DB_AUTO_MIGRATE`、`SEED_DEFAULT_ADMIN`
这类"能跑但会留坑"的设置。本地彩排可加 `--allow-local`，把上述阻断项降级为警告。

## 2. 构建与启动

```bash
docker compose build
docker compose up -d
docker compose ps                     # mysql 必须 healthy，frontend/backend Up
curl -s http://127.0.0.1:8080/health  # 后端
curl -sI http://127.0.0.1:3000/ | head -1
```

首次启动后立刻把 `SEED_DEFAULT_ADMIN` 改回 `0`，否则每次重建都可能重置管理员。

## 3. 边缘层（二选一）

**A. 容器内 nginx（推荐，随 compose 部署）**

```bash
docker compose --profile internal-nginx up -d nginx   # 监听 ${NGINX_PORT:-3006}
```

配置在 `docker/nginx.conf`：`/api/` → backend，其余 → frontend，`www` → apex 301，
静态资源直通，`proxy_redirect off` 保证应用发出的 308 原样到达浏览器。

**B. 宿主机 nginx（TLS 在宿主机终结）**

把仓库根的 `nginx.conf` 装到 `/etc/nginx/nginx.conf`，按实际证书路径修改
`ssl_certificate`（默认 acme.sh 布局 `/root/.acme.sh/kavten.com_ecc/`），然后
`nginx -t && systemctl reload nginx`。

两套配置都刻意 **关闭 gzip**：压缩由应用负责（见第 7 节），边缘再压一次只会白耗 CPU，
还可能和上游的 `Content-Encoding` 打架。

## 3.1 生产实际拓扑（kavten.com）

宿主 `23.19.231.238` 上已经有别的站点占着 3000-3002 / 8080-8082，也已经有
`stream` 模块按 SNI 分流，所以 kavten 不抢 443：

```
Cloudflare (proxied, Full)
  └─ :443 stream --SNI--> 127.0.0.1:8444 (http TLS listener)
       └─ sites-enabled/kavten.com.conf
            └─ 127.0.0.1:3010  kavten_frontend (brotli 代理 :3000 -> next :3001)
            └─ /api/ -> 127.0.0.1:8090  kavten_backend
```

- 端口：`FRONTEND_PORT=3010`、`BACKEND_PORT=8090`、`NGINX_PORT=3006`（容器内 nginx 默认不开）
- vhost：`/etc/nginx/sites-enabled/kavten.com.conf` + `snippets/kavten-proxy.conf`
  （`proxy_set_header` 是数组指令，只要在 location 里设一个就得把全部重述一遍，所以抽成 snippet）
- `:80` 按 `$http_cf_connecting_ip` 分支：带了 CF 头就直接出页面（兼容 Flexible 模式，
  否则 CF→源站 http→301 https→CF 死循环），没带就 301 到 https
- 证书：`acme.sh --issue --dns dns_cf -d kavten.com -d www.kavten.com --keylength ec-256`，
  再用 `--install-cert --reloadcmd 'systemctl reload nginx'` 挂钩子，续期后自动 reload
- 上传路径 `/uploads/` 直出容器 30 天缓存，`/api/` 120r/m，`/api/v1/auth/login` 10r/m

## 3.2 踩过的坑：应用层重定向必须用站点 origin

Next standalone 启动时用自己的监听地址（`http://localhost:3001`）拼 `request.url`，
`x-forwarded-proto: https` 只会改协议、不会改主机名，于是 middleware 里所有
`request.nextUrl.clone()` / `new URL(path, request.url)` 生成的重定向都变成
`Location: https://localhost:3001/...`——真实浏览器和 Googlebot 都会失败。

- 重定向统一走 `publicRedirect()`（middleware.ts），它把 URL 重新锚到 `SITE_URL`
- 同理，middleware 里不要用绝对 URL 做 `rewrite`：那会让 Next 走 HTTP 代理去请求
  自己，配上 `https` 就是 `EPROTO: wrong version number` 的 500
  （`/sitemap-products/:page.xml` 因此改为纯 `next.config.ts` 的 `afterFiles` rewrite）

上线自检：

```bash
node scripts/verify_redirects.mjs https://kavten.com   # REDIRECT_CHECK_OK
```

## 4. DNS 与 TLS

| 记录 | 值 |
|---|---|
| `A kavten.com` | 服务器 IP |
| `A www.kavten.com` | 同一 IP（保留 301 能力） |

```bash
acme.sh --issue -d kavten.com -d www.kavten.com --webroot /var/www/acme
```

上线后自检（必须全部符合）：

```bash
curl -sI https://kavten.com/          | grep -iE '^HTTP|strict-transport'
curl -sI https://www.kavten.com/      | grep -iE '^HTTP|^location'   # 301 -> https://kavten.com/
curl -sI http://kavten.com/           | grep -iE '^HTTP|^location'   # 301 -> https://kavten.com/
```

## 5. 验收（不用等 DNS 也能做）

审计脚本支持 `AUDIT_HOST`：用 `Host:` 头模拟生产域名，canonical 就按生产地址比对。

```bash
AUDIT_HOST=kavten.com node scripts/audit_products_meta.mjs   # 1493 个商品页
AUDIT_HOST=kavten.com node scripts/audit_seo_live.mjs        # 静态页/分类/文章/商品抽样
```

基线（当前代码）：

- `statusNot200`、`titleTooLong/TooShort`、`duplicateTitle*`、`duplicateDesc*`、
  `noH1`、`noProductSchema`、`noBreadcrumb`、`ldBad`、`imgNoAlt`、`noindex` 全为 0
- `canonicalNotSelf` 为 0（带 `AUDIT_HOST` 时）
- `noReview` 等于在售商品数 —— 数据缺口，等真实评价，不是代码问题

其它必查项：

```bash
# brotli 生效（应用侧）
curl -s -o /dev/null -D - -H 'Accept-Encoding: br' https://kavten.com/products | grep -i content-encoding

# 旧商品 URL 单跳 308 到新 URL
node scripts/check_slug_redirects.mjs --all      # problems 必须为 0

# sitemap 全部 200
node scripts/check_sitemap_status.mjs
```

## 6. 搜索收录

> **不要去掉 `next.config.ts` 的 `htmlLimitedBots: /.*/`。** Next 15 对动态页默认把
> `<title>`/`<link rel="canonical">` 流式塞进 `<body>` 再由 React 提升到 `<head>`，而
> Google 只认 `<head>` 里的 canonical，Bing/Baidu/SEO 工具根本不跑提升脚本。设成匹配所有
> UA 后 metadata 改为阻塞输出，实测 TTFB 只增加几十毫秒。

1. Search Console 添加 `kavten.com`（DNS 验证最稳）。
2. 提交 `https://kavten.com/sitemap.xml`。
3. 对 `/products/`、`/categories/` 各点一次"请求重新抓取"——历史上改过名的商品 URL
   （`product_slug_history` 共 1630 条）会以 308 自动合并到新地址。
4. `robots.txt` 已由应用动态生成，私密路径（`/admin`、`/api/`、`/account`、`/cart`、
   `/checkout`、`/login`、`/register`、`/forgot-password`、`/orders/track`）已在其中 Disallow。
5. IndexNow 在 middleware 里按 `INDEXNOW_KEY` 推送，未配置则不推。

## 7. 压缩（为什么 gzip 关着）

`frontend/brotli-proxy.mjs` 在 frontend 容器内起 `server.js` 于 `INTERNAL_PORT`（默认 3001），
自己在 `PORT`（3000）对外，按 `Accept-Encoding` 流式 brotli；客户端不接受 br 时回落到
Next 自带 gzip。实测 `/products`：738,231 B → 68,552 B（br）vs 86,139 B（gzip）。

- 开关：`BROTLI_PROXY=off` 直接跑 Next（应急回退），`BROTLI_QUALITY` 默认 4。
- 边缘 **不要** 再压缩，也不要剥掉 `Content-Encoding`；nginx 对已编码响应默认不处理，安全。
- 若用 CDN，确认它不会把 `br` 改写成别的编码（部分 CDN 会抢占压缩，需在控制台关闭）。

## 8. 回滚

代码：

```bash
git checkout <上一个稳定 commit>
docker compose build && docker compose up -d
```

商品文案（`scripts/rewrite_product_content.mjs` 的产物）：

```sql
UPDATE products p JOIN products_content_backup b ON b.id = p.id
SET p.meta_title = b.meta_title, p.meta_description = b.meta_description,
    p.short_description = b.short_description, p.description = b.description,
    p.seo_noindex = b.seo_noindex;
```

商品 slug（`scripts/differentiate_product_slugs.mjs` 的产物，含 301）：

```sql
UPDATE products p JOIN product_slug_history h ON h.product_id = p.id
SET p.slug = h.old_slug
WHERE h.reason IN ('competitor-match','url-normalized','similarity-tightened');

-- 被合并下架的重复批次
UPDATE products SET is_active = 1
WHERE id IN (1359,1468,1411,1243,257,255,1389,1162,1361);

-- 对应 301 一并删除，避免旧地址指向自己
DELETE r FROM seo_redirects r JOIN product_slug_history h
  ON CONCAT('/products/', h.old_slug) COLLATE utf8mb4_unicode_ci = r.new_url
WHERE h.reason IN ('competitor-match','url-normalized','similarity-tightened');
```

> 改 slug 必须成对写 `product_slug_history` + `seo_redirects`，且链上不能出现 A→B→C；
> 生成器已内置折叠，重跑可自愈。

## 9. 已知数据缺口（不是代码问题）

| 项 | 现状 | 影响 |
|---|---|---|
| `product_reviews` | 0 行 | 没有 `AggregateRating`；评价入口已开放（登录即可评，无需购买），审核后台 `/admin/reviews` |
| `articles` | 0 行 | 博客/新闻 sitemap 为空，内容营销待补 |
| 商品图片 | 部分为空 | 相关页面 `imgs=0`，不影响索引但影响 CTR |

评价体系口径：页面展示与 JSON-LD 只用 `is_approved && (is_verified || !source)` 的子集，
转录来源的评论只展示、不计分；有订单的评价才标 `verified`。
