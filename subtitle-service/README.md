# Subtitle Service

独立字幕服务负责：

- YouTube 字幕抓取
- `yt-dlp` 回退
- Gemini 结构化处理
- NDJSON 流式输出

## 本地启动

```bash
yarn dev:subtitle
```

生产启动：

```bash
yarn start:subtitle
```

默认端口：

```text
http://127.0.0.1:8788
```

默认监听地址：

```text
HOST=0.0.0.0
```

健康检查：

```text
GET /health
```

处理接口：

```text
POST /process
```

请求体：

```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=...",
  "preferredLanguage": "zh-CN"
}
```

必需环境变量：

```text
GEMINI_API_KEY
```

常用环境变量：

```text
PORT=8788
PYTHON_FOR_YTDLP=C:\Python312\python.exe
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
YTDLP_COOKIES_MODE=auto
YTDLP_SOCKET_TIMEOUT_SECONDS=45
YTDLP_RETRY_COUNT=2
COOKIE_UPLOAD_TOKEN=your-admin-token
YTDLP_MANAGED_COOKIES_PATH=/app/runtime/youtube-cookies.txt
DEMO_TRANSCRIPT_CACHE_PATH=/app/runtime/demo-transcript.json
DEMO_RESULT_CACHE_PATH=/app/runtime/demo-result.json
MANAGED_RESULT_CACHE_DIRECTORY=/app/runtime/result-cache
```

`YTDLP_COOKIES_MODE` 支持：

```text
auto      # 有 cookies 就用，没有就直连
never     # 完全禁用 cookies
required  # 必须提供 cookies，否则直接报配置错误
```

## Docker 部署

仓库已经内置：

- `Dockerfile.subtitle-service`
- `railway.json`
- `render.yaml`

本地构建：

```bash
docker build -f Dockerfile.subtitle-service -t gemini-video2text-subtitle .
```

本地运行：

```bash
docker run --rm -p 8080:8080 \
  -e GEMINI_API_KEY=your_key \
  -e HTTP_PROXY=http://host.docker.internal:7890 \
  -e HTTPS_PROXY=http://host.docker.internal:7890 \
  gemini-video2text-subtitle
```

容器默认端口：

```text
http://127.0.0.1:8080
```

## 平台建议

Railway 和 Render 都可以直接使用仓库里的 Docker 配置。

Railway 的详细清单见：

```text
subtitle-service/DEPLOY_RAILWAY.md
```

部署时至少要配置：

```text
GEMINI_API_KEY=...
```

如果目标环境访问 YouTube 或 Gemini 仍然需要代理，再补：

```text
HTTP_PROXY=...
HTTPS_PROXY=...
ALL_PROXY=...
```
