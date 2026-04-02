import type { DialogueBlock } from "@/types/video-processor";

export type DialogueBlockCardProps = {
  block: DialogueBlock;
  index: number;
  loading: boolean;
  isLatest: boolean;
  showChapterTitle: boolean;
  onLatestRef?: (node: HTMLElement | null) => void;
};
