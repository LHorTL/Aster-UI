import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn, useControllableState } from "../../primitives";

/** 单步状态。 */
export type AfStepStatus = "wait" | "process" | "finish" | "error";

/** 步骤项配置。 */
export type AfStepItem = {
  /** 唯一键值。 */
  key?: string;
  /** 步骤标题。 */
  title: ReactNode;
  /** 辅助描述。 */
  description?: ReactNode;
  /** 可选自定义图标。 */
  icon?: AffectIconKey | ReactNode;
  /** 覆盖自动推导的步骤状态。 */
  status?: AfStepStatus;
  /** 是否禁用点击切换。 */
  disabled?: boolean;
};

/** 步骤条属性。 */
export type AfStepsProps = {
  /** 步骤列表（省略时展示默认三步示例）。 */
  items?: AfStepItem[];
  /** 受控当前步骤索引（0 起）。 */
  current?: number;
  /** 非受控初始步骤索引，默认 0。 */
  defaultCurrent?: number;
  /** 步骤切换回调；传入后支持点击切换。 */
  onChange?: (index: number) => void;
  /** 排列方向：horizontal（默认）/ vertical。 */
  direction?: "horizontal" | "vertical";
  /** 视觉变体：number（带序号圆圈与连线）/ dot（极简圆点）/ bar（紧凑条形向导轨）。 */
  variant?: "number" | "dot" | "bar";
  /** 尺寸：sm / md（默认）。 */
  size?: "sm" | "md";
  /** 无障碍名称。 */
  label?: string;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
};

const DEFAULT_STEPS: AfStepItem[] = [
  { key: "connect", title: "连接数据源", description: "验证访问令牌" },
  { key: "scope", title: "配置权限范围", description: "选择工作区与目录" },
  { key: "verify", title: "运行契约校验", description: "写入本地配置" },
];

/**
 * 步骤条：纯 Flexbox 分步指示器，支持 `number` / `dot` / `bar` 三种视觉变体及横向/纵向布局；
 * `<ol role="list">` 保证 Flexbox 下列表语义在 Safari 中完整保留。
 */
export const AfSteps = forwardRef<HTMLOListElement, AfStepsProps>(function AfSteps(
  {
    items = DEFAULT_STEPS,
    current: currentProp,
    defaultCurrent = 0,
    onChange,
    direction = "horizontal",
    variant = "number",
    size = "md",
    label = "步骤进度",
    className,
    style,
  },
  ref,
) {
  const [current, setCurrent] = useControllableState<number>({
    value: currentProp,
    defaultValue: defaultCurrent,
    onChange,
  });

  const interactive = Boolean(onChange);

  return (
    <ol
      ref={ref}
      role="list"
      className={cn("af-steps", className)}
      style={style}
      data-direction={direction}
      data-variant={variant}
      data-size={size !== "md" ? size : undefined}
      aria-label={label}
    >
      {items.map((item, index) => {
        const status: AfStepStatus =
          item.status ?? (index < current ? "finish" : index === current ? "process" : "wait");
        const isCurrent = index === current;
        const canClick = interactive && !item.disabled;

        if (variant === "bar") {
          return (
            <li
              key={item.key ?? index}
              className="af-steps__item af-steps__item--bar"
              data-status={status}
              aria-current={isCurrent ? "step" : undefined}
              onClick={canClick ? () => setCurrent(index) : undefined}
              style={canClick ? { cursor: "pointer" } : undefined}
            >
              <span className="af-steps__bar-track" aria-hidden="true">
                <span className="af-steps__bar-fill" />
              </span>
              {canClick ? (
                <button
                  type="button"
                  className="af-steps__bar-btn"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrent(index);
                  }}
                >
                  <span className="af-steps__bar-label">{item.title}</span>
                </button>
              ) : (
                <span className="af-steps__bar-label">{item.title}</span>
              )}
            </li>
          );
        }

        const indicator =
          variant === "dot" ? (
            <span className="af-steps__dot" aria-hidden="true" />
          ) : item.icon ? (
            <span className="af-steps__indicator" aria-hidden="true">
              {typeof item.icon === "string" ? <AfIcon name={item.icon as AffectIconKey} size={13} /> : item.icon}
            </span>
          ) : (
            <span className="af-steps__indicator" aria-hidden="true">
              {status === "finish" ? (
                <AfIcon name="check" size={12} />
              ) : status === "error" ? (
                <AfIcon name="x" size={12} />
              ) : (
                index + 1
              )}
            </span>
          );

        const body = (
          <>
            <span className="af-steps__head">
              {indicator}
              <span className="af-steps__titles">
                <span className="af-steps__title">{item.title}</span>
                {item.description ? <span className="af-steps__desc">{item.description}</span> : null}
              </span>
            </span>
          </>
        );

        return (
          <li
            key={item.key ?? index}
            className="af-steps__item"
            data-status={status}
            aria-current={isCurrent ? "step" : undefined}
          >
            {canClick ? (
              <button
                type="button"
                className="af-steps__trigger"
                disabled={item.disabled}
                onClick={() => setCurrent(index)}
              >
                {body}
              </button>
            ) : (
              <div className="af-steps__node">{body}</div>
            )}
            {index < items.length - 1 ? <span className="af-steps__connector" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
});
