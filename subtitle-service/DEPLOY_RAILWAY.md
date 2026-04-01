# Railway 部署清单

这份清单对应当前仓库里的独立字幕服务：

- 服务入口：`subtitle-service/src/index.ts`
- Docker 配置：`Dockerfile.subtitle-service`
- Railway 配置：`railway.json`

## 上线前检查

- Git 仓库已经推到 GitHub
- `yarn lint` 通过
- `yarn build` 通过
- 本地 `yarn dev:subtitle` 可启动
- 本地健康检查通过：`GET http://127.0.0.1:8788/health`
- 已准备 Gemini Key
- 已确认目标部署环境是否需要代理访问 YouTube / Gemini

## 必填环境变量

在 Railway 的字幕服务里至少配置：

```text
GEMINI_API_KEY=你的密钥
HOST=0.0.0.0
```

## 建议环境变量

```text
PORT=8080
PYTHON_FOR_YTDLP=/usr/bin/python3
```

如果你的部署区域访问 YouTube 或 Gemini 需要代理，再补：

```text
HTTP_PROXY=http://your-proxy
HTTPS_PROXY=http://your-proxy
ALL_PROXY=http://your-proxy
```

## Railway 控制台上线步骤

1. 登录 Railway，创建一个新 Project。
2. 选择 `Deploy from GitHub repo`，连接当前仓库。
3. 进入新建的服务，确认使用仓库里的 Docker 配置。
4. 如果 Railway 没自动识别子目录 Dockerfile，在服务变量里增加：

```text
RAILWAY_DOCKERFILE_PATH=Dockerfile.subtitle-service
```

5. 打开服务的 `Variables`，添加本清单里的环境变量。
6. 打开服务的 `Settings`，确认 Health Check Path 为：

```text
/health
```

7. 等待首次部署完成。
8. 打开生成的 Railway 域名，确认：

```text
GET /health
```

返回：

```json
{"status":"ok"}
```

## 回填到 Cloudflare 前端

字幕服务上线后，把它的公网地址填到前端：

```text
PROCESS_SERVICE_URL=https://your-subtitle-service.up.railway.app
```

这个变量要配置在：

- Cloudflare Workers 环境变量
- 本地 `.env.local` 或 `.dev.vars`（便于本地联调）

## 上线后自测

1. 请求 `GET /health`
2. 用一条带字幕的 YouTube 链接请求 `POST /process`
3. 观察 Railway 部署日志里是否出现：
   - `subtitle-service listening`
   - `process stream failed` 之外的异常
4. 回到 Cloudflare 前端页面，确认流式生成正常

## 常见问题

### 1. 服务启动了，但公网请求失败

检查是否监听了 Railway 提供的端口与主机：

- `PORT` 使用 Railway 注入值
- `HOST=0.0.0.0`

Railway 官方文档说明，服务应监听 `0.0.0.0:$PORT`。  
来源：[Public Networking](https://docs.railway.com/public-networking)

### 2. Railway 没有使用子目录 Dockerfile

在服务变量中添加：

```text
RAILWAY_DOCKERFILE_PATH=Dockerfile.subtitle-service
```

来源：[Dockerfiles](https://docs.railway.com/deploy/dockerfiles)

### 3. 部署一直卡在健康检查

确认服务设置中的 Health Check Path 为 `/health`，并且返回 HTTP 200。  
来源：[Healthchecks](https://docs.railway.com/deployments/healthchecks)

### 4. 环境变量改了但服务没生效

Railway 的变量变更需要 review 并 deploy 后才会应用。  
来源：[Using Variables](https://docs.railway.com/variables)
