import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type Context,
  type CSSProperties,
  type JSX,
  type ReactNode,
} from "react";
import { afMessage } from "./components/overlay/Message";
import {
  AfLayerContext,
  AfLayerProvider,
  AfThemePortalContext,
  cn,
  ensureFallbackPortalRoot,
  getAfHostPortalRoot,
  subscribeAfHostPortalRoot,
} from "./primitives";
import {
  ASTER_THEME_PRESETS,
  AsterThemeContext,
  getAsterHostTheme,
  subscribeAsterHostTheme,
  type AsterThemeContextValue,
  type AsterThemePresetItem,
} from "./theme";

function getGlobalSingleton<T>(key: string, create: () => T): T {
  const sym = Symbol.for(key);
  const g = globalThis as Record<symbol, unknown>;
  if (!(sym in g)) {
    g[sym] = create();
  }
  return g[sym] as T;
}

type ContainerSource = HTMLElement | null | (() => HTMLElement | null);

function resolveContainerSource(source: ContainerSource | undefined): HTMLElement | null {
  if (!source) return null;
  return typeof source === "function" ? source() : source;
}

/** 宿主向外部化动态插件（IIFE / ESM / 独立 `createRoot`）暴露的共享运行时载荷。 */
export type AsterPluginSharedBundle<TUi = unknown> = {
  /** 插件桥接协议版本。 */
  version: "1";
  /** 宿主可选声明的自身或组件库版本号（用于插件侧兼容性诊断）。 */
  hostVersion?: string;
  /** 宿主可选注入的组件库模块命名空间（供外部化 IIFE/ESM 插件直接消费）。 */
  asterUi?: TUi;
  /** `asterUi` 简写别名。 */
  ui?: TUi;
  /** 宿主共享的 React 核心模块实例。 */
  react?: unknown;
  /** 宿主共享的 ReactDOM 模块实例。 */
  reactDom?: unknown;
  /** 宿主共享的 `react-dom/client` 模块实例。 */
  reactDomClient?: unknown;
  /** 宿主共享的 `react/jsx-runtime` 模块实例。 */
  jsxRuntime?: unknown;
  /** 全局单例 React Context 引用集合。 */
  contexts: {
    AsterThemeContext: Context<AsterThemeContextValue | null>;
    AfLayerContext: Context<HTMLElement | null>;
    AfThemePortalContext: Context<HTMLElement | null>;
  };
  /** 宿主主题快照读取与实时变更订阅接口。 */
  theme: {
    getSnapshot: () => AsterThemeContextValue | null;
    subscribe: (listener: () => void) => () => void;
  };
  /** 宿主浮层与局部舞台容器解析接口。 */
  overlay: {
    getPortalContainer: () => HTMLElement | null;
    getLayerContainer: () => HTMLElement | null;
  };
  /** 与宿主共享同一全局队列的命令式轻提示总线。 */
  message: typeof afMessage;
  /** 供独立 `createRoot` 插件根节点包裹的桥接 Provider。 */
  PluginProvider: (props: AfPluginProviderProps) => JSX.Element;
};

/** `createAsterPluginRuntime` 初始化配置。 */
export type AsterPluginRuntimeOptions<TUi = unknown> = {
  /** 可选注入完整组件库模块对象（例如 `import * as AsterUI from "@fangxinyan/aster-ui/runtime"`）。 */
  ui?: TUi;
  /** 可选声明宿主或组件库版本号。 */
  hostVersion?: string;
  /** 可选注入宿主 `React` 模块引用。 */
  react?: unknown;
  /** 可选注入宿主 `ReactDOM` 模块引用。 */
  reactDom?: unknown;
  /** 可选注入宿主 `react-dom/client` 模块引用。 */
  reactDomClient?: unknown;
  /** 可选注入宿主 `react/jsx-runtime` 模块引用。 */
  jsxRuntime?: unknown;
  /** 显式覆盖插件全局浮层 Portal 容器；省略时自动跟随宿主 `<AsterThemeProvider>` 的 `.af-portal-root`。 */
  portalContainer?: ContainerSource;
  /** 可选指定插件局部定位边界容器（如插件工作区面板）。 */
  layerContainer?: ContainerSource;
  /** 可选挂载至 `globalThis[globalKey]` 的全局共享键名（如 `"__asterPluginShared"`）。 */
  globalKey?: string;
  /** 当提供 `globalKey` 时是否立即挂载至 `globalThis`，默认 `Boolean(globalKey)`。 */
  autoInstall?: boolean;
};

/** 插件运行时实例。 */
export type AsterPluginRuntime<TUi = unknown> = {
  /** 插件桥接协议版本。 */
  readonly version: "1";
  /** 可直接挂载至 `window` 供外部化插件读取的共享对象。 */
  readonly shared: AsterPluginSharedBundle<TUi>;
  /** 读取当前宿主主题上下文快照。 */
  getThemeSnapshot: () => AsterThemeContextValue | null;
  /** 订阅宿主主题变更，返回取消订阅函数。 */
  subscribeTheme: (listener: () => void) => () => void;
  /** 解析插件全局浮层 Portal 容器（优先宿主 `.af-portal-root`）。 */
  getPortalContainer: () => HTMLElement | null;
  /** 解析插件局部定位边界容器。 */
  getLayerContainer: () => HTMLElement | null;
  /** 与宿主共享同一队列的全局轻提示 API。 */
  readonly message: typeof afMessage;
  /** 绑定当前 runtime 的插件 Provider 组件。 */
  PluginProvider: (props: Omit<AfPluginProviderProps, "runtime">) => JSX.Element;
  /** 将任意插件节点包裹在宿主主题与浮层桥接上下文中（适用于隔离 `ReactDOM.createRoot` 挂载）。 */
  wrapElement: (node: ReactNode, pluginId?: string) => JSX.Element;
  /** 将当前 runtime 注册为全局活跃实例，并可选挂载 `shared` 至 `globalThis[globalKey]`；返回卸载恢复函数。 */
  install: (globalKey?: string) => () => void;
  /** 卸载通过 `install` 或 `autoInstall` 注册的全局引用。 */
  destroy: () => void;
  /** `destroy` 标准资源释放别名。 */
  dispose: () => void;
};

type PluginRuntimeRegistryStore = {
  current: AsterPluginRuntime<unknown> | null;
  listeners: Set<() => void>;
};

const runtimeRegistry = getGlobalSingleton<PluginRuntimeRegistryStore>(
  "aster-ui.PluginRuntimeRegistry.v1",
  () => ({
    current: null,
    listeners: new Set(),
  }),
);

function emitRuntimeRegistryChange() {
  runtimeRegistry.listeners.forEach((fn) => fn());
}

function subscribeRuntimeRegistry(listener: () => void): () => void {
  runtimeRegistry.listeners.add(listener);
  return () => {
    runtimeRegistry.listeners.delete(listener);
  };
}

function getRegistrySnapshot(): AsterPluginRuntime<unknown> | null {
  return runtimeRegistry.current;
}

function getServerRegistrySnapshot(): AsterPluginRuntime<unknown> | null {
  return null;
}

function createFallbackPluginTheme(): AsterThemeContextValue {
  const fallbackPreset: AsterThemePresetItem = ASTER_THEME_PRESETS[0] ?? {
    id: "clean-light",
    name: "Clean 浅色蓝",
    mode: "light",
    accent: "blue",
    accentHex: "#0060e2",
    density: "comfortable",
    radius: "md",
    builtin: true,
  };
  return {
    mode: "light",
    resolved: "light",
    colorScheme: "light",
    modality: "pointer",
    accent: "blue",
    isPresetAccent: true,
    density: "comfortable",
    radius: "md",
    transparent: false,
    target: "scope",
    themes: ASTER_THEME_PRESETS,
    activeThemeId: "clean-light",
    container: null,
    portalRoot: null,
    setMode: (next) => getAsterHostTheme()?.setMode(next),
    setAccent: (next) => getAsterHostTheme()?.setAccent(next),
    setDensity: (next) => getAsterHostTheme()?.setDensity(next),
    setRadius: (next) => getAsterHostTheme()?.setRadius(next),
    applyTheme: (payload) => getAsterHostTheme()?.applyTheme(payload),
    saveTheme: (payload) => getAsterHostTheme()?.saveTheme(payload) ?? fallbackPreset,
    deleteTheme: (id) => getAsterHostTheme()?.deleteTheme(id),
    setActiveThemeId: (id) => getAsterHostTheme()?.setActiveThemeId(id),
    cycleMode: () => getAsterHostTheme()?.cycleMode(),
  };
}

const FALLBACK_PLUGIN_THEME = createFallbackPluginTheme();

export const AsterPluginRuntimeContext: Context<AsterPluginRuntime<unknown> | null> =
  getGlobalSingleton("aster-ui.AsterPluginRuntimeContext.v1", () =>
    createContext<AsterPluginRuntime<unknown> | null>(null),
  );

function isSharedBundle(
  value: AsterPluginRuntime<unknown> | AsterPluginSharedBundle<unknown> | null | undefined,
): value is AsterPluginSharedBundle<unknown> {
  return Boolean(value && !("shared" in value) && "overlay" in value && "theme" in value);
}

/** `AfPluginProvider` 组件属性。 */
export type AfPluginProviderProps = {
  /** 插件子树。 */
  children: ReactNode;
  /** 可选指定插件运行时实例或 `window.__pluginShared` 共享载荷；省略时自动读取全局已安装实例或宿主桥接上下文。 */
  runtime?: AsterPluginRuntime<unknown> | AsterPluginSharedBundle<unknown> | null;
  /** 可选指定全局挂载键名（如 `"__asterPluginShared"`）以解析宿主共享运行时。 */
  globalKey?: string;
  /** 可选插件唯一标识（传入时渲染 `.af-plugin-scope[data-af-plugin]` 容器）。 */
  pluginId?: string;
  /** 可选覆盖插件浮层 Portal 容器。 */
  portalContainer?: HTMLElement | null;
  /** 可选覆盖插件局部定位边界容器。 */
  layerContainer?: HTMLElement | null;
  /** 可选容器类名（传入时渲染包裹节点）。 */
  className?: string;
  /** 可选容器内联样式（传入时渲染包裹节点）。 */
  style?: CSSProperties;
};

/**
 * 插件子树桥接容器：
 * 让挂载于同树或独立 `ReactDOM.createRoot` 的动态插件无缝继承宿主窗口的实时主题、
 * `.af-portal-root` 浮层宿主与 `afMessage` 通知队列，杜绝多实例状态分裂。
 */
export function AfPluginProvider(props: AfPluginProviderProps): JSX.Element {
  const {
    children,
    runtime: explicitRuntimeInput,
    globalKey,
    pluginId,
    portalContainer: explicitPortal,
    layerContainer: explicitLayer,
    className,
    style,
  } = props;

  const explicitRuntime = useMemo<AsterPluginRuntime<unknown> | null>(() => {
    if (!explicitRuntimeInput) return null;
    if (isSharedBundle(explicitRuntimeInput)) {
      return createAsterPluginRuntime({
        ui: explicitRuntimeInput.asterUi ?? explicitRuntimeInput.ui,
        hostVersion: explicitRuntimeInput.hostVersion,
        react: explicitRuntimeInput.react,
        reactDom: explicitRuntimeInput.reactDom,
        reactDomClient: explicitRuntimeInput.reactDomClient,
        jsxRuntime: explicitRuntimeInput.jsxRuntime,
        portalContainer: explicitRuntimeInput.overlay.getPortalContainer,
        layerContainer: explicitRuntimeInput.overlay.getLayerContainer,
      });
    }
    return explicitRuntimeInput;
  }, [explicitRuntimeInput]);

  const keyedRuntime = useMemo<AsterPluginRuntime<unknown> | null>(
    () => (globalKey ? getAsterPluginRuntime(globalKey) : null),
    [globalKey],
  );

  const contextRuntime = useContext(AsterPluginRuntimeContext);
  const globalRuntime = useSyncExternalStore(
    subscribeRuntimeRegistry,
    getRegistrySnapshot,
    getServerRegistrySnapshot,
  );
  const resolvedRuntime = explicitRuntime ?? contextRuntime ?? globalRuntime ?? keyedRuntime;

  const parentTheme = useContext(AsterThemeContext);
  const subscribeTheme = useMemo(
    () => (resolvedRuntime ? resolvedRuntime.subscribeTheme : subscribeAsterHostTheme),
    [resolvedRuntime],
  );
  const getTheme = useMemo(
    () => (resolvedRuntime ? resolvedRuntime.getThemeSnapshot : getAsterHostTheme),
    [resolvedRuntime],
  );
  const hostTheme = useSyncExternalStore(subscribeTheme, getTheme, () => null);
  const effectiveTheme = parentTheme ?? hostTheme ?? FALLBACK_PLUGIN_THEME;

  const parentPortal = useContext(AfThemePortalContext);
  const hostPortal = useSyncExternalStore(subscribeAfHostPortalRoot, getAfHostPortalRoot, () => null);
  const runtimePortal = resolvedRuntime ? resolvedRuntime.getPortalContainer() : null;
  const immediatePortal = explicitPortal ?? runtimePortal ?? parentPortal ?? hostPortal;
  const [fallbackPortal, setFallbackPortal] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (immediatePortal) return;
    setFallbackPortal(ensureFallbackPortalRoot());
  }, [immediatePortal]);

  const effectivePortal = immediatePortal ?? fallbackPortal;
  const effectiveLayer = explicitLayer ?? (resolvedRuntime ? resolvedRuntime.getLayerContainer() : null);

  let content: ReactNode =
    pluginId !== undefined || className !== undefined || style !== undefined ? (
      <div className={cn("af-plugin-scope", className)} data-af-plugin={pluginId} style={style}>
        {children}
      </div>
    ) : (
      children
    );

  if (effectiveLayer) {
    content = <AfLayerProvider value={effectiveLayer}>{content}</AfLayerProvider>;
  }

  if (effectivePortal) {
    content = <AfThemePortalContext.Provider value={effectivePortal}>{content}</AfThemePortalContext.Provider>;
  }

  return (
    <AsterPluginRuntimeContext.Provider value={resolvedRuntime}>
      <AsterThemeContext.Provider value={effectiveTheme}>{content}</AsterThemeContext.Provider>
    </AsterPluginRuntimeContext.Provider>
  );
}

/** `AfPluginProvider` 语义化别名。 */
export const AsterPluginProvider = AfPluginProvider;

/** 安装插件运行时至全局注册表（并可选挂载 `shared` 至 `globalThis[globalKey]`）。 */
export function installAsterPluginRuntime<TUi = unknown>(
  runtime: AsterPluginRuntime<TUi>,
  globalKey?: string,
): () => void {
  const g = globalThis as Record<string, unknown>;
  const prevRuntime = runtimeRegistry.current;
  runtimeRegistry.current = runtime as unknown as AsterPluginRuntime<unknown>;
  emitRuntimeRegistryChange();

  const hadPrevGlobal = Boolean(globalKey && Object.prototype.hasOwnProperty.call(g, globalKey));
  const prevGlobalVal = globalKey ? g[globalKey] : undefined;
  if (globalKey) {
    g[globalKey] = runtime.shared;
  }

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    if (globalKey) {
      if (g[globalKey] === runtime.shared) {
        if (hadPrevGlobal) {
          g[globalKey] = prevGlobalVal;
        } else {
          delete g[globalKey];
        }
      }
    }
    if (runtimeRegistry.current === (runtime as unknown as AsterPluginRuntime<unknown>)) {
      runtimeRegistry.current = prevRuntime && prevRuntime !== (runtime as unknown) ? prevRuntime : null;
      emitRuntimeRegistryChange();
    }
  };
}

/** 读取当前已安装的全局插件运行时实例。 */
export function getAsterPluginRuntime<TUi = unknown>(
  globalKey?: string,
): AsterPluginRuntime<TUi> | null {
  if (runtimeRegistry.current) {
    return runtimeRegistry.current as unknown as AsterPluginRuntime<TUi>;
  }
  if (globalKey) {
    const candidate = (globalThis as Record<string, unknown>)[globalKey] as
      | AsterPluginSharedBundle<TUi>
      | undefined;
    if (candidate && candidate.version === "1") {
      return createAsterPluginRuntime({
        ui: candidate.asterUi ?? candidate.ui,
        hostVersion: candidate.hostVersion,
        react: candidate.react,
        reactDom: candidate.reactDom,
        reactDomClient: candidate.reactDomClient,
        jsxRuntime: candidate.jsxRuntime,
        portalContainer: candidate.overlay.getPortalContainer,
        layerContainer: candidate.overlay.getLayerContainer,
      });
    }
  }
  return null;
}

/** 在组件或插件内部读取当前活跃的 `AsterPluginRuntime`。 */
export function useAsterPluginRuntime<TUi = unknown>(): AsterPluginRuntime<TUi> | null {
  const ctx = useContext(AsterPluginRuntimeContext);
  const globalRuntime = useSyncExternalStore(
    subscribeRuntimeRegistry,
    getRegistrySnapshot,
    getServerRegistrySnapshot,
  );
  return ((ctx ?? globalRuntime) as unknown as AsterPluginRuntime<TUi> | null) ?? null;
}

/**
 * 创建宿主与动态插件共享的全局唯一 Aster UI 运行时实例：
 * 统一桥接 `AsterThemeContext`、`.af-portal-root` 浮层宿主与 `afMessage` 轻提示总线。
 */
export function createAsterPluginRuntime<TUi = unknown>(
  options: AsterPluginRuntimeOptions<TUi> = {},
): AsterPluginRuntime<TUi> {
  const {
    ui,
    hostVersion,
    react,
    reactDom,
    reactDomClient,
    jsxRuntime,
    portalContainer,
    layerContainer,
    globalKey,
    autoInstall = Boolean(globalKey),
  } = options;

  let activeDispose: (() => void) | null = null;

  const getPortalContainer = (): HTMLElement | null =>
    resolveContainerSource(portalContainer) ?? getAfHostPortalRoot() ?? ensureFallbackPortalRoot();

  const getLayerContainer = (): HTMLElement | null => resolveContainerSource(layerContainer);

  const getThemeSnapshot = (): AsterThemeContextValue | null => getAsterHostTheme();

  const subscribeTheme = (listener: () => void): (() => void) => subscribeAsterHostTheme(listener);

  let runtime!: AsterPluginRuntime<TUi>;

  const BoundPluginProvider = (providerProps: Omit<AfPluginProviderProps, "runtime">): JSX.Element => (
    <AfPluginProvider
      {...providerProps}
      runtime={runtime as unknown as AsterPluginRuntime<unknown>}
    />
  );

  const shared: AsterPluginSharedBundle<TUi> = {
    version: "1",
    ...(hostVersion !== undefined ? { hostVersion } : {}),
    ...(ui !== undefined ? { asterUi: ui, ui } : {}),
    ...(react !== undefined ? { react } : {}),
    ...(reactDom !== undefined ? { reactDom } : {}),
    ...(reactDomClient !== undefined ? { reactDomClient } : {}),
    ...(jsxRuntime !== undefined ? { jsxRuntime } : {}),
    contexts: {
      AsterThemeContext,
      AfLayerContext,
      AfThemePortalContext,
    },
    theme: {
      getSnapshot: getThemeSnapshot,
      subscribe: subscribeTheme,
    },
    overlay: {
      getPortalContainer,
      getLayerContainer,
    },
    message: afMessage,
    PluginProvider: AfPluginProvider,
  };

  const destroy = () => {
    activeDispose?.();
    activeDispose = null;
  };

  runtime = {
    version: "1",
    shared,
    getThemeSnapshot,
    subscribeTheme,
    getPortalContainer,
    getLayerContainer,
    message: afMessage,
    PluginProvider: BoundPluginProvider,
    wrapElement: (node: ReactNode, pluginId?: string) => (
      <BoundPluginProvider pluginId={pluginId}>{node}</BoundPluginProvider>
    ),
    install: (overrideGlobalKey?: string) => {
      activeDispose?.();
      const uninstall = installAsterPluginRuntime(runtime, overrideGlobalKey ?? globalKey);
      activeDispose = uninstall;
      return () => {
        if (activeDispose === uninstall) {
          activeDispose = null;
        }
        uninstall();
      };
    },
    destroy,
    dispose: destroy,
  };

  if (autoInstall && typeof globalThis !== "undefined") {
    runtime.install(globalKey);
  }

  return runtime;
}
