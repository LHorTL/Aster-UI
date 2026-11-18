import { useState } from "react";
import {
  AfButton,
  AfCountdown,
  AfIcon,
  AfProgressRing,
  AfSparkline,
  AfTag,
  cn,
} from "../../ui";
import { useTween } from "../../ui-pro";

export interface AfServerResourceSlice {
  key: string;
  label: string;
  usedText: string;
  sharePct: number;
  color: string;
}

export interface AfServerLatencyProbe {
  id: string;
  region: string;
  protocol: string;
  currentRttMs: number;
  packetLossPct: number;
  samples: number[];
}

export interface AfServerMetricPanelProps {
  /** 实例主机名称。 */
  hostLabel?: string;
  /** 本月已用流量（GB）。 */
  bandwidthUsedGb?: number;
  /** 本月总流量配额（GB）。 */
  bandwidthTotalGb?: number;
  /** 距离下次流量重置的毫秒数。 */
  resetRemainingMs?: number;
  /** CPU / 内存 / NVMe 多段配比负载。 */
  resources?: AfServerResourceSlice[];
  /** 多地域节点延迟探针序列。 */
  probes?: AfServerLatencyProbe[];
  /** 内嵌悬浮配额微卡数据配置。 */
  quotaCardProps?: AfQuotaFloatCardProps;
  /** 立即刷新探针回调。 */
  onRefreshProbes?: () => void;
  className?: string;
}

export interface AfQuotaFloatCardProps {
  /** 模型网关名称。 */
  gatewayName?: string;
  /** 今日已消耗 Token 数量。 */
  tokensUsedToday?: number;
  /** 剩余额度百分比（`0–100`）。 */
  remainingPercent?: number;
  /** 网关实时延迟（ms）。 */
  latencyMs?: number;
  /** 在线健康状态。 */
  online?: boolean;
  className?: string;
}

const DEFAULT_RESOURCES: AfServerResourceSlice[] = [
  { key: "cpu", label: "处理器负载", usedText: "34%", sharePct: 34, color: "var(--af-series-1)" },
  { key: "ram", label: "内存占用", usedText: "6.2 / 16 GB", sharePct: 39, color: "var(--af-series-2)" },
  { key: "nvme", label: "系统盘空间", usedText: "86 / 320 GB", sharePct: 27, color: "var(--af-series-3)" },
];

const DEFAULT_PROBES: AfServerLatencyProbe[] = [
  {
    id: "pr-tyo",
    region: "东京品川 · BGP 直连",
    protocol: "ICMP / TCP-443",
    currentRttMs: 38,
    packetLossPct: 0,
    samples: [42, 39, 41, 37, 36, 40, 38, 39, 37, 38],
  },
  {
    id: "pr-hkg",
    region: "香港将军澳 · CN2 GIA",
    protocol: "ICMP / TCP-443",
    currentRttMs: 24,
    packetLossPct: 0,
    samples: [26, 25, 24, 25, 23, 24, 26, 24, 23, 24],
  },
  {
    id: "pr-lax",
    region: "洛杉矶 DC6 · 联通 9929",
    protocol: "ICMP / TCP-443",
    currentRttMs: 136,
    packetLossPct: 0.2,
    samples: [142, 139, 145, 138, 134, 137, 141, 135, 138, 136],
  },
];

/**
 * 桌面悬浮配额微卡 `AfQuotaFloatCard`（`P3-4`）：
 * - 可直接嵌入 `AfSubwindowChrome(variant="floating")` 透明子窗，展示网关健康绿点、今日 Token 消耗与剩余额度条。
 */
export function AfQuotaFloatCard({
  gatewayName = "主力模型服务网关",
  tokensUsedToday = 184260,
  remainingPercent = 74,
  latencyMs = 24,
  online = true,
  className,
}: AfQuotaFloatCardProps = {}) {
  const tweenedTokens = useTween(tokensUsedToday, 420);
  const clampedRemain = Math.max(0, Math.min(100, remainingPercent));

  return (
    <div className={cn("af-quota-float", className)} role="region" aria-label="桌面悬浮配额胶囊">
      <div className="af-quota-float__top">
        <div className="af-quota-float__status">
          <span
            className="af-quota-float__dot"
            data-online={online ? "true" : undefined}
            aria-hidden="true"
          />
          <strong>{gatewayName}</strong>
        </div>
        <span className="af-quota-float__rtt">{latencyMs} ms</span>
      </div>

      <div className="af-quota-float__nums">
        <div>
          <span>今日已用额度</span>
          <strong>{Math.round(tweenedTokens).toLocaleString("en-US")}</strong>
        </div>
        <div className="af-quota-float__remain">
          <span>剩余配额</span>
          <strong>{clampedRemain}%</strong>
        </div>
      </div>

      <div className="af-quota-float__bar" aria-hidden="true">
        <span style={{ width: `${clampedRemain}%` }} />
      </div>
    </div>
  );
}

/**
 * 系统与云服务器实时监控工作台 `AfServerMetricPanel`（`P3-4`）：
 * - 左侧月度流量计费周期重置环形卡（修复 `0%` 过渡的 `AfProgressRing` + 单层 `useTween` + `AfCountdown`）；
 * - 右侧 CPU / 内存 / NVMe 多段配比退暗联动条（`[data-dim="true"]` → `0.35`）+ 内置 `<AfSparkline interactive>` 多地域延迟探针行。
 */
export function AfServerMetricPanel({
  hostLabel = "东京节点 02 · 10Gbps 专线",
  bandwidthUsedGb = 642.5,
  bandwidthTotalGb = 1000,
  resetRemainingMs = 11 * 86400000 + 8 * 3600000,
  resources = DEFAULT_RESOURCES,
  probes = DEFAULT_PROBES,
  quotaCardProps,
  onRefreshProbes,
  className,
}: AfServerMetricPanelProps = {}) {
  const [hoveredRes, setHoveredRes] = useState<string | null>(null);

  const safeTotal = bandwidthTotalGb > 0 ? bandwidthTotalGb : 1000;
  const usedPct = Math.max(0, Math.min(100, (bandwidthUsedGb / safeTotal) * 100));
  const tweenedUsed = useTween(bandwidthUsedGb, 450);
  const totalShare = resources.reduce((s, r) => s + r.sharePct, 0) || 1;

  return (
    <section className={cn("af-srv-metrics", className)} aria-label="云服务器流量与节点延迟监控">
      <div className="af-srv-metrics__head">
        <div className="af-srv-metrics__title">
          <AfIcon name="server" size={15} />
          <strong>{hostLabel}</strong>
          <AfTag tone="success" size="sm">
            运行正常 · 在线率 99.98%
          </AfTag>
        </div>
        <AfButton size="sm" variant="secondary" icon="refresh" onClick={onRefreshProbes}>
          立即测速
        </AfButton>
      </div>

      <div className="af-srv-metrics__columns">
        {/* 左栏：月度双向流量计费周期重置环形卡 */}
        <div className="af-srv-metrics__ring-card">
          <span className="af-srv-metrics__card-title">月度双向计费流量周期</span>

          <div className="af-srv-metrics__ring-main">
            <AfProgressRing
              size={76}
              value={usedPct}
              max={100}
              tone={usedPct > 85 ? "danger" : usedPct > 70 ? "warning" : "accent"}
              label="月度流量已用百分比"
            />
            <div className="af-srv-metrics__ring-meta">
              <strong>
                {tweenedUsed.toFixed(1)} <small>/ {safeTotal} GB</small>
              </strong>
              <span>出入站双向合并计费</span>
              <div className="af-srv-metrics__reset-pill">
                <AfIcon name="clock" size={11} />
                <span>重置剩余</span>
                <AfCountdown
                  durationMs={resetRemainingMs}
                  format="compact"
                  size="xs"
                  paused
                />
              </div>
            </div>
          </div>

          <AfQuotaFloatCard {...quotaCardProps} />
        </div>

        {/* 右栏：系统负载双向退暗配比条 + 多地域延迟探针 */}
        <div className="af-srv-metrics__right">
          <div className="af-srv-metrics__res-card">
            <span className="af-srv-metrics__card-title">实例资源实时负载</span>
            <div className="af-srv-metrics__res-bar">
              {resources.map((res) => (
                <span
                  key={res.key}
                  className="af-srv-metrics__res-seg"
                  data-dim={hoveredRes !== null && hoveredRes !== res.key ? "true" : undefined}
                  style={{
                    width: `${(res.sharePct / totalShare) * 100}%`,
                    background: res.color,
                  }}
                  onPointerEnter={() => setHoveredRes(res.key)}
                  onPointerLeave={() => setHoveredRes(null)}
                />
              ))}
            </div>
            <div className="af-srv-metrics__res-legend">
              {resources.map((res) => (
                <div
                  key={res.key}
                  className="af-srv-metrics__res-item"
                  data-dim={hoveredRes !== null && hoveredRes !== res.key ? "true" : undefined}
                  onPointerEnter={() => setHoveredRes(res.key)}
                  onPointerLeave={() => setHoveredRes(null)}
                >
                  <i style={{ background: res.color }} aria-hidden="true" />
                  <span>{res.label}</span>
                  <strong>{res.usedText}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="af-srv-metrics__probes-card">
            <span className="af-srv-metrics__card-title">多地域线路回程延迟监测</span>
            <div className="af-srv-metrics__probes" data-af-hover-list="wash" role="list">
              {probes.map((pr) => (
                <div key={pr.id} data-af-hover-item role="listitem" className="af-srv-metrics__probe-row">
                  <div className="af-srv-metrics__probe-info">
                    <strong>{pr.region}</strong>
                    <span>
                      {pr.protocol} · 丢包率 {pr.packetLossPct}%
                    </span>
                  </div>

                  <AfSparkline
                    interactive
                    width={116}
                    height={28}
                    tone={pr.currentRttMs < 60 ? "success" : "accent"}
                    values={pr.samples}
                    formatValue={(v) => `${v} ms`}
                  />

                  <strong
                    className="af-srv-metrics__rtt"
                    data-fast={pr.currentRttMs < 60 ? "true" : undefined}
                  >
                    {pr.currentRttMs} ms
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
