import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { AfIcon } from "../../icons";
import { cn, installAfListHover, useControllableState, useIsomorphicLayoutEffect } from "../../primitives";
import { type AfFilterMenuProps, FILTER_GROUPS, type FilterChip } from "../_shared/inputs";

const DEFAULT_FILTER_PICKED: Record<string, string[]> = {
  stage: ["qualified"],
  deal: ["5k-20k"],
  region: ["dach"],
};

/**
 * Filter Menu (Clean): removable active filter chips on one line ("+N" overflow),
 * collapsible checkbox groups with sliding hover highlight and animated checkmarks,
 * and keyboard navigation hints in the footer.
 */
export function AfFilterMenu({
  groups = FILTER_GROUPS,
  title = "Filters",
  value,
  defaultValue,
  onChange,
  defaultOpen,
  hints = true,
  className,
}: AfFilterMenuProps = {}) {
  const fallbackDefault = useMemo<Record<string, string[]>>(() => {
    if (defaultValue) return defaultValue;
    if (groups === FILTER_GROUPS) return DEFAULT_FILTER_PICKED;
    return groups[0]?.options[0] ? { [groups[0].id]: [groups[0].options[0].id] } : {};
  }, []);

  const [picked, setPicked] = useControllableState<Record<string, string[]>>({
    value,
    defaultValue: fallbackDefault,
    onChange,
  });
  const [openGroups, setOpenGroups] = useState<string[]>(() => defaultOpen ?? (groups[0] ? [groups[0].id] : []));
  const [focus, setFocus] = useState<string | null>(null);
  const [fit, setFit] = useState(Number.POSITIVE_INFINITY);
  const listRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<string | null>(null);
  const chipsRow = useRef<HTMLDivElement>(null);
  const chipsMeasure = useRef<HTMLDivElement>(null);

  useEffect(() => installAfListHover(), []);

  const chips = useMemo<FilterChip[]>(
    () =>
      groups.flatMap((group) =>
        (picked[group.id] ?? []).flatMap((optionId) => {
          const option = group.options.find((item) => item.id === optionId);
          return option ? [{ groupId: group.id, optionId, label: `${group.chipPrefix ?? ""}${option.label}` }] : [];
        }),
      ),
    [groups, picked],
  );
  const chipKey = chips.map((chip) => `${chip.groupId}:${chip.optionId}`).join("|");

  useIsomorphicLayoutEffect(() => {
    const row = chipsRow.current;
    const measure = chipsMeasure.current;
    if (!row || !measure || !row.clientWidth) return;
    const place = () => {
      const widths = [...measure.children].map((element) => (element as HTMLElement).offsetWidth + 4);
      const moreWidth = widths.pop() ?? 0;
      const room = row.clientWidth - 32 + 4;
      let used = 0;
      let count = 0;
      for (; count < widths.length; count++) {
        const rest = count + 1 < widths.length ? moreWidth : 0;
        if (used + widths[count] + rest > room) break;
        used += widths[count];
      }
      setFit(count);
    };
    place();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(place);
    observer.observe(row);
    return () => observer.disconnect();
  }, [chipKey]);

  const shown = chips.slice(0, fit);
  const hidden = chips.slice(fit);

  const rows = useMemo(
    () =>
      groups.flatMap((group) => [
        { key: `g:${group.id}`, groupId: group.id, optionId: undefined as string | undefined },
        ...(openGroups.includes(group.id)
          ? group.options.map((option) => ({
              key: `o:${group.id}:${option.id}`,
              groupId: group.id,
              optionId: option.id as string | undefined,
            }))
          : []),
      ]),
    [groups, openGroups],
  );

  const [interacted, setInteracted] = useState(false);
  const isOn = (groupId: string, optionId: string) => (picked[groupId] ?? []).includes(optionId);
  const toggleOption = (groupId: string, optionId: string) => {
    setInteracted(true);
    setPicked((prev) => {
      const current = prev[groupId] ?? [];
      return {
        ...prev,
        [groupId]: current.includes(optionId) ? current.filter((item) => item !== optionId) : [...current, optionId],
      };
    });
  };
  const toggleGroup = (groupId: string) =>
    setOpenGroups((prev) => (prev.includes(groupId) ? prev.filter((item) => item !== groupId) : [...prev, groupId]));

  const moveTo = (key: string | undefined) => {
    if (!key) return;
    focusRef.current = key;
    setFocus(key);
    listRef.current?.querySelector<HTMLElement>(`[data-filter-row="${CSS.escape(key)}"]`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const targetRow = (event.target as HTMLElement).closest<HTMLElement>("[data-filter-row]")?.dataset.filterRow;
    const currentKey = targetRow ?? focusRef.current;
    const index = rows.findIndex((row) => row.key === currentKey);
    const row = index >= 0 ? rows[index] : undefined;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const base = index < 0 ? (step > 0 ? -1 : rows.length) : index;
      moveTo(rows[Math.max(0, Math.min(rows.length - 1, base + step))]?.key);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      moveTo(rows[event.key === "Home" ? 0 : rows.length - 1]?.key);
    } else if (row && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
      event.preventDefault();
      if (event.key === "ArrowRight" && !openGroups.includes(row.groupId)) toggleGroup(row.groupId);
      if (event.key === "ArrowLeft") {
        if (openGroups.includes(row.groupId)) toggleGroup(row.groupId);
        moveTo(`g:${row.groupId}`);
      }
    } else if (row && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      if (row.optionId) toggleOption(row.groupId, row.optionId);
      else toggleGroup(row.groupId);
    }
  };

  return (
    <section className={cn("af-in-filter", className)} data-interacted={interacted || undefined}>
      <header className="af-in-filter__head">
        <h3 className="af-in-filter__title">{title}</h3>
        <button
          type="button"
          className="af-in-filter__clear"
          disabled={chips.length === 0}
          onClick={() => {
            setInteracted(true);
            setPicked({});
          }}
        >
          Clear all
        </button>
      </header>

      <div className="af-in-filter__chips-row" data-empty={chips.length === 0 || undefined}>
        <div className="af-in-filter__chips" ref={chipsRow} data-empty={chips.length === 0 || undefined} aria-live="polite">
          <div className="af-in-filter__measure" ref={chipsMeasure} aria-hidden>
            {chips.map((chip) => (
              <span key={`${chip.groupId}:${chip.optionId}`} className="af-in-filter__chip">
                <span className="af-in-filter__chip-label">{chip.label}</span>
                <span className="af-in-filter__chip-x" />
              </span>
            ))}
            <span className="af-in-filter__chip af-in-filter__more">+99</span>
          </div>
          {shown.map((chip) => (
            <span key={`${chip.groupId}:${chip.optionId}`} className="af-in-filter__chip">
              <span className="af-in-filter__chip-label">{chip.label}</span>
              <button
                type="button"
                className="af-in-filter__chip-x"
                aria-label={`Remove ${chip.label}`}
                onClick={() => toggleOption(chip.groupId, chip.optionId)}
              >
                <AfIcon name="x" size={10} />
              </button>
            </span>
          ))}
          {hidden.length > 0 ? (
            <span className="af-in-filter__chip af-in-filter__more" title={hidden.map((chip) => chip.label).join(", ")}>
              <span key={hidden.length} className="af-in-filter__roll">
                +{hidden.length}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="af-in-filter__groups" ref={listRef} onKeyDown={onKeyDown}>
        {groups.map((group) => {
          const isOpen = openGroups.includes(group.id);
          const count = (picked[group.id] ?? []).length;
          const groupKey = `g:${group.id}`;
          return (
            <div key={group.id} className="af-in-filter__group" data-open={isOpen || undefined}>
              <button
                type="button"
                className="af-in-filter__group-head"
                data-filter-row={groupKey}
                tabIndex={focus === groupKey || (focus === null && group === groups[0]) ? 0 : -1}
                aria-expanded={isOpen}
                onFocus={() => {
                  focusRef.current = groupKey;
                  setFocus(groupKey);
                }}
                onClick={() => toggleGroup(group.id)}
              >
                <AfIcon name="chevronDown" size={16} className="af-in-filter__chevron" />
                <span className="af-in-filter__group-label">{group.label}</span>
                <span className="af-in-filter__group-count">{group.options.length}</span>
                <span className="af-in-filter__group-picked" aria-live="polite">
                  {count > 0 ? (
                    <span key={count} className="af-in-filter__roll">
                      {count} {count === 1 ? "filter" : "filters"}
                    </span>
                  ) : null}
                </span>
              </button>
              <div
                className="af-in-filter__panel"
                aria-hidden={!isOpen || undefined}
                {...(!isOpen ? { inert: "true" as unknown as boolean } : undefined)}
              >
                <div className="af-in-filter__panel-inner">
                  {group.options.map((option) => {
                    const key = `o:${group.id}:${option.id}`;
                    const on = isOn(group.id, option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        className="af-in-filter__option"
                        data-filter-row={key}
                        tabIndex={isOpen && focus === key ? 0 : -1}
                        onFocus={() => {
                          focusRef.current = key;
                          setFocus(key);
                        }}
                        onClick={() => toggleOption(group.id, option.id)}
                      >
                        <span className="af-in-filter__box" aria-hidden>
                          <svg viewBox="0 0 12 12" width={10} height={10} fill="none">
                            <path
                              d="M2.2 6.2L4.8 8.8L9.8 3.4"
                              pathLength={1}
                              stroke="currentColor"
                              strokeWidth={1.75}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span className="af-in-filter__option-label">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hints ? (
        <footer className="af-in-filter__hints" aria-hidden>
          <span className="af-in-filter__hint">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <span>to navigate</span>
          </span>
          <span className="af-in-filter__hint">
            <kbd>↵</kbd>
            <span>to select</span>
          </span>
        </footer>
      ) : null}
    </section>
  );
}
