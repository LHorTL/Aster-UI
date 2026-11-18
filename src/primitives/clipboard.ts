/**
 * 统一安全剪贴板写入原语：
 * - 优先调用异步 `navigator.clipboard.writeText(text)` 并捕获权限/失焦拒绝；
 * - 失败或不可用时降级为隐藏只读 `<textarea>` + `document.execCommand("copy")`，按真实布尔返回值反馈；
 * - Node SSR 或受限沙箱环境下安全返回 `false`，绝不抛出未捕获异常，并保持原有焦点不丢失。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 窗口失焦、权限拒绝或非安全上下文时平滑降级至选区复制
  }

  if (typeof document === "undefined" || !document.body) {
    return false;
  }

  const prevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let textarea: HTMLTextAreaElement | null = null;
  try {
    textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return Boolean(document.execCommand("copy"));
  } catch {
    return false;
  } finally {
    if (textarea?.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
    if (prevFocus && document.activeElement !== prevFocus && prevFocus.isConnected) {
      try {
        prevFocus.focus({ preventScroll: true });
      } catch {
        // 忽略不支持 FocusOptions 的宿主环境
      }
    }
  }
}
