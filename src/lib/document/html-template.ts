import { HTML_DOCUMENT_DISCLAIMER, HTML_DOCUMENT_STYLE } from "@/lib/document/constants";
import type { ProcessResponse } from "@/types/video-processor";

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildHtmlDocument(result: ProcessResponse) {
  const speakerTags = result.speakers
    .map((speaker) => `<span class="speaker-tag">${escapeHtml(speaker.name)}</span>`)
    .join("");

  const blocks = result.dialogueBlocks
    .map((block, index, list) => {
      const previousChapter = index > 0 ? list[index - 1]?.chapterTitle : "";
      const chapterMarkup =
        block.chapterTitle && block.chapterTitle !== previousChapter
          ? `<section class="chapter-title">${escapeHtml(block.chapterTitle)}</section>`
          : "";

      return `
        ${chapterMarkup}
        <article class="block">
          <h3>${escapeHtml(block.title || block.speaker)}</h3>
          <div class="qa">
            <div class="qa-row">
              <header>
                <strong>${escapeHtml(block.questionSpeaker || block.speaker)}</strong>
                ${block.timecode ? `<span>${escapeHtml(block.timecode)}</span>` : ""}
              </header>
              <p>${escapeHtml(block.question || block.title || block.text).replaceAll("\n", "<br />")}</p>
            </div>
            <div class="qa-row">
              <header>
                <strong>${escapeHtml(block.answerSpeaker || block.speaker)}</strong>
              </header>
              <p>${escapeHtml(block.answer || block.text).replaceAll("\n", "<br />")}</p>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(result.title)}</title>
    <style>
${HTML_DOCUMENT_STYLE}
    </style>
  </head>
  <body>
    <main>
      <section class="paper">
        <h1>${escapeHtml(result.title)}</h1>
        <p class="summary">${escapeHtml(result.summary)}</p>
        <div class="speaker-list">${speakerTags}</div>
        <section class="block-list">${blocks}</section>
        <footer>${HTML_DOCUMENT_DISCLAIMER}</footer>
      </section>
    </main>
  </body>
</html>`;
}
