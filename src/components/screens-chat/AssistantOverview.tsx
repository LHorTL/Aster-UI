import {
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AfIcon } from "../../icons";
import { NavBrandLogo } from "../navigation/_brand";
import { AfButton } from "../controls/Button";
import { AfChatComposer } from "../chat/ChatComposer";
import { AfEmptyState } from "../display/EmptyState";
import { AfSkeleton } from "../display/Skeleton";
import {
  ChatInsetShell,
  DEFAULT_SHELL_ARTIFACTS,
  middleTruncateFileName,
  type AfChatScreenUser,
} from "./ChatShell";

export type AfAssistantOverviewProps = HTMLAttributes<HTMLDivElement> & {
  /** Called with the label of a sidebar item – and with `"Chat"` or `"Folders"` from card rows and `"N more"`. */
  onNavigate?: (label: string) => void;
  /** Workspace name in the sidebar, defaults to `"Acme"`. */
  workspace?: string;
  /** Account at the bottom of the sidebar, defaults to `{ name: "Alex Morgan" }`. */
  user?: AfChatScreenUser;
  /** Skeleton placeholders in the shape of activity, chats, usage, files and numbers. */
  loading?: boolean;
  /** New workspace state: composer stays, board shows `"Nothing here yet"` + `"Start a chat"` focusing composer. */
  empty?: boolean;
};

type ActivityDay = {
  index: number;
  label: string;
  chats: number;
  level: 0 | 1 | 2 | 3 | 4;
};

const MONTHS = ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

function buildActivityDays(): ActivityDay[] {
  const totalWeeks = 24;
  const totalDays = totalWeeks * 7;
  const out: ActivityDay[] = [];
  for (let i = 0; i < totalDays; i++) {
    const week = Math.floor(i / 7);
    const dow = i % 7;
    const isWeekend = dow === 0 || dow === 6;
    const seed = (i * 17 + week * 13 + 7) % 19;
    const raw = isWeekend ? Math.max(0, (seed % 4) - 1) : (seed % 11) + (week > 14 ? 2 : 0);
    const chats = raw;
    const level: 0 | 1 | 2 | 3 | 4 =
      chats === 0 ? 0 : chats <= 2 ? 1 : chats <= 5 ? 2 : chats <= 8 ? 3 : 4;
    const monthName = MONTHS[Math.min(MONTHS.length - 1, Math.floor((week / totalWeeks) * MONTHS.length))]!;
    const dayNum = ((i * 3) % 28) + 1;
    out.push({
      index: i,
      label: `${monthName} ${dayNum}`,
      chats,
      level,
    });
  }
  return out;
}

const RECENT_CHATS = [
  { id: "rc-1", title: "Q4 launch messaging & positioning review", age: "14m" },
  { id: "rc-2", title: "Pricing FAQ enterprise seat tiers", age: "2h" },
  { id: "rc-3", title: "SLA triage macros for Zendesk", age: "Yesterday" },
  { id: "rc-4", title: "Board deck cohort retention numbers", age: "Nov 11" },
];

const GENERATED_FILES = [
  { id: "gf-1", name: "q4-paid-acquisition-launch-budget.csv", age: "18m", kind: "kanban" as const },
  { id: "gf-2", name: "northwind-enterprise-security-faq.md", age: "3h", kind: "file" as const },
  { id: "gf-3", name: "competitor-pricing-matrix-2026.xlsx", age: "Yesterday", kind: "kanban" as const },
];

/** AI Chat / Overview (`assistant-overview`): Composer with day-by-day activity heatmap, recent chats, usage, files and monthly delta below. */
export function AfAssistantOverview(props: AfAssistantOverviewProps = {}) {
  const {
    onNavigate,
    workspace = "Acme",
    user = { name: "Alex Morgan" },
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const actHeadingId = useId();
  const recentHeadingId = useId();
  const usageHeadingId = useId();
  const filesHeadingId = useId();
  const monthHeadingId = useId();

  const composerWrapRef = useRef<HTMLDivElement | null>(null);
  const dayBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [draft, setDraft] = useState("");
  const [activeDayIdx, setActiveDayIdx] = useState<number>(167);
  const [tipVisible, setTipVisible] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  const days = useMemo(() => buildActivityDays(), []);
  const weeks = useMemo(() => {
    const cols: ActivityDay[][] = [];
    for (let w = 0; w < days.length; w += 7) {
      cols.push(days.slice(w, w + 7));
    }
    return cols;
  }, [days]);

  const activeDay = days[activeDayIdx] ?? days[days.length - 1]!;

  const moveDayFocus = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(days.length - 1, nextIdx));
    setActiveDayIdx(clamped);
    setTipVisible(true);
    const target = days[clamped];
    if (target) {
      setLiveAnnouncement(`${target.label}: ${target.chats} ${target.chats === 1 ? "chat" : "chats"}`);
    }
    dayBtnRefs.current[clamped]?.focus();
  };

  const handleHeatmapKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, idx: number) => {
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        moveDayFocus(idx - 7);
        break;
      case "ArrowRight":
        e.preventDefault();
        moveDayFocus(idx + 7);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveDayFocus(idx - 1);
        break;
      case "ArrowDown":
        e.preventDefault();
        moveDayFocus(idx + 1);
        break;
      case "Home":
        e.preventDefault();
        moveDayFocus(0);
        break;
      case "End":
        e.preventDefault();
        moveDayFocus(days.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        setTipVisible(false);
        break;
    }
  };

  const focusComposer = () => {
    const el = composerWrapRef.current?.querySelector("textarea");
    el?.focus();
  };

  return (
    <ChatInsetShell
      data-overview=""
      workspace={workspace}
      user={user}
      activeNav="New chat"
      onNavigate={onNavigate}
      mainHeader={false}
      defaultWorkAreaOpen={true}
      workAreaOpenLabel="Open workspace"
      suggestedArtifacts={DEFAULT_SHELL_ARTIFACTS}
      className={className}
      {...rest}
    >
      <div className="af-sc-overview">
        <div className="af-sc-overview__col">
          <div className="af-sc-overview__brand">
            <span className="af-sc-overview__mark" aria-hidden="true">
              <NavBrandLogo brand="affectui" size={20} />
            </span>
            <h2 className="af-sc-overview__title">{workspace === "Acme" ? "affectUI" : workspace}</h2>
          </div>

          <div ref={composerWrapRef} className="af-sc-overview__composer">
            <AfChatComposer
              value={draft}
              onValueChange={setDraft}
              placeholder="Ask anything, or pick up where you left off…"
              disabled={loading}
              loading={loading}
              onSend={() => {
                setDraft("");
                onNavigate?.("Chat");
              }}
            />
          </div>

          {loading ? (
            <div className="af-sc-board" aria-label="Loading workspace overview">
              <div className="af-sc-board__row">
                <section className="af-sc-bcard af-sc-bcard--wide">
                  <div className="af-sc-bcard__head">
                    <AfSkeleton width={76} height={13} />
                    <AfSkeleton width={64} height={12} />
                  </div>
                  <AfSkeleton width={190} height={12} />
                  <AfSkeleton width="100%" height={84} radius={8} />
                </section>
                <section className="af-sc-bcard af-sc-bcard--mid">
                  <div className="af-sc-bcard__head">
                    <AfSkeleton width={92} height={13} />
                    <AfSkeleton width={46} height={12} />
                  </div>
                  <AfSkeleton lines={4} height={13} />
                </section>
              </div>
              <div className="af-sc-board__row">
                <section className="af-sc-bcard af-sc-bcard--sm">
                  <AfSkeleton width={56} height={13} />
                  <AfSkeleton width={110} height={24} />
                  <AfSkeleton width="100%" height={8} radius={999} />
                </section>
                <section className="af-sc-bcard af-sc-bcard--mid">
                  <AfSkeleton width={116} height={13} />
                  <AfSkeleton lines={3} height={13} />
                </section>
                <section className="af-sc-bcard af-sc-bcard--sm">
                  <AfSkeleton width={82} height={13} />
                  <AfSkeleton width="100%" height={44} radius={8} />
                </section>
              </div>
            </div>
          ) : empty ? (
            <AfEmptyState
              icon="sparkle"
              title="Nothing here yet"
              text="Your daily activity, recent chats, plan usage and files made for you will appear here as you work."
              action={
                <AfButton variant="primary" size="sm" onClick={focusComposer}>
                  Start a chat
                </AfButton>
              }
            />
          ) : (
            <div className="af-sc-board">
              <div className="af-sc-board__row">
                <section className="af-sc-bcard af-sc-bcard--wide" aria-labelledby={actHeadingId}>
                  <div className="af-sc-bcard__head">
                    <h3 id={actHeadingId} className="af-sc-bcard__title">
                      Activity
                    </h3>
                    <span className="af-sc-bcard__meta">Feb – Nov</span>
                  </div>
                  <p className="af-sc-bcard__sub">872 chats · 214 files · 38 automations</p>

                  <div
                    className="af-sc-heatmap-wrap"
                    role="img"
                    aria-label="872 chats, 214 files and 38 automations across February to November"
                    onMouseLeave={() => setTipVisible(false)}
                  >
                    <div className="af-sc-heatmap">
                      {weeks.map((week, wIdx) => (
                        <div key={wIdx} className="af-sc-heatmap__col">
                          {week.map((day) => {
                            const isFocused = day.index === activeDayIdx;
                            return (
                              <button
                                key={day.index}
                                ref={(el) => {
                                  dayBtnRefs.current[day.index] = el;
                                }}
                                type="button"
                                tabIndex={isFocused ? 0 : -1}
                                className="af-sc-heatmap__cell"
                                data-level={day.level}
                                data-active={(tipVisible && isFocused) || undefined}
                                aria-label={`${day.label}: ${day.chats} chats`}
                                onMouseEnter={() => {
                                  setActiveDayIdx(day.index);
                                  setTipVisible(true);
                                }}
                                onFocus={() => {
                                  setActiveDayIdx(day.index);
                                  setTipVisible(true);
                                }}
                                onBlur={() => setTipVisible(false)}
                                onClick={() => {
                                  setActiveDayIdx(day.index);
                                  setTipVisible(true);
                                }}
                                onKeyDown={(e) => handleHeatmapKeyDown(e, day.index)}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    {tipVisible ? (
                      <div className="af-sc-heatmap__tip" aria-hidden="true">
                        <strong>{activeDay.label}</strong> · {activeDay.chats}{" "}
                        {activeDay.chats === 1 ? "chat" : "chats"}
                      </div>
                    ) : null}
                    <span className="af-sr-only" aria-live="polite">
                      {liveAnnouncement}
                    </span>
                  </div>
                </section>

                <section className="af-sc-bcard af-sc-bcard--mid" aria-labelledby={recentHeadingId}>
                  <div className="af-sc-bcard__head">
                    <h3 id={recentHeadingId} className="af-sc-bcard__title">
                      Recent chats
                    </h3>
                    <button
                      type="button"
                      className="af-sc-more-link"
                      onClick={() => onNavigate?.("Chat")}
                    >
                      6 more
                    </button>
                  </div>
                  <div className="af-sc-bcard__list">
                    {RECENT_CHATS.map((chat) => (
                      <button
                        key={chat.id}
                        type="button"
                        className="af-sc-row-btn"
                        onClick={() => onNavigate?.("Chat")}
                      >
                        <span className="af-sc-row-btn__name" title={chat.title}>
                          {chat.title}
                        </span>
                        <span className="af-sc-row-btn__time">{chat.age}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="af-sc-board__row">
                <section className="af-sc-bcard af-sc-bcard--sm" aria-labelledby={usageHeadingId}>
                  <div className="af-sc-bcard__head">
                    <h3 id={usageHeadingId} className="af-sc-bcard__title">
                      Usage
                    </h3>
                    <span className="af-sc-bcard__meta">Pro · 62%</span>
                  </div>
                  <div className="af-sc-usage-num">
                    <strong>1,240</strong>
                    <span>/ 2,000 credits</span>
                  </div>
                  <div
                    role="meter"
                    aria-labelledby={usageHeadingId}
                    aria-valuenow={1240}
                    aria-valuemin={0}
                    aria-valuemax={2000}
                    aria-valuetext="1,240 of 2,000 credits used, within limit"
                    className="af-sc-meter"
                  >
                    <div className="af-sc-meter__fill" style={{ width: "62%" }} />
                  </div>
                  <span className="af-sc-bcard__foot">Within limit · Resets Dec 1</span>
                </section>

                <section className="af-sc-bcard af-sc-bcard--mid" aria-labelledby={filesHeadingId}>
                  <div className="af-sc-bcard__head">
                    <h3 id={filesHeadingId} className="af-sc-bcard__title">
                      Files made for you
                    </h3>
                    <button
                      type="button"
                      className="af-sc-more-link"
                      onClick={() => onNavigate?.("Folders")}
                    >
                      11 more
                    </button>
                  </div>
                  <div className="af-sc-bcard__list">
                    {GENERATED_FILES.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        className="af-sc-row-btn"
                        title={file.name}
                        onClick={() => onNavigate?.("Folders")}
                      >
                        <span className="af-sc-row-btn__file">
                          <AfIcon name={file.kind} size={13} />
                          <span aria-label={file.name}>{middleTruncateFileName(file.name, 21)}</span>
                        </span>
                        <span className="af-sc-row-btn__time">{file.age}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="af-sc-bcard af-sc-bcard--sm" aria-labelledby={monthHeadingId}>
                  <div className="af-sc-bcard__head">
                    <h3 id={monthHeadingId} className="af-sc-bcard__title">
                      This month
                    </h3>
                    <span className="af-sc-bcard__meta">vs last</span>
                  </div>
                  <div className="af-sc-month-stats">
                    <div className="af-sc-month-stat">
                      <span className="af-sc-month-stat__label">Chats</span>
                      <div className="af-sc-month-stat__val">
                        <strong>36</strong>
                        <span
                          className="af-sc-delta"
                          data-dir="up"
                          aria-label="+12 on last month"
                        >
                          +12
                        </span>
                      </div>
                    </div>
                    <div className="af-sc-month-stat">
                      <span className="af-sc-month-stat__label">Files made</span>
                      <div className="af-sc-month-stat__val">
                        <strong>14</strong>
                        <span
                          className="af-sc-delta"
                          data-dir="down"
                          aria-label="-3 on last month"
                        >
                          −3
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </ChatInsetShell>
  );
}
