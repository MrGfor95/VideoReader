export const PREFERRED_CAPTION_LANGUAGES = ["en-orig", "en", "en-US", "zh-Hans", "zh-CN", "zh"];
export const PREFERRED_YTDLP_LANGUAGES = "en-orig,en,en-US,zh-Hans,zh-CN,zh";
export const PREFERRED_YTDLP_FETCH_LANGUAGES = ["en-orig", "en", "en-US"];

export const MAX_CHARS_PER_CHUNK = 24000;
export const MAX_ENTRIES_PER_CHUNK = 320;
export const MAX_SECONDS_PER_CHUNK = 18 * 60;

export const YOUTUBE_WATCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
} as const;

export const YOUTUBE_TRACK_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
} as const;
