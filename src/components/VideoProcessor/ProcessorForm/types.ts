import type { FormEvent } from "react";

export type ProcessorFormProps = {
  youtubeUrl: string;
  preferredLanguage: string;
  loading: boolean;
  error: string;
  statusMessage: string;
  cacheHitMessage: string;
  progress: number;
  chunkProgress: string;
  logs: string[];
  cookieAdminToken: string;
  cookieUploadMessage: string;
  cookieUploadError: string;
  cookieUploadLoading: boolean;
  canDownload: boolean;
  showDebugPreview: boolean;
  onYoutubeUrlChange: (value: string) => void;
  onPreferredLanguageChange: (value: string) => void;
  onCookieAdminTokenChange: (value: string) => void;
  onCookieFileChange: (file: File | null) => void;
  onUploadCookies: () => Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDownload: () => void;
  onLoadDebugPreview: () => void;
};
