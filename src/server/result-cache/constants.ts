import { join } from "node:path";
import { tmpdir } from "node:os";

export const DEFAULT_DEMO_RESULT_CACHE_PATH = join(
  tmpdir(),
  "gemini-video2text-demo-result.json",
);
