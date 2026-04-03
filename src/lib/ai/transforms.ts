import {
  DEFAULT_RESULT_BLOCK_TEXT,
  DEFAULT_RESULT_BLOCK_TITLE,
  DEFAULT_RESULT_ANSWER,
  DEFAULT_RESULT_QUESTION,
  DEFAULT_RESULT_SUMMARY,
  DEFAULT_RESULT_TITLE,
  FALLBACK_BLOCK_TITLE,
  FALLBACK_QUOTA_SUMMARY,
  FALLBACK_SPEAKER_DESCRIPTION,
  FALLBACK_SUMMARY,
  FALLBACK_TITLE,
} from "@/lib/ai/constants";
import type { AiTranscriptResult, DialogueBlock, Speaker } from "@/types/video-processor";

function isChineseLanguage(preferredLanguage?: string) {
  return Boolean(preferredLanguage && /^zh\b/i.test(preferredLanguage));
}

function getGenericLabels(preferredLanguage?: string) {
  return isChineseLanguage(preferredLanguage)
    ? {
        host: "主持人",
        guest: "嘉宾",
      }
    : {
        host: "Host",
        guest: "Guest",
      };
}

function isGenericSpeakerName(name?: string | null) {
  if (!name) {
    return true;
  }

  return /^(speaker(?:\s+[a-z0-9]+)?|host|guest(?:\s+\d+)?|speaker a|speaker b|主持人|嘉宾(?:\d+)?|讲者(?:\d+)?)$/i.test(
    name.trim(),
  );
}

function normalizeRoleName(
  name: string | undefined,
  fallback: string,
) {
  const trimmed = name?.trim();

  if (!trimmed || isGenericSpeakerName(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function normalizeDialogueBlockRoles(block: DialogueBlock, preferredLanguage?: string): DialogueBlock {
  const labels = getGenericLabels(preferredLanguage);
  let questionSpeaker = normalizeRoleName(block.questionSpeaker, labels.host);
  let answerSpeaker = normalizeRoleName(block.answerSpeaker, labels.guest);

  if (questionSpeaker === answerSpeaker) {
    if (questionSpeaker === labels.host || questionSpeaker === labels.guest) {
      questionSpeaker = labels.host;
      answerSpeaker = labels.guest;
    } else {
      questionSpeaker = labels.host;
    }
  }

  return {
    ...block,
    questionSpeaker,
    answerSpeaker,
    speaker: normalizeRoleName(block.speaker, answerSpeaker),
  };
}

function collectSpeakersFromBlocks(
  speakers: Speaker[],
  dialogueBlocks: DialogueBlock[],
) {
  return Array.from(
    new Map(
      [
        ...speakers,
        ...dialogueBlocks.flatMap((block) =>
          [block.questionSpeaker, block.answerSpeaker, block.speaker]
            .filter((name): name is string => Boolean(name))
            .map((name) => ({ name })),
        ),
      ].map((speaker) => [speaker.name, speaker] as const),
    ).values(),
  );
}

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
  preferredLanguage?: string,
): AiTranscriptResult {
  const labels = getGenericLabels(preferredLanguage);
  const paragraphs = transcriptText
    .trim()
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const dialogueBlocks: DialogueBlock[] = paragraphs.slice(0, 12).map((text) => ({
    chapterTitle: FALLBACK_BLOCK_TITLE,
    title: FALLBACK_BLOCK_TITLE,
    speaker: labels.guest,
    text,
    questionSpeaker: labels.host,
    question: text,
    answerSpeaker: labels.guest,
    answer: text,
  }));

  return {
    title: FALLBACK_TITLE,
    summary,
    speakers: [
      {
        name: labels.host,
        description: FALLBACK_SPEAKER_DESCRIPTION,
      },
      {
        name: labels.guest,
        description: FALLBACK_SPEAKER_DESCRIPTION,
      },
    ],
    dialogueBlocks,
    rawMarkdown: dialogueBlocks
      .map((block) => `### ${block.title || block.speaker}\n\n**${block.speaker}:** ${block.text}`)
      .join("\n\n"),
  };
}

export function buildQuotaFallbackResult(transcriptText: string, preferredLanguage?: string) {
  return buildFallbackResult(transcriptText, FALLBACK_QUOTA_SUMMARY, preferredLanguage);
}

export function normalizeAiResult(
  payload: Partial<AiTranscriptResult>,
  preferredLanguage?: string,
) {
  const labels = getGenericLabels(preferredLanguage);
  const dialogueBlocks =
    Array.isArray(payload.dialogueBlocks) && payload.dialogueBlocks.length
      ? payload.dialogueBlocks.map((block) =>
          normalizeDialogueBlockRoles(block, preferredLanguage),
        )
      : [
          {
            title: DEFAULT_RESULT_BLOCK_TITLE,
            speaker: labels.guest,
            text: DEFAULT_RESULT_BLOCK_TEXT,
            questionSpeaker: labels.host,
            question: DEFAULT_RESULT_QUESTION,
            answerSpeaker: labels.guest,
            answer: DEFAULT_RESULT_ANSWER,
          },
        ];

  const speakers = collectSpeakersFromBlocks(
    Array.isArray(payload.speakers) && payload.speakers.length
      ? payload.speakers
      : [{ name: labels.host }, { name: labels.guest }],
    dialogueBlocks,
  );

  return {
    title: payload.title?.trim() || DEFAULT_RESULT_TITLE,
    summary: payload.summary?.trim() || DEFAULT_RESULT_SUMMARY,
    speakers,
    dialogueBlocks,
    rawMarkdown: payload.rawMarkdown?.trim() || "",
  } satisfies AiTranscriptResult;
}
