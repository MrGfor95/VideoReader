import type { DialogueBlock, ProcessResponse } from "@/types/video-processor";

function keepPrefix(current: string | undefined, target: string | undefined) {
  if (!current || !target) {
    return "";
  }

  return target.startsWith(current) ? current : "";
}

export function stepText(current: string | undefined, target: string | undefined, step = 2) {
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

export function syncBlockStructure(current: DialogueBlock | undefined, target: DialogueBlock): DialogueBlock {
  return {
    ...target,
    chapterTitle: keepPrefix(current?.chapterTitle, target.chapterTitle),
    title: keepPrefix(current?.title, target.title),
    question: keepPrefix(current?.question, target.question),
    answer: keepPrefix(current?.answer, target.answer),
    text: keepPrefix(current?.text, target.text),
  };
}

export function buildBlockSkeleton(target: DialogueBlock): DialogueBlock {
  return {
    ...target,
    chapterTitle: "",
    title: "",
    question: "",
    answer: "",
    text: "",
  };
}

export function syncResultStructure(current: ProcessResponse | null, target: ProcessResponse): ProcessResponse {
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

export function isBlockComplete(current: DialogueBlock, target: DialogueBlock) {
  return (
    (current.chapterTitle ?? "") === (target.chapterTitle ?? "") &&
    (current.title ?? "") === (target.title ?? "") &&
    (current.question ?? "") === (target.question ?? "") &&
    (current.answer ?? "") === (target.answer ?? "") &&
    (current.text ?? "") === (target.text ?? "")
  );
}

export function areAllVisibleBlocksComplete(current: ProcessResponse, target: ProcessResponse) {
  return current.dialogueBlocks.every((block, index) => isBlockComplete(block, target.dialogueBlocks[index]));
}

export function isResultComplete(current: ProcessResponse, target: ProcessResponse) {
  return (
    current.title === target.title &&
    current.summary === target.summary &&
    current.dialogueBlocks.length === target.dialogueBlocks.length &&
    current.dialogueBlocks.every((block, index) => isBlockComplete(block, target.dialogueBlocks[index]))
  );
}
