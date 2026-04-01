import DialogueBlockCard from "@/components/VideoProcessor/DialogueBlockCard";
import PreviewStatusBar from "@/components/VideoProcessor/PreviewStatusBar";
import type { ProcessResponse } from "@/types/video-processor";

type PreviewDocumentProps = {
  loading: boolean;
  progressLabel: string;
  result: ProcessResponse;
  statusMessage: string;
  onLatestBlockRef: (node: HTMLElement | null) => void;
};

export default function PreviewDocument({
  loading,
  progressLabel,
  result,
  statusMessage,
  onLatestBlockRef,
}: PreviewDocumentProps) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <PreviewStatusBar
        loading={loading}
        progressLabel={progressLabel}
        statusMessage={statusMessage}
      />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">标题</p>
        <h3 className="mt-2 text-3xl leading-tight text-white">{result.title}</h3>
        <p className="mt-4 text-sm leading-7 text-slate-300">{result.summary}</p>
        {result.metadata.stats ? (
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
            {`共 ${result.metadata.stats.chunkCount} 段 · ${result.metadata.stats.transcriptEntries} 条字幕 · 约 ${result.metadata.stats.estimatedMinutes} 分钟`}
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">人物</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {result.speakers.length ? (
            result.speakers.map((speaker) => (
              <span
                key={speaker.name}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white"
              >
                {speaker.name}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-dashed border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-slate-500">
              正在推断说话人...
            </span>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">对话</p>
        <div className="mt-4 flex flex-col gap-4">
          {result.dialogueBlocks.map((block, index, blocks) => (
            <DialogueBlockCard
              key={`${block.speaker}-${index}`}
              block={block}
              index={index}
              isLatest={index >= Math.max(blocks.length - 2, 0)}
              loading={loading}
              onLatestRef={onLatestBlockRef}
              showChapterTitle={Boolean(
                block.chapterTitle && block.chapterTitle !== blocks[index - 1]?.chapterTitle,
              )}
            />
          ))}

          {loading
            ? Array.from({ length: 2 }).map((_, index) => (
                <article
                  key={`placeholder-${index}`}
                  className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-300" />
                    <p className="text-lg font-medium text-slate-300">下一段内容生成中...</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="h-4 w-1/3 rounded-full bg-white/10" />
                    <div className="h-4 w-full rounded-full bg-white/10" />
                    <div className="h-4 w-5/6 rounded-full bg-white/10" />
                    <div className="h-4 w-4/6 rounded-full bg-white/10" />
                  </div>
                </article>
              ))
            : null}
        </div>
      </section>

      <footer className="text-sm leading-7 text-slate-400">
        免责声明：仅供个人学习与整理使用，请遵守 YouTube 内容条款与原始内容版权要求。
      </footer>
    </div>
  );
}
