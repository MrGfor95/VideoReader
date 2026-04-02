"use client";

import { useEffect, useRef } from "react";
import type {
  UsePreviewPanelInput,
  UsePreviewPanelReturn,
} from "@/components/VideoProcessor/PreviewPanel/types";

export default function usePreviewPanel({
  loading,
  result,
}: UsePreviewPanelInput): UsePreviewPanelReturn {
  const latestBlockRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!loading) {
      return;
    }

    latestBlockRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [loading, result?.dialogueBlocks.length]);

  return {
    setLatestBlockRef(node: HTMLElement | null) {
      latestBlockRef.current = node;
    },
  };
}
