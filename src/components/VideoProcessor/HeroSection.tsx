export default function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950/95 px-6 py-8 shadow-2xl shadow-black/30 md:px-10 md:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.14),transparent_28%)]" />
      <div className="relative flex flex-col gap-4">
        <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">
          Streamed AI transcript studio
        </span>
        <h1 className="max-w-4xl text-4xl leading-tight text-white md:text-6xl">
          把 YouTube 视频转换成分段成文、流式展开的 AI 对话文档
        </h1>
        {/* <p className="max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
          顶部展示项目标题，中段只输入 YouTube URL 并启动处理，底部实时渲染流式生成的文档内容。
        </p> */}
      </div>
    </section>
  );
}
