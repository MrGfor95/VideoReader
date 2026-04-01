import { Readable } from "node:stream";
import { createServer } from "node:http";
import { createProcessStream } from "../../src/server/process";
import type { ProcessRequest } from "../../src/types/video-processor";

const port = Number(process.env.PORT ?? 8788);
const host = process.env.HOST ?? "0.0.0.0";
type NodeCompatibleReadableStream = Parameters<typeof Readable.fromWeb>[0];

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
) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
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
