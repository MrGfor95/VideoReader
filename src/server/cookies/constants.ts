import { join } from "node:path";
import { tmpdir } from "node:os";

export const DEFAULT_MANAGED_COOKIES_PATH = join(
  tmpdir(),
  "gemini-video2text-managed-cookies.txt",
);
