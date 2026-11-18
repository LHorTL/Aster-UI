import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { AfIcon, type IconName } from "../../icons";
import { AfCommandPalette } from "../../ui";
import type { AfCommand } from "../overlay/CommandPalette";
import { cn, useIsomorphicLayoutEffect, useMenuHighlight } from "../../primitives";
import { type AfCommandMenuProps, COMMAND_MENU_COMMANDS } from "../_shared/inputs";
import { NavBrandLogo, type NavBrandKey } from "./_brand";

const BRAND_BY_ID: Record<string, NavBrandKey> = {
  mail: "gmail",
  assistant: "assistant",
  task: "clickup",
  crm: "hubspot",
  meeting: "gcal",
  "share-update": "slack",
  "save-page": "notion",
};

function resolveBrandForCommand(cmd: AfCommand): NavBrandKey | null {
  if (BRAND_BY_ID[cmd.id]) return BRAND_BY_ID[cmd.id];
  const probe = `${cmd.id} ${cmd.label} ${cmd.hint ?? ""}`.toLowerCase();
  if (probe.includes("gmail") || probe.includes("write an email")) return "gmail";
  if (probe.includes("ask assistant")) return "assistant";
  if (probe.includes("clickup")) return "clickup";
  if (probe.includes("hubspot")) return "hubspot";
  if (probe.includes("google calendar") || probe.includes("schedule a meeting")) return "gcal";
  if (probe.includes("#team-updates") || probe.includes("slack")) return "slack";
  if (probe.includes("notion")) return "notion";
  return null;
}

function splitKbdTokens(kbd?: string): string[] {
  if (!kbd) return [];
  return kbd.split(/\s+/).filter(Boolean);
}

/**
 * Command Menu: affectUI Pro grouped command palette card with brand app tiles,
 * sliding highlight pill, Tab section jumping, `Ctrl/⌘ + 1..5` instant shortcuts,
 * and optional controlled modal overlay mode (`open` + `onClose`).
 */
export function AfCommandMenu({
  commands: commandsProp,
  groups,
  placeholder = "Type a command or search…",
  autoFocus = false,
  open: openProp,
  onOpenChange,
  onClose,
  onRun,
  className,
}: AfCommandMenuProps = {}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [ranCommand, setRanCommand] = useState<string | null>(null);
  const [ranId, setRanId] = useState<string | null>(null);
  const [listHeight, setListHeight] = useState<number | undefined>(undefined);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const resolvedCommands = useMemo<AfCommand[]>(() => {
    if (groups && groups.length > 0) {
      return groups.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          group: item.group ?? group.heading,
        })),
      );
    }
    return commandsProp ?? COMMAND_MENU_COMMANDS;
  }, [commandsProp, groups]);

  // Controlled modal overlay escape hatch when `open` + `onClose` are explicitly passed
  const isModalMode = openProp !== undefined && onClose !== undefined;

  const keyword = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!keyword) return resolvedCommands;
    return resolvedCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(keyword) ||
        (cmd.hint && cmd.hint.toLowerCase().includes(keyword)) ||
        (cmd.group && cmd.group.toLowerCase().includes(keyword)),
    );
  }, [resolvedCommands, keyword]);

  const grouped = useMemo(() => {
    const map = new Map<string, AfCommand[]>();
    for (const cmd of filtered) {
      const key = cmd.group ?? "COMMANDS";
      const bucket = map.get(key);
      if (bucket) bucket.push(cmd);
      else map.set(key, [cmd]);
    }
    return Array.from(map.entries()).map(([heading, items]) => ({ heading, items }));
  }, [filtered]);

  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  const thumb = useMenuHighlight(listRef, active, true, `${flatItems.length}:${keyword}`);

  useEffect(() => {
    if (active >= flatItems.length) {
      setActive(flatItems.length > 0 ? 0 : -1);
    }
  }, [active, flatItems.length]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useIsomorphicLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const sync = () => setListHeight(Math.min(360, inner.offsetHeight + 4));
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(sync);
    obs.observe(inner);
    return () => obs.disconnect();
  }, [flatItems.length, keyword]);

  const executeCommand = (cmd: AfCommand) => {
    setRanCommand(cmd.label);
    setRanId(cmd.id);
    onRun?.(cmd);
    window.setTimeout(() => {
      setRanId((cur) => (cur === cmd.id ? null : cur));
    }, 600);
    window.setTimeout(() => {
      setRanCommand((cur) => (cur === cmd.label ? null : cur));
    }, 2200);
  };

  useEffect(() => {
    if (isModalMode) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        if (event.key.toLowerCase() === "k") {
          event.preventDefault();
          inputRef.current?.focus();
          return;
        }
        const num = Number.parseInt(event.key, 10);
        if (num >= 1 && num <= 5) {
          const target = resolvedCommands[num - 1];
          if (target) {
            event.preventDefault();
            executeCommand(target);
          }
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalMode, resolvedCommands]);

  if (isModalMode) {
    return (
      <AfCommandPalette
        open={openProp}
        onClose={() => {
          onOpenChange?.(false);
          onClose();
        }}
        placeholder={placeholder}
        commands={resolvedCommands}
        onRun={onRun}
      />
    );
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!flatItems.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((idx) => (idx < 0 ? 0 : (idx + step + flatItems.length) % flatItems.length));
    } else if (event.key === "Tab" && grouped.length > 1) {
      event.preventDefault();
      const currentCmd = flatItems[Math.max(0, active)];
      const curGroupIdx = Math.max(
        0,
        grouped.findIndex((g) => g.items.includes(currentCmd)),
      );
      const nextGroupIdx = (curGroupIdx + (event.shiftKey ? -1 : 1) + grouped.length) % grouped.length;
      const firstOfNext = grouped[nextGroupIdx]?.items[0];
      if (firstOfNext) {
        const nextIdx = flatItems.indexOf(firstOfNext);
        if (nextIdx >= 0) {
          setActive(nextIdx);
          listRef.current?.querySelector<HTMLElement>(`[data-menu-index="${nextIdx}"]`)?.scrollIntoView({ block: "nearest" });
        }
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = flatItems[active];
      if (target) executeCommand(target);
    } else if (event.key === "Escape") {
      if (query) {
        event.preventDefault();
        setQuery("");
        setActive(0);
      }
    }
  };

  const renderMatch = (text: string) => {
    if (!keyword) return text;
    const idx = text.toLowerCase().indexOf(keyword);
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark>{text.slice(idx, idx + keyword.length)}</mark>
        {text.slice(idx + keyword.length)}
      </>
    );
  };

  return (
    <div className={cn("af-in-cmd", className)} onKeyDown={onKeyDown}>
      <div className="af-in-cmd__palette">
        <label className="af-in-cmd__search">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7.25" cy="7.25" r="4.75" />
            <path d="m13.5 13.5-2.9-2.9" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            placeholder={placeholder}
            aria-label="Command"
            role="combobox"
            aria-expanded="true"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
          />
          <kbd className="af-in-cmd__enter" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M12.5 4v3a2 2 0 0 1-2 2h-7M6 6.5 3.5 9 6 11.5" />
            </svg>
          </kbd>
        </label>

        <div
          ref={listRef}
          className="af-in-cmd__list"
          role="listbox"
          aria-label="Commands"
          style={listHeight !== undefined ? { height: listHeight } : undefined}
        >
          {thumb ? (
            <span
              className="af-in-cmd__pill"
              data-lit="true"
              aria-hidden="true"
              style={{
                transform: `translateY(${thumb.y}px)`,
                height: thumb.height,
              }}
            />
          ) : null}
          <div ref={innerRef} className="af-in-cmd__inner">
            {flatItems.length === 0 ? (
              <p className="af-in-cmd__empty">No commands matching “{query.trim()}”</p>
            ) : null}
            {grouped.map((group) => (
              <div key={group.heading} role="group" aria-label={group.heading} className="af-in-cmd__group">
                <span className="af-in-cmd__label">{group.heading}</span>
                {group.items.map((item) => {
                  const index = flatItems.indexOf(item);
                  const selected = index === active;
                  const brand = resolveBrandForCommand(item);
                  const keys = splitKbdTokens(item.kbd);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      data-menu-index={index}
                      data-ran={ranId === item.id || undefined}
                      className="af-in-cmd__item"
                      tabIndex={-1}
                      onPointerEnter={() => setActive(index)}
                      onClick={() => executeCommand(item)}
                    >
                      {brand ? (
                        <span className="af-in-cmd__logo">
                          <NavBrandLogo brand={brand} size={12} />
                        </span>
                      ) : (
                        <span className="af-in-cmd__glyph">
                          <AfIcon name={(item.icon as IconName) || "terminal"} size={16} />
                        </span>
                      )}
                      <span className="af-in-cmd__item-text">
                        <span className="af-in-cmd__name">{renderMatch(item.label)}</span>
                        {item.hint ? <span className="af-in-cmd__hint">{renderMatch(item.hint)}</span> : null}
                      </span>
                      {keys.length > 0 ? (
                        <span className="af-in-cmd__keys" aria-hidden="true">
                          {keys.map((k, kIdx) => (
                            <kbd key={`${item.id}-${kIdx}`}>{k}</kbd>
                          ))}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <footer className="af-in-cmd__foot" aria-live="polite">
          {ranCommand ? (
            <span className="af-in-cmd__done">
              <AfIcon name="check" size={14} />
              <span className="af-in-cmd__done-text">Ran “{ranCommand}”</span>
            </span>
          ) : (
            <span className="af-in-cmd__tip">
              <kbd>Tab</kbd> to jump between sections
            </span>
          )}
          <span className="af-in-cmd__foot-right">
            <span className="af-in-cmd__keys">
              <kbd>Ctrl</kbd>
              <kbd>K</kbd>
            </span>
            to open
          </span>
        </footer>
      </div>
    </div>
  );
}
