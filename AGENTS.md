# Aster UI · Agent 工程与设计防走偏准则 (`AGENTS.md`)

> 单一事实来源：完整视觉令牌、组件交互契约与迁移映射详见 [`DESIGN.md`](./DESIGN.md)。  
> 适用范围：`Aster UI` 全量组件开发、affectUI Clean / Pro 复刻对齐、以及定制组件（`src/components/project/*`、`src/components/shell/*`、`src/components/store/*`、`src/components/workbench/*`）迭代维护。  

---

## 1. 模块分层与导入红线（Bundle Boundaries）

1. **双入口边界**：
   - `@fangxinyan/aster-ui/core`（`src/ui.tsx` + `src/ui.css` + `src/components.css` + `src/components/shell/core-shell.css`）：基础控件与轻量宿主原语（含 `AsterThemeProvider`、`TitleBar`、`ThemePanel`）。**`src/ui.tsx` 链路下的任何文件严禁反向 `import` `src/ui-pro.tsx` 或 `src/patterns/*`**。
   - `@fangxinyan/aster-ui`（`src/index.ts`）：完整包，汇总 `./ui`、`./ui-pro`（`useTween`、`useTweens`、`AfSwap`、图表与动效原语）、Patterns、Blocks、Screens 与全部定制组件。
2. **零舞台耦合**：`src/` 内严禁引用展示站 `StageContext` / `useStage`；所有浮层必须通过 `useAfLayerContainer()` 挂载至 `.af-portal-root`，严禁直接 `createPortal(..., document.body)`。

---

## 2. 视觉、边框与特效十条高压红线（Anti-Regression Red Lines）

1. **严禁边框消失或双层重影（No Vanishing or Double Borders）**：
   - 卡片描边环 `--af-card-ring` / `--af-ring` 必须使用半透明叠色（`rgba(0,0,0,0.08)` / `rgba(255,255,255,0.08)`），禁止写实色 `#ebebeb`（在 `#f7f7f7` 画布与侧栏上会融化消失）；严禁同时声明 `border: 1px solid` 与 `var(--af-shadow-card)` 造成双层发虚边框。
   - 分隔线与内嵌槽描边统一使用整数 **`1px` + `var(--af-line)`**（`inset 0 1px 0 var(--af-line)`、`inset 0 -1px 0 var(--af-line)`、`inset 0 0 0 1px var(--af-line)`），**全仓严禁写 `0.5px` + `var(--af-line)`**（Windows 1x/1.25x DPI 下会舍入为 `0px`）。
   - 双栏面板（如 `AfSettingsLayout`、`AppDock` 舞台）采用 **Inset 内嵌圆角画布**：外框 `--af-canvas` + `var(--af-shadow-card)`，右侧主区留 `6px` 边距并独立赋予圆角与 `0 0 0 1px var(--af-ring)`。
   - 滚动父容器必须留出 `>= 2px–6px` 安全内边距；尺寸形变容器（`AfSwap` / `AfBlurCrossfade` / `AfTray`）严禁写 `overflow: hidden` 削掉子卡片 `1px` 外阴影环，必须使用 `overflow: clip; overflow-clip-margin: 8px–12px`。
2. **严禁卡片与行点击缩小（Zero Card Click-Shrink）**：
   - 卡片、列表行、导航项、设置行、指标卡严禁声明 `:active { transform: scale(...) }`。
3. **严禁列表项独立跳色（Sliding Hover Thumb Only）**：
   - 纵向列表、侧栏导航、设置分组行、通知/下载/规则/应用行统一接入 `data-af-hover-list="hover" | "wash"`（非直接按钮/列表项子元素加 `data-af-hover-item`），删除单行 `:hover { background }`，由全局 GPU `::before` 滑块提供初入淡入（零飞入）与跨行平滑跟随；窗口/容器 `ResizeObserver` 尺寸重算时胶囊/底块必须同步贴合，禁止带过渡滞后追赶。
4. **严禁 `0ms` 生硬开闭与瞬删（Zero Hard Cuts on Enter & Exit）**：
   - 所有弹窗、菜单、子菜单、`Tooltip`、以及 `anchorRef` 锚定下拉层（`Select` / `Cascader` / `Picker` / `AutoComplete`）必须具备 `160ms–200ms` 入场 **与 `115ms–150ms` 退场过渡**（关闭期冻结锚点坐标与内容快照，严禁 `{open && ...}` 瞬卸）；同浮层切节点绑定 `key={selectedId}`。
   - 受控与非受控列表移除、叠卡关闭、消息队列消失均须先标 `[data-leaving="true"]` 执行 `180ms–220ms` 退场，再触发 `useListFlip`（`260ms var(--af-ease)`）升位。
5. **100% Flexbox 布局 & 零斑马纹**：
   - 全仓 CSS 严禁 `display: grid` / `inline-grid`，严禁 `:nth-child(even|odd|2n)`。弹性文本容器必加 `min-width: 0`。
6. **模糊、跑马灯与减动效优雅降级**：
   - 过渡性动态 `filter: blur(...)` / `backdrop-filter: blur(...)` 与 `::details-content` 展开过渡必须置于 `@media (prefers-reduced-motion: no-preference)` 内；在 `prefers-reduced-motion: reduce` 下，静态网格弥散层必须保留柔和渐变兜底（严禁暴露裸多边形锯齿），跑马灯（`Marquee`）必须默认静止。
7. **等宽数字、级联滚轮与光学对齐**：
   - 指标、配额、百分比、金额、耗时一律声明 `font-variant-numeric: tabular-nums`；紧凑胶囊内数字与箭头混排必须用 `inline-flex` + `<svg>` 几何居中，严禁裸拼偏置 Unicode `⌄`；数字滚轮按十进制位权右对齐赋 `key` 并支持进位联动，严禁对 `useTweens` 输出二次套用 `useTween`。
8. **鼠标零焦点闪框**：
   - 保持 `[data-modality="pointer"]` 下无点击蓝框，仅键盘导航显示 `--af-focus`；严禁写 `transition: outline-color`。
9. **3D 视差、流光与 SVG 描边物理铁律**：
   - `transform-style: preserve-3d` 元素严禁同层声明 `overflow: hidden/clip`（圆角裁切下沉至背景子层），且 `pointermove` 实时跟手帧内必须关闭 CSS `transition`；骨架屏流光禁用 `background-attachment: fixed`，统一用伪元素 `transform: translate3d` 扫光；SVG 路径动画统一用 `pathLength="1"` + `stroke-dashoffset` 匀速描边，图表游标初入原地淡入（零横穿飞入）。
10. **禁用原生 HTML5 `draggable` 幽灵拖拽 & 零私有色值孤岛**：
   - 看板、Dock、规则链、列表调序一律使用 `Pointer Events + setPointerCapture` + 兄弟节点 FLIP 让位；`src/patterns/*` 复刻组件严禁残留不随主题切换的裸 HEX 色值孤岛。

---

## 3. affectUI 动效原语速查表（定制组件必选底座）

设计或重构任何定制组件时，优先组合以下原语以保持与复制自 affectUI 的组件 100% 同源手感：

| 交互场景 | 标准原语 / 写法 | 关键曲线与时长 |
| --- | --- | --- |
| 侧栏 / 设置行 / 列表悬停 | 容器 `data-af-hover-list="hover" \| "wash"` + 行 `data-af-hover-item` | 初入 `80ms ease-out` 淡入；跨行 `100ms var(--af-ease)` `translate3d` |
| 状态快筛 / 时间窗 / 策略切换 | `<AfSegmented size="xs" \| "sm">` | 激活白底胶囊平滑横移 `240ms var(--af-ease)` |
| KPI / 配额 / 容量 / 进度读数 | `useTween` / `useTweens`（来自 `src/ui-pro.tsx`）+ `tabular-nums` | `420ms–500ms` 四次方 `ease-out` 同步插值 |
| 多段配比条与图例联动 | 悬停项设 `data-dim="true"` 将其余段/图例退暗至 `opacity: 0.35` | `180ms ease` 透明度联动 + `420ms var(--af-ease)` 宽度过渡 |
| 微折线（Sparkline）检视 | 指针移动计算最近采样点，渲染垂直参考线 + 圆点 + 顶部读数胶囊 | 实时磁吸响应，离开恢复默认环比胶囊 |
| 页签 / 步骤 / 二级面板切换 | 单一内容包裹节点绑定 `key={activeKey}` 触发 `af-pj-panel-in`（避免幽灵双节点干扰测试选择器），异构块用 `<AfSwap>` | `180ms–220ms var(--af-ease)`（`opacity: 0.38; translateY(4px)` → `1`） |
| 队列删除 / 通知忽略 / 叠卡已读 | 先标 `data-leaving="true"` 退场，定时器回调内 `flip.capture()` 并删项 | 退场 `180ms–220ms var(--af-ease)` + 补位 `260ms var(--af-ease)` |
| `<details>` 归档 / 策略 / 日志 | `@media (prefers-reduced-motion: no-preference)` 下 `interpolate-size: allow-keywords` + `::details-content` | `block-size 240ms var(--af-ease), opacity 180ms ease, content-visibility 240ms allow-discrete` |
| 下拉框 / 子菜单 / 气泡退场 | `useExitTransition`（冻结关闭前锚点与数据快照）+ `[data-closing]` | 入场 `160ms–180ms var(--af-ease)`；退场 `115ms–140ms ease-in` |
| 看板卡片 / Dock / 规则拖拽排序 | `setPointerCapture` 浮层跟手 + 兄弟项实时平移让位 + 松手 FLIP 落位 | 让位 `200ms var(--af-ease)`；落位 `240ms var(--af-ease-spring)` |
| 高度弹性托盘 / 脏数据保存栏 | `<AfTray>` / `<AfSaveBar>`（`overflow: clip; overflow-clip-margin: 10px`） | `320ms var(--af-ease-spring)` 高度与微位移弹性过渡 |
| 折线绘制与骨架流光扫掠 | SVG `pathLength="1"` + `stroke-dashoffset`；流光伪元素 `translate3d` | 描边 `--af-dur-draw (1100ms) var(--af-ease)`；扫光 `1.6s linear infinite` |

---

## 4. AI Agent (`agy`) 高频踩坑防复发十条铁律（自动化门禁已锁死）

> 以下 10 类缺陷均来自 P1–P3 独立验收中捕获的真实高频问题，其中第 1–5 条已硬编码进 `scripts/lint-architecture.mjs`（Rule 16–20）自动拦截，后续任何 Agent 迭代定制组件时必须逐条自检：

1. **FLIP 属性名与容器引用严禁断链（Rule 16）**：
   - `useListFlip` / `useAnimatedList` 只识别子节点上的 **`data-flip={key}`**，**严禁写成 `data-flip-key={key}`**；线性列表调用 `useAnimatedList` 必须将 `containerRef` 或返回的 `listRef` 挂载至直接父容器，否则退场后下方兄弟项将瞬移跳变。
2. **复合 `<div role="button|option">` 必加键盘冒泡守卫（Rule 17）**：
   - 为避免 `<button>` 嵌套 `<button>` 而改用外层 `<div role="button" | "option" tabIndex={0}>` 时，`onKeyDown` 第一行**必须写 `if (e.target !== e.currentTarget) return;`**，严禁吞掉内部行内重命名 `<input>` 的空格键或内部 `<AfButton>` / `<AfCheckbox>` / `<AfOverflowTagList>` 的回车与空格激活。
3. **局部滚动严禁裸调 `scrollIntoView` & 列表严禁单行静态跳色（Rule 18）**：
   - 日志台、大纲、锚点跳转一律通过局部滚动容器 `scroller.scrollTo({ top })` 计算定位，**严禁调用 `el.scrollIntoView()`**（会连带滚动外层画廊或宿主页面）；纵向列表统一接入 `data-af-hover-list` + `data-af-hover-item`，严禁对 `__row:hover` / `__item:hover` 写静态背景色。
4. **受控属性严禁“只接 `value` 不接 `onChange`”（Rule 19）**：
   - 凡解构出 setter 并用于交互变更的 `useControllableState({ value: prop, defaultValue, onChange })`，**必须完整透传 `onChange`**（或在变更处同步触发 `on*` 回调）；受控列表删除分支严禁提前触发内部 `requestRemove` 导致未确认即空列表。
5. **全局 `window` 快捷键必须限定作用域（Rule 20）**：
   - 组件内注册 `window.addEventListener("keydown", ...)` 必须跳过 `contained` 内嵌预览态、`[inert]` 容器以及已打开的 `[aria-modal="true"]` 浮层，严禁在画廊或后台面板中劫持 `/`、`c`、`Escape` 等按键。
6. **并发异步回调与批量移除严禁读取陈旧闭包（Stale Closure Ban）**：
   - 并发定时器（如 `useHoverIsolatedTimers` 的 `onExpire`）或连续状态变更中更新数组时，**必须使用函数式更新 `setItems((prev) => ...)`** 或从 `useRef` 读取最新快照，严禁直接引用渲染闭包中的旧数组导致已过期条目“诈尸复活”；异步按钮动作必加 `try / finally` 复位 loading 态，异步 Effect 必加 `cancelled` 卸载守卫。
7. **表单 `<label>` 严禁同时包裹输入框与动作按钮**：
   - `<label>` 内若同时包含 `<input>` 与 `<button>`（如路径输入 +“浏览”按钮），点击按钮会被浏览器重定向至输入框或二次触发，必须改用 `<label htmlFor={id}>` 与独立布局容器。
8. **CSS 特异性覆盖与等比缩放物理纪律**：
   - 覆盖基础组件在 `.af` 作用域下的尺寸约束（如 `.af .af-in-drop { max-width: 520px }`，特异性 `0,2,0`）时，父级选择器必须显式带 `.af` 前缀（如 `.af .af-xxx .af-in-drop`）；A4 纸面与画布缩放必须使用外层尺寸占位盒 + 内层 `transform: scale()` 等比缩放，严禁仅改 `width` 导致字号不变而正文重新断行。
9. **边缘半隐抽拉条（Edge Peek）收起态严禁半截裁字**：
   - 使用 `useReversibleEdgePeek` 时，`collapsedRatio` 露头宽度必须精确等于左侧/顶侧手柄槽（Handle）宽度，内部详情列表须随 `peek.progress` 渐隐并关闭 `pointer-events`，严禁闲置态把列表文字从汉字中间硬切一半。
10. **中文业务组件内嵌子控件本地化一致**：
    - 中文商城/工作台组件内部组合 `AfOtpInput`、`AfDatePicker`、`AfDateTimePicker` 等带内置文案的基础控件时，必须显式传入 `locale="zh-CN"`；金额格式化前须判断小数位（整数补 `.00`，含分角保留 `toFixed(2)`，严禁拼出 `99.5.00`）。

---

## 5. 提交前必跑门禁（Verification Gates）

每次改动组件或样式后，必须全部通过以下检查（Windows `pwsh` 下可串联执行）：

```powershell
npm.cmd run lint:arch && npm.cmd run typecheck && npm.cmd run build && npm.cmd run check:pkg && npx.cmd vitest run && npm.cmd run build:showcase
```

涉及组件外观、边框或布局变更时，还需运行 `node scripts/visual-regression.mjs` 并在 `#f7f7f7` 浅色点阵画布与 `#0e0e0e` 深色画布下核验四周 `1px` 发丝环完整闭合、零裁切、零亚像素消失。

---

## 6. 发布与 Git 规范（Automated Release）

- **主分支与远程仓库**：`main`（`https://github.com/LHorTL/Aster-UI.git`），npm 包名为 `@fangxinyan/aster-ui`（`publishConfig.access = "public"`）。
- **提交即自动发版**：正式发布统一走 `.github/workflows/publish.yml`。当向 `main` 推送调高了 `package.json.version` 的发布提交时，GitHub Actions 会自动对比 npm 线上版本、执行全量门禁校验、`npm pack` 并通过 `--provenance` 发布至 npm，随后自动补打 `vX.Y.Z` Git Tag 与 GitHub Release；不把本地手工 `npm publish` 作为常规发版路径。
- **纯净仓库过滤**：禁止提交 `node_modules/`、`dist/`、`index.html`、`visual/`、`.tmp/` 与本地临时记忆目录。
