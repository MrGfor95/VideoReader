import { NextRequest, NextResponse } from "next/server";
import { getProcessServiceUrl } from "@/lib/network";
import type { ProcessRequest } from "@/types/video-processor";

export const maxDuration = 60;
export const runtime = "nodejs";

function isLocalProcessServiceUrl(value: string) {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(value);
}

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

    if (
      isLocalProcessServiceUrl(processServiceUrl) &&
      process.env.NODE_ENV === "production"
    ) {
      return NextResponse.json(
        {
          error:
            "字幕服务地址未配置到线上环境，请在 Cloudflare Worker 中设置 PROCESS_SERVICE_URL。",
        },
        { status: 500 },
      );
    }

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
      },
    });
  } catch (error) {
    console.error("process route failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "处理失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
