/**
 * Aster UI 架构与高阶动效/视觉防走偏门禁检查（`npm run lint:arch`）。
 *
 * 强制校验以下 14 条不可退化约束：
 *  1. `src/` 下严禁出现 `StageContext` 或 `useStage`（组件不得反向耦合展示站舞台）。
 *  2. 除 `src/primitives/layer.tsx` 外严禁直接 `createPortal(..., document.body)`。
 *  3. 公共桶文件（`src/*.{ts,tsx}`、`src/patterns/*.{ts,tsx}`）严禁透传 `_shared` 或 `_showcase`，且 `src/components/_showcase` 不得复活。
 *  4. `src/index.ts` 导出的所有 `Af*` 组件函数必须接收至少 1 个参数（props），严禁零属性演示卡漏入主包。
 *  5. 非展示站组件库样式表中所有 `filter: ... blur(` 与 `backdrop-filter: ... blur(` 必须包裹在 `@media (prefers-reduced-motion: no-preference)` 内；TSX 内联 `blur(` 必须判读减动效状态；网格弥散层必须保留 `prefers-reduced-motion: reduce` 渐变兜底。
 *  6. `src/` 下所有样式表严禁使用 `display: grid` / `display: inline-grid`（全站统一 Flexbox 排版）。
 *  7. `src/` 下所有样式表严禁使用斑马纹规则（`:nth-child(even|odd|2n)` 或 `[data-striped]`）。
 *  8. `src/` 下所有 `.css` / `.ts` / `.tsx` 引用的无回退 `var(--af-*)` 变量必须全部在源码内存在定义。
 *  9. 全仓非展示站源码严禁使用会在 Windows 1x/1.25x DPI 下消失的 `0.5px` + `var(--...)` 亚像素边线/内嵌阴影，以及 `height: 0.5px` / `width: 0.5px` 亚像素分隔线。
 * 10. 非展示站组件库样式表所有顶层规则必须收口于 `.af` / `.af-*` / `[data-af-*]` 作用域内，严禁逃逸顶层 `:root`、裸 `[data-*]`、裸 `.dark` 或无前缀选择器。
 * 11. `@fangxinyan/aster-ui/core`（`src/ui.tsx`）依赖图严禁直接或间接引用 `src/ui-pro.tsx` 或 `src/patterns/*`。
 * 12. 非展示站生产源码（含注释与字符串）严禁残留内部项目代号（`my-assistant`、`My Assistant`、`@fangxinyan/lumina`、`Lumina`）。
 * 13. 3D 与动效物理门禁：`transform-style: preserve-3d` 严禁同规则声明非 `visible` 的 `overflow` 或 `mask-image`（防止 Chromium 拍平 3D 上下文）；禁用 `background-attachment: fixed`；禁止对 `outline-color` 添加 `transition`；TSX 严禁将 `useTweens` 输出二次喂给 `useTween`。
 * 14. 零双层重影边框与 Pattern 裸色值上限门禁：声明 `var(--af-shadow-card|card-hover|pop|modal)` 的规则严禁同时声明非零 `border`；`src/patterns/` 样式表直接属性裸 `#hex` 严禁突破历史基线。
 * 15. 禁用原生 HTML5 `draggable` / `onDragStart` 幽灵拖拽。
 * 16. FLIP 列表动效契约门禁：严禁误写 `data-flip-key`（必须为 `data-flip`）；线性列表调用 `useAnimatedList` 必须挂载 `containerRef`/`listRef` 并输出 `data-flip`。
 * 17. 复合可点击容器键盘冒泡隔离门禁：内含交互子控件的 `<div role="button|option" onKeyDown>` 处理 `Enter`/空格时必须校验 `e.target !== e.currentTarget`，防止吞掉内部输入框空格或子按钮按键。
 * 18. 局部滚动与列表滑动悬停门禁：定制套件严禁裸调 `.scrollIntoView(` 劫持宿主页面滚动；纵向列表项严禁写静态 `:hover { background }` 单行跳色。
 * 19. 受控状态只读死锁门禁：`useControllableState({ value })` 若解构并调用了 setter，必须绑定 `onChange` 或在触发处同步派发 `on[A-Z]*` 回调。
 * 20. 全局键盘监听作用域门禁：定制套件挂载 `window.addEventListener("keydown")` 必须校验 `contained` / `open` / `[inert]` / `[aria-modal="true"]` 作用域，严禁内嵌态劫持全局单键。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
const violations = [];

function walk(dir, extRegex) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, extRegex));
    else if (extRegex.test(entry.name)) out.push(full);
  }
  return out;
}

function isShowcaseOrSpecs(relPath) {
  return relPath.startsWith("src/showcase/") || relPath.startsWith("src/specs/");
}

/** 仅在顶层逗号（括号与方括号深度均为 0）处拆分复合 CSS 选择器列表。 */
function splitTopLevelSelectors(selectorList) {
  const out = [];
  let current = "";
  let parenDepth = 0;
  let bracketDepth = 0;
  for (let i = 0; i < selectorList.length; i++) {
    const ch = selectorList[i];
    if (ch === "(") parenDepth++;
    else if (ch === ")") parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === "[") bracketDepth++;
    else if (ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);

    if (ch === "," && parenDepth === 0 && bracketDepth === 0) {
      if (current.trim()) out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/** 解析相对 TS/TSX 模块路径（供依赖图遍历使用）。 */
function resolveLocalTsModule(fromFile, spec) {
  if (!spec.startsWith(".") || /\.css$/i.test(spec)) return null;
  const cleanSpec = spec.replace(/\.(?:[cm]?ts|tsx|[cm]?js|jsx)$/i, "");
  const baseAbs = path.resolve(path.dirname(fromFile), cleanSpec);
  for (const candidate of [
    `${baseAbs}.ts`,
    `${baseAbs}.tsx`,
    path.join(baseAbs, "index.ts"),
    path.join(baseAbs, "index.tsx"),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

const tsFiles = walk(srcDir, /\.(ts|tsx)$/);
const cssFiles = walk(srcDir, /\.css$/);

// Rule 1 & 2: StageContext/useStage & direct document.body portals
for (const file of tsFiles) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  const text = fs.readFileSync(file, "utf8");

  if (/\b(StageContext|useStage)\b/.test(text)) {
    violations.push(`[Rule 1] ${rel}: 检测到 StageContext / useStage 残留引用`);
  }

  if (rel !== "src/primitives/layer.tsx" && /createPortal\s*\([\s\S]{0,240}?document\.body\s*\)/.test(text)) {
    violations.push(`[Rule 2] ${rel}: 禁止在 src/primitives/layer.tsx 之外直接 createPortal(..., document.body)`);
  }
}

// Rule 3: No _showcase dir & no _shared / _showcase barrel re-exports
if (fs.existsSync(path.join(srcDir, "components/_showcase"))) {
  violations.push(`[Rule 3] src/components/_showcase: 展示站演示目录不得存在于 src/components/ 内`);
}

const barrelFiles = [
  ...fs.readdirSync(srcDir).filter((n) => /\.(ts|tsx)$/.test(n)).map((n) => path.join(srcDir, n)),
  ...walk(path.join(srcDir, "patterns"), /\.(ts|tsx)$/),
];
for (const file of barrelFiles) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  const text = fs.readFileSync(file, "utf8");
  if (/export\s+\*\s+from\s+["'][^"']*(_shared|_showcase)[^"']*["']/.test(text)) {
    violations.push(`[Rule 3] ${rel}: 公共桶文件禁止 export * from "_shared" 或 "_showcase"`);
  }
}

// Rule 4: Every Af* value component exported from src/index.ts must accept props
const configPath = path.join(root, "tsconfig.json");
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
const indexFile = path.join(srcDir, "index.ts");
const program = ts.createProgram([indexFile], parsed.options);
const checker = program.getTypeChecker();
const sourceFile = program.getSourceFile(indexFile);
const moduleSymbol = sourceFile ? checker.getSymbolAtLocation(sourceFile) : undefined;

if (moduleSymbol) {
  for (const exp of checker.getExportsOfModule(moduleSymbol)) {
    const name = exp.getName();
    if (!/^Af[A-Z]/.test(name)) continue;
    const target = exp.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exp) : exp;
    if (!(target.flags & ts.SymbolFlags.Value)) continue;
    if (name.endsWith("Context")) continue;

    const type = checker.getTypeOfSymbolAtLocation(target, sourceFile);
    const callSigs = type.getCallSignatures();
    if (callSigs.length > 0) {
      const acceptsProps = callSigs.some((sig) => sig.parameters.length >= 1);
      if (!acceptsProps) {
        violations.push(`[Rule 4] src/index.ts -> ${name}: 导出的组件没有接收任何 props 参数（零属性演示卡应移入 src/examples.ts）`);
      }
    }
  }
}

// Rule 5 & Rule 10: Guarded blur(...) & strict .af CSS selector scoping across all library CSS files
const AF_SCOPE_SELECTOR_RE =
  /\.(?:af|ast)(?![a-z0-9_-])|\.(?:af|ast)-|\[data-af-|\[class\^=["']af-|\[class\*=["']\s*af-/;

function checkLibraryCssAst(cssRelPath, rawCss) {
  // Preserve line numbers when stripping block comments
  const clean = rawCss.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const stack = [];
  let pending = "";
  let line = 1;
  let pendingStartLine = 1;

  const checkDeclaration = (rawDecl, declLine) => {
    const decl = rawDecl.trim();
    if (!decl) return;
    if (/(?:^|[\s;])(?:-webkit-)?(?:backdrop-)?filter\s*:[^;{}]*\bblur\s*\(/i.test(decl)) {
      const inReducedMotionGuard = stack.some((h) =>
        /@media\b[^{]*prefers-reduced-motion\s*:\s*no-preference/i.test(h),
      );
      if (!inReducedMotionGuard) {
        violations.push(
          `[Rule 5] ${cssRelPath}:${declLine}: 发现未受 @media (prefers-reduced-motion: no-preference) 保护的模糊声明 "${decl.replace(/\s+/g, " ")}"（规则栈: ${stack.join(" > ")}）`,
        );
      }
    }
  };

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === "\n") {
      line++;
    }
    if (pending.trim().length === 0 && !/\s/.test(ch) && ch !== "{" && ch !== "}" && ch !== ";") {
      pendingStartLine = line;
    }

    if (ch === "{") {
      const header = pending.trim();
      const inKeyframes = stack.some((s) => /^@(?:-[a-z]+-)?keyframes\b/i.test(s));
      const onlyConditionalAtRulesAbove = stack.every((s) =>
        /^@(?:media|supports|layer|container)\b/i.test(s),
      );

      if (!header.startsWith("@") && !inKeyframes && onlyConditionalAtRulesAbove) {
        for (const sel of splitTopLevelSelectors(header)) {
          if (/:root\b/.test(sel)) {
            violations.push(
              `[Rule 10] ${cssRelPath}:${pendingStartLine}: 严禁在组件库 CSS 中使用全局 ":root" 选择器（"${sel.replace(/\s+/g, " ")}"），请收口至 .af / :where(.af)`,
            );
          } else if (!AF_SCOPE_SELECTOR_RE.test(sel)) {
            violations.push(
              `[Rule 10] ${cssRelPath}:${pendingStartLine}: 选择器逃逸 .af 作用域（"${sel.replace(/\s+/g, " ")}"），禁止裸 [data-*]、裸 .dark 或无 .af 前缀全局规则`,
            );
          }
        }
      }

      stack.push(header);
      pending = "";
    } else if (ch === "}") {
      checkDeclaration(pending, pendingStartLine);
      stack.pop();
      pending = "";
    } else if (ch === ";") {
      if (stack.length > 0 && !/^@(?:import|charset|layer|namespace)\b/i.test(pending.trim())) {
        checkDeclaration(pending, pendingStartLine);
      }
      pending = "";
    } else {
      pending += ch;
    }
  }
}

for (const file of cssFiles) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (!isShowcaseOrSpecs(rel)) {
    checkLibraryCssAst(rel, fs.readFileSync(file, "utf8"));
  }
}

// Rule 5 (TSX inline blur & Mesh Floor reduced-motion gradient fallback)
for (const file of tsFiles) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (isShowcaseOrSpecs(rel)) continue;
  const clean = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, (m) => m.replace(/[^\n]/g, " "));
  const lines = clean.split("\n");
  for (let idx = 0; idx < lines.length; idx++) {
    if (/\b(?:backdropFilter|filter)\s*:\s*[^,\n}]*["'`][^"'`]*\bblur\s*\(/i.test(lines[idx])) {
      const windowSlice = lines.slice(Math.max(0, idx - 4), idx + 2).join(" ");
      if (!/\breduced(?:Motion)?\b/.test(windowSlice)) {
        violations.push(
          `[Rule 5] ${rel}:${idx + 1}: TSX 内联 filter/backdropFilter blur(...) 必须判读 useReducedMotion() 降级状态`,
        );
      }
    }
  }
}
{
  const motionCssPath = path.join(srcDir, "motion.css");
  if (fs.existsSync(motionCssPath)) {
    const motionClean = fs.readFileSync(motionCssPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    if (!/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)[\s\S]*?\.af-mo-floor[\s\S]*?gradient\(/i.test(motionClean)) {
      violations.push(
        `[Rule 5] src/motion.css: 网格弥散层 (.af-mo-floor) 必须在 @media (prefers-reduced-motion: reduce) 下提供柔和渐变兜底，严禁暴露裸多边形硬边`,
      );
    }
  }
}

// Rule 6 & 7: No CSS Grid & No Zebra Striping across src/**/*.css
for (const file of cssFiles) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  const clean = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const lines = clean.split("\n");
  for (let idx = 0; idx < lines.length; idx++) {
    const lineText = lines[idx];
    if (/display\s*:\s*(inline-)?grid\b/.test(lineText)) {
      violations.push(`[Rule 6] ${rel}:${idx + 1}: 禁止使用 display: grid / inline-grid，请改用 Flexbox 布局`);
    }
    if (/nth-child\(\s*(even|odd|2n)/.test(lineText) || /\[data-striped\]/.test(lineText)) {
      violations.push(`[Rule 7] ${rel}:${idx + 1}: 禁止使用表格或列表斑马纹样式（affectUI 统一使用 Hairline 分隔线）`);
    }
  }
}

// Rule 8: Every unfallback var(--af-*) in src/**/*.{css,ts,tsx} must be defined
const definedAfVars = new Set();
for (const file of cssFiles) {
  const clean = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of clean.matchAll(/(--af-[a-z0-9-]+)\s*:/gi)) {
    definedAfVars.add(m[1]);
  }
}
for (const file of tsFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/["'](--af-[a-z0-9-]+)["']\s*[,:]/gi)) {
    definedAfVars.add(m[1]);
  }
}
for (const file of [...cssFiles, ...tsFiles]) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  const isCss = file.endsWith(".css");
  const clean = fs
    .readFileSync(file, "utf8")
    .replace(isCss ? /\/\*[\s\S]*?\*\//g : /\/\*[\s\S]*?\*\/|\/\/.*$/gm, (m) => m.replace(/[^\n]/g, " "));
  const lines = clean.split("\n");
  for (let idx = 0; idx < lines.length; idx++) {
    for (const m of lines[idx].matchAll(/var\(\s*(--af-[a-z0-9-]+)\s*\)/gi)) {
      if (!definedAfVars.has(m[1])) {
        violations.push(`[Rule 8] ${rel}:${idx + 1}: 引用了未定义的主题变量 "${m[1]}"`);
      }
    }
  }
}

// Rule 9 (Full-Repo Subpixel Hairline Ban), Rule 13 (3D & Motion Physics) & Rule 14 (Double Borders & Bare HEX Ceiling)
const tokensCss = fs.readFileSync(path.join(srcDir, "tokens.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
if (/--af-card-ring\s*:\s*#[0-9a-f]{3,8}/i.test(tokensCss)) {
  violations.push(`[Rule 9] src/tokens.css: --af-card-ring 禁止使用实色 Hex（在 #f7f7f7 画布上会消失），请使用半透明 rgba(...)`);
}
if (/--af-divider-hairline(-top)?\s*:[^;]*0\.5px/i.test(tokensCss)) {
  violations.push(`[Rule 9] src/tokens.css: --af-divider-hairline 禁止使用 0.5px 亚像素分隔线，请使用 1px`);
}

const BORDER_PROP_RE =
  /^(?:border|border-(?:top|right|bottom|left|inline|inline-start|inline-end|block|block-start|block-end|width))\s*:\s*(.+)$/i;
const CARD_OR_POP_SHADOW_RE =
  /\bbox-shadow\s*:[^;]*var\(\s*--af-shadow-(?:card|card-hover|pop|modal)\b/i;

let patternDirectHexCount = 0;
const PATTERN_DIRECT_HEX_CEILING = 70;

for (const file of cssFiles) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (isShowcaseOrSpecs(rel)) continue;
  const clean = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

  // Line-level physics checks (Rule 13)
  const lines = clean.split("\n");
  for (let idx = 0; idx < lines.length; idx++) {
    if (/\bbackground-attachment\s*:\s*fixed\b/i.test(lines[idx])) {
      violations.push(
        `[Rule 13] ${rel}:${idx + 1}: 严禁使用 background-attachment: fixed（触发全视口重绘与骨架屏流光错位），请改用伪元素 transform: translate3d`,
      );
    }
    if (/\btransition(?:-property)?\s*:[^;{}]*\boutline-color\b/i.test(lines[idx])) {
      violations.push(
        `[Rule 13] ${rel}:${idx + 1}: 严禁对 outline-color 声明过渡动画（会导致鼠标点击出现残影蓝框）`,
      );
    }
  }

  // Rule-block AST checks (Rule 9, Rule 13, Rule 14)
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of clean.matchAll(ruleRe)) {
    const selector = match[1].trim().replace(/\s+/g, " ");
    if (!selector || selector.startsWith("@")) continue;
    const body = match[2];
    const ruleLine = clean.slice(0, match.index).split("\n").length;
    const decls = body
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean);

    // Rule 9: Full-repo subpixel 0.5px border/shadow with CSS vars + standalone 0.5px height/width dividers
    if (rel !== "src/tokens.css") {
      for (const decl of decls) {
        if (/^(?:height|width)\s*:\s*0\.5px$/i.test(decl)) {
          violations.push(
            `[Rule 9] ${rel}:${ruleLine}: 选择器 "${selector}" 禁止声明 "${decl}" 亚像素分隔线（Windows 1x/1.25x DPI 下会舍入为 0px），请改用 1px`,
          );
        }
        if (/^(?:border(?:-[a-z-]+)?|box-shadow)\s*:/i.test(decl) && /(?<![0-9])0\.5px/.test(decl)) {
          const withoutBlurSpread = decl.replace(/1px\s+1px\s+-0\.5px\s+rgba\([^)]+\)/gi, "");
          if (/(?<![0-9])0\.5px/.test(withoutBlurSpread) && /(?:var\s*\(|currentColor)/i.test(withoutBlurSpread)) {
            violations.push(
              `[Rule 9] ${rel}:${ruleLine}: 选择器 "${selector}" 禁止使用 0.5px 搭配主题变量/currentColor（"${decl.replace(/\s+/g, " ")}"），请改用 1px`,
            );
          }
        }
      }
    }

    // Rule 13: preserve-3d must NEVER share an element with non-visible overflow or mask-image
    const hasPreserve3d = decls.some((d) => /^transform-style\s*:\s*preserve-3d\b/i.test(d));
    if (hasPreserve3d) {
      const badOverflow = decls.find((d) =>
        /^overflow(?:-[xy])?\s*:\s*(?!visible\b)/i.test(d),
      );
      const badMask = decls.find((d) => /^(?:-webkit-)?mask(?:-image)?\s*:\s*(?!none\b)/i.test(d));
      if (badOverflow || badMask) {
        violations.push(
          `[Rule 13] ${rel}:${ruleLine}: 选择器 "${selector}" 同时声明了 transform-style: preserve-3d 与 "${(badOverflow ?? badMask).replace(/\s+/g, " ")}"，会被浏览器强制降级为 flat 拍平 3D 空间，请将裁切/遮罩分离至父层或背景子层`,
        );
      }
    }

    // Rule 14: No non-zero CSS border combined with var(--af-shadow-card|card-hover|pop|modal)
    if (CARD_OR_POP_SHADOW_RE.test(body)) {
      for (const decl of decls) {
        const bm = decl.match(BORDER_PROP_RE);
        if (!bm) continue;
        const val = bm[1].trim();
        if (/^(?:0(?:px)?|none|transparent)\b/i.test(val)) continue;
        violations.push(
          `[Rule 14] ${rel}:${ruleLine}: 选择器 "${selector}" 同时声明了阴影描边环与实线边框 "${decl.replace(/\s+/g, " ")}"（造成双层发虚边框），请移除冗余 border`,
        );
      }
    }

    // Rule 14: Track direct bare #hex count in src/patterns/*.css
    if (rel.startsWith("src/patterns/")) {
      for (const decl of decls) {
        if (decl.startsWith("--")) continue;
        if (/^(?:background(?:-color)?|border(?:-[a-z-]+)?|box-shadow)\s*:/i.test(decl) && /#[0-9a-f]{3,8}\b/i.test(decl)) {
          patternDirectHexCount++;
        }
      }
    }
  }
}

if (patternDirectHexCount > PATTERN_DIRECT_HEX_CEILING) {
  violations.push(
    `[Rule 14] src/patterns/*.css: 直接属性裸 #hex 数量 (${patternDirectHexCount}) 超过封顶基线 (${PATTERN_DIRECT_HEX_CEILING})，新增样式必须接入 --af-* 或明暗双态主题令牌`,
  );
}

// Rule 9 (TSX inline subpixel borders) & Rule 13 (No double-tweening useTweens -> useTween)
for (const file of tsFiles) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (isShowcaseOrSpecs(rel)) continue;
  const clean = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, (m) => m.replace(/[^\n]/g, " "));
  const lines = clean.split("\n");
  for (let idx = 0; idx < lines.length; idx++) {
    if (/\b(?:boxShadow|border[A-Za-z]*)\s*:[^\n]*0\.5px[^\n]*var\s*\(/i.test(lines[idx])) {
      violations.push(
        `[Rule 9] ${rel}:${idx + 1}: TSX 内联样式禁止使用 0.5px + var(--...) 亚像素边线，请改用 1px`,
      );
    }
    if (
      /\bonDragStart\s*=/.test(lines[idx]) ||
      /(?<![-\w])draggable\s*=\s*\{(?!\s*false\s*\})/.test(lines[idx]) ||
      /(?<![-\w])draggable\s*=\s*["']true["']/.test(lines[idx]) ||
      /^\s*draggable\s*$/.test(lines[idx])
    ) {
      violations.push(
        `[Rule 15] ${rel}:${idx + 1}: 严禁使用原生 HTML5 draggable / onDragStart 幽灵拖拽，请统一使用 useSortableList / usePointerDragBoard（Pointer Events + setPointerCapture）`,
      );
    }
  }

  for (const tagMatch of clean.matchAll(/<([a-z][a-z0-9-]*)[\s\S]*?>/g)) {
    if (/\sdraggable(?=\s|\/|>)/.test(tagMatch[0])) {
      const lineNo = clean.slice(0, tagMatch.index ?? 0).split("\n").length;
      if (!violations.some((v) => v.startsWith(`[Rule 15] ${rel}:${lineNo}:`))) {
        violations.push(
          `[Rule 15] ${rel}:${lineNo}: 严禁在原生 DOM 标签上声明 HTML5 draggable 幽灵拖拽，请统一使用 useSortableList / usePointerDragBoard`,
        );
      }
    }
  }

  // Detect feeding a useTweens(...) identifier or derived reduce directly into useTween(...)
  const tweensMatch = clean.match(/const\s+([A-Za-z0-9_$]+)\s*=\s*useTweens\s*\(/);
  if (tweensMatch) {
    const tweensVar = tweensMatch[1];
    const derivedVars = new Set([tweensVar]);
    for (const dm of clean.matchAll(new RegExp(`const\\s+([A-Za-z0-9_$]+)\\s*=[^;]*\\b${tweensVar}\\b`, "g"))) {
      derivedVars.add(dm[1]);
    }
    for (const um of clean.matchAll(/useTween\s*\(\s*([^,)]+)/g)) {
      const argExpr = um[1];
      for (const dv of derivedVars) {
        if (new RegExp(`\\b${dv}\\b`).test(argExpr)) {
          violations.push(
            `[Rule 13] ${rel}: 严禁将 useTweens() 的逐帧插值输出（"${dv}"）二次传入 useTween() 造成双重阻尼相位滞后，请直接传入原始目标数值`,
          );
        }
      }
    }
  }
}

// Rule 11: src/ui.tsx (`@fangxinyan/aster-ui/core`) must NEVER transitively import/re-export src/ui-pro.tsx or src/patterns/*
{
  const coreEntry = path.join(srcDir, "ui.tsx");
  const visited = new Set();
  const queue = [{ file: coreEntry, chain: ["src/ui.tsx"] }];

  while (queue.length > 0) {
    const { file, chain } = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);

    const sf = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.ES2022, true);
    const specs = [];
    const collectSpecs = (node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        specs.push(node.moduleSpecifier.text);
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        specs.push(node.moduleSpecifier.text);
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length === 1 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        specs.push(node.arguments[0].text);
      } else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      ) {
        specs.push(node.argument.literal.text);
      }
      ts.forEachChild(node, collectSpecs);
    };
    collectSpecs(sf);

    for (const spec of specs) {
      const target = resolveLocalTsModule(file, spec);
      if (!target) continue;
      const targetRel = path.relative(root, target).replaceAll("\\", "/");
      const nextChain = [...chain, targetRel];
      if (targetRel === "src/ui-pro.tsx" || targetRel.startsWith("src/patterns/")) {
        violations.push(
          `[Rule 11] aster-ui/core 边界破坏：严禁从 src/ui.tsx 依赖链反向引用 "${targetRel}"（链路: ${nextChain.join(" -> ")}）`,
        );
      } else if (!visited.has(target)) {
        queue.push({ file: target, chain: nextChain });
      }
    }
  }
}

// Rule 12: Public-release desensitization across all non-showcase/non-specs src/**/*.{ts,tsx,css}
const INTERNAL_CODENAME_RE = /my[\s-]assistant|@fangxinyan\/lumina|\blumina\b|万宝楼|wanbaolou|剑网3|剑三|\bjx3\b/i;
for (const file of [...tsFiles, ...cssFiles]) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (isShowcaseOrSpecs(rel)) continue;
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (let idx = 0; idx < lines.length; idx++) {
    const m = lines[idx].match(INTERNAL_CODENAME_RE);
    if (m) {
      violations.push(
        `[Rule 12] ${rel}:${idx + 1}: 生产源码/注释不得残留内部项目代号 "${m[0]}"，请改为中性公开发布表述`,
      );
    }
  }
}

// Rule 16 ~ Rule 20: Anti-Recurrence Engineering Gates for Composite & Shell Suites
const CUSTOM_SUITE_FILE_RE = /^src\/components\/(?:project|shell)\//;
const CUSTOM_SUITE_CSS_RE = /^src\/components\/shell\/core-shell\.css$/;

// Rule 16: No `data-flip-key` typo & linear `useAnimatedList` must wire ref + `data-flip`
for (const file of [...tsFiles, ...cssFiles]) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (let idx = 0; idx < lines.length; idx++) {
    if (/\bdata-flip-key\b/.test(lines[idx])) {
      violations.push(
        `[Rule 16] ${rel}:${idx + 1}: 严禁使用错误的 "data-flip-key" 属性（useListFlip 只识别 data-flip），请改为 data-flip={key}`,
      );
    }
  }
}

for (const file of tsFiles) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (!rel.startsWith("src/components/")) continue;
  const raw = fs.readFileSync(file, "utf8");
  const clean = raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, (m) => m.replace(/[^\n]/g, " "));
  if (!/\buseAnimatedList\b/.test(clean)) continue;
  // Exclude 3D depth-stacked card decks (`data-role=`) that do not perform 2D sibling FLIP
  if (/\bdata-role\s*=/.test(clean)) continue;

  const hasFlipAttr = /\bdata-flip\s*=/.test(clean);
  if (!hasFlipAttr) {
    violations.push(
      `[Rule 16] ${rel}: 调用了 useAnimatedList 但未在列表项上声明 data-flip={key}，退场后兄弟节点无法执行 FLIP 升位`,
    );
  }
  for (const callMatch of clean.matchAll(/(?:const|let)\s+([^=]+?)\s*=\s*useAnimatedList(?:<[^>]*>)?\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
    const lhs = callMatch[1];
    const optsBody = callMatch[2];
    const lineNo = clean.slice(0, callMatch.index ?? 0).split("\n").length;
    const passesContainerRef = /\bcontainerRef\b/.test(optsBody);
    const destructuresListRef = /\blistRef\b/.test(lhs);
    const varName = lhs.trim().match(/^[A-Za-z0-9_$]+$/)?.[0];
    const accessesDotListRef = varName ? new RegExp(`\\b${varName}\\.listRef\\b`).test(clean) : false;
    if (!passesContainerRef && !destructuresListRef && !accessesDotListRef) {
      violations.push(
        `[Rule 16] ${rel}:${lineNo}: useAnimatedList 既未传入 containerRef 也未绑定返回的 listRef，FLIP 补位动画将静默失效`,
      );
    }
  }
}

// Rule 17, Rule 18 (TSX), Rule 19 & Rule 20: AST & Semantic Gates across Custom Suites
const INTERACTIVE_DESCENDANT_RE =
  /<(?:AfButton|AfIconButton|AfCheckbox|AfSwitch|AfInput|AfNumberInput|AfOverflowTagList|button|input|select|textarea)\b|\bdata-no-drag\b/;

for (const file of tsFiles) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (!CUSTOM_SUITE_FILE_RE.test(rel)) continue;
  const raw = fs.readFileSync(file, "utf8");
  const clean = raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, (m) => m.replace(/[^\n]/g, " "));
  const sf = ts.createSourceFile(file, raw, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);

  // Rule 18 (TSX): Ban raw .scrollIntoView( inside custom suites
  const cleanLines = clean.split("\n");
  for (let idx = 0; idx < cleanLines.length; idx++) {
    if (/\.scrollIntoView\s*(?:\?\.)?\s*\(/.test(cleanLines[idx])) {
      violations.push(
        `[Rule 18] ${rel}:${idx + 1}: 定制组件内严禁直接调用 scrollIntoView()（会连带滚动外层展示站或宿主工作台页面），请改算局部滚动容器 scrollTop`,
      );
    }
  }

  // Collect local helper functions that guard `target !== currentTarget` / `target === currentTarget`
  const guardedKeyHandlers = new Set();
  const collectGuardedFns = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      const fnText = node.initializer.getText(sf);
      if (/\.target\s*(?:!==|===)\s*[A-Za-z0-9_$.]+\.currentTarget/.test(fnText)) {
        guardedKeyHandlers.add(node.name.text);
      }
    } else if (ts.isFunctionDeclaration(node) && node.name) {
      const fnText = node.getText(sf);
      if (/\.target\s*(?:!==|===)\s*[A-Za-z0-9_$.]+\.currentTarget/.test(fnText)) {
        guardedKeyHandlers.add(node.name.text);
      }
    }
    ts.forEachChild(node, collectGuardedFns);
  };
  collectGuardedFns(sf);

  // Rule 17: Outer <div role="button|option" onKeyDown={...}> containing interactive children must guard currentTarget
  const checkJsxCompositeKeyDown = (node) => {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      const tagName = opening.tagName.getText(sf);
      if (tagName === "div") {
        let isButtonOrOptionRole = false;
        let onKeyDownAttr = null;
        for (const prop of opening.attributes.properties) {
          if (!ts.isJsxAttribute(prop) || !prop.initializer) continue;
          const attrName = prop.name.getText(sf);
          if (attrName === "role" && ts.isStringLiteral(prop.initializer)) {
            if (prop.initializer.text === "button" || prop.initializer.text === "option") {
              isButtonOrOptionRole = true;
            }
          } else if (attrName === "onKeyDown") {
            onKeyDownAttr = prop;
          }
        }

        if (isButtonOrOptionRole && onKeyDownAttr) {
          const childrenText = node.children.map((c) => c.getText(sf)).join("\n");
          if (INTERACTIVE_DESCENDANT_RE.test(childrenText)) {
            const handlerText = onKeyDownAttr.initializer.getText(sf);
            const handlesEnterOrSpace =
              /["']Enter["']|["']\s["']/.test(handlerText) ||
              (ts.isJsxExpression(onKeyDownAttr.initializer) &&
                onKeyDownAttr.initializer.expression &&
                ts.isIdentifier(onKeyDownAttr.initializer.expression));
            const hasInlineGuard =
              /\.target\s*(?:!==|===)\s*[A-Za-z0-9_$.]+\.currentTarget/.test(handlerText);
            const refIdent =
              ts.isJsxExpression(onKeyDownAttr.initializer) &&
              onKeyDownAttr.initializer.expression &&
              ts.isIdentifier(onKeyDownAttr.initializer.expression)
                ? onKeyDownAttr.initializer.expression.text
                : null;
            const hasHelperGuard = Boolean(refIdent && guardedKeyHandlers.has(refIdent));

            if (handlesEnterOrSpace && !hasInlineGuard && !hasHelperGuard) {
              const lineNo = sf.getLineAndCharacterOfPosition(onKeyDownAttr.getStart(sf)).line + 1;
              violations.push(
                `[Rule 17] ${rel}:${lineNo}: 内含交互子控件的 <div role="button|option"> 的 onKeyDown 必须添加 "if (e.target !== e.currentTarget) return;"，防止劫持子输入框空格或子按钮键盘事件`,
              );
            }
          }
        }
      }
    }
    ts.forEachChild(node, checkJsxCompositeKeyDown);
  };
  checkJsxCompositeKeyDown(sf);

  // Rule 19: `const [val, setVal] = useControllableState({ value: ..., ... })` without `onChange` or paired `on[A-Z]*` notification
  const checkControllableState = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isArrayBindingPattern(node.name) &&
      node.name.elements.length >= 2 &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const calleeText = node.initializer.expression.getText(sf);
      if (calleeText === "useControllableState" && node.initializer.arguments.length >= 1) {
        const arg0 = node.initializer.arguments[0];
        const setterEl = node.name.elements[1];
        if (
          ts.isObjectLiteralExpression(arg0) &&
          ts.isBindingElement(setterEl) &&
          ts.isIdentifier(setterEl.name)
        ) {
          const setterName = setterEl.name.text;
          let hasValueProp = false;
          let hasOnChangeProp = false;
          for (const prop of arg0.properties) {
            const propName = prop.name?.getText(sf);
            if (propName === "value") hasValueProp = true;
            if (propName === "onChange") hasOnChangeProp = true;
          }
          if (hasValueProp && !hasOnChangeProp) {
            const setterCallSites = [];
            for (let i = 0; i < cleanLines.length; i++) {
              if (new RegExp(`\\b${setterName}\\s*\\(`).test(cleanLines[i])) {
                setterCallSites.push(i);
              }
            }
            if (setterCallSites.length > 0) {
              const unnotifiedSite = setterCallSites.find((lineIdx) => {
                const win = cleanLines
                  .slice(Math.max(0, lineIdx - 3), Math.min(cleanLines.length, lineIdx + 5))
                  .join("\n");
                return !/\bon[A-Z][A-Za-z0-9_]*\s*(?:\?\.)?\s*\(/.test(win);
              });
              if (unnotifiedSite !== undefined) {
                const declLine = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
                violations.push(
                  `[Rule 19] ${rel}:${declLine}: useControllableState 声明了受控 value 但未传 onChange，且在调用 ${setterName}() 处（第 ${unnotifiedSite + 1} 行）未派发任何 on* 回调，受控模式下将产生只读死锁`,
                );
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, checkControllableState);
  };
  checkControllableState(sf);

  // Rule 20: `window.addEventListener("keydown", ...)` in custom suites must scope against contained/open/inert/aria-modal
  const checkWindowKeyListeners = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(sf) === "useEffect" &&
      node.arguments.length >= 1
    ) {
      const effectText = node.arguments[0].getText(sf);
      if (/window\.addEventListener\s*\(\s*["']keydown["']/.test(effectText)) {
        const hasScopeGuard =
          /\b(?:contained|open|drawerOpen)\b|\[inert\]|aria-modal/.test(effectText);
        if (!hasScopeGuard) {
          const lineNo = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          violations.push(
            `[Rule 20] ${rel}:${lineNo}: 定制组件挂载 window.addEventListener("keydown") 必须校验 contained / open / [inert] / [aria-modal="true"] 作用域，严禁内嵌预览态劫持宿主全局按键`,
          );
        }
      }
    }
    ts.forEachChild(node, checkWindowKeyListeners);
  };
  checkWindowKeyListeners(sf);
}

// Rule 18 (CSS): Ban non-transparent static `:hover { background }` on vertical list rows/items in custom suite CSS
for (const file of cssFiles) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (!CUSTOM_SUITE_CSS_RE.test(rel)) continue;
  const clean = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of clean.matchAll(ruleRe)) {
    const selector = match[1].trim().replace(/\s+/g, " ");
    if (!/__(?:row|item|list-item)(?:\[[^\]]*\])?:hover\b/.test(selector)) continue;
    const decls = match[2]
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean);
    for (const decl of decls) {
      const bgMatch = decl.match(/^background(?:-color)?\s*:\s*(.+)$/i);
      if (bgMatch && !/^(?:transparent|none)\b/i.test(bgMatch[1].trim())) {
        const ruleLine = clean.slice(0, match.index ?? 0).split("\n").length;
        violations.push(
          `[Rule 18] ${rel}:${ruleLine}: 列表项选择器 "${selector}" 禁止声明静态悬停背景 "${decl.replace(/\s+/g, " ")}"（AGENTS.md §2.3），请接入 data-af-hover-list + data-af-hover-item 全局滑动底块`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error("架构规范检查未通过：");
  for (const v of violations) console.error("  - " + v);
  process.exit(1);
}

console.log(`架构规范检查通过（扫描 ${tsFiles.length} 个源码文件、${cssFiles.length} 个样式文件，20 项门禁全部满足）。`);
