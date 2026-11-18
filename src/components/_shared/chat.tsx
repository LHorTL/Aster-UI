import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import type { AffectIconKey } from "../../model";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import { AfPopover } from "../overlay/Popover";

/* ------------------------------------------------------------------ */
/* 公共工具                                                            */
/* ------------------------------------------------------------------ */

/** 复制文本：优先剪贴板 API，file:// 等不支持的环境回退到隐藏 textarea。 */
export function copyText(text: string) {
  const fallback = () => {
    if (typeof document === "undefined") return;
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
    } catch {
      // 环境不支持复制时静默失败
    }
    area.remove();
  };
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(fallback);
  } else {
    fallback();
  }
}

/** 统一浮层：复用基础原语 AfPopover（点击外部与 Escape 关闭，贴合锚点并接入 AfLayer / Theme 浮层根）。 */
export function StagePopover({
  open,
  anchorRef,
  align = "start",
  side = "bottom",
  role,
  label,
  className,
  onClose,
  children,
}: {
  /** 是否打开。 */
  open: boolean;
  /** 锚点元素。 */
  anchorRef: RefObject<HTMLElement | null>;
  /** 与锚点哪一侧对齐。 */
  align?: "start" | "end";
  /** 弹出方向。 */
  side?: "top" | "bottom";
  /** 语义角色，例如 listbox / menu / dialog。 */
  role: string;
  /** 无障碍名称。 */
  label?: string;
  /** 额外类名。 */
  className?: string;
  /** 点击外部时的关闭回调。 */
  onClose: () => void;
  /** 浮层内容。 */
  children: ReactNode;
}) {
  return (
    <AfPopover
      open={open}
      anchorRef={anchorRef}
      align={align}
      side={side}
      role={role}
      label={label}
      flush
      preserveNaturalWidth
      onPointerDownOutside={onClose}
      onEscapeKeyDown={onClose}
      className={cn("af-ch-pop", className)}
    >
      {children}
    </AfPopover>
  );
}

/** 锚点状态：state 触发重渲染，ref 供浮层测量当前元素。 */
export function useAnchor() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const ref = useRef<HTMLElement | null>(null);
  ref.current = element;
  return { element, setElement, ref };
}

/** 计数滚动：常规流仅渲染当前各位数字，数值变化时上一帧旧数字绝对定位滑出、新数字滑入，容器宽度平滑伸缩。 */
export function RollingCount({ value }: { value: number }) {
  const safe = Math.max(0, Math.round(value));
  const digits = String(safe).split("");
  const prevValueRef = useRef(safe);
  const [transition, setTransition] = useState<{ prevDigits: string[]; dir: 1 | -1; seq: number } | null>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number | undefined>(undefined);

  useIsomorphicLayoutEffect(() => {
    const prev = prevValueRef.current;
    if (prev === safe) return;
    prevValueRef.current = safe;
    const prevDigits = String(prev).padStart(digits.length, " ").slice(-digits.length).split("");
    const dir: 1 | -1 = safe > prev ? 1 : -1;
    setTransition((cur) => ({ prevDigits, dir, seq: (cur?.seq ?? 0) + 1 }));
    const id = window.setTimeout(() => setTransition(null), 145);
    return () => window.clearTimeout(id);
  }, [safe, digits.length]);

  useIsomorphicLayoutEffect(() => {
    const node = innerRef.current;
    if (node) setWidth(node.offsetWidth);
  }, [digits.length]);

  return (
    <span className="af-ch-roll-wrap" style={width !== undefined ? { width } : undefined} aria-hidden>
      <span ref={innerRef} className="af-ch-roll">
        {digits.map((digit, index) => {
          const prevDigit = transition?.prevDigits[index];
          const changed = transition !== null && prevDigit !== undefined && prevDigit !== digit;
          return (
            <span className="af-ch-roll__col" key={`${digits.length}-${index}`}>
              {changed && prevDigit !== " " ? (
                <span
                  key={`out-${transition.seq}`}
                  className="af-ch-roll__prev"
                  data-dir={transition.dir > 0 ? "up" : "down"}
                  aria-hidden
                >
                  {prevDigit}
                </span>
              ) : null}
              <span
                key={changed ? `in-${transition.seq}` : "rest"}
                className="af-ch-roll__cur"
                data-dir={changed ? (transition.dir > 0 ? "up" : "down") : undefined}
              >
                {digit}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

/** 运行中每 120ms 返回一次已用秒数；停止后保留最后一次的值；重新启动时从 0 重新计时。 */
export function useElapsedSeconds(running: boolean, resetKey = 0) {
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    startedAt.current = null;
    setSeconds(0);
  }, [resetKey]);

  useEffect(() => {
    if (!running) {
      startedAt.current = null;
      return;
    }
    startedAt.current = performance.now();
    setSeconds(0);
    const id = window.setInterval(() => {
      setSeconds(Math.floor((performance.now() - (startedAt.current ?? performance.now())) / 1000));
    }, 120);
    return () => window.clearInterval(id);
  }, [running, resetKey]);

  return seconds;
}

/** 复制后短暂激活再自动复原的小状态，供多个操作按钮共用。 */
export function useTransient(duration = 1600) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => setActive(false), duration);
    return () => window.clearTimeout(id);
  }, [active, duration]);
  return [active, setActive] as const;
}

/* ------------------------------------------------------------------ */
/* AI Answer                                                           */
/* ------------------------------------------------------------------ */

/** 回答引用的来源卡。 */
export type AnswerSource = {
  /** 来源短名，例如「Token 统计」。 */
  name: string;
  /** 来源标题。 */
  title: string;
  /** 预览里展示的原文摘录。 */
  snippet: string;
  /** 来源类型图标。 */
  icon?: AffectIconKey;
  /** 可选跳转链接。 */
  url?: string;
  /** 可选域名。 */
  domain?: string;
};

/** AI 回答属性。 */
export type AiAnswerProps = {
  /** 用户问题。 */
  question?: string;
  /** 检索到的来源。 */
  sources?: AnswerSource[];
  /** 回答正文：空行分段、"- " 列表、**加粗**、`code`、[1] 引用。 */
  answer?: string;
  /** 受控流式状态。 */
  streaming?: boolean;
  /** 是否逐词流式播放；false 时直接显示完整回答。 */
  animate?: boolean;
  /** 逐词流式间隔（毫秒，默认 26）。 */
  speed?: number;
  /** 是否包裹卡片外壳（默认 true；false 时直接铺在画布上）。 */
  framed?: boolean;
  /** 回答完成后展示的追问。 */
  followUps?: string[];
  /** 追问对应的简短回答。 */
  followUpAnswers?: Record<string, string>;
  /** 点踩快捷原因。 */
  feedbackReasons?: string[];
  /** 点击追问回调。 */
  onFollowUp?: (question: string) => void;
  /** 点击重新生成回调。 */
  onRegenerate?: () => void;
  /** 点击停止生成回调。 */
  onStop?: () => void;
  /** 点赞/点踩反馈回调。 */
  onFeedback?: (kind: "up" | "down" | null, reason?: string) => void;
  /** 复制回答回调。 */
  onCopy?: (text: string) => void;
  /** 额外类名。 */
  className?: string;
};

/** 回答正文的逐词单元：word、code 或引用 chip。 */
export type AnswerUnit = {
  /** 全局稳定序号，保证逐词追加时不重新挂载已出现的单元。 */
  id: number;
  /** 段落序号。 */
  block: number;
  /** 段落类型。 */
  blockType: "p" | "list";
  /** 列表项序号（普通段落固定 0）。 */
  line: number;
  /** 单元类型。 */
  kind: "word" | "code" | "cite";
  /** 文字内容（word / code）。 */
  text?: string;
  /** 是否加粗。 */
  strong?: boolean;
  /** 引用来源序号（cite）。 */
  indices?: number[];
};

/** 中文/混排按词切分，英文空格并到前一个词，和 affectUI 官方的逐词行为一致。 */
export const wordSegmenter: { segment: (input: string) => Iterable<{ segment: string }> } | null =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new (
        Intl as unknown as {
          Segmenter: new (
            locale: string,
            options: { granularity: string },
          ) => { segment: (input: string) => Iterable<{ segment: string }> };
        }
      ).Segmenter("zh-CN", { granularity: "word" })
    : null;

/** 把一段文字切分成词；空格并入前一个词，避免逐词淡入时出现空白闪动。 */
export function segmentWords(text: string): string[] {
  const raw = wordSegmenter
    ? [...wordSegmenter.segment(text)].map((item) => item.segment)
    : (text.match(/\s+|\S+/g) ?? [text]);
  const words: string[] = [];
  for (const part of raw) {
    if (!part) continue;
    if (/^\s+$/.test(part) && words.length) words[words.length - 1] += part;
    else words.push(part);
  }
  return words;
}

/** 把回答解析成带段落信息的逐词单元；引用与行内代码单独成单元。 */
export function buildAnswerUnits(text: string): AnswerUnit[] {
  const units: AnswerUnit[] = [];
  let id = 0;
  text.split(/\n{2,}/).forEach((rawBlock, block) => {
    if (!rawBlock.trim()) return;
    const lines = rawBlock.split("\n");
    const isList = lines.every((line) => line.startsWith("- "));
    lines.forEach((line, lineIndex) => {
      const content = isList ? line.slice(2) : line;
      for (const part of content.split(/(\*\*[^*]+\*\*|`[^`]+`|\[\d+(?:,\d+)*\])/g)) {
        if (!part) continue;
        const bold = /^\*\*([\s\S]*)\*\*$/.exec(part);
        if (bold) {
          for (const word of segmentWords(bold[1])) {
            units.push({
              id: id++,
              block,
              blockType: isList ? "list" : "p",
              line: lineIndex,
              kind: "word",
              text: word,
              strong: true,
            });
          }
          continue;
        }
        const inlineCode = /^`([^`]+)`$/.exec(part);
        if (inlineCode) {
          units.push({
            id: id++,
            block,
            blockType: isList ? "list" : "p",
            line: lineIndex,
            kind: "code",
            text: inlineCode[1],
          });
          continue;
        }
        const cite = /^\[([\d,]+)\]$/.exec(part);
        if (cite) {
          units.push({
            id: id++,
            block,
            blockType: isList ? "list" : "p",
            line: lineIndex,
            kind: "cite",
            indices: cite[1].split(",").map(Number),
          });
          continue;
        }
        for (const word of segmentWords(part)) {
          units.push({
            id: id++,
            block,
            blockType: isList ? "list" : "p",
            line: lineIndex,
            kind: "word",
            text: word,
          });
        }
      }
    });
  });
  return units;
}

/** 渲染单个逐词单元；最后一个单元附带脉冲光标。 */
export function renderUnit(
  unit: AnswerUnit,
  isLast: boolean,
  streaming: boolean,
  sources: AnswerSource[],
  activeIndex: number | null,
  onOpen: (index: number, anchor: HTMLElement) => void,
  onHover: (index: number | null) => void,
): ReactNode {
  const caret = streaming && isLast ? <span className="af-ch-caret" aria-hidden /> : null;
  if (unit.kind === "cite") {
    const indices = unit.indices ?? [];
    const first = sources[indices[0] - 1];
    if (!first) return caret;
    const sourceIndex = indices[0] - 1;
    const extra = indices.length - 1;
    return (
      <span key={unit.id} className="af-ch-w af-ch-w--cite">
        <button
          type="button"
          className="af-ch-cite"
          data-lit={indices.some((item) => item - 1 === activeIndex) || undefined}
          aria-label={`Source ${indices.join(", ")}: ${first.title}`}
          onClick={(event) => onOpen(sourceIndex, event.currentTarget)}
          onPointerEnter={() => onHover(sourceIndex)}
          onPointerLeave={() => onHover(null)}
          onFocus={() => onHover(sourceIndex)}
          onBlur={() => onHover(null)}
        >
          {first.name}
          {extra > 0 ? <em>+{extra}</em> : null}
        </button>
        {caret}
      </span>
    );
  }
  if (unit.kind === "code") {
    return (
      <span key={unit.id} className="af-ch-w">
        <code className="af-ch-code">{unit.text}</code>
        {caret}
      </span>
    );
  }
  const content = (
    <>
      {unit.text}
      {caret}
    </>
  );
  return unit.strong ? (
    <strong key={unit.id} className="af-ch-w" data-strong>
      {content}
    </strong>
  ) : (
    <span key={unit.id} className="af-ch-w">
      {content}
    </span>
  );
}

/** 只渲染已出现的单元；段落/列表随新词逐步长出，已出现的词保持挂载不重播动画。 */
export function renderAnswerUnits(
  units: AnswerUnit[],
  visible: number,
  streaming: boolean,
  sources: AnswerSource[],
  activeIndex: number | null,
  onOpen: (index: number, anchor: HTMLElement) => void,
  onHover: (index: number | null) => void,
): ReactNode {
  const shown = units.slice(0, visible);
  if (!shown.length) return null;
  const lastId = shown[shown.length - 1].id;
  const blocks = new Map<number, AnswerUnit[]>();
  for (const unit of shown) {
    const list = blocks.get(unit.block) ?? [];
    list.push(unit);
    blocks.set(unit.block, list);
  }
  return [...blocks.entries()].map(([blockIndex, blockUnits]) => {
    if (blockUnits[0].blockType === "list") {
      const lines = new Map<number, AnswerUnit[]>();
      for (const unit of blockUnits) {
        const list = lines.get(unit.line) ?? [];
        list.push(unit);
        lines.set(unit.line, list);
      }
      return (
        <ul key={blockIndex} className="af-ch-answer__list">
          {[...lines.entries()].map(([lineIndex, lineUnits]) => (
            <li key={lineIndex}>
              {lineUnits.map((unit) =>
                renderUnit(unit, unit.id === lastId, streaming, sources, activeIndex, onOpen, onHover),
              )}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={blockIndex} className="af-ch-answer__p">
        {blockUnits.map((unit) =>
          renderUnit(unit, unit.id === lastId, streaming, sources, activeIndex, onOpen, onHover),
        )}
      </p>
    );
  });
}

/* ------------------------------------------------------------------ */
/* Chat Composer                                                       */
/* ------------------------------------------------------------------ */

/** 输入器里可选的模型：直接复用 Model Picker 的模型元数据。 */
export type ComposerModel = PickerModel;

/** 会话输入器底部可连接的应用。 */
export type ChatComposerApp = {
  /** 应用唯一 id。 */
  id: string;
  /** 显示名称。 */
  name: string;
  /** 徽标单字或符号。 */
  mark?: string;
  /** 徽标色板。 */
  tone?: "mail" | "chat" | "docs" | "code";
  /** 初始是否已连接。 */
  connected?: boolean;
};

/** 会话输入器默认模型，与 Model Picker 的能力条/耗时/价格为同一套数据。 */
export const composerModels: ComposerModel[] = [
  {
    id: "opus",
    name: "Opus 5.5",
    description: "Hardest problems",
    letter: "O",
    speed: 2,
    quality: 5,
    cost: 5,
    latencyMs: 2100,
    pricePerM: 25,
  },
  {
    id: "sonnet",
    name: "Sonnet 5.5",
    description: "Everyday work",
    letter: "S",
    speed: 4,
    quality: 4,
    cost: 3,
    latencyMs: 900,
    pricePerM: 15,
  },
  {
    id: "haiku",
    name: "Haiku 5.5",
    description: "Quick and light",
    letter: "H",
    speed: 5,
    quality: 3,
    cost: 1,
    latencyMs: 400,
    pricePerM: 4,
  },
  {
    id: "auto",
    name: "Auto",
    description: "Picks per message",
    letter: "A",
    latencyMs: 1200,
    pricePerM: 12,
  },
];

/** 会话输入器属性。 */
export type ChatComposerProps = {
  /** 受控输入文本。 */
  value?: string;
  /** 非受控初始输入文本。 */
  defaultValue?: string;
  /** 输入文本变化回调。 */
  onValueChange?: (value: string) => void;
  /** 受控当前模型 id。 */
  model?: string;
  /** 非受控初始模型 id。 */
  defaultModel?: string;
  /** 模型切换回调。 */
  onModelChange?: (modelId: string) => void;
  /** 输入框占位文案。 */
  placeholder?: string;
  /** 可选模型；第一个为默认值。 */
  models?: ComposerModel[];
  /** 受控附件列表。 */
  attachments?: string[];
  /** 非受控初始附件列表。 */
  defaultAttachments?: string[];
  /** 附件菜单候选项。 */
  attachOptions?: string[];
  /** 点击加号按钮时的回调。 */
  onAttach?: () => void;
  /** 选择附件菜单项回调。 */
  onAttachSelect?: (option: string) => void;
  /** 移除附件回调。 */
  onAttachmentRemove?: (attachment: string) => void;
  /** 可选工作文件夹列表。 */
  folders?: string[];
  /** 受控当前工作文件夹。 */
  folder?: string | null;
  /** 非受控初始工作文件夹。 */
  defaultFolder?: string | null;
  /** 工作文件夹变化回调。 */
  onFolderChange?: (folder: string | null) => void;
  /** 可连接应用列表。 */
  apps?: ChatComposerApp[];
  /** 受控已连接应用 id 列表。 */
  connectedApps?: string[];
  /** 非受控初始已连接应用 id 列表。 */
  defaultConnectedApps?: string[];
  /** 已连接应用变化回调。 */
  onAppsChange?: (appIds: string[]) => void;
  /** 受控审批模式。 */
  approval?: "request" | "approve" | "granted";
  /** 非受控初始审批模式。 */
  defaultApproval?: "request" | "approve" | "granted";
  /** 审批模式切换回调。 */
  onApprovalChange?: (approval: "request" | "approve" | "granted") => void;
  /** 语音听写演示文本。 */
  dictationText?: string;
  /** 是否禁用输入与发送。 */
  disabled?: boolean;
  /** 受控加载发送状态。 */
  loading?: boolean;
  /** 提交回调（支持同步或返回 Promise；提供时按真实 Promise 生命周期更新发送态）。 */
  onSubmit?: (payload: {
    message: string;
    model: string;
    attachments: string[];
    folder?: string | null;
    connectedApps?: string[];
    approval?: "request" | "approve" | "granted";
  }) => void | Promise<void>;
  /** 兼容旧版发送回调（未提供 `onSubmit` 时保留演示态反馈）。 */
  onSend?: (message: string, model: string) => void;
  /** 额外类名。 */
  className?: string;
};

/* ------------------------------------------------------------------ */
/* Cited Answer                                                        */
/* ------------------------------------------------------------------ */

/** 引用答案的一个片段：cite 为来源 id 列表。 */
export type CitedSegment = {
  /** 正文。 */
  text: string;
  /** 引用的来源 id。 */
  cite?: string[];
  /** 是否另起一段。 */
  paragraph?: boolean;
};

/** 引用答案的来源。 */
export type CitedSource = {
  /** 唯一 id，供 cite 引用。 */
  id: string;
  /** 站点短名。 */
  site: string;
  /** 标题。 */
  title: string;
  /** 日期。 */
  date?: string;
  /** 原文摘录。 */
  quote: string;
  /** 摘录中需要加亮的短语；省略时自动提取与引用句重合的关键短语。 */
  highlight?: string[];
  /** 来源链接。 */
  url?: string;
  /** 来源徽标色调。 */
  tone?: "blue" | "purple" | "violet" | "green" | "amber" | "gray";
};

/** 引用答案属性。 */
export type CitedAnswerProps = {
  /** 回答片段（不传时使用内置默认示例数据）。 */
  segments?: CitedSegment[];
  /** 来源列表，按顺序编号（不传时使用内置默认示例数据）。 */
  sources?: CitedSource[];
  /** 检索页数（默认 12）。 */
  pagesRead?: number;
  /** 初始展开预览的来源 id。 */
  defaultOpen?: string | null;
  /** 预览来源变化回调。 */
  onPreviewChange?: (sourceId: string | null) => void;
  /** 点击打开来源回调。 */
  onOpenSource?: (source: CitedSource) => void;
  /** 复制引文时的回调。 */
  onCopyQuote?: (quote: string, source: CitedSource) => void;
  /** 托盘右下角自定义动作区。 */
  action?: ReactNode;
  /** 额外类名。 */
  className?: string;
};

/** 自动从引用句与原文摘录中提取重合的短语（中文 >=3 字，英文 >=4 字符）。 */
function inferSharedPhrases(quote: string, referenceText?: string): string[] {
  if (!referenceText) return [];
  const candidates = new Set<string>();
  const tokens = referenceText.match(/[\u4e00-\u9fa5]{3,10}|[A-Za-z0-9_-]{4,}/g) ?? [];
  for (const token of tokens) {
    if (quote.includes(token)) candidates.add(token);
  }
  return [...candidates].sort((a, b) => b.length - a.length).slice(0, 3);
}

/** 把原文摘录按 highlight 短语切开并标记。 */
export function renderQuote(quote: string, highlight?: string[], referenceText?: string): ReactNode {
  const phrases = highlight && highlight.length > 0 ? highlight : inferSharedPhrases(quote, referenceText);
  if (!phrases.length) return quote;
  const pattern = new RegExp(
    `(${phrases.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "g",
  );
  return quote.split(pattern).map((part, index) =>
    phrases.includes(part) ? (
      <mark key={index} className="af-ch-cited__mark">
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

/* ------------------------------------------------------------------ */
/* Comments Panel                                                      */
/* ------------------------------------------------------------------ */

/** 评论面板筛选标签。 */
export type PanelFilter = "all" | "questions" | "edits" | "open" | "resolved";

/** 评论作者（兼容字符串或带名称的对象）。 */
export type CommentAuthor =
  | string
  | {
      name: string;
      initials?: string;
      tone?: "blue" | "green" | "amber" | "purple";
    };

/** 解析评论作者显示名与首字。 */
export function resolveCommentAuthor(author: CommentAuthor): {
  name: string;
  initials: string;
  tone?: "blue" | "green" | "amber" | "purple";
} {
  if (typeof author === "string") {
    return { name: author, initials: author.slice(0, 1).toUpperCase() };
  }
  return {
    name: author.name,
    initials: (author.initials ?? author.name.slice(0, 1)).toUpperCase(),
    tone: author.tone,
  };
}

/** 评论面板里的一条评论。 */
export type PanelComment = {
  /** 唯一 id。 */
  id: string;
  /** 作者。 */
  author: CommentAuthor;
  /** 相对时间。 */
  createdAt: string;
  /** 正文；以 /edit 开头时显示为可运行编辑。 */
  text: string;
  /** 是否已解决。 */
  resolved: boolean;
};

/** 评论面板属性。 */
export type CommentsPanelProps = {
  /** 初始评论（不传时使用内置默认评论数据）。 */
  comments?: PanelComment[];
  /** 面板标题（默认「评论」）。 */
  title?: string;
  /** 面板说明。 */
  description?: string;
  /** 当前评论者（默认「我」）。 */
  currentUser?: CommentAuthor;
  /** 运行 /edit 指令时的回调（可返回 Promise）。 */
  onRunEdit?: (comment: PanelComment) => void | Promise<void>;
  /** 新增评论回调。 */
  onAdd?: (text: string) => void;
  /** 解决状态切换回调。 */
  onResolveChange?: (id: string, resolved: boolean) => void;
  /** 关闭面板回调。 */
  onClose?: () => void;
  /** 额外类名。 */
  className?: string;
};

/* ------------------------------------------------------------------ */
/* Model Picker                                                        */
/* ------------------------------------------------------------------ */

/** 模型选择器的模型数据。 */
export type PickerModel = {
  /** 模型 id。 */
  id: string;
  /** 显示名。 */
  name: string;
  /** 一句话说明。 */
  description: string;
  /** 行首字母方块里的文字。 */
  letter: string;
  /** 速度 / 质量 / 成本，1–5；不传表示自动路由（Varies）。 */
  speed?: number;
  /** 质量。 */
  quality?: number;
  /** 成本（5 为最贵）。 */
  cost?: number;
  /** 首次 token 耗时（毫秒，不含扩展思考）。 */
  latencyMs: number;
  /** 每百万 token 价格（美元）。 */
  pricePerM: number;
  /** 可选短标签。 */
  badge?: string;
};

/** 扩展思考力度档位。 */
export type ModelEffort = "low" | "medium" | "high";

/** 模型选择器属性。 */
export type ModelPickerProps = {
  /** 可选模型（不传时使用默认模型集）。 */
  models?: PickerModel[];
  /** 受控选中的模型 id。 */
  value?: string;
  /** 初始选中的模型 id，默认第一个。 */
  defaultValue?: string;
  /** 选中模型变化回调（传出 id 与模型对象）。 */
  onChange?: (modelId: string, model: PickerModel) => void;
  /** 选择模型后的回调；会话输入器用它同步发送时的模型。 */
  onModelChange?: (model: PickerModel) => void;
  /** 受控扩展思考开关。 */
  thinking?: boolean;
  /** 非受控初始扩展思考开关。 */
  defaultThinking?: boolean;
  /** 扩展思考切换回调。 */
  onThinkingChange?: (thinking: boolean) => void;
  /** 受控思考力度。 */
  effort?: ModelEffort;
  /** 非受控初始思考力度。 */
  defaultEffort?: ModelEffort;
  /** 思考力度变化回调。 */
  onEffortChange?: (effort: ModelEffort) => void;
  /** 受控联网搜索开关。 */
  webSearch?: boolean;
  /** 非受控初始联网搜索开关。 */
  defaultWebSearch?: boolean;
  /** 联网搜索切换回调。 */
  onWebSearchChange?: (webSearch: boolean) => void;
  /** 受控弹层开关。 */
  open?: boolean;
  /** 非受控初始弹层开关。 */
  defaultOpen?: boolean;
  /** 弹层开关变化回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 与触发器哪一侧对齐：默认 start；会话工具栏里用 end 避免右侧溢出。 */
  align?: "start" | "end";
  /** 弹出方向。 */
  side?: "top" | "bottom";
  /** 会话工具栏里的紧凑版：隐藏底部首 token/价格行，模型行与开关更短。 */
  compact?: boolean;
  /** 额外类名。 */
  className?: string;
};

/** 扩展思考的三档力度，以及各自的首 token 时间倍数。 */
export const effortOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

/** 思考力度对应的耗时倍数。 */
export const effortFactor = { low: 1.6, medium: 2.5, high: 4 } as const;

/** 一行三个能力条：速度 / 质量 / 成本，悬停行时按段落与序号依次平滑点亮。 */
export function ModelBars({ model }: { model: PickerModel }) {
  if (model.speed === undefined || model.quality === undefined || model.cost === undefined) {
    return <span className="af-ch-model__varies">Varies</span>;
  }
  return (
    <span className="af-ch-model__bars" aria-hidden>
      {[model.speed, model.quality, model.cost].map((value, barIndex) => (
        <span key={barIndex} className="af-ch-model__meter">
          {Array.from({ length: 5 }, (_, index) => (
            <i
              key={index}
              data-on={index < value || undefined}
              style={{ "--af-seg-delay": `${(barIndex * 3 + index) * 24}ms` } as CSSProperties}
            />
          ))}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Thinking State                                                      */
/* ------------------------------------------------------------------ */

/** 思考步骤引用的来源：支持域名字符串或结构化来源对象。 */
export type ThinkingSource =
  | string
  | {
      label: string;
      domain?: string;
      href?: string;
      icon?: AffectIconKey;
    };

/** 解析思考来源的标签、域名与首字母。 */
export function resolveThinkingSource(source: ThinkingSource): {
  key: string;
  label: string;
  domain: string;
  href?: string;
  icon?: AffectIconKey;
} {
  if (typeof source === "string") {
    return { key: source, label: source, domain: source };
  }
  const domain = source.domain ?? source.label;
  return { key: `${source.label}:${domain}`, label: source.label, domain, href: source.href, icon: source.icon };
}

/** 思考面板的一个步骤。 */
export type ThinkingStep = {
  /** search 为搜索类步骤，可带来源 chip；step / read / code 为推理步骤。 */
  kind?: "search" | "step" | "read" | "code";
  /** 步骤文案。 */
  label: string;
  /** 可选副文案。 */
  detail?: string;
  /** 搜索来源短名或来源对象。 */
  sources?: ThinkingSource[];
  /** 折叠在「+N」里的更多来源。 */
  more?: ThinkingSource[];
};

/** 思考面板属性。 */
export type ThinkingStateProps = {
  /** 按顺序出现的步骤（不传时使用内置默认示例步骤）。 */
  steps?: ThinkingStep[];
  /** 完成末尾行文案（默认「已完成思考」）。 */
  doneLabel?: string;
  /** 步骤间隔（毫秒）。 */
  stepMs?: number;
  /** 完成后是否自动循环重播演示。 */
  loop?: boolean;
  /** 受控完成状态。 */
  done?: boolean;
  /** 默认是否折叠步骤列表。 */
  defaultCollapsed?: boolean;
  /** 完成后是否自动收起步骤列表。 */
  collapseOnDone?: boolean;
  /** 点击来源胶囊回调。 */
  onSourceClick?: (source: string) => void;
  /** 全部完成时回调，参数为总秒数。 */
  onDone?: (seconds: number) => void;
  /** 额外类名。 */
  className?: string;
};

const PIXEL_DELAYS = [0, 120, 240, 120, 240, 360, 240, 360, 480];

/** 头部左侧的 3×3 像素点阵图标：思考中闪烁流转，完成后收成稳定点阵。 */
export function PixelMark({ done }: { done: boolean }) {
  return (
    <span className="af-ch-think__mark" data-done={done || undefined} aria-hidden>
      {PIXEL_DELAYS.map((delay, dot) => (
        <i key={dot} style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Writing Assistant                                                   */
/* ------------------------------------------------------------------ */

/** 写作助手中的一条会话消息。 */
export type WritingMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

/** 写作助手属性。 */
export type WritingAssistantProps = {
  /** 助手名称。 */
  name?: string;
  /** 名称下方的一句话。 */
  tagline?: string;
  /** 欢迎页的大标题。 */
  greeting?: string;
  /** 建议胶囊，点击直接作为消息发送。 */
  suggestions?: string[];
  /** 输入框占位。 */
  placeholder?: string;
  /** 模拟听写时逐字出现的句子。 */
  dictation?: string;
  /** 生成回复；不传时用内置示例文案。 */
  respond?: (message: string) => string;
  /** 发送消息回调。 */
  onSend?: (message: string) => void;
  /** 额外类名。 */
  className?: string;
};

/** 默认写作回复：所有演示消息共用，保证点击任何建议都有内容。 */
export function defaultWritingReply(message: string) {
  return `Here's a tighter version for "${message.slice(0, 24)}":\n\nShip faster with clear token visibility — every session, model, and cost in one calm view.\n\nWant it more formal, or even shorter?`;
}

/* ------------------------------------------------------------------ */
/* Comment Thread                                                      */
/* ------------------------------------------------------------------ */

/** 评论线程里的作者。 */
export type ThreadAuthor = {
  /** 显示名。 */
  name: string;
  /** 是否是助手。 */
  assistant?: boolean;
  /** 可选头像首字。 */
  initials?: string;
};

/** 评论线程里的一条消息。 */
export type ThreadMessage = {
  /** 唯一 id。 */
  id: string;
  /** 作者名。 */
  author: string;
  /** 是否由助手发出。 */
  assistant?: boolean;
  /** 相对时间。 */
  time: string;
  /** 正文。 */
  text: string;
  /** 助手消息的状态行文案。 */
  status?: string;
  /** 状态行展开后的细节。 */
  details?: string[];
};

/** 评论线程属性。 */
export type CommentThreadProps = {
  /** 线程标题。 */
  title?: string;
  /** 初始消息（不传时使用内置默认线程消息）。 */
  messages?: ThreadMessage[];
  /** 当前用户。 */
  currentUser?: ThreadAuthor;
  /** 助手作者。 */
  assistant?: ThreadAuthor;
  /** 发送回复时的回调。 */
  onReply?: (text: string) => void;
  /** 关闭线程时的回调。 */
  onClose?: () => void;
  /** 额外类名。 */
  className?: string;
};

/* ------------------------------------------------------------------ */
/* Message Actions                                                     */
/* ------------------------------------------------------------------ */

/** 消息操作条支持的动作键。 */
export type MessageActionKey = "copy" | "regenerate" | "up" | "down" | "speak";

/** 消息操作条属性。 */
export type MessageActionsProps = {
  /** 待复制/朗读的消息正文。 */
  text?: string;
  /** 需要展示的动作列表。 */
  actions?: MessageActionKey[];
  /** 版本数量或版本内容数组；大于等于 2 时平滑展开版本切换器。 */
  versions?: number | string[];
  /** 受控当前版本序号（从 0 开始）。 */
  version?: number;
  /** 非受控初始版本序号。 */
  defaultVersion?: number;
  /** 版本切换回调。 */
  onVersionChange?: (index: number) => void;
  /** 重新生成回调。 */
  onRegenerate?: () => void;
  /** 受控重新生成加载态。 */
  regenerating?: boolean;
  /** 默认降噪半透明，悬停消息或聚焦时提亮。 */
  quiet?: boolean;
  /** 点踩原因列表。 */
  reasons?: string[];
  /** 受控朗读状态。 */
  speaking?: boolean;
  /** 模拟朗读持续毫秒数。 */
  speakDuration?: number;
  /** 朗读状态变化回调。 */
  onSpeak?: (speaking: boolean) => void;
  /** 复制文本回调。 */
  onCopy?: (text: string) => void;
  /** 点赞/点踩/取消反馈回调。 */
  onFeedback?: (kind: "up" | "down" | null, reason?: string) => void;
  /** 操作组无障碍标签。 */
  label?: string;
  /** 额外类名。 */
  className?: string;
};

/** 点踩后的快捷原因。 */
export const feedbackReasons = ["Not accurate", "Too long", "Didn't follow instructions", "Other"];

/* ------------------------------------------------------------------ */
/* Reaction Bar                                                        */
/* ------------------------------------------------------------------ */

/** 反应按钮的键。 */
export type ReactionKey = "like" | "comment" | "repost" | "share";

/** 单个反应的初始状态。 */
export type ReactionItem = {
  /** 计数；不传表示只做开关（例如分享）。 */
  count?: number;
  /** 默认是否已选中。 */
  active?: boolean;
};

/** 反应条属性。 */
export type ReactionBarProps = {
  /** 各反应的初始计数与状态。 */
  reactions?: Partial<Record<ReactionKey, ReactionItem>>;
  /** 展示哪些反应，默认赞/评论/转发/分享。 */
  actions?: ReactionKey[];
  /** 分享复制的链接。 */
  shareUrl?: string;
  /** 点击反应时的回调。 */
  onReact?: (key: ReactionKey, next: ReactionItem) => void;
  /** 额外类名。 */
  className?: string;
};

/** 反应按钮的英文名与图标。 */
export const reactionMeta: Record<ReactionKey, { label: string; icon: AffectIconKey }> = {
  like: { label: "Like", icon: "heart" },
  comment: { label: "Comment", icon: "message" },
  repost: { label: "Repost", icon: "refresh" },
  share: { label: "Share", icon: "arrowUpRight" },
};

/* ------------------------------------------------------------------ */
/* Thinking Loader                                                     */
/* ------------------------------------------------------------------ */

/** 思考加载胶囊属性。 */
export type ThinkingLoaderProps = {
  /** 依次展示的阶段文案。 */
  phases?: string[];
  /** 受控阶段序号；传入后停止内置轮播定时器。 */
  phase?: number;
  /** 非受控轮播间隔（毫秒，默认 2200）。 */
  interval?: number;
  /** 到末阶段后是否循环回到第一阶段。 */
  loop?: boolean;
  /** 是否已完成；切换为 true 时旋转光线收拢为描线对勾。 */
  done?: boolean;
  /** 完成后的文案或文案生成函数。 */
  doneLabel?: string | ((seconds: number) => string);
  /** 尺寸档位：sm 28px / md 34px。 */
  size?: "sm" | "md";
  /** 外观变体：pill 带胶囊边框，plain / inline 仅展示图标与文案。 */
  variant?: "pill" | "inline" | "plain";
  /** 额外类名。 */
  className?: string;
};

/** 默认阶段文案。 */
export const loaderPhases = ["Thinking", "Searching the web", "Reading sources", "Writing answer"];

/* ------------------------------------------------------------------ */
/* Shared Brand, UI & Portrait SVGs                                    */
/* ------------------------------------------------------------------ */

const CLAUDE_STARBURST_PATH =
  "M 233.959793 800.214905 L 468.644287 668.536987 L 472.590637 657.100647 L 468.644287 650.738403 L 457.208069 650.738403 L 417.986633 648.322144 L 283.892639 644.69812 L 167.597321 639.865845 L 54.926208 633.825623 L 26.577238 627.785339 L 3.3e-05 592.751709 L 2.73832 575.27533 L 26.577238 559.248352 L 60.724873 562.228149 L 136.187973 567.382629 L 249.422867 575.194763 L 331.570496 580.026978 L 453.261841 592.671082 L 472.590637 592.671082 L 475.328857 584.859009 L 468.724915 580.026978 L 463.570557 575.194763 L 346.389313 495.785217 L 219.543671 411.865906 L 153.100723 363.543762 L 117.181267 339.060425 L 99.060455 316.107361 L 91.248367 266.01355 L 123.865784 230.093994 L 167.677887 233.073853 L 178.872513 236.053772 L 223.248367 270.201477 L 318.040283 343.570496 L 441.825592 434.738342 L 459.946411 449.798706 L 467.194672 444.64447 L 468.080597 441.020203 L 459.946411 427.409485 L 392.617493 305.718323 L 320.778564 181.932983 L 288.80542 130.630859 L 280.348999 99.865845 C 277.369171 87.221436 275.194641 76.590698 275.194641 63.624268 L 312.322174 13.20813 L 332.8591 6.604126 L 382.389313 13.20813 L 403.248352 31.328979 L 434.013519 101.71814 L 483.865753 212.537048 L 561.181274 363.221497 L 583.812134 407.919434 L 595.892639 449.315491 L 600.40271 461.959839 L 608.214783 461.959839 L 608.214783 454.711609 L 614.577271 369.825623 L 626.335632 265.61084 L 637.771851 131.516846 L 641.718201 93.745117 L 660.402832 48.483276 L 697.530334 24.000122 L 726.52356 37.852417 L 750.362549 72 L 747.060486 94.067139 L 732.886047 186.201416 L 705.100708 330.52356 L 686.979919 427.167847 L 697.530334 427.167847 L 709.61084 415.087341 L 758.496704 350.174561 L 840.644348 247.490051 L 876.885925 206.738342 L 919.167847 161.71814 L 946.308838 140.29541 L 997.61084 140.29541 L 1035.38269 196.429626 L 1018.469849 254.416199 L 965.637634 321.422852 L 921.825562 378.201538 L 859.006714 462.765259 L 819.785278 530.41626 L 823.409424 535.812073 L 832.75177 534.92627 L 974.657776 504.724915 L 1051.328979 490.872559 L 1142.818848 475.167786 L 1184.214844 494.496582 L 1188.724854 514.147644 L 1172.456421 554.335693 L 1074.604126 578.496765 L 959.838989 601.449829 L 788.939636 641.879272 L 786.845764 643.409485 L 789.261841 646.389343 L 866.255127 653.637634 L 899.194702 655.409424 L 979.812134 655.409424 L 1129.932861 666.604187 L 1169.154419 692.537109 L 1192.671265 724.268677 L 1188.724854 748.429688 L 1128.322144 779.194641 L 1046.818848 759.865845 L 856.590759 714.604126 L 791.355774 698.335754 L 782.335693 698.335754 L 782.335693 703.731567 L 836.69812 756.885986 L 936.322205 846.845581 L 1061.073975 962.81897 L 1067.436279 991.490112 L 1051.409424 1014.120911 L 1034.496704 1011.704712 L 924.885986 929.234924 L 882.604126 892.107544 L 786.845764 811.48999 L 780.483276 811.48999 L 780.483276 819.946289 L 802.550415 852.241699 L 919.087341 1027.409424 L 925.127625 1081.127686 L 916.671204 1098.604126 L 886.469849 1109.154419 L 853.288696 1103.114136 L 785.073914 1007.355835 L 714.684631 899.516785 L 657.906067 802.872498 L 650.979858 806.81897 L 617.476624 1167.704834 L 601.771851 1186.147705 L 565.530212 1200 L 535.328857 1177.046997 L 519.302124 1139.919556 L 535.328857 1066.550537 L 554.657776 970.792053 L 570.362488 894.68457 L 584.536926 800.134277 L 592.993347 768.724976 L 592.429626 766.630859 L 585.503479 767.516968 L 514.22821 865.369263 L 405.825531 1011.865906 L 320.053711 1103.677979 L 299.516815 1111.812256 L 263.919525 1093.369263 L 267.221497 1060.429688 L 287.114136 1031.114136 L 405.825531 880.107361 L 477.422913 786.52356 L 523.651062 732.483276 L 523.328918 724.671265 L 520.590698 724.671265 L 205.288605 929.395935 L 149.154434 936.644409 L 124.993355 914.01355 L 127.973183 876.885986 L 139.409409 864.80542 L 234.201385 799.570435 L 233.879227 799.8927 Z";

/** Brand favicon or bare app mark with unique SVG gradient IDs. */
export function BrandFavicon({
  brand,
  size = 14,
  bare = false,
  className,
}: {
  brand: string;
  size?: number;
  bare?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const key = brand.trim().toLowerCase();

  if (key.includes("notion")) {
    const inner = (
      <>
        <path
          fill="#FFF"
          d="M16.092 11.538 164.09.608c18.179-1.56 22.85-.508 34.28 7.801l47.243 33.282C253.406 47.414 256 48.975 256 55.207v182.527c0 11.439-4.155 18.205-18.696 19.24L65.44 267.378c-10.913.517-16.11-1.043-21.825-8.327L8.826 213.814C2.586 205.487 0 199.254 0 191.97V29.726c0-9.352 4.155-17.153 16.092-18.188Z"
        />
        <path
          fill="#000"
          d="M164.09.608 16.092 11.538C4.155 12.573 0 20.374 0 29.726v162.245c0 7.284 2.585 13.516 8.826 21.843l34.789 45.237c5.715 7.284 10.912 8.844 21.825 8.327l171.864-10.404c14.532-1.035 18.696-7.801 18.696-19.24V55.207c0-5.911-2.336-7.614-9.21-12.66l-1.185-.856L198.37 8.409C186.94.1 182.27-.952 164.09.608ZM69.327 52.22c-14.033.945-17.216 1.159-25.186-5.323L23.876 30.778c-2.06-2.086-1.026-4.69 4.163-5.207l142.274-10.395c11.947-1.043 18.17 3.12 22.842 6.758l24.401 17.68c1.043.525 3.638 3.637.517 3.637L71.146 52.095l-1.819.125Zm-16.36 183.954V81.222c0-6.767 2.077-9.887 8.3-10.413L230.02 60.93c5.724-.517 8.31 3.12 8.31 9.879v153.917c0 6.767-1.044 12.49-10.387 13.008l-161.487 9.361c-9.343.517-13.489-2.594-13.489-10.921ZM212.377 89.53c1.034 4.681 0 9.362-4.681 9.897l-7.783 1.542v114.404c-6.758 3.637-12.981 5.715-18.18 5.715-8.308 0-10.386-2.604-16.609-10.396l-50.898-80.079v77.476l16.1 3.646s0 9.362-12.989 9.362l-35.814 2.077c-1.043-2.086 0-7.284 3.63-8.318l9.351-2.595V109.823l-12.98-1.052c-1.044-4.68 1.55-11.439 8.826-11.965l38.426-2.585 52.958 81.113v-71.76l-13.498-1.552c-1.043-5.733 3.111-9.896 8.3-10.404l35.84-2.087Z"
        />
      </>
    );
    if (bare) {
      return (
        <svg viewBox="0 0 256 268" width={size} height={size} className={className} aria-hidden="true">
          {inner}
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
        <rect width="24" height="24" fill="#fff" />
        <svg x="3" y="3" width="18" height="18" viewBox="0 0 256 268">
          {inner}
        </svg>
      </svg>
    );
  }

  if (key.includes("slack")) {
    if (bare) {
      return (
        <svg viewBox="0 0 49.883 49.877" width={size} height={size} fill="none" className={className} aria-hidden="true">
          <g transform="translate(0 0)">
            <path d="M18.3549 10.4784C15.4713 10.4784 13.1157 8.12279 13.1157 5.2392C13.1157 2.35561 15.4713 0 18.3549 0C21.2385 0 23.5941 2.35561 23.5941 5.2392V10.4784H18.3549Z" fill="#36C5F0" />
            <path d="M18.3575 13.12C21.2411 13.12 23.5967 15.4756 23.5967 18.3592C23.5967 21.2428 21.2411 23.5984 18.3575 23.5984H5.2392C2.35561 23.5984 0 21.2428 0 18.3592C0 15.4756 2.35561 13.12 5.2392 13.12H18.3575Z" fill="#36C5F0" />
          </g>
          <g transform="translate(26.28 0)">
            <path d="M13.1244 18.3592C13.1244 15.4756 15.48 13.12 18.3636 13.12C21.2472 13.12 23.6028 15.4756 23.6028 18.3592C23.6028 21.2428 21.2472 23.5984 18.3636 23.5984H13.1244V18.3592Z" fill="#2EB67D" />
            <path d="M10.4785 18.3575C10.4785 21.2411 8.12286 23.5967 5.23927 23.5967C2.35568 23.5967 7.4362e-05 21.2411 7.4362e-05 18.3575V5.2392C7.4362e-05 2.35561 2.35568 0 5.23927 0C8.12286 0 10.4785 2.35561 10.4785 5.2392V18.3575Z" fill="#2EB67D" />
          </g>
          <g transform="translate(0 26.28)">
            <path d="M10.4784 5.2392C10.4784 8.12279 8.12279 10.4784 5.2392 10.4784C2.35561 10.4784 0 8.12279 0 5.2392C0 2.35561 2.35561 0 5.2392 0H10.4784V5.2392Z" fill="#E01E5A" />
            <path d="M13.1157 5.2392C13.1157 2.35561 15.4713 0 18.3549 0C21.2385 0 23.5941 2.35561 23.5941 5.2392V18.3575C23.5941 21.2411 21.2385 23.5967 18.3549 23.5967C15.4713 23.5967 13.1157 21.2411 13.1157 18.3575V5.2392Z" fill="#E01E5A" />
          </g>
          <g transform="translate(26.28 26.28)">
            <path d="M5.23927 13.1157C8.12286 13.1157 10.4785 15.4713 10.4785 18.3549C10.4785 21.2385 8.12286 23.5941 5.23927 23.5941C2.35568 23.5941 7.4362e-05 21.2385 7.4362e-05 18.3549V13.1157H5.23927Z" fill="#ECB22E" />
            <path d="M5.23927 10.4784C2.35568 10.4784 7.4362e-05 8.12279 7.4362e-05 5.2392C7.4362e-05 2.35561 2.35568 0 5.23927 0H18.3576C21.2412 0 23.5968 2.35561 23.5968 5.2392C23.5968 8.12279 21.2412 10.4784 18.3576 10.4784H5.23927Z" fill="#ECB22E" />
          </g>
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
        <rect width="24" height="24" fill="#fff" />
        <svg x="4" y="4" width="16" height="16" viewBox="0 0 2447.6 2452.5">
          <g clipRule="evenodd" fillRule="evenodd">
            <path d="m897.4 0c-135.3.1-244.8 109.9-244.7 245.2-.1 135.3 109.5 245.1 244.8 245.2h244.8v-245.1c.1-135.3-109.5-245.1-244.9-245.3.1 0 .1 0 0 0m0 654h-652.6c-135.3.1-244.9 109.9-244.8 245.2-.2 135.3 109.4 245.1 244.7 245.3h652.7c135.3-.1 244.9-109.9 244.8-245.2.1-135.4-109.5-245.2-244.8-245.3z" fill="#36c5f0" />
            <path d="m2447.6 899.2c.1-135.3-109.5-245.1-244.8-245.2-135.3.1-244.9 109.9-244.8 245.2v245.3h244.8c135.3-.1 244.9-109.9 244.8-245.3zm-652.7 0v-654c.1-135.2-109.4-245-244.7-245.2-135.3.1-244.9 109.9-244.8 245.2v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.3z" fill="#2eb67d" />
            <path d="m1550.1 2452.5c135.3-.1 244.9-109.9 244.8-245.2.1-135.3-109.5-245.1-244.8-245.2h-244.8v245.2c-.1 135.2 109.5 245 244.8 245.2zm0-654.1h652.7c135.3-.1 244.9-109.9 244.8-245.2.2-135.3-109.4-245.1-244.7-245.3h-652.7c-135.3.1-244.9 109.9-244.8 245.2-.1 135.4 109.4 245.2 244.7 245.3z" fill="#ecb22e" />
            <path d="m0 1553.2c-.1 135.3 109.5 245.1 244.8 245.2 135.3-.1 244.9-109.9 244.8-245.2v-245.2h-244.8c-135.3.1-244.9 109.9-244.8 245.2zm652.7 0v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.2v-653.9c.2-135.3-109.4-245.1-244.7-245.3-135.4 0-244.9 109.8-244.8 245.1 0 0 0 .1 0 0" fill="#e01e5a" />
          </g>
        </svg>
      </svg>
    );
  }

  if (key.includes("wiki")) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
        <rect width="24" height="24" fill="#fff" />
        <svg x="3" y="3" width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#000"
            d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-1.067-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252 1.758-3.504c.293-.64.233-.801.111-.947-.07-.084-.305-.22-.812-.24l-.201-.021c-.052 0-.098-.015-.145-.051-.045-.031-.067-.076-.067-.129v-.427l.061-.045c1.247-.008 4.043 0 4.043 0l.059.045v.436c0 .121-.059.178-.193.178-.646.03-.782.095-1.023.439-.12.186-.375.589-.646 1.039l-2.301 4.273-.065.135 2.792 5.712.17.048 4.396-10.438c.154-.422.129-.722-.064-.895-.197-.172-.346-.273-.857-.295l-.42-.016c-.061 0-.105-.014-.152-.045-.043-.029-.072-.075-.072-.119v-.436l.059-.045h4.961l.041.045v.437c0 .119-.074.18-.209.18-.648.03-1.127.18-1.443.421-.314.255-.557.616-.736 1.067 0 0-4.043 9.258-5.426 12.339-.525 1.007-1.053.917-1.503-.031-.571-1.171-1.773-3.786-2.646-5.71l.053-.036z"
          />
        </svg>
      </svg>
    );
  }

  if (key === "x" || key === "x.com" || key.includes("twitter")) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
        <rect width="24" height="24" fill="#000" />
        <svg x="5" y="5" width="14" height="14" viewBox="0 0 24 24">
          <path
            fill="#fff"
            d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"
          />
        </svg>
      </svg>
    );
  }

  if (key.includes("gmail") || key === "mail") {
    return (
      <svg viewBox="0 0 56.4108 44.8722" width={size} height={size} fill="none" className={className} aria-hidden="true">
        <path
          d="M44.2255 5.76727H56.4051V41.0239C56.4051 43.148 54.683 44.8701 52.5589 44.8701H46.1486C45.8961 44.8701 45.646 44.8204 45.4127 44.7237C45.1794 44.6271 44.9674 44.4854 44.7888 44.3069C44.6102 44.1283 44.4686 43.9163 44.3719 43.683C44.2753 43.4497 44.2255 43.1996 44.2255 42.947V5.76727Z"
          fill={`url(#${uid}-gm0)`}
        />
        <path
          d="M12.1796 5.76727H0V41.0239C0 43.148 1.72213 44.8701 3.84618 44.8701H10.2565C10.509 44.8701 10.7591 44.8204 10.9924 44.7237C11.2257 44.6271 11.4377 44.4854 11.6163 44.3069C11.7949 44.1283 11.9365 43.9163 12.0332 43.683C12.1298 43.4497 12.1796 43.1996 12.1796 42.947V5.76727Z"
          fill="#FC413D"
        />
        <path
          d="M10.0085 1.42778C7.43377 -0.736342 3.5924 -0.403647 1.42828 2.17105C-0.735843 4.74543 -0.403148 8.58681 2.17155 10.7512L26.5557 31.2479C27.0178 31.6362 27.602 31.8492 28.2056 31.8492C28.8091 31.8492 29.3934 31.6362 29.8554 31.2479L54.2396 10.7509C56.814 8.58681 57.1467 4.74543 54.9825 2.17073C52.8184 -0.403648 48.977 -0.736342 46.4027 1.42778L28.2054 16.724L10.0085 1.42778Z"
          fill={`url(#${uid}-gm1)`}
        />
        <defs>
          <linearGradient id={`${uid}-gm0`} x1="50.3153" y1="5.76727" x2="50.3153" y2="44.8701" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60D673" />
            <stop offset="0.17" stopColor="#42C868" />
            <stop offset="0.39" stopColor="#0EBC5F" />
            <stop offset="0.62" stopColor="#00A9BB" />
            <stop offset="0.86" stopColor="#3C90FF" />
            <stop offset="1" stopColor="#3186FF" />
          </linearGradient>
          <linearGradient id={`${uid}-gm1`} x1="0" y1="6.45153" x2="56.4107" y2="6.45153" gradientUnits="userSpaceOnUse">
            <stop offset="0.08" stopColor="#FF63A0" />
            <stop offset="0.3" stopColor="#FC413D" />
            <stop offset="0.65" stopColor="#FC413D" />
            <stop offset="0.72" stopColor="#FC5C30" />
            <stop offset="0.86" stopColor="#FEB10C" />
            <stop offset="0.96" stopColor="#FFDB0F" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (key.includes("clickup")) {
    return (
      <svg viewBox="0 0 49.7096 59.6884" width={size} height={size} fill="none" className={className} aria-hidden="true">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0 45.9002L9.1618 38.8247C14.0602 45.1745 19.2307 48.1679 24.9455 48.1679C30.6603 48.1679 35.7401 45.2652 40.3663 38.9154L49.7096 45.8094C42.997 54.8805 34.6516 59.6882 24.9455 59.6882C15.3301 59.6882 6.89403 54.8805 0 45.9002Z"
          fill={`url(#${uid}-cu0)`}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M24.9535 15.3301L8.62558 29.3903L1.09657 20.5914L25.0442 0L48.8105 20.5914L41.1908 29.2996L24.9535 15.3301Z"
          fill={`url(#${uid}-cu1)`}
        />
        <defs>
          <linearGradient id={`${uid}-cu0`} x1="0" y1="49.2666" x2="49.75" y2="49.2666" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8930FD" />
            <stop offset="1" stopColor="#49CCF9" />
          </linearGradient>
          <linearGradient id={`${uid}-cu1`} x1="1.09231" y1="14.6901" x2="48.7603" y2="14.6901" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF02F0" />
            <stop offset="1" stopColor="#FFC800" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (key.includes("claude") || key.includes("opus") || key.includes("sonnet") || key.includes("haiku") || key.includes("fable")) {
    return (
      <svg viewBox="0 0 1200 1200" width={size} height={size} className={className} aria-hidden="true">
        <path fill="#D97757" d={CLAUDE_STARBURST_PATH} />
      </svg>
    );
  }

  if (key.includes("linear")) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
        <rect width="24" height="24" rx="5" fill="#5E6AD2" />
        <path d="M5.5 13.5 10.5 18.5M7 9.5 14.5 17M10 6.5 17.5 14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#eef2ff" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="#4f46e5" strokeWidth="1.7" />
      <path d="M6.3 12h11.4M12 6.3c1.8 1.8 1.8 9.6 0 11.4M12 6.3c-1.8 1.8-1.8 9.6 0 11.4" fill="none" stroke="#4f46e5" strokeWidth="1.4" />
    </svg>
  );
}

/** macOS sky-blue folder icon from Chat Composer. */
export function MacFolderSvg({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 67 67" width={size} height={size} fill="none" className={className} aria-hidden="true">
      <path
        d="M11.17 15.35v15.36h44.67v-6.98c0-3.86-3.13-6.98-6.98-6.98H33.5l-3.93-5.89a5.58 5.58 0 0 0-4.64-2.49h-6.78c-3.86 0-6.98 3.13-6.98 6.98Z"
        fill="#00A1FF"
      />
      <path
        d="M33.5 16.75l-3.93-5.89a5.58 5.58 0 0 0-4.64-2.49h-6.78c-3.86 0-6.98 3.13-6.98 6.98v15.36h44.67v-6.98c0-3.86-3.13-6.98-6.98-6.98H33.5Zm0 0h-9.77"
        stroke="#00A1FF"
        strokeWidth="4.19"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.59 42.38c-1.05-5.26-1.57-7.89-.08-9.67l.31-.34c1.66-1.66 4.59-1.66 10.45-1.66h32.46c5.86 0 8.79 0 10.45 1.66l.31.34c1.49 1.78.97 4.41-.08 9.67-1.51 7.56-2.26 11.34-5.1 13.66l-.6.46c-3.01 2.13-7.23 2.13-15.66 2.13h-11.1c-8.43 0-12.64 0-15.66-2.13l-.6-.46c-2.84-2.32-3.6-6.1-5.1-13.66Z"
        fill="#3CC7FF"
        stroke="#3CC7FF"
        strokeWidth="4.19"
      />
    </svg>
  );
}

/** Raised hand icon for "Request approval" in Chat Composer. */
export function ApprovalHandSvg({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 68.155 68.155" width={size} height={size} fill="none" className={className} aria-hidden="true">
      <path
        d="M52.5305 32.6557V24.8463C52.5305 22.1016 54.7555 19.8766 57.5001 19.8766C60.2448 19.8766 62.4698 22.1016 62.4698 24.8463V42.027C62.4698 53.3194 53.3154 62.4735 42.0233 62.4735H34.2388M22.7127 39.7552L15.94 31.8537C14.8314 30.5602 13.2129 29.8159 11.5094 29.8159H11.1235C8.11379 29.8159 5.67395 32.2558 5.67395 35.2655C5.67395 36.3412 5.99241 37.393 6.58919 38.2881L16.4118 53.0221C20.3482 58.9269 26.9753 62.4735 34.0719 62.4735"
        stroke="currentColor"
        strokeWidth="4.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M52.534 24.1378V16.3284C52.534 13.5837 50.3091 11.3588 47.5644 11.3588C44.8197 11.3588 42.5948 13.5837 42.5948 16.3284V29.8174"
        stroke="currentColor"
        strokeWidth="4.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M42.5958 29.8198V10.6513C42.5958 7.90661 40.3708 5.68163 37.6262 5.68163C34.8815 5.68163 32.6565 7.90661 32.6565 10.6513V28.4"
        stroke="currentColor"
        strokeWidth="4.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32.6576 28.3975V16.3284C32.6576 13.5837 30.4326 11.3588 27.6879 11.3588C24.9433 11.3588 22.7183 13.5837 22.7183 16.3284V39.7567"
        stroke="currentColor"
        strokeWidth="4.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Exclamation shield icon for "Full access" in Chat Composer. */
export function AlertShieldSvg({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 66.543 66.543" width={size} height={size} fill="none" className={className} aria-hidden="true">
      <path d="M33.2482 22.1795V33.27" stroke="currentColor" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M33.5966 43.67H33.2501M33.9432 43.67C33.9432 44.0529 33.633 44.3631 33.2501 44.3631C32.8672 44.3631 32.5569 44.0529 32.5569 43.67C32.5569 43.2871 32.8672 42.9768 33.2501 42.9768C33.633 42.9768 33.9432 43.2871 33.9432 43.67Z"
        stroke="currentColor"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M58.202 31.0087V22.9595C58.202 18.4124 58.202 16.1389 57.0816 14.6555C55.9612 13.1722 53.4278 12.452 48.3612 11.0118C44.8995 10.0278 41.848 8.84228 39.41 7.76002C36.0859 6.28445 34.4237 5.54666 33.2484 5.54666C32.0728 5.54666 30.4109 6.28445 27.0868 7.76002C24.6487 8.84228 21.5973 10.0278 18.1357 11.0118C13.069 12.452 10.5356 13.1722 9.4152 14.6555C8.29475 16.1389 8.29475 18.4124 8.29475 22.9595V31.0087C8.29475 46.605 22.3319 55.9626 29.3498 59.6666C31.0331 60.5549 31.8748 60.9991 33.2484 60.9991C34.622 60.9991 35.4635 60.5549 37.1467 59.6666C44.1648 55.9626 58.202 46.605 58.202 31.0087Z"
        stroke="currentColor"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Dual 4-point sparkle mark from AI Answer. */
export function DualSparkleSvg({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.5 2.2c.2 0 .36.14.4.33.53 2.6 1.4 3.48 4 4.02a.4.4 0 0 1 0 .79c-2.6.53-3.47 1.4-4 4a.4.4 0 0 1-.8 0c-.53-2.6-1.4-3.47-4-4a.4.4 0 0 1 0-.79c2.6-.54 3.47-1.42 4-4.02a.4.4 0 0 1 .4-.33Z" />
      <path d="M12 9.6c.12 0 .22.08.25.2.28 1.3.72 1.75 2.03 2.03a.25.25 0 0 1 0 .49c-1.31.28-1.75.72-2.03 2.03a.25.25 0 0 1-.5 0c-.28-1.31-.72-1.75-2.03-2.03a.25.25 0 0 1 0-.49c1.31-.28 1.75-.73 2.03-2.03a.25.25 0 0 1 .25-.2Z" />
    </svg>
  );
}

/** Pink-purple-cyan gradient sparkle mark for Quill (Writing Assistant). */
export function QuillSparkleSvg({ size = 16, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" className={className} aria-hidden="true">
      <path
        d="M8 1.5c.3 2.9 1.6 4.2 4.5 4.5-2.9.3-4.2 1.6-4.5 4.5-.3-2.9-1.6-4.2-4.5-4.5 2.9-.3 4.2-1.6 4.5-4.5Z"
        fill={`url(#${uid}-ql)`}
      />
      <path
        d="M12.25 10c.13 1.3.7 1.87 2 2-1.3.13-1.87.7-2 2-.13-1.3-.7-1.87-2-2 1.3-.13 1.87-.7 2-2Z"
        fill={`url(#${uid}-ql)`}
      />
      <defs>
        <linearGradient id={`${uid}-ql`} x1="3" y1="2" x2="14" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ee3e9e" />
          <stop offset="0.52" stopColor="#a651f0" />
          <stop offset="1" stopColor="#4fb0fe" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Blue-violet gradient circular avatar for Atlas assistant in Comment Thread. */
export function AtlasAvatarSvg({ size = 20, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-at`} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5b9dff" />
          <stop offset="0.5" stopColor="#2f6bff" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill={`url(#${uid}-at)`} />
    </svg>
  );
}

/** Globe + magnifying glass search icon from Thinking State. */
export function SearchGlobeSvg({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 12A10 10 0 1 0 12 22" />
      <path d="M20 5.7c-.93.07-2.13.43-2.96 1.5-1.5 1.94-3 2.1-4 1.46-1.5-.97-.24-2.54-2-3.4-1.15-.56-1.31-2.07-.67-3.26" />
      <path d="M2 11c.76.66 1.83 1.27 3.09 1.27 2.6 0 3.12.5 3.12 2.48s0 1.99.52 3.48c.34.97.46 1.94-.22 2.77" />
      <path d="m19.9 19.93 2.1 2.07m-.89-4.95a4.05 4.05 0 1 1-8.11 0 4.05 4.05 0 0 1 8.11 0Z" />
    </svg>
  );
}

/** Paper-plane share icon from Reaction Bar. */
export function ReactionShareSvg({ size = 15, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 3 10.5 13.5" />
      <path d="M21 3 14.6 20.6a.5.5 0 0 1-.93.05L10.5 13.5 3.35 10.33a.5.5 0 0 1 .05-.93Z" />
    </svg>
  );
}

const PORTRAIT_PALETTES: Record<string, { bg: string; hair: string; skin: string; shirt: string }> = {
  mara: { bg: "#fde8d8", hair: "#3b2318", skin: "#e6a882", shirt: "#3b82f6" },
  jonas: { bg: "#dbeafe", hair: "#4a3326", skin: "#f0be9a", shirt: "#1e40af" },
  lena: { bg: "#fce7f3", hair: "#b45309", skin: "#f5cba7", shirt: "#7c3aed" },
  theo: { bg: "#dcfce7", hair: "#1f2937", skin: "#c6865c", shirt: "#047857" },
  sofia: { bg: "#fef3c7", hair: "#291d18", skin: "#e09f76", shirt: "#be123c" },
  noah: { bg: "#e0e7ff", hair: "#5c3d2e", skin: "#f1c29d", shirt: "#334155" },
};

/** Warm illustrated circular portrait avatar for Comments Panel & Comment Thread. */
export function PortraitAvatarSvg({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const pal = PORTRAIT_PALETTES[first];
  if (!pal) {
    return null;
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: "999px", overflow: "hidden", display: "block", flexShrink: 0 }}
      aria-hidden="true"
    >
      <g style={{ clipPath: "circle(50% at 50% 50%)" }}>
        <circle cx="12" cy="12" r="12" fill={pal.bg} />
        <path d="M4.5 24c.8-4.2 3.8-6.4 7.5-6.4s6.7 2.2 7.5 6.4H4.5Z" fill={pal.shirt} />
        <circle cx="12" cy="10.2" r="4.3" fill={pal.skin} />
        <path
          d="M7.5 9.8c0-2.9 2-4.9 4.6-4.9 2.6 0 4.5 1.9 4.5 4.8-.9-1.2-2.3-1.8-4.4-1.8-2.1 0-3.7.7-4.7 1.9Z"
          fill={pal.hair}
        />
      </g>
    </svg>
  );
}
