import type { ProcessResponse } from "@/types/video-processor";

export type PreviewPanelProps = {
  result: ProcessResponse | null;
  loading: boolean;
  statusMessage: string;
  chunkProgress: string;
};

export type UsePreviewPanelInput = {
  loading: boolean;
  result: ProcessResponse | null;
};

export type UsePreviewPanelReturn = {
  setLatestBlockRef: (node: HTMLElement | null) => void;
};
