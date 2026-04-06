import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { extractVideoId } from "@/lib/transcript";
import { DEFAULT_DEMO_TRANSCRIPT_CACHE_PATH, DEFAULT_DEMO_VIDEO_ID, DEFAULT_DEMO_YOUTUBE_URL } from "@/server/transcript-cache/constants";
import type { CaptionItem } from "@/lib/transcript/types";
import type { ManagedTranscriptCache } from "@/server/transcript-cache/types";

function getManagedTranscriptCachePath() {
  return (
    process.env.DEMO_TRANSCRIPT_CACHE_PATH?.trim() ||
    process.env.MANAGED_TRANSCRIPT_CACHE_PATH?.trim() ||
    DEFAULT_DEMO_TRANSCRIPT_CACHE_PATH
  );
}

export function isManagedDemoVideo(sourceUrl: string, videoId: string) {
  const configuredVideoId = process.env.DEMO_TRANSCRIPT_VIDEO_ID?.trim() || DEFAULT_DEMO_VIDEO_ID;
  const configuredUrl = process.env.DEMO_TRANSCRIPT_SOURCE_URL?.trim() || DEFAULT_DEMO_YOUTUBE_URL;

  if (videoId === configuredVideoId) {
    return true;
  }

  return extractVideoId(sourceUrl) === extractVideoId(configuredUrl);
}

export async function readManagedTranscriptCache(videoId: string) {
  const cachePath = getManagedTranscriptCachePath();

  try {
    await access(cachePath);
    const raw = await readFile(cachePath, "utf8");
    const payload = JSON.parse(raw) as ManagedTranscriptCache;

    if (payload.videoId !== videoId || !Array.isArray(payload.captions) || !payload.captions.length) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function writeManagedTranscriptCache(input: {
  captions: CaptionItem[];
  sourceUrl: string;
  videoId: string;
}) {
  const cachePath = getManagedTranscriptCachePath();

  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(
    cachePath,
    JSON.stringify(
      {
        captions: input.captions,
        cachedAt: new Date().toISOString(),
        sourceUrl: input.sourceUrl,
        videoId: input.videoId,
      } satisfies ManagedTranscriptCache,
      null,
      2,
    ),
    "utf8",
  );

  return cachePath;
}
