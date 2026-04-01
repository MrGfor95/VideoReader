import { buildHtmlDocument } from "@/lib/document/html-template";
import type { ProcessResponse } from "@/types/video-processor";

export function downloadHtmlDocument(result: ProcessResponse) {
  const html = buildHtmlDocument(result);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeTitle = result.title.replace(/[^\w\u4e00-\u9fa5-]+/g, "-").replace(/-+/g, "-");

  anchor.href = url;
  anchor.download = `${safeTitle || "dialogue-document"}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
