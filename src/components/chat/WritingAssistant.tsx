import {
  useEffect,
  useRef,
  useState,
} from "react";
import { AfIcon, AfTextarea, AfTooltip } from "../../ui";
import { cn, useImeEnterGuard } from "../../primitives";
import {
  QuillSparkleSvg,
  type WritingAssistantProps,
  type WritingMessage,
  defaultWritingReply,
} from "../_shared/chat";

/**
 * Writing Assistant (Quill): single clean rounded-10px card with bottom-hairline header
 * (inline gradient sparkle + Quill + tagline + New chat), 340px ambient-blob canvas with
 * bottom-anchored left-aligned greeting & frosted hairline chips, and borderless bottom prompt row + mic.
 */
function WritingAssistant({
  name = "Quill",
  tagline = "Your writing companion.",
  greeting = "What should we write?",
  suggestions = ["Polish my email", "Make it shorter", "Fix the tone", "Draft a reply"],
  placeholder = "Ask anything…",
  dictation = "Polish my launch note so every customer clearly sees what's new.",
  respond,
  onSend,
  className,
}: WritingAssistantProps) {
  const [messages, setMessages] = useState<WritingMessage[]>([]);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [typing, setTyping] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const seed = useRef(0);
  const timers = useRef<number[]>([]);
  const dictationTimer = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const respondRef = useRef(respond);
  respondRef.current = respond;
  const ime = useImeEnterGuard();

  useEffect(
    () => () => {
      timers.current.forEach((id) => {
        window.clearTimeout(id);
        window.clearInterval(id);
      });
      if (dictationTimer.current) window.clearTimeout(dictationTimer.current);
    },
    [],
  );

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, typing]);

  const streamReply = (prompt: string) => {
    setTyping(true);
    const timeout = window.setTimeout(() => {
      setTyping(false);
      const reply = (respondRef.current ?? defaultWritingReply)(prompt);
      seed.current += 1;
      const id = seed.current;
      setMessages((list) => [...list, { id, role: "assistant", text: "" }]);
      setStreaming(true);
      let count = 0;
      const interval = window.setInterval(() => {
        count = Math.min(reply.length, count + 2);
        setMessages((list) =>
          list.map((message) => (message.id === id ? { ...message, text: reply.slice(0, count) } : message)),
        );
        if (count >= reply.length) {
          window.clearInterval(interval);
          setStreaming(false);
        }
      }, 26);
      timers.current.push(interval);
    }, 600);
    timers.current.push(timeout);
  };

  const send = (raw: string) => {
    const message = raw.trim();
    if (!message) return;
    seed.current += 1;
    setMessages((list) => [...list, { id: seed.current, role: "user", text: message }]);
    onSend?.(message);
    setText("");
    setListening(false);
    streamReply(message);
  };

  useEffect(() => {
    if (!listening) return;
    const transcript = dictation;
    let index = 0;
    setText("");
    const id = window.setInterval(() => {
      index = Math.min(transcript.length, index + 1);
      setText(transcript.slice(0, index));
      if (index >= transcript.length) {
        window.clearInterval(id);
        setListening(false);
        dictationTimer.current = window.setTimeout(() => send(transcript), 380);
      }
    }, 52);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, dictation]);

  useEffect(() => {
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setListening(false);
        setText("");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [listening]);

  const reset = () => {
    setMessages([]);
    setText("");
    setListening(false);
    setTyping(false);
    setStreaming(false);
  };

  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");

  return (
    <section className={cn("af-ch-writing", className)}>
      <header className="af-ch-writing__head">
        <div className="af-ch-writing__id">
          <h3 className="af-ch-writing__name">
            <QuillSparkleSvg size={16} />
            <span>{name}</span>
          </h3>
          <p className="af-ch-writing__tagline">{tagline}</p>
        </div>
        <AfTooltip label="New chat">
          <button
            type="button"
            className="af-ch-writing__newbtn"
            data-visible={messages.length > 0 || undefined}
            aria-label="New chat"
            tabIndex={messages.length > 0 ? 0 : -1}
            onClick={reset}
          >
            <AfIcon name="plus" size={15} />
          </button>
        </AfTooltip>
      </header>

      <div className="af-ch-writing__body">
        <div className="af-ch-writing__glow" aria-hidden>
          <span className="af-ch-writing__blob af-ch-writing__blob--pink" />
          <span className="af-ch-writing__blob af-ch-writing__blob--violet" />
          <span className="af-ch-writing__blob af-ch-writing__blob--blue" />
        </div>

        <div className="af-ch-writing__main" ref={listRef}>
          {messages.length === 0 ? (
            <div className="af-ch-writing__welcome">
              <p className="af-ch-writing__greeting">{greeting}</p>
              <div className="af-ch-writing__suggestions">
                {suggestions.map((item, idx) => (
                  <button
                    key={item}
                    type="button"
                    className="af-ch-writing__chip"
                    style={{ animationDelay: `${idx * 55}ms` }}
                    onClick={() => send(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="af-ch-writing__messages" aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className="af-ch-writing__msg" data-role={message.role}>
                  {message.role === "assistant" ? (
                    <span className="af-ch-writing__avatar" aria-hidden>
                      <QuillSparkleSvg size={13} />
                    </span>
                  ) : null}
                  <p className="af-ch-writing__bubble">
                    {message.text}
                    {streaming && lastAssistant?.id === message.id ? (
                      <span className="af-ch-caret" aria-hidden />
                    ) : null}
                  </p>
                </div>
              ))}
              {typing ? (
                <div className="af-ch-writing__msg" data-role="assistant">
                  <span className="af-ch-writing__avatar" aria-hidden>
                    <QuillSparkleSvg size={13} />
                  </span>
                  <span className="af-ch-writing__dots" aria-label="Typing">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div
          className="af-ch-writing__composer"
          data-listening={listening || undefined}
          onPointerDown={(event) => {
            if (!(event.target as HTMLElement).closest("button, textarea")) {
              textareaRef.current?.focus();
            }
          }}
        >
          <div className="af-ch-writing__field">
            <AfTextarea
              ref={textareaRef}
              variant="borderless"
              resize="none"
              inputClassName="af-ch-writing__input"
              rows={1}
              value={text}
              placeholder={listening ? "Listening…" : placeholder}
              aria-label="Message"
              onCompositionStart={ime.onCompositionStart}
              onCompositionEnd={ime.onCompositionEnd}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  if (ime.shouldBlockEnter(event)) return;
                  event.preventDefault();
                  send(text);
                }
                if (event.key === "Escape") setListening(false);
              }}
            />
          </div>

          {text.trim() && !listening ? (
            <button
              type="button"
              className="af-ch-writing__send"
              aria-label="Send"
              onClick={() => send(text)}
            >
              <AfIcon name="arrowUp" size={14} />
            </button>
          ) : null}

          <AfTooltip label={listening ? "Stop voice input" : "Dictate"}>
            <button
              type="button"
              className="af-ch-writing__mic"
              data-listening={listening || undefined}
              aria-label={listening ? "Stop voice input" : "Dictate"}
              aria-pressed={listening}
              onClick={() => setListening((v) => !v)}
            >
              {listening ? (
                <span className="af-ch-writing__eq" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              ) : (
                <AfIcon name="mic" size={16} />
              )}
            </button>
          </AfTooltip>
        </div>
      </div>
    </section>
  );
}

export { WritingAssistant as AfWritingAssistant };
