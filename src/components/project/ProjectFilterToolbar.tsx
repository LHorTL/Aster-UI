import { useState, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn } from "../../primitives";
import { AfButton, AfInput, AfSelect } from "../../ui";

/** 筛选下拉选项。 */
export type AfProjectFilterOption = {
  value: string;
  label: string;
};

/** 筛选工具栏属性（严格遵循 WAI-ARIA `role="toolbar"` 与 `[aria-pressed="true"]` 规范）。 */
export type AfProjectFilterToolbarProps = {
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (value: string) => void;
  /** 兼容旧版属性名，等效于 `search`。 */
  keyword?: string;
  defaultKeyword?: string;
  onKeywordChange?: (value: string) => void;
  searchPlaceholder?: string;
  status?: string;
  defaultStatus?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: AfProjectFilterOption[];
  sortBy?: string;
  defaultSortBy?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: AfProjectFilterOption[];
  view?: "list" | "grid";
  defaultView?: "list" | "grid";
  onViewChange?: (view: "list" | "grid") => void;
  showViewToggle?: boolean;
  showSummary?: boolean;
  allowClear?: boolean;
  totalCount?: number;
  filteredCount?: number;
  onReset?: () => void;
  extra?: ReactNode;
  "aria-label"?: string;
  className?: string;
};

const DEFAULT_STATUS_OPTIONS: AfProjectFilterOption[] = [
  { value: "all", label: "全部状态" },
  { value: "running", label: "运行中" },
  { value: "waiting", label: "等待审批" },
  { value: "done", label: "已完成" },
];

const DEFAULT_SORT_OPTIONS: AfProjectFilterOption[] = [
  { value: "recent", label: "最近更新" },
  { value: "tokens", label: "用量降序" },
  { value: "name", label: "名称 A-Z" },
];

/** 筛选工具栏：同排等高（32px）检索、状态筛选、排序、滑动视图切换与一键清空。 */
function ProjectFilterToolbar({
  search: searchProp,
  defaultSearch,
  onSearchChange,
  keyword: keywordProp,
  defaultKeyword,
  onKeywordChange,
  searchPlaceholder = "搜索名称、标签或关键词…",
  status: statusProp,
  defaultStatus = "all",
  onStatusChange,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  sortBy: sortByProp,
  defaultSortBy = "recent",
  onSortChange,
  sortOptions = DEFAULT_SORT_OPTIONS,
  view: viewProp,
  defaultView = "list",
  onViewChange,
  showViewToggle = true,
  showSummary = true,
  allowClear = true,
  totalCount = 18,
  filteredCount,
  onReset,
  extra,
  "aria-label": ariaLabel = "列表筛选与视图工具栏",
  className,
}: AfProjectFilterToolbarProps = {}) {
  const [innerSearch, setInnerSearch] = useState(defaultSearch ?? defaultKeyword ?? "");
  const [innerStatus, setInnerStatus] = useState(defaultStatus);
  const [innerSort, setInnerSort] = useState(defaultSortBy);
  const [innerView, setInnerView] = useState<"list" | "grid">(defaultView);

  const search = searchProp !== undefined ? searchProp : keywordProp !== undefined ? keywordProp : innerSearch;
  const status = statusProp !== undefined ? statusProp : innerStatus;
  const sortBy = sortByProp !== undefined ? sortByProp : innerSort;
  const view = viewProp !== undefined ? viewProp : innerView;

  const updateSearch = (next: string) => {
    if (searchProp === undefined && keywordProp === undefined) setInnerSearch(next);
    onSearchChange?.(next);
    onKeywordChange?.(next);
  };
  const updateStatus = (next: string) => {
    if (statusProp === undefined) setInnerStatus(next);
    onStatusChange?.(next);
  };
  const updateSort = (next: string) => {
    if (sortByProp === undefined) setInnerSort(next);
    onSortChange?.(next);
  };
  const updateView = (next: "list" | "grid") => {
    if (viewProp === undefined) setInnerView(next);
    onViewChange?.(next);
  };

  const hasFilter = search.trim().length > 0 || status !== "all";
  const countText =
    filteredCount !== undefined
      ? `${filteredCount} / ${totalCount} 项`
      : hasFilter
        ? `已筛选 · ${totalCount} 项`
        : `共 ${totalCount} 项`;

  const resetAll = () => {
    updateSearch("");
    updateStatus("all");
    updateSort(defaultSortBy);
    onReset?.();
  };

  return (
    <div className={cn("af-pj-toolbar", className)} role="toolbar" aria-label={ariaLabel}>
      <div className="af-pj-toolbar__bar">
        <AfInput
          size="md"
          value={search}
          onValueChange={updateSearch}
          placeholder={searchPlaceholder}
          prefix={<AfIcon name="search" size={14} />}
          allowClear={allowClear}
          style={{ width: 224 }}
        />

        <div className="af-pj-toolbar__filters" role="group" aria-label="状态与排序">
          <AfSelect size="md" value={status} onChange={(v) => updateStatus(String(v))} options={statusOptions} style={{ width: 120 }} />
          {sortOptions.length > 0 ? (
            <AfSelect size="md" value={sortBy} onChange={(v) => updateSort(String(v))} options={sortOptions} style={{ width: 124 }} />
          ) : null}
        </div>

        {hasFilter ? (
          <AfButton size="sm" variant="ghost" icon="x" onClick={resetAll}>
            重置
          </AfButton>
        ) : null}

        <span className="af-pj-toolbar__spacer" />

        {showSummary ? <span className="af-pj-toolbar__count">{countText}</span> : null}

        {extra}

        {showViewToggle ? (
          <div className="af-pj-viewtoggle" data-view={view} role="group" aria-label="视图切换">
            <span className="af-pj-viewtoggle__thumb" aria-hidden="true" />
            <button
              type="button"
              className="af-pj-viewtoggle__item"
              aria-label="列表视图"
              aria-pressed={view === "list"}
              onClick={() => updateView("list")}
            >
              <AfIcon name="list" size={14} />
            </button>
            <button
              type="button"
              className="af-pj-viewtoggle__item"
              aria-label="网格视图"
              aria-pressed={view === "grid"}
              onClick={() => updateView("grid")}
            >
              <AfIcon name="grid" size={14} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { ProjectFilterToolbar as AfProjectFilterToolbar };
