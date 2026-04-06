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
  cookieAdminToken: string;
  cookieUploadMessage: string;
  cookieUploadError: string;
  cookieUploadLoading: boolean;
  loadDebugPreview: () => void;
  setYoutubeUrl: (value: string) => void;
  setPreferredLanguage: (value: string) => void;
  setCookieAdminToken: (value: string) => void;
  setCookieFile: (file: File | null) => void;
  uploadCookies: () => Promise<void>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};
