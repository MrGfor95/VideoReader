import {
  CACHE_HIT_BADGE_LABEL,
  CACHE_HIT_BADGE_STYLES,
} from "@/components/VideoProcessor/PreviewStatusBar/constants";
import type { PreviewStatusBarProps } from "@/components/VideoProcessor/PreviewStatusBar/types";

export default function PreviewStatusBar({
  loading,
  progressLabel,
  statusMessage,
  cacheHitMessage,
}: PreviewStatusBarProps) {
  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              loading ? "animate-pulse bg-emerald-300" : "bg-white/40"
            }`}
          />
          <p className="text-sm text-slate-200">
            {statusMessage || (loading ? "文档正在渐进生成中..." : "文档生成完成")}
          </p>
        </div>
        {progressLabel ? (
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs tracking-[0.16em] text-slate-400">
            {progressLabel}
          </span>
        ) : null}
      </div>
      {cacheHitMessage ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium tracking-[0.18em] ${CACHE_HIT_BADGE_STYLES}`}
          >
            {CACHE_HIT_BADGE_LABEL}
          </span>
          <p className="text-sm text-emerald-100/90">{cacheHitMessage}</p>
        </div>
      ) : null}
    </section>
  );
}
