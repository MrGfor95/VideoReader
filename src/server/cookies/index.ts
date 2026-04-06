import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { DEFAULT_MANAGED_COOKIES_PATH } from "@/server/cookies/constants";

function getConfiguredPath() {
  return process.env.YTDLP_COOKIES_PATH?.trim() || process.env.YTDLP_MANAGED_COOKIES_PATH?.trim() || "";
}

export function getManagedCookiesPath() {
  return getConfiguredPath() || DEFAULT_MANAGED_COOKIES_PATH;
}

export function getCookieUploadToken() {
  return process.env.COOKIE_UPLOAD_TOKEN?.trim() || process.env.YTDLP_COOKIE_UPLOAD_TOKEN?.trim() || "";
}

export async function writeManagedCookiesFile(content: string) {
  const targetPath = getManagedCookiesPath();
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, "utf8");
  return targetPath;
}
