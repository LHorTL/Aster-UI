/**
 * Aster UI 组件库产物构建脚本（ESM + CJS 双格式 Tree-Shakeable 模块 + 严格 .d.ts / .d.cts + 全量独立 CSS）。
 *
 * 输出目录：dist/
 * - dist/esm/**\/*.js + .d.ts            （按模块保留结构的 ESM 产物，显式 .js 说明符，保留 JSDoc 注释）
 * - dist/cjs/**\/*.cjs + .d.cts          （按模块保留结构的 CJS 产物，显式 .cjs 说明符，保留 JSDoc 注释）
 * - dist/{tokens,core,styles,ui,ui-pro,motion}.css
 * - dist/patterns/*.css                  （9 个复合模式按需独立 CSS）
 * - dist/screens/*.css                   （6 个整页 Screen 家族按需独立 CSS）
 * - dist/illustrations/*.css             （2 个交互式插画包按需独立 CSS）
 */
import { build, transform } from "esbuild";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "src");
const distDir = path.join(root, "dist");
const esmDir = path.join(distDir, "esm");
const cjsDir = path.join(distDir, "cjs");
const distPatternsDir = path.join(distDir, "patterns");
const distScreensDir = path.join(distDir, "screens");
const distIllustrationsDir = path.join(distDir, "illustrations");

const ROOT_CSS_FILES = [
  "tokens.css",
  "core.css",
  "styles.css",
  "ui.css",
  "ui-pro.css",
  "motion.css",
];

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
  "store",
  "workbench",
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

const ENTRY_ROOT_NAMES = [
  path.join(srcDir, "index.ts"),
  path.join(srcDir, "runtime.ts"),
  path.join(srcDir, "plugin-runtime.tsx"),
  path.join(srcDir, "ui.tsx"),
  path.join(srcDir, "ui-pro.tsx"),
  path.join(srcDir, "examples.ts"),
  path.join(srcDir, "theme.tsx"),
  path.join(srcDir, "icons.tsx"),
  path.join(srcDir, "motion.tsx"),
  path.join(srcDir, "model.ts"),
  path.join(srcDir, "tabs.tsx"),
  path.join(srcDir, "context-menu.tsx"),
  path.join(srcDir, "color-picker.tsx"),
  path.join(srcDir, "primitives/index.ts"),
  ...PATTERN_NAMES.map((name) => path.join(srcDir, "patterns", `${name}.tsx`)),
];

/** 将构建或输出路径归一化映射回 `src/` 内的对应文件路径。 */
function mapToSrcFile(fileName) {
  const resolved = path.resolve(fileName);
  for (const baseDir of [srcDir, esmDir, cjsDir]) {
    const rel = path.relative(baseDir, resolved);
    if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
      return path.join(srcDir, rel);
    }
  }
  return resolved;
}

/** 解析相对模块说明符，补全显式目标扩展名（`.js` 或 `.cjs`）并兼容目录 `/index` 导入。 */
function resolveRelativeSpecifier(sourceFileName, spec, targetExt) {
  if (!spec.startsWith(".")) return null;
  if (/\.css$/i.test(spec)) return null;

  const srcFile = mapToSrcFile(sourceFileName);
  const baseDir = path.dirname(srcFile);
  const cleanSpec = spec
    .replace(/\.(?:[cm]?ts|tsx|[cm]?js|jsx|d\.[cm]?ts)$/i, "")
    .replace(/\\/g, "/");
  const baseSpec = cleanSpec === "." || cleanSpec === "./" ? "./index" : cleanSpec;
  const resolvedAbs = path.resolve(baseDir, baseSpec);

  // 确保解析目标仍位于 src/ 内（严禁越界引入 showcase/specs 外文件）
  const relFromSrc = path.relative(srcDir, resolvedAbs).replace(/\\/g, "/");
  if (relFromSrc.startsWith("..") || relFromSrc.startsWith("showcase/") || relFromSrc.startsWith("specs/")) {
    throw new Error(`非法跨界模块引用: ${sourceFileName} -> "${spec}"`);
  }

  // 1. 优先匹配文件模块（foo.ts / foo.tsx）
  if (fs.existsSync(`${resolvedAbs}.ts`) || fs.existsSync(`${resolvedAbs}.tsx`)) {
    const outSpec = `${baseSpec.replace(/\/$/, "")}${targetExt}`;
    return outSpec.startsWith(".") ? outSpec : `./${outSpec}`;
  }

  // 2. 次优匹配目录桶文件（foo/index.ts / foo/index.tsx）
  if (
    fs.existsSync(path.join(resolvedAbs, "index.ts")) ||
    fs.existsSync(path.join(resolvedAbs, "index.tsx"))
  ) {
    const dirPrefix = baseSpec.replace(/\/$/, "");
    const outSpec = `${dirPrefix}/index${targetExt}`;
    return outSpec.startsWith(".") ? outSpec : `./${outSpec}`;
  }

  throw new Error(`无法解析相对导入路径 "${spec}"（来源文件: ${sourceFileName}）`);
}

/** 创建 TypeScript AST 转换器：剥离副作用 `.css` 导入并重写相对模块说明符为 `targetExt`。 */
function createModuleTransformer(targetExt) {
  return (context) => {
    return (rootNode) => {
      const sourceFile = ts.isSourceFile(rootNode) ? rootNode : null;
      const sourceFileName = sourceFile?.fileName ?? "";

      const visit = (node) => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          const spec = node.moduleSpecifier.text;
          if (/\.css$/i.test(spec)) {
            if (!node.importClause) {
              return undefined;
            }
            throw new Error(`禁止非副作用 CSS 值导入: ${sourceFileName} -> "${spec}"`);
          }
          const rewritten = resolveRelativeSpecifier(sourceFileName, spec, targetExt);
          if (rewritten && rewritten !== spec) {
            return ts.factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              ts.factory.createStringLiteral(rewritten),
              node.attributes,
            );
          }
          return node;
        }

        if (
          ts.isExportDeclaration(node) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const spec = node.moduleSpecifier.text;
          const rewritten = resolveRelativeSpecifier(sourceFileName, spec, targetExt);
          if (rewritten && rewritten !== spec) {
            return ts.factory.updateExportDeclaration(
              node,
              node.modifiers,
              node.isTypeOnly,
              node.exportClause,
              ts.factory.createStringLiteral(rewritten),
              node.attributes,
            );
          }
          return node;
        }

        if (
          ts.isImportEqualsDeclaration(node) &&
          ts.isExternalModuleReference(node.moduleReference) &&
          ts.isStringLiteral(node.moduleReference.expression)
        ) {
          const spec = node.moduleReference.expression.text;
          const rewritten = resolveRelativeSpecifier(sourceFileName, spec, targetExt);
          if (rewritten && rewritten !== spec) {
            return ts.factory.updateImportEqualsDeclaration(
              node,
              node.modifiers,
              node.isTypeOnly,
              node.name,
              ts.factory.updateExternalModuleReference(
                node.moduleReference,
                ts.factory.createStringLiteral(rewritten),
              ),
            );
          }
          return node;
        }

        if (ts.isImportTypeNode(node)) {
          const visited = ts.visitEachChild(node, visit, context);
          if (
            ts.isLiteralTypeNode(visited.argument) &&
            ts.isStringLiteral(visited.argument.literal)
          ) {
            const spec = visited.argument.literal.text;
            const rewritten = resolveRelativeSpecifier(sourceFileName, spec, targetExt);
            if (rewritten && rewritten !== spec) {
              return ts.factory.updateImportTypeNode(
                visited,
                ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(rewritten)),
                visited.attributes,
                visited.qualifier,
                visited.typeArguments,
                visited.isTypeOf,
              );
            }
          }
          return visited;
        }

        if (
          ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
          node.arguments.length === 1 &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          const spec = node.arguments[0].text;
          const rewritten = resolveRelativeSpecifier(sourceFileName, spec, targetExt);
          if (rewritten && rewritten !== spec) {
            return ts.factory.updateCallExpression(node, node.expression, node.typeArguments, [
              ts.factory.createStringLiteral(rewritten),
            ]);
          }
        }

        return ts.visitEachChild(node, visit, context);
      };

      return ts.visitNode(rootNode, visit);
    };
  };
}

/** 格式化并严格校验 TypeScript 诊断错误。 */
function assertNoDiagnostics(program, emitResult, label) {
  const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
  if (diagnostics.length === 0) return;
  for (const diag of diagnostics) {
    const rel = diag.file ? path.relative(root, diag.file.fileName) : "<global>";
    const pos =
      diag.file && diag.start !== undefined
        ? diag.file.getLineAndCharacterOfPosition(diag.start)
        : { line: 0, character: 0 };
    console.error(
      `[${label}] ${rel}:${pos.line + 1}:${pos.character + 1} - TS${diag.code}: ${ts.flattenDiagnosticMessageText(diag.messageText, "\n")}`,
    );
  }
  process.exit(1);
}

/** 递归统计目录文件数量与总字节大小。 */
async function measureDir(dir, filterFn = () => true) {
  let count = 0;
  let bytes = 0;
  async function walk(current) {
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (filterFn(full)) {
        count++;
        bytes += (await fsp.stat(full)).size;
      }
    }
  }
  await walk(dir);
  return { count, bytes };
}

async function buildLibrary() {
  // 读取基础 tsconfig 选项，并在清理 dist/ 前先完成 ESM/CJS 全图类型诊断（防止并发编译报错清空既有 dist/）
  const configPath = path.join(root, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);

  const esmOptions = {
    ...parsed.options,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    rootDir: srcDir,
    outDir: esmDir,
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: false,
    sourceMap: false,
    declarationMap: false,
    removeComments: false,
  };
  const esmProgram = ts.createProgram({
    rootNames: ENTRY_ROOT_NAMES,
    options: esmOptions,
  });
  assertNoDiagnostics(esmProgram, { diagnostics: [] }, "ESM");

  const cjsOptions = {
    ...parsed.options,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    jsx: ts.JsxEmit.ReactJSX,
    rootDir: srcDir,
    outDir: cjsDir,
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: false,
    sourceMap: false,
    declarationMap: false,
    removeComments: false,
  };
  const cjsProgram = ts.createProgram({
    rootNames: ENTRY_ROOT_NAMES,
    options: cjsOptions,
  });
  assertNoDiagnostics(cjsProgram, { diagnostics: [] }, "CJS");

  await fsp.rm(distDir, { recursive: true, force: true });
  await fsp.mkdir(esmDir, { recursive: true });
  await fsp.mkdir(cjsDir, { recursive: true });
  await fsp.mkdir(distPatternsDir, { recursive: true });
  await fsp.mkdir(distScreensDir, { recursive: true });
  await fsp.mkdir(distIllustrationsDir, { recursive: true });

  // 1. 构建全量自包含独立 CSS 产物（根目录样式 + patterns/*.css + screens/*.css + illustrations/*.css）
  const cssJobs = [
    ...ROOT_CSS_FILES.map((name) => ({
      entry: path.join(srcDir, name),
      out: path.join(distDir, name),
    })),
    ...PATTERN_NAMES.map((name) => ({
      entry: path.join(srcDir, "patterns", `${name}.css`),
      out: path.join(distPatternsDir, `${name}.css`),
    })),
    ...SCREEN_CSS_NAMES.map((name) => ({
      entry: path.join(srcDir, "components", name, `${name}.css`),
      out: path.join(distScreensDir, `${name}.css`),
    })),
    ...ILLUSTRATION_CSS_NAMES.map((name) => ({
      entry: path.join(srcDir, "components", name, `${name}.css`),
      out: path.join(distIllustrationsDir, `${name}.css`),
    })),
  ];

  await Promise.all(
    cssJobs.map((job) =>
      build({
        entryPoints: [job.entry],
        outfile: job.out,
        bundle: true,
        minify: true,
        legalComments: "none",
        loader: { ".woff2": "dataurl", ".woff": "dataurl", ".ttf": "dataurl" },
      }),
    ),
  );

  // 2. 构建 ESM 模块树（dist/esm/**/*.js + .d.ts）
  const esmEmit = esmProgram.emit(undefined, undefined, undefined, false, {
    before: [createModuleTransformer(".js")],
    afterDeclarations: [createModuleTransformer(".js")],
  });
  assertNoDiagnostics(esmProgram, esmEmit, "ESM");

  // 3. 构建 CJS 模块树（dist/cjs/**/*.cjs + .d.cts）
  const cjsEmit = cjsProgram.emit(
    undefined,
    (fileName, content, writeByteOrderMark) => {
      const renamed = fileName
        .replace(/\.d\.ts$/, ".d.cts")
        .replace(/\.js$/, ".cjs");
      ts.sys.writeFile(renamed, content, writeByteOrderMark);
    },
    undefined,
    false,
    {
      before: [createModuleTransformer(".cjs")],
      afterDeclarations: [createModuleTransformer(".cjs")],
    },
  );
  assertNoDiagnostics(cjsProgram, cjsEmit, "CJS");

  // 3.5 对 ESM (.js) 与 CJS (.cjs) 运行时产物执行保留标识符的空白与语法压缩（.d.ts/.d.cts 完整保留 JSDoc）
  async function minifyJsTree(dir, ext) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await minifyJsTree(full, ext);
        } else if (full.endsWith(ext)) {
          const code = await fsp.readFile(full, "utf8");
          const result = await transform(code, {
            loader: "js",
            minifyWhitespace: true,
            minifySyntax: true,
            minifyIdentifiers: false,
            legalComments: "none",
          });
          await fsp.writeFile(full, result.code, "utf8");
        }
      }),
    );
  }
  await Promise.all([minifyJsTree(esmDir, ".js"), minifyJsTree(cjsDir, ".cjs")]);

  const [esmStats, cjsStats, coreCssStat, fullCssStat] = await Promise.all([
    measureDir(esmDir),
    measureDir(cjsDir),
    fsp.stat(path.join(distDir, "core.css")),
    fsp.stat(path.join(distDir, "styles.css")),
  ]);

  console.log(
    [
      "Aster UI 库产物构建完成 → dist/",
      `  ESM 模块树    ${esmStats.count} files, ${(esmStats.bytes / 1024).toFixed(1)} KiB (dist/esm/*.js + .d.ts)`,
      `  CJS 模块树    ${cjsStats.count} files, ${(cjsStats.bytes / 1024).toFixed(1)} KiB (dist/cjs/*.cjs + .d.cts)`,
      `  核心样式      dist/core.css ${(coreCssStat.size / 1024).toFixed(1)} KiB (+ tokens/ui/ui-pro/motion)`,
      `  全量样式      dist/styles.css ${(fullCssStat.size / 1024).toFixed(1)} KiB (+ 9 patterns/*.css + 6 screens/*.css + 2 illustrations/*.css)`,
    ].join("\n"),
  );
}

await buildLibrary();
