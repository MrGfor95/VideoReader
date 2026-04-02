import type { VideoProcessorFormState } from "@/components/VideoProcessor/VideoProcessorPage/types";

export const INITIAL_FORM: VideoProcessorFormState = {
  youtubeUrl: "",
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
