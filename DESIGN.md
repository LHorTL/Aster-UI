# Aster UI · affectUI Clean / Pro 设计规范与工程准则 (`DESIGN.md`)

> 版本：`v0.5.1`（1:1 同步 [affectui.com/components](https://www.affectui.com/components)，全库 `259` 个纯净通用组件与场景规格；完整目录见 [`COMPONENTS.md`](./COMPONENTS.md)）  
> 适用范围：`Aster UI`（`@fangxinyan/aster-ui`）组件库开发，以及基于纯基础组件或复合模式构建的现代桌面工作台与高密度 Web 应用  
> 目标：**用一套统一、克制、零拟态、零视觉噪音的 affectUI Clean / Pro 设计工程体系与基础组件间距/排版契约，支撑全场景产品界面。**

---

## 1. 设计哲学（affectUI Clean / Pro 核心气质）

1. **安静优先（Quiet by Default）**：界面默认退后成为内容的背景容器。不靠厚重阴影、强对比渐变、高饱和大色块吸引注意力；重点信息通过文字字重对比、细微底色差与单一强调色突显。
2. **层级靠表面明度，不靠凹凸拟态（Flat Tonal Layering）**：
   - 浅色模式：`--af-canvas (#f7f7f7)` → `--af-surface (#ffffff)`，浮层统一 `#ffffff`。
   - 深色模式（逐层提亮）：`--af-canvas (#0e0e0e)` → `--af-panel (#141414)` → `--af-surface (#1b1b1b)` → `--af-overlay (#202020)`，顶部叠加 1px 极淡白色内高光模拟自然顶光。
3. **发丝线替代粗边框（Hairlines Over Borders）**：按钮、输入框、选择框与卡片统一使用 0.5px–1px `box-shadow` 发丝描边环，而非突兀的实线 `border`。
4. **单一主强调色，克制语义点缀**：主按钮（Primary Solid）默认是稳重的近黑/近白中性实色（`--af-solid`），把品牌强调色（`--af-accent`）留给关键焦点环、勾选态、激活滑块与重要状态指示。

---

## 2. 色彩与语义令牌体系（Token Architecture）

所有样式必须且只能读取 `--af-*` 变量，**严格禁止在组件或业务 CSS 中硬编码 `#ffffff`、`#000000`、`#333` 等裸色值**（跨主题兼容与 `lint:arch` 检查基础）。

### 2.1 核心表面与背景令牌

| 语义用途 | CSS Token | 浅色基准值 | 深色基准值 |
| --- | --- | --- | --- |
| 应用画布 / 侧栏 | `--af-canvas` / `--af-sidebar` | `#f7f7f7` | `#0e0e0e` |
| 主工作面板 | `--af-panel` | `#ffffff` | `#141414` |
| 卡片 / 标准承载面 | `--af-surface` | `#ffffff` | `#1b1b1b` |
| 下沉参数槽 / 内嵌区块 | `--af-surface-sunken` | `#fafafa` | `#161616` |
| 浮层 / 弹窗 / 菜单 | `--af-overlay` | `#ffffff` | `#202020` |
| 托盘外壳（轻对比背景） | `--af-tray` | `#f4f4f4` | `#191919` |
| 模态遮罩底色 | `--af-sheet-mask` | `rgba(0, 0, 0, 0.28)` | `rgba(0, 0, 0, 0.55)` |

### 2.2 双层级文字令牌

- **组件内文字（黑/白透明度阶梯，自动贴合任何底层表面）**：
  - `--af-strong`（最高对比标题/数字）：`#000000` / `#ffffff`
  - `--af-ink`（主要控件与正文）：`rgba(0, 0, 0, 0.88)` / `rgba(255, 255, 255, 0.90)`
  - `--af-text`（次要说明文案）：`rgba(0, 0, 0, 0.61)` / `rgba(255, 255, 255, 0.62)`
  - `--af-muted`（辅助提示、占位）：`rgba(0, 0, 0, 0.45)` / `rgba(255, 255, 255, 0.46)`
  - `--af-faint` / `--af-icon`：弱占位与线性图标默认色
- **整页排印文字（页面级实色阶梯）**：
  - `--af-page-strong` / `--af-page-ink` / `--af-page-muted` / `--af-page-faint`

### 2.3 交互微填充、强调色与语义色

- **中性态叠加**：`--af-wash`（轻垫底 `0.03/0.04`）、`--af-hover`（悬停 `0.06/0.08`）、`--af-press`（按下 `0.08/0.10`）、`--af-selected`（侧栏/列表/标签选中 `0.06/0.08`）
- **实心主按钮**：`--af-solid` + `--af-on-solid` + `--af-solid-shadow`
- **动态强调色家族**（由 `AsterThemeProvider` 自动计算与派生）：
  - 默认内置：`blue (#0060e2 / #4d8dff)`、`violet (#7c5cff / #8e7cf0)`、`green (#0f9f7f / #2ebd9f)`、`orange (#e2620c / #ff8b3e)`
  - `--af-accent`：强调主色
  - `--af-on-accent`：强调色上的前景色（禁止写死 `#fff`）
  - `--af-accent-ink`：用于强调色文字的高对比变体
  - `--af-accent-soft` / `--af-focus`：淡底高亮与 3px 键盘焦点环颜色
  - 数据可视化单色降阶：`--af-data-1..4` 自动使用 `color-mix(in srgb, var(--af-accent) 76%|50%|32%|18%, transparent)`
- **语义反馈色**：`--af-success (#1a9a52 / #3ec27a)`、`--af-warning (#e8a20c / #f0b232)`、`--af-danger (#e5484d / #ff6369)`、`--af-info (var(--af-accent))` 及其对应的 `*-soft` 淡底。

---

## 3. 字体排印与数值规范（Typography & Tabular Numerals）

- **字体栈（`--af-font`）**：内嵌 Inter 可变拉丁子集（`font-feature-settings: "cv11", "ss03"`），中文回落到 `"Segoe UI Variable Text" / "PingFang SC" / "Microsoft YaHei UI"`；等宽代码字栈 `--af-mono` 优先 `"JetBrains Mono" / "SF Mono"`。
- **字号阶梯**：
  - `10px (--af-fs-overline)`：分组眉标
  - `11px (--af-fs-xs)`：快捷键徽章、微标签
  - `12px (--af-fs-sm)`：辅助说明、表头、时间戳、`xs/sm` 控件
  - `13px (--af-fs-md)`：标准控件、按钮、输入框默认字号
  - `13.5px (--af-fs-body)`：正文与长文本（推荐行高 `21px`）
  - `14–16px (--af-fs-lg / --af-fs-section / --af-fs-xl)`：弹窗标题、区块标题
  - `20–28px (--af-fs-2xl / --af-fs-title / --af-fs-metric*)`：页面标题、大指标读数
- **等宽数字铁律（Tabular Numerals）**：
  - 所有表格数值列、KPI 指标、Token 用量、倒计时、金额、进度百分比、时间轴时间戳、时间选择器列必须声明 `font-variant-numeric: tabular-nums`，保证数字刷新或纵列对齐时不发生水平抖动。可直接使用 `<AfText numeric>`。

---

## 4. 空间尺度、基础组件拼装间距规范与密度圆角（Spacing, Composition & Density）

> **为什么需要本节**：高阶 Blocks/Screens 自带成套内部排版，但实际业务中大量界面直接由 `@fangxinyan/aster-ui/core` 的基础组件拼装而成。以下空间契约已内置为 `--af-space-*` 语义令牌与 9 个零业务布局原语（`AfPage` / `AfPageHeader` / `AfSection` / `AfStack` / `AfInline` / `AfColumns` / `AfToolbar` / `AfListRow` / `AfSpacer`），确保仅用基础组件也能保持与 affectUI Pro 同源的呼吸感与对齐精度（交互示范见展示站 `Layout & Spacing Guide`）。

### 4.1 九级语义间距阶梯（严格 4px 网格 + 自动密度缩放）

**严禁在业务页面里随手写 `gap: 7px` / `gap: 13px` / `margin-bottom: 18px` 等拍脑袋数值**，统一选用以下语义令牌或 `AfStack` / `AfInline` / `AfColumns` 的同名 `gap` 档位：

| 语义令牌（CSS） | 组件 `gap` 属性 | 标准密度（`comfortable`） | 紧凑密度（`compact`） | 唯一推荐用途 |
| --- | --- | --- | --- | --- |
| `--af-space-micro` | `"micro"` | `4px` | `4px` | 标题↔副标题、表单 Label↔Hint、图标与紧邻角标 |
| `--af-space-tight` | `"tight"` | `6px` | `4px` | 表单标签↔控件、标题↔行内 Tag、按钮内图标与文字 |
| `--af-space-inline` | `"inline"` | `8px` | `6px` | 相邻按钮组、工具栏同组控件、Tag 簇、页头操作按钮 |
| `--af-space-group` | `"group"` | `12px` | `8px` | 多列 KPI/卡片列距、双列表单横距、区块标题↔正文、工具栏↔表格 |
| `--af-space-block` | `"block"` | `16px` | `12px` | 卡片标准内边距、表单字段纵间距、同区多卡纵距、弹窗/抽屉正文块距 |
| `--af-space-section-inner` | `"section-inner"` | `20px` | `14px` | 页头↔首区块、宽松弹窗内边距、主次双栏槽距 |
| `--af-space-section` | `"section"` | `24px` | `16px` | 页面一级 `AfSection` 之间的垂直节奏 |
| `--af-space-page` | `"page"` | `24px` | `16px` | `AfPage` 四周标准页边距 |
| `--af-space-page-lg` | `"page-lg"` | `32px` | `20px` | 宽屏画布、空状态引导区、着陆首屏呼吸留白 |

- 原子尺度同步保留：`--af-1: 4px`、`--af-1-5: 6px`、`--af-2: 8px`、`--af-3: 12px`、`--af-4: 16px`、`--af-5: 20px`、`--af-6: 24px`、`--af-8: 32px`。
- 列表/设置行内边距令牌：`--af-row-pad-x`（`16px` / compact `12px`）、`--af-row-pad-y`（`12px` / compact `8px`）。

### 4.2 页面骨架与阅读宽度档位

使用 `<AfPage maxWidth="...">` 统一收口页面骨架，严禁在超宽屏（1920px+）把单列设置项或长表单拉满 100% 导致标签与右侧开关视线断裂：

| 页面类型 | `AfPage maxWidth` | 令牌与基准宽 | 典型组合 |
| --- | --- | --- | --- |
| 设置页 / 单列表单 / 偏好配置 | `"narrow"` | `--af-page-max-narrow: 680px` | `AfPageHeader(divider)` → `AfSection` → `AfCard flush` + `AfHoverList` + `AfListRow` |
| 常规详情页 / 多步配置 / 审批页 | `"medium"` | `--af-page-max-medium: 960px` | `AfPageHeader` → `AfDescriptions` + `AfColumns(2)` |
| 仪表盘 / 数据列表 / 管理台 | `"wide"`（默认） | `--af-page-max-wide: 1200px` | `AfPageHeader` → `AfColumns(4)` 指标 → `AfToolbar` + `AfTable` |
| 满宽分栏工作台 / 编辑器 / 画布 | `"full"` | 无上限（配合 `AfSplitter`） | `AfSplitter` / `AfResizableGroup` 固定侧栏 + 自适应主区 |

### 4.3 基础组件六大高频拼装标准配方（Recipes）

1. **页头（`AfPageHeader`）**：面包屑 ↔ 标题行 `8px`（`inline`）；主标题（`20px / 600`）↔ 一句话说明（`13px / --af-muted`）`4px`（`micro`）；右侧操作组 `8px`（`inline`），所有同排控件严格同高。
2. **多列卡片与 KPI（`AfColumns`）**：4 列指标行用 `<AfColumns columns={4} gap="group">`（`12px/8px`）；2 列内容卡用 `<AfColumns columns={2} gap="block">`（`16px/12px`）；默认 `align="stretch"` 保证同行卡片底边齐平。
3. **工具栏与数据表（`AfToolbar` + `AfTable`）**：搜索框宽 `220px–260px`、筛选项宽 `120px–160px`，左侧筛选与右侧动作之间由 `AfToolbar` 自动推开，同排控件间距 `8px`（`inline`）；工具栏与下方 `AfTable` 间距 `12px`（`group`）。
4. **设置分组与列表行（`AfCard flush` + `AfHoverList` + `AfListRow`）**：容器圆角 `14px`（`--af-r-card`），`flush` 留白 `6px` 搭配行圆角 `8px`（`--af-r-md`）实现光学同心圆角；行高默认 `52px`（compact `44px`），行间自动 `1px` 发丝底线，零静态 `:hover` 跳色。
5. **表单与操作栏（`AfForm` + `AfColumns` + `AfInline`）**：
   - 垂直字段间距默认 `14–16px`（`block`），同一行两列字段用 `<AfColumns columns={2} gap="group">`（`12px`），Label ↔ 控件 `5–6px`（`tight`）。
   - 提交栏顶部用 `<AfDivider />` 分隔；**按钮顺序铁律**：危险操作独立隔离至最左侧，主操作区靠右且严格遵循 **「左次右主」**（`Secondary / Cancel` 在左，`Primary / Confirm` 在右，间距 `8px`）。
6. **表面分层与禁卡套卡（Surface Nesting Law）**：
   - 标准四层递增：`--af-canvas`（画布/侧栏）→ `--af-panel`（内嵌主工作区）→ `--af-surface`（`AfCard` 卡片）→ `--af-overlay`（`AfModal` / `AfDrawer` / `AfPopover`）。
   - **严禁在 `AfCard` 内部再嵌套一层 `AfCard`**（相同底色与双层 `--af-shadow-card` 会显得厚重发虚）；卡内二级分组统一使用 `<AfSurface level="sunken" bordered padding="sm" radius="md">` 下沉轻槽。
   - `AfModal` / `AfDrawer` 内部正文块之间统一使用 `<AfStack gap="block">`（`16px`）。

### 4.4 控件高度、密度与圆角

- **同排控件等高铁律**：同一操作行（页头、工具栏、表单尾栏）内的 `AfInput`、`AfSelect`、`AfSegmented`、`AfButton` **必须传入同一 `size` 档位**，严禁混用 `sm` + `lg` + `xs`。
  - **标准密度（`comfortable`，默认）**：`xs = 24px`、`sm = 28px`、`md = 32px`、`lg = 36px`；表格/列表行高 `44px / 52px`。
  - **紧凑密度（`.af[data-density="compact"]`）**：`xs = 22px`、`sm = 24px`、`md = 28px`、`lg = 32px`；表格/列表行高 `36px / 44px`，语义间距自动同步收紧。
- **圆角三档与层阶对应**：
  - 默认中圆角（`md`）：微标签 `--af-r-xs: 4px` → 小控件/Tag `--af-r-sm: 6px` → 基础圆角 `--af-r-md: 8px` → 输入框 `--af-r-input: 9px` → 按钮 `--af-r-btn: 10px` → 浮层 `--af-r-pop: 12px` → 卡片 `--af-r-card / --af-r-lg: 14px` → 弹窗 `--af-r-modal: 16px` → 主面板 `--af-r-panel / --af-r-xl: 18px` → 全胶囊 `--af-r-pill: 999px`。
  - 通过 `<AsterThemeProvider initialRadius="sm" | "md" | "lg">` 实时切换 `.af[data-radius="sm"|"lg"]`。

---

## 5. 布局铁律（Flexbox-Only Layout Law）

**Aster UI 全库与基于 Aster UI 构建的所有应用界面，一律严禁使用 CSS Grid（`display: grid` / `display: inline-grid`）。**

- 此规由架构门禁 `scripts/lint-architecture.mjs` **Rule 6** 在 CI 中强制扫描全部 `src/**/*.css`，命中即报错阻断。
- **标准 Flexbox 替代范式**：
  - **双栏/多栏等宽卡片组**：`display: flex; flex-wrap: wrap; gap: 12px;`，子项 `flex: 1 1 220px; min-width: 0;`。
  - **严格两列/三列表单或按钮排布**：`flex: 0 0 calc((100% - var(--gap) * (N - 1)) / N); min-width: 0;`。
  - **7 列月历**：每日单元格使用 `flex: 0 0 calc(100% / 7);`。
  - **主次分栏与可调面板**：使用 Flexbox `min-width: 0` + `flex: 1 1 auto`，或直接使用 `<AfSplitter>` / `<AfResizableGroup>`。
  - **防止弹性子项撑破容器**：任何包含长文本、代码、输入框的 Flex 子项务必补充 `min-width: 0`。

---

## 6. 表面、边线与阴影规范（Surfaces, Hairlines & Elevation）

1. **发丝描边环**：
   - 输入/选择触发器：`box-shadow: var(--af-field-shadow)`，悬停 `var(--af-field-shadow-hover)`，聚焦 `var(--af-field-shadow-focus)`。
   - 卡片与设置容器：`box-shadow: var(--af-shadow-card)`，内部行间分隔使用 `box-shadow: var(--af-divider-hairline)`，拒绝硬生生的 1px 灰色 `border`。
   - 浮层与模态：`--af-shadow-pop`、`--af-shadow-modal`。
2. **表格与列表零斑马纹铁律**：
   - **禁止使用 `tr:nth-child(even)` 或交错底色斑马纹**（由 `lint:arch` **Rule 7** 强制阻断）。
   - 行分隔统一使用极轻分隔线（`var(--af-line)`）与悬停微亮（`var(--af-wash)` / `var(--af-hover)`），选中行使用 `var(--af-selected)`。
3. **选择卡片温和选中态（Quiet Selected Cards）**：
   - 卡片式单选/多选（`AfChoiceCards`）选中后 **禁止整张卡片铺满高饱和强调色**，统一采用温和中性底（`--af-wash` / `--af-selected`）搭配精细聚焦环（`--af-field-shadow-focus`）和小型选中角标，保证长时间阅读零视觉疲劳。
4. **边框防消失与多倍率 DPI 发丝线铁律（Anti-Vanishing Hairline & Inset Frame Law）**：
   - **禁止实色浅灰描边融进浅灰画布**：`--af-card-ring` 与 `--af-ring` 必须统一采用正片叠底半透明色（浅色 `rgba(0, 0, 0, 0.08)` / 深色 `rgba(255, 255, 255, 0.08)`），**严禁写死实色 `#ebebeb` 或 `#f0f0f0`**——实色浅灰在 `#f7f7f7` 点阵画布或同色侧栏上对比度不足 `5%`，会导致卡片上/左外框视觉消失。
   - **禁止 `0.5px` 亚像素叠加 `6%` 极淡线**：在 Windows `100% (1x)` 与 `125% (1.25x)` 缩放屏幕下，`inset 0 ±0.5px 0 var(--af-line)`、`inset -0.5px 0 0 var(--af-line)` 与 `inset 0 0 0 0.5px var(--af-line)` 会被光栅化舍入为 `0px` 或 `3%` 透明度而彻底消失。所有容器分隔线与内嵌槽描边统一使用整数像素 **`1px` + `var(--af-line)`**（如 `inset 0 1px 0 var(--af-line)`、`inset 0 -1px 0 var(--af-line)`、`inset 0 0 0 1px var(--af-line)`），由 `lint:arch` **Rule 9** 强制拦截。
   - **双栏/多栏外壳采用 Inset 内嵌圆角画布**：工作台与设置外壳对齐 affectUI Pro `Inset` 范式（如 `AfAppShellInset`）——外框使用 `--af-canvas` 底 + `var(--af-shadow-card)`，右侧主面板内缩 `6px` 并独立加 `border-radius: 12px; background: var(--af-panel); box-shadow: 0 0 0 1px var(--af-ring)`，靠表面明度差与完整闭合环自然分界，不依赖脆弱的单根竖向细线。
   - **外描边防裁切安全余量（Overflow Clearance）**：任何声明 `overflow: hidden | clip | auto` 的父级舞台或滚动槽，若内部子卡片依赖 `box-shadow: 0 0 0 1px ...` 绘制外环，父容器四周必须预留 `>= 2px–6px` 内边距余量，严禁贴边 `0px` 削掉卡片上下左右任一侧边框；分组列表卡片推荐 `<AfCard flush>`（内留 `6px`）搭配 `<AfHoverList>` 与 `<AfListRow>`。

---

## 7. 交互态、焦点模态与动效规范（States, Focus Modality & Motion）

1. **键盘/指针焦点分离（Zero Click Flash）**：
   - `AsterThemeProvider` 全局监听鼠标指针与键盘 Tab/方向键，在 `.af` 根节点维护 `data-modality="pointer" | "keyboard"`。
   - 当 `data-modality="pointer"` 时，强制压制 `:focus-visible { outline: none; }`，鼠标点击按钮或卡片不会闪出刺眼蓝框。
   - 仅在 `data-modality="keyboard"`（或未包裹 Provider 降级兜底）下渲染清晰的 `--af-focus` 外框或聚焦环；**严禁对 `outline-color` 编写 CSS `transition`**（会制造点击瞬间的颜色闪烁残影）。
2. **统一禁用态**：所有可交互控件禁用时统一使用 `opacity: 0.4; cursor: not-allowed;`，禁止各组件自行发明 `0.45` / `0.5` / `0.55`。
3. **动效节制与无障碍减动效**：
   - 主缓动曲线 `--af-ease: cubic-bezier(0.22, 1, 0.36, 1)`，常规微交互时长 `90ms–240ms`。
   - `@media (prefers-reduced-motion: reduce)` 下常规过渡缩短至 `1ms`，但加载旋转指示器（`AfSpinner`）应显著放慢转速而不是完全停止，让用户仍能感知进程进行中。
   - **模糊门禁（Rule 5）**：任何 `filter: blur(...)` 或 `backdrop-filter: blur(...)` 必须放在 `@media (prefers-reduced-motion: no-preference)` 块内部（由 `lint:arch` Rule 5 强制校验）。
4. **affectUI v0.4.0 关键交互契约**：
   - **Hover Card（`AfHoverCard`）**：使用 `role="tooltip"`、`openDelay=300ms` / `closeDelay=200ms`，通过 `aria-describedby` 关联触发器，**绝不将焦点移入浮层（无 `autofocus` / `focus()`）**，触屏自动跳过。
   - **Toggle Group（`AfToggleGroup`）**：以 `[aria-pressed="true"]` 单一语义属性同时驱动视觉与无障碍按下态（不单独维护互斥选中类），配合横/纵向方向键 Roving Tabindex 漫游与单选滑块胶囊。
   - **复制按钮（`AfCopyButton` / `AfCodeBlock`）**：复制反馈期（`copied` / `failed`）**严禁设置 `disabled`**，确保保留键盘焦点、避免错误可用性播报并支持失败后直接重试。
   - **时间与标签快捷交互**：`AfTimePicker` 通过 `parseNaturalTime` 支持 `3pm` / `930a` / `noon` / `midnight` 等自然语言直输并支持 `columns` / `intervals` 双模式；`AfChipInput` 重复提交标签时在既有标签上触发 `450ms` 的 `data-flash="true"` 提示。
5. **列表滑动悬停底块规范（Sliding Hover Thumb Law）**：
   - **禁止列表项独立变色**：所有下拉列表、上下文菜单、级联多栏、时间/范围预设列表、文件树、纵向单选组、侧边导航与可悬停表格行 **严禁在单条列表项上直接切换 `:hover { background }` 或 `[data-active] { background }`**；列表项自身背景保持 `transparent`，只通过单一浮动底块在列表项下方跟着指针或键盘焦点平滑滚动。
   - **双阶段入场与防飞入铁律**：首次进入列表容器时，底块立即落在目标项坐标上，仅执行 `80ms ease-out` 透明度淡入（`data-af-ht="enter"` / `af-thumb-in`，绝不从容器 `(0,0)` 原点斜飞进入）；同一列表内跨行移动时切换为 GPU 合成过渡（`100ms var(--af-ease)` / `90ms ease-out` 过渡 `transform` / `width` / `height`），行间 `1px–4px` 缝隙保持当前高亮不闪烁；全部位移过渡包裹在 `@media (prefers-reduced-motion: no-preference)` 中。
   - **双实现原语（全库及业务方复用）**：
     - 状态驱动键盘+指针合一浮层（`AfSelect`、`AfAutoComplete`、`AfMenu`、`AfCommandPalette`、`AfCascader`、`AfCombobox`、`AfModelPicker`）：使用 `useMenuHighlight` / `useKeyedHighlight` + `measureRelativeBox` 渲染 `.af-menu__thumb`。
     - 通用纵向列表/树/导航/表格（`AfTree`、`AfTimePicker`、`AfDateRange`、`AfTable`、`AfBreakdown`、FilterMenu/PromptLibrary/Billing/Profile/Integrations、NoticePopover、FrameNav、GalleryNav 与 Data/Agent/Project 列表，或业务自定义列表 `<AfHoverList tone="hover" | "wash">`）：使用全局幂等事件委托驱动 `installAfListHover()` 与容器 `::before`（`position: relative; isolation: isolate`、`z-index: -1`）驱动，零额外 DOM 子节点。
6. **统一弹窗与浮层入场/退场动效规范（Overlay & Popup Entrance/Exit Motion Law）**：
   - **严禁 0ms 生硬闪现（Zero Hard-Cut Popups）**：全组件库所有模态框（`AfModal` / `AfAlertDialog` / `AfCommandPalette` / `.af-aga-layer__card` / `.af-agd-modal`）、抽屉（`AfDrawer` / `.af-pj-tb__drawer` / `.af-wb__rundrawer`）、气泡与菜单（`AfPopover` / `StagePopover` / `AfMenu` / `AfContextMenu` / `AfColorPicker` / `.af-agc-*` / `.af-pj-*` / `.ast-theme-pop`）、画布节点检查器浮窗（`AgentGraph` `.af-aggc__pop`、`AgentQueue` `.af-agqc__pop`、`AgentLanes` `.af-alc__pop`、`AgentCursors` `.af-acuc__pop`、`AgentCrew` `.af-acrc__panel`、`AgentSequence` `.af-asqc__card`、`FlowBuilder` `.af-flbc__menu`）以及轻提示（`AfTooltip` / `AfHoverCard` / 图表 `.af-*-tip`）**必须具备平滑入场动效，绝不允许无过渡直接出现**。
   - **标准入场曲线与参数**：
     - **Popover / Inspector Card / Menu / Tooltip**：时长 `160ms–200ms`，缓动 `var(--af-ease, cubic-bezier(0.22, 1, 0.36, 1))`，从 `opacity: 0; transform: translateY(4px) scale(0.975)`（或依弹出方向 `data-side` / `data-up` 偏移 `±4px`）平滑过渡至 `opacity: 1; transform: translateY(0) scale(1)`，并按锚点方向显式设置 `transform-origin`。
     - **Modal / Dialog & Scrim**：遮罩层 `160ms` 透明度淡入（`opacity: 0 -> 1`），对话框面板 `180ms–200ms var(--af-ease)` 从 `opacity: 0; transform: translateY(6px) scale(0.98)` 入场。
     - **同浮层切换节点重播**：画布或多节点检查器浮窗（如 `AgentGraph`、`AgentQueue`、`AgentLanes`、`AgentCursors`）在已打开状态下直接点击另一节点时，浮窗容器必须绑定当前选中实体 `key={selectedId}`，确保入场微动效干净重播。
     - **减动效兜底**：所有浮层动画必须在 `@media (prefers-reduced-motion: reduce)` 下降级为 `animation: none` 或 `1ms` 瞬时完成。
7. **可折叠审批/授权收据态过渡规范（Collapsible Receipt Transition Law）**：
   - 当内联审批或授权卡片（如 `AfApprovalCard` `.af-agb-approval`、`AfPermissionRequest` `.af-agb-permission`）从展开表单态（`~224px`）通过弹簧高度过渡（`height: 500ms–520ms var(--af-ease-spring)`）收起为单行可撤销收据条（`48px` / `56px` `.af-agb-record`）时，**待处理表单区（`__pending`）必须脱离文档流并向上淡出（`position: absolute; top: 0; left: 0; right: 0; opacity: 0; transform: translateY(-6px) scale(0.985); pointer-events: none`）**，严禁留在普通文档流顶部挤占收据条空间导致内容被 `overflow: hidden` 腰斩截断；同时 `.af-agb-record` 执行 `260ms var(--af-ease)` 淡入上移并占满 `100%` 宽度，点击 `Undo` 时反向平滑撑开还原。
8. **胶囊/徽章内数字与箭头光学居中铁律（Capsule & Chevron Optical Alignment Law）**：
   - 在紧凑胶囊按钮或折叠徽章（如 `AgentTree` `.af-agtc__fold` 的 `-2` / `+2` 折叠器）中，**严禁直接拼接基线偏置的原始 Unicode 字符（如 `⌄` `U+2304`）与数字混排**；必须使用 `display: inline-flex; align-items: center; justify-content: center; line-height: 1; font-variant-numeric: tabular-nums` 容器搭配显式几何居中的 `<svg>` 矢量 Chevron（展开/收起通过 `transform: rotate(-90deg)` 过渡），确保文字与图标在垂直中轴线上达到 `0px` 光学对齐。
9. **affectUI 标志性动画与交互动效总纲（Signature Motion & Interaction Taxonomy）**：
   - 所有新开发组件与业务页面，其交互手感与动效细节必须与 affectUI Clean / Pro 保持同源一致，严格遵循以下八大标志性范式：
     1. **GPU 滑动悬停底块（`data-af-hover-list`）**：侧栏导航、设置分组行、列表行全部启用 `<AfHoverList>`（`data-af-hover-list="hover" | "wash"`）+ `<AfListRow>`（`data-af-hover-item`），删除单行 `:hover { background }`，初入 `80ms ease-out` 仅淡入透明度，跨行 `100ms var(--af-ease)` `translate3d` 平滑跟随。
     2. **分段激活胶囊滑块（`<AfSegmented>`）**：时间窗切换（`24h / 7d / 30d`）、状态快筛与视图切换统一使用带白底滑动胶囊的 `<AfSegmented>` 或测量滑块，严禁按钮组无过渡硬跳。
     3. **等宽数字同步插值（`useTween` / `useTweens`）**：时间窗切换、配额刷新、进度变化时，核心大数字与百分比统一接入 `useTween` / `useTweens`（`420ms–500ms` 四次方 `ease-out`）配合 `tabular-nums` 平滑滚动到位。
     4. **多段配比双向联动与微折线磁吸游标（Bidirectional Highlight & Sparkline Scrubbing）**：多段占比条（`AfMeterBar` / `AfBreakdown`）与图例双向悬停联动，非悬停项 `180ms ease` 平滑退暗至 `opacity: 0.35`；KPI 微折线（`AfSparkline interactive`）支持指针磁吸游标。
     5. **内容切换微位移淡入与异构高度过渡（Keyed Crossfade & `<AfSwap>`）**：子页签或步骤切换时，单一内容节点绑定 `key={activeKey}` 执行 `180ms–200ms var(--af-ease)` 微位移淡入；异构高度块使用 `<AfSwap swapKey={...}>` 同步过渡容器高度。
     6. **先退场再 FLIP 升位（Exit-Before-Promote Physics）**：列表删除、叠卡关闭时，先通过 `useAnimatedList` 标记 `data-leaving="true"` 执行 `180ms–220ms var(--af-ease)` 退场，再触发 `useListFlip`（`260ms var(--af-ease)`）补位，严禁 `0ms` 瞬删硬跳。
     7. **原生 `<details>` 平滑展开收起（`::details-content` Disclosure）**：折叠说明、归档日志等 `<details>` 抽屉在 `@media (prefers-reduced-motion: no-preference)` 下启用 `interpolate-size: allow-keywords` 与 `::details-content` 平滑高度与透明度过渡。
     8. **零卡片点击缩小铁律（Zero Card Click-Shrink）**：卡片、设置行、侧栏导航项、指标卡严禁声明 `:active { transform: scale(...) }`，按压微缩仅限独立小尺寸按钮。
10. **高阶特效与 Pro 复刻保真度契约（Advanced Motion & Pro Effect Fidelity）**：
   - **全链路退场闭环（Zero `0ms` Close）**：不仅入场需要 `160ms–200ms`，所有通过 `anchorRef` 锚定的下拉层（`Select`、`AutoComplete`、`Cascader`、`TimePicker`、`DateRangePicker`）、`Tooltip`、嵌套子菜单、`ContextMenu` 与 `AfMessage` 关闭时均须执行 `115ms–150ms` 退场动画；关闭瞬间必须冻结最后一次有效锚点坐标与菜单快照，待 `animationend` / `transitionend`（含减动效短兜底）后再卸载 Portal，严禁 `{open && ...}` 瞬卸或提前置空数据导致空壳塌缩。
   - **形变容器防裁切与在途可中断（Ring-Safe Morph & Interruptible WAAPI）**：`AfBlurCrossfade`、`AfSwap`、`AfTray`、`AfSaveBar` 等尺寸形变容器严禁使用 `overflow: hidden` 贴边削切内部卡片的 `0 0 0 1px` 描边环与焦点环，统一使用 `overflow: clip; overflow-clip-margin: 6px–12px`；测量目标尺寸须读取不受 `:active scale` 污染的布局宽高（`offsetWidth` / `offsetHeight`），启动新 WAAPI 动画前必须取消或承接在途动画，高频连切时保留多幽灵帧并存淡出。
   - **3D 视差分层与零粘滞跟手（True `preserve-3d` & Zero-Lag Tracking）**：声明 `transform-style: preserve-3d` 的倾斜卡片（如 `AfTiltCard`）严禁同层声明非 `visible` 的 `overflow`（CSS Transforms L2 会强制将其拍平为 `flat`，使 `translateZ` 悬浮层失效），圆角与高光裁切必须下沉至独立背景子层；指针实时追踪（`pointermove`）期间必须关闭 `transform` 的 CSS `transition`，仅在首入对齐与 `pointerleave` 回弹复位时启用过渡。
   - **GPU 合成层流光与级联数字滚轮（Composited Shimmer & Cascading Odometer）**：骨架屏与流光加载器（`AfSkeleton` / `AfShimmerLoader`）禁用 `background-attachment: fixed` 与 `background-position` 动画（在带 `transform` 的弹窗或抽屉内会降级失效并触发主线程重绘），统一改用伪元素 `transform: translate3d(-100%, 0, 0) -> translate3d(100%, 0, 0)` 扫光；数字滚轮（`AfNumberTicker` / `AfNumber`）须按十进制位权自右向左赋稳定 `key`，支持跨位进位联动、`9 -> 0` 正向越界滚转及位数变化时的水平宽度平滑插值；严禁将 `useTweens` 的逐帧输出再次喂入 `useTween` 造成双重 rAF 抖动。
   - **SVG 匀速描边与游标原地淡入（True Stroke Draw & In-Place Scrubbing）**：折线图（`AfLineChart`）、拓扑边与完成打勾统一采用 `pathLength="1"` + `stroke-dasharray: 1` + `stroke-dashoffset` 恒定线速度描边，严禁用水平 `clip-path: inset(...)` 拉窗帘冒充描边；同构序列切换优先平滑插值顶点而非销毁 `<g>` 重挂载；悬停参考线、吸附圆点与读数浮窗首次显现必须在当前光标采样点原地淡入，严禁从图表左右两端反向横穿飞入。
   - **真指针捕获拖拽（Pointer-Captured Spring Drag）**：任务看板（`AfTaskBoard` / `AfDelegateBoard`）、应用 Dock、规则链与章节大纲调序一律禁用原生 HTML5 `draggable` 系统截图残影，统一采用 `Pointer Events + setPointerCapture`：拖拽项微抬升赋予 `--af-shadow-pop`，非拖拽兄弟节点以 `200ms var(--af-ease)` 实时平移让位，松手执行 FLIP 落位过渡。
   - **减动效优雅降级与零令牌孤岛（Graceful Reduced-Motion & Token Penetration）**：过渡性动态模糊置于 `@media (prefers-reduced-motion: no-preference)` 并在 `reduce` 下回退为纯透明度过渡；静态网格弥散层（如 `AfGradientFloor`）在 `reduce` 下必须提供柔和径向渐变兜底或静态模糊豁免（严禁暴露裸多边形硬边），无限跑马灯（`AfLogoMarquee`）在 `reduce` 下默认静止；复刻 Pro 组件（`src/patterns/*.css`）必须穿透 `--af-*` 语义令牌，严禁同时声明 `border: 1px` 与 `--af-shadow-card` 叠加双层发虚边框。

---

## 8. 表单、浮层与无障碍铁律（Forms, Overlays & Accessibility）

1. **三阶段表单校验时机（`AfForm` / `AfFormField`）**：
   - **输入期间不提前警告**：首次编辑未失焦前不弹出红色错误。
   - **失焦触发校验（`blur`）**：离开已编辑字段时按规则（同步/异步）执行校验。
   - **修复即刻清错（`input`）**：一旦字段存在错态，用户修正输入过程中立即重验并第一时间消除错误提示。
   - **提交失败聚焦首错（`submit`）**：自动拦截提交并将键盘焦点路由至首个报错控件。
2. **语义错误播报契约**：
   - 控件合法态必须显式输出 `aria-invalid="false"`，而不是缺省不写属性。
   - **严禁渲染隐藏但仍被 `aria-describedby` 引用的错误节点**：无错误时错误元素不得存在于 DOM 中且 `aria-describedby` 不得包含其 ID；仅有错误激活时挂载带 `aria-live="polite"` 的错误节点并关联 `aria-describedby`。
3. **模态框遮罩防误触关窗**：
   - `AfModal`、`AfDrawer`、`AfImagePreview` 严格要求指针 `pointerdown` **与** `pointerup` 均落在背景遮罩层本身才触发关闭，防止用户在弹窗内框选复制文字时鼠标滑出到遮罩才松手导致误关闭。
4. **中文输入法（IME）保护**：所有通过 `Enter` 触发确认、选择或提交的控件必须接入 `useImeEnterGuard()`，忽略组合输入期（`isComposing` / `keyCode === 229`）的回车事件。

---

## 9. Electron 桌面端专属规范（Frameless Window & Portal Rules）

1. **无边框拖拽标题栏（`AfTitleBar`）**：
   - 标题栏主容器固定 `36px` 高度并启用 `-webkit-app-region: drag`。
   - `platform="mac"` 时左侧自动保留 `72px`（可配置）红绿灯交通灯安全间距。
   - **凡是可交互子区域与按钮必须显式免拖拽（`-webkit-app-region: no-drag`）**，包括 `leading / center / trailing` 槽内元素、`AfWindowControls` 三键。
2. **浮层穿透免拖拽**：
   - `:where(.af-portal-root) > *` 以及 `.af-modal`、`.af-drawer`、`.af-context-menu` 全部强制声明 `-webkit-app-region: no-drag`，防止弹窗或右键菜单覆盖标题栏区域后无法点击交互。
3. **主题容器继承**：
   - 所有弹窗、抽屉、气泡、轻提示、右键菜单通过 `useAfLayerContainer()` 自动挂载于 `.af-portal-root`（位于 `.af` 节点内部），天然继承当前明暗主题、自定义强调色、密度和圆角档位。

---

## 10. 反模式清单（Do / Don't 对照表）

| 常见错误写法（Don't） | affectUI 正确写法（Do） | 检测手段 |
| --- | --- | --- |
| 使用拟态双向凸起/内凹大阴影（`--neu-*`） | 使用 `--af-shadow-hairline` / `--af-shadow-card` | Code Review & Token 规范 |
| 使用 `display: grid` 或 `inline-grid` | 使用 Flexbox（`flex-wrap: wrap` + `min-width: 0`） | `npm run lint:arch` (Rule 6) |
| 给表格加 `tr:nth-child(even)` 斑马纹 | 使用细微底部分隔线 `--af-line` + 悬停 `--af-wash` | `npm run lint:arch` (Rule 7) |
| 在媒体查询外裸写 `backdrop-filter: blur()` | 包裹进 `@media (prefers-reduced-motion: no-preference)` | `npm run lint:arch` (Rule 5) |
| 样式里写死 `#fff` / `#000` / `#262626` | 使用 `--af-overlay` / `--af-on-accent` / `--af-strong` | 样式扫描 |
| 写 `transition: outline-color` | 通过 `[data-modality="keyboard"]` 控制焦点外圈或阴影 | `ui.css` / `components.css` 门禁 |
| 选中态卡片整块填充 `--af-accent` 亮色底 | 使用 `--af-wash` + `--af-field-shadow-focus` | 视觉回归比对 |
| 在列表项自身写 `:hover { background: var(--af-hover) }` 硬切换悬停色 | 列表项背景保持 `transparent`，由 `.af-menu__thumb`（`useMenuHighlight` / `useKeyedHighlight`）或 `<AfHoverList>`（`installAfListHover`）提供统一滑动底块 | `DESIGN.md` §7.5 & `browser-dom.test.ts` |
| 错误容器一直挂载并始终写入 `aria-describedby` | 错误激活前完全不挂载错误 DOM 也不关联 ID | `contracts.test.tsx` & `browser-dom.test.ts` |
| 点击模态窗内拖动到遮罩松手时关窗 | 同时记录 `pointerdown` 与 `pointerup` 都在遮罩才关闭 | `browser-dom.test.ts` |
| 弹窗/气泡/菜单/节点详情卡 `0ms` 无动画生硬闪现 | 统一接入 `160ms–200ms var(--af-ease)` 缩放+微位移入场动画（`opacity: 0; transform: translateY(4px) scale(0.975)` → `1`），切换同级节点绑定 `key` | `DESIGN.md` §7.6 |
| 卡片收起为单行收据时旧表单仍占流式高度导致腰斩 | 决断态下旧内容设 `position: absolute; inset: 0 0 auto 0; opacity: 0; pointer-events: none`，收据条 `.af-agb-record` 淡入置顶 | `DESIGN.md` §7.7 |
| 紧凑按钮内直接拼接 Unicode `⌄` 与数字导致垂直错位 | 使用 `inline-flex; align-items: center; line-height: 1` + 几何居中的 `<svg>` 矢量箭头 | `DESIGN.md` §7.8 |
| 卡片外框用实色 `#ebebeb` 或分隔线用 `0.5px` + `var(--af-line)` 导致在 `#f7f7f7` 画布与 1x/1.25x 屏上边框消失 | `--af-card-ring` 使用 `rgba(0,0,0,0.08)`，内部分隔线与槽环统一 `1px` + `var(--af-line)`，双栏外壳采用 `Inset` 内嵌圆角画布 | `npm run lint:arch` (Rule 9) & `DESIGN.md` §6.4 |
| 卡片/导航行点击缩小、数字突变、列表瞬删或 `<details>` 生硬弹开 | 严禁卡片 `:active scale`；接入 `useTween` 数字插值、`data-leaving` 先退场再 `useListFlip` 补位、以及 `::details-content` 平滑展开 | `DESIGN.md` §7.9 & `AGENTS.md` |
| `anchorRef` 下拉框、`Tooltip`、子菜单或 `AfMessage` 关闭时 `{open && ...}` `0ms` 瞬间消失 | 统一启用 `useExitTransition`（冻结关闭前锚点与快照），完成 `115ms–150ms` 缩放淡出后再卸载 | `DESIGN.md` §7.10 |
| 在 `preserve-3d` 节点同层写 `overflow: hidden`，或在形变容器用 `overflow: hidden` 削掉 `1px` 卡片环 | `preserve-3d` 节点保持 `overflow: visible`（圆角裁切下沉至背景子层）；形变容器使用 `overflow: clip; overflow-clip-margin: 8px–12px` | `DESIGN.md` §7.10 |
| 骨架流光用 `background-attachment: fixed`（弹窗内失效），或看板用原生 HTML5 `draggable` 残影拖拽 | 流光改用伪元素 `transform: translate3d` 合成层扫光；拖拽统一改用 `setPointerCapture` + 兄弟节点 FLIP 让位 | `DESIGN.md` §7.10 |
| 折线图用 `clip-path` 横擦冒充描边、游标从图表边缘横穿飞入，或减动效下暴露未模糊的裸多边形 | 使用 `pathLength="1"` + `stroke-dashoffset` 匀速描边，游标原地淡入；减动效下静态弥散背景保留柔和渐变兜底且跑马灯静止 | `DESIGN.md` §7.10 |
| 复刻 Pro 组件同时写 `border: 1px solid` + `--af-shadow-card` 或遗留私有色值孤岛 | 卡片统一只用 `--af-shadow-card` 单层发丝环，全面映射至 `--af-*` 明暗自适应令牌 | `npm run lint:arch` & `DESIGN.md` §6.4 / §7.10 |
| 纯基础组件拼装时手写 `gap: 7px / 13px / 18px`、混用不同高度控件、或 `AfCard` 里套 `AfCard` | 统一使用 `--af-space-*` 与 `AfPage` / `AfPageHeader` / `AfSection` / `AfStack` / `AfColumns` / `AfToolbar` / `AfListRow`；同排同 `size`；卡内二级分区用 `AfSurface level="sunken"` | `DESIGN.md` §4 & `Layout & Spacing Guide` |
| 表单/弹窗按钮随意排序（主按钮在左或危险按钮紧贴主按钮） | 危险操作隔离到最左侧，主操作区靠右严格「左次右主」且间距 `8px`（`--af-space-inline`） | `DESIGN.md` §4.3 |

---

## 11. AI Agent 生成 UI 提示词准则（Prompting & Codegen Rules）

在业务应用或 `Aster UI` 仓库中使用 AI 编写任何新界面、迁移页面或新增组件时，务必遵循以下最小约束集（仓库根目录同步提供精简工程红线 [`AGENTS.md`](./AGENTS.md)）：

1. **样式与模块入口**：全量业务引入 `import ... from "@fangxinyan/aster-ui"` 与 `@fangxinyan/aster-ui/styles.css`；仅需轻量化基础控件与宿主窗口层时使用 `import ... from "@fangxinyan/aster-ui/core"` 与 `@fangxinyan/aster-ui/core.css`，按需叠加复合模式/整页/插画样式时搭配 `@fangxinyan/aster-ui/tokens.css` + `@fangxinyan/aster-ui/core.css` 引入 `@fangxinyan/aster-ui/patterns/*.css`、`@fangxinyan/aster-ui/screens/*.css` 或 `@fangxinyan/aster-ui/illustrations/*.css`；根组件使用 `<AsterThemeProvider>` 包裹，禁止混用异构组件库样式或凹凸拟态类名。
2. **优先使用库组件与底座组合**：所有按钮、表单、表格、对话框、分割栏、步骤条、文件树、代码差异、多段计量、统计指标、日历、消息提示、窗口标题栏全部从 `"@fangxinyan/aster-ui"` 或 `"@fangxinyan/aster-ui/core"` 导入 `Af*` / `afMessage` / `useAfConfirm`；自定义可悬停列表统一包裹 `<AfHoverList>`（或声明 `data-af-hover-list`）或接入 `useMenuHighlight` / `useKeyedHighlight`；复合组件内部也必须复用内置 `Af*` 基础原语，不要手写原生 `<select>` / `<dialog>` / `<input type="date">` / `<input type="range">` / 原生复选框或裸 `createPortal`。
3. **布局零 Grid**：自定义业务局部布局统一用 Flexbox，并始终写清 `min-width: 0` 与 `flex-shrink: 0`（固定侧栏/图标）。
4. **数值等宽与中文无障碍**：所有金额、Token、毫秒、日期时间列加 `tabular-nums`（或 `<AfText numeric>`）；图标按钮必须传 `label`（映射到 `aria-label`）。
5. **变更必跑质量门禁**：每次修改后依次通过：
   - `npm run lint:arch`（12 项架构与 affectUI 样式铁律，含 `.af` 作用域收口、`--af-*` 变量完整性与防消失边框检查）
   - `npm run typecheck`
   - `npm run build && npm run check:pkg && npm run test`
   - 视觉变更需通过 `npm run visual:check` / `npm run visual:theme:check`

---

## 12. 传统通用组件 → Aster UI 全量组件与 API 迁移对照表

### 12.1 基础输入、表单与展示组件

| 传统组件名 | Aster UI v0.5.1 对应 | 契约说明 |
| --- | --- | --- |
| `Page / Stack / Row / Grid / Toolbar / ListRow` | `AfPage` / `AfPageHeader` / `AfSection` / `AfStack` / `AfInline` / `AfColumns` / `AfToolbar` / `AfListRow` / `AfSpacer`（`@fangxinyan/aster-ui/core`） | 100% Flexbox 布局与语义间距原语，内置 `--af-space-*` 舒适/紧凑密度缩放、`min-width: 0` 与发丝分隔行 |
| `Button` | `AfButton` | 支持 `xs / sm / md / lg`、`primary / secondary / accent / ghost / outline / dashed / danger`、`block / tip / icon / trailingIcon / iconOnly / loading` |
| `IconButton` | `AfIconButton` | 原生图标按钮封装（支持 `size="xs"`、必填 `label` 无障碍名与 `tip` 提示） |
| `Input` / `Input.Password` / `Input.TextArea` | `AfInput` / `AfInput.Password`（或 `AfPasswordInput`）/ `AfInput.TextArea`（或 `AfTextarea`） | 支持 `variant="outline \| filled \| borderless"`、`inputClassName`、`leadingIcon / trailingIcon / prefix / allowClear / showCount / revealable / onValueChange / onPressEnter`；合法态输出 `aria-invalid="false"` |
| `InputNumber` | `AfNumberInput` | 支持 `precision / controls / prefix / size / min / max / step` |
| `Select` / `Combobox` | `AfSelect` / `AfCombobox`（已纳入 `@fangxinyan/aster-ui/core`） | 单选/多选、框内搜索、远程搜索、`maxCount`、`getOptionDisabled`、`optionRender`、`allowClear`、`maxTagCount` |
| `AutoComplete` | `AfAutoComplete` | 输入联想、自定义筛选、清除与键盘选择 |
| `Cascader` | `AfCascader` | 多栏钻取、框内搜索、`changeOnSelect`、`allowClear` |
| `Upload` / `Dropzone` / `OtpInput` | `AfDropzone`（别名 `AfUpload`）/ `AfOtpInput`（均已纳入 `@fangxinyan/aster-ui/core`） | 拖拽上传区（含禁用态与文件检验）与多格一次性验证码输入 |
| `Checkbox` / `Checkbox.Group` | `AfCheckbox` / `AfCheckboxGroup` | 支持 `size="sm \| md"`、`standalone`（无容器文本纯选框）、`indeterminate` 半选与横向/纵向阵列 |
| `Radio` / `Radio.Group` | `AfRadio` / `AfRadioGroup` / `AfChoiceCards` | 支持基础单选、选项组与卡片单/多选 |
| `Slider` / `Segmented` / `ToggleGroup` | `AfSlider` / `AfSegmented` / `AfToggleGroup` | `AfSlider` 新增 `size="sm \| md"` 与 `inline` 紧贴轨道；`AfSegmented` 新增 `size="xs"`；`AfToggleGroup` 支持 `count` 计数与 `[aria-pressed="true"]` 驱动 |
| `DatePicker` / `Calendar` / `TimePicker` / `DateTimePicker` | `AfDatePicker` / `AfDateRangePicker` / `AfDateRange` / `AfCalendar` / `AfTimePicker`（+ `parseNaturalTime`）/ `AfDateTimePicker` | 纯 Flexbox 月历（零原生 `<input type="date">`）、自然语言时间解析、双模式时段选择；日期核心件已全部晋升至 `@fangxinyan/aster-ui/core` |
| `TagInput` / `ChipInput` | `AfChipInput`（别名 `AfTagInput`，已纳入 `@fangxinyan/aster-ui/core`） | 回车/逗号/粘贴批量建标、重复输入 `data-flash` 轻闪烁提示 |
| `CodeBlock` / `DiffView` | `AfCodeBlock` / `AfDiffView`（新增，`@fangxinyan/aster-ui/core`） | 词法着色、行号与非禁用复制；`AfDiffView` 原生支持 `patch / lines / before+after`、Unified / Split 切换与 `compact` 模式 |
| `MeterBar` / `Progress` / `ProgressRing` | `AfMeterBar`（新增）/ `AfProgress` / `AfProgressRing`（均属 `@fangxinyan/aster-ui/core`） | 多段配额计量条（`xs/sm/md` + 图例高亮）；`AfProgress` 新增 `size` / `animated`；`AfProgressRing` 支持分段弧与连续百分比 `<progress className="af-sr-only">` + `aria-hidden="true"` 双模式 |
| `Steps` / `Tree` | `AfSteps` / `AfTree`（新增，`@fangxinyan/aster-ui/core`） | Safari Flexbox 列表安全 `role="list"`（`number/dot/bar` 三变体）；WAI-ARIA TreeView 键盘方向键展开/收起与缩进引导线 |
| `Statistic` / `Descriptions` | `AfStat` / `AfDescriptions`（新增，`@fangxinyan/aster-ui/core`） | `tabular-nums` 大数字+涨跌标签+Sparkline 指标卡；响应式 Flexbox `columns` 描述列表（支持 `label` / `children` / `mono`） |
| `Divider` / `Separator` | `AfDivider`（别名 `AfSeparator`） | 横竖分隔线与标签嵌入 |
| `Form` / `Form.Item` / `Form.useForm` | `AfForm` / `AfFormItem`（或 `AfForm.Item`）/ `useAfForm`（或 `AfForm.useForm`） | 失焦校验、修复即清错、异步规则、提交聚焦首错、条件 ARIA 播报 |
| `Collapse` / `Accordion` | `AfCollapse` / `AfAccordion` | `<details>` 折叠面板与手风琴别名完全互通 |
| `Table` / `TablePro` / `Table.Column` | `AfTable` / `AfTablePro` / `AfTableColumn` | 自然排序、多选半选、虚拟滚动 `virtual`、列宽拖拽 `resizableColumns`、JSX 子节点声明列 |
| `Splitter` / `Splitter.Panel` | `AfSplitter` / `AfSplitterPanel` | 像素受控主栏 + 自适应余宽栏、拖拽边界与 `collapsed` 折叠 |
| `Tabs` / `ContextMenu` / `ColorPicker` / `Pagination` | `AfTabs` / `AfContextMenu` / `AfColorPicker` / `AfPagination` | `AfTabs` / `AfContextMenu` / `AfColorPicker` 已正式晋升至 `@fangxinyan/aster-ui/core`（`dist/esm/ui.js` + `dist/cjs/ui.cjs` 与 `dist/core.css`） |
| `Card` / `Surface` | `AfCard` / `AfSurface` | `fill / padding / bodyLayout / bodyOverflow / loading / loadingOverlay` 及 `sunken/surface/raised/overlay` 层级表面 |
| `Timeline` | `AfTimeline` | 垂直轨道、`left / alternate / right`、`solid / dashed`、`pending` 与全槽位类名 |
| `Image` / `ImagePreview` / `SpriteImage` / `LayeredImage` | `AfImage` / `AfImagePreview` / `AfSpriteImage` / `AfLayeredImage` | 多图灯箱（缩放/旋转/镜像/2D 平移）、精灵图切片与多层合成 |
| `Typography`（`Title` / `Text` / `Paragraph`） | `AfTypography` / `AfTitle` / `AfText` / `AfParagraph` | 层级标题、语义色调、`tabular-nums` 数值模式与多行省略 |
| `Tag` / `Status` / `Badge` / `Avatar` / `Spin` / `Empty` / `Tooltip` / `HoverCard` | `AfTag` / `AfStatus` / `AfBadge` / `AfAvatar` / `AfSpinner` / `AfEmptyState` / `AfTooltip` / `AfHoverCard` | `AfTag` 新增 `tone="info"`、`size="xs"`、`shape="pill"`、`variant="soft"`；`AfStatus` 支持 `dotOnly`；全语义颜色与非抢焦悬停卡 |

### 12.2 浮层、命令式 API、Agents Pro 模式与桌面壳层

| 传统组件 / affectUI 用法 | Aster UI v0.5.0 对应 | 契约说明 |
| --- | --- | --- |
| `Modal` / `Dialog` / `Drawer` / `Popover` / `DropdownMenu` | `AfModal`（`AfDialog`）/ `AfDrawer` / `AfPopover` / `AfMenu`（`AfDropdownMenu`） | `AfModal/AfDrawer` 支持遮罩防误触关窗；`AfPopover` 新增 `flush` 与 `onEscapeKeyDown` 供复合组件无内边距组合 |
| `Data & Agent Patterns (35)` | `AfBreakdownChart`、`AfAgentPlan`、`AfReviewCenter`、`AfUsageMeter` 等 35 套（含 `*Pattern` 别名） | 全部参数化可配（可选 `Props = {}` 默认演示态 + 业务事件回调），可直接从 `@fangxinyan/aster-ui` 引入 |
| `Agents Pro & Blocks / Screens / Illustrations` | `AfRunControls`…`AfFlowBuilder`、14 套 Blocks、43 套 Screens 与 26 套交互插画 | 1:1 复刻 affectUI Pro 多智能体控制、业务区块、整页应用界面与交互场景插画，支持按需子路径样式引入 |
| `confirm` / `AlertDialog` | `afModal`（`AfModal.confirm / info / success / warning / error`）+ `AfAlertDialog` + `useAfConfirm` | `AsterThemeProvider` 已自动挂载 `<AfModalHost />`，同时支持 `await AfModal.confirm(...)` 与 `dialog.destroy()` |
| `message.info / success / warning / error / loading / dismissByKey / destroy` | `afMessage`（别名 `asterMessage`） + `AfMessageHost` | 无需额外写宿主，`AsterThemeProvider` 已自动挂载 `<AfMessageHost container={portalRoot} />`；支持 `title` 与平滑退场 `dismissByKey` |
| `Icon`（常用工程图标别名如 `SettingOutlined`、`AppstoreOutlined`、`barChart`、`picture`、`sync` 等） | `AfIcon` + `AF_ICON_ALIASES` + `isAfIconName` + `resolveAfIconKey` | 直接传入常见语义或工程图标别名即可自动映射至统一的 16×16 线性图标 |
| `TitleBar` / `WindowControls` | `AfTitleBar` / `AfWindowControls`（同步导出于 `@fangxinyan/aster-ui/core`） | Electron 无边框拖拽栏（自动 `drag` / `no-drag`、macOS 红绿灯安全间距） |
| `ThemeProvider` / `useTheme` / `ThemePanel` | `AsterThemeProvider` / `useAsterTheme` / `AfThemePanel`（同步导出于 `@fangxinyan/aster-ui/core`） | 完整支持明暗、预设/自定义强调色、密度 `comfortable/compact`、圆角 `sm/md/lg`、自定义主题增删改查与 `resolveAsterThemeColors` 桥接 |
