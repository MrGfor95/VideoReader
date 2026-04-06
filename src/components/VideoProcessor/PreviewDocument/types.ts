import type { ProcessResponse } from "@/types/video-processor";

export type UseProgressivePreviewInput = {
  result: ProcessResponse;
};

export type UseProgressivePreviewReturn = {
  displayResult: ProcessResponse;
  isAnimating: boolean;
  pendingBlockCount: number;
};

export type PreviewDocumentProps = {
  loading: boolean;
  progressLabel: string;
  result: ProcessResponse;
  statusMessage: string;
  cacheHitMessage: string;
  onLatestBlockRef: (node: HTMLElement | null) => void;
};
