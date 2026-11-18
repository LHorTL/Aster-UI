import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn } from "../../primitives";

export type AfKeyValueProps = ComponentPropsWithoutRef<"div"> & {
  icon?: AffectIconKey;
  label: string;
  children: ReactNode;
};

/** 详情键值行：左侧图标与标签，右侧右对齐的值。 */
export const AfKeyValue = forwardRef<HTMLDivElement, AfKeyValueProps>(function AfKeyValue(
  { icon, label, className, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cn("af-kv", className)} {...rest}>
      <span className="af-kv__label">
        {icon ? <AfIcon name={icon} size={14} /> : null}
        {label}
      </span>
      <span className="af-kv__value">{children}</span>
    </div>
  );
});
