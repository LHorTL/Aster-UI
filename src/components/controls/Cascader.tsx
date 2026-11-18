import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefAttributes,
} from "react";
import { AfIcon, type AfIconName } from "../../icons";
import { cn, composeRefs, useControllableState, useImeEnterGuard, useKeyedHighlight, useMenuHighlight } from "../../primitives";
import { AfSpinner } from "../display/Spinner";
import { AfPopover } from "../overlay/Popover";
import { useAfFormFieldControl } from "./FormField";

/** 级联选项树节点。 */
export type AfCascaderOption = {
  value: string;
  label: string;
  description?: string;
  icon?: AfIconName | ReactNode;
  disabled?: boolean;
  /** 是否为叶子节点；配合 `loadData` 异步加载子级时可显式设为 `false`。 */
  isLeaf?: boolean;
  children?: AfCascaderOption[];
};

/** 级联选择器多选回显策略。 */
export type AfCascaderCheckedStrategy = "SHOW_PARENT" | "SHOW_CHILD";

/** 级联选择器基础属性。 */
export type AfCascaderBaseProps = {
  /** 树形选项数据。 */
  options: AfCascaderOption[];
  /** 触发器展示占位提示。 */
  placeholder?: string;
  /** 无障碍标签。 */
  label?: string;
  /** 原生表单字段名（渲染隐藏域参与 FormData 提交）。 */
  name?: string;
  /** 尺寸。 */
  size?: "sm" | "md" | "lg";
  /** 最小宽度。 */
  width?: number | string;
  /** 次级菜单展开方式：点击展开（默认）或悬停即时展开。 */
  expandTrigger?: "click" | "hover";
  /** 是否允许框内关键字扁平检索路径。 */
  searchable?: boolean;
  /** 受控搜索关键词。 */
  searchValue?: string;
  /** 搜索关键词变化回调。 */
  onSearch?: (value: string) => void;
  /** 是否允许选择任意父级（不一定要选到叶子节点）。 */
  changeOnSelect?: boolean;
  /** 异步动态加载下级节点回调。 */
  loadData?: (selectedOptions: AfCascaderOption[]) => Promise<void> | void;
  /** 允许清空已选路径。 */
  allowClear?: boolean;
  /** `allowClear` 兼容别名。 */
  clearable?: boolean;
  /** 清空回调。 */
  onClear?: () => void;
  /** 禁用态。 */
  disabled?: boolean;
  /** 错误态。 */
  invalid?: boolean;
  /** 自定义路径分隔符，默认 `" / "`。 */
  pathSeparator?: string;
  /** 自定义单选路径文本渲染。 */
  displayRender?: (labels: string[], selectedOptions: AfCascaderOption[]) => ReactNode;
  /** 空数据文案。 */
  emptyText?: ReactNode;
  /** 受控浮层开合态。 */
  open?: boolean;
  /** 非受控初始浮层开合态。 */
  defaultOpen?: boolean;
  /** 浮层开合变化回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 指定浮层挂载容器。 */
  container?: HTMLElement | null;
  /** 控件 id。 */
  id?: string;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
};

/** 单选级联属性。 */
export type AfCascaderSingleProps = AfCascaderBaseProps & {
  multiple?: false;
  /** 受控选中路径。 */
  value?: string[];
  /** 非受控初始选中路径。 */
  defaultValue?: string[];
  /** 路径变更回调。 */
  onChange?: (value: string[], selectedOptions: AfCascaderOption[]) => void;
};

/** 多选级联属性。 */
export type AfCascaderMultipleProps = AfCascaderBaseProps & {
  multiple: true;
  /** 受控多选路径集合。 */
  value?: string[][];
  /** 非受控初始多选路径集合。 */
  defaultValue?: string[][];
  /** 多选路径变更回调。 */
  onChange?: (value: string[][], selectedOptions: AfCascaderOption[][]) => void;
  /** 触发器最多展示多少个已选标签，其余折叠为 +N。 */
  maxTagCount?: number;
  /** 多选值回显策略：仅返回子节点（默认）或全选时折叠返回父节点。 */
  showCheckedStrategy?: AfCascaderCheckedStrategy;
};

/** 级联选择器属性。 */
export type AfCascaderProps = AfCascaderSingleProps | AfCascaderMultipleProps;

export type AfCascaderComponent = {
  (props: AfCascaderSingleProps & RefAttributes<HTMLDivElement>): ReactElement | null;
  (props: AfCascaderMultipleProps & RefAttributes<HTMLDivElement>): ReactElement | null;
  displayName?: string;
};

const PATH_SEP = "\0";

function pathKey(path: string[]): string {
  return path.join(PATH_SEP);
}

function isExactPrefix(target: string[], prefix: string[]): boolean {
  if (target.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (target[i] !== prefix[i]) return false;
  }
  return true;
}

function findOptionPath(options: AfCascaderOption[], values: string[]): AfCascaderOption[] {
  const result: AfCascaderOption[] = [];
  let level = options;
  for (const val of values) {
    const found = level.find((o) => o.value === val);
    if (!found) break;
    result.push(found);
    level = found.children ?? [];
  }
  return result;
}

function collectSelectableLeafPaths(opt: AfCascaderOption, prefix: string[]): string[][] {
  if (opt.disabled) return [];
  if (!opt.children?.length) return [prefix];
  const out: string[][] = [];
  for (const child of opt.children) {
    out.push(...collectSelectableLeafPaths(child, [...prefix, child.value]));
  }
  return out;
}

function expandMultiPathsToLeafKeys(options: AfCascaderOption[], paths: string[][]): Set<string> {
  const keys = new Set<string>();
  for (const path of paths) {
    if (!path.length) continue;
    const matched = findOptionPath(options, path);
    if (matched.length !== path.length) {
      keys.add(pathKey(path));
      continue;
    }
    const last = matched[matched.length - 1];
    if (last.disabled) continue;
    if (last.children?.length) {
      for (const leaf of collectSelectableLeafPaths(last, path)) {
        keys.add(pathKey(leaf));
      }
    } else {
      keys.add(pathKey(path));
    }
  }
  return keys;
}

function computeCheckedPaths(
  leafKeys: Set<string>,
  options: AfCascaderOption[],
  strategy: AfCascaderCheckedStrategy,
): string[][] {
  const out: string[][] = [];
  const walk = (nodes: AfCascaderOption[], prefix: string[]) => {
    for (const node of nodes) {
      if (node.disabled) continue;
      const nodePath = [...prefix, node.value];
      if (!node.children?.length) {
        if (leafKeys.has(pathKey(nodePath))) out.push(nodePath);
        continue;
      }
      if (strategy === "SHOW_PARENT") {
        const leaves = collectSelectableLeafPaths(node, nodePath);
        if (leaves.length > 0 && leaves.every((lp) => leafKeys.has(pathKey(lp)))) {
          out.push(nodePath);
          continue;
        }
      }
      walk(node.children, nodePath);
    }
  };
  walk(options, []);
  return out;
}

function flattenPaths(
  options: AfCascaderOption[],
  includeNonLeaf: boolean,
  prefix: AfCascaderOption[] = [],
): AfCascaderOption[][] {
  const out: AfCascaderOption[][] = [];
  for (const opt of options) {
    const path = [...prefix, opt];
    if (!opt.children?.length) {
      out.push(path);
    } else {
      if (includeNonLeaf) out.push(path);
      out.push(...flattenPaths(opt.children, includeNonLeaf, path));
    }
  }
  return out;
}

function renderCascaderIcon(icon: AfIconName | ReactNode | undefined) {
  if (!icon) return null;
  if (typeof icon === "string") {
    return <AfIcon name={icon as AfIconName} size={13} className="af-cascader__item-icon" />;
  }
  return <span className="af-cascader__item-icon">{icon}</span>;
}

function highlightMatch(text: string, query: string): ReactNode {
  const needle = query.trim().toLowerCase();
  if (!needle) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="af-cmd__mark">{text.slice(idx, idx + needle.length)}</mark>
      {text.slice(idx + needle.length)}
    </>
  );
}

type FocusedCell = { col: number; value: string } | null;

type CascaderColumnProps = {
  col: AfCascaderOption[];
  colIdx: number;
  totalCols: number;
  expandedPath: string[];
  focusedCell: FocusedCell;
  open: boolean;
  multiple: boolean;
  singleValue: string[];
  selectedLeafKeys: Set<string>;
  loadingKeys: string[];
  expandTrigger: "click" | "hover";
  canExpandOption: (opt: AfCascaderOption) => boolean;
  onFocusCell: (cell: FocusedCell) => void;
  onExpandPath: (nextPath: string[]) => void;
  onTriggerLoadData: (nodePath: string[], opt: AfCascaderOption) => void;
  onToggleMultiNode: (nodePath: string[], opt: AfCascaderOption) => void;
  onClickNode: (colIdx: number, opt: AfCascaderOption) => void;
};

function CascaderColumn({
  col,
  colIdx,
  totalCols,
  expandedPath,
  focusedCell,
  open,
  multiple,
  singleValue,
  selectedLeafKeys,
  loadingKeys,
  expandTrigger,
  canExpandOption,
  onFocusCell,
  onExpandPath,
  onTriggerLoadData,
  onToggleMultiNode,
  onClickNode,
}: CascaderColumnProps) {
  const colRef = useRef<HTMLDivElement>(null);
  const colPrefix = expandedPath.slice(0, colIdx);
  const colHasFocus = focusedCell?.col === colIdx;
  const colThumb = useKeyedHighlight(colRef, colHasFocus ? focusedCell.value : null, open, `${col.length}:${colPrefix.join("/")}`);

  return (
    <div
      ref={colRef}
      className="af-cascader__col"
      data-col-index={colIdx}
      data-has-focus={colHasFocus || undefined}
    >
      {colThumb ? (
        <span
          className="af-menu__thumb"
          style={
            {
              transform: `translate(${colThumb.x}px, ${colThumb.y}px)`,
              width: colThumb.width,
              height: colThumb.height,
            } as CSSProperties
          }
          aria-hidden="true"
        />
      ) : null}
      {col.map((opt) => {
        const nodePath = [...colPrefix, opt.value];
        const nodeKey = pathKey(nodePath);
        const expandable = canExpandOption(opt);
        const isLoading = loadingKeys.includes(nodeKey);
        const isExpanded = colIdx < totalCols - 1 && expandedPath[colIdx] === opt.value;
        const isFocused = !opt.disabled && focusedCell?.col === colIdx && focusedCell.value === opt.value;

        let isSelected = false;
        let isSelectedLeaf = false;
        let isIndeterminate = false;

        if (multiple) {
          const leaves = collectSelectableLeafPaths(opt, nodePath);
          const checkedCount = leaves.filter((lp) => selectedLeafKeys.has(pathKey(lp))).length;
          isSelected = leaves.length > 0 && checkedCount === leaves.length;
          isIndeterminate = checkedCount > 0 && checkedCount < leaves.length;
          isSelectedLeaf = isSelected;
        } else {
          isSelected = singleValue.length > colIdx && isExactPrefix(singleValue, nodePath);
          isSelectedLeaf = isSelected && singleValue.length === nodePath.length;
        }

        return (
          <div
            key={opt.value}
            role="option"
            aria-selected={isSelected}
            aria-expanded={expandable ? isExpanded : undefined}
            aria-checked={multiple ? (isIndeterminate ? "mixed" : isSelected) : undefined}
            aria-disabled={opt.disabled || undefined}
            className="af-cascader__item"
            data-item-key={opt.value}
            data-focused={isFocused || undefined}
            data-expanded={isExpanded || undefined}
            data-selected={isSelected || undefined}
            data-disabled={opt.disabled || undefined}
            onPointerEnter={() => {
              if (opt.disabled) {
                onFocusCell(null);
                if (expandTrigger === "hover") {
                  onExpandPath(colPrefix);
                }
                return;
              }
              onFocusCell({ col: colIdx, value: opt.value });
              if (expandTrigger === "hover") {
                onExpandPath(expandable ? nodePath : colPrefix);
                if (opt.isLeaf === false && !opt.children?.length) {
                  onTriggerLoadData(nodePath, opt);
                }
              }
            }}
            onPointerMove={() => {
              if (opt.disabled) {
                if (focusedCell !== null) onFocusCell(null);
                return;
              }
              if (!focusedCell || focusedCell.col !== colIdx || focusedCell.value !== opt.value) {
                onFocusCell({ col: colIdx, value: opt.value });
              }
            }}
            onClick={() => onClickNode(colIdx, opt)}
          >
            {multiple ? (
              <span
                className="af-cascader__checkbox"
                data-checked={isSelected || undefined}
                data-indeterminate={isIndeterminate || undefined}
                aria-hidden="true"
                onClick={(event) => {
                  event.stopPropagation();
                  if (opt.disabled) return;
                  onToggleMultiNode(nodePath, opt);
                  if (expandable) {
                    onExpandPath(nodePath);
                  }
                }}
              >
                {isIndeterminate ? (
                  <span className="af-cascader__checkbox-dash" />
                ) : isSelected ? (
                  <AfIcon name="check" size={10} />
                ) : null}
              </span>
            ) : null}
            {renderCascaderIcon(opt.icon)}
            <span className="af-cascader__item-main">
              <span className="af-cascader__item-label">{opt.label}</span>
              {opt.description ? <span className="af-cascader__item-desc">{opt.description}</span> : null}
            </span>
            {isLoading ? (
              <AfSpinner size={12} />
            ) : expandable ? (
              <AfIcon name="chevronRight" size={13} className="af-cascader__arrow" />
            ) : !multiple && isSelectedLeaf ? (
              <span className="af-cascader__check" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.75 8.25 6.5 11l5.75-6" pathLength={1} />
                </svg>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function AfCascaderInner(props: AfCascaderProps, forwardedRef: Ref<HTMLDivElement>) {
  const {
    options,
    placeholder = "Select…",
    label,
    name,
    size = "md",
    width = 200,
    expandTrigger = "click",
    searchable = false,
    searchValue,
    onSearch,
    changeOnSelect = false,
    loadData,
    allowClear = false,
    clearable,
    onClear,
    disabled: disabledProp = false,
    invalid,
    pathSeparator = " / ",
    displayRender,
    emptyText = "No matches",
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    container,
    id: idProp,
    className,
    style,
  } = props;

  const multiple = props.multiple === true;
  const maxTagCount = multiple ? (props as AfCascaderMultipleProps).maxTagCount : undefined;
  const showCheckedStrategy: AfCascaderCheckedStrategy = multiple
    ? ((props as AfCascaderMultipleProps).showCheckedStrategy ?? "SHOW_CHILD")
    : "SHOW_CHILD";
  const showClear = Boolean(clearable ?? allowClear);

  const fieldCtx = useAfFormFieldControl();
  const disabled = Boolean(disabledProp || fieldCtx?.disabled);
  const popId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchListRef = useRef<HTMLDivElement>(null);
  const ime = useImeEnterGuard();

  const [singleValue, setSingleValue] = useControllableState<string[]>({
    value: !multiple ? (props as AfCascaderSingleProps).value : undefined,
    defaultValue: !multiple ? ((props as AfCascaderSingleProps).defaultValue ?? []) : [],
    onChange: !multiple
      ? (next) => {
          (props as AfCascaderSingleProps).onChange?.(next, findOptionPath(options, next));
        }
      : undefined,
  });

  const [multiValue, setMultiValue] = useControllableState<string[][]>({
    value: multiple ? (props as AfCascaderMultipleProps).value : undefined,
    defaultValue: multiple ? ((props as AfCascaderMultipleProps).defaultValue ?? []) : [],
    onChange: multiple
      ? (next) => {
          (props as AfCascaderMultipleProps).onChange?.(
            next,
            next.map((path) => findOptionPath(options, path)),
          );
        }
      : undefined,
  });

  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const initialExpanded = useMemo(() => {
    if (!multiple && singleValue.length > 0) return singleValue;
    if (multiple && multiValue.length > 0) return multiValue[0];
    const firstParent = options.find((o) => !o.disabled && Boolean(o.children?.length));
    return firstParent ? [firstParent.value] : [];
  }, [multiple, singleValue, multiValue, options]);

  const [expandedPath, setExpandedPath] = useState<string[]>(initialExpanded);
  const [focusedCell, setFocusedCell] = useState<FocusedCell>(null);
  const [searchActive, setSearchActive] = useState(-1);
  const [loadingKeys, setLoadingKeys] = useState<string[]>([]);
  const [localQuery, setLocalQuery] = useState("");

  const query = searchValue !== undefined ? searchValue : localQuery;
  const bad = Boolean(invalid || fieldCtx?.invalid);
  const resolvedId = idProp ?? fieldCtx?.controlId;

  const updateQuery = (next: string) => {
    if (searchValue === undefined) setLocalQuery(next);
    onSearch?.(next);
    setSearchActive(next.trim() ? 0 : -1);
  };

  // 单选 / 多选解析后的节点集合
  const selectedSingleOptions = useMemo(() => findOptionPath(options, singleValue), [options, singleValue]);
  const selectedSingleLabels = selectedSingleOptions.map((o) => o.label);

  const selectedLeafKeys = useMemo(
    () => (multiple ? expandMultiPathsToLeafKeys(options, multiValue) : new Set<string>()),
    [multiple, options, multiValue],
  );

  const normalizedMultiPaths = useMemo(
    () => (multiple ? computeCheckedPaths(selectedLeafKeys, options, showCheckedStrategy) : []),
    [multiple, selectedLeafKeys, options, showCheckedStrategy],
  );

  // 基于当前展开路径计算展示列
  const columns = useMemo(() => {
    const cols: AfCascaderOption[][] = [options];
    let current = options;
    for (const val of expandedPath) {
      const node = current.find((o) => o.value === val);
      if (!node?.children?.length) break;
      cols.push(node.children);
      current = node.children;
    }
    return cols;
  }, [options, expandedPath]);

  const flatSearchPaths = useMemo(() => {
    const kw = query.trim().toLowerCase();
    if (!searchable || !kw) return [];
    return flattenPaths(options, changeOnSelect && !multiple).filter((path) =>
      path.some((o) => `${o.label} ${o.value}`.toLowerCase().includes(kw)),
    );
  }, [options, searchable, query, changeOnSelect, multiple]);

  const searchThumb = useMenuHighlight(searchListRef, searchActive, open && Boolean(searchable && query.trim()), flatSearchPaths.length);

  const canExpandOption = (opt: AfCascaderOption) => opt.isLeaf === false || Boolean(opt.children?.length);

  const triggerLoadData = (nodePath: string[], opt: AfCascaderOption) => {
    if (!loadData || opt.disabled || opt.isLeaf === true || opt.children?.length) return;
    const key = pathKey(nodePath);
    if (loadingKeys.includes(key)) return;
    const targetOptions = findOptionPath(options, nodePath);
    setLoadingKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    Promise.resolve(loadData(targetOptions)).finally(() => {
      setLoadingKeys((prev) => prev.filter((item) => item !== key));
    });
  };

  const openMenu = (viaKeyboard = false) => {
    if (disabled) return;
    let nextExpanded: string[] = [];
    if (!multiple && singleValue.length > 0) {
      nextExpanded = singleValue;
    } else if (multiple && normalizedMultiPaths.length > 0) {
      nextExpanded = normalizedMultiPaths[0];
    } else {
      const firstParent = options.find((o) => !o.disabled && Boolean(o.children?.length));
      nextExpanded = firstParent ? [firstParent.value] : [];
    }
    setExpandedPath(nextExpanded);
    if (viaKeyboard) {
      const col0First = options.find((o) => !o.disabled);
      const focusVal = nextExpanded[0] ?? col0First?.value;
      setFocusedCell(focusVal ? { col: 0, value: focusVal } : null);
    } else {
      setFocusedCell(null);
    }
    updateQuery("");
    setOpen(true);
    if (searchable) requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  const closeMenu = (viaPointer = false) => {
    setOpen(false);
    setFocusedCell(null);
    setSearchActive(-1);
    updateQuery("");
    const trigger = triggerRef.current;
    if (!trigger) return;
    try {
      (trigger as HTMLElement & { focus: (opts?: FocusOptions & { focusVisible?: boolean }) => void }).focus({
        preventScroll: true,
        focusVisible: !viaPointer,
      });
    } catch {
      trigger.focus({ preventScroll: true });
    }
  };

  const commitSinglePath = (nextValues: string[], closeAfter = true, viaPointer = false) => {
    setSingleValue(nextValues);
    if (closeAfter) {
      closeMenu(viaPointer);
    }
  };

  const toggleMultiNode = (nodePath: string[], opt: AfCascaderOption) => {
    if (opt.disabled) return;
    const leaves = collectSelectableLeafPaths(opt, nodePath);
    if (!leaves.length) return;
    const leafPathKeys = leaves.map(pathKey);
    const allChecked = leafPathKeys.every((k) => selectedLeafKeys.has(k));
    const nextLeafKeys = new Set(selectedLeafKeys);
    if (allChecked) {
      for (const k of leafPathKeys) nextLeafKeys.delete(k);
    } else {
      for (const k of leafPathKeys) nextLeafKeys.add(k);
    }
    setMultiValue(computeCheckedPaths(nextLeafKeys, options, showCheckedStrategy));
  };

  const removeMultiTag = (tagPath: string[]) => {
    if (!multiple || disabled) return;
    const matched = findOptionPath(options, tagPath);
    const last = matched[matched.length - 1];
    const nextLeafKeys = new Set(selectedLeafKeys);
    if (last) {
      for (const leaf of collectSelectableLeafPaths(last, tagPath)) {
        nextLeafKeys.delete(pathKey(leaf));
      }
    } else {
      nextLeafKeys.delete(pathKey(tagPath));
    }
    setMultiValue(computeCheckedPaths(nextLeafKeys, options, showCheckedStrategy));
    requestAnimationFrame(() => (open && searchable ? inputRef.current : triggerRef.current)?.focus({ preventScroll: true }));
  };

  const handleClear = () => {
    onClear?.();
    if (multiple) {
      setMultiValue([]);
    } else {
      setSingleValue([]);
    }
    setExpandedPath([]);
    setFocusedCell(null);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const handleClickNode = (colIdx: number, opt: AfCascaderOption) => {
    if (opt.disabled) return;
    const nodePath = [...expandedPath.slice(0, colIdx), opt.value];
    const expandable = canExpandOption(opt);
    setExpandedPath(expandable ? nodePath : expandedPath.slice(0, colIdx));

    if (opt.isLeaf === false && !opt.children?.length && loadData) {
      triggerLoadData(nodePath, opt);
      if (!multiple && changeOnSelect) {
        commitSinglePath(nodePath, false, true);
      }
      return;
    }

    if (multiple) {
      if (!opt.children?.length) {
        toggleMultiNode(nodePath, opt);
      }
      return;
    }

    if (!opt.children?.length) {
      commitSinglePath(nodePath, true, true);
    } else if (changeOnSelect) {
      commitSinglePath(nodePath, false, true);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (searchValue !== undefined) return;
  }, [open, searchValue]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ")) {
      if (ime.shouldBlockEnter(event)) return;
      event.preventDefault();
      openMenu(true);
      return;
    }
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(false);
      return;
    }
    if (event.key === "Backspace" && multiple && !query) {
      const last = normalizedMultiPaths[normalizedMultiPaths.length - 1];
      if (last) {
        event.preventDefault();
        removeMultiTag(last);
      }
      return;
    }

    // 搜索列表模式键盘导航
    if (searchable && query.trim()) {
      const enabledSearchIdx = flatSearchPaths
        .map((path, idx) => (!path.some((p) => p.disabled) ? idx : -1))
        .filter((idx) => idx >= 0);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!enabledSearchIdx.length) return;
        const step = event.key === "ArrowDown" ? 1 : -1;
        const pos = enabledSearchIdx.indexOf(searchActive);
        const nextPos = pos < 0 ? 0 : (pos + step + enabledSearchIdx.length) % enabledSearchIdx.length;
        setSearchActive(enabledSearchIdx[nextPos]);
      } else if (event.key === "Enter" && searchActive >= 0 && flatSearchPaths[searchActive]) {
        if (ime.shouldBlockEnter(event)) return;
        event.preventDefault();
        const path = flatSearchPaths[searchActive];
        if (path.some((p) => p.disabled)) return;
        const pathValues = path.map((p) => p.value);
        if (multiple) {
          const leafOpt = path[path.length - 1];
          toggleMultiNode(pathValues, leafOpt);
        } else {
          commitSinglePath(pathValues, true, false);
        }
      }
      return;
    }

    const colIdx = focusedCell ? Math.min(focusedCell.col, columns.length - 1) : Math.max(0, columns.length - 1);
    const currentCol = columns[colIdx] ?? [];
    const enabledOpts = currentCol.filter((o) => !o.disabled);
    const activeVal = focusedCell?.col === colIdx ? focusedCell.value : expandedPath[colIdx];
    const currentEnabledIdx = enabledOpts.findIndex((o) => o.value === activeVal);
    const activeOpt = (currentEnabledIdx >= 0 ? enabledOpts[currentEnabledIdx] : enabledOpts[0]) ?? undefined;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!enabledOpts.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const nextIdx =
        currentEnabledIdx < 0 ? (step > 0 ? 0 : enabledOpts.length - 1) : (currentEnabledIdx + step + enabledOpts.length) % enabledOpts.length;
      const nextOpt = enabledOpts[nextIdx];
      const nextNodePath = [...expandedPath.slice(0, colIdx), nextOpt.value];
      setFocusedCell({ col: colIdx, value: nextOpt.value });
      if (expandTrigger === "hover") {
        setExpandedPath(canExpandOption(nextOpt) ? nextNodePath : expandedPath.slice(0, colIdx));
        if (nextOpt.isLeaf === false && !nextOpt.children?.length && loadData) {
          triggerLoadData(nextNodePath, nextOpt);
        }
      }
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!enabledOpts.length) return;
      const nextOpt = enabledOpts[event.key === "Home" ? 0 : enabledOpts.length - 1];
      setFocusedCell({ col: colIdx, value: nextOpt.value });
    } else if (event.key === "ArrowRight" && activeOpt) {
      event.preventDefault();
      const nextNodePath = [...expandedPath.slice(0, colIdx), activeOpt.value];
      if (activeOpt.children?.length) {
        setExpandedPath(nextNodePath);
        const firstChild = activeOpt.children.find((c) => !c.disabled) ?? activeOpt.children[0];
        if (firstChild) setFocusedCell({ col: colIdx + 1, value: firstChild.value });
      } else if (activeOpt.isLeaf === false && loadData) {
        setExpandedPath(nextNodePath);
        triggerLoadData(nextNodePath, activeOpt);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (colIdx > 0) {
        const parentVal = expandedPath[colIdx - 1];
        setExpandedPath(expandedPath.slice(0, colIdx));
        if (parentVal) setFocusedCell({ col: colIdx - 1, value: parentVal });
      }
    } else if (event.key === " " && multiple && activeOpt) {
      event.preventDefault();
      const nodePath = [...expandedPath.slice(0, colIdx), activeOpt.value];
      toggleMultiNode(nodePath, activeOpt);
    } else if (event.key === "Enter" && activeOpt) {
      if (ime.shouldBlockEnter(event)) return;
      event.preventDefault();
      const nodePath = [...expandedPath.slice(0, colIdx), activeOpt.value];
      if (multiple) {
        if (canExpandOption(activeOpt)) {
          setExpandedPath(nodePath);
          if (activeOpt.children?.length) {
            const firstChild = activeOpt.children.find((c) => !c.disabled);
            if (firstChild) setFocusedCell({ col: colIdx + 1, value: firstChild.value });
          } else {
            triggerLoadData(nodePath, activeOpt);
          }
        } else {
          toggleMultiNode(nodePath, activeOpt);
        }
      } else if (canExpandOption(activeOpt)) {
        setExpandedPath(nodePath);
        if (activeOpt.isLeaf === false && !activeOpt.children?.length) {
          triggerLoadData(nodePath, activeOpt);
        }
        if (changeOnSelect) commitSinglePath(nodePath, false, false);
      } else {
        commitSinglePath(nodePath, true, false);
      }
    }
  };

  const hasValue = multiple ? normalizedMultiPaths.length > 0 : singleValue.length > 0;
  const showSearchInput = searchable && open;
  const visibleTags = maxTagCount !== undefined ? normalizedMultiPaths.slice(0, Math.max(0, maxTagCount)) : normalizedMultiPaths;
  const hiddenTagCount = normalizedMultiPaths.length - visibleTags.length;

  const displayNode =
    selectedSingleLabels.length > 0
      ? displayRender
        ? displayRender(selectedSingleLabels, selectedSingleOptions)
        : selectedSingleLabels.join(pathSeparator)
      : placeholder;

  return (
    <div
      className={cn("af-cascader", className)}
      style={{ minWidth: width, width: multiple || searchable ? width : undefined, ...style }}
      onKeyDown={handleKeyDown}
    >
      {name && !disabled
        ? multiple
          ? normalizedMultiPaths.map((path) => (
              <input key={pathKey(path)} type="hidden" name={name} value={path.join("/")} />
            ))
          : <input type="hidden" name={name} value={singleValue.join("/")} />
        : null}
      <div
        ref={composeRefs(triggerRef, forwardedRef)}
        id={resolvedId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        aria-label={label}
        aria-invalid={bad ? true : "false"}
        aria-required={fieldCtx?.required || undefined}
        aria-multiselectable={multiple || undefined}
        aria-describedby={fieldCtx?.describedBy}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        className="af-select__trigger"
        data-size={size}
        data-open={open || undefined}
        data-invalid={bad || undefined}
        data-disabled={disabled || undefined}
        data-multiple={multiple || undefined}
        onPointerDown={(event) => {
          event.currentTarget.dataset.pointerFocus = "true";
        }}
        onBlur={(event) => {
          delete event.currentTarget.dataset.pointerFocus;
        }}
        onClick={() => {
          if (disabled) return;
          if (!open) openMenu(false);
          else closeMenu(true);
        }}
      >
        <span className="af-select__content">
          {multiple ? (
            <>
              {visibleTags.map((tagPath) => {
                const tagOpts = findOptionPath(options, tagPath);
                const tagLabel = tagOpts.map((o) => o.label).join(pathSeparator) || tagPath.join(pathSeparator);
                const key = pathKey(tagPath);
                return (
                  <span className="af-select__tag" key={key}>
                    <span className="af-select__tag-label" title={tagLabel}>
                      {tagLabel}
                    </span>
                    {!disabled ? (
                      <button
                        type="button"
                        className="af-select__tag-remove"
                        aria-label={`Remove ${tagLabel}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeMultiTag(tagPath);
                        }}
                      >
                        <AfIcon name="x" size={10} />
                      </button>
                    ) : null}
                  </span>
                );
              })}
              {hiddenTagCount > 0 ? <span className="af-select__tag af-select__tag--more">+{hiddenTagCount}</span> : null}
              {showSearchInput ? (
                <input
                  ref={inputRef}
                  className="af-select__input"
                  value={query}
                  placeholder={normalizedMultiPaths.length ? "Search…" : placeholder}
                  aria-label={`${label ?? "Cascader"}, search`}
                  onCompositionStart={ime.onCompositionStart}
                  onCompositionEnd={ime.onCompositionEnd}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => updateQuery(event.target.value)}
                />
              ) : normalizedMultiPaths.length === 0 ? (
                <span className="af-select__value" data-placeholder>
                  {placeholder}
                </span>
              ) : null}
            </>
          ) : showSearchInput ? (
            selectedSingleOptions[0]?.icon ? (
              <span className="af-select__value-with-icon">
                {renderCascaderIcon(selectedSingleOptions[0].icon)}
                <input
                  ref={inputRef}
                  className="af-select__input"
                  value={query}
                  placeholder={selectedSingleLabels.length ? selectedSingleLabels.join(pathSeparator) : placeholder}
                  aria-label={`${label ?? "Cascader"}, search`}
                  onCompositionStart={ime.onCompositionStart}
                  onCompositionEnd={ime.onCompositionEnd}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => updateQuery(event.target.value)}
                />
              </span>
            ) : (
              <input
                ref={inputRef}
                className="af-select__input"
                value={query}
                placeholder={selectedSingleLabels.length ? selectedSingleLabels.join(pathSeparator) : placeholder}
                aria-label={`${label ?? "Cascader"}, search`}
                onCompositionStart={ime.onCompositionStart}
                onCompositionEnd={ime.onCompositionEnd}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => updateQuery(event.target.value)}
              />
            )
          ) : selectedSingleOptions[0]?.icon && !displayRender ? (
            <span className="af-select__value-with-icon">
              {renderCascaderIcon(selectedSingleOptions[0].icon)}
              <span className="af-select__value" data-placeholder={selectedSingleLabels.length === 0 || undefined}>
                {displayNode}
              </span>
            </span>
          ) : (
            <span className="af-select__value" data-placeholder={selectedSingleLabels.length === 0 || undefined}>
              {displayNode}
            </span>
          )}
        </span>
        {showClear && hasValue && !disabled ? (
          <button
            type="button"
            className="af-select__clear"
            aria-label="Clear selection"
            onClick={(event) => {
              event.stopPropagation();
              handleClear();
            }}
          >
            <AfIcon name="x" size={11} />
          </button>
        ) : null}
        <AfIcon name="chevronDown" size={14} className="af-select__chevron" />
      </div>
      <AfPopover
        id={popId}
        open={open}
        anchorRef={triggerRef}
        role="listbox"
        label={label ?? "级联面板"}
        container={container}
        className="af-cascader__pop"
        preserveNaturalWidth
        onPointerDownOutside={() => {
          setOpen(false);
          setFocusedCell(null);
          setSearchActive(-1);
          updateQuery("");
        }}
      >
        {searchable && query.trim() ? (
          <div
            ref={searchListRef}
            className="af-cascader__search-list"
            onPointerLeave={() => setSearchActive(-1)}
          >
            {searchThumb ? (
              <span
                className="af-menu__thumb"
                style={
                  {
                    transform: `translate(${searchThumb.x}px, ${searchThumb.y}px)`,
                    width: searchThumb.width,
                    height: searchThumb.height,
                  } as CSSProperties
                }
                aria-hidden="true"
              />
            ) : null}
            {flatSearchPaths.length > 0 ? (
              flatSearchPaths.map((path, idx) => {
                const pathValues = path.map((p) => p.value);
                const key = pathKey(pathValues);
                const anyDisabled = path.some((p) => p.disabled);
                const leafOpt = path[path.length - 1];
                const leaves = multiple ? collectSelectableLeafPaths(leafOpt, pathValues) : [];
                const isSelected = multiple
                  ? leaves.length > 0 && leaves.every((lp) => selectedLeafKeys.has(pathKey(lp)))
                  : pathValues.length === singleValue.length && isExactPrefix(singleValue, pathValues);
                const isFocused = !anyDisabled && searchActive === idx;
                const fullLabel = path.map((p) => p.label).join(pathSeparator);
                return (
                  <div
                    key={key}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={anyDisabled || undefined}
                    className="af-cascader__item"
                    data-menu-index={idx}
                    data-focused={isFocused || undefined}
                    data-selected={isSelected || undefined}
                    data-disabled={anyDisabled || undefined}
                    onPointerMove={() => {
                      const nextIdx = anyDisabled ? -1 : idx;
                      if (searchActive !== nextIdx) setSearchActive(nextIdx);
                    }}
                    onClick={() => {
                      if (anyDisabled) return;
                      if (multiple) toggleMultiNode(pathValues, leafOpt);
                      else commitSinglePath(pathValues, true, true);
                    }}
                  >
                    {multiple ? (
                      <span
                        className="af-cascader__checkbox"
                        data-checked={isSelected || undefined}
                        aria-hidden="true"
                      >
                        {isSelected ? <AfIcon name="check" size={10} /> : null}
                      </span>
                    ) : null}
                    <span className="af-cascader__item-label">{highlightMatch(fullLabel, query)}</span>
                    {!multiple && isSelected ? <AfIcon name="check" size={13} className="af-cascader__check" /> : null}
                  </div>
                );
              })
            ) : (
              <div className="af-select__empty">{emptyText}</div>
            )}
          </div>
        ) : (
          <div
            className="af-cascader__panels"
            onPointerLeave={() => setFocusedCell(null)}
          >
            {columns.map((col, colIdx) => (
              <CascaderColumn
                key={colIdx === 0 ? "col-0" : `col-${colIdx}-${expandedPath.slice(0, colIdx).join("/")}`}
                col={col}
                colIdx={colIdx}
                totalCols={columns.length}
                expandedPath={expandedPath}
                focusedCell={focusedCell}
                open={open}
                multiple={multiple}
                singleValue={singleValue}
                selectedLeafKeys={selectedLeafKeys}
                loadingKeys={loadingKeys}
                expandTrigger={expandTrigger}
                canExpandOption={canExpandOption}
                onFocusCell={setFocusedCell}
                onExpandPath={setExpandedPath}
                onTriggerLoadData={triggerLoadData}
                onToggleMultiNode={toggleMultiNode}
                onClickNode={handleClickNode}
              />
            ))}
          </div>
        )}
      </AfPopover>
    </div>
  );
}

/**
 * 多级联动级联选择器：
 * 支持点击/悬停双展开触发模式、多选父子联动勾选与半选态、任意层级选中（`changeOnSelect`）、
 * 异步动态加载下级（`loadData`）、框内路径模糊搜索、键盘跨列导航与原生表单提交。
 */
export const AfCascader = forwardRef(AfCascaderInner) as AfCascaderComponent;
AfCascader.displayName = "AfCascader";
