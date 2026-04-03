"use client";

import { useState } from "react";
import debugPreviewFixture from "@/components/VideoProcessor/VideoProcessorPage/debugPreviewFixture";
import {
  DEBUG_PREVIEW_CHUNK_PROGRESS,
  DEBUG_PREVIEW_LOGS,
  DEBUG_PREVIEW_STATUS_MESSAGE,
  DEFAULT_SUBMISSION_ERROR_MESSAGE,
  INITIAL_FORM,
  NETWORK_SUBMISSION_ERROR_MESSAGE,
  UNREACHABLE_SUBMISSION_ERROR_MESSAGE,
} from "@/components/VideoProcessor/VideoProcessorPage/constants";
import type { UseVideoProcessorReturn } from "@/components/VideoProcessor/VideoProcessorPage/types";
import type { ProcessResponse, StreamEvent } from "@/types/video-processor";

function getErrorMessage(payload: ProcessResponse | { error?: string }) {
  return "error" in payload ? payload.error ?? "处理失败。" : "处理失败。";
}

function normalizeSubmissionError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.trim();

    if (!message) {
      return DEFAULT_SUBMISSION_ERROR_MESSAGE;
    }

    if (/network\s*error/i.test(message)) {
      return NETWORK_SUBMISSION_ERROR_MESSAGE;
    }

    if (/failed to fetch/i.test(message) || /load failed/i.test(message)) {
      return UNREACHABLE_SUBMISSION_ERROR_MESSAGE;
    }

    return message;
  }

  return DEFAULT_SUBMISSION_ERROR_MESSAGE;
}

export default function useVideoProcessor(): UseVideoProcessorReturn {
  const [youtubeUrl, setYoutubeUrl] = useState<string>(INITIAL_FORM.youtubeUrl);
  const [preferredLanguage, setPreferredLanguage] = useState<string>(INITIAL_FORM.preferredLanguage);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [chunkProgress, setChunkProgress] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  function loadDebugPreview() {
    setLoading(false);
    setError("");
    setResult(debugPreviewFixture);
    setStatusMessage(DEBUG_PREVIEW_STATUS_MESSAGE);
    setProgress(0.78);
    setChunkProgress(DEBUG_PREVIEW_CHUNK_PROGRESS);
    setLogs([...DEBUG_PREVIEW_LOGS]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setStatusMessage("正在建立处理任务。");
    setProgress(0);
    setChunkProgress("");
    setLogs([]);

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          youtubeUrl,
          preferredLanguage,
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json") || !response.body) {
        const data = (await response.json()) as ProcessResponse | { error?: string };

        if (!response.ok) {
          throw new Error(getErrorMessage(data));
        }

        setResult(data as ProcessResponse);
        setStatusMessage("处理完成。");
        setProgress(1);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      while (!completed) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          const eventData = JSON.parse(line) as StreamEvent;

          if (eventData.type === "status") {
            setStatusMessage(eventData.message);
            setProgress(eventData.progress ?? 0);
            setLogs((current) => [...current, eventData.message].slice(-8));
          }

          if (eventData.type === "metadata") {
            setChunkProgress(
              `共 ${eventData.stats.chunkCount} 段，约 ${eventData.stats.estimatedMinutes} 分钟，${eventData.stats.transcriptEntries} 条字幕。`,
            );
          }

          if (eventData.type === "partial") {
            setResult(eventData.payload);
            setChunkProgress(`已完成 ${eventData.chunkIndex + 1} / ${eventData.totalChunks} 段`);
          }

          if (eventData.type === "complete") {
            setResult(eventData.payload);
            setStatusMessage("处理完成。");
            setProgress(1);
            completed = true;
          }

          if (eventData.type === "error") {
            throw new Error(eventData.message);
          }
        }
      }
    } catch (submissionError) {
      setError(normalizeSubmissionError(submissionError));
    } finally {
      setLoading(false);
    }
  }

  return {
    youtubeUrl,
    preferredLanguage,
    result,
    loading,
    error,
    statusMessage,
    progress,
    chunkProgress,
    logs,
    loadDebugPreview,
    setYoutubeUrl,
    setPreferredLanguage,
    handleSubmit,
  };
}
