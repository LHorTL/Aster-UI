import {
  useEffect,
  useRef,
  useState,
} from "react";
import { AfExpand, AfIcon, AfInput } from "../../ui";
import { cn, useImeEnterGuard } from "../../primitives";
import {
  AtlasAvatarSvg,
  type CommentThreadProps,
  type ThreadAuthor,
  type ThreadMessage,
} from "../_shared/chat";
import { ChatPortraitAvatar } from "./portraits";
import { AfThinkingLoader as ThinkingLoader } from "./ThinkingLoader";

const DEFAULT_CURRENT_USER: ThreadAuthor = { name: "Noah" };
const DEFAULT_ASSISTANT: ThreadAuthor = { name: "Atlas", assistant: true };
const DEFAULT_THREAD_MESSAGES: ThreadMessage[] = [
  {
    id: "t1",
    author: "Lena Lindqvist",
    time: "3min ago",
    text: "/edit Rename every “customers” to “members” on the pricing page.",
  },
  {
    id: "t2",
    author: "Atlas",
    assistant: true,
    time: "1min ago",
    text: "",
    status: "Edit completed",
    details: [
      "Renamed 12 mentions in 3 sections",
      "Kept “customer support” as it is",
      "Left the legal pages untouched",
    ],
  },
];

function FilledCheckCircleSvg() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" className="af-ch-thread__check" aria-hidden="true">
      <path d="M1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Zm8.9-1.2a.5.5 0 0 0-.8-.6L7.44 9.23 6.35 8.15a.5.5 0 1 0-.7.7l1.5 1.5a.5.5 0 0 0 .76-.06l2.5-3.5Z" />
    </svg>
  );
}

/**
 * Comment Thread: single clean card with bottom-hairline header ("Comment 2 messages ×"),
 * stacked thread messages with illustrated/gradient avatars, green filled circle-check status +
 * expandable tree-branch details, and bottom reply input ("Reply, or ask @Atlas…").
 */
function CommentThread({
  title = "Comment",
  messages: initial = DEFAULT_THREAD_MESSAGES,
  currentUser = DEFAULT_CURRENT_USER,
  assistant = DEFAULT_ASSISTANT,
  onReply,
  onClose,
  className,
}: CommentThreadProps) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [closed, setClosed] = useState(false);

  const seed = useRef(0);
  const replyTimer = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ime = useImeEnterGuard();

  useEffect(
    () => () => {
      if (replyTimer.current) window.clearTimeout(replyTimer.current);
    },
    [],
  );

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, thinking]);

  const toggleDetails = (id: string) => {
    setExpanded((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
  };

  const send = () => {
    const value = text.trim();
    if (!value) return;
    seed.current += 1;
    setMessages((list) => [...list, { id: `u-${seed.current}`, author: currentUser.name, time: "Just now", text: value }]);
    onReply?.(value);
    setText("");
    if (!value.includes("@")) return;
    setThinking(true);
    replyTimer.current = window.setTimeout(() => {
      seed.current += 1;
      setThinking(false);
      setMessages((list) => [
        ...list,
        {
          id: `a-${seed.current}`,
          author: assistant.name,
          assistant: true,
          time: "Just now",
          text: "Updated the section and verified the numbers against last week's cohort sheet.",
          status: "Edit completed",
          details: [
            "Read cohort retention rows",
            "Cross-checked week-over-week delta",
            "Applied inline copy update",
          ],
        },
      ]);
    }, 1400);
  };

  if (closed) {
    return (
      <button type="button" className="af-ch-thread__reopen" onClick={() => setClosed(false)}>
        <AfIcon name="message" size={14} />
        {title} · {messages.length}
        <AfIcon name="chevronDown" size={12} />
      </button>
    );
  }

  return (
    <section className={cn("af-ch-thread", className)} aria-label={title}>
      <header className="af-ch-thread__head">
        <h3 className="af-ch-thread__title">{title}</h3>
        <span className="af-ch-thread__count">
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </span>
        <span className="af-ch-thread__spacer" />
        <button
          type="button"
          className="af-ch-thread__iconbtn"
          aria-label="Close comment"
          onClick={() => {
            onClose?.();
            setClosed(true);
          }}
        >
          <AfIcon name="x" size={14} />
        </button>
      </header>

      <div className="af-ch-thread__scroll" aria-live="polite" ref={listRef}>
        {messages.map((message) => {
          const isOpen = expanded.includes(message.id);
          const isEditCmd = /^\/edit\s+/i.test(message.text);
          const editPrefix = isEditCmd ? message.text.slice(0, 5) : "";
          const bodyText = isEditCmd ? message.text.slice(5).trimStart() : message.text;
          return (
            <article
              key={message.id}
              className="af-ch-thread__msg"
              data-assistant={message.assistant || undefined}
            >
              <div className="af-ch-thread__meta">
                <span className="af-ch-thread__avatar" data-assistant={message.assistant || undefined} aria-hidden>
                  {message.assistant ? (
                    <AtlasAvatarSvg size={20} />
                  ) : (
                    <ChatPortraitAvatar name={message.author} size={20} />
                  )}
                </span>
                <strong className="af-ch-thread__name">{message.author}</strong>
                <time className="af-ch-thread__time">{message.time}</time>
              </div>
              {message.text ? (
                <p className="af-ch-thread__text">
                  {isEditCmd ? <span className="af-ch-thread__cmd">{editPrefix}</span> : null}
                  {isEditCmd ? ` ${bodyText}` : bodyText}
                </p>
              ) : null}
              {message.status ? (
                <div className="af-ch-thread__statuswrap">
                  <button
                    type="button"
                    className="af-ch-thread__status"
                    aria-expanded={isOpen}
                    onClick={() => toggleDetails(message.id)}
                  >
                    <FilledCheckCircleSvg />
                    <span className="af-ch-thread__statustext">{message.status}</span>
                    <AfIcon name="chevronDown" size={12} className="af-ch-thread__chevron" />
                  </button>
                  <AfExpand open={isOpen}>
                    <ul className="af-ch-thread__details">
                      {(message.details ?? []).map((detail, dIdx) => (
                        <li key={detail} style={{ animationDelay: `${dIdx * 45}ms` }}>
                          <span className="af-ch-thread__branch" aria-hidden />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </AfExpand>
                </div>
              ) : null}
            </article>
          );
        })}
        {thinking ? (
          <div className="af-ch-thread__msg" data-assistant>
            <div className="af-ch-thread__meta">
              <span className="af-ch-thread__avatar" data-assistant aria-hidden>
                <AtlasAvatarSvg size={20} />
              </span>
              <strong className="af-ch-thread__name">{assistant.name}</strong>
            </div>
            <span className="af-ch-thread__thinking">
              <ThinkingLoader
                variant="plain"
                size="sm"
                interval={1100}
                phases={["Reading…", "Checking numbers…", "Writing reply…"]}
              />
            </span>
          </div>
        ) : null}
      </div>

      <div
        className="af-ch-thread__composer"
        onPointerDown={(event) => {
          if (!(event.target as HTMLElement).closest("button, input")) {
            inputRef.current?.focus();
          }
        }}
      >
        <div className="af-ch-thread__field">
          <AfInput
            ref={inputRef}
            variant="borderless"
            inputClassName="af-ch-thread__input"
            value={text}
            placeholder={`Reply, or ask @${assistant.name}…`}
            aria-label="Reply"
            onCompositionStart={ime.onCompositionStart}
            onCompositionEnd={ime.onCompositionEnd}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                if (ime.shouldBlockEnter(event)) return;
                event.preventDefault();
                send();
              }
            }}
          />
        </div>
        <button
          type="button"
          className="af-ch-thread__send"
          disabled={!text.trim()}
          aria-label="Send reply"
          onClick={send}
        >
          <AfIcon name="arrowUp" size={14} />
        </button>
      </div>
    </section>
  );
}

export { CommentThread as AfCommentThread };
