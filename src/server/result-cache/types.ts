import type { ProcessResponse } from "@/types/video-processor";

export type ManagedResultCache = {
  cachedAt: string;
  preferredLanguage: string;
  result: ProcessResponse;
  sourceUrl: string;
  videoId: string;
};
