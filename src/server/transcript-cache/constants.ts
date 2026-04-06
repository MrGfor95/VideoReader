import { join } from "node:path";
import { DEFAULT_CACHE_ROOT_DIRECTORY } from "@/server/result-cache/constants";

export const DEFAULT_DEMO_TRANSCRIPT_CACHE_PATH = join(
  DEFAULT_CACHE_ROOT_DIRECTORY,
  "demo-transcript.json",
);
