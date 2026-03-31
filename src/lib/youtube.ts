import { getSubtitles } from "youtube-captions-scraper";
import { fetchWithProxy, getProxyUrl } from "@/lib/server-proxy";

type CaptionItem = {
  start: number;
  dur: number;
  text: string;
};

type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  name?: {
    simpleText?: string;
  };
  kind?: string;
  vssId?: string;
};

type TranscriptFetchResult = {
  captions: CaptionItem[];
  diagnostics: string[];
};

function decodeHtmlEntities(text: string) {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#39;", "'");
}

function parseTimedTextXml(xml: string): CaptionItem[] {
  const textMatches = [...xml.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)];

  return textMatches
    .map((match) => {
      const attrs = match[1] ?? "";
      const body = decodeHtmlEntities(match[2] ?? "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .trim();

      const startMatch = attrs.match(/\bstart="([^"]+)"/);
      const durMatch = attrs.match(/\bdur="([^"]+)"/);
      const start = startMatch ? Number.parseFloat(startMatch[1]) : 0;
      const dur = durMatch ? Number.parseFloat(durMatch[1]) : 0;

      if (!body) {
        return null;
      }

      return {
        start,
        dur,
        text: body,
      };
    })
    .filter((item): item is CaptionItem => Boolean(item));
}

function extractCaptionTracksFromHtml(html: string): CaptionTrack[] {
  const match = html.match(/"captions":(\{[\s\S]*?\}),"videoDetails"/);

  if (!match) {
    return [];
  }

  try {
    const captionsPayload = JSON.parse(match[1]) as {
      playerCaptionsTracklistRenderer?: {
        captionTracks?: CaptionTrack[];
      };
    };

    return captionsPayload.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  } catch {
    return [];
  }
}

function sortCaptionTracks(tracks: CaptionTrack[]) {
  const preference = ["en-orig", "en", "en-US", "zh-Hans", "zh-CN", "zh"];

  return [...tracks].sort((left, right) => {
    const leftAuto = left.kind === "asr" ? 1 : 0;
    const rightAuto = right.kind === "asr" ? 1 : 0;

    if (leftAuto !== rightAuto) {
      return leftAuto - rightAuto;
    }

    const leftIndex = preference.findIndex((item) => left.languageCode?.startsWith(item));
    const rightIndex = preference.findIndex((item) => right.languageCode?.startsWith(item));

    const safeLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const safeRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    return safeLeftIndex - safeRightIndex;
  });
}

async function fetchCaptionTracks(videoId: string) {
  try {
    const response = await fetchWithProxy(`https://www.youtube.com/watch?v=${videoId}&hl=zh-CN`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        tracks: [],
        diagnostics: [`YouTube 页面抓取返回状态 ${response.status}`],
      };
    }

    const html = await response.text();
    const tracks = sortCaptionTracks(extractCaptionTracksFromHtml(html));

    return {
      tracks,
      diagnostics: [
        `YouTube 页面解析到 ${tracks.length} 条字幕轨道`,
        `当前代理：${getProxyUrl() ?? "未配置代理"}`,
      ],
    };
  } catch (error) {
    return {
      tracks: [],
      diagnostics: [
        `YouTube 页面抓取失败：${error instanceof Error ? error.message : "未知错误"}`,
        `当前代理：${getProxyUrl() ?? "未配置代理"}`,
      ],
    };
  }
}

async function fetchTrackTranscript(track: CaptionTrack): Promise<CaptionItem[]> {
  const url = new URL(track.baseUrl);
  url.searchParams.set("fmt", "srv3");

  const response = await fetchWithProxy(url.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const xml = await response.text();
  return parseTimedTextXml(xml);
}

async function fetchTranscriptFromTracks(videoId: string): Promise<TranscriptFetchResult> {
  const trackResult = await fetchCaptionTracks(videoId);
  const diagnostics = [...trackResult.diagnostics];

  for (const track of trackResult.tracks) {
    try {
      const subtitles = await fetchTrackTranscript(track);

      if (subtitles.length) {
        return {
          captions: subtitles.map((item) => ({
            ...item,
            text: item.text.replace(/\s+/g, " ").trim(),
          })),
          diagnostics: [
            ...diagnostics,
            `轨道抓取成功：${track.languageCode ?? "unknown"}${track.kind === "asr" ? "（自动字幕）" : ""}`,
          ],
        };
      }
    } catch {
      // Try the next track.
    }
  }

  return {
    captions: [],
    diagnostics: [...diagnostics, "页面轨道存在，但未能成功拉取字幕内容"],
  };
}

async function fetchTranscriptWithScraperDetailed(videoId: string): Promise<TranscriptFetchResult> {
  const diagnostics: string[] = [];
  const candidates = ["en-orig", "en", "en-US", "zh-Hans", "zh-CN", "zh"];

  for (const lang of candidates) {
    try {
      const subtitles = (await getSubtitles({
        videoID: videoId,
        lang,
      })) as CaptionItem[];

      diagnostics.push(`youtube-captions-scraper 尝试语言 ${lang}：${subtitles.length} 条`);

      if (subtitles?.length) {
        return {
          captions: subtitles.map((item) => ({
            ...item,
            text: item.text.replace(/\s+/g, " ").trim(),
          })),
          diagnostics,
        };
      }
    } catch (error) {
      diagnostics.push(
        `youtube-captions-scraper 尝试语言 ${lang} 失败：${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  return {
    captions: [],
    diagnostics,
  };
}

export function extractVideoId(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "").trim() || null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/")[2] ?? null;
      }

      return parsed.searchParams.get("v");
    }

    return null;
  } catch {
    return null;
  }
}

export async function fetchYouTubeTranscript(videoId: string): Promise<CaptionItem[]> {
  const fromTracks = await fetchTranscriptFromTracks(videoId);

  if (fromTracks.captions.length) {
    return fromTracks.captions;
  }

  const fromScraper = await fetchTranscriptWithScraperDetailed(videoId);

  if (fromScraper.captions.length) {
    return fromScraper.captions;
  }

  return [];
}

export async function fetchYouTubeTranscriptWithDiagnostics(videoId: string): Promise<TranscriptFetchResult> {
  const fromTracks = await fetchTranscriptFromTracks(videoId);

  if (fromTracks.captions.length) {
    return fromTracks;
  }

  const fromScraper = await fetchTranscriptWithScraperDetailed(videoId);

  if (fromScraper.captions.length) {
    return {
      captions: fromScraper.captions,
      diagnostics: [...fromTracks.diagnostics, ...fromScraper.diagnostics],
    };
  }

  return {
    captions: [],
    diagnostics: [...fromTracks.diagnostics, ...fromScraper.diagnostics],
  };
}
