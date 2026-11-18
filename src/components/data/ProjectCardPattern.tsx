import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import { AfProgressRing } from "../../ui";
import { Demo, Note, PROJECT_MEMBERS, PROJECT_STATUS, PROJECT_TASKS, ProjectTask } from "../_shared/data";

export type { ProjectTask };

export interface AfProjectCardPatternProps {
  /** 项目名称。 */
  title?: ReactNode;
  /** 截止日期描述。 */
  dueText?: ReactNode;
  /** 成员名称列表。 */
  members?: string[];
  /** 初始子任务列表。 */
  initialTasks?: ProjectTask[];
  /** 初始状态 ID。 */
  defaultStatus?: string;
  /** 点击底栏打开项目按钮时触发。 */
  onOpenProject?: () => void;
  /** 是否显示底部演示说明（默认 false）。 */
  showNote?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

/**
 * 项目卡：32px 分段环（中心是已完成数）、标题与状态胶囊 + 截止日期、右侧叠放头像。
 * 悬停或点击展开：状态选项、带圆形勾选的子任务、底部 44px 托盘与 "打开项目"。
 */
function ProjectCardDemo({
  title = "Onboarding flow",
  dueText = "Due Oct 24",
  members = PROJECT_MEMBERS,
  initialTasks = PROJECT_TASKS,
  defaultStatus = "progress",
  onOpenProject,
  showNote = false,
  className,
  style,
}: AfProjectCardPatternProps = {}) {
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks);
  const [status, setStatus] = useState(defaultStatus);
  const [member, setMember] = useState<string | null>(null);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const foldInnerRef = useRef<HTMLDivElement>(null);
  const [foldHeight, setFoldHeight] = useState<number | null>(null);

  const open = hoverOpen || pinned;
  const doneCount = tasks.filter((task) => task.done).length;
  const current = PROJECT_STATUS.find((option) => option.id === status) ?? PROJECT_STATUS[0];
  const shownTasks = member ? tasks.filter((task) => task.assignee === member) : tasks;

  useIsomorphicLayoutEffect(() => {
    const el = foldInnerRef.current;
    if (!el) return;
    const sync = () => setFoldHeight(el.offsetHeight);
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [shownTasks.length]);

  return (
    <Demo>
      <section
        className={cn("af-dt-pcc", className)}
        style={style}
        data-open={open || undefined}
        aria-label="Project card"
        onPointerEnter={() => setHoverOpen(true)}
        onPointerLeave={() => setHoverOpen(false)}
      >
        <div className="af-dt-pcc__card">
          <div className="af-dt-pcc__head">
            <button type="button" className="af-dt-pcc__toggle" aria-expanded={open} aria-label={`${typeof title === "string" ? title : "Project"}, ${doneCount} completed`} onClick={() => setPinned((value) => !value)} />
            <span className="af-dt-pcc__progress">
              <AfProgressRing segments={tasks.length} done={doneCount} size={32} label={`Progress ${doneCount}/${tasks.length}`} />
            </span>
            <span className="af-dt-pcc__titles">
              <span className="af-dt-pcc__name">{title}</span>
              <span className="af-dt-pcc__sub">
                <button
                  type="button"
                  className="af-dt-pcc__status"
                  data-tone={current.tone}
                  onClick={() => {
                    const nextIdx = (PROJECT_STATUS.findIndex((option) => option.id === status) + 1) % PROJECT_STATUS.length;
                    setStatus(PROJECT_STATUS[nextIdx].id);
                  }}
                >
                  {status === "done" ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.2" />
                      <path d="m4.2 6.1 1.2 1.2 2.4-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : status === "todo" ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M6 3.4a2.6 2.6 0 0 1 0 5.2V3.4Z" fill="currentColor" />
                    </svg>
                  )}
                  {current.label}
                </button>
                <span className="af-dt-pcc__due">{dueText}</span>
              </span>
            </span>
            <span className="af-dt-pcc__people">
              {members.map((name, index) => (
                <button
                  key={name}
                  type="button"
                  className="af-dt-pcc__member"
                  data-hue={index + 1}
                  aria-label={`Filter tasks for ${name}`}
                  aria-pressed={member === name}
                  onClick={() => {
                    setMember((value) => {
                      const next = value === name ? null : name;
                      if (next) setPinned(true);
                      return next;
                    });
                  }}
                >
                  <span className="af-dt-pcc__avatar" data-hue={index + 1}>{name[0]}</span>
                </button>
              ))}
            </span>
          </div>
          <div
            className="af-dt-pcc__fold"
            data-open={open || undefined}
            style={{ height: open ? (foldHeight ?? "auto") : 0 }}
            aria-hidden={!open || undefined}
            {...(!open ? { inert: "true" as unknown as boolean } : undefined)}
          >
            <div ref={foldInnerRef}>
              <div className="af-dt-pcc__body">
                <div className="af-dt-pcc__options" role="radiogroup" aria-label="Project status">
                  {PROJECT_STATUS.map((option) => (
                    <button key={option.id} type="button" role="radio" aria-checked={status === option.id} className="af-dt-pcc__option" data-tone={option.tone} onClick={() => setStatus(option.id)}>
                      <span className="af-dt-pcc__dot" aria-hidden />
                      {option.label}
                    </button>
                  ))}
                </div>
                <ul className="af-dt-pcc__tasks">
                  {shownTasks.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={task.done}
                        className="af-dt-pcc__task"
                        onClick={() => setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item)))}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                          <circle className="af-dt-pcc__ring" cx="8" cy="8" r="6.3" />
                          <circle className="af-dt-pcc__disc" cx="8" cy="8" r="7" />
                          <path className="af-dt-pcc__tick" d="m5.2 8.2 1.9 1.9 3.7-4" />
                        </svg>
                        <span className="af-dt-pcc__label">{task.label}</span>
                        <span className="af-dt-pcc__avatar af-dt-pcc__avatar--task" data-hue={members.indexOf(task.assignee) + 1}>{task.assignee[0]}</span>
                      </button>
                    </li>
                  ))}
                  {!shownTasks.length ? <li className="af-dt-pcc__empty">No open tasks for {member}</li> : null}
                </ul>
              </div>
              <footer className="af-dt-pcc__foot">
                <span className="af-dt-pcc__caption">{tasks.length - doneCount ? `${tasks.length - doneCount} left` : "All done"}</span>
                <button
                  type="button"
                  className="af-dt-pcc__action"
                  onClick={() => {
                    setTasks(initialTasks);
                    setMember(null);
                    onOpenProject?.();
                  }}
                >
                  Open →
                </button>
              </footer>
            </div>
          </div>
        </div>
      </section>
      {showNote ? <Note>320px project card: 32px segmented progress ring, semantic status pill, overlapping member avatars, and smooth fold.</Note> : null}
    </Demo>
  );
}

export { ProjectCardDemo as AfProjectCardPattern, ProjectCardDemo as AfProjectCard };
export type { AfProjectCardPatternProps as AfProjectCardProps };
