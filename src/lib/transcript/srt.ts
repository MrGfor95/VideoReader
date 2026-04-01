import { parseTimestamp } from "@/lib/transcript/timecode";
import type { TranscriptEntry } from "@/types/video-processor";

export function parseSrt(content: string): TranscriptEntry[] {
  const blocks = content
    .replace(/\r/g, "")
    .split("\n\n")
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.flatMap((block, index) => {
    const lines = block.split("\n").filter(Boolean);

    if (lines.length < 2) {
      return [];
    }

    const timeLineIndex = lines[0].includes("-->") ? 0 : 1;
    const timeLine = lines[timeLineIndex];
    const text = lines.slice(timeLineIndex + 1).join(" ").trim();

    if (!timeLine || !text) {
      return [];
    }

    const [start, end] = timeLine.split("-->").map((item) => item.trim());

    if (!start || !end) {
      return [];
    }

    return [
      {
        index: Number(lines[0]) || index + 1,
        start: parseTimestamp(start),
        end: parseTimestamp(end),
        text,
      },
    ];
  });
}
