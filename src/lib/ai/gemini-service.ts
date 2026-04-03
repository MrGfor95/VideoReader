import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_RESULT_TITLE,
  MIN_CHUNKS_FOR_CONSOLIDATION,
} from "@/lib/ai/constants";
import { buildChunkConsolidationPrompt, buildTranscriptChunkPrompt } from "@/lib/ai/prompts";
import {
  buildFallbackResult,
  buildQuotaFallbackResult,
  mergeSpeakers,
  normalizeAiResult,
} from "@/lib/ai/transforms";
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

function isGeminiQuotaExceededError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const maybeError = error as {
    message?: string;
    status?: number;
    statusText?: string;
  };

  return (
    maybeError.status === 429 ||
    /429|quota exceeded|resource exhausted|too many requests/i.test(
      `${maybeError.message ?? ""} ${maybeError.statusText ?? ""}`,
    )
  );
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
    return buildFallbackResult(transcriptText, undefined, preferredLanguage);
  }

  const model = gemini.getGenerativeModel({
    model: getModelName(),
  });

  let text = "";

  try {
    const response = await model.generateContent(
      buildTranscriptChunkPrompt({
        transcriptText,
        preferredLanguage,
        knownSpeakers,
      }),
    );
    text = response.response.text();
  } catch (error) {
    if (isGeminiQuotaExceededError(error)) {
      return buildQuotaFallbackResult(transcriptText, preferredLanguage);
    }

    throw error;
  }

  try {
    const parsed = JSON.parse(parseStrictJson(text)) as Partial<AiTranscriptResult>;
    return normalizeAiResult(parsed, preferredLanguage);
  } catch {
    const fallback = buildFallbackResult(transcriptText, undefined, preferredLanguage);

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

  if (!gemini || input.results.length < MIN_CHUNKS_FOR_CONSOLIDATION) {
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
  } catch (error) {
    if (isGeminiQuotaExceededError(error)) {
      return fallback;
    }

    return fallback;
  }
}
