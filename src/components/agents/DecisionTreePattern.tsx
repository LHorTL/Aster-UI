import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { AfIcon } from "../../icons";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import {
  AgbBrandLogo,
  DECISIONS,
  DecisionBranchIcon,
  StagePopover,
  useStagePlacement,
  type DecisionEffect,
  type DecisionOption,
} from "../_shared/agents-b";

export type DecisionBranchItem = (typeof DECISIONS)[number];

export type DecisionChoicePayload =
  | {
      index: number;
      option: DecisionOption;
      subIndex?: number;
      subOption?: DecisionOption;
    }
  | { other: string };

export interface AfDecisionTreePatternProps {
  /** Top bar title. */
  title?: string;
  /** Decision queue items. */
  decisions?: DecisionBranchItem[];
  /** Show "Other…" custom instruction branch (`true` by default). */
  allowOther?: boolean;
  /** Branch or custom instruction selection callback. */
  onChoose?: (
    decisionIndex: number,
    optionIndex: number,
    decision?: DecisionBranchItem,
    choice?: DecisionChoicePayload,
  ) => string | void | Promise<string | void>;
  /** Show bottom keyboard shortcut hint (`true` by default to match AffectUI stage). */
  showHint?: boolean;
  /** Extra class name. */
  className?: string;
  /** Inline style. */
  style?: CSSProperties;
}

type SvgCurve = {
  index: number;
  pick?: boolean;
  qToOpt: string;
  optToLeaf?: string;
};

function stepPath(x1: number, y1: number, x2: number, y2: number, split = 0.44) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dy) < 1.5 || dx <= 8) {
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  const midX = x1 + dx * split;
  const sign = dy > 0 ? 1 : -1;
  const r = Math.min(8, Math.abs(dy) / 2, Math.abs(midX - x1), Math.abs(x2 - midX));
  return [
    `M ${x1.toFixed(1)} ${y1.toFixed(1)}`,
    `H ${(midX - r).toFixed(1)}`,
    `Q ${midX.toFixed(1)} ${y1.toFixed(1)} ${midX.toFixed(1)} ${(y1 + sign * r).toFixed(1)}`,
    `V ${(y2 - sign * r).toFixed(1)}`,
    `Q ${midX.toFixed(1)} ${y2.toFixed(1)} ${(midX + r).toFixed(1)} ${y2.toFixed(1)}`,
    `H ${x2.toFixed(1)}`,
  ].join(" ");
}

function DecisionTreeDemo({
  title = "Decisions",
  decisions = DECISIONS,
  allowOther = true,
  onChoose,
  showHint = true,
  className,
  style,
}: AfDecisionTreePatternProps = {}) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [subChosen, setSubChosen] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [note, setNote] = useState<{
    effect: { text: string; note: string; source?: string };
    element: HTMLElement;
  } | null>(null);
  const [svgState, setSvgState] = useState<{ width: number; height: number; curves: SvgCurve[] }>({
    width: 0,
    height: 0,
    curves: [],
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const questionRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { place, show, hide } = useStagePlacement();
  const advanceTimer = useRef<number | null>(null);

  const safeList = decisions.length > 0 ? decisions : DECISIONS;
  const decision = safeList[index % safeList.length] ?? DECISIONS[0];
  const otherRowIndex = decision.options.length;
  const chosenOption =
    chosen !== null && chosen >= 0 && chosen < decision.options.length ? decision.options[chosen] : null;
  const awaitingFollowUp = Boolean(chosenOption?.next && subChosen === null);
  const isSettled = chosen !== null && !awaitingFollowUp;

  const resetCurrent = useCallback(() => {
    setChosen(null);
    setSubChosen(null);
    setHovered(null);
    setReply(null);
    setOtherOpen(false);
    setOtherText("");
  }, []);

  const measureTree = useCallback(() => {
    const body = bodyRef.current;
    const qEl = questionRef.current;
    if (!body || !qEl) return;
    const bodyRect = body.getBoundingClientRect();
    if (!bodyRect.width || !bodyRect.height) return;
    const scale = body.offsetWidth ? bodyRect.width / body.offsetWidth : 1;
    const toLocalX = (clientX: number) => (clientX - bodyRect.left) / scale;
    const toLocalY = (clientY: number) => (clientY - bodyRect.top) / scale;

    const qRect = qEl.getBoundingClientRect();
    const visibleRow = rowRefs.current.find((r) => r && r.offsetParent !== null);
    if (visibleRow) {
      const rRect = visibleRow.getBoundingClientRect();
      if (rRect.left < qRect.right - 8) {
        setSvgState({ width: body.clientWidth, height: body.clientHeight, curves: [] });
        return;
      }
    }

    const qx = toLocalX(qRect.right);
    const qy = toLocalY(qRect.top + qRect.height * 0.5);
    const totalRows = decision.options.length + (allowOther ? 1 : 0);
    const curves: SvgCurve[] = [];

    for (let i = 0; i < totalRows; i += 1) {
      if (chosen !== null && chosen !== i) continue;
      const row = rowRefs.current[i];
      if (!row || row.offsetParent === null) continue;
      const optEl = row.querySelector<HTMLElement>(".af-agb-dct__opt");
      const leafAnchor = row.querySelector<HTMLElement>(".af-agb-dct__leaf-anchor");
      if (!optEl) continue;

      const optRect = optEl.getBoundingClientRect();
      const ox = toLocalX(optRect.left);
      const oy = toLocalY(optRect.top + optRect.height / 2);
      const qToOpt = stepPath(qx, qy, ox, oy, 0.45);

      let optToLeaf: string | undefined;
      if (leafAnchor && leafAnchor.offsetParent !== null) {
        const leafRect = leafAnchor.getBoundingClientRect();
        const orx = toLocalX(optRect.right);
        const lx = toLocalX(leafRect.left);
        const ly = toLocalY(leafRect.top + Math.min(leafRect.height / 2, 18));
        if (lx > orx + 4) {
          optToLeaf = stepPath(orx, oy, lx, ly, 0.46);
        }
      }

      const isPick = i < decision.options.length ? Boolean(decision.options[i]?.pick) : false;
      curves.push({ index: i, pick: isPick, qToOpt, optToLeaf });
    }

    setSvgState({ width: body.clientWidth, height: body.clientHeight, curves });
  }, [allowOther, chosen, decision.options]);

  useIsomorphicLayoutEffect(() => {
    measureTree();
  }, [measureTree, index, otherOpen, otherText, chosen, subChosen, hovered]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureTree());
    ro.observe(body);
    return () => ro.disconnect();
  }, [measureTree]);

  useEffect(() => {
    if (!isSettled) return;
    advanceTimer.current = window.setTimeout(() => {
      setIndex((value) => (value + 1) % safeList.length);
      resetCurrent();
    }, 1600);
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, [isSettled, resetCurrent, safeList.length]);

  const fireChoiceCallback = (optIdx: number, payload: DecisionChoicePayload | undefined) => {
    const maybe = onChoose?.(index, optIdx, decision, payload);
    if (typeof maybe === "string" && maybe) {
      setReply(maybe);
    } else if (maybe && typeof (maybe as Promise<string | void>).then === "function") {
      void (maybe as Promise<string | void>).then((ans) => {
        if (typeof ans === "string" && ans) setReply(ans);
      });
    }
  };

  const choose = (optionIndex: number) => {
    if (isSettled) return;
    const pickedOption = decision.options[optionIndex];
    if (!pickedOption) return;
    setChosen(optionIndex);
    setSubChosen(null);
    setOtherOpen(false);
    if (!pickedOption.next) {
      fireChoiceCallback(optionIndex, { index: optionIndex, option: pickedOption });
    }
  };

  const chooseSub = (optionIndex: number, subIndex: number) => {
    if (isSettled) return;
    const pickedOption = decision.options[optionIndex];
    const pickedSub = pickedOption?.next?.options[subIndex];
    if (!pickedOption || !pickedSub) return;
    setChosen(optionIndex);
    setSubChosen(subIndex);
    fireChoiceCallback(optionIndex, {
      index: optionIndex,
      option: pickedOption,
      subIndex,
      subOption: pickedSub,
    });
  };

  const sendOther = () => {
    const text = otherText.trim();
    if (!text) return;
    setChosen(otherRowIndex);
    setSubChosen(null);
    setReply(`Sent to ${decision.agent} · running now`);
    fireChoiceCallback(-1, { other: text });
  };

  const openNextFlag = () => {
    const scope = rootRef.current ?? document;
    const flat: {
      effect: { text: string; note: string; source?: string };
      element: HTMLElement;
    }[] = [];
    scope.querySelectorAll<HTMLElement>(".af-agb-dct__effect--flag").forEach((element) => {
      flat.push({
        effect: {
          text: element.dataset.text ?? "",
          note: element.dataset.note ?? "",
          source: element.dataset.source,
        },
        element,
      });
    });
    if (!flat.length) return;
    const next = flat[(flat.findIndex((item) => item.element === document.activeElement) + 1) % flat.length];
    next.element.focus();
    setNote(next);
    show(next.element, 256);
  };

  const renderEffects = (effects: DecisionEffect[] | undefined) =>
    (effects ?? []).map((effect) =>
      typeof effect === "string" ? (
        <span className="af-agb-dct__effect" key={effect}>
          {effect}
        </span>
      ) : (
        <button
          type="button"
          key={effect.text}
          className="af-agb-dct__effect af-agb-dct__effect--flag"
          data-note={effect.note}
          data-text={effect.text}
          data-source={effect.source}
          onClick={(event) => {
            event.stopPropagation();
            setNote({ effect, element: event.currentTarget });
            show(event.currentTarget, 256);
          }}
          onPointerEnter={(event) => {
            setNote({ effect, element: event.currentTarget });
            show(event.currentTarget, 256);
          }}
          onFocus={(event) => {
            setNote({ effect, element: event.currentTarget });
            show(event.currentTarget, 256);
          }}
        >
          {effect.text}
        </button>
      ),
    );

  const activeBranch = chosen ?? hovered;
  const sortedCurves = [...svgState.curves].sort((a, b) => {
    const aHot = a.index === activeBranch || (activeBranch === null && a.pick) ? 1 : 0;
    const bHot = b.index === activeBranch || (activeBranch === null && b.pick) ? 1 : 0;
    return aHot - bHot;
  });

  return (
    <div
      ref={rootRef}
      className={cn("af-agb-dct", className)}
      style={style}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (note) {
            hide();
            setNote(null);
            return;
          }
          if (awaitingFollowUp) {
            setChosen(null);
            setSubChosen(null);
            return;
          }
          setOtherOpen(false);
          return;
        }
        if ((event.target as HTMLElement)?.tagName === "TEXTAREA") return;
        if (event.key === "ArrowRight" || event.key.toLowerCase() === "j") {
          event.preventDefault();
          setIndex((value) => (value + 1) % safeList.length);
          resetCurrent();
          return;
        }
        if (event.key === "ArrowLeft" || event.key.toLowerCase() === "k") {
          event.preventDefault();
          setIndex((value) => (value - 1 + safeList.length) % safeList.length);
          resetCurrent();
          return;
        }
        if (event.key.toLowerCase() === "f") {
          event.preventDefault();
          openNextFlag();
          return;
        }
        if (isSettled) return;
        if (awaitingFollowUp && chosen !== null && chosenOption?.next) {
          const subOpts = chosenOption.next.options;
          const lower = event.key.toLowerCase();
          const letterIdx = lower.length === 1 ? lower.charCodeAt(0) - 97 : -1;
          const numIdx = Number(event.key) - 1;
          const pickIdx = letterIdx >= 0 && letterIdx < subOpts.length ? letterIdx : numIdx;
          if (pickIdx >= 0 && pickIdx < subOpts.length) {
            event.preventDefault();
            chooseSub(chosen, pickIdx);
          }
          return;
        }
        const number = Number(event.key);
        if (number >= 1 && number <= decision.options.length) {
          event.preventDefault();
          choose(number - 1);
        } else if (
          allowOther &&
          (number === decision.options.length + 1 || event.key.toLowerCase() === "o")
        ) {
          event.preventDefault();
          setOtherOpen(true);
          setHovered(otherRowIndex);
        }
      }}
    >
      <header className="af-agb-dct__head">
        <span className="af-agb-dct__mark" aria-hidden>
          <DecisionBranchIcon size={15} />
        </span>
        <span className="af-agb-dct__heading">{title}</span>
        <span className="af-agb-dct__count">{safeList.length} waiting for you</span>
        <span className="af-agb-dct__spacer" />
        <span className="af-agb-dct__dots" role="tablist" aria-label="Switch decision">
          {safeList.map((item, dot) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={dot === index % safeList.length}
              aria-label={`Decision ${dot + 1}: ${item.agent}`}
              className="af-agb-dct__dot"
              data-active={dot === index % safeList.length || undefined}
              onClick={() => {
                setIndex(dot);
                resetCurrent();
              }}
            />
          ))}
        </span>
        <button
          type="button"
          className="af-agb-dct__pager"
          onClick={() => {
            setIndex((value) => (value + 1) % safeList.length);
            resetCurrent();
          }}
          title="Next decision (→)"
        >
          {(index % safeList.length) + 1} of {safeList.length}
        </button>
      </header>

      <div className="af-agb-dct__body" ref={bodyRef}>
        {sortedCurves.length > 0 ? (
          <svg
            className="af-agb-dct__svg"
            width={svgState.width}
            height={svgState.height}
            viewBox={`0 0 ${svgState.width} ${svgState.height}`}
            aria-hidden
          >
            {sortedCurves.map((curve) => {
              const isPicked = chosen === curve.index;
              const isHot =
                activeBranch === curve.index || (activeBranch === null && Boolean(curve.pick));
              const isDim = activeBranch !== null && activeBranch !== curve.index;
              return (
                <g
                  key={curve.index}
                  className="af-agb-dct__curvegroup"
                  data-picked={isPicked || undefined}
                  data-active={isHot || undefined}
                  data-dim={isDim || undefined}
                >
                  <path className="af-agb-dct__curve" d={curve.qToOpt} />
                  {curve.optToLeaf ? (
                    <path className="af-agb-dct__curve af-agb-dct__curve--leaf" d={curve.optToLeaf} />
                  ) : null}
                </g>
              );
            })}
          </svg>
        ) : null}

        <div className="af-agb-dct__qcol">
          <span className="af-agb-dct__riskpill" data-risk={decision.risk}>
            {decision.risk === "high"
              ? "High risk"
              : decision.risk === "medium"
                ? "Medium risk"
                : "Low risk"}
          </span>
          <div className="af-agb-dct__question" ref={questionRef}>
            <div className="af-agb-dct__who">
              <span className="af-agb-dct__avatar" aria-hidden>
                <AgbBrandLogo brand={decision.brand ?? "claude"} size={14} />
              </span>
              <span className="af-agb-dct__meta">
                <span className="af-agb-dct__agent">{decision.agent}</span>
                <span className="af-agb-dct__model">{decision.model}</span>
              </span>
            </div>
            <h3 className="af-agb-dct__q">{decision.question}</h3>
            <p className="af-agb-dct__context">{decision.context}</p>
          </div>
        </div>

        <div
          className="af-agb-dct__branches"
          data-chosen={chosen !== null || undefined}
          data-has-svg={sortedCurves.length > 0 || undefined}
        >
          {decision.options.map((option, optionIndex) => {
            if (chosen !== null && chosen !== optionIndex) return null;
            const isBranchPicked = chosen === optionIndex;
            const nextFollowUp = option.next;

            return (
              <div
                className="af-agb-dct__row"
                key={option.label}
                ref={(el) => {
                  rowRefs.current[optionIndex] = el;
                }}
                data-picked={isBranchPicked || undefined}
                data-active={hovered === optionIndex || undefined}
                data-pick={option.pick || undefined}
                data-has-next={Boolean(nextFollowUp) || undefined}
                data-softdim={
                  (chosen === null && hovered !== null && hovered !== optionIndex) || undefined
                }
                onPointerEnter={() => setHovered(optionIndex)}
                onPointerLeave={() => setHovered((prev) => (prev === optionIndex ? null : prev))}
              >
                <button
                  type="button"
                  className="af-agb-dct__opt"
                  data-pick={option.pick || undefined}
                  aria-keyshortcuts={String(optionIndex + 1)}
                  onClick={() => {
                    if (isBranchPicked && awaitingFollowUp) {
                      setChosen(null);
                      setSubChosen(null);
                    } else {
                      choose(optionIndex);
                    }
                  }}
                  onFocus={() => setHovered(optionIndex)}
                  onBlur={() => setHovered((prev) => (prev === optionIndex ? null : prev))}
                  aria-label={`${option.label}${option.pick ? " (Agent's pick)" : ""}`}
                >
                  <span className="af-agb-dct__optrow">
                    <span className="af-agb-dct__num" aria-hidden>
                      {optionIndex + 1}
                    </span>
                    {option.icon ? (
                      <span className="af-agb-dct__opticon" aria-hidden>
                        <AgbBrandLogo brand={option.icon} size={12} />
                      </span>
                    ) : null}
                    <span className="af-agb-dct__label">{option.label}</span>
                  </span>
                  {option.pick ? <span className="af-agb-dct__pick">Agent&apos;s pick</span> : null}
                </button>

                <div className="af-agb-dct__leaf">
                  {nextFollowUp ? (
                    <div
                      className="af-agb-dct__next"
                      data-awake={isBranchPicked ? "true" : undefined}
                      data-hot={
                        isBranchPicked ||
                        hovered === optionIndex ||
                        (chosen === null && hovered === null && option.pick)
                          ? "true"
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className="af-agb-dct__next-qpill af-agb-dct__leaf-anchor"
                        onClick={() => choose(optionIndex)}
                      >
                        {nextFollowUp.question}
                      </button>
                      <div className="af-agb-dct__next-list">
                        {nextFollowUp.options.map((sub, subIdx) => {
                          if (subChosen !== null && subChosen !== subIdx) return null;
                          const isSubPicked = subChosen === subIdx;
                          return (
                            <div
                              key={sub.label}
                              className="af-agb-dct__subitem"
                              data-picked={isSubPicked || undefined}
                              data-pick={sub.pick || undefined}
                            >
                              <button
                                type="button"
                                className="af-agb-dct__subbtn"
                                onClick={() => chooseSub(optionIndex, subIdx)}
                              >
                                <span className="af-agb-dct__subhead">
                                  {isBranchPicked ? (
                                    <span className="af-agb-dct__subkey" aria-hidden>
                                      {subIdx + 1}
                                    </span>
                                  ) : null}
                                  {sub.icon && isBranchPicked ? (
                                    <span className="af-agb-dct__opticon" aria-hidden>
                                      <AgbBrandLogo brand={sub.icon} size={11} />
                                    </span>
                                  ) : null}
                                  <span className="af-agb-dct__sublabel">{sub.label}</span>
                                  {sub.pick ? (
                                    <span className="af-agb-dct__pick">Agent&apos;s pick</span>
                                  ) : null}
                                </span>
                              </button>
                              <div className="af-agb-dct__subeffects">
                                {renderEffects(sub.effects)}
                                {sub.apps?.length ? (
                                  <span className="af-agb-dct__apps" aria-hidden>
                                    {sub.apps.map((app) => (
                                      <AgbBrandLogo key={app} brand={app} size={11} />
                                    ))}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {isBranchPicked && subChosen !== null ? (
                        <div className="af-agb-dct__approved" role="status" aria-live="polite">
                          <span className="af-agb-dct__approved-icon" aria-hidden>
                            <AfIcon name="check" size={11} />
                          </span>
                          <span>{reply ?? "Approved · running"}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="af-agb-dct__effects-wrap af-agb-dct__leaf-anchor">
                      <div className="af-agb-dct__effects-col">{renderEffects(option.effects)}</div>
                      {option.apps?.length ? (
                        <span className="af-agb-dct__apps" aria-hidden>
                          {option.apps.map((app) => (
                            <AgbBrandLogo key={app} brand={app} size={12} />
                          ))}
                        </span>
                      ) : null}
                      {isBranchPicked ? (
                        <div className="af-agb-dct__approved" role="status" aria-live="polite">
                          <span className="af-agb-dct__approved-icon" aria-hidden>
                            <AfIcon name="check" size={11} />
                          </span>
                          <span>{reply ?? "Approved · running"}</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {allowOther && (chosen === null || chosen === otherRowIndex) ? (
            <div
              className="af-agb-dct__row"
              ref={(el) => {
                rowRefs.current[otherRowIndex] = el;
              }}
              data-picked={chosen === otherRowIndex || undefined}
              data-active={hovered === otherRowIndex || otherOpen || undefined}
              data-softdim={
                (chosen === null && hovered !== null && hovered !== otherRowIndex && !otherOpen) ||
                undefined
              }
              onPointerEnter={() => setHovered(otherRowIndex)}
              onPointerLeave={() => setHovered((prev) => (prev === otherRowIndex ? null : prev))}
            >
              <button
                type="button"
                className="af-agb-dct__opt af-agb-dct__other"
                aria-keyshortcuts={String(decision.options.length + 1)}
                onClick={() => setOtherOpen((prev) => !prev)}
                onFocus={() => setHovered(otherRowIndex)}
                onBlur={() => setHovered((prev) => (prev === otherRowIndex ? null : prev))}
                aria-expanded={otherOpen}
              >
                <span className="af-agb-dct__optrow">
                  <span className="af-agb-dct__num" aria-hidden>
                    {decision.options.length + 1}
                  </span>
                  <span className="af-agb-dct__label">Other...</span>
                </span>
              </button>

              <div className="af-agb-dct__leaf">
                {chosen === otherRowIndex ? (
                  <div className="af-agb-dct__approved af-agb-dct__leaf-anchor" role="status" aria-live="polite">
                    <span className="af-agb-dct__approved-icon" aria-hidden>
                      <AfIcon name="check" size={11} />
                    </span>
                    <span>{reply ?? "Instruction sent · running now"}</span>
                  </div>
                ) : otherOpen ? (
                  <div className="af-agb-dct__otherbox af-agb-dct__leaf-anchor">
                    <textarea
                      value={otherText}
                      autoFocus
                      onChange={(event) => setOtherText(event.target.value)}
                      placeholder="Tell the agent what to do instead…"
                      rows={otherText.includes("\n") ? 3 : 2}
                      aria-label="Custom instruction"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendOther();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="af-agb-aic-btn af-agb-aic-btn--primary"
                      onClick={sendOther}
                      disabled={!otherText.trim()}
                    >
                      Send
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showHint ? (
        <p className="af-agb-dct__hint">
          {awaitingFollowUp ? (
            <>
              Pick follow-up <kbd>1</kbd> – <kbd>{chosenOption?.next?.options.length ?? 2}</kbd>
              <span className="af-agb-dct__hintsep">·</span>
              back <kbd>Esc</kbd>
            </>
          ) : (
            <>
              Pick a branch <kbd>1</kbd> – <kbd>{decision.options.length + (allowOther ? 1 : 0)}</kbd>
              <span className="af-agb-dct__hintsep">·</span>
              next <kbd>→</kbd>
            </>
          )}
        </p>
      ) : null}

      <StagePopover
        place={note ? place : null}
        label="Agent note"
        onClose={() => {
          hide();
          setNote(null);
        }}
      >
        {note ? (
          <div className="af-agb-note">
            <span className="af-agb-overline">Why flagged</span>
            <p>{note.effect.note}</p>
            {note.effect.source ? <small>Source: {note.effect.source}</small> : null}
          </div>
        ) : null}
      </StagePopover>
    </div>
  );
}

export { DecisionTreeDemo as AfDecisionTreePattern, DecisionTreeDemo as AfDecisionTree };
export type { AfDecisionTreePatternProps as AfDecisionTreeProps };
