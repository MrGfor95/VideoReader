import type { CaptionItem } from "@/lib/transcript/types";

export function decodeHtmlEntities(text: string) {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

export function normalizeCaptionItems(captions: CaptionItem[]) {
  return captions.map((item) => ({
    ...item,
    text: item.text.replace(/\s+/g, " ").trim(),
  }));
}
