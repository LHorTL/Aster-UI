import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn, composeRefs, useAnchoredPopover, useControllableState, useOverlayBranch } from "../../primitives";
import { useAfFormFieldControl } from "../controls/FormField";

/** 颜色选择器的形态：表单字段或色块触发器。 */
export type AfColorPickerVariant = "field" | "swatch";

/** 快捷色定义：支持纯色值字符串或带无障碍/悬停名称的对象。 */
export type AfColorPreset = string | { value: string; label?: string };

/** 颜色选择器属性。 */
export type AfColorPickerProps = {
  /** 受控当前颜色，支持 #rgb / #rrggbb / #rrggbbaa / rgb() / hsl()。 */
  value?: string;
  /** 非受控初始颜色，默认 `"#0060e2"`。 */
  defaultValue?: string;
  /** 颜色变化回调。 */
  onChange?: (value: string) => void;
  /** `onChange` 的语义别名（affectUI API 对齐）。 */
  onValueChange?: (value: string) => void;
  /** 是否启用透明度（Alpha）棋盘格滑块与 8 位 Hex 输出，默认 `false`。 */
  alpha?: boolean;
  /** 触发器是否展示十六进制色值，设为 `false` 时等价于紧凑色块触发器。 */
  showValue?: boolean;
  /** 触发器尺寸档位，默认 `"md"`。 */
  size?: "sm" | "md";
  /** 首选弹出方向，默认 `"bottom"`。 */
  side?: "bottom" | "top";
  /** 水平对齐方式，默认 `"start"`。 */
  align?: "start" | "center" | "end";
  /** 原生表单字段名。 */
  name?: string;
  /** 控件 id。 */
  id?: string;
  /** 校验失败态。 */
  invalid?: boolean;
  /** 无障碍名称。 */
  label?: string;
  /** field 为表单字段，swatch 为紧凑色块。 */
  variant?: AfColorPickerVariant;
  /** 是否禁用。 */
  disabled?: boolean;
  /** 快捷色；不传时使用默认色板。 */
  presets?: AfColorPreset[];
  /** 额外类名。 */
  className?: string;
  /** 受控打开状态。 */
  open?: boolean;
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean;
  /** 打开状态变化回调。 */
  onOpenChange?: (open: boolean) => void;
  /** 可选指定挂载容器；省略时自动接入 AfLayer / Theme 浮层根。 */
  container?: HTMLElement | null;
};

type Rgba = { r: number; g: number; b: number; a: number };
type Hsva = { h: number; s: number; v: number; a: number };

const DEFAULT_PRESETS: AfColorPreset[] = [
  { value: "#0190fe", label: "Blue" },
  { value: "#14b3f0", label: "Sky" },
  { value: "#13b3a0", label: "Teal" },
  { value: "#5fc88a", label: "Green" },
  { value: "#e8b000", label: "Amber" },
  { value: "#f28a2e", label: "Orange" },
  { value: "#ee3e9e", label: "Pink" },
  { value: "#a651f0", label: "Purple" },
];

const clamp01 = (val: number) => Math.min(1, Math.max(0, val));
const clampRange = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

function hslToRgb(hDeg: number, sPct: number, lPct: number): { r: number; g: number; b: number } {
  const h = ((hDeg % 360) + 360) % 360;
  const s = clamp01(sPct);
  const l = clamp01(lPct);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return {
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255,
  };
}

function parseAlphaToken(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return 1;
  const trimmed = raw.trim();
  if (trimmed.endsWith("%")) {
    const num = Number(trimmed.slice(0, -1));
    return Number.isFinite(num) ? clamp01(num / 100) : null;
  }
  const num = Number(trimmed);
  return Number.isFinite(num) ? clamp01(num) : null;
}

/** 解析 #rgb / #rgba / #rrggbb / #rrggbbaa / rgb() / rgba() / hsl() / hsla()。 */
export function parseCssColor(raw: string): Rgba | null {
  const str = raw.trim();
  const hexMatch = str.match(/^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split("")
        .map((ch) => ch + ch)
        .join("");
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const rgbMatch = str.match(
    /^rgba?\(\s*([+-]?\d*\.?\d+%?)\s*(?:,|\s)\s*([+-]?\d*\.?\d+%?)\s*(?:,|\s)\s*([+-]?\d*\.?\d+%?)(?:\s*(?:,|\/)\s*([+-]?\d*\.?\d+%?))?\s*\)$/i,
  );
  if (rgbMatch) {
    const parseChan = (token: string) => {
      if (token.endsWith("%")) {
        const pct = Number(token.slice(0, -1));
        return Number.isFinite(pct) ? clampRange((pct / 100) * 255, 0, 255) : NaN;
      }
      const num = Number(token);
      return Number.isFinite(num) ? clampRange(num, 0, 255) : NaN;
    };
    const r = parseChan(rgbMatch[1]);
    const g = parseChan(rgbMatch[2]);
    const b = parseChan(rgbMatch[3]);
    const a = parseAlphaToken(rgbMatch[4]);
    if ([r, g, b].some(Number.isNaN) || a === null) return null;
    return { r, g, b, a };
  }

  const hslMatch = str.match(
    /^hsla?\(\s*([+-]?\d*\.?\d+)(?:deg)?\s*(?:,|\s)\s*([+-]?\d*\.?\d+)%\s*(?:,|\s)\s*([+-]?\d*\.?\d+)%(?:\s*(?:,|\/)\s*([+-]?\d*\.?\d+%?))?\s*\)$/i,
  );
  if (hslMatch) {
    const h = Number(hslMatch[1]);
    const s = Number(hslMatch[2]) / 100;
    const l = Number(hslMatch[3]) / 100;
    const a = parseAlphaToken(hslMatch[4]);
    if ([h, s, l].some(Number.isNaN) || a === null) return null;
    const rgb = hslToRgb(h, s, l);
    return { ...rgb, a };
  }

  return null;
}

function rgbaToHex(rgba: Rgba, includeAlpha: boolean): string {
  const toHex = (val: number) => Math.round(clampRange(val, 0, 255)).toString(16).padStart(2, "0");
  const base = `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
  if (!includeAlpha) return base;
  const alphaByte = Math.round(clamp01(rgba.a) * 255);
  if (alphaByte >= 255) return base;
  return `${base}${toHex(alphaByte)}`;
}

function rgbaToHsva(rgba: Rgba): Hsva {
  const r = rgba.r / 255;
  const g = rgba.g / 255;
  const b = rgba.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max, a: clamp01(rgba.a) };
}

function hsvaToRgba(hsva: Hsva): Rgba {
  const c = hsva.v * hsva.s;
  const h = ((hsva.h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((h % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 1) [r, g, b] = [c, x, 0];
  else if (h < 2) [r, g, b] = [x, c, 0];
  else if (h < 3) [r, g, b] = [0, c, x];
  else if (h < 4) [r, g, b] = [0, x, c];
  else if (h < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = hsva.v - c;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255, a: clamp01(hsva.a) };
}

function rgbaOf(value: string): Rgba {
  return parseCssColor(value) ?? { r: 0, g: 96, b: 226, a: 1 };
}

function normalizePreset(preset: AfColorPreset): { value: string; label: string } {
  if (typeof preset === "string") return { value: preset, label: preset };
  return { value: preset.value, label: preset.label ?? preset.value };
}

/**
 * Aster UI 颜色选择器（affectUI 1:1 复刻）：
 * - 紧凑发丝环触发器（支持 `field` / `swatch`、`showValue={false}`、`size="sm" | "md"`）；
 * - 自绘 SV 面积 + Hue 滑块 + 可选 Alpha 棋盘格透明度滑块 + Hex/RGB/HSL 智能输入校验 + 命名快捷色单选组。
 */
export const AfColorPicker = forwardRef<HTMLButtonElement, AfColorPickerProps>(function AfColorPicker(
  {
    value: valueProp,
    defaultValue = "#0060e2",
    onChange,
    onValueChange,
    alpha = false,
    showValue = true,
    size = "sm",
    side = "bottom",
    align = "end",
    name,
    id: idProp,
    invalid,
    label = "Agent color",
    variant = "field",
    disabled,
    presets = DEFAULT_PRESETS,
    className,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    container,
  },
  forwardedRef,
) {
  const fieldCtx = useAfFormFieldControl();
  const handleValueChange = (next: string) => {
    onChange?.(next);
    onValueChange?.(next);
  };

  const [value, setValue] = useControllableState<string>({
    value: valueProp,
    defaultValue,
    onChange: handleValueChange,
  });

  const resolvedId = idProp ?? fieldCtx?.controlId;
  const bad = Boolean(invalid || fieldCtx?.invalid);
  const isSwatchTrigger = variant === "swatch" || !showValue;

  const controlledOpen = openProp !== undefined;
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const open = controlledOpen ? Boolean(openProp) : innerOpen;

  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<"enter" | "open" | "exit">(open ? "open" : "enter");
  const [hsva, setHsva] = useState<Hsva>(() => rgbaToHsva(rgbaOf(value)));
  const [hexText, setHexText] = useState(() => rgbaToHex(rgbaOf(value), alpha).slice(1).toUpperCase());
  const [inputInvalid, setInputInvalid] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const alphaRef = useRef<HTMLDivElement>(null);
  const presetRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const closeTimer = useRef<number | null>(null);

  const rgba = hsvaToRgba(hsva);
  const opaqueHex = rgbaToHex(rgba, false);
  const formattedHex = rgbaToHex(rgba, alpha);
  const cssPreviewColor = alpha
    ? `rgba(${Math.round(rgba.r)}, ${Math.round(rgba.g)}, ${Math.round(rgba.b)}, ${ Number(rgba.a.toFixed(3)) })`
    : opaqueHex;

  const normalizedPresets = useMemo(() => presets.map(normalizePreset), [presets]);

  const { OverlayBranchScope, containsNode } = useOverlayBranch(panelRef, mounted);
  const { layer, place } = useAnchoredPopover(mounted, triggerRef, panelRef, {
    preferredSide: side,
    align,
    gap: 6,
    preserveNaturalWidth: true,
    container,
  });

  useEffect(() => {
    if (open) {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setMounted(true);
      setPhase("enter");
      const frame = requestAnimationFrame(() => setPhase("open"));
      return () => cancelAnimationFrame(frame);
    }
    if (mounted) {
      setPhase("exit");
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => {
        closeTimer.current = null;
        setMounted(false);
        setPhase("enter");
      }, 135);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const setOpenState = (next: boolean, restoreFocus = false, viaPointer = false) => {
    if (!controlledOpen) setInnerOpen(next);
    onOpenChange?.(next);
    if (!next && restoreFocus && triggerRef.current) {
      try {
        (triggerRef.current as HTMLElement & { focus: (opts?: FocusOptions & { focusVisible?: boolean }) => void }).focus({
          preventScroll: true,
          focusVisible: !viaPointer,
        });
      } catch {
        triggerRef.current.focus({ preventScroll: true });
      }
    }
  };

  useEffect(() => {
    const parsed = rgbaOf(value);
    const nextFormatted = rgbaToHex(parsed, alpha);
    const nextDisplay = nextFormatted.slice(1).toUpperCase();
    setInputInvalid(false);
    setHexText((current) =>
      current.replace(/^#/, "").toLowerCase() === nextFormatted.slice(1) ? current : nextDisplay,
    );
    setHsva((current) => {
      const currentFormatted = rgbaToHex(hsvaToRgba(current), alpha);
      if (currentFormatted === nextFormatted) return current;
      const converted = rgbaToHsva(parsed);
      return {
        ...converted,
        h: converted.s === 0 ? current.h : converted.h,
      };
    });
  }, [alpha, value]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: globalThis.PointerEvent) => {
      const target = event.target as Node | null;
      if (containsNode(target) || (target && triggerRef.current?.contains(target))) return;
      setOpenState(false, false, true);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpenState(false, true, false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, containsNode, controlledOpen]);

  const apply = (next: Hsva) => {
    const effective = alpha ? next : { ...next, a: 1 };
    setHsva(effective);
    setInputInvalid(false);
    const nextHex = rgbaToHex(hsvaToRgba(effective), alpha);
    setHexText(nextHex.slice(1).toUpperCase());
    setValue(nextHex);
  };

  const updateSv = (event: PointerEvent<HTMLDivElement>) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    apply({
      ...hsva,
      s: clamp01((event.clientX - rect.left) / (rect.width || 1)),
      v: 1 - clamp01((event.clientY - rect.top) / (rect.height || 1)),
    });
  };

  const updateHue = (event: PointerEvent<HTMLDivElement>) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    apply({ ...hsva, h: clamp01((event.clientX - rect.left) / (rect.width || 1)) * 360 });
  };

  const updateAlpha = (event: PointerEvent<HTMLDivElement>) => {
    const el = alphaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    apply({ ...hsva, a: clamp01((event.clientX - rect.left) / (rect.width || 1)) });
  };

  const onSvKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      apply({ ...hsva, s: clamp01(hsva.s + (event.key === "ArrowRight" ? step : -step)) });
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      apply({ ...hsva, v: clamp01(hsva.v + (event.key === "ArrowUp" ? step : -step)) });
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      apply({ ...hsva, v: clamp01(hsva.v + (event.key === "PageUp" ? 0.1 : -0.1)) });
    } else if (event.key === "Home") {
      event.preventDefault();
      apply({ ...hsva, s: 0, v: 1 });
    } else if (event.key === "End") {
      event.preventDefault();
      apply({ ...hsva, s: 1, v: 0 });
    }
  };

  const onHueKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      apply({ ...hsva, h: (hsva.h - step + 360) % 360 });
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      apply({ ...hsva, h: (hsva.h + step + 360) % 360 });
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      apply({ ...hsva, h: (hsva.h + (event.key === "PageUp" ? 30 : -30) + 360) % 360 });
    } else if (event.key === "Home") {
      event.preventDefault();
      apply({ ...hsva, h: 0 });
    } else if (event.key === "End") {
      event.preventDefault();
      apply({ ...hsva, h: 359 });
    }
  };

  const onAlphaKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.01;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      apply({ ...hsva, a: clamp01(hsva.a - step) });
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      apply({ ...hsva, a: clamp01(hsva.a + step) });
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      apply({ ...hsva, a: clamp01(hsva.a + (event.key === "PageUp" ? 0.1 : -0.1)) });
    } else if (event.key === "Home") {
      event.preventDefault();
      apply({ ...hsva, a: 0 });
    } else if (event.key === "End") {
      event.preventDefault();
      apply({ ...hsva, a: 1 });
    }
  };

  const commitDraftColor = (draft: string, strictFeedback: boolean) => {
    setHexText(draft);
    const parsed = parseCssColor(draft);
    if (!parsed) {
      if (strictFeedback) setInputInvalid(true);
      return false;
    }
    setInputInvalid(false);
    const nextRgba = alpha ? parsed : { ...parsed, a: 1 };
    const nextHsva = rgbaToHsva(nextRgba);
    setHsva((prev) => ({ ...nextHsva, h: nextHsva.s === 0 ? prev.h : nextHsva.h }));
    const normalized = rgbaToHex(nextRgba, alpha);
    setValue(normalized);
    if (strictFeedback) setHexText(normalized.slice(1).toUpperCase());
    return true;
  };

  const selectedPresetIndex = normalizedPresets.findIndex((preset) => {
    const parsed = parseCssColor(preset.value);
    if (!parsed) return false;
    return rgbaToHex(alpha ? parsed : { ...parsed, a: 1 }, alpha) === formattedHex.toLowerCase();
  });

  const showHashPrefix = !/^(rgb|hsl)/i.test(hexText.trim()) && !hexText.trim().startsWith("#");

  return (
    <span
      className={cn("af-colorpicker", isSwatchTrigger && "af-colorpicker--swatch", className)}
      data-size={size}
    >
      {name && !disabled ? <input type="hidden" name={name} value={formattedHex} /> : null}
      <button
        ref={composeRefs(triggerRef, forwardedRef)}
        id={resolvedId}
        type="button"
        className={cn("af-colorpicker__trigger", isSwatchTrigger && "af-colorpicker__trigger--swatch")}
        data-size={size}
        data-alpha={alpha || undefined}
        data-invalid={bad || undefined}
        style={{ "--cp-color": cssPreviewColor } as CSSProperties}
        aria-label={`${label}: ${formattedHex.toUpperCase()}`}
        aria-describedby={fieldCtx?.describedBy}
        aria-invalid={bad || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpenState(!open, false, true)}
      >
        <span className="af-colorpicker__sr">{label}: </span>
        <span className="af-colorpicker__swatch" data-alpha={alpha || undefined} aria-hidden="true">
          <span className="af-colorpicker__swatch-fill" />
        </span>
        {!isSwatchTrigger ? (
          <span className="af-colorpicker__hex">{formattedHex.toUpperCase()}</span>
        ) : (
          <span className="af-colorpicker__sr">{formattedHex.toUpperCase()}</span>
        )}
      </button>
      {mounted && layer
        ? createPortal(
            <OverlayBranchScope>
              <div
                ref={panelRef}
                className="af-colorpicker__pop"
                data-af-overlay="true"
                data-state={phase}
                data-side={place?.side ?? side}
                role="dialog"
                aria-label={label}
                style={
                  place
                    ? ({
                        left: place.left,
                        top: place.top,
                        transformOrigin: place.origin,
                        "--cp-color": cssPreviewColor,
                        "--cp-h": `${hsva.h}`,
                      } as CSSProperties)
                    : ({
                        visibility: "hidden",
                        left: 0,
                        top: 0,
                        "--cp-color": cssPreviewColor,
                        "--cp-h": `${hsva.h}`,
                      } as CSSProperties)
                }
              >
                <div
                  ref={svRef}
                  className="af-colorpicker__sv"
                  role="slider"
                  tabIndex={0}
                  aria-label="Saturation and brightness"
                  aria-valuenow={Math.round(hsva.s * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuetext={`Saturation ${Math.round(hsva.s * 100)}%, brightness ${Math.round(hsva.v * 100)}%`}
                  style={{ "--cp-h": `${hsva.h}` } as CSSProperties}
                  onPointerDown={(event) => {
                    try {
                      event.currentTarget.setPointerCapture(event.pointerId);
                    } catch {
                      // Ignore environments without pointer capture
                    }
                    updateSv(event);
                  }}
                  onPointerMove={(event) => {
                    if (event.buttons === 1) updateSv(event);
                  }}
                  onKeyDown={onSvKeyDown}
                >
                  <span
                    className="af-colorpicker__svmarker"
                    style={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%` }}
                  />
                </div>
                <div
                  ref={hueRef}
                  className="af-colorpicker__hue"
                  role="slider"
                  tabIndex={0}
                  aria-label="Hue"
                  aria-valuemin={0}
                  aria-valuemax={360}
                  aria-valuenow={Math.round(hsva.h)}
                  onPointerDown={(event) => {
                    try {
                      event.currentTarget.setPointerCapture(event.pointerId);
                    } catch {
                      // Ignore
                    }
                    updateHue(event);
                  }}
                  onPointerMove={(event) => {
                    if (event.buttons === 1) updateHue(event);
                  }}
                  onKeyDown={onHueKeyDown}
                >
                  <span className="af-colorpicker__huemarker" style={{ left: `${(hsva.h / 360) * 100}%` }} />
                </div>
                {alpha ? (
                  <div
                    ref={alphaRef}
                    className="af-colorpicker__alpha"
                    role="slider"
                    tabIndex={0}
                    aria-label="Opacity"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(hsva.a * 100)}
                    aria-valuetext={`${Math.round(hsva.a * 100)}%`}
                    style={{ "--cp-solid": opaqueHex } as CSSProperties}
                    onPointerDown={(event) => {
                      try {
                        event.currentTarget.setPointerCapture(event.pointerId);
                      } catch {
                        // Ignore
                      }
                      updateAlpha(event);
                    }}
                    onPointerMove={(event) => {
                      if (event.buttons === 1) updateAlpha(event);
                    }}
                    onKeyDown={onAlphaKeyDown}
                  >
                    <span className="af-colorpicker__alpha-gradient" aria-hidden="true" />
                    <span className="af-colorpicker__alphamarker" style={{ left: `${hsva.a * 100}%` }} />
                  </div>
                ) : null}
                <div className="af-colorpicker__fields">
                  <span className="af-colorpicker__preview" data-alpha={alpha || undefined} aria-hidden="true">
                    <span className="af-colorpicker__swatch-fill" />
                  </span>
                  <div className="af-colorpicker__hexbox" data-invalid={inputInvalid ? "true" : undefined}>
                    {showHashPrefix ? (
                      <span className="af-colorpicker__hash" aria-hidden="true">
                        #
                      </span>
                    ) : null}
                    <input
                      className="af-colorpicker__hexinput"
                      value={hexText}
                      data-invalid={inputInvalid ? "true" : undefined}
                      aria-invalid={inputInvalid || undefined}
                      aria-label="Hex color"
                      spellCheck={false}
                      onChange={(event) => {
                        const next = event.target.value;
                        setInputInvalid(false);
                        setHexText(next);
                        if (/^#?([0-9a-f]{6}|[0-9a-f]{8})$/i.test(next.trim())) {
                          commitDraftColor(next, false);
                        }
                      }}
                      onBlur={() => {
                        if (!commitDraftColor(hexText, false)) {
                          setInputInvalid(false);
                        }
                        setHexText(formattedHex.slice(1).toUpperCase());
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitDraftColor(hexText, true);
                        }
                      }}
                    />
                  </div>
                  {alpha ? <span className="af-colorpicker__rgb">{Math.round(hsva.a * 100)}%</span> : null}
                </div>
                {normalizedPresets.length ? (
                  <div className="af-colorpicker__presets" role="radiogroup" aria-label="Preset colors">
                    {normalizedPresets.map((preset, index) => {
                      const checked = index === selectedPresetIndex;
                      const tabIndex =
                        checked || (selectedPresetIndex === -1 && index === 0) ? 0 : -1;
                      return (
                        <button
                          key={`${preset.value}-${index}`}
                          ref={(node) => {
                            presetRefs.current[index] = node;
                          }}
                          type="button"
                          role="radio"
                          tabIndex={tabIndex}
                          title={preset.label}
                          className="af-colorpicker__preset"
                          style={{ "--cp-preset": preset.value } as CSSProperties}
                          aria-label={preset.label}
                          aria-checked={checked}
                          onClick={() => {
                            const parsed = rgbaOf(preset.value);
                            const effective = alpha ? parsed : { ...parsed, a: 1 };
                            setHsva(rgbaToHsva(effective));
                            const normalized = rgbaToHex(effective, alpha);
                            setInputInvalid(false);
                            setValue(normalized);
                            setHexText(normalized.slice(1).toUpperCase());
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                            event.preventDefault();
                            const step = event.key === "ArrowRight" ? 1 : -1;
                            const nextIdx =
                              (index + step + normalizedPresets.length) % normalizedPresets.length;
                            const nextPreset = normalizedPresets[nextIdx];
                            presetRefs.current[nextIdx]?.focus();
                            if (nextPreset) {
                              const parsed = rgbaOf(nextPreset.value);
                              const effective = alpha ? parsed : { ...parsed, a: 1 };
                              setHsva(rgbaToHsva(effective));
                              const normalized = rgbaToHex(effective, alpha);
                              setInputInvalid(false);
                              setValue(normalized);
                              setHexText(normalized.slice(1).toUpperCase());
                            }
                          }}
                        >
                          <span className="af-colorpicker__preset-fill" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </OverlayBranchScope>,
            layer,
          )
        : null}
    </span>
  );
});
