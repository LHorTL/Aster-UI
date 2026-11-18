import {
  useEffect,
  useRef,
  useState,
} from "react";
import { AfExpand, AfIcon, AfInput, AfTooltip } from "../../ui";
import { cn, useControllableState } from "../../primitives";
import {
  type MessageActionKey,
  type MessageActionsProps,
  copyText,
  feedbackReasons as defaultReasons,
  useTransient,
} from "../_shared/chat";

const DEFAULT_ACTIONS: MessageActionKey[] = ["copy", "regenerate", "up", "down", "speak"];

function ThumbUpSolidSvg() {
  return (
    <svg width={15} height={15} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5.25 7.25 7.5 2.75c.9.15 1.5.85 1.5 1.75v2.25h2.75a1 1 0 0 1 .98 1.2l-.7 3.5a1.5 1.5 0 0 1-1.47 1.2H5.25z" />
      <path d="M2.75 7.25h1.5v5.4h-1.5a.5.5 0 0 1-.5-.5v-4.4a.5.5 0 0 1 .5-.5z" />
    </svg>
  );
}

function ThumbDownSolidSvg() {
  return (
    <svg width={15} height={15} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5.25 8.75 7.5 13.25c.9-.15 1.5-.85 1.5-1.75V9.25h2.75a1 1 0 0 0 .98-1.2l-.7-3.5a1.5 1.5 0 0 0-1.47-1.2H5.25z" />
      <path d="M2.75 3.35h1.5v5.4h-1.5a.5.5 0 0 1-.5-.5v-4.4a.5.5 0 0 1 .5-.5z" />
    </svg>
  );
}

/**
 * Message Actions: copy morphing to green check, regenerate spin + version switcher,
 * thumbs up/down with inline feedback reason chips + Other details input + Send, and 4-bar speaker.
 */
function MessageActions({
  text = "Version 2.4 adds shared workspaces, cuts sync time in half and fixes the export bug on Windows.",
  actions = DEFAULT_ACTIONS,
  versions = 1,
  version,
  defaultVersion,
  onVersionChange,
  onRegenerate,
  regenerating = false,
  quiet = true,
  reasons = defaultReasons,
  speaking: speakingProp,
  speakDuration,
  onSpeak,
  onCopy,
  onFeedback,
  label = "Message actions",
  className,
}: MessageActionsProps) {
  const count = typeof versions === "number" ? Math.max(1, versions) : Math.max(1, versions.length);
  const [innerVersion, setInnerVersion] = useState(Math.min(count - 1, defaultVersion ?? count - 1));
  const current = Math.max(0, Math.min(count - 1, version ?? innerVersion));
  const resolvedText =
    Array.isArray(versions) && versions[current] !== undefined ? versions[current] : text;

  const [copied, setCopied] = useTransient(1600);
  const [spinning, setSpinning] = useTransient(760);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [popKey, setPopKey] = useState<"up" | "down" | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [other, setOther] = useState("");
  const [speaking, setSpeaking] = useControllableState({
    value: speakingProp,
    defaultValue: false,
    onChange: onSpeak,
  });
  const [announce, setAnnounce] = useState("");
  const [thanks, setThanks] = useTransient(2400);

  const thumbDownRef = useRef<HTMLButtonElement>(null);
  const popTimer = useRef<number | null>(null);
  const onVersionRef = useRef(onVersionChange);
  onVersionRef.current = onVersionChange;
  const onRegenerateRef = useRef(onRegenerate);
  onRegenerateRef.current = onRegenerate;
  const onFeedbackRef = useRef(onFeedback);
  onFeedbackRef.current = onFeedback;

  useEffect(
    () => () => {
      if (popTimer.current) window.clearTimeout(popTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!speaking || speakingProp !== undefined) return;
    setAnnounce("Reading aloud");
    const duration = speakDuration ?? Math.max(2600, resolvedText.length * 75);
    const id = window.setTimeout(() => {
      setSpeaking(false);
      setAnnounce("Finished reading");
    }, duration);
    return () => window.clearTimeout(id);
  }, [speaking, speakingProp, speakDuration, resolvedText.length, setSpeaking]);

  useEffect(() => {
    if (!reasonOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setReasonOpen(false);
        thumbDownRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [reasonOpen]);

  const triggerPop = (key: "up" | "down") => {
    setPopKey(key);
    if (popTimer.current) window.clearTimeout(popTimer.current);
    popTimer.current = window.setTimeout(() => setPopKey(null), 340);
  };

  const pickVersion = (next: number) => {
    const clamped = Math.max(0, Math.min(count - 1, next));
    if (version === undefined) setInnerVersion(clamped);
    onVersionRef.current?.(clamped);
    setAnnounce(`Version ${clamped + 1} of ${count}`);
  };

  const copy = () => {
    copyText(resolvedText);
    onCopy?.(resolvedText);
    setCopied(true);
    setAnnounce("Copied");
  };

  const regenerate = () => {
    setSpinning(true);
    onRegenerateRef.current?.();
    setAnnounce("Regenerating");
  };

  const sendFeedback = (detail?: string) => {
    const trimmed = detail?.trim();
    setVote("down");
    setReason(trimmed || null);
    setOtherOpen(false);
    setThanks(true);
    if (trimmed) onFeedbackRef.current?.("down", trimmed);
    setAnnounce(trimmed ? `Feedback sent: ${trimmed}` : "Feedback sent");
  };

  const toggleUp = () => {
    const next = vote === "up" ? null : "up";
    setVote(next);
    if (next) triggerPop("up");
    setReasonOpen(false);
    onFeedbackRef.current?.(next);
    setAnnounce(next ? "Marked helpful" : "Removed feedback");
  };

  const toggleDown = () => {
    const nextOpen = !reasonOpen;
    setReasonOpen(nextOpen);
    setOtherOpen(false);
    if (nextOpen) {
      setVote("down");
      triggerPop("down");
      onFeedbackRef.current?.("down");
      setAnnounce("Choose a reason");
    } else if (vote === "down" && !reason) {
      setVote(null);
      onFeedbackRef.current?.(null);
    }
  };

  const toggleSpeak = () => {
    if (speaking) {
      setSpeaking(false);
      setAnnounce("Stopped reading");
    } else {
      setSpeaking(true);
    }
  };

  const busy = spinning || regenerating;
  const hasAction = (key: MessageActionKey) => actions.includes(key);

  return (
    <div
      className={cn("af-ch-actions", className)}
      data-quiet={quiet || undefined}
      role="group"
      aria-label={label}
    >
      {hasAction("copy") ? (
        <AfTooltip label={copied ? "Copied" : "Copy"}>
          <button
            type="button"
            className="af-ch-actions__btn af-ch-actions__btn--copy"
            data-copied={copied || undefined}
            aria-label={copied ? "Copied" : "Copy"}
            onClick={copy}
          >
            <span className="af-ch-actions__morph" aria-hidden>
              <span className="af-ch-actions__layer af-ch-actions__layer--base">
                <AfIcon name="copy" size={15} />
              </span>
              <span className="af-ch-actions__layer af-ch-actions__layer--done">
                <svg className="af-ch-actions__checksvg" viewBox="0 0 16 16" width="15" height="15">
                  <path d="M3.5 8.3 6.5 11.2 12.5 5" pathLength={1} />
                </svg>
              </span>
            </span>
          </button>
        </AfTooltip>
      ) : null}

      {hasAction("regenerate") ? (
        <>
          <AfTooltip label="Regenerate">
            <button
              type="button"
              className="af-ch-actions__btn"
              data-spin={busy || undefined}
              data-loopspin={regenerating || undefined}
              aria-label="Regenerate"
              aria-busy={busy || undefined}
              onClick={regenerate}
              disabled={regenerating}
            >
              <AfIcon name="refresh" size={15} />
            </button>
          </AfTooltip>

          {count >= 2 ? (
            <span className="af-ch-actions__versions" role="group" aria-label="Switch version">
              <button
                type="button"
                className="af-ch-actions__verbtn"
                aria-label="Previous version"
                disabled={current === 0}
                onClick={() => pickVersion(current - 1)}
              >
                <AfIcon name="chevronLeft" size={11} />
              </button>
              <span className="af-ch-actions__verlabel" aria-label={`Version ${current + 1} of ${count}`}>
                {current + 1} / {count}
              </span>
              <button
                type="button"
                className="af-ch-actions__verbtn"
                aria-label="Next version"
                disabled={current === count - 1}
                onClick={() => pickVersion(current + 1)}
              >
                <AfIcon name="chevronRight" size={11} />
              </button>
            </span>
          ) : null}
        </>
      ) : null}

      {hasAction("up") ? (
        <AfTooltip label="Good response">
          <button
            type="button"
            className="af-ch-actions__btn"
            data-active={vote === "up" || undefined}
            data-pop={popKey === "up" || undefined}
            aria-label="Good response"
            aria-pressed={vote === "up"}
            onClick={toggleUp}
          >
            {vote === "up" ? <ThumbUpSolidSvg /> : <AfIcon name="thumbsUp" size={15} />}
          </button>
        </AfTooltip>
      ) : null}

      {hasAction("down") ? (
        <AfTooltip label="Bad response">
          <button
            ref={thumbDownRef}
            type="button"
            className="af-ch-actions__btn"
            data-active={vote === "down" || undefined}
            data-pop={popKey === "down" || undefined}
            aria-label="Bad response"
            aria-pressed={vote === "down"}
            aria-expanded={reasonOpen}
            onClick={toggleDown}
          >
            {vote === "down" ? <ThumbDownSolidSvg /> : <AfIcon name="thumbsDown" size={15} />}
          </button>
        </AfTooltip>
      ) : null}

      {hasAction("speak") ? (
        <AfTooltip label={speaking ? "Stop reading" : "Read aloud"}>
          <button
            type="button"
            className="af-ch-actions__btn"
            data-active={speaking || undefined}
            aria-label={speaking ? "Stop reading" : "Read aloud"}
            aria-pressed={speaking}
            onClick={toggleSpeak}
          >
            {speaking ? (
              <span className="af-ch-actions__bars" aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </span>
            ) : (
              <AfIcon name="speaker" size={15} />
            )}
          </button>
        </AfTooltip>
      ) : null}

      <AfExpand open={reasonOpen}>
        <div className="af-ch-actions__panel" role="group" aria-label="Feedback reasons">
          <div className="af-ch-actions__panelhead">
            <span className="af-ch-actions__ask">What went wrong?</span>
            <button
              type="button"
              className="af-ch-actions__close"
              aria-label="Close feedback"
              onClick={() => {
                setReasonOpen(false);
                thumbDownRef.current?.focus();
              }}
            >
              <AfIcon name="x" size={13} />
            </button>
          </div>
          <div className="af-ch-actions__reasons">
            {reasons.map((item) => {
              const isOther = item === "Other";
              return (
                <button
                  key={item}
                  type="button"
                  className="af-ch-actions__reason"
                  data-active={reason === item || (isOther && otherOpen) || undefined}
                  onClick={() => {
                    if (isOther) {
                      setOtherOpen((value) => !value);
                      setReason(null);
                    } else {
                      setOtherOpen(false);
                      setReason(item);
                    }
                  }}
                >
                  {item}
                </button>
              );
            })}
            {thanks ? (
              <span className="af-ch-actions__thanks">
                <AfIcon name="check" size={13} />
                Thanks!
              </span>
            ) : (
              <button
                type="button"
                className="af-ch-actions__sendbtn"
                disabled={!reason && !other.trim()}
                onClick={() => sendFeedback(otherOpen ? other : (reason ?? undefined))}
              >
                Send
              </button>
            )}
          </div>
          <AfExpand open={otherOpen}>
            <div className="af-ch-actions__other">
              <AfInput
                size="sm"
                value={other}
                placeholder="Tell us more (optional)"
                aria-label="Details"
                onChange={(event) => setOther(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendFeedback(other);
                  }
                }}
              />
            </div>
          </AfExpand>
        </div>
      </AfExpand>

      <span className="af-ch-live" role="status">
        {thanks ? "Thanks for the feedback." : announce}
      </span>
    </div>
  );
}

export { MessageActions as AfMessageActions };
