import type { ProcessResponse, StreamEvent, TranscriptEntry } from "@/types/video-processor";

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
