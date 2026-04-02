import PreviewDocument from "@/components/VideoProcessor/PreviewDocument";
import PreviewEmptyState from "@/components/VideoProcessor/PreviewEmptyState";
import PreviewLoadingState from "@/components/VideoProcessor/PreviewLoadingState";
import usePreviewPanel from "@/components/VideoProcessor/PreviewPanel/usePreviewPanel";
import type { PreviewPanelProps } from "@/components/VideoProcessor/PreviewPanel/types";

export default function PreviewPanel({
  result,
  loading,
  statusMessage,
  chunkProgress,
}: PreviewPanelProps) {
  const { setLatestBlockRef } = usePreviewPanel({ loading, result });

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
        <PreviewDocument
          loading={loading}
          progressLabel={chunkProgress}
          onLatestBlockRef={setLatestBlockRef}
          result={result}
          statusMessage={statusMessage}
        />
      ) : loading ? (
        <PreviewLoadingState statusMessage={statusMessage} />
      ) : (
        <PreviewEmptyState />
      )}
    </section>
  );
}
