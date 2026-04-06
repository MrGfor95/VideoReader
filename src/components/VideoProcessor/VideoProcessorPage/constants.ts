import type { VideoProcessorFormState } from "@/components/VideoProcessor/VideoProcessorPage/types";

export const DEFAULT_FORM_YOUTUBE_URL = "https://www.youtube.com/watch?v=xRh2sVcNXQ8";

export const INITIAL_FORM: VideoProcessorFormState = {
  youtubeUrl: DEFAULT_FORM_YOUTUBE_URL,
  preferredLanguage: "zh-CN",
};

export const DEBUG_PREVIEW_STATUS_MESSAGE = "正在回放样例文档。";
export const DEBUG_PREVIEW_CHUNK_PROGRESS = "样例文档 · 使用本地调试文本渐进渲染。";
export const DEBUG_PREVIEW_LOGS = [
  "已加载英伟达访谈样例。",
  "正在以逐段、逐字方式回放生成效果。",
] as const;

export const DEFAULT_SUBMISSION_ERROR_MESSAGE = "请求失败，请稍后重试。";
export const NETWORK_SUBMISSION_ERROR_MESSAGE =
  "网络连接中断，字幕服务可能在处理中断开，请稍后重试。";
export const UNREACHABLE_SUBMISSION_ERROR_MESSAGE = "无法连接字幕服务，请稍后重试。";
export const DEFAULT_COOKIE_UPLOAD_ERROR_MESSAGE = "Cookie 上传失败，请稍后重试。";
export const MANAGED_AI_CACHE_TRANSCRIPT_SOURCE = "managed-ai-cache";
export const CACHE_HIT_STATUS_FRAGMENT = "已命中 AI 结果缓存";
export const INFLIGHT_REUSE_STATUS_FRAGMENT = "已存在相同视频的生成任务";
export const CACHE_HIT_MESSAGE = "已命中缓存结果，本次未重复请求 AI。";
export const INFLIGHT_REUSE_MESSAGE = "已复用相同视频的进行中结果，本次未重复请求 AI。";
