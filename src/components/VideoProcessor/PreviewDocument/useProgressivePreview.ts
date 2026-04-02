"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DialogueBlock, ProcessResponse } from "@/types/video-processor";

type UseProgressivePreviewInput = {
  result: ProcessResponse;
};

type UseProgressivePreviewReturn = {
  displayResult: ProcessResponse;
  isAnimating: boolean;
  pendingBlockCount: number;
};

const TICK_MS = 95;
const TITLE_STEP = 1;
const SUMMARY_STEP = 3;
const QUESTION_STEP = 1;
const ANSWER_STEP = 2;
const TEXT_STEP = 2;
const BLOCK_PAUSE_TICKS = 5;

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

function buildBlockSkeleton(target: DialogueBlock): DialogueBlock {
  return {
    ...target,
    question: "",
    answer: "",
    text: "",
  };
}

function syncResultStructure(current: ProcessResponse | null, target: ProcessResponse): ProcessResponse {
  const currentBlockCount = current?.dialogueBlocks.length ?? 0;
  const nextBlockCount = target.dialogueBlocks.length
    ? Math.max(1, Math.min(currentBlockCount || 1, target.dialogueBlocks.length))
    : 0;

  return {
    ...target,
    title: keepPrefix(current?.title, target.title),
    summary: keepPrefix(current?.summary, target.summary),
    speakers: target.speakers,
    dialogueBlocks: target.dialogueBlocks.slice(0, nextBlockCount).map((block, index) =>
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

function areAllVisibleBlocksComplete(current: ProcessResponse, target: ProcessResponse) {
  return current.dialogueBlocks.every((block, index) => isBlockComplete(block, target.dialogueBlocks[index]));
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
  const pauseTicksRef = useRef(0);

  const targetResult = useMemo(() => result, [result]);

  useEffect(() => {
    setDisplayResult((current) => syncResultStructure(current, targetResult));
    pauseTicksRef.current = 0;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setDisplayResult((current) => {
        if (pauseTicksRef.current > 0) {
          pauseTicksRef.current -= 1;
          return current;
        }

        if (
          current.dialogueBlocks.length < targetResult.dialogueBlocks.length &&
          areAllVisibleBlocksComplete(current, targetResult)
        ) {
          pauseTicksRef.current = BLOCK_PAUSE_TICKS;

          return {
            ...current,
            dialogueBlocks: [
              ...current.dialogueBlocks,
              buildBlockSkeleton(targetResult.dialogueBlocks[current.dialogueBlocks.length]),
            ],
          };
        }

        const next: ProcessResponse = {
          ...current,
          title: stepText(current.title, targetResult.title, TITLE_STEP),
          summary:
            current.title === targetResult.title
              ? stepText(current.summary, targetResult.summary, SUMMARY_STEP)
              : current.summary,
          speakers: targetResult.speakers,
          dialogueBlocks: current.dialogueBlocks.map((block, index) => {
            const targetBlock = targetResult.dialogueBlocks[index];
            const currentBlock = current.dialogueBlocks[index] ?? syncBlockStructure(undefined, block);

            return {
              ...targetBlock,
              question: currentBlock.question,
              answer: currentBlock.answer,
              text: currentBlock.text,
            };
          }),
        };

        for (let index = 0; index < next.dialogueBlocks.length; index += 1) {
          const targetBlock = targetResult.dialogueBlocks[index];
          const currentBlock = next.dialogueBlocks[index];

          if (!isBlockComplete(currentBlock, targetBlock)) {
            const nextQuestion = stepText(currentBlock.question, targetBlock.question, QUESTION_STEP);
            const nextAnswer =
              (currentBlock.question ?? "") === (targetBlock.question ?? "")
                ? stepText(currentBlock.answer, targetBlock.answer, ANSWER_STEP)
                : currentBlock.answer;
            const nextText =
              (currentBlock.answer ?? "") === (targetBlock.answer ?? "")
                ? stepText(currentBlock.text, targetBlock.text, TEXT_STEP)
                : currentBlock.text;

            next.dialogueBlocks[index] = {
              ...targetBlock,
              question: nextQuestion,
              answer: nextAnswer,
              text: nextText,
            };

            if (
              nextQuestion === (targetBlock.question ?? "") &&
              nextAnswer === (targetBlock.answer ?? "") &&
              nextText === (targetBlock.text ?? "")
            ) {
              pauseTicksRef.current = BLOCK_PAUSE_TICKS;
            }
            break;
          }
        }

        if (isResultComplete(next, targetResult) && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        return next;
      });
    }, TICK_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [targetResult]);

  const pendingBlockCount = targetResult.dialogueBlocks.length > displayResult.dialogueBlocks.length ? 1 : 0;

  return {
    displayResult,
    isAnimating: !isResultComplete(displayResult, targetResult),
    pendingBlockCount,
  };
}
