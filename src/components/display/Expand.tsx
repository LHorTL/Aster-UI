import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../primitives";

export type AfExpandProps = ComponentPropsWithoutRef<"div"> & {
  open: boolean;
  children: ReactNode;
};

/** 平滑展开：高度从 0 过渡到内容高度，内容同时轻微上浮；收起时设为 inert。 */
export const AfExpand = forwardRef<HTMLDivElement, AfExpandProps>(function AfExpand(
  { open, className, children, ...rest },
  ref,
) {
  const inertAttr = open ? {} : ({ inert: "true" as unknown as boolean } as Record<string, unknown>);
  return (
    <div ref={ref} className={cn("af-expand", className)} data-open={open || undefined} aria-hidden={!open} {...inertAttr} {...rest}>
      <div className="af-expand__inner">{children}</div>
    </div>
  );
});
