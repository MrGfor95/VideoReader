import { join } from "node:path";
import { tmpdir } from "node:os";

export const DEFAULT_RESULT_CACHE_DIRECTORY = join(
  tmpdir(),
  "gemini-video2text-result-cache",
);
