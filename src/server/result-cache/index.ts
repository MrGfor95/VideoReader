import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  DEFAULT_CACHE_ROOT_DIRECTORY,
  DEFAULT_LATEST_RESULT_CACHE_PATH,
  DEFAULT_RESULT_CACHE_DIRECTORY,
} from "@/server/result-cache/constants";
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

function getManagedResultCacheDirectories() {
  const configured = getManagedResultCacheDirectory();
  return [...new Set([configured, DEFAULT_RESULT_CACHE_DIRECTORY])];
}

function buildResultCacheKey(input: { preferredLanguage: string; videoId: string }) {
  const normalizedLanguage = input.preferredLanguage.trim().toLowerCase().replace(/[^a-z0-9-]/g, "_");
  const normalizedVideoId = input.videoId.trim().toLowerCase();
  return `${normalizedVideoId}__${normalizedLanguage}`;
}

function getManagedResultCachePath(input: { preferredLanguage: string; videoId: string }) {
  return join(getManagedResultCacheDirectory(), `${buildResultCacheKey(input)}.json`);
}

function getLatestManagedResultCachePath() {
  return (
    process.env.LATEST_RESULT_CACHE_PATH?.trim() ||
    process.env.MANAGED_LATEST_RESULT_CACHE_PATH?.trim() ||
    DEFAULT_LATEST_RESULT_CACHE_PATH
  );
}

function getLatestManagedResultCachePaths() {
  return [...new Set([getLatestManagedResultCachePath(), DEFAULT_LATEST_RESULT_CACHE_PATH])];
}

async function readManagedResultCachePayload(cachePath: string) {
  try {
    await access(cachePath);
    const raw = await readFile(cachePath, "utf8");
    return JSON.parse(raw) as ManagedResultCache;
  } catch {
    return null;
  }
}

function buildManagedResultCachePayload(input: {
  preferredLanguage: string;
  result: ProcessResponse;
  sourceUrl: string;
  videoId: string;
}) {
  return {
    cacheKey: buildResultCacheKey(input),
    cachedAt: new Date().toISOString(),
    preferredLanguage: input.preferredLanguage,
    result: input.result,
    sourceUrl: input.sourceUrl,
    videoId: input.videoId,
  } satisfies ManagedResultCache;
}

export async function readManagedResultCache(input: {
  preferredLanguage: string;
  videoId: string;
}) {
  const cacheKey = buildResultCacheKey(input);
  const candidatePaths = [
    ...getManagedResultCacheDirectories().map((directory) =>
      join(directory, `${cacheKey}.json`),
    ),
    ...getLatestManagedResultCachePaths(),
    join(DEFAULT_CACHE_ROOT_DIRECTORY, "latest-result.json"),
  ];

  for (const cachePath of [...new Set(candidatePaths)]) {
    const payload = await readManagedResultCachePayload(cachePath);

    if (
      payload &&
      payload.cacheKey === cacheKey &&
      payload.videoId === input.videoId &&
      payload.preferredLanguage === input.preferredLanguage &&
      payload.result
    ) {
      return payload;
    }
  }

  return null;
}

export async function writeManagedResultCache(input: {
  preferredLanguage: string;
  result: ProcessResponse;
  sourceUrl: string;
  videoId: string;
}) {
  const cachePath = getManagedResultCachePath(input);
  const latestCachePath = getLatestManagedResultCachePath();
  const payload = buildManagedResultCachePayload(input);

  await mkdir(getManagedResultCacheDirectory(), { recursive: true });
  await mkdir(dirname(latestCachePath), { recursive: true });
  await writeFile(
    cachePath,
    JSON.stringify(payload, null, 2),
    "utf8",
  );
  await writeFile(
    latestCachePath,
    JSON.stringify(
      {
        ...payload,
        cachePath,
      },
      null,
      2,
    ),
    "utf8",
  );

  return cachePath;
}
