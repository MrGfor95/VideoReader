# Cloudflare 前端部署清单

这份清单对应当前仓库里的前端服务：

- 运行时：Cloudflare Workers
- 框架：Next.js + OpenNext
- Wrangler 配置：`wrangler.jsonc`

## 上线前依赖

- 字幕服务已经先部署成功
- 你已经拿到字幕服务公网地址
- 本地 `yarn lint` 通过
- 本地 `yarn build` 通过
- 本地 `npx opennextjs-cloudflare build` 通过
- 已登录 Cloudflare 账号
- 已准备好 Worker 所在 Account

## 必填环境变量

Cloudflare 前端至少需要：

```text
PROCESS_SERVICE_URL=https://your-subtitle-service.up.railway.app
```

如果前端还依赖别的公开配置，再按需增加，例如：

```text
NEXT_PUBLIC_APP_NAME=YouTube Video to AI Dialogue Doc
```

## Wrangler 登录

如果你从本地发布，先登录：

```bash
npx wrangler login
```

或者使用环境变量：

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

## 本地预览

在真正 deploy 前，先跑一遍 Cloudflare 侧预览：

```bash
yarn preview
```

这一步会：

1. 构建 Next.js
2. 生成 OpenNext Worker bundle
3. 用 `wrangler dev` 在本地启动接近 Cloudflare 的运行环境

## 环境变量配置方式

你有两种常见方式。

### 方式 1：Cloudflare Dashboard 配置

1. 打开 Cloudflare Dashboard
2. 进入 `Workers & Pages`
3. 选中这个 Worker
4. 打开 `Settings`
5. 进入 `Variables and Secrets`
6. 添加：

```text
PROCESS_SERVICE_URL=https://your-subtitle-service.up.railway.app
```

适合：

- 你想直接在控制台维护环境变量
- 不想把环境值写进 `wrangler.jsonc`

### 方式 2：Wrangler 配置或命令行环境

如果你想把非敏感变量作为配置管理，也可以通过 Wrangler 管理。  
但当前项目更推荐把 `PROCESS_SERVICE_URL` 放在 Dashboard，避免环境切换时误覆盖。

## 正式部署

本地部署命令：

```bash
yarn deploy
```

如果你用 CI/CD，也可以把 deploy command 设置为：

```bash
yarn deploy
```

## 首次上线后检查

1. 打开 Cloudflare Worker 生成的 `workers.dev` 域名
2. 确认首页能正常打开
3. 输入一条可用的 YouTube 链接
4. 观察前端是否能持续收到 `/api/process` 的流式返回
5. 如果失败，先检查：
   - Cloudflare Worker 变量里的 `PROCESS_SERVICE_URL`
   - Railway 字幕服务 `/health`
   - Railway 日志里是否收到 `/process` 请求

## 联调顺序建议

推荐按这个顺序排查：

1. 先确认 Railway 字幕服务健康：

```text
GET https://your-subtitle-service.up.railway.app/health
```

2. 再确认 Cloudflare Worker 已配置正确的 `PROCESS_SERVICE_URL`
3. 再从页面发起一次真实请求

## 常见问题

### 1. 页面能打开，但生成时报 500

大概率先看这两项：

- `PROCESS_SERVICE_URL` 是否填对
- 字幕服务是否可公网访问

### 2. 本地 `next dev` 正常，但 Cloudflare 预览异常

优先执行：

```bash
yarn preview
```

因为这一步更接近真正的 Worker 环境。

### 3. Dashboard 改了变量，但部署后又被覆盖

如果 Wrangler 配置里也维护了同名变量，后续 deploy 可能覆盖 Dashboard 变更。当前仓库建议把这类环境值只放在 Dashboard。

## 当前仓库里的相关文件

- `wrangler.jsonc`
- `open-next.config.ts`
- `next.config.ts`
- `.dev.vars.example`
- `src/app/api/process/route.ts`
