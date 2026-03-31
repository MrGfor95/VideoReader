"use client";

import { downloadHtmlDocument } from "@/lib/export-html";
import HeroSection from "@/components/VideoProcessor/HeroSection";
import PreviewPanel from "@/components/VideoProcessor/PreviewPanel";
import ProcessorForm from "@/components/VideoProcessor/ProcessorForm";
import useVideoProcessor from "@/components/VideoProcessor/useVideoProcessor";

export default function VideoProcessorPage() {
  const {
    youtubeUrl,
    preferredLanguage,
    result,
    loading,
    error,
    statusMessage,
    progress,
    chunkProgress,
    logs,
    setYoutubeUrl,
    setPreferredLanguage,
    handleSubmit,
  } = useVideoProcessor();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <HeroSection />
      <ProcessorForm
        canDownload={Boolean(result)}
        chunkProgress={chunkProgress}
        error={error}
        loading={loading}
        logs={logs}
        onDownload={() => result && downloadHtmlDocument(result)}
        onPreferredLanguageChange={setPreferredLanguage}
        onSubmit={handleSubmit}
        onYoutubeUrlChange={setYoutubeUrl}
        preferredLanguage={preferredLanguage}
        progress={progress}
        statusMessage={statusMessage}
        youtubeUrl={youtubeUrl}
      />
      <PreviewPanel result={result} />
    </main>
  );
}
