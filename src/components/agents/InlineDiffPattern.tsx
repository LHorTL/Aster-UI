import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AfButton } from "../../ui";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import {
  DIFF_TOKENS,
  DiffStatus,
  DiffToken,
  DoubleSparkleIcon,
  StagePopover,
  useStagePlacement,
} from "../_shared/agents-b";

export type { DiffStatus, DiffToken };

export function diffWords(oldStr: string, newStr: string): DiffToken[] {
  const tokenize = (s: string) => s.match(/\S+|\s+/g) ?? [];
  const a = tokenize(oldStr);
  const b = tokenize(newStr);
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: { kind: "eq" | "del" | "ins"; val: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      ops.push({ kind: "eq", val: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ kind: "del", val: a[i] });
      i += 1;
    } else {
      ops.push({ kind: "ins", val: b[j] });
      j += 1;
    }
  }
  while (i < m) ops.push({ kind: "del", val: a[i++] });
  while (j < n) ops.push({ kind: "ins", val: b[j++] });

  const tokens: DiffToken[] = [];
  let idCounter = 1;
  let k = 0;
  while (k < ops.length) {
    if (ops[k].kind === "eq") {
      let text = "";
      while (k < ops.length && ops[k].kind === "eq") {
        text += ops[k].val;
        k += 1;
      }
      tokens.push({ kind: "text", text });
    } else {
      let del = "";
      let ins = "";
      while (k < ops.length && ops[k].kind !== "eq") {
        if (ops[k].kind === "del") del += ops[k].val;
        else ins += ops[k].val;
        k += 1;
      }
      tokens.push({ kind: "change", id: idCounter++, del, ins });
    }
  }
  return tokens;
}

export interface AfInlineDiffPatternProps {
  /** Header caption title. */
  title?: ReactNode;
  /** Diff token sequence (`tokens` or `segments`). */
  tokens?: DiffToken[];
  /** Alias for `tokens`. */
  segments?: DiffToken[];
  /** Original string (computed via `diffWords` with `newText`). */
  oldText?: string;
  /** Revised string (computed via `diffWords` with `oldText`). */
  newText?: string;
  /** Per-change decision callback. */
  onDecide?: (id: number, decision: DiffStatus) => void;
  /** Single accept callback. */
  onAccept?: (id: number) => void;
  /** Single reject callback. */
  onReject?: (id: number) => void;
  /** Accept all callback. */
  onAcceptAll?: () => void;
  /** Reject all callback. */
  onRejectAll?: () => void;
  /** Undo callback. */
  onUndo?: () => void;
  /** Explicit UI locale (`"en"` when content has no CJK characters). */
  locale?: "zh" | "en";
  acceptLabel?: string;
  rejectLabel?: string;
  acceptAllLabel?: string;
  rejectAllLabel?: string;
  undoLabel?: string;
  doneLabel?: string;
  countLabel?: string;
  /** Show external hint below card (`false` by default). */
  showHint?: boolean;
  className?: string;
  style?: CSSProperties;
}

const CJK_RE = /[\u4e00-\u9fff]/;

function InlineDiffDemo({
  title,
  tokens: tokensProp,
  segments,
  oldText,
  newText,
  onDecide,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  onUndo,
  locale,
  acceptLabel,
  rejectLabel,
  acceptAllLabel,
  rejectAllLabel,
  undoLabel,
  doneLabel,
  countLabel,
  showHint = false,
  className,
  style,
}: AfInlineDiffPatternProps = {}) {
  const computedTokens = useMemo(() => {
    if (segments) return segments;
    if (tokensProp) return tokensProp;
    if (oldText !== undefined && newText !== undefined) return diffWords(oldText, newText);
    return DIFF_TOKENS;
  }, [segments, tokensProp, oldText, newText]);

  const isEn = useMemo(() => {
    if (locale) return locale === "en";
    const sample = [
      typeof title === "string" ? title : "",
      oldText ?? "",
      newText ?? "",
      ...computedTokens.map((t) => (t.kind === "text" ? t.text : `${t.del}${t.ins}`)),
    ].join(" ");
    return sample.trim().length === 0 || !CJK_RE.test(sample);
  }, [locale, title, oldText, newText, computedTokens]);

  const resolvedTitle =
    title ?? (isEn ? "Suggested by AI · Make it shorter" : "AI 建议 · 让发布说明更简洁");

  const [statuses, setStatuses] = useState<Record<number, DiffStatus>>({});
  const [active, setActive] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<Record<number, DiffStatus> | null>(null);
  const changeRefs = useRef(new Map<number, HTMLSpanElement>());
  const { place, show, hide } = useStagePlacement();

  const changes = computedTokens.filter(
    (token): token is Extract<DiffToken, { kind: "change" }> => token.kind === "change",
  );
  const remaining = changes.filter((change) => !statuses[change.id]);
  const allDone = remaining.length === 0;

  useEffect(() => {
    if (allDone) {
      setActive(null);
      hide();
      return;
    }
    if (active !== null && statuses[active]) setActive(remaining[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses]);

  useEffect(() => {
    if (active === null) {
      hide();
      return;
    }
    const element = changeRefs.current.get(active);
    if (element) show(element, 232);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const decide = (id: number, decision: DiffStatus) => {
    setStatuses((current) => {
      setSnapshot(current);
      return { ...current, [id]: decision };
    });
    onDecide?.(id, decision);
    if (decision === "accepted") onAccept?.(id);
    else onReject?.(id);
    const next = changes.find((change) => change.id !== id && !statuses[change.id]);
    setActive(next?.id ?? null);
  };

  const decideAll = (decision: DiffStatus) => {
    setSnapshot(statuses);
    setStatuses(Object.fromEntries(changes.map((change) => [change.id, decision])));
    for (const c of changes) onDecide?.(c.id, decision);
    if (decision === "accepted") onAcceptAll?.();
    else onRejectAll?.();
  };

  const undo = () => {
    if (!snapshot) return;
    setStatuses(snapshot);
    setSnapshot(null);
    onUndo?.();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const tag = (event.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (event.key === "Escape") {
      setActive(null);
      return;
    }
    if (allDone) return;
    if (event.key === "y" || event.key === "Y" || event.key === "Enter") {
      event.preventDefault();
      if (active !== null) decide(active, "accepted");
    } else if (event.key === "n" || event.key === "N" || event.key === "Backspace") {
      event.preventDefault();
      if (active !== null) decide(active, "rejected");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      const idx = remaining.findIndex((change) => change.id === active);
      setActive(remaining[(idx + 1) % remaining.length]?.id ?? null);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      const idx = remaining.findIndex((change) => change.id === active);
      setActive(remaining[(idx - 1 + remaining.length) % remaining.length]?.id ?? null);
    }
  };

  const resolvedDoneLabel = doneLabel ?? (isEn ? "All changes reviewed" : "已全部处理");
  const resolvedUndoLabel = undoLabel ?? (isEn ? "Undo" : "撤销");
  const resolvedCountLabel =
    countLabel ?? (isEn ? (remaining.length === 1 ? "suggestion" : "suggestions") : "条建议");
  const resolvedRejectAllLabel = rejectAllLabel ?? (isEn ? "Reject all" : "全部拒绝");
  const resolvedAcceptAllLabel = acceptAllLabel ?? (isEn ? "Accept all" : "全部接受");
  const resolvedAcceptLabel = acceptLabel ?? (isEn ? "Accept" : "接受");
  const resolvedRejectLabel = rejectLabel ?? (isEn ? "Reject" : "拒绝");

  return (
    <div className={cn("af-agb-diff", className)} style={style} onKeyDown={onKeyDown}>
      <header className="af-agb-diff__head">
        <span className="af-agb-diff__spark" aria-hidden>
          <DoubleSparkleIcon size={15} />
        </span>
        <span>{resolvedTitle}</span>
      </header>

      <p className="af-agb-diff__body">
        {computedTokens.map((token, idx) =>
          token.kind === "text" ? (
            <span key={`t-${idx}-${token.text.slice(0, 8)}`}>{token.text}</span>
          ) : (
            <span
              key={token.id}
              ref={(element) => {
                if (element) changeRefs.current.set(token.id, element);
                else changeRefs.current.delete(token.id);
              }}
              className="af-agb-diff__change"
              data-active={active === token.id || undefined}
              data-status={statuses[token.id]}
              tabIndex={statuses[token.id] ? -1 : 0}
              role="group"
              aria-label={
                isEn
                  ? `Suggestion ${token.id}: replace "${token.del}" with "${token.ins}"`
                  : `建议 ${token.id}：删除「${token.del}」，改为「${token.ins}」`
              }
              onFocus={() => setActive(token.id)}
              onPointerEnter={() => setActive(token.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key.toLowerCase() === "y") {
                  event.preventDefault();
                  decide(token.id, "accepted");
                } else if (event.key.toLowerCase() === "n" || event.key === "Backspace") {
                  event.preventDefault();
                  decide(token.id, "rejected");
                }
              }}
            >
              {token.del ? (
                <del className="af-agb-diff__del" data-status={statuses[token.id]}>
                  {token.del}
                </del>
              ) : null}
              {token.del && token.ins && !statuses[token.id] ? " " : null}
              {token.ins ? (
                <ins className="af-agb-diff__ins" data-status={statuses[token.id]}>
                  {token.ins}
                </ins>
              ) : null}
            </span>
          ),
        )}
      </p>

      <footer className="af-agb-diff__foot" data-done={allDone || undefined}>
        {allDone ? (
          <div className="af-agb-diff__done">
            <span className="af-agb-diff__donecheck" aria-hidden>
              <AfIcon name="check" size={13} />
            </span>
            <span>{resolvedDoneLabel}</span>
            <button type="button" className="af-agb-diff__btn af-agb-diff__btn--ghost" onClick={undo}>
              {resolvedUndoLabel}
            </button>
          </div>
        ) : (
          <>
            <span className="af-agb-diff__countbadge">{remaining.length}</span>
            <span className="af-agb-diff__countlabel">{resolvedCountLabel}</span>
            <span className="af-agb-diff__spacer" />
            <span className="af-agb-diff__nav">
              <button
                type="button"
                className="af-agb-diff__arrow"
                aria-label={isEn ? "Previous suggestion" : "上一处建议"}
                onClick={() => {
                  const idx = remaining.findIndex((change) => change.id === active);
                  setActive(remaining[(idx - 1 + remaining.length) % remaining.length]?.id ?? null);
                }}
              >
                <AfIcon name="chevronLeft" size={14} />
              </button>
              <button
                type="button"
                className="af-agb-diff__arrow"
                aria-label={isEn ? "Next suggestion" : "下一处建议"}
                onClick={() => {
                  const idx = remaining.findIndex((change) => change.id === active);
                  setActive(remaining[(idx + 1) % remaining.length]?.id ?? null);
                }}
              >
                <AfIcon name="chevronRight" size={14} />
              </button>
            </span>
            <button
              type="button"
              className="af-agb-diff__btn af-agb-diff__btn--outline"
              onClick={() => decideAll("rejected")}
            >
              {resolvedRejectAllLabel}
            </button>
            <button
              type="button"
              className="af-agb-diff__btn af-agb-diff__btn--primary"
              onClick={() => decideAll("accepted")}
            >
              {resolvedAcceptAllLabel}
            </button>
          </>
        )}
      </footer>

      {showHint ? (
        <p className="af-agb-diff__hint">
          {isEn
            ? "Tab between suggestions · Y / Enter to accept · N / Backspace to reject · Undo when finished"
            : "Tab 在建议之间移动 · Y / Enter 接受 · N / Backspace 拒绝 · 最后可撤销"}
        </p>
      ) : null}

      <StagePopover
        place={allDone ? null : place}
        preferSide="top"
        label={isEn ? "Review change" : "处理这处修改"}
        onClose={() => setActive(null)}
      >
        <div className="af-agb-diff__pop">
          <AfButton
            size="sm"
            variant="primary"
            icon="check"
            kbd="Y"
            onClick={() => {
              if (active !== null) decide(active, "accepted");
            }}
          >
            {resolvedAcceptLabel}
          </AfButton>
          <AfButton
            size="sm"
            variant="ghost"
            icon="x"
            kbd="N"
            onClick={() => {
              if (active !== null) decide(active, "rejected");
            }}
          >
            {resolvedRejectLabel}
          </AfButton>
        </div>
      </StagePopover>
    </div>
  );
}

export { InlineDiffDemo as AfInlineDiffPattern, InlineDiffDemo as AfInlineDiff };
export type { AfInlineDiffPatternProps as AfInlineDiffProps };
