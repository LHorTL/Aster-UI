import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn, useControllableState, useIsomorphicLayoutEffect } from "../../primitives";
import { AfCheckbox } from "../controls/Checkbox";
import { AfInput } from "../controls/Input";
import { AfPagination } from "./Pagination";
import { AfSpinner } from "./Spinner";

const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** 排序方向（严格对齐 WAI-ARIA `aria-sort` 取值）。 */
export type AfTableSortDirection = "ascending" | "descending";

/** 表格排序状态。 */
export type AfTableSortState = {
  key: string;
  direction: AfTableSortDirection;
};

/** 固定列贴边方向。 */
export type AfTableFixedSide = "left" | "right";

/** 表格列定义。 */
export type AfTableColumn<T> = {
  /** 列唯一键。 */
  key: string;
  /** 表头文案。 */
  title: ReactNode;
  /** 读取行对象字段名。 */
  dataIndex?: keyof T & string;
  /** 对齐方式，数字列推荐 `"right"`。 */
  align?: "left" | "center" | "right";
  /** 列宽（数字或 CSS 字符串）。 */
  width?: number | string;
  /** 左右粘性固定列（横向溢出滚动时保持贴边并展示 1px 分隔阴影）。 */
  fixed?: AfTableFixedSide;
  /** 是否允许点击表头排序（支持升序 -> 降序 -> 取消排序三态循环）。 */
  sortable?: boolean;
  /** 排序比较类型，避免把格式化数字/金额按字符串字典序错排。 */
  sortType?: "string" | "number";
  /** 提取用于排序比较的原始值（例如格式化展示 `$1.2k` 时返回 `1200`）。 */
  sortValue?: (row: T) => string | number;
  /** 自定义比较函数（升序基准）。 */
  sorter?: (a: T, b: T) => number;
  /** 自定义单元格渲染。 */
  render?: (value: unknown, row: T, rowIndex: number) => ReactNode;
};

/** JSX 声明式表格列属性（兼容 `<Table.Column>` / `<AfTableColumn>` 契约）。 */
export type AfTableColumnProps<T = Record<string, unknown>> = Omit<AfTableColumn<T>, "key"> & {
  key?: string;
};

/** 声明式表格列节点，供 `<AfTable>` 通过 `children` 解析列定义。 */
export function AfTableColumn<T = Record<string, unknown>>(_props: AfTableColumnProps<T> = {} as AfTableColumnProps<T>): ReactElement | null {
  return null;
}
AfTableColumn.displayName = "AfTableColumn";

function extractColumnsFromChildren<T>(children: ReactNode): AfTableColumn<T>[] {
  const cols: AfTableColumn<T>[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const tag = (child.type as { displayName?: string }).displayName;
    if (child.type === AfTableColumn || tag === "AfTableColumn") {
      const props = child.props as AfTableColumnProps<T>;
      const resolvedKey =
        (typeof child.key === "string" ? child.key.replace(/^\.\$/, "") : undefined) ??
        props.dataIndex ??
        `col-${cols.length}`;
      cols.push({ ...props, key: resolvedKey } as AfTableColumn<T>);
    }
  });
  return cols;
}

/** 虚拟滚动配置。 */
export type AfTableVirtualConfig = {
  /** 单行预估高度（px），默认 40。 */
  rowHeight?: number;
  /** 滚动视口最大高度（px），默认 360。 */
  height?: number;
  /** 上下预渲染缓冲行数，默认 4。 */
  overscan?: number;
};

/** 可展开行与树形子行配置。 */
export type AfTableExpandableConfig<T> = {
  /** 自定义展开详情行渲染函数。 */
  expandedRowRender?: (row: T, index: number) => ReactNode;
  /** 判断某行是否允许展开详情（默认配置了 `expandedRowRender` 时返回 `true`）。 */
  rowExpandable?: (row: T) => boolean;
  /** 受控已展开行 key 列表。 */
  expandedRowKeys?: string[];
  /** 非受控初始展开行 key 列表。 */
  defaultExpandedRowKeys?: string[];
  /** 展开行列表变化回调。 */
  onExpandedRowsChange?: (expandedKeys: string[]) => void;
  /** 单行展开/收起动作回调。 */
  onExpand?: (expanded: boolean, row: T) => void;
  /** 树形子行数组字段名，默认 `"children"`。 */
  childrenColumnName?: keyof T & string;
  /** 树形子行每级缩进像素，默认 `18`。 */
  indentSize?: number;
  /** 是否允许点击整行切换展开态。 */
  expandRowByClick?: boolean;
};

/** 数据表格尺寸。 */
export type AfTableSize = "sm" | "md";

/** 数据表格属性。 */
export type AfTableProps<T extends Record<string, unknown> = Record<string, unknown>> = Omit<
  ComponentPropsWithoutRef<"div">,
  "onChange"
> & {
  /** 列配置（未传时可从 JSX `<AfTableColumn>` 子节点自动收集）。 */
  columns?: AfTableColumn<T>[];
  /** 数据源。 */
  data?: T[];
  /** 行唯一键字段名或生成函数（保障排序重排时 DOM 行身份与焦点稳定）。 */
  rowKey?: (keyof T & string) | ((row: T, index: number) => string);
  /** 表格标题（渲染为语义 `<caption>`）。 */
  caption?: ReactNode;
  /** 是否在视觉上隐藏 `<caption>`（仍对屏幕阅读器保留表格名称），默认未传 `caption` 时隐藏。 */
  captionHidden?: boolean;
  /** 未传可见 `caption` 时的表格无障碍名称，默认 `"数据表格"`。 */
  ariaLabel?: string;
  /** 受控排序状态（`null` 表示未排序）。 */
  sortBy?: AfTableSortState | null;
  /** 非受控初始排序状态。 */
  defaultSortBy?: AfTableSortState | null;
  /** 排序变化回调（三态循环：`ascending -> descending -> null`）。 */
  onSortChange?: (sort: AfTableSortState | null) => void;
  /** 服务端远程排序模式：设为 `true` 时仅维护排序态与触发 `onSortChange`，不在前端重排 `data`。 */
  manualSorting?: boolean;
  /** 是否开启首列复选框行选择。 */
  selectable?: boolean;
  /** 受控选中行 key 列表。 */
  selectedKeys?: string[];
  /** 非受控初始选中行 key 列表。 */
  defaultSelectedKeys?: string[];
  /** 选中行变化回调。 */
  onSelectedKeysChange?: (keys: string[], selectedRows: T[]) => void;
  /** 可展开详情行与嵌套树形子行配置。 */
  expandable?: AfTableExpandableConfig<T>;
  /** 紧凑或标准行高，默认 `"md"`。 */
  size?: AfTableSize;
  /** 表头吸顶。 */
  stickyHeader?: boolean;
  /**
   * @deprecated affectUI 规范严禁斑马纹表格底色，此属性保留兼容性但不再渲染交替背景。
   */
  striped?: boolean;
  /** 行悬停高亮，默认 `true`。 */
  hoverable?: boolean;
  /** 加载中遮罩。 */
  loading?: boolean;
  /** 空数据文案或自定义空态节点。 */
  empty?: ReactNode;
  /** 行点击回调。 */
  onRowClick?: (row: T, index: number) => void;
  /** 内部 `<table>` 元素附加类名。 */
  tableClassName?: string;
  /** 内部 `<table>` 元素内联样式。 */
  tableStyle?: CSSProperties;
  /** 透传给内部 `<table>` 元素的附加属性。 */
  tableProps?: ComponentPropsWithoutRef<"table">;
  /** 横向滚动最小宽度（设置固定列且未显式传入时自动按列宽总和保底）。 */
  scrollX?: number | string;
  /** 纵向最大滚动高度（开启后表头自动吸顶）。 */
  scrollY?: number | string;
  /** 复合横纵滚动容器配置（等价于同时声明 `scrollX` / `scrollY`）。 */
  scroll?: { x?: number | string; y?: number | string };
  /** 自定义行类名。 */
  rowClassName?: string | ((row: T, index: number) => string);
  /** 当前高亮激活行 key。 */
  activeRowKey?: string;
  /** 是否允许拖拽调整列宽。 */
  resizableColumns?: boolean;
  /** 列宽拖拽变化回调。 */
  onColumnResize?: (key: string, width: number) => void;
  /** 是否开启行虚拟滚动窗口化。 */
  virtual?: boolean | AfTableVirtualConfig;
  /** 支持声明式 `<AfTableColumn>` 子元素。 */
  children?: ReactNode;
};

type KeyedRowEntry<T> = {
  row: T;
  key: string;
  originalIndex: number;
  depth: number;
  hasTreeChildren: boolean;
  treeChildren: KeyedRowEntry<T>[];
};

function resolveKey<T extends Record<string, unknown>>(
  row: T,
  index: number,
  rowKey?: (keyof T & string) | ((row: T, index: number) => string),
  prefix = "",
): string {
  if (typeof rowKey === "function") return rowKey(row, index);
  if (typeof rowKey === "string" && row[rowKey] !== undefined && row[rowKey] !== null) {
    return String(row[rowKey]);
  }
  if (row.id !== undefined && row.id !== null) return String(row.id);
  if (row.key !== undefined && row.key !== null) return String(row.key);
  return prefix ? `${prefix}-${index}` : String(index);
}

function extractRawSortValue<T extends Record<string, unknown>>(row: T, col: AfTableColumn<T>): string | number {
  if (col.sortValue) return col.sortValue(row);
  const raw = col.dataIndex ? row[col.dataIndex] : row[col.key];
  if (typeof raw === "number") return raw;
  if (raw instanceof Date) return raw.getTime();
  if (raw === undefined || raw === null) return col.sortType === "number" ? Number.NEGATIVE_INFINITY : "";
  return String(raw);
}

function parseStaticPixelWidth(width: number | string | undefined, fallback: number): number {
  if (typeof width === "number" && Number.isFinite(width)) return width;
  if (typeof width === "string") {
    const trimmed = width.trim();
    if (trimmed.endsWith("px")) {
      const parsed = Number.parseFloat(trimmed);
      if (Number.isFinite(parsed)) return parsed;
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return fallback;
}

function buildKeyedTree<T extends Record<string, unknown>>(
  rows: T[],
  rowKey: AfTableProps<T>["rowKey"],
  childrenField: string | null,
  depth = 0,
  prefix = "",
): KeyedRowEntry<T>[] {
  return rows.map((row, index) => {
    const key = resolveKey(row, index, rowKey, prefix);
    const rawChildren = childrenField ? row[childrenField] : undefined;
    const childRows = Array.isArray(rawChildren) ? (rawChildren as T[]) : [];
    const treeChildren =
      childRows.length > 0 ? buildKeyedTree(childRows, rowKey, childrenField, depth + 1, key) : [];
    return {
      row,
      key,
      originalIndex: index,
      depth,
      hasTreeChildren: treeChildren.length > 0,
      treeChildren,
    };
  });
}

function sortEntryTree<T extends Record<string, unknown>>(
  entries: KeyedRowEntry<T>[],
  col: AfTableColumn<T>,
  direction: AfTableSortDirection,
): KeyedRowEntry<T>[] {
  const factor = direction === "ascending" ? 1 : -1;
  let sortedLevel: KeyedRowEntry<T>[];

  if (col.sorter) {
    const sorter = col.sorter;
    sortedLevel = [...entries].sort((a, b) => factor * sorter(a.row, b.row));
  } else {
    const decorated = entries.map((entry) => ({
      entry,
      val: extractRawSortValue(entry.row, col),
    }));
    const isNumeric =
      col.sortType === "number" ||
      (col.sortType === undefined && decorated.length > 0 && decorated.every((d) => typeof d.val === "number"));

    decorated.sort((a, b) => {
      if (isNumeric) {
        return factor * (Number(a.val) - Number(b.val));
      }
      return factor * textCollator.compare(String(a.val), String(b.val));
    });
    sortedLevel = decorated.map((d) => d.entry);
  }

  return sortedLevel.map((item) =>
    item.hasTreeChildren
      ? { ...item, treeChildren: sortEntryTree(item.treeChildren, col, direction) }
      : item,
  );
}

function flattenEntryTree<T extends Record<string, unknown>>(
  entries: KeyedRowEntry<T>[],
  expandedSet: ReadonlySet<string>,
  out: KeyedRowEntry<T>[] = [],
): KeyedRowEntry<T>[] {
  for (const item of entries) {
    out.push(item);
    if (item.hasTreeChildren && expandedSet.has(item.key)) {
      flattenEntryTree(item.treeChildren, expandedSet, out);
    }
  }
  return out;
}

function collectAllEntries<T extends Record<string, unknown>>(
  entries: KeyedRowEntry<T>[],
  out: KeyedRowEntry<T>[] = [],
): KeyedRowEntry<T>[] {
  for (const item of entries) {
    out.push(item);
    if (item.hasTreeChildren) collectAllEntries(item.treeChildren, out);
  }
  return out;
}

/**
 * 基础数据表格原语：
 * - 语义化 `<table>` + `<caption>` + 横向可滚动聚焦区域；
 * - 支持三态排序循环（`ascending -> descending -> null`）与 `manualSorting` 远程排序；
 * - 支持 `fixed: "left" | "right"` 左右粘性固定列与横向滚动 `1px var(--af-line)` 边界阴影；
 * - 支持 `expandable` 展开详情面板与嵌套树形子行；
 * - 严格在可排序 `<th scope="col">` 内嵌 `<button type="button">`，仅当前排序列挂载 `aria-sort`。
 */
export function AfTable<T extends Record<string, unknown> = Record<string, unknown>>({
  columns: columnsProp,
  data = [],
  rowKey,
  caption,
  captionHidden,
  ariaLabel = "数据表格",
  sortBy: sortByProp,
  defaultSortBy = null,
  onSortChange,
  manualSorting = false,
  selectable = false,
  selectedKeys: selectedKeysProp,
  defaultSelectedKeys = [],
  onSelectedKeysChange,
  expandable,
  size = "md",
  stickyHeader = false,
  striped: _striped = false,
  hoverable = true,
  loading = false,
  empty = "暂无数据",
  onRowClick,
  tableClassName,
  tableStyle,
  tableProps,
  scrollX: scrollXProp,
  scrollY: scrollYProp,
  scroll,
  rowClassName,
  activeRowKey,
  resizableColumns = false,
  onColumnResize,
  virtual = false,
  children,
  className,
  "aria-label": ariaLabelAttr,
  ...rest
}: AfTableProps<T> = {} as AfTableProps<T>) {
  void _striped;
  const scrollX = scrollXProp ?? scroll?.x;
  const scrollY = scrollYProp ?? scroll?.y;
  const effectiveAriaLabel = ariaLabelAttr ?? ariaLabel;
  const columns = useMemo(() => columnsProp ?? extractColumnsFromChildren<T>(children), [columnsProp, children]);
  const captionId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const headRowRef = useRef<HTMLTableRowElement>(null);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [measuredWidths, setMeasuredWidths] = useState<Record<string, number>>({});
  const [scrollTop, setScrollTop] = useState(0);
  const [pingLeft, setPingLeft] = useState(false);
  const [pingRight, setPingRight] = useState(false);
  const colDragRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const [activeSort, setActiveSort] = useControllableState<AfTableSortState | null>({
    value: sortByProp,
    defaultValue: defaultSortBy,
    onChange: (next) => {
      onSortChange?.(next);
    },
  });

  const [selectedKeys, setSelectedKeys] = useControllableState<string[]>({
    value: selectedKeysProp,
    defaultValue: defaultSelectedKeys,
  });

  const [expandedKeys, setExpandedKeys] = useControllableState<string[]>({
    value: expandable?.expandedRowKeys,
    defaultValue: expandable?.defaultExpandedRowKeys ?? [],
    onChange: expandable?.onExpandedRowsChange,
  });

  const expandedSet = useMemo(() => new Set(expandedKeys), [expandedKeys]);
  const [sortAnnouncement, setSortAnnouncement] = useState("");

  const childrenColumnName = expandable ? (expandable.childrenColumnName ?? ("children" as keyof T & string)) : null;
  const hasDetailExpander = Boolean(expandable?.expandedRowRender);
  const indentSize = expandable?.indentSize ?? 18;

  const keyedTree = useMemo(
    () => buildKeyedTree(data, rowKey, childrenColumnName),
    [data, rowKey, childrenColumnName],
  );

  const allFlatEntries = useMemo(() => collectAllEntries(keyedTree), [keyedTree]);

  const sortedTree = useMemo(() => {
    if (!activeSort || manualSorting) return keyedTree;
    const col = columns.find((c) => c.key === activeSort.key);
    if (!col || !col.sortable) return keyedTree;
    return sortEntryTree(keyedTree, col, activeSort.direction);
  }, [keyedTree, activeSort, manualSorting, columns]);

  const sortedData = useMemo(
    () => (expandable ? flattenEntryTree(sortedTree, expandedSet) : sortedTree),
    [sortedTree, expandable, expandedSet],
  );

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const allRowKeys = useMemo(() => sortedData.map((item) => item.key), [sortedData]);
  const allSelected = allRowKeys.length > 0 && allRowKeys.every((k) => selectedSet.has(k));
  const someSelected = allRowKeys.some((k) => selectedSet.has(k));

  const updateSelection = (nextKeys: string[]) => {
    setSelectedKeys(nextKeys);
    if (onSelectedKeysChange) {
      const nextSet = new Set(nextKeys);
      const selectedRows = allFlatEntries.filter((item) => nextSet.has(item.key)).map((item) => item.row);
      onSelectedKeysChange(nextKeys, selectedRows);
    }
  };

  const toggleAllRows = (checked: boolean) => {
    if (checked) {
      const merged = Array.from(new Set([...selectedKeys, ...allRowKeys]));
      updateSelection(merged);
    } else {
      const currentVisible = new Set(allRowKeys);
      updateSelection(selectedKeys.filter((k) => !currentVisible.has(k)));
    }
  };

  const toggleSingleRow = (key: string, checked: boolean) => {
    if (checked) {
      updateSelection(selectedSet.has(key) ? selectedKeys : [...selectedKeys, key]);
    } else {
      updateSelection(selectedKeys.filter((k) => k !== key));
    }
  };

  const toggleRowExpanded = (key: string, row: T) => {
    const willExpand = !expandedSet.has(key);
    const next = willExpand ? [...expandedKeys, key] : expandedKeys.filter((k) => k !== key);
    setExpandedKeys(next);
    expandable?.onExpand?.(willExpand, row);
  };

  const handleSort = (col: AfTableColumn<T>) => {
    const colName = typeof col.title === "string" || typeof col.title === "number" ? String(col.title) : col.key;
    if (activeSort?.key === col.key) {
      if (activeSort.direction === "ascending") {
        setActiveSort({ key: col.key, direction: "descending" });
        setSortAnnouncement(`已按 ${colName} 降序排列，共 ${data.length} 行`);
        return;
      }
      setActiveSort(null);
      setSortAnnouncement(`已取消 ${colName} 排序，恢复默认顺序`);
      return;
    }
    setActiveSort({ key: col.key, direction: "ascending" });
    setSortAnnouncement(`已按 ${colName} 升序排列，共 ${data.length} 行`);
  };

  const hasFixedColumns = useMemo(() => columns.some((c) => c.fixed === "left" || c.fixed === "right"), [columns]);
  const hasFixedLeft = useMemo(() => columns.some((c) => c.fixed === "left"), [columns]);

  const updateScrollShadows = useCallback(() => {
    const el = wrapRef.current;
    if (!el || !hasFixedColumns) {
      setPingLeft(false);
      setPingRight(false);
      return;
    }
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setPingLeft(el.scrollLeft > 1);
    setPingRight(maxScrollLeft > 1 && el.scrollLeft < maxScrollLeft - 1);
  }, [hasFixedColumns]);

  useIsomorphicLayoutEffect(() => {
    if (!hasFixedColumns) return;
    const rowEl = headRowRef.current;
    if (!rowEl) return;
    const measure = () => {
      const cells = rowEl.querySelectorAll<HTMLTableCellElement>("th[data-col-key]");
      const next: Record<string, number> = {};
      cells.forEach((cell) => {
        const key = cell.dataset.colKey;
        if (key) next[key] = Math.round(cell.getBoundingClientRect().width);
      });
      setMeasuredWidths((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length === nextKeys.length && nextKeys.every((k) => prev[k] === next[k])) {
          return prev;
        }
        return next;
      });
      updateScrollShadows();
    };
    measure();
    if (typeof ResizeObserver !== "undefined" && wrapRef.current) {
      const ro = new ResizeObserver(measure);
      ro.observe(wrapRef.current);
      ro.observe(rowEl);
      return () => ro.disconnect();
    }
  }, [hasFixedColumns, columns, colWidths, selectable, hasDetailExpander, updateScrollShadows]);

  useEffect(() => {
    updateScrollShadows();
  }, [updateScrollShadows, sortedData.length]);

  const stickyMeta = useMemo(() => {
    if (!hasFixedColumns) {
      return {
        leftOffsets: {} as Record<string, number>,
        rightOffsets: {} as Record<string, number>,
        lastLeftKey: null as string | null,
        firstRightKey: null as string | null,
      };
    }
    const leftOffsets: Record<string, number> = {};
    const rightOffsets: Record<string, number> = {};
    let accLeft = 0;
    let lastLeftKey: string | null = null;

    if (hasFixedLeft && selectable) {
      leftOffsets["__check__"] = accLeft;
      accLeft += measuredWidths["__check__"] ?? 38;
      lastLeftKey = "__check__";
    }
    if (hasFixedLeft && hasDetailExpander) {
      leftOffsets["__expand__"] = accLeft;
      accLeft += measuredWidths["__expand__"] ?? 36;
      lastLeftKey = "__expand__";
    }

    for (const col of columns) {
      if (col.fixed === "left") {
        leftOffsets[col.key] = accLeft;
        const w = colWidths[col.key] ?? measuredWidths[col.key] ?? parseStaticPixelWidth(col.width, 140);
        accLeft += w;
        lastLeftKey = col.key;
      }
    }

    let accRight = 0;
    let firstRightKey: string | null = null;
    for (let i = columns.length - 1; i >= 0; i -= 1) {
      const col = columns[i];
      if (col.fixed === "right") {
        rightOffsets[col.key] = accRight;
        const w = colWidths[col.key] ?? measuredWidths[col.key] ?? parseStaticPixelWidth(col.width, 140);
        accRight += w;
        firstRightKey = col.key;
      }
    }

    return { leftOffsets, rightOffsets, lastLeftKey, firstRightKey };
  }, [hasFixedColumns, hasFixedLeft, selectable, hasDetailExpander, columns, colWidths, measuredWidths]);

  const hideCaption = captionHidden ?? caption === undefined;
  const totalCols = columns.length + (selectable ? 1 : 0) + (hasDetailExpander ? 1 : 0);
  const autoScrollMinWidth = useMemo(() => {
    if (scrollX !== undefined) return scrollX;
    if (!hasFixedColumns) return undefined;
    const base = (selectable ? 40 : 0) + (hasDetailExpander ? 36 : 0);
    return columns.reduce((acc, col) => acc + (colWidths[col.key] ?? parseStaticPixelWidth(col.width, 140)), base);
  }, [scrollX, hasFixedColumns, selectable, hasDetailExpander, columns, colWidths]);
  const resolvedTableStyle = useMemo<CSSProperties | undefined>(() => {
    if (autoScrollMinWidth === undefined) return tableStyle;
    if (tableStyle?.minWidth !== undefined) return tableStyle;
    return { ...tableStyle, minWidth: autoScrollMinWidth };
  }, [autoScrollMinWidth, tableStyle]);

  const virtualConfig: AfTableVirtualConfig | null = virtual
    ? typeof virtual === "object"
      ? virtual
      : {}
    : null;
  const rowHeight = virtualConfig?.rowHeight ?? (size === "sm" ? 32 : 40);
  const viewportHeight = virtualConfig?.height ?? 360;
  const overscan = virtualConfig?.overscan ?? 4;

  const isVirtualActive = Boolean(virtualConfig && sortedData.length > 0 && !hasDetailExpander);
  const startIndex = isVirtualActive ? Math.max(0, Math.floor(scrollTop / rowHeight) - overscan) : 0;
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const endIndex = isVirtualActive ? Math.min(sortedData.length, startIndex + visibleCount) : sortedData.length;
  const visibleRows = isVirtualActive ? sortedData.slice(startIndex, endIndex) : sortedData;
  const topSpacerHeight = isVirtualActive ? startIndex * rowHeight : 0;
  const bottomSpacerHeight = isVirtualActive ? Math.max(0, (sortedData.length - endIndex) * rowHeight) : 0;

  const startColumnResize = (colKey: string, event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!resizableColumns || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const th = event.currentTarget.closest("th");
    const initialWidth = colWidths[colKey] ?? th?.getBoundingClientRect().width ?? 120;
    const handleEl = event.currentTarget;
    handleEl.dataset.dragging = "true";
    colDragRef.current = { key: colKey, startX: event.clientX, startWidth: initialWidth };

    const onMove = (moveEvent: PointerEvent) => {
      if (!colDragRef.current) return;
      const nextWidth = Math.max(
        64,
        Math.round(colDragRef.current.startWidth + (moveEvent.clientX - colDragRef.current.startX)),
      );
      const targetKey = colDragRef.current.key;
      setColWidths((prev) => ({ ...prev, [targetKey]: nextWidth }));
      onColumnResize?.(targetKey, nextWidth);
    };
    const onUp = () => {
      colDragRef.current = null;
      delete handleEl.dataset.dragging;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <div
      className={cn("af-table-shell", className)}
      data-size={size}
      data-loading={loading || undefined}
      {...rest}
    >
      <span role="status" aria-live="polite" className="af-sr-only">
        {sortAnnouncement}
      </span>
      <div
        ref={wrapRef}
        className={cn(
          "af-table-wrap",
          (stickyHeader || isVirtualActive || scrollY !== undefined) && "af-table-wrap--sticky",
        )}
        data-ping-left={pingLeft || undefined}
        data-ping-right={pingRight || undefined}
        role="region"
        aria-labelledby={captionId}
        tabIndex={0}
        style={
          isVirtualActive
            ? { maxHeight: viewportHeight }
            : scrollY !== undefined
              ? { maxHeight: scrollY, overflowY: "auto" }
              : undefined
        }
        onScroll={(event) => {
          if (isVirtualActive) setScrollTop(event.currentTarget.scrollTop);
          if (hasFixedColumns) updateScrollShadows();
        }}
      >
        <table
          {...tableProps}
          className={cn("af-table", tableProps?.className, tableClassName)}
          style={
            tableProps?.style && resolvedTableStyle
              ? { ...tableProps.style, ...resolvedTableStyle }
              : (resolvedTableStyle ?? tableProps?.style)
          }
          data-hoverable={hoverable || undefined}
        >
          <caption id={captionId} className={cn("af-table__caption", hideCaption && "af-sr-only")}>
            {caption ?? effectiveAriaLabel}
          </caption>
          <thead className="af-table__head">
            <tr ref={headRowRef}>
              {selectable ? (
                <th
                  scope="col"
                  data-col-key="__check__"
                  data-fixed={hasFixedLeft ? "left" : undefined}
                  data-fixed-last-left={stickyMeta.lastLeftKey === "__check__" || undefined}
                  style={
                    hasFixedLeft
                      ? { position: "sticky", left: stickyMeta.leftOffsets["__check__"] ?? 0 }
                      : undefined
                  }
                  className="af-table__th af-table__cell--check"
                >
                  <AfCheckbox
                    aria-label="全选所有行"
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={toggleAllRows}
                    disabled={sortedData.length === 0}
                  />
                </th>
              ) : null}
              {hasDetailExpander ? (
                <th
                  scope="col"
                  data-col-key="__expand__"
                  data-fixed={hasFixedLeft ? "left" : undefined}
                  data-fixed-last-left={stickyMeta.lastLeftKey === "__expand__" || undefined}
                  style={
                    hasFixedLeft
                      ? { position: "sticky", left: stickyMeta.leftOffsets["__expand__"] ?? 0 }
                      : undefined
                  }
                  className="af-table__th af-table__cell--expand"
                  aria-label="展开列"
                />
              ) : null}
              {columns.map((col) => {
                const isSorted = activeSort?.key === col.key;
                const resolvedWidth = colWidths[col.key] ?? col.width;
                const cellStyle: CSSProperties = {};
                if (resolvedWidth !== undefined) cellStyle.width = resolvedWidth;
                if (col.fixed === "left") {
                  cellStyle.position = "sticky";
                  cellStyle.left = stickyMeta.leftOffsets[col.key] ?? 0;
                } else if (col.fixed === "right") {
                  cellStyle.position = "sticky";
                  cellStyle.right = stickyMeta.rightOffsets[col.key] ?? 0;
                }
                return (
                  <th
                    key={col.key}
                    scope="col"
                    data-col-key={col.key}
                    className="af-table__th"
                    data-align={col.align}
                    data-type={col.sortType}
                    data-fixed={col.fixed}
                    data-fixed-last-left={stickyMeta.lastLeftKey === col.key || undefined}
                    data-fixed-first-right={stickyMeta.firstRightKey === col.key || undefined}
                    aria-sort={col.sortable && isSorted ? activeSort.direction : undefined}
                    style={Object.keys(cellStyle).length > 0 ? cellStyle : undefined}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        className="af-table__sort-btn"
                        onClick={() => handleSort(col)}
                      >
                        <span className="af-table__th-label">{col.title}</span>
                        <span className="af-table__sort-icon" aria-hidden="true">
                          <svg viewBox="0 0 12 12" width="12" height="12" fill="none">
                            <path
                              className="af-table__sort-asc"
                              d="M3.75 4.75L6 2.5L8.25 4.75"
                              stroke="currentColor"
                              strokeWidth="1.25"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              className="af-table__sort-desc"
                              d="M3.75 7.25L6 9.5L8.25 7.25"
                              stroke="currentColor"
                              strokeWidth="1.25"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </button>
                    ) : (
                      col.title
                    )}
                    {resizableColumns ? (
                      <span
                        className="af-table__col-resizer"
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`调整 ${typeof col.title === "string" ? col.title : col.key} 列宽`}
                        onPointerDown={(event) => startColumnResize(col.key, event)}
                      />
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="af-table__body">
            {sortedData.length === 0 ? (
              <tr className="af-table__empty-row">
                <td colSpan={Math.max(1, totalCols)} className="af-table__empty">
                  {empty}
                </td>
              </tr>
            ) : (
              <>
                {topSpacerHeight > 0 ? (
                  <tr aria-hidden="true" className="af-table__spacer-row">
                    <td colSpan={Math.max(1, totalCols)} style={{ height: topSpacerHeight, padding: 0, border: 0 }} />
                  </tr>
                ) : null}
                {visibleRows.map(({ row, key, depth, hasTreeChildren }, localIdx) => {
                  const rowIndex = startIndex + localIdx;
                  const isSelected = selectedSet.has(key);
                  const isActive = activeRowKey !== undefined && key === activeRowKey;
                  const isExpanded = expandedSet.has(key);
                  const canExpandDetail =
                    hasDetailExpander && (expandable?.rowExpandable ? expandable.rowExpandable(row) : true);
                  const canExpandRow = canExpandDetail || hasTreeChildren;
                  const customRowClass = typeof rowClassName === "function" ? rowClassName(row, rowIndex) : rowClassName;

                  return (
                    <Fragment key={key}>
                      <tr
                        className={cn("af-table__row", customRowClass)}
                        data-selected={isSelected || undefined}
                        data-active={isActive || undefined}
                        data-expanded={isExpanded || undefined}
                        data-clickable={Boolean(onRowClick || (expandable?.expandRowByClick && canExpandRow)) || undefined}
                        onClick={
                          onRowClick || (expandable?.expandRowByClick && canExpandRow)
                            ? () => {
                                if (expandable?.expandRowByClick && canExpandRow) {
                                  toggleRowExpanded(key, row);
                                }
                                onRowClick?.(row, rowIndex);
                              }
                            : undefined
                        }
                      >
                        {selectable ? (
                          <td
                            className="af-table__td af-table__cell--check"
                            data-fixed={hasFixedLeft ? "left" : undefined}
                            data-fixed-last-left={stickyMeta.lastLeftKey === "__check__" || undefined}
                            style={
                              hasFixedLeft
                                ? { position: "sticky", left: stickyMeta.leftOffsets["__check__"] ?? 0 }
                                : undefined
                            }
                            onClick={(event) => event.stopPropagation()}
                          >
                            <AfCheckbox
                              aria-label={`选择第 ${rowIndex + 1} 行`}
                              checked={isSelected}
                              onChange={(checked) => toggleSingleRow(key, checked)}
                            />
                          </td>
                        ) : null}
                        {hasDetailExpander ? (
                          <td
                            className="af-table__td af-table__cell--expand"
                            data-fixed={hasFixedLeft ? "left" : undefined}
                            data-fixed-last-left={stickyMeta.lastLeftKey === "__expand__" || undefined}
                            style={
                              hasFixedLeft
                                ? { position: "sticky", left: stickyMeta.leftOffsets["__expand__"] ?? 0 }
                                : undefined
                            }
                            onClick={(event) => event.stopPropagation()}
                          >
                            {canExpandDetail ? (
                              <button
                                type="button"
                                className="af-table__expand-btn"
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? `收起第 ${rowIndex + 1} 行详情` : `展开第 ${rowIndex + 1} 行详情`}
                                onClick={() => toggleRowExpanded(key, row)}
                              >
                                <svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
                                  <path
                                    d="M4.5 2.75 7.75 6 4.5 9.25"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            ) : null}
                          </td>
                        ) : null}
                        {columns.map((col, colIdx) => {
                          const rawValue = col.dataIndex ? row[col.dataIndex] : row[col.key];
                          const rendered = col.render
                            ? col.render(rawValue, row, rowIndex)
                            : rawValue === undefined || rawValue === null
                              ? "—"
                              : (rawValue as ReactNode);

                          const tdStyle: CSSProperties = {};
                          if (col.fixed === "left") {
                            tdStyle.position = "sticky";
                            tdStyle.left = stickyMeta.leftOffsets[col.key] ?? 0;
                          } else if (col.fixed === "right") {
                            tdStyle.position = "sticky";
                            tdStyle.right = stickyMeta.rightOffsets[col.key] ?? 0;
                          }

                          const showTreeSlot = Boolean(expandable && colIdx === 0 && (hasTreeChildren || depth > 0));

                          return (
                            <td
                              key={col.key}
                              className="af-table__td"
                              data-align={col.align}
                              data-fixed={col.fixed}
                              data-fixed-last-left={stickyMeta.lastLeftKey === col.key || undefined}
                              data-fixed-first-right={stickyMeta.firstRightKey === col.key || undefined}
                              data-numeric={col.sortType === "number" || col.align === "right" || undefined}
                              style={Object.keys(tdStyle).length > 0 ? tdStyle : undefined}
                            >
                              {showTreeSlot ? (
                                <span
                                  className="af-table__tree-cell"
                                  style={depth > 0 ? { paddingInlineStart: depth * indentSize } : undefined}
                                >
                                  {hasTreeChildren ? (
                                    <button
                                      type="button"
                                      className="af-table__expand-btn af-table__tree-btn"
                                      aria-expanded={isExpanded}
                                      aria-label={isExpanded ? "收起子行" : "展开子行"}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        toggleRowExpanded(key, row);
                                      }}
                                    >
                                      <svg viewBox="0 0 12 12" width="12" height="12" fill="none" aria-hidden="true">
                                        <path
                                          d="M4.5 2.75 7.75 6 4.5 9.25"
                                          stroke="currentColor"
                                          strokeWidth="1.4"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </button>
                                  ) : (
                                    <span className="af-table__tree-spacer" aria-hidden="true" />
                                  )}
                                  <span className="af-table__tree-content">{rendered}</span>
                                </span>
                              ) : (
                                rendered
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {canExpandDetail && isExpanded && expandable?.expandedRowRender ? (
                        <tr className="af-table__expanded-row">
                          <td colSpan={Math.max(1, totalCols)} className="af-table__expanded-td">
                            <div className="af-table__expanded-inner">{expandable.expandedRowRender(row, rowIndex)}</div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                {bottomSpacerHeight > 0 ? (
                  <tr aria-hidden="true" className="af-table__spacer-row">
                    <td colSpan={Math.max(1, totalCols)} style={{ height: bottomSpacerHeight, padding: 0, border: 0 }} />
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>
      {loading ? (
        <div className="af-table__loading" aria-live="polite" aria-busy="true">
          <AfSpinner size={16} />
        </div>
      ) : null}
    </div>
  );
}

/** `AfTablePro` 分页配置（同时支持前端内存切片分页与服务端受控远程分页）。 */
export type AfTableProPaginationConfig = {
  /** 受控当前页码（1-based）。 */
  page?: number;
  /** 非受控初始页码，默认 1。 */
  defaultPage?: number;
  /** 每页条数，默认 10。 */
  pageSize?: number;
  /** 可选每页条数。 */
  pageSizeOptions?: number[];
  /** 总记录数（传入服务端总数且大于当前 `data.length` 或声明 `remote: true` 时启用远程分页）。 */
  total?: number;
  /** 显式声明远程服务端分页（不在前端二次切片 `data`）。 */
  remote?: boolean;
  /** 是否展示总条数。 */
  showTotal?: boolean;
  /** 页码切换回调。 */
  onChange?: (page: number, pageSize: number) => void;
  /** 页码切换回调别名。 */
  onPageChange?: (page: number, pageSize: number) => void;
  /** 每页条数变化回调。 */
  onPageSizeChange?: (pageSize: number) => void;
};

/** `AfTablePro` 组合高级表格属性（含工具栏、搜索、前端/远程分页与基础表格能力）。 */
export type AfTableProProps<T extends Record<string, unknown> = Record<string, unknown>> = AfTableProps<T> & {
  /** 表格面板标题。 */
  title?: ReactNode;
  /** 副标题说明。 */
  description?: ReactNode;
  /** 右侧操作区（如新建/导出按钮）。 */
  extra?: ReactNode;
  /** 工具栏附加过滤控件。 */
  toolbar?: ReactNode;
  /** 是否开启内置搜索框。 */
  searchable?: boolean;
  /** 搜索占位提示。 */
  searchPlaceholder?: string;
  /** 受控搜索词。 */
  searchValue?: string;
  /** 非受控初始搜索词。 */
  defaultSearchValue?: string;
  /** 搜索词变化回调。 */
  onSearchChange?: (query: string) => void;
  /** 指定搜索匹配的字段列表（默认检索全部原始字符串/数字字段）。 */
  searchFields?: (keyof T & string)[];
  /** 分页配置，`false` 关闭内置分页。 */
  pagination?: false | AfTableProPaginationConfig;
};

/** affectUI 增强表格面板：整合头部操作栏、即时过滤搜索与前端/受控远程分页。 */
export function AfTablePro<T extends Record<string, unknown> = Record<string, unknown>>({
  title,
  description,
  extra,
  toolbar,
  searchable = false,
  searchPlaceholder = "搜索表格…",
  searchValue: searchValueProp,
  defaultSearchValue = "",
  onSearchChange,
  searchFields,
  pagination = false,
  data = [],
  className,
  children,
  ...tableProps
}: AfTableProProps<T> = {} as AfTableProProps<T>) {
  const [query, setQuery] = useControllableState<string>({
    value: searchValueProp,
    defaultValue: defaultSearchValue,
    onChange: onSearchChange,
  });

  const paginationObj = typeof pagination === "object" ? pagination : undefined;
  const [pageSize, setPageSize] = useState(paginationObj?.pageSize ?? 10);
  useEffect(() => {
    if (paginationObj?.pageSize !== undefined) {
      setPageSize(paginationObj.pageSize);
    }
  }, [paginationObj?.pageSize]);

  const [page, setPage] = useControllableState<number>({
    value: paginationObj?.page,
    defaultValue: paginationObj?.defaultPage ?? 1,
    onChange: (nextPage) => {
      paginationObj?.onChange?.(nextPage, pageSize);
      paginationObj?.onPageChange?.(nextPage, pageSize);
    },
  });

  const filteredData = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return data;
    return data.filter((row) => {
      const keys = searchFields ?? (Object.keys(row) as (keyof T & string)[]);
      return keys.some((k) => {
        const val = row[k];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(keyword);
      });
    });
  }, [data, query, searchFields]);

  const isRemotePagination = Boolean(
    paginationObj &&
      (paginationObj.remote ||
        (paginationObj.total !== undefined && paginationObj.total > filteredData.length)),
  );
  const resolvedTotal = paginationObj?.total ?? filteredData.length;

  const pagedData = useMemo(() => {
    if (!paginationObj || isRemotePagination) return filteredData;
    const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, paginationObj, isRemotePagination, page, pageSize]);

  const showHeader = Boolean(title || description || extra || toolbar || searchable);

  return (
    <div className={cn("af-table-pro", className)}>
      {showHeader ? (
        <div className="af-table-pro__head">
          {title || description ? (
            <div className="af-table-pro__titles">
              {title ? <h3 className="af-table-pro__title">{title}</h3> : null}
              {description ? <p className="af-table-pro__desc">{description}</p> : null}
            </div>
          ) : null}
          {searchable || toolbar || extra ? (
            <div className="af-table-pro__toolbar">
              {searchable ? (
                <AfInput
                  size="sm"
                  icon="search"
                  allowClear
                  value={query}
                  placeholder={searchPlaceholder}
                  onValueChange={(next) => {
                    setQuery(next);
                    if (!isRemotePagination) setPage(1);
                  }}
                />
              ) : null}
              {toolbar}
              {extra}
            </div>
          ) : null}
        </div>
      ) : null}
      <AfTable {...tableProps} data={pagedData}>
        {children}
      </AfTable>
      {paginationObj && resolvedTotal > 0 ? (
        <div className="af-table-pro__foot">
          <AfPagination
            page={Math.min(page, Math.max(1, Math.ceil(resolvedTotal / pageSize)))}
            total={resolvedTotal}
            pageSize={pageSize}
            pageSizeOptions={paginationObj.pageSizeOptions}
            showTotal={paginationObj.showTotal}
            onChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              paginationObj.onPageSizeChange?.(nextSize);
              setPage(1);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
