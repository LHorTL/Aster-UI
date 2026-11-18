import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AfExpand, AfIcon, AfTooltip } from "../../ui";
import { AfSwap } from "../../ui-pro";
import { cn } from "../../primitives";
import {
  type CitedAnswerProps,
  type CitedSegment,
  type CitedSource,
  copyText,
  renderQuote,
  useTransient,
} from "../_shared/chat";

const DEFAULT_CITED_SOURCES: CitedSource[] = [
  {
    id: "caching",
    site: "Tokenwise",
    title: "Prompt caching, explained: what gets stored and for how long",
    date: "Sep 18",
    quote:
      "The provider reuses the processed KV prefix of your prompt, cutting time to first token by up to 80% on prompts over 10K tokens and billing cached reads at a fraction of base input rates.",
    highlight: ["time to first token by up to 80%", "prompts over 10K tokens"],
    tone: "gray",
  },
  {
    id: "prompts",
    site: "Latency Notes",
    title: "Designing cache-friendly prompts",
    date: "Oct 4",
    quote:
      "Cache hits require an exact prefix match, so place static system instructions, tool schemas, and long reference documents ahead of anything that changes per request.",
    highlight: ["exact prefix match", "changes per request"],
    tone: "green",
  },
  {
    id: "semantic",
    site: "Inference Weekly",
    title: "Semantic caching for LLM apps in production",
    date: "Oct 19",
    quote:
      "A semantic vector cache ahead of the model serves close query matches in roughly 40 ms and absorbed nearly a third of FAQ-style production traffic.",
    highlight: ["40 ms", "third of FAQ-style"],
    tone: "green",
  },
];

const DEFAULT_CITED_SEGMENTS: CitedSegment[] = [
  {
    text: "The biggest win is prompt caching: the provider reuses the processed start of your prompt, so a long system prompt isn't recomputed on every call.",
    cite: ["caching"],
    paragraph: true,
  },
  {
    text: " On prompts over 10K tokens that can cut time to first token by up to 80%.",
    cite: ["caching"],
  },
  {
    text: " It only works while that start stays identical, so put the system prompt, tools and long documents first and anything that changes per request last.",
    cite: ["prompts", "caching"],
  },
  {
    text: "For repeated questions, add a semantic cache in front of the model: close matches get a stored answer in about 40 ms,",
    cite: ["semantic"],
    paragraph: true,
  },
  {
    text: " which covered nearly a third of FAQ-style traffic in one production setup.",
    cite: ["semantic"],
  },
  {
    text: " Stream the rest, so people see the first words while the answer is still being written.",
  },
];

/**
 * Cited Answer: single card with stacked source glyphs + cited prose + source chips +
 * expandable source quote preview + top-hairline footer with sentence count and Follow up action.
 */
function CitedAnswer({
  segments = DEFAULT_CITED_SEGMENTS,
  sources = DEFAULT_CITED_SOURCES,
  pagesRead = 12,
  defaultOpen = null,
  onPreviewChange,
  onOpenSource,
  onCopyQuote,
  action,
  className,
}: CitedAnswerProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(defaultOpen);
  const [copied, setCopied] = useTransient(1600);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const onPreviewChangeRef = useRef(onPreviewChange);
  onPreviewChangeRef.current = onPreviewChange;

  const activeId = hoverId ?? openId;
  const openSource = sources.find((source) => source.id === openId) ?? null;
  const activeSource = sources.find((source) => source.id === activeId) ?? null;

  const updateOpen = (next: string | null) => {
    setOpenId(next);
    onPreviewChangeRef.current?.(next);
  };

  useEffect(() => {
    if (!openId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const id = openId;
        updateOpen(null);
        chipRefs.current.get(id)?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId]);

  const onChipKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    let next = index;
    if (step) next = (index + step + sources.length) % sources.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = sources.length - 1;
    else return;
    event.preventDefault();
    chipRefs.current.get(sources[next].id)?.focus();
  };

  const handleCopyQuote = (source: CitedSource) => {
    const formatted = `${source.quote}\n— ${source.site} · ${source.title}`;
    copyText(formatted);
    onCopyQuote?.(formatted, source);
    setCopied(true);
  };

  const citedCount = segments.filter((segment) => segment.cite?.length).length;
  const paragraphs: CitedSegment[][] = [];
  for (const segment of segments) {
    if (segment.paragraph || paragraphs.length === 0) paragraphs.push([]);
    paragraphs[paragraphs.length - 1].push(segment);
  }

  const citingTextForOpen = openSource
    ? segments
        .filter((seg) => seg.cite?.includes(openSource.id))
        .map((seg) => seg.text)
        .join(" ")
    : "";

  const captionKey = copied ? "copied" : activeSource ? `src:${activeSource.id}` : "idle";

  return (
    <article className={cn("af-ch-cited", className)} role="group" aria-label="Answer with sources">
      <div className="af-ch-cited__card">
        <header className="af-ch-cited__head">
          <span className="af-ch-cited__stack" aria-hidden>
            {sources.slice(0, 3).map((source) => (
              <span key={source.id} className="af-ch-cited__glyph" data-tone={source.tone}>
                {source.site.slice(0, 1)}
              </span>
            ))}
          </span>
          <span className="af-ch-cited__meta">
            <span>{sources.length} sources</span>
            <span>
              <span className="af-ch-cited__dot"> · </span>
              {pagesRead} pages read
            </span>
          </span>
        </header>

        <div className="af-ch-cited__body" data-dim={activeId ? "" : undefined}>
          {paragraphs.map((group, groupIndex) => (
            <p className="af-ch-cited__text" key={groupIndex}>
              {group.map((segment, index) => {
                const lit = Boolean(activeId && segment.cite?.includes(activeId));
                return (
                  <span key={index} className="af-ch-cited__seg">
                    <span className="af-ch-cited__sentence" data-lit={lit || undefined}>
                      {segment.text}
                    </span>
                    {segment.cite?.map((id) => {
                      const sourceIndex = sources.findIndex((source) => source.id === id);
                      if (sourceIndex < 0) return null;
                      const isMarkerLit = activeId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          className="af-ch-cited__marker"
                          data-lit={isMarkerLit || undefined}
                          data-open={openId === id || undefined}
                          aria-label={`Source ${sourceIndex + 1}: ${sources[sourceIndex].site} – ${sources[sourceIndex].title}`}
                          aria-expanded={openId === id}
                          onClick={() => updateOpen(openId === id ? null : id)}
                          onPointerEnter={() => setHoverId(id)}
                          onPointerLeave={() => setHoverId(null)}
                          onFocus={() => setHoverId(id)}
                          onBlur={() => setHoverId(null)}
                        >
                          {sourceIndex + 1}
                        </button>
                      );
                    })}
                  </span>
                );
              })}
            </p>
          ))}
        </div>

        <div className="af-ch-cited__chips" aria-label="Sources" data-dim={activeId ? "" : undefined}>
          {sources.map((source, index) => (
            <button
              key={source.id}
              ref={(node) => {
                if (node) chipRefs.current.set(source.id, node);
                else chipRefs.current.delete(source.id);
              }}
              type="button"
              className="af-ch-cited__chip"
              data-lit={activeId === source.id || undefined}
              data-open={openId === source.id || undefined}
              aria-label={`Source ${index + 1}: ${source.site} – ${source.title}`}
              aria-expanded={openId === source.id}
              onPointerEnter={() => setHoverId(source.id)}
              onPointerLeave={() => setHoverId(null)}
              onFocus={() => setHoverId(source.id)}
              onBlur={() => setHoverId(null)}
              onClick={() => updateOpen(openId === source.id ? null : source.id)}
              onKeyDown={(event) => onChipKeyDown(event, index)}
            >
              <span className="af-ch-cited__chipglyph" data-tone={source.tone} aria-hidden>
                {source.site.slice(0, 1)}
              </span>
              <span className="af-ch-cited__chipname">{source.site}</span>
              <span className="af-ch-cited__chipnum">{index + 1}</span>
            </button>
          ))}
        </div>

        <AfExpand open={Boolean(openSource)}>
          <div className="af-ch-cited__preview" aria-label="Source preview">
            {openSource ? (
              <AfSwap swapKey={openSource.id} className="af-ch-cited__previewswap">
                <div className="af-ch-cited__previewinner">
                  <div className="af-ch-cited__previewhead">
                    <span className="af-ch-cited__previewglyph" data-tone={openSource.tone} aria-hidden>
                      {openSource.site.slice(0, 1)}
                    </span>
                    <span className="af-ch-cited__previewsite">
                      <strong>{openSource.site}</strong>
                      {openSource.date ? <em>{openSource.date}</em> : null}
                    </span>
                    <span className="af-ch-cited__previewtools">
                      <AfTooltip label={copied ? "Copied" : "Copy quote"}>
                        <button
                          type="button"
                          className="af-ch-cited__previewbtn"
                          aria-label={copied ? "Copied" : "Copy quote"}
                          onClick={() => handleCopyQuote(openSource)}
                        >
                          <AfIcon name={copied ? "check" : "copy"} size={13} />
                        </button>
                      </AfTooltip>
                      {openSource.url || onOpenSource ? (
                        <button
                          type="button"
                          className="af-ch-cited__openlink"
                          onClick={() => {
                            onOpenSource?.(openSource);
                            if (openSource.url && typeof window !== "undefined") {
                              window.open(openSource.url, "_blank", "noopener,noreferrer");
                            }
                          }}
                        >
                          Open source
                          <AfIcon name="arrowUpRight" size={12} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="af-ch-cited__previewbtn"
                        aria-label="Close preview"
                        onClick={() => updateOpen(null)}
                      >
                        <AfIcon name="x" size={13} />
                      </button>
                    </span>
                  </div>
                  <p className="af-ch-cited__quote">
                    {renderQuote(openSource.quote, openSource.highlight, citingTextForOpen)}
                  </p>
                </div>
              </AfSwap>
            ) : null}
          </div>
        </AfExpand>
      </div>

      <footer className="af-ch-cited__foot">
        <AfSwap swapKey={captionKey} className="af-ch-cited__captionswap">
          <span className="af-ch-cited__caption" data-copied={copied || undefined}>
            {copied ? (
              "Quote copied to clipboard"
            ) : activeSource ? (
              `${activeSource.site} · ${activeSource.title}`
            ) : (
              <>
                <b>{citedCount}</b> of {segments.length} sentences backed by a source
              </>
            )}
          </span>
        </AfSwap>
        {action ?? (
          <button
            type="button"
            className="af-ch-cited__actionbtn"
            onClick={() => {
              const target = activeSource ?? sources[0];
              if (target) updateOpen(openId === target.id ? null : target.id);
            }}
          >
            <span>Follow up</span>
            <AfIcon name="arrowRight" size={13} />
          </button>
        )}
      </footer>
    </article>
  );
}

export { CitedAnswer as AfCitedAnswer };
