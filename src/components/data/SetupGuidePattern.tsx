import { useState, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import { Demo, Note, SETUP_GROUPS, SetupGroup } from "../_shared/data";

export type { SetupGroup };

export interface AfSetupGuidePatternProps {
  /** 向导标题。 */
  title?: ReactNode;
  /** 初始任务分组数据。 */
  initialGroups?: SetupGroup[];
  /** 默认展开的分组 ID 列表。 */
  defaultExpanded?: string[];
  /** 是否显示底部演示说明（默认 false）。 */
  showNote?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

/** 上手向导：320px 浮层清单，分组平滑展开/折叠、逐项解锁、完成后停顿再收起并自动展开下一组。 */
function SetupGuideDemo({
  title = "Setup guide",
  initialGroups = SETUP_GROUPS,
  defaultExpanded = ["workspace"],
  showNote = false,
  className,
  style,
}: AfSetupGuidePatternProps = {}) {
  const [groups, setGroups] = useState<SetupGroup[]>(initialGroups);
  const [expanded, setExpanded] = useState<string[]>(defaultExpanded);
  const [closed, setClosed] = useState(false);
  const [freeMode, setFreeMode] = useState(false);
  const [wide, setWide] = useState(false);

  const total = groups.reduce((sum, group) => sum + group.tasks.length, 0);
  const done = groups.reduce((sum, group) => sum + group.tasks.filter((task) => task.done).length, 0);
  const percent = total ? Math.round((done / total) * 100) : 0;

  const toggleTask = (groupId: string, taskId: string) => {
    const next = groups.map((group) =>
      group.id === groupId
        ? { ...group, tasks: group.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)) }
        : group,
    );
    setGroups(next);
    const target = next.find((group) => group.id === groupId);
    if (!target) return;
    const complete = target.tasks.every((task) => task.done);
    if (!complete) {
      setExpanded((current) => (current.includes(groupId) ? current : [...current, groupId]));
      return;
    }
    window.setTimeout(() => {
      setExpanded((current) => current.filter((id) => id !== groupId));
      const upcoming = next.find((group) => group.tasks.some((task) => !task.done));
      if (upcoming) setExpanded((current) => (current.includes(upcoming.id) ? current : [...current, upcoming.id]));
    }, 850);
  };

  return (
    <Demo>
      {closed ? (
        <div className="af-dt-setup__reopen-wrap">
          <button type="button" className="af-dt-setup__reopen" onClick={() => setClosed(false)}>
            <AfIcon name="target" size={14} />
            Reopen setup guide
          </button>
        </div>
      ) : (
        <section className={cn("af-dt-setup", className)} style={style} data-wide={wide || undefined} aria-label="Setup guide">
          <header className="af-dt-setup__head">
            <h3>{title}</h3>
            <div className="af-dt-setup__actions">
              <button
                type="button"
                className="af-dt-setup__edit"
                aria-pressed={freeMode}
                onClick={() => setFreeMode((v) => !v)}
              >
                {freeMode ? "Done" : "Edit"}
              </button>
              <button
                type="button"
                className="af-dt-setup__iconbtn"
                aria-label={wide ? "Restore width" : "Expand guide"}
                onClick={() => {
                  setWide((v) => !v);
                  if (!wide) setExpanded(groups.map((g) => g.id));
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M14 2 9.5 6.5M9.5 2.5v4h4M2 14l4.5-4.5M6.5 13.5v-4h-4" />
                </svg>
              </button>
              <button type="button" className="af-dt-setup__iconbtn" aria-label="Close setup guide" onClick={() => setClosed(true)}>
                <AfIcon name="x" size={14} />
              </button>
            </div>
          </header>
          <div className="af-dt-setup__progress">
            <div className="af-dt-setup__bar" role="progressbar" aria-label="Completion" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ transform: `scaleX(${percent / 100})` }} />
            </div>
            <span className="af-dt-setup__count" aria-hidden>{done}/{total}</span>
          </div>
          <div className="af-dt-setup__groups">
            {groups.map((group) => {
              const groupDone = group.tasks.filter((task) => task.done).length;
              const complete = groupDone === group.tasks.length;
              const isOpen = expanded.includes(group.id);
              return (
                <div className="af-dt-setup__group" data-complete={complete || undefined} data-open={isOpen || undefined} key={group.id}>
                  <button
                    type="button"
                    className="af-dt-setup__grouphead"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded((current) => (current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id]))}
                  >
                    <span className="af-dt-setup__grouptitle">{group.title}</span>
                    <span className="af-dt-setup__chev" data-open={isOpen || undefined} aria-hidden><AfIcon name="chevronDown" size={12} /></span>
                  </button>
                  <div className="af-dt-setup__groupfold" data-open={isOpen || undefined} aria-hidden={!isOpen}>
                    <div className="af-dt-setup__tasks">
                      {group.tasks.map((task, index) => {
                        const locked = !freeMode && index > 0 && !group.tasks[index - 1].done && !task.done;
                        return (
                          <button
                            key={task.id}
                            type="button"
                            className="af-dt-setup__task"
                            data-done={task.done || undefined}
                            disabled={locked}
                            aria-pressed={task.done}
                            onClick={() => toggleTask(group.id, task.id)}
                          >
                            <span className="af-dt-checkring" aria-hidden><AfIcon name="check" size={10} /></span>
                            <span>{task.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {showNote ? <Note>340px setup guide: sequential task unlocking, auto-collapse on group completion, and next-group promotion.</Note> : null}
    </Demo>
  );
}

export { SetupGuideDemo as AfSetupGuidePattern, SetupGuideDemo as AfSetupGuide };
export type { AfSetupGuidePatternProps as AfSetupGuideProps };
