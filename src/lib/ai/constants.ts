export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export const GEMINI_MAX_TRANSCRIPT_CHARS = 180000;

export const FALLBACK_TITLE = "字幕整理草稿";
export const FALLBACK_SUMMARY =
  "当前未配置 Gemini API Key，系统返回了基础整理结果，可先用于联调前后端流程。";
export const FALLBACK_BLOCK_TITLE = "对话要点";
export const FALLBACK_BLOCK_SPEAKER = "Speaker";
export const FALLBACK_SPEAKER_DESCRIPTION = "未启用 Gemini 时的默认角色占位。";

export const DEFAULT_RESULT_TITLE = "AI 对话整理稿";
export const DEFAULT_RESULT_SUMMARY = "Gemini 未返回摘要，已使用默认说明。";
export const DEFAULT_RESULT_BLOCK_TITLE = "对话片段";
export const DEFAULT_RESULT_BLOCK_TEXT = "Gemini 未返回结构化对话，请查看 rawMarkdown。";
export const DEFAULT_RESULT_QUESTION = "这一段的核心问题仍在整理中。";
export const DEFAULT_RESULT_ANSWER = "这一段的核心回答仍在整理中。";
