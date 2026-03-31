import type { ProcessResponse } from "@/types/video-processor";

type PreviewPanelProps = {
  result: ProcessResponse | null;
};

export default function PreviewPanel({ result }: PreviewPanelProps) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950/95 px-6 py-6 shadow-2xl shadow-black/30 md:px-8 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Preview</p>
          <h2 className="text-3xl text-white">流式生成文档预览</h2>
        </div>
        {result ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-400">
            {result.metadata.transcriptSource}
          </span>
        ) : null}
      </div>

      {result ? (
        <div className="mt-6 flex flex-col gap-6">
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
              {result.speakers.map((speaker) => (
                <span
                  key={speaker.name}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white"
                >
                  {speaker.name}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">对话</p>
            <div className="mt-4 flex flex-col gap-4">
              {result.dialogueBlocks.map((block, index) => (
                <article
                  key={`${block.speaker}-${index}`}
                  className="rounded-3xl border border-white/10 bg-slate-950/80 px-5 py-5"
                >
                  <p className="text-xl font-semibold leading-8 text-white">
                    {block.title || `第 ${index + 1} 段`}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-slate-400">
                    <strong className="text-base text-emerald-300">{block.speaker}</strong>
                    {block.timecode ? (
                      <span className="text-xs tracking-[0.18em]">{block.timecode}</span>
                    ) : null}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap leading-8 text-slate-100/90">{block.text}</p>
                </article>
              ))}
            </div>
          </section>

          <footer className="text-sm leading-7 text-slate-400">
            免责声明：仅供个人学习与整理使用，请遵守 YouTube 内容条款与原始内容版权要求。
          </footer>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-sm leading-7 text-slate-400">
          输入 YouTube URL 后，底部会按分段流式展开文档。你会先看到处理进度，再逐步看到标题、摘要和各段对话内容。
        </div>
      )}
    </section>
  );
}
