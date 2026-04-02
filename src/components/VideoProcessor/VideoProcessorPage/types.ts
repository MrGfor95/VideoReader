import type { FormEvent } from "react";
import type { ProcessResponse } from "@/types/video-processor";

export type VideoProcessorFormState = {
  youtubeUrl: string;
  preferredLanguage: string;
};

export type UseVideoProcessorReturn = {
  youtubeUrl: string;
  preferredLanguage: string;
  result: ProcessResponse | null;
  loading: boolean;
  error: string;
  statusMessage: string;
  progress: number;
  chunkProgress: string;
  logs: string[];
  loadDebugPreview: () => void;
  setYoutubeUrl: (value: string) => void;
  setPreferredLanguage: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};
