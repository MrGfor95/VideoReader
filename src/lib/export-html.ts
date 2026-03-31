import type { ProcessResponse } from "@/types/video-processor";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildHtmlDocument(result: ProcessResponse) {
  const speakerTags = result.speakers
    .map((speaker) => `<span class="speaker-tag">${escapeHtml(speaker.name)}</span>`)
    .join("");

  const blocks = result.dialogueBlocks
    .map(
      (block) => `
        <article class="block">
          <h3>${escapeHtml(block.title || block.speaker)}</h3>
          <header>
            <strong>${escapeHtml(block.speaker)}</strong>
            ${block.timecode ? `<span>${escapeHtml(block.timecode)}</span>` : ""}
          </header>
          <p>${escapeHtml(block.text).replaceAll("\n", "<br />")}</p>
        </article>
      `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(result.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5efe1;
        --paper: #fffaf1;
        --ink: #23170f;
        --muted: #6f5d51;
        --line: rgba(74, 48, 26, 0.14);
        --accent: #b85c38;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(184, 92, 56, 0.12), transparent 28%),
          linear-gradient(180deg, #f6efe1 0%, #efe4d0 100%);
      }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 40px 20px 72px;
      }
      .paper {
        background: rgba(255, 250, 241, 0.95);
        border: 1px solid var(--line);
        border-radius: 28px;
        box-shadow: 0 20px 50px rgba(74, 48, 26, 0.12);
        padding: 28px;
      }
      h1 { font-size: 2.3rem; margin: 0; }
      .summary {
        color: var(--muted);
        line-height: 1.8;
        margin-top: 16px;
      }
      .speaker-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 18px;
      }
      .speaker-tag {
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 6px 12px;
        background: white;
        font-size: 0.95rem;
      }
      .block-list {
        margin-top: 28px;
        display: grid;
        gap: 16px;
      }
      .block {
        border: 1px solid var(--line);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.82);
        padding: 18px;
      }
      .block h3 {
        margin: 0 0 10px;
        font-size: 1.4rem;
        line-height: 1.4;
      }
      .block header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: var(--muted);
      }
      .block p {
        margin: 12px 0 0;
        line-height: 1.9;
        white-space: normal;
      }
      footer {
        margin-top: 28px;
        color: var(--muted);
        line-height: 1.8;
        font-size: 0.95rem;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="paper">
        <h1>${escapeHtml(result.title)}</h1>
        <p class="summary">${escapeHtml(result.summary)}</p>
        <div class="speaker-list">${speakerTags}</div>
        <section class="block-list">${blocks}</section>
        <footer>
          免责声明：仅供个人学习与整理使用，请遵守 YouTube 内容条款与原始内容版权要求。
        </footer>
      </section>
    </main>
  </body>
</html>`;
}

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
