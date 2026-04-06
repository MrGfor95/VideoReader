import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_RESULT_CACHE_DIRECTORY } from "@/server/result-cache/constants";
import type { ManagedResultCache } from "@/server/result-cache/types";
import type { ProcessResponse } from "@/types/video-processor";

function getManagedResultCacheDirectory() {
  return (
    process.env.RESULT_CACHE_DIRECTORY?.trim() ||
    process.env.MANAGED_RESULT_CACHE_DIRECTORY?.trim() ||
    process.env.DEMO_RESULT_CACHE_PATH?.trim() ||
    process.env.MANAGED_RESULT_CACHE_PATH?.trim() ||
    DEFAULT_RESULT_CACHE_DIRECTORY
  );
}

function buildResultCacheKey(input: { preferredLanguage: string; videoId: string }) {
  const normalizedLanguage = input.preferredLanguage.trim().toLowerCase().replace(/[^a-z0-9-]/g, "_");
  const normalizedVideoId = input.videoId.trim().toLowerCase();
  return `${normalizedVideoId}__${normalizedLanguage}`;
}

function getManagedResultCachePath(input: { preferredLanguage: string; videoId: string }) {
  return join(getManagedResultCacheDirectory(), `${buildResultCacheKey(input)}.json`);
}

export async function readManagedResultCache(input: {
  preferredLanguage: string;
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
