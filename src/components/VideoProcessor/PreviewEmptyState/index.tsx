import { PREVIEW_EMPTY_MESSAGE } from "@/components/VideoProcessor/PreviewEmptyState/constants";

export default function PreviewEmptyState() {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-sm leading-7 text-slate-400">
      {PREVIEW_EMPTY_MESSAGE}
    </div>
  );
}
