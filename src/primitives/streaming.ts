import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./cn";

export type StreamingTokenSegment = {
  /** 增量片段递增标识（供渲染 `.af-stream-token` `key` 绑定）。 */
  id: number;
  /** 本帧新揭示的 UTF-8 / Unicode 码点安全文本片段。 */
  text: string;
};

export type UseStreamingTokensOptions = {
  /** 上游 SSE / IPC 是否仍处于流式生成中，默认 `true`。 */
  streaming?: boolean;
  /** 每拍固定揭示码点数；省略时按缓冲区积压自适应平滑追赶（`2..28` 字符/拍）。 */
  charsPerTick?: number;
  /** 揭示节拍间隔（毫秒），默认 `16`（约 60fps）。 */
  intervalMs?: number;
  /** 尾部渐显片段合并回 `stableText` 的驻留时长（毫秒），默认 `200`（防止长回答产生大量 DOM `<span>`）。 */
  segmentTTL?: number;
  /** 禁用逐字缓冲，直接同步显示完整 `sourceText`。 */
  disabled?: boolean;
  /** 当 `streaming === false` 且全部缓冲字符揭示完毕时触发。 */
  onComplete?: (fullText: string) => void;
};

export type StreamingTokensController = {
  /** 当前已揭示的完整前缀文本（等于 `stableText + segments` 拼接）。 */
  displayedText: string;
  /** 已完成淡入并归并的稳定前缀文本。 */
  stableText: string;
  /** 正在执行 `.af-stream-token` 柔和渐显的尾部增量片段（数量恒定有界）。 */
  segments: StreamingTokenSegment[];
  /** 是否仍有缓冲字符尚未揭示。 */
  isRevealing: boolean;
  /** 待揭示缓冲区剩余码点数。 */
  pendingLength: number;
  /** 立即跳过动画并将当前全部 `sourceText` 刷入 `stableText`（适用于“停止生成/跳过”交互）。 */
  flush: () => void;
  /** 重置控制器状态（适用于切换会话分支）。 */
  reset: (initialText?: string) => void;
};

type InternalSegment = StreamingTokenSegment & {
  createdAt: number;
};

/**
 * AI 流式增量文本缓冲与柔和逐块揭示协调器：
 * - 按 Unicode 码点安全切片（绝不截断 Emoji / 代理对）；
 * - 采用 `stableText + 有界尾部 segments` 归并架构，长文流式输出下 DOM 节点数恒定 `O(1)`；
 * - 支持自适应积压追赶、`flush()` 一键瞬时跳过以及 `prefers-reduced-motion` 自动直出。
 */
export function useStreamingTokens(
  sourceText: string,
  options: UseStreamingTokensOptions = {},
): StreamingTokensController {
  const {
    streaming = true,
    charsPerTick,
    intervalMs = 16,
    segmentTTL = 200,
    disabled = false,
    onComplete,
  } = options;

  const bypass = disabled || prefersReducedMotion();

  const [state, setState] = useState<{
    stableText: string;
    segments: InternalSegment[];
    revealedSource: string;
  }>(() => ({
    stableText: bypass || !streaming ? sourceText : "",
    segments: [],
    revealedSource: bypass || !streaming ? sourceText : "",
  }));

  const seqRef = useRef(1);
  const completedForRef = useRef<string | null>(!streaming ? sourceText : null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Handle bypass mode or non-prefix stream resets immediately.
  useEffect(() => {
    if (bypass) {
      setState((prev) =>
        prev.stableText === sourceText && prev.segments.length === 0
          ? prev
          : { stableText: sourceText, segments: [], revealedSource: sourceText },
      );
      return;
    }

    setState((prev) => {
      if (!sourceText.startsWith(prev.revealedSource)) {
        // Conversation switched or message replaced: reset cleanly.
        if (!streaming) {
          return { stableText: sourceText, segments: [], revealedSource: sourceText };
        }
        return { stableText: "", segments: [], revealedSource: "" };
      }
      return prev;
    });
  }, [bypass, sourceText, streaming]);

  const flush = useCallback(() => {
    setState({
      stableText: sourceText,
      segments: [],
      revealedSource: sourceText,
    });
  }, [sourceText]);

  const reset = useCallback((initialText = "") => {
    completedForRef.current = null;
    setState({
      stableText: initialText,
      segments: [],
      revealedSource: initialText,
    });
  }, []);

  const hasUnrevealed = !bypass && state.revealedSource.length < sourceText.length;
  const hasActiveSegments = state.segments.length > 0;

  useEffect(() => {
    if (bypass) return;
    if (!hasUnrevealed && !hasActiveSegments) {
      if (!streaming && completedForRef.current !== sourceText) {
        completedForRef.current = sourceText;
        onCompleteRef.current?.(sourceText);
      }
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      setState((prev) => {
        let nextStable = prev.stableText;
        const keptSegments: InternalSegment[] = [];
        let coalesced = false;

        for (const seg of prev.segments) {
          if (now - seg.createdAt >= segmentTTL) {
            nextStable += seg.text;
            coalesced = true;
          } else {
            keptSegments.push(seg);
          }
        }

        if (!sourceText.startsWith(prev.revealedSource)) {
          return { stableText: "", segments: [], revealedSource: "" };
        }

        const unrevealedSlice = sourceText.slice(prev.revealedSource.length);
        if (unrevealedSlice.length === 0) {
          if (!coalesced) return prev;
          return {
            stableText: nextStable,
            segments: keptSegments,
            revealedSource: prev.revealedSource,
          };
        }

        const codePoints = Array.from(unrevealedSlice);
        const step =
          charsPerTick !== undefined
            ? Math.max(1, charsPerTick)
            : Math.min(28, Math.max(2, Math.ceil(codePoints.length / 6)));
        const chunk = codePoints.slice(0, step).join("");
        const nextRevealed = prev.revealedSource + chunk;
        const id = seqRef.current++;

        return {
          stableText: nextStable,
          segments: [...keptSegments, { id, text: chunk, createdAt: now }],
          revealedSource: nextRevealed,
        };
      });
    }, Math.max(8, intervalMs));

    return () => clearInterval(timer);
  }, [
    bypass,
    charsPerTick,
    hasActiveSegments,
    hasUnrevealed,
    intervalMs,
    segmentTTL,
    sourceText,
    streaming,
  ]);

  const displayedText = bypass ? sourceText : state.revealedSource;
  const pendingLength = bypass
    ? 0
    : Math.max(0, Array.from(sourceText.slice(state.revealedSource.length)).length);

  return {
    displayedText,
    stableText: bypass ? sourceText : state.stableText,
    segments: bypass ? [] : state.segments.map(({ id, text }) => ({ id, text })),
    isRevealing: hasUnrevealed,
    pendingLength,
    flush,
    reset,
  };
}
