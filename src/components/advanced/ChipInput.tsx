import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import { isImeComposing, useControllableState, useImeEnterGuard } from "../../primitives";

export interface AfChipInputProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** 受控标签数组（与 values 互为别名）。 */
  value?: string[];
  /** 向后兼容受控标签数组别名（如 AfStepperTags）。 */
  values?: string[];
  /** 非受控初始标签数组（与 defaultValues 互为别名）。 */
  defaultValue?: string[];
  defaultValues?: string[];
  /** 标签集合变化回调。 */
  onChange?: (next: string[]) => void;
  /** 输入占位符（已有标签时隐藏，保持行尾清爽）。 */
  placeholder?: string;
  /** 最大标签数量（maxTags 的标准简写；设置后右上角渲染等宽 count/max）。 */
  max?: number;
  /** 最大标签数量（向后兼容别名）。 */
  maxTags?: number;
  /** 分隔字符列表（默认支持逗号、中文逗号与分号）。 */
  separators?: string[];
  /** 是否在输入空格时自动分词成签（适合邮箱/账号列表）。 */
  splitOnSpace?: boolean;
  /** 是否允许重复标签（默认 false：重复输入时原地闪烁已有胶囊并保留草稿）。 */
  allowDuplicates?: boolean;
  /** 入库前归一化函数（如转小写或去前缀）。 */
  normalize?: (tag: string) => string;
  /** 校验单个候选标签：返回 true 通过，返回字符串作为底部校验提示并保留输入内容。 */
  validate?: (tag: string) => true | string;
  /** 在每个胶囊左侧展示 18px 确定性色相圆头像（适合收件人/协作者输入）。 */
  avatar?: boolean;
  /** 禁用态。 */
  disabled?: boolean;
  /** 原生表单序列化字段名。 */
  name?: string;
  /** 字段标题（与 hint / error / optional / max / showLabel 组合时渲染顶部标题栏，否则仅作 aria-label）。 */
  label?: ReactNode;
  /** 显式要求渲染可见顶栏 label（默认：传入 optional / hint / error / max 时自动显示）。 */
  showLabel?: boolean;
  /** 标题旁的可选标记（true 默认显示 "optional"）。 */
  optional?: boolean | string;
  /** 底部静态辅助说明（有校验错误时自动让位于错误文案）。 */
  hint?: ReactNode;
  /** 外部受控错误文案。 */
  error?: ReactNode;
  /** 输入框 id。 */
  id?: string;
}

/**
 * 标签胶囊输入框（对齐 affectUI TagInput & ChipInput）：
 * - 支持 Enter / Tab / 逗号（可选空格）切分成章，批量粘贴（逗号/分号/换行/Tab，支持 "Name <mail>" 提取）；
 * - 重复项触发已有胶囊 700ms 柔和闪烁提示；校验失败在底部展示内联反馈而不丢弃草稿；
 * - 支持键盘 ←/→ 在胶囊间漫游聚焦（清晰焦点环）、Backspace/Delete 移除并平滑衔接到邻近胶囊或输入框。
 */
export function AfChipInput({
  value,
  values,
  defaultValue,
  defaultValues = [],
  onChange,
  placeholder = "Add a tag…",
  max,
  maxTags,
  separators = [",", "，", ";"],
  splitOnSpace = false,
  allowDuplicates = false,
  normalize,
  validate,
  avatar = false,
  disabled = false,
  name,
  label,
  showLabel = false,
  optional,
  hint,
  error,
  id: idProp,
  className,
  "aria-label": ariaLabelProp,
  ...props
}: AfChipInputProps) {
  const reactId = useId();
  const inputId = idProp ?? `af-tag-in-${reactId}`;
  const footId = `af-tag-foot-${reactId}`;

  const [tags, setTags] = useControllableState<string[]>({
    value: value !== undefined ? value : values,
    defaultValue: defaultValue !== undefined ? defaultValue : defaultValues,
    onChange,
  });

  const [draft, setDraft] = useState("");
  const [armedIndex, setArmedIndex] = useState<number | null>(null);
  const [focusedChip, setFocusedChip] = useState<number | null>(null);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const chipRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const flashTimerRef = useRef<number | null>(null);
  const ime = useImeEnterGuard();

  const limit = max ?? maxTags;
  const atMax = limit !== undefined && tags.length >= limit;

  useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    };
  }, []);

  const triggerFlash = (idx: number) => {
    setFlashIndex(idx);
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => {
      setFlashIndex(null);
      flashTimerRef.current = null;
    }, 700);
  };

  const extractToken = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    // 兼容粘贴形如 "Maya Lin <maya@acme.com>" 的通讯录条目
    const angleMatch = /^.+<([^<>@\s]+@[^<>@\s]+)>$/.exec(trimmed);
    const base = angleMatch ? angleMatch[1].trim() : trimmed;
    return normalize ? normalize(base) : base;
  };

  /** 提交一批候选词：返回未能入库的残余文本（若有校验错误则保留供用户修正）。 */
  const commitTokens = (candidates: string[]): { leftover: string; committed: number } => {
    const cleaned = candidates.map(extractToken).filter(Boolean);
    if (cleaned.length === 0) return { leftover: "", committed: 0 };

    const next = [...tags];
    const rejected: string[] = [];
    let firstError: string | null = null;
    let addedCount = 0;
    let lastAdded = "";

    for (const candidate of cleaned) {
      if (limit !== undefined && next.length >= limit) {
        firstError ??= `Maximum of ${limit} reached.`;
        rejected.push(candidate);
        continue;
      }

      if (!allowDuplicates) {
        const dupIdx = next.findIndex((existing) => existing.toLowerCase() === candidate.toLowerCase());
        if (dupIdx !== -1) {
          if (dupIdx < tags.length) triggerFlash(dupIdx);
          setLiveAnnouncement(`${candidate} already added`);
          continue;
        }
      }

      if (validate) {
        const verdict = validate(candidate);
        if (verdict !== true) {
          firstError ??= verdict;
          rejected.push(candidate);
          continue;
        }
      }

      next.push(candidate);
      addedCount += 1;
      lastAdded = candidate;
    }

    if (addedCount > 0) {
      setTags(next);
      setArmedIndex(null);
      setLiveAnnouncement(addedCount === 1 ? `Added ${lastAdded}` : `Added ${addedCount} items`);
    }
    setProblem(firstError);
    return { leftover: rejected.join(", "), committed: addedCount };
  };

  const commitDraft = (): boolean => {
    if (!draft.trim()) {
      setDraft("");
      return false;
    }
    const { leftover, committed } = commitTokens([draft]);
    setDraft(leftover);
    return committed > 0 && !leftover;
  };

  const removeAt = (idx: number, moveFocus?: "adjacent" | "input") => {
    if (disabled || idx < 0 || idx >= tags.length) return;
    const removed = tags[idx];
    const next = tags.filter((_, i) => i !== idx);
    setTags(next);
    setArmedIndex(null);
    setProblem(null);
    setLiveAnnouncement(`Removed ${removed}`);

    if (moveFocus === "adjacent") {
      window.requestAnimationFrame(() => {
        if (next.length === 0) {
          setFocusedChip(null);
          inputRef.current?.focus();
        } else {
          const target = Math.min(idx, next.length - 1);
          setFocusedChip(target);
          chipRefs.current[target]?.focus();
        }
      });
    } else if (moveFocus === "input") {
      setFocusedChip(null);
      inputRef.current?.focus();
    }
  };

  const focusChipAt = (idx: number) => {
    if (idx < 0 || idx >= tags.length) return;
    setFocusedChip(idx);
    setArmedIndex(null);
    chipRefs.current[idx]?.focus();
  };

  const activeSeps = splitOnSpace ? [...separators, " "] : separators;

  const handleInputChange = (raw: string) => {
    setArmedIndex(null);
    if (problem) setProblem(null);

    const hitSep = activeSeps.some((sep) => raw.includes(sep));
    if (!hitSep) {
      setDraft(raw);
      return;
    }

    const escaped = activeSeps.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const parts = raw.split(new RegExp(`(?:${escaped})+`));
    const trailing = parts.pop() ?? "";
    const { leftover } = commitTokens(parts);
    setDraft(leftover ? (trailing ? `${leftover}, ${trailing}` : leftover) : trailing);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (ime.shouldBlockEnter(event) || isImeComposing(event)) return;

    if (event.key === "Enter") {
      if (draft.trim()) {
        event.preventDefault();
        commitDraft();
      }
      return;
    }

    if (event.key === "Tab" && !event.shiftKey && draft.trim()) {
      event.preventDefault();
      commitDraft();
      return;
    }

    if (activeSeps.includes(event.key)) {
      event.preventDefault();
      commitDraft();
      return;
    }

    if (event.key === "Escape") {
      if (draft || problem || armedIndex !== null) {
        event.preventDefault();
        setDraft("");
        setProblem(null);
        setArmedIndex(null);
      }
      return;
    }

    const atStart =
      (event.currentTarget.selectionStart ?? 0) === 0 &&
      (event.currentTarget.selectionEnd ?? 0) === 0;

    if (event.key === "ArrowLeft" && atStart && !draft && tags.length > 0) {
      event.preventDefault();
      focusChipAt(tags.length - 1);
      return;
    }

    if (event.key === "Backspace" && atStart && !draft && tags.length > 0) {
      event.preventDefault();
      if (armedIndex === tags.length - 1) {
        removeAt(tags.length - 1, "input");
      } else {
        setArmedIndex(tags.length - 1);
      }
      return;
    }

    if (armedIndex !== null) setArmedIndex(null);
  };

  const handleChipKeyDown = (event: KeyboardEvent<HTMLSpanElement>, idx: number) => {
    if (disabled) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (idx > 0) focusChipAt(idx - 1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (idx < tags.length - 1) {
        focusChipAt(idx + 1);
      } else {
        setFocusedChip(null);
        inputRef.current?.focus();
      }
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusChipAt(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setFocusedChip(null);
      inputRef.current?.focus();
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      removeAt(idx, "adjacent");
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setFocusedChip(null);
      inputRef.current?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    const splitRe = splitOnSpace ? /[\n\r,;，；\t\s]+/ : /[\n\r,;，；\t]+/;
    if (!splitRe.test(pasted)) return;
    const parts = pasted.split(splitRe).map((s) => s.trim()).filter(Boolean);
    if (parts.length <= 1 && !/[\n\r,;，；\t]/.test(pasted)) return;
    event.preventDefault();
    const { leftover } = commitTokens(parts);
    setDraft(leftover);
  };

  const activeError = error ?? problem;
  const showVisibleHead = Boolean(
    showLabel ||
      optional !== undefined ||
      hint !== undefined ||
      error !== undefined ||
      problem !== null ||
      max !== undefined ||
      (label !== undefined && typeof label !== "string"),
  );
  const showFoot = Boolean(activeError || hint || limit !== undefined);

  const boxNode = (
    <div
      className={["af-chips", !showVisibleHead && !showFoot ? className : undefined].filter(Boolean).join(" ")}
      data-disabled={disabled || undefined}
      data-invalid={Boolean(activeError) || undefined}
      onMouseDown={(event) => {
        if (disabled) return;
        const target = event.target as HTMLElement;
        if (target.closest(".af-chip")) return;
        if (target !== inputRef.current) {
          event.preventDefault();
          inputRef.current?.focus();
        }
      }}
      {...(!showVisibleHead && !showFoot ? props : {})}
    >
      {name
        ? tags.map((tag, idx) => <input key={`hidden-${tag}-${idx}`} type="hidden" name={name} value={tag} />)
        : null}
      {tags.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          ref={(el) => {
            chipRefs.current[idx] = el;
          }}
          tabIndex={disabled ? undefined : -1}
          className="af-chip"
          data-avatar={avatar || undefined}
          data-armed={armedIndex === idx ? "true" : undefined}
          data-focused={focusedChip === idx ? "true" : undefined}
          data-flash={flashIndex === idx ? "true" : undefined}
          onFocus={() => setFocusedChip(idx)}
          onBlur={() => setFocusedChip((cur) => (cur === idx ? null : cur))}
          onKeyDown={(e) => handleChipKeyDown(e, idx)}
        >
          {avatar ? (
            <span className="af-chip__avatar-char" aria-hidden="true">
              {(tag.trim()[0] ?? "").toUpperCase()}
            </span>
          ) : null}
          <span className="af-chip__text">{tag}</span>
          {!disabled ? (
            <button
              type="button"
              tabIndex={-1}
              className="af-chip__x"
              aria-label={`Remove ${tag}`}
              onClick={(event) => {
                event.stopPropagation();
                removeAt(idx, "input");
              }}
            >
              <AfIcon name="close" size={10} />
            </button>
          ) : null}
        </span>
      ))}
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        className="af-chips__input"
        disabled={disabled}
        value={draft}
        aria-label={!showVisibleHead ? (ariaLabelProp ?? (typeof label === "string" ? label : "标签输入")) : ariaLabelProp}
        aria-invalid={Boolean(activeError) || undefined}
        aria-describedby={showFoot ? footId : undefined}
        placeholder={atMax ? "" : placeholder}
        onCompositionStart={ime.onCompositionStart}
        onCompositionEnd={ime.onCompositionEnd}
        onChange={(event) => handleInputChange(event.target.value)}
        onKeyDown={handleInputKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          setArmedIndex(null);
          if (draft.trim()) commitDraft();
        }}
      />
      <span className="af-sr-only" role="status" aria-live="polite">
        {liveAnnouncement}
      </span>
    </div>
  );

  if (!showVisibleHead && !showFoot) {
    return boxNode;
  }

  return (
    <div className={["af-tag-field", className].filter(Boolean).join(" ")} {...props}>
      {showVisibleHead ? (
        <div className="af-tag-field__head">
          {label !== undefined ? (
            <label
              className="af-tag-field__label"
              htmlFor={inputId}
              onClick={() => {
                if (!disabled) inputRef.current?.focus();
              }}
            >
              <span>{label}</span>
              {optional ? (
                <span className="af-tag-field__opt">{optional === true ? "Optional" : optional}</span>
              ) : null}
            </label>
          ) : (
            <span />
          )}
        </div>
      ) : null}
      {boxNode}
      {showFoot ? (
        <div
          id={footId}
          className="af-tag-field__foot"
          data-error={Boolean(activeError) || undefined}
          role={activeError ? "alert" : undefined}
        >
          <span>{activeError ?? hint}</span>
          {limit !== undefined ? (
            <span className="af-tag-field__count" data-at={atMax || undefined}>
              {tags.length}/{limit}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** 标准标签输入组件别名（与 AfChipInput 共享同一套实现与状态契约）。 */
export const AfTagInput = AfChipInput;
export type AfTagInputProps = AfChipInputProps;
