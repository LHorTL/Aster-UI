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
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

function getGlobalSingleton<T>(key: string, create: () => T): T {
  const sym = Symbol.for(key);
  const g = globalThis as Record<symbol, unknown>;
  if (!(sym in g)) {
    g[sym] = create();
  }
  return g[sym] as T;
}

/**
 * 局部舞台浮层挂载上下文（跨 ESM / CJS / runtime 子路径与插件共享全局单例）：
 * 当组件位于 Showcase 演示舞台（`.af-gal-stage`）或自定义窗口框（`AfWindowFrame`）内时，
 * 由外层显式注入边界容器，让浮层局限在该容器内定位与翻转。
 */
export const AfLayerContext: Context<HTMLElement | null> = getGlobalSingleton(
  "aster-ui.AfLayerContext.v1",
  () => createContext<HTMLElement | null>(null),
);

/** 局部浮层容器 Provider。 */
export const AfLayerProvider = AfLayerContext.Provider;

/** 由 AsterThemeProvider 注入的全局主题浮层根上下文（跨运行时与插件共享全局单例）。 */
export const AfThemePortalContext: Context<HTMLElement | null> = getGlobalSingleton(
  "aster-ui.AfThemePortalContext.v1",
  () => createContext<HTMLElement | null>(null),
);

type HostPortalBridgeStore = {
  stack: HTMLElement[];
  listeners: Set<() => void>;
  fallbackPortalNode: HTMLDivElement | null;
};

const hostPortalBridge = getGlobalSingleton<HostPortalBridgeStore>("aster-ui.HostPortalBridge.v1", () => ({
  stack: [],
  listeners: new Set(),
  fallbackPortalNode: null,
}));

function emitHostPortalChange() {
  hostPortalBridge.listeners.forEach((fn) => fn());
}

/** 注册当前窗口的主 `<AsterThemeProvider>` `.af-portal-root` 宿主，供隔离 `createRoot` 插件自动复用。 */
export function registerAfHostPortalRoot(node: HTMLElement | null): () => void {
  if (!node) return () => {};
  hostPortalBridge.stack = [...hostPortalBridge.stack.filter((el) => el !== node), node];
  emitHostPortalChange();
  return () => {
    const prevLen = hostPortalBridge.stack.length;
    hostPortalBridge.stack = hostPortalBridge.stack.filter((el) => el !== node);
    if (hostPortalBridge.stack.length !== prevLen) {
      emitHostPortalChange();
    }
  };
}

/** 读取当前文档内最近注册且仍在 DOM 树中的主主题浮层根。 */
export function getAfHostPortalRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  for (let i = hostPortalBridge.stack.length - 1; i >= 0; i -= 1) {
    const candidate = hostPortalBridge.stack[i];
    if (candidate && candidate.ownerDocument === document && candidate.isConnected) {
      return candidate;
    }
  }
  return null;
}

/** 订阅主主题浮层根的挂载与切换通知。 */
export function subscribeAfHostPortalRoot(listener: () => void): () => void {
  hostPortalBridge.listeners.add(listener);
  return () => {
    hostPortalBridge.listeners.delete(listener);
  };
}

function getServerPortalSnapshot(): HTMLElement | null {
  return null;
}

function syncFallbackPortalTheme(el: HTMLElement) {
  if (typeof document === "undefined") return;
  const docEl = document.documentElement;
  const docTheme = docEl.getAttribute("data-af-theme") ?? docEl.getAttribute("data-theme");
  const resolved = docTheme === "dark" ? "dark" : "light";
  el.setAttribute("data-theme", resolved);
  el.setAttribute("data-af-theme", resolved);
  const docAccent = docEl.getAttribute("data-af-accent") ?? docEl.getAttribute("data-accent");
  if (docAccent) {
    el.setAttribute("data-accent", docAccent);
    el.setAttribute("data-af-accent", docAccent);
  }
}

/**
 * 当组件既未包裹 `AfLayerProvider` 也未包裹 `AsterThemeProvider` 时（例如裸单测或渐进接入页面），
 * 在 `document.body` 上惰性创建复用的 `.af.af-portal-root` 宿主，确保任何浮层绝不静默返回 `null`。
 */
export function ensureFallbackPortalRoot(): HTMLElement | null {
  if (typeof document === "undefined" || !document.body) return null;
  if (hostPortalBridge.fallbackPortalNode && document.body.contains(hostPortalBridge.fallbackPortalNode)) {
    syncFallbackPortalTheme(hostPortalBridge.fallbackPortalNode);
    return hostPortalBridge.fallbackPortalNode;
  }
  const existing = document.body.querySelector<HTMLDivElement>("[data-af-fallback-portal='true']");
  if (existing) {
    syncFallbackPortalTheme(existing);
    hostPortalBridge.fallbackPortalNode = existing;
    return existing;
  }
  const el = document.createElement("div");
  el.className = "af af-portal-root";
  el.setAttribute("data-theme", "light");
  el.setAttribute("data-af-theme", "light");
  el.setAttribute("data-af-fallback-portal", "true");
  syncFallbackPortalTheme(el);
  document.body.appendChild(el);
  hostPortalBridge.fallbackPortalNode = el;
  return el;
}

/**
 * 解析当前浮层应当挂载的宿主容器，优先级：
 * 1. 调用方显式传入的 `explicitContainer`；
 * 2. 最近的局部 `<AfLayerProvider>` 容器（Showcase 舞台 / WindowFrame）；
 * 3. 当前 React 树 `<AsterThemeProvider>` 内置的 `.af-portal-root`；
 * 4. 同窗口跨独立 `createRoot` 桥接的主 `<AsterThemeProvider>` `.af-portal-root`；
 * 5. `document.body` 上的兜底 `.af.af-portal-root`。
 */
export function useAfLayerContainer(explicitContainer?: HTMLElement | null): HTMLElement | null {
  const scopedLayer = useContext(AfLayerContext);
  const themePortal = useContext(AfThemePortalContext);
  const hostPortal = useSyncExternalStore(subscribeAfHostPortalRoot, getAfHostPortalRoot, getServerPortalSnapshot);
  const resolvedContextTarget = explicitContainer ?? scopedLayer ?? themePortal ?? hostPortal;
  const [fallback, setFallback] = useState<HTMLElement | null>(() => {
    if (resolvedContextTarget) return null;
    return ensureFallbackPortalRoot();
  });

  useEffect(() => {
    if (resolvedContextTarget) return;
    if (!fallback || !fallback.isConnected) {
      setFallback(ensureFallbackPortalRoot());
    }
  }, [resolvedContextTarget, fallback]);

  return resolvedContextTarget ?? fallback;
}

export type AfPortalProps = {
  /** 可选指定挂载容器；省略时自动接入当前 Layer / Theme 浮层根。 */
  container?: HTMLElement | null;
  /** 浮层内容。 */
  children: ReactNode;
};

/** 统一浮层 Portal 组件。 */
export function AfPortal({ container, children }: AfPortalProps) {
  const target = useAfLayerContainer(container);
  if (!target) return null;
  return createPortal(children, target);
}

type OverlayTreeRegister = (getEl: () => HTMLElement | null) => () => void;

const AfOverlayTreeContext: Context<OverlayTreeRegister | null> = getGlobalSingleton(
  "aster-ui.AfOverlayTreeContext.v1",
  () => createContext<OverlayTreeRegister | null>(null),
);

/**
 * 追踪跨 Portal 的 React 逻辑嵌套浮层树：
 * 让父级 Popover / Modal 在子级 Select / ColorPicker / 二级菜单展开时，
 * 既不会因点击子浮层而误触发外部关闭，也不会在按 Escape 时抢先关闭父浮层。
 */
export function useOverlayBranch(selfRef: RefObject<HTMLElement | null>, open: boolean) {
  const parentRegister = useContext(AfOverlayTreeContext);
  const childrenRef = useRef<Set<() => HTMLElement | null>>(new Set());

  const register = useCallback<OverlayTreeRegister>(
    (getChildEl) => {
      childrenRef.current.add(getChildEl);
      const unregisterParent = parentRegister ? parentRegister(getChildEl) : null;
      return () => {
        childrenRef.current.delete(getChildEl);
        unregisterParent?.();
      };
    },
    [parentRegister],
  );

  useEffect(() => {
    if (!open || !parentRegister) return;
    return parentRegister(() => selfRef.current);
  }, [open, parentRegister, selfRef]);

  const containsNode = useCallback(
    (node: Node | null): boolean => {
      if (!node) return false;
      if (selfRef.current?.contains(node)) return true;
      for (const getChild of childrenRef.current) {
        const el = getChild();
        if (el?.contains(node)) return true;
      }
      return false;
    },
    [selfRef],
  );

  const hasOpenChild = useCallback((): boolean => {
    for (const getChild of childrenRef.current) {
      if (getChild()?.isConnected) return true;
    }
    return false;
  }, []);

  const Provider = useMemo(
    () =>
      function OverlayBranchScope({ children }: { children: ReactNode }) {
        return <AfOverlayTreeContext.Provider value={register}>{children}</AfOverlayTreeContext.Provider>;
      },
    [register],
  );

  return { OverlayBranchScope: Provider, containsNode, hasOpenChild };
}
