import { formatTimecode } from "@/lib/srt";
import type { AiTranscriptResult, ProcessResponse, TranscriptEntry } from "@/types/video-processor";

type BuildInput = {
  aiResult: AiTranscriptResult;
  metadata: ProcessResponse["metadata"];
  transcriptEntries: TranscriptEntry[];
};

export function buildDialogueDocument({
  aiResult,
  metadata,
  transcriptEntries,
}: BuildInput): ProcessResponse {
  const normalizedBlocks = aiResult.dialogueBlocks.map((block, index) => ({
    ...block,
    timecode:
      block.timecode ||
      (transcriptEntries[index] ? formatTimecode(transcriptEntries[index].start) : undefined),
  }));

  return {
    ...aiResult,
    dialogueBlocks: normalizedBlocks,
    metadata,
  };
}
