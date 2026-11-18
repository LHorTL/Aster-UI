import {
  forwardRef,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AfIcon, renderAfIconSlot, type AfIconSlot } from "../../icons";
import { cn, composeRefs, useControllableState, useImeEnterGuard, useMenuHighlight } from "../../primitives";
import { AfPopover } from "../overlay/Popover";
import { useAfFormFieldControl } from "./FormField";

/** 自动补全候选条目。 */
export type AfAutoCompleteOption = {
  value: string;
  label?: ReactNode;
  description?: ReactNode;
  /** 分组标题（如 `"最近搜索"`、`"推荐命令"`）；同名分组自动聚合显示分组头。 */
  group?: string;
  /** 前置图标槽位（支持图标名或自定义 ReactNode）。 */
  icon?: AfIconSlot;
  /** 单项是否展示尾部删除按钮（配合 `onRemoveOption`）。 */
  removable?: boolean;
  disabled?: boolean;
};

/** 自动补全输入框属性。 */
export type AfAutoCompleteProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "onSelect" | "onSubmit" | "size"
> & {
  /** 候选项列表，支持纯字符串或对象配置。 */
  options?: ReadonlyArray<string | AfAutoCompleteOption>;
  /** 受控文本值。 */
  value?: string;
  /** 非受控初始文本值。 */
  defaultValue?: string;
  /** 文本变更回调。 */
  onChange?: (value: string) => void;
  /** 选中某个候选项时的回调。 */
  onSelect?: (value: string, option: AfAutoCompleteOption) => void;
  /** 搜索词变化回调。 */
  onSearch?: (value: string) => void;
  /** 按下回车直接提交当前文本或选中项时的回调（IME 安全）。 */
  onSubmit?: (value: string) => void;
  /** 点击候选项尾部删除按钮回调（如删除单条历史记录）。 */
  onRemoveOption?: (value: string, option: AfAutoCompleteOption) => void;
  /** 是否默认允许所有候选项展示尾部删除按钮（也可在单条 option 上设 `removable`）。 */
  removableOptions?: boolean;
  /** `removableOptions` 的同义简写属性。 */
  removable?: boolean;
  /** 点击分组标题右侧清空按钮回调（如一键清空 `"最近搜索"`）。 */
  onClearGroup?: (group: string) => void;
  /** 限定哪些分组展示清空按钮（传 `true` 或省略时对所有有 `onClearGroup` 的非空分组生效；传数组仅指定分组生效）。 */
  clearableGroups?: boolean | ReadonlyArray<string>;
  /** 分组清空按钮文案，默认 `"清空"`。 */
  clearGroupLabel?: ReactNode;
  /** 自定义分组头右侧附加内容。 */
  renderGroupExtra?: (group: string) => ReactNode;
  /** 打开下拉面板时是否默认预高亮第一条可用项，默认 `true`。 */
  defaultActiveFirstOption?: boolean;
  /** 输入框前置图标（传 `true` 默认渲染 `"search"` 放大镜图标）。 */
  leadingIcon?: AfIconSlot | boolean;
  /** 自定义本地筛选规则，`false` 表示不做前端过滤。 */
  filterOption?: boolean | ((inputValue: string, option: AfAutoCompleteOption) => boolean);
  /** 尺寸，默认 `"md"`。 */
  size?: "sm" | "md" | "lg";
  /** 是否显示一键清除按钮。 */
  allowClear?: boolean;
  /** 校验失败态。 */
  invalid?: boolean;
  /** 无匹配项时的提示。 */
  emptyText?: ReactNode;
  /** 指定浮层挂载容器。 */
  container?: HTMLElement | null;
};

function normalizeOption(item: string | AfAutoCompleteOption): AfAutoCompleteOption {
  return typeof item === "string" ? { value: item, label: item } : item;
}

type IndexedAutoCompleteOption = {
  option: AfAutoCompleteOption;
  flatIdx: number;
};

type AutoCompleteGroupBucket = {
  group: string;
  items: IndexedAutoCompleteOption[];
};

/**
 * 自动补全输入：遵循 WAI-ARIA `combobox` + `listbox` 契约，支持 IME 防误触、90ms 滑动高亮、
 * 分组标题与历史清空、单条候选移除、前置图标及回车直提。
 */
export const AfAutoComplete = forwardRef<HTMLInputElement, AfAutoCompleteProps>(function AfAutoComplete(
  {
    options = [],
    value: valueProp,
    defaultValue = "",
    onChange,
    onSelect,
    onSearch,
    onSubmit,
    onRemoveOption,
    removableOptions,
    removable,
    onClearGroup,
    clearableGroups,
    clearGroupLabel = "清空",
    renderGroupExtra,
    defaultActiveFirstOption = true,
    leadingIcon,
    filterOption = true,
    size = "md",
    allowClear = false,
    invalid,
    disabled,
    emptyText,
    container,
    placeholder = "输入搜索或补全…",
    className,
    style,
    id: idProp,
    onFocus,
    onBlur,
    onKeyDown,
    ...rest
  } = {},
  forwardedRef,
) {
  const fieldCtx = useAfFormFieldControl();
  const listboxId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const ime = useImeEnterGuard();

  const [value, setValue] = useControllableState<string>({
    value: valueProp,
    defaultValue,
    onChange,
  });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => (defaultActiveFirstOption ? 0 : -1));

  const normalizedOptions = useMemo(() => options.map(normalizeOption), [options]);

  const filtered = useMemo(() => {
    if (filterOption === false) return normalizedOptions;
    const kw = value.trim().toLowerCase();
    if (!kw) return normalizedOptions;
    return normalizedOptions.filter((opt) => {
      if (typeof filterOption === "function") return filterOption(value, opt);
      const labelStr = typeof opt.label === "string" ? opt.label : opt.value;
      const groupStr = opt.group ?? "";
      return `${labelStr} ${opt.value} ${groupStr}`.toLowerCase().includes(kw);
    });
  }, [normalizedOptions, filterOption, value]);

  const groupedBuckets = useMemo<AutoCompleteGroupBucket[]>(() => {
    const hasGroups = filtered.some((opt) => Boolean(opt.group));
    if (!hasGroups) {
      return [
        {
          group: "",
          items: filtered.map((option, flatIdx) => ({ option, flatIdx })),
        },
      ];
    }
    const bucketMap = new Map<string, IndexedAutoCompleteOption[]>();
    const order: string[] = [];
    filtered.forEach((option, flatIdx) => {
      const key = option.group ?? "";
      let list = bucketMap.get(key);
      if (!list) {
        list = [];
        bucketMap.set(key, list);
        order.push(key);
      }
      list.push({ option, flatIdx });
    });
    return order.map((group) => ({ group, items: bucketMap.get(group)! }));
  }, [filtered]);

  const activeIndex =
    filtered.length > 0 && active >= 0 ? Math.min(active, filtered.length - 1) : -1;
  const thumb = useMenuHighlight(
    listRef,
    activeIndex,
    open && filtered.length > 0 && activeIndex >= 0,
    `${value}:${filtered.length}:${groupedBuckets.length}`,
  );

  const bad = Boolean(invalid || fieldCtx?.invalid);
  const resolvedId = idProp ?? fieldCtx?.controlId;

  const commitSelect = (option: AfAutoCompleteOption) => {
    if (option.disabled) return;
    setValue(option.value);
    onSelect?.(option.value, option);
    onSubmit?.(option.value);
    setOpen(false);
    inputRef.current?.focus({ preventScroll: true });
  };

  const canClearGroup = (groupName: string) => {
    if (!groupName || !onClearGroup) return false;
    if (clearableGroups === false) return false;
    if (clearableGroups === undefined || clearableGroups === true) return true;
    return clearableGroups.includes(groupName);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (ime.shouldBlockEnter(event)) return;
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      if (!filtered.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const enabledIndices = filtered.map((opt, i) => (!opt.disabled ? i : -1)).filter((i) => i >= 0);
      if (!enabledIndices.length) return;
      setActive((prev) => {
        const pos = enabledIndices.indexOf(prev);
        const nextPos = pos < 0 ? (step > 0 ? 0 : enabledIndices.length - 1) : (pos + step + enabledIndices.length) % enabledIndices.length;
        return enabledIndices[nextPos]!;
      });
    } else if (event.key === "Enter") {
      if (ime.shouldBlockEnter(event)) return;
      if (open && activeIndex >= 0 && filtered[activeIndex] && !filtered[activeIndex]!.disabled) {
        event.preventDefault();
        commitSelect(filtered[activeIndex]!);
      } else if (onSubmit) {
        event.preventDefault();
        onSubmit(value);
        setOpen(false);
      }
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  };

  const resolvedLeadingIcon =
    leadingIcon === true
      ? renderAfIconSlot("search", 14, "af-field__icon")
      : leadingIcon
        ? renderAfIconSlot(leadingIcon, 14, "af-field__icon")
        : null;

  return (
    <div ref={wrapRef} className={cn("af-autocomplete", className)} style={style}>
      <label
        className="af-field"
        style={{ width: "100%" }}
        data-size={size}
        data-invalid={bad || undefined}
        data-disabled={disabled || undefined}
      >
        {resolvedLeadingIcon}
        <input
          {...rest}
          ref={composeRefs(inputRef, forwardedRef)}
          id={resolvedId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          aria-invalid={bad ? true : "false"}
          aria-describedby={fieldCtx?.describedBy}
          disabled={disabled}
          className="af-field__input"
          placeholder={placeholder}
          value={value}
          onCompositionStart={ime.onCompositionStart}
          onCompositionEnd={ime.onCompositionEnd}
          onFocus={(event) => {
            onFocus?.(event);
            if (!disabled && (filtered.length > 0 || emptyText)) setOpen(true);
          }}
          onBlur={(event) => {
            onBlur?.(event);
          }}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            onSearch?.(next);
            setOpen(true);
            setActive(defaultActiveFirstOption ? 0 : -1);
          }}
        />
        {allowClear && value.length > 0 && !disabled ? (
          <button
            type="button"
            className="af-field__clear"
            aria-label="清除输入"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setValue("");
              onSearch?.("");
              setActive(defaultActiveFirstOption ? 0 : -1);
              inputRef.current?.focus();
            }}
          >
            <AfIcon name="x" size={11} />
          </button>
        ) : null}
      </label>
      <AfPopover
        id={listboxId}
        open={open && (filtered.length > 0 || Boolean(emptyText))}
        anchorRef={wrapRef}
        role="listbox"
        animateExit
        container={container}
        className="af-autocomplete__menu"
        matchAnchorWidth
        onPointerDownOutside={() => setOpen(false)}
      >
        <div ref={listRef} className="af-menu__list">
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
          {filtered.length > 0 ? (
            groupedBuckets.map((bucket, bucketIdx) => (
              <div
                key={bucket.group || `__ungrouped_${bucketIdx}`}
                className="af-autocomplete__group"
                role={bucket.group ? "group" : undefined}
                aria-label={bucket.group || undefined}
              >
                {bucket.group ? (
                  <div className="af-autocomplete__group-head">
                    <span className="af-autocomplete__group-title">{bucket.group}</span>
                    <span className="af-autocomplete__group-actions">
                      {renderGroupExtra?.(bucket.group)}
                      {canClearGroup(bucket.group) ? (
                        <button
                          type="button"
                          className="af-autocomplete__group-clear"
                          aria-label={`清空 ${bucket.group}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClearGroup?.(bucket.group);
                          }}
                        >
                          {clearGroupLabel}
                        </button>
                      ) : null}
                    </span>
                  </div>
                ) : null}
                {bucket.items.map(({ option, flatIdx }) => {
                  const showRemove = Boolean((option.removable ?? removableOptions ?? removable ?? false) && onRemoveOption && !option.disabled);
                  return (
                    <div
                      key={`${bucket.group}:${option.value}`}
                      id={`${listboxId}-opt-${flatIdx}`}
                      role="option"
                      aria-selected={option.value === value}
                      aria-disabled={option.disabled || undefined}
                      className="af-menu__item"
                      data-menu-index={flatIdx}
                      data-active={flatIdx === activeIndex || undefined}
                      data-selected={option.value === value || undefined}
                      data-disabled={option.disabled || undefined}
                      data-has-desc={option.description ? "true" : undefined}
                      onPointerMove={() => {
                        const nextIdx = option.disabled ? -1 : flatIdx;
                        if (active !== nextIdx) setActive(nextIdx);
                      }}
                      onMouseDown={(event) => {
                        // 阻止输入框在点击下拉选项时先失焦关闭浮层
                        event.preventDefault();
                      }}
                      onClick={() => commitSelect(option)}
                    >
                      <span className="af-menu__main">
                        {option.icon !== undefined && option.icon !== null ? (
                          <span className="af-autocomplete__opt-icon">
                            {renderAfIconSlot(option.icon, 14)}
                          </span>
                        ) : null}
                        <span className="af-menu__text">
                          <span className="af-menu__item-label">{option.label ?? option.value}</span>
                          {option.description ? <span className="af-menu__desc">{option.description}</span> : null}
                        </span>
                      </span>
                      <span className="af-autocomplete__opt-end">
                        {option.value === value ? <AfIcon name="check" size={14} className="af-menu__check" /> : null}
                        {showRemove ? (
                          <button
                            type="button"
                            className="af-autocomplete__opt-remove"
                            aria-label={`移除 ${typeof option.label === "string" ? option.label : option.value}`}
                            tabIndex={-1}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onRemoveOption?.(option.value, option);
                            }}
                          >
                            <AfIcon name="x" size={11} />
                          </button>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          ) : emptyText ? (
            <div className="af-select__empty">{emptyText}</div>
          ) : null}
        </div>
      </AfPopover>
    </div>
  );
});
