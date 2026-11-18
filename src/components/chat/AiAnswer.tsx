import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AfExpand, AfIcon, AfKbd, AfTooltip } from "../../ui";
import { cn } from "../../primitives";
import {
  type AiAnswerProps,
  type AnswerSource,
  BrandFavicon,
  DualSparkleSvg,
  StagePopover,
  buildAnswerUnits,
  copyText,
  renderAnswerUnits,
  useAnchor,
  useTransient,
} from "../_shared/chat";

const DEFAULT_SOURCES: AnswerSource[] = [
  {
    name: "Notion",
    title: "Offsite plan – shortlist and budget",
    snippet: "Alfama scored highest for walkable team dinners, boutique hotels under €180/night, and two quiet coworking lofts.",
    icon: "file",
    url: "https://www.notion.so",
  },
  {
    name: "Slack",
    title: "#team-offsite – who can make which dates",
    snippet: "18 of 21 teammates voted for Alfama or Chiado within 20 minutes of LIS airport.",
    icon: "message",
    url: "https://slack.com",
  },
  {
    name: "Wikipedia",
    title: "Alfama – the oldest district of Lisbon",
    snippet: "Lisbon's oldest district, overlooking the Tagus with tram 28 connections and compact historic squares.",
    icon: "globe",
    url: "https://en.wikipedia.org/wiki/Alfama",
  },
  {
    name: "Time Out",
    title: "Best group dining rooms in Lisbon",
    snippet: "Private mezzanine tables for 16–24 guests in Alfama and Baixa with set menus.",
    icon: "sparkle",
  },
  {
    name: "Google Flights",
    title: "Direct routes to LIS in October",
    snippet: "Morning arrivals from London, Berlin, and Paris land before 11:30 local time.",
    icon: "globe",
  },
  {
    name: "Linear",
    title: "Q4 offsite budget & agenda",
    snippet: "Approved budget covers three nights, workshop room rental, and Thursday team dinner.",
    icon: "chart",
  },
];

const DEFAULT_ANSWER = `**Alfama** is the best fit for a 20-person team offsite — walkable, scenic, and 20 minutes from the airport [1,2].

- Boutique hotels cluster around Largo do Chafariz de Dentro within the \`€180/night\` budget [1]
- Two daylight workshop lofts sit five minutes apart, with tram 28 and river viewpoints right outside [3]
- Most European flights land before \`11:30\`, so Tuesday's kickoff can start after lunch [2,5]

**Next step**: hold rooms at Solar dos Poetas and book a 20-seat mezzanine table for Thursday night [4,6].`;

const DEFAULT_REASONS = ["Not accurate", "Wrong source", "Too long", "Out of date"];

function renderSourceFavicon(source: AnswerSource) {
  const lower = source.name.toLowerCase();
  if (
    lower.includes("notion") ||
    lower.includes("slack") ||
    lower.includes("wiki") ||
    lower === "x" ||
    lower.includes("linear")
  ) {
    return <BrandFavicon brand={source.name} size={14} />;
  }
  return <AfIcon name={source.icon ?? "globe"} size={12} />;
}

/**
 * AI Answer: source cards (collapsing beyond 3 into "+N more") + dual-sparkle shimmer status +
 * word-by-word streaming body + inline citation chips + footer stop/copy/regenerate/feedback/speak.
 */
function AiAnswer({
  question = "Where should we hold the team offsite in Lisbon?",
  sources = DEFAULT_SOURCES,
  answer = DEFAULT_ANSWER,
  streaming: streamingProp,
  animate = true,
  speed = 26,
  framed = true,
  followUps = [],
  followUpAnswers = {},
  feedbackReasons = DEFAULT_REASONS,
  onFollowUp,
  onRegenerate,
  onStop,
  onFeedback,
  onCopy,
  className,
}: AiAnswerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(question);
  const fullAnswer =
    currentQuestion === question ? answer : (followUpAnswers[currentQuestion] ?? "Got it — checking the sources on that.");
  const units = useMemo(() => buildAnswerUnits(fullAnswer), [fullAnswer]);

  const [visible, setVisible] = useState(animate ? 0 : units.length);
  const [internalStreaming, setInternalStreaming] = useState(animate);
  const streaming = streamingProp ?? internalStreaming;
  const [run, setRun] = useState(0);
  const [versionCount, setVersionCount] = useState(1);
  const [showAllSources, setShowAllSources] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const previewAnchor = useAnchor();
  const [copied, setCopied] = useTransient();
  const [spinning, setSpinning] = useTransient(900);
  const [speaking, setSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [phase, setPhase] = useState<"reading" | "writing">(animate ? "reading" : "writing");
  const [stopped, setStopped] = useState(false);
  const streamAbort = useRef(false);

  useEffect(() => {
    setCurrentQuestion(question);
  }, [question]);

  useEffect(() => {
    if (!animate) {
      setVisible(units.length);
      setInternalStreaming(false);
      setPhase("writing");
      return;
    }
    let count = 0;
    let interval: number | undefined;
    streamAbort.current = false;
    setVisible(0);
    setInternalStreaming(true);
    setStopped(false);
    setPhase("reading");
    const startTimer = window.setTimeout(() => {
      if (streamAbort.current) return;
      setPhase("writing");
      interval = window.setInterval(() => {
        if (streamAbort.current) {
          if (interval) window.clearInterval(interval);
          return;
        }
        count = Math.min(units.length, count + 1);
        setVisible(count);
        if (count >= units.length) {
          if (interval) window.clearInterval(interval);
          setInternalStreaming(false);
        }
      }, speed);
    }, 520);
    return () => {
      streamAbort.current = true;
      window.clearTimeout(startTimer);
      if (interval) window.clearInterval(interval);
    };
  }, [units, run, animate, speed]);

  useEffect(() => {
    if (!speaking) return;
    const id = window.setTimeout(() => setSpeaking(false), 3200);
    return () => window.clearTimeout(id);
  }, [speaking]);

  useEffect(() => {
    if (previewIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewIndex(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [previewIndex]);

  const activeIndex = previewIndex ?? hoverIndex;
  const previewSource = previewIndex === null ? null : sources[previewIndex];
  const shownSources = showAllSources || sources.length <= 3 ? sources : sources.slice(0, 3);
  const hiddenSourceCount = sources.length - shownSources.length;

  const statusText = streaming
    ? phase === "reading"
      ? `Reading ${sources.length} sources`
      : "Writing answer"
    : stopped
      ? "Stopped"
      : `Answer · ${sources.length} sources`;

  const copyAnswer = () => {
    const plain = fullAnswer.replace(/\*\*/g, "");
    const list = sources.map((source, index) => `[${index + 1}] ${source.name} · ${source.title}`).join("\n");
    const full = `${plain}\n\nSources:\n${list}`;
    copyText(full);
    onCopy?.(full);
    setCopied(true);
  };

  const stopStreaming = () => {
    streamAbort.current = true;
    setStopped(true);
    setInternalStreaming(false);
    onStop?.();
  };

  const vote = (kind: "up" | "down") => {
    if (kind === "down") {
      const nextOpen = !reasonOpen;
      setFeedback("down");
      setReason(null);
      setReasonOpen(nextOpen);
      onFeedback?.("down");
      return;
    }
    const next = feedback === "up" ? null : "up";
    setFeedback(next);
    setReasonOpen(false);
    onFeedback?.(next);
  };

  return (
    <article className={cn("af-ch-answer", !framed && "af-ch-answer--plain", className)} data-phase={streaming ? phase : "done"}>
      <div className="af-ch-answer__inner">
        {currentQuestion ? (
          <header className="af-ch-answer__head">
            <h3 className="af-ch-answer__question">{currentQuestion}</h3>
          </header>
        ) : null}

        {sources.length > 0 ? (
          <div className="af-ch-answer__sources" aria-label="Sources">
            {shownSources.map((source, index) => (
              <button
                key={`${source.name}-${source.title}`}
                type="button"
                className="af-ch-source"
                data-lit={activeIndex === index || undefined}
                aria-label={`Source ${index + 1}: ${source.name} · ${source.title}`}
                style={{ animationDelay: `${120 + index * 90}ms` }}
                onPointerEnter={() => setHoverIndex(index)}
                onPointerLeave={() => setHoverIndex(null)}
                onClick={(event) => {
                  previewAnchor.setElement(event.currentTarget);
                  setPreviewIndex(index);
                }}
              >
                <span className="af-ch-source__site">
                  <span className="af-ch-source__favicon" aria-hidden>
                    {renderSourceFavicon(source)}
                  </span>
                  <span className="af-ch-source__sitename">{source.name}</span>
                  <em className="af-ch-source__num">{index + 1}</em>
                </span>
                <span className="af-ch-source__title">{source.title}</span>
              </button>
            ))}
            {hiddenSourceCount > 0 ? (
              <button
                type="button"
                className="af-ch-source af-ch-source--more"
                style={{ animationDelay: "390ms" }}
                onClick={() => setShowAllSources(true)}
              >
                <span className="af-ch-source__morenum">+{hiddenSourceCount}</span>
                <span className="af-ch-source__morelabel">more</span>
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="af-ch-answer__status" role="status">
          <DualSparkleSvg size={14} className={cn("af-ch-answer__mark", streaming && "af-ch-twinkle")} />
          <span
            className={cn("af-ch-answer__statustext", streaming && "af-ch-shimmer")}
            data-text={streaming ? statusText : undefined}
          >
            {statusText}
          </span>
        </div>

        <div className="af-ch-answer__body" aria-busy={streaming || undefined}>
          {renderAnswerUnits(
            units,
            visible,
            streaming,
            sources,
            activeIndex,
            (index, anchor) => {
              previewAnchor.setElement(anchor);
              setPreviewIndex(index);
            },
            setHoverIndex,
          )}
        </div>
      </div>

      <footer className="af-ch-answer__foot" aria-label="Answer actions">
        {streaming ? (
          <button type="button" className="af-ch-answer__stop" onClick={stopStreaming}>
            <span className="af-ch-answer__stopicon" aria-hidden />
            Stop
          </button>
        ) : (
          <div className="af-ch-answer__tools">
            <AfTooltip label={copied ? "Copied" : "Copy answer"}>
              <button
                type="button"
                className="af-ch-answer__tool"
                data-copied={copied || undefined}
                aria-label={copied ? "Copied" : "Copy answer"}
                onClick={copyAnswer}
              >
                <AfIcon name={copied ? "check" : "copy"} size={14} />
              </button>
            </AfTooltip>
            <AfTooltip label="Regenerate">
              <button
                type="button"
                className="af-ch-answer__tool"
                aria-label="Regenerate"
                data-spin={spinning || undefined}
                onClick={() => {
                  setSpinning(true);
                  setVersionCount((c) => c + 1);
                  setRun((value) => value + 1);
                  onRegenerate?.();
                }}
              >
                <AfIcon name="refresh" size={14} />
              </button>
            </AfTooltip>
            {versionCount > 1 ? (
              <span className="af-ch-answer__vlabel">
                {versionCount} / {versionCount}
              </span>
            ) : null}
            <AfTooltip label="Good response">
              <button
                type="button"
                className="af-ch-answer__tool"
                data-active={feedback === "up" || undefined}
                aria-label="Good response"
                aria-pressed={feedback === "up"}
                onClick={() => vote("up")}
              >
                <AfIcon name="thumbsUp" size={14} />
              </button>
            </AfTooltip>
            <AfTooltip label="Bad response">
              <button
                type="button"
                className="af-ch-answer__tool"
                data-active={feedback === "down" || undefined}
                aria-label="Bad response"
                aria-pressed={feedback === "down"}
                aria-expanded={reasonOpen}
                onClick={() => vote("down")}
              >
                <AfIcon name="thumbsDown" size={14} />
              </button>
            </AfTooltip>
            <AfTooltip label={speaking ? "Stop reading" : "Read aloud"}>
              <button
                type="button"
                className="af-ch-answer__tool"
                data-active={speaking || undefined}
                aria-label={speaking ? "Stop reading" : "Read aloud"}
                aria-pressed={speaking}
                onClick={() => setSpeaking((v) => !v)}
              >
                {speaking ? (
                  <span className="af-ch-actions__bars" aria-hidden>
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  <AfIcon name="speaker" size={14} />
                )}
              </button>
            </AfTooltip>
          </div>
        )}
        <span className="af-ch-answer__soon" role="status">
          {feedback === "up" ? "Thanks for the feedback" : reason ? `Noted: ${reason}` : ""}
        </span>
      </footer>

      <AfExpand open={reasonOpen}>
        <div className="af-ch-answer__reasons">
          {feedbackReasons.map((item) => (
            <button
              key={item}
              type="button"
              className="af-ch-chip"
              data-active={reason === item || undefined}
              onClick={() => {
                setReason(item);
                setReasonOpen(false);
                onFeedback?.("down", item);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </AfExpand>

      {!streaming && currentQuestion === question && followUps.length ? (
        <div className="af-ch-followups" aria-label="Follow-up questions">
          {followUps.map((text) => (
            <button
              key={text}
              type="button"
              className="af-ch-followup"
              onClick={() => {
                onFollowUp?.(text);
                setCurrentQuestion(text);
                setFeedback(null);
                setReason(null);
                setReasonOpen(false);
              }}
            >
              <span>{text}</span>
              <AfIcon name="arrowRight" size={12} />
            </button>
          ))}
        </div>
      ) : null}

      <StagePopover
        open={previewIndex !== null}
        anchorRef={previewAnchor.ref}
        role="dialog"
        label="Source preview"
        onClose={() => setPreviewIndex(null)}
        className="af-ch-sourcepreview-pop"
      >
        {previewSource ? (
          <div className="af-ch-sourcepreview">
            <span className="af-ch-sourcepreview__head">
              {renderSourceFavicon(previewSource)}
              {previewSource.name} · Source {(previewIndex ?? 0) + 1}
            </span>
            <strong className="af-ch-sourcepreview__title">{previewSource.title}</strong>
            <p className="af-ch-sourcepreview__snippet">{previewSource.snippet}</p>
            <span className="af-ch-sourcepreview__hint">
              <AfKbd>Esc</AfKbd> to close
            </span>
          </div>
        ) : null}
      </StagePopover>
    </article>
  );
}

export { AiAnswer as AfAiAnswer };
