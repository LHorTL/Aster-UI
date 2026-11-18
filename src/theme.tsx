import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Context,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AfMessageHost } from "./components/overlay/Message";
import { AfModalHost } from "./components/overlay/Modal";
import { useIsomorphicLayoutEffect } from "./primitives/cn";
import { AfThemePortalContext, registerAfHostPortalRoot } from "./primitives/layer";
import { installAfListHover } from "./primitives/motion";

/** 主题模式：显式浅色 / 显式深色 / 跟随系统。 */
export type AsterThemeMode = "light" | "dark" | "system";

/** 实际生效的明暗主题。 */
export type AsterResolvedTheme = "light" | "dark";

/** 当前交互输入模态：指针点击不闪焦点外环，键盘导航显示高对比焦点外环。 */
export type AsterInputModality = "pointer" | "keyboard";

/** 内置强调色；custom 由任意合法 CSS 颜色值提供。 */
export type AsterAccentPreset = "blue" | "violet" | "green" | "orange";

/** 界面控件密度。 */
export type AsterDensity = "comfortable" | "compact";

/** 界面圆角档位。 */
export type AsterRadiusScale = "sm" | "md" | "lg";

/** 主题属性挂载目标：`scope` 仅作用于容器自身，`document` 同步至 `document.documentElement`。 */
export type AsterThemeTarget = "scope" | "document";

/** 自定义主题存储适配器；传入 `false` 时完全禁用内部本地存储与跨标签页监听（交由宿主 IPC 接管）。 */
export type AsterThemeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem?: (key: string) => void;
};

/** 主题预设或用户保存的主题记录。 */
export type AsterThemePresetItem = {
  id: string;
  name: string;
  mode: AsterThemeMode;
  accent: string;
  accentHex: string;
  density: AsterDensity;
  radius: AsterRadiusScale;
  builtin?: boolean;
};

/** 跨窗口 IPC 或受控宿主同步用的完整主题状态快照。 */
export type AsterThemeSnapshot = {
  mode: AsterThemeMode;
  resolved: AsterResolvedTheme;
  accent: string;
  density: AsterDensity;
  radius: AsterRadiusScale;
  activeThemeId?: string;
  customThemes: AsterThemePresetItem[];
  transparent: boolean;
};

/** 底层主题关键色值（供原生窗口背景色与标题栏覆盖层同步）。 */
export type AsterThemeColors = {
  bg: string;
  surface: string;
  sunken: string;
  overlay: string;
  ink: string;
  strong: string;
  muted: string;
  accent: string;
};

/** 历史宿主迁移兼容的主题配置与载荷类型别名。 */
export type ThemeMode = AsterThemeMode;
export type ThemePreset = AsterThemePresetItem;
export type ComponentThemeOverrides = Record<string, Record<string, string | number>>;
export type ThemeConfig = {
  mode: AsterThemeMode;
  accent: string;
  density?: AsterDensity;
  radius?: AsterRadiusScale;
  presetId?: string;
};
export type ThemeValue = ThemeConfig;
export type ThemePresets = AsterThemePresetItem[];
export type ThemePanelThemeRecord = AsterThemePresetItem;
export type ThemePanelApplyPayload = {
  id?: string;
  mode?: AsterThemeMode;
  accent?: string;
  density?: AsterDensity;
  radius?: AsterRadiusScale;
  transparent?: boolean;
  tokens?: Record<string, string>;
};
export type ThemePanelSavePayload = {
  id?: string;
  name: string;
  mode?: AsterThemeMode;
  accent?: string;
  density?: AsterDensity;
  radius?: AsterRadiusScale;
};
export type ThemePanelCreateThemePayload = ThemePanelSavePayload;
export type ThemePanelUpdateThemePayload = ThemePanelSavePayload;
export type ThemePanelDeleteThemePayload = { id: string } | string;

/** 主题上下文。 */
export type AsterThemeContextValue = {
  /** 用户选择的模式。 */
  mode: AsterThemeMode;
  /** 实际生效的明暗。 */
  resolved: AsterResolvedTheme;
  /** 历史宿主迁移兼容别名：等同于 `resolved`。 */
  colorScheme: AsterResolvedTheme;
  /** 当前输入模态。 */
  modality: AsterInputModality;
  /** 当前强调色（预设名或自定义 CSS 颜色）。 */
  accent: string;
  /** 当前强调色是否为内置预设。 */
  isPresetAccent: boolean;
  /** 当前界面密度。 */
  density: AsterDensity;
  /** 当前界面圆角档位。 */
  radius: AsterRadiusScale;
  /** 当前是否处于透明窗口画布模式。 */
  transparent: boolean;
  /** 当前主题属性同步目标。 */
  target: AsterThemeTarget;
  /** 全部可用主题（内置预设 + 自定义主题）。 */
  themes: AsterThemePresetItem[];
  /** 当前激活预设 id（如有）。 */
  activeThemeId?: string;
  /** 设置主题模式并持久化。 */
  setMode: (mode: AsterThemeMode) => void;
  /** 设置强调色并持久化；传任意合法 CSS 颜色即可自定义。 */
  setAccent: (accent: string) => void;
  /** 设置界面密度并持久化。 */
  setDensity: (density: AsterDensity) => void;
  /** 设置圆角档位并持久化。 */
  setRadius: (radius: AsterRadiusScale) => void;
  /** 一键应用组合主题配置。 */
  applyTheme: (payload: ThemePanelApplyPayload) => void;
  /** 新增或更新自定义主题并持久化。 */
  saveTheme: (payload: ThemePanelSavePayload) => AsterThemePresetItem;
  /** 删除自定义主题（内置预设不可删除）。 */
  deleteTheme: (id: string) => void;
  /** 设置当前激活主题 id。 */
  setActiveThemeId: (id?: string) => void;
  /** 在 light / dark / system 间循环。 */
  cycleMode: () => void;
  /** 主题根节点。 */
  container: HTMLElement | null;
  /** 主题内置的全屏固定浮层宿主（继承深浅色与自定义强调色变量，不受局部卡片 overflow 裁切）。 */
  portalRoot: HTMLElement | null;
};

/** 内置强调色名。 */
export const ASTER_ACCENT_PRESETS: AsterAccentPreset[] = ["blue", "violet", "green", "orange"];

/** 预设强调色对应的实际十六进制基准色。 */
export const ASTER_ACCENT_HEX_MAP: Record<AsterAccentPreset, string> = {
  blue: "#0060e2",
  violet: "#7c5cff",
  green: "#1a9a52",
  orange: "#d97706",
};

/** affectUI Clean / Pro 内置主题预设列表。 */
export const ASTER_THEME_PRESETS: AsterThemePresetItem[] = [
  { id: "clean-light", name: "Clean 浅色蓝", mode: "light", accent: "blue", accentHex: "#0060e2", density: "comfortable", radius: "md", builtin: true },
  { id: "clean-dark", name: "Clean 深色蓝", mode: "dark", accent: "blue", accentHex: "#4d8dff", density: "comfortable", radius: "md", builtin: true },
  { id: "pro-compact", name: "Pro 紧凑工作台", mode: "system", accent: "violet", accentHex: "#7c5cff", density: "compact", radius: "sm", builtin: true },
  { id: "forest-mint", name: "晨雾绿", mode: "light", accent: "green", accentHex: "#1a9a52", density: "comfortable", radius: "md", builtin: true },
  { id: "amber-studio", name: "琥珀暖橙", mode: "light", accent: "orange", accentHex: "#d97706", density: "comfortable", radius: "lg", builtin: true },
];

/** 历史宿主迁移兼容别名：默认主题预设表（同时兼容数组遍历与 `.assistant` / `.assistantDark` 键访问）。 */
export const THEME_PANEL_DEFAULT_THEME_PRESETS: AsterThemePresetItem[] & {
  assistant: AsterThemePresetItem;
  assistantDark: AsterThemePresetItem;
} = Object.assign([...ASTER_THEME_PRESETS], {
  assistant: ASTER_THEME_PRESETS[0],
  assistantDark: ASTER_THEME_PRESETS[1],
});

/** 判断一个强调色是否是内置预设。 */
export function isAsterAccentPreset(value: string): value is AsterAccentPreset {
  return (ASTER_ACCENT_PRESETS as string[]).includes(value);
}

/** 根据模式与系统偏好解析实际明暗方案。 */
export function resolveAsterThemeColorScheme(mode: AsterThemeMode, prefersDark = systemPrefersDark()): AsterResolvedTheme {
  return mode === "system" ? (prefersDark ? "dark" : "light") : mode;
}

/** 历史宿主迁移兼容别名：解析明暗配色。 */
export const resolveThemeColorScheme = resolveAsterThemeColorScheme;

/** 计算主题的关键底层色值，供原生窗口背景色（`#f7f7f7` / `#0e0e0e` / 透明）同步与图元着色使用。 */
export function resolveAsterThemeColors(
  resolved: AsterResolvedTheme,
  accent = "blue",
  options?: { transparent?: boolean },
): AsterThemeColors {
  const safeAccent = normalizeAccent(accent, "blue");
  const accentHex = isAsterAccentPreset(safeAccent)
    ? resolved === "dark" && safeAccent === "blue"
      ? "#4d8dff"
      : ASTER_ACCENT_HEX_MAP[safeAccent]
    : safeAccent;
  const transparentBg = Boolean(options?.transparent);
  return resolved === "dark"
    ? {
        bg: transparentBg ? "#00000000" : "#0e0e0e",
        surface: "#1b1b1b",
        sunken: "#161616",
        overlay: "#202020",
        ink: "#e5e5e5",
        strong: "#ffffff",
        muted: "#9a9a9a",
        accent: accentHex,
      }
    : {
        bg: transparentBg ? "#00000000" : "#f7f7f7",
        surface: "#ffffff",
        sunken: "#fafafa",
        overlay: "#ffffff",
        ink: "#262626",
        strong: "#111111",
        muted: "#737373",
        accent: accentHex,
      };
}

/** 将给定主题参数直接应用到指定 `.af` 容器或 `document.documentElement` 节点上（首帧零闪烁预同步与多窗口宿主桥接适用）。 */
export function applyAsterTheme(
  target: HTMLElement | null | undefined,
  payload: ThemePanelApplyPayload,
  prefersDark = systemPrefersDark(),
) {
  if (!target) return;
  if (payload.mode) {
    const resolved = resolveAsterThemeColorScheme(payload.mode, prefersDark);
    target.dataset.theme = resolved;
    target.dataset.afTheme = resolved;
    target.dataset.mode = payload.mode;
    target.dataset.afMode = payload.mode;
    target.style.colorScheme = resolved;
  }
  if (payload.accent) {
    const safeAccent = normalizeAccent(payload.accent, "blue");
    if (isAsterAccentPreset(safeAccent)) {
      target.dataset.accent = safeAccent;
      target.dataset.afAccent = safeAccent;
      target.style.removeProperty("--af-accent");
      target.style.removeProperty("--af-accent-ink");
      target.style.removeProperty("--af-accent-soft");
      target.style.removeProperty("--af-focus");
    } else {
      target.dataset.accent = "custom";
      target.dataset.afAccent = "custom";
      target.style.setProperty("--af-accent", safeAccent);
      target.style.setProperty("--af-accent-ink", `color-mix(in srgb, ${safeAccent} 78%, var(--af-page-strong))`);
      target.style.setProperty("--af-accent-soft", `color-mix(in srgb, ${safeAccent} 12%, transparent)`);
      target.style.setProperty("--af-focus", `color-mix(in srgb, ${safeAccent} 50%, transparent)`);
    }
  }
  if (payload.density) {
    target.dataset.density = payload.density;
    target.dataset.afDensity = payload.density;
  }
  if (payload.radius) {
    target.dataset.radius = payload.radius;
    target.dataset.afRadius = payload.radius;
  }
  if (typeof payload.transparent === "boolean") {
    if (payload.transparent) {
      target.dataset.afTransparent = "true";
    } else {
      delete target.dataset.afTransparent;
    }
  }
  if (payload.tokens) {
    for (const [key, val] of Object.entries(payload.tokens)) {
      target.style.setProperty(key, val);
    }
  }
}

function getGlobalSingleton<T>(key: string, create: () => T): T {
  const sym = Symbol.for(key);
  const g = globalThis as Record<symbol, unknown>;
  if (!(sym in g)) {
    g[sym] = create();
  }
  return g[sym] as T;
}

/** 全局唯一主题 React Context（跨 ESM / CJS / runtime 子路径与外部化插件共享同一引用）。 */
export const AsterThemeContext: Context<AsterThemeContextValue | null> = getGlobalSingleton(
  "aster-ui.AsterThemeContext.v1",
  () => createContext<AsterThemeContextValue | null>(null),
);

const ThemeContext = AsterThemeContext;

type HostThemeEntry = {
  id: symbol;
  value: AsterThemeContextValue;
};

type HostThemeBridgeStore = {
  entries: HostThemeEntry[];
  listeners: Set<() => void>;
};

const hostThemeBridge = getGlobalSingleton<HostThemeBridgeStore>("aster-ui.HostThemeBridge.v1", () => ({
  entries: [],
  listeners: new Set(),
}));

function emitHostThemeChange() {
  hostThemeBridge.listeners.forEach((fn) => fn());
}

/** 发布或更新主宿主窗口的主题快照（供插件运行时及独立 `createRoot` 根节点订阅）。 */
export function publishAsterHostTheme(id: symbol, value: AsterThemeContextValue): () => void {
  const idx = hostThemeBridge.entries.findIndex((item) => item.id === id);
  if (idx >= 0) {
    hostThemeBridge.entries = hostThemeBridge.entries.map((item, i) => (i === idx ? { id, value } : item));
  } else {
    hostThemeBridge.entries = [...hostThemeBridge.entries, { id, value }];
  }
  emitHostThemeChange();
  return () => {
    const prevLen = hostThemeBridge.entries.length;
    hostThemeBridge.entries = hostThemeBridge.entries.filter((item) => item.id !== id);
    if (hostThemeBridge.entries.length !== prevLen) {
      emitHostThemeChange();
    }
  };
}

/** 读取当前窗口已挂载的主宿主主题上下文（SSR 或无活跃宿主时返回 `null`）。 */
export function getAsterHostTheme(): AsterThemeContextValue | null {
  if (typeof document === "undefined") return null;
  for (let i = hostThemeBridge.entries.length - 1; i >= 0; i -= 1) {
    const candidate = hostThemeBridge.entries[i]?.value;
    if (!candidate) continue;
    if (!candidate.container || (candidate.container.ownerDocument === document && candidate.container.isConnected)) {
      return candidate;
    }
  }
  return null;
}

/** 订阅主宿主主题变更。 */
export function subscribeAsterHostTheme(listener: () => void): () => void {
  hostThemeBridge.listeners.add(listener);
  return () => {
    hostThemeBridge.listeners.delete(listener);
  };
}

function getServerHostThemeSnapshot(): AsterThemeContextValue | null {
  return null;
}

type DocumentBaseline = {
  hadAfClass: boolean;
  attrs: Record<string, string | null>;
  colorScheme: string;
  accentProps: Record<string, string>;
};

type DocumentOwnerStore = {
  owners: Set<symbol>;
  baseline: DocumentBaseline | null;
};

const documentOwnerStore = getGlobalSingleton<DocumentOwnerStore>("aster-ui.DocumentThemeOwners.v1", () => ({
  owners: new Set(),
  baseline: null,
}));

const DOC_SYNC_ATTRS = [
  "data-theme",
  "data-af-theme",
  "data-mode",
  "data-af-mode",
  "data-modality",
  "data-density",
  "data-af-density",
  "data-radius",
  "data-af-radius",
  "data-accent",
  "data-af-accent",
  "data-af-transparent",
] as const;

const INLINE_ACCENT_PROPS = ["--af-accent", "--af-accent-ink", "--af-accent-soft", "--af-focus"] as const;

const MODE_KEY = "aster-ui:theme-mode";
const ACCENT_KEY = "aster-ui:theme-accent";
const DENSITY_KEY = "aster-ui:theme-density";
const RADIUS_KEY = "aster-ui:theme-radius";
const CUSTOM_THEMES_KEY = "aster-ui:custom-themes";
const ACTIVE_THEME_KEY = "aster-ui:active-theme";

const browserLocalStorageAdapter: AsterThemeStorage = {
  getItem(key) {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  },
  setItem(key, value) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem(key) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
  },
};

function resolveStorageAdapter(storage: AsterThemeStorage | false | undefined): AsterThemeStorage | null {
  if (storage === false) return null;
  return storage ?? browserLocalStorageAdapter;
}

/** 安全读取存储适配器，SSR / 禁用存储 / 隐私模式下降级为 null。 */
function readStorage(adapter: AsterThemeStorage | null, key: string): string | null {
  if (!adapter) return null;
  try {
    return adapter.getItem(key);
  } catch {
    return null;
  }
}

/** 安全写入存储适配器。 */
function writeStorage(adapter: AsterThemeStorage | null, key: string, value: string) {
  if (!adapter) return;
  try {
    adapter.setItem(key, value);
  } catch {
    // 隐私模式或存储被禁用时只保留内存状态
  }
}

/** 安全删除存储键。 */
function removeStorage(adapter: AsterThemeStorage | null, key: string) {
  if (!adapter) return;
  try {
    if (adapter.removeItem) {
      adapter.removeItem(key);
    } else {
      adapter.setItem(key, "");
    }
  } catch {
    // 忽略受限存储环境
  }
}

/** 系统当前是否深色。 */
function systemPrefersDark() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** 读取系统深色状态的可订阅来源（首帧固定为 `"light"` 以保证 SSR `hydrateRoot` 零水合失配，客户端绘制前同步校准）。 */
function useSystemTheme(): AsterResolvedTheme {
  const [dark, setDark] = useState<AsterResolvedTheme>("light");
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setDark(media.matches ? "dark" : "light");
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return dark;
}

/** 追踪全局键盘 / 指针输入模态，驱动 `.af[data-modality="keyboard"]` 焦点外圈。 */
function useInputModality(): AsterInputModality {
  const [modality, setModality] = useState<AsterInputModality>("pointer");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.altKey || event.ctrlKey) return;
      if (
        event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        setModality("keyboard");
      }
    };
    const onPointerDown = () => {
      setModality("pointer");
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);
  return modality;
}

const SAFE_HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const SAFE_FUNC_COLOR_RE =
  /^(?:rgba?|hsla?|oklch)\(\s*(?:[-+]?(?:\d+\.?\d*|\.\d+)(?:%|deg|rad|grad|turn)?|none)(?:\s*(?:,|\s)\s*(?:[-+]?(?:\d+\.?\d*|\.\d+)(?:%|deg|rad|grad|turn)?|none)){2}(?:\s*(?:,|\/)\s*(?:[-+]?(?:\d+\.?\d*|\.\d+)%?|none))?\s*\)$/i;

function isValidAccentValue(trimmed: string): boolean {
  return isAsterAccentPreset(trimmed) || SAFE_HEX_COLOR_RE.test(trimmed) || SAFE_FUNC_COLOR_RE.test(trimmed);
}

/** 合法 CSS 强调色纯正则白名单校验（Node SSR 与浏览器端 100% 判定一致）：支持内置预设、`#hex`、`rgb/rgba/hsl/hsla/oklch(...)`。 */
function normalizeAccent(value: string | null | undefined, fallback: string): string {
  const safeFallback = (() => {
    const fb = fallback.trim();
    return fb && isValidAccentValue(fb) ? fb : "blue";
  })();
  if (!value) return safeFallback;
  const trimmed = value.trim();
  if (!trimmed) return safeFallback;
  return isValidAccentValue(trimmed) ? trimmed : safeFallback;
}

/** 读取 URL 中的主题模式。 */
export function readThemeUrlMode(value: string | null): AsterThemeMode | undefined {
  return value === "light" || value === "dark" || value === "system" ? value : undefined;
}

export type AsterThemeProviderProps = {
  /** 子树。 */
  children: ReactNode;
  /** 默认模式；未给出受控值 / URL / 本地存储时使用，默认跟随系统。 */
  defaultMode?: AsterThemeMode;
  /** 默认强调色，默认 blue。 */
  defaultAccent?: string;
  /** 默认界面密度，默认 comfortable。 */
  defaultDensity?: AsterDensity;
  /** 默认圆角档位，默认 md。 */
  defaultRadius?: AsterRadiusScale;
  /** URL 等显式传入的初始模式，优先级高于本地存储。 */
  initialMode?: AsterThemeMode;
  /** URL 等显式传入的初始强调色，优先级高于本地存储。 */
  initialAccent?: string;
  /** URL 等显式传入的初始界面密度，优先级高于本地存储。 */
  initialDensity?: AsterDensity;
  /** URL 等显式传入的初始圆角档位，优先级高于本地存储。 */
  initialRadius?: AsterRadiusScale;
  /** 受控主题模式（多窗口 IPC 同步场景推荐）。 */
  mode?: AsterThemeMode;
  /** 受控强调色（预设名或任意合法 CSS 颜色）。 */
  accent?: string;
  /** 受控界面密度。 */
  density?: AsterDensity;
  /** 受控圆角档位。 */
  radius?: AsterRadiusScale;
  /** 受控当前激活主题 id（传 `null` 表示清空激活预设）。 */
  activeThemeId?: string | null;
  /** 受控自定义主题列表。 */
  customThemes?: AsterThemePresetItem[];
  /** 主题状态变更回调（供多窗口宿主回写 IPC 或配置中心）。 */
  onChange?: (snapshot: AsterThemeSnapshot) => void;
  /**
   * 透明窗口画布模式（默认 `false`）：
   * 设为 `true` 时根节点画布与 `--af-canvas` 置为 `transparent`，同时保持 `.af-portal-root` 内浮层与弹窗为实色背景。
   */
  transparent?: boolean;
  /**
   * 主题属性挂载目标（默认 `"scope"`）：
   * - `"scope"`：仅挂载在包裹容器 `.af` 上，支持局部舞台与双主题嵌套；
   * - `"document"`：额外同步 `.af`、`data-theme` / `data-af-theme`、强调色与自定义令牌至 `document.documentElement`。
   */
  target?: AsterThemeTarget;
  /**
   * 主题持久化适配器：
   * - 默认使用 `window.localStorage`；
   * - 传入 `false` 时彻底禁用本地存储读写与 `storage` 事件监听（完全交由外部 IPC 接管）；
   * - 也可传入自定义 `AsterThemeStorage`。
   */
  storage?: AsterThemeStorage | false;
  /** 是否监听跨窗口浏览器 `localStorage` 主题同步（默认 `true`；当 `storage={false}` 或自定义存储时自动关闭）。 */
  syncStorage?: boolean;
  /** 是否在当前主题根内挂载全局 `AfMessageHost`（默认仅顶层 Provider 挂载，嵌套局部 Provider 自动跳过以避免重复吐司）。 */
  messageHost?: boolean;
  /** 是否在当前主题根内挂载全局 `AfModalHost`（默认仅顶层 Provider 挂载，承载 `afModal` / `AfModal.confirm` 命令式对话框）。 */
  modalHost?: boolean;
  /** 外部注入附加预设主题。 */
  presets?: AsterThemePresetItem[];
  /** 追加到主题根节点的类名。 */
  className?: string;
  /** 主题根节点额外样式；可放品牌 token 覆盖。 */
  style?: CSSProperties;
  /** 自定义 token 覆盖，例如 `{ "--af-accent": "#..." }`。 */
  tokens?: Record<string, string>;
};

function readCustomThemes(adapter: AsterThemeStorage | null): AsterThemePresetItem[] {
  const raw = readStorage(adapter, CUSTOM_THEMES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Aster UI 主题根：
 * - light / dark / system 三模式 + `density` 密度 + `radius` 圆角 + 多套预设/自定义主题持久化与跨窗口同步；
 * - 支持 `transparent` 透明窗口画布、`target="document"` 根文档同步、`storage={false}` 纯 IPC 托管模式；
 * - 强调色预设 + 任意 CSS 颜色自定义（color-mix 自动推导 ink / soft / focus 层级）；
 * - 自动追踪键盘 / 指针输入模态（`data-modality`）；
 * - 内置全屏 `.af-portal-root` 浮层宿主与全局顶部 `AfMessageHost`，并向同窗口隔离插件暴露响应式桥接。
 */
export function AsterThemeProvider({
  children,
  defaultMode = "system",
  defaultAccent = "blue",
  defaultDensity = "comfortable",
  defaultRadius = "md",
  initialMode,
  initialAccent,
  initialDensity,
  initialRadius,
  mode: controlledMode,
  accent: controlledAccent,
  density: controlledDensity,
  radius: controlledRadius,
  activeThemeId: controlledActiveThemeId,
  customThemes: controlledCustomThemes,
  onChange,
  transparent = false,
  target = "scope",
  storage,
  syncStorage = true,
  messageHost,
  modalHost,
  presets = ASTER_THEME_PRESETS,
  className,
  style,
  tokens,
}: AsterThemeProviderProps) {
  const parentTheme = useContext(ThemeContext);
  const instanceIdRef = useRef<symbol | null>(null);
  if (!instanceIdRef.current) {
    instanceIdRef.current = Symbol("AsterThemeProviderInstance");
  }
  const instanceId = instanceIdRef.current;

  const storageAdapter = useMemo(() => resolveStorageAdapter(storage), [storage]);
  const storageAdapterRef = useRef(storageAdapter);
  storageAdapterRef.current = storageAdapter;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const systemTheme = useSystemTheme();
  const modality = useInputModality();
  const [modeState, setModeState] = useState<AsterThemeMode>(() => controlledMode ?? initialMode ?? defaultMode);
  const [accentState, setAccentState] = useState<string>(() =>
    normalizeAccent(controlledAccent ?? initialAccent, defaultAccent),
  );
  const [densityState, setDensityState] = useState<AsterDensity>(
    () => controlledDensity ?? initialDensity ?? defaultDensity,
  );
  const [radiusState, setRadiusState] = useState<AsterRadiusScale>(
    () => controlledRadius ?? initialRadius ?? defaultRadius,
  );
  const [customThemesState, setCustomThemesState] = useState<AsterThemePresetItem[]>(() => controlledCustomThemes ?? []);
  const [activeThemeIdState, setActiveThemeIdState] = useState<string | undefined>(() =>
    controlledActiveThemeId === null ? undefined : controlledActiveThemeId,
  );
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const mode = controlledMode ?? modeState;
  const accent = controlledAccent !== undefined ? normalizeAccent(controlledAccent, defaultAccent) : accentState;
  const density = controlledDensity ?? densityState;
  const radius = controlledRadius ?? radiusState;
  const customThemes = controlledCustomThemes ?? customThemesState;
  const activeThemeId =
    controlledActiveThemeId !== undefined ? (controlledActiveThemeId ?? undefined) : activeThemeIdState;

  const resolved: AsterResolvedTheme = resolveAsterThemeColorScheme(mode, systemTheme === "dark");
  const isPresetAccent = isAsterAccentPreset(accent);
  const isPrimaryHost = target === "document" || parentTheme === null;
  const shouldRenderMessageHost = messageHost ?? parentTheme === null;
  const shouldRenderModalHost = modalHost ?? parentTheme === null;

  const emitSnapshot = useCallback(
    (patch: Partial<Omit<AsterThemeSnapshot, "resolved" | "transparent">>) => {
      if (!onChangeRef.current) return;
      const nextMode = patch.mode ?? mode;
      const nextResolved = resolveAsterThemeColorScheme(nextMode, systemTheme === "dark");
      onChangeRef.current({
        mode: nextMode,
        resolved: nextResolved,
        accent: patch.accent ?? accent,
        density: patch.density ?? density,
        radius: patch.radius ?? radius,
        activeThemeId: "activeThemeId" in patch ? patch.activeThemeId : activeThemeId,
        customThemes: patch.customThemes ?? customThemes,
        transparent,
      });
    },
    [mode, systemTheme, accent, density, radius, activeThemeId, customThemes, transparent],
  );

  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined" || !storageAdapter) return;
    if (controlledMode === undefined && !initialMode) {
      const storedMode = readStorage(storageAdapter, MODE_KEY);
      if (storedMode === "light" || storedMode === "dark" || storedMode === "system") {
        setModeState(storedMode);
      }
    }
    if (controlledAccent === undefined && !initialAccent) {
      const storedAccent = readStorage(storageAdapter, ACCENT_KEY);
      if (storedAccent) {
        setAccentState(normalizeAccent(storedAccent, defaultAccent));
      }
    }
    if (controlledDensity === undefined && !initialDensity) {
      const storedDensity = readStorage(storageAdapter, DENSITY_KEY);
      if (storedDensity === "comfortable" || storedDensity === "compact") {
        setDensityState(storedDensity);
      }
    }
    if (controlledRadius === undefined && !initialRadius) {
      const storedRadius = readStorage(storageAdapter, RADIUS_KEY);
      if (storedRadius === "sm" || storedRadius === "md" || storedRadius === "lg") {
        setRadiusState(storedRadius);
      }
    }
    if (controlledCustomThemes === undefined) {
      const storedThemes = readCustomThemes(storageAdapter);
      if (storedThemes.length > 0) {
        setCustomThemesState(storedThemes);
      }
    }
    if (controlledActiveThemeId === undefined) {
      const storedActive = readStorage(storageAdapter, ACTIVE_THEME_KEY);
      if (storedActive) {
        setActiveThemeIdState(storedActive);
      }
    }
  }, [storageAdapter]);

  const themes = useMemo(() => [...presets, ...customThemes], [presets, customThemes]);

  const setMode = useCallback(
    (next: AsterThemeMode) => {
      if (controlledMode === undefined) {
        setModeState(next);
      }
      writeStorage(storageAdapterRef.current, MODE_KEY, next);
      emitSnapshot({ mode: next });
    },
    [controlledMode, emitSnapshot],
  );

  const setAccent = useCallback(
    (next: string) => {
      const normalized = normalizeAccent(next, defaultAccent);
      if (controlledAccent === undefined) {
        setAccentState(normalized);
      }
      writeStorage(storageAdapterRef.current, ACCENT_KEY, normalized);
      emitSnapshot({ accent: normalized });
    },
    [controlledAccent, defaultAccent, emitSnapshot],
  );

  const setDensity = useCallback(
    (next: AsterDensity) => {
      if (controlledDensity === undefined) {
        setDensityState(next);
      }
      writeStorage(storageAdapterRef.current, DENSITY_KEY, next);
      emitSnapshot({ density: next });
    },
    [controlledDensity, emitSnapshot],
  );

  const setRadius = useCallback(
    (next: AsterRadiusScale) => {
      if (controlledRadius === undefined) {
        setRadiusState(next);
      }
      writeStorage(storageAdapterRef.current, RADIUS_KEY, next);
      emitSnapshot({ radius: next });
    },
    [controlledRadius, emitSnapshot],
  );

  const setActiveThemeId = useCallback(
    (id?: string) => {
      if (controlledActiveThemeId === undefined) {
        setActiveThemeIdState(id);
      }
      if (id) writeStorage(storageAdapterRef.current, ACTIVE_THEME_KEY, id);
      else removeStorage(storageAdapterRef.current, ACTIVE_THEME_KEY);
      emitSnapshot({ activeThemeId: id });
    },
    [controlledActiveThemeId, emitSnapshot],
  );

  const applyTheme = useCallback(
    (payload: ThemePanelApplyPayload) => {
      const nextMode = payload.mode ?? mode;
      const nextAccent = payload.accent ? normalizeAccent(payload.accent, defaultAccent) : accent;
      const nextDensity = payload.density ?? density;
      const nextRadius = payload.radius ?? radius;
      const nextActiveId = "id" in payload ? payload.id : activeThemeId;

      if (payload.mode) {
        if (controlledMode === undefined) setModeState(payload.mode);
        writeStorage(storageAdapterRef.current, MODE_KEY, payload.mode);
      }
      if (payload.accent) {
        if (controlledAccent === undefined) setAccentState(nextAccent);
        writeStorage(storageAdapterRef.current, ACCENT_KEY, nextAccent);
      }
      if (payload.density) {
        if (controlledDensity === undefined) setDensityState(payload.density);
        writeStorage(storageAdapterRef.current, DENSITY_KEY, payload.density);
      }
      if (payload.radius) {
        if (controlledRadius === undefined) setRadiusState(payload.radius);
        writeStorage(storageAdapterRef.current, RADIUS_KEY, payload.radius);
      }
      if ("id" in payload) {
        if (controlledActiveThemeId === undefined) setActiveThemeIdState(payload.id);
        if (payload.id) writeStorage(storageAdapterRef.current, ACTIVE_THEME_KEY, payload.id);
        else removeStorage(storageAdapterRef.current, ACTIVE_THEME_KEY);
      }

      emitSnapshot({
        mode: nextMode,
        accent: nextAccent,
        density: nextDensity,
        radius: nextRadius,
        activeThemeId: nextActiveId,
      });
    },
    [
      mode,
      accent,
      defaultAccent,
      density,
      radius,
      activeThemeId,
      controlledMode,
      controlledAccent,
      controlledDensity,
      controlledRadius,
      controlledActiveThemeId,
      emitSnapshot,
    ],
  );

  const saveTheme = useCallback(
    (payload: ThemePanelSavePayload): AsterThemePresetItem => {
      const targetAccent = normalizeAccent(payload.accent ?? accent, defaultAccent);
      const targetMode = payload.mode ?? mode;
      const targetDensity = payload.density ?? density;
      const targetRadius = payload.radius ?? radius;
      const accentHex = isAsterAccentPreset(targetAccent) ? ASTER_ACCENT_HEX_MAP[targetAccent] : targetAccent;
      const id = payload.id ?? `custom-${Date.now()}`;
      const record: AsterThemePresetItem = {
        id,
        name: payload.name.trim() || "自定义主题",
        mode: targetMode,
        accent: targetAccent,
        accentHex,
        density: targetDensity,
        radius: targetRadius,
        builtin: false,
      };
      const idx = customThemes.findIndex((t) => t.id === id);
      const nextList = idx >= 0 ? customThemes.map((t, i) => (i === idx ? record : t)) : [...customThemes, record];
      if (controlledCustomThemes === undefined) {
        setCustomThemesState(nextList);
      }
      if (controlledActiveThemeId === undefined) {
        setActiveThemeIdState(id);
      }
      writeStorage(storageAdapterRef.current, CUSTOM_THEMES_KEY, JSON.stringify(nextList));
      writeStorage(storageAdapterRef.current, ACTIVE_THEME_KEY, id);
      emitSnapshot({ customThemes: nextList, activeThemeId: id });
      return record;
    },
    [
      accent,
      defaultAccent,
      mode,
      density,
      radius,
      customThemes,
      controlledCustomThemes,
      controlledActiveThemeId,
      emitSnapshot,
    ],
  );

  const deleteTheme = useCallback(
    (id: string) => {
      const nextList = customThemes.filter((t) => t.id !== id);
      const nextActive = activeThemeId === id ? undefined : activeThemeId;
      if (controlledCustomThemes === undefined) {
        setCustomThemesState(nextList);
      }
      writeStorage(storageAdapterRef.current, CUSTOM_THEMES_KEY, JSON.stringify(nextList));
      if (activeThemeId === id) {
        if (controlledActiveThemeId === undefined) {
          setActiveThemeIdState(undefined);
        }
        removeStorage(storageAdapterRef.current, ACTIVE_THEME_KEY);
      }
      emitSnapshot({ customThemes: nextList, activeThemeId: nextActive });
    },
    [customThemes, activeThemeId, controlledCustomThemes, controlledActiveThemeId, emitSnapshot],
  );

  const cycleMode = useCallback(() => {
    setMode(mode === "light" ? "dark" : mode === "dark" ? "system" : "light");
  }, [mode, setMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    return installAfListHover(document);
  }, []);

  const usesBrowserLocalStorage = storage === undefined;

  useEffect(() => {
    if (!syncStorage || !usesBrowserLocalStorage || typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (
        controlledMode === undefined &&
        event.key === MODE_KEY &&
        (event.newValue === "light" || event.newValue === "dark" || event.newValue === "system")
      ) {
        setModeState(event.newValue);
      } else if (controlledAccent === undefined && event.key === ACCENT_KEY && event.newValue) {
        setAccentState(normalizeAccent(event.newValue, defaultAccent));
      } else if (
        controlledDensity === undefined &&
        event.key === DENSITY_KEY &&
        (event.newValue === "comfortable" || event.newValue === "compact")
      ) {
        setDensityState(event.newValue);
      } else if (
        controlledRadius === undefined &&
        event.key === RADIUS_KEY &&
        (event.newValue === "sm" || event.newValue === "md" || event.newValue === "lg")
      ) {
        setRadiusState(event.newValue);
      } else if (controlledCustomThemes === undefined && event.key === CUSTOM_THEMES_KEY) {
        setCustomThemesState(readCustomThemes(browserLocalStorageAdapter));
      } else if (controlledActiveThemeId === undefined && event.key === ACTIVE_THEME_KEY) {
        setActiveThemeIdState(event.newValue ?? undefined);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [
    syncStorage,
    usesBrowserLocalStorage,
    defaultAccent,
    controlledMode,
    controlledAccent,
    controlledDensity,
    controlledRadius,
    controlledCustomThemes,
    controlledActiveThemeId,
  ]);

  const appliedDocTokenKeysRef = useRef<Map<string, string>>(new Map());

  useIsomorphicLayoutEffect(() => {
    if (target !== "document" || typeof document === "undefined") return;
    const docEl = document.documentElement;
    if (documentOwnerStore.owners.size === 0) {
      const attrs: Record<string, string | null> = {};
      for (const attr of DOC_SYNC_ATTRS) {
        attrs[attr] = docEl.getAttribute(attr);
      }
      const accentProps: Record<string, string> = {};
      for (const prop of INLINE_ACCENT_PROPS) {
        accentProps[prop] = docEl.style.getPropertyValue(prop);
      }
      documentOwnerStore.baseline = {
        hadAfClass: docEl.classList.contains("af"),
        attrs,
        colorScheme: docEl.style.colorScheme,
        accentProps,
      };
    }
    documentOwnerStore.owners.add(instanceId);
    docEl.classList.add("af");

    return () => {
      documentOwnerStore.owners.delete(instanceId);
      for (const [key, prevVal] of appliedDocTokenKeysRef.current.entries()) {
        if (prevVal) docEl.style.setProperty(key, prevVal);
        else docEl.style.removeProperty(key);
      }
      appliedDocTokenKeysRef.current.clear();

      if (documentOwnerStore.owners.size === 0 && documentOwnerStore.baseline) {
        const base = documentOwnerStore.baseline;
        if (!base.hadAfClass) {
          docEl.classList.remove("af");
        }
        for (const attr of DOC_SYNC_ATTRS) {
          const prev = base.attrs[attr];
          if (prev === null || prev === undefined) docEl.removeAttribute(attr);
          else docEl.setAttribute(attr, prev);
        }
        docEl.style.colorScheme = base.colorScheme;
        for (const prop of INLINE_ACCENT_PROPS) {
          const prev = base.accentProps[prop];
          if (prev) docEl.style.setProperty(prop, prev);
          else docEl.style.removeProperty(prop);
        }
        documentOwnerStore.baseline = null;
      }
    };
  }, [target, instanceId]);

  useIsomorphicLayoutEffect(() => {
    if (target !== "document" || typeof document === "undefined") return;
    const docEl = document.documentElement;
    docEl.classList.add("af");
    docEl.dataset.modality = modality;
    applyAsterTheme(
      docEl,
      {
        mode,
        accent,
        density,
        radius,
        transparent,
      },
      resolved === "dark",
    );

    const prevApplied = appliedDocTokenKeysRef.current;
    const nextKeys = new Set(tokens ? Object.keys(tokens) : []);
    for (const [oldKey, prevVal] of prevApplied.entries()) {
      if (!nextKeys.has(oldKey)) {
        if (prevVal) docEl.style.setProperty(oldKey, prevVal);
        else docEl.style.removeProperty(oldKey);
        prevApplied.delete(oldKey);
      }
    }
    if (tokens) {
      for (const [key, val] of Object.entries(tokens)) {
        if (!prevApplied.has(key)) {
          prevApplied.set(key, docEl.style.getPropertyValue(key));
        }
        docEl.style.setProperty(key, val);
      }
    }
  }, [target, mode, resolved, modality, accent, density, radius, transparent, tokens]);

  const accentVars: Record<string, string> = isPresetAccent
    ? {}
    : {
        "--af-accent": accent,
        "--af-accent-ink": `color-mix(in srgb, ${accent} 78%, var(--af-page-strong))`,
        "--af-accent-soft": `color-mix(in srgb, ${accent} 12%, transparent)`,
        "--af-focus": `color-mix(in srgb, ${accent} 50%, transparent)`,
      };

  const transparentVars: CSSProperties = transparent
    ? {
        background: "transparent",
        backgroundColor: "transparent",
      }
    : {};

  const value = useMemo<AsterThemeContextValue>(
    () => ({
      mode,
      resolved,
      colorScheme: resolved,
      modality,
      accent,
      isPresetAccent,
      density,
      radius,
      transparent,
      target,
      themes,
      activeThemeId,
      setMode,
      setAccent,
      setDensity,
      setRadius,
      applyTheme,
      saveTheme,
      deleteTheme,
      setActiveThemeId,
      cycleMode,
      container,
      portalRoot,
    }),
    [
      mode,
      resolved,
      modality,
      accent,
      isPresetAccent,
      density,
      radius,
      transparent,
      target,
      themes,
      activeThemeId,
      setMode,
      setAccent,
      setDensity,
      setRadius,
      applyTheme,
      saveTheme,
      deleteTheme,
      setActiveThemeId,
      cycleMode,
      container,
      portalRoot,
    ],
  );

  useIsomorphicLayoutEffect(() => {
    if (!isPrimaryHost) return;
    return publishAsterHostTheme(instanceId, value);
  }, [isPrimaryHost, instanceId, value]);

  useIsomorphicLayoutEffect(() => {
    if (!isPrimaryHost || !portalRoot) return;
    return registerAfHostPortalRoot(portalRoot);
  }, [isPrimaryHost, portalRoot]);

  const resolvedAccentAttr = isPresetAccent ? accent : "custom";

  return (
    <ThemeContext.Provider value={value}>
      <AfThemePortalContext.Provider value={portalRoot}>
        <div
          ref={setContainer}
          className={["af", className].filter(Boolean).join(" ")}
          data-theme={resolved}
          data-af-theme={resolved}
          data-mode={mode}
          data-af-mode={mode}
          data-modality={modality}
          data-density={density}
          data-af-density={density}
          data-radius={radius}
          data-af-radius={radius}
          data-accent={resolvedAccentAttr}
          data-af-accent={resolvedAccentAttr}
          data-af-target={target}
          data-af-transparent={transparent ? "true" : undefined}
          style={{
            colorScheme: resolved,
            ...accentVars,
            ...transparentVars,
            ...tokens,
            ...style,
          }}
        >
          {children}
          <div ref={setPortalRoot} className="af-portal-root" data-af-portal-root />
          {shouldRenderMessageHost ? <AfMessageHost container={portalRoot} /> : null}
          {shouldRenderModalHost ? <AfModalHost container={portalRoot} /> : null}
        </div>
      </AfThemePortalContext.Provider>
    </ThemeContext.Provider>
  );
}

/** 读取当前主题；优先读取最近 React 树 Context，隔离插件根下自动回退至同窗口主宿主桥接。 */
export function useAsterTheme(): AsterThemeContextValue {
  const context = useContext(ThemeContext);
  const hostContext = useSyncExternalStore(subscribeAsterHostTheme, getAsterHostTheme, getServerHostThemeSnapshot);
  const resolved = context ?? hostContext;
  if (!resolved) throw new Error("useAsterTheme 必须在 AsterThemeProvider 内使用");
  return resolved;
}

/** 读取当前主题；没有 Provider 且无同窗口宿主时返回 null，便于通用组件可选接入。 */
export function useAsterThemeOptional(): AsterThemeContextValue | null {
  const context = useContext(ThemeContext);
  const hostContext = useSyncExternalStore(subscribeAsterHostTheme, getAsterHostTheme, getServerHostThemeSnapshot);
  return context ?? hostContext;
}

/** 历史宿主迁移兼容别名。 */
export const ThemeProvider = AsterThemeProvider;
export const useTheme = useAsterTheme;
export const applyTheme = applyAsterTheme;
export const resolveThemeColors = resolveAsterThemeColors;
