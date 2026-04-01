import { formatTimecode } from "@/lib/transcript/timecode";
import type { BuildDialogueDocumentInput } from "@/lib/document/types";

export function buildDialogueDocument({
  aiResult,
  metadata,
  transcriptEntries,
}: BuildDialogueDocumentInput) {
  return {
    ...aiResult,
    dialogueBlocks: aiResult.dialogueBlocks.map((block, index) => ({
      ...block,
      timecode:
        block.timecode ||
        (transcriptEntries[index] ? formatTimecode(transcriptEntries[index].start) : undefined),
    })),
    metadata,
  };
}
