import { forwardRef, useMemo, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn, useControllableState } from "../../primitives";
import { AfSegmented } from "../controls/Segmented";
import { AfCopyButton } from "./CopyButton";

/** Diff 行类型。 */
export type AfDiffLineType = "add" | "del" | "ctx" | "hunk";

/** 单条代码差异行。 */
export type AfDiffLine = {
  type: AfDiffLineType;
  content: string;
  oldLine?: number;
  newLine?: number;
};

/** 代码差异视图属性。 */
export type AfDiffViewProps = {
  /** 结构化差异行列表。 */
  lines?: AfDiffLine[];
  /** Unified diff 文本补丁（当未传入 `lines` 时自动解析）。 */
  patch?: string;
  /** 变更前文本（配合 `after` 自动生成逐行差异）。 */
  before?: string;
  /** 变更后文本（配合 `before` 自动生成逐行差异）。 */
  after?: string;
  /** 受控视图模式：统一纵览或左右分栏对比。 */
  mode?: "unified" | "split";
  /** 非受控默认视图模式，默认 `"unified"`。 */
  defaultMode?: "unified" | "split";
  /** 模式切换回调。 */
  onModeChange?: (mode: "unified" | "split") => void;
  /** 头部是否显示模式切换器，默认 false。 */
  showModeSwitch?: boolean;
  /** 可选文件名或标题。 */
  filename?: ReactNode;
  /** 是否显示行号槽，默认 true。 */
  showLineNumbers?: boolean;
  /** 紧凑嵌入模式（省略外边框阴影与头部栏，适合嵌在时间线/冲突卡片内部）。 */
  compact?: boolean;
  /** 头部是否显示一键复制补丁按钮，默认 false。 */
  copyable?: boolean;
  /** 最大滚动高度。 */
  maxHeight?: number | string;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
};

const DEFAULT_DIFF_LINES: AfDiffLine[] = [
  { type: "hunk", content: "@@ -42,5 +42,6 @@ verifySessionCookie()" },
  { type: "ctx", oldLine: 42, newLine: 42, content: "  const payload = decodeJwt(cookie);" },
  { type: "del", oldLine: 43, content: "  if (!payload) return null;" },
  { type: "add", newLine: 43, content: "  if (!payload || payload.exp < Date.now()) return null;" },
  { type: "add", newLine: 44, content: "  auditLog.record('session.verified', payload.sub);" },
  { type: "ctx", oldLine: 44, newLine: 45, content: "  return payload.sub;" },
];

/** 解析标准 Unified Patch 字符串为结构化行。 */
export function parseUnifiedPatch(patch: string): AfDiffLine[] {
  const result: AfDiffLine[] = [];
  let oldNum = 1;
  let newNum = 1;
  for (const rawLine of patch.split(/\r?\n/)) {
    if (rawLine.startsWith("@@")) {
      const m = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/.exec(rawLine);
      if (m) {
        oldNum = Number(m[1]);
        newNum = Number(m[2]);
      }
      result.push({ type: "hunk", content: rawLine });
    } else if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      result.push({ type: "add", newLine: newNum++, content: rawLine.slice(1) });
    } else if (rawLine.startsWith("-") && !rawLine.startsWith("---")) {
      result.push({ type: "del", oldLine: oldNum++, content: rawLine.slice(1) });
    } else if (!rawLine.startsWith("---") && !rawLine.startsWith("+++")) {
      result.push({
        type: "ctx",
        oldLine: oldNum++,
        newLine: newNum++,
        content: rawLine.startsWith(" ") ? rawLine.slice(1) : rawLine,
      });
    }
  }
  return result;
}

/** 计算前后文本的逐行差异。 */
export function computeLineDiff(before: string, after: string): AfDiffLine[] {
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: AfDiffLine[] = [];
  let i = 0;
  let j = 0;
  let oldLine = 1;
  let newLine = 1;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ type: "ctx", oldLine: oldLine++, newLine: newLine++, content: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", oldLine: oldLine++, content: a[i++] });
    } else {
      out.push({ type: "add", newLine: newLine++, content: b[j++] });
    }
  }
  while (i < m) out.push({ type: "del", oldLine: oldLine++, content: a[i++] });
  while (j < n) out.push({ type: "add", newLine: newLine++, content: b[j++] });
  return out;
}

type SplitRow = {
  kind: "hunk" | "pair";
  hunk?: string;
  left?: AfDiffLine;
  right?: AfDiffLine;
};

function buildSplitRows(lines: AfDiffLine[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let idx = 0;
  while (idx < lines.length) {
    const line = lines[idx];
    if (line.type === "hunk") {
      rows.push({ kind: "hunk", hunk: line.content });
      idx++;
      continue;
    }
    if (line.type === "ctx") {
      rows.push({ kind: "pair", left: line, right: line });
      idx++;
      continue;
    }
    const dels: AfDiffLine[] = [];
    const adds: AfDiffLine[] = [];
    while (idx < lines.length && (lines[idx].type === "del" || lines[idx].type === "add")) {
      if (lines[idx].type === "del") dels.push(lines[idx]);
      else adds.push(lines[idx]);
      idx++;
    }
    const count = Math.max(dels.length, adds.length);
    for (let k = 0; k < count; k++) {
      rows.push({ kind: "pair", left: dels[k], right: adds[k] });
    }
  }
  return rows;
}

/**
 * 代码差异视图：支持 `lines` / `patch` / `before + after` 三种输入，提供 Unified 单栏与 Split 双栏对比，全程纯 Flexbox 布局。
 */
export const AfDiffView = forwardRef<HTMLDivElement, AfDiffViewProps>(function AfDiffView(
  {
    lines: linesProp,
    patch,
    before,
    after,
    mode: modeProp,
    defaultMode = "unified",
    onModeChange,
    showModeSwitch = false,
    filename,
    showLineNumbers = true,
    compact = false,
    copyable = false,
    maxHeight,
    className,
    style,
  },
  ref,
) {
  const [mode, setMode] = useControllableState<"unified" | "split">({
    value: modeProp,
    defaultValue: defaultMode,
    onChange: onModeChange,
  });

  const resolvedLines = useMemo<AfDiffLine[]>(() => {
    if (linesProp) return linesProp;
    if (patch !== undefined) return parseUnifiedPatch(patch);
    if (before !== undefined && after !== undefined) return computeLineDiff(before, after);
    return DEFAULT_DIFF_LINES;
  }, [linesProp, patch, before, after]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const l of resolvedLines) {
      if (l.type === "add") added++;
      else if (l.type === "del") removed++;
    }
    return { added, removed };
  }, [resolvedLines]);

  const splitRows = useMemo(() => (mode === "split" ? buildSplitRows(resolvedLines) : []), [mode, resolvedLines]);

  const rawPatchText = useMemo(
    () =>
      resolvedLines
        .map((l) => (l.type === "add" ? `+${l.content}` : l.type === "del" ? `-${l.content}` : l.type === "hunk" ? l.content : ` ${l.content}`))
        .join("\n"),
    [resolvedLines],
  );

  const showHeader = !compact && Boolean(filename || showModeSwitch || copyable);

  return (
    <div
      ref={ref}
      className={cn("af-diff", className)}
      style={style}
      data-mode={mode}
      data-compact={compact ? "true" : undefined}
    >
      {showHeader ? (
        <header className="af-diff__head">
          <div className="af-diff__file">
            {filename ? (
              <>
                <AfIcon name="file" size={13} />
                <span className="af-diff__filename">{filename}</span>
              </>
            ) : null}
            <span className="af-diff__stats">
              <span className="af-diff__stat-add">+{stats.added}</span>
              <span className="af-diff__stat-del">-{stats.removed}</span>
            </span>
          </div>
          <div className="af-diff__actions">
            {showModeSwitch ? (
              <AfSegmented
                size="xs"
                label="差异视图模式"
                value={mode}
                onChange={(v) => setMode(v as "unified" | "split")}
                options={[
                  { value: "unified", label: "单栏" },
                  { value: "split", label: "双栏" },
                ]}
              />
            ) : null}
            {copyable ? <AfCopyButton text={rawPatchText} label="复制" /> : null}
          </div>
        </header>
      ) : null}

      <div className="af-diff__body" style={maxHeight !== undefined ? { maxHeight, overflowY: "auto" } : undefined}>
        {mode === "unified" ? (
          resolvedLines.map((line, index) => (
            <div key={index} className="af-diff__row" data-type={line.type}>
              {showLineNumbers && line.type !== "hunk" ? (
                <span className="af-diff__gutter" aria-hidden="true">
                  <span className="af-diff__ln">{line.oldLine ?? ""}</span>
                  <span className="af-diff__ln">{line.newLine ?? ""}</span>
                </span>
              ) : showLineNumbers ? (
                <span className="af-diff__gutter" aria-hidden="true">
                  <span className="af-diff__ln" />
                  <span className="af-diff__ln" />
                </span>
              ) : null}
              <span className="af-diff__sign" aria-hidden="true">
                {line.type === "add" ? "+" : line.type === "del" ? "-" : line.type === "hunk" ? " " : " "}
              </span>
              <span className="af-diff__code">{line.content || " "}</span>
            </div>
          ))
        ) : (
          splitRows.map((row, index) =>
            row.kind === "hunk" ? (
              <div key={index} className="af-diff__row" data-type="hunk">
                <span className="af-diff__code">{row.hunk}</span>
              </div>
            ) : (
              <div key={index} className="af-diff__split-row">
                <div className="af-diff__split-cell" data-type={row.left?.type ?? "empty"}>
                  {showLineNumbers ? <span className="af-diff__ln">{row.left?.oldLine ?? ""}</span> : null}
                  <span className="af-diff__sign" aria-hidden="true">
                    {row.left?.type === "del" ? "-" : row.left ? " " : ""}
                  </span>
                  <span className="af-diff__code">{row.left?.content ?? ""}</span>
                </div>
                <div className="af-diff__split-cell" data-type={row.right?.type ?? "empty"}>
                  {showLineNumbers ? <span className="af-diff__ln">{row.right?.newLine ?? ""}</span> : null}
                  <span className="af-diff__sign" aria-hidden="true">
                    {row.right?.type === "add" ? "+" : row.right ? " " : ""}
                  </span>
                  <span className="af-diff__code">{row.right?.content ?? ""}</span>
                </div>
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
});
