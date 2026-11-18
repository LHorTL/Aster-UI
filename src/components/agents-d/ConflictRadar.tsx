import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { cn, useControllableState } from "../../primitives";
import { ModelBrandMark } from "../agents-c/_marks";

export type ConflictResolution = "pending" | "keep-a" | "keep-b" | "merged" | string;

export interface RadarAgent {
  id: string;
  name: string;
  model?: string;
  branch?: string;
  avatar?: ReactNode;
  status?: "running" | "done";
}

export interface RadarEdit {
  agentId: string;
  lines: [number, number];
  summary?: string;
  snippet?: string;
  active?: boolean;
}

export interface RadarFile {
  path: string;
  edits: RadarEdit[];
}

/** Legacy compatible conflict item interface. */
export interface FileConflictItem {
  id: string;
  file: string;
  lines: string;
  agentA: string;
  snippetA: string;
  agentB: string;
  snippetB: string;
  resolution: ConflictResolution;
}

export interface AfConflictRadarProps {
  /** Agents on parallel branches (columns). */
  agents?: RadarAgent[];
  /** Files and edited line ranges (rows). */
  files?: RadarFile[];
  /** Legacy conflicts prop. */
  conflicts?: FileConflictItem[];
  /** Header title. */
  title?: ReactNode;
  /** Controlled resolution map (`path -> agentId | "merged"`). */
  resolved?: Record<string, string>;
  /** Called when a conflict resolution option is picked. */
  onResolve?: (pathOrId: string, resolution: ConflictResolution) => void;
  /** Called when Merge branches is clicked after conflicts are settled. */
  onMerge?: () => void;
  /** Extra class on the root. */
  className?: string;
  /** Inline style override. */
  style?: CSSProperties;
}

export type AfConflictRadarPatternProps = AfConflictRadarProps;

const DEFAULT_AGENTS_DONE: RadarAgent[] = [
  {
    id: "checkout",
    name: "Checkout",
    model: "Opus 5.5",
    branch: "fix/flaky-checkout",
    avatar: <ModelBrandMark model="claude" size={11} />,
    status: "done",
  },
  {
    id: "stripe",
    name: "Stripe v2",
    model: "GPT-5",
    branch: "chore/stripe-v2",
    avatar: <ModelBrandMark model="openai" size={11} />,
    status: "done",
  },
  {
    id: "retries",
    name: "Retries",
    model: "Grok 4",
    branch: "feat/payment-retry",
    avatar: <ModelBrandMark model="grok" size={11} />,
    status: "done",
  },
];

const DEFAULT_FILES_SETTLE: RadarFile[] = [
  {
    path: "src/checkout/payment.ts",
    edits: [
      {
        agentId: "checkout",
        lines: [38, 74],
        summary: "Guard submitPayment with an idempotency key before charging the card.",
      },
      {
        agentId: "retries",
        lines: [52, 89],
        summary: "Retry transient 502s from the gateway up to 3 times with jittered backoff.",
      },
    ],
  },
  {
    path: "src/checkout/receipt.tsx",
    edits: [
      {
        agentId: "checkout",
        lines: [14, 48],
        summary: "Render settled charge ID and receipt timestamp once confirmed.",
      },
    ],
  },
  {
    path: "tests/checkout.spec.ts",
    edits: [
      {
        agentId: "checkout",
        lines: [12, 66],
        summary: "Add double-submit and slow webhook regression assertions.",
      },
    ],
  },
  {
    path: "src/lib/stripe.ts",
    edits: [
      {
        agentId: "stripe",
        lines: [1, 120],
        summary: "Upgrade Stripe SDK client to 2026-10 API version and typed webhooks.",
      },
    ],
  },
  {
    path: "src/lib/retry.ts",
    edits: [
      {
        agentId: "retries",
        lines: [8, 54],
        summary: "Add exponential backoff helper with retryable status filter.",
      },
    ],
  },
  {
    path: "package.json",
    edits: [
      {
        agentId: "stripe",
        lines: [18, 26],
        summary: "Bump stripe package from ^16.4.0 to ^17.1.0.",
      },
    ],
  },
];

function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] <= b[1] && b[0] <= a[1];
}

function hasFileConflict(file: RadarFile): boolean {
  if (file.edits.length < 2) return false;
  for (let i = 0; i < file.edits.length; i += 1) {
    for (let j = i + 1; j < file.edits.length; j += 1) {
      if (rangesOverlap(file.edits[i].lines, file.edits[j].lines)) return true;
    }
  }
  return false;
}

function splitPath(fullPath: string): { dir: string; fname: string } {
  const idx = fullPath.lastIndexOf("/");
  if (idx < 0) return { dir: "", fname: fullPath };
  return { dir: fullPath.slice(0, idx + 1), fname: fullPath.slice(idx + 1) };
}

function RadarGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.3" opacity="0.45" />
      <circle cx="8" cy="8" r="3.3" stroke="currentColor" strokeWidth="1.3" opacity="0.7" />
      <path d="M8 8 12.6 3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="11.2" cy="10.6" r="1.3" fill="currentColor" />
    </svg>
  );
}

function agentMonogram(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * Conflict Radar — live file-by-agent overlap matrix with travelling conflict link, agent KPI popovers, cell line-range tooltips, and side-by-side resolution picker.
 */
export function AfConflictRadar({
  agents: agentsProp,
  files: filesProp,
  conflicts: legacyConflicts,
  title = "Parallel work",
  resolved: resolvedProp,
  onResolve,
  onMerge,
  className,
  style,
}: AfConflictRadarProps = {}) {
  const isDefaultDemo = !agentsProp && !filesProp && !legacyConflicts;
  // Phase 0: live writing (matches initial still); Phase 1: overlap detected -> ready to resolve; Phase 2: all agents done
  const [demoPhase, setDemoPhase] = useState<0 | 1 | 2>(isDefaultDemo ? 0 : 2);

  useEffect(() => {
    if (!isDefaultDemo) return;
    const t1 = window.setTimeout(() => setDemoPhase(1), 1100);
    const t2 = window.setTimeout(() => setDemoPhase(2), 2300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isDefaultDemo]);

  const normalized = useMemo<{ agents: RadarAgent[]; files: RadarFile[] }>(() => {
    if (legacyConflicts?.length && !filesProp) {
      const agentSet = new Map<string, RadarAgent>();
      const convFiles: RadarFile[] = legacyConflicts.map((c) => {
        agentSet.set(c.agentA, { id: c.agentA, name: c.agentA, status: "done" });
        agentSet.set(c.agentB, { id: c.agentB, name: c.agentB, status: "done" });
        const nums = c.lines.match(/\d+/g)?.map(Number) ?? [1, 10];
        const range: [number, number] = [nums[0] ?? 1, nums[1] ?? nums[0] ?? 10];
        return {
          path: c.file,
          edits: [
            { agentId: c.agentA, lines: range, summary: c.snippetA, snippet: c.snippetA },
            { agentId: c.agentB, lines: range, summary: c.snippetB, snippet: c.snippetB },
          ],
        };
      });
      return { agents: [...agentSet.values()], files: convFiles };
    }

    if (isDefaultDemo) {
      if (demoPhase === 0) {
        return {
          agents: DEFAULT_AGENTS_DONE.map((a) => ({ ...a, status: "running" as const })),
          files: [
            { path: "src/checkout/payment.ts", edits: [] },
            {
              path: "src/checkout/receipt.tsx",
              edits: [{ agentId: "checkout", lines: [14, 48], active: true }],
            },
            { path: "tests/checkout.spec.ts", edits: [] },
            {
              path: "src/lib/stripe.ts",
              edits: [{ agentId: "stripe", lines: [1, 120], active: true }],
            },
            { path: "src/lib/retry.ts", edits: [] },
            { path: "package.json", edits: [] },
          ],
        };
      }
      if (demoPhase === 1) {
        return {
          agents: DEFAULT_AGENTS_DONE.map((a, idx) => ({
            ...a,
            status: idx === 1 ? ("done" as const) : ("running" as const),
          })),
          files: DEFAULT_FILES_SETTLE.map((f) =>
            f.path === "src/checkout/payment.ts"
              ? {
                  ...f,
                  edits: f.edits.map((e) => ({ ...e, active: true })),
                }
              : f,
          ),
        };
      }
    }

    return {
      agents: agentsProp ?? DEFAULT_AGENTS_DONE,
      files: filesProp ?? DEFAULT_FILES_SETTLE,
    };
  }, [agentsProp, filesProp, legacyConflicts, isDefaultDemo, demoPhase]);

  const initialResolved = useMemo(() => {
    const init: Record<string, string> = {};
    if (legacyConflicts) {
      legacyConflicts.forEach((c) => {
        if (c.resolution && c.resolution !== "pending") {
          init[c.file] = c.resolution;
        }
      });
    }
    return init;
  }, [legacyConflicts]);

  const [resolvedMap, setResolvedMap] = useControllableState<Record<string, string>>({
    value: resolvedProp,
    defaultValue: initialResolved,
  });

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [mergedDone, setMergedDone] = useState(false);

  const conflictFiles = useMemo(
    () => normalized.files.filter((f) => hasFileConflict(f)),
    [normalized.files],
  );

  const activeConflictFile = useMemo(() => {
    if (selectedPath) {
      const found = conflictFiles.find((f) => f.path === selectedPath);
      if (found) return found;
    }
    return conflictFiles.find((f) => !resolvedMap[f.path]) ?? conflictFiles[0] ?? null;
  }, [conflictFiles, resolvedMap, selectedPath]);

  const runningCount = normalized.agents.filter((a) => a.status === "running").length;
  const openConflictCount = conflictFiles.filter((f) => !resolvedMap[f.path]).length;
  const canMerge = runningCount === 0 && openConflictCount === 0 && !mergedDone;

  const pickResolution = (path: string, choice: string) => {
    setResolvedMap((prev) => ({ ...prev, [path]: choice }));
    setMergedDone(false);
    const legacyMatch = legacyConflicts?.find((c) => c.file === path);
    onResolve?.(legacyMatch ? legacyMatch.id : path, choice);
  };

  const mergeButtonLabel = mergedDone
    ? `Merged ${normalized.agents.length} branches`
    : openConflictCount > 0
      ? `${openConflictCount} ${openConflictCount === 1 ? "conflict" : "conflicts"} to settle`
      : runningCount > 0
        ? `Waiting for ${runningCount} ${runningCount === 1 ? "agent" : "agents"}`
        : `Merge ${normalized.agents.length} branches`;

  const renderLegend = (place: "head" | "foot") => (
    <span className="af-crc__legend" data-place={place} aria-hidden="true">
      <span>
        <span className="af-crc__bar-s" data-role="edit" data-key="" />
        Changed
      </span>
      <span>
        <span className="af-crc__bar-s" data-role="conflict" data-key="" />
        Conflict
      </span>
      <span>
        <span className="af-crc__bar-s" data-role="kept" data-key="" />
        Kept
      </span>
    </span>
  );

  return (
    <div className={cn("af-crc", className)} style={style}>
      <div
        className="af-crc__card"
        style={{ "--af-crc-n": normalized.agents.length } as CSSProperties}
      >
        {/* Top bar */}
        <header className="af-crc__bar">
          <span className="af-crc__radar">
            <RadarGlyph />
          </span>
          <span className="af-crc__title" title={typeof title === "string" ? title : undefined}>
            {title}
          </span>
          <button
            type="button"
            className="af-crc__merge"
            disabled={!canMerge}
            data-ready={canMerge || undefined}
            onClick={() => {
              if (!canMerge) return;
              setMergedDone(true);
              onMerge?.();
            }}
          >
            <span key={mergeButtonLabel}>{mergeButtonLabel}</span>
          </button>
        </header>

        {/* Matrix table (100% Flexbox) */}
        <div className="af-crc__grid" role="table" aria-label="Files by agent">
          <div className="af-crc__row" data-head="" role="row">
            <span className="af-crc__file" role="columnheader">
              <span className="af-crc__sr">File</span>
              {renderLegend("head")}
            </span>

            <span className="af-crc__cells">
              {normalized.agents.map((agent, idx) => {
                const isLast = idx === normalized.agents.length - 1;
                const isRunning = agent.status === "running";
                const touchedCount = normalized.files.filter((f) =>
                  f.edits.some((e) => e.agentId === agent.id),
                ).length;
                const agentConflictCount = conflictFiles.filter(
                  (f) => !resolvedMap[f.path] && f.edits.some((e) => e.agentId === agent.id),
                ).length;
                const keptCount = conflictFiles.filter((f) => {
                  const pick = resolvedMap[f.path];
                  return pick === agent.id || pick === "merged";
                }).length;

                return (
                  <span
                    key={agent.id}
                    className="af-crc__head"
                    role="columnheader"
                    data-status={isRunning ? "running" : "done"}
                    data-last={isLast || undefined}
                  >
                    <span
                      className="af-crc__avatar"
                      data-logo={Boolean(agent.avatar) || undefined}
                    >
                      {agent.avatar ?? agentMonogram(agent.name)}
                    </span>
                    <span className="af-crc__hname" title={agent.name}>
                      {agent.name}
                    </span>
                    <span className="af-crc__sr">
                      {isRunning ? ", working" : ", done"}
                    </span>

                    {/* Hover KPI card */}
                    <span className="af-crc__kpi" aria-hidden="true">
                      <span className="af-crc__kpitop">
                        <span
                          className="af-crc__avatar"
                          data-logo={Boolean(agent.avatar) || undefined}
                        >
                          {agent.avatar ?? agentMonogram(agent.name)}
                        </span>
                        <b>{agent.name}</b>
                        <span className="af-crc__kpistate">
                          {isRunning ? "Working" : "Done"}
                        </span>
                      </span>
                      {(agent.model || agent.branch) ? (
                        <span className="af-crc__kpimodel">
                          {[agent.model, agent.branch].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                      <span className="af-crc__kpis">
                        <span
                          data-kpi="files"
                          data-zero={touchedCount === 0 || undefined}
                        >
                          <b>{touchedCount}</b>
                          {touchedCount === 1 ? "File" : "Files"}
                        </span>
                        <span
                          data-kpi="conflicts"
                          data-zero={agentConflictCount === 0 || undefined}
                        >
                          <b>{agentConflictCount}</b>
                          {agentConflictCount === 1 ? "Conflict" : "Conflicts"}
                        </span>
                        <span
                          data-kpi="kept"
                          data-zero={keptCount === 0 || undefined}
                        >
                          <b>{keptCount}</b>Kept
                        </span>
                      </span>
                    </span>
                  </span>
                );
              })}
            </span>
          </div>

          {normalized.files.map((file, rowIdx) => {
            const conflicting = hasFileConflict(file);
            const pick = resolvedMap[file.path];
            const rowState: "clean" | "conflict" | "settled" = !conflicting
              ? "clean"
              : pick
                ? "settled"
                : "conflict";
            const { dir, fname } = splitPath(file.path);

            // Compute travelling link endpoints for conflict rows
            const involvedIndices = normalized.agents
              .map((a, ai) => (file.edits.some((e) => e.agentId === a.id) ? ai : -1))
              .filter((ai) => ai >= 0);
            const linkA = involvedIndices[0] ?? 0;
            const linkB = involvedIndices[involvedIndices.length - 1] ?? 0;

            const isRowSelected = activeConflictFile?.path === file.path && conflicting;

            const rowInner = (
              <>
                <span className="af-crc__file" role="cell">
                  <span className="af-crc__dot" data-state={rowState} aria-hidden="true" />
                  <span className="af-crc__path" title={file.path}>
                    {dir ? <span className="af-crc__dir">{dir}</span> : null}
                    <span className="af-crc__fname">{fname}</span>
                  </span>
                </span>

                <span className="af-crc__cells">
                  {conflicting && involvedIndices.length >= 2 ? (
                    <span
                      className="af-crc__link"
                      aria-hidden="true"
                      style={
                        {
                          "--a": linkA,
                          "--b": linkB,
                        } as CSSProperties
                      }
                    />
                  ) : null}

                  {normalized.agents.map((agent, colIdx) => {
                    const edit = file.edits.find((e) => e.agentId === agent.id);
                    const isLast = colIdx === normalized.agents.length - 1;

                    let barRole: "none" | "edit" | "conflict" | "kept" | "lost" = "none";
                    if (edit) {
                      if (!conflicting) {
                        barRole = "edit";
                      } else if (!pick) {
                        barRole = "conflict";
                      } else if (
                        pick === "merged" ||
                        pick === agent.id ||
                        (pick === "keep-a" && file.edits[0]?.agentId === agent.id) ||
                        (pick === "keep-b" && file.edits[1]?.agentId === agent.id)
                      ) {
                        barRole = "kept";
                      } else {
                        barRole = "lost";
                      }
                    }

                    const tipStateLabel =
                      barRole === "conflict"
                        ? "Conflict"
                        : barRole === "kept"
                          ? "Kept"
                          : barRole === "lost"
                            ? "Dropped"
                            : edit?.active
                              ? "Writing…"
                              : "Changed";

                    return (
                      <span
                        key={agent.id}
                        className="af-crc__cell"
                        role="cell"
                        data-last={isLast || undefined}
                      >
                        <span
                          className="af-crc__bar-s"
                          data-role={barRole}
                          data-active={edit?.active || undefined}
                        />
                        {edit ? (
                          <span className="af-crc__tip" data-role={barRole}>
                            <span className="af-crc__tiptop">
                              <b>{agent.name}</b>
                              <span className="af-crc__tipstate">{tipStateLabel}</span>
                            </span>
                            <span className="af-crc__tipmeta">
                              Lines {edit.lines[0]}–{edit.lines[1]}
                            </span>
                          </span>
                        ) : null}
                      </span>
                    );
                  })}
                </span>
              </>
            );

            if (conflicting) {
              return (
                <button
                  key={file.path}
                  type="button"
                  role="row"
                  className="af-crc__row"
                  data-state={rowState}
                  data-alt={rowIdx % 2 === 1 || undefined}
                  aria-pressed={isRowSelected}
                  onClick={() => setSelectedPath(file.path)}
                >
                  {rowInner}
                </button>
              );
            }

            return (
              <div
                key={file.path}
                role="row"
                className="af-crc__row"
                data-state={rowState}
                data-alt={rowIdx % 2 === 1 || undefined}
              >
                {rowInner}
              </div>
            );
          })}

          {renderLegend("foot")}
        </div>

        {/* Bottom resolution panel */}
        <section className="af-crc__pick" aria-live="polite">
          {activeConflictFile ? (
            (() => {
              const pick = resolvedMap[activeConflictFile.path];
              const minLine = Math.min(...activeConflictFile.edits.map((e) => e.lines[0]));
              const maxLine = Math.max(...activeConflictFile.edits.map((e) => e.lines[1]));
              return (
                <>
                  <div className="af-crc__phead">
                    <span className="af-crc__ptitle">
                      {pick ? "Settled" : "Pick a way"}
                    </span>
                    <span className="af-crc__where">
                      {activeConflictFile.path} · lines {minLine}–{maxLine}
                    </span>
                  </div>

                  <div
                    className="af-crc__ways"
                    role="radiogroup"
                    aria-label={`Resolve ${activeConflictFile.path}`}
                  >
                    {activeConflictFile.edits.map((edit, editIdx) => {
                      const agent = normalized.agents.find((a) => a.id === edit.agentId);
                      const chosen =
                        pick === edit.agentId ||
                        (editIdx === 0 && pick === "keep-a") ||
                        (editIdx === 1 && pick === "keep-b") ||
                        pick === "merged";
                      const lost = Boolean(pick && !chosen);

                      return (
                        <button
                          key={edit.agentId}
                          type="button"
                          role="radio"
                          aria-checked={chosen}
                          className="af-crc__way"
                          data-lost={lost || undefined}
                          onClick={() =>
                            pickResolution(activeConflictFile.path, edit.agentId)
                          }
                        >
                          <span className="af-crc__wtop">
                            <span
                              className="af-crc__avatar"
                              data-logo={Boolean(agent?.avatar) || undefined}
                            >
                              {agent?.avatar ?? agentMonogram(agent?.name ?? edit.agentId)}
                            </span>
                            <span className="af-crc__wname">
                              {agent?.name ?? edit.agentId}
                            </span>
                            {chosen ? (
                              <span className="af-crc__kept">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                  <path
                                    d="M5 13L9.5 17.5L19 7.5"
                                    stroke="currentColor"
                                    strokeWidth="2.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                Kept
                              </span>
                            ) : null}
                          </span>
                          <span className="af-crc__summary">
                            {edit.summary ??
                              edit.snippet ??
                              `Edited lines ${edit.lines[0]}–${edit.lines[1]}.`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()
          ) : (
            <div className="af-crc__calm">
              {mergedDone
                ? `Merged ${normalized.agents.length} branches cleanly`
                : runningCount > 0
                  ? `Watching ${normalized.agents.length} agents for overlaps`
                  : "No overlapping edits across branches"}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export const AfConflictRadarPattern = AfConflictRadar;
export const ConflictRadar = AfConflictRadar;
