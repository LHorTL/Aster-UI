import { useEffect, useRef, type RefObject } from "react";

/** 完整可聚焦交互元素选择器。 */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';

export type UseOverlayFocusTrapOptions = {
  /** 模态层是否处于打开状态。 */
  open: boolean;
  /** 面板根元素引用。 */
  panelRef: RefObject<HTMLElement | null>;
  /** 模态层所在的挂载宿主容器。 */
  container: HTMLElement | null;
  /** 按下 Escape 时的关闭回调。 */
  onClose: () => void;
  /** 关闭后是否把焦点归还给打开前的触发元素，默认 true。 */
  restoreFocus?: boolean;
  /** 是否允许按下 Escape 关闭，默认 true。 */
  closeOnEscape?: boolean;
  /** 若当前模态层内部仍有展开的子浮层，跳过本层 Escape 关闭。 */
  shouldIgnoreEscape?: () => boolean;
};

/**
 * 统一的模态层（Modal / Drawer / AlertDialog / CommandPalette）焦点管理与背景 inert 屏蔽：
 * 1. 打开时记录触发元素，先把焦点移入 `[data-autofocus]` 或首个可聚焦控件，再对不包含当前浮层的背景兄弟节点设置 `inert`；
 * 2. `Tab` / `Shift+Tab` 在面板内循环，不会穿透到背景页面；
 * 3. `Escape` 停止冒泡并只关闭最上层模态框，关闭后将焦点无滚动抖动地归还给触发元素。
 */
export function useOverlayFocusTrap({
  open,
  panelRef,
  container,
  onClose,
  restoreFocus = true,
  closeOnEscape = true,
  shouldIgnoreEscape,
}: UseOverlayFocusTrapOptions) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const closeOnEscapeRef = useRef(closeOnEscape);
  closeOnEscapeRef.current = closeOnEscape;
  const ignoreEscapeRef = useRef(shouldIgnoreEscape);
  ignoreEscapeRef.current = shouldIgnoreEscape;

  useEffect(() => {
    if (!open || !container || typeof document === "undefined") return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const isPointerMode = trigger?.closest(".af")?.getAttribute("data-modality") === "pointer";
    const restoreInert = new Map<HTMLElement, boolean>();

    // 若挂载在全屏固定 `.af-portal-root` 内，则屏蔽 `.af` 主题根下除 `.af-portal-root` 外的业务树；
    // 若挂载在局部舞台容器（如 `.af-gal-stage`）内，则屏蔽该容器下不包含当前面板的兄弟节点。
    const scopeParent =
      container.classList.contains("af-portal-root") && container.parentElement
        ? container.parentElement
        : container;

    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target =
        panel.querySelector<HTMLElement>("[data-autofocus]") ??
        panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
        panel;
      target.focus({ preventScroll: true });

      for (const child of Array.from(scopeParent.children)) {
        if (!(child instanceof HTMLElement)) continue;
        if (child === panel || child.contains(panel)) continue;
        restoreInert.set(child, child.inert);
        child.inert = true;
      }
    });

    const onKeyDown = (event: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel || ignoreEscapeRef.current?.()) return;
      if (event.key === "Escape") {
        if (!closeOnEscapeRef.current || event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!focusable.length) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);
      restoreInert.forEach((wasInert, node) => {
        node.inert = wasInert;
      });
      if (restoreFocus && trigger && trigger.isConnected) {
        try {
          (trigger as HTMLElement & { focus: (opts?: FocusOptions & { focusVisible?: boolean }) => void }).focus({
            preventScroll: true,
            focusVisible: !isPointerMode,
          });
        } catch {
          trigger.focus({ preventScroll: true });
        }
      }
    };
  }, [open, container, panelRef, restoreFocus]);
}
