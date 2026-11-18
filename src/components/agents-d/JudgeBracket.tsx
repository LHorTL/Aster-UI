import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import { ModelBrandMark } from "../agents-c/_marks";

export interface Contender {
  id: string;
  name: string;
  icon?: ReactNode;
  meta?: string;
  output?: string;
}

export interface JudgeVerdict {
  winner: string;
  reason?: string;
  scores?: [number, number];
}

/** Legacy compatibility interface. */
export interface JudgeCandidate {
  id: string;
  model: string;
  label: string;
  correctness: number;
  style: number;
  speed: number;
  summary: string;
}

export interface AfJudgeBracketProps {
  /** Every attempt, in seed order — 2, 4, 8 or 16; neighbours meet in the first round. */
  contenders?: Contender[];
  /** Legacy compatibility prop. */
  candidates?: JudgeCandidate[];
  /** What the judge decided, by match `"round:match"` from 0 (e.g. `"0:2"`). */
  verdicts?: Record<string, JudgeVerdict>;
  /** The match the judge works on right now (`"round:match"`). */
  judging?: string;
  /** Who judges — e.g. `"Claude Opus"`. */
  judge?: string;
  /** What the attempts are for — shown muted next to the title. */
  task?: string;
  /** Use the winner — without it, the final has no action button. */
  onPick?: (winner: Contender) => void;
  /** Legacy override winner callback. */
  onSelectWinner?: (candidateId: string) => void;
  /** Heading of the bar. Defaults to `"Judge"`. */
  title?: ReactNode;
  /** Extra class on the root. */
  className?: string;
  /** Inline style on the root. */
  style?: CSSProperties;
}

export type AfJudgeBracketPatternProps = AfJudgeBracketProps;

const DEFAULT_CONTENDERS: Contender[] = [
  {
    id: "idempotency-key",
    name: "Idempotency key",
    icon: <ModelBrandMark model="claude" size={11} />,
    meta: "Sonnet · +18 −4 · 3 files · 42/42 tests",
    output:
      "Sends one idempotency key per checkout, so Stripe returns the first charge on a retry instead of making a second.\nstripe.paymentIntents.create(params, { idempotencyKey: checkout.id })",
  },
  {
    id: "retry-guard",
    name: "Retry guard",
    icon: <ModelBrandMark model="openai" size={11} />,
    meta: "GPT-5 · +9 −1 · 1 file · 41/42 tests",
    output:
      "Skips the retry when the first request is still pending.\nif (pending.has(checkout.id)) return pending.get(checkout.id)\nFails: webhook arrives before the client retry",
  },
  {
    id: "row-lock",
    name: "Row lock",
    icon: <ModelBrandMark model="gemini" size={11} />,
    meta: "Gemini · +31 −6 · 4 files · 42/42 tests",
    output:
      "Takes a row lock on the order before charging, so two requests can't charge the same order.\nSELECT … FROM orders WHERE id = $1 FOR UPDATE",
  },
  {
    id: "no-retries",
    name: "No retries",
    icon: <ModelBrandMark model="grok" size={11} />,
    meta: "Grok · +2 −14 · 2 files · 39/42 tests",
    output:
      "Turns off automatic retries for payment requests.\nretry: { maxAttempts: 0 }\nFails: 3 tests for flaky networks",
  },
  {
    id: "webhook-dedupe",
    name: "Webhook dedupe",
    icon: <ModelBrandMark model="claude" size={11} />,
    meta: "Sonnet · +24 −3 · 2 files · 42/42 tests",
    output:
      "Stores every Stripe event id it has handled and ignores repeats, so a replayed webhook can't fulfil an order twice.\nif (await seen(event.id)) return 200",
  },
  {
    id: "state-machine",
    name: "State machine",
    icon: <ModelBrandMark model="openai" size={11} />,
    meta: "GPT-5 · +112 −40 · 7 files · 42/42 tests",
    output:
      "Rewrites checkout as a state machine – pending, charging, fulfilled – and only charges from pending.\nThorough, but touches seven files and the order model.",
  },
  {
    id: "button-debounce",
    name: "Button debounce",
    icon: <ModelBrandMark model="gemini" size={11} />,
    meta: "Gemini · +6 −0 · 1 file · 40/42 tests",
    output:
      "Disables the Pay button for 3 seconds after a click.\nFails: server-side retries still charge twice",
  },
  {
    id: "refund-later",
    name: "Refund later",
    icon: <ModelBrandMark model="grok" size={11} />,
    meta: "Grok · +38 −0 · 2 files · 42/42 tests",
    output:
      "A nightly job finds double charges and refunds the second one.\nCustomers still see two charges until the next morning.",
  },
];

const DEMO_SCRIPT: Array<{ key: string; verdict: JudgeVerdict }> = [
  {
    key: "0:0",
    verdict: {
      winner: "idempotency-key",
      scores: [9.3, 6.2],
      reason:
        "Idempotency key stops duplicate charges at Stripe itself, even when webhooks race the retry.",
    },
  },
  {
    key: "0:1",
    verdict: {
      winner: "row-lock",
      scores: [8.3, 4.8],
      reason:
        "Row lock serializes concurrent checkout requests without breaking legitimate retries on flaky networks.",
    },
  },
  {
    key: "0:2",
    verdict: {
      winner: "webhook-dedupe",
      scores: [8.7, 7.2],
      reason:
        "Webhook dedupe passes all 42 tests in two files without rewriting seven files of order state.",
    },
  },
  {
    key: "0:3",
    verdict: {
      winner: "refund-later",
      scores: [5.1, 5.9],
      reason:
        "Refund later passes the test suite, whereas client-only debounce still double-charges on server retries.",
    },
  },
  {
    key: "1:0",
    verdict: {
      winner: "idempotency-key",
      scores: [9.4, 8.1],
      reason:
        "Idempotency key prevents duplicate provider charges even if an application transaction times out mid-flight.",
    },
  },
  {
    key: "1:1",
    verdict: {
      winner: "webhook-dedupe",
      scores: [8.9, 5.6],
      reason:
        "Preventing duplicate fulfilment immediately beats charging customers twice and refunding overnight.",
    },
  },
  {
    key: "2:0",
    verdict: {
      winner: "idempotency-key",
      scores: [9.5, 8.6],
      reason:
        "Prevents the second charge from ever happening at the payment gateway instead of only deduplicating downstream webhooks.",
    },
  },
];

interface MatchNode {
  key: string;
  round: number;
  match: number;
  label: string;
  upper?: Contender;
  lower?: Contender;
  verdict?: JudgeVerdict;
  isJudging: boolean;
  top: number;
  height: number;
  slotACenterY: number;
  slotBCenterY: number;
  midY: number;
}

interface ConnectorLine {
  key: string;
  d: string;
  state: "open" | "won" | "lost";
  champStep: number | null;
}

function getRoundNames(totalRounds: number): string[] {
  if (totalRounds === 1) return ["Final"];
  if (totalRounds === 2) return ["Semifinal", "Final"];
  if (totalRounds === 3) return ["Quarterfinal", "Semifinal", "Final"];
  if (totalRounds === 4) return ["Round of 16", "Quarterfinal", "Semifinal", "Final"];
  return Array.from({ length: totalRounds }, (_, i) =>
    i === totalRounds - 1 ? "Final" : `Round ${i + 1}`,
  );
}

function buildElbowPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = Math.round((x1 + x2) / 2);
  const dy = y2 - y1;
  if (Math.abs(dy) < 1) {
    return `M${Math.round(x1)} ${Math.round(y1)}H${Math.round(x2)}`;
  }
  const r = Math.min(6, Math.floor(Math.abs(x2 - x1) / 4), Math.floor(Math.abs(dy) / 2));
  const dir = dy > 0 ? 1 : -1;
  return `M${Math.round(x1)} ${Math.round(y1)}H${midX - r}Q${midX} ${Math.round(y1)} ${midX} ${Math.round(y1 + dir * r)}V${Math.round(y2 - dir * r)}Q${midX} ${Math.round(y2)} ${midX + r} ${Math.round(y2)}H${Math.round(x2)}`;
}

function inferDefaultIcon(name: string): ReactNode {
  const lower = name.toLowerCase();
  if (
    lower.includes("claude") ||
    lower.includes("sonnet") ||
    lower.includes("opus") ||
    lower.includes("haiku") ||
    lower.includes("idempotency") ||
    lower.includes("webhook")
  ) {
    return <ModelBrandMark model="claude" size={11} />;
  }
  if (lower.includes("gpt") || lower.includes("openai") || lower.includes("retry guard") || lower.includes("state machine")) {
    return <ModelBrandMark model="openai" size={11} />;
  }
  if (lower.includes("gemini") || lower.includes("row lock") || lower.includes("debounce")) {
    return <ModelBrandMark model="gemini" size={11} />;
  }
  if (lower.includes("grok") || lower.includes("no retries") || lower.includes("refund")) {
    return <ModelBrandMark model="grok" size={11} />;
  }
  return <ModelBrandMark model={name} size={11} />;
}

/**
 * Judge Bracket (affectUI Pro 1:1):
 * Tournament bracket where an LLM judge compares attempts two at a time from Quarterfinals
 * through Semifinals to the Final, lighting up the champion's path and showing side-by-side outputs.
 */
export function AfJudgeBracket({
  contenders: contendersProp,
  candidates: legacyCandidates,
  verdicts: verdictsProp,
  judging: judgingProp,
  judge = "Claude Opus",
  task = "Fix: customers charged twice when a payment is retried",
  onPick,
  onSelectWinner,
  title = "Judge",
  className,
  style,
}: AfJudgeBracketProps = {}) {
  const isDemoAuto =
    verdictsProp === undefined &&
    judgingProp === undefined &&
    contendersProp === undefined &&
    legacyCandidates === undefined;

  const contenders = useMemo<Contender[]>(() => {
    if (legacyCandidates?.length && !contendersProp) {
      return legacyCandidates.map((c) => ({
        id: c.id,
        name: `${c.model} · ${c.label}`,
        icon: inferDefaultIcon(c.model),
        meta: `Score ${c.correctness} · Speed ${c.speed}`,
        output: c.summary,
      }));
    }
    const list = contendersProp ?? DEFAULT_CONTENDERS;
    return list.map((c) => ({
      ...c,
      icon: c.icon ?? inferDefaultIcon(`${c.name} ${c.meta ?? ""}`),
    }));
  }, [contendersProp, legacyCandidates]);

  // Step 0..7 in auto-demo: step k has verdicts 0..(k-1) decided, and DEMO_SCRIPT[k] currently judging (step 7 = all 7 decided)
  const [demoStep, setDemoStep] = useState<number>(0);
  const [manualVerdicts, setManualVerdicts] = useState<Record<string, JudgeVerdict>>(() => {
    if (legacyCandidates?.length && !contendersProp && !verdictsProp) {
      const top = legacyCandidates[0];
      const second = legacyCandidates[1];
      if (top && second) {
        const verdict: Record<string, JudgeVerdict> = {
          "0:0": {
            winner: top.id,
            scores: [Number((top.correctness / 10).toFixed(1)), Number((second.correctness / 10).toFixed(1))],
            reason: top.summary,
          },
        };
        return verdict;
      }
    }
    return {} as Record<string, JudgeVerdict>;
  });

  useEffect(() => {
    if (!isDemoAuto) return;
    const delay = demoStep >= DEMO_SCRIPT.length ? 4200 : 1750;
    const timer = window.setTimeout(() => {
      setDemoStep((prev) => (prev >= DEMO_SCRIPT.length ? 0 : prev + 1));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [demoStep, isDemoAuto]);

  const effectiveVerdicts = useMemo<Record<string, JudgeVerdict>>(() => {
    if (verdictsProp) return verdictsProp;
    if (!isDemoAuto) return manualVerdicts;
    const map: Record<string, JudgeVerdict> = {};
    for (let i = 0; i < Math.min(demoStep, DEMO_SCRIPT.length); i += 1) {
      const entry = DEMO_SCRIPT[i]!;
      map[entry.key] = entry.verdict;
    }
    return { ...map, ...manualVerdicts };
  }, [demoStep, isDemoAuto, manualVerdicts, verdictsProp]);

  const effectiveJudging = useMemo<string | undefined>(() => {
    if (judgingProp !== undefined) return judgingProp;
    if (!isDemoAuto) return undefined;
    return demoStep < DEMO_SCRIPT.length ? DEMO_SCRIPT[demoStep]?.key : undefined;
  }, [demoStep, isDemoAuto, judgingProp]);

  const { rounds, totalMatches, bracketHeight, roundNames } = useMemo(() => {
    const count = Math.max(2, contenders.length);
    const totalRounds = Math.max(1, Math.ceil(Math.log2(count)));
    const names = getRoundNames(totalRounds);
    const allRounds: MatchNode[][] = [];
    const slotH = 40;
    const r0Gap = 4;
    const r0MatchH = slotH * 2 + r0Gap; // 84px
    const r0Spacing = 16; // 100px pitch -> 384px total for 4 matches
    let matchTotal = 0;

    for (let r = 0; r < totalRounds; r += 1) {
      const matchCount = Math.max(1, Math.ceil(count / Math.pow(2, r + 1)));
      matchTotal += matchCount;
      const list: MatchNode[] = [];
      const roundBaseName = names[r] ?? `Round ${r + 1}`;

      for (let m = 0; m < matchCount; m += 1) {
        const key = `${r}:${m}`;
        let upper: Contender | undefined;
        let lower: Contender | undefined;
        let top = 0;
        let height = r0MatchH;
        let slotACenterY = 20;
        let slotBCenterY = 64;

        if (r === 0) {
          upper = contenders[m * 2];
          lower = contenders[m * 2 + 1];
          top = m * (r0MatchH + r0Spacing);
          height = r0MatchH;
          slotACenterY = top + slotH / 2;
          slotBCenterY = top + slotH + r0Gap + slotH / 2;
        } else {
          const prevA = allRounds[r - 1]?.[m * 2];
          const prevB = allRounds[r - 1]?.[m * 2 + 1];
          const winAId = prevA?.verdict?.winner;
          const winBId = prevB?.verdict?.winner;
          upper = winAId ? contenders.find((c) => c.id === winAId) : undefined;
          lower = winBId ? contenders.find((c) => c.id === winBId) : undefined;

          const centerA = prevA ? prevA.midY : m * 140 + 42;
          const centerB = prevB ? prevB.midY : centerA + 100;
          slotACenterY = centerA;
          slotBCenterY = centerB;
          top = centerA - slotH / 2;
          height = centerB + slotH / 2 - top;
        }

        const midY = (slotACenterY + slotBCenterY) / 2;
        const label = matchCount === 1 ? roundBaseName : `${roundBaseName} ${m + 1}`;

        list.push({
          key,
          round: r,
          match: m,
          label,
          upper,
          lower,
          verdict: effectiveVerdicts[key],
          isJudging: effectiveJudging === key,
          top,
          height,
          slotACenterY,
          slotBCenterY,
          midY,
        });
      }
      allRounds.push(list);
    }

    const r0Last = allRounds[0]?.[allRounds[0].length - 1];
    const h = r0Last ? r0Last.top + r0Last.height : 84;
    return { rounds: allRounds, totalMatches: matchTotal, bracketHeight: h, roundNames: names };
  }, [contenders, effectiveJudging, effectiveVerdicts]);

  const finalMatch = rounds[rounds.length - 1]?.[0];
  const champion = finalMatch?.verdict?.winner
    ? contenders.find((c) => c.id === finalMatch.verdict?.winner)
    : undefined;

  const [pinnedMatchKey, setPinnedMatchKey] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const activeMatchKey = useMemo(() => {
    if (pinnedMatchKey) return pinnedMatchKey;
    if (effectiveJudging) return effectiveJudging;
    if (champion && finalMatch) return finalMatch.key;
    return "0:0";
  }, [champion, effectiveJudging, finalMatch, pinnedMatchKey]);

  const activeMatch = useMemo(() => {
    for (const r of rounds) {
      for (const m of r) {
        if (m.key === activeMatchKey) return m;
      }
    }
    return rounds[0]?.[0];
  }, [activeMatchKey, rounds]);

  const bracketRef = useRef<HTMLDivElement | null>(null);
  const matchRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [bracketWidth, setBracketWidth] = useState<number>(680);

  const measureWidth = useCallback(() => {
    const el = bracketRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w > 0) setBracketWidth(w);
  }, []);

  useIsomorphicLayoutEffect(() => {
    measureWidth();
  }, [measureWidth]);

  useEffect(() => {
    const el = bracketRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureWidth]);

  const isNarrow = bracketWidth < 500;
  const colGap = 28;
  const colWidth = Math.max(
    132,
    Math.floor((bracketWidth - (rounds.length - 1) * colGap) / Math.max(1, rounds.length)),
  );

  const connectorLines = useMemo<ConnectorLine[]>(() => {
    if (isNarrow || rounds.length < 2) return [];
    const items: ConnectorLine[] = [];

    for (let r = 0; r < rounds.length - 1; r += 1) {
      const x1 = r * (colWidth + colGap) + colWidth;
      const x2 = (r + 1) * (colWidth + colGap);
      for (const m of rounds[r]!) {
        const nextMatch = rounds[r + 1]?.[Math.floor(m.match / 2)];
        if (!nextMatch) continue;
        const targetY = m.match % 2 === 0 ? nextMatch.slotACenterY : nextMatch.slotBCenterY;
        const winId = m.verdict?.winner;

        const slots: Array<{ side: "a" | "b"; contender?: Contender; y1: number }> = [
          { side: "a", contender: m.upper, y1: m.slotACenterY },
          { side: "b", contender: m.lower, y1: m.slotBCenterY },
        ];

        for (const s of slots) {
          const won = Boolean(winId && s.contender && winId === s.contender.id);
          const lost = Boolean(winId && (!s.contender || winId !== s.contender.id));
          const isChampPath = Boolean(champion && won && s.contender?.id === champion.id);
          items.push({
            key: `${m.key}:${s.side}`,
            d: buildElbowPath(x1, s.y1, x2, targetY),
            state: won ? "won" : lost ? "lost" : "open",
            champStep: isChampPath ? r : null,
          });
        }
      }
    }
    return items;
  }, [champion, colGap, colWidth, isNarrow, rounds]);

  const decidedCount = useMemo(() => {
    let n = 0;
    for (const r of rounds) {
      for (const m of r) {
        if (m.verdict?.winner) n += 1;
      }
    }
    return n;
  }, [rounds]);

  const currentRoundIdx = useMemo(() => {
    if (effectiveJudging) {
      return Number(effectiveJudging.split(":")[0]) || 0;
    }
    if (champion) return rounds.length - 1;
    for (let r = 0; r < rounds.length; r += 1) {
      if (rounds[r]!.some((m) => !m.verdict?.winner)) return r;
    }
    return rounds.length - 1;
  }, [champion, effectiveJudging, rounds]);

  const summaryLabel = champion
    ? `${champion.name} wins · ${decidedCount}/${totalMatches}`
    : `${roundNames[currentRoundIdx] ?? "Round"} · ${decidedCount}/${totalMatches}`;

  const focusMatch = (key: string) => {
    const btn = matchRefs.current[key];
    if (btn && !btn.disabled) {
      btn.focus();
      setPinnedMatchKey(key);
    }
  };

  const handleMatchKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, m: MatchNode) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = rounds[m.round]?.[m.match + 1];
      if (next) focusMatch(next.key);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = rounds[m.round]?.[m.match - 1];
      if (prev) focusMatch(prev.key);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const feed = rounds[m.round + 1]?.[Math.floor(m.match / 2)];
      if (feed) focusMatch(feed.key);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const source = rounds[m.round - 1]?.[m.match * 2];
      if (source) focusMatch(source.key);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setPinnedMatchKey(null);
    }
  };

  const renderSlot = (m: MatchNode, contender: Contender | undefined, sideIdx: 0 | 1) => {
    if (!contender) {
      return <span key={`empty-${sideIdx}`} className="af-jbc__slot" data-side={sideIdx === 0 ? "a" : "b"} data-empty="" />;
    }
    const winId = m.verdict?.winner;
    const won = Boolean(winId && winId === contender.id);
    const lost = Boolean(winId && winId !== contender.id);
    const isFinal = m.round === rounds.length - 1;
    const isChamp = Boolean(isFinal && won && champion?.id === contender.id);
    const score = m.verdict?.scores?.[sideIdx];

    return (
      <span
        key={`${m.key}-${contender.id}`}
        className="af-jbc__slot"
        data-side={sideIdx === 0 ? "a" : "b"}
        data-won={won ? "" : undefined}
        data-lost={lost ? "" : undefined}
        data-champ={isChamp ? "" : undefined}
      >
        <span className="af-jbc__slot-in" data-arrive={m.round > 0 ? "" : undefined}>
          {isChamp ? (
            <span className="af-jbc__cup" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path
                  d="M5 2.5h6v3.6a3 3 0 0 1-6 0V2.5ZM5 3.8H3.3a1.3 1.3 0 0 0 0 2.6H5M11 3.8h1.7a1.3 1.3 0 0 1 0 2.6H11M8 9.2v3.3M5.5 13h5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ) : (
            <span className="af-jbc__tile">{contender.icon}</span>
          )}
          <span className="af-jbc__name" dir="auto" title={contender.name}>
            {contender.name}
          </span>
          {score !== undefined ? (
            <span className="af-jbc__score">{score.toFixed(1)}</span>
          ) : won ? (
            <span className="af-jbc__won" aria-hidden="true">
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 6.2 5 8.6l4.6-5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ) : null}
        </span>
      </span>
    );
  };

  const panelMetaText = useMemo(() => {
    if (!activeMatch) return "";
    if (activeMatch.verdict?.winner) {
      const winnerObj = contenders.find((c) => c.id === activeMatch.verdict?.winner);
      const sc = activeMatch.verdict.scores;
      if (winnerObj && sc) {
        return `${winnerObj.name} · ${Math.max(sc[0], sc[1]).toFixed(1)} vs ${Math.min(sc[0], sc[1]).toFixed(1)}`;
      }
      return winnerObj ? `${winnerObj.name} advances` : "Decided";
    }
    if (activeMatch.isJudging) {
      return `${judge} is comparing…`;
    }
    return "Not judged yet";
  }, [activeMatch, contenders, judge]);

  const hasPickAction = Boolean((onPick || onSelectWinner) && champion);

  return (
    <div
      className={cn("af-jbc", className)}
      data-narrow={isNarrow ? "" : undefined}
      style={{ "--af-jbc-rounds": rounds.length, ...style } as CSSProperties}
      onKeyDown={(e) => {
        if (e.key === "Escape" && pinnedMatchKey) {
          setPinnedMatchKey(null);
        }
      }}
    >
      <header className="af-jbc__head">
        <span className="af-jbc__mark">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M2 3.5h3.5v9H2M5.5 8h3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.45"
            />
            <rect x="9.5" y="5.6" width="5" height="4.8" rx="1.4" fill="currentColor" />
          </svg>
        </span>
        <span className="af-jbc__title">{title}</span>
        {task ? (
          <span className="af-jbc__task" dir="auto" title={task}>
            {task}
          </span>
        ) : null}
        <span
          className="af-jbc__live"
          data-on={effectiveJudging ? "" : undefined}
          aria-hidden="true"
        >
          <svg className="af-jbc__spin" width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M12 3.5A8.5 8.5 0 0 1 20.5 12" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
          </svg>
          Judging
        </span>
        <span className="af-jbc__sum" aria-live="polite">
          {summaryLabel}
        </span>
      </header>

      {isNarrow ? (
        <div className="af-jbc__bracket" role="group" aria-label={`${contenders.length} attempts, judged by ${judge}`}>
          {rounds.map((roundList, rIdx) => (
            <div key={rIdx} className="af-jbc__list" data-on={rIdx === currentRoundIdx ? "" : undefined}>
              <span className="af-jbc__list-name">{roundNames[rIdx] ?? `Round ${rIdx + 1}`}</span>
              {roundList.map((m) => {
                const isEmpty = !m.upper && !m.lower;
                const isPressed = activeMatch?.key === m.key;
                const ariaDesc = `${m.label}: ${m.upper?.name ?? "to be decided"} against ${m.lower?.name ?? "to be decided"}`;
                return (
                  <button
                    key={m.key}
                    ref={(el) => {
                      matchRefs.current[m.key] = el;
                    }}
                    type="button"
                    className="af-jbc__match af-jbc__match--row"
                    data-key={m.key}
                    data-live={m.isJudging ? "" : undefined}
                    aria-pressed={isPressed}
                    aria-label={ariaDesc}
                    disabled={isEmpty}
                    onClick={() => setPinnedMatchKey((cur) => (cur === m.key ? null : m.key))}
                    onKeyDown={(e) => handleMatchKeyDown(e, m)}
                  >
                    {renderSlot(m, m.upper, 0)}
                    {renderSlot(m, m.lower, 1)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={bracketRef}
          className="af-jbc__bracket"
          role="group"
          aria-label={`${contenders.length} attempts, judged by ${judge}`}
          style={{ height: bracketHeight }}
        >
          <div className="af-jbc__rounds" aria-hidden="true">
            {rounds.map((_, rIdx) => (
              <span
                key={rIdx}
                data-on={rIdx === currentRoundIdx ? "" : undefined}
                style={{ left: rIdx * (colWidth + colGap), width: colWidth }}
              >
                {roundNames[rIdx] ?? `Round ${rIdx + 1}`}
              </span>
            ))}
          </div>

          <svg className="af-jbc__lines" width={bracketWidth} height={bracketHeight} aria-hidden="true">
            {connectorLines.map((ln) => (
              <path key={ln.key} className="af-jbc__line" data-state={ln.state} d={ln.d} />
            ))}
            {connectorLines
              .filter((ln) => ln.champStep !== null)
              .map((ln) => (
                <path
                  key={`${ln.key}-champ`}
                  className="af-jbc__line af-jbc__line--path"
                  pathLength={1}
                  style={{ "--af-jbc-step": ln.champStep } as CSSProperties}
                  d={ln.d}
                />
              ))}
          </svg>

          {rounds.flatMap((roundList, rIdx) =>
            roundList.map((m) => {
              const isEmpty = !m.upper && !m.lower;
              const isPressed = activeMatch?.key === m.key;
              const dim = Boolean(pinnedMatchKey && pinnedMatchKey !== m.key);
              const winnerName = m.verdict?.winner
                ? contenders.find((c) => c.id === m.verdict?.winner)?.name
                : undefined;
              const ariaDesc = `${m.label}: ${m.upper?.name ?? "to be decided"} against ${m.lower?.name ?? "to be decided"}${
                winnerName ? `, won by ${winnerName}` : m.isJudging ? ", judging now" : ""
              }`;

              return (
                <button
                  key={m.key}
                  ref={(el) => {
                    matchRefs.current[m.key] = el;
                  }}
                  type="button"
                  className="af-jbc__match"
                  data-key={m.key}
                  data-live={m.isJudging ? "" : undefined}
                  data-dim={dim ? "" : undefined}
                  aria-pressed={isPressed}
                  aria-label={ariaDesc}
                  disabled={isEmpty}
                  style={{
                    left: rIdx * (colWidth + colGap),
                    top: m.top,
                    width: colWidth,
                    height: m.height,
                  }}
                  onClick={() => setPinnedMatchKey((cur) => (cur === m.key ? null : m.key))}
                  onKeyDown={(e) => handleMatchKeyDown(e, m)}
                >
                  {renderSlot(m, m.upper, 0)}
                  {renderSlot(m, m.lower, 1)}
                </button>
              );
            }),
          )}
        </div>
      )}

      {activeMatch ? (
        <section className="af-jbc__panel" aria-label="Match" aria-live="polite">
          <div key={activeMatch.key} className="af-jbc__panel-in">
            <div className="af-jbc__panel-head">
              <span className="af-jbc__panel-name">{activeMatch.label}</span>
              <span className="af-jbc__panel-meta">{panelMetaText}</span>
            </div>

            {activeMatch.verdict?.reason ? (
              <p className="af-jbc__reason">{activeMatch.verdict.reason}</p>
            ) : null}

            <div className="af-jbc__versus">
              {([activeMatch.upper, activeMatch.lower] as const).map((side, idx) => {
                if (!side) {
                  return (
                    <div key={`tbd-${idx}`} className="af-jbc__answer" data-lost="">
                      <div className="af-jbc__answer-head">
                        <span className="af-jbc__answer-name">To be decided</span>
                      </div>
                      <p className="af-jbc__output">Waits for the round before.</p>
                    </div>
                  );
                }

                const winId = activeMatch.verdict?.winner;
                const won = Boolean(winId && winId === side.id);
                const lost = Boolean(winId && winId !== side.id);
                const score = activeMatch.verdict?.scores?.[idx];

                return (
                  <div
                    key={side.id}
                    className="af-jbc__answer"
                    data-won={won ? "" : undefined}
                    data-lost={lost ? "" : undefined}
                    onClick={
                      onSelectWinner
                        ? () => {
                            if (!verdictsProp) {
                              setManualVerdicts((prev) => ({
                                ...prev,
                                [activeMatch.key]: {
                                  winner: side.id,
                                  scores: prev[activeMatch.key]?.scores ?? [9.2, 8.4],
                                  reason: `Selected ${side.name} as the preferred attempt for ${activeMatch.label}.`,
                                },
                              }));
                            }
                            onSelectWinner(side.id);
                          }
                        : undefined
                    }
                  >
                    <div className="af-jbc__answer-head">
                      <span className="af-jbc__tile">{side.icon}</span>
                      <span className="af-jbc__answer-name" dir="auto">
                        {side.name}
                      </span>
                      {won ? <span className="af-jbc__badge">Preferred</span> : null}
                      {score !== undefined ? (
                        <span className="af-jbc__score">{score.toFixed(1)}</span>
                      ) : null}
                    </div>
                    {side.meta ? <span className="af-jbc__answer-meta">{side.meta}</span> : null}
                    <p
                      className="af-jbc__output"
                      dir="auto"
                      tabIndex={0}
                      aria-label={`Answer of ${side.name}`}
                    >
                      {side.output ?? ""}
                    </p>
                  </div>
                );
              })}
            </div>

            {hasPickAction && champion ? (
              <div className="af-jbc__actions">
                <button
                  type="button"
                  className="af-jbc__btn"
                  onClick={() => {
                    setPickedId(champion.id);
                    onPick?.(champion);
                    onSelectWinner?.(champion.id);
                  }}
                >
                  {pickedId === champion.id ? `Using ${champion.name}` : `Use ${champion.name}`}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export const JudgeBracket = AfJudgeBracket;
export const AfJudgeBracketPattern = AfJudgeBracket;
