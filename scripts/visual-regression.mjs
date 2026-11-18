/**
 * Aster UI 主题视觉回归。
 *
 * 用法：
 *   node scripts/visual-regression.mjs --update
 *   node scripts/visual-regression.mjs
 *   node scripts/visual-regression.mjs --themes light,dark --components button,usage-meter
 *
 * 基线在 visual/baseline/；失败时 actual/diff 写到 visual/actual、visual/diff。
 * 依赖：esbuild 构建产物、Chrome（CHROME_PATH 可覆盖）、sharp（像素对比）。
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "index.html");
const baselineDir = path.join(root, "visual", "baseline");
const actualDir = path.join(root, "visual", "actual");
const diffDir = path.join(root, "visual", "diff");
const profileDir = path.join(root, ".tmp", "visual-profile");
const reportPath = path.join(root, "visual", "report.json");

/** 解析 --key value 参数。 */
const argv = {};
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (!key.startsWith("--")) continue;
  const next = process.argv[index + 1];
  if (next && !next.startsWith("--")) {
    argv[key.slice(2)] = next;
    index += 1;
  } else {
    argv[key.slice(2)] = true;
  }
}

const update = Boolean(argv.update);
const themes = String(argv.themes ?? "light,dark")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const accents = argv.accents
  ? String(argv.accents)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  : [null];
const only = argv.components ? new Set(String(argv.components).split(",").map((value) => value.trim())) : null;
const threshold = Number(argv.threshold ?? 0.002);
/** 已知持续动画 / WebGL 组件允许的漂移上限，避免把渲染抖动当回归。 */
const componentTolerance = {
  "agent-orchestration": 0.01,
  "countdown": 0.006,
  "glow-keyboard": 0.01,
  "gradient-floor": 0.01,
  "grid-background": 0.01,
  "integration-flow": 0.01,
  "logo-marquee": 0.01,
  "shimmer-loader": 0.01,
  "spinner-skeleton": 0.01,
  "testimonial-wall": 0.01,
  "voice-orb": 0.01,
  "writing-assistant": 0.01,
};
const viewport = { width: 1440, height: 1000 };
function resolveChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        ]
      : process.platform === "darwin"
        ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
          ];
  return candidates.find((p) => fsSync.existsSync(p)) ?? candidates[0];
}

const chromePath = resolveChromePath();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 从 DevTools HTTP 接口读取页面列表。 */
function getJson(uri) {
  return new Promise((resolve, reject) => {
    http
      .get(uri, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

/** 启动无头 Chrome 并连接 CDP。 */
async function launchChrome() {
  await fs.rm(profileDir, { recursive: true, force: true });
  await fs.mkdir(profileDir, { recursive: true });
  const port = 9800 + Math.floor(Math.random() * 400);
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-sync",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${port}`,
      `--window-size=${viewport.width},${viewport.height}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  const deadline = Date.now() + 30000;
  let ws;
  while (Date.now() < deadline) {
    try {
      const list = await getJson(`http://127.0.0.1:${port}/json/list`);
      const page = list.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          ws.addEventListener("open", resolve, { once: true });
          ws.addEventListener("error", reject, { once: true });
        });
        break;
      }
    } catch {
      // Chrome 尚未启动
    }
    await sleep(150);
  }
  if (!ws) {
    chrome.kill();
    throw new Error("Chrome DevTools 未就绪");
  }
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const send = (method, params = {}) => {
    const id = nextId;
    nextId += 1;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (!pending.has(id)) return;
        pending.delete(id);
        reject(new Error(`CDP 超时：${method}`));
      }, 30000);
    });
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  // 停掉演示组件的 setInterval 与无限物理滚动 rAF 时间增量，避免轮播 / 计时器让截图漂移
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      const native = window.setInterval;
      window.setInterval = () => 0;
      window.__nativeSetInterval = native;
      const cid = new URLSearchParams(location.search).get("component");
      if (cid === "logo-marquee" || cid === "testimonial-wall" || cid === "voice-orb") {
        const nativeRaf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = (cb) => nativeRaf(() => cb(1000));
      }
      if (cid === "integration-flow") {
        const nativeTimeout = window.setTimeout.bind(window);
        window.setTimeout = (fn, ms, ...args) => (Number(ms) >= 100 ? 0 : nativeTimeout(fn, ms, ...args));
      }
    })();`,
  });
  return {
    send,
    close: async () => {
      ws.close();
      chrome.kill();
      await sleep(300);
      await fs.rm(path.join(root, ".tmp"), { recursive: true, force: true }).catch(() => {});
    },
  };
}

/** 等待页面条件。 */
async function waitFor(send, expression, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.result?.value) return true;
    } catch {
      // 导航过程中执行上下文可能失效
    }
    await sleep(80);
  }
  return false;
}

/** 导航到嵌入模式并等待舞台稳定。 */
async function openComponent(send, id, theme, accent) {
  const accentQuery = accent ? `&accent=${encodeURIComponent(accent)}` : "";
  const url = `${pathToFileURL(indexPath).href}?embed=1&component=${encodeURIComponent(id)}&theme=${theme}${accentQuery}`;
  await send("Page.navigate", { url });
  await waitFor(send, "document.readyState === 'complete'");
  await waitFor(send, `document.querySelector('.af-gal-stage')?.dataset?.component === ${JSON.stringify(id)}`);
  await send("Runtime.evaluate", {
    expression: "new Promise((resolve) => document.fonts?.ready ? document.fonts.ready.then(() => resolve(true)) : resolve(true))",
    awaitPromise: true,
  });
  await sleep(260);
  await send("Runtime.evaluate", {
    expression: `(async () => {
      const style = document.createElement('style');
      style.id = '__visual-freeze';
      style.textContent = '*:not(.ui-if-blob),*::before,*::after{animation-duration:0.001s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}.ui-if-blob{animation:none!important;transform:rotate(var(--rot))!important;opacity:var(--o-lo,0.84)!important;transition:none!important}';
      document.head.appendChild(style);
      for (const anim of document.getAnimations({ subtree: true })) {
        const timing = anim.effect?.getComputedTiming?.();
        if (timing && timing.iterations === Infinity) {
          anim.pause();
          anim.currentTime = 0;
        }
      }
      window.scrollTo(0, 0);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return true;
    })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  await sleep(120);
}

/** 读取舞台的截图矩形。 */
async function getStageClip(send) {
  const result = await send("Runtime.evaluate", {
    expression: `(() => {
      const el = document.querySelector('.af-gal-stage');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: Math.max(0, rect.left), y: Math.max(0, rect.top), width: Math.max(1, Math.min(rect.width, window.innerWidth - Math.max(0, rect.left))), height: Math.max(1, Math.min(rect.height, 4000)) };
    })()`,
    returnByValue: true,
  });
  return result.result?.value ?? null;
}

/** 截取当前组件的舞台。 */
async function capture(send, id, theme, accent) {
  await openComponent(send, id, theme, accent);
  const clip = await getStageClip(send);
  if (!clip) throw new Error(`找不到 ${id} 的预览舞台`);
  const beyondViewport = clip.x + clip.width > viewport.width + 0.5 || clip.y + clip.height > viewport.height + 0.5;
  const safeClip = beyondViewport
    ? { ...clip, scale: 1 }
    : {
        x: Math.round(clip.x),
        y: Math.round(clip.y),
        width: Math.max(1, Math.min(Math.round(clip.width), viewport.width - Math.round(clip.x))),
        height: Math.max(1, Math.min(Math.round(clip.height), viewport.height - Math.round(clip.y))),
        scale: 1,
      };
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: beyondViewport,
    clip: safeClip,
  });
  return Buffer.from(result.data, "base64");
}

/** 把任意强调色转成稳定文件名。 */
function accentSlug(accent) {
  if (!accent) return "";
  return String(accent)
    .replace(/^#/, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

/** 对两张 PNG 做像素对比。 */
async function comparePng(a, b, tolerance) {
  const [before, after] = await Promise.all([sharp(a).raw().toBuffer({ resolveWithObject: true }), sharp(b).raw().toBuffer({ resolveWithObject: true })]);
  if (before.info.width !== after.info.width || before.info.height !== after.info.height) {
    return { changed: true, ratio: 1, width: before.info.width, height: before.info.height, reason: "尺寸不一致" };
  }
  const total = before.info.width * before.info.height;
  const srcCh = before.info.channels;
  const afterCh = after.info.channels;
  let changed = 0;
  const diff = Buffer.alloc(total * 4);
  for (let index = 0; index < total; index += 1) {
    const srcOffset = index * srcCh;
    const afterOffset = index * afterCh;
    const dstOffset = index * 4;
    const delta =
      Math.abs(before.data[srcOffset] - after.data[afterOffset]) +
      Math.abs(before.data[srcOffset + 1] - after.data[afterOffset + 1]) +
      Math.abs(before.data[srcOffset + 2] - after.data[afterOffset + 2]);
    if (delta > 18) {
      changed += 1;
      diff[dstOffset] = 255;
      diff[dstOffset + 1] = 42;
      diff[dstOffset + 2] = 42;
      diff[dstOffset + 3] = 255;
    } else {
      diff[dstOffset] = before.data[srcOffset];
      diff[dstOffset + 1] = before.data[srcOffset + 1];
      diff[dstOffset + 2] = before.data[srcOffset + 2];
      diff[dstOffset + 3] = 80;
    }
  }
  return { changed: changed / total > tolerance, ratio: changed / total, diff, width: before.info.width, height: before.info.height };
}

/** 主流程。 */
async function main() {
  if (!(await fs.stat(indexPath).catch(() => null))) throw new Error("index.html 不存在，请先执行 npm run build");
  if (!update) {
    const baseline = await fs.stat(baselineDir).catch(() => null);
    if (!baseline) throw new Error("没有视觉基线，先执行 npm run visual:update");
  }
  if (!only && !accents[0]) {
    await fs.rm(actualDir, { recursive: true, force: true });
    await fs.rm(diffDir, { recursive: true, force: true });
  }
  await fs.mkdir(baselineDir, { recursive: true });
  await fs.mkdir(actualDir, { recursive: true });
  await fs.mkdir(diffDir, { recursive: true });

  let chrome = await launchChrome();
  let capturesSinceLaunch = 0;
  const report = [];
  try {
    await chrome.send("Page.navigate", { url: pathToFileURL(indexPath).href });
    await waitFor(chrome.send, "document.readyState === 'complete'");
    await waitFor(chrome.send, "Boolean(document.querySelector('.af-gal__item'))");
    const manifestResult = await chrome.send("Runtime.evaluate", {
      expression: "[...document.querySelectorAll('.af-gal__item')].map((el) => ({ id: el.dataset.componentId, title: el.innerText })).filter((item) => item.id)",
      returnByValue: true,
    });
    const allComponents = (manifestResult.result?.value ?? []);
    const components = allComponents.filter((item) => !only || only.has(item.id));
    if (!components.length) throw new Error("没有找到可测试组件");
    console.log(`视觉回归：${components.length} 个组件 × ${themes.length} 个主题${accents[0] ? ` × ${accents.length} 个强调色` : ""}${update ? "（更新基线）" : ""}`);
    if (update && !only) {
      await fs.writeFile(path.join(baselineDir, "manifest.json"), JSON.stringify(allComponents, null, 2), "utf8");
    }

    for (const component of components) {
      for (const theme of themes) {
        for (const accent of accents) {
          const suffix = accent ? `--accent-${accentSlug(accent)}` : "";
          const name = `${component.id}--${theme}${suffix}.png`;
          const baselinePath = path.join(baselineDir, name);
          const actualPath = path.join(actualDir, name);
          const diffPath = path.join(diffDir, name);
          try {
            if (capturesSinceLaunch >= 80) {
              await chrome.close();
              chrome = await launchChrome();
              capturesSinceLaunch = 0;
            }
            capturesSinceLaunch += 1;
            const png = await capture(chrome.send, component.id, theme, accent);
            if (update) {
              await fs.writeFile(baselinePath, png);
              report.push({ component: component.id, theme, accent, status: "baseline", bytes: png.length });
              continue;
            }
            const baseline = await fs.readFile(baselinePath).catch(() => null);
            if (!baseline) {
              await fs.writeFile(actualPath, png);
              report.push({ component: component.id, theme, accent, status: "missing-baseline" });
              continue;
            }
            const comparison = await comparePng(baseline, png, componentTolerance[component.id] ?? threshold);
            if (comparison.changed) {
              await fs.writeFile(actualPath, png);
              if (comparison.diff) {
                await sharp(comparison.diff, { raw: { width: comparison.width, height: comparison.height, channels: 4 } }).png().toFile(diffPath);
              }
              report.push({ component: component.id, theme, accent, status: "changed", ratio: Number(comparison.ratio.toFixed(6)), reason: comparison.reason });
            } else {
              report.push({ component: component.id, theme, accent, status: "ok", ratio: Number(comparison.ratio.toFixed(6)), tolerance: componentTolerance[component.id] ?? threshold });
            }
          } catch (error) {
            report.push({ component: component.id, theme, accent, status: "error", error: String(error) });
          }
          process.stdout.write(".");
        }
      }
    }
  } finally {
    await chrome.close();
  }

  const failed = report.filter((entry) => ["changed", "missing-baseline", "error"].includes(entry.status));
  const summary = {
    mode: update ? "update" : "check",
    generatedAt: new Date().toISOString(),
    components: report.length,
    failed: failed.length,
    hash: createHash("sha1").update(JSON.stringify(report)).digest("hex"),
    entries: report,
  };
  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`\n${update ? "基线已更新" : failed.length ? `有 ${failed.length} 项视觉变化` : "视觉回归通过"} → visual/report.json`);
  if (!update && failed.length) process.exitCode = 1;
}

await main();
