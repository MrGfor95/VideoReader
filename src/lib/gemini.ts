import { GoogleGenerativeAI } from "@google/generative-ai";
import { ensureGlobalProxyDispatcher } from "@/lib/server-proxy";
import type { AiTranscriptResult, DialogueBlock, Speaker } from "@/types/video-processor";

type ProcessInput = {
  transcriptText: string;
  preferredLanguage: string;
};

let client: GoogleGenerativeAI | null = null;
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  ensureGlobalProxyDispatcher();

  if (!client) {
    client = new GoogleGenerativeAI(apiKey);
  }

  return client;
}

function buildFallbackResult(transcriptText: string): AiTranscriptResult {
  const trimmed = transcriptText.trim();
  const paragraphs = trimmed
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const dialogueBlocks: DialogueBlock[] = paragraphs.slice(0, 12).map((text) => ({
    title: "对话要点",
    speaker: "Speaker",
    text,
  }));

  const speakers: Speaker[] = [{ name: "Speaker", description: "未启用 Gemini 时的默认角色占位。" }];

  return {
    title: "字幕整理草稿",
    summary: "当前未配置 Gemini API Key，系统返回了基础整理结果，可先用于联调前后端流程。",
    speakers,
    dialogueBlocks,
    rawMarkdown: dialogueBlocks
      .map((block) => `### ${block.title || block.speaker}\n\n**${block.speaker}:** ${block.text}`)
      .join("\n\n"),
  };
}

function normalizeResult(payload: Partial<AiTranscriptResult>) {
  return {
    title: payload.title?.trim() || "AI 对话整理稿",
    summary: payload.summary?.trim() || "Gemini 未返回摘要，已使用默认说明。",
    speakers: Array.isArray(payload.speakers) && payload.speakers.length
      ? payload.speakers
      : [{ name: "Speaker" }],
    dialogueBlocks: Array.isArray(payload.dialogueBlocks) && payload.dialogueBlocks.length
      ? payload.dialogueBlocks
      : [{ title: "对话片段", speaker: "Speaker", text: "Gemini 未返回结构化对话，请查看 rawMarkdown。" }],
    rawMarkdown: payload.rawMarkdown?.trim() || "",
  } satisfies AiTranscriptResult;
}

export function hasGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function processTranscriptChunk({
  transcriptText,
  preferredLanguage,
}: ProcessInput): Promise<AiTranscriptResult> {
  const gemini = getClient();

  if (!gemini) {
    return buildFallbackResult(transcriptText);
  }

  const model = gemini.getGenerativeModel({
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  });

  const prompt = `
You are an expert transcript editor.
Transform the subtitle transcript into a clean dialogue document.

Rules:
1. Reply in ${preferredLanguage}.
2. Fix punctuation and merge broken subtitle fragments.
3. Infer speakers conservatively. If uncertain, use generic labels like "Speaker A" or "Host".
4. Do not invent facts or names that are not strongly supported by the transcript.
5. Return strict JSON only.
6. Each dialogue block must include a short section title that summarizes that part of the conversation.

JSON schema:
{
  "title": "string",
  "summary": "string",
  "speakers": [{ "name": "string", "description": "string" }],
  "dialogueBlocks": [{ "title": "string", "speaker": "string", "text": "string", "timecode": "optional string" }],
  "rawMarkdown": "string"
}

Transcript:
"""${transcriptText.slice(0, 180000)}"""
  `.trim();

  const response = await model.generateContent(prompt);
  const text = response.response.text();
  const jsonText = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  try {
    const parsed = JSON.parse(jsonText) as Partial<AiTranscriptResult>;
    return normalizeResult(parsed);
  } catch {
    return {
      ...buildFallbackResult(transcriptText),
      rawMarkdown: text.trim() || buildFallbackResult(transcriptText).rawMarkdown,
    };
  }
}

export async function consolidateChunkResults({
  preferredLanguage,
  results,
}: {
  preferredLanguage: string;
  results: AiTranscriptResult[];
}): Promise<Pick<AiTranscriptResult, "title" | "summary" | "speakers">> {
  const gemini = getClient();

  if (!gemini || results.length <= 1) {
    return {
      title: results[0]?.title || "AI 对话整理稿",
      summary: results.map((item) => item.summary).join("\n"),
      speakers: Array.from(
        new Map(
          results
            .flatMap((item) => item.speakers)
            .map((speaker) => [speaker.name, speaker] as const),
        ).values(),
      ),
    };
  }

  const model = gemini.getGenerativeModel({
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  });

  const prompt = `
You are consolidating multiple transcript chunk analyses into one final document summary.
Reply in ${preferredLanguage}.
Return strict JSON only:
{
  "title": "string",
  "summary": "string",
  "speakers": [{ "name": "string", "description": "string" }]
}

Chunk analyses:
${results
  .map(
    (result, index) => `
Chunk ${index + 1}
Title: ${result.title}
Summary: ${result.summary}
Speakers: ${result.speakers.map((speaker) => speaker.name).join(", ")}
`,
  )
  .join("\n")}
  `.trim();

  try {
    const response = await model.generateContent(prompt);
    const text = response.response.text().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(text) as Partial<AiTranscriptResult>;

    return {
      title: parsed.title?.trim() || results[0]?.title || "AI 对话整理稿",
      summary: parsed.summary?.trim() || results.map((item) => item.summary).join("\n"),
      speakers:
        Array.isArray(parsed.speakers) && parsed.speakers.length
          ? parsed.speakers
          : Array.from(
              new Map(
                results
                  .flatMap((item) => item.speakers)
                  .map((speaker) => [speaker.name, speaker] as const),
              ).values(),
            ),
    };
  } catch {
    return {
      title: results[0]?.title || "AI 对话整理稿",
      summary: results.map((item) => item.summary).join("\n"),
      speakers: Array.from(
        new Map(
          results
            .flatMap((item) => item.speakers)
            .map((speaker) => [speaker.name, speaker] as const),
        ).values(),
      ),
    };
  }
}
