import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { cn, composeRefs } from "./cn";

export type AfSlotProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
};

export type AfSlottableProps = {
  children: ReactNode;
};

/** 标记在 `AfSlot` 中要替换进宿主元素内部的核心子内容。 */
export function AfSlottable({ children }: AfSlottableProps) {
  return <>{children}</>;
}

function isSlottable(child: ReactNode): child is ReactElement<AfSlottableProps> {
  return isValidElement(child) && child.type === AfSlottable;
}

function getElementRef(element: ReactElement): Ref<HTMLElement> | undefined {
  const propsRef = (element.props as { ref?: Ref<HTMLElement> } | null)?.ref;
  if (propsRef !== undefined) return propsRef;
  return (element as unknown as { ref?: Ref<HTMLElement> }).ref;
}

function mergeSlotProps(slotProps: Record<string, unknown>, childProps: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...childProps };

  for (const propName of Object.keys(slotProps)) {
    const slotValue = slotProps[propName];
    const childValue = childProps[propName];

    if (propName === "children") continue;

    if (propName === "style") {
      merged.style = { ...(slotValue as CSSProperties | undefined), ...(childValue as CSSProperties | undefined) };
      continue;
    }

    if (propName === "className") {
      merged.className = cn(slotValue as string | undefined, childValue as string | undefined);
      continue;
    }

    if (/^on[A-Z]/.test(propName)) {
      if (typeof slotValue === "function" && typeof childValue === "function") {
        merged[propName] = (...args: unknown[]) => {
          (childValue as (...a: unknown[]) => void)(...args);
          (slotValue as (...a: unknown[]) => void)(...args);
        };
      } else if (slotValue !== undefined) {
        merged[propName] = slotValue;
      }
      continue;
    }

    if (childValue === undefined) {
      merged[propName] = slotValue;
    }
  }

  return merged;
}

/**
 * 多态渲染槽位原语（`asChild`）：
 * 将组件自身的类名、样式、无障碍属性、事件处理器与 `ref` 合并注入到外部传入的子元素（如 `<a />` 或路由 `<Link />`），
 * 同时支持通过 `<AfSlottable>` 保留按钮图标、快捷键等内部装饰子节点。
 */
export const AfSlot = forwardRef<HTMLElement, AfSlotProps>(function AfSlot({ children, ...slotProps }, forwardedRef) {
  const childrenArray = Children.toArray(children);
  const slottable = childrenArray.find(isSlottable);

  if (slottable) {
    const targetElement = slottable.props.children;
    if (!isValidElement(targetElement)) return null;

    const newChildren = childrenArray.map((child) =>
      child === slottable ? (targetElement.props as { children?: ReactNode }).children : child,
    );

    const targetProps = (targetElement.props ?? {}) as Record<string, unknown>;
    return cloneElement(
      targetElement as ReactElement<Record<string, unknown>>,
      {
        ...mergeSlotProps(slotProps as Record<string, unknown>, targetProps),
        ref: composeRefs(forwardedRef, getElementRef(targetElement)),
      },
      ...newChildren,
    );
  }

  if (!isValidElement(children)) {
    return null;
  }

  const childProps = (children.props ?? {}) as Record<string, unknown>;
  return cloneElement(children as ReactElement<Record<string, unknown>>, {
    ...mergeSlotProps(slotProps as Record<string, unknown>, childProps),
    ref: composeRefs(forwardedRef, getElementRef(children)),
  });
});
