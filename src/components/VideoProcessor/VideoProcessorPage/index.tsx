"use client";

import HeroSection from "@/components/VideoProcessor/HeroSection";
import PreviewPanel from "@/components/VideoProcessor/PreviewPanel";
import ProcessorForm from "@/components/VideoProcessor/ProcessorForm";
import useVideoProcessor from "@/components/VideoProcessor/VideoProcessorPage/useVideoProcessor";
import { downloadHtmlDocument } from "@/lib/document";

export default function VideoProcessorPage() {
  const {
    youtubeUrl,
    preferredLanguage,
    result,
    loading,
    error,
    statusMessage,
    cacheHitMessage,
    progress,
    chunkProgress,
    logs,
    cookieAdminToken,
    cookieUploadMessage,
    cookieUploadError,
    cookieUploadLoading,
    loadDebugPreview,
    setYoutubeUrl,
    setPreferredLanguage,
    setCookieAdminToken,
    setCookieFile,
    uploadCookies,
    handleSubmit,
  } = useVideoProcessor();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <HeroSection />
      <ProcessorForm
        canDownload={Boolean(result)}
        cacheHitMessage={cacheHitMessage}
        chunkProgress={chunkProgress}
        cookieAdminToken={cookieAdminToken}
        cookieUploadError={cookieUploadError}
        cookieUploadLoading={cookieUploadLoading}
        cookieUploadMessage={cookieUploadMessage}
        error={error}
        loading={loading}
        logs={logs}
        onCookieAdminTokenChange={setCookieAdminToken}
        onCookieFileChange={setCookieFile}
        onDownload={() => result && downloadHtmlDocument(result)}
        onLoadDebugPreview={loadDebugPreview}
        onPreferredLanguageChange={setPreferredLanguage}
        onSubmit={handleSubmit}
        onUploadCookies={uploadCookies}
        onYoutubeUrlChange={setYoutubeUrl}
        preferredLanguage={preferredLanguage}
        progress={progress}
        showDebugPreview={process.env.NODE_ENV !== "production"}
        statusMessage={statusMessage}
        youtubeUrl={youtubeUrl}
      />
      <PreviewPanel
        chunkProgress={chunkProgress}
        cacheHitMessage={cacheHitMessage}
        loading={loading}
        result={result}
        statusMessage={statusMessage}
      />
    </main>
  );
}
