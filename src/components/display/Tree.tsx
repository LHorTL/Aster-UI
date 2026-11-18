import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { useControllableState, useIsomorphicLayoutEffect } from "../../primitives";
import { AfCheckbox } from "../controls/Checkbox";

export interface AfTreeNode {
  /** 节点唯一键（兼容 key 或 id 两种写法）。 */
  key?: string;
  /** 节点唯一 ID（affectUI TreeItem 写法）。 */
  id?: string;
  /** 节点显示名称。 */
  label: ReactNode;
  /** 节点前置图标（支持内置图标键名或自定义 ReactNode；分支省略时默认渲染文件夹轮廓，叶子默认渲染文件轮廓）。 */
  icon?: AffectIconKey | ReactNode;
  /** 分支展开时的替换图标。 */
  openIcon?: AffectIconKey | ReactNode;
  /** 行尾次要元信息（如文件大小、行数、日期，等宽数字静默右对齐）。 */
  meta?: ReactNode;
  /** 向后兼容别名：等价于 meta。 */
  badge?: ReactNode;
  /** 节点行尾悬停操作按钮插槽。 */
  actions?: ReactNode;
  /** 是否禁用。 */
  disabled?: boolean;
  /** 子节点列表（非空数组视为可折叠分支）。 */
  children?: AfTreeNode[];
}

export type AfTreeItem = AfTreeNode;

export type AfTreeCheckInfo = {
  /** 半选态（部分子孙已选）的父级节点 key 列表。 */
  halfCheckedKeys: string[];
  /** 当前触发勾选切换的节点。 */
  node: AfTreeNode;
  /** 当前节点切换后的选中布尔值。 */
  checked: boolean;
};

export interface AfTreeProps extends Omit<HTMLAttributes<HTMLUListElement>, "onSelect"> {
  /** 树节点数组（与 items 互为别名）。 */
  nodes?: AfTreeNode[];
  /** 树节点数组（对齐 affectUI items 命名）。 */
  items?: AfTreeNode[];
  /** 受控选中节点 key（与 selected 互为别名）。 */
  selectedKey?: string | null;
  selected?: string | null;
  /** 非受控初始选中节点 key（与 defaultSelected 互为别名）。 */
  defaultSelectedKey?: string | null;
  defaultSelected?: string | null;
  /** 选中回调。 */
  onSelect?: (key: string, node: AfTreeNode) => void;
  /** 受控展开节点列表（与 expanded 互为别名）。 */
  expandedKeys?: string[];
  expanded?: string[];
  /** 非受控初始展开节点列表（与 defaultExpanded 互为别名）。 */
  defaultExpandedKeys?: string[];
  defaultExpanded?: string[];
  /** 展开状态变更回调（同时触发 onExpand 与 onExpandedChange）。 */
  onExpand?: (keys: string[]) => void;
  onExpandedChange?: (keys: string[]) => void;
  /** 是否开启父子联动三态复选框。 */
  checkable?: boolean;
  /** 受控已勾选节点 key 列表。 */
  checkedKeys?: string[];
  /** 非受控初始已勾选节点 key 列表。 */
  defaultCheckedKeys?: string[];
  /** 是否关闭父子勾选级联（默认 `false`，即开启完整父子联动三态）。 */
  checkStrictly?: boolean;
  /** 节点复选框勾选变化回调。 */
  onCheck?: (checkedKeys: string[], info: AfTreeCheckInfo) => void;
  /** 搜索过滤词：自动高亮匹配文本并自动展开命中节点的全部祖先分支。 */
  searchValue?: string;
  /** 自定义搜索匹配规则。 */
  filterTreeNode?: (node: AfTreeNode, searchValue: string) => boolean;
  /** 搜索非空时是否隐藏不匹配的无关分支，默认 `true`。 */
  hideUnmatched?: boolean;
  /** 节点行尾悬停操作区渲染函数（如新建子项、重命名、更多菜单）。 */
  renderActions?: (node: AfTreeNode) => ReactNode;
  /** 是否显示层级缩进发丝竖线（默认 true；guides 与 showLines 互为别名）。 */
  guides?: boolean;
  showLines?: boolean;
  /** 树为空时的静默占位文案。 */
  emptyText?: ReactNode;
  /** 树的无障碍标签。 */
  label?: string;
}

function nodeIdOf(node: AfTreeNode, fallbackIdx = 0): string {
  return node.key ?? node.id ?? `node-${fallbackIdx}`;
}

interface FlatTreeEntry {
  id: string;
  node: AfTreeNode;
  depth: number;
  parentId: string | null;
  siblingIds: string[];
  hasChildren: boolean;
  isExpanded: boolean;
  posInSet: number;
  setSize: number;
  text: string;
}

type TreeCascadeRecord = {
  id: string;
  node: AfTreeNode;
  parentId: string | null;
  enabledChildIds: string[];
  allDescendantEnabledIds: string[];
};

function textFromLabel(label: ReactNode): string {
  if (typeof label === "string" || typeof label === "number") return String(label);
  return "";
}

function buildCascadeIndex(nodes: AfTreeNode[]): {
  map: Map<string, TreeCascadeRecord>;
  postOrderIds: string[];
} {
  const map = new Map<string, TreeCascadeRecord>();
  const postOrderIds: string[] = [];

  const visit = (list: AfTreeNode[], parentId: string | null): string[] => {
    const enabledDescendantsHere: string[] = [];
    list.forEach((node, idx) => {
      const id = nodeIdOf(node, idx);
      const childEnabledDescendants = node.children?.length ? visit(node.children, id) : [];
      const directEnabledChildren = (node.children ?? [])
        .map((c, cIdx) => ({ id: nodeIdOf(c, cIdx), disabled: Boolean(c.disabled) }))
        .filter((c) => !c.disabled)
        .map((c) => c.id);

      map.set(id, {
        id,
        node,
        parentId,
        enabledChildIds: directEnabledChildren,
        allDescendantEnabledIds: childEnabledDescendants,
      });
      postOrderIds.push(id);

      if (!node.disabled) {
        enabledDescendantsHere.push(id, ...childEnabledDescendants);
      }
    });
    return enabledDescendantsHere;
  };

  visit(nodes, null);
  return { map, postOrderIds };
}

function deriveCascadeCheckState(
  rawKeys: string[],
  index: { map: Map<string, TreeCascadeRecord>; postOrderIds: string[] },
  strictly: boolean,
): { checkedSet: Set<string>; halfCheckedSet: Set<string> } {
  if (strictly) {
    return { checkedSet: new Set(rawKeys), halfCheckedSet: new Set() };
  }

  const checkedSet = new Set<string>();
  const halfCheckedSet = new Set<string>();

  // 1) Top-down: 若传入了父节点 key，则将其全部未禁用子孙一并标为选中
  for (const key of rawKeys) {
    const rec = index.map.get(key);
    if (!rec) continue;
    checkedSet.add(key);
    for (const descId of rec.allDescendantEnabledIds) {
      checkedSet.add(descId);
    }
  }

  // 2) Bottom-up: 自底向上汇总父节点全选/半选状态
  for (const id of index.postOrderIds) {
    const rec = index.map.get(id);
    if (!rec || rec.enabledChildIds.length === 0) continue;
    const allChecked = rec.enabledChildIds.every((cid) => checkedSet.has(cid));
    const someChecked = rec.enabledChildIds.some((cid) => checkedSet.has(cid) || halfCheckedSet.has(cid));
    if (allChecked) {
      checkedSet.add(id);
      halfCheckedSet.delete(id);
    } else if (someChecked) {
      checkedSet.delete(id);
      halfCheckedSet.add(id);
    } else {
      checkedSet.delete(id);
      halfCheckedSet.delete(id);
    }
  }

  return { checkedSet, halfCheckedSet };
}

function highlightLabelText(label: ReactNode, keyword: string): ReactNode {
  if (!keyword || (typeof label !== "string" && typeof label !== "number")) return label;
  const source = String(label);
  const lowerSource = source.toLowerCase();
  const lowerKey = keyword.toLowerCase();
  const matchIdx = lowerSource.indexOf(lowerKey);
  if (matchIdx === -1) return label;

  const parts: ReactNode[] = [];
  let cursor = 0;
  let found = matchIdx;
  let tokenIdx = 0;
  while (found !== -1) {
    if (found > cursor) {
      parts.push(source.slice(cursor, found));
    }
    parts.push(
      <mark key={`hl-${tokenIdx++}`} className="af-tree__highlight">
        {source.slice(found, found + keyword.length)}
      </mark>,
    );
    cursor = found + keyword.length;
    found = lowerSource.indexOf(lowerKey, cursor);
  }
  if (cursor < source.length) {
    parts.push(source.slice(cursor));
  }
  return parts;
}

function flattenVisible(
  nodes: AfTreeNode[],
  expandedSet: ReadonlySet<string>,
  depth = 0,
  parentId: string | null = null,
  out: FlatTreeEntry[] = [],
): FlatTreeEntry[] {
  const setSize = nodes.length;
  const siblingIds = nodes.map((n, idx) => nodeIdOf(n, idx));
  nodes.forEach((node, index) => {
    const id = siblingIds[index];
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isExpanded = hasChildren && expandedSet.has(id);
    out.push({
      id,
      node,
      depth,
      parentId,
      siblingIds,
      hasChildren,
      isExpanded,
      posInSet: index + 1,
      setSize,
      text: textFromLabel(node.label) || id,
    });
    if (isExpanded && node.children) {
      flattenVisible(node.children, expandedSet, depth + 1, id, out);
    }
  });
  return out;
}

function FolderGlyph({ open }: { open: boolean }) {
  return open ? (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.75 4.25A1.25 1.25 0 0 1 3 3h3.1c.36 0 .7.16.94.43l.82.94c.24.27.58.43.94.43H13a1.25 1.25 0 0 1 1.25 1.25v.7H3.6a1.25 1.25 0 0 0-1.18.84L1.75 9.5V4.25Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M2.42 7.6A1.1 1.1 0 0 1 3.46 6.85h10.08a.95.95 0 0 1 .9 1.26l-1.26 3.78a1.25 1.25 0 0 1-1.19.86H2.75a1 1 0 0 1-.95-1.31l.62-3.84Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.75 4.25A1.25 1.25 0 0 1 3 3h3.1c.36 0 .7.16.94.43l.82.94c.24.27.58.43.94.43H13a1.25 1.25 0 0 1 1.25 1.25v6.2A1.25 1.25 0 0 1 13 13.5H3a1.25 1.25 0 0 1-1.25-1.25v-8Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 2.25h5.2L12.5 5.5v8.25a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1V3.25a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M9 2.35V5.5h3.15" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

function renderNodeIcon(icon: AffectIconKey | ReactNode | undefined, hasChildren: boolean, isOpen: boolean): ReactNode {
  if (icon === undefined) {
    return hasChildren ? <FolderGlyph open={isOpen} /> : <FileGlyph />;
  }
  if (typeof icon === "string") {
    if (icon === "folder") return <FolderGlyph open={isOpen} />;
    if (icon === "file") return <FileGlyph />;
    return <AfIcon name={icon as AffectIconKey} size={14} />;
  }
  return icon;
}

/**
 * 纯 Flexbox 平滑高度折叠容器（零 CSS Grid）：
 * - 初始展开态直接 height: auto，避免首帧闪烁；
 * - 展开/收起时精确测量内部 scrollHeight 执行 220ms var(--af-ease) 高度过渡，结束后释放为 auto 支持多层嵌套自由伸缩。
 */
function TreeFold({
  open,
  animateOnMount = false,
  children,
}: {
  open: boolean;
  animateOnMount?: boolean;
  children: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const firstRender = useRef(true);
  const prevOpen = useRef(open);

  useIsomorphicLayoutEffect(() => {
    const el = wrapRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;
    el.inert = !open;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (firstRender.current) {
      firstRender.current = false;
      prevOpen.current = open;
      if (!open || !animateOnMount || reduced) {
        el.style.height = open ? "auto" : "0px";
        return;
      }
      const targetH = inner.scrollHeight;
      el.style.height = "0px";
      void el.offsetHeight;
      el.style.height = `${targetH}px`;
      const timer = window.setTimeout(() => {
        if (prevOpen.current) el.style.height = "auto";
      }, 260);
      const onEnd = (ev: TransitionEvent) => {
        if (ev.target !== el || ev.propertyName !== "height") return;
        window.clearTimeout(timer);
        el.removeEventListener("transitionend", onEnd);
        if (prevOpen.current) el.style.height = "auto";
      };
      el.addEventListener("transitionend", onEnd);
      return () => {
        window.clearTimeout(timer);
        el.removeEventListener("transitionend", onEnd);
      };
    }

    if (prevOpen.current === open) return;
    prevOpen.current = open;

    if (reduced) {
      el.style.height = open ? "auto" : "0px";
      return;
    }

    if (open) {
      const targetH = inner.scrollHeight;
      el.style.height = "0px";
      void el.offsetHeight;
      el.style.height = `${targetH}px`;
      const timer = window.setTimeout(() => {
        if (prevOpen.current) el.style.height = "auto";
      }, 260);
      const onEnd = (ev: TransitionEvent) => {
        if (ev.target !== el || ev.propertyName !== "height") return;
        window.clearTimeout(timer);
        el.removeEventListener("transitionend", onEnd);
        if (prevOpen.current) el.style.height = "auto";
      };
      el.addEventListener("transitionend", onEnd);
      return () => {
        window.clearTimeout(timer);
        el.removeEventListener("transitionend", onEnd);
      };
    } else {
      const currentH = el.getBoundingClientRect().height || inner.scrollHeight;
      el.style.height = `${currentH}px`;
      void el.offsetHeight;
      el.style.height = "0px";
    }
  }, [open, animateOnMount]);

  return (
    <div ref={wrapRef} className="af-tree__fold" data-open={open || undefined}>
      <div ref={innerRef} className="af-tree__fold-inner">
        {children}
      </div>
    </div>
  );
}

/**
 * 树形导航与文件层级视图（对齐 affectUI TreeView & WAI-ARIA TreeView）：
 * - 单一 Tab 漫游焦点、↑↓ 跨层移动、→ 展开/进子项、← 收起/回父项、Home/End、* 展开同级全部、a–z 首字母速查；
 * - 支持 `checkable` 父子联动三态复选框、`searchValue` 关键词过滤高亮 + 祖先自动展开、以及节点行尾悬停操作槽 `renderActions`。
 */
export function AfTree({
  nodes: nodesProp,
  items: itemsProp,
  selectedKey,
  selected,
  defaultSelectedKey,
  defaultSelected = null,
  onSelect,
  expandedKeys,
  expanded,
  defaultExpandedKeys,
  defaultExpanded = [],
  onExpand,
  onExpandedChange,
  checkable = false,
  checkedKeys: checkedKeysProp,
  defaultCheckedKeys = [],
  checkStrictly = false,
  onCheck,
  searchValue = "",
  filterTreeNode,
  hideUnmatched = true,
  renderActions,
  guides,
  showLines,
  emptyText = "Empty",
  label = "Tree",
  className,
  ...props
}: AfTreeProps = {}) {
  const rootNodes = itemsProp ?? nodesProp ?? [];
  const showGuides = guides ?? showLines ?? true;
  const trimmedSearch = searchValue.trim();

  const [currentSelected, setCurrentSelected] = useControllableState<string | null>({
    value: selected !== undefined ? selected : selectedKey,
    defaultValue: defaultSelectedKey !== undefined ? defaultSelectedKey : defaultSelected,
  });

  const [openList, setOpenList] = useControllableState<string[]>({
    value: expanded !== undefined ? expanded : expandedKeys,
    defaultValue: defaultExpandedKeys !== undefined ? defaultExpandedKeys : defaultExpanded,
    onChange: (next) => {
      onExpand?.(next);
      onExpandedChange?.(next);
    },
  });

  const [rawCheckedKeys, setRawCheckedKeys] = useControllableState<string[]>({
    value: checkedKeysProp,
    defaultValue: defaultCheckedKeys,
  });

  const cascadeIndex = useMemo(() => buildCascadeIndex(rootNodes), [rootNodes]);
  const { checkedSet, halfCheckedSet } = useMemo(
    () => deriveCascadeCheckState(rawCheckedKeys, cascadeIndex, checkStrictly),
    [rawCheckedKeys, cascadeIndex, checkStrictly],
  );

  const toggleNodeCheck = (id: string, node: AfTreeNode) => {
    if (node.disabled) return;
    const willCheck = !checkedSet.has(id);

    if (checkStrictly) {
      const nextSet = new Set(checkedSet);
      if (willCheck) nextSet.add(id);
      else nextSet.delete(id);
      const nextList = Array.from(nextSet);
      setRawCheckedKeys(nextList);
      onCheck?.(nextList, { halfCheckedKeys: [], node, checked: willCheck });
      return;
    }

    const working = new Set(checkedSet);
    const rec = cascadeIndex.map.get(id);
    if (willCheck) {
      working.add(id);
      for (const descId of rec?.allDescendantEnabledIds ?? []) working.add(descId);
    } else {
      working.delete(id);
      for (const descId of rec?.allDescendantEnabledIds ?? []) working.delete(descId);
    }

    // 自当前节点向上重算祖先全选状态
    let parentCursor = rec?.parentId ?? null;
    while (parentCursor) {
      const parentRec = cascadeIndex.map.get(parentCursor);
      if (!parentRec) break;
      if (parentRec.enabledChildIds.length > 0) {
        const everyChildChecked = parentRec.enabledChildIds.every((cid) => working.has(cid));
        if (everyChildChecked) working.add(parentCursor);
        else working.delete(parentCursor);
      }
      parentCursor = parentRec.parentId;
    }

    const derived = deriveCascadeCheckState(Array.from(working), cascadeIndex, false);
    const nextCheckedList = Array.from(derived.checkedSet);
    const nextHalfList = Array.from(derived.halfCheckedSet);
    setRawCheckedKeys(nextCheckedList);
    onCheck?.(nextCheckedList, {
      halfCheckedKeys: nextHalfList,
      node,
      checked: willCheck,
    });
  };

  // 搜索过滤与命中路径祖先自动展开
  const { displayNodes, searchExpandSet } = useMemo(() => {
    if (!trimmedSearch) {
      return { displayNodes: rootNodes, searchExpandSet: new Set<string>() };
    }
    const autoExpand = new Set<string>();
    const matchesNode = (node: AfTreeNode) =>
      filterTreeNode
        ? filterTreeNode(node, trimmedSearch)
        : textFromLabel(node.label).toLowerCase().includes(trimmedSearch.toLowerCase());

    const filterLevel = (list: AfTreeNode[]): { filtered: AfTreeNode[]; hasHit: boolean } => {
      const out: AfTreeNode[] = [];
      let levelHit = false;

      list.forEach((node, idx) => {
        const id = nodeIdOf(node, idx);
        const selfHit = matchesNode(node);
        const childRes = node.children?.length ? filterLevel(node.children) : { filtered: [], hasHit: false };

        if (childRes.hasHit) {
          autoExpand.add(id);
        }

        if (selfHit || childRes.hasHit) {
          levelHit = true;
          if (!hideUnmatched) {
            out.push(node);
          } else if (childRes.hasHit) {
            out.push({ ...node, children: childRes.filtered });
          } else {
            out.push(node);
          }
        } else if (!hideUnmatched) {
          out.push(node);
        }
      });

      return { filtered: out, hasHit: levelHit };
    };

    const res = filterLevel(rootNodes);
    return { displayNodes: res.filtered, searchExpandSet: autoExpand };
  }, [rootNodes, trimmedSearch, filterTreeNode, hideUnmatched]);

  const effectiveExpandedSet = useMemo(() => {
    if (searchExpandSet.size === 0) return new Set(openList);
    const merged = new Set(openList);
    for (const k of searchExpandSet) merged.add(k);
    return merged;
  }, [openList, searchExpandSet]);

  const initiallyOpenRef = useRef<Set<string>>(new Set(openList));

  // 懒挂载并保持已展开过的分支在 DOM 中，避免重复销毁且令收起动画顺滑完整
  const [seenBranches, setSeenBranches] = useState<Set<string>>(() => new Set(effectiveExpandedSet));
  useEffect(() => {
    setSeenBranches((prev) => {
      let changed = false;
      for (const k of effectiveExpandedSet) {
        if (!prev.has(k)) {
          changed = true;
          break;
        }
      }
      if (!changed) return prev;
      const next = new Set(prev);
      for (const k of effectiveExpandedSet) next.add(k);
      return next;
    });
  }, [effectiveExpandedSet]);

  const flatVisible = useMemo(
    () => flattenVisible(displayNodes, effectiveExpandedSet),
    [displayNodes, effectiveExpandedSet],
  );
  const entryMap = useMemo(() => {
    const m = new Map<string, FlatTreeEntry>();
    for (const item of flatVisible) m.set(item.id, item);
    return m;
  }, [flatVisible]);

  const [focusedKey, setFocusedKey] = useState<string | null>(() => currentSelected ?? flatVisible[0]?.id ?? null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const typeBufferRef = useRef<{ query: string; timer: number | null }>({ query: "", timer: null });

  const activeFocusKey = useMemo(() => {
    if (focusedKey && entryMap.has(focusedKey)) return focusedKey;
    if (currentSelected && entryMap.has(currentSelected)) return currentSelected;
    const firstEnabled = flatVisible.find((entry) => !entry.node.disabled);
    return firstEnabled?.id ?? flatVisible[0]?.id ?? null;
  }, [focusedKey, currentSelected, entryMap, flatVisible]);

  const moveFocusTo = (id: string) => {
    setFocusedKey(id);
    window.requestAnimationFrame(() => {
      itemRefs.current.get(id)?.focus();
    });
  };

  const setBranchExpanded = (id: string, shouldExpand: boolean) => {
    const next = new Set(effectiveExpandedSet);
    if (shouldExpand) next.add(id);
    else next.delete(id);
    setOpenList(Array.from(next));
  };

  const expandAllSiblings = (entry: FlatTreeEntry) => {
    const next = new Set(effectiveExpandedSet);
    const findSiblings = (list: AfTreeNode[]): AfTreeNode[] | null => {
      if (list.some((n, i) => nodeIdOf(n, i) === entry.id)) return list;
      for (const n of list) {
        if (n.children) {
          const hit = findSiblings(n.children);
          if (hit) return hit;
        }
      }
      return null;
    };
    const siblings = findSiblings(displayNodes) ?? [];
    let changed = false;
    siblings.forEach((sib, i) => {
      const sid = nodeIdOf(sib, i);
      if (sib.children && sib.children.length > 0 && !sib.disabled && !next.has(sid)) {
        next.add(sid);
        changed = true;
      }
    });
    if (changed) setOpenList(Array.from(next));
  };

  const activateNode = (id: string, node: AfTreeNode) => {
    if (node.disabled) return;
    setCurrentSelected(id);
    onSelect?.(id, node);
  };

  const handleTreeKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const targetLi = (event.target as HTMLElement | null)?.closest<HTMLLIElement>('[role="treeitem"]');
    const currentKey = targetLi?.dataset.treeKey ?? activeFocusKey;
    if (!currentKey) return;

    const enabledEntries = flatVisible.filter((entry) => !entry.node.disabled);
    const currentIdx = enabledEntries.findIndex((entry) => entry.id === currentKey);
    const currentEntry = entryMap.get(currentKey);
    if (!currentEntry) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = enabledEntries[Math.min(enabledEntries.length - 1, currentIdx + 1)];
      if (next) {
        setFocusedKey(next.id);
        itemRefs.current.get(next.id)?.focus();
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev = enabledEntries[Math.max(0, currentIdx - 1)];
      if (prev) {
        setFocusedKey(prev.id);
        itemRefs.current.get(prev.id)?.focus();
      }
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const first = enabledEntries[0];
      if (first) {
        setFocusedKey(first.id);
        itemRefs.current.get(first.id)?.focus();
      }
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const last = enabledEntries[enabledEntries.length - 1];
      if (last) {
        setFocusedKey(last.id);
        itemRefs.current.get(last.id)?.focus();
      }
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (currentEntry.hasChildren && !currentEntry.node.disabled) {
        if (!currentEntry.isExpanded) {
          setBranchExpanded(currentEntry.id, true);
        } else {
          const firstChild = enabledEntries.find((entry) => entry.parentId === currentEntry.id);
          if (firstChild) {
            setFocusedKey(firstChild.id);
            itemRefs.current.get(firstChild.id)?.focus();
          }
        }
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (currentEntry.hasChildren && currentEntry.isExpanded && !currentEntry.node.disabled) {
        setBranchExpanded(currentEntry.id, false);
      } else if (currentEntry.parentId) {
        setFocusedKey(currentEntry.parentId);
        itemRefs.current.get(currentEntry.parentId)?.focus();
      }
      return;
    }

    if (event.key === "*") {
      event.preventDefault();
      expandAllSiblings(currentEntry);
      return;
    }

    if (event.key === " " && checkable) {
      event.preventDefault();
      toggleNodeCheck(currentEntry.id, currentEntry.node);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (currentEntry.node.disabled) return;
      if (currentEntry.hasChildren) {
        setBranchExpanded(currentEntry.id, !currentEntry.isExpanded);
      }
      activateNode(currentEntry.id, currentEntry.node);
      return;
    }

    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      /\S/.test(event.key)
    ) {
      event.preventDefault();
      const buf = typeBufferRef.current;
      if (buf.timer !== null) window.clearTimeout(buf.timer);
      buf.query += event.key.toLowerCase();
      buf.timer = window.setTimeout(() => {
        buf.query = "";
        buf.timer = null;
      }, 500);

      const ordered = [
        ...enabledEntries.slice(currentIdx + 1),
        ...enabledEntries.slice(0, currentIdx + 1),
      ];
      const hit =
        ordered.find((e) => e.text.toLowerCase().startsWith(buf.query)) ??
        (buf.query.length > 1
          ? ordered.find((e) => e.text.toLowerCase().startsWith(event.key.toLowerCase()))
          : undefined);
      if (hit) moveFocusTo(hit.id);
    }
  };

  if (displayNodes.length === 0) {
    return (
      <div className={["af-tree", "af-tree--empty", className].filter(Boolean).join(" ")} role="status">
        {emptyText}
      </div>
    );
  }

  const renderNodes = (list: AfTreeNode[], depth: number): ReactNode =>
    list.map((node, index) => {
      const id = nodeIdOf(node, index);
      const hasChildren = Boolean(node.children && node.children.length > 0);
      const isExpanded = hasChildren && effectiveExpandedSet.has(id);
      const shouldMountChildren = hasChildren && (isExpanded || seenBranches.has(id));
      const isSelected = currentSelected === id;
      const isChecked = checkable && checkedSet.has(id);
      const isHalfChecked = checkable && halfCheckedSet.has(id);
      const isTabStop = activeFocusKey === id;
      const metaNode = node.meta ?? node.badge;
      const actionsNode = renderActions ? renderActions(node) : node.actions;
      const activeIcon = isExpanded && node.openIcon !== undefined ? node.openIcon : node.icon;

      return (
        <li
          key={id}
          ref={(el) => {
            if (el) itemRefs.current.set(id, el);
            else itemRefs.current.delete(id);
          }}
          role="treeitem"
          data-tree-key={id}
          data-branch={hasChildren || undefined}
          tabIndex={node.disabled ? -1 : isTabStop ? 0 : -1}
          aria-level={depth + 1}
          aria-posinset={index + 1}
          aria-setsize={list.length}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-selected={isSelected}
          aria-checked={checkable ? (isHalfChecked ? "mixed" : isChecked) : undefined}
          aria-disabled={node.disabled || undefined}
          className="af-tree__item"
          onFocus={(event) => {
            if (event.target === event.currentTarget) {
              setFocusedKey(id);
            }
          }}
        >
          <div
            className="af-tree__row"
            style={{ "--depth": depth } as CSSProperties}
            onClick={(event) => {
              event.stopPropagation();
              if (node.disabled) return;
              setFocusedKey(id);
              itemRefs.current.get(id)?.focus();
              if (hasChildren) {
                setBranchExpanded(id, !isExpanded);
              }
              activateNode(id, node);
            }}
          >
            {hasChildren ? (
              <span className="af-tree__chevron" data-expanded={isExpanded || undefined} aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M4.5 2.75 7.75 6 4.5 9.25"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ) : (
              <span className="af-tree__chevron af-tree__chevron--leaf" aria-hidden="true" />
            )}
            {checkable ? (
              <span
                className="af-tree__check"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <AfCheckbox
                  checked={isChecked}
                  indeterminate={isHalfChecked}
                  disabled={node.disabled}
                  aria-label={`勾选 ${textFromLabel(node.label) || id}`}
                  onChange={() => toggleNodeCheck(id, node)}
                />
              </span>
            ) : null}
            <span className="af-tree__icon" aria-hidden="true">
              {renderNodeIcon(activeIcon, hasChildren, isExpanded)}
            </span>
            <span className="af-tree__label">
              {trimmedSearch ? highlightLabelText(node.label, trimmedSearch) : node.label}
            </span>
            {metaNode !== undefined && metaNode !== null ? (
              <span className="af-tree__meta">{metaNode}</span>
            ) : null}
            {actionsNode !== undefined && actionsNode !== null ? (
              <span
                className="af-tree__actions"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                {actionsNode}
              </span>
            ) : null}
          </div>
          {shouldMountChildren && node.children ? (
            <TreeFold open={isExpanded} animateOnMount={!initiallyOpenRef.current.has(id) && !searchExpandSet.has(id)}>
              <ul role="group" className="af-tree__group" style={{ "--depth": depth } as CSSProperties}>
                {renderNodes(node.children, depth + 1)}
              </ul>
            </TreeFold>
          ) : null}
        </li>
      );
    });

  return (
    <ul
      role="tree"
      aria-label={label}
      className={["af-tree", className].filter(Boolean).join(" ")}
      data-guides={showGuides ? "true" : undefined}
      data-lines={showGuides ? "true" : undefined}
      onKeyDown={handleTreeKeyDown}
      {...props}
    >
      {renderNodes(displayNodes, 0)}
    </ul>
  );
}

export const AfTreeView = AfTree;
export type AfTreeViewProps = AfTreeProps;
