import { createElement, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  clampPointToLayer,
  cn,
  computeCursorAnchoredPan,
  computePopoverPlacement,
  hitTestPoint,
  isImeComposing,
  useAnimatedList,
  useAutoScrollStick,
  useCanvasZoomPan,
  useControllableState,
  useFlip,
  useHitAreaCollector,
  useHoverIsolatedTimers,
  useListFlip,
  useOverflowCollapse,
  usePointerDragBoard,
  usePointerScrub,
  useReversibleEdgePeek,
  useSortableList,
  useStreamingTokens,
  useTwoPhaseWindowTransition,
  useWindowAutoSize,
  useWindowPointerDrag,
} from "../src/primitives";

describe("Aster UI Primitives", () => {
  it("merges class names cleanly via cn()", () => {
    expect(cn("af-btn", false && "x", undefined, null, "custom")).toBe("af-btn custom");
  });

  it("detects IME composition for both standard isComposing and Safari keyCode 229", () => {
    expect(isImeComposing({ isComposing: true, keyCode: 13 } as unknown as KeyboardEvent)).toBe(true);
    expect(isImeComposing({ isComposing: false, keyCode: 229 } as unknown as KeyboardEvent)).toBe(true);
    expect(isImeComposing({ isComposing: false, keyCode: 13 } as unknown as KeyboardEvent)).toBe(false);
  });

  it("flips popover to top and updates transformOrigin to trigger-touching corner when bottom space is tight", () => {
    const bottom = computePopoverPlacement({
      anchor: { left: 40, right: 160, top: 40, bottom: 72, width: 120 },
      layer: { width: 800, height: 600 },
      popWidth: 180,
      popHeight: 200,
      align: "start",
    });
    expect(bottom.side).toBe("bottom");
    expect(bottom.origin).toBe("top left");
    expect(bottom.top).toBe(78);

    const flipped = computePopoverPlacement({
      anchor: { left: 680, right: 780, top: 520, bottom: 552, width: 100 },
      layer: { width: 800, height: 600 },
      popWidth: 220,
      popHeight: 200,
      align: "end",
    });
    expect(flipped.side).toBe("top");
    expect(flipped.origin).toBe("bottom right");
    expect(flipped.left).toBe(560);
    expect(flipped.top).toBe(314);
  });

  it("clamps context-menu pointer coordinates inside layer bounds and flips origin near bottom-right", () => {
    const fakeLayer = {
      offsetWidth: 500,
      offsetHeight: 400,
      getBoundingClientRect: () => ({ left: 100, top: 50, width: 500, height: 400 } as DOMRect),
    } as unknown as HTMLElement;

    const normal = clampPointToLayer(150, 100, 180, 140, fakeLayer, 8);
    expect(normal).toEqual({ left: 50, top: 50, origin: "top left" });

    const edge = clampPointToLayer(580, 430, 180, 140, fakeLayer, 8);
    expect(edge.origin).toBe("bottom right");
    expect(edge.left).toBe(300);
    expect(edge.top).toBe(240);
  });

  it("accumulates synchronous back-to-back functional updates in uncontrolled useControllableState", () => {
    const changes: Record<string, string>[] = [];
    let setter: ((next: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void) | null = null;

    function Probe() {
      const [, setVal] = useControllableState<Record<string, string>>({
        defaultValue: {},
        onChange: (next) => changes.push(next),
      });
      setter = setVal;
      return null;
    }

    renderToStaticMarkup(createElement(Probe));
    expect(setter).toBeTypeOf("function");

    setter!((prev) => ({ ...prev, "file-a.ts": "merged" }));
    setter!((prev) => ({ ...prev, "file-b.ts": "merged" }));

    expect(changes).toEqual([
      { "file-a.ts": "merged" },
      { "file-a.ts": "merged", "file-b.ts": "merged" },
    ]);
  });

  it("initializes P0-3 list-exit, pointer-drag, streaming, scrub, and overflow hooks cleanly in SSR", () => {
    let snapshot: Record<string, unknown> | null = null;

    function P03HooksProbe() {
      const containerRef = useRef<HTMLDivElement | null>(null);
      const triggerFlip = useFlip(containerRef, "sig-1");
      const listFlip = useListFlip(containerRef);
      const animated = useAnimatedList({
        items: [
          { id: "a", label: "Alpha" },
          { id: "b", label: "Beta" },
        ],
        getKey: (it) => it.id,
      });
      const sortable = useSortableList({
        items: [
          { id: "s1", label: "Step 1" },
          { id: "s2", label: "Step 2" },
        ],
        getKey: (it) => it.id,
        onReorder: () => {},
      });
      const board = usePointerDragBoard({
        columnIds: ["todo", "done"],
        getColumnItems: (col) => (col === "todo" ? [{ id: "k1", title: "Card 1" }] : []),
        getKey: (it) => it.id,
        onMove: () => {},
      });
      const stream = useStreamingTokens("Hello 🚀 world", { disabled: true });
      const scrub = usePointerScrub({
        value: 42,
        min: 0,
        max: 100,
        step: 2,
        onChange: () => {},
      });
      const overflow = useOverflowCollapse({ itemCount: 5 });

      snapshot = {
        hasTriggerFlip: typeof triggerFlip === "function",
        hasListFlipCapture: typeof listFlip.capture === "function",
        animatedCount: animated.entries.length,
        animatedAllActive: animated.entries.every((e) => !e.leaving),
        sortableItemId: sortable.getItemProps({ id: "s1", label: "Step 1" }, 0)["data-drag-item-id"],
        boardColId: board.getColumnProps("todo")["data-drag-col-id"],
        boardItemId: board.getItemProps({ id: "k1", title: "Card 1" }, "todo", 0)["data-drag-item-id"],
        streamDisplayed: stream.displayedText,
        streamPending: stream.pendingLength,
        scrubRole: scrub.scrubProps.role,
        scrubNow: scrub.scrubProps["aria-valuenow"],
        overflowVisible: overflow.visibleCount,
        overflowCount: overflow.overflowCount,
        overflowCollapsed: overflow.isCollapsed,
      };
      return createElement("div", { ref: containerRef }, stream.displayedText);
    }

    const html = renderToStaticMarkup(createElement(P03HooksProbe));
    expect(html).toContain("Hello 🚀 world");
    expect(snapshot).toEqual({
      hasTriggerFlip: true,
      hasListFlipCapture: true,
      animatedCount: 2,
      animatedAllActive: true,
      sortableItemId: "s1",
      boardColId: "todo",
      boardItemId: "k1",
      streamDisplayed: "Hello 🚀 world",
      streamPending: 0,
      scrubRole: "spinbutton",
      scrubNow: 42,
      overflowVisible: 5,
      overflowCount: 0,
      overflowCollapsed: false,
    });
  });

  it("initializes all 8 P1–P3 window, timer, auto-scroll, and canvas-zoom primitives cleanly in SSR and enforces pure physics invariants", () => {
    // 1. Pure hitTestPoint inclusive boundary & miss checks
    const rects = [
      { x: 10, y: 20, width: 100, height: 40, right: 110, bottom: 60 },
      { x: 300, y: 200, width: 50, height: 50, right: 350, bottom: 250 },
    ];
    expect(hitTestPoint(rects, 10, 20)).toBe(true);
    expect(hitTestPoint(rects, 110, 60)).toBe(true);
    expect(hitTestPoint(rects, 325, 225)).toBe(true);
    expect(hitTestPoint(rects, 111, 60)).toBe(false);
    expect(hitTestPoint([], 50, 50)).toBe(false);

    // 2. Pure computeCursorAnchoredPan fixed-point invariance across zoom in/out & zero guard
    const pan0 = { x: 40, y: -25 };
    const panZoomIn = computeCursorAnchoredPan(240, 175, pan0, 1, 4);
    expect((240 - pan0.x) / 1).toBeCloseTo((240 - panZoomIn.x) / 4, 4);
    expect((175 - pan0.y) / 1).toBeCloseTo((175 - panZoomIn.y) / 4, 4);
    const panZoomBack = computeCursorAnchoredPan(240, 175, panZoomIn, 4, 1);
    expect(panZoomBack).toEqual(pan0);
    expect(computeCursorAnchoredPan(100, 100, { x: 0, y: 0 }, 0, 2)).toEqual({ x: -100, y: -100 });

    // 3. SSR hook initialization & interaction handler contracts for all 8 P1–P3 primitives
    const dragMoves: Array<{ dx: number; dy: number; totalDx: number; totalDy: number }> = [];
    let dragEnded = false;
    let dragBind: ReturnType<typeof useWindowPointerDrag>["bindTarget"] | null = null;
    let p13Snapshot: Record<string, unknown> | null = null;

    function P13PrimitivesProbe() {
      const boxRef = useRef<HTMLDivElement | null>(null);
      const secRef = useRef<HTMLDivElement | null>(null);

      const autoSize = useWindowAutoSize(boxRef, { minWidth: 120, minHeight: 60, padding: 8 });
      const winDrag = useWindowPointerDrag({
        threshold: 4,
        onMove: (p) => dragMoves.push({ dx: p.dx, dy: p.dy, totalDx: p.totalDx, totalDy: p.totalDy }),
        onDragEnd: () => {
          dragEnded = true;
        },
      });
      dragBind = winDrag.bindTarget;

      const hitAreas = useHitAreaCollector({ rootRef: boxRef, padding: 4 });
      const twoPhase = useTwoPhaseWindowTransition({ expanded: false, duration: 180 });
      const peekRight = useReversibleEdgePeek({ edge: "right", collapsedRatio: 0.5 });
      const peekLeftRail = useReversibleEdgePeek({ edge: "left", collapsedRatio: 0.31 });
      const peekPinned = useReversibleEdgePeek({ edge: "right", collapsedRatio: 0.5, pinnedOpen: true });

      const timers = useHoverIsolatedTimers({
        items: [
          { id: "t1", ms: 2000 },
          { id: "t2", ms: 0 },
        ],
        getKey: (it) => it.id,
        getDuration: (it) => it.ms,
      });

      const stick = useAutoScrollStick({ itemCount: 12, threshold: 24 });
      const canvas = useCanvasZoomPan({
        defaultZoom: 1.5,
        defaultPan: { x: 12, y: -8 },
        secondaryViewportRef: secRef,
      });

      p13Snapshot = {
        autoSizeInitial: autoSize.size,
        autoSizeReady: autoSize.ready,
        hasMeasureNow: typeof autoSize.measureNow === "function",
        draggingInitial: winDrag.dragging,
        hitRectsCount: hitAreas.rects.length,
        twoPhaseInitial: twoPhase.phase,
        twoPhaseMounted: twoPhase.panelMounted,
        peekRightOffset: peekRight.offsetPercent,
        peekLeftRailOffset: peekLeftRail.offsetPercent,
        peekPinnedProgress: peekPinned.progress,
        peekPinnedOffset: peekPinned.offsetPercent,
        timerDefaultRatio: timers.getRatio("t1"),
        timerPausedInitial: timers.isPaused("t1"),
        stickInitial: stick.isStuck,
        stickUnread: stick.unreadCount,
        canvasZoom: canvas.zoom,
        canvasPan: canvas.pan,
        canvasTransform: canvas.canvasStyle.transform,
        canvasOrigin: canvas.canvasStyle.transformOrigin,
      };

      return createElement("div", { ref: boxRef, style: canvas.canvasStyle }, "p1-p3-primitives");
    }

    const html = renderToStaticMarkup(createElement(P13PrimitivesProbe));
    expect(html).toContain("p1-p3-primitives");
    expect(p13Snapshot).toEqual({
      autoSizeInitial: null,
      autoSizeReady: false,
      hasMeasureNow: true,
      draggingInitial: false,
      hitRectsCount: 0,
      twoPhaseInitial: "collapsed",
      twoPhaseMounted: false,
      peekRightOffset: 50,
      peekLeftRailOffset: -69,
      peekPinnedProgress: 1,
      peekPinnedOffset: 0,
      timerDefaultRatio: 1,
      timerPausedInitial: false,
      stickInitial: true,
      stickUnread: 0,
      canvasZoom: 1.5,
      canvasPan: { x: 12, y: -8 },
      canvasTransform: "translate3d(12px, -8px, 0) scale(1.5)",
      canvasOrigin: "0 0",
    });

    // 4. Verify useWindowPointerDrag 4px anti-jitter threshold & post-drag click suppression
    const fakeEl = {} as HTMLElement;
    dragBind!.onPointerDown({
      button: 0,
      pointerId: 1,
      screenX: 100,
      screenY: 100,
      clientX: 10,
      clientY: 10,
      currentTarget: fakeEl,
    } as unknown as React.PointerEvent<HTMLElement>);

    // Sub-threshold 2px jitter -> must NOT fire onMove or suppress click
    dragBind!.onPointerMove({
      pointerId: 1,
      screenX: 102,
      screenY: 101,
      clientX: 12,
      clientY: 11,
      currentTarget: fakeEl,
    } as unknown as React.PointerEvent<HTMLElement>);
    dragBind!.onPointerUp({
      pointerId: 1,
      screenX: 102,
      screenY: 101,
      clientX: 12,
      clientY: 11,
      currentTarget: fakeEl,
    } as unknown as React.PointerEvent<HTMLElement>);
    expect(dragMoves).toEqual([]);
    expect(dragEnded).toBe(false);

    // Supra-threshold drag -> computes screenX/screenY deltas & suppresses synthetic click (except [data-no-drag="true"])
    dragBind!.onPointerDown({
      button: 0,
      pointerId: 2,
      screenX: 200,
      screenY: 300,
      clientX: 20,
      clientY: 30,
      currentTarget: fakeEl,
    } as unknown as React.PointerEvent<HTMLElement>);
    dragBind!.onPointerMove({
      pointerId: 2,
      screenX: 230,
      screenY: 340,
      clientX: 20,
      clientY: 30,
      currentTarget: fakeEl,
    } as unknown as React.PointerEvent<HTMLElement>);
    dragBind!.onPointerUp({
      pointerId: 2,
      screenX: 230,
      screenY: 340,
      clientX: 20,
      clientY: 30,
      currentTarget: fakeEl,
    } as unknown as React.PointerEvent<HTMLElement>);

    expect(dragMoves).toEqual([{ dx: 30, dy: 40, totalDx: 30, totalDy: 40 }]);
    expect(dragEnded).toBe(true);

    let prevented = false;
    dragBind!.onClickCapture({
      target: { closest: () => null },
      preventDefault: () => {
        prevented = true;
      },
      stopPropagation: () => {},
    } as unknown as React.MouseEvent<HTMLElement>);
    expect(prevented).toBe(true);
  });
});
