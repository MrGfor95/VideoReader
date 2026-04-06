import { join } from "node:path";
import { tmpdir } from "node:os";

export const DEFAULT_DEMO_TRANSCRIPT_CACHE_PATH = join(
  tmpdir(),
  "gemini-video2text-demo-transcript.json",
);
