import { NextRequest, NextResponse } from "next/server";
import { getProcessServiceUrl } from "@/lib/network";
import type { CookieUploadRequest, CookieUploadResponse } from "@/types/video-processor";

export const runtime = "nodejs";

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

    const endpoint = new URL("/admin/cookies", getProcessServiceUrl());
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cookie-Upload-Token": token,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = (await upstream.json().catch(() => ({
      error: upstream.ok ? "Cookie 上传完成。" : "Cookie 上传失败。",
    }))) as CookieUploadResponse | { error?: string };

    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    console.error("cookie upload route failed", error);
    return NextResponse.json({ error: "Cookie 上传失败，请稍后重试。" }, { status: 500 });
  }
}
