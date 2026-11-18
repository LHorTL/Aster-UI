import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn, useIsomorphicLayoutEffect } from "../../primitives";
import { Demo, Note, RECOMMEND_OPTIONS, SIGNAL_TEXT } from "../_shared/data";

export type RecommendOption = (typeof RECOMMEND_OPTIONS)[number];

export interface AfSmartRecommendationPatternProps {
  /** 面板标题。 */
  title?: ReactNode;
  /** 推荐及备选方案列表。 */
  options?: RecommendOption[];
  /** 接受建议时触发。 */
  onAccept?: (option: RecommendOption) => void;
  /** 默认是否展开。 */
  defaultOpen?: boolean;
  /** 是否显示底部演示说明（默认 false）。 */
  showNote?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

/**
 * 智能建议：标题行（火花图标 + 标题 + 折叠箭头）、实测高度折叠理由、
 * 底栏（置信信号格 + 备选方案浮层菜单 + 接受/撤销按钮）。
 */
function SmartRecommendationDemo({
  title = "Smart recommendation",
  options = RECOMMEND_OPTIONS,
  onAccept,
  defaultOpen = true,
  showNote = false,
  className,
  style,
}: AfSmartRecommendationPatternProps = {}) {
  const [chosen, setChosen] = useState(options[0].id);
  const [accepted, setAccepted] = useState<string | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const reasonRef = useRef<HTMLParagraphElement>(null);
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!menu) return;
    const away = (event: PointerEvent) => !menuRef.current?.contains(event.target as Node) && setMenu(false);
    const esc = (event: KeyboardEvent) => event.key === "Escape" && setMenu(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const current = options.find((option) => option.id === chosen) ?? options[0];
  const isRecommended = current.id === options[0].id;
  const done = accepted === current.id;

  useIsomorphicLayoutEffect(() => {
    const el = reasonRef.current;
    if (!el) return;
    setBodyHeight(el.offsetHeight);
  }, [current.id, current.reason]);

  return (
    <Demo>
      <section className={cn("af-dt-sr", className)} style={style} aria-label="Recommendation" data-accepted={done || undefined}>
        <button type="button" className="af-dt-sr__head" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <svg className="af-dt-sr__mark" viewBox="0 0 16 16" aria-hidden>
            <path d="M8 1.75c.45 3.2 2.05 4.8 5.25 5.25-3.2.45-4.8 2.05-5.25 5.25-.45-3.2-2.05-4.8-5.25-5.25 3.2-.45 4.8-2.05 5.25-5.25Z" />
          </svg>
          <span className="af-dt-sr__title">{title}</span>
          {!isRecommended ? <span className="af-dt-sr__pill">Alternative</span> : null}
          <span className="af-dt-sr__chevron" aria-hidden><AfIcon name="chevronDown" size={14} /></span>
        </button>
        <div
          className="af-dt-sr__body"
          data-open={open || undefined}
          style={{ height: open ? (bodyHeight ?? "auto") : 0 }}
          aria-hidden={!open}
        >
          <p ref={reasonRef} className="af-dt-sr__reason" key={current.id}>
            {current.reason}
          </p>
        </div>
        <footer className="af-dt-sr__foot">
          <span className="af-dt-sr__signal" data-level={current.signal} title={SIGNAL_TEXT[current.signal]}>
            <span className="af-dt-sr__bars" aria-hidden>
              {[1, 2, 3].map((bar) => <span key={bar} data-on={current.signal >= bar || undefined} />)}
            </span>
            {SIGNAL_TEXT[current.signal]}
          </span>
          <div className="af-dt-sr__actions">
            {options.length > 1 && !done ? (
              <div className="af-dt-sr__alt" ref={menuRef}>
                <button type="button" className="af-dt-sr__btn af-dt-sr__btn--icon" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((value) => !value)}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 3v10M2.5 5.5 5 3l2.5 2.5M11 13V3M8.5 10.5 11 13l2.5-2.5" />
                  </svg>
                  Alternatives
                </button>
                {menu ? (
                  <div className="af-dt-sr__menu" role="menu">
                    {options.map((option, index) => (
                      <button
                        key={option.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={option.id === chosen}
                        className="af-dt-sr__option"
                        onClick={() => {
                          setChosen(option.id);
                          setMenu(false);
                          setOpen(true);
                        }}
                      >
                        <span className="af-dt-sr__option-label">
                          <span className="af-dt-sr__option-name">{option.label}</span>
                          {index === 0 ? <span className="af-dt-sr__tag">Recommended</span> : null}
                        </span>
                        <span className="af-dt-sr__mini" data-level={option.signal} aria-label={SIGNAL_TEXT[option.signal]}>
                          {[1, 2, 3].map((bar) => <span key={bar} data-on={option.signal >= bar || undefined} />)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {done ? (
              <>
                <span className="af-dt-sr__done" role="status">
                  <AfIcon name="check" size={14} />
                  <span className="af-dt-sr__done-text">Accepted {current.label.charAt(0).toLowerCase() + current.label.slice(1)}</span>
                </span>
                <button type="button" className="af-dt-sr__btn af-dt-sr__btn--icon" onClick={() => setAccepted(null)}>
                  <AfIcon name="undo" size={14} />
                  Undo
                </button>
              </>
            ) : (
              <button
                type="button"
                className="af-dt-sr__btn af-dt-sr__btn--primary"
                onClick={() => {
                  setAccepted(current.id);
                  onAccept?.(current);
                }}
              >
                Accept {current.label.charAt(0).toLowerCase() + current.label.slice(1)}
              </button>
            )}
          </div>
        </footer>
      </section>
      {showNote ? <Note>440px recommendation card: measured-height collapsible rationale, signal strength meter, alternatives menu, and undo.</Note> : null}
    </Demo>
  );
}

export { SmartRecommendationDemo as AfSmartRecommendationPattern, SmartRecommendationDemo as AfSmartRecommendation };
export type { AfSmartRecommendationPatternProps as AfSmartRecommendationProps };
