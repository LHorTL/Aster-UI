import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import { cn, useControllableState } from "../../primitives";
import {
  type CellPoint,
  Demo,
  Note,
  SESSION_ROWS,
  SessionDrawer,
  type SessionRow,
  TableCheck,
  sessionTone,
} from "../_shared/data";

export interface AfDataTablePatternProps {
  /** Table card title. */
  title?: ReactNode;
  /** Controlled rows. */
  rows?: SessionRow[];
  /** Uncontrolled initial rows. */
  defaultRows?: SessionRow[];
  /** Row list change callback. */
  onRowsChange?: (rows: SessionRow[]) => void;
  /** Single row drawer save callback. */
  onRowSave?: (row: SessionRow) => void;
  /** Bulk delete/archive callback. */
  onArchive?: (archivedRows: SessionRow[]) => void;
  /** Show specimen note below stage (default false). */
  showNote?: boolean;
  /** Extra class name. */
  className?: string;
}

const STATUS_CYCLE: SessionRow["status"][] = ["Design", "Issue tracking", "Hosting", "Website", "Video"];

function normalizeStatus(raw: string): SessionRow["status"] {
  const t = raw.trim();
  return t || "Design";
}

function ToolBrandLogo({ row }: { row: SessionRow }) {
  const key = row.brand ?? row.title.trim().toLowerCase();
  if (key === "figma") {
    return (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden>
        <path d="M5.5 2h2.5v4H5.5a2 2 0 1 1 0-4Z" fill="#F24E1E" />
        <path d="M8 2h2.5a2 2 0 1 1 0 4H8V2Z" fill="#FF7262" />
        <path d="M8 6h2.5a2 2 0 1 1 0 4H8V6Z" fill="#1ABCFE" />
        <path d="M5.5 6H8v4H5.5a2 2 0 1 1 0-4Z" fill="#A259FF" />
        <path d="M5.5 10H8v2a2 2 0 1 1-2.5-1.94V10Z" fill="#0ACF83" />
      </svg>
    );
  }
  if (key === "linear") {
    return (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="6" fill="#5E6AD2" />
        <path d="M3.4 9.2 6.8 12.6M2.7 6.8l6.5 6.5M4.5 4.5l7 7" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (key === "vercel") {
    return (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden>
        <path d="M8 2.5 14 13H2L8 2.5Z" />
      </svg>
    );
  }
  if (key === "framer") {
    return (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden>
        <path d="M3.5 2h9v4.2H8L3.5 2Zm0 4.2H8l4.5 4.3h-9V6.2Zm0 4.3H8V14l-4.5-3.5Z" />
      </svg>
    );
  }
  if (key === "loom") {
    return (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="#625DF5" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
        <circle cx="8" cy="8" r="2.1" />
        <path d="M8 2v2.2M8 11.8V14M2 8h2.2M11.8 8H14M3.8 3.8l1.6 1.6M10.6 10.6l1.6 1.6M12.2 3.8l-1.6 1.6M5.4 10.6l-1.6 1.6" />
      </svg>
    );
  }
  void row;
  return <AfIcon name="file" size={15} />;
}

/**
 * Data Table (Design Stack 1:1): 52px header bar with undo/redo snapshots, 36px sortable column headers,
 * 40px rows with brand marks & category pills, rectangular cell range selection, TSV copy/cut/paste,
 * double-click / Enter inline cell editing, and record detail drawer.
 */
function DataTableDemo({
  title = "Design Stack",
  rows: rowsProp,
  defaultRows = SESSION_ROWS,
  onRowsChange,
  onRowSave,
  onArchive,
  showNote = false,
  className,
}: AfDataTablePatternProps = {}) {
  const [rows, setRows] = useControllableState<SessionRow[]>({
    value: rowsProp,
    defaultValue: defaultRows,
    onChange: onRowsChange,
  });
  const [checked, setChecked] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: "id" | "status" | "time" | null; dir: "asc" | "desc" }>({ key: null, dir: "desc" });
  const [range, setRange] = useState<{ anchor: CellPoint; end: CellPoint } | null>(null);
  const [editing, setEditing] = useState<{ rowId: string; col: 0 | 2; draft: string } | null>(null);
  const [detail, setDetail] = useState<SessionRow | null>(null);
  const [history, setHistory] = useState<SessionRow[][]>([]);
  const [redoStack, setRedoStack] = useState<SessionRow[][]>([]);
  const dragging = useRef(false);
  const tableRef = useRef<HTMLTableElement>(null);

  const commitRows = (updater: (current: SessionRow[]) => SessionRow[]) => {
    setRows((current) => {
      const next = updater(current);
      if (next === current) return current;
      setHistory((prev) => [...prev.slice(-39), current]);
      setRedoStack([]);
      return next;
    });
  };

  useEffect(() => {
    const release = () => {
      dragging.current = false;
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
    };
  }, []);

  const visible = useMemo(() => {
    if (!sort.key) return rows;
    const direction = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sort.key === "status") return a.status.localeCompare(b.status, "en-US") * direction;
      if (sort.key === "time") return a.time.localeCompare(b.time, "en-US") * direction;
      return a.title.localeCompare(b.title, "en-US") * direction;
    });
  }, [rows, sort]);

  const selectedVisible = visible.filter((row) => checked.includes(row.id));
  const allChecked = visible.length > 0 && selectedVisible.length === visible.length;
  const mixedChecked = selectedVisible.length > 0 && !allChecked;

  const rangeBounds = useMemo(() => {
    if (!range) return null;
    return {
      r0: Math.min(range.anchor.row, range.end.row),
      r1: Math.max(range.anchor.row, range.end.row),
      c0: Math.min(range.anchor.col, range.end.col),
      c1: Math.max(range.anchor.col, range.end.col),
    };
  }, [range]);

  const contains = (row: number, col: number) =>
    Boolean(rangeBounds && row >= rangeBounds.r0 && row <= rangeBounds.r1 && col >= rangeBounds.c0 && col <= rangeBounds.c1);
  const cells = rangeBounds ? (rangeBounds.r1 - rangeBounds.r0 + 1) * (rangeBounds.c1 - rangeBounds.c0 + 1) : 0;

  const toggle = (id: string) =>
    setChecked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const toggleAll = () => {
    setChecked((current) =>
      allChecked
        ? current.filter((id) => !visible.some((row) => row.id === id))
        : [...new Set([...current, ...visible.map((row) => row.id)])],
    );
  };

  const archive = () => {
    if (!selectedVisible.length) return;
    const removed = selectedVisible;
    commitRows((current) => current.filter((row) => !removed.some((item) => item.id === row.id)));
    onArchive?.(removed);
    setChecked([]);
    setRange(null);
  };

  const undo = () => {
    const prevSnapshot = history[history.length - 1];
    if (!prevSnapshot) return;
    setHistory((cur) => cur.slice(0, -1));
    setRedoStack((cur) => [...cur, rows]);
    setRows(prevSnapshot);
  };

  const redo = () => {
    const nextSnapshot = redoStack[redoStack.length - 1];
    if (!nextSnapshot) return;
    setRedoStack((cur) => cur.slice(0, -1));
    setHistory((cur) => [...cur, rows]);
    setRows(nextSnapshot);
  };

  const toggleSort = (key: "id" | "status" | "time") => {
    setSort((current) => ({ key, dir: current.key === key && current.dir === "desc" ? "asc" : "desc" }));
    setRange(null);
    setEditing(null);
  };

  const getCellText = (row: SessionRow, col: number): string => {
    if (col === 0) return row.title;
    if (col === 1) return row.status;
    if (col === 2) return row.project;
    return row.time;
  };

  const applyCellText = (row: SessionRow, col: number, value: string): SessionRow => {
    if (col === 0) return { ...row, title: value || "Untitled" };
    if (col === 1) return { ...row, status: normalizeStatus(value) };
    if (col === 2) return { ...row, project: value || "example.com" };
    return row;
  };

  const openInlineEdit = (rowIndex: number, col: number) => {
    const target = visible[rowIndex];
    if (!target) return;
    if (col === 3) {
      setDetail(target);
      return;
    }
    if (col === 1) {
      const idx = STATUS_CYCLE.indexOf(target.status);
      const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]!;
      commitRows((cur) => cur.map((r) => (r.id === target.id ? { ...r, status: nextStatus } : r)));
      return;
    }
    setEditing({ rowId: target.id, col: col as 0 | 2, draft: getCellText(target, col) });
  };

  const commitInlineEdit = () => {
    if (!editing) return;
    const { rowId, col, draft } = editing;
    setEditing(null);
    commitRows((cur) =>
      cur.map((r) => {
        if (r.id !== rowId) return r;
        const trimmed = draft.trim();
        if (col === 0 && trimmed && trimmed !== r.title) return { ...r, title: trimmed };
        if (col === 2 && trimmed && trimmed !== r.project) return { ...r, project: trimmed };
        return r;
      }),
    );
  };

  const clearRangeCells = () => {
    if (!rangeBounds) return;
    const idColPatch = new Map<string, Partial<SessionRow>>();
    for (let r = rangeBounds.r0; r <= rangeBounds.r1; r++) {
      const target = visible[r];
      if (!target) continue;
      const patch: Partial<SessionRow> = {};
      for (let c = rangeBounds.c0; c <= rangeBounds.c1; c++) {
        if (c === 0) patch.title = "Untitled";
        else if (c === 1) patch.status = "Design";
        else if (c === 2) patch.project = "—";
      }
      idColPatch.set(target.id, patch);
    }
    if (!idColPatch.size) return;
    commitRows((cur) => cur.map((row) => (idColPatch.has(row.id) ? { ...row, ...idColPatch.get(row.id) } : row)));
  };

  const onCopyRange = (event: ReactClipboardEvent<HTMLDivElement>, cut = false) => {
    if (!rangeBounds || editing) return;
    const lines: string[] = [];
    for (let r = rangeBounds.r0; r <= rangeBounds.r1; r++) {
      const row = visible[r];
      if (!row) continue;
      const cols: string[] = [];
      for (let c = rangeBounds.c0; c <= rangeBounds.c1; c++) cols.push(getCellText(row, c));
      lines.push(cols.join("\t"));
    }
    event.clipboardData.setData("text/plain", lines.join("\n"));
    event.preventDefault();
    if (cut) clearRangeCells();
  };

  const onPasteRange = (event: ReactClipboardEvent<HTMLDivElement>) => {
    if (!rangeBounds || editing) return;
    const raw = event.clipboardData.getData("text/plain");
    if (!raw) return;
    event.preventDefault();
    const matrix = raw.replace(/\r\n/g, "\n").split("\n").map((line) => line.split("\t"));
    const updates = new Map<string, SessionRow>();
    for (let dr = 0; dr < matrix.length; dr++) {
      const targetRow = visible[rangeBounds.r0 + dr];
      if (!targetRow) break;
      let nextRow = updates.get(targetRow.id) ?? targetRow;
      for (let dc = 0; dc < matrix[dr].length; dc++) {
        const col = rangeBounds.c0 + dc;
        if (col > 2) break;
        nextRow = applyCellText(nextRow, col, matrix[dr][dc]);
      }
      updates.set(targetRow.id, nextRow);
    }
    if (updates.size) commitRows((cur) => cur.map((r) => updates.get(r.id) ?? r));
  };

  const startCell = (rowIndex: number, col: number, extend: boolean) => {
    const point = { row: rowIndex, col };
    if (extend && range) setRange({ anchor: range.anchor, end: point });
    else setRange({ anchor: point, end: point });
  };

  const cellKeyDown = (event: ReactKeyboardEvent<HTMLTableCellElement>, rowIndex: number, col: number) => {
    if (editing) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setRange(null);
      return;
    }
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      if (event.metaKey || event.ctrlKey || event.altKey) {
        const row = visible[rowIndex];
        if (row) setDetail(row);
      } else {
        openInlineEdit(rowIndex, col);
      }
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      clearRangeCells();
      return;
    }
    const delta = ({ ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] } as Record<string, number[]>)[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = {
      row: Math.max(0, Math.min(visible.length - 1, rowIndex + delta[0])),
      col: Math.max(0, Math.min(3, col + delta[1])),
    };
    if (event.shiftKey && range) setRange({ anchor: range.anchor, end: next });
    else setRange({ anchor: next, end: next });
    tableRef.current?.querySelector<HTMLElement>(`[data-cell="${next.row}-${next.col}"]`)?.focus();
  };

  const cellProps = (rowIndex: number, col: number, rowId: string) => {
    const isEditingThis = editing?.rowId === rowId && editing.col === col;
    return {
      "data-cell": `${rowIndex}-${col}`,
      "data-in-range": contains(rowIndex, col) || undefined,
      "data-active": range && range.end.row === rowIndex && range.end.col === col ? "" : undefined,
      tabIndex: range ? (range.end.row === rowIndex && range.end.col === col ? 0 : -1) : rowIndex === 0 && col === 0 ? 0 : -1,
      onPointerDown: (event: ReactPointerEvent<HTMLTableCellElement>) => {
        if (event.button !== 0 || isEditingThis) return;
        if ((event.target as HTMLElement).closest("button, input")) return;
        event.preventDefault();
        if (editing) commitInlineEdit();
        event.currentTarget.focus();
        startCell(rowIndex, col, event.shiftKey);
        dragging.current = true;
      },
      onPointerEnter: () => {
        if (!dragging.current) return;
        setRange((current) =>
          current ? { anchor: current.anchor, end: { row: rowIndex, col } } : { anchor: { row: rowIndex, col }, end: { row: rowIndex, col } },
        );
      },
      onKeyDown: (event: ReactKeyboardEvent<HTMLTableCellElement>) => cellKeyDown(event, rowIndex, col),
      onDoubleClick: () => openInlineEdit(rowIndex, col),
    };
  };

  const addRow = () => {
    const nextNumber = Math.max(...rows.map((row) => Number(row.id.replace("S-", "")) || 0), 240) + 1;
    commitRows((current) => [
      { id: `S-0${nextNumber}`, title: "Notion", project: "notion.so", status: "Design", time: "Jun 14, 2026" },
      ...current,
    ]);
    setRange(null);
  };

  return (
    <Demo>
      <section className={cn("af-dt-dtc", className)} aria-label={typeof title === "string" ? title : "Data table"}>
        <div className="af-dt-dtc__head">
          <span className="af-dt-dtc__title-icon" aria-hidden>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              <path d="M3 4.5h10M3 8h10M3 11.5h6.5" />
            </svg>
          </span>
          <h3 className="af-dt-dtc__title">{title}</h3>
          <div className="af-dt-dtc__tools">
            <button type="button" className="af-dt-dtc__tool" aria-label="Undo" title="Undo (⌘Z)" disabled={!history.length} onClick={undo}>
              <AfIcon name="undo" size={14} />
            </button>
            <button type="button" className="af-dt-dtc__tool" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!redoStack.length} onClick={redo}>
              <AfIcon name="redo" size={14} />
            </button>
          </div>
        </div>
        <div
          className="af-dt-dtc__scroll"
          onCopy={(e) => onCopyRange(e, false)}
          onCut={(e) => onCopyRange(e, true)}
          onPaste={onPasteRange}
        >
          <table ref={tableRef} className="af-dt-dtc__table" role="grid" aria-label="Design Stack" aria-multiselectable="true">
            <thead>
              <tr>
                <th className="af-dt-dtc__select">
                  <TableCheck checked={allChecked} mixed={mixedChecked} label="Select all rows" onChange={toggleAll} />
                </th>
                <th>
                  <button
                    type="button"
                    className="af-dt-dtc__th"
                    aria-sort={sort.key === "id" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    onClick={() => toggleSort("id")}
                  >
                    <span className="af-dt-dtc__col-icon"><AfIcon name="list" size={13} /></span>
                    <span className="af-dt-dtc__th-label">Tool</span>
                    <span className="af-dt-dtc__sort" data-dir={sort.key === "id" ? sort.dir : undefined} aria-hidden>
                      <AfIcon name="chevronDown" size={12} />
                    </span>
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="af-dt-dtc__th"
                    aria-sort={sort.key === "status" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    onClick={() => toggleSort("status")}
                  >
                    <span className="af-dt-dtc__col-icon"><AfIcon name="grid" size={13} /></span>
                    <span className="af-dt-dtc__th-label">Category</span>
                    <span className="af-dt-dtc__sort" data-dir={sort.key === "status" ? sort.dir : undefined} aria-hidden>
                      <AfIcon name="chevronDown" size={12} />
                    </span>
                  </button>
                </th>
                <th>
                  <button type="button" className="af-dt-dtc__th" aria-sort="none">
                    <span className="af-dt-dtc__col-icon"><AfIcon name="external" size={13} /></span>
                    <span className="af-dt-dtc__th-label">Website</span>
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="af-dt-dtc__th"
                    aria-sort={sort.key === "time" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    onClick={() => toggleSort("time")}
                  >
                    <span className="af-dt-dtc__col-icon"><AfIcon name="calendar" size={13} /></span>
                    <span className="af-dt-dtc__th-label">Renews</span>
                    <span className="af-dt-dtc__sort" data-dir={sort.key === "time" ? sort.dir : undefined} aria-hidden>
                      <AfIcon name="chevronDown" size={12} />
                    </span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, rowIndex) => (
                <tr key={row.id} data-selected={checked.includes(row.id) || undefined}>
                  <td className="af-dt-dtc__select">
                    <TableCheck checked={checked.includes(row.id)} label={`Select ${row.title}`} onChange={() => toggle(row.id)} />
                  </td>
                  <td {...cellProps(rowIndex, 0, row.id)}>
                    {editing?.rowId === row.id && editing.col === 0 ? (
                      <input
                        className="af-dt-dtc__editor"
                        value={editing.draft}
                        aria-label="Edit tool name"
                        autoFocus
                        onChange={(e) => setEditing({ ...editing, draft: e.target.value })}
                        onBlur={commitInlineEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitInlineEdit();
                            tableRef.current?.querySelector<HTMLElement>(`[data-cell="${rowIndex}-0"]`)?.focus();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setEditing(null);
                            tableRef.current?.querySelector<HTMLElement>(`[data-cell="${rowIndex}-0"]`)?.focus();
                          }
                        }}
                      />
                    ) : (
                      <span className="af-dt-dtc__name">
                        <span className="af-dt-dtc__logo" aria-hidden>
                          <ToolBrandLogo row={row} />
                        </span>
                        <span className="af-dt-dtc__name-text">{row.title}</span>
                      </span>
                    )}
                  </td>
                  <td {...cellProps(rowIndex, 1, row.id)}>
                    <span className="af-dt-dtc__tag" data-tone={sessionTone(row.status)}>
                      {row.status}
                    </span>
                  </td>
                  <td {...cellProps(rowIndex, 2, row.id)}>
                    {editing?.rowId === row.id && editing.col === 2 ? (
                      <input
                        className="af-dt-dtc__editor"
                        value={editing.draft}
                        aria-label="Edit website"
                        autoFocus
                        onChange={(e) => setEditing({ ...editing, draft: e.target.value })}
                        onBlur={commitInlineEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitInlineEdit();
                            tableRef.current?.querySelector<HTMLElement>(`[data-cell="${rowIndex}-2"]`)?.focus();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setEditing(null);
                            tableRef.current?.querySelector<HTMLElement>(`[data-cell="${rowIndex}-2"]`)?.focus();
                          }
                        }}
                      />
                    ) : (
                      <span className="af-dt-dtc__link">{row.project}</span>
                    )}
                  </td>
                  <td {...cellProps(rowIndex, 3, row.id)}>
                    <span className="af-dt-dtc__timecell">
                      <span className="af-dt-dtc__text">{row.time}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length ? <p className="af-dt-dtc__empty">No rows</p> : null}
        </div>
        <div className="af-dt-dtc__foot">
          {selectedVisible.length ? (
            <div className="af-dt-dtc__bulk">
              <span>{selectedVisible.length} selected</span>
              <button type="button" className="af-dt-dtc__add af-dt-dtc__add--danger" onClick={archive}>
                <AfIcon name="trash" size={14} />
                Delete
              </button>
            </div>
          ) : (
            <button type="button" className="af-dt-dtc__add" onClick={addRow}>
              <AfIcon name="plus" size={14} />
              Add row
            </button>
          )}
          <span className="af-dt-dtc__hint">
            {range ? `${cells} cell${cells === 1 ? "" : "s"} selected · Enter to edit · ⌘C/V copy & paste` : "Double-click a cell to edit"}
          </span>
        </div>
      </section>
      {detail ? (
        <SessionDrawer
          row={detail}
          onClose={() => setDetail(null)}
          onSave={(next) => {
            commitRows((current) => current.map((row) => (row.id === next.id ? next : row)));
            onRowSave?.(next);
            setDetail(null);
          }}
        />
      ) : null}
      {showNote ? <Note>52px header bar, 36px column headers, 40px rows; supports drag range selection, inline editing, TSV copy/paste, and undo/redo.</Note> : null}
    </Demo>
  );
}

export { DataTableDemo as AfDataTablePattern, DataTableDemo as AfDataTable };
export type { AfDataTablePatternProps as AfDataTableProps };
