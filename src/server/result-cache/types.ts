import type { ProcessResponse } from "@/types/video-processor";

export type ManagedResultCache = {
  cacheKey: string;
  cachedAt: string;
  preferredLanguage: string;
  result: ProcessResponse;
  sourceUrl: string;
  videoId: string;
};
