/**
 * 零副作用纯日期计算原语：
 * 为 `DatePicker`、`DateRangePicker` 与 `DateRange` 提供运行期本地日期运算，
 * 避免与演示数据模块耦合，确保按需打包 100% 可摇树优化。
 */

/** 获取运行期本地当日零点日期对象。 */
export function getLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 按本地年、月、日判断两个日期是否为同一天。 */
export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 计算两个日期之间跨越的自然日天数（含首尾，不受夏令时跳变影响）。 */
export function daysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / 86_400_000) + 1;
}

/** 在指定日期上增减天数并返回本地零点新对象。 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** 生成中文短日期区间文案（例如“10月8日 – 10月21日”）。 */
export function formatRange(start: Date, end: Date): string {
  const text = (date: Date) => `${date.getMonth() + 1}月${date.getDate()}日`;
  return sameDay(start, end) ? text(start) : `${text(start)} – ${text(end)}`;
}
