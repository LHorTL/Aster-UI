import { useEffect, useMemo, useRef, useState } from "react";
import { AfLayerProvider } from "../ui";
import { AfColorPicker } from "../color-picker";
import { AfIcon } from "../icons";
import { baseSpecs } from "../specs/base";
import { controlsSpecs } from "../specs/controls-specs";
import { layoutGuideSpecs } from "../specs/layout-guide";
import { overlaysSpecs } from "../specs/overlays-specs";
import { p04CoreSpecs } from "../specs/p04-core";
import { advancedSpecs } from "../specs/advanced";
import { colorPickerSpecs } from "../specs/color-picker";
import { inputSpecs } from "../specs/inputs";
import { chatSpecs } from "../specs/chat";
import { dataSpecs } from "../specs/data";
import { agentsASpecs } from "../specs/agents-a";
import { agentsBSpecs } from "../specs/agents-b";
import { agentsCSpecs } from "../specs/agents-c";
import { agentsDSpecs } from "../specs/agents-d";
import { projectSpecs } from "../specs/project";
import { shellSpecs } from "../specs/shell";
import { motionSpecs } from "../specs/motion";
import { screenOnboardingSpecs } from "../specs/screen-onboarding";
import { screenSettingsSpecs } from "../specs/screen-settings";
import { screenAgentRunsSpecs } from "../specs/screen-agent-runs";
import { screenWorkspaceSpecs } from "../specs/screen-workspace";
import { screenChatSpecs } from "../specs/screen-chat";
import { screenAgentOpsSpecs } from "../specs/screen-agent-ops";
import { illustrationsASpecs } from "../specs/illustrations-a";
import { illustrationsBSpecs } from "../specs/illustrations-b";
import { ASTER_ACCENT_PRESETS, useAsterTheme, type AsterAccentPreset, type AsterThemeMode } from "../theme";
import { GROUPS, type ComponentSpec } from "../types";
import "./gallery.css";
import "./app.css";

/** Aster UI 展示站收录的可复用组件（注意：重构覆盖列表如 controlsSpecs / overlaysSpecs 合入时须排在 baseSpecs 之前）。 */
const allSpecs: ComponentSpec[] = (() => {
  const seen = new Set<string>();
  return [
    // Override spec arrays (controlsSpecs, overlaysSpecs) register BEFORE baseSpecs
    ...layoutGuideSpecs,
    ...controlsSpecs,
    ...overlaysSpecs,
    ...p04CoreSpecs,
    ...baseSpecs,
    ...advancedSpecs,
    ...colorPickerSpecs,
    ...inputSpecs,
    ...chatSpecs,
    ...dataSpecs,
    ...agentsASpecs,
    ...agentsBSpecs,
    ...agentsCSpecs,
    ...agentsDSpecs,
    ...projectSpecs,
    ...shellSpecs,
    ...motionSpecs,
    ...screenOnboardingSpecs,
    ...screenSettingsSpecs,
    ...screenAgentRunsSpecs,
    ...screenWorkspaceSpecs,
    ...screenChatSpecs,
    ...screenAgentOpsSpecs,
    ...illustrationsASpecs,
    ...illustrationsBSpecs,
  ].filter((spec) => {
    if (seen.has(spec.id)) return false;
    seen.add(spec.id);
    return true;
  });
})();

/** 组件来源标签。 */
const sourceLabel: Record<ComponentSpec["source"], string> = {
  free: "Free",
  pro: "Pro",
  project: "Aster",
};

/** 内置强调色的展示色。 */
const PRESET_COLORS: Record<AsterAccentPreset, string> = {
  blue: "#0060e2",
  violet: "#7c5cff",
  green: "#0f9f7f",
  orange: "#e2620c",
};

/** 主题模式中文名。 */
const MODE_LABEL: Record<AsterThemeMode, string> = {
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
};

/** AffectUI 官网 slug 到 Aster UI 规范组件 id 的兼容别名映射。 */
const COMPONENT_ID_ALIASES: Record<string, string> = {
  "text-field": "input",
  "text-area": "textarea",
  dialog: "modal",
  tree: "tree-view",
  "chip-input": "tag-input",
};

/** 读取地址参数里的组件 id（优先精确匹配已有 spec.id，其次回退 AffectUI 原始 slug 别名）。 */
function initialComponentId() {
  const raw = new URLSearchParams(location.search).get("component");
  if (raw && allSpecs.some((spec) => spec.id === raw)) return raw;
  const aliased = raw ? COMPONENT_ID_ALIASES[raw] ?? raw : null;
  return aliased && allSpecs.some((spec) => spec.id === aliased) ? aliased : allSpecs[0]?.id ?? "";
}

/** 把任意主题模式写回地址；嵌入模式保留 embed 参数。 */
function currentQuery() {
  return new URLSearchParams(location.search);
}

/** 组件预览：给浮层组件提供挂载容器，并按设计尺寸约束舞台。 */
function ComponentPreview({ spec }: { spec: ComponentSpec }) {
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const Render = spec.render;
  const fallbackMinHeight = spec.group === "Screens" ? 600 : spec.group === "Blocks" ? 420 : 240;
  return (
    <div
      className="af-gal-stage"
      data-component={spec.id}
      data-group={spec.group}
      ref={setStage}
      style={{
        minHeight: spec.height ?? fallbackMinHeight,
        width: "100%",
        minWidth: spec.width ? spec.width + 32 : undefined,
      }}
    >
      <AfLayerProvider value={stage}>
        <Render />
      </AfLayerProvider>
    </div>
  );
}

/** 展示站右上角主题配置：明暗三模式 + 强调色预设 + 自定义颜色。 */
function ThemeControl() {
  const { mode, resolved, accent, isPresetAccent, setMode, setAccent } = useAsterTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        if ((event.target as Element).closest?.(".af-colorpicker__pop")) return;
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const currentColor = isPresetAccent ? PRESET_COLORS[accent as AsterAccentPreset] ?? PRESET_COLORS.blue : accent;
  const label = MODE_LABEL[mode];

  return (
    <div className="ast-theme-wrap" ref={rootRef}>
      <button
        type="button"
        className="ast-theme"
        aria-label={`主题设置，当前${label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="ast-theme-swatch" style={{ background: currentColor }} aria-hidden />
        <AfIcon name={resolved === "dark" ? "moon" : "sun"} size={14} />
        {label}
        <AfIcon name="chevronDown" size={12} />
      </button>
      {open ? (
        <div className="ast-theme-pop" role="dialog" aria-label="主题设置">
          <div className="ast-theme-row">
            <span className="ast-theme-label">外观</span>
            <div className="ast-theme-modes">
              {(["light", "dark", "system"] as AsterThemeMode[]).map((value) => (
                <button key={value} type="button" data-active={mode === value || undefined} onClick={() => setMode(value)}>
                  {MODE_LABEL[value]}
                </button>
              ))}
            </div>
          </div>
          <div className="ast-theme-row">
            <span className="ast-theme-label">强调色</span>
            <div className="ast-swatches">
              {ASTER_ACCENT_PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="ast-swatch"
                  style={{ background: PRESET_COLORS[value] }}
                  aria-label={value}
                  aria-pressed={isPresetAccent && accent === value}
                  data-active={(isPresetAccent && accent === value) || undefined}
                  onClick={() => setAccent(value)}
                />
              ))}
              <AfColorPicker
                className="ast-colorpicker-custom"
                variant="swatch"
                label="自定义强调色"
                value={currentColor}
                onChange={setAccent}
                presets={[]}
              />
            </div>
          </div>
          <p className="ast-theme-hint">强调色支持任意颜色，深浅色下会自动推导 ink / soft / focus 层级。</p>
        </div>
      ) : null}
    </div>
  );
}

/** Aster UI 组件浏览器：左侧分组导航 + 右侧单组件预览。 */
export function Showcase() {
  const [activeId, setActiveId] = useState(initialComponentId);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { mode, accent } = useAsterTheme();
  const embed = currentQuery().get("embed") === "1";
  const active = allSpecs.find((spec) => spec.id === activeId) ?? allSpecs[0];

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const matchesKeyword = (spec: ComponentSpec) =>
      !keyword || `${spec.id} ${spec.title} ${spec.group} ${spec.note}`.toLowerCase().includes(keyword);
    const map = new Map<string, ComponentSpec[]>();
    const knownGroups = new Set<string>(GROUPS);
    for (const group of GROUPS) {
      const items = allSpecs.filter((spec) => spec.group === group && matchesKeyword(spec));
      if (items.length) map.set(group, items);
    }
    for (const spec of allSpecs) {
      if (knownGroups.has(spec.group) || !matchesKeyword(spec)) continue;
      const bucket = map.get(spec.group) ?? [];
      bucket.push(spec);
      map.set(spec.group, bucket);
    }
    return map;
  }, [query]);

  // 响应浏览器前进/后退时同步地址参数里的 component
  useEffect(() => {
    const onPopState = () => {
      const next = initialComponentId();
      if (next) setActiveId(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // 把当前组件、主题模式与强调色写回地址栏，方便直接分享
  useEffect(() => {
    const params = currentQuery();
    params.set("component", active?.id ?? allSpecs[0]?.id ?? "");
    params.set("theme", mode);
    params.set("accent", accent);
    history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
  }, [active?.id, mode, accent]);

  // `/` 聚焦搜索，和文档站保持一致
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target as HTMLElement).closest("input, textarea")) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const freeCount = allSpecs.filter((spec) => spec.source === "free").length;
  const proCount = allSpecs.filter((spec) => spec.source === "pro").length;
  const asterCount = allSpecs.filter((spec) => spec.source === "project").length;
  const blocksCount = allSpecs.filter((spec) => spec.group === "Blocks").length;
  const screensCount = allSpecs.filter((spec) => spec.group === "Screens").length;

  // 视觉回归 / 截图模式：只渲染当前组件舞台，页面由外框参数控制
  if (embed) {
    return (
      <section className="af-gal ast-embed">
        <main className="af-gal__main ast-main">
          <div className="af-gal__scroller ast-scroller">
            <div className="ast-stagecard">
              <div className="ast-stagelabel">
                <span>Preview</span>
                <span>{active?.title}</span>
              </div>
              {active ? <ComponentPreview spec={active} /> : null}
            </div>
          </div>
        </main>
      </section>
    );
  }

  return (
    <section className="af-gal ast-gal">
      <header className="af-gal__head ast-head">
        <div className="af-gal__intro ast-intro">
          <div className="ast-brand">
            <span className="ast-mark" aria-hidden>
              A
            </span>
            <span className="ast-brandtext">
              <strong>Aster UI</strong>
              <small>星序 · Components</small>
            </span>
          </div>
          <h1>面向现代桌面与 Web 应用的 React 组件库</h1>
          <p>安静、精确、可直接迁移的 React 组件。左侧选组件，右侧查看真实交互；每个预览都是独立组件，不依赖展示站。</p>
        </div>
        <div className="ast-headside">
          <div className="ast-counts">
            <span>
              <b>{allSpecs.length}</b> components
            </span>
            <span>
              <b>{proCount}</b> Pro
            </span>
            <span>
              <b>{freeCount}</b> Free
            </span>
            <span>
              <b>{asterCount}</b> Aster
            </span>
            {blocksCount > 0 ? (
              <span>
                <b>{blocksCount}</b> Blocks
              </span>
            ) : null}
            {screensCount > 0 ? (
              <span>
                <b>{screensCount}</b> Screens
              </span>
            ) : null}
          </div>
          <ThemeControl />
        </div>
      </header>

      <div className="af-gal__body">
        <aside className="af-gal__side ast-side">
          <label className="af-gal__search">
            <AfIcon name="search" size={14} />
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`搜索 ${allSpecs.length} 个组件…`} aria-label="搜索组件" />
            <kbd>/</kbd>
          </label>
          <nav className="af-gal__nav" aria-label="组件分组">
            {[...filtered.entries()].map(([group, items]) => (
              <div key={group} className="af-gal__group">
                <div className="af-gal__grouphead">
                  <span>{group}</span>
                  <em>{items.length}</em>
                </div>
                {items.map((spec) => (
                  <button
                    key={spec.id}
                    type="button"
                    className="af-gal__item"
                    data-component-id={spec.id}
                    data-active={spec.id === active?.id || undefined}
                    onClick={() => setActiveId(spec.id)}
                  >
                    <span className="af-gal__itemtitle">{spec.title}</span>
                    <span className="af-gal__dot" data-source={spec.source} aria-hidden />
                  </button>
                ))}
              </div>
            ))}
            {filtered.size === 0 ? <p className="af-gal__empty">没有匹配的组件。</p> : null}
          </nav>
          <div className="ast-sidefoot">
            <span>
              <b>Aster UI</b> v0.6.0
            </span>
            <span>{allSpecs.length} extracted components</span>
          </div>
        </aside>

        <main className="af-gal__main ast-main">
          {active ? (
            <>
              <div className="af-gal__meta ast-meta">
                <div className="af-gal__titleline">
                  <h2>{active.title}</h2>
                  <span className="af-gal-badge" data-source={active.source}>
                    {sourceLabel[active.source]}
                  </span>
                  <span className="af-gal-badge">{active.group}</span>
                  <code>{active.id}</code>
                </div>
                <p>{active.note}</p>
              </div>
              <div className="af-gal__scroller ast-scroller">
                <div className="ast-stagecard">
                  <div className="ast-stagelabel">
                    <span>Live preview</span>
                    <span>{allSpecs.filter((spec) => spec.group === active.group).length} in {active.group}</span>
                  </div>
                  <ComponentPreview spec={active} />
                </div>
              </div>
              <footer className="af-gal__foot ast-foot">
                <AfIcon name="layers" size={14} />
                <span>
                  Aster UI · 跨项目可复用的桌面与 Web 组件库，展示站与组件共用同一套 token、基础控件和交互。
                </span>
              </footer>
            </>
          ) : (
            <p className="af-gal__empty">组件尚未加载。</p>
          )}
        </main>
      </div>
    </section>
  );
}
