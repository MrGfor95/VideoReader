import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DEFAULT_DEMO_RESULT } from "@/lib/demo/default-demo-result";
import { DEFAULT_DEMO_VIDEO_ID, DEFAULT_DEMO_YOUTUBE_URL } from "@/lib/transcript/demo-video";
import { extractVideoId } from "@/lib/transcript";
import { DEFAULT_RESULT_CACHE_DIRECTORY } from "@/server/result-cache/constants";
import type { ManagedResultCache } from "@/server/result-cache/types";
import type { ProcessResponse } from "@/types/video-processor";

function normalizeLegacyDirectory(value: string) {
  return /\.json$/i.test(value) ? dirname(value) : value;
}

function getManagedResultCacheDirectory() {
  const configured =
    process.env.RESULT_CACHE_DIRECTORY?.trim() ||
    process.env.MANAGED_RESULT_CACHE_DIRECTORY?.trim() ||
    process.env.DEMO_RESULT_CACHE_PATH?.trim() ||
    process.env.MANAGED_RESULT_CACHE_PATH?.trim();

  if (configured) {
    return normalizeLegacyDirectory(configured);
  }

  return DEFAULT_RESULT_CACHE_DIRECTORY;
}

function buildResultCacheKey(input: { preferredLanguage: string; videoId: string }) {
  const normalizedLanguage = input.preferredLanguage.trim().toLowerCase().replace(/[^a-z0-9-]/g, "_");
  const normalizedVideoId = input.videoId.trim().toLowerCase();
  return `${normalizedVideoId}__${normalizedLanguage}`;
}

function getManagedResultCachePath(input: { preferredLanguage: string; videoId: string }) {
  return join(getManagedResultCacheDirectory(), `${buildResultCacheKey(input)}.json`);
}

function isManagedDemoVideo(sourceUrl: string, videoId: string) {
  const configuredVideoId = process.env.DEMO_TRANSCRIPT_VIDEO_ID?.trim() || DEFAULT_DEMO_VIDEO_ID;
  const configuredUrl = process.env.DEMO_TRANSCRIPT_SOURCE_URL?.trim() || DEFAULT_DEMO_YOUTUBE_URL;

  if (videoId === configuredVideoId) {
    return true;
  }

  return extractVideoId(sourceUrl) === extractVideoId(configuredUrl);
}

function buildEmbeddedDemoResultCache(input: {
  preferredLanguage: string;
  sourceUrl: string;
  videoId: string;
}) {
  return {
    cacheKey: buildResultCacheKey(input),
    cachedAt: "embedded-demo-result",
    preferredLanguage: input.preferredLanguage,
    result: {
      ...DEFAULT_DEMO_RESULT,
      metadata: {
        ...DEFAULT_DEMO_RESULT.metadata,
        sourceUrl: input.sourceUrl,
        transcriptSource: "managed-ai-cache",
        videoId: input.videoId,
      },
    },
    sourceUrl: input.sourceUrl,
    videoId: input.videoId,
  } satisfies ManagedResultCache;
}

export async function readManagedResultCache(input: {
  preferredLanguage: string;
  sourceUrl: string;
  videoId: string;
}) {
  const cacheKey = buildResultCacheKey(input);
  const cachePath = getManagedResultCachePath(input);

  try {
    await access(cachePath);
    const raw = await readFile(cachePath, "utf8");
    const payload = JSON.parse(raw) as ManagedResultCache;

    if (
      payload.cacheKey !== cacheKey ||
      payload.videoId !== input.videoId ||
      payload.preferredLanguage !== input.preferredLanguage ||
      !payload.result
    ) {
      return null;
    }

    return payload;
  } catch {
    if (isManagedDemoVideo(input.sourceUrl, input.videoId)) {
      return buildEmbeddedDemoResultCache(input);
    }

    return null;
  }
}

export async function writeManagedResultCache(input: {
  preferredLanguage: string;
  result: ProcessResponse;
  sourceUrl: string;
  videoId: string;
}) {
  const cacheKey = buildResultCacheKey(input);
  const cachePath = getManagedResultCachePath(input);

  await mkdir(getManagedResultCacheDirectory(), { recursive: true });
  await writeFile(
    cachePath,
    JSON.stringify(
      {
        cacheKey,
        cachedAt: new Date().toISOString(),
        preferredLanguage: input.preferredLanguage,
        result: input.result,
        sourceUrl: input.sourceUrl,
        videoId: input.videoId,
      } satisfies ManagedResultCache,
      null,
      2,
    ),
    "utf8",
  );

  return cachePath;
}
