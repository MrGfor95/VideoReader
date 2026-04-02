import { NextRequest, NextResponse } from "next/server";
import { getProcessServiceUrl } from "@/lib/network";
import type { ProcessRequest } from "@/types/video-processor";

export const maxDuration = 60;
export const runtime = "nodejs";

function isLocalProcessServiceUrl(value: string) {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(value);
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

    if (!upstream.ok || !upstream.body) {
      let payload: unknown = { error: "字幕服务暂不可用，请稍后重试。" };

      try {
        payload = await upstream.json();
      } catch {}

      return NextResponse.json(payload, { status: upstream.status || 502 });
    }

    return new NextResponse(upstream.body, {
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
