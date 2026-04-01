# Gemini Video2Text

当前仓库已经改成双服务架构：

- Cloudflare Workers 托管的 Next.js 前端
- 独立运行的字幕处理服务

前端继续提供页面、预览和导出能力，但不再直接运行 `yt-dlp`。真正的字幕抓取、代理请求和 Gemini 处理逻辑，由独立字幕服务负责。

## 架构

```text
Browser
  -> Cloudflare Workers / Next.js
  -> /api/process 代理路由
  -> Subtitle Service
  -> YouTube / Gemini
```

## 本地开发

先准备环境变量：

```bash
cp .env.example .env.local
cp .dev.vars.example .dev.vars
```

然后至少配置：

```text
GEMINI_API_KEY=...
PROCESS_SERVICE_URL=http://127.0.0.1:8788
PYTHON_FOR_YTDLP=C:\Python312\python.exe
```

启动独立字幕服务：

```bash
yarn dev:subtitle
```

再启动前端：

```bash
yarn dev
```

## Cloudflare 前端部署

仓库已经包含这些文件：

- `wrangler.jsonc`
- `open-next.config.ts`
- `public/_headers`

Cloudflare 的详细清单见：

```text
DEPLOY_CLOUDFLARE.md
```

相关命令：

```bash
yarn preview
yarn deploy
yarn cf-typegen
```

Cloudflare Workers 侧需要配置的核心环境变量：

```text
PROCESS_SERVICE_URL=https://your-subtitle-service.example.com
```

## 独立字幕服务

服务入口在：

```text
subtitle-service/src/index.ts
```

说明文档在：

```text
subtitle-service/README.md
```

Railway 的详细清单见：

```text
subtitle-service/DEPLOY_RAILWAY.md
```

现在仓库也已经内置了这些部署文件：

```text
subtitle-service/Dockerfile
railway.json
render.yaml
```

建议把它部署到支持 Docker 的普通 Node.js 环境，例如：

- Railway
- Fly.io
- Render
- Docker + VPS

## 说明

这条部署路线是为了兼容 Cloudflare Workers 的运行限制。当前字幕链路依赖 `python -m yt_dlp`、文件系统和 `child_process`，这些不适合直接跑在标准 Workers 里，因此拆成独立服务是更稳妥的做法。
