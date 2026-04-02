import type { ProcessResponse } from "@/types/video-processor";

const debugPreviewFixture: ProcessResponse = {
  title: "英伟达的超高速增长之路：从算法到全栈计算",
  summary:
    "本次对话中，主持人回顾了英伟达从首次公开募股至今的惊人增长，并向公司创始人兼 CEO 黄仁勋提问，询问公司实现超高速增长背后的战略、文化和技术因素。黄仁勋则幽默回应，并详细阐述了英伟达从算法、图形计算到全栈平台的长期演进。",
  speakers: [{ name: "主持人" }, { name: "黄仁勋" }],
  dialogueBlocks: [
    {
      chapterTitle: "开场白与幽默互动",
      title: "会议开场：没有掌声的寂静与幽默的价值",
      speaker: "黄仁勋",
      questionSpeaker: "主持人",
      question: "这次会议允许幽默吗？",
      answerSpeaker: "黄仁勋",
      answer: "幽默是非常允许的。",
      text: "幽默是非常允许的。",
      timecode: "00:00:00",
    },
    {
      chapterTitle: "开场白与幽默互动",
      title: "对黄仁勋的感谢与认可",
      speaker: "黄仁勋",
      questionSpeaker: "主持人",
      question: "詹森，我想感谢你。你作为本次会议的支持者已经有多久了？",
      answerSpeaker: "黄仁勋",
      answer: "你在过去二十多年里，一直是这次会议非常坚定的支持者。",
      text: "你在过去二十多年里，一直是这次会议非常坚定的支持者。",
      timecode: "00:00:04",
    },
    {
      chapterTitle: "英伟达的惊人增长与核心问题",
      title: "从千万到万亿：英伟达的非凡成长历程",
      speaker: "黄仁勋",
      questionSpeaker: "主持人",
      question: "在英伟达实现这种规模的超高速增长背后，究竟有哪些战略、文化和技术因素汇聚在一起？",
      answerSpeaker: "黄仁勋",
      answer:
        "这是一个很难用一句话回答的问题。英伟达不是一蹴而就的，我们用了三十多年才走到今天。",
      text: "这是一个很难用一句话回答的问题。英伟达不是一蹴而就的，我们用了三十多年才走到今天。",
      timecode: "00:00:14",
    },
    {
      chapterTitle: "英伟达的创立与早期挑战",
      title: "对增长问题的幽默回应与 IPO 往事",
      speaker: "黄仁勋",
      questionSpeaker: "主持人",
      question: "所以这些关键因素到底是什么？",
      answerSpeaker: "黄仁勋",
      answer:
        "如果要完整回答，也许要花三十多分钟。我们上市那会儿，投资者问得最多的问题甚至是：你们什么时候倒闭？",
      text: "如果要完整回答，也许要花三十多分钟。我们上市那会儿，投资者问得最多的问题甚至是：你们什么时候倒闭？",
      timecode: "00:00:15",
    },
    {
      chapterTitle: "英伟达的创立与早期挑战",
      title: "从算法到图形：英伟达的创立愿景",
      speaker: "黄仁勋",
      questionSpeaker: "主持人",
      question: "那么公司最早的核心愿景是什么？",
      answerSpeaker: "黄仁勋",
      answer:
        "我们创立公司的初衷，是为一种新的计算方式构建平台。这种方式特别适合解决算法密集型问题，而计算机图形学就是其中最关键的一种。",
      text: "我们创立公司的初衷，是为一种新的计算方式构建平台。这种方式特别适合解决算法密集型问题，而计算机图形学就是其中最关键的一种。",
      timecode: "00:00:16",
    },
  ],
  rawMarkdown: "",
  metadata: {
    sourceUrl: "debug-preview://nvidia-growth",
    transcriptSource: "debug-preview",
    videoId: "debug-preview",
    stats: {
      chunkCount: 5,
      transcriptCharacters: 846,
      transcriptEntries: 15,
      estimatedMinutes: 8.2,
    },
  },
};

export default debugPreviewFixture;
