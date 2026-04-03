import type { DialogueBlockCardProps } from "@/components/VideoProcessor/DialogueBlockCard/types";

export default function DialogueBlockCard({
  block,
  index,
  loading,
  isLatest,
  showChapterTitle,
  onLatestRef,
}: DialogueBlockCardProps) {
  const chapterTitleText = block.chapterTitle?.trim();
  const titleText = block.title?.trim();
  const questionText = block.question?.trim();
  const answerText = block.answer?.trim();

  return (
    <div className="flex flex-col gap-4">
      {showChapterTitle ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4">
          {chapterTitleText ? (
            <p className="text-3xl font-semibold tracking-tight text-white">{chapterTitleText}</p>
          ) : loading ? (
            <div className="h-10 w-3/5 rounded-2xl bg-white/10" />
          ) : null}
        </div>
      ) : null}

      <article
        ref={isLatest ? onLatestRef : undefined}
        className={`rounded-3xl border bg-slate-950/80 px-5 py-5 ${
          isLatest && loading
            ? "border-emerald-300/30 shadow-[0_0_0_1px_rgba(110,231,183,0.16)]"
            : "border-white/10"
        }`}
      >
        {titleText ? (
          <p className="text-2xl font-semibold leading-9 text-white">{titleText}</p>
        ) : loading ? (
          <div className="h-9 w-2/3 rounded-2xl bg-white/10" />
        ) : (
          <p className="text-2xl font-semibold leading-9 text-white">{`第 ${index + 1} 段`}</p>
        )}

        <div className="mt-5 space-y-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <strong className="text-xl text-white">{block.questionSpeaker || block.speaker}:</strong>
              {block.timecode ? (
                <span className="text-xs tracking-[0.18em] text-slate-500">{block.timecode}</span>
              ) : null}
            </div>
            {questionText ? (
              <p className="mt-2 whitespace-pre-wrap leading-8 text-slate-100/95">{questionText}</p>
            ) : loading ? (
              <div className="mt-3 h-7 w-2/5 rounded-full bg-white/10" />
            ) : null}
          </div>

          <div>
            <strong className="text-xl text-emerald-300">{block.answerSpeaker || block.speaker}:</strong>
            {answerText ? (
              <p className="mt-2 whitespace-pre-wrap leading-8 text-slate-100/90">{answerText}</p>
            ) : loading ? (
              <div className="mt-3 h-7 w-3/5 rounded-full bg-white/10" />
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}
