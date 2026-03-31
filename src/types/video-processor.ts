export type TranscriptEntry = {
  index: number;
  start: number;
  end: number;
  text: string;
};

export type Speaker = {
  name: string;
  description?: string;
};

export type DialogueBlock = {
  title?: string;
  speaker: string;
  text: string;
  timecode?: string;
};

export type ProcessRequest = {
  youtubeUrl?: string;
  preferredLanguage?: string;
};

export type ProcessingStats = {
  chunkCount: number;
  transcriptCharacters: number;
  transcriptEntries: number;
  estimatedMinutes: number;
};

export type AiTranscriptResult = {
  title: string;
  summary: string;
  speakers: Speaker[];
  dialogueBlocks: DialogueBlock[];
  rawMarkdown: string;
};

export type ProcessResponse = AiTranscriptResult & {
  metadata: {
    sourceUrl: string | null;
    transcriptSource: string;
    videoId: string | null;
    stats?: ProcessingStats;
  };
};

export type StreamEvent =
  | {
      type: "status";
      stage:
        | "validating"
        | "fetching-transcript"
        | "chunking"
        | "processing-chunk"
        | "finalizing";
      message: string;
      progress?: number;
    }
  | {
      type: "metadata";
      payload: ProcessResponse["metadata"];
      stats: ProcessingStats;
    }
  | {
      type: "partial";
      chunkIndex: number;
      totalChunks: number;
      chunkSummary: string;
      payload: ProcessResponse;
    }
  | {
      type: "complete";
      payload: ProcessResponse;
    }
  | {
      type: "error";
      message: string;
    };
