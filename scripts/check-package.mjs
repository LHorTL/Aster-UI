/**
 * Aster UI npm 发布质量自动化门禁（`npm run check:pkg`）。
 *
 * 覆盖 7 项生产级发包校验（等价 publint + @arethetypeswrong/cli + 全量 SSR 零警告 + README 示例代码实编 + 摇树实测）：
 * 1. `npm pack --dry-run --json` 白名单与解包体积校验（含 DESIGN.md，零 src/map/tests 泄漏）
 * 2. `package.json` 元数据（author/repository/homepage/bugs）与 exports 全量子路径/通配符可达性校验
 * 3. `dist/` 产物纯净度扫描（无死桥接残余、保留 .d.ts JSDoc、零内部代号泄漏、无缺失扩展名、无未展开 @import）
 * 4. 4 矩阵消费者严格 TypeScript 校验（skipLibCheck: false：NodeNext ESM / NodeNext CJS / Bundler 全量 CSS / Node10）
 * 5. Node ESM + CJS 全部 17 个 JS 子路径双运行时对称性与全量零必填属性组件（含 26 插画 + 43 Screens）零警告 SSR 校验
 * 6. `README.md` 相对路径链接打包可达性与全部 `ts`/`tsx` 代码块内存 `ts.createProgram` 编译校验
 * 7. `esbuild` 组件级按需 Tree-Shaking 与按需 CSS 子路径打包实测门禁
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build as esbuild } from "esbuild";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const PATTERN_NAMES = [
  "agents-a",
  "agents-b",
  "agents-c",
  "agents-d",
  "chat",
  "data",
  "inputs",
  "project",
  "shell",
];

const SCREEN_CSS_NAMES = [
  "screens-agent-ops",
  "screens-agent-runs",
  "screens-chat",
  "screens-onboarding",
  "screens-settings",
  "screens-workspace",
];

const ILLUSTRATION_CSS_NAMES = [
  "illustrations-a",
  "illustrations-b",
];

const ALL_26_ILLUSTRATIONS = [
  "AfAgentTeam",
  "AfCoverFlow",
  "AfEmptyCalendar",
  "AfEnrichmentOrbit",
  "AfGhostedChat",
  "AfGlassFolder",
  "AfFrostCloud",
  "AfGlowCloud",
  "AfGlowKeyboard",
  "AfInspectAgentCard",
  "AfInspectComposer",
  "AfIntegrationBeam",
  "AfIntegrationFlow",
  "AfIntegrationGrid",
  "AfLayerStack",
  "AfLeadSourcing",
  "AfLogoCluster",
  "AfModelWheel",
  "AfOutreachBranches",
  "AfProjectFlow",
  "AfRegionDach",
  "AfSideFolder",
  "AfTabOverload",
  "AfTeamInvite",
  "AfVoiceOrb",
  "AfWorldMap",
];

const ALL_43_SCREENS = [
  "AfAppShellInset",
  "AfAppShellFlat",
  "AfOnboarding",
  "AfOnboardingWebsite",
  "AfOnboardingBrand",
  "AfOnboardingTone",
  "AfOnboardingReady",
  "AfSettingsGeneral",
  "AfSettingsMembers",
  "AfSettingsModels",
  "AfSettingsNotifications",
  "AfSettingsPreferences",
  "AfSettingsPrivacy",
  "AfSettingsProfile",
  "AfSettingsSecurity",
  "AfSettingsSubscription",
  "AfAnalytics",
  "AfCrm",
  "AfEvals",
  "AfFiles",
  "AfFolder",
  "AfIntegrations",
  "AfKanban",
  "AfAssistantHome",
  "AfAssistantOverview",
  "AfAgentChat",
  "AfAgentChatProgress",
  "AfAgentChatRail",
  "AfAgentRun",
  "AfAgentThread",
  "AfAgentActivity",
  "AfAgentMemory",
  "AfAgentPermissions",
  "AfAgentSchedules",
  "AfAgentSkills",
  "AfAgentUsage",
  "AfAgents",
  "AfAgentInboxBoard",
  "AfAgentOrchestration",
  "AfAgentRunDetail",
  "AfAgentTasks",
  "AfInbox",
  "AfWorkflowBuilder",
];

function fail(message) {
  console.error(`\n[check:pkg] 失败：${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

/** 递归收集 package.json exports 中所有目标路径。 */
function collectExportTargets(value, keyLabel, out) {
  if (typeof value === "string") {
    out.push({ key: keyLabel, target: value });
    return;
  }
  if (value && typeof value === "object") {
    for (const [subKey, subVal] of Object.entries(value)) {
      collectExportTargets(subVal, `${keyLabel}.${subKey}`, out);
    }
  }
}

/** 展开 exports 通配符目标路径。 */
function expandWildcardTarget(target) {
  if (target.includes("/patterns/")) {
    return PATTERN_NAMES.map((name) => target.replaceAll("*", name));
  }
  if (target.includes("/screens/")) {
    return SCREEN_CSS_NAMES.map((name) => target.replaceAll("*", name));
  }
  if (target.includes("/illustrations/")) {
    return ILLUSTRATION_CSS_NAMES.map((name) => target.replaceAll("*", name));
  }
  fail(`未知的 exports 通配符模式（请在 check-package.mjs 注册展开表）: ${target}`);
}

/** 1. Tarball 白名单与解包体积校验 */
function checkTarball() {
  const raw = execSync("npm pack --dry-run --json", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const parsed = JSON.parse(raw);
  assert(Array.isArray(parsed) && parsed.length > 0, "npm pack --dry-run --json 返回格式异常");
  const packInfo = parsed[0];
  const packedSet = new Set(packInfo.files.map((f) => f.path.replaceAll("\\", "/")));

  const requiredFiles = [
    "package.json",
    "README.md",
    "DESIGN.md",
    "LICENSE",
    "CHANGELOG.md",
    "assets/INTER-LICENSE.txt",
    "assets/showcase-light.png",
    "assets/showcase-dark.png",
  ];
  for (const req of requiredFiles) {
    assert(packedSet.has(req), `npm pack 缺少必需文件: ${req}`);
  }

  for (const file of packedSet) {
    assert(!file.startsWith("src/"), `Tarball 不得包含源码目录文件: ${file}`);
    assert(!file.startsWith("tests/"), `Tarball 不得包含测试文件: ${file}`);
    assert(!file.startsWith("visual/"), `Tarball 不得包含视觉快照: ${file}`);
    assert(!file.startsWith("scripts/"), `Tarball 不得包含构建脚本: ${file}`);
    assert(file !== "index.html", "Tarball 不得包含展示站产物 index.html");
    assert(!file.endsWith(".map"), `Tarball 不得包含超大 .map 调试文件: ${file}`);
    assert(
      !/showcase|specs/i.test(file.replace(/^assets\/showcase-(light|dark)\.png$/, "")),
      `Tarball 混入展示站/规格文件: ${file}`,
    );
  }

  const maxUnpackedBytes = 19.5 * 1024 * 1024;
  const maxCompressedBytes = 5.5 * 1024 * 1024;
  assert(
    packInfo.unpackedSize < maxUnpackedBytes,
    `Tarball 解包体积过大 (${(packInfo.unpackedSize / 1024 / 1024).toFixed(2)} MB >= 19.50 MB)`,
  );
  assert(
    packInfo.size < maxCompressedBytes,
    `Tarball 压缩包体积过大 (${(packInfo.size / 1024 / 1024).toFixed(2)} MB >= 5.50 MB)`,
  );

  console.log(
    `[1/7] Tarball 白名单通过：${packedSet.size} 个文件，压缩 ${(packInfo.size / 1024).toFixed(1)} KiB，解包 ${(packInfo.unpackedSize / 1024 / 1024).toFixed(2)} MB`,
  );
  return packedSet;
}

/** 2. package.json 元数据与 exports 目标完整性校验 */
function checkExportsAndMetadata(packedSet) {
  assert(pkg.license === "MIT", `package.json.license 应为 MIT，当前为 ${pkg.license}`);
  assert(
    (typeof pkg.author === "string" && pkg.author.trim().length > 0) ||
      (pkg.author && typeof pkg.author.name === "string" && pkg.author.name.trim().length > 0),
    "package.json.author 缺失",
  );
  assert(
    pkg.repository &&
      pkg.repository.type === "git" &&
      typeof pkg.repository.url === "string" &&
      pkg.repository.url.includes("github.com/"),
    "package.json.repository 配置缺失或格式不合法",
  );
  assert(
    typeof pkg.homepage === "string" && pkg.homepage.startsWith("https://"),
    "package.json.homepage 配置缺失或格式不合法",
  );
  assert(
    pkg.bugs && typeof pkg.bugs.url === "string" && pkg.bugs.url.startsWith("https://"),
    "package.json.bugs.url 配置缺失或格式不合法",
  );
  assert(Array.isArray(pkg.keywords) && pkg.keywords.length >= 5, "package.json.keywords 过少");
  assert(pkg.engines?.node, "package.json.engines.node 缺失");
  assert(
    Array.isArray(pkg.sideEffects) && pkg.sideEffects.some((s) => s.includes(".css")),
    "package.json.sideEffects 配置不完整",
  );

  const requiredExportKeys = [
    ".",
    "./runtime",
    "./core",
    "./ui-pro",
    "./examples",
    "./theme",
    "./primitives",
    "./icons",
    "./motion",
    "./patterns/*",
    "./patterns/*.css",
    "./screens/*.css",
    "./illustrations/*.css",
    "./tokens.css",
    "./core.css",
    "./styles.css",
    "./ui.css",
    "./ui-pro.css",
    "./motion.css",
    "./package.json",
  ];
  for (const key of requiredExportKeys) {
    assert(pkg.exports && key in pkg.exports, `package.json.exports 缺少必需子路径: "${key}"`);
  }

  const targets = [
    { key: "main", target: pkg.main },
    { key: "module", target: pkg.module },
    { key: "types", target: pkg.types },
  ];
  collectExportTargets(pkg.exports, "exports", targets);

  let verifiedTargets = 0;
  for (const { key, target } of targets) {
    assert(typeof target === "string" && target.startsWith("./"), `${key} 路径格式非法: ${target}`);
    assert(!target.startsWith("./src/"), `${key} 禁止指向 ./src/: ${target}`);
    assert(!/\.tsx?$/.test(target) || /\.d\.[cm]?ts$/.test(target), `${key} 禁止指向未编译 TS 源码: ${target}`);

    const expandedList = target.includes("*") ? expandWildcardTarget(target) : [target];
    for (const item of expandedList) {
      const rel = item.slice(2);
      const abs = path.join(root, rel);
      assert(fs.existsSync(abs), `${key} 目标文件不存在: ${rel}`);
      assert(packedSet.has(rel), `${key} 目标文件未打入 tarball: ${rel}`);
      verifiedTargets++;
    }
  }

  console.log(`[2/7] Package 元数据与 exports 完整性通过：共校验 ${verifiedTargets} 个可达目标`);
}

/** 3. dist/ 产物纯净度、无死桥接、JSDoc 保留与显式扩展名校验 */
function checkDistPurity() {
  const distFiles = walkFiles(distDir);
  assert(distFiles.length > 0, "dist/ 目录为空，请先执行 npm run build");

  const forbiddenDeadFiles = [
    "esm/types.js",
    "esm/types.d.ts",
    "cjs/types.cjs",
    "cjs/types.d.cts",
    "index.mjs",
    "core.mjs",
    "examples.mjs",
    "index.d.ts",
    "ui.d.ts",
    "examples.d.ts",
  ];
  for (const deadRel of forbiddenDeadFiles) {
    assert(!fs.existsSync(path.join(distDir, deadRel)), `dist/${deadRel} 已废弃死产物不应再生成`);
  }

  const themeDts = fs.readFileSync(path.join(distDir, "esm", "theme.d.ts"), "utf8");
  assert(
    themeDts.includes("/**"),
    "dist/esm/theme.d.ts 丢失 JSDoc 注释（请检查 build-lib.mjs 中 removeComments: false）",
  );

  const specifierRegex =
    /(?:^|[;\n])\s*(?:import|export)(?:\s+type)?(?:\s+|(?=[{*"']))(?:[^;"']*?\bfrom\s*)?["']([^"']+)["']/g;
  const dynamicImportRegex = /import\(\s*["']([^"']+)["']\s*\)/g;
  const cjsRequireRegex = /\brequire\(\s*["']([^"']+)["']\s*\)/g;
  const internalLeakRe = /my[\s-]assistant|@fangxinyan\/lumina|\blumina\b|万宝楼|wanbaolou|剑网3|剑三|\bjx3\b/i;

  for (const file of distFiles) {
    const rel = path.relative(distDir, file).replaceAll("\\", "/");
    assert(!/showcase|specs/i.test(rel), `dist/ 混入展示站/规格产物: ${rel}`);
    const content = fs.readFileSync(file, "utf8");

    const leakMatch = content.match(internalLeakRe);
    assert(!leakMatch, `dist/${rel} 残留未脱敏内部项目代号: "${leakMatch?.[0]}"`);

    if (file.endsWith(".css")) {
      const cleanCss = content.replace(/\/\*[\s\S]*?\*\//g, "");
      assert(!/@import\b/.test(cleanCss), `dist/${rel} 存在未展开的 @import`);
      continue;
    }

    if (file.endsWith(".d.ts") || file.endsWith(".d.cts")) {
      const expectedExt = file.endsWith(".d.cts") ? ".cjs" : ".js";
      for (const regex of [specifierRegex, dynamicImportRegex]) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const spec = match[1];
          assert(!/\.css$/i.test(spec), `声明文件禁止残留 CSS 导入: dist/${rel} -> "${spec}"`);
          if (spec.startsWith(".")) {
            assert(
              spec.endsWith(expectedExt),
              `声明文件相对路径必须以 "${expectedExt}" 结尾: dist/${rel} -> "${spec}"`,
            );
            const targetDecl = path
              .resolve(path.dirname(file), spec)
              .replace(expectedExt === ".cjs" ? /\.cjs$/ : /\.js$/, file.endsWith(".d.cts") ? ".d.cts" : ".d.ts");
            assert(fs.existsSync(targetDecl), `声明引用目标不存在: dist/${rel} -> ${spec}`);
          }
        }
      }
      continue;
    }

    if (file.endsWith(".js") || file.endsWith(".mjs")) {
      const reactImportMatches =
        content.match(/\bfrom\s*["']react["']|(?:^|[;\n])\s*import\s*["']react["']/g) ?? [];
      assert(reactImportMatches.length <= 1, `ESM 模块存在重复 React 导入 (${reactImportMatches.length}): dist/${rel}`);
      for (const regex of [specifierRegex, dynamicImportRegex]) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const spec = match[1];
          assert(!/\.css$/i.test(spec), `ESM 产物禁止残留 CSS 导入: dist/${rel} -> "${spec}"`);
          if (spec.startsWith(".")) {
            assert(
              spec.endsWith(".js") || spec.endsWith(".mjs"),
              `ESM 相对导入必须含显式扩展名: dist/${rel} -> "${spec}"`,
            );
            const targetJs = path.resolve(path.dirname(file), spec);
            assert(fs.existsSync(targetJs), `ESM 相对导入目标不存在: dist/${rel} -> ${spec}`);
          }
        }
      }
      continue;
    }

    if (file.endsWith(".cjs")) {
      cjsRequireRegex.lastIndex = 0;
      let match;
      while ((match = cjsRequireRegex.exec(content)) !== null) {
        const spec = match[1];
        assert(!/\.css$/i.test(spec), `CJS 产物禁止残留 CSS require: dist/${rel} -> "${spec}"`);
        if (spec.startsWith(".")) {
          assert(spec.endsWith(".cjs"), `CJS 相对 require 必须以 ".cjs" 结尾: dist/${rel} -> "${spec}"`);
          const targetCjs = path.resolve(path.dirname(file), spec);
          assert(fs.existsSync(targetCjs), `CJS 相对 require 目标不存在: dist/${rel} -> ${spec}`);
        }
      }
    }
  }

  console.log(`[3/7] 产物纯净度通过：扫描 ${distFiles.length} 个 dist/ 文件，保留 JSDoc 且零死产物/内部代号/CSS残余`);
}

/** 创建指向源依赖与目标包的隔离临时消费者目录。 */
async function createIsolatedConsumerDir() {
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "aster-ui-pkg-check-"));
  const nmDir = path.join(tmpDir, "node_modules");
  const typesDir = path.join(nmDir, "@types");
  await fsp.mkdir(typesDir, { recursive: true });

  await fsp.writeFile(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ name: "aster-ui-consumer-check", private: true, type: "module" }, null, 2),
    "utf8",
  );

  // 将 node_modules/@fangxinyan/aster-ui 联接回当前包根目录
  const pkgTargetDir = path.join(nmDir, ...pkg.name.split("/"));
  await fsp.mkdir(path.dirname(pkgTargetDir), { recursive: true });
  await fsp.symlink(root, pkgTargetDir, "junction");

  // 联接运行时及类型依赖（含 @types/react 传递依赖）
  const depsToLink = ["react", "react-dom", "csstype", "scheduler", "prop-types", "loose-envify", "js-tokens"];
  for (const dep of depsToLink) {
    const srcDep = path.join(root, "node_modules", dep);
    if (fs.existsSync(srcDep)) {
      await fsp.symlink(srcDep, path.join(nmDir, dep), "junction");
    }
  }
  const typeDeps = ["react", "react-dom", "prop-types"];
  for (const tDep of typeDeps) {
    const srcTypeDep = path.join(root, "node_modules", "@types", tDep);
    if (fs.existsSync(srcTypeDep)) {
      await fsp.symlink(srcTypeDep, path.join(typesDir, tDep), "junction");
    }
  }

  return tmpDir;
}

function assertProgramClean(entryFiles, options, label) {
  const roots = Array.isArray(entryFiles) ? entryFiles : [entryFiles];
  const program = ts.createProgram(roots, options);
  const diags = ts.getPreEmitDiagnostics(program);
  if (diags.length > 0) {
    const formatted = diags
      .slice(0, 15)
      .map((d) => {
        const where = d.file ? path.relative(root, d.file.fileName) : "<global>";
        const pos =
          d.file && d.start !== undefined
            ? d.file.getLineAndCharacterOfPosition(d.start)
            : { line: 0, character: 0 };
        return `  ${where}:${pos.line + 1}:${pos.character + 1} TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`;
      })
      .join("\n");
    fail(`[${label}] skipLibCheck:false 严格类型校验失败 (${diags.length} errors):\n${formatted}`);
  }
}

/** 4. 4 矩阵消费者严格 TypeScript 校验（NodeNext ESM / NodeNext CJS / Bundler 全量 CSS / Node10） */
async function checkConsumerTypeScript(tmpDir) {
  const baseOpts = {
    target: ts.ScriptTarget.ES2022,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    strict: true,
    skipLibCheck: false,
    noEmit: true,
    jsx: ts.JsxEmit.ReactJSX,
    baseUrl: tmpDir,
    typeRoots: [path.join(tmpDir, "node_modules", "@types")],
    types: ["react", "react-dom"],
  };

  const patternImports = PATTERN_NAMES.map(
    (name, idx) => `import * as PatternMod${idx} from "@fangxinyan/aster-ui/patterns/${name}";`,
  ).join("\n");
  const patternRefs = PATTERN_NAMES.map((_, idx) => `PatternMod${idx}`).join(", ");

  // 4.1 NodeNext ESM (.mts) — 覆盖全部 18 个 JS 子路径与 core/runtime 独立宿主闭环符号
  const esmEntry = path.join(tmpDir, "consumer-esm.mts");
  await fsp.writeFile(
    esmEntry,
    `
import {
  AsterThemeProvider,
  AfButton,
  AfCascader,
  AfForm,
  type AfButtonProps,
  type AffectIconKey,
  type AsterThemeProviderProps,
} from "@fangxinyan/aster-ui";
import {
  AsterThemeProvider as RuntimeThemeProvider,
  AfButton as RuntimeButton,
  AfPluginProvider,
  createAsterPluginRuntime,
  type AsterPluginSharedBundle,
} from "@fangxinyan/aster-ui/runtime";
import {
  AsterThemeProvider as CoreThemeProvider,
  useAsterTheme as useCoreTheme,
  AfTitleBar as CoreTitleBar,
  AfWindowControls as CoreWindowControls,
  AfThemePanel as CoreThemePanel,
  createAsterPluginRuntime as createCorePluginRuntime,
  cn as coreCn,
  copyToClipboard as coreCopy,
  AfMeterBar,
  AfDiffView,
  type AfMeterBarProps,
} from "@fangxinyan/aster-ui/core";
import { useTween, AfSwap } from "@fangxinyan/aster-ui/ui-pro";
import { AfBreakdownChartPattern } from "@fangxinyan/aster-ui/examples";
import { resolveAsterThemeColors, type AsterThemeMode } from "@fangxinyan/aster-ui/theme";
import { AfHoverList, useKeyedHighlight } from "@fangxinyan/aster-ui/primitives";
import { AfIcon, AimOutlined } from "@fangxinyan/aster-ui/icons";
import { AfBlurCrossfade } from "@fangxinyan/aster-ui/motion";
${patternImports}

export const variant: NonNullable<AfButtonProps["variant"]> = "primary";
export const mode: AsterThemeMode = "dark";
export const iconKey: AffectIconKey = "sparkle";
export const hostProps: Partial<AsterThemeProviderProps> = {
  transparent: true,
  target: "document",
  storage: false,
};
export type MeterProps = AfMeterBarProps;
export type PluginShared = AsterPluginSharedBundle;
export const symbols = [
  AsterThemeProvider,
  RuntimeThemeProvider,
  RuntimeButton,
  AfPluginProvider,
  createAsterPluginRuntime,
  CoreThemeProvider,
  useCoreTheme,
  CoreTitleBar,
  CoreWindowControls,
  CoreThemePanel,
  createCorePluginRuntime,
  coreCn,
  coreCopy,
  AfButton,
  AfCascader,
  AfForm,
  AfMeterBar,
  AfDiffView,
  useTween,
  AfSwap,
  AfBreakdownChartPattern,
  resolveAsterThemeColors,
  AfHoverList,
  useKeyedHighlight,
  AfIcon,
  AimOutlined,
  AfBlurCrossfade,
  ${patternRefs},
];
`,
    "utf8",
  );
  assertProgramClean(
    esmEntry,
    {
      ...baseOpts,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
    },
    "NodeNext ESM",
  );

  // 4.2 NodeNext CJS (.cts) — 验证全部 18 个 JS 子路径在 "require" 条件导出与 .d.cts 下的身份
  const cjsEntry = path.join(tmpDir, "consumer-cjs.cts");
  await fsp.writeFile(
    cjsEntry,
    `
import { AsterThemeProvider, AfButton, type AfButtonProps } from "@fangxinyan/aster-ui";
import { AfPluginProvider, createAsterPluginRuntime } from "@fangxinyan/aster-ui/runtime";
import { AsterThemeProvider as CoreThemeProvider, AfTitleBar, AfThemePanel, AfMeterBar, AfTree } from "@fangxinyan/aster-ui/core";
import { useTween, AfSwap } from "@fangxinyan/aster-ui/ui-pro";
import { AfBreakdownChartPattern } from "@fangxinyan/aster-ui/examples";
import { resolveAsterThemeColors, type AsterThemeMode } from "@fangxinyan/aster-ui/theme";
import { AfHoverList } from "@fangxinyan/aster-ui/primitives";
import { AfIcon } from "@fangxinyan/aster-ui/icons";
import { AfNumberTicker } from "@fangxinyan/aster-ui/motion";
${patternImports}

export const v: NonNullable<AfButtonProps["variant"]> = "accent";
export const m: AsterThemeMode = "light";
export const items = [
  AsterThemeProvider,
  AfPluginProvider,
  createAsterPluginRuntime,
  CoreThemeProvider,
  AfTitleBar,
  AfThemePanel,
  AfButton,
  AfMeterBar,
  AfTree,
  useTween,
  AfSwap,
  AfBreakdownChartPattern,
  resolveAsterThemeColors,
  AfHoverList,
  AfIcon,
  AfNumberTicker,
  ${patternRefs},
];
`,
    "utf8",
  );
  assertProgramClean(
    cjsEntry,
    {
      ...baseOpts,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
    },
    "NodeNext CJS",
  );

  // 4.3 Bundler + noUncheckedSideEffectImports + JSX + 全量 23 个 CSS 子路径导入
  const envDtsPath = path.join(tmpDir, "consumer-env.d.ts");
  await fsp.writeFile(envDtsPath, `declare module "*.css" {}\n`, "utf8");
  const allCssImports = [
    `import "@fangxinyan/aster-ui/tokens.css";`,
    `import "@fangxinyan/aster-ui/core.css";`,
    `import "@fangxinyan/aster-ui/styles.css";`,
    `import "@fangxinyan/aster-ui/ui.css";`,
    `import "@fangxinyan/aster-ui/ui-pro.css";`,
    `import "@fangxinyan/aster-ui/motion.css";`,
    ...PATTERN_NAMES.map((n) => `import "@fangxinyan/aster-ui/patterns/${n}.css";`),
    ...SCREEN_CSS_NAMES.map((n) => `import "@fangxinyan/aster-ui/screens/${n}.css";`),
    ...ILLUSTRATION_CSS_NAMES.map((n) => `import "@fangxinyan/aster-ui/illustrations/${n}.css";`),
  ].join("\n");

  const bundlerEntry = path.join(tmpDir, "consumer-bundler.tsx");
  await fsp.writeFile(
    bundlerEntry,
    `
${allCssImports}
import { AsterThemeProvider, AfButton, AfCascader } from "@fangxinyan/aster-ui";

export function ConsumerApp() {
  return (
    <AsterThemeProvider initialMode="light">
      <AfButton variant="primary">发布就绪</AfButton>
      <AfCascader options={[{ value: "cn", label: "中国" }]} defaultValue={["cn"]} />
    </AsterThemeProvider>
  );
}
`,
    "utf8",
  );
  assertProgramClean(
    [envDtsPath, bundlerEntry],
    {
      ...baseOpts,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noUncheckedSideEffectImports: true,
    },
    "Bundler JSX+CSS",
  );

  // 4.4 Node10 兼容检查（验证顶层 package.json "types" 回退路径）
  const node10Entry = path.join(tmpDir, "consumer-node10.tsx");
  await fsp.writeFile(
    node10Entry,
    `
import { AsterThemeProvider, AfButton } from "@fangxinyan/aster-ui";
export const view = <AsterThemeProvider><AfButton>Node10</AfButton></AsterThemeProvider>;
`,
    "utf8",
  );
  assertProgramClean(
    node10Entry,
    {
      ...baseOpts,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
    "Node10 Legacy",
  );

  console.log("[4/7] 严格 TypeScript 4 矩阵校验通过 (skipLibCheck: false): NodeNext ESM / NodeNext CJS / Bundler / Node10");
}

/** 利用 TypeScript 声明树提取指定入口全部零必填属性 Af* 组件名称。 */
function collectZeroRequiredPropComponents(dtsEntries) {
  const prog = ts.createProgram(dtsEntries, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
  });
  const checker = prog.getTypeChecker();
  const outByPath = new Map();

  for (const dtsPath of dtsEntries) {
    const sf = prog.getSourceFile(dtsPath);
    const modSym = sf ? checker.getSymbolAtLocation(sf) : undefined;
    const names = [];
    if (sf && modSym) {
      for (const exp of checker.getExportsOfModule(modSym)) {
        const name = exp.getName();
        if (!/^Af[A-Z]/.test(name) || name.endsWith("Context") || name.endsWith("Provider") || name === "AfSlot") {
          continue;
        }
        const target = exp.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exp) : exp;
        if (!(target.flags & ts.SymbolFlags.Value)) continue;
        const t = checker.getTypeOfSymbolAtLocation(target, sf);
        const sigs = t.getCallSignatures();
        if (sigs.length === 0) continue;

        const isZeroRequired = sigs.some((sig) => {
          if (sig.parameters.length === 0) return true;
          const p0 = sig.parameters[0];
          if (p0.flags & ts.SymbolFlags.Optional) return true;
          const pType = checker.getTypeOfSymbolAtLocation(p0, sf);
          return checker.getPropertiesOfType(pType).every((pr) => Boolean(pr.flags & ts.SymbolFlags.Optional));
        });
        if (isZeroRequired) names.push(name);
      }
    }
    outByPath.set(dtsPath, names);
  }

  return outByPath;
}

/** 5. Node ESM + CJS 全部 JS 子路径双运行时加载与全量零警告 SSR 校验 */
async function checkDualRuntimeAndSsr(tmpDir) {
  const consumerRequire = createRequire(path.join(tmpDir, "index.cjs"));
  const subpaths = [
    "@fangxinyan/aster-ui",
    "@fangxinyan/aster-ui/runtime",
    "@fangxinyan/aster-ui/core",
    "@fangxinyan/aster-ui/ui-pro",
    "@fangxinyan/aster-ui/examples",
    "@fangxinyan/aster-ui/theme",
    "@fangxinyan/aster-ui/primitives",
    "@fangxinyan/aster-ui/icons",
    "@fangxinyan/aster-ui/motion",
    ...PATTERN_NAMES.map((n) => `@fangxinyan/aster-ui/patterns/${n}`),
  ];

  // 从 tmpDir 内执行动态 import，真实触发 Node exports 路由
  const esmLoaderPath = path.join(tmpDir, "esm-loader.mjs");
  await fsp.writeFile(
    esmLoaderPath,
    `export async function loadSubpath(id) { return import(id); }\n`,
    "utf8",
  );
  const { loadSubpath } = await import(pathToFileURL(esmLoaderPath).href);

  const esmModules = new Map();
  let cjsMain;
  for (const id of subpaths) {
    const esmMod = await loadSubpath(id);
    const cjsMod = consumerRequire(id);
    esmModules.set(id, esmMod);
    if (id === "@fangxinyan/aster-ui") {
      cjsMain = cjsMod;
    }
    const esmKeys = Object.keys(esmMod).filter((k) => k !== "__esModule" && k !== "default").sort();
    const cjsKeys = Object.keys(cjsMod).filter((k) => k !== "__esModule" && k !== "default").sort();
    assert(
      JSON.stringify(esmKeys) === JSON.stringify(cjsKeys),
      `ESM 与 CJS 导出键不一致 (${id}): ESM=${esmKeys.length}, CJS=${cjsKeys.length}`,
    );
  }

  const esmMain = esmModules.get("@fangxinyan/aster-ui");
  const esmRuntime = esmModules.get("@fangxinyan/aster-ui/runtime");
  const esmCore = esmModules.get("@fangxinyan/aster-ui/core");
  const esmUiPro = esmModules.get("@fangxinyan/aster-ui/ui-pro");
  const esmExamples = esmModules.get("@fangxinyan/aster-ui/examples");

  const mainKeys = Object.keys(esmMain).filter((k) => k !== "__esModule" && k !== "default").sort();
  const runtimeKeys = Object.keys(esmRuntime).filter((k) => k !== "__esModule" && k !== "default").sort();
  assert(
    JSON.stringify(mainKeys) === JSON.stringify(runtimeKeys),
    `@fangxinyan/aster-ui 与 @fangxinyan/aster-ui/runtime 导出符号不一致: main=${mainKeys.length}, runtime=${runtimeKeys.length}`,
  );
  assert(
    esmMain.AsterThemeContext === esmRuntime.AsterThemeContext &&
      esmMain.AsterThemeContext === cjsMain.AsterThemeContext,
    "AsterThemeContext 未实现跨 ESM / CJS / runtime 全局单例共享",
  );
  assert(
    esmMain.AfLayerContext === esmRuntime.AfLayerContext && esmMain.AfLayerContext === cjsMain.AfLayerContext,
    "AfLayerContext 未实现跨 ESM / CJS / runtime 全局单例共享",
  );

  const React = await loadSubpath("react");
  const { renderToStaticMarkup } = await loadSubpath("react-dom/server");
  const esmHtml = renderToStaticMarkup(
    React.createElement(
      esmMain.AsterThemeProvider,
      { initialMode: "light" },
      React.createElement(esmMain.AfButton, { variant: "primary" }, "Dual Runtime SSR"),
    ),
  );
  const cjsHtml = renderToStaticMarkup(
    React.createElement(
      cjsMain.AsterThemeProvider,
      { initialMode: "light" },
      React.createElement(cjsMain.AfButton, { variant: "primary" }, "Dual Runtime SSR"),
    ),
  );
  assert(esmHtml === cjsHtml, "ESM 与 CJS SSR 渲染结果不一致");
  assert(esmHtml.includes("Dual Runtime SSR") && esmHtml.includes("af-btn"), "SSR 输出缺少预期标记");

  // 全量零必填属性组件（主包 + core + ui-pro + examples，含全部 26 插画与 43 Screens）零警告 SSR 扫描
  const mainDts = path.join(distDir, "esm", "index.d.ts");
  const coreDts = path.join(distDir, "esm", "ui.d.ts");
  const uiProDts = path.join(distDir, "esm", "ui-pro.d.ts");
  const examplesDts = path.join(distDir, "esm", "examples.d.ts");
  const zeroPropMap = collectZeroRequiredPropComponents([mainDts, coreDts, uiProDts, examplesDts]);

  const mainZeroPropSet = new Set(zeroPropMap.get(mainDts) ?? []);
  for (const illusName of ALL_26_ILLUSTRATIONS) {
    assert(mainZeroPropSet.has(illusName), `插画组件 ${illusName} 未纳入零必填属性 SSR 全覆盖列表`);
  }
  for (const screenName of ALL_43_SCREENS) {
    assert(mainZeroPropSet.has(screenName), `整页组件 ${screenName} 未纳入零必填属性 SSR 全覆盖列表`);
  }

  const ssrTargets = [
    { label: "@fangxinyan/aster-ui", mod: esmMain, names: zeroPropMap.get(mainDts) ?? [] },
    { label: "@fangxinyan/aster-ui/core", mod: esmCore, names: zeroPropMap.get(coreDts) ?? [] },
    { label: "@fangxinyan/aster-ui/ui-pro", mod: esmUiPro, names: zeroPropMap.get(uiProDts) ?? [] },
    { label: "@fangxinyan/aster-ui/examples", mod: esmExamples, names: zeroPropMap.get(examplesDts) ?? [] },
  ];

  let renderedCount = 0;
  const ssrErrors = [];
  const origConsoleError = console.error;
  let activeComponentLabel = "";
  console.error = (...args) => {
    ssrErrors.push(`[${activeComponentLabel}] console.error: ${args.map(String).join(" ")}`);
  };

  try {
    for (const { label, mod, names } of ssrTargets) {
      for (const name of names) {
        activeComponentLabel = `${label}#${name}`;
        try {
          const Comp = mod[name];
          assert(Comp, `${activeComponentLabel} 运行时导出为空`);
          const markup = renderToStaticMarkup(
            React.createElement(
              esmMain.AsterThemeProvider,
              { initialMode: "light" },
              React.createElement(Comp),
            ),
          );
          assert(typeof markup === "string", `${activeComponentLabel} SSR 返回值异常`);
          renderedCount++;
        } catch (err) {
          ssrErrors.push(`[${activeComponentLabel}] SSR 抛出异常: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  } finally {
    console.error = origConsoleError;
  }

  if (ssrErrors.length > 0) {
    fail(
      `SSR 全量扫描发现 ${ssrErrors.length} 条错误或 React 服务端警告（如 useLayoutEffect）:\n` +
        ssrErrors.slice(0, 15).map((e) => `  - ${e}`).join("\n"),
    );
  }

  console.log(
    `[5/7] Node ESM + CJS 双运行时及全量 SSR 校验通过：${subpaths.length} 个子路径完全对称，${renderedCount} 个组件（含 26 插画 + 43 Screens）零警告渲染`,
  );
}

/** 6. README.md 相对路径可达性、脱敏与全部 ts/tsx 代码块真实编译校验 */
async function checkReadmeDocs(tmpDir, packedSet) {
  const readmeText = fs.readFileSync(path.join(root, "README.md"), "utf8");
  const internalLeak = readmeText.match(/my[\s-]assistant|@fangxinyan\/lumina|\blumina\b|万宝楼|wanbaolou|剑网3|剑三|\bjx3\b/i);
  assert(!internalLeak, `README.md 残留未脱敏内部项目代号: "${internalLeak?.[0]}"`);

  // 剥离代码块后校验全部相对路径链接/图片均在 tarball 白名单中
  const proseOnly = readmeText.replace(/```[\s\S]*?```/g, "");
  const linkRe = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let linkCount = 0;
  for (const m of proseOnly.matchAll(linkRe)) {
    const rawHref = m[1].trim();
    if (/^(?:https?:|mailto:|#)/i.test(rawHref)) continue;
    const withoutHash = rawHref.split("#")[0].replace(/^\.\//, "");
    if (!withoutHash) continue;
    assert(
      packedSet.has(withoutHash),
      `README.md 引用了未随 npm 包发布的相对路径文件: "${rawHref}"（解析为 "${withoutHash}"）`,
    );
    linkCount++;
  }

  // 提取全部 ts / tsx 代码块并执行 skipLibCheck:false 编译验证
  const codeBlockRe = /```(tsx?)\r?\n([\s\S]*?)```/g;
  const snippetFiles = [];
  let blockIdx = 0;
  for (const m of readmeText.matchAll(codeBlockRe)) {
    const lang = m[1];
    const code = m[2];
    const ext = lang === "tsx" ? ".tsx" : ".ts";
    const filePath = path.join(tmpDir, `readme-snippet-${blockIdx}${ext}`);
    const hasModuleSyntax = /(?:^|\n)\s*(?:import|export)\b/.test(code);
    const wrappedCode = hasModuleSyntax
      ? code
      : `import { useAsterTheme } from "@fangxinyan/aster-ui";\nexport function _ReadmeSnippet${blockIdx}() {\n${code}\n}\n`;
    await fsp.writeFile(filePath, wrappedCode, "utf8");
    snippetFiles.push(filePath);
    blockIdx++;
  }

  assert(snippetFiles.length >= 2, `README.md 中未提取到足够的 ts/tsx 示例代码块 (found=${snippetFiles.length})`);
  const envDtsPath = path.join(tmpDir, "consumer-env.d.ts");
  assertProgramClean(
    [envDtsPath, ...snippetFiles],
    {
      target: ts.ScriptTarget.ES2022,
      lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      skipLibCheck: false,
      noEmit: true,
      noUncheckedSideEffectImports: true,
      baseUrl: tmpDir,
      typeRoots: [path.join(tmpDir, "node_modules", "@types")],
      types: ["react", "react-dom"],
    },
    "README.md TS/TSX Snippets",
  );

  console.log(`[6/7] README 文档门禁通过：${linkCount} 个相对链接均在 Tarball 内，${snippetFiles.length} 段 TS/TSX 示例代码编译零报错`);
}

/** 7. esbuild 组件级按需 Tree-Shaking 与 CSS 子路径打包实测 */
async function checkTreeShaking(tmpDir) {
  async function measureBundle(code) {
    const res = await esbuild({
      stdin: { contents: code, resolveDir: tmpDir, loader: "ts" },
      bundle: true,
      minify: true,
      write: false,
      format: "esm",
      platform: "browser",
      external: ["react", "react-dom", "react/jsx-runtime"],
    });
    return Buffer.byteLength(res.outputFiles[0].text, "utf8");
  }

  const cnBytes = await measureBundle(`import { cn } from "@fangxinyan/aster-ui"; console.log(cn("a", "b"));`);
  const btnBytes = await measureBundle(`import { AfButton } from "@fangxinyan/aster-ui"; console.log(AfButton);`);

  assert(cnBytes < 2048, `cn 按需摇树体积超限: ${cnBytes} B (>= 2048 B)`);
  assert(btnBytes < 45 * 1024, `AfButton 按需摇树体积超限: ${btnBytes} B (>= 45 KiB)`);

  // 验证 @fangxinyan/aster-ui/runtime 纯运行时入口零 CSS 副作用产物且摇树体积受控
  const runtimeRes = await esbuild({
    stdin: {
      contents: `import { AfButton, createAsterPluginRuntime } from "@fangxinyan/aster-ui/runtime"; console.log(AfButton, createAsterPluginRuntime);`,
      resolveDir: tmpDir,
      loader: "ts",
    },
    bundle: true,
    minify: true,
    write: false,
    outdir: path.join(tmpDir, "runtime-out"),
    format: "esm",
    platform: "browser",
    external: ["react", "react-dom", "react/jsx-runtime"],
    loader: { ".css": "css", ".woff2": "dataurl" },
  });
  const runtimeCssOut = runtimeRes.outputFiles.find((f) => f.path.endsWith(".css"));
  assert(!runtimeCssOut, "@fangxinyan/aster-ui/runtime 产生了非预期的 CSS 副作用输出");
  const runtimeJsOut = runtimeRes.outputFiles.find((f) => f.path.endsWith(".js"));
  const runtimeBytes = runtimeJsOut ? Buffer.byteLength(runtimeJsOut.text, "utf8") : 0;
  assert(runtimeBytes > 0 && runtimeBytes < 45 * 1024, `@fangxinyan/aster-ui/runtime 按需摇树体积异常: ${runtimeBytes} B`);

  // 验证 CSS 静态及 patterns / screens / illustrations 通配子路径可被真实打包器正确解析并合并输出
  const cssRes = await esbuild({
    stdin: {
      contents: [
        `import "@fangxinyan/aster-ui/tokens.css";`,
        `import "@fangxinyan/aster-ui/core.css";`,
        `import "@fangxinyan/aster-ui/patterns/chat.css";`,
        `import "@fangxinyan/aster-ui/screens/screens-chat.css";`,
        `import "@fangxinyan/aster-ui/illustrations/illustrations-a.css";`,
      ].join("\n"),
      resolveDir: tmpDir,
      loader: "ts",
    },
    bundle: true,
    minify: true,
    write: false,
    outdir: path.join(tmpDir, "css-out"),
    loader: { ".css": "css", ".woff2": "dataurl" },
  });
  const cssOut = cssRes.outputFiles.find((f) => f.path.endsWith(".css"));
  const cssBytes = cssOut ? Buffer.byteLength(cssOut.text, "utf8") : 0;
  assert(cssBytes > 120 * 1024, `CSS 子路径打包输出异常过小: ${cssBytes} B`);

  console.log(
    `[7/7] Tree-Shaking 与 CSS 子路径打包校验通过：cn=${cnBytes} B，AfButton=${(btnBytes / 1024).toFixed(1)} KiB，CSS子路径=${(cssBytes / 1024).toFixed(1)} KiB`,
  );
}

async function main() {
  const packedSet = checkTarball();
  checkExportsAndMetadata(packedSet);
  checkDistPurity();

  const tmpDir = await createIsolatedConsumerDir();
  try {
    await checkConsumerTypeScript(tmpDir);
    await checkDualRuntimeAndSsr(tmpDir);
    await checkReadmeDocs(tmpDir, packedSet);
    await checkTreeShaking(tmpDir);
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  }

  console.log("\nAster UI npm 发布门禁全部 7 项校验通过！");
}

await main();
