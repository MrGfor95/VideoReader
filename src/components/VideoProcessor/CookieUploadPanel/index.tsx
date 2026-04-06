import { COOKIE_FILE_ACCEPT } from "@/components/VideoProcessor/CookieUploadPanel/constants";
import type { CookieUploadPanelProps } from "@/components/VideoProcessor/CookieUploadPanel/types";

export default function CookieUploadPanel(props: CookieUploadPanelProps) {
  const {
    adminToken,
    uploadMessage,
    uploadError,
    uploadLoading,
    onAdminTokenChange,
    onCookieFileChange,
    onUpload,
  } = props;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Cookie 管理</p>
          <p className="text-sm leading-7 text-slate-400">
            上传最新的 <code>cookies.txt</code> 后，字幕服务后续请求会自动使用新文件，无需重启服务。
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
          <input
            accept={COOKIE_FILE_ACCEPT}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-300 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
            onChange={(event) => onCookieFileChange(event.target.files?.[0] ?? null)}
            type="file"
          />
          <input
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:bg-white/8"
            onChange={(event) => onAdminTokenChange(event.target.value)}
            placeholder="输入管理口令"
            type="password"
            value={adminToken}
          />
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            className="rounded-2xl border border-emerald-300/40 bg-emerald-300/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={uploadLoading}
            onClick={onUpload}
            type="button"
          >
            {uploadLoading ? "正在上传 Cookie..." : "上传 Cookie"}
          </button>

          {uploadMessage ? <p className="text-sm text-emerald-200">{uploadMessage}</p> : null}
        </div>

        {uploadError ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {uploadError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
