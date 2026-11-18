import "../motion.css";
import { useEffect, useState } from "react";
import type { ComponentSpec } from "../types";
import { AfBlurCrossfade } from "../components/motion/BlurCrossfade";
import { AfGradientFloor } from "../components/motion/GradientFloor";
import { AfGradientText } from "../components/motion/GradientText";
import { AfGridBackground } from "../components/motion/GridBackground";
import { AfNumberTicker } from "../components/motion/NumberTicker";
import { AfShimmerText, AfSkeleton } from "../components/motion/ShimmerLoader";
import { AfTextReveal } from "../components/motion/TextReveal";
import { AfTiltCard } from "../components/motion/TiltCard";
import { AfLogoMarquee } from "../components/motion/LogoMarquee";
import { AfTestimonialWall } from "../components/motion/TestimonialWall";

const releaseSlides = [
  {
    id: "shipped",
    badge: "Shipped",
    tone: "success" as const,
    text: "Dark mode is live for everyone.",
  },
  {
    id: "improved",
    badge: "Improved",
    tone: "accent" as const,
    text: "Search now looks through comments and attachments too, and results show up while you type – no more waiting for the full page.",
  },
  {
    id: "fixed",
    badge: "Fixed",
    tone: "warning" as const,
    text: "Exports keep their column order, even with hidden fields in between.",
  },
];

function BlurCrossfadeSpecimen() {
  const [step, setStep] = useState(0);
  const [pubState, setPubState] = useState<"idle" | "busy" | "done">("idle");

  useEffect(() => {
    if (pubState === "busy") {
      const t = window.setTimeout(() => setPubState("done"), 950);
      return () => window.clearTimeout(t);
    }
    if (pubState === "done") {
      const t = window.setTimeout(() => setPubState("idle"), 1800);
      return () => window.clearTimeout(t);
    }
  }, [pubState]);

  const current = releaseSlides[step];

  return (
    <div className="af-mo-cf">
      <div className="af-mo-cf__stage-card">
        <div className="af-mo-cf__head">
          <div className="af-mo-cf__title-col">
            <strong>Release 2.4</strong>
            <span>3 changes · {pubState === "done" ? "published" : "draft"}</span>
          </div>

          <button
            type="button"
            className="af-mo-cf__publish-btn"
            data-state={pubState}
            onClick={() => {
              if (pubState === "idle") setPubState("busy");
            }}
          >
            <AfBlurCrossfade id={pubState} morph="both" as="span" duration={360} blur={6}>
              {pubState === "idle" ? (
                <span>Publish</span>
              ) : pubState === "busy" ? (
                <>
                  <span className="af-mo-cf__spin" aria-hidden="true" />
                  <span>Publishing…</span>
                </>
              ) : (
                <span>✓ Published</span>
              )}
            </AfBlurCrossfade>
          </button>
        </div>

        <div className="af-mo-cf__well">
          <AfBlurCrossfade id={current.id} morph="height" duration={420} blur={10}>
            <div className="af-mo-cf__panel">
              <span className="af-mo-cf__badge" data-tone={current.tone}>
                {current.badge}
              </span>
              <p className="af-mo-cf__note">{current.text}</p>
            </div>
          </AfBlurCrossfade>
        </div>

        <div className="af-mo-cf__foot">
          <div className="af-mo-cf__dots" role="tablist" aria-label="Release changes">
            {releaseSlides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                className="af-mo-cf__dot-btn"
                aria-label={`${slide.badge} (${idx + 1} of ${releaseSlides.length})`}
                aria-selected={idx === step}
                onClick={() => setStep(idx)}
              />
            ))}
          </div>
          <button
            type="button"
            className="af-mo-cf__next-btn"
            onClick={() => setStep((s) => (s + 1) % releaseSlides.length)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberTickerSpecimen() {
  const [amount, setAmount] = useState(48_240);
  const base = 42_918.15;
  const deltaPct = Number((((amount - base) / base) * 100).toFixed(1));

  return (
    <div className="af-mo-ticker-demo">
      <div className="af-mo-ticker-demo__card">
        <div className="af-mo-ticker-demo__head">
          <span className="af-mo-ticker-demo__label">Revenue</span>
          <span className="af-mo-ticker-demo__period">This month</span>
        </div>
        <div className="af-mo-ticker-demo__value">
          <AfNumberTicker
            value={amount}
            locale="en-US"
            format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
            delay={40}
          />
        </div>
        <div className="af-mo-ticker-demo__delta-row">
          <span className="af-mo-ticker-demo__delta" data-neg={deltaPct < 0 ? "" : undefined}>
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {deltaPct < 0 ? (
                <path d="M6 2.5v7M3 6.5l3 3 3-3" />
              ) : (
                <path d="M6 9.5v-7M3 5.5l3-3 3 3" />
              )}
            </svg>
            <AfNumberTicker
              value={deltaPct}
              locale="en-US"
              format={{ signDisplay: "exceptZero", minimumFractionDigits: 1, maximumFractionDigits: 1 }}
              suffix="%"
            />
          </span>
          <span className="af-mo-ticker-demo__vs">vs last month</span>
        </div>
        <div className="af-mo-ticker-demo__stepper">
          <button
            type="button"
            className="af-mo-ticker-demo__step"
            aria-label="Decrease revenue"
            onClick={() => setAmount((v) => Math.max(0, v - 1_250))}
          >
            −
          </button>
          <button
            type="button"
            className="af-mo-ticker-demo__step"
            aria-label="Increase revenue"
            onClick={() => setAmount((v) => v + 1_250)}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function ShimmerLoaderSpecimen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => setLoading(false), 1650);
    return () => window.clearTimeout(t);
  }, [loading]);

  return (
    <div className="af-mo-shimmer">
      <div className="af-mo-shimmer__bar">
        <AfShimmerText duration={2}>Generating summary…</AfShimmerText>
        <button type="button" className="af-mo-outline-btn" onClick={() => setLoading(true)}>
          Reload
        </button>
      </div>
      <div className="af-mo-shimmer__card" aria-busy={loading}>
        {loading ? (
          <>
            <div className="af-mo-shimmer__profile">
              <AfSkeleton width={36} height={36} circle />
              <div className="af-mo-shimmer__rows">
                <AfSkeleton width={96} height={10} />
                <AfSkeleton width={64} height={8} />
              </div>
            </div>
            <div className="af-mo-shimmer__copy">
              <AfSkeleton width="100%" height={10} />
              <AfSkeleton width="72%" height={10} />
            </div>
            <div className="af-mo-shimmer__thumbs">
              <AfSkeleton height={56} radius={10} className="af-mo-shimmer__thumb-skel" />
              <AfSkeleton height={56} radius={10} className="af-mo-shimmer__thumb-skel" />
              <AfSkeleton height={56} radius={10} className="af-mo-shimmer__thumb-skel" />
            </div>
          </>
        ) : (
          <div className="af-mo-shimmer__loaded">
            <div className="af-mo-shimmer__profile">
              <span className="af-mo-shimmer__avatar" aria-hidden="true">
                MC
              </span>
              <div className="af-mo-shimmer__rows">
                <strong>Maya Chen</strong>
                <span>Product Design · 2h</span>
              </div>
            </div>
            <p className="af-mo-shimmer__body">
              New onboarding flow is live – activation is up 18% in the first week.
            </p>
            <div className="af-mo-shimmer__thumbs" aria-hidden="true">
              <span className="af-mo-shimmer__thumb" data-tone="1" />
              <span className="af-mo-shimmer__thumb" data-tone="2" />
              <span className="af-mo-shimmer__thumb" data-tone="3" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TextRevealSpecimen() {
  const [round, setRound] = useState(0);
  return (
    <div className="af-mo-reveal-demo">
      <div className="af-mo-reveal-demo__copy">
        <AfTextReveal
          key={`h-${round}`}
          as="h2"
          text="Words that arrive one at a time."
          by="word"
          stagger={40}
          duration={700}
        />
        <AfTextReveal
          key={`p-${round}`}
          as="p"
          className="af-mo-reveal--sub"
          text="Each word fades in out of a soft blur and rises into place, so a sentence reads like it is being spoken."
          by="word"
          delay={260}
          stagger={22}
          duration={700}
        />
      </div>
      <button type="button" className="af-mo-outline-btn" onClick={() => setRound((r) => r + 1)}>
        Replay
      </button>
    </div>
  );
}

function GradientTextSpecimen() {
  const [round, setRound] = useState(0);
  return (
    <div className="af-mo-gradtext-demo">
      <h2 className="af-mo-gradtext-demo__title">
        Interfaces people actually{" "}
        <AfGradientText key={round} speed={8} sweep={round > 0}>
          feel.
        </AfGradientText>
      </h2>
      <button type="button" className="af-mo-outline-btn" onClick={() => setRound((r) => r + 1)}>
        Replay
      </button>
    </div>
  );
}

function TiltCardSpecimen() {
  return (
    <div className="af-mo-tilt-demo">
      <AfTiltCard maxTilt={10} scale={1.02} perspective={900}>
        <div className="af-mo-tilt-demo__card">
          <div className="af-mo-tilt-demo__top">
            <span className="af-mo-tilt-demo__brand">
              affectUI <b>Pro</b>
            </span>
            <svg className="af-mo-tilt-demo__wave" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.5 7.5a7 7 0 0 1 0 9M12 5a10.5 10.5 0 0 1 0 14M15.5 2.5a14 14 0 0 1 0 19" />
            </svg>
          </div>
          <span className="af-mo-tilt-demo__chip" aria-hidden="true" />
          <div className="af-mo-tilt-demo__number">•••• •••• •••• 4821</div>
          <div className="af-mo-tilt-demo__bottom">
            <div className="af-mo-tilt-demo__field">
              <span className="af-mo-tilt-demo__label">Member</span>
              <span className="af-mo-tilt-demo__value">Alex Morgan</span>
            </div>
            <div className="af-mo-tilt-demo__field">
              <span className="af-mo-tilt-demo__label">Since</span>
              <span className="af-mo-tilt-demo__value">10/26</span>
            </div>
          </div>
        </div>
      </AfTiltCard>
      <p className="af-mo-hint">Move your pointer over the card</p>
    </div>
  );
}

/** affectUI Motion 条目：动效原语组件，均可直接包裹业务节点。 */
export const motionSpecs: ComponentSpec[] = [
  {
    id: "blur-crossfade",
    title: "Blur Crossfade",
    group: "动效",
    source: "pro",
    note: "affectUI Pro 动效。内容切换时旧节点 1.02 / blur 淡出、新节点 0.98 清晰浮现；支持高度与行内宽高平滑形变。",
    render: BlurCrossfadeSpecimen,
    width: 640,
    height: 280,
  },
  {
    id: "number-ticker",
    title: "Number Ticker",
    group: "动效",
    source: "free",
    note: "affectUI 免费动效。右对齐列里程表数字：按增减方向上下滚动，跨位时左侧新列滑入，符号与千分位保持静止。",
    render: NumberTickerSpecimen,
    width: 640,
    height: 280,
  },
  {
    id: "shimmer-loader",
    title: "Shimmer Loader",
    group: "动效",
    source: "free",
    note: "affectUI 免费动效。全视口固定光带同步掠过多块骨架（AfSkeleton），配合流光提示文案（AfShimmerText）。",
    render: ShimmerLoaderSpecimen,
    width: 560,
    height: 280,
  },
  {
    id: "text-reveal",
    title: "Text Reveal",
    group: "动效",
    source: "free",
    note: "affectUI 免费动效。按词组或逐字从模糊中错峰上浮，30% 入视口触发；内置无词典环境中文双字切分与防孤标点。",
    render: TextRevealSpecimen,
    width: 640,
    height: 260,
  },
  {
    id: "grid-background",
    title: "Grid Background",
    group: "动效",
    source: "free",
    note: "affectUI 免费动效。细线网格单格无缝漂移、边缘径向淡出，进入视口时从中心圆形揭开。",
    render: AfGridBackground,
    width: 804,
    height: 360,
  },
  {
    id: "gradient-text",
    title: "Gradient Text",
    group: "动效",
    source: "pro",
    note: "affectUI Pro 动效。多层径向色团有机流动，首次进入视口从左向右扫入揭开。",
    render: GradientTextSpecimen,
    width: 804,
    height: 260,
  },
  {
    id: "gradient-floor",
    title: "Gradient Floor",
    group: "动效",
    source: "pro",
    note: "affectUI Pro 动效。底部双层多峰矢量色场与柔光高光反向呼吸漂移，滚出视口自动暂停。",
    render: AfGradientFloor,
    width: 804,
    height: 360,
  },
  {
    id: "tilt-card",
    title: "Tilt Card",
    group: "动效",
    source: "pro",
    note: "affectUI Pro 动效。纯 3D 倾斜交互容器，rAF 批量写入 CSS 变量驱动跟随光斑，离开时过冲弹簧复位。",
    render: TiltCardSpecimen,
    width: 520,
    height: 320,
  },
  {
    id: "logo-marquee",
    title: "Logo Marquee",
    group: "Blocks",
    source: "free",
    note: "affectUI 免费 Block。双行反向无缝滚动品牌条：指数阻尼悬停停驻、指针拖拽惯性滑行与灰阶悬停点亮品牌原色。",
    render: () => <AfLogoMarquee rows={2} labels="beside" eyebrow="Trusted by teams at" />,
    width: 894,
    height: 240,
  },
  {
    id: "testimonial-wall",
    title: "Testimonial Wall",
    group: "Blocks",
    source: "free",
    note: "affectUI 免费 Block。三列反向错峰无尽评价墙：单列悬停平滑减速停驻、卡片微抬阴影聚焦与鼠标纵向拖拽滑行。",
    render: () => <AfTestimonialWall eyebrow="Testimonials" heading="Loved by product teams" height={580} />,
    width: 894,
    height: 660,
  },
];
