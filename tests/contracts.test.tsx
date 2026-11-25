import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as AsterUI from "@fangxinyan/aster-ui";
import * as AsterRuntime from "@fangxinyan/aster-ui/runtime";
import * as AsterExamples from "@fangxinyan/aster-ui/examples";
import * as AsterCore from "@fangxinyan/aster-ui/core";
import * as AsterPrimitives from "@fangxinyan/aster-ui/primitives";

const {
  AF_ICON_ALIASES,
  ASTER_THEME_PRESETS,
  AsterThemeProvider,
  AfAutoComplete,
  AfCalendar,
  AfCascader,
  AfCollapse,
  AfDateTimePicker,
  AfForm,
  AfFormItem,
  AfIcon,
  AfIconButton,
  AfImage,
  AfMessageHost,
  AfParagraph,
  AfPasswordInput,
  AfSplitter,
  AfSplitterPanel,
  AfSurface,
  AfTableColumn,
  AfTablePro,
  AfText,
  AfThemePanel,
  AfTimePicker,
  AfTimeline,
  AfTitle,
  AfTitleBar,
  AfWindowControls,
  afMessage,
  applyAsterTheme,
  asterMessage,
  resolveAfIconKey,
  resolveAsterThemeColorScheme,
  resolveAsterThemeColors,
  useAfForm,
  AfAccordion,
  AfAlertDialog,
  AfApprovalCardPattern,
  AfAvatar,
  AfAvatarStack,
  AfBadge,
  AfBillingSchedule,
  AfBlurCrossfade,
  AfBreadcrumb,
  AfButton,
  AfChatComposer,
  AfCheckboxGroup,
  AfChipInput,
  AfCitedAnswer,
  AfColorPicker,
  AfConfirmProvider,
  AfCopyButton,
  AfDataTablePattern,
  AfDatePicker,
  AfFormField,
  AfGradientFloor,
  AfGradientText,
  AfGridBackground,
  AfInput,
  AfIntegrationSettings,
  AfNumberInput,
  AfNumberTicker,
  AfPagination,
  AfPromptLibrary,
  AfRadio,
  AfRadioGroup,
  AfResizableGroup,
  AfResizableHandle,
  AfResizablePanel,
  AfScrollArea,
  AfSegmented,
  AfSelect,
  AfShimmerLoader,
  AfSlider,
  AfSlot,
  AfStepperForm,
  AfSwitch,
  AfTable,
  AfTabs,
  AfTag,
  AfTextarea,
  AfTextReveal,
  AfThinkingState,
  AfTiltCard,
  AfToolCallCardPattern,
  AfUsageMeterPattern,
  AfAgentPlan,
  AfBreakdownChart,
  AfHoverCard,
  AfToggleGroup,
  AfCodeBlock,
  AfRunControls,
  AfDiffTimeline,
  AfRateLimitPlanner,
  AfAgentCheckpoints,
  AfAgentMonitor,
  AfAgentTrail,
  AfRunningNow,
  AfScheduledRuns,
  AfAgentRecap,
  AfAwaySummary,
  AfAgentFindings,
  AfAgentFleet,
  AfAgentHandoff,
  AfAgentLedger,
  AfApprovalGates,
  AfCollaborationStream,
  AfConflictRadar,
  AfContextMap,
  AfCostWaterfall,
  AfDecisionCard,
  AfFallbackChain,
  AfFanOutGrid,
  AfJudgeBracket,
  AfParallelAttempts,
  AfPlanVsActual,
  AfRootCauseTree,
  AfToolAccessMap,
  AfDropdownMenu,
  AfSeparator,
  AfTagInput,
  AfTextField,
  AfTextArea,
  AfDialog,
  parseNaturalTime,
  useAfConfirm,
  useExitTransition,
} = AsterUI;

describe("Aster UI Package Contracts & Standalone Rendering", () => {
  it("exports parameterized composite patterns in aster-ui and re-exports them in aster-ui/examples", () => {
    expect(typeof AsterUI.AfTaskBoardPattern).toBe("function");
    expect(typeof AsterUI.AfAgentCursorsPattern).toBe("function");
    expect(typeof AsterUI.AfBreakdownChartPattern).toBe("function");

    expect(typeof AsterExamples.AfAgentCursorsPattern).toBe("function");
    expect(typeof AsterExamples.AfBreakdownChartPattern).toBe("function");
    expect(typeof AsterExamples.AfTaskBoardPattern).toBe("function");

    // Verify all new base primitives and hooks are exported from the primary entry
    expect(typeof AfAlertDialog).toBe("function");
    expect(typeof AfConfirmProvider).toBe("function");
    expect(typeof useAfConfirm).toBe("function");
    expect(AfRadio).toBeTruthy();
    expect(AfBadge).toBeTruthy();
    expect(AfAccordion).toBeTruthy();
    expect(typeof AfTable).toBe("function");
    expect(AfScrollArea).toBeTruthy();
    expect(AfResizableGroup).toBeTruthy();
    expect(AfResizablePanel).toBeTruthy();
    expect(AfResizableHandle).toBeTruthy();
    expect(AfSlot).toBeTruthy();
    expect(typeof useExitTransition).toBe("function");
  });

  it("renders core controls, unique multi-instance Tabs IDs, and parameterized composites without StageContext", () => {
    const html = renderToStaticMarkup(
      <AsterThemeProvider initialMode="dark" initialAccent="#0a8f7a">
        <AfButton variant="primary">保存</AfButton>
        <AfButton variant="accent">立即创建</AfButton>
        <AfButton variant="danger">删除</AfButton>
        <AfButton variant="outline">边框按钮</AfButton>
        <AfButton variant="dashed">添加条件</AfButton>
        <AfInput defaultValue="Aster" allowClear />
        <AfSelect
          defaultValue="pro"
          options={[
            { value: "free", label: "Free" },
            { value: "pro", label: "Pro" },
          ]}
        />
        <AfSwitch defaultChecked />
        <AfSlider defaultValue={42} />
        <AfCopyButton text="npm i @fangxinyan/aster-ui" />
        <AfTabs
          items={[
            { key: "overview", label: "概览", children: <div>面板 A</div> },
            { key: "tokens", label: "令牌", children: <div>面板 B</div> },
          ]}
        />
        <AfTabs
          items={[
            { key: "overview", label: "概览二", children: <div>面板 C</div> },
            { key: "tokens", label: "令牌二", children: <div>面板 D</div> },
          ]}
        />
        <AfChatComposer value="测试输入" model="sonnet" placeholder="发送消息" />
        <AfDataTablePattern
          title="自定义表头"
          rows={[
            { id: "R-1", title: "重构浮层基础设施", project: "@fangxinyan/aster-ui", status: "已完成", time: "刚刚" },
          ]}
        />
        <AfStepperForm initialStep={1} />
        <AfApprovalCardPattern title="自定义审批" timeoutSeconds={45} />
        <AfToolCallCardPattern items={[{ id: "1", name: "lint_arch", summary: "检查架构门禁", status: "success", args: {} }]} />
        <AfCitedAnswer pagesRead={5} />
        <AfThinkingState done />
        <AfPromptLibrary title="团队模板" />
        <AfIntegrationSettings title="工作区连接" />
        <AfUsageMeterPattern defaultPeriod="7d" />
        <AfBillingSchedule seatPrice={29} />
        <AfBlurCrossfade swapKey="k1"><span>Crossfade</span></AfBlurCrossfade>
        <AfNumberTicker value={2048} />
        <AfShimmerLoader width={160} height={14} />
        <AfTextReveal text="安静而精确的界面工程" />
        <AfGridBackground speed={0}><span>Grid</span></AfGridBackground>
        <AfGradientText>Aster UI</AfGradientText>
        <AfGradientFloor speed={0}><span>Floor</span></AfGradientFloor>
        <AfTiltCard><span>Tilt</span></AfTiltCard>
      </AsterThemeProvider>,
    );

    expect(html).toContain('data-theme="dark"');
    expect(html).toContain('data-variant="accent"');
    expect(html).toContain('data-variant="destructive"');
    expect(html).toContain("自定义表头");
    expect(html).toContain("自定义审批");
    expect(html).toContain("af-portal-root");

    // Verify two AfTabs instances with identical item keys produce distinct DOM IDs (no duplicate IDs)
    const tabIds = [...html.matchAll(/role="tab"[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
    expect(tabIds.length).toBe(4);
    expect(new Set(tabIds).size).toBe(4);
  });

  it("renders polymorphic links, new P2 base primitives, and hidden native form inputs in SSR", () => {
    const html = renderToStaticMarkup(
      <AsterThemeProvider initialMode="light">
        <AfButton href="https://example.com/docs" target="_blank" variant="secondary">
          文档中心
        </AfButton>
        <AfButton asChild variant="primary">
          <a href="/workspace" data-router-link="true">
            进入工作区
          </a>
        </AfButton>
        <AfBreadcrumb
          items={[
            { label: "首页", icon: "home", href: "/" },
            { label: "模型配额" },
          ]}
        />
        <AfBadge count={128} max={99}>
          <AfAvatar name="林星序" src="https://example.com/avatar.png" status="online" />
        </AfBadge>
        <AfAvatarStack items={[{ name: "林星序" }, { name: "Alex Chen", tone: "accent" }]} max={1} />
        <AfTag icon="sparkle" closable onClose={() => {}}>
          实验特性
        </AfTag>
        <AfTextarea autoSize={{ minRows: 2, maxRows: 5 }} defaultValue="自适应多行" />
        <AfRadio defaultChecked name="r-atom">
          独立单选
        </AfRadio>
        <AfRadioGroup
          variant="card"
          name="plan"
          defaultValue="pro"
          options={[
            { value: "free", label: "轻量" },
            { value: "pro", label: "专业", badge: "推荐" },
          ]}
        />
        <AfCheckboxGroup
          variant="card"
          name="scopes"
          defaultValue={["read"]}
          options={[
            { value: "read", label: "只读" },
            { value: "write", label: "读写" },
          ]}
        />
        <AfFormField label="默认路由" error="请选择可用模型" required>
          <AfSelect
            name="route_model"
            defaultValue="sonnet"
            options={[
              { value: "sonnet", label: "Sonnet 5.5" },
              { value: "opus", label: "Opus 5.5" },
            ]}
          />
        </AfFormField>
        <AfSwitch name="telemetry" defaultChecked />
        <AfSegmented
          label="周期"
          name="period"
          defaultValue="7d"
          options={[
            { value: "7d", label: "7天" },
            { value: "30d", label: "30天" },
          ]}
        />
        <AfNumberInput name="concurrency" defaultValue={4} min={1} max={16} />
        <AfSlider label="阈值" name="threshold" defaultValue={75} />
        <AfChipInput name="tags" defaultValue={["rag", "agent"]} />
        <AfColorPicker name="brand_color" defaultValue="#0a8f7a" />
        <AfDatePicker name="start_date" defaultValue={new Date(2026, 10, 13)} />
        <AfAccordion
          showToggleAll
          defaultValue={["sec"]}
          items={[
            { key: "sec", title: "沙盒策略", content: "默认只读隔离" },
            { key: "log", title: "审计日志", content: "保留 90 天" },
          ]}
        />
        <AfTable
          caption="节点延迟表"
          defaultSortBy={{ key: "latency", direction: "descending" }}
          selectable
          defaultSelectedKeys={["n1"]}
          columns={[
            { key: "name", title: "节点", dataIndex: "name", sortable: true },
            { key: "latency", title: "延迟", dataIndex: "latency", sortable: true, sortType: "number", align: "right" },
          ]}
          data={[
            { id: "n1", name: "东京", latency: 42 },
            { id: "n2", name: "法兰克福", latency: 168 },
          ]}
        />
        <AfPagination defaultPage={2} total={95} pageSize={20} pageSizeOptions={[10, 20, 50]} showTotal />
        <AfScrollArea height={160}>
          <div>滚动区域内容</div>
        </AfScrollArea>
        <AfResizableGroup direction="horizontal">
          <AfResizablePanel defaultSize={35}>左栏</AfResizablePanel>
          <AfResizableHandle label="调节分栏" />
          <AfResizablePanel defaultSize={65}>右栏</AfResizablePanel>
        </AfResizableGroup>
      </AsterThemeProvider>,
    );

    // Polymorphic links & rel safety
    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('data-router-link="true"');
    expect(html).toContain('aria-current="page"');

    // Badge, Avatar, Tag, Textarea autoSize, Choice cards
    expect(html).toContain("99+</sup>");
    expect(html).toContain('src="https://example.com/avatar.png"');
    expect(html).toContain("+1</span>");
    expect(html).toContain("af-tag__close");
    expect(html).toContain('data-autosize="true"');
    expect(html).toContain("af-choice-card");

    // Hidden native form inputs & FormField context propagation
    expect(html).toContain('name="route_model" value="sonnet"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('name="telemetry" value="on"');
    expect(html).toContain('name="period" value="7d"');
    expect(html).toContain('name="concurrency" value="4"');
    expect(html).toMatch(/<input[^>]*name="threshold"[^>]*value="75"/);
    expect(html).toContain('name="tags" value="rag"');
    expect(html).toMatch(/<input[^>]*name="brand_color"[^>]*value="#0a8f7a"/i);
    expect(html).toContain('name="start_date" value="2026-11-13"');

    // Accordion, Sortable Table, Pagination, ScrollArea, Resizable
    expect(html).toContain("af-accordion__toggle-all");
    const sortedHeaders = [...html.matchAll(/<th\b[^>]*aria-sort="([^"]+)"/g)].map((m) => m[1]);
    expect(sortedHeaders).toEqual(["descending"]);
    expect(html).toContain("共 95 条");
    expect(html).toContain("af-scroll-area");
    expect(html).toContain('role="separator"');
  });

  it("exports v0.3 parity components, aliases, theme helpers and a11y form contracts", () => {
    // Primary barrel exports (including React.forwardRef component objects)
    for (const sym of [
      AfForm,
      AfFormItem,
      useAfForm,
      AfPasswordInput,
      AfInput.Password,
      AfInput.TextArea,
      AfIconButton,
      AfAutoComplete,
      AfCascader,
      AfCalendar,
      AfTimePicker,
      AfDateTimePicker,
      AfCollapse,
      AfTableColumn,
      AfTablePro,
      AfSplitter,
      AfSplitterPanel,
      AfTimeline,
      AfImage,
      AfText,
      AfParagraph,
      AfTitle,
      AfSurface,
      AfMessageHost,
      AfTitleBar,
      AfWindowControls,
      AfThemePanel,
      resolveAfIconKey,
      resolveAsterThemeColorScheme,
      resolveAsterThemeColors,
      applyAsterTheme,
    ]) {
      expect(sym).toBeTruthy();
      expect(["function", "object"].includes(typeof sym)).toBe(true);
    }
    expect(typeof afMessage.success).toBe("function");
    expect(typeof asterMessage.info).toBe("function");
    expect(AF_ICON_ALIASES.AppstoreOutlined).toBe("grid");
    expect(ASTER_THEME_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(resolveAsterThemeColorScheme("dark")).toBe("dark");
    expect(resolveAsterThemeColors("dark", "violet")).toEqual({
      bg: "#0e0e0e",
      surface: "#1b1b1b",
      sunken: "#161616",
      overlay: "#202020",
      ink: "#e5e5e5",
      strong: "#ffffff",
      muted: "#9a9a9a",
      accent: "#7c5cff",
    });
    expect(resolveAsterThemeColors("light", "blue")).toEqual({
      bg: "#f7f7f7",
      surface: "#ffffff",
      sunken: "#fafafa",
      overlay: "#ffffff",
      ink: "#262626",
      strong: "#111111",
      muted: "#737373",
      accent: "#0060e2",
    });
    expect(resolveAsterThemeColors("dark", "violet", { transparent: true })).toEqual({
      bg: "#00000000",
      surface: "#1b1b1b",
      sunken: "#161616",
      overlay: "#202020",
      ink: "#e5e5e5",
      strong: "#ffffff",
      muted: "#9a9a9a",
      accent: "#7c5cff",
    });

    // FormField valid vs error ARIA contract
    const validFieldHtml = renderToStaticMarkup(
      <AfFormField label="用户名">
        <AfInput defaultValue="aster" />
      </AfFormField>,
    );
    expect(validFieldHtml).toContain('aria-invalid="false"');
    expect(validFieldHtml).not.toContain("aria-describedby=");
    expect(validFieldHtml).not.toContain("af-field-wrap__error");

    const errorFieldHtml = renderToStaticMarkup(
      <AfFormField label="用户名" error="用户名必填">
        <AfInput defaultValue="" />
      </AfFormField>,
    );
    expect(errorFieldHtml).toContain('aria-invalid="true"');
    expect(errorFieldHtml).toContain("aria-describedby=");
    expect(errorFieldHtml).toContain('aria-live="polite"');

    // v0.3 SSR rendering & density/radius attributes
    const v3Html = renderToStaticMarkup(
      <AsterThemeProvider initialMode="light" initialDensity="compact" initialRadius="lg">
        <AfForm initialValues={{ host: "127.0.0.1" }}>
          <AfFormItem name="host" label="网关" required>
            <AfInput.Password placeholder="输入密钥" />
          </AfFormItem>
        </AfForm>
        <AfIconButton icon="AppstoreOutlined" label="打开应用中心" />
        <AfIcon name="unorderedList" />
        <AfTable<{ id: string; name: string }> data={[{ id: "1", name: "AlphaNode" }]}>
          <AfTableColumn<{ id: string; name: string }> key="name" title="名称" dataIndex="name" />
        </AfTable>
        <AfCollapse items={[{ key: "c1", title: "折叠项", content: "正文" }]} />
        <AfTimeline items={[{ key: "t1", title: "阶段完成", time: "09:30", tone: "success" }]} />
        <AfSurface level="raised">
          <AfTitle level={3}>表面标题</AfTitle>
          <AfParagraph ellipsis={{ rows: 2 }}>示例段落</AfParagraph>
          <AfText numeric>1,024</AfText>
        </AfSurface>
        <AfSplitter defaultSize={220}>
          <AfSplitterPanel>左</AfSplitterPanel>
          <AfSplitterPanel>右</AfSplitterPanel>
        </AfSplitter>
        <AfCalendar value="2026-11-13" />
        <AfTimePicker value="09:30" />
        <AfDateTimePicker value="2026-11-13 14:30" />
        <AfAutoComplete options={["gpt-4o", "claude-sonnet"]} defaultValue="gpt-4o" />
        <AfCascader options={[{ value: "cn", label: "中国" }]} defaultValue={["cn"]} />
        <AfTitleBar title="Aster Workbench" />
        <AfThemePanel />
      </AsterThemeProvider>,
    );

    expect(v3Html).toContain('data-density="compact"');
    expect(v3Html).toContain('data-radius="lg"');
    expect(v3Html).toContain("AlphaNode");
    expect(v3Html).toContain("af-timeline");
    expect(v3Html).toContain("af-surface");
    expect(v3Html).toContain("af-splitter");
    expect(v3Html).toContain("af-calendar");
    expect(v3Html).toContain("af-titlebar");
    expect(v3Html).toContain("af-theme-panel");
  });

  it("exports v0.4 parity components, compat aliases, natural-time parser and parameterized patterns", () => {
    for (const sym of [
      AfHoverCard,
      AfToggleGroup,
      AfCodeBlock,
      AfRunControls,
      AfDiffTimeline,
      AfRateLimitPlanner,
      AfAgentCheckpoints,
      AfAgentMonitor,
      AfAgentTrail,
      AfRunningNow,
      AfScheduledRuns,
      AfAgentRecap,
      AfAwaySummary,
      AfAgentFindings,
      AfAgentFleet,
      AfAgentHandoff,
      AfAgentLedger,
      AfApprovalGates,
      AfCollaborationStream,
      AfConflictRadar,
      AfContextMap,
      AfCostWaterfall,
      AfDecisionCard,
      AfFallbackChain,
      AfFanOutGrid,
      AfJudgeBracket,
      AfParallelAttempts,
      AfPlanVsActual,
      AfRootCauseTree,
      AfToolAccessMap,
      AfDropdownMenu,
      AfSeparator,
      AfTagInput,
      AfTextField,
      AfTextArea,
      AfDialog,
    ]) {
      expect(sym).toBeTruthy();
      expect(["function", "object"].includes(typeof sym)).toBe(true);
    }

    expect(AfTagInput).toBe(AfChipInput);
    expect(AfTextArea).toBe(AfTextarea);
    expect(AfTextField).toBe(AfInput);

    expect(parseNaturalTime("3pm")).toBe("15:00");
    expect(parseNaturalTime("930a")).toBe("09:30");
    expect(parseNaturalTime("noon")).toBe("12:00");
    expect(parseNaturalTime("invalid")).toBeNull();

    const v4Html = renderToStaticMarkup(
      <AsterThemeProvider initialMode="light">
        <AfHoverCard trigger={<button type="button">Hover me</button>}>Card body</AfHoverCard>
        <AfToggleGroup
          defaultValue="bold"
          options={[
            { value: "bold", label: "B" },
            { value: "italic", label: "I" },
          ]}
        />
        <AfCodeBlock filename="agent.ts" language="ts" highlightLines={[1]} code={"const ok = true;\nexport default ok;"} />
        <AfRunControls />
        <AfDiffTimeline />
        <AfRateLimitPlanner />
        <AfToolAccessMap />
        <AfAgentPlan title="自定义编排计划" runId="run-custom" />
        <AfBreakdownChart title="自定义成本拆解" showNote={false} />
      </AsterThemeProvider>,
    );

    expect(v4Html).toContain("aria-describedby=");
    expect(v4Html).toContain("af-toggle-group");
    expect(v4Html).toContain('aria-pressed="true"');
    expect(v4Html).toContain("af-codeblock");
    expect(v4Html).toContain("agent.ts");
    expect(v4Html).toContain("af-agc-runc");
    expect(v4Html).toContain("af-agc-dtl");
    expect(v4Html).toContain("af-agc-rlp");
    expect(v4Html).toContain("af-agd-tam__table");
    expect(v4Html).toContain("自定义编排计划");
    expect(v4Html).toContain("run-custom");
    expect(v4Html).toContain("自定义成本拆解");
  });

  it("exports v0.5 core base primitives & promoted controls, renders accessible SSR markup, and bundles dist/core.css", () => {
    const coreExportNames = [
      "AsterThemeProvider",
      "ThemeProvider",
      "useAsterTheme",
      "useTheme",
      "applyAsterTheme",
      "resolveAsterThemeColors",
      "resolveAsterThemeColorScheme",
      "ASTER_THEME_PRESETS",
      "ASTER_ACCENT_PRESETS",
      "AfTitleBar",
      "TitleBar",
      "AfWindowControls",
      "AfThemePanel",
      "ThemePanel",
      "cn",
      "copyToClipboard",
      "AfMeterBar",
      "AfDiffView",
      "AfSteps",
      "AfTree",
      "AfStat",
      "AfDescriptions",
      "AfTabs",
      "AfContextMenu",
      "AfColorPicker",
      "AfChipInput",
      "AfTagInput",
      "AfProgressRing",
      "AfCombobox",
      "AfOtpInput",
      "AfDropzone",
      "AfUpload",
      "AfDatePicker",
      "AfDateRangePicker",
      "AfDateRange",
    ] as const;

    for (const name of coreExportNames) {
      const coreSym = (AsterCore as Record<string, unknown>)[name];
      const pkgSym = (AsterUI as Record<string, unknown>)[name];
      expect(coreSym, `AsterCore.${name}`).toBeTruthy();
      expect(pkgSym, `AsterUI.${name}`).toBeTruthy();
      expect(["function", "object"].includes(typeof coreSym)).toBe(true);
      expect(["function", "object"].includes(typeof pkgSym)).toBe(true);
    }

    expect((AsterCore as Record<string, unknown>).AfUpload).toBe((AsterCore as Record<string, unknown>).AfDropzone);
    expect((AsterUI as Record<string, unknown>).AfUpload).toBe((AsterUI as Record<string, unknown>).AfDropzone);

    const CoreThemeProvider = (AsterCore as Record<string, any>).AsterThemeProvider;
    const CoreTitleBar = (AsterCore as Record<string, any>).AfTitleBar;
    const CoreThemePanel = (AsterCore as Record<string, any>).AfThemePanel;
    const coreHostHtml = renderToStaticMarkup(
      <CoreThemeProvider initialMode="light">
        <CoreTitleBar title="Core Standalone" />
        <CoreThemePanel compact />
      </CoreThemeProvider>,
    );
    expect(coreHostHtml).toContain("af-titlebar");
    expect(coreHostHtml).toContain("af-theme-panel");

    const {
      AfMeterBar,
      AfDiffView,
      AfSteps,
      AfTree,
      AfStat,
      AfDescriptions,
      AfProgressRing,
      AfDateRangePicker,
    } = AsterUI;

    const v5Html = renderToStaticMarkup(
      <AsterThemeProvider initialMode="light">
        <AfMeterBar
          label="配额分布"
          showLegend
          segments={[
            { key: "used", label: "已用", value: 60, tone: "accent" },
            { key: "free", label: "剩余", value: 40, tone: "success" },
          ]}
        />
        <AfDiffView filename="verify.ts" showModeSwitch before={"const a = 1;"} after={"const a = 2;"} />
        <AfSteps
          current={1}
          items={[
            { key: "s1", title: "Step 1" },
            { key: "s2", title: "Step 2" },
          ]}
        />
        <AfTree
          label="目录树"
          defaultExpandedKeys={["root"]}
          nodes={[{ key: "root", label: "src", children: [{ key: "leaf", label: "ui.tsx" }] }]}
        />
        <AfStat label="Latency" value="128ms" />
        <AfDescriptions items={[{ key: "rt", label: "Runtime", children: "Node 22" }]} />
        <AfProgressRing />
        <AfProgressRing value={65} max={100} tone="accent" />
        <AfDatePicker name="due_date" placeholder="选择截止日期" />
        <AfDateRangePicker />
      </AsterThemeProvider>,
    );

    expect(v5Html).toContain("af-meter-bar");
    expect(v5Html).toContain("af-diff");
    expect(v5Html).toContain("af-steps");
    expect(v5Html).toContain('role="list"');
    expect(v5Html).toContain("af-tree");
    expect(v5Html).toContain('role="tree"');
    expect(v5Html).toContain('role="treeitem"');
    expect(v5Html).toContain("af-stat");
    expect(v5Html).toContain("af-desc");
    expect(v5Html).toContain("Node 22");
    expect(v5Html).toContain('class="af-sr-only"');
    expect(v5Html).toContain('aria-hidden="true"');
    expect(v5Html).toContain("af-ring2");
    // Uncontrolled AfDatePicker & AfDateRangePicker must not lock onto mock TODAY (2026-10-21)
    expect(v5Html).toContain("选择截止日期");
    expect(v5Html).toContain('name="due_date" value=""');
    expect(v5Html).not.toContain("2026-10-21");
    expect(v5Html).not.toContain("Oct 21, 2026");

    const coreCssPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/core.css");
    const coreCss = fs.readFileSync(coreCssPath, "utf8");
    for (const selector of [
      ".af-meter-bar",
      ".af-diff",
      ".af-steps",
      ".af-tree",
      ".af-stat",
      ".af-desc",
      ".af-tabs",
      ".af-context-menu",
      ".af-colorpicker",
      ".af-chips",
      ".af-ring2",
      ".af-in-cb",
      ".af-in-otp",
      ".af-in-drop",
      ".af-in-date",
      ".af-titlebar",
      ".af-window-controls",
      ".af-theme-panel",
    ]) {
      expect(coreCss, `dist/core.css selector ${selector}`).toContain(selector);
    }

    // General-purpose AfCascader contracts: multiple + SHOW_PARENT + expandTrigger + name hidden inputs
    const cascaderHtml = renderToStaticMarkup(
      <AsterThemeProvider initialMode="light">
        <AfCascader
          label="多选级联区域"
          name="regions"
          multiple
          showCheckedStrategy="SHOW_PARENT"
          expandTrigger="hover"
          defaultValue={[["cn", "east"]]}
          options={[
            {
              value: "cn",
              label: "中国大陆",
              children: [
                {
                  value: "east",
                  label: "华东节点",
                  children: [
                    { value: "sh", label: "上海一区" },
                    { value: "hz", label: "杭州金融云" },
                  ],
                },
                {
                  value: "north",
                  label: "华北节点",
                  children: [{ value: "bj", label: "北京三区" }],
                },
              ],
            },
          ]}
        />
      </AsterThemeProvider>,
    );
    expect(cascaderHtml).toContain('aria-multiselectable="true"');
    expect(cascaderHtml).toContain('type="hidden" name="regions" value="cn/east"');
    expect(cascaderHtml).toContain("中国大陆 / 华东节点");

    // Sliding hover thumb public exports + AfHoverList SSR contract
    const AfHoverList = (AsterUI as Record<string, any>).AfHoverList;
    expect(typeof AfHoverList).toBe("object");
    expect(typeof (AsterUI as Record<string, any>).useKeyedHighlight).toBe("function");
    expect(typeof (AsterUI as Record<string, any>).installAfListHover).toBe("function");
    const hoverListHtml = renderToStaticMarkup(
      <AfHoverList tone="wash">
        <button type="button">项一</button>
      </AfHoverList>,
    );
    expect(hoverListHtml).toContain('data-af-hover-list="wash"');

    // Legacy host v0.1.46 parity exports & parameterized host patterns
    expect(AsterUI.THEME_PANEL_DEFAULT_THEME_PRESETS.assistant).toBeTruthy();
    expect(AsterUI.THEME_PANEL_DEFAULT_THEME_PRESETS.assistantDark).toBeTruthy();
    expect(Array.isArray(AsterUI.THEME_PANEL_DEFAULT_THEME_PRESETS)).toBe(true);
    expect(AsterUI.NAMED_ICON_MAP.AimOutlined).toBe(AsterUI.AimOutlined);
    expect(AsterUI.NAMED_ICON_MAP.UserOutlined).toBe(AsterUI.UserOutlined);
    expect(typeof AsterUI.useTheme).toBe("function");
    expect(AsterUI.ThemeProvider).toBe(AsterThemeProvider);
    expect(AsterUI.Surface).toBe(AfSurface);
    expect(AsterUI.PaintedIcon).toBe(AsterUI.AfPaintedIcon);
    expect(AsterUI.ChartTooltipSurface).toBe(AsterUI.AfChartTooltipSurface);

    const {
      AfPaintedIcon,
      AimOutlined,
      AfChartTooltipSurface,
    } = AsterUI;

    const hostHtml = renderToStaticMarkup(
      <AsterThemeProvider initialMode="light">
        <AfPaintedIcon icon="AimOutlined" surface />
        <AimOutlined size={14} />
        <AfSurface variant="floating" padding="md" radius="lg" tone="accent" tokens={{ "--af-r-card": "16px" }}>
          <AfChartTooltipSurface
            title="10-21 用量"
            items={[{ name: "Opus 5.5", value: "128k", color: "#0060e2" }]}
            footer="5 小时滚动窗口"
          />
        </AfSurface>
        <AfTitleBar title="Host Window" draggable={false} actions={<button type="button">设置</button>} />
        <AfThemePanel compact description="紧凑主题设置" defaultCreateThemeName="工作区方案" />
      </AsterThemeProvider>,
    );

    expect(hostHtml).toContain("af-painted-icon--surface");
    expect(hostHtml).toContain("af-chart-tooltip");
    expect(hostHtml).toContain("10-21 用量");
    expect(hostHtml).toContain('data-draggable="false"');
    expect(hostHtml).toContain('data-compact="true"');
  });

  it("exports and SSR-renders all v0.5 Wave-1 new components, 14 Blocks, 43 Screens, and 26 Illustrations without SSR warnings", () => {
    const {
      AfRating,
      AfShimmerText,
      AfShimmerSkeleton,
      AfResizablePanelGroup,
      AfToolCallGroup,
      AfAgentCrew,
      AfAgentSequence,
      AfFlowBuilder,
      afToast,
      // 14 Blocks
      AfLogoMarquee,
      AfTestimonialWall,
      AfKpiBoard,
      AfMetricsDashboard,
      AfInvoiceCredit,
      AfPricingPlans,
      AfAgentGallery,
      AfAppDirectory,
      AfClientContext,
      AfLiveSession,
      AfMissionControl,
      AfMissionTimeline,
      AfRunInspector,
      AfTaskBoard,
      // 43 Screens
      AfAppShellInset,
      AfAppShellFlat,
      AfOnboarding,
      AfOnboardingWebsite,
      AfOnboardingBrand,
      AfOnboardingTone,
      AfOnboardingReady,
      AfSettingsGeneral,
      AfSettingsMembers,
      AfSettingsModels,
      AfSettingsNotifications,
      AfSettingsPreferences,
      AfSettingsPrivacy,
      AfSettingsProfile,
      AfSettingsSecurity,
      AfSettingsSubscription,
      AfAnalytics,
      AfCrm,
      AfEvals,
      AfFiles,
      AfFolder,
      AfIntegrations,
      AfKanban,
      AfAssistantHome,
      AfAssistantOverview,
      AfAgentChat,
      AfAgentChatProgress,
      AfAgentChatRail,
      AfAgentRun,
      AfAgentThread,
      AfAgentActivity,
      AfAgentMemory,
      AfAgentPermissions,
      AfAgentSchedules,
      AfAgentSkills,
      AfAgentUsage,
      AfAgents,
      AfAgentInboxBoard,
      AfAgentOrchestration,
      AfAgentRunDetail,
      AfAgentTasks,
      AfInbox,
      AfWorkflowBuilder,
      // 26 Interactive Illustrations (illustrations-a + illustrations-b)
      AfAgentTeam,
      AfCoverFlow,
      AfEmptyCalendar,
      AfEnrichmentOrbit,
      AfGhostedChat,
      AfGlassFolder,
      AfFrostCloud,
      AfGlowCloud,
      AfGlowKeyboard,
      AfInspectAgentCard,
      AfInspectComposer,
      AfIntegrationBeam,
      AfIntegrationFlow,
      AfIntegrationGrid,
      AfLayerStack,
      AfLeadSourcing,
      AfLogoCluster,
      AfModelWheel,
      AfOutreachBranches,
      AfProjectFlow,
      AfRegionDach,
      AfSideFolder,
      AfTabOverload,
      AfTeamInvite,
      AfVoiceOrb,
      AfWorldMap,
    } = AsterUI as Record<string, any>;

    expect(typeof afToast).toBe("function");
    expect(AfResizablePanelGroup).toBeTruthy();
    expect(typeof AsterExamples.AfKpiBoardPattern).toBe("function");
    expect(typeof AsterExamples.AfPricingPlansPattern).toBe("function");
    expect(typeof AsterExamples.AfAgentGalleryPattern).toBe("function");
    expect(typeof AsterExamples.AfMissionControlPattern).toBe("function");
    expect(typeof AsterExamples.AfTaskBoardPattern).toBe("function");

    const ssrConsoleErrors: string[] = [];
    const origConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      ssrConsoleErrors.push(args.map(String).join(" "));
    };

    try {
      const ratingHtml = renderToStaticMarkup(
        <AsterThemeProvider initialMode="dark">
          <AfRating defaultValue={4} />
          <AfRating variant="thumbs" defaultValue={1} />
          <AfRating value={4.5} readOnly />
        </AsterThemeProvider>,
      );
      expect(ratingHtml).toContain("af-rating__svg--fill");
      expect(ratingHtml).toContain("data-filled");
      expect(ratingHtml).toContain("data-partial");
      expect(ratingHtml).toContain("4.5 out of 5");

      const newWave1AndBlocks = [
        AfShimmerText,
        AfShimmerSkeleton,
        AfToolCallGroup,
        AfAgentCrew,
        AfAgentSequence,
        AfFlowBuilder,
        AfLogoMarquee,
        AfTestimonialWall,
        AfKpiBoard,
        AfMetricsDashboard,
        AfInvoiceCredit,
        AfPricingPlans,
        AfAgentGallery,
        AfAppDirectory,
        AfClientContext,
        AfLiveSession,
        AfMissionControl,
        AfMissionTimeline,
        AfRunInspector,
        AfTaskBoard,
      ];
      for (const Comp of newWave1AndBlocks) {
        expect(Comp).toBeTruthy();
        const markup = renderToStaticMarkup(
          <AsterThemeProvider initialMode="dark">
            <Comp />
          </AsterThemeProvider>,
        );
        expect(markup.length).toBeGreaterThan(80);
      }

      const all43Screens = [
        AfAppShellInset,
        AfAppShellFlat,
        AfOnboarding,
        AfOnboardingWebsite,
        AfOnboardingBrand,
        AfOnboardingTone,
        AfOnboardingReady,
        AfSettingsGeneral,
        AfSettingsMembers,
        AfSettingsModels,
        AfSettingsNotifications,
        AfSettingsPreferences,
        AfSettingsPrivacy,
        AfSettingsProfile,
        AfSettingsSecurity,
        AfSettingsSubscription,
        AfAnalytics,
        AfCrm,
        AfEvals,
        AfFiles,
        AfFolder,
        AfIntegrations,
        AfKanban,
        AfAssistantHome,
        AfAssistantOverview,
        AfAgentChat,
        AfAgentChatProgress,
        AfAgentChatRail,
        AfAgentRun,
        AfAgentThread,
        AfAgentActivity,
        AfAgentMemory,
        AfAgentPermissions,
        AfAgentSchedules,
        AfAgentSkills,
        AfAgentUsage,
        AfAgents,
        AfAgentInboxBoard,
        AfAgentOrchestration,
        AfAgentRunDetail,
        AfAgentTasks,
        AfInbox,
        AfWorkflowBuilder,
      ];
      expect(all43Screens.length).toBe(43);
      for (const ScreenComp of all43Screens) {
        expect(typeof ScreenComp).toBe("function");
        const innerMarkup = renderToStaticMarkup(<ScreenComp />);
        expect(innerMarkup.length).toBeGreaterThan(120);
        // Guard against nested bare class="af ..." without data-theme which resets dark-mode CSS tokens
        const bareAfMatches = [...innerMarkup.matchAll(/<([a-z0-9-]+)\b[^>]*\bclass="([^"]*)"[^>]*>/gi)].filter(
          (m) => m[2].split(/\s+/).includes("af") && !/data-theme=/.test(m[0]),
        );
        expect(bareAfMatches).toEqual([]);
      }

      const all26Illustrations = [
        AfAgentTeam,
        AfCoverFlow,
        AfEmptyCalendar,
        AfEnrichmentOrbit,
        AfGhostedChat,
        AfGlassFolder,
        AfFrostCloud,
        AfGlowCloud,
        AfGlowKeyboard,
        AfInspectAgentCard,
        AfInspectComposer,
        AfIntegrationBeam,
        AfIntegrationFlow,
        AfIntegrationGrid,
        AfLayerStack,
        AfLeadSourcing,
        AfLogoCluster,
        AfModelWheel,
        AfOutreachBranches,
        AfProjectFlow,
        AfRegionDach,
        AfSideFolder,
        AfTabOverload,
        AfTeamInvite,
        AfVoiceOrb,
        AfWorldMap,
      ];
      expect(all26Illustrations.length).toBe(26);
      for (const IllusComp of all26Illustrations) {
        expect(typeof IllusComp).toBe("function");
        const illusMarkup = renderToStaticMarkup(
          <AsterThemeProvider initialMode="dark">
            <IllusComp />
          </AsterThemeProvider>,
        );
        expect(illusMarkup.length).toBeGreaterThan(60);
      }
    } finally {
      console.error = origConsoleError;
    }

    expect(ssrConsoleErrors).toEqual([]);
  });

  it("supports P0-1 transparent/document/controlled AsterThemeProvider SSR and P0-2 aster-ui/runtime plugin bridge contracts", () => {
    expect(Object.keys(AsterRuntime).sort()).toEqual(Object.keys(AsterUI).sort());
    expect(AsterRuntime.AsterThemeContext).toBe(AsterUI.AsterThemeContext);
    expect(AsterRuntime.AfLayerContext).toBe(AsterUI.AfLayerContext);
    expect(AsterRuntime.afMessage).toBe(AsterUI.afMessage);
    expect(AsterRuntime.AfPluginProvider).toBe(AsterCore.AfPluginProvider);
    expect(AsterRuntime.createAsterPluginRuntime).toBe(AsterCore.createAsterPluginRuntime);

    const runtime = AsterRuntime.createAsterPluginRuntime({
      ui: AsterRuntime,
      globalKey: "__asterTestPluginShared",
      hostVersion: "0.5.0-test",
    });
    expect(AsterRuntime.getAsterPluginRuntime("__asterTestPluginShared")).toBe(runtime);
    expect((globalThis as Record<string, unknown>).__asterTestPluginShared).toBe(runtime.shared);
    expect(runtime.shared.version).toBe("1");
    expect(runtime.shared.hostVersion).toBe("0.5.0-test");
    expect(runtime.shared.asterUi).toBe(AsterRuntime);
    expect(runtime.shared.ui).toBe(AsterRuntime);

    const ssrErrors: string[] = [];
    const prevError = console.error;
    console.error = (...args: unknown[]) => {
      ssrErrors.push(args.map(String).join(" "));
    };

    try {
      const html = renderToStaticMarkup(
        <AsterRuntime.AsterThemeProvider
          mode="dark"
          accent="violet"
          density="compact"
          radius="lg"
          transparent
          target="document"
          storage={false}
        >
          <AsterRuntime.AfPluginProvider runtime={runtime} pluginId="ssr-plugin">
            <AsterRuntime.AfButton variant="accent">透明插件宿主</AsterRuntime.AfButton>
          </AsterRuntime.AfPluginProvider>
        </AsterRuntime.AsterThemeProvider>,
      );

      expect(html).toContain('data-theme="dark"');
      expect(html).toContain('data-af-theme="dark"');
      expect(html).toContain('data-accent="violet"');
      expect(html).toContain('data-af-accent="violet"');
      expect(html).toContain('data-density="compact"');
      expect(html).toContain('data-af-density="compact"');
      expect(html).toContain('data-radius="lg"');
      expect(html).toContain('data-af-radius="lg"');
      expect(html).toContain('data-af-transparent="true"');
      expect(html).toContain('data-af-plugin="ssr-plugin"');
      expect(html).toContain("透明插件宿主");
    } finally {
      console.error = prevError;
      runtime.dispose();
    }

    expect(ssrErrors).toEqual([]);
    expect(AsterRuntime.getAsterPluginRuntime("__asterTestPluginShared")).toBeNull();

    const tokensCssPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/tokens.css");
    const tokensCss = fs.readFileSync(tokensCssPath, "utf8");
    expect(tokensCss).toContain("--af-canvas-solid");
    expect(tokensCss).toMatch(/\[data-af-transparent=(?:"true"|true)\]/);
  });

  it("exports P0-3 list-exit, pointer-drag, streaming, scrub, and overflow primitives across all entry points and bans HTML5 draggable in SSR", () => {
    const p03Hooks = [
      "useFlip",
      "useListFlip",
      "useAnimatedList",
      "useSortableList",
      "usePointerDragBoard",
      "useStreamingTokens",
      "usePointerScrub",
      "useOverflowCollapse",
    ] as const;

    for (const hookName of p03Hooks) {
      const primFn = (AsterPrimitives as Record<string, unknown>)[hookName];
      const coreFn = (AsterCore as Record<string, unknown>)[hookName];
      const uiFn = (AsterUI as Record<string, unknown>)[hookName];
      const runtimeFn = (AsterRuntime as Record<string, unknown>)[hookName];
      expect(typeof primFn, `@fangxinyan/aster-ui/primitives.${hookName}`).toBe("function");
      expect(coreFn, `@fangxinyan/aster-ui/core.${hookName}`).toBe(primFn);
      expect(uiFn, `aster-ui.${hookName}`).toBe(primFn);
      expect(runtimeFn, `@fangxinyan/aster-ui/runtime.${hookName}`).toBe(primFn);
    }

    const coreCssPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/core.css");
    const coreCss = fs.readFileSync(coreCssPath, "utf8");
    expect(coreCss).toContain(".af-drag-ghost");
    expect(coreCss).toContain(".af-stream-token");
    expect(coreCss).toContain("data-af-dragging");

    const {
      AfTaskBoard,
      AfDelegateBoard,
      AfAgentPlan,
      AfKanban,
      AfAppShellFlat,
    } = AsterUI;

    const dragAndListMarkup = renderToStaticMarkup(
      <AsterThemeProvider initialMode="dark">
        <AfTaskBoard />
        <AfDelegateBoard />
        <AfAgentPlan />
        <AfKanban />
        <AfAppShellFlat />
      </AsterThemeProvider>,
    );

    expect(dragAndListMarkup).toContain("data-drag-col-id=");
    expect(dragAndListMarkup).toContain("data-drag-item-id=");
    expect(dragAndListMarkup).not.toMatch(/\bdraggable="true"/i);
  });

  it("exports P0-4 core components & upgraded control contracts across aster-ui/core, aster-ui, and aster-ui/runtime with zero SSR warnings", () => {
    const p04Exports = [
      "AfAppMark",
      "AppMark",
      "AfOverflowTagList",
      "OverflowTagList",
      "AfHotkeyInput",
      "HotkeyInput",
      "splitShortcutTokens",
      "AfCountdown",
      "Countdown",
      "computeCountdownParts",
      "AfQrCodeCard",
      "QrCodeCard",
      "encodeQrMatrix",
      "AfDateTimeRangePicker",
      "DateTimeRangePicker",
      "EN_RANGE_PRESETS",
      "ZH_RANGE_PRESETS",
    ] as const;

    for (const symName of p04Exports) {
      const coreSym = (AsterCore as Record<string, unknown>)[symName];
      const uiSym = (AsterUI as Record<string, unknown>)[symName];
      const rtSym = (AsterRuntime as Record<string, unknown>)[symName];
      expect(coreSym, `@fangxinyan/aster-ui/core.${symName}`).toBeTruthy();
      expect(uiSym, `aster-ui.${symName}`).toBe(coreSym);
      expect(rtSym, `@fangxinyan/aster-ui/runtime.${symName}`).toBe(coreSym);
    }

    // Helper unit contracts
    expect(AsterCore.splitShortcutTokens("Mod+Shift+K")).toEqual(["Mod", "Shift", "K"]);
    expect(AsterCore.computeCountdownParts(3_661_500)).toMatchObject({
      totalMs: 3_661_500,
      days: 0,
      hours: 1,
      minutes: 1,
      seconds: 1,
    });
    const qrMatrix = AsterCore.encodeQrMatrix("https://aster-ui.dev/pair?code=884210", "M");
    expect(qrMatrix.length).toBeGreaterThanOrEqual(25);
    expect(qrMatrix[0]?.length).toBe(qrMatrix.length);
    // Top-left 7x7 finder outer ring corners are dark modules
    expect(qrMatrix[0]?.[0]).toBe(true);
    expect(qrMatrix[0]?.[6]).toBe(true);
    expect(qrMatrix[6]?.[0]).toBe(true);
    expect(qrMatrix[3]?.[3]).toBe(true);

    // Verify P0-4 CSS selectors bundled in dist/core.css
    const coreCssPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/core.css");
    const coreCss = fs.readFileSync(coreCssPath, "utf8");
    for (const selector of [
      ".af-app-mark",
      ".af-overflow-tags",
      ".af-hotkey",
      ".af-countdown",
      ".af-qr-card",
      ".af-datetimerangepicker",
      ".af-table__th[data-fixed]",
      ".af-spark__cursor",
      ".af-tree__highlight",
      ".af-image-preview__thumbs",
    ]) {
      expect(coreCss, `dist/core.css P0-4 selector ${selector}`).toContain(selector);
    }

    const ssrErrors: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      ssrErrors.push(args.map(String).join(" "));
    };

    try {
      const customSvg = (
        <svg viewBox="0 0 16 16" width="14" height="14" data-custom-svg="true">
          <circle cx="8" cy="8" r="6" />
        </svg>
      );

      const html = renderToStaticMarkup(
        <AsterThemeProvider initialMode="dark">
          <AsterCore.AfAppMark size={48} shape="squircle" name="星序网关" statusBadge="online" badgeCount={12} />
          <AsterCore.AfAppMark size={28} icon={customSvg} tone="accent" />
          <AsterCore.AfOverflowTagList
            items={[
              { key: "t1", label: "MCP", color: "blue" },
              { key: "t2", label: "Sandbox", color: "emerald" },
            ]}
          />
          <AsterCore.AfHotkeyInput defaultValue="Mod+Shift+Space" resetValue="Mod+Shift+Space" />
          <AsterCore.AfCountdown durationMs={45_000} paused warnThresholdMs={60_000} variant="pill" prefix="剩余" />
          <AsterCore.AfQrCodeCard
            value="https://aster-ui.dev/pair?code=884210"
            status="expired"
            title="扫码登录"
            logo={<AsterCore.AfAppMark size={20} icon="sparkle" />}
          />
          <AsterCore.AfDateTimeRangePicker
            locale="zh-CN"
            showSeconds
            today={new Date(2026, 10, 16)}
            defaultValue={[new Date(2026, 10, 10, 8, 0, 0), new Date(2026, 10, 16, 20, 15, 30)]}
          />
          <AsterCore.AfNumberInput
            scrubbable
            defaultValue={16}
            unit="GB"
            unitOptions={["MB", "GB", "TB"]}
            commitMode="blur"
          />
          <AsterCore.AfAutoComplete
            removable
            options={[
              { value: "claude-opus-5-5", group: "最近使用" },
              { value: "claude-sonnet-5-5", group: "推荐模型" },
            ]}
          />
          <AsterCore.AfDropzone
            allowPaste
            directory
            files={[
              { id: "f1", name: "bundle.asar", size: "42 MB", sizeMb: 42, kind: "zip", progress: 35, status: "hashing" },
              { id: "f2", name: "weights.bin", size: "120 MB", sizeMb: 120, kind: "pdf", progress: 92, status: "merging" },
              { id: "f3", name: "draft.json", size: "8 KB", sizeMb: 0.01, kind: "png", progress: 0, status: "canceled" },
            ]}
          />
          <AsterCore.AfTable
            columns={[
              { key: "name", title: "服务", dataIndex: "name", fixed: "left", width: 140, sortable: true },
              { key: "region", title: "区域", dataIndex: "region" },
              { key: "act", title: "操作", fixed: "right", width: 90, render: () => "管理" },
            ]}
            data={[
              {
                id: "r1",
                name: "Gateway",
                region: "ap-east",
                children: [{ id: "r1-1", name: "Worker-A", region: "ap-east" }],
              },
            ]}
            expandable={{
              defaultExpandedRowKeys: ["r1"],
              expandedRowRender: (row) => <div>详情：{String(row.name)}</div>,
            }}
          />
          <AsterCore.AfTree
            checkable
            defaultCheckedKeys={["leaf-1"]}
            defaultExpandedKeys={["root"]}
            searchValue="配置"
            nodes={[
              {
                key: "root",
                label: "系统目录",
                children: [
                  { key: "leaf-1", label: "核心配置文件" },
                  { key: "leaf-2", label: "插件缓存" },
                ],
              },
            ]}
          />
          <AsterCore.AfSparkline interactive values={[12, 19, 15, 28, 34]} labels={["1m", "2m", "3m", "4m", "5m"]} />
        </AsterThemeProvider>,
      );

      expect(html).toContain("af-app-mark");
      expect(html).toContain('data-custom-svg="true"');
      expect(html).toContain("af-overflow-tags");
      expect(html).toContain("af-hotkey");
      expect(html).toContain('data-status="warn"');
      expect(html).toContain("af-qr-card__mask");
      expect(html).toContain("af-datetimerangepicker");
      expect(html).toContain('data-scrub-handle="true"');
      expect(html).toContain("af-number__unit-select");
      expect(html).toContain('data-status="hashing"');
      expect(html).toContain('data-status="merging"');
      expect(html).toContain('data-status="canceled"');
      expect(html).toContain('data-fixed="left"');
      expect(html).toContain("详情：Gateway");
      expect(html).toContain('data-indeterminate="true"');
      expect(html).toContain("af-tree__highlight");
      expect(html).toContain("af-spark-wrap");
    } finally {
      console.error = origError;
    }

    expect(ssrErrors).toEqual([]);
  });

  it("exports all Electron multi-window, auto-scroll, and canvas-zoom primitives across aster-ui / runtime / core / primitives with zh-CN Dropzone localization", () => {
    const primHooks = [
      "useWindowAutoSize",
      "useWindowPointerDrag",
      "useHitAreaCollector",
      "hitTestPoint",
      "useTwoPhaseWindowTransition",
      "useReversibleEdgePeek",
      "useHoverIsolatedTimers",
      "useAutoScrollStick",
      "useCanvasZoomPan",
      "computeCursorAnchoredPan",
    ] as const;

    for (const hookName of primHooks) {
      expect(typeof (AsterPrimitives as Record<string, unknown>)[hookName]).toBe("function");
      expect((AsterCore as Record<string, unknown>)[hookName]).toBe(
        (AsterPrimitives as Record<string, unknown>)[hookName],
      );
      expect((AsterUI as Record<string, unknown>)[hookName]).toBe(
        (AsterPrimitives as Record<string, unknown>)[hookName],
      );
      expect((AsterRuntime as Record<string, unknown>)[hookName]).toBe(
        (AsterPrimitives as Record<string, unknown>)[hookName],
      );
    }

    expect(
      AsterUI.hitTestPoint([{ x: 10, y: 20, width: 100, height: 50, right: 110, bottom: 70 }], 50, 40),
    ).toBe(true);
    expect(
      AsterUI.hitTestPoint([{ x: 10, y: 20, width: 100, height: 50, right: 110, bottom: 70 }], 150, 40),
    ).toBe(false);

    // 验证光标锚点不动点公式：(cursorX - pan0)/z0 === (cursorX - pan1)/z1
    const pan0 = { x: -30, y: 20 };
    const pan1 = AsterUI.computeCursorAnchoredPan(180, 120, pan0, 1, 2.5);
    expect((180 - pan0.x) / 1).toBeCloseTo((180 - pan1.x) / 2.5, 4);
    expect((120 - pan0.y) / 1).toBeCloseTo((120 - pan1.y) / 2.5, 4);

    // Localized AfDropzone (locale="zh-CN") renders Chinese dropzone copy cleanly
    const zhDropzoneHtml = renderToStaticMarkup(
      <AsterThemeProvider>
        <AsterUI.AfDropzone
          locale="zh-CN"
          files={[{ id: "f1", name: "app.zip", size: "1 KB", sizeMb: 1, kind: "zip", progress: 92, status: "merging" }]}
        />
      </AsterThemeProvider>,
    );
    expect(zhDropzoneHtml).toContain("拖拽文件到此处");
    expect(zhDropzoneHtml).toContain("正在合并分片");
    expect(zhDropzoneHtml).not.toContain("Drop files here");
  });

  it("exports core layout & semantic spacing primitives (AfPage, AfPageHeader, AfSection, AfStack, AfInline, AfColumns, AfToolbar, AfListRow, AfSpacer) across core, main, and runtime", () => {
    const layoutExports = [
      "AfPage",
      "AfPageHeader",
      "AfSection",
      "AfStack",
      "AfInline",
      "AfColumns",
      "AfToolbar",
      "AfListRow",
      "AfSpacer",
    ] as const;

    for (const symName of layoutExports) {
      const coreSym = (AsterCore as Record<string, unknown>)[symName];
      const uiSym = (AsterUI as Record<string, unknown>)[symName];
      const rtSym = (AsterRuntime as Record<string, unknown>)[symName];
      expect(coreSym, `@fangxinyan/aster-ui/core.${symName}`).toBeTruthy();
      expect(uiSym, `aster-ui.${symName}`).toBe(coreSym);
      expect(rtSym, `@fangxinyan/aster-ui/runtime.${symName}`).toBe(coreSym);
    }

    const coreCssPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/core.css");
    const coreCss = fs.readFileSync(coreCssPath, "utf8");
    for (const tokenOrClass of [
      "--af-space-micro",
      "--af-space-inline",
      "--af-space-group",
      "--af-space-block",
      "--af-space-section",
      "--af-space-page",
      ".af-page",
      ".af-page-header",
      ".af-section",
      ".af-stack",
      ".af-columns",
      ".af-toolbar",
      ".af-list-row",
    ]) {
      expect(coreCss, `dist/core.css should include ${tokenOrClass}`).toContain(tokenOrClass);
    }

    const layoutHtml = renderToStaticMarkup(
      <AsterThemeProvider initialMode="light" initialDensity="compact">
        <AsterCore.AfPage maxWidth="narrow">
          <AsterCore.AfPageHeader
            title="布局原语契约"
            description="基于语义间距令牌自动响应紧凑密度"
            actions={
              <AsterCore.AfInline gap="inline">
                <AsterCore.AfButton variant="secondary">取消</AsterCore.AfButton>
                <AsterCore.AfButton variant="primary">保存</AsterCore.AfButton>
              </AsterCore.AfInline>
            }
          />
          <AsterCore.AfSection title="双列区">
            <AsterCore.AfColumns columns={2} gap="group">
              <AsterCore.AfStack gap="tight">
                <AsterCore.AfToolbar
                  leading={<AsterCore.AfInput placeholder="搜索" />}
                  trailing={<AsterCore.AfButton size="sm">新建</AsterCore.AfButton>}
                />
                <AsterCore.AfSpacer />
              </AsterCore.AfStack>
              <AsterCore.AfCard flush>
                <AsterCore.AfListRow
                  icon="settings"
                  title="默认配置"
                  description="发丝分隔列表行"
                  control={<AsterCore.AfSwitch defaultChecked />}
                />
              </AsterCore.AfCard>
            </AsterCore.AfColumns>
          </AsterCore.AfSection>
        </AsterCore.AfPage>
      </AsterThemeProvider>,
    );

    expect(layoutHtml).toContain("af-page__inner");
    expect(layoutHtml).toContain("af-page-header__title");
    expect(layoutHtml).toContain("af-columns");
    expect(layoutHtml).toContain('data-columns="2"');
    expect(layoutHtml).toContain('role="toolbar"');
    expect(layoutHtml).toContain("af-list-row__title");
  });

  it("v0.5.1 增强契约：图标别名/校验函数、命令式 afModal、表单无障碍与多图层媒体原语全部同源可用", () => {
    // 1. 图标校验与新增命名图标 / 别名
    expect(AsterUI.isAfIconName("SettingOutlined")).toBe(true);
    expect(AsterUI.isAfIconName("barChart")).toBe(true);
    expect(AsterUI.isAfIconName("picture")).toBe(true);
    expect(AsterUI.isAfIconName("sync")).toBe(true);
    expect(AsterUI.isAfIconName("unknown-custom-icon-xyz")).toBe(false);
    expect(AsterUI.resolveAfIconName("SettingOutlined")).toBe("settings");
    expect(AsterUI.resolveAfIconName("barChart")).toBe("chart");
    expect(AsterUI.resolveAfIconName("picture")).toBe("image");
    expect(AsterUI.resolveAfIconName("sync")).toBe("refresh");
    expect(typeof AsterUI.SettingOutlined).toBe("function");
    expect(AsterCore.SettingOutlined).toBe(AsterUI.SettingOutlined);
    expect(AsterUI.NAMED_ICON_MAP.SettingOutlined).toBe(AsterUI.SettingOutlined);

    // 2. 命令式 afModal / AfModal.confirm 与插件运行时桥接
    expect(typeof AsterUI.afModal.confirm).toBe("function");
    expect(AsterUI.AfModal.confirm).toBe(AsterUI.afModal.confirm);
    expect(AsterRuntime.afModal).toBe(AsterUI.afModal);
    expect(AsterCore.afModal).toBe(AsterUI.afModal);
    expect(typeof AsterUI.afMessage.dismissByKey).toBe("function");
    expect(AsterUI.AfRadio.Group).toBe(AsterUI.AfRadioGroup);

    const rt = AsterRuntime.createAsterPluginRuntime({ ui: AsterRuntime });
    expect(rt.modal).toBe(AsterUI.afModal);
    expect(rt.shared.modal).toBe(AsterUI.afModal);

    // 3. 增强属性全链路 SSR 零报错渲染验证
    const html = renderToStaticMarkup(
      <AsterThemeProvider initialMode="light">
        <AsterUI.SettingOutlined size={16} />
        <AsterUI.AfSelect
          aria-label="选择目标实例"
          showSearch
          value="s1"
          selectedRender={(opt) => <b>{opt.label}</b>}
          optionExtraRender={(opt) => <em>{opt.value}</em>}
          options={[{ value: "s1", label: "主节点" }]}
        />
        <AsterUI.AfCascader
          aria-label="选择区服"
          showSearch={{ filter: (kw, path) => path.some((p) => p.label.includes(kw)) }}
          value={["r1", "s1"]}
          selectedRender={(opts) => <span>{opts.map((o) => o.label).join(" · ")}</span>}
          options={[{ value: "r1", label: "电信区", children: [{ value: "s1", label: "长安城" }] }]}
        />
        <AsterUI.AfCheckbox aria-label="同意协议" defaultChecked />
        <AsterUI.AfRadio.Group
          aria-label="同步方向"
          direction="horizontal"
          size="sm"
          options={[
            { value: "push", label: "推送" },
            { value: "pull", label: "拉取" },
          ]}
        />
        <AsterUI.AfNumberInput aria-label="超时毫秒" defaultValue={500} onBlur={() => {}} />
        <AsterUI.AfSlider aria-label="音量调节" defaultValue={60} />
        <AsterUI.AfDatePicker aria-label="截止日期" allowClear open={false} />
        <AsterUI.AfTabs
          aria-label="配置分区"
          items={[{ key: "general", label: "常规", icon: "SettingOutlined", content: "面板正文" }]}
        />
        <AsterUI.AfTag tone="accent" bordered={false} removable>
          免描边可移除标签
        </AsterUI.AfTag>
        <AsterUI.AfAvatar initials="FX" size={28} />
        <AsterUI.AfProgress aria-label="上传进度" value={30} max={60} showValue />
        <AsterUI.AfText ellipsis copyable>
          支持省略截断与右侧一键复制的行内文本
        </AsterUI.AfText>
        <AsterUI.AfSpriteImage
          src="https://example.com/sheet.png"
          sprite={{ x: 16, y: 32, width: 120, height: 60 }}
          scale={0.5}
          alt="图集横幅"
        />
        <AsterUI.AfLayeredImage
          width={123}
          height={96}
          layers={[
            { src: "https://example.com/frame.png", fit: "none", inset: { top: 20, left: 0, right: 0, bottom: 0 } },
            { src: "https://example.com/head.png", fit: "none", style: { width: 96, height: 108 }, zIndex: 1 },
          ]}
        />
        <AsterUI.AfSplitter
          size={220}
          secondMin={120}
          firstPaneClassName="pane-a"
          secondPaneClassName="pane-b"
          handleClassName="custom-handle"
        >
          <div>左栏</div>
          <div>右栏</div>
        </AsterUI.AfSplitter>
        <AsterUI.AfTablePro
          aria-label="寄售明细"
          scroll={{ x: 640, y: 240 }}
          pagination={false}
          columns={[{ key: "id", title: "编号", dataIndex: "id" }]}
          data={[{ id: "ORD-01" }]}
        />
      </AsterThemeProvider>,
    );

    expect(html).toContain('aria-label="选择目标实例"');
    expect(html).toContain("电信区 · 长安城");
    expect(html).toContain('aria-label="同意协议"');
    expect(html).toContain('data-orientation="horizontal"');
    expect(html).toContain('aria-label="配置分区"');
    expect(html).toContain('data-variant="soft"');
    expect(html).toContain(">FX<");
    expect(html).toContain("50%");
    expect(html).toContain("af-typo-text__copy");
    expect(html).toContain('aria-label="图集横幅"');
    expect(html).toContain("pane-a");
    expect(html).toContain("寄售明细");
  });
});
