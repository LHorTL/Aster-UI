import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";
import { AfSrOnly, cn, useReducedMotion } from "../../primitives";

export interface AfTextRevealProps extends HTMLAttributes<HTMLElement> {
  /** 要逐词/逐字揭示的文本。 */
  text?: string;
  /** 切分粒度（默认 `"word"`；英文按整词、中文自动按自然双字词组切分且标点紧随前词防孤行）。 */
  by?: "word" | "char";
  /** 相邻片段错峰间隔（毫秒，默认 40）。 */
  stagger?: number;
  /** 起始延迟（毫秒，默认 0）。 */
  delay?: number;
  /** 单个片段动画时长（毫秒，默认 700）。 */
  duration?: number;
  /** 渲染标签（默认 `"p"`）。 */
  as?: "p" | "h1" | "h2" | "h3" | "span";
  /** 是否仅在首次进入视口时播放一次（默认 `true`；设为 `false` 时离开视口重置、再次进入重播）。 */
  once?: boolean;
}

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/;
const TRAILING_PUNCT_RE = /^[、，。！？；：,.!?;:）》」』】"'’”]+$/;

/**
 * 兼容精简 ICU（无中文词典的 Headless Chromium）的精细分词器：
 * 1. `by === "char"` 时按 Unicode 码点逐字切分，空白符保持原样；
 * 2. `by === "word"` 时优先使用 `Intl.Segmenter`，并对超过 2 字的连续汉字块按双字词组二次切分，
 *    同时将行尾标点合并到前一个词块上，避免断行孤标点与整句黏连。
 */
function splitPieces(text: string, by: "word" | "char"): string[] {
  if (!text) return [];
  if (by === "char") return Array.from(text);

  const SegmenterCtor = (
    Intl as unknown as {
      Segmenter?: new (locale?: string, options?: { granularity: "word" }) => {
        segment: (input: string) => Iterable<{ segment: string }>;
      };
    }
  ).Segmenter;

  const rawSegments = SegmenterCtor
    ? [...new SegmenterCtor(undefined, { granularity: "word" }).segment(text)].map((item) => item.segment)
    : text.split(/(\s+)/).filter(Boolean);

  const refined: string[] = [];
  for (const seg of rawSegments) {
    if (!seg) continue;
    if (/^\s+$/.test(seg)) {
      refined.push(seg);
      continue;
    }
    const chars = Array.from(seg);
    if (CJK_RE.test(seg) && chars.length > 2) {
      // 无词典 ICU 会将整句汉字归为单段：按 2 字词组切分，末尾若剩 1 字且超过 3 字则并入末组保持韵律自然
      let idx = 0;
      while (idx < chars.length) {
        const remaining = chars.length - idx;
        if (remaining === 3) {
          refined.push(chars.slice(idx, idx + 2).join(""));
          refined.push(chars.slice(idx + 2, idx + 3).join(""));
          break;
        }
        const step = remaining >= 2 ? 2 : 1;
        refined.push(chars.slice(idx, idx + step).join(""));
        idx += step;
      }
    } else {
      refined.push(seg);
    }
  }

  // 将紧跟在词后的标点并入前词，防止标点单独落在下一行行首
  const merged: string[] = [];
  for (const token of refined) {
    if (
      TRAILING_PUNCT_RE.test(token) &&
      merged.length > 0 &&
      !/^\s+$/.test(merged[merged.length - 1])
    ) {
      merged[merged.length - 1] += token;
    } else {
      merged.push(token);
    }
  }
  return merged;
}

/**
 * Text Reveal：文字按词或字从轻微模糊中依次上浮（30% 进入视口触发），
 * 屏幕阅读器直接读取隐藏的完整句子，空白节点保持真实文本以遵循原生折行。
 */
export function AfTextReveal(props: AfTextRevealProps = {}) {
  const {
    text: textProp,
    by = "word",
    stagger = 40,
    delay = 0,
    duration = 700,
    as = "p",
    once = true,
    className,
    style,
    children,
    ...rest
  } = props;

  const text = textProp ?? (typeof children === "string" ? children : "");
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const rect = node.getBoundingClientRect();
    if (once && rect.top < window.innerHeight && rect.bottom > 0) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  const pieces = useMemo(() => splitPieces(text, by), [text, by]);
  let visibleIdx = 0;

  return createElement(
    as,
    {
      ...rest,
      ref: rootRef,
      className: cn("af-mo-reveal", className),
      style,
      "data-play": inView && !reduced ? "" : undefined,
      "aria-label": rest["aria-label"] ?? (text || undefined),
    },
    createElement(AfSrOnly, null, text),
    pieces.map((piece, index) => {
      if (/^\s+$/.test(piece)) {
        return piece;
      }
      const order = visibleIdx++;
      return createElement(
        "span",
        {
          key: `piece-${index}`,
          className: "af-mo-reveal__piece",
          "aria-hidden": true,
          style: {
            animationDelay: `${delay + order * stagger}ms`,
            animationDuration: `${duration}ms`,
          },
        },
        piece,
      );
    }),
  );
}
