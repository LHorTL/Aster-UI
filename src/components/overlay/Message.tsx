import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AfIcon } from "../../icons";
import { prefersReducedMotion, useAfLayerContainer } from "../../primitives";
import { AfSpinner } from "../display/Spinner";

/** 全局轻提示类型。 */
export type AfMessageType = "info" | "success" | "warning" | "error" | "loading";

/** 单条轻提示配置。 */
export type AfMessageOptions = {
  key?: string;
  type?: AfMessageType;
  content: ReactNode;
  duration?: number;
};

type MessageRecord = Required<Pick<AfMessageOptions, "type" | "content">> & {
  key: string;
  duration: number;
  leaving?: boolean;
};

type Listener = (items: MessageRecord[]) => void;

type AfMessageBusStore = {
  listeners: Set<Listener>;
  timers: Map<string, number>;
  exitTimers: Map<string, number>;
  queue: MessageRecord[];
  seq: number;
};

function getMessageBus(): AfMessageBusStore {
  const sym = Symbol.for("aster-ui.AfMessageBus.v1");
  const g = globalThis as Record<symbol, unknown>;
  if (!(sym in g)) {
    g[sym] = {
      listeners: new Set<Listener>(),
      timers: new Map<string, number>(),
      exitTimers: new Map<string, number>(),
      queue: [] as MessageRecord[],
      seq: 0,
    } satisfies AfMessageBusStore;
  }
  return g[sym] as AfMessageBusStore;
}

const bus = getMessageBus();

function emit() {
  const snapshot = [...bus.queue];
  bus.listeners.forEach((fn) => fn(snapshot));
}

function clearKeyTimers(key: string) {
  const timer = bus.timers.get(key);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    bus.timers.delete(key);
  }
  const exitTimer = bus.exitTimers.get(key);
  if (exitTimer !== undefined) {
    window.clearTimeout(exitTimer);
    bus.exitTimers.delete(key);
  }
}

function removeMessageNow(key: string) {
  clearKeyTimers(key);
  const prevLen = bus.queue.length;
  bus.queue = bus.queue.filter((m) => m.key !== key);
  if (bus.queue.length !== prevLen) emit();
}

function dismissMessage(key: string, immediate = false) {
  const timer = bus.timers.get(key);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    bus.timers.delete(key);
  }
  if (immediate || typeof window === "undefined" || prefersReducedMotion()) {
    removeMessageNow(key);
    return;
  }
  const target = bus.queue.find((m) => m.key === key);
  if (!target || target.leaving) return;
  bus.queue = bus.queue.map((m) => (m.key === key ? { ...m, leaving: true } : m));
  emit();
  const exitId = window.setTimeout(() => {
    bus.exitTimers.delete(key);
    const prevLen = bus.queue.length;
    bus.queue = bus.queue.filter((m) => m.key !== key);
    if (bus.queue.length !== prevLen) emit();
  }, 140);
  bus.exitTimers.set(key, exitId);
}

function pushMessage(opts: AfMessageOptions): () => void {
  const key = opts.key ?? `af-msg-${++bus.seq}`;
  const type = opts.type ?? "info";
  const duration = opts.duration ?? (type === "loading" ? 0 : 2800);

  clearKeyTimers(key);

  const record: MessageRecord = { key, type, content: opts.content, duration, leaving: false };
  const idx = bus.queue.findIndex((m) => m.key === key);
  if (idx >= 0) {
    bus.queue = bus.queue.map((m, i) => (i === idx ? record : m));
  } else {
    bus.queue = [...bus.queue.slice(-4), record];
  }
  emit();

  if (duration > 0 && typeof window !== "undefined") {
    const id = window.setTimeout(() => dismissMessage(key), duration);
    bus.timers.set(key, id);
  }
  return () => dismissMessage(key);
}

function normalizeArgs(contentOrOpts: ReactNode | AfMessageOptions, duration?: number): AfMessageOptions {
  if (contentOrOpts && typeof contentOrOpts === "object" && "content" in contentOrOpts) {
    return contentOrOpts as AfMessageOptions;
  }
  return { content: contentOrOpts as ReactNode, duration };
}

/** 命令式顶部轻提示 API（跨 ESM / CJS / runtime 子路径与外部插件共享同一全局队列）。 */
export const afMessage = {
  open: (opts: AfMessageOptions) => pushMessage(opts),
  info: (content: ReactNode | AfMessageOptions, duration?: number) =>
    pushMessage({ ...normalizeArgs(content, duration), type: "info" }),
  success: (content: ReactNode | AfMessageOptions, duration?: number) =>
    pushMessage({ ...normalizeArgs(content, duration), type: "success" }),
  warning: (content: ReactNode | AfMessageOptions, duration?: number) =>
    pushMessage({ ...normalizeArgs(content, duration), type: "warning" }),
  error: (content: ReactNode | AfMessageOptions, duration?: number) =>
    pushMessage({ ...normalizeArgs(content, duration), type: "error" }),
  loading: (content: ReactNode | AfMessageOptions, duration?: number) =>
    pushMessage({ ...normalizeArgs(content, duration), type: "loading" }),
  destroy: (key?: string) => {
    if (key) {
      dismissMessage(key, true);
    } else {
      bus.timers.forEach((id) => window.clearTimeout(id));
      bus.timers.clear();
      bus.exitTimers.forEach((id) => window.clearTimeout(id));
      bus.exitTimers.clear();
      bus.queue = [];
      emit();
    }
  },
};

export const asterMessage = afMessage;

export type AfMessageHostProps = {
  /** 可选指定承载消息浮层的 DOM 容器（通常由 `AsterThemeProvider` 注入）。 */
  container?: HTMLElement | null;
};

const ICON_BY_TYPE: Record<Exclude<AfMessageType, "loading">, "info" | "checkCircle" | "alert" | "xCircle"> = {
  info: "info",
  success: "checkCircle",
  warning: "alert",
  error: "xCircle",
};

/** 顶部居中轻提示宿主：由顶层 `AsterThemeProvider` 自动挂载，也可按需放在局部容器内。 */
export function AfMessageHost({ container }: AfMessageHostProps = {}) {
  const [items, setItems] = useState<MessageRecord[]>(() => [...bus.queue]);
  const resolvedContainer = useAfLayerContainer(container);

  useEffect(() => {
    const onUpdate: Listener = (next) => setItems(next);
    bus.listeners.add(onUpdate);
    setItems([...bus.queue]);
    return () => {
      bus.listeners.delete(onUpdate);
    };
  }, []);

  if (!resolvedContainer || items.length === 0) return null;

  return createPortal(
    <div className="af-message-host" role="status" aria-live="polite" aria-atomic="false">
      {items.map((item) => (
        <div
          key={item.key}
          className="af-message"
          data-type={item.type}
          data-leaving={item.leaving ? "true" : undefined}
        >
          <span className="af-message__icon" data-type={item.type} aria-hidden="true">
            {item.type === "loading" ? <AfSpinner size={14} /> : <AfIcon name={ICON_BY_TYPE[item.type]} size={15} />}
          </span>
          <span className="af-message__text">{item.content}</span>
        </div>
      ))}
    </div>,
    resolvedContainer,
  );
}
