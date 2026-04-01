import {
  MAX_CHARS_PER_CHUNK,
  MAX_ENTRIES_PER_CHUNK,
  MAX_SECONDS_PER_CHUNK,
} from "@/lib/transcript/constants";
import type { TranscriptEntry } from "@/types/video-processor";

export type TranscriptChunk = {
  index: number;
  entries: TranscriptEntry[];
  text: string;
  start: number;
  end: number;
};

export function chunkTranscriptEntries(entries: TranscriptEntry[]) {
  const chunks: TranscriptChunk[] = [];
  let current: TranscriptEntry[] = [];
  let currentChars = 0;
  let chunkStart = 0;

  function flushChunk() {
    if (!current.length) {
      return;
    }

    chunks.push({
      index: chunks.length,
      entries: current,
      text: current.map((entry) => entry.text).join("\n"),
      start: current[0]?.start ?? 0,
      end: current[current.length - 1]?.end ?? current[0]?.end ?? 0,
    });

    current = [];
    currentChars = 0;
    chunkStart = 0;
  }

  for (const entry of entries) {
    if (!current.length) {
      chunkStart = entry.start;
    }

    const nextChars = currentChars + entry.text.length;
    const nextDuration = entry.end - chunkStart;
    const shouldFlush =
      current.length >= MAX_ENTRIES_PER_CHUNK ||
      nextChars > MAX_CHARS_PER_CHUNK ||
      nextDuration > MAX_SECONDS_PER_CHUNK;

    if (shouldFlush) {
      flushChunk();
      chunkStart = entry.start;
    }

    current.push(entry);
    currentChars += entry.text.length;
  }

  flushChunk();

  return chunks;
}
