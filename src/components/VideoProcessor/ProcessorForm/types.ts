import type { FormEvent } from "react";

export type ProcessorFormProps = {
  youtubeUrl: string;
  preferredLanguage: string;
  loading: boolean;
  error: string;
  statusMessage: string;
  progress: number;
  chunkProgress: string;
  logs: string[];
  canDownload: boolean;
  showDebugPreview: boolean;
  onYoutubeUrlChange: (value: string) => void;
  onPreferredLanguageChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDownload: () => void;
  onLoadDebugPreview: () => void;
};
