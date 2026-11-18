import { build } from "esbuild";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 将 Aster UI 组件展示站打包为自包含 index.html。 */
async function buildShowcase() {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const result = await build({
    entryPoints: [path.join(directory, "src/showcase/main.tsx")],
    bundle: true,
    write: false,
    outdir: path.join(directory, "compiled"),
    minify: true,
    format: "iife",
    target: "es2022",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    legalComments: "none",
    loader: { ".woff2": "dataurl", ".woff": "dataurl", ".ttf": "dataurl" },
  });
  const script = result.outputFiles.find((file) => file.path.endsWith(".js")).text.replace(/<\/script/gi, "<\\/script");
  const style = result.outputFiles.find((file) => file.path.endsWith(".css"))?.text ?? "";
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><link rel="icon" href="data:,"><title>Aster UI · 星序组件库</title><style>${style}</style></head><body><div id="root"></div><script>${script}</script></body></html>`;
  await writeFile(path.join(directory, "index.html"), html, "utf8");
  console.log(`已生成 Aster UI/index.html（${Math.round(Buffer.byteLength(html) / 1024)} KiB）`);
}

await buildShowcase();
