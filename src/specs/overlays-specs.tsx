import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  AfAlertDialog,
  AfButton,
  AfCommandPalette,
  AfConfirmProvider,
  AfContextMenu,
  AfDrawer,
  AfDropdownMenu,
  AfHoverCard,
  AfIcon,
  AfInput,
  AfModal,
  AfPopover,
  AfTextarea,
  AfToastProvider,
  AfTooltip,
  afMessage,
  useAfConfirm,
  useAfToast,
  type AfCommand,
  type AfContextMenuItem,
  type AfDrawerPlacement,
  type AfMenuItem,
} from "../index";
import type { ComponentSpec } from "../types";

/* ---------------- Shared Exact affectUI Pixel Marks & Glyph SVGs ---------------- */

function PixelAgentMark({
  mask,
  color,
  dotSize = 3,
  gap = 1.5,
}: {
  mask: readonly (0 | 1)[];
  color: string;
  dotSize?: number;
  gap?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        width: dotSize * 3 + gap * 2,
        height: dotSize * 3 + gap * 2,
        gap,
        flex: "none",
      }}
    >
      {mask.map((on, idx) => (
        <i
          key={idx}
          style={{
            display: "block",
            width: dotSize,
            height: dotSize,
            borderRadius: 0.75,
            background: on ? color : "transparent",
          }}
        />
      ))}
    </span>
  );
}

const SCOUT_MASK = [0, 1, 0, 1, 1, 1, 1, 0, 1] as const;
const LEDGER_MASK = [1, 0, 1, 1, 1, 1, 0, 1, 0] as const;
const WRITER_MASK = [1, 1, 1, 0, 1, 0, 1, 1, 1] as const;
const TRIAGE_MASK = [1, 1, 1, 0, 1, 0, 1, 0, 1] as const;

const SvgRadarTarget = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

const SvgFolderGlyph = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8.2C3 6.98 3 6.38 3.24 5.91C3.45 5.51 3.78 5.18 4.18 4.97C4.65 4.73 5.25 4.73 6.47 4.73H9.3C9.88 4.73 10.17 4.73 10.44 4.82C10.68 4.9 10.9 5.03 11.09 5.2C11.31 5.39 11.47 5.63 11.79 6.12L12.41 7.05C12.73 7.54 12.89 7.78 13.11 7.97C13.3 8.14 13.52 8.27 13.76 8.35C14.03 8.44 14.32 8.44 14.9 8.44H17.53C18.75 8.44 19.35 8.44 19.82 8.68C20.22 8.89 20.55 9.22 20.76 9.62C21 10.09 21 10.69 21 11.9V16.8C21 18.02 21 18.62 20.76 19.09C20.55 19.49 20.22 19.82 19.82 20.03C19.35 20.27 18.75 20.27 17.53 20.27H6.47C5.25 20.27 4.65 20.27 4.18 20.03C3.78 19.82 3.45 19.49 3.24 19.09C3 18.62 3 18.02 3 16.8V8.2Z" />
  </svg>
);

const SvgBellGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8.4C18 5.09 15.31 2.4 12 2.4C8.69 2.4 6 5.09 6 8.4C6 15.2 3.3 17.2 3.3 17.2H20.7C20.7 17.2 18 15.2 18 8.4Z" />
    <path d="M13.73 20.8C13.38 21.4 12.74 21.78 12 21.78C11.26 21.78 10.62 21.4 10.27 20.8" />
  </svg>
);

const SvgSunSmall = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3V5M12 19V21M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M3 12H5M19 12H21M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93" />
  </svg>
);

const SvgBriefcaseSmall = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="13" rx="2.5" />
    <path d="M9 7V5.5C9 4.67 9.67 4 10.5 4H13.5C14.33 4 15 4.67 15 5.5V7M3 12.5H21" />
  </svg>
);

const SvgCalendar17 = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
    <path d="M8 3V6M16 3V6M3.5 9.5H20.5" />
    <path d="M9.5 13.5V17M12.5 13.5H15L13.5 17" strokeWidth="1.5" />
  </svg>
);

const SvgSlidersHorizontal = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M4 7H10M14 7H20M12 5V9M4 17H8M12 17H20M10 15V19" />
  </svg>
);

const SvgPushPin = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21L8 16" />
    <path d="M13.26 18.87C9.52 18.02 5.98 14.48 5.13 10.74C4.99 10.15 4.93 9.85 5.12 9.37C5.32 8.89 5.55 8.74 6.03 8.45C7.11 7.77 8.27 7.56 9.48 7.67C11.18 7.82 12.03 7.89 12.45 7.67C12.87 7.45 13.16 6.93 13.74 5.9L14.47 4.6C14.95 3.74 15.19 3.3 15.75 3.1C16.32 2.9 16.66 3.02 17.34 3.27C18.92 3.84 20.16 5.08 20.73 6.66C20.98 7.34 21.1 7.68 20.9 8.25C20.7 8.81 20.26 9.05 19.4 9.53L18.07 10.28C17.04 10.85 16.52 11.14 16.3 11.57C16.08 12 16.16 12.83 16.32 14.49C16.44 15.71 16.24 16.88 15.56 17.97C15.26 18.45 15.11 18.68 14.63 18.88C14.15 19.07 13.85 19.01 13.26 18.87Z" />
  </svg>
);

const SvgShareNodes = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="M8.3 10.7L15.7 6.3M8.3 13.3L15.7 17.7" />
  </svg>
);

const SvgPencilEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.42 4.61L17.41 3.62C18.24 2.79 19.56 2.79 20.38 3.62C21.21 4.44 21.21 5.76 20.38 6.59L19.39 7.58M16.42 4.61L9.77 11.26C9.26 11.77 8.9 12.41 8.72 13.1L8 16L10.9 15.28C11.59 15.1 12.23 14.74 12.74 14.23L19.39 7.58M16.42 4.61L19.39 7.58" />
    <path d="M19 13.5C19 16.79 19 18.43 18.09 19.54C17.93 19.74 17.74 19.93 17.54 20.09C16.43 21 14.79 21 11.5 21H11C7.23 21 5.34 21 4.17 19.83C3 18.66 3 16.77 3 13V12.5C3 9.21 3 7.57 3.91 6.46C4.07 6.26 4.26 6.07 4.46 5.91C5.57 5 7.21 5 10.5 5" />
  </svg>
);

/* ---------------- 1. Dropdown Menu Specimen (1:1 affectUI) ---------------- */

type DemoRunRow = {
  id: string;
  name: string;
  kind: "eval" | "folder";
  timeLabel: string;
  duration: string;
  costLabel: string;
  costValue: number;
  folder: string;
  notify: boolean;
  createdOrder: number;
  durationSec: number;
};

function DropdownMenuSpecimen() {
  const [sortBy, setSortBy] = useState<"newest" | "longest" | "expensive" | "name">("newest");
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [runs, setRuns] = useState<DemoRunRow[]>([
    {
      id: "r1",
      name: "Nightly evals",
      kind: "eval",
      timeLabel: "Today 14:02",
      duration: "6m 32s",
      costLabel: "$1.84",
      costValue: 1.84,
      folder: "Production",
      notify: true,
      createdOrder: 3,
      durationSec: 392,
    },
    {
      id: "r2",
      name: "Docs sync",
      kind: "folder",
      timeLabel: "Today 13:50",
      duration: "2m 05s",
      costLabel: "$0.31",
      costValue: 0.31,
      folder: "Staging",
      notify: false,
      createdOrder: 2,
      durationSec: 125,
    },
    {
      id: "r3",
      name: "Release notes",
      kind: "folder",
      timeLabel: "Today 11:12",
      duration: "11m 48s",
      costLabel: "$3.20",
      costValue: 3.2,
      folder: "Production",
      notify: true,
      createdOrder: 1,
      durationSec: 708,
    },
  ]);

  const sortedRuns = useMemo(() => {
    const next = [...runs];
    if (sortBy === "newest") next.sort((a, b) => b.createdOrder - a.createdOrder);
    else if (sortBy === "longest") next.sort((a, b) => b.durationSec - a.durationSec);
    else if (sortBy === "expensive") next.sort((a, b) => b.costValue - a.costValue);
    else next.sort((a, b) => a.name.localeCompare(b.name));
    return next;
  }, [runs, sortBy]);

  const sortLabel =
    sortBy === "newest"
      ? "Newest"
      : sortBy === "longest"
        ? "Longest"
        : sortBy === "expensive"
          ? "Most expensive"
          : "Name";

  const sortItems: AfMenuItem[] = [
    {
      type: "radio",
      id: "newest",
      label: "Newest",
      icon: "clock",
      checked: sortBy === "newest",
      onSelect: () => setSortBy("newest"),
    },
    {
      type: "radio",
      id: "longest",
      label: "Longest",
      icon: "schedule",
      checked: sortBy === "longest",
      onSelect: () => setSortBy("longest"),
    },
    {
      type: "radio",
      id: "expensive",
      label: "Most expensive",
      icon: "chart",
      checked: sortBy === "expensive",
      onSelect: () => setSortBy("expensive"),
    },
    {
      type: "radio",
      id: "name",
      label: "Name",
      icon: "filter",
      checked: sortBy === "name",
      onSelect: () => setSortBy("name"),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        width: "100%",
        paddingTop: 12,
        paddingBottom: 96,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          padding: "4px 0 0",
          borderRadius: 10,
          background: "var(--af-surface)",
          boxShadow: "var(--af-shadow-card)",
          fontFamily: "var(--af-font)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 40,
            padding: "0 8px 0 16px",
          }}
        >
          <span
            style={{
              fontSize: 10,
              lineHeight: "16px",
              fontWeight: 500,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              color: "var(--af-muted)",
            }}
          >
            Runs
          </span>
          <AfDropdownMenu items={sortItems} align="end" width={184}>
            <button
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                height: 28,
                padding: "0 8px",
                border: 0,
                borderRadius: 6,
                background: "transparent",
                font: "inherit",
                fontSize: 12,
                lineHeight: "16px",
                color: "var(--af-muted)",
                cursor: "pointer",
              }}
            >
              <span>Sort:</span>
              <strong style={{ fontWeight: 500, color: "var(--af-ink)" }}>{sortLabel}</strong>
              <AfIcon name="chevronDown" size={12} />
            </button>
          </AfDropdownMenu>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {sortedRuns.map((run, idx) => {
            const rowItems: AfMenuItem[] = [
              {
                id: "rerun",
                label: "Rerun",
                icon: "refresh",
                shortcut: "⌘R",
                onSelect: () => setLastAction(`Reran "${run.name}"`),
              },
              {
                id: "duplicate",
                label: "Duplicate",
                icon: "copy",
                shortcut: "⌘D",
                onSelect: () => setLastAction(`Duplicated "${run.name}"`),
              },
              {
                id: "copy-link",
                label: "Copy link",
                icon: "link",
                shortcut: "⌘L",
                onSelect: () => setLastAction(`Copied link to "${run.name}"`),
              },
              {
                id: "move",
                divider: true,
                label: "Move to",
                icon: <SvgFolderGlyph />,
                submenu: ["Production", "Staging", "Archive"].map((folder) => ({
                  type: "radio" as const,
                  id: `folder-${folder}`,
                  label: folder,
                  checked: run.folder === folder,
                  onSelect: () => {
                    setRuns((prev) => prev.map((r) => (r.id === run.id ? { ...r, folder } : r)));
                    setLastAction(`Moved "${run.name}" → ${folder}`);
                  },
                })),
              },
              {
                type: "checkbox",
                id: "notify",
                keepOpen: true,
                icon: <SvgBellGlyph />,
                label: "Notify when done",
                checked: run.notify,
                onCheckedChange: (checked) => {
                  setRuns((prev) => prev.map((r) => (r.id === run.id ? { ...r, notify: checked } : r)));
                  setLastAction(`${checked ? "Enabled" : "Muted"} alerts for "${run.name}"`);
                },
              },
              {
                id: "delete",
                divider: true,
                danger: true,
                icon: "trash",
                label: "Delete run",
                onSelect: () => {
                  setRuns((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== run.id) : prev));
                  setLastAction(`Removed "${run.name}"`);
                },
              },
            ];

            return (
              <div
                key={run.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  height: 56,
                  padding: "0 8px 0 16px",
                  boxShadow: "inset 0 0.5px 0 var(--af-line)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: "var(--af-wash)",
                      color: "var(--af-icon)",
                    }}
                    aria-hidden="true"
                  >
                    {run.kind === "eval" ? <SvgRadarTarget /> : <SvgFolderGlyph />}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontWeight: 500, color: "var(--af-strong)", fontSize: 13, lineHeight: "20px" }}>
                      {run.name}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        lineHeight: "16px",
                        color: "var(--af-muted)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {run.timeLabel} · {run.duration} · {run.costLabel}
                    </span>
                  </div>
                </div>

                <AfDropdownMenu items={rowItems} align="end" width={196} defaultOpen={idx === 0}>
                  <AfButton size="sm" variant="ghost" icon="more" aria-label={`Actions for ${run.name}`} />
                </AfDropdownMenu>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 40,
            padding: "0 16px",
            boxShadow: "inset 0 0.5px 0 var(--af-line)",
            fontSize: 12,
            lineHeight: "16px",
            color: "var(--af-muted)",
          }}
        >
          <span>{lastAction ?? "Open a run's menu – ⋯ or ↓ on it"}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 2. Popover Specimen (1:1 affectUI) ---------------- */

function PopoverSpecimen() {
  const [cadence, setCadence] = useState<"daily" | "weekdays" | "monday">("monday");
  const [draft, setDraft] = useState<"daily" | "weekdays" | "monday">("monday");
  const [open, setOpen] = useState(true);

  const labelMap = {
    daily: "Every day",
    weekdays: "Weekdays",
    monday: "Every Monday",
  } as const;

  const options: ReadonlyArray<{
    key: "daily" | "weekdays" | "monday";
    title: string;
    hint: string;
    icon: ReactNode;
  }> = [
    { key: "daily", title: "Every day", hint: "At 9:00", icon: <SvgSunSmall /> },
    { key: "weekdays", title: "Weekdays", hint: "Monday to Friday, 9:00", icon: <SvgBriefcaseSmall /> },
    { key: "monday", title: "Every Monday", hint: "Covers the week before", icon: <SvgCalendar17 /> },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        width: "100%",
        paddingTop: 12,
        paddingBottom: 230,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 10,
          background: "var(--af-surface)",
          boxShadow: "var(--af-shadow-card)",
          fontFamily: "var(--af-font)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "14px 14px 14px 16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 500, color: "var(--af-strong)" }}>
              Weekly digest
            </span>
            <span style={{ fontSize: 12, lineHeight: "16px", color: "var(--af-muted)" }}>
              Sums up merged pull requests and posts them to #eng-updates
            </span>
          </div>

          <AfPopover
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (next) setDraft(cadence);
            }}
            align="end"
            width={280}
            title="Schedule"
            description="The digest runs on its own and posts when it's done."
            trigger={
              <AfButton size="sm" variant="secondary" icon="calendar">
                {labelMap[cadence]}
              </AfButton>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2, margin: "0 -6px" }}>
              {options.map((opt) => {
                const selected = draft === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setDraft(opt.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 8px",
                      border: 0,
                      borderRadius: 8,
                      background: selected ? "var(--af-hover)" : "transparent",
                      color: "var(--af-ink)",
                      font: "inherit",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "none",
                        width: 16,
                        height: 16,
                        color: "var(--af-muted)",
                      }}
                      aria-hidden="true"
                    >
                      {opt.icon}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, lineHeight: "18px", fontWeight: 500, color: "var(--af-ink)" }}>
                        {opt.title}
                      </span>
                      <span style={{ fontSize: 12, lineHeight: "16px", color: "var(--af-muted)" }}>{opt.hint}</span>
                    </span>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: selected ? "var(--af-ink)" : "transparent",
                        flex: "none",
                      }}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 14,
              }}
            >
              <AfButton size="sm" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </AfButton>
              <AfButton
                size="sm"
                variant="primary"
                onClick={() => {
                  setCadence(draft);
                  setOpen(false);
                }}
              >
                Save
              </AfButton>
            </div>
          </AfPopover>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            height: 36,
            padding: "0 16px",
            boxShadow: "inset 0 0.5px 0 var(--af-line)",
            fontSize: 12,
            lineHeight: "16px",
            color: "var(--af-muted)",
          }}
        >
          <span>About 40 credits a run</span>
          <AfPopover
            side="top"
            align="start"
            width={224}
            title="How credits are counted"
            description="Each run reads merged pull requests since the last digest and skips empty days."
            trigger={
              <button
                type="button"
                aria-label="How credits are counted"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  padding: 0,
                  border: 0,
                  borderRadius: 6,
                  background: "transparent",
                  color: "var(--af-faint)",
                  cursor: "pointer",
                }}
              >
                <AfIcon name="info" size={13} />
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------- 3. Hover Card Specimen (1:1 affectUI) ---------------- */

function HoverCardSpecimen() {
  const agents = {
    scout: {
      name: "Scout",
      meta: "Research agent · claude-sonnet-4.5",
      bio: "Reads new issues, finds the cause and drafts a fix for the billing team.",
      status: "Running · 2/3 tasks",
      week: "41 runs · $12.40",
      mask: SCOUT_MASK,
      color: "var(--af-accent-ink)",
    },
    ledger: {
      name: "Ledger",
      meta: "Finance agent · claude-sonnet-4.5",
      bio: "Reconciles weekly usage exports, cost anomalies and invoice credits.",
      status: "Idle · scheduled Mon 9:00",
      week: "12 runs · $3.80",
      mask: LEDGER_MASK,
      color: "var(--af-accent-ink)",
    },
  } as const;

  const files = {
    exportTs: {
      name: "export.ts",
      path: "packages/billing-api/src/export.ts",
      summary: "Streams paginated CSV exports with 30s cursor heartbeats so large billing runs never time out.",
      updated: "2m ago · +18 / −4",
    },
    costCsv: {
      name: "cost-report-w45.csv",
      path: "reports/2026/cost-report-w45.csv",
      summary: "Weekly model spend breakdown across 6 workspaces and 184 scheduled agent runs.",
      updated: "14m ago · 48 KB",
    },
  } as const;

  const renderAgentCard = (key: keyof typeof agents) => {
    const agent = agents[key];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--af-wash)",
            }}
          >
            <PixelAgentMark mask={agent.mask} color={agent.color} />
          </span>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 500, color: "var(--af-strong)" }}>
              {agent.name}
            </span>
            <span style={{ fontSize: 12, lineHeight: "16px", color: "var(--af-muted)" }}>{agent.meta}</span>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "var(--af-text)" }}>{agent.bio}</p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            paddingTop: 10,
            boxShadow: "inset 0 0.5px 0 var(--af-line)",
            fontSize: 12,
            lineHeight: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: "var(--af-muted)" }}>Status</span>
            <span style={{ color: "var(--af-ink)", fontWeight: 500 }}>{agent.status}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: "var(--af-muted)" }}>This week</span>
            <span style={{ color: "var(--af-ink)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
              {agent.week}
            </span>
          </div>
        </div>
        <a
          href="#open-agent"
          onClick={(e) => e.preventDefault()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            width: "100%",
            height: 28,
            borderRadius: 6,
            background: "var(--af-surface)",
            boxShadow: "var(--af-shadow-hairline)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--af-ink)",
            textDecoration: "none",
          }}
        >
          <span>Open agent</span>
          <span style={{ color: "var(--af-muted)", lineHeight: 0, display: "inline-flex" }}>
            <AfIcon name="arrowUpRight" size={12} />
          </span>
        </a>
      </div>
    );
  };

  const renderFileCard = (key: keyof typeof files) => {
    const file = files[key];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontFamily: "var(--af-mono)", fontSize: 12, fontWeight: 500, color: "var(--af-strong)" }}>
            {file.name}
          </span>
          <span style={{ fontFamily: "var(--af-mono)", fontSize: 11, color: "var(--af-muted)" }}>{file.path}</span>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: "18px", color: "var(--af-text)" }}>{file.summary}</p>
        <span style={{ fontSize: 11.5, color: "var(--af-faint)", fontVariantNumeric: "tabular-nums" }}>
          {file.updated}
        </span>
      </div>
    );
  };

  const agentLinkStyle: CSSProperties = {
    padding: 0,
    border: 0,
    background: "transparent",
    color: "var(--af-strong)",
    font: "inherit",
    fontWeight: 500,
    textDecoration: "underline dotted var(--af-faint)",
    textUnderlineOffset: "3px",
    cursor: "pointer",
  };

  const fileLinkStyle: CSSProperties = {
    padding: 0,
    border: 0,
    background: "transparent",
    color: "var(--af-ink)",
    fontFamily: "var(--af-mono)",
    fontSize: 12,
    fontWeight: 400,
    textDecoration: "underline dotted var(--af-faint)",
    textUnderlineOffset: "3px",
    cursor: "pointer",
  };

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 16px",
    fontSize: 13,
    lineHeight: "20px",
    color: "var(--af-text)",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        width: "100%",
        paddingTop: 12,
        paddingBottom: 150,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "4px 0 8px",
          borderRadius: 10,
          background: "var(--af-surface)",
          boxShadow: "var(--af-shadow-card)",
          fontFamily: "var(--af-font)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 40,
            padding: "0 16px",
            fontSize: 10,
            lineHeight: "16px",
            fontWeight: 500,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            color: "var(--af-muted)",
          }}
        >
          Activity
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={rowStyle}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
              <span style={{ marginTop: 4, display: "inline-flex", flex: "none" }}>
                <PixelAgentMark mask={SCOUT_MASK} color="var(--af-accent-ink)" />
              </span>
              <span>
                <AfHoverCard defaultOpen width={288} align="start" content={renderAgentCard("scout")}>
                  <button type="button" style={agentLinkStyle}>
                    Scout
                  </button>
                </AfHoverCard>{" "}
                opened a fix for{" "}
                <AfHoverCard width={272} align="start" content={renderFileCard("exportTs")}>
                  <button type="button" style={fileLinkStyle}>
                    export.ts
                  </button>
                </AfHoverCard>
              </span>
            </div>
            <span style={{ flex: "none", fontSize: 12, lineHeight: "20px", color: "var(--af-faint)" }}>2m</span>
          </div>

          <div style={rowStyle}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
              <span style={{ marginTop: 4, display: "inline-flex", flex: "none" }}>
                <PixelAgentMark mask={LEDGER_MASK} color="var(--af-accent-ink)" />
              </span>
              <span>
                <AfHoverCard width={288} align="start" content={renderAgentCard("ledger")}>
                  <button type="button" style={agentLinkStyle}>
                    Ledger
                  </button>
                </AfHoverCard>{" "}
                finished the weekly report{" "}
                <AfHoverCard width={272} align="start" content={renderFileCard("costCsv")}>
                  <button type="button" style={fileLinkStyle}>
                    cost-report-w45.csv
                  </button>
                </AfHoverCard>
              </span>
            </div>
            <span style={{ flex: "none", fontSize: 12, lineHeight: "20px", color: "var(--af-faint)" }}>14m</span>
          </div>

          <div style={rowStyle}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
              <span style={{ marginTop: 4, display: "inline-flex", flex: "none" }}>
                <PixelAgentMark mask={SCOUT_MASK} color="var(--af-accent-ink)" />
              </span>
              <span>
                <AfHoverCard width={288} align="start" content={renderAgentCard("scout")}>
                  <button type="button" style={agentLinkStyle}>
                    Scout
                  </button>
                </AfHoverCard>{" "}
                is drafting replies to 14 support tickets
              </span>
            </div>
            <span style={{ flex: "none", fontSize: 12, lineHeight: "20px", color: "var(--af-faint)" }}>1h</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 4. Tooltip Specimen (1:1 affectUI) ---------------- */

function TooltipSpecimen() {
  const [liked, setLiked] = useState(true);
  const [pinned, setPinned] = useState(false);
  const fullTitle = "Summarise last week's support tickets and draft replies for the billing team";

  const topBtnStyle = (active = false): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    padding: 0,
    border: 0,
    borderRadius: 6,
    background: active ? "var(--af-hover)" : "var(--af-surface)",
    boxShadow: "var(--af-shadow-hairline)",
    color: active ? "var(--af-ink)" : "var(--af-muted)",
    cursor: "pointer",
  });

  const footBtnStyle = (active = false): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    padding: 0,
    border: 0,
    borderRadius: 6,
    background: active ? "var(--af-hover)" : "transparent",
    color: active ? "var(--af-ink)" : "var(--af-muted)",
    cursor: "pointer",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          borderRadius: 10,
          background: "var(--af-surface)",
          boxShadow: "var(--af-shadow-card)",
          fontFamily: "var(--af-font)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            height: 52,
            padding: "0 12px 0 16px",
            boxShadow: "inset 0 -0.5px 0 var(--af-line)",
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: "flex", overflow: "hidden" }}>
            <AfTooltip content={fullTitle}>
              <button
                type="button"
                style={{
                  display: "block",
                  width: "100%",
                  minWidth: 0,
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  color: "var(--af-strong)",
                  font: "inherit",
                  fontSize: 13,
                  lineHeight: "20px",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: "default",
                  textAlign: "left",
                }}
              >
                {fullTitle}
              </button>
            </AfTooltip>
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flex: "none" }}>
            <AfTooltip defaultOpen side="bottom" content="Search runs" shortcut="⌘K">
              <button type="button" aria-label="Search runs" style={topBtnStyle()}>
                <AfIcon name="search" size={14} />
              </button>
            </AfTooltip>
            <AfTooltip side="bottom" content="Filter">
              <button type="button" aria-label="Filter" style={topBtnStyle()}>
                <SvgSlidersHorizontal />
              </button>
            </AfTooltip>
            <AfTooltip side="bottom" content={pinned ? "Unpin run" : "Pin run"}>
              <button
                type="button"
                aria-label="Pin run"
                aria-pressed={pinned}
                onClick={() => setPinned((v) => !v)}
                style={topBtnStyle(pinned)}
              >
                <SvgPushPin />
              </button>
            </AfTooltip>
            <AfTooltip side="bottom" content="Share">
              <button type="button" aria-label="Share" style={topBtnStyle()}>
                <SvgShareNodes />
              </button>
            </AfTooltip>
          </div>
        </div>

        <div style={{ padding: "14px 16px 10px" }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "var(--af-ink)" }}>
            Summarised 14 support tickets – three mention the export timeout, so I drafted a reply and opened a fix in
            billing-api.
          </p>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 2, margin: "8px 0 0 -4px" }}>
            <AfTooltip side="bottom" content="Copy">
              <button type="button" aria-label="Copy" style={footBtnStyle()}>
                <AfIcon name="copy" size={13} />
              </button>
            </AfTooltip>
            <AfTooltip side="bottom" content="Good answer">
              <button
                type="button"
                aria-label="Good answer"
                aria-pressed={liked}
                onClick={() => setLiked((v) => !v)}
                style={footBtnStyle(liked)}
              >
                <AfIcon name="thumbsUp" size={13} />
              </button>
            </AfTooltip>
            <AfTooltip side="bottom" content="Regenerate">
              <button type="button" aria-label="Regenerate" style={footBtnStyle()}>
                <AfIcon name="refresh" size={13} />
              </button>
            </AfTooltip>
            <AfTooltip side="bottom" content="More">
              <button type="button" aria-label="More" style={footBtnStyle()}>
                <AfIcon name="more" size={13} />
              </button>
            </AfTooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 5. Modal / Dialog Specimen (1:1 affectUI) ---------------- */

type AgentItem = {
  id: string;
  name: string;
  cadence: string;
  instructions: string;
  pastRuns: number;
  mask: readonly (0 | 1)[];
  color: string;
};

function ModalSpecimen() {
  const [frameEl, setFrameEl] = useState<HTMLElement | null>(null);
  const [userOpened, setUserOpened] = useState(false);
  const [agents, setAgents] = useState<AgentItem[]>([
    {
      id: "rn",
      name: "Release notes writer",
      cadence: "Every Monday · posts to #eng-updates",
      instructions:
        "Sum up last week's merged pull requests in plain words. Group them by area, leave out chores and dependency bumps.",
      pastRuns: 14,
      mask: WRITER_MASK,
      color: "var(--af-accent-ink)",
    },
    {
      id: "triage",
      name: "Inbox triage",
      cadence: "On every new email · labels and drafts replies",
      instructions:
        "Classify incoming support emails by urgency, attach billing context, and prepare a concise draft reply.",
      pastRuns: 212,
      mask: TRIAGE_MASK,
      color: "#a651f0",
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>("rn");
  const [draftName, setDraftName] = useState("Release notes writer");
  const [draftPrompt, setDraftPrompt] = useState(
    "Sum up last week's merged pull requests in plain words. Group them by area, leave out chores and dependency bumps.",
  );
  const [deletingAgent, setDeletingAgent] = useState<AgentItem | null>(null);

  const openEdit = (agent: AgentItem) => {
    setUserOpened(true);
    setEditingId(agent.id);
    setDraftName(agent.name);
    setDraftPrompt(agent.instructions);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <section
        ref={setFrameEl}
        aria-label="Agents"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          height: 432,
          borderRadius: 12,
          background: "var(--af-surface)",
          boxShadow: "var(--af-shadow-card)",
          overflow: "hidden",
          fontFamily: "var(--af-font)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: 44,
            padding: "0 16px",
            boxShadow: "inset 0 -0.5px 0 var(--af-line)",
          }}
        >
          <span
            style={{
              fontSize: 10,
              lineHeight: "16px",
              fontWeight: 500,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              color: "var(--af-text)",
            }}
          >
            Agents
          </span>
          <span
            style={{
              fontSize: 12,
              lineHeight: "16px",
              color: "var(--af-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {agents.length}
          </span>
        </header>

        <div style={{ display: "flex", flexDirection: "column", padding: "4px 0" }}>
          {agents.map((agent) => (
            <div
              key={agent.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                height: 60,
                padding: "0 12px 0 16px",
                boxShadow: "inset 0 -0.5px 0 var(--af-line)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 16,
                    height: 16,
                    flex: "none",
                  }}
                >
                  <PixelAgentMark mask={agent.mask} color={agent.color} />
                </span>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 500, color: "var(--af-strong)" }}>
                    {agent.name}
                  </span>
                  <span style={{ fontSize: 12, lineHeight: "16px", color: "var(--af-muted)" }}>{agent.cadence}</span>
                </div>
              </div>

              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, flex: "none" }}>
                <button
                  type="button"
                  onClick={() => openEdit(agent)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    height: 24,
                    padding: "0 8px 0 7px",
                    border: 0,
                    borderRadius: 6,
                    background: "var(--af-surface)",
                    boxShadow: "var(--af-shadow-hairline)",
                    color: "var(--af-ink)",
                    font: "inherit",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ color: "var(--af-muted)", display: "inline-flex", lineHeight: 0 }}>
                    <SvgPencilEdit />
                  </span>
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${agent.name}`}
                  title="Delete"
                  disabled={agents.length <= 1}
                  onClick={() => {
                    setUserOpened(true);
                    setDeletingAgent(agent);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    padding: 0,
                    border: 0,
                    borderRadius: 6,
                    background: "transparent",
                    color: "var(--af-muted)",
                    opacity: agents.length <= 1 ? 0.4 : 1,
                    cursor: agents.length <= 1 ? "default" : "pointer",
                  }}
                >
                  <AfIcon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <AfModal
          open={Boolean(editingId)}
          onClose={() => setEditingId(null)}
          contained
          container={frameEl}
          autoFocus={userOpened}
          closeButton
          size="md"
          title="Edit agent"
          description="Changes apply from its next run."
          footer={
            <>
              <AfButton size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                Cancel
              </AfButton>
              <AfButton
                size="sm"
                variant="primary"
                onClick={() => {
                  if (editingId && draftName.trim()) {
                    setAgents((prev) =>
                      prev.map((item) =>
                        item.id === editingId
                          ? { ...item, name: draftName.trim(), instructions: draftPrompt }
                          : item,
                      ),
                    );
                  }
                  setEditingId(null);
                }}
              >
                Save
              </AfButton>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <AfInput label="Name" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
            <AfTextarea
              label="Instructions"
              rows={3}
              resize="none"
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
            />
          </div>
        </AfModal>

        <AfAlertDialog
          open={Boolean(deletingAgent)}
          onClose={() => setDeletingAgent(null)}
          contained
          container={frameEl}
          title={deletingAgent ? `Delete ${deletingAgent.name}?` : "Delete agent?"}
          description={
            deletingAgent
              ? `It stops running, and its ${deletingAgent.pastRuns} past runs are deleted with it. This can't be undone.`
              : "Scheduled runs will stop immediately."
          }
          cancelText="Keep it"
          confirmText="Delete agent"
          tone="danger"
          onConfirm={() => {
            if (deletingAgent) {
              setAgents((prev) => (prev.length > 1 ? prev.filter((a) => a.id !== deletingAgent.id) : prev));
            }
            setDeletingAgent(null);
          }}
        />
      </section>
    </div>
  );
}

/* ---------------- 6. Context Menu Specimen (1:1 affectUI) ---------------- */

type ContextFileEntry = {
  id: string;
  name: string;
  folder: string;
  size: string;
  age: string;
  pinned: boolean;
  color: string;
  kind: "pdf" | "code" | "csv" | "image";
};

function renderFileKindSvg(kind: ContextFileEntry["kind"]) {
  if (kind === "pdf") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 13V10.66C20 9.84 20 9.43 19.85 9.06C19.7 8.7 19.41 8.41 18.83 7.83L14.09 3.09C13.59 2.59 13.34 2.34 13.03 2.2C12.51 2 12.16 2 11.46 2C8.21 2 6.59 2 5.49 2.89C4 4.59 4 6.21 4 9.46V13M13 2.5V3C13 5.83 13 7.24 13.88 8.12C14.76 9 16.17 9 19 9H19.5" />
        <path d="M19.75 16H17.25C16.7 16 16.25 16.45 16.25 17V22M16.25 19H19.25M4.25 22V16H6C6.97 16 7.75 16.78 7.75 17.75C7.75 18.72 6.97 19.5 6 19.5H4.25M10.25 16H11.75C12.85 16 13.75 16.9 13.75 18V20C13.75 21.1 12.85 22 11.75 22H10.25V16Z" />
      </svg>
    );
  }
  if (kind === "code") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 15V10.66C20 9.84 20 9.43 19.85 9.07C19.7 8.7 19.41 8.41 18.83 7.83L14.09 3.09C13.59 2.59 13.34 2.34 13.03 2.2C12.51 2 12.16 2 11.46 2C8.21 2 6.59 2 5.49 2.89C4 4.59 4 6.21 4 9.46V14.01C4 17.78 4 19.66 5.17 20.84C6.11 21.78 7.52 21.96 10 22M13 2.5V3C13 5.83 13 7.24 13.88 8.12C14.76 9 16.17 9 19 9H19.5" />
        <path d="M14.33 22L13.12 20.91C12.37 20.25 12 19.91 12 19.5C12 19.09 12.37 18.75 13.12 18.09L14.33 17M17.67 22L18.88 20.91C19.63 20.25 20 19.91 20 19.5C20 19.09 19.63 18.75 18.88 18.09L17.67 17" />
      </svg>
    );
  }
  if (kind === "csv") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 13V10.66C20 9.84 20 9.43 19.85 9.06C19.7 8.7 19.41 8.41 18.83 7.83L14.09 3.09C13.59 2.59 13.34 2.34 13.03 2.2C12.51 2 12.16 2 11.46 2C8.21 2 6.59 2 5.49 2.89C4 4.59 4 6.21 4 9.46V13M13 2.5V3C13 5.83 13 7.24 13.88 8.12C14.76 9 16.17 9 19 9H19.5" />
        <path d="M7.5 17.2C7.4 16 6.6 16 5.5 16C3.8 16 3.5 16.4 3.5 18V20C3.5 21.6 3.8 22 5.5 22C6.6 22 7.4 22 7.5 20.8M20.5 16L18.7 20.7C18.4 21.6 18.2 22 18 22C17.7 22 17.5 21.6 17.2 20.7L15.4 16M12.9 16H11.5C10.5 16 10.2 16.6 10.2 17.5C10.2 18.4 10.5 19 11.7 19C12.9 19 13.2 19.6 13.2 20.5C13.2 21.4 12.9 22 11.7 22H10.4" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="7.5" r="1.5" />
      <path d="M2.5 12C2.5 7.52 2.5 5.28 3.89 3.89C5.28 2.5 7.52 2.5 12 2.5C16.48 2.5 18.72 2.5 20.11 3.89C21.5 5.28 21.5 7.52 21.5 12C21.5 16.48 21.5 18.72 20.11 20.11C18.72 21.5 16.48 21.5 12 21.5C7.52 21.5 5.28 21.5 3.89 20.11C2.5 18.72 2.5 16.48 2.5 12Z" />
      <path d="M5 21C9.37 15.78 14.27 8.88 21.5 13.54" />
    </svg>
  );
}

function ContextMenuSpecimen() {
  const [selectedId, setSelectedId] = useState<string>("export");
  const [sortBy, setSortBy] = useState<"modified" | "name" | "size">("modified");
  const [note, setNote] = useState("Right-click a file or the space below – or Shift F10 on a file");
  const [files, setFiles] = useState<ContextFileEntry[]>([
    {
      id: "summary",
      name: "Support tickets – weekly summary.pdf",
      folder: "Agents",
      size: "412 KB",
      age: "1h ago",
      pinned: true,
      color: "rgb(242, 138, 46)",
      kind: "pdf",
    },
    {
      id: "export",
      name: "export.ts",
      folder: "Agents",
      size: "3 KB",
      age: "2m ago",
      pinned: false,
      color: "rgb(1, 144, 254)",
      kind: "code",
    },
    {
      id: "report",
      name: "cost-report-w45.csv",
      folder: "Evals",
      size: "48 KB",
      age: "14m ago",
      pinned: false,
      color: "rgb(95, 200, 138)",
      kind: "csv",
    },
    {
      id: "chart",
      name: "latency-by-model.png",
      folder: "Experiments",
      size: "96 KB",
      age: "Yesterday",
      pinned: false,
      color: "rgb(166, 81, 240)",
      kind: "image",
    },
  ]);

  const buildMenuItems = (target: HTMLElement): AfContextMenuItem[] => {
    const fileRow = target.closest<HTMLElement>("[data-file]");
    const fileId = fileRow?.getAttribute("data-file");
    const file = files.find((f) => f.id === fileId);

    if (file) {
      return [
        {
          id: "open",
          label: "Open",
          icon: "eye",
          shortcut: "⌘O",
          onSelect: () => setNote(`Opened ${file.name}`),
        },
        {
          id: "download",
          label: "Download",
          icon: "download",
          onSelect: () => setNote(`Downloaded ${file.name}`),
        },
        {
          id: "copy-link",
          label: "Copy link",
          icon: "link",
          shortcut: "⌘L",
          onSelect: () => setNote(`Copied link to ${file.name}`),
        },
        {
          id: "duplicate",
          label: "Duplicate",
          icon: "copy",
          shortcut: "⌘D",
          onSelect: () => setNote(`Duplicated ${file.name}`),
        },
        {
          id: "move-to",
          divider: true,
          label: "Move to",
          icon: <SvgFolderGlyph />,
          submenu: ["Agents", "Evals", "Experiments", "Archive"].map((dest) => ({
            type: "radio" as const,
            id: `dest-${dest}`,
            label: dest,
            checked: file.folder === dest,
            onSelect: () => {
              setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, folder: dest } : f)));
              setNote(`Moved ${file.name} to ${dest}`);
            },
          })),
        },
        {
          type: "checkbox",
          id: "pin",
          keepOpen: true,
          icon: <SvgPushPin size={14} />,
          label: "Pin to top",
          checked: file.pinned,
          onCheckedChange: (checked) => {
            setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, pinned: checked } : f)));
            setNote(`${checked ? "Pinned" : "Unpinned"} ${file.name}`);
          },
        },
        {
          id: "delete",
          divider: true,
          danger: true,
          icon: "trash",
          label: "Delete file",
          onSelect: () => {
            setFiles((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== file.id) : prev));
            setNote(`Deleted ${file.name}`);
          },
        },
      ];
    }

    return [
      {
        id: "new-folder",
        label: "New folder",
        icon: <SvgFolderGlyph />,
        shortcut: "⇧⌘N",
        onSelect: () => setNote("Created new folder"),
      },
      {
        id: "upload",
        label: "Upload file…",
        icon: "upload",
        shortcut: "⌘U",
        onSelect: () => setNote("Opened file picker"),
      },
      {
        id: "sort-sub",
        divider: true,
        label: "Sort by",
        icon: <SvgSlidersHorizontal />,
        submenu: [
          {
            type: "radio",
            id: "s-mod",
            label: "Last modified",
            checked: sortBy === "modified",
            onSelect: () => {
              setSortBy("modified");
              setNote("Sorted by last modified");
            },
          },
          {
            type: "radio",
            id: "s-name",
            label: "Name",
            checked: sortBy === "name",
            onSelect: () => {
              setSortBy("name");
              setNote("Sorted by name");
            },
          },
          {
            type: "radio",
            id: "s-size",
            label: "Size",
            checked: sortBy === "size",
            onSelect: () => {
              setSortBy("size");
              setNote("Sorted by size");
            },
          },
        ],
      },
    ];
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <section
        aria-label="Run files"
        style={{
          width: "100%",
          maxWidth: 400,
          padding: "4px 0 0",
          borderRadius: 10,
          background: "var(--af-surface)",
          boxShadow: "var(--af-shadow-card)",
          fontFamily: "var(--af-font)",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 40,
            padding: "0 16px",
          }}
        >
          <span
            style={{
              fontSize: 10,
              lineHeight: "16px",
              fontWeight: 500,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              color: "var(--af-muted)",
            }}
          >
            Files
          </span>
          <span
            style={{
              fontSize: 12,
              lineHeight: "16px",
              color: "var(--af-faint)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {files.length}
          </span>
        </header>

        <AfContextMenu
          items={buildMenuItems}
          aria-label="File actions"
          onOpenChange={(isOpen, target) => {
            if (isOpen && target) {
              const id = target.closest<HTMLElement>("[data-file]")?.getAttribute("data-file");
              if (id) setSelectedId(id);
            }
          }}
        >
          <div style={{ boxSizing: "border-box", height: 264, padding: "0 8px 8px" }}>
            <ul
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                margin: 0,
                padding: 0,
                listStyle: "none",
              }}
            >
              {files.map((file) => {
                const isPressed = selectedId === file.id;
                return (
                  <li key={file.id}>
                    <button
                      type="button"
                      data-context-target
                      data-file={file.id}
                      aria-pressed={isPressed}
                      onClick={() => setSelectedId(file.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        width: "100%",
                        height: 52,
                        padding: "0 8px",
                        border: 0,
                        borderRadius: 8,
                        background: isPressed ? "var(--af-press)" : "transparent",
                        color: "var(--af-ink)",
                        font: "inherit",
                        textAlign: "left",
                        cursor: "default",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flex: "none",
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "var(--af-wash)",
                          color: file.color,
                        }}
                      >
                        {renderFileKindSvg(file.kind)}
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            minWidth: 0,
                            fontSize: 13,
                            lineHeight: "20px",
                            fontWeight: 500,
                            color: "var(--af-strong)",
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {file.name}
                          </span>
                          {file.pinned ? (
                            <span style={{ color: "var(--af-muted)", display: "inline-flex", flex: "none" }} aria-label="Pinned">
                              <SvgPushPin size={12} />
                            </span>
                          ) : null}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            lineHeight: "16px",
                            color: "var(--af-muted)",
                            fontVariantNumeric: "tabular-nums",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {file.folder} · {file.size} · {file.age}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </AfContextMenu>

        <p
          aria-live="polite"
          style={{
            height: 40,
            margin: 0,
            padding: "0 16px",
            boxShadow: "inset 0 0.5px 0 var(--af-line)",
            fontSize: 12,
            lineHeight: "40px",
            color: "var(--af-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {note}
        </p>
      </section>
    </div>
  );
}

/* ---------------- 7. Aster Native Overlay Specimens ---------------- */

function ImperativeConfirmTrigger() {
  const confirm = useAfConfirm();
  const [status, setStatus] = useState("Active");
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <AfButton
        variant="secondary"
        aria-haspopup="dialog"
        onClick={async () => {
          const ok = await confirm({
            title: "Reset webhook secret?",
            description: "Existing integrations will reject payloads until updated with the new signing secret.",
            confirmText: "Rotate secret",
            cancelText: "Keep current",
            tone: "danger",
          });
          setStatus(ok ? "Rotated just now" : "Unchanged");
        }}
      >
        useAfConfirm()
      </AfButton>
      <span style={{ fontSize: "var(--af-fs-xs)", color: "var(--af-muted)" }}>{status}</span>
    </div>
  );
}

function AlertDialogSpecimen() {
  const [open, setOpen] = useState(false);

  return (
    <AfConfirmProvider>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <AfButton variant="destructive" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          Revoke API key
        </AfButton>
        <ImperativeConfirmTrigger />

        <AfAlertDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Revoke production key?"
          description="Key sk-live-•••84f2 will stop authenticating requests immediately. This action cannot be undone."
          cancelText="Cancel"
          confirmText="Revoke key"
          tone="danger"
          onConfirm={() => new Promise((resolve) => setTimeout(resolve, 450))}
        />
      </div>
    </AfConfirmProvider>
  );
}

function DrawerSpecimen() {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<AfDrawerPlacement>("right");

  const openWith = (nextSide: AfDrawerPlacement) => {
    setSide(nextSide);
    setOpen(true);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
      <AfButton variant="primary" aria-haspopup="dialog" onClick={() => openWith("right")}>
        Open right sheet
      </AfButton>
      <AfButton variant="secondary" aria-haspopup="dialog" onClick={() => openWith("left")}>
        Left sheet
      </AfButton>
      <AfButton variant="secondary" aria-haspopup="dialog" onClick={() => openWith("bottom")}>
        Bottom sheet
      </AfButton>

      <AfDrawer
        open={open}
        onClose={() => setOpen(false)}
        side={side}
        width={380}
        height={280}
        title="Run #418 · Nightly evals"
        description="Completed in 1m 42s · 142/142 assertions passed"
        footer={
          <>
            <AfButton variant="secondary" onClick={() => setOpen(false)}>
              Close
            </AfButton>
            <AfButton variant="primary" onClick={() => setOpen(false)}>
              Export trace
            </AfButton>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "var(--af-fs-sm)" }}>
          <div style={{ padding: 10, borderRadius: "var(--af-r-md)", background: "var(--af-wash)" }}>
            <strong style={{ display: "block", color: "var(--af-strong)", marginBottom: 4 }}>Summary</strong>
            <span>Model latency p95 improved by 14% compared to baseline w40.</span>
          </div>
          <div style={{ padding: 10, borderRadius: "var(--af-r-md)", background: "var(--af-wash)" }}>
            <strong style={{ display: "block", color: "var(--af-strong)", marginBottom: 4 }}>Artifacts</strong>
            <span>report-w41.json · trace-418.zip · coverage.lcov</span>
          </div>
        </div>
      </AfDrawer>
    </div>
  );
}

function ToastButtonsBar() {
  const toast = useAfToast();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
      <AfButton
        size="sm"
        variant="secondary"
        onClick={() =>
          toast.push({
            title: "Draft saved",
            description: "Q3 Board Report · all changes kept",
            tone: "success",
          })
        }
      >
        Save draft
      </AfButton>
      <AfButton
        size="sm"
        variant="secondary"
        onClick={() =>
          toast.show("Moved Q3 Board Report to trash", "neutral", {
            label: "Undo",
            onClick: () => toast.show("Restored Q3 Board Report", "success"),
          })
        }
      >
        Delete file
      </AfButton>
      <AfButton
        size="sm"
        variant="secondary"
        onClick={() =>
          toast.promise(new Promise((resolve) => setTimeout(resolve, 900)), {
            loading: "Uploading Q3 Board Report…",
            success: "Report uploaded",
            error: "Upload failed",
            description: "Finance · 2.4 MB PDF",
          })
        }
      >
        Upload report
      </AfButton>
      <AfButton
        size="sm"
        variant="secondary"
        onClick={() =>
          toast.push({
            title: "Workspace synced",
            description: "14 comments and 2 tables up to date",
            tone: "info",
          })
        }
      >
        Sync
      </AfButton>
    </div>
  );
}

function ToastProviderSpecimen() {
  return (
    <AfToastProvider>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            borderRadius: "var(--af-r-lg)",
            background: "var(--af-surface)",
            boxShadow: "var(--af-shadow-card)",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <strong style={{ fontSize: "var(--af-fs-md)", fontWeight: 600, color: "var(--af-strong)" }}>
              Q3 Board Report
            </strong>
            <span style={{ fontSize: "var(--af-fs-xs)", color: "var(--af-muted)" }}>
              Finance · edited 2 min ago
            </span>
          </div>
          <ToastButtonsBar />
        </div>
        <span style={{ fontSize: "var(--af-fs-xs)", color: "var(--af-muted)" }}>
          Press F8 to jump to notifications
        </span>
      </div>
    </AfToastProvider>
  );
}

const PALETTE_COMMANDS: AfCommand[] = [
  {
    id: "write-email",
    group: "Suggestions",
    label: "Write an email",
    hint: "Gmail",
    kbd: "⌘1",
    icon: "mail",
    keywords: ["compose", "draft", "gmail"],
  },
  {
    id: "ask-assistant",
    group: "Suggestions",
    label: "Ask assistant",
    hint: "Summaries, drafts, answers",
    kbd: "⌘2",
    icon: "sparkle",
    keywords: ["ai", "claude", "chat"],
    children: [
      { id: "m-sonnet", group: "Models", label: "Claude 4.5 Sonnet", hint: "Balanced", icon: "bolt" },
      { id: "m-opus", group: "Models", label: "Claude 4.5 Opus", hint: "Deep reasoning", icon: "sparkle" },
      { id: "m-flash", group: "Models", label: "Gemini 2.5 Pro", hint: "Fast 1M context", icon: "flash" },
    ],
  },
  {
    id: "create-task",
    group: "Suggestions",
    label: "Create a task",
    hint: "ClickUp",
    kbd: "⌘3",
    icon: "task",
    keywords: ["todo", "issue", "ticket"],
  },
  {
    id: "add-crm",
    group: "Suggestions",
    label: "Add contact to CRM",
    hint: "HubSpot",
    kbd: "⌘4",
    icon: "users",
    keywords: ["lead", "customer", "hubspot"],
  },
  {
    id: "schedule-meeting",
    group: "Suggestions",
    label: "Schedule a meeting",
    hint: "Google Calendar",
    kbd: "⌘5",
    icon: "calendar",
    keywords: ["call", "invite", "calendar"],
  },
  {
    id: "post-update",
    group: "Share",
    label: "Post an update",
    hint: "#team-updates",
    icon: "slack",
    keywords: ["channel", "slack"],
  },
  {
    id: "save-page",
    group: "Share",
    label: "Save as page",
    hint: "Notion · Meeting notes",
    icon: "file",
    keywords: ["doc", "notion", "export"],
  },
  {
    id: "new-doc",
    group: "General",
    label: "New document",
    kbd: "N",
    icon: "plus",
  },
  {
    id: "invite-team",
    group: "General",
    label: "Invite teammates",
    kbd: "I",
    icon: "user",
  },
  {
    id: "upload-files",
    group: "General",
    label: "Upload files",
    kbd: "U",
    icon: "upload",
  },
  {
    id: "go-home",
    group: "Go to",
    label: "Home",
    kbd: "G H",
    icon: "home",
  },
  {
    id: "go-inbox",
    group: "Go to",
    label: "Inbox",
    kbd: "G I",
    icon: "inbox",
  },
  {
    id: "go-reports",
    group: "Go to",
    label: "Reports",
    kbd: "G R",
    icon: "chart",
  },
  {
    id: "go-settings",
    group: "Go to",
    label: "Settings",
    kbd: "G S",
    icon: "settings",
  },
];

function CommandPaletteSpecimen() {
  const [open, setOpen] = useState(false);
  const [lastCmd, setLastCmd] = useState("None yet");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <AfButton variant="primary" icon="search" kbd="⌘K" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Open command palette
      </AfButton>
      <span style={{ fontSize: "var(--af-fs-xs)", color: "var(--af-muted)" }}>
        Last executed: <strong style={{ color: "var(--af-ink)" }}>{lastCmd}</strong>
      </span>
      <AfCommandPalette
        open={open}
        onClose={() => setOpen(false)}
        commands={PALETTE_COMMANDS}
        placeholder="Type a command or search…"
        onRun={(cmd) => setLastCmd(cmd.label)}
      />
    </div>
  );
}

function MessageSpecimen() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
      <AfButton size="sm" variant="primary" onClick={() => afMessage.success("Configuration saved")}>
        Success
      </AfButton>
      <AfButton size="sm" variant="secondary" onClick={() => afMessage.info("Indexing 24 files in background")}>
        Info
      </AfButton>
      <AfButton size="sm" variant="secondary" onClick={() => afMessage.warning("Rate limit at 85% capacity")}>
        Warning
      </AfButton>
      <AfButton size="sm" variant="secondary" onClick={() => afMessage.error("Connection timed out")}>
        Error
      </AfButton>
      <AfButton size="sm" variant="ghost" onClick={() => afMessage.destroy()}>
        Clear all
      </AfButton>
    </div>
  );
}

export const overlaysSpecs: ComponentSpec[] = [
  {
    id: "dropdown-menu",
    title: "Dropdown Menu",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。90ms 浮动底块高亮、左侧单选圆圈与右侧描线打勾、keepOpen 复选、斜角安全多级子菜单与 A–Z 快跳。",
    render: DropdownMenuSpecimen,
    width: 720,
    height: 440,
  },
  {
    id: "popover",
    title: "Popover",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。四向自动翻转锚定浮层，支持结构化标题头、父元素/Ref/触发器三模式与 115ms 方向微缩退场。",
    render: PopoverSpecimen,
    width: 720,
    height: 440,
  },
  {
    id: "hover-card",
    title: "Hover Card",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。悬停走廊无损桥接、320ms 相邻零延迟切换且不抢夺键盘焦点，保留卡片内完整可点击交互。",
    render: HoverCardSpecimen,
    width: 720,
    height: 420,
  },
  {
    id: "tooltip",
    title: "Tooltip",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。支持 300ms 热窗口相邻零延迟跟随、2px 方向微移、快捷键徽章与触屏防粘滞。",
    render: TooltipSpecimen,
    width: 700,
    height: 300,
  },
  {
    id: "modal",
    title: "Modal",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。支持 sm/md/lg 档位、正文滚动上下动态发丝分隔线、遮罩按下释放防误关与锁定脉冲提醒。",
    render: ModalSpecimen,
    width: 700,
    height: 460,
  },
  {
    id: "context-menu",
    title: "Context Menu",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。支持动态 items(target)、右键激活行高亮锁、Shift+F10/长按触发、斜角安全子菜单与 A–Z 快跳。",
    render: ContextMenuSpecimen,
    width: 720,
    height: 400,
  },
  {
    id: "alert-dialog",
    title: "Alert Dialog",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。高风险操作二次确认对话框与 useAfConfirm 命令式调用，默认聚焦安全取消按钮。",
    render: AlertDialogSpecimen,
    width: 720,
    height: 260,
  },
  {
    id: "drawer",
    title: "Drawer",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件（Drawer / Sheet）。支持右/左/底三向滑入滑出、滚动发丝分隔线与移动端底栏自适应。",
    render: DrawerSpecimen,
    width: 720,
    height: 320,
  },
  {
    id: "toast-provider",
    title: "Toast Provider",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。右下堆叠通知容器，支持悬停展开暂停、横向拖拽滑出关闭、F8 聚焦与 Promise 状态变形。",
    render: ToastProviderSpecimen,
    width: 720,
    height: 300,
  },
  {
    id: "command-palette",
    title: "Command Palette",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。支持应用徽标、模糊高亮检索、多级命令栈、Tab 跨分组跳转与 ⌘1–⌘5 热键直达。",
    render: CommandPaletteSpecimen,
    width: 720,
    height: 320,
  },
  {
    id: "message",
    title: "Message",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。全局命令式轻提示（afMessage.info / success / warning / error / loading / destroy），挂载于主题浮层内。",
    render: MessageSpecimen,
    width: 720,
  },
];
