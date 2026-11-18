import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import {
  AgbBrandLogo,
  CONTEXT_CELLS,
  CONTEXT_COLS,
  CONTEXT_INITIAL,
  CONTEXT_LIMIT,
  CONTEXT_ROWS,
  Collapse,
  CompactArrowsIcon,
  ContextPartKey,
  GlyphButton,
  formatTokens,
  useTweenNumber,
} from "../_shared/agents-b";

export type { ContextPartKey };
export type ContextPartItem = (typeof CONTEXT_INITIAL)[number];

export interface AfContextWindowPatternProps {
  /** Card header title. */
  title?: ReactNode;
  /** Model badge string. */
  model?: string;
  /** Context window token limit. */
  limitTokens?: number;
  /** Initial breakdown parts. */
  initialParts?: ContextPartItem[];
  /** Compact completion callback. */
  onCompress?: () => void;
  /** Show external hint caption below card, default `false`. */
  showHint?: boolean;
  /** Extra class name. */
  className?: string;
  /** Inline style. */
  style?: CSSProperties;
}

function ContextWindowDemo({
  title = "Context window",
  model = "claude-sonnet-5-5",
  limitTokens = CONTEXT_LIMIT,
  initialParts = CONTEXT_INITIAL,
  onCompress,
  showHint = false,
  className,
  style,
}: AfContextWindowPatternProps = {}) {
  const [parts, setParts] = useState(initialParts);
  const [focus, setFocus] = useState<ContextPartKey | null>(null);
  const [filesOpen, setFilesOpen] = useState(false);
  const [compress, setCompress] = useState<"idle" | "compacting" | "done">("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const compressTimer = useRef<number | null>(null);

  const used = parts.reduce((sum, part) => sum + part.tokens, 0);
  const percent = Math.round((used / limitTokens) * 100);
  const focusedPart = parts.find((part) => part.key === focus) ?? null;
  const shown = useTweenNumber(focusedPart ? focusedPart.tokens : used, 420);
  const available = Math.max(0, limitTokens - used);

  const rows = useMemo(() => {
    const perCell = limitTokens / CONTEXT_CELLS;
    const flat: (ContextPartKey | null)[] = [];
    for (const part of parts) {
      if (part.tokens <= 0) continue;
      const count = Math.max(1, Math.round(part.tokens / perCell));
      for (let index = 0; index < count && flat.length < CONTEXT_CELLS; index += 1) {
        flat.push(part.key);
      }
    }
    while (flat.length < CONTEXT_CELLS) flat.push(null);

    const matrix: (ContextPartKey | null)[][] = [];
    for (let r = 0; r < CONTEXT_ROWS; r += 1) {
      matrix.push(flat.slice(r * CONTEXT_COLS, (r + 1) * CONTEXT_COLS));
    }
    return matrix;
  }, [parts, limitTokens]);

  const startCompress = () => {
    if (compress !== "idle") return;
    setCompress("compacting");
    setFilesOpen(false);
    compressTimer.current = window.setTimeout(() => {
      setParts((list) =>
        list.map((part) => (part.key === "conversation" ? { ...part, tokens: 18_400 } : part)),
      );
      setCompress("done");
      onCompress?.();
    }, 1250);
  };

  useEffect(
    () => () => {
      if (compressTimer.current) window.clearTimeout(compressTimer.current);
    },
    [],
  );

  const removeFile = (name: string) => {
    setParts((list) =>
      list.map((part) => {
        if (part.key !== "files" || !part.files) return part;
        const target = part.files.find((file) => file.name === name);
        if (!target) return part;
        return {
          ...part,
          tokens: Math.max(0, part.tokens - target.tokens),
          files: part.files.filter((file) => file.name !== name),
        };
      }),
    );
  };

  const resetChat = () => {
    setParts(initialParts);
    setCompress("idle");
    setFilesOpen(false);
    setNotice("Started a fresh chat window");
    window.setTimeout(() => setNotice(null), 1800);
  };

  const statusText =
    compress === "compacting"
      ? "Compacting conversation…"
      : compress === "done"
        ? `Saved ${formatTokens(108_600 - 18_400)} · ${formatTokens(available)} left`
        : focusedPart
          ? `${focusedPart.label} · ${Math.round((focusedPart.tokens / limitTokens) * 100)}% of window`
          : `${formatTokens(available)} left`;

  const filesList = parts.find((part) => part.key === "files")?.files ?? [];

  return (
    <div className={cn("af-agb-ctx", className)} style={style}>
      <header className="af-agb-ctx__head">
        <span className="af-agb-ctx__title">{title}</span>
        <span className="af-agb-ctx__model">
          <AgbBrandLogo brand="claude" size={12} />
          <span>{model}</span>
        </span>
      </header>

      <div className="af-agb-ctx__figure">
        <strong className="af-agb-ctx__big">{formatTokens(shown)}</strong>
        <span className="af-agb-ctx__of">
          of {Number.isInteger(limitTokens / 1000) ? `${limitTokens / 1000}k` : formatTokens(limitTokens).toLowerCase()} tokens
        </span>
        <span
          className="af-agb-ctx__pct"
          data-tone={percent >= 90 ? "danger" : percent >= 75 ? "warning" : "neutral"}
        >
          {focusedPart ? `${Math.round((focusedPart.tokens / limitTokens) * 100)}%` : `${percent}%`}
        </span>
      </div>

      <div
        className="af-agb-ctx__field"
        role="img"
        aria-label={`${percent}% of context window used across system prompt, tools, files, conversation, and memory`}
      >
        {rows.map((row, rowIdx) => (
          <div className="af-agb-ctx__wafflerow" key={rowIdx}>
            {row.map((part, colIdx) => {
              const flatIndex = rowIdx * CONTEXT_COLS + colIdx;
              return (
                <span
                  key={colIdx}
                  className="af-agb-ctx__cell"
                  data-part={part ?? undefined}
                  data-dim={(focus !== null && part !== focus) || undefined}
                  data-wave={(compress === "compacting" && part === "conversation") || undefined}
                  style={{
                    transitionDelay: `${(flatIndex % 36) * 4}ms`,
                    animationDelay: `${(flatIndex % 36) * 22}ms`,
                  }}
                  onPointerEnter={() => setFocus(part)}
                  onPointerLeave={() => setFocus(null)}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="af-agb-ctx__parts">
        {parts.map((part) => {
          const isFiles = part.key === "files";
          const isConv = part.key === "conversation";
          return (
            <div key={part.key} className="af-agb-ctx__partwrap">
              <div
                className="af-agb-ctx__part"
                data-active={focus === part.key || undefined}
                onPointerEnter={() => setFocus(part.key)}
                onPointerLeave={() => setFocus(null)}
              >
                <button
                  type="button"
                  className="af-agb-ctx__partmain"
                  data-static={!isFiles || undefined}
                  tabIndex={isFiles ? 0 : -1}
                  onFocus={() => setFocus(part.key)}
                  onBlur={() => setFocus(null)}
                  onClick={() => isFiles && setFilesOpen((value) => !value)}
                  aria-expanded={isFiles ? filesOpen : undefined}
                >
                  <i className="af-agb-ctx__swatch" data-part={part.key} aria-hidden />
                  <span className="af-agb-ctx__partlabel">{part.label}</span>
                  {isFiles && filesList.length > 0 ? (
                    <AfIcon
                      name="chevronDown"
                      size={12}
                      className={filesOpen ? "af-agb-ctx__chev--open" : "af-agb-ctx__chev"}
                    />
                  ) : null}
                </button>

                {isConv ? (
                  <button
                    type="button"
                    className="af-agb-ctx__compact"
                    disabled={compress !== "idle"}
                    onClick={startCompress}
                  >
                    <CompactArrowsIcon size={12} />
                    <span>
                      {compress === "done"
                        ? "Compacted"
                        : compress === "compacting"
                          ? "Compacting…"
                          : "Compact"}
                    </span>
                  </button>
                ) : null}

                <span className="af-agb-ctx__partvalue">{formatTokens(part.tokens)}</span>
              </div>

              {isFiles ? (
                <Collapse open={filesOpen && filesList.length > 0}>
                  <ul className="af-agb-ctx__files">
                    {filesList.map((file) => (
                      <li key={file.name}>
                        <span className="af-agb-ctx__filename">{file.name}</span>
                        <span className="af-agb-ctx__filesize">{formatTokens(file.tokens)}</span>
                        <GlyphButton
                          icon="x"
                          label={`Remove ${file.name}`}
                          onClick={() => removeFile(file.name)}
                        />
                      </li>
                    ))}
                  </ul>
                </Collapse>
              ) : null}
            </div>
          );
        })}
      </div>

      <footer className="af-agb-ctx__foot">
        <span
          className="af-agb-ctx__caption"
          data-tone={compress === "done" ? "success" : percent >= 80 && !focusedPart ? "warning" : undefined}
          role="status"
          aria-live="polite"
        >
          {notice ?? statusText}
        </span>
        <button type="button" className="af-agb-ctx__newchat" onClick={resetChat}>
          <span>New chat</span>
          <span aria-hidden>→</span>
        </button>
      </footer>

      {showHint ? (
        <p className="af-agb-ctx__hint">
          Hover any row or cell to isolate its token share; click Compact to summarize conversation history.
        </p>
      ) : null}
    </div>
  );
}

export { ContextWindowDemo as AfContextWindowPattern, ContextWindowDemo as AfContextWindow };
export type { AfContextWindowPatternProps as AfContextWindowProps };
