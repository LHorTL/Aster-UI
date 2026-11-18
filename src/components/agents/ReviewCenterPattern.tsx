import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AfIcon } from "../../icons";
import { cn, useControllableState } from "../../primitives";
import {
  AgbBrandLogo,
  REVIEW_ITEMS,
  ReviewDiffLine,
  ReviewItem,
  ReviewText,
  RosetteCheckIcon,
  StagePopover,
  useStagePlacement,
} from "../_shared/agents-b";

export type { ReviewItem, ReviewText };

export type ReviewFilter = "all" | "high" | "unsure";

export interface AfReviewCenterPatternProps {
  /** Controlled review queue items. */
  items?: ReviewItem[];
  /** Initial review queue items. */
  initialItems?: ReviewItem[];
  /** Initial reviewed count (`24` by default). */
  initialReviewedCount?: number;
  /** Daily target or total reviews (`32` by default). */
  total?: number;
  /** SLA warning threshold in minutes (`20` by default). */
  sla?: number;
  /** Low-confidence threshold (`0.7` by default). */
  lowConfidence?: number;
  /** Rejection reason chips. */
  reasons?: string[];
  /** Queue sort order (`"risk"` by default). */
  order?: "risk" | "waiting" | "confidence";
  /** Controlled active filter. */
  filter?: ReviewFilter;
  /** Default filter. */
  defaultFilter?: ReviewFilter;
  /** Filter change callback. */
  onFilterChange?: (filter: ReviewFilter) => void;
  /** Generic decision callback. */
  onDecide?: (item: ReviewItem, action: string) => void;
  /** Approve callback. */
  onApprove?: (item: ReviewItem) => void;
  /** Reject callback. */
  onReject?: (item: ReviewItem, reason: string) => void;
  /** Skip callback. */
  onSkip?: (item: ReviewItem) => void;
  /** Undo callback. */
  onUndo?: (item: ReviewItem) => void;
  /** Extra class name. */
  className?: string;
  /** Inline style. */
  style?: CSSProperties;
}

function PencilTinyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.4 2.6a1.4 1.4 0 0 1 2 2L5.5 12.5 2.5 13.5l1-3 7.9-7.9Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function tokenizeCodeSegment(seg: string) {
  if (seg.trimStart().startsWith("//")) {
    return <span className="af-agb-rvc-tok-com">{seg}</span>;
  }
  const parts = seg.split(/(\b(?:const|let|var|await|async|if|return|for|it|ALTER|TABLE|ADD|COLUMN|UPDATE|SET|TEXT)\b|\b(?:getEndpoint|stringify|post|sleep|split_part)\b|\b\d+\b|"[^"]*"|'[^']*')/g);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (/^(const|let|var|await|async|if|return|for|it|ALTER|TABLE|ADD|COLUMN|UPDATE|SET|TEXT)$/.test(part)) {
      return (
        <span key={idx} className="af-agb-rvc-tok-kw">
          {part}
        </span>
      );
    }
    if (/^(getEndpoint|stringify|post|sleep|split_part)$/.test(part)) {
      return (
        <span key={idx} className="af-agb-rvc-tok-fn">
          {part}
        </span>
      );
    }
    if (/^\d+$/.test(part)) {
      return (
        <span key={idx} className="af-agb-rvc-tok-num">
          {part}
        </span>
      );
    }
    if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
      return (
        <span key={idx} className="af-agb-rvc-tok-str">
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function splitFilePath(path: string) {
  const slash = path.lastIndexOf("/");
  if (slash === -1) return { dir: "", base: path };
  return { dir: path.slice(0, slash + 1), base: path.slice(slash + 1) };
}

function renderCodeLine(
  line: ReviewDiffLine,
  onFlagClick: (text: string, flagNote: string, element: HTMLElement) => void,
) {
  if (!line.flag) {
    return <code>{tokenizeCodeSegment(line.text)}</code>;
  }
  const spanText = line.flagSpan && line.text.includes(line.flagSpan) ? line.flagSpan : line.text.trim();
  const pos = line.text.indexOf(spanText);
  if (pos === -1) {
    return (
      <code>
        <button
          type="button"
          className="af-agb-rvc__flag af-agb-rvc__flag--code"
          onClick={(e) => onFlagClick(spanText, line.flag ?? "", e.currentTarget)}
          onFocus={(e) => onFlagClick(spanText, line.flag ?? "", e.currentTarget)}
        >
          {line.text}
        </button>
      </code>
    );
  }
  const before = line.text.slice(0, pos);
  const after = line.text.slice(pos + spanText.length);
  return (
    <code>
      {tokenizeCodeSegment(before)}
      <button
        type="button"
        className="af-agb-rvc__flag af-agb-rvc__flag--code"
        onClick={(e) => onFlagClick(spanText, line.flag ?? "", e.currentTarget)}
        onFocus={(e) => onFlagClick(spanText, line.flag ?? "", e.currentTarget)}
      >
        {spanText}
      </button>
      {tokenizeCodeSegment(after)}
    </code>
  );
}

function ReviewCenterDemo({
  items: itemsProp,
  initialItems = REVIEW_ITEMS,
  initialReviewedCount = 24,
  total = 32,
  sla = 20,
  lowConfidence = 0.7,
  reasons = ["Wrong logic", "Too risky", "Wrong tone", "Other"],
  order = "risk",
  filter: filterProp,
  defaultFilter = "all",
  onFilterChange,
  onDecide,
  onApprove,
  onReject,
  onSkip,
  onUndo,
  className,
  style,
}: AfReviewCenterPatternProps = {}) {
  const [items, setItems] = useControllableState<ReviewItem[]>({
    value: itemsProp,
    defaultValue: initialItems,
  });
  const [reviewed, setReviewed] = useState(initialReviewedCount);
  const [filter, setFilter] = useControllableState<ReviewFilter>({
    value: filterProp,
    defaultValue: defaultFilter,
    onChange: onFilterChange,
  });
  const [selectedId, setSelectedId] = useState((itemsProp ?? initialItems)[0]?.id ?? "");
  const [leaving, setLeaving] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [last, setLast] = useState<{
    item: ReviewItem;
    index: number;
    label: string;
    kind: "approved" | "rejected" | "skipped";
  } | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<{
    text: string;
    note: string;
    source?: string;
    element: HTMLElement;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { place, show, hide } = useStagePlacement();
  const leaveTimer = useRef<number | null>(null);

  const sorted = useMemo(() => {
    const weight = { high: 0, medium: 1, low: 2 };
    return [...items].sort((a, b) => {
      if (order === "waiting") return b.waiting - a.waiting;
      if (order === "confidence") return a.confidence - b.confidence;
      return weight[a.risk] - weight[b.risk] || b.waiting - a.waiting;
    });
  }, [items, order]);

  const filtered = sorted.filter((item) =>
    filter === "all" ? true : filter === "high" ? item.risk === "high" : item.confidence < lowConfidence,
  );
  const selected = items.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const oldestWait = items.length ? Math.max(...items.map((i) => i.waiting)) : 0;

  useEffect(
    () => () => {
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    },
    [],
  );

  const selectNext = (currentId: string, list = filtered) => {
    const idx = list.findIndex((item) => item.id === currentId);
    const next = list[idx + 1] ?? list[idx - 1] ?? list[0];
    if (next) setSelectedId(next.id);
  };

  const decide = (
    item: ReviewItem,
    label: string,
    kind: "approved" | "rejected" | "skipped",
    reason?: string,
  ) => {
    const idx = items.findIndex((entry) => entry.id === item.id);
    setLast({ item, index: idx, label, kind });
    setReviewed((value) => value + 1);
    setLeaving(item.id);
    setRejecting(false);
    setEditing(false);
    onDecide?.(item, label);
    if (kind === "approved") onApprove?.(item);
    else if (kind === "rejected") onReject?.(item, reason ?? "Other");
    else onSkip?.(item);
    leaveTimer.current = window.setTimeout(() => {
      setItems((list) => list.filter((entry) => entry.id !== item.id));
      setLeaving(null);
      selectNext(item.id, filtered.filter((entry) => entry.id !== item.id));
    }, 280);
  };

  const undo = () => {
    if (!last) return;
    setItems((list) => {
      const next = [...list];
      next.splice(Math.min(last.index, next.length), 0, last.item);
      return next;
    });
    setReviewed((value) => Math.max(0, value - 1));
    setSelectedId(last.item.id);
    onUndo?.(last.item);
    setLast(null);
  };

  const openNote = (text: string, noteText: string, source: string | undefined, element: HTMLElement) => {
    setNote({ text, note: noteText, source, element });
    show(element, 260);
  };

  const renderProse = (value: ReviewText[]) =>
    value.map((part, idx) =>
      typeof part === "string" ? (
        <span key={idx}>{part}</span>
      ) : (
        <button
          key={idx}
          type="button"
          className="af-agb-rvc__flag"
          onClick={(event) => openNote(part.text, part.note ?? "", part.source, event.currentTarget)}
          onFocus={(event) => openNote(part.text, part.note ?? "", part.source, event.currentTarget)}
        >
          {part.text}
        </button>
      ),
    );

  const proposal = selected ? (
    selected.files ? (
      <div className="af-agb-rvc__code">
        {selected.files.map((file) => {
          const fileKey = `${selected.id}:${file.path}`;
          const isCollapsed = expandedFiles[fileKey] !== undefined ? !expandedFiles[fileKey] : Boolean(file.collapsed);
          return (
            <div className="af-agb-rvc__file" key={file.path} data-collapsed={isCollapsed || undefined}>
              <button
                type="button"
                className="af-agb-rvc__filehead"
                onClick={() =>
                  setExpandedFiles((prev) => ({
                    ...prev,
                    [fileKey]: isCollapsed,
                  }))
                }
              >
                <span className="af-agb-rvc__path">
                  <span className="af-agb-rvc__pathdir">{splitFilePath(file.path).dir}</span>
                  <span className="af-agb-rvc__pathbase">{splitFilePath(file.path).base}</span>
                </span>
                <span className="af-agb-diff-add">+{file.added}</span>
                <span className="af-agb-diff-del">−{file.removed}</span>
              </button>
              {!isCollapsed
                ? file.lines.map((line, idx) => (
                    <div className="af-agb-rvc__line" data-kind={line.kind} key={`${line.n}-${idx}`}>
                      <span className="af-agb-rvc__sign" aria-hidden>
                        {line.kind === "add" ? "+" : line.kind === "del" ? "−" : " "}
                      </span>
                      <span className="af-agb-rvc__ln">{line.n}</span>
                      {renderCodeLine(line, (txt, flagNote, el) => openNote(txt, flagNote, undefined, el))}
                    </div>
                  ))
                : null}
            </div>
          );
        })}
      </div>
    ) : (
      <div className="af-agb-rvc__text">
        {selected.fields ? (
          <dl className="af-agb-rvc__fields">
            {selected.fields.map((field) => (
              <div key={field.label}>
                <dt>{field.label}</dt>
                <dd>
                  {Array.isArray(field.value)
                    ? renderProse(field.value)
                    : typeof field.value === "string"
                      ? field.value
                      : renderProse([field.value])}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {selected.body ? (
          <div className="af-agb-rvc__body">
            {editing ? (
              <div className="af-agb-rvc__edit">
                <textarea
                  value={draft}
                  rows={4}
                  aria-label="Edit draft"
                  onChange={(event) => setDraft(event.target.value)}
                />
                <span>
                  <button type="button" className="af-agb-aic-btn" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="af-agb-aic-btn af-agb-aic-btn--primary"
                    onClick={() => {
                      setItems((list) =>
                        list.map((item) =>
                          item.id === selected.id
                            ? { ...item, body: draft.split("\n").filter(Boolean) }
                            : item,
                        ),
                      );
                      setEditing(false);
                    }}
                  >
                    Save changes
                  </button>
                </span>
              </div>
            ) : (
              selected.body.map((line, idx) => <p key={idx}>{renderProse([line])}</p>)
            )}
          </div>
        ) : null}
      </div>
    )
  ) : null;

  return (
    <div
      ref={rootRef}
      className={cn("af-agb-rvc", className)}
      style={style}
      onKeyDown={(event) => {
        const tag = (event.target as HTMLElement).tagName;
        const typing = tag === "INPUT" || tag === "TEXTAREA";
        if (event.key === "Escape") {
          if (note) {
            hide();
            setNote(null);
            return;
          }
          if (rejecting || editing) {
            setRejecting(false);
            setEditing(false);
            return;
          }
        }
        if (typing) return;
        const item = selected;
        if (event.key.toLowerCase() === "z") {
          event.preventDefault();
          undo();
          return;
        }
        if (!item) return;
        if (rejecting) {
          const idx = Number(event.key) - 1;
          if (idx >= 0 && idx < reasons.length) {
            event.preventDefault();
            const r = reasons[idx];
            decide(item, `Rejected · ${r}`, "rejected", r);
            return;
          }
        }
        if (event.key.toLowerCase() === "a") {
          event.preventDefault();
          decide(item, "Approved", "approved");
        } else if (event.key.toLowerCase() === "r") {
          event.preventDefault();
          setRejecting(true);
          setEditing(false);
        } else if (event.key.toLowerCase() === "s") {
          event.preventDefault();
          decide(item, "Skipped", "skipped");
        } else if (event.key.toLowerCase() === "j") {
          event.preventDefault();
          const idx = filtered.findIndex((entry) => entry.id === item.id);
          if (filtered[idx + 1]) setSelectedId(filtered[idx + 1].id);
        } else if (event.key.toLowerCase() === "k") {
          event.preventDefault();
          const idx = filtered.findIndex((entry) => entry.id === item.id);
          if (filtered[idx - 1]) setSelectedId(filtered[idx - 1].id);
        } else if (event.key.toLowerCase() === "e" && !item.files && item.body) {
          event.preventDefault();
          setEditing(true);
          setDraft(item.body.map((line) => (typeof line === "string" ? line : line.text)).join("\n"));
        } else if (event.key.toLowerCase() === "f") {
          event.preventDefault();
          const flagged = rootRef.current?.querySelector<HTMLElement>(".af-agb-rvc__flag");
          if (flagged) flagged.click();
        }
      }}
      tabIndex={-1}
    >
      <header className="af-agb-rvc__head">
        <span className="af-agb-rvc__mark" aria-hidden>
          <RosetteCheckIcon size={16} />
        </span>
        <span className="af-agb-rvc__heading">Review center</span>
        <span className="af-agb-rvc__progress" aria-hidden>
          <i style={{ width: `${Math.min(100, (reviewed / Math.max(1, total)) * 100)}%` }} />
        </span>
        <span className="af-agb-rvc__count">
          <strong>{reviewed}</strong> of {total} reviewed
        </span>
        <span className="af-agb-rvc__headsep" aria-hidden>
          ·
        </span>
        <span className="af-agb-rvc__oldest">
          {oldestWait > 0 ? (
            <>
              oldest <b>{oldestWait}m</b>
            </>
          ) : (
            "all clear"
          )}
        </span>
        {last ? (
          <span
            className="af-agb-rvc__headundo"
            data-tone={last.kind === "rejected" ? "danger" : "success"}
            role="status"
          >
            <AfIcon name={last.kind === "rejected" ? "x" : "check"} size={11} />
            <span>{last.label}</span>
            <button type="button" onClick={undo}>
              Undo <kbd>Z</kbd>
            </button>
          </span>
        ) : null}
      </header>

      <div className="af-agb-rvc__split">
        <div className="af-agb-rvc__queue">
          <div className="af-agb-rvc__filters" role="tablist" aria-label="Filter queue">
            {(
              [
                { value: "all", label: "All", count: items.length },
                {
                  value: "high",
                  label: "High risk",
                  count: items.filter((item) => item.risk === "high").length,
                },
                {
                  value: "unsure",
                  label: "Unsure",
                  count: items.filter((item) => item.confidence < lowConfidence).length,
                },
              ] as { value: ReviewFilter; label: string; count: number }[]
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                className="af-agb-rvc__filter"
                data-active={filter === option.value || undefined}
                onClick={() => setFilter(option.value)}
              >
                <span>{option.label}</span>
                <span className="af-agb-rvc__filtercount">{option.count}</span>
              </button>
            ))}
          </div>

          <ul className="af-agb-rvc__list af-agb-scroll">
            {filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="af-agb-rvc__row"
                  data-active={item.id === selected?.id || undefined}
                  data-leaving={leaving === item.id || undefined}
                  aria-current={item.id === selected?.id || undefined}
                  onClick={() => {
                    setSelectedId(item.id);
                    setEditing(false);
                    setRejecting(false);
                  }}
                >
                  <span className="af-agb-rvc__brandtile" aria-hidden>
                    <AgbBrandLogo brand={item.brand ?? "claude"} size={14} />
                  </span>
                  <span className="af-agb-rvc__rowmain">
                    <span className="af-agb-rvc__rowtop">
                      <span className="af-agb-rvc__rowtitle" title={item.title}>
                        {item.title}
                      </span>
                      <span
                        className="af-agb-rvc__wait"
                        data-tone={
                          item.waiting >= sla
                            ? "warning"
                            : undefined
                        }
                      >
                        {item.waiting}m
                      </span>
                    </span>
                    <span className="af-agb-rvc__rowmeta">{item.type}</span>
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 ? <li className="af-agb-rvc__empty">Queue cleared.</li> : null}
          </ul>
        </div>

        <div className="af-agb-rvc__detail">
          {selected ? (
            <>
              <div className="af-agb-rvc__scroll af-agb-scroll">
                <div className="af-agb-rvc__who">
                  <span className="af-agb-rvc__avatar" aria-hidden>
                    <AgbBrandLogo brand={selected.brand ?? "openai"} size={15} />
                  </span>
                  <span className="af-agb-rvc__who-meta">
                    <span className="af-agb-rvc__who-top">
                      <span className="af-agb-rvc__agent">{selected.agent}</span>
                      <span className="af-agb-rvc__riskpill" data-risk={selected.risk}>
                        {selected.risk === "high"
                          ? "High risk"
                          : selected.risk === "medium"
                            ? "Medium risk"
                            : "Low risk"}
                      </span>
                    </span>
                    <span className="af-agb-rvc__model">{selected.model}</span>
                  </span>
                </div>

                <h3 className="af-agb-rvc__title">{selected.title}</h3>
                <p className="af-agb-rvc__why">
                  <span className="af-agb-rvc__whylabel">Why</span> {selected.reasoning}
                </p>

                <div className="af-agb-rvc__proposal">{proposal}</div>
              </div>

              {selected.sources?.length ? (
                <div className="af-agb-rvc__sources">
                  {selected.sources.map((src, idx) => (
                    <span className="af-agb-rvc__source-wrap" key={src.label}>
                      {idx > 0 ? <span className="af-agb-rvc__source-sep" aria-hidden>·</span> : null}
                      <span className="af-agb-rvc__source">
                        <AgbBrandLogo brand={src.brand} size={12} />
                        <span>{src.label}</span>
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}

              {rejecting ? (
                <div className="af-agb-rvc__reasons" role="group" aria-label="Rejection reason">
                  <span>Why reject?</span>
                  {reasons.map((reason, idx) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => decide(selected, `Rejected · ${reason}`, "rejected", reason)}
                    >
                      <kbd>{idx + 1}</kbd>
                      {reason}
                    </button>
                  ))}
                  <button type="button" className="af-agb-rvc__reason-cancel" onClick={() => setRejecting(false)}>
                    Cancel
                  </button>
                </div>
              ) : null}

              <footer className="af-agb-rvc__actions">
                <span className="af-agb-rvc__btns">
                  <button
                    type="button"
                    className="af-agb-rvc__actbtn af-agb-rvc__actbtn--primary"
                    onClick={() => decide(selected, "Approved", "approved")}
                  >
                    <AfIcon name="check" size={13} />
                    <span>Approve</span>
                    <kbd>A</kbd>
                  </button>
                  <button
                    type="button"
                    className="af-agb-rvc__actbtn"
                    disabled={Boolean(selected.files) || !selected.body}
                    onClick={() => {
                      setEditing(true);
                      setDraft(
                        (selected.body ?? [])
                          .map((line) => (typeof line === "string" ? line : line.text))
                          .join("\n"),
                      );
                    }}
                  >
                    <PencilTinyIcon />
                    <span>Edit</span>
                    <kbd>E</kbd>
                  </button>
                  <button
                    type="button"
                    className="af-agb-rvc__actbtn"
                    onClick={() => setRejecting(true)}
                  >
                    <AfIcon name="x" size={13} />
                    <span>Reject</span>
                    <kbd>R</kbd>
                  </button>
                  <button
                    type="button"
                    className="af-agb-rvc__actbtn"
                    onClick={() => decide(selected, "Skipped", "skipped")}
                  >
                    <AfIcon name="chevronRight" size={13} />
                    <span>Skip</span>
                    <kbd>S</kbd>
                  </button>
                </span>
              </footer>
            </>
          ) : (
            <div className="af-agb-rvc__done">
              <AfIcon name="check" size={18} />
              <p>Queue cleared — {reviewed} items reviewed today.</p>
              {last ? (
                <button type="button" className="af-agb-aic-btn" onClick={undo}>
                  Undo last decision
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <StagePopover
        place={note ? place : null}
        label="Flagged line note"
        onClose={() => {
          hide();
          setNote(null);
        }}
      >
        {note ? (
          <div className="af-agb-note">
            <span className="af-agb-overline">Why flagged</span>
            <p>{note.note}</p>
            {note.source ? <small>Source: {note.source}</small> : null}
          </div>
        ) : null}
      </StagePopover>
    </div>
  );
}

export { ReviewCenterDemo as AfReviewCenterPattern, ReviewCenterDemo as AfReviewCenter };
export type { AfReviewCenterPatternProps as AfReviewCenterProps };
