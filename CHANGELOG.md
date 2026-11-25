# Changelog

All notable changes to `@fangxinyan/aster-ui` are documented in this file following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.6.0] - 2026-11-25

### Added
- **Core Layout & Semantic Spacing System (`@fangxinyan/aster-ui/core` & `core.css`)**:
  - Added 9 zero-business-logic, 100% Flexbox layout primitives: `AfPage`, `AfPageHeader`, `AfSection`, `AfStack`, `AfInline`, `AfColumns`, `AfToolbar`, `AfListRow`, and `AfSpacer`.
  - Added 9-tier semantic spacing tokens (`--af-space-micro` through `--af-space-page-lg`), row padding tokens (`--af-row-pad-x`, `--af-row-pad-y`), and page max-width tokens (`--af-page-max-narrow`, `--af-page-max-medium`, `--af-page-max-wide`) in `tokens.css` with automatic `[data-density="compact"]` scaling.
  - Added an interactive `Layout & Spacing Guide` showcase page (`?component=layout-guide`) demonstrating pure Core composition recipes, live density/radius/blueprint toggles, spacing rulers, and anti-pattern comparisons.
- **Full Component Catalog & Composition Guidelines**:
  - Added `COMPONENTS.md` (included in the published npm tarball) indexing all 259 general-purpose component and scene specs across L0–L7 with entry paths, CSS subpaths, and selection guidance.
  - Expanded `DESIGN.md` and `AGENTS.md` with semantic spacing tables, page width tiers, pure Core composition recipes, surface nesting laws, same-row control height parity, and button-ordering rules.

### Changed
- Moved generic host primitives `AfTitleBar`, `AfWindowControls`, and `AfThemePanel` into the core controls showcase group while keeping all 8 Pro Blocks, 43 Screens, 26 Illustrations, and generic interaction primitives intact.

### Fixed
- Stretched direct form inputs/selects (`AfInput`, `AfSelect`, `AfNumberInput`, `AfAutoComplete`, `AfCascader`) to `width: 100%` inside vertical and multi-column `AfForm` layouts for flush column alignment.

### Removed
- Removed project-specific custom suites (`patterns/store`, `patterns/workbench`, 13 project-specific `AfProject*` / `AfSettingsLayout` components, and custom multi-window host shells such as `AfAppDock`, `AfDesktopTools`, `AfInstallerWizard`, `AfEdgeNotificationOverlay`, `AfSubwindowChrome`, `AfRecoveryLockShell`, and `AfWindowFrame`) to keep the library purely general-purpose.

## [0.5.1] - 2026-11-18

### Added
- **Imperative Modal Bus (`afModal` / `AfModal.confirm`) & Declarative Modal Actions**:
  - Added singleton `afModal` (`confirm`, `info`, `success`, `warning`, `error`, `destroyAll`) attached directly to `AfModal` and exposed on `createAsterPluginRuntime` (`runtime.modal` / `runtime.shared.modal`), with `<AfModalHost>` auto-mounted inside top-level `AsterThemeProvider` (`.af-portal-root`).
  - Imperative handles implement `Promise<boolean> & { destroy, close }` for both `await AfModal.confirm(...)` and manual `dialog.destroy()` workflows with `160ms` exit transitions and async `onOk` loading guards.
  - Added optional built-in confirmation footer props (`onOk`, `onCancel`, `okText`, `cancelText`, `confirmLoading`, `okButtonProps`, `cancelButtonProps`, `escClosable`, `maskStyle`, `bodyProps`) and headerless `aria-label` / `aria-labelledby` support on `<AfModal>`.
- **Icon Registry & Validation Helpers**:
  - Added `SettingOutlined` and 24 additional standard named icon components to `@fangxinyan/aster-ui`, `/core`, `/icons`, and `NAMED_ICON_MAP`, plus `barChart`, `picture`, `sync`, and semantic aliases in `AF_ICON_ALIASES`.
  - Exported `isAfIconName` and `resolveAfIconName` helper utilities.
- **Desktop Form, Overlay & Media Control Refinements**:
  - Enhanced `AfSelect` (`aria-label`, `aria-labelledby`, `showSearch`, `selectedRender`, `optionExtraRender`, `emptyContent`, `popupClassName`, `popupStyle`, `listHeight`) and `AfCascader` (`aria-label`, `aria-labelledby`, `showSearch` with custom path `filter`, `optionRender`, `selectedRender`, `popupClassName`, `listHeight`).
  - Enhanced `AfDrawer` (`size`, `extra`, `bodyOverflow`), `AfPopover` (`placement` 12-way shorthand & `overlayClassName`), `AfTooltip` (`overlayClassName`), and `afMessage` (`title` & smooth `dismiss` / `dismissByKey` exit transitions).
  - Enhanced `AfCheckbox`, `AfRadio` (`AfRadio.Group`), `AfRadioGroup` (`direction`, `size`, `aria-*`), `AfNumberInput` (`onFocus`, `onBlur`, `aria-*`), `AfSlider` (`aria-label`, `onKeyUp`, `onBlur`), `AfDatePicker` (controlled `open` / `onOpenChange`, `allowClear`), and `AfTabs` (`aria-label`, alias icon support).
  - Enhanced `AfTable` / `AfTablePro` (`scroll={{ x, y }}`, `scrollY`, `tableProps`), `AfSplitter` (`forwardRef`, `secondMin`, pane/handle class & style slots, `onResize`, `onResizeEnd`), `AfSpriteImage` (`sprite` slice & `scale` transform), `AfLayeredImage` (per-layer `fit`, `inset`, `style`, and `<img>` attributes), `AfText` (`ellipsis` & non-disabling `copyable`), `AfTag` (`removable`, `onRemove`, `bordered={false}`), `AfAvatar` (`initials`), and `AfProgress` (`max`, `showValue`, `indeterminate`).

## [0.5.0] - 2026-11-18

### Added
- **Multi-Window Runtime, Transparent Shells & Plugin Bridge**:
  - Upgraded `AsterThemeProvider` with `transparent` root canvas support (`#00000000` while preserving solid `.af-portal-root` overlays), `target="scope" | "document"`, `storage={false | AsterThemeStorage}`, and controlled IPC theme synchronization.
  - Added side-effect-free `@fangxinyan/aster-ui/runtime` entry and `createAsterPluginRuntime` / `AfPluginProvider` singleton bridge sharing theme, portal layer, toast, message, and confirm contexts across isolated `createRoot` plugin trees.
  - Added Electron window & interaction primitives in `@fangxinyan/aster-ui/primitives`: `useWindowAutoSize`, `useWindowPointerDrag`, `useHitAreaCollector` (`hitTestPoint`), `useTwoPhaseWindowTransition`, `useReversibleEdgePeek`, `useHoverIsolatedTimers`, `useAnimatedList`, `useSortableList`, `usePointerDragBoard`, `usePointerScrub`, `useStreamingTokens`, `useOverflowCollapse`, `useAutoScrollStick`, and `useCanvasZoomPan` (`computeCursorAnchoredPan`).
  - Delivered complete multi-window host shells in `@fangxinyan/aster-ui/patterns/shell`: upgraded `AfAppDock` (`46px` compact rail scroll masks, pointer-capture reorder, `Alt+Arrow` keyboard sorting, context menu, store/settings footer), upgraded `AfDesktopTools` (reversible edge peek & hit-area reporting), upgraded 4-step controlled `AfInstallerWizard` (`normalizeInstallDirectory`, `AfRunningProcessesDialog`, `AfViewportFitStage`), and added `AfEdgeNotificationOverlay`, `AfSubwindowChrome` (`floating | popover | overlay`), and `AfRecoveryLockShell`.
- **Store & Trading Market Pattern Suite (`@fangxinyan/aster-ui/patterns/store`)**:
  - **Built-in Client Store & Public Showcase**: Added `AfStoreHeaderBar`, 8-state controlled `AfProjectStoreCard`, `AfStoreAppDetailDrawer`, `AfStoreUpdatesWorkspace`, 7-state `AfProjectDownloadRow` + `AfStoreTaskShelf`, `AfStoreAuthModal`, `AfStoreHeroStage` (`detectClientStorePlatform`), and `AfStorePlatformMatrix`.
  - **Publisher Admin Console**: Added `AfReleaseChangelogEditor` (`bumpSemverVersion`), `AfChunkedPackagePublisher` (with embedded `AfInlineDiff` manifest permission review), `AfAppGrantEditor`, `AfJobStageTimer` (`formatStageMs`), and `AfLogTailViewer`.
  - **Trading Market Suite**: Added `AfMarketFilterBar`, `AfMarketListingView` (`table | rows | split`), `AfCanvasViewportShell`, `AfMarketGoodsModal`, `AfCashierModal`, `AfConsignmentCalculator` (`calculateConsignmentFee`, `solveListingPriceFromNet`), `AfAccountAssetMatrix`, and `AfEdgeIdentityRail`.
- **Professional Workbench Pattern Suite (`@fangxinyan/aster-ui/patterns/workbench`)**:
  - **Vision & Multimedia**: Added `AfScreenCaptureOverlay` (Flexbox 4-way cutout mask, 8-handle resize, edge-avoiding `7×7` pixel loupe, auto-flipping toolbar), `AfImageCompareStage` (5-mode compare with shared `useCanvasZoomPan` side-by-side sync & split wipe), `AfTimelineTrackEditor` (`formatTimecode30Fps`, multi-track `6px` trim & magnetic snap), and `AfAspectPreviewStage`.
  - **Document & System Governance**: Added `AfSectionOutline`, `AfDocumentPageCanvas` (A4 zoom & page-break overflow warning), `AfProcessPickerModal`, `AfRuleChainList` (`evaluateRuleChain` live rule-hit simulator), `AfServerMetricPanel`, and `AfQuotaFloatCard`.
- **Core Component Deep Enhancements**:
  - Added `AfAppMark`, `AfOverflowTagList`, `AfHotkeyInput`, `AfCountdown`, `AfQrCodeCard`, and `AfDateTimeRangePicker`; upgraded `AfTable` (tri-state sort, sticky columns, expandable/tree rows), `AfNumberInput` (pointer scrub, `commitMode`, `unitOptions`), `AfResizableGroup`, `AfAutoComplete`, `AfDatePicker` / `AfTimePicker` (`zh-CN` / `en-US`), `AfDropzone`, `AfImagePreview`, `AfTree`, and interactive `AfSparkline`.

- **268-Spec Full Component & Scene Matrix**:
  - **Core Controls & Promoted Inputs**: Added `AfMeterBar`, `AfDiffView`, `AfSteps`, `AfTree`, `AfStat`, `AfDescriptions`, and `AfRating` (`stars` / `thumbs` / half-star / read-only), alongside `AfTabs`, `AfContextMenu`, `AfColorPicker`, `AfChipInput` (`AfTagInput`), `AfProgressRing`, `AfCombobox`, `AfOtpInput`, `AfDropzone` (`AfUpload`), `AfDatePicker`, `AfDateRangePicker`, and `AfDateRange` in `@fangxinyan/aster-ui/core`.
  - **14 Composite Blocks**: Added `AfLogoMarquee`, `AfTestimonialWall`, `AfKpiBoard`, `AfMetricsDashboard`, `AfInvoiceCredit`, `AfPricingPlans`, `AfAgentGallery`, `AfAppDirectory`, `AfClientContext`, `AfLiveSession`, `AfMissionControl`, `AfMissionTimeline`, `AfRunInspector`, and `AfTaskBoard`.
  - **43 Full-Page Application Screens**: Added dual app shells (`AfAppShellInset`, `AfAppShellFlat`), 5 Onboarding flows (`AfOnboarding*`), 9 Settings screens (`AfSettings*`), 7 Workspace productivity screens (`AfAnalytics`, `AfCrm`, `AfEvals`, `AfFiles`, `AfFolder`, `AfIntegrations`, `AfKanban`), 7 AI Assistant & Chat screens (`AfAssistantHome`, `AfAssistantOverview`, `AfAgentChat`, `AfAgentChatProgress`, `AfAgentChatRail`, `AfAgentRun`, `AfAgentThread`), 7 Agent Ops & Governance screens (`AfAgentActivity`, `AfAgentMemory`, `AfAgentPermissions`, `AfAgentSchedules`, `AfAgentSkills`, `AfAgentUsage`, `AfAgents`), and 6 Agent Runs & Workflow screens (`AfAgentInboxBoard`, `AfAgentOrchestration`, `AfAgentRunDetail`, `AfAgentTasks`, `AfInbox`, `AfWorkflowBuilder`).
  - **18 Desktop Workbench & Host Shell Components**: Added `AfAppDock`, `AfDesktopTools`, `AfInstallerWizard`, `AfSettingsLayout` (`AfSettingsPage`, `AfSettingSection`, `AfSettingRow`), and `AfProject*` workbench cards/rows/toolbars alongside Electron frameless `AfTitleBar`, `AfWindowControls`, and `AfThemePanel`.
  - **8 Signature Motion Primitives & 26 Interactive Illustrations**: Added `AfShimmerText`, `AfShimmerSkeleton`, `AfBlurCrossfade`, `AfNumberTicker`, `AfShimmerLoader`, `AfTextReveal`, `AfGridBackground`, `AfGradientText`, `AfGradientFloor`, `AfTiltCard`, and 26 interactive scenes across `illustrations-a` and `illustrations-b`.
- **Dual-Entry Closure & Granular Subpath Exports**:
  - Module-preserving ESM (`dist/esm/**/*.js` + JSDoc-retaining `.d.ts`) and CommonJS (`dist/cjs/**/*.cjs` + `.d.cts`) builds supporting component-level tree-shaking across `NodeNext`, `Bundler`, and `Node10`.
  - Standalone `@fangxinyan/aster-ui/core` closure exporting all base controls, `AsterThemeProvider` / `useAsterTheme` theme primitives, `AfTitleBar` / `AfWindowControls` / `AfThemePanel` host shell primitives (`core.css`), `cn`, and safe async `copyToClipboard`.
  - Added symmetric `@fangxinyan/aster-ui/ui-pro` JS/TS export alongside `@fangxinyan/aster-ui/patterns/*`, `@fangxinyan/aster-ui/patterns/*.css`, `@fangxinyan/aster-ui/screens/*.css`, and `@fangxinyan/aster-ui/illustrations/*.css` standalone stylesheets.
- **Deterministic Architecture & Release Quality Gates**:
  - Upgraded `npm run lint:arch` to 12 rules covering strict `.af` CSS selector containment, universal `@media (prefers-reduced-motion: no-preference)` blur guards, integer `1px` anti-vanishing hairline borders, `@fangxinyan/aster-ui/core` dependency isolation, Flexbox-only layout, and public-release source sanitization.
  - Upgraded `npm run check:pkg` to 7 stages verifying `npm pack` allowlist (including `DESIGN.md`), package metadata, all 17 JS & 23 CSS export subpaths, zero-warning Node SSR across all zero-required-prop components (including all 26 illustrations and 43 screens), `README.md` TypeScript snippet compilation, and `esbuild` tree-shaking budgets.
  - Added `tsconfig.test.json` so `npm run typecheck` strictly validates both `src/` and `tests/` with isolated ambient `types`.

### Fixed
- Preserved continuous `<circle data-done="true" />` mount during `0%` transitions in `AfProgressRing` and auto-rebound non-passive `wheel` listeners across conditional viewport mounts in `useCanvasZoomPan`.
- Enforced 15 static architecture rules in `npm run lint:arch` (including zero HTML5 `draggable`, zero `0.5px` hairlines, zero double card borders, and `preserve-3d` anti-flattening).
- Decoupled `AfDatePicker`, `AfDateRangePicker`, and `AfDateRange` from static demo dates so uncontrolled `AfDatePicker` preserves its placeholder (`defaultValue = null`) and calendar defaults track runtime local today (`getLocalToday()`).
- Unified clipboard interactions around async `copyToClipboard` with `execCommand("copy")` fallback and unmount timer cleanup, eliminating unhandled promise rejections and false-positive copied states.
- Replaced raw `useLayoutEffect` and unstable RAF dependencies in `AfIntegrationBeam` and cleaned up async install timers/RAFs in `AfAgentSkills` for warning-free SSR and leak-free unmounts.
- Scoped all library CSS rules strictly under `.af` / `:where(.af)` and wrapped all CSS and inline `blur(...)` filters in reduced-motion guards.

## [0.4.0] - 2026-11-12

### Added
- 27 parameterized Agents Pro components (`patterns/agents-c`, `patterns/agents-d`), `AfHoverCard`, `AfToggleGroup`, `AfCodeBlock`, `AfDropdownMenu`, `AfSeparator`, `AfDialog`, and natural-time parsing (`parseNaturalTime`).
- Dedicated `@fangxinyan/aster-ui/examples` entry isolating domain reference patterns from primary component prop contracts.

## [0.3.0] - 2026-11-10

### Added
- Full desktop workbench parity components (`AfForm`, `afMessage`, `AfSplitter`, `AfTablePro`, `AfTimeline`, `AfImage`, `AfTypography`, `AfSurface`, `AfTitleBar`, `AfWindowControls`, `AfThemePanel`) and `AF_ICON_ALIASES`.
- Initial library build pipeline producing standalone `styles.css`, `core.css`, and `tokens.css` bundles.
