"use client";

import { useEffect, useRef } from "react";
import type { ProcessResponse } from "@/types/video-processor";

type UsePreviewPanelInput = {
  loading: boolean;
  result: ProcessResponse | null;
};

export default function usePreviewPanel({ loading, result }: UsePreviewPanelInput) {
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
