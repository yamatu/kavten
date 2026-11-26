# Builders’ Workshop（玩家社区 / 建车日志）

面向 `kavten.com` 的公开社区板块：车主发建车日志、首次点火、改装、排障，任何人可回复，无需注册。
所有页面同样是英文单语（与店铺一致），路径 `/community`。

## 1. 结构

| 层 | 文件 |
| --- | --- |
| 模型 | `backend/models/community.go`（`CommunityPost` / `CommunityComment`） |
| 控制器 | `backend/controllers/community.go` |
| 路由 | `backend/routes/routes.go`（公开组 + `/api/v1/admin/community` 审核组） |
| 建表 | `config.MigratedModels()` 自动迁移；等价 SQL 见 `backend/migrations/20261130_add_community_forum.sql` |
| 前端 | `frontend/src/app/[locale]/community/{page.tsx, [slug]/page.tsx, share/page.tsx}` |
| 服务 | `frontend/src/services/community.service.ts`（公开 + `CommunityAdminService` 审核） |
| 站点地图 | `frontend/src/app/sitemap-community.xml/route.ts`，已挂到 `/sitemap.xml` 索引 |

分类固定五个（`models.ValidCommunityCategories`），顺序即 /community 筛选栏顺序：

`show-tell`（成品展示）、`build-log`（建车日志）、`first-start`（首次点火）、
`mods-upgrades`（改装升级）、`troubleshooting`（排障）。

状态：`published`（默认，游客发帖即刻可见）、`pending`、`hidden`。

## 2. 公开接口

| 方法 | 路径 | 限流 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/v1/public/community/posts` | — | `page` / `page_size`(≤50) / `category` / `search` / `sort=latest\|popular\|discussed`，附 `stats`（总数、回复数、分类计数） |
| GET | `/api/v1/public/community/posts/:slug` | — | 返回帖子 + 已发布回复，并 `views_count + 1` |
| POST | `/api/v1/public/community/posts` | 3 / 小时 / IP | 发帖；带会话 cookie 时自动关联 `customer_id` 与购买徽章 |
| POST | `/api/v1/public/community/posts/:slug/comments` | 10 / 小时 / IP + **必须登录** | 回复，支持 `parent_id` 一级嵌套；匿名返回 401 `auth_required` |
| POST | `/api/v1/public/community/posts/:slug/like` | 30 / 分钟 / IP | 点赞 |
| POST | `/api/v1/public/community/comments/:id/like` | 30 / 分钟 / IP | 回复点赞 |

回复鉴权：**回复必须使用已登录的客户账号**（`CustomerAuthMiddleware`），匿名请求直接 401
`auth_required`，前端 `/community/<slug>` 会把信息框换成登录入口（带回跳 `returnUrl`）。
回复的作者名与邮箱一律取自账号（`author_name` / `author_email` 请求字段被忽略），
徽章固定为 `Community Member`，所以刷垃圾信息至少需要一个真实注册账号。
发帖（新帖）仍允许游客，靠 IP 限流 + Turnstile 控制，避免第一次分享建车日志就被注册墙挡住。

人机验证：若后台 `Human Verification`（Turnstile）已启用，发帖/回复必须带 `turnstile_token`，
失败返回 400 `captcha_failed`，服务不可用返回 503 `captcha_unavailable`；未配置时自动跳过。
`author_email` 只入库，`json:"-"` 永不返回；`images` 以 JSON 存储，读取时转换成 `image_urls`。

## 3. 审核

后台入口：`/admin/community`（左侧菜单 Builders’ Workshop），需要 editor 及以上；

- 帖子：切 `published` / `hidden`、置顶、设为精选（会出现在 `/community` 顶部「Worth reading first」）、换分类、删除（连同回复，仅 admin）。
- 回复：隐藏 / 恢复 / 删除。隐藏会同步收紧帖子的 `comments_count`，避免帖子继续宣传一条看不见的回复。

对应接口（`/api/v1/admin/community`）：

```
GET    /posts              列表（status / search / 分页）
PUT    /posts/:id          改标题、分类、状态、置顶、精选
DELETE /posts/:id          删除（AdminOnly）
GET    /comments           列表（status / search / 分页）
PUT    /comments/:id       改状态
DELETE /comments/:id       删除（AdminOnly）
```

游客能直接发帖，所以上线第一周建议每天看一次：重点是外链、竞品广告、联系方式、
以及把 `pending` 里的正常帖改成 `published`。

## 4. 首次上线

自动迁移会建表，但不会写内容。想先铺三条官方帖（欢迎帖、首次点火检查清单、拍摄教程）：

```bash
mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" \
  < backend/migrations/20261130_add_community_forum.sql
```

三条帖子的 `author_badge` 均为 `Kavten Team`，不冒用客户名义，也不虚构购买记录。
不导入时 `/community` 会显示空状态并引导发帖，不会报错。

## 5. SEO

- `/community` 进 `sitemap-static.xml`（priority 0.7），所有已发布帖子进 `sitemap-community.xml`（同一个 `/community`
  会在两个地图里各出现一次：帖子地图在后端故障时整份 503，静态地图保证首页板块始终可被发现）。
- `/community?category=…&page=…&search=…` 一律 `noindex, follow`，canonical 指回 `/community`，
  避免筛选组合被当成上百个重复页。
- 发帖页 `/community/share` 是空表单，`noindex, follow`，也不进站点地图。
- 帖子页输出 `DiscussionForumPosting` + `BreadcrumbList`，正文由服务端渲染 Markdown，
  回复前 10 条进入 JSON-LD，且只声明页面上真实可见的内容。
- `scripts/audit_seo_live.mjs` 已把社区帖子单独标注为 `thread`，不对其套用「内容过短」判定。

## 6. 已知取舍

- 游客图片只接受图片直链（`image_urls`），没有匿名上传接口；这样不用为公开板块新开写入路径。
- 点赞去重基于浏览器 `localStorage`（`kavten.community.liked.<slug>`），不是账号级去重。
- 论坛 `body` 走 Markdown 渲染，链接统一 `nofollow`，HTML 由 `MarkdownContent` 白名单处理。
