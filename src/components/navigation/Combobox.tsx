import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { AfIcon } from "../../icons";
import { cn, useIsomorphicLayoutEffect, useMenuHighlight } from "../../primitives";
import {
  type AfComboboxOption,
  type AfComboboxProps,
  COMBOBOX_GROUPS,
  COMBOBOX_PEOPLE,
  StagePopover,
  initialsOf,
} from "../_shared/inputs";

type InternalItem = {
  id: string;
  name: string;
  role: string;
  group: string;
};

function normalizeValueArray(val: string[] | string | undefined): string[] {
  if (val === undefined) return [];
  if (Array.isArray(val)) return val;
  return val ? [val] : [];
}

/**
 * Combobox (Pro): searchable multi/single select with avatar chips, "+N" overflow counter,
 * grouped list with sliding highlight, substring match highlight, and inline invite/create.
 */
export function AfCombobox({
  options: customOptions,
  people = COMBOBOX_PEOPLE,
  label = "Reviewers",
  placeholder,
  value: valueProp,
  defaultValue,
  onChange,
  multiple,
  creatable = true,
  onCreate,
  createLabel,
  maxVisibleTags = 3,
  defaultOpen = false,
  emptyText,
  disabled = false,
  className,
}: AfComboboxProps = {}) {
  const isMultiple = multiple ?? !(typeof valueProp === "string" || typeof defaultValue === "string");
  const isControlled = valueProp !== undefined;
  const [innerSelected, setInnerSelected] = useState<string[]>(() => normalizeValueArray(defaultValue));
  const selected = isControlled ? normalizeValueArray(valueProp) : innerSelected;

  const [invited, setInvited] = useState<InternalItem[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(defaultOpen);
  const [active, setActive] = useState(0);
  const [armed, setArmed] = useState(false);
  const [listHeight, setListHeight] = useState<number | undefined>(undefined);

  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listContentRef = useRef<HTMLDivElement>(null);

  const sourceItems = useMemo<InternalItem[]>(() => {
    if (customOptions) {
      return customOptions.map((opt) => ({
        id: opt.value,
        name: opt.label,
        role: opt.description ?? "",
        group: opt.group ?? "OPTIONS",
      }));
    }
    return people;
  }, [customOptions, people]);

  const candidates = useMemo(() => [...invited, ...sourceItems], [invited, sourceItems]);
  const keyword = query.trim().toLowerCase();
  const matches = (item: InternalItem) =>
    !keyword || item.name.toLowerCase().includes(keyword) || item.role.toLowerCase().includes(keyword);

  const sections = useMemo(() => {
    const list: { group: string; items: InternalItem[] }[] = [];
    const invitedItems = invited.filter(matches);
    if (invitedItems.length) list.push({ group: "INVITED", items: invitedItems });
    const groupOrder = customOptions
      ? Array.from(new Set(sourceItems.map((item) => item.group)))
      : Array.from(new Set([...COMBOBOX_GROUPS, ...sourceItems.map((item) => item.group)]));
    for (const group of groupOrder) {
      const items = sourceItems.filter((item) => item.group === group && matches(item));
      if (items.length) list.push({ group, items });
    }
    return list;
  }, [customOptions, invited, sourceItems, keyword]);

  const options = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  const visible = useMemo(() => candidates.filter((item) => selected.includes(item.id)), [candidates, selected]);
  const createName = query.trim();
  const canCreate =
    creatable &&
    createName.length > 0 &&
    !candidates.some((item) => item.name.toLowerCase() === createName.toLowerCase());
  const effectivePlaceholder =
    placeholder ?? (customOptions ? "Search or select…" : isMultiple ? "Add reviewers…" : "Select reviewer…");

  const thumb = useMenuHighlight(
    listRef,
    active,
    open,
    `${options.length}:${canCreate ? 1 : 0}:${keyword}:${listHeight ?? 0}`,
  );

  useEffect(() => {
    const total = options.length + (canCreate ? 1 : 0);
    if (active >= total) setActive(total > 0 ? 0 : -1);
  }, [active, options.length, canCreate]);

  useIsomorphicLayoutEffect(() => {
    if (!open) {
      setListHeight(undefined);
      return;
    }
    let rafId = 0;
    let observer: ResizeObserver | null = null;
    const attach = () => {
      const content = listContentRef.current;
      if (!content) {
        rafId = window.requestAnimationFrame(attach);
        return;
      }
      const sync = () => {
        const raw = Math.max(content.offsetHeight, content.scrollHeight);
        setListHeight(raw > 0 ? Math.min(300, raw + 8) : undefined);
      };
      sync();
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(sync);
        observer.observe(content);
      }
    };
    attach();
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [open, options.length, canCreate, keyword]);

  const emitSelection = (nextIds: string[], extraPool: InternalItem[] = []) => {
    if (!isControlled) {
      setInnerSelected(nextIds);
    }
    if (onChange) {
      const pool = [...extraPool, ...candidates];
      const opts: AfComboboxOption[] = nextIds.map((id) => {
        const found = pool.find((item) => item.id === id);
        return found
          ? { value: found.id, label: found.name, description: found.role || undefined, group: found.group }
          : { value: id, label: id };
      });
      onChange(isMultiple ? nextIds : (nextIds[0] ?? ""), opts);
    }
  };

  const selectOrToggle = (id: string) => {
    setArmed(false);
    if (!isMultiple) {
      emitSelection([id]);
      setQuery("");
      setOpen(false);
      return;
    }
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
    emitSelection(next);
  };

  const remove = (id: string) => {
    setArmed(false);
    emitSelection(selected.filter((item) => item !== id));
  };

  const invite = () => {
    if (!canCreate) return;
    const customCreated = onCreate?.(createName);
    const item: InternalItem = customCreated
      ? {
          id: customCreated.value,
          name: customCreated.label,
          role: customCreated.description ?? "Added",
          group: customCreated.group ?? "INVITED",
        }
      : {
          id: `invite:${createName}`,
          name: createName,
          role: customOptions ? "Custom option" : "Pending invite",
          group: "INVITED",
        };
    setInvited((prev) => [...prev, item]);
    const nextIds = isMultiple ? [...selected, item.id] : [item.id];
    emitSelection(nextIds, [item]);
    setQuery("");
    setArmed(false);
    if (!isMultiple) {
      setOpen(false);
    } else {
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      const total = options.length + (canCreate ? 1 : 0);
      if (!total) return;
      setActive((index) => (index < 0 ? (step > 0 ? 0 : total - 1) : (index + step + total) % total));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && active >= 0 && active < options.length) {
        selectOrToggle(options[active].id);
      } else if (open && canCreate && (active === options.length || options.length === 0)) {
        invite();
      } else {
        setOpen(true);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (open) setOpen(false);
      else if (query) setQuery("");
    } else if (event.key === "Backspace" && !query && selected.length) {
      event.preventDefault();
      const last = selected[selected.length - 1];
      if (!isMultiple) {
        remove(last);
      } else if (armed) {
        remove(last);
        setArmed(false);
      } else {
        setArmed(true);
      }
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const renderMatch = (text: string) => {
    if (!text) return null;
    const index = keyword ? text.toLowerCase().indexOf(keyword) : -1;
    if (index < 0) return text;
    return (
      <>
        {text.slice(0, index)}
        <mark className="af-in-cb__mark">{text.slice(index, index + keyword.length)}</mark>
        {text.slice(index + keyword.length)}
      </>
    );
  };

  const shownChips = isMultiple ? visible.slice(0, maxVisibleTags) : visible.slice(0, 1);
  const overflowChips = isMultiple ? visible.slice(maxVisibleTags) : [];

  return (
    <div className={cn("af-in-cb", className)} data-disabled={disabled || undefined}>
      {label ? <span className="af-in-cb__label">{label}</span> : null}
      <div
        ref={fieldRef}
        className="af-in-cb__field"
        data-open={open || undefined}
        data-single={!isMultiple || undefined}
        data-disabled={disabled || undefined}
        onPointerDown={(event) => {
          if (disabled) return;
          if ((event.target as HTMLElement).closest("button")) return;
          inputRef.current?.focus();
        }}
      >
        {shownChips.map((person) => (
          <span
            key={person.id}
            className="af-in-cb__chip"
            data-armed={(isMultiple && armed && person.id === selected[selected.length - 1]) || undefined}
          >
            <span className="af-in-cb__avatar" aria-hidden>
              {initialsOf(person.name)}
            </span>
            <span className="af-in-cb__chip-name">{person.name}</span>
            <button
              type="button"
              className="af-in-cb__chip-x"
              disabled={disabled}
              aria-label={`Remove ${person.name}`}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                remove(person.id);
              }}
            >
              <AfIcon name="x" size={10} />
            </button>
          </span>
        ))}
        {overflowChips.length > 0 ? (
          <span className="af-in-cb__more" title={overflowChips.map((person) => person.name).join(", ")}>
            <span key={overflowChips.length} className="af-in-cb__roll">
              +{overflowChips.length}
            </span>
          </span>
        ) : null}
        <input
          ref={inputRef}
          className="af-in-cb__input"
          value={query}
          disabled={disabled}
          placeholder={selected.length ? "" : effectivePlaceholder}
          aria-label={label || "Search options"}
          aria-expanded={open}
          role="combobox"
          aria-autocomplete="list"
          onChange={(event) => {
            setQuery(event.target.value);
            setArmed(false);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onKeyDown={onInputKeyDown}
        />
        <button
          type="button"
          className="af-in-cb__expand"
          disabled={disabled}
          aria-label={open ? "Close list" : "Open list"}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
          }}
        >
          <AfIcon name="chevronDown" size={14} />
        </button>
      </div>

      <StagePopover open={open && !disabled} anchorRef={fieldRef} onClose={() => setOpen(false)} className="af-in-cb__pop">
        <div
          ref={listRef}
          className="af-in-cb__list"
          role="listbox"
          aria-label={`${label || "Options"} list`}
          aria-multiselectable={isMultiple || undefined}
          style={listHeight !== undefined ? { height: listHeight } : undefined}
          onPointerLeave={() => setActive(-1)}
        >
          {thumb ? (
            <span
              className="af-menu__thumb"
              style={
                {
                  transform: `translate(${thumb.x}px, ${thumb.y}px)`,
                  width: thumb.width,
                  height: thumb.height,
                } as CSSProperties
              }
              aria-hidden="true"
            />
          ) : null}
          <div ref={listContentRef} className="af-in-cb__list-inner">
            {options.length === 0 ? (
              <p className="af-in-cb__empty">{emptyText ?? `No matches for “${query.trim()}”`}</p>
            ) : null}
            {sections.map((section) => (
              <div key={section.group} className="af-in-cb__section">
                <div className="af-in-cb__section-head">{section.group}</div>
                {section.items.map((person) => {
                  const index = options.indexOf(person);
                  const on = selected.includes(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      role="option"
                      aria-selected={on}
                      className="af-in-cb__option"
                      data-menu-index={index}
                      data-active={index === active || undefined}
                      onPointerEnter={() => setActive(index)}
                      onClick={() => selectOrToggle(person.id)}
                    >
                      <span className="af-in-cb__avatar" data-size="lg" aria-hidden>
                        {initialsOf(person.name)}
                      </span>
                      <span className="af-in-cb__option-text">
                        <span className="af-in-cb__option-name">{renderMatch(person.name)}</span>
                        {person.role ? <span className="af-in-cb__option-role">{renderMatch(person.role)}</span> : null}
                      </span>
                      {on ? <AfIcon name="check" size={16} className="af-in-cb__check" /> : null}
                    </button>
                  );
                })}
              </div>
            ))}
            {canCreate ? (
              <div className="af-in-cb__create-wrap" data-after-empty={options.length === 0 || undefined}>
                <button
                  type="button"
                  className="af-in-cb__option af-in-cb__create"
                  data-menu-index={options.length}
                  data-active={active === options.length || undefined}
                  onPointerEnter={() => setActive(options.length)}
                  onClick={invite}
                >
                  <span className="af-in-cb__plus" aria-hidden>
                    <AfIcon name="plus" size={14} />
                  </span>
                  <span className="af-in-cb__option-text">
                    <span className="af-in-cb__option-name">
                      {createLabel ? createLabel(createName) : customOptions ? `Create “${createName}”` : `Invite “${createName}”`}
                    </span>
                    {!createLabel && !customOptions ? (
                      <span className="af-in-cb__option-role">Send an invite and add right away</span>
                    ) : null}
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <footer className="af-in-cb__foot">
          <span>
            <span key={selected.length} className="af-in-cb__roll">
              {selected.length}
            </span>{" "}
            selected
          </span>
          <span className="af-in-cb__keys">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <span>to move</span>
            <kbd>↵</kbd>
            <span>{isMultiple ? "to toggle" : "to select"}</span>
          </span>
        </footer>
      </StagePopover>
    </div>
  );
}
