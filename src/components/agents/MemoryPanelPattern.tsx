import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import {
  Collapse,
  GlyphButton,
  MEMORY_CATEGORY,
  MEMORY_INITIAL,
  MemoryCategory,
  MemoryItem,
} from "../_shared/agents-b";

export type { MemoryCategory, MemoryItem };

export interface AfMemoryPanelPatternProps {
  /** Panel header title. */
  title?: ReactNode;
  /** Initial memory entries. */
  initialItems?: MemoryItem[];
  /** Default master toggle state. */
  defaultEnabled?: boolean;
  /** Master toggle change callback. */
  onEnabledChange?: (enabled: boolean) => void;
  /** Show external hint below card, default `false`. */
  showHint?: boolean;
  /** Extra class name. */
  className?: string;
  /** Inline style. */
  style?: CSSProperties;
}

const FILTER_TABS: { value: "all" | MemoryCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "preference", label: "Preferences" },
  { value: "work", label: "Work" },
  { value: "project", label: "Projects" },
];

function MemoryPanelDemo({
  title = "Memory",
  initialItems = MEMORY_INITIAL,
  defaultEnabled = true,
  onEnabledChange,
  showHint = false,
  className,
  style,
}: AfMemoryPanelPatternProps = {}) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<"all" | MemoryCategory>("all");
  const [useMemory, setUseMemory] = useState(defaultEnabled);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [forgetting, setForgetting] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ item: MemoryItem; index: number } | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCategory, setNewCategory] = useState<MemoryCategory>("preference");
  const [newText, setNewText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const forgetTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), 10000);
    return () => window.clearTimeout(timer);
  }, [undo]);

  useEffect(
    () => () => {
      if (forgetTimer.current) window.clearTimeout(forgetTimer.current);
    },
    [],
  );

  const counts = useMemo(
    () => ({
      all: items.length,
      preference: items.filter((item) => item.category === "preference").length,
      work: items.filter((item) => item.category === "work").length,
      project: items.filter((item) => item.category === "project").length,
    }),
    [items],
  );

  const visible = items.filter(
    (item) =>
      (filter === "all" || item.category === filter) &&
      (!query.trim() || item.text.toLowerCase().includes(query.trim().toLowerCase())),
  );

  const forget = (item: MemoryItem) => {
    if (forgetting) return;
    const idx = items.findIndex((entry) => entry.id === item.id);
    setForgetting(item.id);
    setUndo({ item, index: idx });
    forgetTimer.current = window.setTimeout(() => {
      setItems((list) => list.filter((entry) => entry.id !== item.id));
      setForgetting(null);
    }, 340);
  };

  const undoForget = () => {
    if (!undo) return;
    setItems((list) => {
      const next = [...list];
      next.splice(Math.min(undo.index, next.length), 0, undo.item);
      return next;
    });
    setUndo(null);
  };

  const saveEdit = () => {
    if (!editing) return;
    const text = draft.trim();
    if (text) setItems((list) => list.map((item) => (item.id === editing ? { ...item, text } : item)));
    setEditing(null);
  };

  const create = () => {
    const text = newText.trim();
    if (!text) return;
    const targetCat = filter === "all" ? newCategory : filter;
    setItems((list) => [
      {
        id: `m-${Date.now()}`,
        category: targetCat,
        text,
        source: "You added",
        date: "Just now",
      },
      ...list,
    ]);
    setNewText("");
    setCreating(false);
  };

  const groups: MemoryCategory[] = ["preference", "work", "project"];

  const pausedCount = items.filter((item) => item.paused).length;

  return (
    <div className={cn("af-agb-mem", className)} style={style} data-off={!useMemory || undefined}>
      <header className="af-agb-mem__head">
        <span className="af-agb-mem__title">{title}</span>
        <span className="af-agb-mem__countpill">{items.length}</span>
        <span className="af-agb-mem__spacer" />
        <label className="af-agb-mem__toggle">
          <span>Use memory</span>
          <button
            type="button"
            role="switch"
            aria-checked={useMemory}
            aria-label="Use memory"
            className="af-agb-mem__switch"
            data-checked={useMemory || undefined}
            onClick={() => {
              const next = !useMemory;
              setUseMemory(next);
              onEnabledChange?.(next);
            }}
          >
            <i className="af-agb-mem__switch-thumb" />
          </button>
        </label>
      </header>

      <div className="af-agb-mem__chips">
        <div className="af-agb-mem__pills" role="tablist" aria-label="Filter memories">
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                className="af-agb-mem__pill"
                data-active={active || undefined}
                onClick={() => setFilter(tab.value)}
              >
                <span>{tab.label}</span>
                <span className="af-agb-mem__pillcount">{counts[tab.value]}</span>
              </button>
            );
          })}
        </div>

        <span className="af-agb-mem__searchwrap">
          {searchOpen ? (
            <input
              className="af-agb-mem__search"
              value={query}
              autoFocus
              aria-label="Search memories"
              placeholder="Search…"
              onChange={(event) => setQuery(event.target.value)}
              onBlur={() => {
                if (!query) setSearchOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setQuery("");
                  setSearchOpen(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="af-agb-mem__searchbtn"
              aria-label="Search memories"
              title="Search memories"
              onClick={() => setSearchOpen(true)}
            >
              <AfIcon name="search" size={14} />
            </button>
          )}
        </span>
      </div>

      <Collapse open={!useMemory}>
        <p className="af-agb-mem__offnote">
          The assistant won&apos;t use or save memories in new chats. Nothing here is deleted.
        </p>
      </Collapse>

      <div className="af-agb-mem__list af-agb-scroll">
        {groups.map((category) => {
          const group = visible.filter((item) => item.category === category);
          if (!group.length) return null;
          return (
            <section className="af-agb-mem__group" key={category}>
              <h4 className="af-agb-mem__grouphead">{MEMORY_CATEGORY[category].toUpperCase()}</h4>
              <ul>
                {group.map((item) => (
                  <li
                    key={item.id}
                    className="af-agb-mem__rowwrap"
                    data-removing={forgetting === item.id || undefined}
                  >
                    <div className="af-agb-mem__row" data-paused={item.paused || undefined}>
                      {editing === item.id ? (
                        <input
                          className="af-agb-mem__edit"
                          value={draft}
                          autoFocus
                          aria-label="Edit memory"
                          onChange={(event) => setDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveEdit();
                            if (event.key === "Escape") setEditing(null);
                          }}
                          onBlur={saveEdit}
                        />
                      ) : (
                        <div className="af-agb-mem__main">
                          <p className="af-agb-mem__text">{item.text}</p>
                          <p className="af-agb-mem__meta">
                            <span>
                              {item.source} · {item.date}
                            </span>
                            {item.paused ? <span className="af-agb-mem__paused">Paused</span> : null}
                          </p>
                        </div>
                      )}
                      <span className="af-agb-mem__actions" onMouseDown={(event) => event.preventDefault()}>
                        <GlyphButton
                          icon="file"
                          label={`Edit: ${item.text}`}
                          onClick={() => {
                            if (editing === item.id) {
                              saveEdit();
                            } else {
                              setEditing(item.id);
                              setDraft(item.text);
                            }
                          }}
                        />
                        <GlyphButton
                          icon={item.paused ? "play" : "pause"}
                          label={item.paused ? `Resume: ${item.text}` : `Pause: ${item.text}`}
                          onClick={() =>
                            setItems((list) =>
                              list.map((entry) =>
                                entry.id === item.id ? { ...entry, paused: !entry.paused } : entry,
                              ),
                            )
                          }
                        />
                        <GlyphButton
                          icon="trash"
                          label={`Forget: ${item.text}`}
                          danger
                          onClick={() => forget(item)}
                        />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {visible.length === 0 ? <p className="af-agb-mem__empty">No matching memories.</p> : null}
      </div>

      {creating ? (
        <div className="af-agb-mem__new">
          {filter === "all" ? (
            <div className="af-agb-mem__newcats">
              {groups.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className="af-agb-mem__pill"
                  data-active={newCategory === cat || undefined}
                  onClick={() => setNewCategory(cat)}
                >
                  {MEMORY_CATEGORY[cat]}
                </button>
              ))}
            </div>
          ) : null}
          <div className="af-agb-mem__newrow">
            <input
              className="af-agb-mem__edit"
              value={newText}
              autoFocus
              aria-label="New memory"
              placeholder="Remember something across chats…"
              onChange={(event) => setNewText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") create();
                if (event.key === "Escape") {
                  setCreating(false);
                  setNewText("");
                }
              }}
            />
            <button
              type="button"
              className="af-agb-aic-btn af-agb-aic-btn--primary"
              onClick={create}
              disabled={!newText.trim()}
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="af-agb-mem__addbar" onClick={() => setCreating(true)}>
          <AfIcon name="plus" size={13} />
          <span>New memory</span>
        </button>
      )}

      <footer className="af-agb-mem__foot">
        {undo ? (
          <div className="af-agb-mem__undo" role="status" aria-live="polite">
            <span>
              Forgot &ldquo;{undo.item.text.slice(0, 26)}
              {undo.item.text.length > 26 ? "…" : ""}&rdquo;
            </span>
            <button type="button" className="af-agb-mem__undobtn" onClick={undoForget}>
              Undo
            </button>
          </div>
        ) : (
          <span className="af-agb-mem__footcount">
            <strong>{items.length}</strong> {items.length === 1 ? "memory" : "memories"}
            {pausedCount > 0 ? ` · ${pausedCount} paused` : ""}
          </span>
        )}
      </footer>

      {showHint ? (
        <p className="af-agb-mem__hint">
          Hover any memory to edit, pause, or forget it with a 10-second undo window.
        </p>
      ) : null}
    </div>
  );
}

export { MemoryPanelDemo as AfMemoryPanelPattern, MemoryPanelDemo as AfMemoryPanel };
export type { AfMemoryPanelPatternProps as AfMemoryPanelProps };
