import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import {
  useAfLayerContainer,
  useControllableState,
  useExitTransition,
  useImeEnterGuard,
  useMenuHighlight,
  useOverlayBranch,
  useOverlayFocusTrap,
} from "../../primitives";

/** 命令面板中的一条命令。 */
export type AfCommand = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  /** 右侧快捷键徽章。 */
  kbd?: string;
  /** 附加检索别名词库（如拼音、英文缩写）。 */
  keywords?: string[];
  /** 是否禁用。 */
  disabled?: boolean;
  /** 图标名称或自定义节点。 */
  icon?: AffectIconKey | ReactNode;
  /** 应用/品牌彩色徽标节点（优先于 `icon` 展示在 20x20 圆角图标槽中）。 */
  logo?: ReactNode;
  /** 单项直接执行回调（可选，亦可通过 `onRun(command)` 统一处理）。 */
  onSelect?: () => void;
  /** 多级子命令列表；选中后推入命令栈，按 Backspace / Esc 返回上一级。 */
  children?: AfCommand[];
};

export type AfCommandPaletteProps = {
  /** 受控打开状态。 */
  open?: boolean;
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean;
  /** 打开状态变化回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 关闭回调。 */
  onClose?: () => void;
  /** 命令列表。 */
  commands: AfCommand[];
  /** 执行命令回调。 */
  onRun?: (command: AfCommand) => void;
  /** 可选指定挂载容器；省略时自动接入 AfLayer / Theme 浮层根。 */
  container?: HTMLElement | null;
  /** 搜索占位文字。 */
  placeholder?: string;
  /** 无匹配结果时的提示文案。 */
  emptyMessage?: ReactNode;
};

/** 把命令文字按搜索词切成普通段与浅色高亮段。 */
function highlightCommand(label: string, query: string): ReactNode {
  const needle = query.trim().toLowerCase();
  if (!needle) return label;
  const lower = label.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  let index = lower.indexOf(needle);
  while (index >= 0) {
    if (index > from) parts.push(label.slice(from, index));
    parts.push(
      <mark key={index} className="af-cmd__mark">
        {label.slice(index, index + needle.length)}
      </mark>,
    );
    from = index + needle.length;
    index = lower.indexOf(needle, from);
  }
  if (from === 0) return label;
  if (from < label.length) parts.push(label.slice(from));
  return parts;
}

function renderCommandLeading(command: AfCommand) {
  if (command.logo) {
    return (
      <span className="af-cmd__logo" aria-hidden="true">
        {command.logo}
      </span>
    );
  }
  if (typeof command.icon === "string") {
    return (
      <span className="af-cmd__icon" aria-hidden="true">
        <AfIcon name={command.icon as AffectIconKey} size={20} />
      </span>
    );
  }
  if (command.icon) {
    return (
      <span className="af-cmd__logo" aria-hidden="true">
        {command.icon}
      </span>
    );
  }
  return (
    <span className="af-cmd__icon" aria-hidden="true">
      <AfIcon name="terminal" size={20} />
    </span>
  );
}

/**
 * 命令面板：600×448、圆角 12；搜索行 48、结果行 36、图标 20/5；
 * 支持检索别名 `keywords`、品牌 `logo`、Tab 分组快跳、`⌘1–⌘5` 直达热键、遮罩防误关与多级命令栈导航（Backspace / Esc 退回上级）。
 */
export function AfCommandPalette({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onClose,
  commands,
  onRun,
  container,
  placeholder = "Type a command or search…",
  emptyMessage,
}: AfCommandPaletteProps) {
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [stack, setStack] = useState<AfCommand[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pointerDownOutsideRef = useRef(false);
  const queryRef = useRef(query);
  queryRef.current = query;
  const stackLenRef = useRef(stack.length);
  stackLenRef.current = stack.length;

  const resolvedContainer = useAfLayerContainer(container);
  const { mounted, closing } = useExitTransition(open, 150);
  const { OverlayBranchScope, hasOpenChild } = useOverlayBranch(panelRef, mounted);
  const ime = useImeEnterGuard();

  const requestClose = () => {
    setOpen(false);
    onClose?.();
  };

  const currentCommands = stack.length > 0 ? (stack[stack.length - 1].children ?? []) : commands;

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return currentCommands;
    return currentCommands.filter((command) => {
      if (command.label.toLowerCase().includes(needle)) return true;
      if (command.group.toLowerCase().includes(needle)) return true;
      if (command.hint?.toLowerCase().includes(needle)) return true;
      return Boolean(command.keywords?.some((kw) => kw.toLowerCase().includes(needle)));
    });
  }, [currentCommands, query]);

  const enabledIndexes = useMemo(
    () => results.map((cmd, idx) => (!cmd.disabled ? idx : -1)).filter((idx) => idx >= 0),
    [results],
  );

  const groupStartIndexes = useMemo(() => {
    const starts: number[] = [];
    let prevGroup = "";
    results.forEach((cmd, idx) => {
      if (cmd.group !== prevGroup) {
        prevGroup = cmd.group;
        const firstEnabledInGroup = results.findIndex(
          (candidate, cIdx) => cIdx >= idx && candidate.group === cmd.group && !candidate.disabled,
        );
        if (firstEnabledInGroup >= 0 && !starts.includes(firstEnabledInGroup)) {
          starts.push(firstEnabledInGroup);
        }
      }
    });
    return starts;
  }, [results]);

  const safeActive = enabledIndexes.includes(active) ? active : (enabledIndexes[0] ?? -1);
  const thumb = useMenuHighlight(listRef, safeActive, open, `${stack.length}:${query}:${results.length}`);

  useOverlayFocusTrap({
    open,
    panelRef,
    container: resolvedContainer,
    onClose: requestClose,
    shouldIgnoreEscape: () => Boolean(queryRef.current) || stackLenRef.current > 0 || hasOpenChild(),
  });

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setStack([]);
    setActive(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!mounted || !resolvedContainer) return null;

  const executeCommand = (command: AfCommand) => {
    if (command.disabled) return;
    if (command.children?.length) {
      setStack((prev) => [...prev, command]);
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
      return;
    }
    command.onSelect?.();
    onRun?.(command);
    requestClose();
  };

  /** 方向键跳过禁用项移动高亮，Tab 跨分组跳转，⌘1–⌘5 直达前五项，Esc 先清空或退栈再关闭。 */
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (query) {
        setQuery("");
        setActive(0);
      } else if (stack.length > 0) {
        setStack((prev) => prev.slice(0, -1));
        setActive(0);
      } else {
        requestClose();
      }
      return;
    }
    if ((event.metaKey || event.ctrlKey) && !event.altKey && /^[1-5]$/.test(event.key)) {
      const slot = Number(event.key) - 1;
      const targetIdx = enabledIndexes[slot];
      if (targetIdx !== undefined && results[targetIdx]) {
        event.preventDefault();
        executeCommand(results[targetIdx]);
      }
      return;
    }
    if (event.key === "Tab" && groupStartIndexes.length > 1) {
      event.preventDefault();
      const currentGroup = safeActive >= 0 ? results[safeActive]?.group : undefined;
      const currentGroupPos = groupStartIndexes.findIndex((idx) => results[idx]?.group === currentGroup);
      const step = event.shiftKey ? -1 : 1;
      const nextGroupPos =
        currentGroupPos < 0
          ? 0
          : (currentGroupPos + step + groupStartIndexes.length) % groupStartIndexes.length;
      setActive(groupStartIndexes[nextGroupPos]);
      return;
    }
    if (event.key === "Backspace" && !query && stack.length > 0) {
      event.preventDefault();
      setStack((prev) => prev.slice(0, -1));
      setActive(0);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (ime.shouldBlockEnter(event)) return;
      event.preventDefault();
      if (!enabledIndexes.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const pos = enabledIndexes.indexOf(safeActive);
      const nextPos = pos < 0 ? 0 : (pos + step + enabledIndexes.length) % enabledIndexes.length;
      setActive(enabledIndexes[nextPos]);
      return;
    }
    if (event.key === "Home" && enabledIndexes.length > 0) {
      event.preventDefault();
      setActive(enabledIndexes[0]);
      return;
    }
    if (event.key === "End" && enabledIndexes.length > 0) {
      event.preventDefault();
      setActive(enabledIndexes[enabledIndexes.length - 1]);
      return;
    }
    if (event.key === "Enter" && safeActive >= 0 && results[safeActive]) {
      if (ime.shouldBlockEnter(event)) return;
      event.preventDefault();
      executeCommand(results[safeActive]);
    }
  };

  let lastGroup = "";
  return createPortal(
    <OverlayBranchScope>
      <div
        className="af-cmd"
        data-af-overlay="true"
        data-closing={closing || undefined}
        {...(closing ? ({ inert: "true" as unknown as boolean } as Record<string, unknown>) : null)}
        onPointerDown={(event) => {
          pointerDownOutsideRef.current = !closing && event.target === event.currentTarget;
        }}
        onPointerUp={(event) => {
          const startedOutside = pointerDownOutsideRef.current;
          pointerDownOutsideRef.current = false;
          if (startedOutside && !closing && event.target === event.currentTarget) {
            requestClose();
          }
        }}
      >
        <div
          ref={panelRef}
          className="af-cmd__panel"
          data-closing={closing || undefined}
          role="dialog"
          aria-modal="true"
          aria-label="Command menu"
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          <div className="af-cmd__search">
            <AfIcon name="search" size={16} />
            {stack.map((crumb, idx) => (
              <button
                key={crumb.id}
                type="button"
                className="af-cmd__crumb"
                onClick={() => {
                  setStack((prev) => prev.slice(0, idx));
                  setActive(0);
                  inputRef.current?.focus({ preventScroll: true });
                }}
              >
                {crumb.label}
              </button>
            ))}
            <input
              ref={inputRef}
              data-autofocus
              value={query}
              placeholder={stack.length > 0 ? `Search in "${stack[stack.length - 1].label}"…` : placeholder}
              aria-label="Search commands"
              onCompositionStart={ime.onCompositionStart}
              onCompositionEnd={ime.onCompositionEnd}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
            />
            <kbd className="af-kbd" aria-hidden="true">
              Esc
            </kbd>
          </div>
          <div className="af-cmd__list" ref={listRef} role="listbox" aria-label="Commands">
            {thumb ? (
              <span
                className="af-cmd__thumb"
                style={{ transform: `translateY(${thumb.y}px)`, height: thumb.height } as CSSProperties}
                aria-hidden="true"
              />
            ) : null}
            {results.length === 0 ? (
              <div className="af-cmd__empty">
                {emptyMessage ?? (
                  <>
                    <strong>No results for “{query}”</strong>
                    <span>Try a shorter keyword or press Esc to clear</span>
                  </>
                )}
              </div>
            ) : null}
            {results.map((command, index) => {
              const header = command.group !== lastGroup ? command.group : null;
              lastGroup = command.group;
              return (
                <div key={command.id}>
                  {header ? <div className="af-cmd__group">{header}</div> : null}
                  <div
                    className="af-cmd__item"
                    role="option"
                    aria-selected={index === safeActive}
                    aria-disabled={command.disabled || undefined}
                    data-disabled={command.disabled || undefined}
                    data-menu-index={command.disabled ? undefined : index}
                    data-index={index}
                    onPointerMove={() => {
                      if (!command.disabled && safeActive !== index) setActive(index);
                    }}
                    onClick={() => executeCommand(command)}
                  >
                    {renderCommandLeading(command)}
                    <span className="af-cmd__label">{highlightCommand(command.label, query)}</span>
                    {command.hint ? <span className="af-cmd__hint">{command.hint}</span> : null}
                    {command.kbd ? <kbd className="af-kbd">{command.kbd}</kbd> : null}
                    {command.children?.length ? <AfIcon name="chevronRight" size={14} className="af-cmd__sub-arrow" /> : null}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="af-cmd__foot">
            <span>
              <kbd className="af-kbd">↑</kbd>
              <kbd className="af-kbd">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="af-kbd">↵</kbd> to select
            </span>
            {groupStartIndexes.length > 1 ? (
              <span>
                <kbd className="af-kbd">Tab</kbd> to jump between sections
              </span>
            ) : null}
            {stack.length > 0 ? (
              <span>
                <kbd className="af-kbd">⌫</kbd> to go back
              </span>
            ) : null}
            <span>
              <kbd className="af-kbd">Esc</kbd> {stack.length > 0 ? "to go back" : "to close"}
            </span>
          </div>
        </div>
      </div>
    </OverlayBranchScope>,
    resolvedContainer,
  );
}
