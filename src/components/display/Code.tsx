import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../../primitives";

export type AfCodeProps = ComponentPropsWithoutRef<"code"> & {
  children: ReactNode;
};

/** 等宽小标签：用于工具名、App 标识、模型 ID 等机器可读的值。 */
export const AfCode = forwardRef<HTMLElement, AfCodeProps>(function AfCode({ className, children, ...rest }, ref) {
  return (
    <code ref={ref} className={cn("af-code", className)} {...rest}>
      {children}
    </code>
  );
});
