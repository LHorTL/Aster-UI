import { addDays, daysBetween } from "../../primitives";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** 是否开启了“减少动态效果”。 */export 
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* Tween                                                               */
/* ------------------------------------------------------------------ */

/**
 * 一组数字一起插值到新目标：大数、行值、条宽、柱高共用同一个 tween，
 * 保证切换范围时所有数字同时到位。强 ease-out（四次方），默认 500ms。
 */
export function useTweens(targets: number[], duration = 500): number[] {
  const safeTargets = targets.map((value) => (Number.isFinite(value) ? value : 0));
  const key = safeTargets.map((value) => value.toFixed(4)).join(",");
  const [values, setValues] = useState(safeTargets);
  const current = useRef(safeTargets);
  useEffect(() => {
    const from = current.current;
    const to = safeTargets;
    if (reducedMotion() || from.length !== to.length) {
      current.current = to;
      setValues(to);
      return;
    }
    if (from.every((value, index) => Math.abs(value - to[index]) < 1e-5)) {
      current.current = to;
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      if (progress >= 1) {
        current.current = to;
        setValues(to);
        return;
      }
      const eased = 1 - Math.pow(1 - progress, 4);
      const next = to.map((value, index) => from[index] + (value - from[index]) * eased);
      current.current = next;
      setValues(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // 目标内容由 key 表示，避免调用方每次传入新数组都重启动画
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, duration]);
  return values;
}

/** 单个数字插值。 */
export function useTween(target: number, duration = 500) {
  return useTweens([target], duration)[0];
}

/* ------------------------------------------------------------------ */export 
/* Swap                                                                */
/* ------------------------------------------------------------------ */

/** 正在淡出的旧内容快照。 */
type SwapGhost = { key: string; node: ReactNode };

/* ------------------------------------------------------------------ */
/* FLIP                                                                */
/* ------------------------------------------------------------------ */

export { useFlip, useListFlip } from "../../primitives";

/* ------------------------------------------------------------------ */
/* Line chart                                                          */
/* ------------------------------------------------------------------ */

/** 折线图中的一条序列。 */
export type AfLineSeries = {
  /** 序列名称，显示在图例和提示框。 */
  name: string;
  /** 数值，与 labels 一一对应。 */
  values: number[];
  /**
   * 兼容旧参数：main 主序列、compare 对比周期（灰色虚线）。
   * 新代码可以省略，按顺序取 --af-series-* 调色板，末序列固定灰。
   */
  kind?: "main" | "compare";
  /** 可选自定义颜色（通常写 var(--af-*)）；不传时按序列顺序取调色板。 */
  color?: string;
};

/** 折线图属性。 */
export type AfLineChartProps = {
  /** 横轴标签（只显示首、中、尾）。 */
  labels: string[];
  /** 任意多条序列；默认直线段、无面积，末序列固定灰。 */
  series: AfLineSeries[];
  /** 数值格式。 */
  format: (value: number) => string;
  /** 纵轴刻度的短格式。 */
  formatAxis?: (value: number) => string;
  /** 图表高度。 */
  height?: number;
  /** 无障碍说明。 */
  label: string;
  /** 线型：linear 直线段（默认，与 affectUI kpi-chart 一致）；smooth 为旧版平滑曲线。 */
  curve?: "linear" | "smooth";
  /** 是否填充面积，默认 false（affectUI 的 kpi-chart 没有面积）。 */
  area?: boolean;
  /** 是否显示顶部序列图例，默认 true。 */
  showLegend?: boolean;
  /** 静止时是否显示主序列末端圆点，默认 true。 */
  restingDot?: boolean;
  /** 可选固定纵轴上限（不传时按 niceMax 自动取整）。 */
  yMax?: number;
};

/** 把点序列转成平滑三次贝塞尔路径（旧版曲线，保留给 curve="smooth"）。 */export 
function smooth(points: [number, number][]) {
  if (points.length < 2) return "";
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/** 直线段路径：不做平滑，逐点连线。 */export 
function linearPath(points: [number, number][]) {
  return points.map((point, index) => `${index ? "L" : "M"}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(" ");
}

/** 图例 / 提示框里的小色块：8×8，对比序列用 3-2 虚线（底色透明，避免缝隙透出前一层色）。 */export 
function lineSwatch(color: string, dashed: boolean): React.CSSProperties {
  return dashed
    ? { backgroundColor: "transparent", backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 5px)` }
    : { backgroundColor: color };
}

/** 把最大值放大到一个“好看”的刻度上限。 */export 
function niceMax(value: number) {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  return (steps.find((step) => step * exp >= value) ?? 10) * exp;
}

/* ------------------------------------------------------------------ */
/* Date range                                                          */
/* ------------------------------------------------------------------ */

/** 日期范围的对比档位：关闭 / 上一周期 / 去年同期。 */
export type AfDateRangeCompare = "off" | "prev" | "year";

/** 日期范围的值。 */
export type AfDateRangeValue = {
  /** 起始日（含）。 */
  start: Date;
  /** 结束日（含）。 */
  end: Date;
  /** 是否开启对比；保留旧字段，与 compareMode 同步。 */
  compare: boolean;
  /** 对比档位；不传时按 compare 推断为 prev / off。 */
  compareMode?: AfDateRangeCompare;
};

/** 快捷预设：10 项，返回相对“今天”的范围；「自定义」不在数组里，由手动点选进入。 */export 
const rangePresets: { key: string; label: string; make: (today: Date) => [Date, Date] }[] = [
  { key: "today", label: "今天", make: (t) => [t, t] },
  { key: "yesterday", label: "昨天", make: (t) => [addDays(t, -1), addDays(t, -1)] },
  { key: "7d", label: "最近 7 天", make: (t) => [addDays(t, -6), t] },
  { key: "30d", label: "最近 30 天", make: (t) => [addDays(t, -29), t] },
  { key: "90d", label: "最近 90 天", make: (t) => [addDays(t, -89), t] },
  { key: "month", label: "本月", make: (t) => [new Date(t.getFullYear(), t.getMonth(), 1), t] },
  { key: "last-month", label: "上个月", make: (t) => [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)] },
  { key: "quarter", label: "本季度", make: (t) => [new Date(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3, 1), t] },
  { key: "ytd", label: "年初至今", make: (t) => [new Date(t.getFullYear(), 0, 1), t] },
];

/** 上一周期：紧挨着起始日之前、长度相同的一段。 */
export function previousPeriod(start: Date, end: Date): [Date, Date] {
  const days = daysBetween(start, end);
  return [addDays(start, -days), addDays(start, -1)];
}

/** 去年同期：把区间整体前移一年。 */
export function previousYear(start: Date, end: Date): [Date, Date] {
  return [new Date(start.getFullYear() - 1, start.getMonth(), start.getDate()), new Date(end.getFullYear() - 1, end.getMonth(), end.getDate())];
}

/** 一个月的日期格，周一开头；不属于本月的格子为空。 */export 
function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= total; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7) cells.push(null);
  return cells;
}

/* ------------------------------------------------------------------ */
/* Tray card / Save bar                                                */
/* ------------------------------------------------------------------ */

/** 托盘卡属性。 */
export type AfTrayProps = {
  /** 内卡标题。 */
  title?: ReactNode;
  /** 标题下方的灰色说明。 */
  description?: ReactNode;
  /** 标题行右侧（例如总开关）。 */
  extra?: ReactNode;
  /** 内卡正文。 */
  children: ReactNode;
  /** 底部灰条内容（说明、保存栏）。 */
  footer?: ReactNode;
  /** 额外类名。 */
  className?: string;
};

/* ------------------------------------------------------------------ */
/* Breakdown / Rank / Usage                                            */
/* ------------------------------------------------------------------ */

/** 分布中的一项。 */
export type AfShareItem = {
  /** 名称。 */
  label: string;
  /** 数值。 */
  value: number;
  /** 可选的环比变化（百分比）：正数绿色 ↑、负数红色 ↓，渲染成 20/r5 胶囊。 */
  delta?: number;
};

/** 按排名取数据色：前四名强调色递减透明度，末项（“其他”）固定灰。 */export 
const dataTone = (index: number, total: number, restLast: boolean) => (restLast && index === total - 1 ? "rest" : String(Math.min(index + 1, 4)));

/* ------------------------------------------------------------------ */
/* Input modality                                                      */
/* ------------------------------------------------------------------ */

/**
 * 记录最近一次输入来自键盘还是指针，写到根元素的 data-modality 上。
 * 输入框等“鼠标点击也会触发 :focus-visible”的控件据此只在键盘操作时显示焦点外圈。
 */
export function useInputModality(root: HTMLElement | null) {
  useEffect(() => {
    if (!root) return;
    root.dataset.modality = "pointer";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab" || event.key.startsWith("Arrow") || event.key === "Enter" || event.key === " ") root.dataset.modality = "keyboard";
    };
    const onPointer = () => (root.dataset.modality = "pointer");
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, [root]);
}

/** 数字的千分位格式（用于插值中的中间值）。 */
export const groupNumber = (value: number) => Math.round(value).toLocaleString("zh-CN");
