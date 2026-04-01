export const HTML_DOCUMENT_DISCLAIMER =
  "免责声明：仅供个人学习与整理使用，请遵守 YouTube 内容条款与原始内容版权要求。";

export const HTML_DOCUMENT_STYLE = `
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
      .chapter-title {
        font-size: 2.1rem;
        font-weight: 700;
        line-height: 1.3;
        margin-top: 12px;
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
      .qa {
        display: grid;
        gap: 18px;
        margin-top: 14px;
      }
      .qa-row p {
        margin: 8px 0 0;
        line-height: 1.9;
      }
      .block > p {
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
`;
