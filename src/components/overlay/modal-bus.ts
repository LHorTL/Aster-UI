import type { CSSProperties, ReactNode } from "react";
import { prefersReducedMotion } from "../../primitives";
import type { AfButtonProps } from "../controls/Button";

export type AfModalStaticKind = "confirm" | "info" | "success" | "warning" | "error";

/** 命令式对话框配置。 */
export type AfModalStaticOptions = {
  /** 标题。 */
  title: ReactNode;
  /** 说明文案（与 `content` 等效；若为复杂 JSX 将在正文区展示）。 */
  description?: ReactNode;
  /** 正文内容（与 `description` 兼容）。 */
  content?: ReactNode;
  /** 确认按钮文案。 */
  okText?: ReactNode;
  /** `okText` 语义别名。 */
  confirmText?: ReactNode;
  /** 取消按钮文案（`info/success/warning/error` 默认不显示取消按钮，显式传入或提供 `onCancel` 时显示）。 */
  cancelText?: ReactNode;
  /** 主按钮语义色调。 */
  tone?: "primary" | "accent" | "danger";
  /** 确认按钮附加属性。 */
  okButtonProps?: Partial<AfButtonProps>;
  /** 取消按钮附加属性。 */
  cancelButtonProps?: Partial<AfButtonProps>;
  /** 自定义底栏节点或渲染函数（如三按钮选择弹窗）。 */
  footer?: ReactNode | ((api: { close: () => void; destroy: () => void }) => ReactNode);
  /** 点击遮罩是否关闭，默认 false。 */
  maskClosable?: boolean;
  /** 遮罩附加类名。 */
  maskClassName?: string;
  /** 遮罩内联样式。 */
  maskStyle?: CSSProperties;
  /** 面板宽度，默认 420。 */
  width?: number | string;
  /** 面板附加类名。 */
  className?: string;
  /** 确认回调；返回 `false` 或抛出异常时阻止自动关闭。 */
  onOk?: () => unknown | Promise<unknown>;
  /** `onOk` 语义别名。 */
  onConfirm?: () => unknown | Promise<unknown>;
  /** 取消回调。 */
  onCancel?: () => void;
};

/** 命令式对话框句柄：同时支持 `await AfModal.confirm(...)` 与 `dialog.destroy()`。 */
export type AfModalHandle = Promise<boolean> & {
  /** 平滑退场关闭当前对话框（等价于 `close`）。 */
  destroy: () => void;
  /** 平滑退场关闭当前对话框。 */
  close: () => void;
};

/** @internal 内部命令式对话框队列记录。 */
export type StaticModalRecord = AfModalStaticOptions & {
  id: string;
  kind: AfModalStaticKind;
  open: boolean;
  resolve: (confirmed: boolean) => void;
  settled: boolean;
};

/** @internal 内部队列监听函数。 */
export type StaticModalListener = (items: StaticModalRecord[]) => void;

type AfModalBusStore = {
  listeners: Set<StaticModalListener>;
  exitTimers: Map<string, number>;
  queue: StaticModalRecord[];
  seq: number;
};

function getModalBus(): AfModalBusStore {
  const sym = Symbol.for("aster-ui.AfModalBus.v1");
  const g = globalThis as Record<symbol, unknown>;
  if (!(sym in g)) {
    g[sym] = {
      listeners: new Set<StaticModalListener>(),
      exitTimers: new Map<string, number>(),
      queue: [] as StaticModalRecord[],
      seq: 0,
    } satisfies AfModalBusStore;
  }
  return g[sym] as AfModalBusStore;
}

/** @internal 全局唯一命令式对话框状态槽。 */
export const modalBus = getModalBus();

function emitModalBus() {
  const snapshot = [...modalBus.queue];
  modalBus.listeners.forEach((fn) => fn(snapshot));
}

/** @internal 关闭指定命令式对话框并执行退场卸载。 */
export function closeStaticModal(id: string, confirmed: boolean, immediate = false) {
  const target = modalBus.queue.find((item) => item.id === id);
  if (!target) return;
  if (!target.settled) {
    target.settled = true;
    target.resolve(confirmed);
  }
  const existingTimer = modalBus.exitTimers.get(id);
  if (existingTimer !== undefined) {
    window.clearTimeout(existingTimer);
    modalBus.exitTimers.delete(id);
  }
  if (immediate || typeof window === "undefined" || prefersReducedMotion()) {
    modalBus.queue = modalBus.queue.filter((item) => item.id !== id);
    emitModalBus();
    return;
  }
  if (!target.open) return;
  modalBus.queue = modalBus.queue.map((item) => (item.id === id ? { ...item, open: false } : item));
  emitModalBus();
  const timerId = window.setTimeout(() => {
    modalBus.exitTimers.delete(id);
    modalBus.queue = modalBus.queue.filter((item) => item.id !== id);
    emitModalBus();
  }, 180);
  modalBus.exitTimers.set(id, timerId);
}

function openStaticModal(kind: AfModalStaticKind, options: AfModalStaticOptions): AfModalHandle {
  const id = `af-static-modal-${++modalBus.seq}`;
  let resolver: (confirmed: boolean) => void = () => {};
  const promise = new Promise<boolean>((resolve) => {
    resolver = resolve;
  });

  const record: StaticModalRecord = {
    ...options,
    id,
    kind,
    open: true,
    resolve: resolver,
    settled: false,
  };
  modalBus.queue = [...modalBus.queue, record];
  emitModalBus();

  const destroy = () => closeStaticModal(id, false);
  return Object.assign(promise, {
    destroy,
    close: destroy,
  });
}

/** 命令式全局对话框 API（跨 ESM / CJS / runtime 子路径与外部插件共享同一队列）。 */
export const afModal = {
  confirm: (options: AfModalStaticOptions) => openStaticModal("confirm", options),
  info: (options: AfModalStaticOptions) => openStaticModal("info", options),
  success: (options: AfModalStaticOptions) => openStaticModal("success", options),
  warning: (options: AfModalStaticOptions) => openStaticModal("warning", options),
  error: (options: AfModalStaticOptions) => openStaticModal("error", options),
  destroyAll: () => {
    modalBus.exitTimers.forEach((timerId) => window.clearTimeout(timerId));
    modalBus.exitTimers.clear();
    modalBus.queue.forEach((item) => {
      if (!item.settled) {
        item.settled = true;
        item.resolve(false);
      }
    });
    modalBus.queue = [];
    emitModalBus();
  },
};
