import "../patterns/chat.css";
import { useState } from "react";
import { AfIcon } from "../ui";
import { AfSwap } from "../ui-pro";
import type { ComponentSpec } from "../types";
import { AfAiAnswer as AiAnswer } from "../components/chat/AiAnswer";
import { AfChatComposer as ChatComposer } from "../components/chat/ChatComposer";
import { AfCitedAnswer as CitedAnswer } from "../components/chat/CitedAnswer";
import { AfCommentThread as CommentThread } from "../components/chat/CommentThread";
import { AfCommentsPanel as CommentsPanel } from "../components/chat/CommentsPanel";
import { AfMessageActions as MessageActions } from "../components/chat/MessageActions";
import { AfModelPicker as ModelPicker } from "../components/chat/ModelPicker";
import { AfReactionBar as ReactionBar } from "../components/chat/ReactionBar";
import { AfThinkingLoader as ThinkingLoader } from "../components/chat/ThinkingLoader";
import { AfThinkingState as ThinkingState } from "../components/chat/ThinkingState";
import { AfWritingAssistant as WritingAssistant } from "../components/chat/WritingAssistant";

function AiAnswerSpecimen() {
  return (
    <div className="af-ch-demo">
      <AiAnswer
        followUps={[
          "Compare Alfama and Chiado hotel prices",
          "Which workshop loft fits 20 people?",
          "Draft a 3-day Lisbon offsite agenda",
        ]}
        followUpAnswers={{
          "Compare Alfama and Chiado hotel prices":
            "Alfama boutique hotels average `€165/night` in October vs `€210/night` in Chiado, keeping all 20 rooms inside budget [1,6].",
          "Which workshop loft fits 20 people?":
            "Miradouro Loft seats 24 around two daylight tables with a 4K display and acoustic panels, five minutes from Santa Apolónia [1,3].",
          "Draft a 3-day Lisbon offsite agenda":
            "Tue: afternoon arrivals & Alfama walk [5]. Wed: Q4 roadmap workshop + tram 28 sunset [3]. Thu: customer sprint & 20-seat mezzanine dinner [4,6].",
        }}
      />
    </div>
  );
}

function ChatComposerSpecimen() {
  return (
    <div className="af-ch-demo af-ch-demo--fill">
      <ChatComposer />
    </div>
  );
}

function CitedAnswerSpecimen() {
  return (
    <div className="af-ch-demo">
      <CitedAnswer />
    </div>
  );
}

function CommentsPanelSpecimen() {
  return (
    <div className="af-ch-demo">
      <CommentsPanel />
    </div>
  );
}

function ModelPickerSpecimen() {
  return (
    <div className="af-ch-demo af-ch-demo--fill">
      <div className="af-ch-modeldemo">
        <span className="af-ch-modeldemo__prompt">Ask anything…</span>
        <div className="af-ch-modeldemo__bar">
          <ModelPicker defaultValue="sonnet" />
          <span className="af-ch-modeldemo__spacer" />
          <span className="af-ch-modeldemo__send" aria-hidden>
            <AfIcon name="arrowUp" size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}

function ThinkingStateSpecimen() {
  return (
    <div className="af-ch-demo">
      <ThinkingState loop />
    </div>
  );
}

function WritingAssistantSpecimen() {
  return (
    <div className="af-ch-demo">
      <WritingAssistant />
    </div>
  );
}

function CommentThreadSpecimen() {
  return (
    <div className="af-ch-demo">
      <CommentThread />
    </div>
  );
}

function MessageActionsSpecimen() {
  const versions = [
    "Version 2.4 adds shared workspaces, cuts sync time in half and fixes the export bug on Windows.",
    "In short: shared workspaces, 2× faster sync, and the Windows export fix.",
    "2.4 ships shared team workspaces, halves sync latency, and resolves the Windows export bug.",
  ];
  const [count, setCount] = useState(1);
  const [version, setVersion] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [recorded, setRecorded] = useState("");

  const regenerate = () => {
    if (regenerating) return;
    setRegenerating(true);
    window.setTimeout(() => {
      setCount((value) => {
        const next = Math.min(versions.length, value + 1);
        setVersion(next - 1);
        return next;
      });
      setRegenerating(false);
    }, 1000);
  };

  return (
    <div className="af-ch-demo">
      <div className="af-ch-msg" data-ui-message>
        <div className="af-ch-msg__body">
          <div className="af-ch-msg__ask">Summarize the 2.4 release notes in one sentence.</div>
          <div className="af-ch-msg__who">
            <i aria-hidden />
            Sonnet 5.5
          </div>
          <AfSwap swapKey={String(version)} className="af-ch-msg__swap">
            <p className="af-ch-msg__text">{versions[version]}</p>
          </AfSwap>
        </div>
        <div className="af-ch-msg__foot">
          <MessageActions
            text={versions[version]}
            versions={count}
            version={version}
            onVersionChange={setVersion}
            onRegenerate={regenerate}
            regenerating={regenerating}
            onFeedback={(kind, reason) =>
              setRecorded(
                kind === "up"
                  ? "Feedback: helpful"
                  : kind === "down"
                    ? `Feedback: not helpful${reason ? ` · ${reason}` : ""}`
                    : "Feedback cleared",
              )
            }
          />
        </div>
      </div>
      <span className="af-ch-live" role="status">
        {recorded}
      </span>
    </div>
  );
}

function ReactionBarSpecimen() {
  return (
    <div className="af-ch-demo">
      <ReactionBar reactions={{ like: { count: 128 }, comment: { count: 24 }, repost: { count: 9 } }} />
    </div>
  );
}

function ThinkingLoaderSpecimen() {
  return (
    <div className="af-ch-demo">
      <div className="af-ch-tl-demo">
        <div className="af-ch-tl-you">Which CRM fits a 10-person sales team best?</div>
        <ThinkingLoader loop />
      </div>
    </div>
  );
}

/** 对话组组件清单。 */
export const chatSpecs: ComponentSpec[] = [
  {
    id: "ai-answer",
    title: "AI Answer",
    group: "对话",
    source: "pro",
    note: "affectUI Pro 参照。流式回答 + 来源卡 + 引用 chip + 复制/重新生成/反馈/追问，用于 Token 分析结论。",
    render: AiAnswerSpecimen,
    width: 720,
    height: 680,
  },
  {
    id: "chat-composer",
    title: "Chat Composer",
    group: "对话",
    source: "pro",
    note: "affectUI Pro 参照。会话主输入器：自适应输入框、附件与插件菜单、三级审批、模型选择、听写与文件夹/应用连接栏。",
    render: ChatComposerSpecimen,
    width: 720,
    height: 360,
  },
  {
    id: "cited-answer",
    title: "Cited Answer",
    group: "对话",
    source: "pro",
    note: "affectUI Pro 参照。回答与来源双向联动：引用高亮、原文预览、短语加亮，用于统计结论的来源核对。",
    render: CitedAnswerSpecimen,
    width: 520,
    height: 620,
  },
  {
    id: "comments-panel",
    title: "Comments Panel",
    group: "对话",
    source: "pro",
    note: "affectUI Pro 参照。会话评论侧栏：筛选/排序、/edit 运行编辑、解决开关与评论输入。",
    render: CommentsPanelSpecimen,
    width: 480,
    height: 600,
  },
  {
    id: "model-picker",
    title: "Model Picker",
    group: "对话",
    source: "pro",
    note: "affectUI Pro 参照。模型菜单：能力条、扩展思考与力度、联网搜索，底部滚动展示首 token 与价格。",
    render: ModelPickerSpecimen,
    width: 720,
    height: 620,
  },
  {
    id: "thinking-state",
    title: "Thinking State",
    group: "对话",
    source: "pro",
    note: "affectUI Pro 参照。AI 工作面板：实时计时、逐步出现的步骤、来源 chip 与完成勾，用于长任务等待。",
    render: ThinkingStateSpecimen,
    width: 520,
    height: 460,
  },
  {
    id: "writing-assistant",
    title: "Writing Assistant",
    group: "对话",
    source: "pro",
    note: "affectUI Pro 参照。带柔光光晕的写作小助手：建议胶囊、流式回复与模拟语音听写。",
    render: WritingAssistantSpecimen,
    width: 460,
    height: 560,
  },
  {
    id: "comment-thread",
    title: "Comment Thread",
    group: "对话",
    source: "free",
    note: "affectUI 免费组件。单条评论线程：助手汇报、细节折叠、@ 跟进与回复输入。",
    render: CommentThreadSpecimen,
    width: 500,
    height: 560,
  },
  {
    id: "message-actions",
    title: "Message Actions",
    group: "对话",
    source: "free",
    note: "affectUI 免费组件。AI 消息下方操作条：复制形变、重新生成与版本切换、反馈原因行、朗读音柱。",
    render: MessageActionsSpecimen,
    width: 520,
    height: 520,
  },
  {
    id: "reaction-bar",
    title: "Reaction Bar",
    group: "对话",
    source: "free",
    note: "affectUI 免费组件。赞/评论/转发/分享胶囊，图标弹跳、计数逐位滚动，用于消息反应。",
    render: ReactionBarSpecimen,
    width: 520,
    height: 200,
  },
  {
    id: "thinking-loader",
    title: "Thinking Loader",
    group: "对话",
    source: "free",
    note: "affectUI 免费组件。等待首个 token 的思考胶囊：八光线、文案上滚、宽度滑动与完成勾。",
    render: ThinkingLoaderSpecimen,
    width: 560,
    height: 280,
  },
];
