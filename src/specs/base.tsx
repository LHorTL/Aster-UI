import { useEffect, useState, type ReactNode } from "react";
import { LENA_AVATAR, THEO_AVATAR } from "../components/illustrations-a/_avatars";
import {
  AfAccordion,
  AfAlert,
  AfAlertDialog,
  AfAvatar,
  AfAvatarStack,
  AfBadge,
  AfBreadcrumb,
  AfButton,
  AfCard,
  AfCardContent,
  AfCardFooter,
  AfCardHeader,
  AfCheckbox,
  AfCheckboxGroup,
  AfChipInput,
  AfCode,
  AfCodeBlock,
  AfCommandPalette,
  AfConfirmProvider,
  AfCopyButton,
  AfDescriptions,
  AfDiffView,
  AfDivider,
  AfDrawer,
  AfEmptyState,
  AfForm,
  AfFormField,
  AfFormItem,
  AfHoverCard,
  AfIconButton,
  AfImage,
  AfInput,
  AfKbd,
  AfKeyValue,
  AfMenu,
  AfMeterBar,
  AfModal,
  AfNumberInput,
  AfPagination,
  AfParagraph,
  AfPopover,
  AfProgress,
  AfProgressRing,
  AfRadio,
  AfRadioGroup,
  AfResizableHandle,
  AfResizablePanel,
  AfResizablePanelGroup,
  AfScrollArea,
  AfSegmented,
  AfSelect,
  AfSeparator,
  AfSkeleton,
  AfSkeletonLoading,
  AfSlider,
  AfSparkline,
  AfSpinner,
  AfSplitter,
  AfSplitterPanel,
  AfStat,
  AfStatus,
  AfSteps,
  AfSurface,
  AfSwitch,
  AfTable,
  AfTag,
  AfText,
  AfTextarea,
  AfToastProvider,
  AfToggleGroup,
  AfTimeline,
  AfTitle,
  AfTooltip,
  AfTree,
  AfTypography,
  afMessage,
  useAfConfirm,
  useAfForm,
  useAfToast,
  type AfCodeLanguage,
  type AfCommand,
  type AfDrawerPlacement,
  type AfTableColumn,
  type AfTreeNode,
} from "../ui";
import type { ComponentSpec } from "../types";
import { AfIcon } from "../icons";
import "./base.css";

/** 预览面板：把控件放进真实的设置行，避免白底上单纯罗列控件。 */
function Panel({ title, desc, children, wide }: { title: string; desc?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className="af-base-panel" data-wide={wide || undefined}>
      <header className="af-base-panel__head">
        <strong>{title}</strong>
        {desc ? <span>{desc}</span> : null}
      </header>
      {children}
    </section>
  );
}

/** 设置行：左侧标签与说明，右侧控件。 */
function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="af-base-row">
      <span className="af-base-row__label">
        <span className="af-base-row__title">{label}</span>
        {hint ? <span className="af-base-row__hint">{hint}</span> : null}
      </span>
      <span className="af-base-row__control">{children}</span>
    </div>
  );
}

/** Button 预览：五种外观、三档尺寸、图标、加载与禁用。 */
function ButtonSpecimen() {
  const [loading, setLoading] = useState(false);
  return (
    <div className="af-base-demo">
      <Panel title="操作层级" desc="primary 采用 Pro 近黑实心主按钮，accent 承载品牌强调 CTA，其余为发丝白底或透明；禁用整体降到 40%。">
        <div className="af-demo-row">
          <AfButton variant="primary" onClick={() => setLoading((value) => !value)} loading={loading}>
            保存更改
          </AfButton>
          <AfButton variant="accent">品牌强调</AfButton>
          <AfButton variant="secondary" icon="plus">
            次要操作
          </AfButton>
          <AfButton variant="ghost">幽灵按钮</AfButton>
          <AfButton variant="destructive" icon="trash">
            删除
          </AfButton>
        </div>
        <Row label="块级与尾图标" hint="block 撑满容器；trailingIcon 支持任意节点">
          <div style={{ width: 240 }}>
            <AfButton block variant="primary" trailingIcon="arrowRight">
              导入已有简历
            </AfButton>
          </div>
          <AfButton icon="heart" tip="收藏" />
        </Row>
        <Row label="尺寸" hint="工具栏 28 / 默认 32 / 独立表单 36">
          <AfButton size="sm" variant="secondary">
            28
          </AfButton>
          <AfButton variant="secondary">32</AfButton>
          <AfButton size="lg" variant="secondary">
            36
          </AfButton>
        </Row>
        <Row label="状态" hint="加载时文字降到 50%，一道光带扫过，宽度不变">
          <AfButton variant="primary" kbd="Ctrl ↵">
            发布
          </AfButton>
          <AfButton variant="secondary" disabled>
            不可用
          </AfButton>
          <AfButton variant="primary" icon="refresh" loading>
            处理中
          </AfButton>
        </Row>
      </Panel>
    </div>
  );
}

/** Segmented 预览：托盘、独立按钮、页面页签与下划线四种形态。 */
function SegmentedSpecimen() {
  const [view, setView] = useState("7d");
  const [chips, setChips] = useState("list");
  const [tab, setTab] = useState("all");
  const [line, setLine] = useState("overview");
  return (
    <div className="af-base-demo">
      <Panel title="视图切换" desc="同一套滑动指示器覆盖时间范围、视图、页签与筛选；不要同时出现两种形态。">
        <Row label="时间范围" hint="托盘形态，滑块在选项之间平滑移动">
          <AfSegmented
            label="时间范围"
            value={view}
            onChange={setView}
            options={[
              { value: "7d", label: "7 天" },
              { value: "30d", label: "30 天" },
              { value: "90d", label: "90 天" },
            ]}
          />
        </Row>
        <Row label="筛选" hint="独立 chip 形态，可带计数">
          <AfSegmented
            label="筛选"
            variant="buttons"
            value={chips}
            onChange={setChips}
            options={[
              { value: "list", label: "列表", count: 12 },
              { value: "board", label: "看板" },
              { value: "timeline", label: "时间线" },
            ]}
          />
        </Row>
        <Row label="页面页签" hint="设置页 32px 页签">
          <AfSegmented
            label="页面页签"
            variant="tabs"
            value={tab}
            onChange={setTab}
            options={[
              { value: "all", label: "全部" },
              { value: "run", label: "运行中" },
              { value: "need", label: "需要你" },
            ]}
          />
        </Row>
        <Row label="下划线" hint="仅用于极少量平级视图">
          <AfSegmented
            label="视图"
            variant="underline"
            value={line}
            onChange={setLine}
            options={[
              { value: "overview", label: "总览" },
              { value: "usage", label: "用量分析" },
              { value: "sessions", label: "会话记录" },
            ]}
          />
        </Row>
      </Panel>
    </div>
  );
}

/** Input 预览：常规、搜索、清除、计数、校验、尺寸与禁用。 */
function InputSpecimen() {
  const [name, setName] = useState("Token 统计");
  const [search, setSearch] = useState("缓存命中率");
  const [secret, setSecret] = useState("sk-live-9f2c8a");
  return (
    <div className="af-base-demo">
      <Panel title="项目信息" desc="外层字段承担底色、描边、焦点外圈与错误抖动，内部原生输入不画第二层焦点。">
        <Row label="项目名称" hint="用于工作台标题与导出文件名">
          <AfInput aria-label="项目名称" value={name} onChange={(event) => setName(event.target.value)} style={{ width: 260 }} />
        </Row>
        <Row label="搜索与清除" hint="allowClear / prefix / trailingIcon / showCount">
          <AfInput
            aria-label="搜索"
            leadingIcon="search"
            trailingIcon="filter"
            prefix={<span style={{ color: "var(--af-faint)" }}>#</span>}
            allowClear
            showCount
            maxLength={24}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索组件、App 或会话"
            style={{ width: 300 }}
          />
        </Row>
        <Row label="密码" hint="type=password + revealable，显隐切换不改变字段高度">
          <AfInput
            aria-label="API Key"
            type="password"
            revealable
            allowClear
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            style={{ width: 260 }}
          />
        </Row>
        <Row label="校验" hint="从正确变错误时只抖动一次">
          <AfInput aria-label="邮箱" placeholder="you@example.com" invalid error="请输入有效的邮箱地址" style={{ width: 280 }} />
        </Row>
        <Row label="尺寸" hint="sm 28 / md 32 / lg 36">
          <AfInput aria-label="小号" size="sm" placeholder="sm" style={{ width: 88 }} />
          <AfInput aria-label="默认" placeholder="md" style={{ width: 108 }} />
          <AfInput aria-label="大号" size="lg" placeholder="lg" style={{ width: 128 }} />
        </Row>
        <Row label="外观变体" hint="outline 发丝描边 / filled 轻灰填充 / borderless 无框行内">
          <AfInput aria-label="填充变体" variant="filled" placeholder="filled" style={{ width: 112 }} />
          <AfInput aria-label="无框变体" variant="borderless" placeholder="borderless 行内输入" style={{ width: 148 }} />
        </Row>
        <Row label="禁用" hint="只读或不可编辑状态">
          <AfInput aria-label="不可用" value="不可编辑" disabled style={{ width: 220 }} />
        </Row>
      </Panel>
    </div>
  );
}

/** Select 预览：搜索、多选、分组、尺寸与禁用。 */
function SelectSpecimen() {
  const [model, setModel] = useState("auto");
  const [range, setRange] = useState("30d");
  const [models, setModels] = useState(["sonnet", "haiku"]);
  const options = [
    { value: "auto", label: "Auto", description: "按任务自动路由" },
    { value: "opus", label: "Opus 5.5", description: "复杂推理与长文" },
    { value: "sonnet", label: "Sonnet 5.5", description: "日常默认" },
    { value: "haiku", label: "Haiku 5.5", description: "快速轻量" },
  ];
  const grouped = [
    { label: "常用模型", options: options.slice(0, 2) },
    { label: "其他模型", options: options.slice(2) },
  ];
  return (
    <div className="af-base-demo">
      <Panel title="全局配置" desc="触发器与 Input 同高同圆角；选项支持第二行说明，浮层自动翻转并夹在舞台内。">
        <Row label="默认模型" hint="新会话优先使用">
          <AfSelect label="选择模型" value={model} onChange={setModel} options={options} width={220} />
        </Row>
        <Row label="可搜索" hint="searchable + clearable，框内直接过滤">
          <AfSelect
            label="搜索模型"
            searchable
            clearable
            value={model}
            onChange={setModel}
            options={options}
            placeholder="搜索模型…"
            width={220}
          />
        </Row>
        <Row label="多选" hint="标签展示、搜索、清除与 +N 折叠">
          <AfSelect
            label="多选模型"
            multiple
            searchable
            clearable
            maxTagCount={2}
            value={models}
            onChange={setModels}
            options={options}
            placeholder="选择一个或多个模型"
            width={280}
          />
        </Row>
        <Row label="分组" hint="分组标题与禁用项">
          <AfSelect
            label="分组模型"
            searchable
            clearable
            value={model}
            onChange={setModel}
            options={grouped}
            width={240}
          />
        </Row>
        <Row label="统计范围" hint="工作台 KPI 与图表共用">
          <AfSelect
            label="时间范围"
            value={range}
            onChange={setRange}
            options={[
              { value: "7d", label: "最近 7 天" },
              { value: "30d", label: "最近 30 天" },
              { value: "90d", label: "最近 90 天" },
            ]}
            width={180}
          />
        </Row>
        <Row label="尺寸" hint="与 Input 保持一致">
          <AfSelect label="小号" size="sm" value={model} onChange={setModel} options={options} width={140} />
          <AfSelect label="大号" size="lg" value={model} onChange={setModel} options={options} width={190} />
        </Row>
        <Row label="禁用" hint="只读配置">
          <AfSelect label="禁用" value="auto" onChange={() => {}} options={options} width={180} disabled />
        </Row>
      </Panel>
    </div>
  );
}

/** Checkbox 预览：选中、未选、禁用、半选与说明。 */
function CheckboxSpecimen() {
  const [checked, setChecked] = useState(true);
  const [limits, setLimits] = useState(false);
  const [partial, setPartial] = useState(true);
  return (
    <div className="af-base-demo">
      <Panel title="通知偏好" desc="多选与确认场景；选中后填充强调色，支持半选与禁用。">
        <Row label="记住这次选择" hint="下次打开同一任务时沿用">
          <AfCheckbox checked={checked} onChange={setChecked}>
            已启用
          </AfCheckbox>
        </Row>
        <Row label="启用用量上限" hint="超过阈值时暂停新任务">
          <AfCheckbox checked={limits} onChange={setLimits}>
            每月 500 万 Token
          </AfCheckbox>
        </Row>
        <Row label="半选" hint="全选组中只勾选部分项">
          <AfCheckbox checked={partial} indeterminate onChange={setPartial}>
            部分模型已选
          </AfCheckbox>
        </Row>
        <Row label="每次询问" hint="不记住本次选择">
          <AfCheckbox checked={false} onChange={() => {}}>
            由我确认
          </AfCheckbox>
        </Row>
        <Row label="禁用项" hint="由策略锁定">
          <AfCheckbox checked={true} disabled onChange={() => {}}>
            不可更改
          </AfCheckbox>
        </Row>
      </Panel>
    </div>
  );
}

/** Switch 预览：开、关、轨道文本、尺寸与禁用。 */
function SwitchSpecimen() {
  const [sync, setSync] = useState(true);
  const [collect, setCollect] = useState(false);
  const [inline, setInline] = useState(true);
  return (
    <div className="af-base-demo">
      <Panel title="运行设置" desc="用于即时生效的开关；标签在左侧，状态用强调色轨道与滑块位置表达。">
        <Row label="同步会话记录" hint="在设备之间同步标题与用量">
          <AfSwitch checked={sync} onChange={setSync} label="同步会话记录" />
        </Row>
        <Row label="允许匿名统计" hint="只上传崩溃与性能数据">
          <AfSwitch checked={collect} onChange={setCollect} label="允许匿名统计" />
        </Row>
        <Row label="小号与轨道文本" hint="sm 26×16，轨道内可显示 ON / OFF">
          <AfSwitch size="sm" checked={inline} checkedChildren="ON" unCheckedChildren="OFF" onChange={setInline} label="小号开关" />
        </Row>
        <Row label="开机时启动" hint="不显示窗口，只驻留托盘">
          <AfSwitch checked disabled onChange={() => {}} label="开机时启动" />
        </Row>
      </Panel>
    </div>
  );
}

/** Tag 与 Status 预览：五种语义、点标记、图标、可关闭标签与状态点。 */
function TagStatusSpecimen() {
  const [filters, setFilters] = useState(["模型: Sonnet 5.5", "命中缓存", "P95 < 800ms"]);
  return (
    <div className="af-base-demo">
      <Panel title="语义标签" desc="Tag 是静态或可移除筛选标签，Status 是带状态点的运行态；同一语义色在两种组件里保持一致。">
        <div className="af-demo-row">
          <AfTag>中性</AfTag>
          <AfTag tone="accent">强调</AfTag>
          <AfTag tone="success">成功</AfTag>
          <AfTag tone="warning">警告</AfTag>
          <AfTag tone="danger">危险</AfTag>
          <AfTag tone="success" dot>
            运行中
          </AfTag>
          <AfTag tone="accent" size="sm">
            sm 24
          </AfTag>
        </div>
        <Row label="图标与可关闭" hint="icon 前置语义图标，closable 用于筛选条件移除">
          <AfTag icon="sparkle" tone="accent">
            智能路由
          </AfTag>
          {filters.map((item) => (
            <AfTag key={item} icon="tag" closable onClose={() => setFilters((prev) => prev.filter((x) => x !== item))}>
              {item}
            </AfTag>
          ))}
        </Row>
        <Row label="运行状态" hint="带脉冲点表示正在运行">
          <AfStatus tone="success" pulse>
            运行中
          </AfStatus>
          <AfStatus tone="warning">需要确认</AfStatus>
          <AfStatus tone="danger">已失败</AfStatus>
          <AfStatus tone="neutral">已暂停</AfStatus>
        </Row>
      </Panel>
    </div>
  );
}

/** Kbd 独立舞台：跨平台单芯片组合键帽、深色按钮自适应对比与屏幕阅读器全称展开。 */
function KbdSpecimen() {
  const [plat, setPlat] = useState<"mac" | "other">(() =>
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
      ? "mac"
      : "other",
  );
  const shortcuts = [
    { label: "Search runs and files", keys: "mod+k" },
    { label: "New task", keys: "c" },
    { label: "Run the agent", keys: "mod+enter" },
    { label: "Stop the run", keys: "mod+." },
    { label: "Approve and continue", keys: "mod+shift+a" },
    { label: "Close the panel", keys: "esc" },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        width: "100%",
        maxWidth: 400,
        margin: "0 auto",
        padding: "16px 18px",
        borderRadius: "var(--af-r-card)",
        background: "var(--af-surface)",
        boxShadow: "var(--af-shadow-card)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          paddingBottom: 10,
          boxShadow: "var(--af-divider-hairline)",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: "var(--af-muted)" }}>
          KEYBOARD SHORTCUTS
        </span>
        <AfSegmented
          label="Platform preview"
          size="sm"
          value={plat}
          onChange={(v) => setPlat(v as "mac" | "other")}
          options={[
            { value: "mac", label: "macOS" },
            { value: "other", label: "Windows" },
          ]}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shortcuts.map((item) => (
          <div
            key={item.keys}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              minHeight: 26,
            }}
          >
            <span style={{ fontSize: 13, color: "var(--af-text)" }}>{item.label}</span>
            <AfKbd keys={item.keys} platform={plat} />
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          paddingTop: 12,
          boxShadow: "var(--af-divider-hairline-top)",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--af-muted)" }}>
          Press <AfKbd keys="?" size="sm" platform={plat} /> anytime to open this list
        </span>
      </div>
    </div>
  );
}

/** Kbd 与 Code 预览：快捷键组合与行内代码。 */
function KbdCodeSpecimen() {
  return <KbdSpecimen />;
}

/** Textarea 预览：常规、自适应行高、错误、字数与代码高亮。 */
function TextareaSpecimen() {
  const [prompt, setPrompt] = useState("把这周的会话按 Token 用量整理成一张表，并标出增长最快的模型。");
  const [note, setNote] = useState("支持 field-sizing: content 内容自适应高度：\n继续输入多行时自动增高，到达上限后转为内部滚动。");
  const [codeLanguage, setCodeLanguage] = useState<AfCodeLanguage>("typescript");
  const [codes, setCodes] = useState<Record<string, string>>({
    typescript: `type Session = {\n  id: string;\n  tokens: number;\n  model: "opus" | "sonnet";\n};\n\nconst sessions: Session[] = [];`,
    json: `{\n  "model": "sonnet",\n  "tokens": 1240,\n  "cached": true,\n  "tags": ["chat", "analysis"]\n}`,
    python: `def summarize(sessions):\n    total = sum(item["tokens"] for item in sessions)\n    return {"total": total, "count": len(sessions)}`,
    css: `.shell {\n  display: flex;\n  gap: 12px;\n  background: color-mix(in srgb, var(--af-surface) 80%, transparent);\n}`,
  });
  const codeLanguages: Array<{ value: AfCodeLanguage; label: string }> = [
    { value: "typescript", label: "TS" },
    { value: "json", label: "JSON" },
    { value: "python", label: "PY" },
    { value: "css", label: "CSS" },
  ];
  return (
    <div className="af-base-demo">
      <Panel title="任务说明" desc="支持固定最小高度、autoSize 内容自适应高度（2~6 行）与右下角自定义拉伸手柄。" wide>
        <div className="af-base-cols">
          <div className="af-base-col">
            <span className="af-base-col__label">提示词</span>
            <AfTextarea aria-label="提示词" value={prompt} maxLength={200} allowClear showCount rows={3} onChange={(event) => setPrompt(event.target.value)} />
          </div>
          <div className="af-base-col">
            <span className="af-base-col__label">自适应行高（autoSize 2~6 行）</span>
            <AfTextarea
              aria-label="自适应备注"
              autoSize={{ minRows: 2, maxRows: 6 }}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>
        <Row label="校验与禁用" hint="错误抖动与不可编辑态">
          <AfTextarea aria-label="错误示例" placeholder="描述任务…" rows={2} invalid error="内容不能为空" style={{ width: 220 }} />
          <AfTextarea aria-label="禁用文本域" placeholder="不可用" rows={2} disabled style={{ width: 180 }} />
        </Row>
      </Panel>
      <Panel title="代码编辑器" desc="language 启用内置语法高亮、语言条、行号、字符统计与一键复制；输入层透明，光标/选区保持原生。" wide>
        <Row label="内置语言" hint="TS / JSON / Python / CSS，另有 JS / JSX / HTML / SQL / YAML / Markdown 等">
          <div className="af-demo-row">
            {codeLanguages.map((item) => (
              <AfButton key={item.value} size="sm" variant={codeLanguage === item.value ? "primary" : "secondary"} onClick={() => setCodeLanguage(item.value)}>
                {item.label}
              </AfButton>
            ))}
          </div>
        </Row>
        <AfTextarea
          aria-label="代码编辑器"
          language={codeLanguage}
          value={codes[codeLanguage]}
          rows={6}
          allowClear
          onChange={(event) => setCodes((current) => ({ ...current, [codeLanguage]: event.target.value }))}
        />
      </Panel>
    </div>
  );
}

/** Radio 预览：列表形态、卡片选择形态、独立单选原子与多选卡片。 */
function RadioSpecimen() {
  const [tier, setTier] = useState("risky");
  const [plan, setPlan] = useState("pro");
  const [scopes, setScopes] = useState(["read", "cite"]);
  const [standalone, setStandalone] = useState(true);
  return (
    <div className="af-base-demo">
      <Panel title="自动化等级（列表与独立原子）" desc="互斥选项；行内可带说明，也支持单独使用 AfRadio 原子拼装自定义表单行。" wide>
        <AfRadioGroup
          label="自动化等级"
          value={tier}
          onChange={setTier}
          options={[
            { value: "ask", label: "始终询问", description: "每个动作都先向你确认" },
            { value: "risky", label: "有风险才问", description: "安全动作自动执行" },
            { value: "auto", label: "完全自动", description: "只在失败时通知你" },
          ]}
        />
        <Row label="独立单选原子" hint="AfRadio 支持脱离 Group 在任意布局中受控/非受控使用">
          <AfRadio checked={standalone} onChange={setStandalone} name="standalone-demo" description="优先使用本机缓存索引">
            本地加速模式
          </AfRadio>
        </Row>
      </Panel>
      <Panel title="卡片选择模式（variant=card）" desc="单选组与多选组共用发丝边框选择卡，适合套餐档位、模型路由和权限授权。" wide>
        <AfRadioGroup
          label="算力档位"
          variant="card"
          orientation="horizontal"
          value={plan}
          onChange={setPlan}
          options={[
            { value: "starter", label: "轻量版", badge: "Free", description: "适合个人日常问答与草稿润色" },
            { value: "pro", label: "专业版", badge: "推荐", description: "包含多代理编排与长上下文检索" },
            { value: "team", label: "团队版", badge: "SSO", description: "统一审计日志、配额池与私有部署" },
          ]}
        />
        <AfCheckboxGroup
          label="数据授权范围"
          variant="card"
          orientation="horizontal"
          values={scopes}
          onChange={setScopes}
          options={[
            { value: "read", label: "读取会话", badge: "只读", description: "允许统计模型用量与延迟" },
            { value: "cite", label: "原文引用", badge: "片段", description: "回答中展示本地文档命中的段落" },
          ]}
        />
      </Panel>
    </div>
  );
}

/** Slider 预览：连续值、格式化数值与禁用。 */
function SliderSpecimen() {
  const [context, setContext] = useState(64);
  const [parallel, setParallel] = useState(3);
  const [temperature, setTemperature] = useState<[number, number]>([20, 80]);
  return (
    <div className="af-base-demo">
      <Panel title="上下文与并发" desc="4px 轨道、强调色填充、16px 拇指；方向键 / Home / End 可调，端点拇指不会越界。" wide>
        <AfSlider label="上下文窗口" value={context} onChange={setContext} min={8} max={200} step={8} format={(value) => `${value}k tokens`} />
        <AfSlider label="最大并行任务" value={parallel} onChange={setParallel} min={1} max={8} step={1} format={(value) => `${value} 个`} />
        <AfSlider label="缓存命中目标" value={40} onChange={() => {}} disabled format={(value) => `${value}%`} />
        <AfSlider
          label="温度区间"
          range
          value={temperature}
          onChange={setTemperature}
          min={0}
          max={100}
          step={5}
          tone="warning"
          marks={{ 0: "0°", 50: "50°", 100: "100°" }}
          format={(value) => `${value}°`}
        />
        <Row label="行内紧凑" hint="inline + size=sm 省略头尾文字，适合嵌入工具条与权重配额行">
          <div style={{ width: 220 }}>
            <AfSlider inline size="sm" min={1} max={10} value={parallel} onChange={setParallel} ariaLabel="行内并行滑块" />
          </div>
        </Row>
      </Panel>
    </div>
  );
}

/** NumberInput 预览：步进、边界、精度、单位与禁用。 */
function NumberInputSpecimen() {
  const [tasks, setTasks] = useState(3);
  const [budget, setBudget] = useState(120);
  const [price, setPrice] = useState(0.85);
  return (
    <div className="af-base-demo">
      <Panel title="额度与并发" desc="32px 字段内嵌 24px −/+ 按钮；允许临时清空，失焦或回车夹取到边界；↑↓ 按步长调整。">
        <Row label="最大并行任务" hint="范围 1–8">
          <div style={{ width: 240 }}>
            <AfNumberInput value={tasks} onChange={setTasks} min={1} max={8} />
          </div>
        </Row>
        <Row label="月度额度" hint="0–500，步长 10">
          <div style={{ width: 260 }}>
            <AfNumberInput value={budget} onChange={setBudget} min={0} max={500} step={10} suffix="万 Token" />
          </div>
        </Row>
        <Row label="调用单价" hint="precision=2 / controls=false / prefix">
          <div style={{ width: 220 }}>
            <AfNumberInput value={price} onChange={setPrice} min={0} max={99} step={0.01} precision={2} controls={false} prefix="¥" suffix="/ 次" />
          </div>
        </Row>
        <Row label="保留天数" hint="清理任务使用">
          <div style={{ width: 200 }}>
            <AfNumberInput value={12} onChange={() => {}} disabled suffix="天" />
          </div>
        </Row>
      </Panel>
    </div>
  );
}

/** FormField 预览：标签、说明、必填、错误与控件组合。 */
function FormFieldSpecimen() {
  const [name, setName] = useState("Token 统计");
  const [apiKey, setApiKey] = useState("sk-live-9f2");
  return (
    <div className="af-base-demo">
      <Panel title="应用连接设置" desc="字段包裹只负责标签、说明与错误排版，不重复画输入框边缘。" wide>
        <div className="af-base-form">
          <AfFormField label="项目名称" hint="用于工作台标题与导出文件名" required htmlFor="ff-name">
            <AfInput id="ff-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="项目名称" />
          </AfFormField>
          <AfFormField label="工作区 ID" hint="只读，由系统生成" htmlFor="ff-ws">
            <AfInput id="ff-ws" defaultValue="ws_9f2c" readOnly suffix={<AfKbd>⌘C</AfKbd>} />
          </AfFormField>
          <AfFormField label="API Key" error="密钥格式不正确，应以 sk- 开头" htmlFor="ff-key">
            <AfInput id="ff-key" value={apiKey} invalid onChange={(event) => setApiKey(event.target.value)} />
          </AfFormField>
        </div>
      </Panel>
    </div>
  );
}

/** Modal 预览：遮罩、标题、说明与底部操作。 */
function ModalSpecimen() {
  const [open, setOpen] = useState(false);
  return (
    <div className="af-base-demo">
      <Panel title="确认类操作" desc="遮罩淡入、面板从 98% 放大；Esc 关闭并把焦点还给触发按钮。">
        <Row label="清除会话记录" hint="不可撤销，需要二次确认">
          <AfButton variant="secondary" icon="trash" onClick={() => setOpen(true)}>
            打开弹窗
          </AfButton>
        </Row>
        <AfModal
          open={open}
          onClose={() => setOpen(false)}
          title="清除本机会话记录"
          description="这一步会删除最近 30 天的会话索引，且无法撤销。"
          footer={
            <>
              <AfButton variant="ghost" onClick={() => setOpen(false)}>
                取消
              </AfButton>
              <AfButton variant="destructive" onClick={() => setOpen(false)}>
                确认清除
              </AfButton>
            </>
          }
        >
          <p style={{ margin: 0, color: "var(--af-text)", fontSize: 13, lineHeight: "20px" }}>
            模型调用记录会保留，但本地检索、引用和追问上下文将不再可用。建议先导出需要保留的会话。
          </p>
        </AfModal>
      </Panel>
    </div>
  );
}

/** Drawer 预览：右侧、左侧与底部抽屉、标题、正文与常驻底部。 */
function DrawerSpecimen() {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<AfDrawerPlacement>("right");
  return (
    <div className="af-base-demo">
      <Panel title="侧向与底部抽屉" desc="支持 right / left / bottom 三向滑出与平滑退场；正文独立滚动，标题与底部操作保持不动。">
        <Row label="弹出方向" hint="默认右侧 420px，底部抽屉适合移动端或终端日志">
          <AfSegmented
            label="抽屉方向"
            size="sm"
            value={placement}
            onChange={(next) => setPlacement(next as AfDrawerPlacement)}
            options={[
              { value: "right", label: "右侧" },
              { value: "left", label: "左侧" },
              { value: "bottom", label: "底部" },
            ]}
          />
          <AfButton variant="secondary" onClick={() => setOpen(true)}>
            打开抽屉
          </AfButton>
        </Row>
        <AfDrawer
          open={open}
          placement={placement}
          height={280}
          onClose={() => setOpen(false)}
          title="应用连接详情"
          description="检查权限范围与最近一次同步。"
          footer={
            <>
              <AfButton variant="ghost" onClick={() => setOpen(false)}>
                取消
              </AfButton>
              <AfButton variant="primary" onClick={() => setOpen(false)}>
                保存连接
              </AfButton>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <AfFormField label="Token 统计" hint="本地数据库 · 只读">
              <span style={{ color: "var(--af-muted)", fontSize: 12 }}>授权于 10 月 18 日 · 最近同步 2 分钟前</span>
            </AfFormField>
            <AfFormField label="会话记录" hint="当前工作区 · 读写">
              <span style={{ color: "var(--af-muted)", fontSize: 12 }}>用于生成用量结论与来源引用。</span>
            </AfFormField>
          </div>
        </AfDrawer>
      </Panel>
    </div>
  );
}

/** Tooltip 预览：上/下方向、快捷键与长文案。 */
function TooltipSpecimen() {
  return (
    <div className="af-base-demo">
      <Panel title="补充说明" desc="Tooltip 只做补充说明，不承载操作；默认上方，空间不足或指定时向下。">
        <Row label="图标按钮" hint="悬停查看说明">
          <AfTooltip label="复制回答">
            <AfButton size="sm" variant="ghost" icon="copy" aria-label="复制回答" />
          </AfTooltip>
          <AfTooltip label="保存更改" kbd="⌘ S">
            <AfButton size="sm" variant="secondary">
              保存
            </AfButton>
          </AfTooltip>
        </Row>
        <Row label="方向" hint="默认上方，可指定下方">
          <AfTooltip label="在下方显示" side="bottom">
            <AfButton size="sm" variant="ghost" icon="refresh" aria-label="刷新" />
          </AfTooltip>
          <AfTooltip label="长提示会自动翻转">
            <AfButton size="sm" variant="ghost" icon="search" aria-label="搜索" />
          </AfTooltip>
        </Row>
      </Panel>
    </div>
  );
}

/** Badge 独立舞台：柔和语义胶囊、活跃呼吸环、图标前缀、等宽计数与右上角角标。 */
function BadgeSpecimen() {
  const [unread, setUnread] = useState(128);
  const pauseIcon = (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="2.2" y="2" width="2.6" height="8" rx="0.7" stroke="currentColor" strokeWidth="1.2" />
      <rect x="7.2" y="2" width="2.6" height="8" rx="0.7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
  const runs = [
    { title: "Sync invoices to billing-api", sub: "Started 2 min ago", label: "Running", tone: "info" as const, live: true },
    { title: "Draft replies for 14 tickets", sub: "Waiting since 10:42", label: "Needs you", tone: "warning" as const, dot: true },
    { title: "Weekly usage report", sub: "Finished in 3m 12s", label: "Done", tone: "success" as const },
    { title: "Migrate webhooks to v2", sub: "Rate limited by GitHub", label: "Failed", tone: "danger" as const },
    { title: "Re-index the help center", sub: "Tomorrow at 06:00", label: "Scheduled", tone: "neutral" as const, icon: "clock" as const },
    { title: "Clean up stale branches", sub: "Paused by Mara", label: "Paused", tone: "neutral" as const, icon: pauseIcon },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 460,
        margin: "0 auto",
        borderRadius: "var(--af-r-card)",
        background: "var(--af-surface)",
        boxShadow: "var(--af-shadow-card)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "11px 16px",
          boxShadow: "var(--af-divider-hairline)",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: "var(--af-muted)" }}>RUNS</span>
          <AfBadge count={6} tone="neutral" />
        </div>
        <button
          type="button"
          onClick={() => setUnread((n) => (n >= 100 ? 3 : 128))}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: 0,
            border: 0,
            background: "transparent",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--af-muted)" }}>Needs you</span>
          <AfBadge count={unread} max={99} tone="warning" />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {runs.map((run) => (
          <div
            key={run.title}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "9px 16px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--af-strong)", lineHeight: "18px" }}>
                {run.title}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--af-muted)", lineHeight: "16px" }}>{run.sub}</span>
            </div>
            <AfBadge tone={run.tone} live={run.live} dot={run.dot} icon={run.icon}>
              {run.label}
            </AfBadge>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          boxShadow: "var(--af-divider-hairline-top)",
        }}
      >
        <span style={{ fontSize: 12.5, color: "var(--af-muted)" }}>Triage agent</span>
        <AfBadge tone="purple" size="sm">
          Beta
        </AfBadge>
      </div>
    </div>
  );
}

/** Avatar 独立舞台：人物圆形柔和色相、图片柔和淡入、叠放头像组与 Agent 3×3 对称像素呼吸标识。 */
function AvatarSpecimen() {
  const rows = [
    {
      key: "mara",
      avatar: <AfAvatar name="Mara Lindqvist" src={LENA_AVATAR} size={32} status="online" />,
      name: "Mara Lindqvist",
      meta: "Design lead",
    },
    {
      key: "jonas",
      avatar: <AfAvatar name="Jonas Weber" src={THEO_AVATAR} size={32} status="away" />,
      name: "Jonas Weber",
      meta: "Reviewing PR #482",
    },
    {
      key: "priya",
      avatar: <AfAvatar name="Priya Raman" tone="warning" size={32} status="busy" />,
      name: "Priya Raman",
      meta: "In a call until 15:30",
    },
    {
      key: "chris",
      avatar: <AfAvatar name="Christopher Montgomery III" tone="info" size={32} />,
      name: "Christopher Montgomery III",
      meta: "Joined yesterday",
    },
    {
      key: "triage",
      avatar: <AfAvatar kind="agent" name="Triage agent" seed="triage-agent" size={32} working />,
      name: "Triage agent",
      meta: "Writing the summary for 14 tickets",
    },
    {
      key: "northwind",
      avatar: <AfAvatar name="Northwind" shape="square" tone="success" size={32} />,
      name: "Northwind",
      meta: "Workspace · 24 members",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 380,
        margin: "0 auto",
        borderRadius: "var(--af-r-card)",
        background: "var(--af-surface)",
        boxShadow: "var(--af-shadow-card)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "11px 16px",
          boxShadow: "var(--af-divider-hairline)",
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--af-strong)" }}>Release 4.2</span>
        <AfAvatarStack
          size={24}
          max={4}
          total={9}
          aria-label="9 people on this release"
          items={[
            { name: "Mara Lindqvist", src: LENA_AVATAR },
            { kind: "agent", name: "Triage agent", seed: "triage-agent", working: true },
            { name: "Jonas Weber", src: THEO_AVATAR },
            { name: "Priya Raman", tone: "warning" },
          ]}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "6px 0" }}>
        {rows.map((row) => (
          <div
            key={row.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "7px 16px",
            }}
          >
            {row.avatar}
            <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--af-strong)", lineHeight: "18px" }}>
                {row.name}
              </span>
              <span style={{ fontSize: 12, color: "var(--af-muted)", lineHeight: "16px" }}>{row.meta}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Popover 与 Menu 预览：自包含触发浮层、四向定位与多级勾选菜单。 */
function PopoverMenuSpecimen() {
  const [compact, setCompact] = useState(false);
  const [stream, setStream] = useState(true);
  const [route, setRoute] = useState<"auto" | "opus" | "sonnet">("auto");
  return (
    <div className="af-base-demo" style={{ paddingBottom: 120 }}>
      <Panel title="弹出层与增强菜单" desc="AfPopover 支持传 trigger 自包含开合与四向翻转；AfMenu 支持复选、单选组与多级飞出子菜单。" wide>
        <Row label="自包含弹出面板" hint="点击触发、Esc 关闭并归还焦点，无需手写 ref">
          <AfPopover
            side="bottom"
            align="end"
            label="配额速览"
            trigger={
              <AfButton variant="secondary" icon="sliders">
                配额速览
              </AfButton>
            }
          >
            <div style={{ width: 248, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 13, color: "var(--af-strong)" }}>实时推理配额</strong>
                <AfTag size="sm" tone="success">
                  健康
                </AfTag>
              </div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: "var(--af-muted)" }}>
                今日已消耗 1.42M / 5.00M Token，缓存命中为你节省约 68% 成本。
              </p>
            </div>
          </AfPopover>
        </Row>
        <Row label="复选、单选与子菜单" hint="menuitemcheckbox / menuitemradio / 二级子菜单">
          <AfMenu
            align="end"
            items={[
              { key: "hdr-view", type: "label", label: "界面偏好" },
              {
                key: "compact",
                type: "checkbox",
                label: "紧凑会话行高",
                checked: compact,
                onCheckedChange: setCompact,
              },
              {
                key: "stream",
                type: "checkbox",
                label: "流式逐字渲染",
                checked: stream,
                onCheckedChange: setStream,
              },
              { key: "sep-1", type: "separator" },
              { key: "hdr-route", type: "label", label: "默认路由策略" },
              {
                key: "r-auto",
                type: "radio",
                label: "Auto 智能路由",
                checked: route === "auto",
                onSelect: () => setRoute("auto"),
              },
              {
                key: "r-sonnet",
                type: "radio",
                label: "Sonnet 5.5 均衡",
                checked: route === "sonnet",
                onSelect: () => setRoute("sonnet"),
              },
              {
                key: "r-opus",
                type: "radio",
                label: "Opus 5.5 深度推理",
                checked: route === "opus",
                onSelect: () => setRoute("opus"),
              },
              { key: "sep-2", type: "separator" },
              {
                key: "export",
                label: "导出会话记录",
                icon: "download",
                children: [
                  { key: "exp-md", label: "Markdown (.md)", kbd: "⌘E" },
                  { key: "exp-json", label: "结构化 JSON (.json)" },
                ],
              },
            ]}
          >
            <AfButton variant="secondary" trailingIcon="chevronDown">
              会话显示选项
            </AfButton>
          </AfMenu>
        </Row>
      </Panel>
    </div>
  );
}

/** 命令式确认调用子演示。 */
function ImperativeConfirmTrigger() {
  const confirm = useAfConfirm();
  const [lastResult, setLastResult] = useState<string>("尚未操作");
  return (
    <div className="af-demo-row">
      <span style={{ fontSize: 12, color: "var(--af-muted)" }}>{lastResult}</span>
      <AfButton
        variant="secondary"
        onClick={async () => {
          const ok = await confirm({
            title: "轮换生产环境 API 密钥？",
            description: "旧密钥将在 5 分钟宽限期后失效，所有未更新的工作节点需重新拉取配置。",
            confirmText: "立即轮换",
            cancelText: "暂不轮换",
            tone: "danger",
          });
          setLastResult(ok ? "已确认轮换" : "已安全取消");
        }}
      >
        命令式 confirm()
      </AfButton>
    </div>
  );
}

/** AlertDialog 预览：高危二次确认、初始安全焦点与命令式调用。 */
function AlertDialogSpecimen() {
  const [open, setOpen] = useState(false);
  return (
    <AfConfirmProvider>
      <div className="af-base-demo">
        <Panel title="高风险操作二次确认" desc="role=alertdialog 严格阻断误触遮罩关闭，并将初始焦点置于安全的「取消」按钮上。" wide>
          <Row label="清空向量知识库" hint="支持异步 Promise 自动展示按钮加载防重态">
            <AfButton variant="destructive" icon="trash" onClick={() => setOpen(true)}>
              清空索引库
            </AfButton>
          </Row>
          <Row label="命令式调用" hint="useAfConfirm() 返回 Promise<boolean>，无需手写受控 state">
            <ImperativeConfirmTrigger />
          </Row>
          <AfAlertDialog
            open={open}
            onClose={() => setOpen(false)}
            title="确认清空本地向量知识库？"
            description="该操作将永久移除 1,480 篇已索引文档分片，清理期间无法发起本地检索，且不可撤销。"
            confirmText="确认清空"
            cancelText="保留数据"
            onConfirm={() => new Promise((resolve) => setTimeout(resolve, 450))}
          />
        </Panel>
      </div>
    </AfConfirmProvider>
  );
}

/** Accordion 预览：多项展开、全部展开/收起同步与互斥模式。 */
function AccordionSpecimen() {
  return (
    <div className="af-base-demo">
      <Panel title="手风琴折叠面板" desc="基于原生 <details> 与 ::details-content 尺寸过渡构建；箭头紧邻标题左侧，支持全部展开同步。" wide>
        <AfAccordion
          showToggleAll
          defaultValue={["sandbox"]}
          items={[
            {
              key: "sandbox",
              title: "本地沙盒执行策略",
              subtitle: "文件系统隔离与网络白名单",
              extra: (
                <AfTag size="sm" tone="success">
                  已启用
                </AfTag>
              ),
              content: "所有代理脚本默认在只读工作区副本内运行，写入项目目录或访问外部域名需通过权限审批卡放行。",
            },
            {
              key: "cache",
              title: "Prompt 前缀缓存生命周期",
              subtitle: "降低长上下文重复计费",
              extra: <AfTag size="sm">5 分钟 TTL</AfTag>,
              content: "连续追问会自动复用系统指令与工具定义前缀，命中时输入单价下降最高 90%，冷启动后自动重建。",
            },
            {
              key: "audit",
              title: "企业合规与脱敏日志",
              subtitle: "API 密钥与个人隐私自动掩码",
              content: "上传至评测面板前，本机拦截器会自动将 sk-* 令牌、邮箱与手机号替换为不可逆占位符。",
            },
          ]}
        />
      </Panel>
    </div>
  );
}

type ModelQuotaRow = {
  id: string;
  model: string;
  tier: string;
  calls: number;
  latencyMs: number;
  status: "running" | "warning" | "idle";
};

const TABLE_DEMO_DATA: ModelQuotaRow[] = [
  { id: "m-sonnet", model: "Claude Sonnet 5.5", tier: "日常主力", calls: 12840, latencyMs: 620, status: "running" },
  { id: "m-opus", model: "Claude Opus 5.5", tier: "深度推理", calls: 2410, latencyMs: 1480, status: "warning" },
  { id: "m-haiku", model: "Claude Haiku 5.5", tier: "实时补全", calls: 46920, latencyMs: 210, status: "running" },
  { id: "m-embed", model: "Aster Embed v3", tier: "本地向量", calls: 89300, latencyMs: 38, status: "idle" },
];

const TABLE_DEMO_COLUMNS: AfTableColumn<ModelQuotaRow>[] = [
  {
    key: "model",
    title: "模型名称",
    dataIndex: "model",
    sortable: true,
    render: (_, row) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <strong style={{ fontWeight: 500, color: "var(--af-strong)" }}>{row.model}</strong>
        <span style={{ fontSize: 11, color: "var(--af-muted)" }}>{row.tier}</span>
      </div>
    ),
  },
  {
    key: "status",
    title: "运行状态",
    dataIndex: "status",
    render: (_, row) =>
      row.status === "running" ? (
        <AfStatus tone="success" pulse>
          正常服务
        </AfStatus>
      ) : row.status === "warning" ? (
        <AfStatus tone="warning">高负载</AfStatus>
      ) : (
        <AfStatus tone="neutral">待命</AfStatus>
      ),
  },
  {
    key: "calls",
    title: "今日调用",
    dataIndex: "calls",
    align: "right",
    sortable: true,
    sortType: "number",
    render: (_, row) => row.calls.toLocaleString("en-US"),
  },
  {
    key: "latencyMs",
    title: "P95 延迟",
    dataIndex: "latencyMs",
    align: "right",
    sortable: true,
    sortType: "number",
    render: (_, row) => `${row.latencyMs} ms`,
  },
];

/** Table 预览：语义化表头按钮排序、数值对齐、全选/半选与分页联动。 */
function TableSpecimen() {
  const [selected, setSelected] = useState<string[]>(["m-sonnet"]);
  const [page, setPage] = useState(1);
  return (
    <div className="af-base-demo">
      <Panel title="结构化数据表格" desc="原生 <th scope=col> 内嵌排序按钮，仅激活列挂载 aria-sort，支持自然文本/数值排序与多选。" wide>
        <AfTable
          caption="模型路由实时监控"
          captionHidden
          columns={TABLE_DEMO_COLUMNS}
          data={TABLE_DEMO_DATA}
          rowKey="id"
          selectable
          selectedKeys={selected}
          onSelectedKeysChange={(keys) => setSelected(keys)}
          defaultSortBy={{ key: "calls", direction: "descending" }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--af-muted)" }}>已选 {selected.length} 个模型节点</span>
          <AfPagination page={page} onChange={setPage} total={24} pageSize={4} showTotal />
        </div>
      </Panel>
    </div>
  );
}

const PAGINATION_TASKS = [
  { task: "Summarise Q3 support tickets", agent: "Research bot", duration: "18s" },
  { task: "Translate the onboarding emails", agent: "Ops helper", duration: "55s" },
  { task: "Tag new tickets by product area", agent: "Release notes", duration: "1m 32s" },
  { task: "Clean up stale feature flags", agent: "Support triage", duration: "2m 09s" },
  { task: "Review the pricing page copy", agent: "Research bot", duration: "2m 46s" },
  { task: "Triage failing nightly evals", agent: "Ops helper", duration: "3m 23s" },
  { task: "Check invoices against contracts", agent: "Release notes", duration: "4m 00s" },
  { task: "Weekly competitor digest", agent: "Support triage", duration: "4m 37s" },
];

/** Pagination 独立舞台：恒定槽位页码表、每页行数保位切换与实时条目区间摘要。 */
function PaginationSpecimen() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const total = 1284;
  const startRow = (page - 1) * pageSize + 1;
  const previewRows = [0, 1, 2, 3, 4, 5]
    .map((offset) => {
      const idx = startRow + offset;
      if (idx > total) return null;
      const tpl = PAGINATION_TASKS[(idx - 1) % PAGINATION_TASKS.length]!;
      return {
        id: `#${4822 - idx}`,
        task: tpl.task,
        agent: tpl.agent,
        duration: tpl.duration,
      };
    })
    .filter(Boolean) as Array<{ id: string; task: string; agent: string; duration: string }>;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 620,
        margin: "0 auto",
        borderRadius: "var(--af-r-card)",
        background: "var(--af-surface)",
        boxShadow: "var(--af-shadow-card)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          padding: "10px 16px",
          boxShadow: "var(--af-divider-hairline)",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: "var(--af-muted)" }}>RUNS</span>
        <span style={{ fontSize: 12, color: "var(--af-faint)", fontVariantNumeric: "tabular-nums" }}>
          {total.toLocaleString("en-US")}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "4px 0" }}>
        {previewRows.map((row) => (
          <div
            key={row.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "8px 16px",
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: "var(--af-mono)",
                  fontSize: 12,
                  color: "var(--af-muted)",
                  fontVariantNumeric: "tabular-nums",
                  flex: "none",
                }}
              >
                {row.id}
              </span>
              <span
                style={{
                  color: "var(--af-strong)",
                  fontWeight: 480,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.task}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flex: "none" }}>
              <span style={{ fontSize: 12, color: "var(--af-muted)" }}>{row.agent}</span>
              <span style={{ fontSize: 12, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums", minWidth: 44, textAlign: "right" }}>
                {row.duration}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          padding: "10px 16px",
          background: "var(--af-surface)",
          boxShadow: "var(--af-divider-hairline-top)",
        }}
      >
        <AfPagination
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizes={[10, 25, 50, 100]}
          total={total}
        />
      </div>
    </div>
  );
}

const ACME_WORKSPACE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" focusable="false">
    <path d="M13.6903 19.4567C13.5 18.9973 13.5 18.4149 13.5 17.25C13.5 16.0851 13.5 15.5027 13.6903 15.0433C13.944 14.4307 14.4307 13.944 15.0433 13.6903C15.5027 13.5 16.0851 13.5 17.25 13.5C18.4149 13.5 18.9973 13.5 19.4567 13.6903C20.0693 13.944 20.556 14.4307 20.8097 15.0433C21 15.5027 21 16.0851 21 17.25C21 18.4149 21 18.9973 20.8097 19.4567C20.556 20.0693 20.0693 20.556 19.4567 20.8097C18.9973 21 18.4149 21 17.25 21C16.0851 21 15.5027 21 15.0433 20.8097C14.4307 20.556 13.944 20.0693 13.6903 19.4567Z" stroke="currentColor" strokeLinecap="square" strokeLinejoin="round" strokeWidth="1.5" />
    <path d="M13.6903 8.95671C13.5 8.49728 13.5 7.91485 13.5 6.75C13.5 5.58515 13.5 5.00272 13.6903 4.54329C13.944 3.93072 14.4307 3.44404 15.0433 3.1903C15.5027 3 16.0851 3 17.25 3C18.4149 3 18.9973 3 19.4567 3.1903C20.0693 3.44404 20.556 3.93072 20.8097 4.54329C21 5.00272 21 5.58515 21 6.75C21 7.91485 21 8.49728 20.8097 8.95671C20.556 9.56928 20.0693 10.056 19.4567 10.3097C18.9973 10.5 18.4149 10.5 17.25 10.5C16.0851 10.5 15.5027 10.5 15.0433 10.3097C14.4307 10.056 13.944 9.56928 13.6903 8.95671Z" stroke="currentColor" strokeLinecap="square" strokeLinejoin="round" strokeWidth="1.5" />
    <path d="M3.1903 19.4567C3 18.9973 3 18.4149 3 17.25C3 16.0851 3 15.5027 3.1903 15.0433C3.44404 14.4307 3.93072 13.944 4.54329 13.6903C5.00272 13.5 5.58515 13.5 6.75 13.5C7.91485 13.5 8.49728 13.5 8.95671 13.6903C9.56928 13.944 10.056 14.4307 10.3097 15.0433C10.5 15.5027 10.5 16.0851 10.5 17.25C10.5 18.4149 10.5 18.9973 10.3097 19.4567C10.056 20.0693 9.56928 20.556 8.95671 20.8097C8.49728 21 7.91485 21 6.75 21C5.58515 21 5.00272 21 4.54329 20.8097C3.93072 20.556 3.44404 20.0693 3.1903 19.4567Z" stroke="currentColor" strokeLinecap="square" strokeLinejoin="round" strokeWidth="1.5" />
    <path d="M3.1903 8.95671C3 8.49728 3 7.91485 3 6.75C3 5.58515 3 5.00272 3.1903 4.54329C3.44404 3.93072 3.93072 3.44404 4.54329 3.1903C5.00272 3 5.58515 3 6.75 3C7.91485 3 8.49728 3 8.95671 3.1903C9.56928 3.44404 10.056 3.93072 10.3097 4.54329C10.5 5.00272 10.5 5.58515 10.5 6.75C10.5 7.91485 10.5 8.49728 10.3097 8.95671C10.056 9.56928 9.56928 10.056 8.95671 10.3097C8.49728 10.5 7.91485 10.5 6.75 10.5C5.58515 10.5 5.00272 10.5 4.54329 10.3097C3.93072 10.056 3.44404 9.56928 3.1903 8.95671Z" stroke="currentColor" strokeLinecap="square" strokeLinejoin="round" strokeWidth="1.5" />
  </svg>
);

const FULL_CRUMB_TRAIL: Array<{
  id: string;
  label: string;
  icon?: ReactNode;
  meta: string;
  rows?: Array<{ name: string; meta: string; nextDepth: number }>;
}> = [
  {
    id: "acme",
    label: "Acme",
    icon: ACME_WORKSPACE_ICON,
    meta: "Workspace · 24 members · 3 agents",
    rows: [
      { name: "Agents", meta: "3 agents", nextDepth: 2 },
      { name: "Knowledge base", meta: "2 files", nextDepth: 2 },
    ],
  },
  {
    id: "agents",
    label: "Agents",
    meta: "3 active agents",
    rows: [
      { name: "Research bot", meta: "Automated workflow · claude-sonnet-4", nextDepth: 3 },
      { name: "Triage agent", meta: "142 tickets", nextDepth: 3 },
      { name: "Release notes", meta: "Weekly", nextDepth: 3 },
    ],
  },
  {
    id: "research-bot",
    label: "Research bot",
    meta: "Automated workflow · claude-sonnet-4",
    rows: [
      { name: "Runs", meta: "1,284 runs", nextDepth: 4 },
      { name: "Prompts", meta: "3 files", nextDepth: 4 },
    ],
  },
  {
    id: "runs",
    label: "Runs",
    meta: "1,284 runs · 98.4% success rate",
    rows: [
      {
        name: "Run #4821 · Summarise Q3 support tickets and draft a fix plan for the export timeout",
        meta: "4 min ago",
        nextDepth: 5,
      },
      { name: "Run #4820 · Weekly competitor digest", meta: "2h ago", nextDepth: 5 },
    ],
  },
  {
    id: "run-4821",
    label: "Run #4821 · Summarise Q3 support tickets and draft a fix plan for the export timeout",
    meta: "Finished 4 min ago · 23 tool calls",
  },
];

/** Breadcrumb 独立舞台：默认斜杠分隔、超出自动收拢阶梯菜单与钻取滑入动画。 */
function BreadcrumbSpecimen() {
  const [depth, setDepth] = useState(5);
  const activeTrail = FULL_CRUMB_TRAIL.slice(0, depth).map((entry, idx, arr) => ({
    id: entry.id,
    label: entry.label,
    icon: entry.icon,
    onClick: idx < arr.length - 1 ? () => setDepth(idx + 1) : undefined,
  }));
  const current = FULL_CRUMB_TRAIL[depth - 1] ?? FULL_CRUMB_TRAIL[0]!;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 460,
        margin: "0 auto",
        borderRadius: "var(--af-r-card)",
        background: "var(--af-surface)",
        boxShadow: "var(--af-shadow-card)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          minHeight: 48,
          padding: "0 16px",
          boxShadow: "var(--af-divider-hairline)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <AfBreadcrumb items={activeTrail} maxItems={4} />
        </div>
      </div>

      {current.rows ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 136, padding: 6 }}>
          {current.rows.map((r) => (
            <button
              key={r.name}
              type="button"
              onClick={() => setDepth(r.nextDepth)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                height: 40,
                padding: "0 10px",
                border: 0,
                borderRadius: "var(--af-r-md)",
                background: "transparent",
                color: "var(--af-strong)",
                font: "inherit",
                fontSize: 13,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <AfIcon name="folder" size={15} style={{ color: "var(--af-muted)", flex: "none" }} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.name}
              </span>
              <span style={{ fontSize: 12, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums", flex: "none" }}>
                {r.meta}
              </span>
              <AfIcon name="chevronRight" size={14} style={{ color: "var(--af-faint)", flex: "none" }} />
            </button>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            minHeight: 136,
            padding: 16,
          }}
        >
          <span style={{ display: "inline-flex", marginTop: 2, color: "var(--af-muted)", flex: "none" }} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M15.9453 12.3948C15.7686 13.0215 14.9333 13.4644 13.2629 14.3502C11.648 15.2064 10.8406 15.6346 10.1899 15.4625C9.9209 15.3913 9.6758 15.2562 9.47812 15.0701C9 14.6198 9 13.7465 9 12C9 10.2535 9 9.38018 9.47812 8.92995C9.6758 8.74381 9.9209 8.60868 10.1899 8.53753C10.8406 8.36544 11.648 8.79357 13.2629 9.64983C14.9333 10.5356 15.7686 10.9785 15.9453 11.6052C16.0182 11.8639 16.0182 12.1361 15.9453 12.3948Z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 400, color: "var(--af-strong)", lineHeight: "20px" }}>
              {current.label}
            </span>
            <span style={{ fontSize: 12, color: "var(--af-muted)", lineHeight: "16px" }}>{current.meta}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Pagination 与 Breadcrumb 组合兼容别名。 */
function PaginationBreadcrumbSpecimen() {
  return <PaginationSpecimen />;
}

/** ScrollArea 独立舞台：悬浮胶囊极细滚动条与连续比例软边缘渐隐。 */
function ScrollAreaSpecimen() {
  const sources = [
    { title: "Pricing changes for usage-based plans in 2026", site: "stripe.com", read: "4 min" },
    { title: "How teams budget for LLM inference", site: "a16z.com", read: "9 min" },
    { title: "Token pricing across providers, compared", site: "artificialanalysis.ai", read: "6 min" },
    { title: "Seat-based vs. usage-based: what customers prefer", site: "openviewpartners.com", read: "7 min" },
    { title: "Q3 billing export", site: "Internal · billing-q3.csv", read: "2 min" },
    { title: "Churn after a price change – a case study", site: "profitwell.com", read: "5 min" },
    { title: "Credit packs and prepaid usage", site: "orb.com", read: "3 min" },
    { title: "Designing a pricing page for AI products", site: "growth.design", read: "8 min" },
    { title: "Customer interviews, September", site: "Internal · notes.md", read: "11 min" },
    { title: "The cost of a long context window", site: "anthropic.com", read: "6 min" },
    { title: "Overage fees and how users feel about them", site: "nngroup.com", read: "5 min" },
    { title: "Annual plan discounts that work", site: "priceintelligently.com", read: "4 min" },
  ];
  const files = [
    "billing-q3.csv",
    "pricing-draft.pdf",
    "interviews.txt",
    "plans-table.png",
    "usage_model.py",
    "cohort-retention.sql",
    "q3-notes.md",
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 380,
        margin: "0 auto",
        borderRadius: "var(--af-r-card)",
        background: "var(--af-surface)",
        boxShadow: "var(--af-shadow-card)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
          padding: "11px 16px",
          boxShadow: "var(--af-divider-hairline)",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: "var(--af-muted)" }}>SOURCES</span>
        <span style={{ fontSize: 12, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums" }}>
          {sources.length} read
        </span>
      </div>
      <AfScrollArea height={232} style={{ padding: "2px 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {sources.map((entry) => {
            const isInternal = entry.site.startsWith("Internal");
            return (
              <div
                key={entry.title}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "6px 0",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
                  <span style={{ display: "inline-flex", marginTop: 1.5, color: "var(--af-muted)", flex: "none" }} aria-hidden="true">
                    {isInternal ? (
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M4.5 2.25h4.6L12.5 5.65v7.6a1.25 1.25 0 0 1-1.25 1.25h-6.75a1.25 1.25 0 0 1-1.25-1.25V3.5a1.25 1.25 0 0 1 1.25-1.25Z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                        />
                        <path d="M9 2.4V5.75h3.35" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
                        <ellipse cx="8" cy="8" rx="2.6" ry="6" stroke="currentColor" strokeWidth="1.15" />
                        <path d="M2.2 8h11.6" stroke="currentColor" strokeWidth="1.15" />
                      </svg>
                    )}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--af-strong)",
                        lineHeight: "18px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.title}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--af-muted)", lineHeight: "16px" }}>{entry.site}</span>
                  </div>
                </div>
                <span style={{ fontSize: 11.5, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums", flex: "none" }}>
                  {entry.read}
                </span>
              </div>
            );
          })}
        </div>
      </AfScrollArea>
      <div
        style={{
          padding: "10px 14px",
          background: "var(--af-surface)",
          boxShadow: "var(--af-divider-hairline-top)",
        }}
      >
        <AfScrollArea orientation="horizontal">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, paddingBottom: 2 }}>
            {files.map((file) => {
              const ext = (file.split(".").pop() ?? "FILE").toUpperCase().slice(0, 3);
              return (
                <span
                  key={file}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 30,
                    padding: "0 10px",
                    borderRadius: "var(--af-r-md)",
                    background: "var(--af-surface)",
                    boxShadow: "var(--af-shadow-hairline)",
                    fontSize: 12,
                    color: "var(--af-strong)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ display: "inline-flex", color: "var(--af-muted)", flex: "none" }} aria-hidden="true">
                    <svg width="13" height="14" viewBox="0 0 14 15" fill="none">
                      <path
                        d="M3 1.25h5.2L11.5 4.55v8.2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2.25a1 1 0 0 1 1-1Z"
                        stroke="currentColor"
                        strokeWidth="1.15"
                        strokeLinejoin="round"
                      />
                      <path d="M8.1 1.4V4.6h3.2" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
                      <text x="7" y="11.2" textAnchor="middle" fontSize="3.6" fontWeight="700" fill="currentColor">
                        {ext}
                      </text>
                    </svg>
                  </span>
                  <span>{file}</span>
                </span>
              );
            })}
          </div>
        </AfScrollArea>
      </div>
    </div>
  );
}

/** Resizable 独立舞台：可折叠侧栏吸附、双击复位、Enter 切换与垂直嵌套分栏。 */
function ResizableSpecimen() {
  const runs = [
    { title: "Summarize churn interviews", meta: "Running · 1m 12s", status: "running" as const, active: true },
    { title: "Draft Q3 pricing memo", meta: "Done · 3m 40s", status: "done" as const, active: false },
    { title: "Tag 214 support tickets", meta: "Done · 58s", status: "done" as const, active: false },
    { title: "Sync invoices to billing-api", meta: "Failed · 12s", status: "failed" as const, active: false },
    { title: "Weekly usage report", meta: "Done · 4m 05s", status: "done" as const, active: false },
  ];
  const logs = [
    { time: "14:02:07", msg: "Read 18 interview notes from /research/churn" },
    { time: "14:02:19", msg: "Grouped quotes into 5 themes" },
    { time: "14:02:44", msg: "Asked billing-api for plan changes in Q3" },
    { time: "14:03:01", msg: "Writing the summary …" },
  ];
  return (
    <div style={{ width: "100%", maxWidth: 640, margin: "0 auto" }}>
      <AfResizablePanelGroup
        direction="horizontal"
        style={{
          height: 280,
          borderRadius: "var(--af-r-card)",
          boxShadow: "var(--af-shadow-card)",
          background: "var(--af-surface)",
        }}
      >
        <AfResizablePanel defaultSize={34} minSize={22} maxSize={48} collapsible>
          <div style={{ padding: "11px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: "var(--af-muted)" }}>RUNS</span>
              <span style={{ fontSize: 11.5, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums" }}>5</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {runs.map((r) => (
                <div
                  key={r.title}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "4px 7px",
                    borderRadius: "var(--af-r-sm)",
                    background: r.active ? "var(--af-selected)" : "transparent",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 14,
                      height: 17,
                      flex: "none",
                    }}
                  >
                    {r.status === "running" ? (
                      <AfSpinner size={12} tone="accent" label="Running" />
                    ) : r.status === "failed" ? (
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          boxShadow: "inset 0 0 0 1.4px var(--af-danger)",
                        }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: "var(--af-faint)",
                        }}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 12.5,
                        lineHeight: "17px",
                        fontWeight: r.active ? 500 : 400,
                        color: "var(--af-strong)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.title}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        lineHeight: "15px",
                        color: "var(--af-muted)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {r.meta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AfResizablePanel>
        <AfResizableHandle withHandle label="Resize runs sidebar" />
        <AfResizablePanel defaultSize={66} minSize={40}>
          <AfResizablePanelGroup direction="vertical">
            <AfResizablePanel defaultSize={58} minSize={30}>
              <div style={{ padding: "11px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: "var(--af-muted)" }}>
                  OUTPUT
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--af-strong)" }}>
                  Summarize churn interviews
                </span>
                <span style={{ fontSize: 12.5, color: "var(--af-text)", lineHeight: "18.5px" }}>
                  Most customers who left in Q3 did so within two weeks of a price change. Five themes came up again and
                  again: surprise overage fees, unclear credit packs, missing annual discounts, slow support replies and
                  seats they no longer used.
                </span>
              </div>
            </AfResizablePanel>
            <AfResizableHandle label="Resize run log" />
            <AfResizablePanel defaultSize={42} minSize={24}>
              <div
                style={{
                  height: "100%",
                  padding: "9px 16px",
                  background: "var(--af-surface-sunken)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", color: "var(--af-muted)" }}>
                  LOG
                </span>
                {logs.map((l) => (
                  <div
                    key={l.time}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                      fontFamily: "var(--af-mono)",
                      fontSize: 11.5,
                      lineHeight: "17px",
                    }}
                  >
                    <span style={{ color: "var(--af-faint)", fontVariantNumeric: "tabular-nums", flex: "none" }}>
                      {l.time}
                    </span>
                    <span style={{ color: "var(--af-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.msg}
                    </span>
                  </div>
                ))}
              </div>
            </AfResizablePanel>
          </AfResizablePanelGroup>
        </AfResizablePanel>
      </AfResizablePanelGroup>
    </div>
  );
}

function FormSpecimen() {
  const form = useAfForm<{ host: string; token: string; region: string }>({
    host: "api.aster.local",
    token: "",
    region: "cn-east",
  });
  const [submitted, setSubmitted] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel
        title="AfForm 受控表单"
        desc="支持失焦校验、输入纠错即时消错、提交焦点自动跳转首位错误项。"
      >
        <AfForm
          form={form}
          onFinish={(vals) => {
            setSubmitted(`提交成功：${vals.host} / ${vals.region}`);
            afMessage.success("配置已验证并保存");
          }}
          onFinishFailed={({ errorFields }) => {
            setSubmitted(`存在 ${errorFields.length} 项校验未通过，已定位到首个错误字段`);
          }}
        >
          <AfFormItem
            name="host"
            label="网关主机"
            hint="输入合法域名或 IP；编辑中不提前报错，失焦后再校验"
            rules={[
              { required: true, message: "请输入网关主机地址" },
              { min: 4, message: "主机名至少 4 个字符" },
              {
                validator: async (val) => {
                  const s = String(val ?? "");
                  if (s.includes(" ")) return "主机地址不能包含空格";
                },
              },
            ]}
          >
            <AfInput placeholder="例如：api.aster.local" allowClear />
          </AfFormItem>
          <AfFormItem
            name="token"
            label="访问密钥"
            rules={[
              { required: true, message: "访问密钥不能为空" },
              { min: 6, message: "密钥长度至少 6 位" },
            ]}
          >
            <AfInput.Password placeholder="输入至少 6 位密钥…" />
          </AfFormItem>
          <AfFormItem
            name="region"
            label="调度区域"
            rules={[{ required: true, message: "请选择调度区域" }]}
          >
            <AfSelect
              allowClear
              placeholder="请选择区域…"
              options={[
                { value: "cn-east", label: "华东 · 上海一区" },
                { value: "cn-north", label: "华北 · 北京三区" },
                { value: "ap-sgp", label: "亚太 · 新加坡" },
              ]}
            />
          </AfFormItem>
          <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 4 }}>
            <AfButton type="submit" variant="primary" size="sm">
              校验并提交
            </AfButton>
            <AfButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                form.resetFields();
                setSubmitted(null);
              }}
            >
              重置表单
            </AfButton>
          </div>
        </AfForm>
        {submitted ? (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--af-muted)" }}>{submitted}</div>
        ) : null}
      </Panel>
    </div>
  );
}

function TimelineSpecimen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel title="AfTimeline 任务执行轨" desc="垂直发丝连接线、语义状态圆点与等宽时间戳。">
        <AfTimeline
          pending="正在执行视觉基线比对…"
          items={[
            {
              key: "t1",
              title: "解析设计与组件依赖",
              description: "识别 14 项基础控件缺口与 Electron 窗口交互契约",
              time: "09:12:04",
              tone: "success",
            },
            {
              key: "t2",
              title: "统一 affectUI 样式体系",
              description: "清除 Grid 栅格与斑马纹，统一 keyboard 焦点模态",
              time: "09:24:18",
              tone: "accent",
            },
            {
              key: "t3",
              title: "密钥存储警告回退检查",
              description: "降级模式切换至本地内存缓存",
              time: "09:31:50",
              tone: "warning",
            },
            {
              key: "t4",
              title: "准备写入发布清单",
              description: "等待最终构建校验通过",
              time: "09:35:00",
              tone: "neutral",
            },
          ]}
        />
      </Panel>
    </div>
  );
}

const SAMPLE_SVG_A_LIGHT =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#eef3fb"/><rect x="28" y="30" width="120" height="140" rx="12" fill="#0060e2" fill-opacity="0.16" stroke="#0060e2" stroke-width="2"/><rect x="168" y="30" width="124" height="62" rx="10" fill="#ffffff" stroke="#cbd5e1"/><rect x="168" y="108" width="124" height="62" rx="10" fill="#ffffff" stroke="#cbd5e1"/></svg>',
  );
const SAMPLE_SVG_A_DARK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#1b1f27"/><rect x="28" y="30" width="120" height="140" rx="12" fill="#4d8dff" fill-opacity="0.2" stroke="#4d8dff" stroke-width="2"/><rect x="168" y="30" width="124" height="62" rx="10" fill="#252b36" stroke="#384152"/><rect x="168" y="108" width="124" height="62" rx="10" fill="#252b36" stroke="#384152"/></svg>',
  );
const SAMPLE_SVG_B_LIGHT =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#f3f5f8"/><circle cx="160" cy="100" r="56" fill="#0d8a53" fill-opacity="0.18" stroke="#0d8a53" stroke-width="2"/><path d="M138 100l15 15 32-34" fill="none" stroke="#0d8a53" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  );
const SAMPLE_SVG_B_DARK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#1b2126"/><circle cx="160" cy="100" r="56" fill="#34d399" fill-opacity="0.18" stroke="#34d399" stroke-width="2"/><path d="M138 100l15 15 32-34" fill="none" stroke="#34d399" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  );

function ImagePreviewSpecimen() {
  const [darkTheme, setDarkTheme] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => {
      const root = document.documentElement;
      const afHost = document.querySelector(".af[data-theme]");
      const isDark =
        root.classList.contains("dark") ||
        root.getAttribute("data-theme") === "dark" ||
        afHost?.getAttribute("data-theme") === "dark";
      setDarkTheme(Boolean(isDark));
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["class", "data-theme"] });
    return () => obs.disconnect();
  }, []);

  const srcA = darkTheme ? SAMPLE_SVG_A_DARK : SAMPLE_SVG_A_LIGHT;
  const srcB = darkTheme ? SAMPLE_SVG_B_DARK : SAMPLE_SVG_B_LIGHT;
  const gallery = [
    { src: srcA, alt: "工作台界面线框示意图" },
    { src: srcB, alt: "校验通过状态示意图" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel title="AfImage 与灯箱预览" desc="点击缩略图开启多图轮播灯箱（缩放、旋转、镜像、2D 拖拽），断图自动展示 Clean 回退。">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          <AfImage
            src={srcA}
            alt="工作台界面线框"
            width={156}
            height={100}
            previewImages={gallery}
          />
          <AfImage
            src={srcB}
            alt="状态校验完成"
            width={156}
            height={100}
            previewImages={gallery}
          />
          <AfImage
            src="data:image/gif;base64,"
            alt="失效图回退演示"
            width={156}
            height={100}
            preview={false}
          />
        </div>
      </Panel>
    </div>
  );
}

function TypographySpecimen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel title="AfTypography & AfSurface" desc="标准化标题阶梯、语义行内字色、数值等宽与多层级表面容器。">
        <AfTypography style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AfTitle level={3}>工作区与组件排印规范</AfTitle>
          <AfParagraph tone="secondary">
            affectUI Clean 拒绝过度拟态起伏，依靠浅底与卡片表面的温和层次区分信息重心；当遇到{" "}
            <AfText code>tabular-nums</AfText> 与金额指标如{" "}
            <AfText strong numeric>
              ¥ 1,284.50
            </AfText>{" "}
            时，数字在连续刷新过程中始终严格对齐。
          </AfParagraph>
          <AfParagraph ellipsis={{ rows: 2 }} tone="muted">
            这是一个启用两行省略控制的正文段落示例：所有卡片文本都保持舒适的行距与可读对比度，避免长篇说明挤占主要操作区域，同时保持界面整体轻盈克制、冷静而精准的工程氛围。
          </AfParagraph>
        </AfTypography>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
          <AfSurface level="sunken" padding={12} style={{ flex: "1 1 150px" }}>
            <AfText strong>sunken 下沉槽</AfText>
            <div style={{ fontSize: 12, color: "var(--af-muted)", marginTop: 4 }}>用于内嵌摘要与参数区</div>
          </AfSurface>
          <AfSurface level="surface" padding={12} style={{ flex: "1 1 150px" }}>
            <AfText strong>surface 标准面</AfText>
            <div style={{ fontSize: 12, color: "var(--af-muted)", marginTop: 4 }}>标准卡片与设置面板</div>
          </AfSurface>
          <AfSurface level="raised" padding={12} style={{ flex: "1 1 150px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <AfText strong>raised 浮起面</AfText>
              <div style={{ fontSize: 12, color: "var(--af-muted)", marginTop: 4 }}>附带 AfIconButton</div>
            </div>
            <AfIconButton icon="settings" label="表面设置" size="sm" variant="ghost" />
          </AfSurface>
        </div>
      </Panel>
    </div>
  );
}

function SplitterSpecimen() {
  const [sidebarWidth, setSidebarWidth] = useState(210);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel title="AfSplitter 像素受控分栏" desc="支持固定像素主栏、最小/最大约束与一键折叠/展开（Flexbox 布局）。">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums" }}>
            当前侧栏宽度：{collapsed ? "0px（已折叠）" : `${sidebarWidth}px`}
          </span>
          <AfButton
            size="xs"
            variant="secondary"
            icon={collapsed ? "panelLeft" : "minus"}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "展开侧栏" : "折叠侧栏"}
          </AfButton>
        </div>
        <div
          style={{
            height: 200,
            borderRadius: "var(--af-r-md)",
            boxShadow: "var(--af-shadow-card)",
            overflow: "hidden",
            background: "var(--af-surface)",
          }}
        >
          <AfSplitter
            value={sidebarWidth}
            onChange={(px) => setSidebarWidth(px)}
            min={140}
            max={340}
            collapsed={collapsed}
          >
            <AfSplitterPanel style={{ padding: 12, background: "var(--af-surface-sunken)" }}>
              <AfText strong>固定像素首栏</AfText>
              <div style={{ fontSize: 12, color: "var(--af-muted)", marginTop: 6 }}>
                拖拽中间发丝分隔条实时调节像素宽度。
              </div>
            </AfSplitterPanel>
            <AfSplitterPanel style={{ padding: 12 }}>
              <AfText strong>自适应余宽主区</AfText>
              <div style={{ fontSize: 12, color: "var(--af-muted)", marginTop: 6 }}>
                随容器尺寸自动填满剩余宽度（flex: 1; min-width: 0）。
              </div>
            </AfSplitterPanel>
          </AfSplitter>
        </div>
      </Panel>
    </div>
  );
}

function MessageSpecimen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Panel title="afMessage 全局轻提示" desc="轻量命令式全局消息 API（info / success / warning / error / loading），自动挂载于 AsterThemeProvider 主题浮层容器。">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <AfButton size="sm" variant="secondary" onClick={() => afMessage.info("已同步最新工作区配置")}>
            Info 提示
          </AfButton>
          <AfButton size="sm" variant="secondary" onClick={() => afMessage.success("文件保存成功")}>
            Success 成功
          </AfButton>
          <AfButton size="sm" variant="secondary" onClick={() => afMessage.warning("当前并发接近配额上限")}>
            Warning 警告
          </AfButton>
          <AfButton size="sm" variant="danger" onClick={() => afMessage.error("网络连接超时，请重试")}>
            Error 错误
          </AfButton>
          <AfButton
            size="sm"
            variant="primary"
            onClick={() => {
              const key = "sync-task";
              afMessage.loading({ key, content: "正在校验远端索引…" });
              window.setTimeout(() => {
                afMessage.success({ key, content: "索引校验完成（0.6s）", duration: 2200 });
              }, 600);
            }}
          >
            Loading → Update
          </AfButton>
          <AfButton size="sm" variant="ghost" onClick={() => afMessage.destroy()}>
            清空全部
          </AfButton>
        </div>
      </Panel>
    </div>
  );
}

function HoverCardSpecimen() {
  return (
    <div className="af-base-demo">
      <Panel title="悬停信息卡（Hover Card）" desc="支持悬停意图延迟打开与快速连续过渡（不主动抢夺触发焦点），适合人名、引用与仓库预览。">
        <Row label="人名 / 仓库预览" hint="悬停或聚焦触发元素显示浮层；按 Esc 可关闭">
          <AfHoverCard
            trigger={
              <AfButton size="sm" variant="secondary" icon="users">
                @Coordinator
              </AfButton>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 240 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AfAvatar name="Coordinator" size="sm" agent="working" />
                <div>
                  <strong style={{ fontSize: 13, color: "var(--af-strong)" }}>Coordinator</strong>
                  <div style={{ fontSize: 11.5, color: "var(--af-muted)" }}>主控编排代理 · 活跃</div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "var(--af-text)", lineHeight: 1.5 }}>
                负责任务拆解、分支合并裁决与视觉回归验收。已运行 48 次任务，成功率 99.2%。
              </p>
            </div>
          </AfHoverCard>
          <AfHoverCard
            defaultOpen
            trigger={
              <AfButton size="sm" variant="ghost" icon="gitBranch">
                @fangxinyan/aster-ui@0.5.0
              </AfButton>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 220 }}>
              <strong style={{ fontSize: 12.5, color: "var(--af-strong)" }}>Aster UI（星序）v0.4.0</strong>
              <span style={{ fontSize: 12, color: "var(--af-muted)" }}>149 展示组件 · 零 CSS Grid · 全量参数化</span>
            </div>
          </AfHoverCard>
        </Row>
      </Panel>
    </div>
  );
}

function ToggleGroupSpecimen() {
  const [align, setAlign] = useState<string | null>("center");
  const [formats, setFormats] = useState<string[]>(["bold", "code"]);
  return (
    <div className="af-base-demo">
      <Panel title="工具切换组（Toggle Group）" desc="基于 [aria-pressed] 表达按下态与 Roving Tabindex 方向键导航，支持托盘单选与多选芯片。">
        <Row label="托盘单选（tray）" hint="左右方向键移动焦点，滑动指示胶囊">
          <AfToggleGroup
            label="视图排版"
            variant="tray"
            value={align}
            onChange={setAlign}
            options={[
              { value: "left", icon: "list", label: "列表" },
              { value: "center", icon: "grid", label: "卡片" },
              { value: "right", icon: "layers", label: "分栏" },
            ]}
          />
        </Row>
        <Row label="多选标记（chips）" hint="支持按空格或点击多项同时激活">
          <AfToggleGroup
            type="multiple"
            variant="chips"
            label="文本样式"
            value={formats}
            onChange={setFormats}
            options={[
              { value: "bold", label: "加粗", icon: "bolt" },
              { value: "code", label: "等宽代码", icon: "code" },
              { value: "cite", label: "引用来源", icon: "quote" },
            ]}
          />
        </Row>
      </Panel>
    </div>
  );
}

function CodeBlockSpecimen() {
  const tsSample = [
    'import { defineAgent } from "@acme/agents";',
    "",
    "export const reviewer = defineAgent({",
    '  name: "Code reviewer",',
    '  model: "claude-opus",',
    '  tools: ["github", "linear"],',
    "  // Ask before anything leaves the repo",
    '  approval: { required: true, timeout: "2h" },',
    "  maxSteps: 24,",
    "});",
  ].join("\n");

  const bashSample = ["npm install @acme/agents", "npx acme run reviewer --watch"].join("\n");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 520, margin: "0 auto" }}>
      <AfCodeBlock filename="agents/reviewer.ts" language="ts" code={tsSample} highlightLines={[8, 9]} />
      <AfCodeBlock filename="Bash" language="bash" showLineNumbers={false} code={bashSample} />
    </div>
  );
}

function MeterBarSpecimen() {
  return (
    <div className="af-base-demo">
      <Panel title="多段计量条（Meter Bar）" desc="基于 Flexbox 的多段配额与存储分布条，支持 xs/sm/md 轨道与交互式图例高亮。">
        <AfMeterBar
          size="md"
          label="Token 构成分布"
          showLegend
          segments={[
            { key: "input", label: "输入上下文", value: 128, color: "var(--af-data-1)" },
            { key: "cache", label: "缓存命中", value: 84, color: "var(--af-data-2)" },
            { key: "output", label: "推理输出", value: 42, color: "var(--af-data-3)" },
            { key: "tools", label: "工具调用", value: 18, color: "var(--af-data-rest)" },
          ]}
          formatValue={(val, pct) => `${val}k · ${pct}%`}
        />
        <Row label="紧凑多段（sm / xs）" hint="关闭图例，纯轨道呈现占比">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 260 }}>
            <AfMeterBar
              size="sm"
              label="节点负载"
              segments={[
                { key: "a", label: "主工作流", value: 5, tone: "accent" },
                { key: "b", label: "并发校验", value: 3, tone: "info" },
                { key: "c", label: "预取", value: 2, tone: "success" },
              ]}
            />
            <AfMeterBar
              size="xs"
              label="极细分布"
              segments={[
                { key: "ok", label: "成功", value: 76, tone: "success" },
                { key: "warn", label: "降级", value: 18, tone: "warning" },
                { key: "err", label: "失败", value: 6, tone: "danger" },
              ]}
            />
          </div>
        </Row>
      </Panel>
    </div>
  );
}

function DiffViewSpecimen() {
  return (
    <div className="af-base-demo">
      <Panel title="代码差异视图（Diff View）" desc="支持 Unified 纵览与 Split Flexbox 双栏对照，自带补丁解析、行diff与复制操作。" wide>
        <AfDiffView
          filename="src/auth/verify.ts"
          showModeSwitch
          copyable
          before={[
            "export function verifySession(cookie: string) {",
            "  const payload = decodeJwt(cookie);",
            "  if (!payload) return null;",
            "  return payload.sub;",
            "}",
          ].join("\n")}
          after={[
            "export function verifySession(cookie: string, now = Date.now()) {",
            "  const payload = decodeJwt(cookie);",
            "  if (!payload || payload.exp < now) return null;",
            "  auditLog.record('session.verified', payload.sub);",
            "  return payload.sub;",
            "}",
          ].join("\n")}
        />
      </Panel>
    </div>
  );
}

function StepsSpecimen() {
  const [step, setStep] = useState(1);
  return (
    <div className="af-base-demo">
      <Panel title="步骤条（Steps）" desc="Safari Flexbox 语义安全列表（role=list），支持 number / dot / bar 三变体与可点击切换。" wide>
        <AfSteps
          current={step}
          onChange={setStep}
          items={[
            { key: "connect", title: "连接仓库", description: "授权只读索引" },
            { key: "scope", title: "配置规则", description: "过滤敏感目录" },
            { key: "verify", title: "启动审查", description: "运行全量校验" },
          ]}
        />
        <Row label="紧凑条形（bar）" hint="向导顶部极简进度轨">
          <div style={{ width: 320 }}>
            <AfSteps
              variant="bar"
              current={step}
              onChange={setStep}
              items={[
                { key: "s1", title: "基本信息" },
                { key: "s2", title: "域名配置" },
                { key: "s3", title: "完成创建" },
              ]}
            />
          </div>
        </Row>
        <Row label="极简圆点（dot）" hint="适合轻量化流程引导">
          <div style={{ width: 320 }}>
            <AfSteps
              variant="dot"
              size="sm"
              current={step}
              items={[
                { key: "d1", title: "草稿" },
                { key: "d2", title: "评审" },
                { key: "d3", title: "发布" },
              ]}
            />
          </div>
        </Row>
      </Panel>
    </div>
  );
}

const TREE_SAMPLE: AfTreeNode[] = [
  {
    id: "prompts",
    label: "prompts",
    meta: "3",
    children: [
      { id: "prompts/system.md", label: "system.md", meta: "1.4 KB" },
      { id: "prompts/review.md", label: "review.md", meta: "920 B" },
      { id: "prompts/summarize.md", label: "summarize.md", meta: "640 B" },
    ],
  },
  {
    id: "runs",
    label: "runs",
    children: [
      { id: "runs/run-418", label: "run-418", meta: "Today" },
      { id: "runs/run-417", label: "run-417", meta: "Yesterday" },
      { id: "runs/run-409", label: "run-409 · archived", disabled: true },
    ],
  },
  {
    id: "memory",
    label: "memory",
    children: [{ id: "memory/facts.jsonl", label: "facts.jsonl", meta: "18 KB" }],
  },
  {
    id: "knowledge",
    label: "knowledge",
    children: [{ id: "knowledge/pricing.md", label: "pricing.md", meta: "4.2 KB" }],
  },
  {
    id: "agent.yaml",
    label: "agent.yaml",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M4 2.25h5.2L12.5 5.5v8.25a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1V3.25a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path d="M9 2.35V5.5h3.15" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
        <path
          d="M6.35 8.35 5.1 9.6l1.25 1.25M9.15 8.35l1.25 1.25-1.25 1.25"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "README.md",
    label: "README.md",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M4 2.25h5.2L12.5 5.5v8.25a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1V3.25a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path d="M9 2.35V5.5h3.15" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
        <path d="M5.4 8.4h4.7M5.4 10.7h3.3" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
      </svg>
    ),
  },
];

function TreeSpecimen() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 360,
        margin: "0 auto",
        borderRadius: "var(--af-r-card)",
        background: "var(--af-surface)",
        boxShadow: "var(--af-shadow-card)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "flex-start",
          gap: 8,
          padding: "14px 14px 6px",
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--af-strong)" }}>Workspace</span>
        <span style={{ fontSize: 12.5, color: "var(--af-muted)" }}>research-agent</span>
      </div>
      <div style={{ padding: "4px 8px 18px", minHeight: 210 }}>
        <AfTree
          items={TREE_SAMPLE}
          defaultExpanded={[]}
          selected={selected}
          onSelect={(key) => setSelected(key)}
          label="Workspace files"
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 14px",
          background: "var(--af-surface)",
          boxShadow: "var(--af-divider-hairline-top)",
          fontSize: 12,
          color: "var(--af-muted)",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ?? "Pick a file"}
        </span>
      </div>
    </div>
  );
}

function StatSpecimen() {
  return (
    <div className="af-base-demo">
      <Panel title="统计指标（Stat）" desc="全等宽数字 tabular-nums、前后缀单位、趋势涨跌胶囊与迷你走势线。" wide>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: "1 1 170px", minWidth: 0 }}>
            <AfStat
              bordered
              label="24h 总请求量"
              value="128,420"
              suffix="次"
              delta="+14.2%"
              trend="up"
              sparkline={[42, 48, 45, 58, 63, 71, 79]}
            />
          </div>
          <div style={{ flex: "1 1 170px", minWidth: 0 }}>
            <AfStat
              bordered
              label="P95 首字延迟"
              value={312}
              suffix="ms"
              delta="-18.5%"
              trend="down"
              deltaTone="success"
              sparkline={[520, 480, 440, 390, 360, 330, 312]}
            />
          </div>
          <div style={{ flex: "1 1 170px", minWidth: 0 }}>
            <AfStat
              bordered
              label="月度预算消耗"
              prefix="$"
              value="48.60"
              delta="+6.1%"
              trend="down"
              deltaTone="warning"
              hint="限额 $120.00 / 月"
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}

function DescriptionsSpecimen() {
  return (
    <div className="af-base-demo">
      <Panel title="描述列表（Descriptions）" desc="纯 Flexbox 多列键值对展示（零 CSS Grid），支持跨列、等宽数值与发丝卡片框。" wide>
        <AfDescriptions
          bordered
          columns={3}
          title="运行实例详情"
          extra={<AfTag tone="success" dot size="sm">健康</AfTag>}
          items={[
            { key: "id", label: "实例 ID", children: "run-0482-cn", mono: true },
            { key: "model", label: "默认模型", children: "claude-sonnet-4" },
            { key: "region", label: "区域节点", children: "ap-east-1" },
            { key: "tokens", label: "累计消耗", children: "1,248,900 tok", mono: true },
            { key: "summary", label: "最近任务", children: "全量组件契约校准与视觉回归验证", span: 2 },
          ]}
        />
      </Panel>
    </div>
  );
}

function ChipInputSpecimen() {
  const [invitees, setInvitees] = useState(["maya@acme.com", "jonas@acme.com"]);
  const [labels, setLabels] = useState(["Onboarding", "Q4 launch"]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        width: "100%",
        maxWidth: 400,
        margin: "0 auto",
        padding: "20px",
        borderRadius: "var(--af-r-card)",
        background: "var(--af-surface)",
        boxShadow: "var(--af-shadow-card)",
      }}
    >
      <AfChipInput
        label="Invite people"
        avatar
        splitOnSpace
        max={10}
        value={invitees}
        onChange={setInvitees}
        placeholder="Add more…"
        normalize={(t) => t.toLowerCase()}
        validate={(t) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? true : `“${t}” doesn’t look like an email address.`
        }
        hint="Paste a whole list – commas, spaces or new lines."
      />
      <AfChipInput
        label="Labels"
        optional
        value={labels}
        onChange={setLabels}
        placeholder="Add more…"
        hint="Press Enter or a comma after each one."
      />
    </div>
  );
}

function ProgressRingSpecimen() {
  const [done, setDone] = useState(3);
  return (
    <div className="af-base-demo">
      <Panel title="环形进度（Progress Ring）" desc="晋升至 @fangxinyan/aster-ui/core：支持分段计数与连续百分比双模式；中心数字 aria-hidden 防重复读屏。">
        <Row label="分段进度" hint="点按按钮切换已完成段数">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AfProgressRing segments={4} done={done} label="任务分段完成度" />
            <AfProgressRing segments={6} done={Math.min(6, done + 1)} size={42} tone="success" label="校验分段完成度" />
            <AfButton size="sm" variant="secondary" onClick={() => setDone((d) => (d >= 4 ? 1 : d + 1))}>
              +1 段
            </AfButton>
          </div>
        </Row>
        <Row label="连续百分比" hint="传入 value 后切换为连续圆弧并支持语义色">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <AfProgressRing value={72} label="内存配额" size={40} />
            <AfProgressRing value={86} tone="warning" label="速率上限" size={40} />
            <AfProgressRing value={96} tone="danger" label="并发告警" size={40} />
            <AfProgressRing value={100} tone="success" label="校验完成" size={40} />
          </div>
        </Row>
      </Panel>
    </div>
  );
}

function ProgressSpecimen() {
  return (
    <div className="af-base-demo">
      <Panel title="线性进度条（Progress）" desc="支持 xs 3px / sm 4px / md 6px 轨道高度与 animated=false 静态高频更新。">
        <Row label="语义色调（md）" hint="accent / success / warning / danger">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 280 }}>
            <AfProgress value={68} size="md" animated={false} label="任务进度" />
            <AfProgress value={100} size="md" animated={false} tone="success" label="完成状态" />
            <AfProgress value={78} size="md" animated={false} tone="warning" label="预警阈值" />
            <AfProgress value={92} size="md" animated={false} tone="danger" label="临近限流" />
          </div>
        </Row>
        <Row label="纤细轨道（sm / xs）" hint="表格或列表行内嵌进度">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 280 }}>
            <AfProgress value={54} size="sm" animated={false} label="sm 进度" />
            <AfProgress value={40} size="xs" animated={false} label="xs 进度" />
          </div>
        </Row>
      </Panel>
    </div>
  );
}

function CardSpecimen() {
  const [replyMode, setReplyMode] = useState<"draft" | "send">("draft");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
        maxWidth: 400,
        margin: "0 auto",
      }}
    >
      <AfCard>
        <AfCardHeader
          icon={<AfAvatar kind="agent" name="Support triage" seed="triage" size={40} working />}
          title="Support triage"
          description="Sorts new tickets and drafts the first reply"
          action={
            <button
              type="button"
              aria-label="More for Support triage"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                marginInlineEnd: -6,
                border: 0,
                borderRadius: "var(--af-r-sm)",
                background: "transparent",
                color: "var(--af-muted)",
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 12.5V12m12 .5V12m-6 .5V12m-5 .5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm12 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z" />
              </svg>
            </button>
          }
        />
        <AfCardContent>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {[
              { label: "Tickets", val: "142" },
              { label: "Resolved", val: "96%" },
              { label: "Spent today", val: "$4.20" },
            ].map((m) => (
              <div key={m.label} style={{ display: "flex", flexDirection: "column", gap: 0, flex: "1 1 0%" }}>
                <span style={{ fontSize: 12, lineHeight: "16px", color: "var(--af-muted)" }}>{m.label}</span>
                <span
                  style={{
                    fontSize: 15,
                    lineHeight: "24px",
                    fontWeight: 400,
                    color: "var(--af-strong)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {m.val}
                </span>
              </div>
            ))}
          </div>
        </AfCardContent>
        <AfCardFooter>
          <span style={{ fontSize: 12, lineHeight: "16px", color: "var(--af-muted)" }}>Running · started 2 min ago</span>
          <AfButton size="sm" variant="secondary">
            Open
          </AfButton>
        </AfCardFooter>
      </AfCard>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.5px", color: "var(--af-muted)" }}>REPLIES</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(
            [
              { id: "draft", title: "Draft only", desc: "You send every reply" },
              { id: "send", title: "Send for me", desc: "Asks before refunds" },
            ] as const
          ).map((item) => (
            <AfCard
              key={item.id}
              interactive
              selected={replyMode === item.id}
              style={{ flex: "1 1 180px" }}
              title={
                <button
                  type="button"
                  className="af-card__stretch"
                  onClick={() => setReplyMode(item.id)}
                >
                  {item.title}
                </button>
              }
              description={item.desc}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertSpecimen() {
  return (
    <div className="af-base-demo">
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 600 }}>
        <AfAlert tone="info" title="已切换至轻量同步模式" description="仅在工作区文件变更时刷新本地索引。" />
        <AfAlert tone="success" title="全部 8 项架构门禁校验通过" />
        <AfAlert tone="warning" title="当前令牌将于 3 天后过期" actions={<AfButton size="sm" variant="secondary">立即轮换</AfButton>} />
        <AfAlert tone="danger" title="检测到并发写入冲突，已自动挂起发布任务" closable />
      </div>
    </div>
  );
}

function SeparatorSpecimen() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 440,
        margin: "0 auto",
        borderRadius: "var(--af-r-card)",
        background: "var(--af-surface)",
        boxShadow: "var(--af-shadow-card)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px 18px",
          boxShadow: "var(--af-divider-hairline)",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", color: "var(--af-muted)" }}>
          RUN HISTORY
        </span>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--af-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span>12 runs</span>
          <AfSeparator orientation="vertical" />
          <span>1 failed</span>
          <AfSeparator orientation="vertical" />
          <span>41 min</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 18px 16px" }}>
        <AfDivider label="Today" decorative={false} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { name: "Sync invoices to billing-api", meta: "14:02 · 3m 12s" },
            { name: "Draft replies for 14 tickets", meta: "11:40 · 58s" },
          ].map((r) => (
            <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--af-strong)" }}>{r.name}</span>
              <span style={{ fontSize: 12, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums" }}>{r.meta}</span>
            </div>
          ))}
        </div>
        <AfDivider label="Earlier" decorative={false} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { name: "Weekly usage report", meta: "Mon · 4m 05s" },
            { name: "Migrate webhooks to v2", meta: "Sun · failed" },
          ].map((r) => (
            <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--af-strong)" }}>{r.name}</span>
              <span style={{ fontSize: 12, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums" }}>{r.meta}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DividerSpecimen() {
  return <SeparatorSpecimen />;
}

function SpinnerSpecimen() {
  const [doneCount, setDoneCount] = useState(0);
  const checks = ["Type check", "Lint", "Unit tests", "Eval suite"];
  const allDone = doneCount === checks.length;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        width: "100%",
        maxWidth: 400,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          borderRadius: "var(--af-r-card)",
          background: "var(--af-surface)",
          boxShadow: "var(--af-shadow-card)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "11px 16px",
            boxShadow: "var(--af-divider-hairline)",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--af-strong)" }}>Checks</span>
            <span style={{ fontSize: 12.5, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums" }}>
              {doneCount}/{checks.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDoneCount((c) => (c >= checks.length ? 0 : c + 1))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 10px",
              border: 0,
              borderRadius: "var(--af-r-md)",
              background: "var(--af-surface)",
              boxShadow: "var(--af-shadow-hairline)",
              fontSize: 12.5,
              color: allDone ? "var(--af-success)" : "var(--af-muted)",
              cursor: "pointer",
            }}
          >
            {allDone ? <AfIcon name="check" size={12} /> : <AfSpinner size={12} label="Checks status" />}
            <span>{allDone ? "Passed" : "Running"}</span>
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {checks.map((item, idx) => {
            const done = idx < doneCount;
            return (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "11px 16px",
                  boxShadow: idx > 0 ? "var(--af-divider-hairline-top)" : undefined,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--af-strong)" }}>
                  {done ? (
                    <span style={{ display: "inline-flex", color: "var(--af-success)" }}>
                      <AfIcon name="check" size={14} />
                    </span>
                  ) : (
                    <AfSpinner size={14} label={`Running ${item}`} />
                  )}
                  <span>{item}</span>
                </span>
                {done ? (
                  <span style={{ fontSize: 11.5, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums" }}>
                    0.4s
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "inline-flex", alignItems: "flex-end", gap: 24, color: "var(--af-ink)" }}>
        {[12, 14, 16, 20].map((sz) => (
          <span
            key={sz}
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              fontSize: 11.5,
              color: "var(--af-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 20 }}>
              <AfSpinner size={sz} label={`${sz}px spinner`} />
            </span>
            <span>{sz}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SkeletonSpecimen() {
  const [loading, setLoading] = useState(true);
  const skeletonRows = [
    { w1: "58%", w2: "36%" },
    { w1: "44%", w2: "33%" },
    { w1: "48%", w2: "28%" },
    { w1: "53%", w2: "30%" },
    { w1: "35%", w2: "34%" },
  ];
  const runs = [
    { name: "pr-reviewer", desc: "Checked 12 files · 1.4s", meta: "1.4s" },
    { name: "triage-bot", desc: "Assigned 3 issues · 0.8s", meta: "0.8s" },
    { name: "doc-sync", desc: "Updated changelog · 2.1s", meta: "2.1s" },
    { name: "billing-recon", desc: "Matched 48 invoices · 3.2s", meta: "3.2s" },
    { name: "eval-runner", desc: "Scored 24 prompts · 4.0s", meta: "4.0s" },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 460,
        margin: "0 auto",
        borderRadius: "var(--af-r-card)",
        background: "var(--af-surface)",
        boxShadow: "var(--af-shadow-card)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 16px",
          boxShadow: "var(--af-divider-hairline)",
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--af-strong)" }}>Recent runs</span>
        <AfSegmented
          size="sm"
          label="Recent runs mode"
          value={loading ? "loading" : "data"}
          onChange={(v) => setLoading(v === "loading")}
          options={[
            { value: "data", label: "Data" },
            { value: "loading", label: "Loading" },
          ]}
        />
      </div>
      <AfSkeletonLoading
        loading={loading}
        skeleton={
          <div style={{ display: "flex", flexDirection: "column" }}>
            {skeletonRows.map((row, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  boxShadow: idx > 0 ? "var(--af-divider-hairline-top)" : undefined,
                }}
              >
                <AfSkeleton width={18} height={18} radius={5} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
                  <AfSkeleton width={row.w1} height={9} radius={999} />
                  <AfSkeleton width={row.w2} height={8} radius={999} />
                </div>
                <AfSkeleton width={22} height={8} radius={999} />
              </div>
            ))}
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {runs.map((item, idx) => (
            <div
              key={item.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                boxShadow: idx > 0 ? "var(--af-divider-hairline-top)" : undefined,
              }}
            >
              <AfAvatar kind="agent" name={item.name} seed={item.name} size={22} />
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--af-strong)", lineHeight: "18px" }}>
                  {item.name}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--af-muted)", lineHeight: "16px" }}>{item.desc}</span>
              </div>
              <span style={{ fontSize: 11.5, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums" }}>
                {item.meta}
              </span>
            </div>
          ))}
        </div>
      </AfSkeletonLoading>
    </div>
  );
}

function SpinnerSkeletonSpecimen() {
  return <SpinnerSpecimen />;
}

function EmptyStateSpecimen() {
  const calendarSvg = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M16 2V6M8 2V6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
      <path d="M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
      <path d="M3 10H21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
      <path d="M12.1258 14H12.0008M12.1258 18H12.0008M7.625 14H7.5M7.625 18H7.5M16.625 14H16.5M12.2508 14C12.2508 14.1381 12.1389 14.25 12.0008 14.25C11.8628 14.25 11.7508 14.1381 11.7508 14C11.7508 13.8619 11.8628 13.75 12.0008 13.75C12.1389 13.75 12.2508 13.8619 12.2508 14ZM12.2508 18C12.2508 18.1381 12.1389 18.25 12.0008 18.25C11.8628 18.25 11.7508 18.1381 11.7508 18C11.7508 17.8619 11.8628 17.75 12.0008 17.75C12.1389 17.75 12.2508 17.8619 12.2508 18ZM7.75 14C7.75 14.1381 7.63807 14.25 7.5 14.25C7.36193 14.25 7.25 14.1381 7.25 14C7.25 13.8619 7.36193 13.75 7.5 13.75C7.63807 13.75 7.75 13.8619 7.75 14ZM7.75 18C7.75 18.1381 7.63807 18.25 7.5 18.25C7.36193 18.25 7.25 18.1381 7.25 18C7.25 17.8619 7.36193 17.75 7.5 17.75C7.63807 17.75 7.75 17.8619 7.75 18ZM16.75 14C16.75 14.1381 16.6381 14.25 16.5 14.25C16.3619 14.25 16.25 14.1381 16.25 14C16.25 13.8619 16.3619 13.75 16.5 13.75C16.6381 13.75 16.75 13.8619 16.75 14Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
  const pulseSquareSvg = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M4.31802 19.682C3 18.364 3 16.2426 3 12C3 7.75736 3 5.63604 4.31802 4.31802C5.63604 3 7.75736 3 12 3C16.2426 3 18.364 3 19.682 4.31802C21 5.63604 21 7.75736 21 12C21 16.2426 21 18.364 19.682 19.682C18.364 21 16.2426 21 12 21C7.75736 21 5.63604 21 4.31802 19.682Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
      <path d="M7 14L9.79289 11.2071C10.1834 10.8166 10.8166 10.8166 11.2071 11.2071L12.7929 12.7929C13.1834 13.1834 13.8166 13.1834 14.2071 12.7929L17 10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" />
    </svg>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 440, margin: "0 auto" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 6, padding: "0 2px" }}>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.5px", color: "var(--af-muted)" }}>
            SCHEDULES
          </span>
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--af-faint)", fontVariantNumeric: "tabular-nums" }}>0</span>
        </div>
        <AfEmptyState
          icon={calendarSvg}
          title="No schedules yet"
          text="Runs you ask an agent to repeat show up here, with their next time."
          action={
            <AfButton size="sm" variant="secondary" icon="plus">
              New schedule
            </AfButton>
          }
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--af-r-card)",
          background: "var(--af-surface)",
          boxShadow: "var(--af-shadow-card)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "10px 14px", boxShadow: "var(--af-divider-hairline)", fontSize: 13, fontWeight: 500, color: "var(--af-strong)" }}>
          Run details
        </div>
        <AfEmptyState
          variant="bare"
          size="sm"
          icon={pulseSquareSvg}
          title="Nothing open"
          text="Pick a run to see its steps, tokens and cost."
        />
      </div>
    </div>
  );
}

function CopyButtonSpecimen() {
  return (
    <div className="af-base-demo">
      <Panel title="复制按钮（Copy Button）" desc="保持按钮可聚焦不禁用，点击后切换对勾反馈并播报已复制状态。">
        <Row label="安装命令" hint="secondary / ghost 两种轻量形态">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AfCode>npm install @fangxinyan/aster-ui</AfCode>
            <AfCopyButton text="npm install @fangxinyan/aster-ui" variant="secondary" />
            <AfCopyButton text="npm view @fangxinyan/aster-ui" variant="ghost" />
          </div>
        </Row>
      </Panel>
    </div>
  );
}

function KeyValueSparklineSpecimen() {
  return (
    <div className="af-base-demo">
      <Panel title="键值行与走势线（KeyValue & Sparkline）" desc="卡片与侧栏常用的左图标键名 + 右侧等宽数值/走势线组合。">
        <AfKeyValue icon="bolt" label="今日 Token 趋势">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <AfSparkline values={[18, 24, 21, 35, 31, 46, 52]} tone="accent" />
            <span>52.4k</span>
          </span>
        </AfKeyValue>
        <AfKeyValue icon="check" label="构建通过率">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <AfSparkline values={[91, 93, 94, 96, 98, 99, 100]} tone="success" />
            <span>99.4%</span>
          </span>
        </AfKeyValue>
      </Panel>
    </div>
  );
}

function ToastTriggerButtons() {
  const toast = useAfToast();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <AfButton size="sm" variant="primary" onClick={() => toast.show("设置已保存到本机", "success")}>
        成功 Toast
      </AfButton>
      <AfButton
        size="sm"
        variant="secondary"
        onClick={() => toast.show("已移除 1 条代理规则", "warning", { label: "撤销", onClick: () => toast.show("已恢复规则", "info") })}
      >
        带撤销动作
      </AfButton>
      <AfButton
        size="sm"
        variant="secondary"
        onClick={() =>
          toast.promise(new Promise((resolve) => setTimeout(resolve, 900)), {
            loading: "正在同步工作区状态…",
            success: "同步完成",
            error: "同步失败",
          })
        }
      >
        Promise 变形
      </AfButton>
    </div>
  );
}

function ToastProviderSpecimen() {
  return (
    <div className="af-base-demo">
      <AfToastProvider>
        <Panel title="通知容器（Toast Provider）" desc="支持多条堆叠、悬停展开、计时条与 Promise 成功变形反馈。">
          <Row label="触发示例" hint="挂载于主题浮层根，按 Esc 或点左上角关闭">
            <ToastTriggerButtons />
          </Row>
        </Panel>
      </AfToastProvider>
    </div>
  );
}

const DEMO_COMMANDS: AfCommand[] = [
  { id: "new-chat", group: "常用操作", label: "新建对话", kbd: "Ctrl N", icon: "plus" },
  { id: "theme", group: "界面", label: "切换深浅外观", kbd: "Ctrl T", icon: "sun" },
  { id: "check", group: "开发工具", label: "运行架构门禁检查", hint: "8 项契约", icon: "shield" },
];

function CommandPaletteSpecimen() {
  const [open, setOpen] = useState(false);
  const [lastRun, setLastRun] = useState("尚未执行");
  return (
    <div className="af-base-demo">
      <Panel title="命令面板（Command Palette）" desc="支持模糊检索、拼音/关键词匹配、多级子命令钻取与焦点圈限制。">
        <Row label="打开面板" hint={`最近执行：${lastRun}`}>
          <AfButton size="sm" variant="primary" kbd="Ctrl K" onClick={() => setOpen(true)}>
            打开命令面板
          </AfButton>
        </Row>
      </Panel>
      <AfCommandPalette
        open={open}
        onClose={() => setOpen(false)}
        commands={DEMO_COMMANDS}
        onRun={(cmd) => {
          setLastRun(cmd.label);
          setOpen(false);
        }}
      />
    </div>
  );
}

/** 基础控件组：项目直接复用的原子组件与布局原语。 */
export const baseSpecs: ComponentSpec[] = [
  {
    id: "button",
    title: "Button",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。Aster 桌面宿主所有主/次操作、危险操作、链接多态和加载态的统一入口。",
    render: ButtonSpecimen,
    width: 720,
  },
  {
    id: "segmented-control",
    title: "Segmented Control",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。时间范围、视图切换、筛选和页面页签共用同一套滑动指示器。",
    render: SegmentedSpecimen,
    width: 720,
  },
  {
    id: "input",
    title: "Input",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。支持前后图标、prefix / suffix、清除、字数统计、尺寸、校验与禁用态。",
    render: InputSpecimen,
    width: 720,
  },
  {
    id: "select",
    title: "Select",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。支持框内搜索、动态创建、多选折叠、分组、键盘速查与自动翻转。",
    render: SelectSpecimen,
    width: 720,
  },
  {
    id: "checkbox",
    title: "Checkbox",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。多选与确认场景的勾选控件，选中填充强调色。",
    render: CheckboxSpecimen,
    width: 720,
  },
  {
    id: "switch",
    title: "Switch",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。即时生效的设置开关，适合同步、统计与权限类选项。",
    render: SwitchSpecimen,
    width: 720,
  },
  {
    id: "tag-status",
    title: "Tag & Status",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。静态/可关闭语义标签与带状态点的运行态，共用同一套语义色。",
    render: TagStatusSpecimen,
    width: 720,
  },
  {
    id: "badge",
    title: "Badge",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。柔和语义状态徽章、1.8s 呼吸圆点、等宽计数胶囊与右上角挂载角标。",
    render: BadgeSpecimen,
    width: 720,
  },
  {
    id: "avatar",
    title: "Avatar",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。人物柔和确定性色相圆头像、180ms 图片淡入、叠放头像组与 Agent 3×3 对称像素呼吸标识。",
    render: AvatarSpecimen,
    width: 720,
  },
  {
    id: "kbd",
    title: "Kbd",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。跨平台单芯片快捷键键帽，自适应按钮深浅对比并内置屏幕阅读器全称展开。",
    render: KbdSpecimen,
    width: 720,
  },
  {
    id: "kbd-code",
    title: "Kbd & Code",
    group: "基础控件",
    source: "free",
    note: "兼容旧版组合路由别名。",
    render: KbdCodeSpecimen,
    width: 720,
  },
  {
    id: "textarea",
    title: "Textarea",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。支持 field-sizing 自适应行高、语法高亮代码编辑、字数统计与校验。",
    render: TextareaSpecimen,
    width: 720,
  },
  {
    id: "radio",
    title: "Radio & Choice Card",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。独立单选原子、互斥列表与发丝边框卡片选择模式。",
    render: RadioSpecimen,
    width: 720,
  },
  {
    id: "slider",
    title: "Slider",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。上下文窗口、并行数与阈值等连续数值调节。",
    render: SliderSpecimen,
    width: 720,
  },
  {
    id: "number-input",
    title: "Number Input",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。支持长按连发步进、Shift×10 键盘微调、格式化展示与有界输入。",
    render: NumberInputSpecimen,
    width: 720,
  },
  {
    id: "popover",
    title: "Popover & Menu",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。四向翻转自包含触发浮层，以及支持复选、单选与多级子菜单的下拉菜单。",
    render: PopoverMenuSpecimen,
    width: 720,
    height: 460,
  },
  {
    id: "modal",
    title: "Modal",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。确认清除、权限申请等需要打断的操作用弹窗承载，支持平滑退场动画。",
    render: ModalSpecimen,
    width: 700,
    height: 360,
  },
  {
    id: "alert-dialog",
    title: "Alert Dialog",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。高风险操作二次确认对话框与 useAfConfirm 命令式调用，默认聚焦安全取消按钮。",
    render: AlertDialogSpecimen,
    width: 720,
  },
  {
    id: "drawer",
    title: "Drawer",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。支持右/左/底三向滑出的抽屉容器，带焦点陷阱与平滑退场过渡。",
    render: DrawerSpecimen,
    width: 720,
    height: 360,
  },
  {
    id: "tooltip",
    title: "Tooltip",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。补充说明与快捷键提示；不承载操作，空间不足自动翻转。",
    render: TooltipSpecimen,
    width: 700,
  },
  {
    id: "accordion",
    title: "Accordion",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。原生 <details> 手风琴折叠面板，支持尺寸插值动画、全部展开同步与互斥模式。",
    render: AccordionSpecimen,
    width: 720,
  },
  {
    id: "table",
    title: "Table",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。语义化数据表格，支持列头按钮排序、自然数值比较、全选/半选行勾选与空态。",
    render: TableSpecimen,
    width: 720,
  },
  {
    id: "pagination",
    title: "Pagination",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。恒定槽位页码表（翻页箭头零位移）、每页行数保位切换与实时条目区间摘要。",
    render: PaginationSpecimen,
    width: 720,
  },
  {
    id: "breadcrumb",
    title: "Breadcrumb",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。斜杠/尖括号路径导航，支持超出自动收拢阶梯菜单、方向键漫游与末项滑入过渡。",
    render: BreadcrumbSpecimen,
    width: 720,
  },
  {
    id: "pagination-breadcrumb",
    title: "Pagination & Breadcrumb",
    group: "基础控件",
    source: "free",
    note: "兼容旧版组合路由别名。",
    render: PaginationBreadcrumbSpecimen,
    width: 720,
  },
  {
    id: "scroll-area",
    title: "Scroll Area",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。悬浮胶囊细滚动条（悬停增宽、静置淡出）与连续比例 CSS mask 软边缘渐隐容器。",
    render: ScrollAreaSpecimen,
    width: 720,
  },
  {
    id: "resizable",
    title: "Resizable",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。支持可折叠面板吸附、双击复位、Enter 切换与 120ms 悬停延迟高亮的分栏原语。",
    render: ResizableSpecimen,
    width: 720,
  },
  {
    id: "form-field",
    title: "Form Field",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。标签、说明、必填与错误的统一表单字段包裹，自动向下游控件注入无障碍关联。",
    render: FormFieldSpecimen,
    width: 720,
  },
  {
    id: "form",
    title: "Form",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。AfForm / useAfForm / AfFormItem：支持失焦触发校验、输入纠错即时消错、异步规则与提交聚焦首位错误项。",
    render: FormSpecimen,
    width: 720,
  },
  {
    id: "timeline",
    title: "Timeline",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。垂直时间轴，支持语义色调圆点、虚线轨、交替布局、等宽时间戳与 pending 待定节点。",
    render: TimelineSpecimen,
    width: 720,
  },
  {
    id: "image-preview",
    title: "Image & Preview",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。增强图片组件与全屏灯箱预览（0.25x–4x 缩放、旋转、镜像、2D 拖拽平移与断图回退）。",
    render: ImagePreviewSpecimen,
    width: 720,
  },
  {
    id: "typography",
    title: "Typography & Surface",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。标准化标题阶梯、语义文本、多行省略、tabular-nums 数值与 sunken/surface/raised 表面容器。",
    render: TypographySpecimen,
    width: 720,
  },
  {
    id: "splitter",
    title: "Splitter",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。像素受控分割器，兼容固定侧栏宽度 + 自适应主区、拖拽约束与一键折叠。",
    render: SplitterSpecimen,
    width: 720,
  },
  {
    id: "message",
    title: "Message",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。全局命令式轻提示（afMessage.info / success / warning / error / loading / destroy），挂载于主题浮层内。",
    render: MessageSpecimen,
    width: 720,
  },
  {
    id: "hover-card",
    title: "Hover Card",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。悬停/聚焦富信息预览卡，严格遵守悬停不抢夺焦点与快速划过连续过渡规范。",
    render: HoverCardSpecimen,
    width: 720,
    height: 280,
  },
  {
    id: "toggle-group",
    title: "Toggle Group",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。工具切换按钮组，基于 [aria-pressed] 表达视觉状态与 Roving Tabindex 方向键焦点漫游。",
    render: ToggleGroupSpecimen,
    width: 720,
  },
  {
    id: "code-block",
    title: "Code Block",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。等宽代码展示块，支持行号、重点行高亮、语言标签与非禁用态复制反馈。",
    render: CodeBlockSpecimen,
    width: 720,
  },
  {
    id: "meter-bar",
    title: "Meter Bar",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。Flexbox 多段计量条，支持交互式图例反高亮、语义色及 xs/sm/md 三档轨道。",
    render: MeterBarSpecimen,
    width: 720,
  },
  {
    id: "diff-view",
    title: "Diff View",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。结构化/Unified Patch/双文本代码差异对比，支持 Unified 与 Split Flexbox 视图切换。",
    render: DiffViewSpecimen,
    width: 760,
  },
  {
    id: "steps",
    title: "Steps",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。Safari 列表语义兼容的 Flexbox 步骤条，支持 number / dot / bar 变体与点击切换。",
    render: StepsSpecimen,
    width: 760,
  },
  {
    id: "tree",
    title: "Tree View",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。WAI-ARIA TreeView 树形导航，支持 Flexbox 平滑高度折叠、首字母速查与中性柔灰选中态。",
    render: TreeSpecimen,
    width: 720,
  },
  {
    id: "tree-view",
    title: "Tree View (Slug)",
    group: "基础控件",
    source: "free",
    note: "affectUI tree-view 直连舞台别名。",
    render: TreeSpecimen,
    width: 720,
  },
  {
    id: "stat",
    title: "Stat",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。核心数值指标卡：tabular-nums 对齐、前后缀、涨跌胶囊与迷你走势线。",
    render: StatSpecimen,
    width: 760,
  },
  {
    id: "descriptions",
    title: "Descriptions",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。纯 Flexbox 多列描述列表，支持 1/2/3 列与跨列展示（零 CSS Grid）。",
    render: DescriptionsSpecimen,
    width: 760,
  },
  {
    id: "chip-input",
    title: "Tag Input",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。支持收件人头像胶囊、批量粘贴解析、重复项闪烁提示与方向键胶囊漫游删除。",
    render: ChipInputSpecimen,
    width: 720,
  },
  {
    id: "tag-input",
    title: "Tag Input (Slug)",
    group: "基础控件",
    source: "free",
    note: "affectUI tag-input 直连舞台别名。",
    render: ChipInputSpecimen,
    width: 720,
  },
  {
    id: "progress-ring",
    title: "Progress Ring",
    group: "基础控件",
    source: "pro",
    note: "affectUI Pro 晋升核心控件。支持分段计数与连续百分比双模式，内嵌隐藏原生 progress 防重复播报。",
    render: ProgressRingSpecimen,
    width: 720,
  },
  {
    id: "progress",
    title: "Progress",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。线性进度条，支持 xs/sm/md 三档轨道厚度、多语义色与静态更新模式。",
    render: ProgressSpecimen,
    width: 720,
  },
  {
    id: "card",
    title: "Card",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。统一发丝卡片容器，支持快捷属性或 Header/Content/Footer 组合原语与可交互拉伸热区。",
    render: CardSpecimen,
    width: 720,
  },
  {
    id: "alert",
    title: "Alert",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。行内提示横幅（info / success / warning / danger），零硬边框、淡语义底。",
    render: AlertSpecimen,
    width: 720,
  },
  {
    id: "separator",
    title: "Separator",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。0.5px 物理发丝分割线，支持横向居中标签、16px 纵向行内分割与装饰语义控制。",
    render: SeparatorSpecimen,
    width: 720,
  },
  {
    id: "divider",
    title: "Divider",
    group: "基础控件",
    source: "free",
    note: "兼容旧版 Divider 路由别名。",
    render: DividerSpecimen,
    width: 720,
  },
  {
    id: "spinner",
    title: "Spinner",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。继承 currentColor 的 18% 底环 + 90° 圆弧匀速旋转指示器（reduced-motion 自动降速）。",
    render: SpinnerSpecimen,
    width: 720,
  },
  {
    id: "skeleton",
    title: "Skeleton",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。1.6s 相位同步微光骨架占位与 1lh 真实行高无跳变切换容器。",
    render: SkeletonSpecimen,
    width: 720,
  },
  {
    id: "spinner-skeleton",
    title: "Spinner & Skeleton",
    group: "基础控件",
    source: "free",
    note: "兼容旧版组合路由别名。",
    render: SpinnerSkeletonSpecimen,
    width: 720,
  },
  {
    id: "empty-state",
    title: "Empty State",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。柔和浅洗底与 0.5px 内嵌发丝空状态容器，配 42×42 柔底图标砖与 320px 最佳阅读宽。",
    render: EmptyStateSpecimen,
    width: 720,
  },
  {
    id: "copy-button",
    title: "Copy Button",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。一键剪贴板复制按钮，成功态保留焦点与屏幕阅读器状态通知。",
    render: CopyButtonSpecimen,
    width: 720,
  },
  {
    id: "key-value-sparkline",
    title: "Key Value & Sparkline",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。详情键值行与卡片迷你走势折线图组合。",
    render: KeyValueSparklineSpecimen,
    width: 720,
  },
  {
    id: "toast-provider",
    title: "Toast Provider",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。全局堆叠通知容器（useAfToast），支持撤销动作与 Promise 状态变形。",
    render: ToastProviderSpecimen,
    width: 720,
  },
  {
    id: "command-palette",
    title: "Command Palette",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。全局快捷命令检索面板，支持子命令栈与快捷键引导。",
    render: CommandPaletteSpecimen,
    width: 720,
  },
];
