import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { DEFAULT_DEMO_RESULT_CACHE_PATH } from "@/server/result-cache/constants";
import type { ManagedResultCache } from "@/server/result-cache/types";
import type { ProcessResponse } from "@/types/video-processor";

function getManagedResultCachePath() {
  return (
    process.env.DEMO_RESULT_CACHE_PATH?.trim() ||
    process.env.MANAGED_RESULT_CACHE_PATH?.trim() ||
    DEFAULT_DEMO_RESULT_CACHE_PATH
  );
}

export async function readManagedResultCache(input: {
  preferredLanguage: string;
  videoId: string;
}) {
  const cachePath = getManagedResultCachePath();

  try {
    await access(cachePath);
    const raw = await readFile(cachePath, "utf8");
    const payload = JSON.parse(raw) as ManagedResultCache;

    if (
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
  const cachePath = getManagedResultCachePath();

  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(
    cachePath,
    JSON.stringify(
      {
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
