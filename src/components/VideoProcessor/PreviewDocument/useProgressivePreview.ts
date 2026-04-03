"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ANSWER_STEP,
  BLOCK_PAUSE_TICKS,
  CHAPTER_TITLE_STEP,
  DIALOGUE_TITLE_STEP,
  QUESTION_STEP,
  SUMMARY_STEP,
  TEXT_STEP,
  TICK_MS,
  TITLE_STEP,
} from "@/components/VideoProcessor/PreviewDocument/constants";
import {
  areAllVisibleBlocksComplete,
  buildBlockSkeleton,
  isBlockComplete,
  isResultComplete,
  stepText,
  syncBlockStructure,
  syncResultStructure,
} from "@/components/VideoProcessor/PreviewDocument/helpers";
import type {
  UseProgressivePreviewInput,
  UseProgressivePreviewReturn,
} from "@/components/VideoProcessor/PreviewDocument/types";
import type { ProcessResponse } from "@/types/video-processor";

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
              chapterTitle: currentBlock.chapterTitle,
              title: currentBlock.title,
              question: currentBlock.question,
              answer: currentBlock.answer,
              text: currentBlock.text,
            };
          }),
        };

        if (next.title !== targetResult.title) {
          return next;
        }

        for (let index = 0; index < next.dialogueBlocks.length; index += 1) {
          const targetBlock = targetResult.dialogueBlocks[index];
          const currentBlock = next.dialogueBlocks[index];

          if (!isBlockComplete(currentBlock, targetBlock)) {
            const nextChapterTitle = stepText(
              currentBlock.chapterTitle,
              targetBlock.chapterTitle,
              CHAPTER_TITLE_STEP,
            );
            const canAdvanceDialogueTitle =
              (currentBlock.chapterTitle ?? "") === (targetBlock.chapterTitle ?? "");
            const nextTitle = canAdvanceDialogueTitle
              ? stepText(currentBlock.title, targetBlock.title, DIALOGUE_TITLE_STEP)
              : currentBlock.title;
            const canAdvanceQuestion = (currentBlock.title ?? "") === (targetBlock.title ?? "");
            const nextQuestion =
              canAdvanceDialogueTitle && canAdvanceQuestion
                ? stepText(currentBlock.question, targetBlock.question, QUESTION_STEP)
                : currentBlock.question;
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
              chapterTitle: nextChapterTitle,
              title: nextTitle,
              question: nextQuestion,
              answer: nextAnswer,
              text: nextText,
            };

            if (
              nextChapterTitle === (targetBlock.chapterTitle ?? "") &&
              nextTitle === (targetBlock.title ?? "") &&
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
