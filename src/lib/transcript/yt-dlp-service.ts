import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fetchWithProxy, getProxyUrl } from "@/lib/network/proxy";
import {
  PREFERRED_YTDLP_FETCH_LANGUAGES,
  PREFERRED_YTDLP_LANGUAGES,
} from "@/lib/transcript/constants";
import { normalizeCaptionItems } from "@/lib/transcript/shared";
import { parseTimestamp } from "@/lib/transcript/timecode";
import type {
  CaptionItem,
  SubtitleFormat,
  TranscriptFetchResult,
  YtDlpInfo,
} from "@/lib/transcript/types";

const execFileAsync = promisify(execFile);
let resolvedPythonCommand: string[] | null = null;

function looksLikeYtDlpBinary(value: string) {
  return /(^|[\\/])(yt-dlp|yt_dlp)(\.exe)?$/i.test(value);
}

function getConfiguredYtDlpCandidates(value: string) {
  if (!value.trim()) {
    return [];
  }

  return looksLikeYtDlpBinary(value)
    ? [[value]]
    : [
        [value, "-m", "yt_dlp"],
        [value],
      ];
}

async function canRunYtDlp(command: string[]) {
  try {
    const [executable, ...args] = command;
    await execFileAsync(executable, [...args, "--version"], {
      maxBuffer: 5 * 1024 * 1024,
    });
    return true;
  } catch {
    return false;
  }
}

async function resolvePythonForYtDlp() {
  if (resolvedPythonCommand) {
    return resolvedPythonCommand;
  }

  const configured = process.env.PYTHON_FOR_YTDLP;
  const candidates: string[][] = [];

  if (configured) {
    candidates.push(...getConfiguredYtDlpCandidates(configured));
  }

  candidates.push(
    ["yt-dlp"],
    ["yt_dlp"],
    ["python3", "-m", "yt_dlp"],
    ["/usr/bin/python3", "-m", "yt_dlp"],
    ["/usr/local/bin/python3", "-m", "yt_dlp"],
    ["C:\\Python312\\python.exe", "-m", "yt_dlp"],
    ["py", "-m", "yt_dlp"],
    ["python", "-m", "yt_dlp"],
  );

  for (const candidate of candidates) {
    const executable = candidate[0];

    if (executable.includes("\\") || executable.includes("/")) {
      try {
        await access(executable);
      } catch {
        continue;
      }
    }

    if (await canRunYtDlp(candidate)) {
      resolvedPythonCommand = candidate;
      return candidate;
    }
  }

  throw new Error(
    "未找到可用的 yt-dlp 执行环境。可通过环境变量 PYTHON_FOR_YTDLP 指定，例如 Linux 用 python3 或 /usr/bin/python3，Windows 用 C:\\Python312\\python.exe",
  );
}

function decodeText(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function parseVtt(content: string): CaptionItem[] {
  const blocks = content
    .replace(/\r/g, "")
    .split("\n\n")
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.flatMap((block) => {
    const lines = block.split("\n").filter(Boolean);
    const timeLine = lines.find((line) => line.includes("-->"));

    if (!timeLine) {
      return [];
    }

    const [startRaw, endRaw] = timeLine.split("-->").map((item) => item.trim());
    const text = lines
      .filter((line) => line !== timeLine && !/^\d+$/.test(line))
      .join(" ")
      .trim();

    if (!text) {
      return [];
    }

    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw.split(" ")[0] ?? endRaw);

    return [
      {
        start,
        dur: Math.max(0, end - start),
        text: decodeText(text).replace(/<[^>]+>/g, "").trim(),
      },
    ];
  });
}

function parseJson3(content: string): CaptionItem[] {
  try {
    const payload = JSON.parse(content) as {
      events?: Array<{
        tStartMs?: number;
        dDurationMs?: number;
        segs?: Array<{ utf8?: string }>;
      }>;
    };

    return (payload.events ?? [])
      .map((event) => {
        const text = (event.segs ?? [])
          .map((segment) => segment.utf8 ?? "")
          .join("")
          .replace(/\n/g, " ")
          .trim();

        if (!text) {
          return null;
        }

        return {
          start: (event.tStartMs ?? 0) / 1000,
          dur: (event.dDurationMs ?? 0) / 1000,
          text: decodeText(text),
        };
      })
      .filter((item): item is CaptionItem => Boolean(item));
  } catch {
    return [];
  }
}

function rankLanguages(entries: Array<[string, SubtitleFormat[]]>) {
  return entries.sort(([left], [right]) => {
    const leftIndex = PREFERRED_YTDLP_FETCH_LANGUAGES.findIndex((item) => left.startsWith(item));
    const rightIndex = PREFERRED_YTDLP_FETCH_LANGUAGES.findIndex((item) => right.startsWith(item));
    const safeLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const safeRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    return safeLeft - safeRight;
  });
}

function chooseSubtitleFormat(tracks: SubtitleFormat[]) {
  const formats = ["json3", "srv3", "vtt", "ttml"];

  for (const format of formats) {
    const found = tracks.find((track) => track.ext === format && track.url);

    if (found?.url) {
      return found;
    }
  }

  return tracks.find((track) => track.url);
}

async function fetchSubtitleByFormat(track: SubtitleFormat) {
  if (!track.url) {
    return [];
  }

  const response = await fetchWithProxy(track.url, { cache: "no-store" });

  if (!response.ok) {
    return [];
  }

  const content = await response.text();

  if (track.ext === "json3") {
    return parseJson3(content);
  }

  return parseVtt(content);
}

async function loadYtDlpInfo(videoUrl: string) {
  const pythonCommand = await resolvePythonForYtDlp();
  const [executable, ...baseArgs] = pythonCommand;
  const args = [...baseArgs, "--dump-single-json", "--skip-download"];
  const proxyUrl = getProxyUrl();

  if (proxyUrl) {
    args.push("--proxy", proxyUrl);
  }

  args.push(videoUrl);

  const { stdout, stderr } = await execFileAsync(executable, args, {
    maxBuffer: 20 * 1024 * 1024,
  });

  return {
    info: JSON.parse(stdout) as YtDlpInfo,
    stderr,
  };
}

async function downloadSubtitleWithYtDlp(videoUrl: string) {
  const tempDir = await mkdtemp(join(tmpdir(), "gemini-video2text-"));
  const pythonCommand = await resolvePythonForYtDlp();
  const [executable, ...baseArgs] = pythonCommand;
  const proxyUrl = getProxyUrl();
  const args = [
    ...baseArgs,
    "--skip-download",
    "--write-auto-subs",
    "--write-subs",
    "--sub-langs",
    PREFERRED_YTDLP_LANGUAGES,
    "--sub-format",
    "json3/vtt",
    "-o",
    join(tempDir, "%(id)s.%(ext)s"),
  ];

  if (proxyUrl) {
    args.push("--proxy", proxyUrl);
  }

  args.push(videoUrl);
  let stderrOutput = "";

  try {
    try {
      const { stderr } = await execFileAsync(executable, args, {
        maxBuffer: 20 * 1024 * 1024,
      });
      stderrOutput = stderr;
    } catch (error) {
      stderrOutput =
        error && typeof error === "object" && "stderr" in error
          ? String(error.stderr ?? "")
          : error instanceof Error
            ? error.message
            : "";
    }

    const files = await readdir(tempDir);
    const subtitleFile = files.find((file) => file.endsWith(".json3") || file.endsWith(".vtt"));

    if (!subtitleFile) {
      return {
        content: "",
        ext: "",
        diagnostics: stderrOutput.trim() ? [stderrOutput.trim().split("\n").slice(-1)[0]] : [],
      };
    }

    return {
      content: await readFile(join(tempDir, subtitleFile), "utf8"),
      ext: subtitleFile.endsWith(".json3") ? "json3" : "vtt",
      diagnostics: [
        `yt-dlp 直接下载字幕文件成功：${subtitleFile}`,
        ...(stderrOutput.trim() ? [stderrOutput.trim().split("\n").slice(-1)[0]] : []),
      ],
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function fetchFromGroup(group?: Record<string, SubtitleFormat[]>) {
  if (!group) {
    return [];
  }

  const ranked = rankLanguages(Object.entries(group));

  for (const [, tracks] of ranked) {
    const preferredTrack = chooseSubtitleFormat(tracks);

    if (!preferredTrack) {
      continue;
    }

    const subtitles = await fetchSubtitleByFormat(preferredTrack);

    if (subtitles.length) {
      return normalizeCaptionItems(subtitles);
    }
  }

  return [];
}

export async function fetchTranscriptWithYtDlp(videoUrl: string) {
  try {
    const { info } = await loadYtDlpInfo(videoUrl);
    const manual = await fetchFromGroup(info.subtitles);

    if (manual.length) {
      return manual;
    }

    return fetchFromGroup(info.automatic_captions);
  } catch {
    return [];
  }
}

export async function fetchTranscriptWithYtDlpDetailed(videoUrl: string): Promise<TranscriptFetchResult> {
  const diagnostics: string[] = [`yt-dlp 当前代理：${getProxyUrl() ?? "未配置代理"}`];

  try {
    const { info, stderr } = await loadYtDlpInfo(videoUrl);
    const manualLanguages = Object.keys(info.subtitles ?? {});
    const autoLanguages = Object.keys(info.automatic_captions ?? {});

    diagnostics.push(`yt-dlp 检测到人工字幕语言数：${manualLanguages.length}`);
    diagnostics.push(`yt-dlp 检测到自动字幕语言数：${autoLanguages.length}`);

    if (autoLanguages.length) {
      diagnostics.push(`yt-dlp 自动字幕示例语言：${autoLanguages.slice(0, 6).join(", ")}`);
    }

    if (stderr.trim()) {
      diagnostics.push(`yt-dlp 提示：${stderr.trim().split("\n")[0]}`);
    }

    const manual = await fetchFromGroup(info.subtitles);

    if (manual.length) {
      return {
        captions: manual,
        diagnostics: [...diagnostics, "yt-dlp 人工字幕抓取成功"],
      };
    }

    const automatic = await fetchFromGroup(info.automatic_captions);

    if (automatic.length) {
      return {
        captions: automatic,
        diagnostics: [...diagnostics, "yt-dlp 自动字幕抓取成功"],
      };
    }

    const downloaded = await downloadSubtitleWithYtDlp(videoUrl);
    diagnostics.push(...downloaded.diagnostics);

    if (downloaded.content) {
      const parsed = downloaded.ext === "json3" ? parseJson3(downloaded.content) : parseVtt(downloaded.content);

      if (parsed.length) {
        return {
          captions: normalizeCaptionItems(parsed),
          diagnostics: [...diagnostics, "yt-dlp 文件下载回退解析成功"],
        };
      }
    }

    return {
      captions: [],
      diagnostics: [...diagnostics, "yt-dlp 已发现字幕轨道，但未能解析出字幕内容"],
    };
  } catch (error) {
    return {
      captions: [],
      diagnostics: [...diagnostics, `yt-dlp 执行失败：${error instanceof Error ? error.message : "未知错误"}`],
    };
  }
}
