import {
  DEFAULT_LOADING_STATUS_MESSAGE,
  LOADING_DIALOGUE_CARD_COUNT,
  LOADING_SPEAKER_COUNT,
} from "@/components/VideoProcessor/PreviewLoadingState/constants";
import type { PreviewLoadingStateProps } from "@/components/VideoProcessor/PreviewLoadingState/types";

export default function PreviewLoadingState({ statusMessage }: PreviewLoadingStateProps) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <section className="rounded-3xl border border-sky-300/20 bg-sky-300/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-300" />
          <p className="text-sm text-sky-100">{statusMessage || DEFAULT_LOADING_STATUS_MESSAGE}</p>
        </div>
      </section>

      <section className="animate-pulse rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="h-3 w-16 rounded-full bg-white/10" />
        <div className="mt-4 h-10 w-2/3 rounded-2xl bg-white/10" />
        <div className="mt-4 space-y-3">
          <div className="h-4 w-full rounded-full bg-white/10" />
          <div className="h-4 w-5/6 rounded-full bg-white/10" />
          <div className="h-4 w-3/4 rounded-full bg-white/10" />
        </div>
      </section>

      <section className="animate-pulse rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="h-3 w-16 rounded-full bg-white/10" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: LOADING_SPEAKER_COUNT }).map((_, index) => (
            <div key={index} className="h-9 w-24 rounded-full bg-white/10" />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="h-3 w-16 rounded-full bg-white/10" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: LOADING_DIALOGUE_CARD_COUNT }).map((_, index) => (
            <article
              key={index}
              className="animate-pulse rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-5"
            >
              <div className="h-8 w-1/2 rounded-2xl bg-white/10" />
              <div className="mt-5 h-4 w-24 rounded-full bg-white/10" />
              <div className="mt-3 space-y-3">
                <div className="h-4 w-full rounded-full bg-white/10" />
                <div className="h-4 w-11/12 rounded-full bg-white/10" />
                <div className="h-4 w-4/5 rounded-full bg-white/10" />
              </div>
              <div className="mt-6 h-4 w-24 rounded-full bg-white/10" />
              <div className="mt-3 space-y-3">
                <div className="h-4 w-full rounded-full bg-white/10" />
                <div className="h-4 w-10/12 rounded-full bg-white/10" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
