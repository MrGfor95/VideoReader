import { GoogleGenerativeAI } from "@google/generative-ai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_RESULT_TITLE } from "@/lib/ai/constants";
import { buildChunkConsolidationPrompt, buildTranscriptChunkPrompt } from "@/lib/ai/prompts";
import { buildFallbackResult, mergeSpeakers, normalizeAiResult } from "@/lib/ai/transforms";
import type {
  ConsolidatedChunkSummary,
  ConsolidateChunkResultsInput,
  ProcessTranscriptChunkInput,
} from "@/lib/ai/types";
import { ensureGlobalProxyDispatcher } from "@/lib/network/proxy";
import type { AiTranscriptResult } from "@/types/video-processor";

let client: GoogleGenerativeAI | null = null;

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

function getModelName() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

function parseStrictJson(text: string) {
  return text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}

export function hasGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function processTranscriptChunk({
  transcriptText,
  preferredLanguage,
  knownSpeakers,
}: ProcessTranscriptChunkInput): Promise<AiTranscriptResult> {
  const gemini = getClient();

  if (!gemini) {
    return buildFallbackResult(transcriptText);
  }

  const model = gemini.getGenerativeModel({
    model: getModelName(),
  });

  const response = await model.generateContent(
    buildTranscriptChunkPrompt({
      transcriptText,
      preferredLanguage,
      knownSpeakers,
    }),
  );
  const text = response.response.text();

  try {
    const parsed = JSON.parse(parseStrictJson(text)) as Partial<AiTranscriptResult>;
    return normalizeAiResult(parsed);
  } catch {
    const fallback = buildFallbackResult(transcriptText);

    return {
      ...fallback,
      rawMarkdown: text.trim() || fallback.rawMarkdown,
    };
  }
}

export async function consolidateChunkResults(
  input: ConsolidateChunkResultsInput,
): Promise<ConsolidatedChunkSummary> {
  const gemini = getClient();
  const fallback = {
    title: input.results[0]?.title || DEFAULT_RESULT_TITLE,
    summary: input.results.map((item) => item.summary).join("\n"),
    speakers: mergeSpeakers(input.results),
  };

  if (!gemini || input.results.length <= 1) {
    return fallback;
  }

  const model = gemini.getGenerativeModel({
    model: getModelName(),
  });

  try {
    const response = await model.generateContent(buildChunkConsolidationPrompt(input));
    const parsed = JSON.parse(parseStrictJson(response.response.text())) as Partial<AiTranscriptResult>;

    return {
      title: parsed.title?.trim() || fallback.title,
      summary: parsed.summary?.trim() || fallback.summary,
      speakers:
        Array.isArray(parsed.speakers) && parsed.speakers.length
          ? parsed.speakers
          : fallback.speakers,
    };
  } catch {
    return fallback;
  }
}
