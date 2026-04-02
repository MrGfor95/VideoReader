import { NextRequest, NextResponse } from "next/server";
import { getProcessServiceMode, getProcessServiceUrl } from "@/lib/network";
import type { ProcessRequest } from "@/types/video-processor";

export const maxDuration = 60;
export const runtime = "nodejs";

function buildStreamErrorEvent(message: string) {
  return `${JSON.stringify({ type: "error", message })}\n`;
}

function createProxyStream(upstream: Response) {
  const encoder = new TextEncoder();
  const reader = upstream.body?.getReader();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      if (!reader) {
        controller.enqueue(
          encoder.encode(buildStreamErrorEvent("字幕服务未返回可读取的流。")),
        );
        controller.close();
        return;
      }

      try {
        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          if (value) {
            controller.enqueue(value);
          }
        }
      } catch (error) {
        console.error("process proxy stream failed", error);
        controller.enqueue(
          encoder.encode(
            buildStreamErrorEvent("字幕服务连接中断，请稍后重试。"),
          ),
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      reader?.cancel().catch(() => undefined);
    },
  });
}

function buildRouteErrorMessage(error: unknown, mode: string, endpoint?: string) {
  const message = error instanceof Error ? error.message : "";
  const isLocalMode = mode === "local";
  const pointsToLocalhost = endpoint
    ? /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(endpoint)
    : false;

  if (
    isLocalMode &&
    pointsToLocalhost &&
    /fetch failed/i.test(message)
  ) {
    return "本地字幕服务未启动或无法连接，请先运行 `yarn dev:subtitle`，再重试。";
  }

  return message || "处理失败，请稍后重试。";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProcessRequest;
    const sourceUrl = body.youtubeUrl?.trim();

    if (!sourceUrl) {
      return NextResponse.json(
        { error: "请输入 YouTube 链接。" },
        { status: 400 },
      );
    }

    const processServiceUrl = getProcessServiceUrl();
    const processServiceMode = getProcessServiceMode();

    const endpoint = new URL("/process", processServiceUrl);
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        preferredLanguage: body.preferredLanguage ?? "zh-CN",
        youtubeUrl: sourceUrl,
      }),
      cache: "no-store",
    });

    if (!upstream.ok) {
      const fallbackMessage =
        upstream.status >= 500
          ? "字幕服务暂不可用，请稍后重试。"
          : "请求字幕服务失败，请检查输入或稍后再试。";
      let payload: unknown = { error: fallbackMessage };

      try {
        const contentType = upstream.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          payload = await upstream.json();
        } else {
          const text = await upstream.text();
          payload = { error: text || fallbackMessage };
        }
      } catch {
        payload = { error: fallbackMessage };
      }

      return NextResponse.json(payload, { status: upstream.status || 502 });
    }

    return new NextResponse(createProxyStream(upstream), {
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Process-Service-Mode": processServiceMode,
      },
    });
  } catch (error) {
    console.error("process route failed", error);

    return NextResponse.json(
      {
        error: buildRouteErrorMessage(
          error,
          getProcessServiceMode(),
          (() => {
            try {
              return getProcessServiceUrl();
            } catch {
              return "";
            }
          })(),
        ),
      },
      { status: 500 },
    );
  }
}
