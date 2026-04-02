import type { DialogueBlock, ProcessResponse, Speaker, StreamEvent, TranscriptEntry } from "@/types/video-processor";

const GENERIC_SPEAKER_PATTERNS = [
  /^speaker(?:\s+[a-z0-9]+)?$/i,
  /^host$/i,
  /^guest(?:\s+\d+)?$/i,
  /^interviewer$/i,
  /^interviewee$/i,
  /^moderator$/i,
  /^panelist(?:\s+\d+)?$/i,
  /^narrator$/i,
  /^主持人$/,
  /^嘉宾(?:\d+)?$/,
  /^采访者$/,
  /^受访者$/,
  /^讲者(?:\d+)?$/,
  /^旁白$/,
];

function isGenericSpeakerLabel(name?: string | null) {
  if (!name) {
    return false;
  }

  const normalized = name.trim();

  if (!normalized) {
    return false;
  }

  return GENERIC_SPEAKER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isSpecificSpeakerLabel(name?: string | null) {
  return Boolean(name && !isGenericSpeakerLabel(name));
}

function replaceSpeakerName(name: string | undefined, aliasMap: Map<string, string>) {
  if (!name) {
    return name;
  }

  return aliasMap.get(name) ?? name;
}

function applyAliasesToDialogueBlock(block: DialogueBlock, aliasMap: Map<string, string>): DialogueBlock {
  return {
    ...block,
    speaker: replaceSpeakerName(block.speaker, aliasMap) ?? block.speaker,
    questionSpeaker: replaceSpeakerName(block.questionSpeaker, aliasMap),
    answerSpeaker: replaceSpeakerName(block.answerSpeaker, aliasMap),
  };
}

function applyAliasesToSpeakers(speakers: Speaker[], aliasMap: Map<string, string>) {
  return Array.from(
    new Map(
      speakers.map((speaker) => {
        const canonicalName = replaceSpeakerName(speaker.name, aliasMap) ?? speaker.name;
        const merged = {
          ...speaker,
          name: canonicalName,
        };

        return [canonicalName, merged] as const;
      }),
    ).values(),
  );
}

export function applySpeakerAliases(
  response: ProcessResponse,
  aliasMap: Map<string, string>,
): ProcessResponse {
  if (!aliasMap.size) {
    return response;
  }

  return {
    ...response,
    speakers: applyAliasesToSpeakers(response.speakers, aliasMap),
    dialogueBlocks: response.dialogueBlocks.map((block) =>
      applyAliasesToDialogueBlock(block, aliasMap),
    ),
  };
}

function getGenericRoleNames(blocks: DialogueBlock[], key: "questionSpeaker" | "answerSpeaker") {
  return Array.from(
    new Set(
      blocks
        .map((block) => block[key])
        .filter((speaker): speaker is string => Boolean(speaker && isGenericSpeakerLabel(speaker))),
    ),
  );
}

function getSpecificRoleName(blocks: DialogueBlock[], key: "questionSpeaker" | "answerSpeaker") {
  const matches = blocks
    .map((block) => block[key])
    .filter((speaker): speaker is string => Boolean(speaker && isSpecificSpeakerLabel(speaker)));

  return matches.length === 1 ? matches[0] : null;
}

export function buildSpeakerAliasMap(
  previous: ProcessResponse | null,
  next: ProcessResponse,
): Map<string, string> {
  const aliasMap = new Map<string, string>();

  if (!previous) {
    return aliasMap;
  }

  const previousQuestionGenerics = getGenericRoleNames(previous.dialogueBlocks, "questionSpeaker");
  const previousAnswerGenerics = getGenericRoleNames(previous.dialogueBlocks, "answerSpeaker");
  const nextQuestionSpecific = getSpecificRoleName(next.dialogueBlocks, "questionSpeaker");
  const nextAnswerSpecific = getSpecificRoleName(next.dialogueBlocks, "answerSpeaker");

  if (nextQuestionSpecific) {
    for (const genericName of previousQuestionGenerics) {
      aliasMap.set(genericName, nextQuestionSpecific);
    }
  }

  if (nextAnswerSpecific) {
    for (const genericName of previousAnswerGenerics) {
      aliasMap.set(genericName, nextAnswerSpecific);
    }
  }

  if (nextQuestionSpecific || nextAnswerSpecific) {
    for (const speaker of previous.speakers) {
      if (!isGenericSpeakerLabel(speaker.name)) {
        continue;
      }

      if (!aliasMap.has(speaker.name) && nextAnswerSpecific) {
        aliasMap.set(speaker.name, nextAnswerSpecific);
      }
    }
  }

  return aliasMap;
}

export function buildTranscriptFailureMessage(diagnostics: string[]) {
  const uniqueDiagnostics = Array.from(new Set(diagnostics.filter(Boolean)));
  const head = uniqueDiagnostics.slice(0, 4);
  const tail = uniqueDiagnostics.slice(-6);
  const details = Array.from(new Set([...head, ...tail])).join("；");

  return `未获取到可用字幕。排查信息：${details}`;
}

export function streamEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: StreamEvent,
) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

export function buildStats(transcriptEntries: TranscriptEntry[], chunkCount: number) {
  const transcriptCharacters = transcriptEntries.reduce((sum, entry) => sum + entry.text.length, 0);
  const start = transcriptEntries[0]?.start ?? 0;
  const end = transcriptEntries[transcriptEntries.length - 1]?.end ?? 0;

  return {
    chunkCount,
    transcriptCharacters,
    transcriptEntries: transcriptEntries.length,
    estimatedMinutes: Number(((end - start) / 60).toFixed(1)),
  };
}

export function mergeProcessResponses(
  previous: ProcessResponse | null,
  next: ProcessResponse,
  chunkSummary: string,
) {
  if (!previous) {
    return next;
  }

  return {
    ...next,
    title: previous.title === "AI 对话整理稿" ? next.title : previous.title,
    summary: [previous.summary, chunkSummary].filter(Boolean).join("\n\n"),
    speakers: Array.from(
      new Map(
        [...previous.speakers, ...next.speakers].map((speaker) => [speaker.name, speaker] as const),
      ).values(),
    ),
    dialogueBlocks: [...previous.dialogueBlocks, ...next.dialogueBlocks],
    rawMarkdown: [previous.rawMarkdown, next.rawMarkdown].filter(Boolean).join("\n\n"),
  };
}

export function buildKnownSpeakers(previous: string[], response: ProcessResponse) {
  return Array.from(
    new Set([
      ...previous,
      ...response.speakers.map((speaker) => speaker.name),
      ...response.dialogueBlocks.flatMap((block) =>
        [block.questionSpeaker, block.answerSpeaker, block.speaker].filter(
          (speaker): speaker is string => Boolean(speaker),
        ),
      ),
    ]),
  );
}

export function normalizeTranscriptEntries(
  captions: Array<{ start: number; dur: number; text: string }>,
): TranscriptEntry[] {
  return captions.map((item) => ({
    index: item.start,
    start: item.start,
    end: item.start + item.dur,
    text: item.text.replace(/\s+/g, " ").trim(),
  }));
}
