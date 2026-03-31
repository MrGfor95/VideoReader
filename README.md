# Gemini Video2Text

输入 YouTube 视频链接或上传 `.srt` 字幕文件，调用 Gemini 对字幕进行清洗、摘要和角色推断，最终导出可离线查看的 HTML 对话文档。

## Quick Start

```bash
npm install
npm run dev
```

将 `.env.example` 复制为 `.env.local`，然后填入 `GEMINI_API_KEY`。

## Current MVP

- YouTube 链接输入
- `.srt` 上传兜底
- 服务端字幕抓取与解析
- Gemini 清洗与结构化输出
- 前端预览与单文件 HTML 导出
