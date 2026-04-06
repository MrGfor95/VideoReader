export type CaptionItem = {
  start: number;
  dur: number;
  text: string;
};

export type TranscriptFetchResult = {
  captions: CaptionItem[];
  diagnostics: string[];
};

export type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  name?: {
    simpleText?: string;
  };
  kind?: string;
  vssId?: string;
};

export type SubtitleFormat = {
  ext?: string;
  url?: string;
};

export type YtDlpCookiesMode = "auto" | "never" | "required";

export type YtDlpInfo = {
  subtitles?: Record<string, SubtitleFormat[]>;
  automatic_captions?: Record<string, SubtitleFormat[]>;
};
