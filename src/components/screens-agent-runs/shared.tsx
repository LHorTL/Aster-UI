import { useEffect, useRef, useState, type ReactNode } from "react";
import { AfIcon } from "../../icons";

/** 确定性对称 3×3 像素 Agent 印记（运行态轻微闪烁，reduced-motion 自动静止）。 */
export function AgentPixelMark({
  name,
  color = "#0190fe",
  running = false,
}: {
  name: string;
  color?: string;
  running?: boolean;
}) {
  let seed = 0;
  for (let i = 0; i < name.length; i++) seed = (seed * 31 + name.charCodeAt(i)) | 0;
  const c0 = Boolean(seed & 1) || !(seed & 6);
  const c1 = Boolean(seed & 2) || true;
  const c3 = Boolean(seed & 4) || Boolean(seed & 32);
  const c6 = Boolean(seed & 8) || !(seed & 24);
  const c7 = Boolean(seed & 16);
  const cells = [c0, c1, c0, c3, true, c3, c6, c7, c6];

  return (
    <span className="af-sar-mark" data-running={running || undefined} aria-hidden="true" style={{ color }}>
      <svg width="12" height="12" viewBox="0 0 9 9" fill="currentColor">
        {cells.map((on, idx) =>
          on ? (
            <rect
              key={idx}
              x={(idx % 3) * 3.1}
              y={Math.floor(idx / 3) * 3.1}
              width="2.4"
              height="2.4"
              rx="0.55"
            />
          ) : null,
        )}
      </svg>
    </span>
  );
}

/** 步骤环形进度图标（用于 Inbox 与 Agent Tasks 状态指示；完成态渲染实心蓝底勾号）。 */
export function StepProgressRing({
  done,
  total,
  tone = "amber",
  size = 14,
}: {
  done: number;
  total: number;
  tone?: "amber" | "blue" | "green" | "muted";
  size?: number;
}) {
  if (total > 0 && done >= total) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
        style={{ display: "block", flex: "none" }}
      >
        <circle cx="7" cy="7" r="6" fill="#3b82f6" />
        <path
          d="M4.4 7.15L6.15 8.85L9.65 5.25"
          stroke="#ffffff"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const r = 5.2;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.max(0.16, Math.min(1, done / total)) : 0.25;
  const strokeColor =
    tone === "amber"
      ? "var(--sar-amber)"
      : tone === "green"
        ? "var(--sar-teal)"
        : tone === "blue"
          ? "var(--sar-blue)"
          : "var(--as-muted)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flex: "none" }}
    >
      <circle cx="7" cy="7" r={r} stroke="currentColor" strokeOpacity="0.16" strokeWidth="1.75" />
      <circle
        cx="7"
        cy="7"
        r={r}
        stroke={strokeColor}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeDasharray={`${ratio * c} ${c}`}
        transform="rotate(-90 7 7)"
      />
      <circle cx="7" cy="7" r="1.45" fill={strokeColor} fillOpacity="0.85" />
    </svg>
  );
}

/** 矢量扳手工具图标（替代未注册的 wrench fallback 齿轮）。 */
export function WrenchIconSvg({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block", flex: "none" }}
    >
      <path d="M10.1 2.5a3.7 3.7 0 0 0-3.45 4.98L2.55 11.6a1.45 1.45 0 0 0 2.05 2.05l4.12-4.1a3.7 3.7 0 0 0 4.98-3.45l-2.18 2.18-1.8-.42-.42-1.8 2.18-2.18a3.66 3.66 0 0 0-1.38-.38Z" />
    </svg>
  );
}

/** 模型供应商徽标（Anthropic / Gemini / OpenAI）。 */
export function ProviderMarkSvg({ model, maker }: { model: string; maker?: string }) {
  const lower = `${maker ?? ""} ${model}`.toLowerCase();
  if (lower.includes("gemini") || lower.includes("google")) {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: "none" }}>
        <path
          d="M8 1.2C8.35 4.85 11.15 7.65 14.8 8C11.15 8.35 8.35 11.15 8 14.8C7.65 11.15 4.85 8.35 1.2 8C4.85 7.65 7.65 4.85 8 1.2Z"
          fill="#4F86F7"
        />
      </svg>
    );
  }
  if (lower.includes("gpt") || lower.includes("openai")) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        aria-hidden="true"
        style={{ flex: "none", opacity: 0.85 }}
      >
        <circle cx="8" cy="8" r="2.4" />
        <circle cx="8" cy="4.4" r="2.3" />
        <circle cx="11.1" cy="6.2" r="2.3" />
        <circle cx="11.1" cy="9.8" r="2.3" />
        <circle cx="8" cy="11.6" r="2.3" />
        <circle cx="4.9" cy="9.8" r="2.3" />
        <circle cx="4.9" cy="6.2" r="2.3" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: "none" }}>
      <path
        d="M8 1.6V14.4M2.46 4.8L13.54 11.2M13.54 4.8L2.46 11.2M5.1 2.1L10.9 13.9M10.9 2.1L5.1 13.9"
        stroke="#D97757"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** GitHub 与 Postgres 紧凑工具徽标（用于 Agent Run Detail）。 */
export function ToolAppBadge({ app }: { app?: string }) {
  const key = (app ?? "").toLowerCase();
  if (key.includes("pg") || key.includes("postgres")) {
    return (
      <span className="af-sar-pg-badge" aria-hidden="true">
        P
      </span>
    );
  }
  if (key.includes("gh") || key.includes("git")) {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ flex: "none" }}>
        <path d="M8 0.8a7.2 7.2 0 0 0-2.28 14.03c.36.07.49-.15.49-.35v-1.23c-2 .43-2.42-.96-2.42-.96-.33-.83-.8-1.05-.8-1.05-.65-.45.05-.44.05-.44.72.05 1.1.74 1.1.74.64 1.1 1.68.78 2.09.6.06-.47.25-.78.45-.96-1.6-.18-3.28-.8-3.28-3.56 0-.79.28-1.43.74-1.94-.07-.18-.32-.91.07-1.9 0 0 .6-.19 1.98.74a6.86 6.86 0 0 1 3.6 0c1.38-.93 1.98-.74 1.98-.74.39.99.14 1.72.07 1.9.46.51.74 1.15.74 1.94 0 2.77-1.68 3.38-3.29 3.56.26.22.49.66.49 1.34v1.98c0 .2.13.42.5.35A7.2 7.2 0 0 0 8 0.8Z" />
      </svg>
    );
  }
  return <WrenchIconSvg size={12} />;
}

async function copyTextSafe(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }
  if (typeof document === "undefined" || !document.body) return false;
  let textarea: HTMLTextAreaElement | null = null;
  try {
    textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return Boolean(document.execCommand?.("copy"));
  } catch {
    return false;
  } finally {
    if (textarea?.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
  }
}

/** 一键复制按钮（点击后切换为绿色勾号 1.4 秒）。 */
export function CopyButtonInline({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      className="af-sar-copy-btn"
      aria-label={copied ? "Copied" : label}
      onClick={() => {
        void copyTextSafe(text).then((ok) => {
          if (!ok || !mountedRef.current) return;
          if (timerRef.current !== null) window.clearTimeout(timerRef.current);
          setCopied(true);
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            if (mountedRef.current) setCopied(false);
          }, 1400);
        });
      }}
    >
      <AfIcon name={copied ? "check" : "copy"} size={11} />
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function formatDurationSec(sec?: number): string {
  if (sec === undefined || Number.isNaN(sec)) return "–";
  if (sec < 60) {
    if (Number.isInteger(sec)) return `${sec}s`;
    return `${sec.toFixed(1)}s`;
  }
  const mins = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  if (mins < 60) return rem === 0 ? `${mins}m` : `${mins}m ${String(rem).padStart(2, "0")}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${String(mins % 60).padStart(2, "0")}m`;
}

export function formatTokensCompact(count?: number): string {
  if (count === undefined) return "–";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString("en-US");
}

export type AfScreenArtifactPayload = {
  updated?: string;
  doc?: { title: string; paragraphs?: string[]; bullets?: string[]; html?: string };
  table?: string[][];
  sheet?: { widths?: number[]; styles?: Record<string, { bold?: boolean; format?: string }> };
  code?: string;
  files?: (string | { name: string; size?: number; modified?: string; kind?: string })[];
  preview?: ReactNode;
};

export const DEFAULT_NORTHWIND_ARTIFACTS: Record<string, AfScreenArtifactPayload> = {
  "ingest-design.md": {
    updated: "Edited 4m ago",
    doc: {
      title: "Northwind Event Ingest — Design",
      paragraphs: [
        "Northwind's checkout and fulfillment webhooks burst up to 20,000 events per minute during flash promotions.",
        "The ingest service validates signatures at the edge, writes raw envelopes to a durable 24-hour log, and fans out idempotent workers.",
      ],
      bullets: [
        "At-least-once delivery with consumer-side deduplication key",
        "24-hour replay window from arbitrary timestamp offset",
        "Dead-letter topic after 5 exponential backoff attempts",
      ],
    },
  },
  "load-test-results.csv": {
    table: [
      ["Option", "Burst / min", "p99 write", "24h replay", "Monthly est."],
      ["Kafka (MSK)", "35,000", "14ms", "Built-in", "$310"],
      ["SQS FIFO", "18,000", "29ms", "Archive needed", "$145"],
      ["Postgres SKIP LOCKED", "6,400", "88ms", "Manual table", "$0"],
    ],
  },
  "event-schema.json": {
    code: `{\n  "version": "2026-11",\n  "type": "order.updated",\n  "idempotencyKey": "evt_01J9Z8K2",\n  "occurredAt": "2026-11-03T09:14:22Z",\n  "payload": {\n    "orderId": "ord_88412",\n    "tenant": "northwind"\n  }\n}`,
  },
  staging: {
    files: [
      { name: "docker-compose.staging.yml", size: 4200, modified: "12m ago" },
      { name: "ingest-worker.go", size: 14800, modified: "8m ago" },
      { name: "k6-burst-20k.js", size: 3100, modified: "19m ago" },
    ],
  },
};

/** 共享产物查看器（供 AgentTasks 与 Inbox 右侧多标签工作区复用）。 */
export function SharedArtifactPane({
  name,
  artifact,
  onDocChange,
}: {
  name: string;
  artifact?: AfScreenArtifactPayload;
  onDocChange?: (nextText: string) => void;
}) {
  const resolved = artifact ?? DEFAULT_NORTHWIND_ARTIFACTS[name];
  const [docBody, setDocBody] = useState(() => {
    if (resolved?.doc?.html) return resolved.doc.html;
    const paras = resolved?.doc?.paragraphs?.join("\n\n") ?? "";
    const bullets = resolved?.doc?.bullets?.map((b) => `- ${b}`).join("\n") ?? "";
    return [paras, bullets].filter(Boolean).join("\n\n");
  });

  if (!resolved) {
    return (
      <div className="af-asf__doc">
        <h3>{name}</h3>
        <p>Generated during the active task run.</p>
      </div>
    );
  }

  if (resolved.preview) return <div className="af-asf__viewer">{resolved.preview}</div>;

  if (resolved.table) {
    const [head, ...rows] = resolved.table;
    return (
      <div className="af-asf__viewer">
        <div className="af-asf__viewer-meta">
          <span>
            {rows.length} rows · {head?.length ?? 0} cols
          </span>
          <span className="af-asf__kbd">CSV</span>
        </div>
        <div className="af-asf__sheet-wrap">
          <table className="af-asf__sheet" role="grid" aria-label={name}>
            {head ? (
              <thead>
                <tr>
                  <th style={{ width: 28 }}>#</th>
                  {head.map((col, idx) => (
                    <th key={idx}>{col}</th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {rows.map((r, rIdx) => (
                <tr key={rIdx}>
                  <td>{rIdx + 1}</td>
                  {r.map((cell, cIdx) => (
                    <td key={cIdx} data-num={/^[0-9$%=+-]/.test(cell) ? "" : undefined}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (resolved.code) {
    return (
      <div className="af-asf__viewer">
        <div className="af-asf__viewer-meta">
          <span>{name}</span>
          <CopyButtonInline text={resolved.code} label={`Copy ${name}`} />
        </div>
        <pre className="af-asf__code">{resolved.code}</pre>
      </div>
    );
  }

  if (resolved.files) {
    return (
      <div className="af-asf__viewer">
        <div className="af-asf__viewer-meta">
          <span>{resolved.files.length} items</span>
          <span className="af-asf__kbd">FOLDER</span>
        </div>
        <div className="af-asf__newtab" role="listbox" aria-label={name}>
          {resolved.files.map((entry, idx) => {
            const label = typeof entry === "string" ? entry : entry.name;
            const meta =
              typeof entry === "string"
                ? label.includes(".")
                  ? "File"
                  : "Folder"
                : entry.modified ?? (entry.size ? `${Math.round(entry.size / 1024)} KB` : "Folder");
            return (
              <div key={`${label}-${idx}`} role="option" aria-selected={idx === 0} className="af-asf__nt-item">
                <span className="af-asf__nt-left">
                  <span className="af-asf__nt-mark">
                    <AfIcon name={label.includes(".") ? "file" : "folder"} size={12} />
                  </span>
                  <span className="af-asf__nt-text">
                    <strong>{label}</strong>
                    <span>{meta}</span>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="af-asf__viewer">
      <div className="af-asf__viewer-meta">
        <span>{resolved.doc?.title ?? name}</span>
        <span>{resolved.updated ?? "Edited just now"}</span>
      </div>
      <textarea
        className="af-asf__notes-area"
        aria-label={resolved.doc?.title ?? name}
        value={docBody}
        onChange={(e) => {
          setDocBody(e.target.value);
          onDocChange?.(e.target.value);
        }}
      />
    </div>
  );
}
