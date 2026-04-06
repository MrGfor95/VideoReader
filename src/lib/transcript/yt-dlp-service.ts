import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fetchWithProxy, getProxyUrl } from "@/lib/network/proxy";
import { getManagedCookiesPath } from "@/server/cookies";
import {
  DEFAULT_YTDLP_COOKIES_MODE,
  DEFAULT_YTDLP_PROXY_URL,
  DEFAULT_YTDLP_REMOTE_COMPONENTS,
  DEFAULT_YTDLP_RETRY_COUNT,
  DEFAULT_YTDLP_SOCKET_TIMEOUT_SECONDS,
  PREFERRED_YTDLP_FETCH_LANGUAGES,
  PREFERRED_YTDLP_LANGUAGES,
} from "@/lib/transcript/constants";
import { normalizeCaptionItems } from "@/lib/transcript/shared";
import { parseTimestamp } from "@/lib/transcript/timecode";
import type {
  CaptionItem,
  SubtitleFormat,
  TranscriptFetchResult,
  YtDlpCookiesMode,
  YtDlpInfo,
} from "@/lib/transcript/types";

const execFileAsync = promisify(execFile);
let resolvedPythonCommand: string[] | null = null;

function getRemoteComponents() {
  return process.env.YTDLP_REMOTE_COMPONENTS?.trim() || DEFAULT_YTDLP_REMOTE_COMPONENTS;
}

function getYtDlpSocketTimeoutSeconds() {
  const value = Number(process.env.YTDLP_SOCKET_TIMEOUT_SECONDS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_YTDLP_SOCKET_TIMEOUT_SECONDS;
}

function getYtDlpRetryCount() {
  const value = Number(process.env.YTDLP_RETRY_COUNT);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : DEFAULT_YTDLP_RETRY_COUNT;
}

function getYtDlpCookiesMode(): YtDlpCookiesMode {
  const mode = process.env.YTDLP_COOKIES_MODE?.trim();
  if (mode === "never" || mode === "required") {
    return mode;
  }

  return DEFAULT_YTDLP_COOKIES_MODE as YtDlpCookiesMode;
}

function getYtDlpProxyUrl() {
  const proxyUrl = process.env.YTDLP_PROXY_URL?.trim() || DEFAULT_YTDLP_PROXY_URL || getProxyUrl();

  if (!proxyUrl) {
    return null;
  }

  return proxyUrl
    .replace(/^https?:\/\/127\.0\.0\.1:7890$/i, "socks5://127.0.0.1:7890")
    .replace(/^https?:\/\/localhost:7890$/i, "socks5://127.0.0.1:7890");
}

function buildYtDlpHints(message: string, proxyUrl?: string) {
  const hints: string[] = [];

  if (message.includes("No supported JavaScript runtime could be found")) {
    hints.push("yt-dlp 需要启用 JS runtime，当前版本已默认追加 --js-runtimes node。");
  }

  if (message.includes("Sign in to confirm you’re not a bot")) {
    hints.push("YouTube 触发了登录态 / 机器人验证。当前更像是被风控拦截，而不是视频真的没有字幕。建议补充可用 cookies，或切换更稳定的代理出口。");
  }

  if (message.includes("Requested format is not available")) {
    hints.push("YouTube 在当前会话下只返回了受限元数据，字幕轨道也可能一并被隐藏。这个信号通常和风控/登录态有关，不一定说明视频本身没有字幕。");
  }

  if (message.includes("Read timed out")) {
    hints.push("当前失败点更像网络超时而不是字幕不存在。建议优先配置代理；如果仍要直连，可继续提高 YTDLP_SOCKET_TIMEOUT_SECONDS。");
  }

  if (message.includes("UNEXPECTED_EOF_WHILE_READING")) {
    if (proxyUrl?.includes("127.0.0.1:7890")) {
      hints.push("当前更像是 mixed 端口 7890 走 HTTP 代理时与 YouTube TLS 链路不稳定。yt-dlp 更适合改用 socks5://127.0.0.1:7890。");
    } else {
      hints.push("当前更像是代理与 YouTube TLS 链路不稳定。建议切换代理出口，或改用显式的 HTTP / SOCKS5 代理地址。");
    }
  }

  return hints;
}

function collectRelevantYtDlpMessages(stderr: string) {
  return stderr
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.startsWith("WARNING:") || line.startsWith("ERROR:"))
    .slice(0, 3);
}

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

async function resolveYtDlpCookiesFile(cookiesMode: YtDlpCookiesMode, tempDir?: string) {
  if (cookiesMode === "never") {
    return null;
  }

  const configuredPath = getManagedCookiesPath();

  if (configuredPath) {
    try {
      await access(configuredPath);
      return configuredPath;
    } catch {
      if (cookiesMode === "required") {
        throw new Error("YTDLP_COOKIES_MODE=required，但 YTDLP_COOKIES_PATH 指向的文件不存在。");
      }

      return null;
    }
  }

  const encodedCookies = process.env.YTDLP_COOKIES_B64?.trim();
  const rawCookies = process.env.YTDLP_COOKIES?.trim();
  const cookiesContent = encodedCookies
    ? Buffer.from(encodedCookies, "base64").toString("utf8")
    : rawCookies;

  if (!cookiesContent || !tempDir) {
    if (cookiesMode === "required") {
      throw new Error("YTDLP_COOKIES_MODE=required，但未配置可用的 YouTube cookies。");
    }

    return null;
  }

  const cookiesPath = join(tempDir, "youtube-cookies.txt");
  await writeFile(cookiesPath, cookiesContent, "utf8");
  return cookiesPath;
}

async function buildYtDlpCommandArgs(baseArgs: string[], videoUrl: string, tempDir?: string) {
  const args = [
    ...baseArgs,
    "--js-runtimes",
    "node",
    "--ignore-no-formats-error",
    "--socket-timeout",
    String(getYtDlpSocketTimeoutSeconds()),
    "--retries",
    String(getYtDlpRetryCount()),
    "--extractor-retries",
    String(getYtDlpRetryCount()),
  ];
  const proxyUrl = getYtDlpProxyUrl();
  const cookiesMode = getYtDlpCookiesMode();
  const cookiesPath = await resolveYtDlpCookiesFile(cookiesMode, tempDir);
  const remoteComponents = getRemoteComponents();

  if (proxyUrl) {
    args.push("--proxy", proxyUrl);
  }

  if (cookiesPath) {
    args.push("--cookies", cookiesPath);
  }

  if (remoteComponents) {
    args.push("--remote-components", remoteComponents);
  }

  args.push(videoUrl);

  return { args, proxyUrl, cookiesPath, remoteComponents, cookiesMode };
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
  const tempDir = await mkdtemp(join(tmpdir(), "gemini-video2text-ytinfo-"));

  try {
    const buildResult = await buildYtDlpCommandArgs(
      [...baseArgs, "--dump-single-json", "--skip-download"],
      videoUrl,
      tempDir,
    );

    const { stdout, stderr } = await execFileAsync(executable, buildResult.args, {
      maxBuffer: 20 * 1024 * 1024,
    });

    return {
      info: JSON.parse(stdout) as YtDlpInfo,
      ...buildResult,
      stderr,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function downloadSubtitleWithYtDlp(videoUrl: string) {
  const tempDir = await mkdtemp(join(tmpdir(), "gemini-video2text-"));
  const pythonCommand = await resolvePythonForYtDlp();
  const [executable, ...baseArgs] = pythonCommand;
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
  let stderrOutput = "";

  try {
    try {
      const { args: finalArgs } = await buildYtDlpCommandArgs(args, videoUrl, tempDir);
      const { stderr } = await execFileAsync(executable, finalArgs, {
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
  const diagnostics: string[] = [];
  const defaultProxyUrl = getYtDlpProxyUrl();
  diagnostics.push(`yt-dlp 当前代理：${defaultProxyUrl ?? "未配置代理"}`);
  diagnostics.push(`yt-dlp cookies 模式：${getYtDlpCookiesMode()}`);
  diagnostics.push(`yt-dlp remote components：${getRemoteComponents() || "未配置"}`);
  diagnostics.push(`yt-dlp socket timeout：${getYtDlpSocketTimeoutSeconds()}s`);
  diagnostics.push(`yt-dlp retry count：${getYtDlpRetryCount()}`);

  try {
    const { info, stderr, cookiesPath, proxyUrl } = await loadYtDlpInfo(videoUrl);
    diagnostics[0] = `yt-dlp 当前代理：${proxyUrl ?? "未配置代理"}`;
    diagnostics.splice(
      2,
      0,
      `yt-dlp cookies：${cookiesPath ? `已启用 (${cookiesPath})` : "未启用"}`,
    );
    const manualLanguages = Object.keys(info.subtitles ?? {});
    const autoLanguages = Object.keys(info.automatic_captions ?? {});

    diagnostics.push(`yt-dlp 检测到人工字幕语言数：${manualLanguages.length}`);
    diagnostics.push(`yt-dlp 检测到自动字幕语言数：${autoLanguages.length}`);

    if (autoLanguages.length) {
      diagnostics.push(`yt-dlp 自动字幕示例语言：${autoLanguages.slice(0, 6).join(", ")}`);
    }

    if (stderr.trim()) {
      const relevantMessages = collectRelevantYtDlpMessages(stderr);

      if (relevantMessages.length) {
        diagnostics.push(`yt-dlp 提示：${relevantMessages.join("；")}`);
      } else {
        diagnostics.push(`yt-dlp 提示：${stderr.trim().split("\n")[0]}`);
      }
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

    const combinedMessage = [stderr, ...downloaded.diagnostics].filter(Boolean).join("\n");
    const hints = buildYtDlpHints(combinedMessage, proxyUrl);

    if (manualLanguages.length === 0 && autoLanguages.length === 0 && hints.length) {
      diagnostics.push("yt-dlp 未返回任何字幕语言，当前更像被 YouTube 风控或登录态校验拦截，而不是视频本身没有字幕。");
    }

    return {
      captions: [],
      diagnostics: [...diagnostics, "yt-dlp 已发现字幕轨道，但未能解析出字幕内容", ...hints],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    const hints = buildYtDlpHints(message, defaultProxyUrl);

    return {
      captions: [],
      diagnostics: [...diagnostics, `yt-dlp 执行失败：${message}`, ...hints],
    };
  }
}
