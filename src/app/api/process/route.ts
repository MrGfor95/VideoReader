import { NextRequest, NextResponse } from "next/server";
import { chunkTranscriptEntries } from "@/lib/chunk-transcript";
import { buildDialogueDocument } from "@/lib/document-builder";
import { consolidateChunkResults, processTranscriptChunk } from "@/lib/gemini";
import { fetchTranscriptWithYtDlpDetailed } from "@/lib/yt-dlp";
import type {
  ProcessRequest,
  ProcessResponse,
  StreamEvent,
  TranscriptEntry,
} from "@/types/video-processor";
import { extractVideoId, fetchYouTubeTranscriptWithDiagnostics } from "@/lib/youtube";

export const maxDuration = 60;

function buildTranscriptFailureMessage(diagnostics: string[]) {
  const uniqueDiagnostics = Array.from(new Set(diagnostics.filter(Boolean)));
  const head = uniqueDiagnostics.slice(0, 4);
  const tail = uniqueDiagnostics.slice(-6);
  const details = Array.from(new Set([...head, ...tail])).join("；");
  return `未获取到可用字幕。排查信息：${details}`;
}

function streamEvent(controller: ReadableStreamDefaultController<Uint8Array>, event: StreamEvent) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

function buildStats(transcriptEntries: TranscriptEntry[], chunkCount: number) {
  const transcriptCharacters = transcriptEntries.reduce((sum, entry) => sum + entry.text.length, 0);
  const start = transcriptEntries[0]?.start ?? 0;
  const end = transcriptEntries[transcriptEntries.length - 1]?.end ?? 0;

  return {
    chunkCount,
    transcriptCharacters,
    transcriptEntries: transcriptEntries.length,
    estimatedMinutes: Number(((end - start) / 60).toFixed(1)),
  };
}

function mergeProcessResponses(
  previous: ProcessResponse | null,
  next: ProcessResponse,
  chunkSummary: string,
) {
  if (!previous) {
    return next;
  }

  return {
    ...next,
    title: previous.title === "AI 对话整理稿" ? next.title : previous.title,
    summary: [previous.summary, chunkSummary].filter(Boolean).join("\n\n"),
    speakers: Array.from(
      new Map(
        [...previous.speakers, ...next.speakers].map((speaker) => [speaker.name, speaker] as const),
      ).values(),
    ),
    dialogueBlocks: [...previous.dialogueBlocks, ...next.dialogueBlocks],
    rawMarkdown: [previous.rawMarkdown, next.rawMarkdown].filter(Boolean).join("\n\n"),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProcessRequest;
    const sourceUrl = body.youtubeUrl?.trim();

    if (!sourceUrl) {
      return NextResponse.json(
        { error: "请输入 YouTube 链接。" },
        { status: 400 },
      );
    }

    const transcriptSource = "youtube";
    let transcriptEntries: TranscriptEntry[];
    let transcriptText = "";
    let videoId: string | null = null;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          streamEvent(controller, {
            type: "status",
            stage: "validating",
            message: "正在校验输入参数。",
            progress: 0.02,
          });

          streamEvent(controller, {
            type: "status",
            stage: "fetching-transcript",
            message: "正在优先抓取英文字幕，随后交给 AI 输出中文。",
            progress: 0.08,
          });

          videoId = extractVideoId(sourceUrl);

          if (!videoId) {
            throw new Error("无法从链接中识别 YouTube Video ID。");
          }

          const baseAttempt = await fetchYouTubeTranscriptWithDiagnostics(videoId);
          let captions = baseAttempt.captions;
          const diagnostics = [...baseAttempt.diagnostics];

          if (!captions.length) {
            streamEvent(controller, {
              type: "status",
              stage: "fetching-transcript",
              message: "常规抓取失败，正在尝试 yt-dlp 字幕回退。",
              progress: 0.12,
            });

            const ytDlpAttempt = await fetchTranscriptWithYtDlpDetailed(sourceUrl);
            captions = ytDlpAttempt.captions;
            diagnostics.push(...ytDlpAttempt.diagnostics);
          }

          if (!captions.length) {
            throw new Error(buildTranscriptFailureMessage(diagnostics));
          }

          transcriptEntries = captions.map((item) => ({
            index: item.start,
            start: item.start,
            end: item.start + item.dur,
            text: item.text.replace(/\s+/g, " ").trim(),
          }));
          transcriptText = transcriptEntries.map((entry) => entry.text).join("\n");

          if (!transcriptText.trim()) {
            throw new Error("字幕内容为空，请检查输入。");
          }

          streamEvent(controller, {
            type: "status",
            stage: "chunking",
            message: "正在切分长字幕，准备分段处理。",
            progress: 0.15,
          });

          const chunks = chunkTranscriptEntries(transcriptEntries);
          const stats = buildStats(transcriptEntries, chunks.length);
          const metadata = {
            sourceUrl,
            transcriptSource,
            videoId,
            stats,
          };

          streamEvent(controller, {
            type: "metadata",
            payload: metadata,
            stats,
          });

          const chunkResults = [];
          let aggregate: ProcessResponse | null = null;

          for (const chunk of chunks) {
            streamEvent(controller, {
              type: "status",
              stage: "processing-chunk",
              message: `正在处理第 ${chunk.index + 1} / ${chunks.length} 段字幕。`,
              progress: 0.2 + ((chunk.index + 1) / chunks.length) * 0.65,
            });

            const aiResult = await processTranscriptChunk({
              transcriptText: chunk.text,
              preferredLanguage: body.preferredLanguage ?? "zh-CN",
            });

            chunkResults.push(aiResult);

            const partialResponse = buildDialogueDocument({
              aiResult,
              metadata,
              transcriptEntries: chunk.entries,
            });

            aggregate = mergeProcessResponses(aggregate, partialResponse, aiResult.summary);

            streamEvent(controller, {
              type: "partial",
              chunkIndex: chunk.index,
              totalChunks: chunks.length,
              chunkSummary: aiResult.summary,
              payload: aggregate,
            });
          }

          streamEvent(controller, {
            type: "status",
            stage: "finalizing",
            message: "正在汇总标题、摘要和角色信息。",
            progress: 0.94,
          });

          const consolidated = await consolidateChunkResults({
            preferredLanguage: body.preferredLanguage ?? "zh-CN",
            results: chunkResults,
          });

          const finalResponse: ProcessResponse = {
            ...(aggregate as ProcessResponse),
            title: consolidated.title,
            summary: consolidated.summary,
            speakers: consolidated.speakers,
            metadata,
          };

          streamEvent(controller, {
            type: "complete",
            payload: finalResponse,
          });

          controller.close();
        } catch (error) {
          console.error("process route failed", error);
          streamEvent(controller, {
            type: "error",
            message: error instanceof Error ? error.message : "处理失败，请稍后重试。",
          });
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("process route failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "处理失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
