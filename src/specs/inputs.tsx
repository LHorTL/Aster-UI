import { useState } from "react";
import "./base.css";
import "../patterns/inputs.css";
import type { ComponentSpec } from "../types";
import {
  AfAutoComplete,
  AfCalendar,
  AfCascader,
  AfDateTimePicker,
  AfTimePicker,
  type AfCascaderOption,
} from "../ui";
import { AfBillingSchedule } from "../components/navigation/BillingSchedule";
import { AfCombobox } from "../components/navigation/Combobox";
import { AfCommandMenu } from "../components/navigation/CommandMenu";
import { AfDatePicker } from "../components/navigation/DatePicker";
import { AfDateRangePicker } from "../components/navigation/DateRangePicker";
import { AfDropzone } from "../components/navigation/Dropzone";
import { AfFilterMenu } from "../components/navigation/FilterMenu";
import { AfIntegrationPicker } from "../components/navigation/IntegrationPicker";
import { AfIntegrationSettings } from "../components/navigation/IntegrationSettings";
import { AfOtpInput } from "../components/navigation/OtpInput";
import { AfProfileMenu } from "../components/navigation/ProfileMenu";
import { AfPromptLibrary } from "../components/navigation/PromptLibrary";
import { AfStepperForm } from "../components/navigation/StepperForm";
import { PROMPT_TEMPLATES } from "../components/_shared/inputs";

function ComboboxSpecimen() {
  return <AfCombobox defaultOpen />;
}

function PromptLibrarySpecimen() {
  return <AfPromptLibrary defaultValue={PROMPT_TEMPLATES[1]?.id} />;
}

function OtpInputSpecimen() {
  return (
    <div className="af-in-otp-card">
      <div className="af-in-otp-card__body">
        <span className="af-in-otp-card__icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1.75" y="3.25" width="12.5" height="9.5" rx="2" />
            <path d="M2.5 4.75l5.5 4 5.5-4" />
          </svg>
        </span>
        <h4 className="af-in-otp-card__title">Check your email</h4>
        <p className="af-in-otp-card__desc">
          We sent a code to <strong>maya@acme.com</strong>
        </p>
        <AfOtpInput validCode="482913" resendIn={30} />
      </div>
      <p className="af-in-otp-card__demo">
        Demo code: <span>482 913</span>
      </p>
    </div>
  );
}

function DateRangePickerSpecimen() {
  return <AfDateRangePicker defaultOpen today={new Date(2026, 10, 15)} max={new Date(2026, 10, 15)} />;
}

function DatePickerSpecimen() {
  return (
    <div className="af-in-date-demo">
      <AfDatePicker
        label="First run"
        showLabel
        defaultValue={new Date(2026, 10, 16)}
        today={new Date(2026, 10, 15)}
        isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
        hint="Research Agent only runs on weekdays."
      />
      <AfDatePicker
        label="Stop after"
        showLabel
        optional
        defaultValue={null}
        today={new Date(2026, 10, 15)}
        placeholder="Keeps running"
      />
    </div>
  );
}

function CommandMenuSpecimen() {
  return <AfCommandMenu />;
}

function AutoCompleteSpecimen() {
  const [endpoint, setEndpoint] = useState("https://api.openai.com/v1");
  return (
    <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, color: "var(--af-muted)" }}>
        输入关键字筛选常用接口或模型标识，支持键盘 ↑↓ 选择与一键清除。
      </div>
      <AfAutoComplete
        value={endpoint}
        onChange={setEndpoint}
        allowClear
        placeholder="输入 API 网关地址或模型名称…"
        options={[
          { value: "https://api.openai.com/v1", label: "OpenAI Official", description: "默认兼容接口" },
          { value: "https://api.anthropic.com/v1", label: "Anthropic Claude", description: "Messages v1" },
          { value: "http://127.0.0.1:11434/v1", label: "Ollama Local", description: "本地推理端口 11434" },
          { value: "https://openrouter.ai/api/v1", label: "OpenRouter Gateway", description: "多模型聚合路由" },
        ]}
      />
      <div style={{ fontSize: 12, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums" }}>
        当前值：{endpoint || "（空）"}
      </div>
    </div>
  );
}

const CASCADER_REGIONS: AfCascaderOption[] = [
  {
    value: "cn",
    label: "中国大陆",
    children: [
      {
        value: "east",
        label: "华东节点",
        children: [
          { value: "shanghai", label: "上海一区" },
          { value: "hangzhou", label: "杭州金融云" },
        ],
      },
      {
        value: "north",
        label: "华北节点",
        children: [
          { value: "beijing", label: "北京三区" },
          { value: "tianjin", label: "天津算力中心", disabled: true },
        ],
      },
      {
        value: "south",
        label: "华南节点",
        children: [
          { value: "shenzhen", label: "深圳前海" },
          { value: "guangzhou", label: "广州三区" },
        ],
      },
    ],
  },
  {
    value: "ap",
    label: "亚太地区",
    children: [
      {
        value: "jp",
        label: "日本",
        children: [{ value: "tokyo", label: "东京 Edge" }],
      },
      {
        value: "sg",
        label: "新加坡",
        children: [{ value: "sgp1", label: "新加坡一区" }],
      },
    ],
  },
];

const INITIAL_ASYNC_NODES: AfCascaderOption[] = [
  { value: "us-west", label: "美西硅谷", isLeaf: false },
  { value: "eu-central", label: "欧洲法兰克福", isLeaf: false },
];

function CascaderSpecimen() {
  const [regionPath, setRegionPath] = useState<string[]>(["cn", "east", "shanghai"]);
  const [hoverPath, setHoverPath] = useState<string[]>(["ap", "jp", "tokyo"]);
  const [anyLevelPath, setAnyLevelPath] = useState<string[]>(["cn", "east"]);
  const [multiPaths, setMultiPaths] = useState<string[][]>([
    ["cn", "east", "shanghai"],
    ["cn", "east", "hangzhou"],
    ["ap", "sg", "sgp1"],
  ]);
  const [asyncOptions, setAsyncOptions] = useState<AfCascaderOption[]>(INITIAL_ASYNC_NODES);
  const [asyncPath, setAsyncPath] = useState<string[]>([]);

  const handleLoadData = (selectedOptions: AfCascaderOption[]) =>
    new Promise<void>((resolve) => {
      const target = selectedOptions[selectedOptions.length - 1];
      if (!target) {
        resolve();
        return;
      }
      window.setTimeout(() => {
        setAsyncOptions((prev) =>
          prev.map((node) =>
            node.value === target.value
              ? {
                  ...node,
                  children: [
                    { value: `${node.value}-a`, label: `${node.label} A 区` },
                    { value: `${node.value}-b`, label: `${node.label} B 区` },
                  ],
                }
              : node,
          ),
        );
        resolve();
      }, 260);
    });

  return (
    <div className="af-base-demo">
      <section className="af-base-panel" data-wide>
        <header className="af-base-panel__head">
          <strong>级联选择器（Cascader）</strong>
          <span>
            支持点击/悬停双展开、任意层级提交、多选父子联动勾选、路径模糊搜索、异步懒加载与表单状态。
          </span>
        </header>

        <div className="af-base-row">
          <span className="af-base-row__label">
            <span className="af-base-row__title">默认点击展开 + 搜索</span>
            <span className="af-base-row__hint">
              已选：{regionPath.length ? regionPath.join(" / ") : "未选择"}
            </span>
          </span>
          <span className="af-base-row__control">
            <AfCascader
              width={256}
              label="默认级联区域"
              value={regionPath}
              onChange={(next) => setRegionPath(next)}
              searchable
              allowClear
              placeholder="选择区域 / 可用区 / 节点…"
              options={CASCADER_REGIONS}
            />
          </span>
        </div>

        <div className="af-base-row">
          <span className="af-base-row__label">
            <span className="af-base-row__title">悬停即时展开</span>
            <span className="af-base-row__hint">
              expandTrigger="hover" · 已选：{hoverPath.length ? hoverPath.join(" / ") : "未选择"}
            </span>
          </span>
          <span className="af-base-row__control">
            <AfCascader
              width={256}
              label="悬停展开区域"
              expandTrigger="hover"
              value={hoverPath}
              onChange={(next) => setHoverPath(next)}
              allowClear
              options={CASCADER_REGIONS}
            />
          </span>
        </div>

        <div className="af-base-row">
          <span className="af-base-row__label">
            <span className="af-base-row__title">选择任意父级</span>
            <span className="af-base-row__hint">
              changeOnSelect · 可在地区/节点级直接提交（{anyLevelPath.join(" / ") || "未选"}）
            </span>
          </span>
          <span className="af-base-row__control">
            <AfCascader
              width={256}
              label="任意层级选择"
              changeOnSelect
              allowClear
              value={anyLevelPath}
              onChange={(next) => setAnyLevelPath(next)}
              options={CASCADER_REGIONS}
            />
          </span>
        </div>

        <div className="af-base-row">
          <span className="af-base-row__label">
            <span className="af-base-row__title">多选级联与折叠父级</span>
            <span className="af-base-row__hint">
              multiple + SHOW_PARENT · 全选子区自动合并为父节点，支持搜索与半选联动
            </span>
          </span>
          <span className="af-base-row__control">
            <AfCascader
              width={276}
              label="多选部署区域"
              multiple
              searchable
              allowClear
              maxTagCount={2}
              showCheckedStrategy="SHOW_PARENT"
              value={multiPaths}
              onChange={(next) => setMultiPaths(next)}
              placeholder="勾选多个可用区…"
              options={CASCADER_REGIONS}
            />
          </span>
        </div>

        <div className="af-base-row">
          <span className="af-base-row__label">
            <span className="af-base-row__title">异步动态加载子级</span>
            <span className="af-base-row__hint">
              loadData · 点击海外节点按需拉取下级区（{asyncPath.length ? asyncPath.join(" / ") : "点击展开"}）
            </span>
          </span>
          <span className="af-base-row__control">
            <AfCascader
              width={256}
              label="异步加载区域"
              options={asyncOptions}
              loadData={handleLoadData}
              value={asyncPath}
              onChange={(next) => setAsyncPath(next)}
              placeholder="点击节点动态加载…"
            />
          </span>
        </div>

        <div className="af-base-row">
          <span className="af-base-row__label">
            <span className="af-base-row__title">尺寸与校验状态</span>
            <span className="af-base-row__hint">sm 紧凑高度、错误环与禁用态</span>
          </span>
          <span className="af-base-row__control" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <AfCascader
              size="sm"
              width={132}
              invalid
              label="校验失败示例"
              placeholder="必填节点"
              options={CASCADER_REGIONS}
            />
            <AfCascader
              size="sm"
              width={132}
              disabled
              label="禁用示例"
              defaultValue={["cn", "east", "shanghai"]}
              options={CASCADER_REGIONS}
            />
          </span>
        </div>
      </section>
    </div>
  );
}

function TimePickerSpecimen() {
  const [timeVal, setTimeVal] = useState("09:30:00");
  const [dtVal, setDtVal] = useState("2026-11-13 14:30");
  return (
    <div style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220, flex: "1 1 220px" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--af-strong)" }}>纯时间选择（含秒）</span>
        <AfTimePicker value={timeVal} onChange={setTimeVal} showSecond allowClear width={200} />
        <span style={{ fontSize: 11, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums" }}>
          已选：{timeVal || "—"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 240, flex: "1 1 240px" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--af-strong)" }}>日期时间联合选择</span>
        <AfDateTimePicker value={dtVal} onChange={setDtVal} allowClear width={230} />
        <span style={{ fontSize: 11, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums" }}>
          已选：{dtVal || "—"}
        </span>
      </div>
    </div>
  );
}

function CalendarSpecimen() {
  const [selected, setSelected] = useState("2026-11-13");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
      <AfCalendar
        value={selected}
        onChange={setSelected}
        defaultMonth="2026-11"
        holidays={{
          "2026-11-07": { label: "休", type: "rest" },
          "2026-11-08": { label: "班", type: "work" },
          "2026-11-14": { label: "休", type: "rest" },
        }}
      />
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--af-muted)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>当前选中日期：</span>
        <code
          style={{
            fontFamily: "var(--af-mono)",
            fontFeatureSettings: "normal",
            fontSize: 12,
            lineHeight: "18px",
            padding: "1px 6px",
            borderRadius: 5,
            background: "var(--af-wash)",
            boxShadow: "inset 0 0 0 0.5px var(--af-line-strong)",
            color: "var(--af-ink)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {selected}
        </code>
      </span>
    </div>
  );
}

/** Input & Navigation specimen manifest. */
export const inputSpecs: ComponentSpec[] = [
  {
    id: "filter-menu",
    title: "Filter Menu",
    group: "输入与导航",
    source: "free",
    note: "affectUI Clean component. Active filter chips + collapsible checkbox groups with keyboard fold and toggle.",
    render: AfFilterMenu,
    width: 720,
    height: 500,
  },
  {
    id: "combobox",
    title: "Combobox",
    group: "基础控件",
    source: "pro",
    note: "affectUI Pro component. Searchable multi-select with avatar chips, grouped options, match highlight & invite creation.",
    render: ComboboxSpecimen,
    width: 720,
    height: 560,
  },
  {
    id: "otp-input",
    title: "OTP Input",
    group: "基础控件",
    source: "free",
    note: "affectUI Clean component. 6-digit verification card with sliding neutral focus ring, paste fill, error shake & verified pill.",
    render: OtpInputSpecimen,
    width: 720,
    height: 360,
  },
  {
    id: "prompt-library",
    title: "Prompt Library",
    group: "输入与导航",
    source: "pro",
    note: "affectUI Pro component. Searchable prompt templates with inline variable chips, completion indicator & live preview.",
    render: PromptLibrarySpecimen,
    width: 760,
    height: 440,
  },
  {
    id: "stepper-form",
    title: "Stepper Form",
    group: "输入与导航",
    source: "pro",
    note: "affectUI Pro component. 4-step setup wizard with directional crossfade, ResizeObserver height morph & inline validation.",
    render: AfStepperForm,
    width: 720,
    height: 520,
  },
  {
    id: "billing-schedule",
    title: "Billing Schedule",
    group: "输入与导航",
    source: "pro",
    note: "affectUI Pro component. Billing phase builder with milestone/duration selector, inline product rows & live totals.",
    render: AfBillingSchedule,
    width: 760,
    height: 600,
  },
  {
    id: "dropzone",
    title: "Dropzone",
    group: "基础控件",
    source: "pro",
    note: "affectUI Pro component. Document fan dropzone with live upload progress, retry on failure & clear completed.",
    render: AfDropzone,
    width: 720,
    height: 500,
  },
  {
    id: "integration-settings",
    title: "Integration Settings",
    group: "输入与导航",
    source: "pro",
    note: "affectUI Pro component. Connected app settings card with master switch, one-time API key, domain check & save bar.",
    render: AfIntegrationSettings,
    width: 720,
    height: 560,
  },
  {
    id: "date-range-picker",
    title: "Date Range Picker",
    group: "基础控件",
    source: "pro",
    note: "affectUI Pro component. Presets + dual calendars + 3-way compare toggle with Cancel / Apply commit.",
    render: DateRangePickerSpecimen,
    width: 760,
    height: 560,
  },
  {
    id: "date-picker",
    title: "Date Picker",
    group: "基础控件",
    source: "free",
    note: "affectUI Clean component. Stacked weekday-constrained & optional date pickers with anchored calendar popover.",
    render: DatePickerSpecimen,
    width: 720,
    height: 560,
  },
  {
    id: "profile-menu",
    title: "Profile Menu",
    group: "输入与导航",
    source: "free",
    note: "affectUI Clean component. Account menu with sliding hover pill, keyboard navigation & interactive profile setup progress.",
    render: AfProfileMenu,
    width: 720,
    height: 460,
  },
  {
    id: "integration-picker",
    title: "Integration Picker",
    group: "输入与导航",
    source: "pro",
    note: "affectUI Pro component. Connected/Available integration directory with dual brand tiles, capabilities & live switch.",
    render: AfIntegrationPicker,
    width: 760,
    height: 620,
  },
  {
    id: "command-menu",
    title: "Command Menu",
    group: "输入与导航",
    source: "pro",
    note: "affectUI Pro component. Grouped command palette with instant search, keyboard navigation & shortcut hints.",
    render: CommandMenuSpecimen,
    width: 720,
    height: 560,
  },
  {
    id: "auto-complete",
    title: "Auto Complete",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。文本输入联想补全：支持键盘高亮、一键清空、自定义过滤与 FormField 联动。",
    render: AutoCompleteSpecimen,
    width: 720,
    height: 400,
  },
  {
    id: "cascader",
    title: "Cascader",
    group: "基础控件",
    source: "project",
    note: "Aster UI 通用基础控件。支持点击/悬停双展开、任意层级选中、多选父子联动、路径搜索与异步动态加载。",
    render: CascaderSpecimen,
    width: 720,
    height: 540,
  },
  {
    id: "time-picker",
    title: "Time & DateTime Picker",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。纯时分秒多列拨盘（AfTimePicker）与月历+时间联合弹窗（AfDateTimePicker）。",
    render: TimePickerSpecimen,
    width: 720,
    height: 440,
  },
  {
    id: "calendar",
    title: "Calendar",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。独立 Flexbox 7 列月历，支持节假日/调休角标、禁用日期与月份切换。",
    render: CalendarSpecimen,
    width: 720,
    height: 480,
  },
];
