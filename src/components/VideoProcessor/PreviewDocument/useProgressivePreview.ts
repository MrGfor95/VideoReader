"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DialogueBlock, ProcessResponse } from "@/types/video-processor";

type UseProgressivePreviewInput = {
  result: ProcessResponse;
};

type UseProgressivePreviewReturn = {
  displayResult: ProcessResponse;
  isAnimating: boolean;
};

function keepPrefix(current: string | undefined, target: string | undefined) {
  if (!current || !target) {
    return "";
  }

  return target.startsWith(current) ? current : "";
}

function stepText(current: string | undefined, target: string | undefined, step = 2) {
  const currentValue = current ?? "";
  const targetValue = target ?? "";

  if (currentValue === targetValue) {
    return targetValue;
  }

  if (!targetValue.startsWith(currentValue)) {
    return targetValue.slice(0, step);
  }

  return targetValue.slice(0, Math.min(currentValue.length + step, targetValue.length));
}

function syncBlockStructure(current: DialogueBlock | undefined, target: DialogueBlock): DialogueBlock {
  return {
    ...target,
    question: keepPrefix(current?.question, target.question),
    answer: keepPrefix(current?.answer, target.answer),
    text: keepPrefix(current?.text, target.text),
  };
}

function syncResultStructure(current: ProcessResponse | null, target: ProcessResponse): ProcessResponse {
  return {
    ...target,
    title: keepPrefix(current?.title, target.title),
    summary: keepPrefix(current?.summary, target.summary),
    speakers: target.speakers,
    dialogueBlocks: target.dialogueBlocks.map((block, index) =>
      syncBlockStructure(current?.dialogueBlocks[index], block),
    ),
  };
}

function isBlockComplete(current: DialogueBlock, target: DialogueBlock) {
  return (
    (current.question ?? "") === (target.question ?? "") &&
    (current.answer ?? "") === (target.answer ?? "") &&
    (current.text ?? "") === (target.text ?? "")
  );
}

function isResultComplete(current: ProcessResponse, target: ProcessResponse) {
  return (
    current.title === target.title &&
    current.summary === target.summary &&
    current.dialogueBlocks.length === target.dialogueBlocks.length &&
    current.dialogueBlocks.every((block, index) => isBlockComplete(block, target.dialogueBlocks[index]))
  );
}

export default function useProgressivePreview({
  result,
}: UseProgressivePreviewInput): UseProgressivePreviewReturn {
  const [displayResult, setDisplayResult] = useState<ProcessResponse>(() =>
    syncResultStructure(null, result),
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetResult = useMemo(() => result, [result]);

  useEffect(() => {
    setDisplayResult((current) => syncResultStructure(current, targetResult));

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setDisplayResult((current) => {
        const next: ProcessResponse = {
          ...current,
          title: stepText(current.title, targetResult.title, 2),
          summary: stepText(current.summary, targetResult.summary, 6),
          speakers: targetResult.speakers,
          dialogueBlocks: targetResult.dialogueBlocks.map((block, index) => {
            const currentBlock = current.dialogueBlocks[index] ?? syncBlockStructure(undefined, block);

            return {
              ...block,
              question: currentBlock.question,
              answer: currentBlock.answer,
              text: currentBlock.text,
            };
          }),
        };

        for (let index = 0; index < targetResult.dialogueBlocks.length; index += 1) {
          const targetBlock = targetResult.dialogueBlocks[index];
          const currentBlock = next.dialogueBlocks[index];

          if (!isBlockComplete(currentBlock, targetBlock)) {
            next.dialogueBlocks[index] = {
              ...targetBlock,
              question: stepText(currentBlock.question, targetBlock.question, 2),
              answer:
                (currentBlock.question ?? "") === (targetBlock.question ?? "")
                  ? stepText(currentBlock.answer, targetBlock.answer, 4)
                  : currentBlock.answer,
              text:
                (currentBlock.answer ?? "") === (targetBlock.answer ?? "")
                  ? stepText(currentBlock.text, targetBlock.text, 4)
                  : currentBlock.text,
            };
            break;
          }
        }

        if (isResultComplete(next, targetResult) && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        return next;
      });
    }, 40);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [targetResult]);

  return {
    displayResult,
    isAnimating: !isResultComplete(displayResult, targetResult),
  };
}
