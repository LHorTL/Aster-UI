import { useEffect, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../primitives";

export type AfCountdownParts = {
  /** 剩余总毫秒数（>= 0）。 */
  totalMs: number;
  /** 剩余天数。 */
  days: number;
  /** 扣除天数后的小时数（0–23）。 */
  hours: number;
  /** 总小时数（包含天数折算，`days * 24 + hours`）。 */
  totalHours: number;
  /** 分钟数（0–59）。 */
  minutes: number;
  /** 总分钟数（包含天与小时折算）。 */
  totalMinutes: number;
  /** 秒数（0–59）。 */
  seconds: number;
  /** 百分之一秒（0–99）。 */
  centiseconds: number;
  /** 是否已归零。 */
  finished: boolean;
};

export type AfCountdownFormat =
  | "HH:mm:ss"
  | "mm:ss"
  | "DD 天 HH:mm:ss"
  | "mm:ss.SS"
  | (string & {})
  | ((parts: AfCountdownParts) => ReactNode);

export type AfCountdownProps = Omit<HTMLAttributes<HTMLSpanElement>, "children" | "prefix"> & {
  /** 目标截止时刻（毫秒时间戳、`Date` 实例或 ISO 字符串）。 */
  targetTime?: number | Date | string;
  /** 固定倒计时时长（毫秒）；未传 `targetTime` 时生效，默认 `0`。 */
  durationMs?: number;
  /** 服务端签发时的基准当前时间；传入后自动校准客户端本地时钟偏差。 */
  serverNow?: number | Date | string;
  /** 显示格式模板或自定义渲染函数，默认 `"mm:ss"`。 */
  format?: AfCountdownFormat;
  /** 刷新间隔（毫秒）；模板含 `S` 毫秒位时默认 `50`ms，否则默认 `250`ms。 */
  intervalMs?: number;
  /** 临期黄色预警阈值（毫秒），剩余时间 `<= warnThresholdMs` 且 `> 0` 时切换 `warn` 态。 */
  warnThresholdMs?: number;
  /** 紧急红色预警阈值（毫秒），剩余时间 `<= dangerThresholdMs` 且 `> 0` 时切换 `danger` 态。 */
  dangerThresholdMs?: number;
  /** 是否暂停倒计时。 */
  paused?: boolean;
  /** 前置标签或图标节点。 */
  prefix?: ReactNode;
  /** 后置补充节点。 */
  suffix?: ReactNode;
  /** 归零后替换显示的文案节点（省略时保留 `00:00` 归零读数）。 */
  finishedText?: ReactNode;
  /** 字号尺寸档位。 */
  size?: "xs" | "sm" | "md" | "lg";
  /** 外观形态，默认 `"inline"`。 */
  variant?: "inline" | "pill" | "card";
  /** 每次刷新跳变回调。 */
  onTick?: (remainingMs: number, parts: AfCountdownParts) => void;
  /** 倒计时首次归零时触发。 */
  onFinish?: () => void;
  style?: CSSProperties;
};

function parseTimestamp(input: number | Date | string | undefined): number | null {
  if (input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (input instanceof Date) {
    const t = input.getTime();
    return Number.isFinite(t) ? t : null;
  }
  const parsed = Date.parse(input);
  return Number.isFinite(parsed) ? parsed : null;
}

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

export function computeCountdownParts(remainingMs: number): AfCountdownParts {
  const clamped = Math.max(0, Math.ceil(remainingMs));
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const totalHours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((clamped % 1000) / 10);
  return {
    totalMs: clamped,
    days,
    hours,
    totalHours,
    minutes,
    totalMinutes,
    seconds,
    centiseconds,
    finished: clamped <= 0,
  };
}

function formatCountdownString(template: string, parts: AfCountdownParts): string {
  if (template === "compact") {
    if (parts.days > 0) {
      return `${parts.days}d ${pad2(parts.hours)}h ${pad2(parts.minutes)}m`;
    }
    if (parts.totalHours > 0) {
      return `${pad2(parts.totalHours)}h ${pad2(parts.minutes)}m ${pad2(parts.seconds)}s`;
    }
    return `${pad2(parts.minutes)}m ${pad2(parts.seconds)}s`;
  }
  const hasDays = template.includes("DD");
  const hasHours = template.includes("HH");
  const hoursVal = hasDays ? parts.hours : parts.totalHours;
  const minutesVal = hasHours || hasDays ? parts.minutes : parts.totalMinutes;

  return template
    .replace(/DD/g, pad2(parts.days))
    .replace(/HH/g, pad2(hoursVal))
    .replace(/mm/g, pad2(minutesVal))
    .replace(/ss/g, pad2(parts.seconds))
    .replace(/SS/g, pad2(parts.centiseconds));
}

/**
 * 等宽数字高精度倒计时（`AfCountdown`）：
 * - 全程锁定 `font-variant-numeric: tabular-nums`，秒位与百分秒跳变零横向抖动；
 * - 支持服务端时钟偏移校准（`serverNow`）、暂停恢复、临期/紧急语义变色及 `onFinish` 回调。
 */
export function AfCountdown({
  targetTime,
  durationMs = 0,
  serverNow,
  format = "mm:ss",
  intervalMs,
  warnThresholdMs,
  dangerThresholdMs,
  paused = false,
  prefix,
  suffix,
  finishedText,
  size = "md",
  variant = "inline",
  onTick,
  onFinish,
  className,
  style,
  ...rest
}: AfCountdownProps = {}) {
  const parsedTarget = parseTimestamp(targetTime);
  const parsedServerNow = parseTimestamp(serverNow);

  // 客户端与服务端时钟偏移（serverTime - clientTime）
  const clockSkewRef = useRef<number>(0);
  useMemo(() => {
    if (parsedServerNow !== null) {
      clockSkewRef.current = parsedServerNow - Date.now();
    } else {
      clockSkewRef.current = 0;
    }
  }, [parsedServerNow]);

  const computeInitialRemaining = (): number => {
    if (parsedTarget !== null) {
      const refNow = parsedServerNow ?? Date.now() + clockSkewRef.current;
      return Math.max(0, parsedTarget - refNow);
    }
    return Math.max(0, durationMs);
  };

  const [remainingMs, setRemainingMs] = useState<number>(computeInitialRemaining);
  const deadlineRef = useRef<number>(0);
  const pausedRemainingRef = useRef<number>(remainingMs);
  const firedFinishRef = useRef<boolean>(false);
  const onTickRef = useRef(onTick);
  const onFinishRef = useRef(onFinish);
  onTickRef.current = onTick;
  onFinishRef.current = onFinish;

  const usesSubSecond = typeof format === "string" && format.includes("S");
  const resolvedInterval = intervalMs ?? (usesSubSecond ? 50 : 250);

  // 当目标时刻或时长变更时重置截止锚点
  useEffect(() => {
    const nowAdjusted = Date.now() + clockSkewRef.current;
    const initial =
      parsedTarget !== null ? Math.max(0, parsedTarget - nowAdjusted) : Math.max(0, durationMs);
    deadlineRef.current = nowAdjusted + initial;
    pausedRemainingRef.current = initial;
    firedFinishRef.current = initial <= 0;
    setRemainingMs(initial);
  }, [parsedTarget, durationMs, parsedServerNow]);

  useEffect(() => {
    if (paused) {
      const nowAdjusted = Date.now() + clockSkewRef.current;
      pausedRemainingRef.current = Math.max(0, deadlineRef.current - nowAdjusted);
      return;
    }

    // 从暂停恢复时按暂停前剩余毫秒重锚截止时刻
    const nowOnResume = Date.now() + clockSkewRef.current;
    if (parsedTarget !== null) {
      deadlineRef.current = parsedTarget;
    } else {
      deadlineRef.current = nowOnResume + pausedRemainingRef.current;
    }

    const tick = () => {
      const nowAdjusted = Date.now() + clockSkewRef.current;
      const next = Math.max(0, deadlineRef.current - nowAdjusted);
      pausedRemainingRef.current = next;
      setRemainingMs(next);
      const nextParts = computeCountdownParts(next);
      onTickRef.current?.(next, nextParts);
      if (next <= 0 && !firedFinishRef.current) {
        firedFinishRef.current = true;
        onFinishRef.current?.();
      }
    };

    tick();
    if (pausedRemainingRef.current <= 0) return;

    const timer = window.setInterval(() => {
      tick();
      if (pausedRemainingRef.current <= 0) {
        window.clearInterval(timer);
      }
    }, Math.max(16, resolvedInterval));

    return () => window.clearInterval(timer);
  }, [paused, parsedTarget, resolvedInterval]);

  const parts = useMemo(() => computeCountdownParts(remainingMs), [remainingMs]);

  let status: "normal" | "warn" | "danger" | "finished" = "normal";
  if (parts.finished) {
    status = "finished";
  } else if (dangerThresholdMs !== undefined && remainingMs <= dangerThresholdMs) {
    status = "danger";
  } else if (warnThresholdMs !== undefined && remainingMs <= warnThresholdMs) {
    status = "warn";
  }

  const renderedValue =
    parts.finished && finishedText !== undefined
      ? finishedText
      : typeof format === "function"
        ? format(parts)
        : formatCountdownString(format, parts);

  return (
    <span
      {...rest}
      className={cn("af-countdown", className)}
      data-size={size}
      data-variant={variant}
      data-status={status}
      data-paused={paused ? "true" : undefined}
      role={rest.role ?? "timer"}
      style={style}
    >
      {prefix !== undefined && prefix !== null ? (
        <span className="af-countdown__prefix">{prefix}</span>
      ) : null}
      <span className="af-countdown__value">{renderedValue}</span>
      {suffix !== undefined && suffix !== null ? (
        <span className="af-countdown__suffix">{suffix}</span>
      ) : null}
    </span>
  );
}

export { AfCountdown as Countdown };
