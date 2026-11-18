import { useEffect, useRef, type ReactNode } from "react";
import { useExitTransition, useIsomorphicLayoutEffect } from "../../primitives";
import { AfTrayProps, reducedMotion } from "./shared";

/** 托盘卡：灰色外壳（18px）里嵌一张白卡（14px，内缩 4px），底部灰条放说明与操作，显隐时平滑弹性过渡高度且不裁切内卡描边环。 */
export function AfTray({ title, description, extra, children, footer, className }: AfTrayProps) {
  const hasFooter = Boolean(footer);
  const { mounted: footerMounted, closing: footerClosing } = useExitTransition(hasFooter, 220);
  const lastFooterRef = useRef<ReactNode>(footer);
  if (hasFooter) {
    lastFooterRef.current = footer;
  } else if (!footerMounted) {
    lastFooterRef.current = null;
  }

  const footWrapRef = useRef<HTMLDivElement>(null);
  const footInnerRef = useRef<HTMLDivElement>(null);
  const hadFooterOnMount = useRef(hasFooter);
  const didMountRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  useIsomorphicLayoutEffect(() => {
    const wrap = footWrapRef.current;
    const inner = footInnerRef.current;
    if (!didMountRef.current) {
      didMountRef.current = true;
      if (hadFooterOnMount.current) return;
    }
    if (!wrap || !inner || reducedMotion()) {
      if (wrap) wrap.style.height = "";
      return;
    }
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (hasFooter && !footerClosing) {
      const targetH = inner.offsetHeight;
      wrap.style.transition = "none";
      wrap.style.height = "0px";
      void wrap.offsetHeight;
      wrap.style.transition = "";
      wrap.style.height = `${targetH}px`;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        if (footWrapRef.current) footWrapRef.current.style.height = "";
      }, 330);
    } else if (footerClosing) {
      const fromH = wrap.offsetHeight || inner.offsetHeight;
      wrap.style.transition = "none";
      wrap.style.height = `${fromH}px`;
      void wrap.offsetHeight;
      wrap.style.transition = "";
      wrap.style.height = "0px";
    }
  }, [hasFooter, footerClosing]);

  const renderedFooter = footerClosing ? lastFooterRef.current : footer;

  return (
    <section className={["af-tray", className].filter(Boolean).join(" ")}>
      <div className="af-tray__card">
        {title || extra ? (
          <header className="af-tray__head">
            <div className="af-tray__titles">
              {title ? <h3 className="af-tray__title">{title}</h3> : null}
              {description ? <p className="af-tray__desc">{description}</p> : null}
            </div>
            {extra ? <div className="af-tray__extra">{extra}</div> : null}
          </header>
        ) : null}
        {children}
      </div>
      {footerMounted ? (
        <div
          ref={footWrapRef}
          className="af-tray__foot-wrap"
          data-closing={footerClosing ? "true" : undefined}
        >
          <div ref={footInnerRef} className="af-tray__foot">
            {renderedFooter}
          </div>
        </div>
      ) : null}
    </section>
  );
}
