import type { ProcessResponse } from "@/types/video-processor";

const inflightResultMap = new Map<string, Promise<ProcessResponse>>();

function buildInflightKey(input: { preferredLanguage: string; videoId: string }) {
  return `${input.videoId.trim().toLowerCase()}::${input.preferredLanguage.trim().toLowerCase()}`;
}

export function getInflightResult(input: { preferredLanguage: string; videoId: string }) {
  return inflightResultMap.get(buildInflightKey(input)) ?? null;
}

export function setInflightResult(
  input: { preferredLanguage: string; videoId: string },
  promise: Promise<ProcessResponse>,
) {
  const key = buildInflightKey(input);
  inflightResultMap.set(key, promise);

  promise.finally(() => {
    if (inflightResultMap.get(key) === promise) {
      inflightResultMap.delete(key);
    }
  });
}
