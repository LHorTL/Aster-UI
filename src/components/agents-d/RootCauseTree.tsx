import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";

export type CauseStatus = "open" | "checking" | "ruled-out" | "confirmed";
export type CauseGate = "or" | "and";

export interface CauseEvidence {
  kind: string;
  source?: string;
  content: string;
}

export interface Cause {
  id: string;
  title: string;
  icon?: ReactNode;
  files?: string[];
  gate?: CauseGate;
  status?: CauseStatus;
  verdict?: string;
  evidence?: CauseEvidence;
  at?: number;
  children?: Cause[];
}

/** Legacy compatibility node interface. */
export interface CauseNode {
  id: string;
  hypothesis: string;
  evidence: string;
  rootCause?: boolean;
  fixLabel?: string;
  children?: CauseNode[];
}

export interface AfRootCauseTreeProps {
  /** Top failure node and its recursive hypotheses. */
  failure?: Cause & { detail?: string };
  /** Legacy root prop. */
  root?: CauseNode;
  /** Fired when "Fix it" or "Retry from here" is pressed on a confirmed root cause. */
  onAction?: (cause: Cause, action: "fix" | "retry") => void;
  /** Legacy apply-fix callback. */
  onApplyFix?: (nodeId: string) => void;
  /** Formats `at` timestamps on checked hypotheses (default `0:42`). */
  formatTime?: (ms: number) => string;
  /** Heading of the top bar (default `"Root cause"`). */
  title?: ReactNode;
  /** Extra class on the root element. */
  className?: string;
  /** Inline style on the root element. */
  style?: CSSProperties;
}

export type AfRootCauseTreePatternProps = AfRootCauseTreeProps;

function TerminalMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ color: "var(--af-rctc-strong, #000)" }}
    >
      <rect x="2.5" y="3.5" width="19" height="17" rx="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M7 9.5l3 2.5-3 2.5M12.5 15H17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StripeMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#635BFF" />
      <path
        fill="#fff"
        transform="translate(5 5) scale(0.5833)"
        d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ color: "var(--af-rctc-strong, #181717)" }}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function DatabaseMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "rgb(19, 179, 160)" }}>
      <ellipse cx="12" cy="5" rx="8" ry="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 12C20 13.6569 16.4183 15 12 15C7.58172 15 4 13.6569 4 12"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M20 5V19C20 20.6569 16.4183 22 12 22C7.58172 22 4 20.6569 4 19V5"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function FileDocIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.4 1.9c0-.55.45-1 1-1h3.4l2.8 2.8v6.4c0 .55-.45 1-1 1H3.4c-.55 0-1-.45-1-1Z"
        fill="currentColor"
        opacity="0.45"
      />
      <path d="M6.8.9v1.9c0 .5.4.9.9.9h1.9Z" fill="currentColor" />
    </svg>
  );
}

function buildDemoTree(stage: number): Cause & { detail?: string } {
  // Stage 0: initial open
  // Stage 1: checking stripe
  // Stage 2: stripe ruled-out, checking fixtures
  // Stage 3: fixtures ruled-out, checking coupon & percent
  // Stage 4: percent confirmed, checking recompute
  // Stage 5: recompute & coupon confirmed (root causes found!)
  const stripeStatus: CauseStatus = stage === 1 ? "checking" : stage >= 2 ? "ruled-out" : "open";
  const fixturesStatus: CauseStatus = stage === 2 ? "checking" : stage >= 3 ? "ruled-out" : "open";
  const percentStatus: CauseStatus = stage === 3 ? "checking" : stage >= 4 ? "confirmed" : "open";
  const recomputeStatus: CauseStatus = stage === 4 ? "checking" : stage >= 5 ? "confirmed" : "open";
  const couponStatus: CauseStatus =
    stage === 3 || stage === 4 ? "checking" : stage >= 5 ? "confirmed" : "open";

  return {
    id: "failure",
    title: "Checkout tests failing",
    detail: "4 of 12",
    icon: <TerminalMark />,
    files: ["tests/checkout.test.ts"],
    gate: "or",
    status: stage >= 5 ? "confirmed" : "open",
    verdict:
      stage >= 5
        ? "Percentage coupons are passed as fixed cents and dropped when the cart recomputes totals."
        : "5 hypotheses to check.",
    evidence:
      stage >= 5
        ? {
            kind: "Log",
            source: "tests/checkout.test.ts",
            content:
              "FAIL tests/checkout.test.ts > applies SAVE20 percentage coupon\nExpected total: $23.20 · Received: $28.80",
          }
        : undefined,
    children: [
      {
        id: "coupon",
        title: "Coupon ignored",
        icon: <StripeMark />,
        files: ["app/checkout/coupon.ts", "app/cart/total.ts"],
        gate: "and",
        status: couponStatus,
        at: stage >= 5 ? 38000 : undefined,
        verdict:
          couponStatus === "confirmed"
            ? "Confirmed: both coupon serialization and cart recomputation fail together on percentage codes."
            : "Checking how percentage coupons flow from checkout into cart totals…",
        evidence: {
          kind: "Tool call",
          source: "vitest",
          content: "npx vitest run tests/checkout.test.ts -t \"coupon\"",
        },
        children: [
          {
            id: "percent",
            title: "Sent as amount",
            icon: <StripeMark />,
            files: ["app/checkout/coupon.ts"],
            status: percentStatus,
            at: stage >= 4 ? 26000 : undefined,
            verdict:
              percentStatus === "confirmed"
                ? "20% coupon is serialized into Stripe's amount_off field (20 cents) instead of percent_off."
                : "Inspecting Stripe coupon payload builder…",
            evidence: {
              kind: "Diff",
              source: "app/checkout/coupon.ts:48",
              content:
                "- payload.amount_off = coupon.value;\n+ payload.percent_off = coupon.kind === \"percent\" ? coupon.value : undefined;",
            },
          },
          {
            id: "recompute",
            title: "Cart drops it",
            icon: <GitHubMark />,
            files: ["app/cart/total.ts", "app/cart/use-cart.ts"],
            status: recomputeStatus,
            at: stage >= 5 ? 38000 : undefined,
            verdict:
              recomputeStatus === "confirmed"
                ? "recomputeTotal() resets discountCents when tax updates, dropping percentage coupons."
                : "Tracing useCart() state updates after tax calculation…",
            evidence: {
              kind: "Diff",
              source: "app/cart/total.ts:82",
              content:
                "  const subtotal = sumItems(cart.items);\n- return subtotal + tax;\n+ return applyCoupon(subtotal, cart.coupon) + tax;",
            },
          },
        ],
      },
      {
        id: "stripe",
        title: "Stripe errors",
        icon: <StripeMark />,
        files: ["logs/stripe.log"],
        status: stripeStatus,
        at: stage >= 2 ? 9000 : undefined,
        verdict:
          stripeStatus === "ruled-out"
            ? "Ruled out — all 12 Stripe sandbox API calls returned 200 OK under 110ms."
            : "Checking Stripe webhook and session logs…",
        evidence: {
          kind: "Log",
          source: "logs/stripe.log",
          content:
            "POST /v1/checkout/sessions -> 200 OK (94ms)\nPOST /v1/coupons/retrieve  -> 200 OK (68ms)",
        },
      },
      {
        id: "fixtures",
        title: "Stale fixtures",
        icon: <DatabaseMark />,
        files: ["fixtures/prices.json"],
        status: fixturesStatus,
        at: stage >= 3 ? 17000 : undefined,
        verdict:
          fixturesStatus === "ruled-out"
            ? "Ruled out — fixture prices match test catalog snapshot v2026.11."
            : "Comparing fixtures/prices.json against seed schema…",
        evidence: {
          kind: "Log",
          source: "fixtures/prices.json",
          content: "{\n  \"pro_monthly\": 2900,\n  \"pro_annual\": 29000\n}",
        },
      },
    ],
  };
}

function convertLegacyNode(node: CauseNode, isTop = false): Cause & { detail?: string } {
  return {
    id: node.id,
    title: node.hypothesis,
    icon: isTop ? <TerminalMark /> : <GitHubMark />,
    status:
      node.rootCause || isTop
        ? "confirmed"
        : node.children?.length
          ? "confirmed"
          : "ruled-out",
    verdict: node.evidence,
    evidence: {
      kind: node.rootCause ? "Diff" : "Log",
      content: node.evidence,
    },
    children: node.children?.map((c) => convertLegacyNode(c, false)),
  };
}

function defaultFormatTime(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface PositionedNode {
  node: Cause & { detail?: string };
  depth: number;
  parentId: string | null;
  posInSet: number;
  setSize: number;
  left: number;
  top: number;
  width: number;
  centerX: number;
  isRoot: boolean;
  isLeaf: boolean;
  onRootPath: boolean;
  pathStep: number;
}

interface TreeWire {
  key: string;
  d: string;
  status: CauseStatus;
  onPath: boolean;
  step: number;
}

interface GatePill {
  key: string;
  gate: CauseGate;
  x: number;
  y: number;
  onPath: boolean;
}

const CARD_H = 84;
const LEVEL_Y = 128;
const COL_GAP = 12;

function countLeaves(node: Cause): number {
  if (!node.children?.length) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

function hasConfirmedRootCause(node: Cause, isTop = false): boolean {
  const status = node.status ?? "open";
  if (!isTop && status === "confirmed" && (!node.children || node.children.length === 0)) {
    return true;
  }
  if (!node.children?.length) return false;
  if (!isTop && status !== "confirmed") return false;
  const gate = node.gate ?? "or";
  if (gate === "and") {
    return node.children.every((c) => hasConfirmedRootCause(c, false));
  }
  return node.children.some((c) => hasConfirmedRootCause(c, false));
}

function maxPathDepth(node: Cause, isTop = false): number {
  if (!hasConfirmedRootCause(node, isTop)) return 0;
  if (!node.children?.length) return 0;
  let best = 0;
  for (const c of node.children) {
    if (hasConfirmedRootCause(c, false)) {
      best = Math.max(best, 1 + maxPathDepth(c, false));
    }
  }
  return best;
}

function StatusGlyph({ status, isRoot }: { status: CauseStatus; isRoot?: boolean }) {
  if (isRoot || status === "confirmed") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M13.9248 21H10.0752C5.44476 21 3.12955 21 2.27636 19.4939C1.42317 17.9879 2.60736 15.9914 4.97574 11.9985L6.90057 8.75333C9.17559 4.91778 10.3131 3 12 3C13.6869 3 14.8244 4.91777 17.0994 8.75332L19.0243 11.9985C21.3926 15.9914 22.5768 17.9879 21.7236 19.4939C20.8704 21 18.5552 21 13.9248 21Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path d="M12 9V13" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
        <path d="M12 16.8V17" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6" />
      </svg>
    );
  }
  if (status === "checking") {
    return (
      <svg
        className="af-rctc__spin"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 3.5a8.5 8.5 0 1 1-6.5 3.04"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
    );
  }
  if (status === "ruled-out") {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 12h12"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2.4" />
    </svg>
  );
}

/**
 * Root Cause Tree (affectUI Pro 1:1 `.af-rctc`):
 * Fault tree with OR/AND gates, dashed ruled-out hypotheses, upward-drawing blue root-cause
 * path, keyboard tree navigation, and live evidence + Fix/Retry panel.
 */
export function AfRootCauseTree({
  failure: failureProp,
  root: legacyRoot,
  onAction,
  onApplyFix,
  formatTime = defaultFormatTime,
  title = "Root cause",
  className,
  style,
}: AfRootCauseTreeProps = {}) {
  const isDemo = !failureProp && !legacyRoot;
  const [demoStage, setDemoStage] = useState<number>(() => (isDemo ? 0 : 5));
  const [userPicked, setUserPicked] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, "fix" | "retry">>({});

  const rootRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [canvasWidth, setCanvasWidth] = useState<number>(680);

  useIsomorphicLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setCanvasWidth(w);
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!isDemo) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setDemoStage(5);
      return;
    }
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setDemoStage(1), 580));
    timers.push(window.setTimeout(() => setDemoStage(2), 1280));
    timers.push(window.setTimeout(() => setDemoStage(3), 1980));
    timers.push(window.setTimeout(() => setDemoStage(4), 2680));
    timers.push(window.setTimeout(() => setDemoStage(5), 3380));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [isDemo]);

  const failure = useMemo<Cause & { detail?: string }>(() => {
    if (legacyRoot && !failureProp) return convertLegacyNode(legacyRoot, true);
    if (failureProp) return failureProp;
    return buildDemoTree(demoStage);
  }, [demoStage, failureProp, legacyRoot]);

  const isNarrow = canvasWidth < 520;

  const { nodes, wires, gates, treeHeight, hypothesisCount, ruledOutCount, checkingNode, firstRootCauseId, rootFound } =
    useMemo(() => {
      const totalLeaves = Math.max(1, countLeaves(failure));
      const w = Math.max(320, canvasWidth);
      const hypWidth = Math.max(116, (w - (totalLeaves - 1) * COL_GAP) / totalLeaves);
      const topCardWidth = Math.min(w, Math.max(hypWidth, 204));

      const totalPathSteps = maxPathDepth(failure, true);
      const found = totalPathSteps > 0;

      const posList: PositionedNode[] = [];
      const wireList: TreeWire[] = [];
      const gateList: GatePill[] = [];

      let leafCursor = 0;
      let maxDepth = 0;
      let hypCount = 0;
      let ruledCount = 0;
      let currentChecking: Cause | null = null;
      let firstRootId: string | null = null;

      const layoutSubtree = (
        node: Cause & { detail?: string },
        depth: number,
        parentId: string | null,
        posInSet: number,
        setSize: number,
        ancestorsOnPath: boolean,
      ): PositionedNode => {
        maxDepth = Math.max(maxDepth, depth);
        const isRoot = depth === 0;
        const children = node.children ?? [];
        const isLeaf = children.length === 0;
        const status: CauseStatus = node.status ?? "open";

        if (!isRoot) {
          hypCount += 1;
          if (status === "ruled-out") ruledCount += 1;
          if (status === "checking" && !currentChecking) currentChecking = node;
        }

        const onRootPath = ancestorsOnPath && hasConfirmedRootCause(node, isRoot);
        if (!isRoot && isLeaf && status === "confirmed" && !firstRootId) {
          firstRootId = node.id;
        }

        const stepFromBottom = Math.max(0, totalPathSteps - depth);

        let centerX = w / 2;
        const childPositioned: PositionedNode[] = [];

        if (isLeaf && !isRoot) {
          const left = leafCursor * (hypWidth + COL_GAP);
          leafCursor += 1;
          centerX = left + hypWidth / 2;
        } else if (children.length > 0) {
          children.forEach((ch, idx) => {
            childPositioned.push(
              layoutSubtree(ch, depth + 1, node.id, idx + 1, children.length, onRootPath),
            );
          });
          if (!isRoot && childPositioned.length > 0) {
            centerX =
              (childPositioned[0].centerX +
                childPositioned[childPositioned.length - 1].centerX) /
              2;
          } else {
            centerX = w / 2;
          }
        }

        const cardW = isRoot ? topCardWidth : hypWidth;
        const left = Math.max(0, Math.min(w - cardW, centerX - cardW / 2));
        const top = depth * LEVEL_Y;

        const selfPos: PositionedNode = {
          node,
          depth,
          parentId,
          posInSet,
          setSize,
          left,
          top,
          width: cardW,
          centerX: left + cardW / 2,
          isRoot,
          isLeaf,
          onRootPath,
          pathStep: stepFromBottom,
        };
        posList.push(selfPos);

        if (childPositioned.length > 0) {
          const px = selfPos.centerX;
          const parentBottom = top + CARD_H;
          const midY = parentBottom + 27.28;
          const gate: CauseGate = node.gate ?? "or";

          gateList.push({
            key: `gate-${node.id}`,
            gate,
            x: px,
            y: parentBottom + 13.64,
            onPath: onRootPath,
          });

          for (const ch of childPositioned) {
            const cx = ch.centerX;
            const childTop = ch.top;
            const dx = px - cx;
            let d: string;
            if (Math.abs(dx) < 1) {
              d = `M${cx.toFixed(1)} ${childTop}V${parentBottom}`;
            } else {
              const r = Math.min(8, Math.abs(dx) / 2);
              const s = dx > 0 ? 1 : -1;
              d = `M${cx.toFixed(1)} ${childTop}V${(midY + 8).toFixed(2)}Q${cx.toFixed(1)} ${midY.toFixed(2)} ${(cx + s * r).toFixed(1)} ${midY.toFixed(2)}H${(px - s * r).toFixed(1)}Q${px.toFixed(1)} ${midY.toFixed(2)} ${px.toFixed(1)} ${(midY - 8).toFixed(2)}V${parentBottom}`;
            }

            wireList.push({
              key: `${node.id}->${ch.node.id}`,
              d,
              status: ch.node.status ?? "open",
              onPath: onRootPath && ch.onRootPath,
              step: ch.pathStep,
            });
          }
        }

        return selfPos;
      };

      layoutSubtree(failure, 0, null, 1, 1, true);

      // Order posList in pre-order traversal so DOM order matches visual tree reading order
      const byId = new Map(posList.map((p) => [p.node.id, p]));
      const ordered: PositionedNode[] = [];
      const walkOrder = (n: Cause) => {
        const p = byId.get(n.id);
        if (p) ordered.push(p);
        n.children?.forEach(walkOrder);
      };
      walkOrder(failure);

      return {
        nodes: ordered,
        wires: wireList,
        gates: gateList,
        treeHeight: maxDepth * LEVEL_Y + CARD_H,
        hypothesisCount: hypCount,
        ruledOutCount: ruledCount,
        checkingNode: currentChecking as Cause | null,
        firstRootCauseId: firstRootId,
        rootFound: found,
      };
    }, [canvasWidth, failure]);

  const activeSelectedId = useMemo(() => {
    if (userPicked && nodes.some((n) => n.node.id === userPicked)) return userPicked;
    if (checkingNode) return checkingNode.id;
    if (firstRootCauseId) return firstRootCauseId;
    return failure.id;
  }, [checkingNode, failure.id, firstRootCauseId, nodes, userPicked]);

  const selectedEntry = useMemo(
    () => nodes.find((n) => n.node.id === activeSelectedId) ?? nodes[0],
    [activeSelectedId, nodes],
  );

  const summaryText = rootFound
    ? `Root cause found · ${ruledOutCount} ruled out`
    : `${hypothesisCount} ${hypothesisCount === 1 ? "hypothesis" : "hypotheses"} · ${ruledOutCount} ruled out`;

  const focusNode = (id: string) => {
    setUserPicked(id);
    cardRefs.current[id]?.focus();
  };

  const handleTreeKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>, current: PositionedNode) => {
    const idx = nodes.findIndex((n) => n.node.id === current.node.id);
    if (e.key === "Home") {
      e.preventDefault();
      if (nodes[0]) focusNode(nodes[0].node.id);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      const last = nodes[nodes.length - 1];
      if (last) focusNode(last.node.id);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setUserPicked(null);
      return;
    }
    if (isNarrow) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = nodes[Math.min(nodes.length - 1, idx + 1)];
        if (next) focusNode(next.node.id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = nodes[Math.max(0, idx - 1)];
        if (prev) focusNode(prev.node.id);
      }
      return;
    }

    if (e.key === "ArrowUp" && current.parentId) {
      e.preventDefault();
      focusNode(current.parentId);
    } else if (e.key === "ArrowDown" && current.node.children?.length) {
      e.preventDefault();
      focusNode(current.node.children[0].id);
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const sameLevel = nodes.filter((n) => n.depth === current.depth);
      const pos = sameLevel.findIndex((n) => n.node.id === current.node.id);
      const next =
        e.key === "ArrowRight" ? sameLevel[pos + 1] : sameLevel[pos - 1];
      if (next) {
        e.preventDefault();
        focusNode(next.node.id);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setUserPicked((prev) => (prev === current.node.id ? null : current.node.id));
    }
  };

  const selNode = selectedEntry?.node ?? failure;
  const selStatus: CauseStatus = selNode.status ?? "open";
  const selIsLeafRootCause =
    !selectedEntry?.isRoot && selStatus === "confirmed" && Boolean(selectedEntry?.isLeaf);
  const showActions =
    selIsLeafRootCause && (isDemo || Boolean(onAction) || Boolean(onApplyFix));

  return (
    <div
      ref={rootRef}
      className={cn("af-rctc", className)}
      data-narrow={isNarrow || undefined}
      style={{
        ...(isDemo && !isNarrow ? { minHeight: treeHeight + 258 } : undefined),
        ...style,
      }}
    >
      <header className="af-rctc__head">
        <span className="af-rctc__mark" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 5.2v2.3M4 10.5V8.6h8v1.9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.45"
            />
            <rect x="5.4" y="1.6" width="5.2" height="3.6" rx="1.2" fill="currentColor" />
            <circle cx="4" cy="12.4" r="1.9" fill="currentColor" />
            <circle cx="12" cy="12.4" r="1.9" fill="currentColor" />
          </svg>
        </span>
        <span className="af-rctc__title" dir="auto">
          {title}
        </span>
        <span
          className="af-rctc__live"
          data-on={Boolean(checkingNode) || undefined}
          aria-hidden="true"
        >
          <svg
            className="af-rctc__spin"
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="8.5"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="3"
            />
            <path
              d="M12 3.5A8.5 8.5 0 0 1 20.5 12"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
          Investigating
        </span>
        <span className="af-rctc__sum" aria-live="polite">
          {summaryText}
        </span>
      </header>

      <div
        className="af-rctc__tree"
        role="tree"
        aria-label={`Why ${failure.title}`}
        style={!isNarrow ? { height: `${treeHeight}px` } : undefined}
      >
        {!isNarrow ? (
          <>
            <svg
              className="af-rctc__lines"
              width={canvasWidth}
              height={treeHeight}
              aria-hidden="true"
            >
              {wires.map((w) => (
                <g key={w.key}>
                  <path className="af-rctc__line" data-status={w.status} d={w.d} />
                  {w.onPath ? (
                    <path
                      className="af-rctc__line af-rctc__line--path"
                      d={w.d}
                      pathLength={1}
                      style={{ "--af-rctc-step": w.step } as CSSProperties}
                    />
                  ) : null}
                </g>
              ))}
            </svg>

            {gates.map((g) => (
              <span
                key={g.key}
                className="af-rctc__gate"
                data-path={g.onPath || undefined}
                title={g.gate === "and" ? "All of these together" : "Any one of these"}
                style={{ left: `${g.x}px`, top: `${g.y}px` }}
              >
                {g.gate.toUpperCase()}
              </span>
            ))}
          </>
        ) : null}

        {nodes.map((entry) => {
          const { node, depth, posInSet, setSize, left, top, width, isRoot, isLeaf, onRootPath } =
            entry;
          const status: CauseStatus = node.status ?? "open";
          const isSelected = node.id === activeSelectedId;
          const isLeafRoot = !isRoot && isLeaf && status === "confirmed";
          const shouldDim =
            rootFound && userPicked === null && !isRoot && !onRootPath && status !== "checking";

          const firstFile = node.files?.[0];
          const firstBase = firstFile ? firstFile.split("/").pop() ?? firstFile : null;
          const extraFiles = (node.files?.length ?? 0) - 1;

          const statusWord = isRoot
            ? "failed"
            : isLeafRoot
              ? "root cause"
              : status === "ruled-out"
                ? "ruled out"
                : status === "checking"
                  ? "checking"
                  : status === "confirmed"
                    ? "confirmed"
                    : "not checked";

          const gateSuffix =
            !isRoot && node.children?.length
              ? `, ${(node.gate ?? "or") === "and" ? "all" : "any"} of ${node.children.length} below`
              : "";

          return (
            <div
              key={node.id}
              ref={(el) => {
                cardRefs.current[node.id] = el;
              }}
              role="treeitem"
              aria-level={depth + 1}
              aria-setsize={setSize}
              aria-posinset={posInSet}
              aria-selected={isSelected}
              aria-label={`${node.title}, ${statusWord}${gateSuffix}`}
              tabIndex={isSelected ? 0 : -1}
              data-id={node.id}
              data-status={isRoot ? "failed" : status}
              data-root={isRoot ? "" : undefined}
              data-path={onRootPath || undefined}
              data-dim={shouldDim || undefined}
              className="af-rctc__card"
              style={
                !isNarrow
                  ? { left: `${left}px`, top: `${top}px`, width: `${width}px` }
                  : ({ "--af-rctc-depth": depth } as CSSProperties)
              }
              onClick={() => setUserPicked(node.id)}
              onKeyDown={(e) => handleTreeKeyDown(e, entry)}
            >
              <span className="af-rctc__card-top">
                <span className="af-rctc__tile">
                  {node.icon ?? (isRoot ? <TerminalMark /> : <GitHubMark />)}
                </span>
                <span className="af-rctc__name" dir="auto" title={node.title}>
                  {node.title}
                </span>
                {isNarrow && node.children?.length ? (
                  <span className="af-rctc__gate af-rctc__gate--inline">
                    {(node.gate ?? "or").toUpperCase()}
                  </span>
                ) : null}
              </span>

              <span className="af-rctc__files">
                {firstBase ? (
                  <span className="af-rctc__file" title={node.files?.join("\n")}>
                    <FileDocIcon />
                    <span className="af-rctc__file-name">{firstBase}</span>
                  </span>
                ) : null}
                {extraFiles > 0 ? (
                  <span className="af-rctc__file-more">+{extraFiles}</span>
                ) : null}
              </span>

              <span className="af-rctc__meta">
                <span className="af-rctc__glyph">
                  <StatusGlyph status={status} isRoot={isRoot} />
                </span>

                {isRoot ? (
                  <>
                    <span className="af-rctc__badge" data-kind="failed">
                      Failed
                    </span>
                    {node.detail ? (
                      <span className="af-rctc__detail" dir="auto">
                        {node.detail}
                      </span>
                    ) : null}
                    {rootFound ? (
                      <span className="af-rctc__badge" data-kind="found">
                        Found
                      </span>
                    ) : null}
                  </>
                ) : isLeafRoot ? (
                  <>
                    <span className="af-rctc__badge" data-kind="root">
                      Root cause
                    </span>
                    {node.at !== undefined ? (
                      <span className="af-rctc__state af-rctc__state--live">
                        {formatTime(node.at)}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="af-rctc__state" data-status={status}>
                    {status === "checking"
                      ? "Checking…"
                      : status === "ruled-out"
                        ? "Ruled out"
                        : status === "confirmed"
                          ? "Confirmed"
                          : "Not checked"}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <section
        className="af-rctc__panel"
        aria-label="Evidence"
        aria-live="polite"
        data-status={selectedEntry?.isRoot ? "failed" : selStatus}
      >
        <div className="af-rctc__panel-in" key={selNode.id}>
          <div className="af-rctc__panel-head">
            <span className="af-rctc__tile">
              {selNode.icon ?? (selectedEntry?.isRoot ? <TerminalMark /> : <GitHubMark />)}
            </span>
            <span className="af-rctc__panel-name" dir="auto">
              {selNode.title}
            </span>
            {selIsLeafRootCause ? (
              <span className="af-rctc__badge" data-kind="root">
                Root cause
              </span>
            ) : null}
            {selNode.at !== undefined ? (
              <span className="af-rctc__panel-meta">Checked at {formatTime(selNode.at)}</span>
            ) : null}
          </div>

          {selNode.verdict ? (
            <p
              className={cn(
                "af-rctc__verdict",
                selStatus === "open" && "af-rctc__verdict--quiet",
              )}
            >
              {selNode.verdict}
            </p>
          ) : null}

          {selNode.files?.length ? (
            <ul className="af-rctc__panel-files" aria-label="Files">
              {selNode.files.map((f) => (
                <li key={f} className="af-rctc__file" title={f}>
                  <FileDocIcon />
                  <span className="af-rctc__file-name" dir="auto">
                    {f}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {selNode.evidence?.content ? (
            <div className="af-rctc__evidence">
              <div className="af-rctc__label">
                <span>{selNode.evidence.kind}</span>
                {selNode.evidence.source ? (
                  <span className="af-rctc__source">{selNode.evidence.source}</span>
                ) : null}
              </div>
              <pre className="af-rctc__code" tabIndex={0}>
                {selNode.evidence.content}
              </pre>
            </div>
          ) : null}

          {showActions ? (
            <div className="af-rctc__actions">
              <button
                type="button"
                className="af-rctc__btn"
                onClick={() => {
                  setActionState((prev) => ({ ...prev, [selNode.id]: "retry" }));
                  onAction?.(selNode, "retry");
                }}
              >
                {actionState[selNode.id] === "retry" ? "Retrying…" : "Retry from here"}
              </button>
              <button
                type="button"
                className="af-rctc__btn af-rctc__btn--primary"
                onClick={() => {
                  setActionState((prev) => ({ ...prev, [selNode.id]: "fix" }));
                  onAction?.(selNode, "fix");
                  onApplyFix?.(selNode.id);
                }}
              >
                {actionState[selNode.id] === "fix" ? "Patch queued" : "Fix it"}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export const RootCauseTree = AfRootCauseTree;
export const AfRootCauseTreePattern = AfRootCauseTree;
