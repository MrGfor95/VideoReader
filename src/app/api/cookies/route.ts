import { NextRequest, NextResponse } from "next/server";
import { getProcessServiceMode, getProcessServiceUrl } from "@/lib/network";
import type { CookieUploadRequest, CookieUploadResponse } from "@/types/video-processor";

export const runtime = "nodejs";

async function readUpstreamPayload(upstream: Response) {
  const fallbackError =
    upstream.status >= 500 ? "Cookie 上传失败，请稍后重试。" : "Cookie 上传失败。";

  try {
    const raw = await upstream.text();

    if (!raw.trim()) {
      return { error: fallbackError };
    }

    try {
      return JSON.parse(raw) as CookieUploadResponse | { error?: string };
    } catch {
      return { error: raw.trim() || fallbackError };
    }
  } catch {
    return { error: fallbackError };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CookieUploadRequest;
    const token = request.headers.get("x-cookie-upload-token")?.trim();

    if (!body.content?.trim()) {
      return NextResponse.json({ error: "请先选择有效的 cookies.txt 文件。" }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: "请输入 Cookie 管理口令。" }, { status: 400 });
    }

    const processServiceUrl = getProcessServiceUrl();
    const endpoint = new URL("/admin/cookies", processServiceUrl);
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cookie-Upload-Token": token,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = await readUpstreamPayload(upstream);
    const directUploadUrl = new URL("/admin/cookies", processServiceUrl).toString();

    if (
      !upstream.ok &&
      "error" in payload &&
      typeof payload.error === "string" &&
      /error code:\s*1003/i.test(payload.error)
    ) {
      return NextResponse.json(
        {
          directUploadUrl,
          error: "当前 Cloudflare 代理上传被上游拦截，前端将改用浏览器直连字幕服务重试。",
          shouldRetryDirect: true,
        },
        { status: upstream.status },
      );
    }

    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    console.error("cookie upload route failed", error);

    const message = buildRouteErrorMessage(error, getProcessServiceMode(), (() => {
      try {
        return getProcessServiceUrl();
      } catch {
        return "";
      }
    })());

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildRouteErrorMessage(error: unknown, mode: string, endpoint?: string) {
  const message = error instanceof Error ? error.message.trim() : "";
  const isLocalMode = mode === "local";
  const pointsToLocalhost = endpoint
    ? /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(endpoint)
    : false;

  if (isLocalMode && pointsToLocalhost && /fetch failed/i.test(message)) {
    return "本地字幕服务未启动或无法连接，请先运行 `yarn dev:subtitle`，再重试。";
  }

  return message || "Cookie 上传失败，请稍后重试。";
}
