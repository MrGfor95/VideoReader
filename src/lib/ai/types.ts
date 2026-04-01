import type { AiTranscriptResult } from "@/types/video-processor";

export type ProcessTranscriptChunkInput = {
  transcriptText: string;
  preferredLanguage: string;
  knownSpeakers?: string[];
};

export type ConsolidateChunkResultsInput = {
  preferredLanguage: string;
  results: AiTranscriptResult[];
};

export type ConsolidatedChunkSummary = Pick<AiTranscriptResult, "title" | "summary" | "speakers">;
