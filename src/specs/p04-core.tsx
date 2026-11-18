import { useState, type CSSProperties } from "react";
import {
  AfButton,
  AfDateTimeRangePicker,
  AfHotkeyInput,
  AfNumberInput,
  AfSegmented,
  AfSlider,
} from "../components/controls";
import {
  AfAppMark,
  AfCountdown,
  AfOverflowTagList,
  AfQrCodeCard,
  AfSparkline,
  type AfQrCodeStatus,
} from "../components/display";
import type { ComponentSpec } from "../types";

const SPEC_STAGE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  width: "100%",
  maxWidth: 460,
  margin: "0 auto",
};

const SPEC_CARD: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: 18,
  borderRadius: "var(--af-r-lg)",
  background: "var(--af-surface)",
  boxShadow: "var(--af-shadow-card)",
};

const SPEC_LABEL: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--af-muted)",
  lineHeight: "16px",
};

function AppMarkSpecimen() {
  return (
    <div style={SPEC_STAGE}>
      <div style={SPEC_CARD}>
        <span style={SPEC_LABEL}>尺寸梯度（20 / 28 / 36 / 48 / 64px）与在线/未读角标</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <AfAppMark size={20} icon="terminal" tone="neutral" name="CLI" />
          <AfAppMark size={28} icon="sparkle" tone="accent" name="Copilot" statusBadge="online" />
          <AfAppMark size={36} icon="globe" tone="info" name="Gateway" statusBadge="running" />
          <AfAppMark size={48} icon="bolt" tone="purple" name="Workflow" badgeCount={5} />
          <AfAppMark size={64} name="桌面工作台" tone="warm" statusBadge="update" />
        </div>
        <span style={SPEC_LABEL}>圆角形态（超椭圆 / 圆角矩形 / 圆形）与首字母自动回退</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <AfAppMark shape="squircle" name="桌面助手" tone="accent" />
          <AfAppMark shape="rounded" name="Knowledge Base" tone="ok" />
          <AfAppMark shape="circle" name="Vector DB" tone="purple" statusBadge="busy" />
          <AfAppMark
            shape="squircle"
            tone="err"
            statusBadge="error"
            icon={
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M9 2.5L15 6v6l-6 3.5L3 12V6l6-3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="9" r="2" fill="currentColor" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

const DEMO_TAGS = [
  { key: "mcp", label: "MCP 协议", color: "blue" as const },
  { key: "local", label: "本地模型", color: "emerald" as const },
  { key: "rag", label: "知识检索", color: "violet" as const },
  { key: "vision", label: "多模态视觉", color: "amber" as const },
  { key: "sandbox", label: "安全沙箱", color: "cyan" as const },
  { key: "stream", label: "流式输出", color: "rose" as const },
];

function OverflowTagListSpecimen() {
  const [boxWidth, setBoxWidth] = useState(280);
  return (
    <div style={SPEC_STAGE}>
      <div style={SPEC_CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={SPEC_LABEL}>拖动调节容器宽度，超出单行范围的标签自动折叠</span>
          <span style={{ fontSize: 12, color: "var(--af-strong)", fontVariantNumeric: "tabular-nums" }}>
            {boxWidth}px
          </span>
        </div>
        <AfSlider min={150} max={420} step={10} value={boxWidth} onChange={setBoxWidth} aria-label="容器宽度" />
        <div
          style={{
            width: boxWidth,
            maxWidth: "100%",
            padding: "10px 12px",
            borderRadius: "var(--af-r-md)",
            background: "var(--af-surface-sunken)",
            boxShadow: "inset 0 0 0 1px var(--af-line)",
          }}
        >
          <AfOverflowTagList items={DEMO_TAGS} />
        </div>
      </div>
    </div>
  );
}

function HotkeyInputSpecimen() {
  const [globalKey, setGlobalKey] = useState("Mod+Shift+Space");
  const [captureKey, setCaptureKey] = useState("Alt+A");
  return (
    <div style={SPEC_STAGE}>
      <div style={SPEC_CARD}>
        <span style={SPEC_LABEL}>全局唤醒热键（支持录制、重置默认值与冲突拦截）</span>
        <AfHotkeyInput
          value={globalKey}
          onChange={setGlobalKey}
          resetValue="Mod+Shift+Space"
          checkConflict={(combo) => (combo === "Mod+C" ? "与系统复制快捷键冲突" : null)}
          hint="点击输入框后直接按下组合键，Esc 退出录制"
        />
        <span style={SPEC_LABEL}>区域截图热键</span>
        <AfHotkeyInput
          size="sm"
          value={captureKey}
          onChange={setCaptureKey}
          resetValue="Alt+A"
        />
      </div>
    </div>
  );
}

function CountdownSpecimen() {
  const [running, setRunning] = useState(false);
  return (
    <div style={SPEC_STAGE}>
      <div style={SPEC_CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={SPEC_LABEL}>等宽数字倒计时与剩余阈值自动告警色</span>
          <AfButton size="xs" variant="ghost" onClick={() => setRunning((v) => !v)}>
            {running ? "暂停读秒" : "启动读秒"}
          </AfButton>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <AfCountdown durationMs={3_725_000} paused={!running} variant="pill" prefix="授权有效" />
          <AfCountdown
            durationMs={42_000}
            paused={!running}
            format="mm:ss"
            variant="pill"
            warnThresholdMs={60_000}
            dangerThresholdMs={15_000}
            prefix="即将刷新"
          />
          <AfCountdown
            durationMs={9_000}
            paused={!running}
            format="mm:ss"
            variant="pill"
            dangerThresholdMs={15_000}
            prefix="会话锁定"
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <AfCountdown
            durationMs={95_400_000}
            paused={!running}
            format="compact"
            variant="card"
            size="lg"
            prefix="距版本封板"
          />
          <AfSparkline
            interactive
            showArea
            tone="accent"
            width={132}
            height={34}
            values={[18, 24, 21, 32, 29, 41, 38, 49]}
            labels={["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]}
            formatValue={(v) => `${v} req/s`}
          />
        </div>
      </div>
    </div>
  );
}

function QrCodeCardSpecimen() {
  const [status, setStatus] = useState<AfQrCodeStatus>("active");
  return (
    <div style={{ ...SPEC_STAGE, alignItems: "center" }}>
      <AfSegmented<AfQrCodeStatus>
        size="sm"
        value={status}
        onChange={setStatus}
        options={[
          { value: "active", label: "待扫码" },
          { value: "scanned", label: "已扫码" },
          { value: "confirmed", label: "已确认" },
          { value: "expired", label: "已过期" },
        ]}
      />
      <AfQrCodeCard
        value="https://pair.example.com/device?code=884210"
        size={156}
        status={status}
        title="移动端扫码配对"
        description="使用桌面助手移动端扫描二维码完成端到端加密绑定"
        logo={<AfAppMark size={28} icon="sparkle" tone="accent" />}
        onRefresh={() => setStatus("active")}
        footer={<AfCountdown durationMs={118_000} paused format="mm:ss" size="xs" prefix="有效期剩余" />}
      />
    </div>
  );
}

function DateTimeAndScrubSpecimen() {
  const [unit, setUnit] = useState("GB");
  const [quota, setQuota] = useState(32);
  return (
    <div style={SPEC_STAGE}>
      <div style={SPEC_CARD}>
        <span style={SPEC_LABEL}>双语日期时间区间选择器（含快捷预设与秒级精度）</span>
        <AfDateTimeRangePicker
          locale="zh-CN"
          showSeconds
          today={new Date(2026, 10, 16)}
          defaultValue={[new Date(2026, 10, 10, 9, 0, 0), new Date(2026, 10, 16, 18, 30, 0)]}
        />
        <span style={SPEC_LABEL}>水平拖动前缀区域微调数值，支持一键切换单位</span>
        <AfNumberInput
          scrubbable
          min={1}
          max={1024}
          value={quota}
          onChange={setQuota}
          unit={unit}
          onUnitChange={setUnit}
          unitOptions={["MB", "GB", "TB"]}
          prefix="缓存上限"
        />
      </div>
    </div>
  );
}

export const p04CoreSpecs: ComponentSpec[] = [
  {
    id: "app-mark",
    title: "应用图标容器",
    group: "基础控件",
    source: "project",
    note: "桌面应用与扩展图标容器：支持内置图标、矢量图形、图片与中英文首字母回退，内置多种圆角形态与状态/计数角标。",
    render: AppMarkSpecimen,
    width: 500,
  },
  {
    id: "overflow-tag-list",
    title: "自适应折叠标签组",
    group: "数据展示",
    source: "project",
    note: "根据容器可用宽度实时计算单行容量，超出部分自动折叠为 +N 胶囊并支持浮层查看完整标签。",
    render: OverflowTagListSpecimen,
    width: 500,
  },
  {
    id: "hotkey-input",
    title: "快捷键录制框",
    group: "输入与导航",
    source: "project",
    note: "支持修饰键组合录入、实时按键胶囊展示、热键冲突提示、Esc 退出录制与一键恢复默认值。",
    render: HotkeyInputSpecimen,
    width: 500,
  },
  {
    id: "countdown",
    title: "等宽倒计时与微折线检视",
    group: "数据展示",
    source: "project",
    note: "高精度等宽数字倒计时（支持临期多级告警色）与带悬停逐点读数胶囊的交互式趋势微折线。",
    render: CountdownSpecimen,
    width: 500,
  },
  {
    id: "qr-code-card",
    title: "扫码配对卡片",
    group: "数据展示",
    source: "project",
    note: "本地矢量二维码渲染卡片，支持中心图标叠加以及待扫码、已扫码、已过期、已确认四态平滑切换。",
    render: QrCodeCardSpecimen,
    width: 440,
  },
  {
    id: "datetime-range-picker",
    title: "日期时间区间与拖拽数值框",
    group: "输入与导航",
    source: "project",
    note: "含快捷预设与秒级滚轮的日期时间区间选择器，以及支持水平拖拽微调与单位切换的数值输入框。",
    render: DateTimeAndScrubSpecimen,
    width: 500,
  },
];
