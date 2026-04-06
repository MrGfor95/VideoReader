import { join } from "node:path";

export const DEFAULT_CACHE_ROOT_DIRECTORY = join(process.cwd(), ".cache");

export const DEFAULT_RESULT_CACHE_DIRECTORY = join(
  DEFAULT_CACHE_ROOT_DIRECTORY,
  "result-cache",
);

export const DEFAULT_LATEST_RESULT_CACHE_PATH = join(
  DEFAULT_CACHE_ROOT_DIRECTORY,
  "latest-result.json",
);
