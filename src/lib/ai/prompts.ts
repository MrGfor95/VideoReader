import { GEMINI_MAX_TRANSCRIPT_CHARS } from "@/lib/ai/constants";
import type { AiTranscriptResult } from "@/types/video-processor";

export function buildTranscriptChunkPrompt(input: {
  transcriptText: string;
  preferredLanguage: string;
  knownSpeakers?: string[];
}) {
  const knownSpeakersPrompt =
    input.knownSpeakers && input.knownSpeakers.length
      ? `

Known speakers from previous chunks:
${input.knownSpeakers.map((speaker) => `- ${speaker}`).join("\n")}

Speaker consistency rule:
- Reuse the known speaker labels above whenever they plausibly match the current chunk.
- Do not rename a previously identified speaker unless the transcript strongly proves it is a different person.
- If the identity is unclear, prefer a stable generic label like "Host", "Guest", "Speaker A", or "Speaker B" and keep it consistent.
`
      : "";

  return `
You are an expert transcript editor.
Transform the subtitle transcript into a clean dialogue document.

Rules:
1. Reply in ${input.preferredLanguage}.
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
  "dialogueBlocks": [{
    "chapterTitle": "optional string",
    "title": "string",
    "speaker": "string",
    "text": "string",
    "timecode": "optional string",
  "questionSpeaker": "string",
  "question": "string",
  "answerSpeaker": "string",
    "answer": "string"
  }],
  "rawMarkdown": "string"
}

Formatting expectations for each dialogue block:
- chapterTitle: a broader section heading when the conversation shifts topic. Reuse the same chapterTitle across adjacent blocks if they belong together.
- title: a short subheading for the current block.
- questionSpeaker + question: one clear question or prompt that opens the block.
- answerSpeaker + answer: one main answer that responds directly to the question.
- speaker and text: keep a readable fallback narrative version for compatibility. speaker should usually be the answer speaker, and text should usually be the answer body.
${knownSpeakersPrompt}

Transcript:
"""${input.transcriptText.slice(0, GEMINI_MAX_TRANSCRIPT_CHARS)}"""
  `.trim();
}

export function buildChunkConsolidationPrompt(input: {
  preferredLanguage: string;
  results: AiTranscriptResult[];
}) {
  return `
You are consolidating multiple transcript chunk analyses into one final document summary.
Reply in ${input.preferredLanguage}.
Return strict JSON only:
{
  "title": "string",
  "summary": "string",
  "speakers": [{ "name": "string", "description": "string" }]
}

Chunk analyses:
${input.results
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
}
