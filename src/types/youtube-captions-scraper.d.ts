declare module "youtube-captions-scraper" {
  export type SubtitleItem = {
    start: number;
    dur: number;
    text: string;
  };

  export function getSubtitles(input: {
    videoID: string;
    lang?: string;
  }): Promise<SubtitleItem[]>;
}
