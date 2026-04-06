import type { CaptionItem } from "@/lib/transcript/types";

export type ManagedTranscriptCache = {
  captions: CaptionItem[];
  cachedAt: string;
  sourceUrl: string;
  videoId: string;
};
