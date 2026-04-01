import type { AiTranscriptResult, ProcessResponse, TranscriptEntry } from "@/types/video-processor";

export type BuildDialogueDocumentInput = {
  aiResult: AiTranscriptResult;
  metadata: ProcessResponse["metadata"];
  transcriptEntries: TranscriptEntry[];
};
