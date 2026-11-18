import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn, useIsomorphicLayoutEffect, useSlidingTabIndicator } from "../../primitives";
import { useTween, useTweens } from "../../ui-pro";
import { Demo, EXPERIMENT_METRICS, EXPERIMENT_VARIANTS, ExperimentMetric, ExperimentVariant, Note, experimentColor } from "../_shared/data";

export type ExperimentMetricConfig = (typeof EXPERIMENT_METRICS)[number];
export type { ExperimentMetric, ExperimentVariant };

export interface AfExperimentCardPatternProps {
  /** 实验标题。 */
  title?: ReactNode;
  /** 状态文本。 */
  statusLabel?: ReactNode;
  /** 周期附注。 */
  durationNote?: ReactNode;
  /** 变体列表。 */
  variants?: ExperimentVariant[];
  /** 实验指标定义列表。 */
  metrics?: ExperimentMetricConfig[];
  /** 默认展开。 */
  defaultOpen?: boolean;
  /** 发布胜出变体时触发。 */
  onShip?: (variant: ExperimentVariant) => void;
  /** 是否显示底部演示说明（默认 false）。 */
  showNote?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

/**
 * 实验卡：36px 迷你柱状图 + 标题/运行状态 + 领先变体胶囊；
 * 展开区支持指标药丸平滑滑行、数值与差值实时滚动插值、精确高度折叠与胜出变体发布。
 */
function ExperimentCardDemo({
  title = "Signup button copy",
  statusLabel = "Running",
  durationNote = "Day 9 of 14",
  variants = EXPERIMENT_VARIANTS,
  metrics = EXPERIMENT_METRICS,
  defaultOpen = false,
  onShip,
  showNote = false,
  className,
  style,
}: AfExperimentCardPatternProps = {}) {
  const [metric, setMetric] = useState<ExperimentMetric>(metrics[0]?.id ?? "conversion");
  const [picked, setPicked] = useState<string | null>(null);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinned, setPinned] = useState(defaultOpen);
  const [hot, setHot] = useState<string | null>(null);
  const [shipped, setShipped] = useState<string | null>(null);
  const switchRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [foldHeight, setFoldHeight] = useState<number | null>(null);

  const open = hoverOpen || pinned;

  const indicator = useSlidingTabIndicator(switchRef, '[aria-checked="true"]', `${metric}-${open}`);

  useIsomorphicLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const sync = () => setFoldHeight(el.offsetHeight);
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [variants.length, metrics.length]);

  const config = metrics.find((item) => item.id === metric) ?? metrics[0];
  const control = variants.find((variant) => variant.control) ?? variants[0];
  const valueOf = (variant: ExperimentVariant) => variant.values[metric];

  const targetValues = variants.map(valueOf);
  const tweenedValues = useTweens(targetValues, 460);
  const maxTarget = Math.max(...targetValues, 0.001);
  const maxTween = Math.max(...tweenedValues, 0.001);

  const lead = [...variants].sort((a, b) => (config.lowerIsBetter ? valueOf(a) - valueOf(b) : valueOf(b) - valueOf(a)))[0];
  const rawLeadDelta = ((valueOf(lead) - valueOf(control)) / Math.max(Math.abs(valueOf(control)), 0.001)) * 100;
  const tweenedLeadDelta = useTween(rawLeadDelta, 420);
  const pickedVariant = variants.find((variant) => variant.id === picked) ?? null;

  return (
    <Demo>
      <section
        className={cn("af-dt-xcc", className)}
        style={style}
        data-open={open || undefined}
        aria-label="Experiment card"
        onPointerEnter={() => setHoverOpen(true)}
        onPointerLeave={() => setHoverOpen(false)}
      >
        <div className="af-dt-xcc__card">
          <div className="af-dt-xcc__head">
            <button type="button" className="af-dt-xcc__toggle" aria-expanded={open} aria-label="Toggle experiment details" onClick={() => setPinned((value) => !value)} />
            <span className="af-dt-xcc__chart" aria-hidden>
              {variants.map((variant, index) => (
                <span
                  key={variant.id}
                  className="af-dt-xcc__col"
                  style={{ height: `${Math.max(18, Math.round(((tweenedValues[index] ?? valueOf(variant)) / maxTween) * 100))}%`, background: experimentColor(index) }}
                  data-hot={hot === variant.id || undefined}
                  data-dim={(hot !== null && hot !== variant.id) || undefined}
                />
              ))}
            </span>
            <span className="af-dt-xcc__titles">
              <span className="af-dt-xcc__name">{title}</span>
              <span className="af-dt-xcc__sub">
                <span className="af-dt-xcc__tag" data-tone="green"><i aria-hidden />{statusLabel}</span>
                <span className="af-dt-xcc__note">{durationNote}</span>
              </span>
            </span>
            <span className="af-dt-xcc__lead" data-tone="green">
              <b>{lead.key}</b>
              {rawLeadDelta >= 0 ? "↗" : "↘"} {tweenedLeadDelta >= 0 ? "+" : ""}{tweenedLeadDelta.toFixed(1)}%
            </span>
          </div>
          <div
            className="af-dt-xcc__fold"
            style={{ height: open ? (foldHeight ?? "auto") : 0 }}
            aria-hidden={!open || undefined}
            {...(!open ? { inert: "true" as unknown as boolean } : undefined)}
          >
            <div ref={bodyRef}>
              <div className="af-dt-xcc__body">
                <div ref={switchRef} className="af-dt-xcc__switch" role="radiogroup" aria-label="Experiment metric">
                  {indicator ? (
                    <span
                      className="af-dt-xcc__pill"
                      aria-hidden
                      data-ready={indicator.ready || undefined}
                      style={{ width: indicator.width, transform: `translateX(${indicator.x}px)` }}
                    />
                  ) : null}
                  {metrics.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={metric === item.id}
                      className="af-dt-xcc__metric"
                      onClick={() => setMetric(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="af-dt-xcc__rows" role="radiogroup" aria-label="Pick winning variant">
                  {variants.map((variant, index) => {
                    const targetVal = valueOf(variant);
                    const animVal = tweenedValues[index] ?? targetVal;
                    const controlAnim = tweenedValues[variants.indexOf(control)] ?? valueOf(control);
                    const animDelta = ((animVal - controlAnim) / Math.max(Math.abs(controlAnim), 0.001)) * 100;
                    const targetDelta = ((targetVal - valueOf(control)) / Math.max(Math.abs(valueOf(control)), 0.001)) * 100;
                    const better = config.lowerIsBetter ? targetDelta <= 0 : targetDelta >= 0;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        role="radio"
                        aria-checked={picked === variant.id}
                        className="af-dt-xcc__row"
                        style={{ "--af-xcc-color": experimentColor(index) } as CSSProperties}
                        data-hot={hot === variant.id || undefined}
                        onPointerEnter={() => setHot(variant.id)}
                        onPointerLeave={() => setHot(null)}
                        onFocus={() => setHot(variant.id)}
                        onBlur={() => setHot(null)}
                        onClick={() => {
                          setPicked((current) => (current === variant.id ? null : variant.id));
                          setShipped(null);
                        }}
                      >
                        <span className="af-dt-xcc__badge">
                          <span>{variant.key}</span>
                          <AfIcon name="check" size={12} />
                        </span>
                        <span className="af-dt-xcc__label">{variant.name}</span>
                        <span className="af-dt-xcc__value">{config.format(animVal)}</span>
                        {variant.control ? (
                          <span className="af-dt-xcc__lift" data-tone="gray">Base</span>
                        ) : (
                          <span className="af-dt-xcc__lift" data-tone={better ? "green" : "red"}>
                            {animDelta >= 0 ? "+" : "−"}{Math.abs(animDelta).toFixed(1)}%
                          </span>
                        )}
                        <span className="af-dt-xcc__track">
                          <span className="af-dt-xcc__bar" style={{ transform: `scaleX(${Math.min(1, Math.max(0.04, targetVal / maxTarget))})` }} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <footer className="af-dt-xcc__foot">
                <span className="af-dt-xcc__caption">{shipped ? `Shipped variant ${shipped}` : pickedVariant ? `Variant ${pickedVariant.key} selected` : "Pick a winner"}</span>
                {pickedVariant ? (
                  <button
                    type="button"
                    className="af-dt-xcc__action"
                    onClick={() => {
                      setShipped(pickedVariant.key);
                      setPicked(null);
                      onShip?.(pickedVariant);
                    }}
                  >
                    Ship variant {pickedVariant.key} →
                  </button>
                ) : null}
              </footer>
            </div>
          </div>
        </div>
      </section>
      {showNote ? <Note>340px experiment card: sliding metric pill, tweened values & lift percentages, and winner shipping.</Note> : null}
    </Demo>
  );
}

export { ExperimentCardDemo as AfExperimentCardPattern, ExperimentCardDemo as AfExperimentCard };
export type { AfExperimentCardPatternProps as AfExperimentCardProps };
