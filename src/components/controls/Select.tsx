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
import { cn, composeRefs, useControllableState, useFieldShake, useImeEnterGuard, useMenuHighlight } from "../../primitives";
import { AfSpinner } from "../display/Spinner";
import { AfPopover } from "../overlay/Popover";
import { useAfFormFieldControl } from "./FormField";

/** 下拉选项。 */
export type AfSelectOption = {
  /** 选项值。 */
  value: string;
  /** 主文字。 */
  label: string;
  /** 第二行说明。 */
  description?: string;
  /** 左侧图标：图标名或任意 ReactNode。 */
  icon?: AfIconName | ReactNode;
  /** 是否禁用。 */
  disabled?: boolean;
};

/** 下拉分组。 */
export type AfSelectGroup = {
  /** 分组标题。 */
  label: string;
  /** 分组内选项。 */
  options: AfSelectOption[];
};

/** 下拉选项或分组。 */
export type AfSelectItem = AfSelectOption | AfSelectGroup;

/** 自定义过滤：false 关闭本地过滤，或传入关键词与选项的判断函数。 */
export type AfSelectFilter = boolean | ((input: string, option: AfSelectOption) => boolean);

/** 下拉选择基础属性。 */
export type AfSelectBaseProps = {
  /** 选项列表，允许与分组混排。 */
  options: AfSelectItem[];
  /** 触发器前置图标（当选项自身未指定 `icon` 时在触发器左侧显示）。 */
  icon?: AfIconName | ReactNode;
  /** 无障碍名称（在 FormField 内使用时可省略）。 */
  label?: string;
  /** 原生无障碍名称（与 `label` 等效，`aria-label` 优先）。 */
  "aria-label"?: string;
  /** 关联外部标题元素 id。 */
  "aria-labelledby"?: string;
  /** 关联外部说明元素 id。 */
  "aria-describedby"?: string;
  /** 触发器原生悬浮提示。 */
  title?: string;
  /** 可选顶部可见字段标题（不影响既有仅传 `label` 作为 `aria-label` 的用法）。 */
  fieldLabel?: ReactNode;
  /** 可选标记（配合 `fieldLabel` 显示 `"可选"` 或自定义文案）。 */
  optional?: boolean | ReactNode;
  /** 底部辅助说明文案。 */
  hint?: ReactNode;
  /** 底部错误提示文案（非空时自动进入错误态并触发轻微抖动）。 */
  error?: ReactNode;
  /** 原生表单字段名（自动渲染隐藏提交项）。 */
  name?: string;
  /** 空值提示。 */
  placeholder?: string;
  /** 触发器最小宽度。 */
  width?: number | string;
  /** 高度，与 AfInput 一致：xs 24px，sm 28px，md 32px，lg 36px。 */
  size?: "xs" | "sm" | "md" | "lg";
  /** 是否禁用：整体降到 50%。 */
  disabled?: boolean;
  /** 是否启用框内搜索。 */
  searchable?: boolean;
  /** `searchable` 兼容别名。 */
  showSearch?: boolean;
  /** 受控搜索词；用于远程搜索。 */
  searchValue?: string;
  /** 搜索词变化回调。 */
  onSearch?: (value: string) => void;
  /** 自定义本地过滤函数；false 表示由外部过滤。 */
  filterOption?: AfSelectFilter;
  /** 允许根据输入关键词动态创建新选项（自动开启搜索）。 */
  creatable?: boolean;
  /** 创建新选项回调；可返回自定义选项对象。 */
  onCreateOption?: (inputValue: string) => AfSelectOption | void;
  /** 自定义菜单选项渲染（`renderOption` 与 `optionRender` 同义）。 */
  renderOption?: (option: AfSelectOption, state: { selected: boolean; active: boolean }) => ReactNode;
  /** `renderOption` 历史宿主迁移兼容别名。 */
  optionRender?: (option: AfSelectOption, state: { selected: boolean; active: boolean }) => ReactNode;
  /** 选项行右侧附加信息渲染（如快捷标签徽章）。 */
  optionExtraRender?: (option: AfSelectOption) => ReactNode;
  /** 按选项动态计算禁用态（历史宿主迁移兼容属性）。 */
  getOptionDisabled?: (option: AfSelectOption) => boolean;
  /** 自定义单选触发器展示内容。 */
  renderValue?: (option: AfSelectOption) => ReactNode;
  /** `renderValue` 兼容别名。 */
  selectedRender?: (option: AfSelectOption) => ReactNode;
  /** 是否显示清除按钮。 */
  clearable?: boolean;
  /** `clearable` 历史宿主迁移兼容别名。 */
  allowClear?: boolean;
  /** 清除回调。 */
  onClear?: () => void;
  /** 错误态。 */
  invalid?: boolean;
  /** 加载态。 */
  loading?: boolean;
  /** 无匹配项时的内容。 */
  emptyText?: ReactNode;
  /** `emptyText` 兼容别名。 */
  emptyContent?: ReactNode;
  /** 下拉面板附加类名。 */
  popupClassName?: string;
  /** `popupClassName` 兼容别名。 */
  dropdownClassName?: string;
  /** 下拉面板附加内联样式。 */
  popupStyle?: CSSProperties;
  /** 下拉列表最大滚动高度（px）。 */
  listHeight?: number;
  /** 受控浮层开合状态。 */
  open?: boolean;
  /** 非受控初始浮层开合状态。 */
  defaultOpen?: boolean;
  /** 菜单开合回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 控件 id。 */
  id?: string;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
  /** 可选指定浮层挂载容器。 */
  container?: HTMLElement | null;
};

/** 单选下拉属性。 */
export type AfSelectSingleProps = AfSelectBaseProps & {
  multiple?: false;
  /** 受控当前值。 */
  value?: string;
  /** 非受控初始值。 */
  defaultValue?: string;
  /** 变化回调。 */
  onChange?: (value: string) => void;
  /** `onChange` 的同义回调（affectUI API 兼容）。 */
  onValueChange?: (value: string) => void;
};

/** 多选下拉属性。 */
export type AfSelectMultipleProps = AfSelectBaseProps & {
  multiple: true;
  /** 受控当前已选数组。 */
  value?: string[];
  /** 非受控初始已选数组。 */
  defaultValue?: string[];
  /** 变化回调。 */
  onChange?: (value: string[]) => void;
  /** `onChange` 的同义回调（affectUI API 兼容）。 */
  onValueChange?: (value: string[]) => void;
  /** 触发器最多展示多少个已选标签，其余折叠为 +N。 */
  maxTagCount?: number;
  /** 多选最多可选数量上限（历史宿主迁移兼容属性）。 */
  maxCount?: number;
};

/** 下拉选择属性。 */
export type AfSelectProps = AfSelectSingleProps | AfSelectMultipleProps;

export type AfSelectComponent = {
  (props: AfSelectSingleProps & RefAttributes<HTMLDivElement>): ReactElement | null;
  (props: AfSelectMultipleProps & RefAttributes<HTMLDivElement>): ReactElement | null;
  displayName?: string;
};

/** 判断下拉项是否为分组。 */
export function isSelectGroup(item: AfSelectItem): item is AfSelectGroup {
  return Array.isArray((item as AfSelectGroup).options);
}

function renderOptionIcon(icon: AfIconName | ReactNode | undefined, size = 14) {
  if (!icon) return null;
  return (
    <span className="af-menu__icon-slot" aria-hidden="true">
      {typeof icon === "string" ? (
        <AfIcon name={icon as AfIconName} size={size} className="af-menu__icon" />
      ) : (
        <span className="af-menu__icon">{icon}</span>
      )}
    </span>
  );
}

function AfSelectInner(props: AfSelectProps, forwardedRef: Ref<HTMLDivElement>) {
  const {
    options,
    icon,
    label,
    "aria-label": ariaLabelProp,
    "aria-labelledby": ariaLabelledByProp,
    "aria-describedby": ariaDescribedByProp,
    title: titleProp,
    fieldLabel,
    optional,
    hint,
    error,
    name,
    placeholder = "Select…",
    width = 160,
    size = "md",
    disabled: disabledProp,
    searchable,
    showSearch,
    searchValue,
    onSearch,
    filterOption,
    creatable,
    onCreateOption,
    renderOption,
    optionRender,
    optionExtraRender,
    getOptionDisabled,
    renderValue: customRenderValueProp,
    selectedRender,
    clearable,
    allowClear,
    invalid,
    loading,
    emptyText = "No matches",
    emptyContent,
    popupClassName,
    dropdownClassName,
    popupStyle,
    listHeight,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    id: idProp,
    className,
    style,
    container,
  } = props;
  const fieldCtx = useAfFormFieldControl();
  const listboxId = useId();
  const hintId = `${listboxId}-hint`;
  const errorId = `${listboxId}-err`;
  const resolvedId = idProp ?? fieldCtx?.controlId ?? (fieldLabel ? `${listboxId}-trigger` : undefined);
  const disabled = Boolean(disabledProp || fieldCtx?.disabled);
  const hasError = error !== undefined && error !== null && error !== "";
  const bad = Boolean(invalid || hasError || fieldCtx?.invalid);
  const shake = useFieldShake(bad);
  const resolvedDescribedBy =
    [ariaDescribedByProp, fieldCtx?.describedBy, hint && !hasError ? hintId : undefined, hasError ? errorId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  const multiple = props.multiple === true;
  const isSearchable = Boolean(searchable || showSearch || creatable);
  const maxTagCount = multiple ? (props as AfSelectMultipleProps).maxTagCount : undefined;
  const maxCount = multiple ? (props as AfSelectMultipleProps).maxCount : undefined;
  const customRenderOption = renderOption ?? optionRender;
  const customRenderValue = customRenderValueProp ?? selectedRender;
  const effectiveEmptyText = emptyContent ?? emptyText;
  const effectiveAriaLabel = ariaLabelProp ?? label ?? (typeof fieldLabel === "string" ? fieldLabel : undefined);
  const showClear = clearable ?? allowClear;

  const [singleValue, setSingleValue] = useControllableState<string>({
    value: !multiple ? props.value : undefined,
    defaultValue: !multiple ? (props.defaultValue ?? "") : "",
    onChange: !multiple
      ? (next) => {
          props.onChange?.(next);
          props.onValueChange?.(next);
        }
      : undefined,
  });
  const [multiValue, setMultiValue] = useControllableState<string[]>({
    value: multiple ? props.value : undefined,
    defaultValue: multiple ? (props.defaultValue ?? []) : [],
    onChange: multiple
      ? (next) => {
          props.onChange?.(next);
          props.onValueChange?.(next);
        }
      : undefined,
  });
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [createdOptions, setCreatedOptions] = useState<AfSelectOption[]>([]);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");

  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typeaheadRef = useRef<{ buffer: string; timer: number | null }>({ buffer: "", timer: null });
  const ime = useImeEnterGuard();

  useEffect(
    () => () => {
      if (typeaheadRef.current.timer !== null) window.clearTimeout(typeaheadRef.current.timer);
    },
    [],
  );

  const selectedValues = useMemo(
    () => (multiple ? multiValue : singleValue ? [singleValue] : []),
    [multiple, multiValue, singleValue],
  );
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  const baseAllOptions = useMemo(
    () => options.flatMap((item) => (isSelectGroup(item) ? item.options : [item])),
    [options],
  );
  const allOptions = useMemo(() => {
    if (!createdOptions.length) return baseAllOptions;
    const existing = new Set(baseAllOptions.map((item) => item.value));
    return [...baseAllOptions, ...createdOptions.filter((item) => !existing.has(item.value))];
  }, [baseAllOptions, createdOptions]);

  const mergedItems = useMemo<AfSelectItem[]>(() => {
    const existing = new Set(baseAllOptions.map((item) => item.value));
    const extras = createdOptions.filter((item) => !existing.has(item.value));
    return extras.length ? [...options, ...extras] : options;
  }, [options, baseAllOptions, createdOptions]);

  const queryValue = searchValue !== undefined ? searchValue : query;

  const filteredGroups = useMemo<AfSelectItem[]>(() => {
    const keyword = queryValue.trim().toLowerCase();
    const localFilter = filterOption !== false && searchValue === undefined;
    const matches = (option: AfSelectOption) => {
      if (!localFilter || !keyword) return true;
      if (typeof filterOption === "function") return filterOption(queryValue, option);
      return `${option.label} ${option.description ?? ""} ${option.value}`.toLowerCase().includes(keyword);
    };
    const result: AfSelectItem[] = [];
    mergedItems.forEach((item) => {
      if (isSelectGroup(item)) {
        const groupOptions = item.options.filter(matches);
        if (groupOptions.length) result.push({ ...item, options: groupOptions });
      } else if (matches(item)) {
        result.push(item);
      }
    });
    return result;
  }, [mergedItems, queryValue, searchValue, filterOption]);

  const trimmedQuery = queryValue.trim();
  const canCreate =
    Boolean(creatable && trimmedQuery) &&
    !allOptions.some(
      (opt) => opt.label.toLowerCase() === trimmedQuery.toLowerCase() || opt.value.toLowerCase() === trimmedQuery.toLowerCase(),
    );

  const createDraftOption: AfSelectOption | null = canCreate
    ? { value: `__create__:${trimmedQuery}`, label: trimmedQuery }
    : null;

  const filtered = useMemo(() => {
    const base = filteredGroups.flatMap((item) => (isSelectGroup(item) ? item.options : [item]));
    return createDraftOption ? [...base, createDraftOption] : base;
  }, [filteredGroups, createDraftOption]);

  const current = multiple ? undefined : allOptions.find((option) => option.value === singleValue);
  const selectedOptions = useMemo(
    () => allOptions.filter((option) => selectedSet.has(option.value)),
    [allOptions, selectedSet],
  );
  const activeIndex = filtered.length ? Math.min(active, filtered.length - 1) : -1;
  const thumb = useMenuHighlight(listRef, activeIndex, open && !loading, `${queryValue}:${filtered.length}`);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const list = listRef.current;
    if (!list) return;
    const row = list.querySelector<HTMLElement>(`[data-menu-index="${activeIndex}"]`);
    if (!row) return;
    let top = 0;
    let node: HTMLElement | null = row;
    while (node && node !== list) {
      top += node.offsetTop;
      const parent = node.offsetParent as HTMLElement | null;
      if (!parent || !list.contains(parent)) {
        top = row.offsetTop - list.offsetTop;
        break;
      }
      node = parent;
    }
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) {
      list.scrollTop = top;
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [open, activeIndex]);

  const closeMenu = (viaPointer = false) => {
    setOpen(false);
    if (searchValue === undefined) setQuery("");
    const trigger = triggerRef.current;
    if (!trigger) return;
    const suppressVisible = viaPointer || trigger.dataset.pointerFocus === "true";
    try {
      (trigger as HTMLElement & { focus: (opts?: FocusOptions & { focusVisible?: boolean }) => void }).focus({
        preventScroll: true,
        focusVisible: !suppressVisible,
      });
    } catch {
      trigger.focus({ preventScroll: true });
    }
  };

  const openMenu = () => {
    setActive(Math.max(0, filtered.findIndex((option) => selectedSet.has(option.value))));
    if (searchValue === undefined) setQuery("");
    setOpen(true);
    if (isSearchable) requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  const changeQuery = (next: string) => {
    if (searchValue === undefined) setQuery(next);
    onSearch?.(next);
    setActive(0);
  };

  const commitCreatedOption = (rawText: string, viaPointer = false) => {
    const created = onCreateOption?.(rawText) ?? { value: rawText, label: rawText };
    setCreatedOptions((prev) => (prev.some((item) => item.value === created.value) ? prev : [...prev, created]));
    if (multiple) {
      setMultiValue(selectedSet.has(created.value) ? multiValue : [...multiValue, created.value]);
      changeQuery("");
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    } else {
      setSingleValue(created.value);
      closeMenu(viaPointer);
    }
  };

  const isOptionDisabled = (option: AfSelectOption) =>
    Boolean(
      option.disabled ||
        getOptionDisabled?.(option) ||
        (multiple && maxCount !== undefined && multiValue.length >= maxCount && !selectedSet.has(option.value)),
    );

  const choose = (option: AfSelectOption, viaPointer = false) => {
    if (isOptionDisabled(option)) return;
    if (createDraftOption && option.value === createDraftOption.value) {
      commitCreatedOption(option.label, viaPointer);
      return;
    }
    if (multiple) {
      const next = selectedSet.has(option.value)
        ? multiValue.filter((val) => val !== option.value)
        : maxCount !== undefined && multiValue.length >= maxCount
          ? multiValue
          : [...multiValue, option.value];
      setMultiValue(next);
      changeQuery("");
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    } else {
      setSingleValue(option.value);
      closeMenu(viaPointer);
    }
  };

  const removeTag = (val: string) => {
    if (!multiple) return;
    setMultiValue(multiValue.filter((item) => item !== val));
    requestAnimationFrame(() => (open && isSearchable ? inputRef.current : triggerRef.current)?.focus({ preventScroll: true }));
  };

  const clear = () => {
    props.onClear?.();
    if (multiple) setMultiValue([]);
    else setSingleValue("");
    triggerRef.current?.focus({ preventScroll: true });
  };

  const handleTypeahead = (char: string) => {
    const state = typeaheadRef.current;
    state.buffer = `${state.buffer}${char.toLowerCase()}`;
    if (state.timer !== null) window.clearTimeout(state.timer);
    state.timer = window.setTimeout(() => {
      state.buffer = "";
      state.timer = null;
    }, 500);

    const pool = open ? filtered : allOptions;
    const matchIndex = pool.findIndex(
      (opt) => !opt.disabled && opt.label.toLowerCase().startsWith(state.buffer),
    );
    const resolvedIndex =
      matchIndex >= 0
        ? matchIndex
        : pool.findIndex((opt) => !opt.disabled && opt.label.toLowerCase().includes(state.buffer));
    if (resolvedIndex < 0) return;

    if (open) {
      setActive(resolvedIndex);
    } else if (!multiple) {
      setSingleValue(pool[resolvedIndex].value);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ")) {
      if (ime.shouldBlockEnter(event)) return;
      event.preventDefault();
      openMenu();
      return;
    }
    if ((!isSearchable || !open) && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      handleTypeahead(event.key);
      return;
    }
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (ime.shouldBlockEnter(event)) return;
      event.preventDefault();
      if (!filtered.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const isCreateVal = (opt: AfSelectOption) => Boolean(createDraftOption && opt.value === createDraftOption.value);
      const enabledIndices = filtered
        .map((opt, idx) => (isCreateVal(opt) || !isOptionDisabled(opt) ? idx : -1))
        .filter((idx) => idx >= 0);
      if (!enabledIndices.length) return;
      const pos = enabledIndices.indexOf(activeIndex);
      const nextPos = pos < 0 ? (step > 0 ? 0 : enabledIndices.length - 1) : (pos + step + enabledIndices.length) % enabledIndices.length;
      setActive(enabledIndices[nextPos]);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : Math.max(0, filtered.length - 1));
    } else if (event.key === "Enter") {
      if (ime.shouldBlockEnter(event)) return;
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) choose(option, false);
    } else if (event.key === "Backspace" && multiple && queryValue === "") {
      event.preventDefault();
      const last = selectedValues[selectedValues.length - 1];
      if (last) removeTag(last);
    }
  };

  const visibleTags = maxTagCount !== undefined ? selectedOptions.slice(0, Math.max(0, maxTagCount)) : selectedOptions;
  const hiddenTagCount = selectedOptions.length - visibleTags.length;
  const hasValue = multiple ? selectedOptions.length > 0 : Boolean(current);
  const displayPlaceholder = multiple ? selectedOptions.length === 0 : !current;
  const showSearchInput = isSearchable && open;

  const renderMenuItem = (option: AfSelectOption) => {
    const index = filtered.indexOf(option);
    const isCreateItem = Boolean(createDraftOption && option.value === createDraftOption.value);
    const isSelected = !isCreateItem && selectedSet.has(option.value);
    const isActive = index === activeIndex;
    const optionDisabled = !isCreateItem && isOptionDisabled(option);
    return (
      <div
        key={option.value}
        role="option"
        aria-selected={isSelected}
        aria-disabled={optionDisabled || undefined}
        className="af-menu__item"
        data-menu-index={index}
        data-active={isActive || undefined}
        data-selected={isSelected || undefined}
        data-disabled={optionDisabled || undefined}
        data-has-desc={!isCreateItem && option.description ? "true" : undefined}
        onPointerMove={() => {
          const nextIdx = optionDisabled ? -1 : index;
          if (active !== nextIdx) setActive(nextIdx);
        }}
        onClick={() => choose(option, true)}
      >
        {isCreateItem ? (
          <span className="af-menu__main">
            <span className="af-menu__icon-slot" aria-hidden="true">
              <AfIcon name="plus" size={14} className="af-menu__icon" />
            </span>
            <span className="af-menu__item-label">Create “{option.label}”</span>
          </span>
        ) : customRenderOption ? (
          customRenderOption(option, { selected: isSelected, active: isActive })
        ) : (
          <>
            <span className="af-menu__main">
              {renderOptionIcon(option.icon)}
              <span className="af-menu__text">
                <span className="af-menu__item-label">{option.label}</span>
                {option.description ? <span className="af-menu__desc">{option.description}</span> : null}
              </span>
            </span>
            {optionExtraRender ? optionExtraRender(option) : null}
            {isSelected ? (
              <svg
                className="af-icon af-menu__check"
                width={14}
                height={14}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path pathLength={1} d="M3.5 8.5 6.5 11.5 12.5 4.5" />
              </svg>
            ) : null}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn("af-select", className)}
      onKeyDown={onKeyDown}
      style={{ minWidth: width, width: multiple || isSearchable ? width : undefined, ...style }}
    >
      {name && !disabled
        ? multiple
          ? selectedValues.map((val) => <input key={val} type="hidden" name={name} value={val} />)
          : <input type="hidden" name={name} value={singleValue} />
        : null}
      {fieldLabel ? (
        <div className="af-select__head">
          <span
            className="af-select__label"
            onClick={() => {
              if (!disabled) triggerRef.current?.focus();
            }}
          >
            {fieldLabel}
          </span>
          {optional ? <span className="af-select__optional">{optional === true ? "Optional" : optional}</span> : null}
        </div>
      ) : null}
      <div
        ref={composeRefs(triggerRef, forwardedRef)}
        id={resolvedId}
        className="af-select__trigger"
        data-size={size}
        data-open={open || undefined}
        data-invalid={bad || undefined}
        data-shake={shake || undefined}
        data-disabled={disabled || undefined}
        data-multiple={multiple || undefined}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={effectiveAriaLabel}
        aria-labelledby={ariaLabelledByProp}
        aria-describedby={resolvedDescribedBy}
        aria-invalid={bad ? true : "false"}
        aria-required={fieldCtx?.required || undefined}
        aria-multiselectable={multiple || undefined}
        title={titleProp}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onPointerDown={(event) => {
          event.currentTarget.dataset.pointerFocus = "true";
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            delete event.currentTarget.dataset.pointerFocus;
          }
        }}
        onClick={() => {
          if (disabled) return;
          if (!open) openMenu();
          else closeMenu(true);
        }}
      >
        <span className="af-select__content">
          {multiple ? (
            <>
              {visibleTags.map((option) => (
                <span className="af-select__tag" key={option.value} data-disabled={option.disabled || undefined}>
                  <span className="af-select__tag-label" title={option.label}>
                    {option.label}
                  </span>
                  {!disabled ? (
                    <button
                      type="button"
                      className="af-select__tag-remove"
                      aria-label={`Remove ${option.label}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeTag(option.value);
                      }}
                    >
                      <AfIcon name="x" size={10} />
                    </button>
                  ) : null}
                </span>
              ))}
              {hiddenTagCount > 0 ? <span className="af-select__tag af-select__tag--more">+{hiddenTagCount}</span> : null}
              {showSearchInput ? (
                <input
                  ref={inputRef}
                  className="af-select__input"
                  value={queryValue}
                  placeholder={selectedOptions.length ? "Search…" : placeholder}
                  aria-label={`${label ?? "Options"}, search`}
                  onCompositionStart={ime.onCompositionStart}
                  onCompositionEnd={ime.onCompositionEnd}
                  onChange={(event) => changeQuery(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                />
              ) : displayPlaceholder ? (
                <span className="af-select__value" data-placeholder>
                  {placeholder}
                </span>
              ) : null}
            </>
          ) : showSearchInput ? (
            (current?.icon ?? icon) ? (
              <span className="af-select__value-with-icon" style={{ flex: 1, minWidth: 0 }}>
                {renderOptionIcon(current?.icon ?? icon, 14)}
                <input
                  ref={inputRef}
                  className="af-select__input"
                  value={queryValue}
                  placeholder={current?.label ?? placeholder}
                  aria-label={`${label ?? "Options"}, search`}
                  onCompositionStart={ime.onCompositionStart}
                  onCompositionEnd={ime.onCompositionEnd}
                  onChange={(event) => changeQuery(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                />
              </span>
            ) : (
              <input
                ref={inputRef}
                className="af-select__input"
                value={queryValue}
                placeholder={current?.label ?? placeholder}
                aria-label={`${label ?? "Options"}, search`}
                onCompositionStart={ime.onCompositionStart}
                onCompositionEnd={ime.onCompositionEnd}
                onChange={(event) => changeQuery(event.target.value)}
                onClick={(event) => event.stopPropagation()}
              />
            )
          ) : (
            <span className="af-select__value" data-placeholder={displayPlaceholder || undefined}>
              {current ? (
                customRenderValue ? (
                  customRenderValue(current)
                ) : current.icon ?? icon ? (
                  <span className="af-select__value-with-icon">
                    {renderOptionIcon(current.icon ?? icon, 14)}
                    <span>{current.label}</span>
                  </span>
                ) : (
                  current.label
                )
              ) : icon ? (
                <span className="af-select__value-with-icon">
                  {renderOptionIcon(icon, 14)}
                  <span>{placeholder}</span>
                </span>
              ) : (
                placeholder
              )}
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
              clear();
            }}
          >
            <AfIcon name="x" size={11} />
          </button>
        ) : null}
        <AfIcon name="chevronDown" size={14} className="af-select__chevron" />
      </div>
      <AfPopover
        id={listboxId}
        open={open}
        anchorRef={triggerRef}
        role="listbox"
        label={effectiveAriaLabel ?? "Options"}
        container={container}
        className={cn("af-select__menu", popupClassName, dropdownClassName)}
        style={popupStyle}
        matchAnchorWidth
        onKeyDown={onKeyDown}
        onPointerDownOutside={() => {
          setOpen(false);
          if (searchValue === undefined) setQuery("");
        }}
      >
        <div className="af-menu__list" ref={listRef} style={listHeight ? { maxHeight: listHeight } : undefined}>
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
          {loading ? (
            <div className="af-select__empty">
              <AfSpinner size={14} />
              Loading…
            </div>
          ) : filtered.length ? (
            <>
              {filteredGroups.map((item, groupIndex) =>
                isSelectGroup(item) ? (
                  <div className="af-select__group" key={`${item.label}-${groupIndex}`}>
                    <div className="af-select__group-label">{item.label}</div>
                    {item.options.map(renderMenuItem)}
                  </div>
                ) : (
                  renderMenuItem(item)
                ),
              )}
              {createDraftOption ? renderMenuItem(createDraftOption) : null}
            </>
          ) : (
            <div className="af-select__empty">{effectiveEmptyText}</div>
          )}
        </div>
      </AfPopover>
      {hint && !hasError ? (
        <div id={hintId} className="af-select__hint">
          {hint}
        </div>
      ) : null}
      {hasError ? (
        <div id={errorId} className="af-select__error" role="alert" aria-live="polite">
          {error}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 下拉选择器：支持受控/非受控、单选/多选、框内 IME 安全搜索、键盘快速定位、动态创建选项、分组与清除，
 * 弹出菜单搭载 affectUI 标志性的 90ms 浮动底块高亮与视口自动翻转。
 */
export const AfSelect = forwardRef(AfSelectInner) as AfSelectComponent;
AfSelect.displayName = "AfSelect";
