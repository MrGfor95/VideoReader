import { consolidateChunkResults, processTranscriptChunk } from "@/lib/ai";
import { buildDialogueDocument } from "@/lib/document";
import {
  chunkTranscriptEntries,
  extractVideoId,
  fetchTranscriptWithYtDlpDetailed,
  fetchYouTubeTranscriptWithDiagnostics,
} from "@/lib/transcript";
import type { ProcessResponse } from "@/types/video-processor";
import {
  applySpeakerAliases,
  backfillCanonicalRoleSpeakers,
  buildKnownSpeakers,
  buildSpeakerAliasMap,
  buildStats,
  buildTranscriptFailureMessage,
  mergeProcessResponses,
  normalizeTranscriptEntries,
  streamEvent,
} from "@/server/process/helpers";
import { getInflightResult, setInflightResult } from "@/server/process/inflight-cache";
import {
  isManagedDemoVideo,
  readManagedTranscriptCache,
  writeManagedTranscriptCache,
} from "@/server/transcript-cache";
import { readManagedResultCache, writeManagedResultCache } from "@/server/result-cache";

export type CreateProcessStreamInput = {
  preferredLanguage: string;
  sourceUrl: string;
};

async function resolveTranscript(input: {
  controller: ReadableStreamDefaultController<Uint8Array>;
  sourceUrl: string;
  videoId: string;
}) {
  if (isManagedDemoVideo(input.sourceUrl, input.videoId)) {
    const cached = await readManagedTranscriptCache(input.videoId);

    if (cached?.captions.length) {
      return {
        captions: cached.captions,
        transcriptSource: "managed-cache",
      };
    }
  }

  let transcriptSource = "youtube-page";
  const baseAttempt = await fetchYouTubeTranscriptWithDiagnostics(input.videoId);
  let captions = baseAttempt.captions;
  const diagnostics = [...baseAttempt.diagnostics];

  if (!captions.length) {
    streamEvent(input.controller, {
      type: "status",
      stage: "fetching-transcript",
      message: "标准字幕接口未命中，正在切换到备用字幕引擎。",
      progress: 0.12,
    });

    const ytDlpAttempt = await fetchTranscriptWithYtDlpDetailed(input.sourceUrl);
    captions = ytDlpAttempt.captions;
    diagnostics.push(...ytDlpAttempt.diagnostics);

    if (captions.length) {
      transcriptSource = "yt-dlp";
    }
  }

  if (!captions.length) {
    throw new Error(buildTranscriptFailureMessage(diagnostics));
  }

  if (isManagedDemoVideo(input.sourceUrl, input.videoId)) {
    await writeManagedTranscriptCache({
      captions,
      sourceUrl: input.sourceUrl,
      videoId: input.videoId,
    });
  }

  return {
    captions,
    transcriptSource,
  };
}

async function processTranscriptChunks(input: {
  controller: ReadableStreamDefaultController<Uint8Array>;
  metadata: ProcessResponse["metadata"];
  preferredLanguage: string;
  transcriptEntries: ReturnType<typeof normalizeTranscriptEntries>;
}) {
  const chunks = chunkTranscriptEntries(input.transcriptEntries);
  const chunkResults = [];
  let aggregate: ProcessResponse | null = null;
  let knownSpeakers: string[] = [];

  for (const chunk of chunks) {
    streamEvent(input.controller, {
      type: "status",
      stage: "processing-chunk",
      message: `正在处理第 ${chunk.index + 1} / ${chunks.length} 段字幕。`,
      progress: 0.2 + ((chunk.index + 1) / chunks.length) * 0.65,
    });

    const aiResult = await processTranscriptChunk({
      transcriptText: chunk.text,
      preferredLanguage: input.preferredLanguage,
      knownSpeakers,
    });

    const nextPartialResponse = buildDialogueDocument({
      aiResult,
      metadata: input.metadata,
      transcriptEntries: chunk.entries,
    });
    const aliasMap = buildSpeakerAliasMap(aggregate, nextPartialResponse);
    const partialResponse = applySpeakerAliases(nextPartialResponse, aliasMap);
    const previousAggregate = aggregate ? applySpeakerAliases(aggregate, aliasMap) : null;

    chunkResults.push(aiResult);
    aggregate = backfillCanonicalRoleSpeakers(
      mergeProcessResponses(previousAggregate, partialResponse, aiResult.summary),
    );
    knownSpeakers = buildKnownSpeakers(
      knownSpeakers.map((speaker) => aliasMap.get(speaker) ?? speaker),
      aggregate,
    );

    streamEvent(input.controller, {
      type: "partial",
      chunkIndex: chunk.index,
      totalChunks: chunks.length,
      chunkSummary: aiResult.summary,
      payload: aggregate,
    });
  }

  return {
    aggregate,
    chunkCount: chunks.length,
    chunkResults,
  };
}

async function generateProcessResponse(input: {
  controller: ReadableStreamDefaultController<Uint8Array>;
  preferredLanguage: string;
  sourceUrl: string;
  videoId: string;
}) {
  const transcript = await resolveTranscript({
    controller: input.controller,
    sourceUrl: input.sourceUrl,
    videoId: input.videoId,
  });
  const transcriptEntries = normalizeTranscriptEntries(transcript.captions);
  const transcriptText = transcriptEntries.map((entry) => entry.text).join("\n");

  if (!transcriptText.trim()) {
    throw new Error("字幕内容为空，请检查输入。");
  }

  streamEvent(input.controller, {
    type: "status",
    stage: "chunking",
    message: "正在切分长字幕，准备分段处理。",
    progress: 0.15,
  });

  const stats = buildStats(transcriptEntries, chunkTranscriptEntries(transcriptEntries).length);
  const metadata = {
    sourceUrl: input.sourceUrl,
    transcriptSource: transcript.transcriptSource,
    videoId: input.videoId,
    stats,
  };

  streamEvent(input.controller, {
    type: "metadata",
    payload: metadata,
    stats,
  });

  const processed = await processTranscriptChunks({
    controller: input.controller,
    metadata,
    preferredLanguage: input.preferredLanguage,
    transcriptEntries,
  });

  streamEvent(input.controller, {
    type: "status",
    stage: "finalizing",
    message: "正在汇总标题、摘要和角色信息。",
    progress: 0.94,
  });

  const consolidated = await consolidateChunkResults({
    preferredLanguage: input.preferredLanguage,
    results: processed.chunkResults,
  });

  const finalResponse: ProcessResponse = {
    ...(processed.aggregate as ProcessResponse),
    title: consolidated.title,
    summary: consolidated.summary,
    speakers: consolidated.speakers,
    metadata,
  };

  await writeManagedResultCache({
    preferredLanguage: input.preferredLanguage,
    result: finalResponse,
    sourceUrl: input.sourceUrl,
    videoId: input.videoId,
  });

  return finalResponse;
}

export function createProcessStream(input: CreateProcessStreamInput) {
  return new ReadableStream<Uint8Array>({
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

        const videoId = extractVideoId(input.sourceUrl);

        if (!videoId) {
          throw new Error("无法从链接中识别 YouTube Video ID。");
        }

        const cachedResult = await readManagedResultCache({
          preferredLanguage: input.preferredLanguage,
          sourceUrl: input.sourceUrl,
          videoId,
        });

        if (cachedResult?.result) {
          const payload: ProcessResponse = {
            ...cachedResult.result,
            metadata: {
              ...cachedResult.result.metadata,
              sourceUrl: input.sourceUrl,
              transcriptSource: "managed-ai-cache",
              videoId,
            },
          };

          streamEvent(controller, {
            type: "status",
            stage: "finalizing",
            message: "已命中 AI 结果缓存，正在直接返回结果。",
            progress: 0.98,
          });

          if (payload.metadata.stats) {
            streamEvent(controller, {
              type: "metadata",
              payload: payload.metadata,
              stats: payload.metadata.stats,
            });
          }

          streamEvent(controller, {
            type: "complete",
            payload,
          });

          controller.close();
          return;
        }

        const inflight = getInflightResult({
          preferredLanguage: input.preferredLanguage,
          videoId,
        });

        if (inflight) {
          streamEvent(controller, {
            type: "status",
            stage: "finalizing",
            message: "已存在相同视频的生成任务，正在复用当前进行中的结果。",
            progress: 0.9,
          });

          const payload = await inflight;
          streamEvent(controller, {
            type: "complete",
            payload: {
              ...payload,
              metadata: {
                ...payload.metadata,
                sourceUrl: input.sourceUrl,
                transcriptSource: "managed-ai-cache",
                videoId,
              },
            },
          });

          controller.close();
          return;
        }

        const responsePromise = generateProcessResponse({
          controller,
          preferredLanguage: input.preferredLanguage,
          sourceUrl: input.sourceUrl,
          videoId,
        });

        setInflightResult(
          {
            preferredLanguage: input.preferredLanguage,
            videoId,
          },
          responsePromise,
        );

        const finalResponse = await responsePromise;

        streamEvent(controller, {
          type: "complete",
          payload: finalResponse,
        });

        controller.close();
      } catch (error) {
        console.error("process stream failed", error);
        streamEvent(controller, {
          type: "error",
          message: error instanceof Error ? error.message : "处理失败，请稍后重试。",
        });
        controller.close();
      }
    },
  });
}
