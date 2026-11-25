# Aster UI 全量组件清单与选型索引 (`COMPONENTS.md`)

> 版本：`v0.6.0`（已清除全部业务定制套件，全库保持纯净通用的 **Core 基础控件与布局原语 + UI Pro + Patterns + Blocks + Screens + Motion + Illustrations** 体系）  
> 设计与间距细则见 [`DESIGN.md`](./DESIGN.md)；交互示范页可在展示站打开 `Layout & Spacing Guide`（`?component=layout-guide`）实时切换浅深色、舒适/紧凑密度与间距标注。

---

## 1. 组件分层与选型决策

| 层级 | 推荐导入入口 | 对应样式 | 适用场景 |
| --- | --- | --- | --- |
| **L0 布局与间距原语（9）** | `@fangxinyan/aster-ui/core` | `core.css` | 用基础组件自主搭页面时的页面骨架、区块节奏、多列 Flexbox、工具栏与发丝列表行 |
| **L1 基础交互与表单（35）** | `@fangxinyan/aster-ui/core` | `core.css` | 按钮、输入、选择、日期时间、校验表单、热键录制、拖拽上传 |
| **L2 展示、数据与容器（46）** | `@fangxinyan/aster-ui/core` | `core.css` | 卡片、表面、排印、表格、树、步骤、代码/Diff、计量条、指标卡、媒体灯箱、分栏 |
| **L3 浮层与命令总线（13）** | `@fangxinyan/aster-ui/core` | `core.css` | 气泡、菜单、模态框（含 `afModal`）、抽屉、确认框、命令面板、Toast、全局 `afMessage` |
| **L4 主题、壳层与原语** | `@fangxinyan/aster-ui/core` / `/runtime` / `/primitives` / `/icons` | `core.css` / `tokens.css` | 主题引擎、无边框标题栏、跨 Root 插件桥接、16×16 线性图标、无障碍/拖拽/窗口 Hooks |
| **L5 高阶数据与动效（22）** | `@fangxinyan/aster-ui/ui-pro` / `/motion` | `ui-pro.css` / `motion.css` | 数字缓动插值、折线图、弹性托盘、脏数据保存栏、文字揭示、3D 视差卡、流光骨架 |
| **L6 领域复合模式（79）** | `@fangxinyan/aster-ui` 或 `/patterns/*` | `styles.css` 或 `patterns/*.css` | AI 对话流、筛选菜单、分步向导、数据指标卡、49 套多智能体编排与审计模式 |
| **L7 整块、整页与插画（83）** | `@fangxinyan/aster-ui` | `styles.css` 或 `screens/*.css` / `illustrations/*.css` | 14 套业务 Blocks、43 套整页 Screens、26 套高帧率交互场景插画 |

**选型原则**：
1. **常规业务页 / 设置页 / 管理台**：优先使用 **L0 布局原语 + L1–L3 Core 基础件** 拼装，体积最小、样式可控且自动响应 `comfortable / compact` 密度。
2. **AI 对话 / 多智能体协同 / 复杂数据面板**：直接复用 **L5 + L6 Patterns**，并按需引入对应 `patterns/*.css`。
3. **快速起盘 / 完整工作区参考**：参考或组合 **L7 Blocks / Screens**。

---

## 2. L0 · 布局与语义间距原语（`@fangxinyan/aster-ui/core`）

> 专治「只用基础组件时缺少统一间距与排布规范」的问题：全部 100% Flexbox（零 CSS Grid）、自动注入 `min-width: 0`、自动随 `density="comfortable" | "compact"` 缩放。

| 组件 | 定位 | 核心属性与默认间距 |
| --- | --- | --- |
| `AfPage` | 页面外框与阅读宽度约束 | `maxWidth="narrow(680) \| medium(960) \| wide(1200) \| full"`、`padding="page"` (`24/16px`)、`gap="section"` (`24/16px`) |
| `AfPageHeader` | 标准页面顶栏 | `breadcrumb`、`title`、`badge`、`description`、`actions`、`meta`、`divider`（左标题说明 + 右操作组 `8/6px`） |
| `AfSection` | 页面一级内容区块 | `title`、`description`、`action`、`gap="group"` (`12/8px`)、`divider` |
| `AfStack` | 通用纵向/横向堆叠 | `direction="vertical \| horizontal"`、`gap="block"` (`16/12px`)、`align`、`justify`、`wrap`、`padding`、`fill` |
| `AfInline` | 行内水平组合快捷件 | 默认 `horizontal` + `align="center"` + `wrap` + `gap="inline"` (`8/6px`)，用于按钮组、标签簇 |
| `AfColumns` | 纯 Flexbox 多列容器 | `columns={1 \| 2 \| 3 \| 4 \| "auto"}`、`minItemWidth={220}`、`gap="group"` (`12/8px`)、`align="stretch"` |
| `AfToolbar` | 筛选与操作工具栏 | `leading`、`trailing`、`gap="inline"` (`8/6px`)、`surface="none \| sunken \| card"`（同排控件光学居中） |
| `AfListRow` | 发丝分隔列表/设置行 | `icon`、`title`、`badge`、`description`、`meta`、`control`/`action`、`interactive`、`onClick`（配合 `AfCard flush` + `AfHoverList`） |
| `AfSpacer` | 弹性推开占位器 | `flex: 1 1 auto`，在行容器内将左右元素推向两端 |

---

## 3. L1 · 基础交互控件与表单（`@fangxinyan/aster-ui/core`）

### 3.1 按钮与切换
- `AfButton`：主/次/强调/幽灵/描边/虚线/危险按钮（`xs / sm / md / lg`，`loading`、`icon`、`rightIcon`、`asChild`、`href`）
- `AfIconButton`：纯图标按钮（强制无障碍 `label`、`pressed`、`loading`）
- `AfSegmented`：滑动胶囊分段切换器（`tray` / `underline`、`xs / sm / md`、`count`、`badge`）
- `AfToggleGroup`：工具开关按钮组（单选/多选、`[aria-pressed="true"]`、Roving Tabindex）
- `AfSwitch`：即时生效开关（`sm / md`、`accent / solid`）
- `AfCheckbox` / `AfCheckboxGroup`：复选框与复选组（含 `indeterminate` 半选、`standalone`、`variant="card"`）
- `AfRadio` / `AfRadioGroup` / `AfChoiceCards`：单选与柔和发丝选择卡

### 3.2 文本、数值与选择
- `AfInput` / `AfTextField` / `AfPasswordInput`：单行文本与密码框（`outline / filled / borderless`、`prefix`、`allowClear`、`copyable`、`showCount`、`aria-invalid="false"`）
- `AfTextarea` / `AfTextArea`：多行文本（`autoSize`、`expandable`、代码高亮、`⌘Enter` 提交快捷键）
- `AfNumberInput`：数值输入框（长按连发、`Shift×10`、`scrubbable` 水平拖拽微调、`unitOptions`、`commitMode`）
- `AfSelect`：单选/多选下拉（框内搜索、远程筛选、分组、`maxTagCount`、`optionRender`、`selectedRender`）
- `AfCombobox`：可检索多选组合框（支持人物头像胶囊与滑动高光）
- `AfAutoComplete`：输入联想补全（支持分组与可移除历史项）
- `AfCascader`：多级级联选择（点击/悬停展开、多选父子联动、路径搜索、异步 `loadData`）
- `AfSlider`：连续单值/双拇指区间滑块（悬停刻度气泡、`inline` 模式）
- `AfRating`：五星/半星/赞踩评价控件（只读展示与交互录入）
- `AfHotkeyInput`：快捷键组合录制框（冲突检测、Esc 退出、一键重置）
- `AfChipInput` / `AfTagInput`：多标签胶囊输入（回车/逗号/粘贴批量建标、重复项闪烁提示）
- `AfOtpInput`：多格一次性验证码输入（支持 `locale="zh-CN"`）
- `AfDropzone` / `AfUpload`：拖拽/剪贴板粘贴/目录上传区（含上传中断与中文内置文案）

### 3.3 日期、时间、颜色与表单校验
- `AfDatePicker` / `AfDateRangePicker` / `AfDateRange`：纯 Flexbox 月历单日与范围选择（零原生 `<input type="date">`）
- `AfTimePicker` / `AfDateTimePicker` / `AfDateTimeRangePicker`：自然语言时间解析（`parseNaturalTime`）、多列滚轮与双语日期时间区间
- `AfCalendar`：独立 7 列 Flexbox 月历（支持节假日角标与禁用日期）
- `AfColorPicker`：色板、取色面板与 RGB/Hex 切换
- `AfForm` / `AfFormItem` / `AfFormField` / `useAfForm`：三阶段表单校验（失焦报错 → 输入即消错 → 提交聚焦首错、异步规则、条件 ARIA 错误播报）

---

## 4. L2 · 基础展示、导航与容器（`@fangxinyan/aster-ui/core`）

### 4.1 容器、表面与排印
- `AfCard`（及组合原语 `AfCardHeader`、`AfCardTitle`、`AfCardDescription`、`AfCardContent`、`AfCardFooter`）：单层发丝环卡片（`flush`、`fill`、`loading`、`interactive`、`selected`）
- `AfSurface`：层级表面容器（`level="canvas \| surface \| raised \| sunken \| overlay"`、`padding`、`radius`、`tokens`）
- `AfTypography` / `AfTitle` / `AfText` / `AfParagraph`：标准字号阶梯、语义色调、`numeric` 等宽数字、`ellipsis` 单/多行省略、`copyable`
- `AfDivider` / `AfSeparator`：`1px` 横/纵分隔线与嵌入标签
- `AfScrollArea`：悬浮细滚动条与边缘渐隐遮罩容器
- `AfResizableGroup` / `AfResizablePanel` / `AfResizableHandle` / `AfSplitter` / `AfSplitterPanel`：可拖拽调宽分栏与折叠面板

### 4.2 导航与结构化数据
- `AfTabs`：滑动下划线/胶囊标签页（自动唯一 ARIA ID）
- `AfBreadcrumb`：路径面包屑（超长自动折叠下拉菜单）
- `AfPagination`：恒定槽位页码器与每页条数切换
- `AfSteps`：步骤条（`number / dot / bar`）
- `AfTree` / `AfTreeView`：WAI-ARIA 树形导航（级联复选、搜索高亮、首字母速查）
- `AfTable` / `AfTablePro` / `AfTableColumn`：三态排序、行勾选、固定列、展开行/树形行、列宽拖拽、虚拟滚动（零斑马纹）
- `AfDescriptions`：纯 Flexbox 1/2/3 列描述列表
- `AfKeyValue`：紧凑详情键值行
- `AfTimeline`：垂直时间轴（`left / alternate / right`、`pending`）
- `AfAccordion` / `AfCollapse` / `AfExpand`：原生 `<details>` 高度插值折叠面板

### 4.3 指标、状态、代码与媒体
- `AfStat`：等宽数值指标卡（前缀/后缀、趋势标签、内嵌微折线）
- `AfMeterBar`：多段配比计量条与图例联动高亮
- `AfProgress` / `AfProgressRing`：线性与环形进度指示器
- `AfSparkline`：交互式微折线（指针磁吸游标与顶部读数胶囊）
- `AfNumber` / `AfCountdown`：平滑数值与多级阈值告警倒计时
- `AfTag` / `AfOverflowTagList` / `AfBadge` / `AfStatus`：语义标签、单行自适应 `+N` 折叠标签组、角标与呼吸状态点
- `AfAvatar` / `AfAvatarStack` / `AfAppMark`：人物圆头像、叠放头像组与圆角应用图标容器（含在线/未读角标）
- `AfKbd` / `AfCode` / `AfCodeBlock` / `AfDiffView`：快捷键键帽、行内代码、语法高亮代码块与 Unified/Split 代码差异视图
- `AfAlert` / `AfEmptyState` / `AfSpinner` / `AfSkeleton` / `AfThinking`：行内横幅、空态引导、加载旋转、GPU 流光骨架与思考指示
- `AfCopyButton` / `AfQrCodeCard` / `AfChartTooltip`：非禁用态剪贴板按钮、本地矢量二维码四态卡、图表浮窗表面
- `AfImage` / `AfImagePreview` / `AfSpriteImage` / `AfLayeredImage`：多图缩放灯箱（滚轮缩放/旋转/镜像/棋盘格）、精灵切片与多层合成

---

## 5. L3 · 浮层与命令式反馈（`@fangxinyan/aster-ui/core`）

- `AfPopover`：四向自适应翻转锚定气泡（支持 `flush`、`placement`、`open/onOpenChange`）
- `AfHoverCard`：悬停富信息预览卡（`role="tooltip"`、不抢夺焦点）
- `AfTooltip`：轻提示气泡（平滑入退场与自动翻转）
- `AfMenu` / `AfDropdownMenu` / `AfContextMenu`：滑动高光下拉菜单、右键菜单与多级子菜单
- `AfModal` / `AfDialog` / **`afModal`**（`AfModal.confirm / info / success / warning / error / destroyAll`）：模态框与全局命令式确认总线（遮罩防误触关窗、异步 `onOk` loading 守卫）
- `AfAlertDialog` / `AfConfirmProvider` / `useAfConfirm`：高风险二次确认框（默认聚焦安全取消项）
- `AfDrawer` / `AfSheet`：左/右/底三向滑出抽屉
- `AfCommandPalette`：全局快捷键命令面板（多级子栈与分组检索）
- `AfToastProvider` / `useAfToast`：右下角堆叠通知（悬停展开暂停、Promise 变形）
- `AfMessageHost` / **`afMessage`**（`info / success / warning / error / loading / dismissByKey / destroy`）：顶部轻提示总线（由 `AsterThemeProvider` 自动挂载）

---

## 6. L4 · 主题引擎、桌面宿主原语与 Hooks

- **主题与跨 Root 桥接（`@fangxinyan/aster-ui/core` & `/theme` & `/runtime`）**：`AsterThemeProvider`、`useAsterTheme`、`resolveAsterThemeColors`、`AfThemePanel`、`AfTitleBar`、`AfWindowControls`、`createAsterPluginRuntime`、`AfPluginProvider`
- **图标体系（`@fangxinyan/aster-ui/icons`）**：`AfIcon`、`AfPaintedIcon`、`AF_ICON_ALIASES`、`NAMED_ICON_MAP`、`isAfIconName`、`resolveAfIconName`
- **交互与窗口原语（`@fangxinyan/aster-ui/primitives`）**：
  - 浮层与聚焦：`AfLayerProvider`、`AfPortal`、`useAfLayerContainer`、`useAnchoredPopover`、`useOverlayFocusTrap`、`useExitTransition`
  - 列表与拖拽：`AfHoverList`、`installAfListHover`、`useMenuHighlight`、`useKeyedHighlight`、`useFlip`、`useListFlip`、`useAnimatedList`、`useSortableList`、`usePointerDragBoard`
  - 表单与通用：`cn`、`copyToClipboard`、`useControllableState`、`useImeEnterGuard`、`useReducedMotion`、`usePointerScrub`、`useOverflowCollapse`、`useAutoScrollStick`、`useStreamingTokens`、`useCanvasZoomPan`、`AfSlot`
  - Electron 窗口辅助：`useWindowAutoSize`、`useWindowPointerDrag`、`useHitAreaCollector`、`hitTestPoint`、`useTwoPhaseWindowTransition`、`useReversibleEdgePeek`、`useHoverIsolatedTimers`

---

## 7. L5 · 高阶数据与动效原语

- **`@fangxinyan/aster-ui/ui-pro`（`ui-pro.css`）**：
  - 组件：`AfSwap`（异构高度过渡）、`AfTray`（弹性托盘）、`AfSaveBar`（脏数据保存浮栏）、`AfLineChart`（SVG 匀速描边折线图）、`AfBreakdown`（多段明细）、`AfRankList`（排行条）、`AfUsageMeter`（用量配额表）、`AfDecisionRecord`（审批收据条）
  - Hooks：`useTween`、`useTweens`、`useFlip`、`useListFlip`、`useInputModality`
- **`@fangxinyan/aster-ui/motion`（`motion.css`）**：
  - `AfBlurCrossfade`、`AfNumberTicker`、`AfShimmerLoader` / `AfShimmerText` / `AfShimmerSkeleton`、`AfTextReveal`、`AfGridBackground`、`AfGradientText`、`AfGradientFloor`、`AfTiltCard`、`AfLogoMarquee`、`AfTestimonialWall`

---

## 8. L6 · 领域复合模式（Patterns，`@fangxinyan/aster-ui/patterns/*`）

| 子路径 | 数量 | 包含组件 |
| --- | --- | --- |
| `patterns/inputs` | 7 | `AfFilterMenu`、`AfPromptLibrary`、`AfStepperForm` (+子件)、`AfBillingSchedule`、`AfIntegrationSettings`、`AfProfileMenu`、`AfIntegrationPicker`、`AfCommandMenu` |
| `patterns/chat` | 11 | `AfChatComposer`、`AfAiAnswer`、`AfCitedAnswer`、`AfModelPicker`、`AfThinkingState`、`AfThinkingLoader`、`AfWritingAssistant`、`AfCommentsPanel`、`AfCommentThread`、`AfMessageActions`、`AfReactionBar` |
| `patterns/data` | 16 | `AfDataTable`、`AfBreakdownChart`、`AfCompactBreakdown`、`AfExperimentCard`、`AfKpiChart`、`AfUsageMeter`、`AfProjectCard`、`AfChangeSummary`、`AfSmartRecommendation`、`AfTipsPanel`、`AfProgressTracker`、`AfSetupGuide`、`AfEmailDraft`、`AfDecisionInbox`、`AfNotificationStack`、`AfToaster` / `afToast` |
| `patterns/agents-a` | 9 | `AfAgentCursors`、`AfAgentGraph`、`AfAgentLanes`、`AfAgentPlan`、`AfAgentQueue`、`AfAgentSteering`、`AfAgentTree`、`AfAutonomyDial`、`AfDelegateBoard` |
| `patterns/agents-b` | 11 | `AfAgentInbox`、`AfApprovalCard`、`AfPermissionRequest`、`AfContextWindow`、`AfTraceWaterfall`、`AfDecisionTree`、`AfInlineDiff`、`AfMemoryPanel`、`AfReviewCenter`、`AfToolCallCard`、`AfToolCallGroup` |
| `patterns/agents-c` | 14 | `AfRunControls`、`AfDiffTimeline`、`AfRateLimitPlanner`、`AfAgentCheckpoints`、`AfAgentMonitor`、`AfAgentTrail`、`AfRunningNow`、`AfScheduledRuns`、`AfAgentRecap`、`AfAwaySummary`、`AfAgentFindings`、`AfAgentFleet`、`AfAgentHandoff`、`AfAgentLedger` |
| `patterns/agents-d` | 16 | `AfApprovalGates`、`AfCollaborationStream`、`AfConflictRadar`、`AfContextMap`、`AfCostWaterfall`、`AfDecisionCard`、`AfFallbackChain`、`AfFanOutGrid`、`AfJudgeBracket`、`AfParallelAttempts`、`AfPlanVsActual`、`AfRootCauseTree`、`AfToolAccessMap`、`AfAgentCrew`、`AfAgentSequence`、`AfFlowBuilder` |

---

## 9. L7 · 整块、整页与交互插画（Blocks / Screens / Illustrations）

- **14 套高阶业务区块（Blocks）**：
  - `patterns/project`（8）：`AfAgentGallery`、`AfAppDirectory`、`AfClientContext`、`AfLiveSession`、`AfMissionControl`、`AfMissionTimeline`、`AfRunInspector`、`AfTaskBoard`
  - `patterns/data`（4）：`AfKpiBoard`、`AfMetricsDashboard`、`AfInvoiceCredit`、`AfPricingPlans`
  - `motion`（2）：`AfLogoMarquee`、`AfTestimonialWall`
- **43 套整页级应用界面（Screens，按需样式 `@fangxinyan/aster-ui/screens/*.css`）**：
  - `screens-onboarding`（7）：`AfAppShellInset`、`AfAppShellFlat`、`AfOnboarding`、`AfOnboardingWebsite`、`AfOnboardingBrand`、`AfOnboardingTone`、`AfOnboardingReady`
  - `screens-settings`（9）：`AfSettingsGeneral`、`AfSettingsMembers`（`AfSettingsTeams`）、`AfSettingsModels`、`AfSettingsNotifications`、`AfSettingsPreferences`、`AfSettingsPrivacy`、`AfSettingsProfile`、`AfSettingsSecurity`、`AfSettingsSubscription`（`AfSettingsBilling`）
  - `screens-workspace`（7）：`AfAnalytics`、`AfCrm`、`AfEvals`、`AfFiles`、`AfFolder`、`AfIntegrations`、`AfKanban`
  - `screens-chat`（7）：`AfAssistantHome`、`AfAssistantOverview`、`AfAgentChat`、`AfAgentChatProgress`、`AfAgentChatRail`、`AfAgentRun`、`AfAgentThread`
  - `screens-agent-ops`（7）：`AfAgentActivity`、`AfAgentMemory`、`AfAgentPermissions`、`AfAgentSchedules`、`AfAgentSkills`、`AfAgentUsage`、`AfAgents`
  - `screens-agent-runs`（6）：`AfAgentInboxBoard`、`AfAgentOrchestration`、`AfAgentRunDetail`、`AfAgentTasks`、`AfInbox`、`AfWorkflowBuilder`
- **26 套交互式场景插画（按需样式 `@fangxinyan/aster-ui/illustrations/*.css`）**：
  - `illustrations-a`（13）：`AfAgentTeam`、`AfCoverFlow`、`AfEmptyCalendar`、`AfEnrichmentOrbit`、`AfGhostedChat`、`AfGlassFolder`、`AfFrostCloud`、`AfGlowCloud`、`AfGlowKeyboard`、`AfInspectAgentCard`、`AfInspectComposer`、`AfIntegrationBeam`、`AfIntegrationFlow`
  - `illustrations-b`（13）：`AfIntegrationGrid`、`AfLayerStack`、`AfLeadSourcing`、`AfLogoCluster`、`AfModelWheel`、`AfOutreachBranches`、`AfProjectFlow`、`AfRegionDach`、`AfSideFolder`、`AfTabOverload`、`AfTeamInvite`、`AfVoiceOrb`、`AfWorldMap`
