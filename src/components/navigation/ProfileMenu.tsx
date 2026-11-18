import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { AfIcon } from "../../icons";
import { cn, installAfListHover } from "../../primitives";
import { type AfProfileMenuProps, PROFILE_ACTIONS, PROFILE_SETUP_STEPS } from "../_shared/inputs";

/** Crisp 16x16 stroke-1.15 menu icons matching affectUI `ui-pmc__icon`. */
function ProfileItemIcon({ id, fallback }: { id: string; fallback: Parameters<typeof AfIcon>[0]["name"] }) {
  switch (id) {
    case "settings":
      return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "docs":
      return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8" />
        </svg>
      );
    case "apps":
      return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <path d="M17.5 3v7M14 6.5h7" />
        </svg>
      );
    case "logout":
      return (
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      );
    default:
      return <AfIcon name={fallback} size={16} />;
  }
}

/**
 * Profile Menu: user header row with tinted silhouette avatar, keyboard-navigable menu items
 * with sliding hover pill, and a bottom Profile setup progress section with interactive step advancement.
 */
export function AfProfileMenu({
  name = "Lena Hartmann",
  email = "lena.hartmann@fastmail.com",
  avatar,
  items = PROFILE_ACTIONS,
  onSelect,
  setup,
  className,
}: AfProfileMenuProps = {}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [innerDone, setInnerDone] = useState(setup?.done ?? 3);
  const [focusIndex, setFocusIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => installAfListHover(), []);

  const total = setup?.total ?? 5;
  const done = setup ? setup.done : innerDone;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!items.length) return;
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>(".af-in-profile__item") ?? [])];
    const activeIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const current = activeIndex >= 0 ? activeIndex : focusIndex;
    const last = items.length - 1;
    const next =
      event.key === "ArrowDown"
        ? (current + 1) % items.length
        : event.key === "ArrowUp"
          ? (current - 1 + items.length) % items.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setFocusIndex(next);
    buttons[next]?.focus();
  };

  const nextStep =
    done < total ? (setup?.next ?? PROFILE_SETUP_STEPS[done - 3] ?? "Finish setup") : null;

  return (
    <div className={cn("af-in-profile", className)}>
      <section className="af-in-profile__card">
        <header className="af-in-profile__user">
          <span className="af-in-profile__avatar" aria-hidden>
            {avatar ?? (
              <svg viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="20" fill="currentColor" opacity="0.1" />
                <circle cx="20" cy="16" r="4.75" fill="currentColor" />
                <path
                  d="M11.5 28.25c.9-4 4.3-6.75 8.5-6.75s7.6 2.75 8.5 6.75c.15.7-.4 1.25-1.1 1.25H12.6c-.7 0-1.25-.55-1.1-1.25Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </span>
          <span className="af-in-profile__who">
            <span className="af-in-profile__name">{name}</span>
            <span className="af-in-profile__email">{email}</span>
          </span>
        </header>

        <div ref={listRef} className="af-in-profile__items" role="menu" aria-label="Account menu" onKeyDown={onKeyDown}>
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="af-in-profile__item"
              data-danger={(item.danger && item.id !== "logout") || undefined}
              data-selected={selected === item.id || undefined}
              tabIndex={index === focusIndex ? 0 : -1}
              onFocus={() => setFocusIndex(index)}
              onClick={() => {
                setSelected(item.id);
                item.onSelect?.();
                onSelect?.(item.id);
              }}
            >
              <span className="af-in-profile__icon" aria-hidden>
                <ProfileItemIcon id={item.id} fallback={item.icon} />
              </span>
              <span className="af-in-profile__label">{item.label}</span>
              {item.badge ? <span className="af-in-profile__badge">{item.badge}</span> : null}
            </button>
          ))}
        </div>

        {setup !== null ? (
          <div className="af-in-profile__setup">
            <div className="af-in-profile__setup-head">
              <span className="af-in-profile__setup-title">Profile setup</span>
              <span className="af-in-profile__setup-count">
                <span key={Math.min(done, total)} className="af-in-filter__roll">
                  {Math.min(done, total)}
                </span>
                /{total}
              </span>
            </div>
            <span
              className="af-in-profile__track"
              role="progressbar"
              aria-label="Profile setup progress"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={Math.min(done, total)}
            >
              <span
                className="af-in-profile__fill"
                style={{ transform: `scaleX(${Math.min(1, done / Math.max(1, total))})` }}
              />
            </span>
            {nextStep ? (
              <button
                type="button"
                className="af-in-profile__next"
                onClick={() => {
                  if (setup?.onContinue) {
                    setup.onContinue();
                  } else {
                    setInnerDone((value) => Math.min(total, value + 1));
                  }
                }}
              >
                <span className="af-in-profile__next-label">
                  <span className="af-in-profile__next-hint">Next: </span>
                  {nextStep}
                </span>
                <AfIcon name="arrowRight" size={16} className="af-in-profile__next-arrow" />
              </button>
            ) : (
              <span className="af-in-profile__complete">
                <AfIcon name="check" size={14} />
                Profile complete
              </span>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
