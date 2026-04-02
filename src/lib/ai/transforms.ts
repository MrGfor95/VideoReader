import {
  DEFAULT_RESULT_BLOCK_TEXT,
  DEFAULT_RESULT_BLOCK_TITLE,
  DEFAULT_RESULT_ANSWER,
  DEFAULT_RESULT_QUESTION,
  DEFAULT_RESULT_SUMMARY,
  DEFAULT_RESULT_TITLE,
  FALLBACK_BLOCK_SPEAKER,
  FALLBACK_BLOCK_TITLE,
  FALLBACK_QUOTA_SUMMARY,
  FALLBACK_SPEAKER_DESCRIPTION,
  FALLBACK_SUMMARY,
  FALLBACK_TITLE,
} from "@/lib/ai/constants";
import type { AiTranscriptResult, DialogueBlock, Speaker } from "@/types/video-processor";

export function mergeSpeakers(results: Array<{ speakers: Speaker[] }>) {
  return Array.from(
    new Map(
      results.flatMap((item) => item.speakers).map((speaker) => [speaker.name, speaker] as const),
    ).values(),
  );
}

export function buildFallbackResult(
  transcriptText: string,
  summary = FALLBACK_SUMMARY,
): AiTranscriptResult {
  const paragraphs = transcriptText
    .trim()
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const dialogueBlocks: DialogueBlock[] = paragraphs.slice(0, 12).map((text) => ({
    chapterTitle: FALLBACK_BLOCK_TITLE,
    title: FALLBACK_BLOCK_TITLE,
    speaker: FALLBACK_BLOCK_SPEAKER,
    text,
    questionSpeaker: FALLBACK_BLOCK_SPEAKER,
    question: text,
    answerSpeaker: FALLBACK_BLOCK_SPEAKER,
    answer: text,
  }));

  return {
    title: FALLBACK_TITLE,
    summary,
    speakers: [
      {
        name: FALLBACK_BLOCK_SPEAKER,
        description: FALLBACK_SPEAKER_DESCRIPTION,
      },
    ],
    dialogueBlocks,
    rawMarkdown: dialogueBlocks
      .map((block) => `### ${block.title || block.speaker}\n\n**${block.speaker}:** ${block.text}`)
      .join("\n\n"),
  };
}

export function buildQuotaFallbackResult(transcriptText: string) {
  return buildFallbackResult(transcriptText, FALLBACK_QUOTA_SUMMARY);
}

export function normalizeAiResult(payload: Partial<AiTranscriptResult>) {
  return {
    title: payload.title?.trim() || DEFAULT_RESULT_TITLE,
    summary: payload.summary?.trim() || DEFAULT_RESULT_SUMMARY,
    speakers:
      Array.isArray(payload.speakers) && payload.speakers.length
        ? payload.speakers
        : [{ name: FALLBACK_BLOCK_SPEAKER }],
    dialogueBlocks:
      Array.isArray(payload.dialogueBlocks) && payload.dialogueBlocks.length
        ? payload.dialogueBlocks
        : [
            {
              title: DEFAULT_RESULT_BLOCK_TITLE,
              speaker: FALLBACK_BLOCK_SPEAKER,
              text: DEFAULT_RESULT_BLOCK_TEXT,
              questionSpeaker: FALLBACK_BLOCK_SPEAKER,
              question: DEFAULT_RESULT_QUESTION,
              answerSpeaker: FALLBACK_BLOCK_SPEAKER,
              answer: DEFAULT_RESULT_ANSWER,
            },
          ],
    rawMarkdown: payload.rawMarkdown?.trim() || "",
  } satisfies AiTranscriptResult;
}
