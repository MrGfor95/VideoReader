type ProcessorFormProps = {
  youtubeUrl: string;
  preferredLanguage: string;
  loading: boolean;
  error: string;
  statusMessage: string;
  progress: number;
  chunkProgress: string;
  logs: string[];
  canDownload: boolean;
  onYoutubeUrlChange: (value: string) => void;
  onPreferredLanguageChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onDownload: () => void;
};

export default function ProcessorForm(props: ProcessorFormProps) {
  const {
    youtubeUrl,
    preferredLanguage,
    loading,
    error,
    statusMessage,
    progress,
    chunkProgress,
    logs,
    canDownload,
    onYoutubeUrlChange,
    onPreferredLanguageChange,
    onSubmit,
    onDownload,
  } = props;

  return (
    <section className="rounded-[32px] border border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950/95 px-6 py-6 shadow-2xl shadow-black/30 md:px-8 md:py-8">
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
          <div className="flex flex-col gap-2">
            <label className="text-sm uppercase tracking-[0.22em] text-slate-400">YouTube URL</label>
            <input
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:bg-white/8"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(event) => onYoutubeUrlChange(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm uppercase tracking-[0.22em] text-slate-400">输出语言</label>
            <select
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white outline-none transition focus:border-emerald-300 focus:bg-white/8"
              value={preferredLanguage}
              onChange={(event) => onPreferredLanguageChange(event.target.value)}
            >
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              className="w-full rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "AI 正在流式处理中..." : "开始生成"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-4 text-sm text-slate-300">
              <span>{statusMessage || "等待开始。"}</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-300 transition-all"
                style={{ width: `${Math.min(progress * 100, 100)}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-slate-400">{chunkProgress}</p>
            {logs.length ? (
              <div className="mt-3 flex flex-col gap-2 text-sm text-slate-400">
                {logs.map((item, index) => (
                  <p key={`${item}-${index}`}>{item}</p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-stretch">
            {canDownload ? (
              <button
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
                onClick={onDownload}
                type="button"
              >
                下载 HTML 文档
              </button>
            ) : (
              <div className="w-full rounded-3xl border border-dashed border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-slate-400">
                处理完成后可直接导出离线 HTML。
              </div>
            )}
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
