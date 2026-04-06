import { Readable } from "node:stream";
import { createServer } from "node:http";
import { getCookieUploadToken, writeManagedCookiesFile } from "../../src/server/cookies";
import { createProcessStream } from "../../src/server/process";
import type { CookieUploadRequest, ProcessRequest } from "../../src/types/video-processor";

const port = Number(process.env.PORT ?? 8788);
const host = process.env.HOST ?? "0.0.0.0";
type NodeCompatibleReadableStream = Parameters<typeof Readable.fromWeb>[0];

function getCookieCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Cookie-Upload-Token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function readJsonBody(request: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as ProcessRequest) : {};
}

function writeJson(
  response: import("node:http").ServerResponse<import("node:http").IncomingMessage>,
  statusCode: number,
  payload: unknown,
  headers?: Record<string, string>,
) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

const server = createServer(async (request, response) => {
  try {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (method === "GET" && url.pathname === "/health") {
      writeJson(response, 200, { status: "ok" });
      return;
    }

    if (method === "OPTIONS" && url.pathname === "/admin/cookies") {
      response.writeHead(204, getCookieCorsHeaders());
      response.end();
      return;
    }

    if (method === "POST" && url.pathname === "/process") {
      const body = await readJsonBody(request);
      const sourceUrl = body.youtubeUrl?.trim();

      if (!sourceUrl) {
        writeJson(response, 400, { error: "请输入 YouTube 链接。" });
        return;
      }

      const stream = createProcessStream({
        preferredLanguage: body.preferredLanguage ?? "zh-CN",
        sourceUrl,
      });

      response.writeHead(200, {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });

      Readable.fromWeb(stream as NodeCompatibleReadableStream).pipe(response);
      return;
    }

    if (method === "POST" && url.pathname === "/admin/cookies") {
      const expectedToken = getCookieUploadToken();
      const providedToken = request.headers["x-cookie-upload-token"];

      if (!expectedToken) {
        writeJson(
          response,
          503,
          { error: "服务端未配置 COOKIE_UPLOAD_TOKEN，暂不允许上传 cookies。" },
          getCookieCorsHeaders(),
        );
        return;
      }

      if (providedToken !== expectedToken) {
        writeJson(response, 403, { error: "Cookie 管理口令无效。" }, getCookieCorsHeaders());
        return;
      }

      const body = (await readJsonBody(request)) as CookieUploadRequest;
      const content = body.content?.trim();

      if (!content) {
        writeJson(response, 400, { error: "请上传有效的 cookies.txt 内容。" }, getCookieCorsHeaders());
        return;
      }

      const targetPath = await writeManagedCookiesFile(content);
      writeJson(
        response,
        200,
        {
          message: "Cookie 文件已更新，后续请求将自动使用最新内容。",
          path: targetPath,
        },
        getCookieCorsHeaders(),
      );
      return;
    }

    writeJson(response, 404, { error: "Not Found" });
  } catch (error) {
    console.error("subtitle-service request failed", error);
    writeJson(response, 500, {
      error: error instanceof Error ? error.message : "处理失败，请稍后重试。",
    });
  }
});

server.listen(port, host, () => {
  console.log(`subtitle-service listening on http://${host}:${port}`);
});
