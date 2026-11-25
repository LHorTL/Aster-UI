import { spawn } from "node:child_process";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = path.join(root, ".tmp", "browser-dom-test");
const harnessHtml = path.join(tmpDir, "harness.html");
const profileDir = path.join(tmpDir, "profile");
function resolveChromePath(): string {
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
  return candidates.find((p) => fsSync.existsSync(p)) ?? candidates[0]!;
}

const chromePath = resolveChromePath();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getJson(uri: string): Promise<Array<{ type: string; webSocketDebuggerUrl?: string }>> {
  return new Promise((resolve, reject) => {
    http
      .get(uri, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

describe("Aster UI Real-Browser DOM, Portal Theme, Focus Trap & IME Behavior", () => {
  let send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  let closeChrome: () => Promise<void>;

  beforeAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.mkdir(tmpDir, { recursive: true });

    const entryCode = `
      import React, { useRef, useState } from "react";
      import { createRoot } from "react-dom/client";
      import {
        AsterThemeProvider,
        AfAccordion,
        AfAlert,
        AfAlertDialog,
        AfApprovalCardPattern,
        AfAutoComplete,
        AfButton,
        AfCascader,
        AfChatComposer,
        AfCheckboxGroup,
        AfChipInput,
        AfCombobox,
        AfConfirmProvider,
        AfCopyButton,
        AfDrawer,
        AfForm,
        AfFormItem,
        AfInput,
        AfModal,
        AfNotificationStackPattern,
        AfNumberInput,
        AfPopover,
        AfRadioGroup,
        AfSegmented,
        AfSelect,
        AfSplitter,
        AfSwitch,
        AfTable,
        AfToastProvider,
        AfHoverCard,
        AfToggleGroup,
        AfCodeBlock,
        AfTimePicker,
        AfRunControls,
        AfConflictRadar,
        AfTree,
        AfSteps,
        AfDiffView,
        AfProjectCardPattern,
        AfCommentsPanel,
        AfDateRange,
        AfRating,
        AfAppDirectory,
        AfTaskBoard,
        AfAgentActivity,
        AfThinkingLoader,
        AfAgentQueuePattern,
        AfJudgeBracket,
        AfAgentTeam,
        AfGlowKeyboard,
        AfVoiceOrb,
        AfWorldMap,
        AfTiltCard,
        AfNumberTicker,
        AfBlurCrossfade,
        AfTray,
        AfShimmerLoader,
        AfLineChart,
        AfDelegateBoard,
        AfAgentPlan,
        AfAppMark,
        AfOverflowTagList,
        AfHotkeyInput,
        AfCountdown,
        AfQrCodeCard,
        AfDateTimeRangePicker,
        AfDropzone,
        AfResizableGroup,
        AfResizablePanel,
        AfResizableHandle,
        AfImagePreview,
        AfSparkline,
        afMessage,
        useAfConfirm,
        useAfForm,
        useAfToast,
        useAsterTheme,
        useStreamingTokens,
        usePointerScrub,
        useOverflowCollapse,
      } from "@fangxinyan/aster-ui";
      import * as AsterRuntime from "@fangxinyan/aster-ui/runtime";

      function ConfirmProbe() {
        const confirm = useAfConfirm();
        const [result, setResult] = useState("idle");
        return (
          <div>
            <AfButton
              id="imperative-confirm-btn"
              onClick={async () => {
                const ok = await confirm({
                  title: "确认执行危险清理？",
                  description: "此操作不可恢复。",
                  confirmText: "立即删除",
                  cancelText: "安全保留",
                  tone: "danger",
                });
                setResult(ok ? "confirmed" : "cancelled");
              }}
            >
              触发确认
            </AfButton>
            <div id="confirm-result">{result}</div>
          </div>
        );
      }

      function ToastProbe() {
        const toast = useAfToast();
        const lastIdRef = useRef(0);
        return (
          <div>
            <AfButton
              id="toast-push-btn"
              onClick={() => {
                lastIdRef.current = toast.push({ title: "正在同步索引", duration: 0, state: "loading" });
              }}
            >
              推送常驻通知
            </AfButton>
            <AfButton
              id="toast-update-btn"
              onClick={() => {
                toast.update(lastIdRef.current, { title: "索引同步完成", state: "success", tone: "success" });
              }}
            >
              更新通知
            </AfButton>
            <AfButton
              id="toast-dismiss-btn"
              onClick={() => {
                toast.dismiss(lastIdRef.current);
              }}
            >
              关闭通知
            </AfButton>
          </div>
        );
      }

      function ThemeAndParityProbes() {
        const { setDensity, setRadius } = useAsterTheme();
        const form = useAfForm({ email: "" });
        const [formStatus, setFormStatus] = useState("idle");
        const [cascaderVal, setCascaderVal] = useState("");
        const [acVal, setAcVal] = useState("");

        return (
          <div id="parity-probes">
            <button id="theme-compact-btn" type="button" onClick={() => setDensity("compact")}>紧凑</button>
            <button id="theme-radius-sm-btn" type="button" onClick={() => setRadius("sm")}>小圆角</button>

            <button
              id="msg-push-btn"
              type="button"
              onClick={() => afMessage.success({ key: "dom-msg", content: "保存成功", duration: 0 })}
            >
              发消息
            </button>
            <button id="msg-destroy-btn" type="button" onClick={() => afMessage.destroy("dom-msg")}>
              清消息
            </button>

            <AfForm
              form={form}
              onFinish={(v) => setFormStatus("ok:" + v.email)}
              onFinishFailed={({ errorFields }) => setFormStatus("err:" + errorFields.map((e) => e.name).join(","))}
            >
              <AfFormItem
                name="email"
                label="绑定邮箱"
                rules={[
                  { required: true, message: "邮箱必填" },
                  { pattern: /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/, message: "邮箱格式不正确" },
                ]}
              >
                <AfInput id="af-form-email" placeholder="user@example.com" />
              </AfFormItem>
              <button id="af-form-submit" type="submit">校验提交</button>
            </AfForm>
            <div id="af-form-status">{formStatus}</div>

            <div id="cascader-zone">
              <AfCascader
                label="节点路径"
                options={[
                  {
                    value: "cn",
                    label: "中国",
                    children: [{ value: "sh", label: "上海" }],
                  },
                ]}
                onChange={(val) => setCascaderVal(val.join("/"))}
              />
              <div id="cascader-val">{cascaderVal}</div>
            </div>

            <div id="ac-zone">
              <AfAutoComplete
                aria-label="模型联想"
                options={[
                  { value: "claude-sonnet", label: "Claude Sonnet" },
                  { value: "gpt-4o", label: "GPT-4o" },
                ]}
                onSelect={(v) => setAcVal(v)}
              />
              <div id="ac-val">{acVal}</div>
            </div>
          </div>
        );
      }

      function Harness() {
        const popAnchorRef = useRef(null);
        const [modalOpen, setModalOpen] = useState(false);
        const [alertOpen, setAlertOpen] = useState(false);
        const [enterCount, setEnterCount] = useState(0);
        const [submitLog, setSubmitLog] = useState([]);
        const [copiedLog, setCopiedLog] = useState([]);
        const [formDump, setFormDump] = useState("");
        const [selectedRows, setSelectedRows] = useState([]);
        const [v5Step, setV5Step] = useState(0);
        const [v5TreeKey, setV5TreeKey] = useState(null);
        const [casMultiVal, setCasMultiVal] = useState([]);
        const [casAnyVal, setCasAnyVal] = useState([]);
        const [casAsyncOpts, setCasAsyncOpts] = useState([
          { value: "us", label: "美西节点", isLeaf: false },
        ]);
        const [drVal, setDrVal] = useState({
          start: new Date(2026, 9, 15),
          end: new Date(2026, 10, 13),
          compare: true,
        });
        const [drawerOpen, setDrawerOpen] = useState(false);
        const [drawerSide, setDrawerSide] = useState("right");
        const [splitCollapsed, setSplitCollapsed] = useState(false);
        const [showV05Probes, setShowV05Probes] = useState(false);
        const [showPhase2Probes, setShowPhase2Probes] = useState(false);
        const [showP0MotionProbes, setShowP0MotionProbes] = useState(false);
        const [p0AnchorPopOpen, setP0AnchorPopOpen] = useState(false);
        const [p0TickerVal, setP0TickerVal] = useState(99);
        const [p0BlurKey, setP0BlurKey] = useState("step-a");
        const [p0TrayDirty, setP0TrayDirty] = useState(false);
        const p0AnchorBtnRef = useRef(null);
        const [orbPressed, setOrbPressed] = useState(0);

        return (
          <AsterThemeProvider initialMode="light" initialAccent="#e11d48">
            <AfToastProvider placement="top-right">
              <AfConfirmProvider>
                <div id="app-content" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                  <AfButton id="pop-trigger" ref={popAnchorRef}>触发浮层</AfButton>
                  <AfPopover open anchorRef={popAnchorRef} role="dialog" onPointerDownOutside={() => {}}>
                    <div id="portaled-pop-inner" style={{ color: "var(--af-accent)" }}>Pop</div>
                  </AfPopover>

                  <AfPopover
                    side="bottom"
                    label="触发模式面板"
                    trigger={<AfButton id="self-pop-trigger">自包含浮层</AfButton>}
                  >
                    <div id="self-pop-content">SelfPopBody</div>
                  </AfPopover>

                  <AfButton id="open-modal-btn" onClick={() => setModalOpen(true)}>打开弹窗</AfButton>
                  <AfModal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title="焦点陷阱测试"
                    footer={
                      <>
                        <AfButton id="modal-cancel" onClick={() => setModalOpen(false)}>取消</AfButton>
                        <AfButton id="modal-confirm" variant="accent">确认</AfButton>
                      </>
                    }
                  >
                    <AfInput id="modal-first-input" placeholder="弹窗内首个输入框" />
                  </AfModal>

                  <AfButton id="open-alert-btn" onClick={() => setAlertOpen(true)}>打开警示框</AfButton>
                  <AfAlertDialog
                    open={alertOpen}
                    onClose={() => setAlertOpen(false)}
                    onConfirm={() => {}}
                    title="确认移除工作区？"
                    description="移除后无法恢复。"
                    cancelText="取消移除"
                    confirmText="确认移除"
                  />

                  <ConfirmProbe />
                  <ToastProbe />
                  <ThemeAndParityProbes />

                  <AfInput
                    id="ime-input"
                    placeholder="测试输入法回车"
                    onPressEnter={() => setEnterCount((c) => c + 1)}
                  />
                  <div id="enter-count">{enterCount}</div>

                  <AfChatComposer
                    placeholder="会话输入器"
                    defaultValue="你好星序"
                    onSubmit={async ({ message }) => {
                      setSubmitLog((prev) => [...prev, message]);
                    }}
                  />
                  <div id="submit-count">{submitLog.length}</div>

                  <AfCopyButton id="copy-btn" text="aster-secret-token" onCopy={(t) => setCopiedLog((p) => [...p, t])} />
                  <div id="copied-value">{copiedLog.join(",")}</div>

                  <div id="table-zone">
                    <AfTable
                      caption="模型监控"
                      selectable
                      selectedKeys={selectedRows}
                      onSelectedKeysChange={(keys) => setSelectedRows(keys)}
                      columns={[
                        { key: "name", title: "名称", dataIndex: "name", sortable: true },
                        {
                          key: "cost",
                          title: "消耗",
                          dataIndex: "cost",
                          sortable: true,
                          sortType: "number",
                          render: (v) => "$" + Number(v).toLocaleString("en-US"),
                        },
                      ]}
                      data={[
                        { id: "r1", name: "Item 2", cost: 210 },
                        { id: "r2", name: "Item 10", cost: 1480 },
                        { id: "r3", name: "Item 1", cost: 38 },
                      ]}
                    />
                    <div id="table-selected">{selectedRows.join(",")}</div>
                  </div>

                  <div id="acc-multi">
                    <AfAccordion
                      showToggleAll
                      defaultValue={["a1"]}
                      items={[
                        { key: "a1", title: "条目一", content: "内容一" },
                        { key: "a2", title: "条目二", content: "内容二" },
                      ]}
                    />
                  </div>

                  <div id="acc-single">
                    <AfAccordion
                      type="single"
                      defaultValue="s1"
                      items={[
                        { key: "s1", title: "互斥一", content: "内容 S1" },
                        { key: "s2", title: "互斥二", content: "内容 S2" },
                      ]}
                    />
                  </div>

                  <form
                    id="native-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const pairs = [];
                      for (const [k, v] of fd.entries()) {
                        pairs.push(k + "=" + String(v));
                      }
                      setFormDump(pairs.join("&"));
                    }}
                  >
                    <AfSelect
                      label="模型"
                      name="models"
                      multiple
                      defaultValue={["sonnet", "haiku"]}
                      options={[
                        { value: "sonnet", label: "Sonnet" },
                        { value: "haiku", label: "Haiku" },
                      ]}
                    />
                    <AfSwitch name="sync" defaultChecked />
                    <AfSegmented
                      label="范围"
                      name="range"
                      defaultValue="30d"
                      options={[
                        { value: "7d", label: "7d" },
                        { value: "30d", label: "30d" },
                      ]}
                    />
                    <AfNumberInput name="limit" defaultValue={12} />
                    <AfRadioGroup
                      label="档位"
                      name="tier"
                      defaultValue="pro"
                      options={[
                        { value: "free", label: "Free" },
                        { value: "pro", label: "Pro" },
                      ]}
                    />
                    <AfCheckboxGroup
                      label="权限"
                      name="perms"
                      defaultValue={["read", "cite"]}
                      options={[
                        { value: "read", label: "Read" },
                        { value: "cite", label: "Cite" },
                      ]}
                    />
                    <AfChipInput name="labels" defaultValue={["core"]} />
                    <button id="submit-native-form" type="submit">提交表单</button>
                  </form>
                  <div id="form-dump">{formDump}</div>

                  <div id="v4-probes">
                    <AfHoverCard openDelay={20} trigger={<button id="hc-trigger" type="button">Preview</button>}>
                      Hover preview payload
                    </AfHoverCard>
                    <div id="tg-probe">
                      <AfToggleGroup
                        defaultValue="left"
                        options={[
                          { value: "left", label: "Left" },
                          { value: "center", label: "Center" },
                          { value: "right", label: "Right" },
                        ]}
                      />
                    </div>
                    <div id="cb-probe">
                      <AfCodeBlock filename="demo.ts" code="const x = 42;" />
                    </div>
                    <div id="tp-probe">
                      <AfTimePicker editable defaultValue="09:00" />
                    </div>
                    <div id="chip-dup-probe">
                      <AfChipInput defaultValue={["alpha"]} />
                    </div>
                    <div id="runc-probe">
                      <AfRunControls />
                    </div>
                    <div id="radar-probe">
                      <AfConflictRadar
                        conflicts={[
                          {
                            id: "c1",
                            file: "src/checkout/payment.ts",
                            lines: "14–48",
                            agentA: "Checkout",
                            agentB: "Stripe",
                            snippetA: "Idempotency key guard",
                            snippetB: "Webhook signature lock",
                          },
                        ]}
                      />
                    </div>
                  </div>

                  <div id="v5-probes">
                    <div id="tree-probe">
                      <AfTree
                        label="项目文件树"
                        selectedKey={v5TreeKey}
                        onSelect={(key) => setV5TreeKey(key)}
                        nodes={[
                          {
                            key: "src",
                            label: "src",
                            children: [{ key: "ui", label: "ui.tsx" }],
                          },
                          { key: "readme", label: "README.md" },
                        ]}
                      />
                    </div>
                    <div id="steps-probe">
                      <AfSteps
                        current={v5Step}
                        onChange={setV5Step}
                        items={[
                          { key: "s1", title: "连接仓库" },
                          { key: "s2", title: "配置规则" },
                          { key: "s3", title: "启动审查" },
                        ]}
                      />
                    </div>
                    <div id="diff-probe" style={{ width: 520 }}>
                      <AfDiffView
                        filename="diff.ts"
                        showModeSwitch
                        before={"export function verifySession(cookie: string, options: { strict: boolean; maxAge: number }) {\\nconst b = 2;"}
                        after={"export function verifySession(cookie: string, options: { strict: boolean; maxAge: number }) {\\nconst b = 3;"}
                      />
                    </div>
                    <div id="combobox-probe">
                      <AfCombobox defaultValue={["p1"]} />
                    </div>
                    <div id="searchable-select-probe">
                      <AfSelect
                        label="搜索模型"
                        searchable
                        defaultValue="sonnet"
                        options={[
                          { value: "sonnet", label: "Sonnet" },
                          { value: "haiku", label: "Haiku" },
                        ]}
                      />
                    </div>
                    <div id="searchable-cascader-probe">
                      <AfCascader
                        label="搜索区域"
                        searchable
                        defaultValue={["cn", "bj"]}
                        options={[
                          {
                            value: "cn",
                            label: "中国",
                            children: [
                              { value: "bj", label: "北京" },
                              { value: "sh", label: "上海" },
                            ],
                          },
                        ]}
                      />
                    </div>
                    <div id="project-card-probe">
                      <AfProjectCardPattern showNote={false} />
                    </div>

                    <div id="cascader-click-probe">
                      <AfCascader
                        label="点击级联探针"
                        defaultValue={["cn", "east", "sh"]}
                        options={[
                          {
                            value: "cn",
                            label: "中国大陆",
                            children: [
                              {
                                value: "east",
                                label: "华东节点",
                                children: [
                                  { value: "sh", label: "上海一区" },
                                  { value: "hz", label: "杭州金融云" },
                                ],
                              },
                              {
                                value: "north",
                                label: "华北节点",
                                children: [
                                  { value: "bj", label: "北京三区" },
                                  { value: "tj", label: "天津算力" },
                                ],
                              },
                            ],
                          },
                        ]}
                      />
                    </div>

                    <div id="cascader-hover-probe">
                      <AfCascader
                        label="悬停级联探针"
                        expandTrigger="hover"
                        defaultValue={["cn", "east", "sh"]}
                        options={[
                          {
                            value: "cn",
                            label: "中国大陆",
                            children: [
                              {
                                value: "east",
                                label: "华东节点",
                                children: [{ value: "sh", label: "上海一区" }],
                              },
                              {
                                value: "north",
                                label: "华北节点",
                                children: [
                                  { value: "bj", label: "北京三区" },
                                  { value: "tj", label: "天津算力" },
                                ],
                              },
                            ],
                          },
                        ]}
                      />
                    </div>

                    <div id="cascader-multi-probe">
                      <AfCascader
                        label="多选级联探针"
                        multiple
                        showCheckedStrategy="SHOW_PARENT"
                        value={casMultiVal}
                        onChange={(next) => setCasMultiVal(next)}
                        options={[
                          {
                            value: "cn",
                            label: "中国大陆",
                            children: [
                              {
                                value: "east",
                                label: "华东节点",
                                children: [
                                  { value: "sh", label: "上海一区" },
                                  { value: "hz", label: "杭州金融云" },
                                ],
                              },
                            ],
                          },
                        ]}
                      />
                      <div id="cascader-multi-val">{JSON.stringify(casMultiVal)}</div>
                    </div>

                    <div id="cascader-async-probe">
                      <AfCascader
                        label="异步级联探针"
                        changeOnSelect
                        value={casAnyVal}
                        onChange={(next) => setCasAnyVal(next)}
                        options={casAsyncOpts}
                        loadData={async (opts) => {
                          const target = opts[opts.length - 1];
                          await new Promise((r) => setTimeout(r, 30));
                          setCasAsyncOpts([
                            {
                              value: target.value,
                              label: target.label,
                              children: [{ value: "sjc1", label: "硅谷一区" }],
                            },
                          ]);
                        }}
                      />
                      <div id="cascader-async-val">{casAnyVal.join("/")}</div>
                    </div>

                    <div id="comments-hover-probe">
                      <AfCommentsPanel comments={[{ id: "c1", author: "A", createdAt: "刚刚", text: "测试评论", resolved: false }]} />
                    </div>

                    <div id="daterange-hover-probe">
                      <AfDateRange
                        value={drVal}
                        onChange={setDrVal}
                        min={new Date(2026, 0, 1)}
                        max={new Date(2026, 11, 31)}
                      />
                    </div>

                    <div id="approval-approve-probe">
                      <AfApprovalCardPattern />
                    </div>
                    <div id="approval-deny-probe">
                      <AfApprovalCardPattern />
                    </div>

                    <div id="drawer-layout-probe">
                      <AfButton id="open-drawer-right" onClick={() => { setDrawerSide("right"); setDrawerOpen(true); }}>右抽屉</AfButton>
                      <AfButton id="open-drawer-left" onClick={() => { setDrawerSide("left"); setDrawerOpen(true); }}>左抽屉</AfButton>
                      <AfButton id="open-drawer-bottom" onClick={() => { setDrawerSide("bottom"); setDrawerOpen(true); }}>底抽屉</AfButton>
                      <AfDrawer open={drawerOpen} placement={drawerSide} onClose={() => setDrawerOpen(false)} title="抽屉越界测试" footer={<AfButton onClick={() => setDrawerOpen(false)}>关闭</AfButton>}>
                        <p>抽屉内容</p>
                      </AfDrawer>
                    </div>

                    <div id="splitter-collapse-probe">
                      <AfButton id="toggle-splitter-collapse" onClick={() => setSplitCollapsed((v) => !v)}>折叠侧栏</AfButton>
                      <div style={{ height: 200 }}>
                        <AfSplitter
                          collapsed={splitCollapsed}
                          defaultSize={180}
                          style={{ height: 200 }}
                          items={[
                            { id: "side", style: { padding: 12 }, children: <div style={{ whiteSpace: "normal" }}>固定像素首栏 长文案用于检验折叠后是否产生垂直文字塔</div> },
                            { id: "main", children: <div>主工作区</div> },
                          ]}
                        />
                      </div>
                    </div>

                    <div id="ns-dismiss-probe">
                      <AfNotificationStackPattern showNote={false} />
                    </div>

                    <button id="mount-v05-probes" type="button" onClick={() => setShowV05Probes(true)}>
                      挂载 v0.5 探针
                    </button>

                    {showV05Probes ? (
                      <div id="v05-probes-root" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div id="v05-rating-probe">
                          <AfRating id="rating-stars-probe" defaultValue={3} allowClear />
                          <AfRating id="rating-thumbs-probe" variant="thumbs" />
                        </div>

                        <div id="v05-app-dir-probe" style={{ width: 1080 }}>
                          <AfAppDirectory />
                        </div>

                        <div id="v05-task-board-probe" style={{ width: 1080 }}>
                          <AfTaskBoard />
                        </div>

                        <AsterThemeProvider initialMode="dark">
                          <div id="v05-dark-screen-probe" style={{ width: 1180, height: 672 }}>
                            <AfAgentActivity />
                          </div>
                        </AsterThemeProvider>

                        <AsterThemeProvider initialMode="light" initialDensity="comfortable">
                          <div id="v05-physics-probe" style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}>
                            <AfSelect
                              label="可搜索模型选择"
                              searchable
                              defaultValue="claude-sonnet"
                              hint="支持直接输入关键词检索"
                              options={[
                                { value: "claude-sonnet", label: "Claude Sonnet 4", icon: "sparkle" },
                                { value: "gpt-4o", label: "GPT-4o", icon: "globe" },
                              ]}
                            />
                            <AfButton id="v05-inline-svg-btn">
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" />
                              </svg>
                              <span>Run Benchmark</span>
                            </AfButton>

                            <div id="v05-optical-align-probe" style={{ display: "flex", flexDirection: "column", gap: 12, width: 360 }}>
                              <AfButton
                                id="v05-cfg-msg-btn"
                                onClick={() => afMessage.success({ key: "cfg-saved", content: "Configuration saved", duration: 0 })}
                              >
                                Save Config
                              </AfButton>
                              <AfTable
                                caption="Alignment Check"
                                selectable
                                columns={[{ key: "name", title: "Model", dataIndex: "name" }]}
                                data={[{ id: "m1", name: "Claude Sonnet 4" }]}
                              />
                              <AfAlert tone="success" title="All 8 architecture gates passed" />
                              <AfThinkingLoader phases={["Thinking"]} />
                            </div>
                          </div>
                        </AsterThemeProvider>
                      </div>
                    ) : null}

                    <button id="mount-phase2-probes" type="button" onClick={() => setShowPhase2Probes(true)}>
                      Mount Phase 2 Parity Probes
                    </button>

                    {showPhase2Probes ? (
                      <div id="phase2-probes-root" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div id="p2-agent-queue-probe" style={{ width: 780 }}>
                          <AfAgentQueuePattern />
                        </div>
                        <div id="p2-judge-bracket-probe" style={{ width: 880 }}>
                          <AfJudgeBracket judging="0:0" />
                        </div>
                        <div id="p2-illustrations-probe" style={{ width: 780, display: "flex", flexDirection: "column", gap: 16 }}>
                          <div id="p2-il-team"><AfAgentTeam /></div>
                          <div id="p2-il-keyboard"><AfGlowKeyboard /></div>
                          <div id="p2-il-orb">
                            <AfVoiceOrb state="listening" onPress={() => setOrbPressed((c) => c + 1)} />
                            <span id="p2-orb-count">{orbPressed}</span>
                          </div>
                          <div id="p2-il-map"><AfWorldMap /></div>
                        </div>
                      </div>
                    ) : null}

                    <button id="mount-p0-motion-probes" type="button" onClick={() => setShowP0MotionProbes(true)}>
                      Mount P0 Motion Probes
                    </button>

                    {showP0MotionProbes ? (
                      <div id="p0-motion-probes-root" style={{ display: "flex", flexDirection: "column", gap: 16, width: 640 }}>
                        <div>
                          <AfButton
                            id="p0-anchor-pop-btn"
                            ref={p0AnchorBtnRef}
                            onClick={() => setP0AnchorPopOpen((v) => !v)}
                          >
                            Toggle Anchor Popover
                          </AfButton>
                          <AfPopover
                            id="p0-anchor-pop"
                            open={p0AnchorPopOpen}
                            anchorRef={p0AnchorBtnRef}
                            onClose={() => setP0AnchorPopOpen(false)}
                          >
                            <div id="p0-anchor-pop-body">Anchored Overlay Snapshot</div>
                          </AfPopover>
                        </div>

                        <div id="p0-tilt-probe" style={{ width: 280 }}>
                          <AfTiltCard>
                            <div style={{ padding: 16 }}>3D Tilt Surface</div>
                          </AfTiltCard>
                        </div>

                        <div id="p0-ticker-probe" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <AfNumberTicker id="p0-ticker" value={p0TickerVal} animateOnMount={false} duration={260} />
                          <button id="p0-ticker-inc" type="button" onClick={() => setP0TickerVal(100)}>
                            Step to 100
                          </button>
                        </div>

                        <div id="p0-morph-probe" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <button id="p0-blur-toggle" type="button" onClick={() => setP0BlurKey((k) => (k === "step-a" ? "step-b" : "step-a"))}>
                            Swap Blur Panel
                          </button>
                          <AfBlurCrossfade id={p0BlurKey} duration={260}>
                            <div style={{ padding: p0BlurKey === "step-a" ? 8 : 20 }}>Blur Morph Panel {p0BlurKey}</div>
                          </AfBlurCrossfade>
                          <button id="p0-tray-toggle" type="button" onClick={() => setP0TrayDirty((v) => !v)}>
                            Toggle Tray Footer
                          </button>
                          <AfTray
                            title="Workspace Quota"
                            footer={p0TrayDirty ? <div id="p0-tray-foot-inner">Unsaved changes</div> : null}
                          >
                            <div style={{ padding: 12 }}>Tray Card Content</div>
                          </AfTray>
                          <AfShimmerLoader id="p0-shimmer-block" width={160} height={14} />
                        </div>

                        <div id="p0-chart-probe" style={{ width: 520 }}>
                          <AfLineChart
                            label="Token trend"
                            format={(v) => String(v)}
                            labels={["Mon", "Tue", "Wed", "Thu"]}
                            series={[
                              { name: "Tokens", values: [120, 260, 190, 340] },
                              { name: "Baseline", values: [100, 140, 150, 180] },
                            ]}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </AfConfirmProvider>
            </AfToastProvider>
          </AsterThemeProvider>
        );
      }

      const hostPluginRuntime = AsterRuntime.createAsterPluginRuntime({
        ui: AsterRuntime,
        globalKey: "__asterPluginShared",
      });

      function IsolatedPluginView() {
        const theme = AsterRuntime.useAsterTheme();
        const toast = AsterRuntime.useAfToast();
        const runtime = AsterRuntime.useAsterPluginRuntime();
        const anchorRef = useRef(null);
        const [popOpen, setPopOpen] = useState(true);
        return (
          <div
            id="isolated-plugin-probe"
            data-plugin-mode={theme.mode}
            data-plugin-resolved={theme.resolved}
            data-plugin-accent={theme.accent}
            data-plugin-density={theme.density}
            data-plugin-radius={theme.radius}
            data-has-runtime={String(Boolean(runtime))}
          >
            <AsterRuntime.AfButton
              id="isolated-plugin-anchor"
              ref={anchorRef}
              onClick={() => setPopOpen((v) => !v)}
            >
              Plugin Trigger
            </AsterRuntime.AfButton>
            <AsterRuntime.AfPopover id="isolated-plugin-popover" open={popOpen} anchorRef={anchorRef}>
              <div id="isolated-plugin-pop-inner" style={{ color: "var(--af-accent)" }}>
                Isolated Plugin Popover
              </div>
            </AsterRuntime.AfPopover>
            <button
              id="isolated-plugin-msg-btn"
              type="button"
              onClick={() => {
                AsterRuntime.afMessage.info({ key: "plugin-msg", content: "插件跨根轻提示", duration: 0 });
                toast.push({ title: "插件跨根通知", duration: 0 });
              }}
            >
              Send Plugin Feedback
            </button>
            <button
              id="isolated-plugin-cleanup-btn"
              type="button"
              onClick={() => {
                AsterRuntime.afMessage.destroy("plugin-msg");
                toast.dismissAll();
              }}
            >
              Cleanup Plugin Feedback
            </button>
            <button
              id="isolated-plugin-accent-btn"
              type="button"
              onClick={() => theme.setAccent("violet")}
            >
              Plugin Set Violet
            </button>
          </div>
        );
      }

      function TransparentDocumentProbe({ onSnapshot }) {
        const [accent, setAccent] = useState("violet");
        const popRef = useRef(null);
        return (
          <AsterRuntime.AsterThemeProvider
            mode="dark"
            accent={accent}
            density="compact"
            radius="lg"
            transparent
            target="document"
            storage={false}
            messageHost={false}
            onChange={(snap) => {
              setAccent(snap.accent);
              onSnapshot(snap);
            }}
          >
            <div id="transparent-doc-inner">
              <TransparentDocControls popRef={popRef} />
            </div>
          </AsterRuntime.AsterThemeProvider>
        );
      }

      function TransparentDocControls({ popRef }) {
        const { setAccent } = AsterRuntime.useAsterTheme();
        return (
          <div>
            <AsterRuntime.AfButton id="transparent-doc-anchor" ref={popRef}>
              Transparent Anchor
            </AsterRuntime.AfButton>
            <AsterRuntime.AfPopover id="transparent-doc-popover" open anchorRef={popRef}>
              <div id="transparent-doc-pop-inner">Solid Overlay On Transparent Canvas</div>
            </AsterRuntime.AfPopover>
            <button
              id="transparent-doc-green-btn"
              type="button"
              onClick={() => setAccent("green")}
            >
              Switch Controlled Accent
            </button>
          </div>
        );
      }

      window.__p0RuntimeBridge = {
        mountIsolatedPlugin() {
          const el = document.createElement("div");
          el.id = "isolated-plugin-mount";
          document.body.appendChild(el);
          const pluginRoot = createRoot(el);
          pluginRoot.render(
            <AsterRuntime.AfPluginProvider globalKey="__asterPluginShared" pluginId="isolated-demo">
              <IsolatedPluginView />
            </AsterRuntime.AfPluginProvider>,
          );
          return () => {
            pluginRoot.unmount();
            el.remove();
          };
        },
        mountTransparentDocument(onSnapshot) {
          const el = document.createElement("div");
          el.id = "transparent-doc-mount";
          document.body.appendChild(el);
          const docRoot = createRoot(el);
          docRoot.render(<TransparentDocumentProbe onSnapshot={onSnapshot} />);
          return () => {
            docRoot.unmount();
            el.remove();
          };
        },
        getRuntimeSnapshot() {
          return Boolean(window.__asterPluginShared && hostPluginRuntime.shared === window.__asterPluginShared);
        },
      };

      function P03PrimitivesProbe() {
        const [streamSrc, setStreamSrc] = useState("");
        const [streaming, setStreaming] = useState(true);
        const [completedText, setCompletedText] = useState("");
        const stream = useStreamingTokens(streamSrc, {
          streaming,
          charsPerTick: 4,
          intervalMs: 16,
          segmentTTL: 90,
          onComplete: (txt) => setCompletedText(txt),
        });

        const [scrubVal, setScrubVal] = useState(50);
        const { scrubbing, scrubProps } = usePointerScrub({
          value: scrubVal,
          min: 0,
          max: 300,
          step: 2,
          pixelsPerStep: 5,
          onChange: setScrubVal,
        });

        const [wide, setWide] = useState(false);
        const tags = ["Models", "Plugins", "Channels", "Memory", "Schedules", "Permissions"];
        const { containerRef, visibleCount, overflowCount, isCollapsed } = useOverflowCollapse({
          itemCount: tags.length,
          gap: 6,
          reservedWidth: 44,
        });

        return (
          <div id="p03-prims">
            <button
              id="p03-stream-start"
              type="button"
              onClick={() => {
                setStreaming(true);
                setStreamSrc("Aster 🚀 流式渲染完成");
              }}
            >
              Push Stream
            </button>
            <button id="p03-stream-finish" type="button" onClick={() => setStreaming(false)}>
              End Stream
            </button>
            <div
              id="p03-stream-out"
              data-revealing={stream.isRevealing ? "true" : "false"}
              data-completed={completedText}
            >
              <span id="p03-stream-stable">{stream.stableText}</span>
              {stream.segments.map((seg) => (
                <span key={seg.id} className="af-stream-token">
                  {seg.text}
                </span>
              ))}
            </div>

            <div id="p03-scrub" {...scrubProps} data-active-scrub={scrubbing ? "true" : "false"}>
              {scrubVal}
            </div>

            <div
              id="p03-overflow"
              ref={containerRef}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: wide ? 560 : 190,
                overflow: "hidden",
              }}
            >
              {tags.slice(0, visibleCount).map((t) => (
                <span
                  key={t}
                  data-overflow-item=""
                  style={{ width: 68, flexShrink: 0, display: "inline-block" }}
                >
                  {t}
                </span>
              ))}
              {isCollapsed ? (
                <span
                  id="p03-overflow-badge"
                  data-overflow-indicator=""
                  style={{ width: 40, flexShrink: 0, display: "inline-block" }}
                >
                  +{overflowCount}
                </span>
              ) : null}
            </div>
            <button id="p03-overflow-widen" type="button" onClick={() => setWide(true)}>
              Widen
            </button>
          </div>
        );
      }

      function P03MotionWorkbench() {
        const [boardTasks, setBoardTasks] = useState([
          { key: "AST-101", title: "Spring drag", status: "todo", priority: 2 },
          { key: "AST-102", title: "Exit animation", status: "todo", priority: 3 },
          { key: "AST-103", title: "Runtime bridge", status: "done", priority: 1 },
        ]);

        return (
          <AsterThemeProvider initialMode="dark" storage={false}>
            <div id="p03-scope" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
              <div id="p03-approval" style={{ width: 520 }}>
                <AfApprovalCardPattern
                  title={
                    <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: "22px" }}>
                      <span>Deploy cluster us-east-1</span>
                      <span>Rolling restart 12 worker pods</span>
                    </span>
                  }
                  onApprove={() =>
                    new Promise((resolve) => {
                      window.__p03ResolveApproval = resolve;
                    })
                  }
                />
              </div>

              <div id="p03-board" style={{ width: 980 }}>
                <AfTaskBoard
                  tasks={boardTasks}
                  onChange={setBoardTasks}
                />
              </div>

              <div id="p03-delegate" style={{ width: 860 }}>
                <AfDelegateBoard />
              </div>

              <div id="p03-plan" style={{ width: 620 }}>
                <AfAgentPlan />
              </div>

              <P03PrimitivesProbe />
            </div>
          </AsterThemeProvider>
        );
      }

      window.__p03MotionBridge = {
        mount() {
          const el = document.createElement("div");
          el.id = "p03-workbench-mount";
          document.body.appendChild(el);
          const r = createRoot(el);
          r.render(<P03MotionWorkbench />);
          return () => {
            r.unmount();
            el.remove();
          };
        },
      };

      function P04Workbench() {
        const [tagBoxW, setTagBoxW] = useState(180);
        const [hotkey, setHotkey] = useState("Mod+K");
        const [numVal, setNumVal] = useState(20);
        const [committedVal, setCommittedVal] = useState(20);
        const [unit, setUnit] = useState("GB");
        const [acOptions, setAcOptions] = useState([
          { value: "claude-opus-5-5", label: "Claude Opus 5.5", group: "历史记录" },
          { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", group: "历史记录" },
          { value: "claude-haiku-5-5", label: "Claude Haiku 5.5", group: "推荐" },
        ]);
        const [dtRange, setDtRange] = useState(null);
        const [previewOpen, setPreviewOpen] = useState(false);
        const [checkedTree, setCheckedTree] = useState(["c1"]);

        const demoSvgImg1 = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'><rect width='320' height='200' fill='%230060e2'/></svg>";
        const demoSvgImg2 = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'><rect width='320' height='200' fill='%230f9f7f'/></svg>";

        return (
          <AsterThemeProvider initialMode="dark" storage={false}>
            <div id="p04-scope" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, width: 900 }}>
              <div id="p04-tags-wrap" style={{ width: tagBoxW }}>
                <AfOverflowTagList
                  items={[
                    { key: "a", label: "模型路由", color: "blue" },
                    { key: "b", label: "知识库索引", color: "emerald" },
                    { key: "c", label: "多模态视觉", color: "violet" },
                    { key: "d", label: "终端沙箱", color: "amber" },
                    { key: "e", label: "本地语音", color: "cyan" },
                  ]}
                />
              </div>
              <button id="p04-tags-widen" type="button" onClick={() => setTagBoxW(520)}>
                Widen Tags
              </button>

              <div id="p04-hotkey-zone" data-val={hotkey}>
                <AfHotkeyInput
                  value={hotkey}
                  onChange={setHotkey}
                  resetValue="Alt+Space"
                  checkConflict={(combo) => (combo === "Mod+C" ? "与系统复制冲突" : null)}
                />
              </div>

              <div id="p04-number-zone" data-val={numVal} data-committed={committedVal} data-unit={unit}>
                <AfNumberInput
                  scrubbable
                  min={0}
                  max={500}
                  step={2}
                  value={numVal}
                  commitMode="blur"
                  onChange={setNumVal}
                  onCommit={setCommittedVal}
                  unit={unit}
                  onUnitChange={setUnit}
                  unitOptions={["MB", "GB", "TB"]}
                  prefix="容量"
                />
              </div>

              <div id="p04-ac-zone" data-count={acOptions.length}>
                <AfAutoComplete
                  removable
                  options={acOptions}
                  onRemoveOption={(val) => setAcOptions((prev) => prev.filter((o) => o.value !== val))}
                  placeholder="选择或搜索模型"
                />
              </div>

              <div id="p04-dtrp-zone" data-has-range={dtRange ? "true" : "false"}>
                <AfDateTimeRangePicker
                  locale="zh-CN"
                  showSeconds
                  today={new Date(2026, 10, 16)}
                  value={dtRange}
                  onChange={setDtRange}
                />
              </div>

              <div id="p04-drop-zone">
                <AfDropzone
                  allowPaste
                  defaultFiles={[]}
                  onUpload={(file, onProgress, ctx) =>
                    new Promise((resolve, reject) => {
                      onProgress(25, { status: "hashing" });
                      const timer = setTimeout(() => resolve(), 5000);
                      ctx.signal.addEventListener("abort", () => {
                        clearTimeout(timer);
                        reject(new DOMException("Aborted", "AbortError"));
                      });
                    })
                  }
                />
              </div>

              <div id="p04-table-zone" style={{ width: 380 }}>
                <AfTable
                  columns={[
                    { key: "name", title: "节点", dataIndex: "name", fixed: "left", width: 130, sortable: true },
                    { key: "region", title: "可用区", dataIndex: "region", width: 220 },
                    { key: "latency", title: "延迟", dataIndex: "latency", width: 180, sortable: true, sortType: "number" },
                    { key: "op", title: "操作", fixed: "right", width: 100, render: () => "详情" },
                  ]}
                  data={[
                    { id: "t1", name: "Node-B", region: "ap-northeast-1", latency: 48 },
                    { id: "t2", name: "Node-A", region: "us-west-2", latency: 12 },
                  ]}
                  expandable={{
                    expandedRowRender: (row) => <div className="p04-exp-detail">Expanded:{row.name}</div>,
                  }}
                />
              </div>

              <div id="p04-split-zone" style={{ width: 600, height: 120 }}>
                <AfResizableGroup storageKey="p04-test-split">
                  <AfResizablePanel id="left" defaultWidthPx={200} minWidthPx={120} maxWidthPx={340} collapsible>
                    Left
                  </AfResizablePanel>
                  <AfResizableHandle label="Split" />
                  <AfResizablePanel id="mid" flex>
                    Middle
                  </AfResizablePanel>
                </AfResizableGroup>
              </div>

              <div id="p04-img-zone">
                <button id="p04-open-preview" type="button" onClick={() => setPreviewOpen(true)}>
                  Open Preview
                </button>
                <AfImagePreview
                  open={previewOpen}
                  onClose={() => setPreviewOpen(false)}
                  images={[
                    { src: demoSvgImg1, alt: "Slide 1" },
                    { src: demoSvgImg2, alt: "Slide 2" },
                  ]}
                />
              </div>

              <div id="p04-tree-zone" data-checked={checkedTree.join(",")}>
                <AfTree
                  checkable
                  defaultExpandedKeys={["p1"]}
                  checkedKeys={checkedTree}
                  onCheck={(keys) => setCheckedTree(keys)}
                  searchValue="日志"
                  nodes={[
                    {
                      key: "p1",
                      label: "核心模块",
                      children: [
                        { key: "c1", label: "网络代理" },
                        { key: "c2", label: "审计日志引擎" },
                      ],
                    },
                  ]}
                />
              </div>

              <div id="p04-spark-zone">
                <AfSparkline
                  interactive
                  width={160}
                  height={40}
                  values={[10, 25, 40, 30, 55]}
                  labels={["T1", "T2", "T3", "T4", "T5"]}
                />
              </div>

              <div id="p04-qr-zone">
                <AfQrCodeCard
                  value="https://aster-ui.dev/pair?code=884210"
                  logo={<AfAppMark size={24} icon="sparkle" tone="accent" />}
                  footer={<AfCountdown durationMs={45_000} paused warnThresholdMs={60_000} />}
                />
              </div>
            </div>
          </AsterThemeProvider>
        );
      }

      window.__p04WorkbenchBridge = {
        mount() {
          localStorage.removeItem("af-resizable:p04-test-split");
          const el = document.createElement("div");
          el.id = "p04-workbench-mount";
          document.body.appendChild(el);
          const r = createRoot(el);
          r.render(<P04Workbench />);
          return () => {
            r.unmount();
            el.remove();
            localStorage.removeItem("af-resizable:p04-test-split");
          };
        },
      };

      window.__AsterRuntime = AsterRuntime;
      createRoot(document.getElementById("root")).render(<Harness />);
    `;

    const entryFile = path.join(tmpDir, "entry.jsx");
    await fs.writeFile(entryFile, entryCode, "utf8");
    const bundled = await build({
      entryPoints: [entryFile],
      bundle: true,
      write: false,
      format: "iife",
      target: "es2022",
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"production"' },
    });
    const css = await fs.readFile(path.join(root, "dist/styles.css"), "utf8");
    const js = bundled.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
    await fs.writeFile(
      harnessHtml,
      `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`,
      "utf8",
    );

    const port = 9400 + Math.floor(Math.random() * 300);
    await fs.mkdir(profileDir, { recursive: true });
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
        `--user-data-dir=${profileDir}`,
        `--remote-debugging-port=${port}`,
        "--window-size=1280,900",
        "about:blank",
      ],
      { stdio: "ignore" },
    );

    let ws: WebSocket | null = null;
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      try {
        const list = await getJson(`http://127.0.0.1:${port}/json/list`);
        const page = list.find((t) => t.type === "page");
        if (page?.webSocketDebuggerUrl) {
          ws = new WebSocket(page.webSocketDebuggerUrl);
          await new Promise((resolve, reject) => {
            ws!.addEventListener("open", resolve, { once: true });
            ws!.addEventListener("error", reject, { once: true });
          });
          break;
        }
      } catch {
        // wait
      }
      await sleep(120);
    }
    if (!ws) {
      chrome.kill();
      throw new Error("Headless Chrome DevTools failed to start");
    }

    let nextId = 1;
    const pending = new Map<number, { resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void }>();
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));
      if (!msg.id || !pending.has(msg.id)) return;
      const entry = pending.get(msg.id)!;
      pending.delete(msg.id);
      if (msg.error) entry.reject(new Error(msg.error.message));
      else entry.resolve(msg.result);
    });

    send = (method, params = {}) => {
      const id = nextId++;
      ws!.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    };

    closeChrome = async () => {
      ws?.close();
      chrome.kill();
      await sleep(200);
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await send("Page.bringToFront");
    await send("Page.navigate", { url: pathToFileURL(harnessHtml).href });

    // Wait for Harness mount
    for (let i = 0; i < 50; i++) {
      const res = (await send("Runtime.evaluate", {
        expression: "Boolean(document.getElementById('portaled-pop-inner'))",
        returnByValue: true,
      })) as { result?: { value?: boolean } };
      if (res.result?.value) break;
      await sleep(80);
    }
  });

  afterAll(async () => {
    if (closeChrome) await closeChrome();
  });

  it("inherits custom hex --af-accent inside portaled overlays and tracks pointer/keyboard modality", async () => {
    const evalRes = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const popInner = document.getElementById("portaled-pop-inner");
        const color = getComputedStyle(popInner).color;
        const inThemePortal = Boolean(popInner.closest("[data-af-portal-root]"));
        document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 20));
        const pointerMod = document.querySelector(".af")?.getAttribute("data-modality");
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        await new Promise((r) => setTimeout(r, 20));
        const afterEscapeMod = document.querySelector(".af")?.getAttribute("data-modality");
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
        await new Promise((r) => setTimeout(r, 20));
        const kbMod = document.querySelector(".af")?.getAttribute("data-modality");
        return { color, inThemePortal, pointerMod, afterEscapeMod, kbMod };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as { result: { value: { color: string; inThemePortal: boolean; pointerMod: string; afterEscapeMod: string; kbMod: string } } };

    // #e11d48 -> rgb(225, 29, 72)
    expect(evalRes.result.value.inThemePortal).toBe(true);
    expect(evalRes.result.value.color).toBe("rgb(225, 29, 72)");
    expect(evalRes.result.value.pointerMod).toBe("pointer");
    expect(evalRes.result.value.afterEscapeMod).toBe("pointer");
    expect(evalRes.result.value.kbMod).toBe("keyboard");
  });

  it("sets background siblings inert, traps Tab focus inside AfModal, and restores trigger focus on Escape", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const trigger = document.getElementById("open-modal-btn");
        trigger.focus();
        trigger.click();
        await new Promise((r) => setTimeout(r, 80));

        const appContentInert = document.getElementById("app-content").inert === true;
        const confirmBtn = document.getElementById("modal-confirm");
        confirmBtn.focus();
        // Dispatch Tab on last focusable element -> should wrap to first focusable element inside modal
        confirmBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
        const wrappedId = document.activeElement?.id;

        // Dispatch Escape -> closes modal and restores focus to trigger
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
        await new Promise((r) => setTimeout(r, 80));
        const restoredId = document.activeElement?.id;
        const inertCleared = document.getElementById("app-content").inert === false;

        return { appContentInert, wrappedId, restoredId, inertCleared };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: { value: { appContentInert: boolean; wrappedId: string; restoredId: string; inertCleared: boolean } };
    };

    expect(res.result.value.appContentInert).toBe(true);
    expect(res.result.value.wrappedId).toBe("modal-first-input");
    expect(res.result.value.restoredId).toBe("open-modal-btn");
    expect(res.result.value.inertCleared).toBe(true);
  });

  it("blocks IME composition Enter (isComposing, keyCode 229, and 50ms post-composition window) on AfInput and AfChatComposer", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const input = document.getElementById("ime-input");
        input.focus();
        // 1. Enter with isComposing = true
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true }));
        // 2. Safari-style Enter with keyCode = 229
        const ev229 = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
        Object.defineProperty(ev229, "keyCode", { value: 229 });
        input.dispatchEvent(ev229);
        // 3. Composition start -> end -> immediate Enter within 50ms window
        input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
        input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        const blockedCount = Number(document.getElementById("enter-count").textContent);

        // Wait 70ms (> 50ms window) and press real Enter
        await new Promise((r) => setTimeout(r, 70));
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        await new Promise((r) => setTimeout(r, 30));
        const afterRealEnter = Number(document.getElementById("enter-count").textContent);

        // Same check on AfChatComposer textarea
        const textarea = document.querySelector(".af-ch-composer__input");
        textarea.focus();
        textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true }));
        const composerBlocked = Number(document.getElementById("submit-count").textContent);
        await new Promise((r) => setTimeout(r, 70));
        textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        await new Promise((r) => setTimeout(r, 40));
        const composerSubmitted = Number(document.getElementById("submit-count").textContent);

        return { blockedCount, afterRealEnter, composerBlocked, composerSubmitted };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          blockedCount: number;
          afterRealEnter: number;
          composerBlocked: number;
          composerSubmitted: number;
        };
      };
    };

    // Real clipboard / onCopy callback on AfCopyButton (requires active userGesture on file:// in headless Chrome)
    const copyRes = (await send("Runtime.evaluate", {
      expression: `(async () => {
        document.getElementById("copy-btn").click();
        await new Promise((r) => setTimeout(r, 60));
        const copiedText = document.getElementById("copied-value").textContent;
        const copyDoneAttr = Boolean(document.querySelector("#copy-btn [data-done]"));
        return { copiedText, copyDoneAttr };
      })()`,
      userGesture: true,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          copiedText: string;
          copyDoneAttr: boolean;
        };
      };
    };

    expect(res.result.value.blockedCount).toBe(0);
    expect(res.result.value.afterRealEnter).toBe(1);
    expect(res.result.value.composerBlocked).toBe(0);
    expect(res.result.value.composerSubmitted).toBe(1);
    expect(copyRes.result.value.copiedText).toBe("aster-secret-token");
    expect(copyRes.result.value.copyDoneAttr).toBe(true);
  });

  it("focuses safe Cancel action in AfAlertDialog, ignores backdrop clicks, and resolves useAfConfirm() promises", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const openBtn = document.getElementById("open-alert-btn");
        openBtn.focus();
        openBtn.click();
        await new Promise((r) => setTimeout(r, 80));

        const dialog = document.querySelector('[role="alertdialog"]');
        const activeText = document.activeElement?.textContent?.trim();
        // Backdrop click should NOT dismiss alertdialog when maskClosable defaults to false
        const backdrop = document.querySelector(".af-alert-dialog");
        backdrop.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 40));
        const stillOpenAfterBackdrop = Boolean(document.querySelector('[role="alertdialog"]:not([data-closing])'));

        // Click active Cancel button -> closes
        document.activeElement.click();
        await new Promise((r) => setTimeout(r, 200));

        // Imperative useAfConfirm: test Cancel -> "cancelled", then Confirm -> "confirmed"
        document.getElementById("imperative-confirm-btn").click();
        await new Promise((r) => setTimeout(r, 80));
        document.activeElement.click(); // Safe Cancel button has autofocus!
        await new Promise((r) => setTimeout(r, 200));
        const afterCancel = document.getElementById("confirm-result").textContent;

        document.getElementById("imperative-confirm-btn").click();
        await new Promise((r) => setTimeout(r, 80));
        const buttons = [...document.querySelectorAll('[role="alertdialog"] button')];
        buttons[buttons.length - 1].click(); // Confirm button
        await new Promise((r) => setTimeout(r, 200));
        const afterConfirm = document.getElementById("confirm-result").textContent;

        return { hasAlertDialog: Boolean(dialog), activeText, stillOpenAfterBackdrop, afterCancel, afterConfirm };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          hasAlertDialog: boolean;
          activeText: string;
          stillOpenAfterBackdrop: boolean;
          afterCancel: string;
          afterConfirm: string;
        };
      };
    };

    expect(res.result.value.hasAlertDialog).toBe(true);
    expect(res.result.value.activeText).toBe("取消移除");
    expect(res.result.value.stillOpenAfterBackdrop).toBe(true);
    expect(res.result.value.afterCancel).toBe("cancelled");
    expect(res.result.value.afterConfirm).toBe("confirmed");
  });

  it("sorts AfTable numerically & naturally with single-header aria-sort and syncs AfAccordion toggle-all & single mode", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const zone = document.getElementById("table-zone");
        const sortBtns = [...zone.querySelectorAll("th .af-table__sort-btn")];
        // Click Name column -> natural Intl.Collator sort ("Item 1", "Item 2", "Item 10")
        sortBtns[0].click();
        await new Promise((r) => setTimeout(r, 40));
        const namesAsc = [...zone.querySelectorAll("tbody tr")].map((tr) => tr.cells[1].textContent.trim());
        const ariaSortsAfterName = [...zone.querySelectorAll("thead th")].map((th) => th.getAttribute("aria-sort"));

        // Click Cost column twice -> ascending then descending numeric sort ($1,480, $210, $38)
        sortBtns[1].click();
        await new Promise((r) => setTimeout(r, 30));
        sortBtns[1].click();
        await new Promise((r) => setTimeout(r, 40));
        const costsDesc = [...zone.querySelectorAll("tbody tr")].map((tr) => tr.cells[2].textContent.trim());
        const ariaSortsAfterCost = [...zone.querySelectorAll("thead th")].map((th) => th.getAttribute("aria-sort"));
        const liveStatus = zone.querySelector('[role="status"]').textContent.trim();

        // Header select-all checkbox
        zone.querySelector('thead input[type="checkbox"]').click();
        await new Promise((r) => setTimeout(r, 40));
        const selectedKeys = document.getElementById("table-selected").textContent;

        // Accordion multi toggle-all
        const accMulti = document.getElementById("acc-multi");
        const toggleAllBtn = accMulti.querySelector(".af-accordion__toggle-all");
        const initialExpanded = toggleAllBtn.getAttribute("aria-expanded");
        toggleAllBtn.click();
        await new Promise((r) => setTimeout(r, 40));
        const afterExpandAll = toggleAllBtn.getAttribute("aria-expanded");
        const openMultiCount = accMulti.querySelectorAll("details[open]").length;

        // Accordion single exclusive mode
        const accSingle = document.getElementById("acc-single");
        const summaries = [...accSingle.querySelectorAll("summary")];
        summaries[1].click();
        await new Promise((r) => setTimeout(r, 40));
        const singleOpenStates = [...accSingle.querySelectorAll("details")].map((d) => d.open);

        return {
          namesAsc,
          ariaSortsAfterName,
          costsDesc,
          ariaSortsAfterCost,
          liveStatus,
          selectedKeys,
          initialExpanded,
          afterExpandAll,
          openMultiCount,
          singleOpenStates,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          namesAsc: string[];
          ariaSortsAfterName: Array<string | null>;
          costsDesc: string[];
          ariaSortsAfterCost: Array<string | null>;
          liveStatus: string;
          selectedKeys: string;
          initialExpanded: string;
          afterExpandAll: string;
          openMultiCount: number;
          singleOpenStates: boolean[];
        };
      };
    };

    expect(res.result.value.namesAsc).toEqual(["Item 1", "Item 2", "Item 10"]);
    expect(res.result.value.ariaSortsAfterName).toEqual([null, "ascending", null]);
    expect(res.result.value.costsDesc).toEqual(["$1,480", "$210", "$38"]);
    expect(res.result.value.ariaSortsAfterCost).toEqual([null, null, "descending"]);
    expect(res.result.value.liveStatus).toContain("已按 消耗 降序排列");
    expect(res.result.value.selectedKeys.split(",").sort()).toEqual(["r1", "r2", "r3"]);
    expect(res.result.value.initialExpanded).toBe("false");
    expect(res.result.value.afterExpandAll).toBe("true");
    expect(res.result.value.openMultiCount).toBe(2);
    expect(res.result.value.singleOpenStates).toEqual([false, true]);
  });

  it("serializes all form controls into FormData, manages trigger AfPopover, and updates/dismisses Toast by id", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        // 1. Native FormData submission
        document.getElementById("submit-native-form").click();
        await new Promise((r) => setTimeout(r, 40));
        const formDump = document.getElementById("form-dump").textContent;

        // 2. Self-contained AfPopover trigger + Escape focus restore
        const popTrigger = document.getElementById("self-pop-trigger");
        popTrigger.focus();
        popTrigger.click();
        await new Promise((r) => setTimeout(r, 60));
        const popOpen = Boolean(document.getElementById("self-pop-content"));
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
        await new Promise((r) => setTimeout(r, 180));
        const popClosed = !document.getElementById("self-pop-content");
        const restoredFocusId = document.activeElement?.id;

        // 3. Toast push -> update -> dismiss
        document.getElementById("toast-push-btn").click();
        await new Promise((r) => setTimeout(r, 50));
        const pushedTitle = document.querySelector(".af-toast__title")?.textContent;
        document.getElementById("toast-update-btn").click();
        await new Promise((r) => setTimeout(r, 50));
        const updatedTitle = document.querySelector(".af-toast__title")?.textContent;
        document.getElementById("toast-dismiss-btn").click();
        await new Promise((r) => setTimeout(r, 360));
        const remainingToasts = document.querySelectorAll(".af-toast").length;

        return { formDump, popOpen, popClosed, restoredFocusId, pushedTitle, updatedTitle, remainingToasts };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          formDump: string;
          popOpen: boolean;
          popClosed: boolean;
          restoredFocusId: string;
          pushedTitle: string;
          updatedTitle: string;
          remainingToasts: number;
        };
      };
    };

    expect(res.result.value.formDump).toContain("models=sonnet&models=haiku");
    expect(res.result.value.formDump).toContain("sync=on");
    expect(res.result.value.formDump).toContain("range=30d");
    expect(res.result.value.formDump).toContain("limit=12");
    expect(res.result.value.formDump).toContain("tier=pro");
    expect(res.result.value.formDump).toContain("perms=read&perms=cite");
    expect(res.result.value.formDump).toContain("labels=core");
    expect(res.result.value.popOpen).toBe(true);
    expect(res.result.value.popClosed).toBe(true);
    expect(res.result.value.restoredFocusId).toBe("self-pop-trigger");
    expect(res.result.value.pushedTitle).toBe("正在同步索引");
    expect(res.result.value.updatedTitle).toBe("索引同步完成");
    expect(res.result.value.remainingToasts).toBe(0);
  });

  it("validates AfForm on blur, clears immediately on valid input, routes submit focus, and maintains conditional ARIA error wiring", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const setNative = (el, val) => {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
          setter.call(el, val);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        };

        const input = document.getElementById("af-form-email");
        const initialInvalid = input.getAttribute("aria-invalid");
        const initialDescribedBy = input.getAttribute("aria-describedby");
        const initialErrors = document.querySelectorAll(".af-form-item__error").length;

        // Type invalid email without blurring -> must NOT show premature warning
        input.focus();
        setNative(input, "bad-email");
        await new Promise((r) => setTimeout(r, 30));
        const activeDuringInput = document.activeElement?.id;
        const valDuringInput = input.value;
        const beforeBlurInvalid = input.getAttribute("aria-invalid");
        const beforeBlurErrors = document.querySelectorAll(".af-form-item__error").length;

        // Move focus away -> blur validates and reveals aria-live error + aria-describedby
        document.getElementById("af-form-submit").focus();
        input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 80));
        const activeAfterBlur = document.activeElement?.id;
        const afterBlurInvalid = input.getAttribute("aria-invalid");
        const errorEl = document.querySelector(".af-form-item__error");
        const errorText = errorEl?.textContent;
        const errorLive = errorEl?.getAttribute("aria-live");
        const describedByDuringError = input.getAttribute("aria-describedby");
        const describedMatchesErrorId = Boolean(errorEl && describedByDuringError && describedByDuringError.split(/\\s+/).includes(errorEl.id));

        // Fix value via input -> error clears immediately
        input.focus();
        setNative(input, "ok@aster.dev");
        await new Promise((r) => setTimeout(r, 60));
        const afterFixInvalid = input.getAttribute("aria-invalid");
        const afterFixDescribedBy = input.getAttribute("aria-describedby");
        const afterFixErrors = document.querySelectorAll(".af-form-item__error").length;

        // Clear back to empty, move focus away, then submit -> focus routes to #af-form-email
        setNative(input, "");
        document.getElementById("af-form-submit").focus();
        document.getElementById("af-form-submit").click();
        await new Promise((r) => setTimeout(r, 80));
        const formStatus = document.getElementById("af-form-status").textContent;
        const focusedOnSubmit = document.activeElement?.id;

        return {
          initialInvalid,
          initialDescribedBy,
          initialErrors,
          activeDuringInput,
          valDuringInput,
          activeAfterBlur,
          beforeBlurInvalid,
          beforeBlurErrors,
          afterBlurInvalid,
          errorText,
          errorLive,
          describedMatchesErrorId,
          afterFixInvalid,
          afterFixDescribedBy,
          afterFixErrors,
          formStatus,
          focusedOnSubmit,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          initialInvalid: string | null;
          initialDescribedBy: string | null;
          initialErrors: number;
          beforeBlurInvalid: string | null;
          beforeBlurErrors: number;
          afterBlurInvalid: string | null;
          errorText?: string | null;
          errorLive?: string | null;
          describedMatchesErrorId: boolean;
          afterFixInvalid: string | null;
          afterFixDescribedBy: string | null;
          afterFixErrors: number;
          formStatus: string;
          focusedOnSubmit?: string;
        };
      };
    };

    expect(res.result.value).toMatchObject({
      initialInvalid: "false",
      initialDescribedBy: null,
      initialErrors: 0,
      beforeBlurInvalid: "false",
      beforeBlurErrors: 0,
      afterBlurInvalid: "true",
      errorText: "邮箱格式不正确",
      errorLive: "polite",
      describedMatchesErrorId: true,
      afterFixInvalid: "false",
      afterFixDescribedBy: null,
      afterFixErrors: 0,
      formStatus: "err:email",
      focusedOnSubmit: "af-form-email",
    });
  });

  it("enforces press-and-release outside guard on AfModal backdrop", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        document.getElementById("open-modal-btn").click();
        await new Promise((r) => setTimeout(r, 80));
        const backdrop = document.querySelector(".af-modal");
        const panel = document.querySelector(".af-modal__panel");
        const opened = Boolean(backdrop && panel);

        // Press inside panel, drag onto backdrop and release -> MUST stay open
        panel.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
        backdrop.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }));
        await new Promise((r) => setTimeout(r, 200));
        const stillOpenAfterInsideDrag = Boolean(document.querySelector(".af-modal") && !document.querySelector(".af-modal")?.hasAttribute("data-closing"));

        // Press AND release directly on backdrop -> MUST close
        const curBackdrop = document.querySelector(".af-modal");
        curBackdrop.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
        curBackdrop.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }));
        await new Promise((r) => setTimeout(r, 240));
        const closedAfterOutsidePressRelease = !document.querySelector(".af-modal");

        return { opened, stillOpenAfterInsideDrag, closedAfterOutsidePressRelease };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          opened: boolean;
          stillOpenAfterInsideDrag: boolean;
          closedAfterOutsidePressRelease: boolean;
        };
      };
    };

    expect(res.result.value.opened).toBe(true);
    expect(res.result.value.stillOpenAfterInsideDrag).toBe(true);
    expect(res.result.value.closedAfterOutsidePressRelease).toBe(true);
  });

  it("renders afMessage inside theme portal, drills down AfCascader, filters AfAutoComplete, and updates density/radius", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        // 1. afMessage + portal inheritance
        document.getElementById("msg-push-btn").click();
        await new Promise((r) => setTimeout(r, 40));
        const msgEl = document.querySelector('.af-message-host .af-message[data-type="success"]');
        const msgText = msgEl?.textContent?.trim();
        const msgInPortal = Boolean(msgEl?.closest("[data-af-portal-root]"));
        document.getElementById("msg-destroy-btn").click();
        await new Promise((r) => setTimeout(r, 40));
        const msgAfterDestroy = document.querySelectorAll(".af-message").length;

        // 2. AfCascader drilldown
        document.querySelector("#cascader-zone .af-select__trigger").click();
        await new Promise((r) => setTimeout(r, 60));
        const shItem = [...document.querySelectorAll(".af-cascader__pop .af-cascader__item")].find((el) => el.textContent?.includes("上海"));
        shItem?.click();
        await new Promise((r) => setTimeout(r, 60));
        const cascaderVal = document.getElementById("cascader-val").textContent;

        // 3. AfAutoComplete select
        const acInput = document.querySelector('#ac-zone input[role="combobox"]');
        acInput.focus();
        acInput.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 100));
        const acExpanded = acInput.getAttribute("aria-expanded");
        const firstAcOption = document.querySelector(".af-autocomplete__menu .af-menu__item");
        firstAcOption?.click();
        await new Promise((r) => setTimeout(r, 60));
        const acVal = document.getElementById("ac-val").textContent;

        // 4. Theme density & radius
        document.getElementById("theme-compact-btn").click();
        document.getElementById("theme-radius-sm-btn").click();
        await new Promise((r) => setTimeout(r, 40));
        const afRoot = document.querySelector(".af");
        const density = afRoot?.getAttribute("data-density");
        const radius = afRoot?.getAttribute("data-radius");

        return { msgText, msgInPortal, msgAfterDestroy, cascaderVal, acExpanded, acHasOpt: Boolean(firstAcOption), acVal, density, radius };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          msgText?: string;
          msgInPortal: boolean;
          msgAfterDestroy: number;
          cascaderVal: string;
          acVal: string;
          density: string | null;
          radius: string | null;
        };
      };
    };

    expect(res.result.value).toMatchObject({
      msgText: "保存成功",
      msgInPortal: true,
      msgAfterDestroy: 0,
      cascaderVal: "cn/sh",
      acVal: "claude-sonnet",
      density: "compact",
      radius: "sm",
    });
  });

  it("verifies v0.4 interactive behaviors across HoverCard, ToggleGroup, CodeBlock, TimePicker, ChipInput, RunControls and ConflictRadar", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const setReactInput = (input, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(input, val);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        };

        // 1. HoverCard opens on trigger focus and keeps focus on trigger (does NOT steal focus into card)
        const hcTrigger = document.getElementById("hc-trigger");
        hcTrigger.focus();
        hcTrigger.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 60));
        const hcEl = document.querySelector(".af-hovercard");
        const hcRole = hcEl?.getAttribute("role");
        const hcFocusStayedOnTrigger = document.activeElement === hcTrigger && !hcEl?.contains(document.activeElement);

        // 2. ToggleGroup ARIA pressed + ArrowRight roving focus
        const tgBtns = [...document.querySelectorAll("#tg-probe button")];
        const tgInitialPressed = document.querySelector('#tg-probe button[aria-pressed="true"]')?.textContent?.trim();
        tgBtns[0].focus();
        tgBtns[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
        await new Promise((r) => setTimeout(r, 30));
        const tgFocusedAfterArrow = document.activeElement?.textContent?.trim();
        tgBtns[1].click();
        await new Promise((r) => setTimeout(r, 30));
        const tgAfterClickPressed = document.querySelector('#tg-probe button[aria-pressed="true"]')?.textContent?.trim();
        const tgLeftPressed = tgBtns[0].getAttribute("aria-pressed");

        // 3. CodeBlock copy button remains enabled (:not(:disabled)) after clicking
        const cbCopyBtn = document.querySelector("#cb-probe .af-codeblock__copy");
        cbCopyBtn.click();
        await new Promise((r) => setTimeout(r, 40));
        const cbStillEnabled = cbCopyBtn.disabled === false;

        // 4. TimePicker editable natural time parsing ("3pm" + Enter -> "15:00")
        document.querySelector("#tp-probe .af-select__trigger").click();
        await new Promise((r) => setTimeout(r, 50));
        const tpQuickInput = document.querySelector(".af-timepicker__pop .af-timepicker__quick-input");
        setReactInput(tpQuickInput, "3pm");
        tpQuickInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        await new Promise((r) => setTimeout(r, 50));
        const tpValText = document.querySelector("#tp-probe .af-select__value")?.textContent?.trim();

        // 5. ChipInput duplicate tag flash
        const chipInput = document.querySelector("#chip-dup-probe input.af-chips__input");
        setReactInput(chipInput, "alpha");
        chipInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        await new Promise((r) => setTimeout(r, 20));
        const chipFlashed = Boolean(document.querySelector('#chip-dup-probe [data-flash="true"]'));

        // 6. RunControls mid-run steer directive + stop/resume (1:1 English DOM contract)
        const setReactTextarea = (el, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
          setter.call(el, val);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        };
        const steerInput = document.querySelector("#runc-probe textarea.af-agc-runc__input");
        setReactTextarea(steerInput, "Prioritize failing tests");
        await new Promise((r) => setTimeout(r, 20));
        const steerBtn = document.querySelector('#runc-probe button[aria-label="Steer agent"]');
        steerBtn?.click();
        await new Promise((r) => setTimeout(r, 30));
        const runcFirstDirective = document.querySelector("#runc-probe .af-agc-runc__steer")?.textContent?.trim();

        const stopBtn = document.querySelector('#runc-probe button[aria-label="Stop run"]');
        stopBtn?.click();
        await new Promise((r) => setTimeout(r, 30));
        const runcPhaseText = document.querySelector("#runc-probe .af-agc-runc__state")?.textContent?.trim();
        const resumeBtn = [...document.querySelectorAll("#runc-probe button")].find((b) => b.textContent?.trim() === "Resume");

        // 7. ConflictRadar settle conflict via radio way picker & enable Merge 2 branches
        const wayRadio = document.querySelector("#radar-probe .af-crc__way");
        wayRadio?.click();
        await new Promise((r) => setTimeout(r, 30));
        const radarHeadPill = document.querySelector("#radar-probe .af-crc__merge")?.textContent?.trim();
        const radarItemPill = document.querySelector("#radar-probe .af-crc__ptitle")?.textContent?.trim();
        const radarWayChecked = wayRadio?.getAttribute("aria-checked");
        const radarKeptText = wayRadio?.querySelector(".af-crc__kept")?.textContent?.trim();

        return {
          hcMounted: Boolean(hcEl),
          hcRole,
          hcFocusStayedOnTrigger,
          tgInitialPressed,
          tgFocusedAfterArrow,
          tgAfterClickPressed,
          tgLeftPressed,
          cbStillEnabled,
          tpValText,
          chipFlashed,
          runcPhaseText,
          hasResumeBtn: Boolean(resumeBtn),
          runcFirstDirective,
          radarHeadPill,
          radarItemPill,
          radarWayChecked,
          radarKeptText,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          hcMounted: boolean;
          hcRole?: string | null;
          hcFocusStayedOnTrigger: boolean;
          tgInitialPressed?: string;
          tgFocusedAfterArrow?: string;
          tgAfterClickPressed?: string;
          tgLeftPressed?: string | null;
          cbStillEnabled: boolean;
          tpValText?: string;
          chipFlashed: boolean;
          runcPhaseText?: string;
          hasResumeBtn: boolean;
          runcFirstDirective?: string;
          radarHeadPill?: string;
          radarItemPill?: string;
          radarWayChecked?: string | null;
          radarKeptText?: string;
        };
      };
    };

    expect(res.result.value).toMatchObject({
      hcMounted: true,
      hcRole: "tooltip",
      hcFocusStayedOnTrigger: true,
      tgInitialPressed: "Left",
      tgFocusedAfterArrow: "Center",
      tgAfterClickPressed: "Center",
      tgLeftPressed: "false",
      cbStillEnabled: true,
      tpValText: "15:00",
      chipFlashed: true,
      hasResumeBtn: true,
      radarHeadPill: "Merge 2 branches",
      radarItemPill: "Settled",
      radarWayChecked: "true",
      radarKeptText: "Kept",
    });
    expect(res.result.value.runcPhaseText).toMatch(/^Stopped at \d+ words?$/);
    expect(res.result.value.runcFirstDirective).toContain("Prioritize failing tests");
  });

  it("verifies v0.5 interactive behaviors across AfTree keyboard nav, AfSteps onChange, and AfDiffView split toggle", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        // 1. AfTree keyboard navigation: ArrowRight expand, ArrowDown move focus, Enter select, ArrowLeft collapse
        const treeRoot = document.querySelector('#tree-probe [role="tree"]');
        const firstItem = treeRoot.querySelector('[role="treeitem"]');
        firstItem.focus();
        firstItem.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
        await new Promise((r) => setTimeout(r, 30));
        const expandedAfterRight = firstItem.getAttribute("aria-expanded");

        firstItem.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
        await new Promise((r) => setTimeout(r, 30));
        const secondFocusedLabel = document.activeElement?.textContent?.trim();

        document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        await new Promise((r) => setTimeout(r, 30));
        const selectedAfterEnter = document.activeElement?.getAttribute("aria-selected");

        document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
        await new Promise((r) => setTimeout(r, 30));
        const focusBackToParent = document.activeElement === firstItem;
        firstItem.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
        await new Promise((r) => setTimeout(r, 30));
        const expandedAfterLeft = firstItem.getAttribute("aria-expanded");

        // 2. AfSteps interactive click triggers step transition
        const stepButtons = [...document.querySelectorAll("#steps-probe button.af-steps__trigger")];
        stepButtons[2]?.click();
        await new Promise((r) => setTimeout(r, 30));
        const step3Status = stepButtons[2]?.closest("li")?.getAttribute("data-status");

        // 3. AfDiffView segmented mode switch renders .af-diff[data-mode="split"] .af-diff__split-row
        const splitBtn = document.querySelector('#diff-probe .af-seg__item[data-value="split"]');
        splitBtn?.click();
        await new Promise((r) => setTimeout(r, 40));
        const hasSplitView = Boolean(document.querySelector('#diff-probe .af-diff[data-mode="split"] .af-diff__split-row'));

        return {
          expandedAfterRight,
          secondFocusedLabel,
          selectedAfterEnter,
          focusBackToParent,
          expandedAfterLeft,
          step3Status,
          hasSplitView,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          expandedAfterRight?: string | null;
          secondFocusedLabel?: string;
          selectedAfterEnter?: string | null;
          focusBackToParent: boolean;
          expandedAfterLeft?: string | null;
          step3Status?: string | null;
          hasSplitView: boolean;
        };
      };
    };

    expect(res.result.value).toMatchObject({
      expandedAfterRight: "true",
      secondFocusedLabel: "ui.tsx",
      selectedAfterEnter: "true",
      focusBackToParent: true,
      expandedAfterLeft: "false",
      step3Status: "process",
      hasSplitView: true,
    });
  });

  it("dispatches real stationary CDP mouse clicks across segmented, combobox, searchable select/cascader, toggle-group, and project-card without swallowed clicks or width jitter", async () => {
    const cdpClickAt = async (selector: string) => {
      const boxRes = (await send("Runtime.evaluate", {
        expression: `(() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) return null;
          el.scrollIntoView({ block: "center", inline: "center" });
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
        })()`,
        returnByValue: true,
      })) as { result: { value: { x: number; y: number; w: number; h: number } | null } };
      const box = boxRes.result.value;
      if (!box) throw new Error(`Missing element for selector: ${selector}`);
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
      await sleep(50);
    };

    // Reset #diff-probe back to unified via a 1st stationary click on 单栏
    await cdpClickAt('#diff-probe .af-seg__item[data-value="unified"]');
    const afterUnifiedClick = (await send("Runtime.evaluate", {
      expression: `document.querySelector('#diff-probe .af-diff')?.getAttribute('data-mode')`,
      returnByValue: true,
    })) as { result: { value: string | null } };
    expect(afterUnifiedClick.result.value).toBe("unified");

    // 1st stationary click on 双栏 switches to split AND stays inside left split-cell bounds
    await cdpClickAt('#diff-probe .af-seg__item[data-value="split"]');
    const splitMetrics = (await send("Runtime.evaluate", {
      expression: `(() => {
        const diff = document.querySelector('#diff-probe .af-diff');
        const cell = document.querySelector('#diff-probe .af-diff__split-row .af-diff__split-cell');
        const code = cell?.querySelector('.af-diff__code');
        const cellRect = cell?.getBoundingClientRect();
        const codeRect = code?.getBoundingClientRect();
        return {
          mode: diff?.getAttribute('data-mode'),
          overflowPx: cellRect && codeRect ? codeRect.right - cellRect.right : 999,
        };
      })()`,
      returnByValue: true,
    })) as { result: { value: { mode: string | null; overflowPx: number } } };
    expect(splitMetrics.result.value.mode).toBe("split");
    expect(splitMetrics.result.value.overflowPx).toBeLessThanOrEqual(0.5);

    // 1st stationary click back to 单栏, then verify >= 6px pointer drag scrub switches back to 双栏
    await cdpClickAt('#diff-probe .af-seg__item[data-value="unified"]');
    const segBoxes = (await send("Runtime.evaluate", {
      expression: `(() => {
        const a = document.querySelector('#diff-probe .af-seg__item[data-value="unified"]');
        const b = document.querySelector('#diff-probe .af-seg__item[data-value="split"]');
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        return { x1: ra.left + ra.width / 2, y1: ra.top + ra.height / 2, x2: rb.left + rb.width / 2, y2: rb.top + rb.height / 2 };
      })()`,
      returnByValue: true,
    })) as { result: { value: { x1: number; y1: number; x2: number; y2: number } } };
    const { x1, y1, x2, y2 } = segBoxes.result.value;
    expect(Math.hypot(x2 - x1, y2 - y1)).toBeGreaterThanOrEqual(6);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: x1, y: y1, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x2, y: y2, button: "left", buttons: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x2, y: y2, button: "left", clickCount: 1 });
    await sleep(50);
    const afterDragMode = (await send("Runtime.evaluate", {
      expression: `document.querySelector('#diff-probe .af-diff')?.getAttribute('data-mode')`,
      returnByValue: true,
    })) as { result: { value: string | null } };
    expect(afterDragMode.result.value).toBe("split");

    // AfToggleGroup stationary click & zero width jitter (index 2 "Right" starts unpressed after v0.4 test clicked index 1)
    const tgBefore = (await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelectorAll('#tg-probe .af-toggle-group__item')[2];
        return { pressed: btn.getAttribute('aria-pressed'), width: btn.offsetWidth };
      })()`,
      returnByValue: true,
    })) as { result: { value: { pressed: string | null; width: number } } };
    expect(tgBefore.result.value.pressed).toBe("false");
    const tgBoxRes = (await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelectorAll('#tg-probe .af-toggle-group__item')[2];
        btn.scrollIntoView({ block: 'center', inline: 'center' });
        const r = btn.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`,
      returnByValue: true,
    })) as { result: { value: { x: number; y: number } } };
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: tgBoxRes.result.value.x, y: tgBoxRes.result.value.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: tgBoxRes.result.value.x, y: tgBoxRes.result.value.y, button: "left", clickCount: 1 });
    await sleep(50);
    const tgAfter = (await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelectorAll('#tg-probe .af-toggle-group__item')[2];
        return { pressed: btn.getAttribute('aria-pressed'), width: btn.offsetWidth };
      })()`,
      returnByValue: true,
    })) as { result: { value: { pressed: string | null; width: number } } };
    expect(tgAfter.result.value.pressed).toBe("true");
    expect(tgAfter.result.value.width).toBe(tgBefore.result.value.width);

    // AfCombobox expand button opens on 1st click, closes on 2nd click; chip remove keeps menu closed
    await cdpClickAt('#combobox-probe .af-in-cb__expand');
    const cbOpen1 = (await send("Runtime.evaluate", {
      expression: `Boolean(document.querySelector('.af-in-cb__pop'))`,
      returnByValue: true,
    })) as { result: { value: boolean } };
    expect(cbOpen1.result.value).toBe(true);
    await cdpClickAt('#combobox-probe .af-in-cb__expand');
    const cbOpen2 = (await send("Runtime.evaluate", {
      expression: `Boolean(document.querySelector('.af-in-cb__pop:not([data-closing])'))`,
      returnByValue: true,
    })) as { result: { value: boolean } };
    expect(cbOpen2.result.value).toBe(false);
    await cdpClickAt('#combobox-probe .af-in-cb__chip-x');
    const cbAfterChipX = (await send("Runtime.evaluate", {
      expression: `({ chips: document.querySelectorAll('#combobox-probe .af-in-cb__chip').length, popOpen: Boolean(document.querySelector('.af-in-cb__pop:not([data-closing])')) })`,
      returnByValue: true,
    })) as { result: { value: { chips: number; popOpen: boolean } } };
    expect(cbAfterChipX.result.value).toEqual({ chips: 0, popOpen: false });

    // Searchable AfSelect & AfCascader chevron toggles open & closed cleanly
    await cdpClickAt('#searchable-select-probe .af-select__chevron');
    const selOpen = (await send("Runtime.evaluate", {
      expression: `document.querySelector('#searchable-select-probe .af-select__trigger')?.getAttribute('aria-expanded')`,
      returnByValue: true,
    })) as { result: { value: string | null } };
    expect(selOpen.result.value).toBe("true");
    await cdpClickAt('#searchable-select-probe .af-select__chevron');
    const selClosed = (await send("Runtime.evaluate", {
      expression: `document.querySelector('#searchable-select-probe .af-select__trigger')?.getAttribute('aria-expanded')`,
      returnByValue: true,
    })) as { result: { value: string | null } };
    expect(selClosed.result.value).toBe("false");

    await cdpClickAt('#searchable-cascader-probe .af-select__chevron');
    const casOpen = (await send("Runtime.evaluate", {
      expression: `document.querySelector('#searchable-cascader-probe .af-select__trigger')?.getAttribute('aria-expanded')`,
      returnByValue: true,
    })) as { result: { value: string | null } };
    expect(casOpen.result.value).toBe("true");
    await cdpClickAt('#searchable-cascader-probe .af-select__chevron');
    const casClosed = (await send("Runtime.evaluate", {
      expression: `document.querySelector('#searchable-cascader-probe .af-select__trigger')?.getAttribute('aria-expanded')`,
      returnByValue: true,
    })) as { result: { value: string | null } };
    expect(casClosed.result.value).toBe("false");

    // AfProjectCardPattern status pill cycles & member avatar toggles aria-pressed and opens card on 1st click
    const pcBefore = (await send("Runtime.evaluate", {
      expression: `document.querySelector('#project-card-probe .af-dt-pcc__status')?.textContent?.trim()`,
      returnByValue: true,
    })) as { result: { value: string | undefined } };
    await cdpClickAt('#project-card-probe .af-dt-pcc__status');
    const pcAfterStatus = (await send("Runtime.evaluate", {
      expression: `document.querySelector('#project-card-probe .af-dt-pcc__status')?.textContent?.trim()`,
      returnByValue: true,
    })) as { result: { value: string | undefined } };
    expect(pcAfterStatus.result.value).not.toBe(pcBefore.result.value);

    await cdpClickAt('#project-card-probe .af-dt-pcc__member');
    const pcAfterMember = (await send("Runtime.evaluate", {
      expression: `({
        pressed: document.querySelector('#project-card-probe .af-dt-pcc__member')?.getAttribute('aria-pressed'),
        open: document.querySelector('#project-card-probe .af-dt-pcc')?.hasAttribute('data-open')
      })`,
      returnByValue: true,
    })) as { result: { value: { pressed: string | null; open: boolean } } };
    expect(pcAfterMember.result.value).toEqual({ pressed: "true", open: true });
    // Let #project-card-probe's smooth fold height transition settle before subsequent coordinate probes
    await sleep(280);
  });

  it("verifies general-purpose AfCascader features and strict single-item hover exclusivity via real CDP mouse moves", async () => {
    const moveMouseTo = async (selectorOrEval: string) => {
      const boxRes = (await send("Runtime.evaluate", {
        expression: `(() => {
          const el = ${selectorOrEval};
          if (!el) return null;
          el.scrollIntoView({ block: "center", inline: "center" });
          const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        })()`,
        returnByValue: true,
      })) as { result: { value: { x: number; y: number } | null } };
      const pt = boxRes.result.value;
      if (!pt) throw new Error(`Missing hover target: ${selectorOrEval}`);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pt.x, y: pt.y });
      await sleep(140);
      return pt;
    };

    const clickTarget = async (selectorOrEval: string) => {
      const pt = await moveMouseTo(selectorOrEval);
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
      await sleep(70);
    };

    // 1. Click-expand cascader: hovering sibling "华东节点" -> "华北节点" in Col 2 keeps Col 3 on 华东 AND slides the single .af-menu__thumb downward
    await clickTarget(`document.querySelector("#cascader-click-probe .af-select__trigger")`);
    await moveMouseTo(`[...document.querySelectorAll(".af-cascader__col[data-col-index='1'] .af-cascader__item")].find((el) => el.textContent?.includes("华东节点"))`);
    const firstColThumb = (await send("Runtime.evaluate", {
      expression: `(() => {
        const col = document.querySelector(".af-cascader__col[data-col-index='1']");
        const thumb = col?.querySelector(".af-menu__thumb");
        window.__afCascaderThumb = thumb;
        return {
          thumbCount: col?.querySelectorAll(".af-menu__thumb").length ?? 0,
          top: thumb?.getBoundingClientRect().top ?? -1,
        };
      })()`,
      returnByValue: true,
    })) as { result: { value: { thumbCount: number; top: number } } };
    expect(firstColThumb.result.value.thumbCount).toBe(1);

    await moveMouseTo(`[...document.querySelectorAll(".af-cascader__col[data-col-index='1'] .af-cascader__item")].find((el) => el.textContent?.includes("华北节点"))`);
    const clickHoverState = (await send("Runtime.evaluate", {
      expression: `(() => {
        const col1 = document.querySelector(".af-cascader__col[data-col-index='1']");
        const col1Items = [...(col1?.querySelectorAll(".af-cascader__item") ?? [])];
        const col2Text = [...document.querySelectorAll(".af-cascader__col[data-col-index='2'] .af-cascader__item")].map((el) => el.textContent?.trim());
        const litDirectItems = col1Items.filter((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)").map((el) => el.textContent?.trim());
        const thumb = col1?.querySelector(".af-menu__thumb");
        const north = col1Items.find((el) => el.textContent?.includes("华北节点"));
        return {
          litDirectItems,
          thumbCount: col1?.querySelectorAll(".af-menu__thumb").length ?? 0,
          sameThumbNode: Boolean(thumb && thumb === window.__afCascaderThumb),
          alignedDelta: thumb && north ? Math.abs(thumb.getBoundingClientRect().top - north.getBoundingClientRect().top) : 999,
          thumbTop: thumb?.getBoundingClientRect().top ?? -1,
          col2Text,
        };
      })()`,
      returnByValue: true,
    })) as {
      result: {
        value: {
          litDirectItems: string[];
          thumbCount: number;
          sameThumbNode: boolean;
          alignedDelta: number;
          thumbTop: number;
          col2Text: string[];
        };
      };
    };
    expect(clickHoverState.result.value.litDirectItems).toEqual([]);
    expect(clickHoverState.result.value.thumbCount).toBe(1);
    expect(clickHoverState.result.value.sameThumbNode).toBe(true);
    expect(clickHoverState.result.value.alignedDelta).toBeLessThan(2);
    expect(clickHoverState.result.value.thumbTop).toBeGreaterThan(firstColThumb.result.value.top);
    expect(clickHoverState.result.value.col2Text).toEqual(["上海一区", "杭州金融云"]);
    // Close click-expand cascader
    await clickTarget(`document.querySelector("#cascader-click-probe .af-select__trigger")`);

    // 2. Hover-expand cascader: hover Col 2 "华北节点" -> hover Col 3 "北京三区" -> hover back to Col 2 "华北节点" clears Col 3 thumb completely
    await clickTarget(`document.querySelector("#cascader-hover-probe .af-select__trigger")`);
    await moveMouseTo(`[...document.querySelectorAll(".af-cascader__col[data-col-index='1'] .af-cascader__item")].find((el) => el.textContent?.includes("华北节点"))`);
    await moveMouseTo(`[...document.querySelectorAll(".af-cascader__col[data-col-index='2'] .af-cascader__item")].find((el) => el.textContent?.includes("北京三区"))`);
    await moveMouseTo(`[...document.querySelectorAll(".af-cascader__col[data-col-index='1'] .af-cascader__item")].find((el) => el.textContent?.includes("华北节点"))`);
    const hoverReturnState = (await send("Runtime.evaluate", {
      expression: `(() => {
        const col1 = document.querySelector(".af-cascader__col[data-col-index='1']");
        const col2 = document.querySelector(".af-cascader__col[data-col-index='2']");
        const col1Items = [...(col1?.querySelectorAll(".af-cascader__item") ?? [])];
        const col2Items = [...(col2?.querySelectorAll(".af-cascader__item") ?? [])];
        return {
          col1Thumbs: col1?.querySelectorAll(".af-menu__thumb").length ?? 0,
          col2Thumbs: col2?.querySelectorAll(".af-menu__thumb").length ?? 0,
          litInCol1: col1Items.filter((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)").map((el) => el.textContent?.trim()),
          litInCol2: col2Items.filter((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)").map((el) => el.textContent?.trim()),
        };
      })()`,
      returnByValue: true,
    })) as { result: { value: { col1Thumbs: number; col2Thumbs: number; litInCol1: string[]; litInCol2: string[] } } };
    expect(hoverReturnState.result.value).toEqual({
      col1Thumbs: 1,
      col2Thumbs: 0,
      litInCol1: [],
      litInCol2: [],
    });
    await clickTarget(`document.querySelector("#cascader-hover-probe .af-select__trigger")`);

    // 3. Multi-select cascader: SHOW_PARENT + cascade check + indeterminate on partial child uncheck
    await clickTarget(`document.querySelector("#cascader-multi-probe .af-select__trigger")`);
    await clickTarget(`[...document.querySelectorAll(".af-cascader__col[data-col-index='0'] .af-cascader__item")].find((el) => el.textContent?.includes("中国大陆")).querySelector(".af-cascader__checkbox")`);
    const afterCheckParent = (await send("Runtime.evaluate", {
      expression: `document.getElementById("cascader-multi-val")?.textContent`,
      returnByValue: true,
    })) as { result: { value: string } };
    expect(JSON.parse(afterCheckParent.result.value)).toEqual([["cn"]]);
    // Expand 华东节点 and uncheck 上海一区 -> 华东节点 becomes indeterminate and output narrows to杭州金融云
    await clickTarget(`[...document.querySelectorAll(".af-cascader__col[data-col-index='1'] .af-cascader__item")].find((el) => el.textContent?.includes("华东节点"))`);
    await clickTarget(`[...document.querySelectorAll(".af-cascader__col[data-col-index='2'] .af-cascader__item")].find((el) => el.textContent?.includes("上海一区"))`);
    const afterPartial = (await send("Runtime.evaluate", {
      expression: `({
        val: JSON.parse(document.getElementById("cascader-multi-val")?.textContent || "[]"),
        eastIndeterminate: [...document.querySelectorAll(".af-cascader__col[data-col-index='1'] .af-cascader__item")].find((el) => el.textContent?.includes("华东节点"))?.querySelector(".af-cascader__checkbox")?.getAttribute("data-indeterminate")
      })`,
      returnByValue: true,
    })) as { result: { value: { val: string[][]; eastIndeterminate: string | null } } };
    expect(afterPartial.result.value.val).toEqual([["cn", "east", "hz"]]);
    expect(afterPartial.result.value.eastIndeterminate).toBe("true");
    await clickTarget(`document.querySelector("#cascader-multi-probe .af-select__trigger")`);

    // 4. Async loadData + changeOnSelect
    await clickTarget(`document.querySelector("#cascader-async-probe .af-select__trigger")`);
    await clickTarget(`[...document.querySelectorAll(".af-cascader__col[data-col-index='0'] .af-cascader__item")].find((el) => el.textContent?.includes("美西节点"))`);
    await sleep(80);
    const asyncState = (await send("Runtime.evaluate", {
      expression: `({
        val: document.getElementById("cascader-async-val")?.textContent,
        loadedColText: [...document.querySelectorAll(".af-cascader__col[data-col-index='1'] .af-cascader__item")].map((el) => el.textContent?.trim())
      })`,
      returnByValue: true,
    })) as { result: { value: { val: string; loadedColText: string[] } } };
    expect(asyncState.result.value.val).toBe("us");
    expect(asyncState.result.value.loadedColText).toEqual(["硅谷一区"]);
    await clickTarget(`document.querySelector("#cascader-async-probe .af-select__trigger")`);

    // 5. Cross-component ::before sliding hover thumb: CommentsPanel sort menu & DateRange presets
    await clickTarget(`document.querySelector('#comments-hover-probe [aria-label="Sort comments"]')`);
    await moveMouseTo(`document.querySelectorAll(".af-ch-comments__sortmenu .af-ch-menuitem")[0]`);
    const commentEnter = (await send("Runtime.evaluate", {
      expression: `(() => {
        const list = document.querySelector(".af-ch-comments__sortmenu [data-af-ht]") ?? document.querySelector(".af-ch-comments__sortmenu .af-ch-composer__menulist") ?? document.querySelector(".af-ch-comments__sortmenu");
        const items = [...(list?.querySelectorAll(".af-ch-menuitem") ?? [])];
        return {
          ht: list?.getAttribute("data-af-ht") ?? null,
          y: Number.parseFloat(list?.style.getPropertyValue("--af-ht-y") || "-1"),
          beforeOpacity: list ? getComputedStyle(list, "::before").opacity : null,
          litOwnBg: items.filter((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)").length,
        };
      })()`,
      returnByValue: true,
    })) as { result: { value: { ht: string | null; y: number; beforeOpacity: string | null; litOwnBg: number } } };
    expect(commentEnter.result.value.ht).toBe("enter");
    expect(commentEnter.result.value.beforeOpacity).toBe("1");
    expect(commentEnter.result.value.litOwnBg).toBe(0);

    await moveMouseTo(`document.querySelectorAll(".af-ch-comments__sortmenu .af-ch-menuitem")[1]`);
    const commentGlide = (await send("Runtime.evaluate", {
      expression: `(() => {
        const list = document.querySelector(".af-ch-comments__sortmenu [data-af-ht]") ?? document.querySelector(".af-ch-comments__sortmenu .af-ch-composer__menulist") ?? document.querySelector(".af-ch-comments__sortmenu");
        const items = [...(list?.querySelectorAll(".af-ch-menuitem") ?? [])];
        return {
          ht: list?.getAttribute("data-af-ht") ?? null,
          y: Number.parseFloat(list?.style.getPropertyValue("--af-ht-y") || "-1"),
          beforeOpacity: list ? getComputedStyle(list, "::before").opacity : null,
          litOwnBg: items.filter((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)").length,
        };
      })()`,
      returnByValue: true,
    })) as { result: { value: { ht: string | null; y: number; beforeOpacity: string | null; litOwnBg: number } } };
    expect(commentGlide.result.value.ht).toBe("glide");
    expect(commentGlide.result.value.y).toBeGreaterThan(commentEnter.result.value.y);
    expect(commentGlide.result.value.beforeOpacity).toBe("1");
    expect(commentGlide.result.value.litOwnBg).toBe(0);

    await clickTarget(`document.querySelector("#daterange-hover-probe .af-range__trigger")`);
    await moveMouseTo(`document.querySelectorAll(".af-range__pop .af-range__preset")[0]`);
    const rangeEnter = (await send("Runtime.evaluate", {
      expression: `(() => {
        const list = document.querySelector(".af-range__presets");
        return {
          ht: list?.getAttribute("data-af-ht") ?? null,
          y: Number.parseFloat(list?.style.getPropertyValue("--af-ht-y") || "-1"),
        };
      })()`,
      returnByValue: true,
    })) as { result: { value: { ht: string | null; y: number } } };
    expect(rangeEnter.result.value.ht).toBe("enter");

    await moveMouseTo(`document.querySelectorAll(".af-range__pop .af-range__preset")[2]`);
    const rangeGlide = (await send("Runtime.evaluate", {
      expression: `(() => {
        const list = document.querySelector(".af-range__presets");
        const items = [...(list?.querySelectorAll(".af-range__preset") ?? [])];
        return {
          ht: list?.getAttribute("data-af-ht") ?? null,
          y: Number.parseFloat(list?.style.getPropertyValue("--af-ht-y") || "-1"),
          beforeOpacity: list ? getComputedStyle(list, "::before").opacity : null,
          litOwnBg: items.filter((el) => getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)").length,
        };
      })()`,
      returnByValue: true,
    })) as { result: { value: { ht: string | null; y: number; beforeOpacity: string | null; litOwnBg: number } } };
    expect(rangeGlide.result.value.ht).toBe("glide");
    expect(rangeGlide.result.value.y).toBeGreaterThan(rangeEnter.result.value.y);
    expect(rangeGlide.result.value.beforeOpacity).toBe("1");
    expect(rangeGlide.result.value.litOwnBg).toBe(0);
    await clickTarget(`document.querySelector("#daterange-hover-probe .af-range__trigger")`);
  });

  it("prevents post-interaction clipping, orphan wrapping, off-stage spill, and collapsed splitter crush across components", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));

        // 1A. ApprovalCard approve busy state: zero vertical clip, single-line checkbox label, >= 12px bottom clearance
        const approveCard = document.querySelector("#approval-approve-probe .af-agb-approval");
        const approveBtn = document.querySelector('#approval-approve-probe .af-btn[data-variant="primary"]');
        const denyBtnOnApprove = document.querySelector("#approval-approve-probe .af-agb-approval__deny");
        approveBtn.click();
        await wait(240);
        const appApproveRect = approveCard.getBoundingClientRect();
        const hintApproveRect = approveCard.querySelector(".af-agb-approval__hint").getBoundingClientRect();
        const alwaysApproveText = approveCard.querySelector(".af-agb-approval__always .af-check > span:last-child");
        const approveBusy = {
          phase: approveCard.getAttribute("data-phase"),
          clientH: approveCard.clientHeight,
          scrollH: approveCard.scrollHeight,
          bottomClearance: Math.round(appApproveRect.bottom - hintApproveRect.bottom),
          checkboxLabelH: alwaysApproveText ? alwaysApproveText.getBoundingClientRect().height : -1,
          primaryLoading: approveBtn.getAttribute("data-loading"),
          denyLoading: denyBtnOnApprove.getAttribute("data-loading"),
          denyDisabled: denyBtnOnApprove.disabled,
        };

        // 1B. ApprovalCard deny busy state: only Deny button shows loading, Approve does not morph to "批准中"
        const denyCard = document.querySelector("#approval-deny-probe .af-agb-approval");
        const denyBtn = document.querySelector("#approval-deny-probe .af-agb-approval__deny");
        const approveBtnOnDeny = document.querySelector('#approval-deny-probe .af-btn[data-variant="primary"]');
        denyBtn.click();
        await wait(220);
        const denyBusy = {
          phase: denyCard.getAttribute("data-phase"),
          clientH: denyCard.clientHeight,
          scrollH: denyCard.scrollHeight,
          denyLoading: denyBtn.getAttribute("data-loading"),
          approveLoading: approveBtnOnDeny.getAttribute("data-loading"),
          approveText: approveBtnOnDeny.textContent?.trim(),
        };

        // 2. Drawer right / left / bottom stay strictly within [8, vw - 8]
        const drawerBounds = {};
        for (const side of ["right", "left", "bottom"]) {
          document.getElementById("open-drawer-" + side).click();
          await wait(290);
          const panel = document.querySelector(".af-drawer__panel");
          const r = panel.getBoundingClientRect();
          drawerBounds[side] = {
            left: Math.round(r.left),
            right: Math.round(r.right),
            vw: window.innerWidth,
          };
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          await wait(220);
        }

        // 3. AfSplitter collapsed primary pane is hidden/inert with zero vertical text crush
        document.getElementById("toggle-splitter-collapse").click();
        await wait(80);
        const splitter = document.querySelector("#splitter-collapse-probe .af-splitter");
        const collapsedPane = splitter.querySelector('.af-splitter__pane[data-collapsed="true"]');
        const splitterCollapsed = {
          hasCollapsedPane: Boolean(collapsedPane),
          ariaHidden: collapsedPane?.getAttribute("aria-hidden"),
          isInert: Boolean(collapsedPane?.inert),
          clientH: splitter.clientHeight,
          scrollH: splitter.scrollHeight,
        };

        // 4. AfNotificationStackPattern dismissing front card leaves next card unclipped
        document.querySelector("#ns-dismiss-probe .af-dt-ns__close").click();
        await wait(440);
        const nextCard = document.querySelector('#ns-dismiss-probe .af-dt-ns__card[data-depth="0"]');
        const nsClip = {
          clientH: nextCard.clientHeight,
          scrollH: nextCard.scrollHeight,
        };

        return { approveBusy, denyBusy, drawerBounds, splitterCollapsed, nsClip };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          approveBusy: {
            phase: string | null;
            clientH: number;
            scrollH: number;
            bottomClearance: number;
            checkboxLabelH: number;
            primaryLoading: string | null;
            denyLoading: string | null;
            denyDisabled: boolean;
          };
          denyBusy: {
            phase: string | null;
            clientH: number;
            scrollH: number;
            denyLoading: string | null;
            approveLoading: string | null;
            approveText: string | undefined;
          };
          drawerBounds: Record<string, { left: number; right: number; vw: number }>;
          splitterCollapsed: {
            hasCollapsedPane: boolean;
            ariaHidden: string | null;
            isInert: boolean;
            clientH: number;
            scrollH: number;
          };
          nsClip: { clientH: number; scrollH: number };
        };
      };
    };

    const { approveBusy, denyBusy, drawerBounds, splitterCollapsed, nsClip } = res.result.value;
    expect(approveBusy.phase).toBe("busy");
    expect(approveBusy.scrollH).toBeLessThanOrEqual(approveBusy.clientH + 1);
    expect(approveBusy.bottomClearance).toBeGreaterThanOrEqual(12);
    expect(approveBusy.checkboxLabelH).toBeGreaterThan(0);
    expect(approveBusy.checkboxLabelH).toBeLessThanOrEqual(24);
    expect(approveBusy.primaryLoading).toBe("true");
    expect(approveBusy.denyLoading).toBeNull();
    expect(approveBusy.denyDisabled).toBe(true);

    expect(denyBusy.phase).toBe("busy");
    expect(denyBusy.scrollH).toBeLessThanOrEqual(denyBusy.clientH + 1);
    expect(denyBusy.denyLoading).toBe("true");
    expect(denyBusy.approveLoading).toBeNull();
    expect(denyBusy.approveText).toContain("批准");
    expect(denyBusy.approveText).not.toContain("批准中");

    for (const side of ["right", "left", "bottom"]) {
      expect(drawerBounds[side].left).toBeGreaterThanOrEqual(7);
      expect(drawerBounds[side].right).toBeLessThanOrEqual(drawerBounds[side].vw - 7);
    }

    expect(splitterCollapsed).toEqual({
      hasCollapsedPane: true,
      ariaHidden: "true",
      isInert: true,
      clientH: 200,
      scrollH: 200,
    });

    expect(nsClip.scrollH).toBeLessThanOrEqual(nsClip.clientH + 1);
  });

  it("verifies v0.5 Rating, Block column & filter popover widths, and Screen dark-theme & overflow contracts", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        document.getElementById("mount-v05-probes")?.click();
        await wait(80);

        // 1. Rating stars + thumbs interaction & SVG stacking
        const rProbe = document.getElementById("v05-rating-probe");
        const starRadios = [...rProbe.querySelectorAll('.af-rating__star[role="radio"]')];
        const initialFilled = starRadios.filter((el) => el.hasAttribute("data-filled")).length;
        const firstBaseRect = starRadios[0].querySelector(".af-rating__svg--base").getBoundingClientRect();
        const firstFillRect = starRadios[0].querySelector(".af-rating__svg--fill").getBoundingClientRect();
        starRadios[4].click();
        await wait(40);
        const afterFiveFilled = starRadios.filter((el) => el.hasAttribute("data-filled")).length;

        const thumbBtns = [...rProbe.querySelectorAll(".af-rating__thumb")];
        thumbBtns[0].click();
        await wait(40);
        const thumbUpSelected = thumbBtns[0].hasAttribute("data-selected");

        // 2. AppDirectory 3-column fixed basis (never stretches to 100% on single search hit) + compact Filter popover
        const dirProbe = document.getElementById("v05-app-dir-probe");
        const dirSearch = dirProbe.querySelector('input[type="search"], input[placeholder*="Search"]');
        if (dirSearch) {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
          setter.call(dirSearch, "Slack");
          dirSearch.dispatchEvent(new Event("input", { bubbles: true }));
          await wait(50);
        }
        const singleCard = dirProbe.querySelector(".af-pj-dir__card");
        const gridEl = singleCard ? singleCard.parentElement : dirProbe;
        const singleCardRatio = singleCard ? singleCard.getBoundingClientRect().width / gridEl.getBoundingClientRect().width : 1;

        const dirFilterBtn = [...dirProbe.querySelectorAll("button")].find((b) => /Filter/i.test(b.textContent || ""));
        let dirFilterWidth = 0;
        if (dirFilterBtn) {
          dirFilterBtn.click();
          await wait(60);
          const menus = [...document.querySelectorAll('[role="menu"], .af-pj-float-menu, .af-agd-popover')].filter((el) => el.getBoundingClientRect().width > 0);
          if (menus.length > 0) {
            dirFilterWidth = menus[menus.length - 1].getBoundingClientRect().width;
          }
          dirFilterBtn.click();
          await wait(40);
        }

        // 3. TaskBoard compact Filter popover width
        const tbProbe = document.getElementById("v05-task-board-probe");
        const tbFilterBtn = [...tbProbe.querySelectorAll("button")].find((b) => /Filter/i.test(b.textContent || ""));
        let tbFilterWidth = 0;
        if (tbFilterBtn) {
          tbFilterBtn.click();
          await wait(60);
          const menus = [...document.querySelectorAll('[role="menu"], [role="dialog"], .af-pj-float-menu, .af-agd-popover')].filter((el) => {
            const w = el.getBoundingClientRect().width;
            return w > 80 && w < 360 && /Agent|Billing|Design|Infra/i.test(el.textContent || "");
          });
          if (menus.length > 0) {
            tbFilterWidth = menus[menus.length - 1].getBoundingClientRect().width;
          }
          tbFilterBtn.click();
          await wait(40);
        }

        // 4. Screen Shard S5 dark-theme inheritance (no white reset) + zero horizontal overflow
        const darkProbe = document.getElementById("v05-dark-screen-probe");
        const aopsRoot = darkProbe.querySelector(".af-aops");
        const aopsBg = aopsRoot ? getComputedStyle(aopsRoot).backgroundColor : "";
        const aopsMain = darkProbe.querySelector(".af-aops-main");
        const mainClientW = aopsMain ? aopsMain.clientWidth : 0;
        const mainScrollW = aopsMain ? aopsMain.scrollWidth : 0;

        return {
          initialFilled,
          afterFiveFilled,
          svgStackedDelta: Math.abs(firstBaseRect.left - firstFillRect.left) + Math.abs(firstBaseRect.top - firstFillRect.top),
          thumbUpSelected,
          singleCardRatio,
          dirFilterWidth,
          tbFilterWidth,
          aopsBg,
          mainClientW,
          mainScrollW,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          initialFilled: number;
          afterFiveFilled: number;
          svgStackedDelta: number;
          thumbUpSelected: boolean;
          singleCardRatio: number;
          dirFilterWidth: number;
          tbFilterWidth: number;
          aopsBg: string;
          mainClientW: number;
          mainScrollW: number;
        };
      };
    };

    const v = res.result.value;
    expect(v.initialFilled).toBe(3);
    expect(v.afterFiveFilled).toBe(5);
    expect(v.svgStackedDelta).toBeLessThanOrEqual(1);
    expect(v.thumbUpSelected).toBe(true);
    expect(v.singleCardRatio).toBeGreaterThan(0.25);
    expect(v.singleCardRatio).toBeLessThan(0.4);
    expect(v.dirFilterWidth).toBeGreaterThan(120);
    expect(v.dirFilterWidth).toBeLessThanOrEqual(210);
    expect(v.tbFilterWidth).toBeGreaterThan(120);
    expect(v.tbFilterWidth).toBeLessThanOrEqual(210);
    const rgb = (v.aopsBg.match(/\d+/g) ?? []).slice(0, 3).map(Number);
    expect(rgb.length).toBe(3);
    expect(Math.max(...rgb)).toBeLessThan(70);
    expect(v.mainScrollW).toBeLessThanOrEqual(v.mainClientW + 1);
  });

  it("preserves AfSelect searchable height/icon/text-X/hint-Y across open & Escape and aligns inline SVG inside AfButton", async () => {
    // Ensure v0.5 probes are mounted and bring #v05-physics-probe into viewport
    const prep = (await send("Runtime.evaluate", {
      expression: `(async () => {
        if (!document.getElementById("v05-probes-root")) {
          document.getElementById("mount-v05-probes")?.click();
          await new Promise((r) => setTimeout(r, 80));
        }
        const root = document.getElementById("v05-physics-probe");
        root.scrollIntoView({ block: "center" });
        await new Promise((r) => setTimeout(r, 40));
        const trigger = root.querySelector(".af-select__trigger");
        const hint = root.querySelector(".af-select__hint");
        const btn = document.getElementById("v05-inline-svg-btn");
        const btnSvg = btn.querySelector("svg");
        const btnSpan = btn.querySelector("span");
        const svgRect = btnSvg.getBoundingClientRect();
        const spanRect = btnSpan.getBoundingClientRect();

        const measure = () => {
          const tr = trigger.getBoundingClientRect();
          const hr = hint.getBoundingClientRect();
          const leftIcons = [...trigger.querySelectorAll("svg")].filter((s) => {
            if (s.classList.contains("af-select__chevron")) return false;
            const sr = s.getBoundingClientRect();
            return sr.width >= 8 && sr.left + sr.width / 2 < tr.left + tr.width * 0.45;
          });
          const inp = trigger.querySelector("input");
          let textX = 0;
          if (inp && getComputedStyle(inp).display !== "none" && inp.getBoundingClientRect().width > 2) {
            const ir = inp.getBoundingClientRect();
            textX = ir.left + (parseFloat(getComputedStyle(inp).paddingLeft) || 0);
          } else {
            const walker = document.createTreeWalker(trigger, NodeFilter.SHOW_TEXT);
            let n;
            while ((n = walker.nextNode())) {
              if (n.nodeValue && n.nodeValue.trim()) {
                const range = document.createRange();
                range.selectNodeContents(n);
                const rr = range.getBoundingClientRect();
                if (rr.width > 1) {
                  textX = rr.left;
                  break;
                }
              }
            }
          }
          return {
            cx: tr.left + tr.width / 2,
            cy: tr.top + tr.height / 2,
            h: tr.height,
            w: tr.width,
            leftIconCount: leftIcons.length,
            textX,
            hintTop: hr.top,
          };
        };

        return {
          rest: measure(),
          btnSvgDeltaY: Math.abs((svgRect.top + svgRect.bottom) / 2 - (spanRect.top + spanRect.bottom) / 2),
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          rest: { cx: number; cy: number; h: number; w: number; leftIconCount: number; textX: number; hintTop: number };
          btnSvgDeltaY: number;
        };
      };
    };

    const rest = prep.result.value.rest;
    expect(prep.result.value.btnSvgDeltaY).toBeLessThanOrEqual(1.5);
    expect(rest.h).toBeGreaterThanOrEqual(31.5);
    expect(rest.h).toBeLessThanOrEqual(32.5);
    expect(rest.leftIconCount).toBe(1);

    // Real CDP pointer click to open searchable AfSelect
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rest.cx, y: rest.cy, button: "none" });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rest.cx, y: rest.cy, button: "left", clickCount: 1 });
    const activeRes = (await send("Runtime.evaluate", {
      expression: `(() => {
        const trigger = document.querySelector("#v05-physics-probe .af-select__trigger");
        return { h: trigger.getBoundingClientRect().height, transform: getComputedStyle(trigger).transform };
      })()`,
      returnByValue: true,
    })) as { result: { value: { h: number; transform: string } } };
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rest.cx, y: rest.cy, button: "left", clickCount: 1 });

    expect(Math.abs(activeRes.result.value.h - rest.h)).toBeLessThanOrEqual(0.5);
    expect(activeRes.result.value.transform === "none" || activeRes.result.value.transform === "matrix(1, 0, 0, 1, 0, 0)").toBe(true);

    const openRes = (await send("Runtime.evaluate", {
      expression: `(async () => {
        await new Promise((r) => setTimeout(r, 120));
        const root = document.getElementById("v05-physics-probe");
        const trigger = root.querySelector(".af-select__trigger");
        const hint = root.querySelector(".af-select__hint");
        const tr = trigger.getBoundingClientRect();
        const hr = hint.getBoundingClientRect();
        const leftIcons = [...trigger.querySelectorAll("svg")].filter((s) => {
          if (s.classList.contains("af-select__chevron")) return false;
          const sr = s.getBoundingClientRect();
          return sr.width >= 8 && sr.left + sr.width / 2 < tr.left + tr.width * 0.45;
        });
        const inp = trigger.querySelector("input");
        const ir = inp.getBoundingClientRect();
        const textX = ir.left + (parseFloat(getComputedStyle(inp).paddingLeft) || 0);
        return {
          expanded: trigger.getAttribute("aria-expanded") === "true",
          h: tr.height,
          w: tr.width,
          leftIconCount: leftIcons.length,
          textX,
          hintTop: hr.top,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: { value: { expanded: boolean; h: number; w: number; leftIconCount: number; textX: number; hintTop: number } };
    };

    const open = openRes.result.value;
    expect(open.expanded).toBe(true);
    expect(Math.abs(open.h - rest.h)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(open.w - rest.w)).toBeLessThanOrEqual(0.5);
    expect(open.leftIconCount).toBe(1);
    expect(Math.abs(open.textX - rest.textX)).toBeLessThanOrEqual(2);
    expect(Math.abs(open.hintTop - rest.hintTop)).toBeLessThanOrEqual(0.5);

    // Real CDP Escape to close overlay -> modality must stay "pointer" with zero visible outline ring
    await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });

    const settledRes = (await send("Runtime.evaluate", {
      expression: `(async () => {
        await new Promise((r) => setTimeout(r, 260));
        const trigger = document.querySelector("#v05-physics-probe .af-select__trigger");
        const cs = getComputedStyle(trigger);
        return {
          expanded: trigger.getAttribute("aria-expanded"),
          h: trigger.getBoundingClientRect().height,
          modality: trigger.closest(".af")?.getAttribute("data-modality"),
          outlineStyle: cs.outlineStyle,
          outlineWidth: parseFloat(cs.outlineWidth) || 0,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: { value: { expanded: string; h: number; modality: string; outlineStyle: string; outlineWidth: number } };
    };

    expect(settledRes.result.value.expanded).toBe("false");
    expect(Math.abs(settledRes.result.value.h - rest.h)).toBeLessThanOrEqual(0.5);
    expect(settledRes.result.value.modality).toBe("pointer");
    expect(settledRes.result.value.outlineStyle === "none" || settledRes.result.value.outlineWidth === 0).toBe(true);
  });

  it("enforces zero phantom strut on .af-message__icon and optical icon-text centering across AfMessage, AfSelect, AfTable, AfAlert, and AfThinkingLoader", async () => {
    // Prepare viewport & get real CDP coordinates for #v05-cfg-msg-btn
    const btnPos = (await send("Runtime.evaluate", {
      expression: `(async () => {
        if (!document.getElementById("v05-probes-root")) {
          document.getElementById("mount-v05-probes")?.click();
          await new Promise((r) => setTimeout(r, 80));
        }
        const probe = document.getElementById("v05-optical-align-probe");
        probe.scrollIntoView({ block: "center" });
        await new Promise((r) => setTimeout(r, 60));
        const btn = document.getElementById("v05-cfg-msg-btn");
        const r = btn.getBoundingClientRect();
        return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as { result: { value: { cx: number; cy: number } } };

    // Real CDP click to trigger afMessage.success("Configuration saved")
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: btnPos.result.value.cx, y: btnPos.result.value.cy, button: "none" });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: btnPos.result.value.cx, y: btnPos.result.value.cy, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: btnPos.result.value.cx, y: btnPos.result.value.cy, button: "left", clickCount: 1 });

    const metricsRes = (await send("Runtime.evaluate", {
      expression: `(async () => {
        await new Promise((r) => setTimeout(r, 380));

        const textCenterYOf = (el) => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
              if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
              const p = node.parentElement;
              if (!p || p.closest("svg, .af-ch-sr, .af-sr-only, [class*='ghost']")) return NodeFilter.FILTER_REJECT;
              const cs = getComputedStyle(p);
              if (cs.position === "absolute" || cs.position === "fixed" || cs.display === "none" || cs.visibility === "hidden") {
                return NodeFilter.FILTER_REJECT;
              }
              return NodeFilter.FILTER_ACCEPT;
            },
          });
          let top = Infinity;
          let bottom = -Infinity;
          let n;
          while ((n = walker.nextNode())) {
            const range = document.createRange();
            range.selectNodeContents(n);
            for (const rr of range.getClientRects()) {
              if (rr.width >= 1 && rr.height >= 4) {
                top = Math.min(top, rr.top);
                bottom = Math.max(bottom, rr.bottom);
              }
            }
          }
          return (top + bottom) / 2;
        };

        const centerYOf = (el) => {
          const r = el.getBoundingClientRect();
          return (r.top + r.bottom) / 2;
        };

        // 1. .af-message ("Configuration saved")
        const msgs = [...document.querySelectorAll(".af-message")].filter((m) => (m.textContent || "").includes("Configuration saved"));
        const msg = msgs[msgs.length - 1];
        const msgIconWrap = msg.querySelector(".af-message__icon");
        const msgSvg = msgIconWrap.querySelector("svg");
        const msgWrapRect = msgIconWrap.getBoundingClientRect();
        const msgSvgRect = msgSvg.getBoundingClientRect();
        const msgDeltaY = Math.abs(centerYOf(msgSvg) - textCenterYOf(msg));

        // 2. .af-select__trigger (inside #v05-physics-probe)
        const selectTrig = document.querySelector("#v05-physics-probe .af-select__trigger");
        const selectIcon = selectTrig.querySelector(".af-select__value-with-icon svg, svg:not(.af-select__chevron)");
        const selectDeltaY = Math.abs(centerYOf(selectIcon) - textCenterYOf(selectTrig));

        // 3. .af-table__cell--check (tbody row check box vs adjacent cell text)
        const probe = document.getElementById("v05-optical-align-probe");
        const bodyRow = probe.querySelector("tbody tr");
        const checkBox = bodyRow.querySelector(".af-table__cell--check .af-check__box");
        const dataCell = [...bodyRow.querySelectorAll("td")].find((td) => !td.classList.contains("af-table__cell--check"));
        const tableCheckDeltaY = Math.abs(centerYOf(checkBox) - textCenterYOf(dataCell));

        // 4. .af-alert (single-line alert)
        const alertEl = probe.querySelector(".af-alert");
        const alertSvg = alertEl.querySelector(".af-alert__icon svg");
        const alertDeltaY = Math.abs(centerYOf(alertSvg) - textCenterYOf(alertEl));

        // 5. .af-ch-loader
        const loaderEl = probe.querySelector(".af-ch-loader");
        const loaderSvg = loaderEl.querySelector(".af-ch-loader__rays");
        const loaderDeltaY = Math.abs(centerYOf(loaderSvg) - textCenterYOf(loaderEl));

        // Dismiss message so subsequent checks see a clean stage
        document.getElementById("msg-destroy-btn")?.click();

        return {
          msgFound: Boolean(msg),
          msgWrapH: msgWrapRect.height,
          msgSvgH: msgSvgRect.height,
          msgDeltaY,
          selectDeltaY,
          tableCheckDeltaY,
          alertDeltaY,
          loaderDeltaY,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as {
      result: {
        value: {
          msgFound: boolean;
          msgWrapH: number;
          msgSvgH: number;
          msgDeltaY: number;
          selectDeltaY: number;
          tableCheckDeltaY: number;
          alertDeltaY: number;
          loaderDeltaY: number;
        };
      };
    };

    const m = metricsRes.result.value;
    expect(m.msgFound).toBe(true);
    expect(Math.abs(m.msgWrapH - m.msgSvgH)).toBeLessThanOrEqual(0.5);
    expect(m.msgDeltaY).toBeLessThanOrEqual(0.5);
    expect(m.selectDeltaY).toBeLessThanOrEqual(1.0);
    expect(m.tableCheckDeltaY).toBeLessThanOrEqual(1.0);
    expect(m.alertDeltaY).toBeLessThanOrEqual(1.0);
    expect(m.loaderDeltaY).toBeLessThanOrEqual(1.0);
  });

  it("verifies 1:1 affectui.com DOM parity contracts on AfAgentQueuePattern, AfJudgeBracket, and Interactive Illustrations", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        if (!document.getElementById("phase2-probes-root")) {
          document.getElementById("mount-phase2-probes")?.click();
          await wait(90);
        }

        const hasCjk = (el) => /[\\u4e00-\\u9fff]/.test(el?.textContent || "");

        // 1. AfAgentQueuePattern: Live pill, Pause/Resume toggle, - N + stepper, 2-column detail popover, purple area chart SVG, Done/Failed bins, 0 CJK
        const agq = document.getElementById("p2-agent-queue-probe");
        const agqInitialPill = agq.querySelector(".af-agqc__pill")?.textContent?.trim();
        const agqInitialTone = agq.querySelector(".af-agqc__pill")?.getAttribute("data-tone");
        const agqHeadBtnCount = agq.querySelectorAll(".af-agqc__head button").length;
        const agqInitialSlots = agq.querySelector(".af-agqc__step-val")?.textContent?.trim();
        agq.querySelector('button[aria-label="Increase workers"]')?.click();
        await wait(30);
        const agqAfterIncSlots = agq.querySelector(".af-agqc__step-val")?.textContent?.trim();
        agq.querySelector(".af-agqc__btn")?.click();
        await wait(30);
        const agqPausedPill = agq.querySelector(".af-agqc__pill")?.textContent?.trim();
        const agqPausedBtnText = agq.querySelector(".af-agqc__btn")?.textContent?.trim();
        agq.querySelector(".af-agqc__btn")?.click();
        await wait(30);

        const firstJob = agq.querySelector(".af-agqc__job");
        firstJob?.click();
        await wait(40);
        const agqPop = agq.querySelector('.af-agqc__pop[role="dialog"]');
        const agqPopKvCount = agqPop ? agqPop.querySelectorAll(".af-agqc__pop-kv").length : 0;
        const agqChartPaths = agq.querySelectorAll(".af-agqc__chart-svg path").length;
        const agqChartBands = agq.querySelectorAll(".af-agqc__chart-svg rect").length;
        const agqHasBins = Boolean(
          agq.querySelector('.af-agqc__bin[data-kind="done"]') &&
          agq.querySelector('.af-agqc__bin[data-kind="failed"]'),
        );
        const agqCjk = hasCjk(agq);

        // 2. AfJudgeBracket: 8 contenders -> 7 desktop matches (4 QF + 2 SF + 1 Final), Judging badge, 0 header buttons, non-green border, 0 CJK
        const jbc = document.getElementById("p2-judge-bracket-probe");
        const jbcRoot = jbc.querySelector(".af-jbc");
        const jbcMatches = [...jbc.querySelectorAll(".af-jbc__match")];
        const jbcQfMatches = jbcMatches.filter((m) => (m.getAttribute("data-key") || "").startsWith("0:"));
        const jbcHeadBtns = jbc.querySelectorAll(".af-jbc__head button").length;
        const jbcLiveAttr = jbc.querySelector(".af-jbc__live")?.hasAttribute("data-on") ?? false;
        const jbcLiveText = jbc.querySelector(".af-jbc__live")?.textContent?.trim();
        const jbcBorderColor = jbcRoot ? getComputedStyle(jbcRoot).borderColor : "";
        const bRgb = (jbcBorderColor.match(/\\d+/g) || []).slice(0, 3).map(Number);
        const jbcIsGreenBorder = bRgb.length === 3 && bRgb[1] - Math.max(bRgb[0], bRgb[2]) > 25;
        jbc.querySelector('.af-jbc__match[data-key="0:1"]')?.click();
        await wait(30);
        const jbcPinnedPanelName = jbc.querySelector(".af-jbc__panel-name")?.textContent?.trim();
        const jbcCjk = hasCjk(jbc);

        // 3. Interactive Illustrations: AfAgentTeam, AfGlowKeyboard, AfVoiceOrb, AfWorldMap
        const ilRoot = document.getElementById("p2-illustrations-probe");
        const teamAgents = document.querySelectorAll("#p2-il-team .ui-atm-agent").length;
        const teamSvg = Boolean(document.querySelector("#p2-il-team svg.ui-atm-lines"));

        const kbKeys = document.querySelectorAll("#p2-il-keyboard .ui-gk-key").length;
        const kbInput = document.querySelector("#p2-il-keyboard input.ui-gk-prompt");
        kbInput?.focus();
        if (kbInput) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(kbInput, "ship v1");
          kbInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
        await wait(20);
        const kbValue = kbInput?.value;

        const orbBtn = document.querySelector("#p2-il-orb button.ui-vo");
        const orbCanvas = document.querySelector("#p2-il-orb canvas.ui-vo__canvas");
        const orbState = orbBtn?.getAttribute("data-state");
        const orbLabel = document.querySelector("#p2-il-orb .ui-vo__label")?.textContent?.trim();
        orbBtn?.click();
        await wait(20);
        const orbClicks = Number(document.getElementById("p2-orb-count")?.textContent || "0");

        const wmTrigger = document.querySelector("#p2-il-map button.ui-wm-trigger");
        const wmInitial = wmTrigger?.textContent?.trim();
        wmTrigger?.click();
        await wait(40);
        const wmMenuOpen = document.querySelector("#p2-il-map .ui-wm-menu")?.getAttribute("data-open");
        const asiaOpt = [...document.querySelectorAll("#p2-il-map .ui-wm-option")].find((o) =>
          (o.textContent || "").includes("Asia"),
        );
        asiaOpt?.click();
        await wait(40);
        const wmAfter = wmTrigger?.textContent?.trim();
        const ilCjk = hasCjk(ilRoot);

        return {
          agqInitialPill,
          agqInitialTone,
          agqHeadBtnCount,
          agqInitialSlots,
          agqAfterIncSlots,
          agqPausedPill,
          agqPausedBtnText,
          agqPopOpen: Boolean(agqPop),
          agqPopKvCount,
          agqChartPaths,
          agqChartBands,
          agqHasBins,
          agqCjk,
          jbcMatchCount: jbcMatches.length,
          jbcQfCount: jbcQfMatches.length,
          jbcHeadBtns,
          jbcLiveAttr,
          jbcLiveText,
          jbcIsGreenBorder,
          jbcPinnedPanelName,
          jbcCjk,
          teamAgents,
          teamSvg,
          kbKeys,
          kbValue,
          orbCanvasReady: Boolean(orbCanvas && orbCanvas.width > 0 && orbCanvas.height > 0),
          orbState,
          orbLabel,
          orbClicks,
          wmInitial,
          wmMenuOpen,
          wmAfter,
          ilCjk,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as { result: { value: Record<string, unknown> } };

    expect(res.result.value).toMatchObject({
      agqInitialPill: "Live",
      agqInitialTone: "live",
      agqHeadBtnCount: 3,
      agqInitialSlots: "4",
      agqAfterIncSlots: "5",
      agqPausedPill: "Paused",
      agqPausedBtnText: "Resume",
      agqPopOpen: true,
      agqPopKvCount: 4,
      agqHasBins: true,
      agqCjk: false,
      jbcMatchCount: 7,
      jbcQfCount: 4,
      jbcHeadBtns: 0,
      jbcLiveAttr: true,
      jbcLiveText: "Judging",
      jbcIsGreenBorder: false,
      jbcPinnedPanelName: "Quarterfinal 2",
      jbcCjk: false,
      teamAgents: 3,
      teamSvg: true,
      kbKeys: 79,
      kbValue: "ship v1",
      orbCanvasReady: true,
      orbState: "listening",
      orbLabel: "Listening",
      orbClicks: 1,
      wmInitial: "Europe",
      wmMenuOpen: "true",
      wmAfter: "Asia",
      ilCjk: false,
    });
    expect(Number(res.result.value.agqChartPaths)).toBeGreaterThanOrEqual(2);
    expect(Number(res.result.value.agqChartBands)).toBeGreaterThanOrEqual(1);
  });

  it("verifies P0-0 overlay exit presence, preserve-3d anti-flattening, cascade ticker, clip-safe morph containers, transform shimmer, and Pro LineChart contracts", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        if (!document.getElementById("p0-motion-probes-root")) {
          document.getElementById("mount-p0-motion-probes")?.click();
          await wait(80);
        }

        // 1. Anchor-mode AfPopover exit transition: retains DOM node with [data-closing="true"] & frozen coordinates during exit
        const popBtn = document.getElementById("p0-anchor-pop-btn");
        popBtn?.scrollIntoView({ block: "center" });
        await wait(30);
        popBtn?.click();
        await wait(60);
        const openPop = document.getElementById("p0-anchor-pop");
        const openRect = openPop ? openPop.getBoundingClientRect() : null;
        const openInlineCoords = openPop ? openPop.style.left + "," + openPop.style.top : "";
        popBtn?.click();
        await wait(35);
        const closingPop = document.getElementById("p0-anchor-pop");
        const closingAttr = closingPop?.getAttribute("data-closing") ?? null;
        const closingRect = closingPop ? closingPop.getBoundingClientRect() : null;
        const closingInlineCoords = closingPop ? closingPop.style.left + "," + closingPop.style.top : "mismatch";
        await wait(190);
        const unmountedAfterExit = document.getElementById("p0-anchor-pop") === null;

        // 2. AfTiltCard: preserve-3d inner stage has visible overflow, inner surface clips rounded corners, tracking engages after 150ms entry settle
        const tiltRoot = document.querySelector("#p0-tilt-probe .af-mo-tilt");
        const tiltInner = document.querySelector("#p0-tilt-probe .af-mo-tilt__inner");
        const tiltSurface = document.querySelector("#p0-tilt-probe .af-mo-tilt__surface");
        const tiltInnerCs = tiltInner ? getComputedStyle(tiltInner) : null;
        const tiltSurfaceCs = tiltSurface ? getComputedStyle(tiltSurface) : null;
        const tiltRect = tiltRoot ? tiltRoot.getBoundingClientRect() : { left: 0, top: 0, width: 100, height: 60 };
        tiltRoot?.dispatchEvent(
          new PointerEvent("pointermove", {
            bubbles: true,
            pointerType: "mouse",
            clientX: tiltRect.left + tiltRect.width * 0.75,
            clientY: tiltRect.top + tiltRect.height * 0.25,
          }),
        );
        await wait(175);
        const trackingDuringMove = Boolean(tiltInner?.hasAttribute("data-tracking"));
        tiltRoot?.dispatchEvent(
          new PointerEvent("pointerout", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }),
        );
        await wait(30);
        const trackingAfterLeave = Boolean(tiltInner?.hasAttribute("data-tracking"));

        // 3. AfNumberTicker: right-aligned place-value columns transition cleanly from 99 -> 100 with tabular-nums
        const tickerEl = document.getElementById("p0-ticker");
        const initialCols = tickerEl ? tickerEl.querySelectorAll(".af-mo-ticker__col").length : 0;
        const tickerTabular = tickerEl ? getComputedStyle(tickerEl).fontVariantNumeric.includes("tabular-nums") : false;
        document.getElementById("p0-ticker-inc")?.click();
        await wait(60);
        const afterIncCols = tickerEl ? tickerEl.querySelectorAll(".af-mo-ticker__col").length : 0;
        const tickerAria = tickerEl?.getAttribute("aria-label") ?? "";

        // 4. AfBlurCrossfade [data-busy] & AfTray footer wrapper use overflow: clip (never overflow: hidden) + AfTray exit presence
        document.getElementById("p0-blur-toggle")?.click();
        await wait(40);
        const blurEl = document.querySelector("#p0-morph-probe .af-mo-cf__box");
        const blurOverflowX = blurEl ? getComputedStyle(blurEl).overflowX : "";
        document.getElementById("p0-tray-toggle")?.click();
        await wait(60);
        const trayFootWrap = document.querySelector("#p0-morph-probe .af-tray__foot-wrap");
        const trayFootOverflowX = trayFootWrap ? getComputedStyle(trayFootWrap).overflowX : "";
        document.getElementById("p0-tray-toggle")?.click();
        await wait(40);
        const trayFootClosing = document.querySelector("#p0-morph-probe .af-tray__foot-wrap")?.getAttribute("data-closing") ?? null;
        await wait(240);
        const trayFootUnmounted = document.getElementById("p0-tray-foot-inner") === null;

        // 5. AfShimmerLoader avoids viewport-janking background-attachment: fixed
        const shimmerEl = document.getElementById("p0-shimmer-block");
        const shimmerBgAttachment = shimmerEl ? getComputedStyle(shimmerEl).backgroundAttachment : "";

        // 6. AfLineChart uses pathLength="1" for constant-velocity draw and renders hover guide without initial fly-in lag
        const chartPlot = document.querySelector("#p0-chart-probe .af-line__plot");
        const normalizedLinePaths = document.querySelectorAll('#p0-chart-probe path.af-line__path[pathLength="1"]').length;
        if (chartPlot) {
          const cr = chartPlot.getBoundingClientRect();
          chartPlot.dispatchEvent(
            new PointerEvent("pointermove", {
              bubbles: true,
              pointerType: "mouse",
              clientX: cr.left + cr.width * 0.65,
              clientY: cr.top + cr.height * 0.5,
            }),
          );
        }
        await wait(30);
        const guideLine = document.querySelector("#p0-chart-probe line.af-line__guide[data-visible]");
        const guideInitialTransition = guideLine ? getComputedStyle(guideLine).transitionProperty : "";
        if (chartPlot) {
          const cr = chartPlot.getBoundingClientRect();
          chartPlot.dispatchEvent(
            new PointerEvent("pointermove", {
              bubbles: true,
              pointerType: "mouse",
              clientX: cr.left + cr.width * 0.25,
              clientY: cr.top + cr.height * 0.5,
            }),
          );
        }
        await wait(30);
        const guideGlideTransition = guideLine ? getComputedStyle(guideLine).transitionProperty : "";

        return {
          popOpened: Boolean(openPop && openRect && openRect.width > 20),
          closingAttr,
          closingStayedAnchored: Boolean(
            openInlineCoords &&
              openInlineCoords === closingInlineCoords &&
              openRect &&
              closingRect &&
              Math.abs(openRect.top - closingRect.top) <= 8 &&
              Math.abs(openRect.left - closingRect.left) <= 8,
          ),
          unmountedAfterExit,
          tiltTransformStyle: tiltInnerCs?.transformStyle ?? "",
          tiltRootOverflow: tiltInnerCs?.overflowX ?? "",
          tiltSurfaceOverflow: tiltSurfaceCs?.overflowX ?? "",
          trackingDuringMove,
          trackingAfterLeave,
          initialCols,
          afterIncCols,
          tickerTabular,
          tickerAria,
          blurOverflowX,
          trayFootOverflowX,
          trayFootClosing,
          trayFootUnmounted,
          shimmerBgAttachment,
          normalizedLinePaths,
          cursorRendered: Boolean(guideLine),
          cursorHasTransformFlyIn: guideInitialTransition.includes("transform"),
          cursorGlidesAcrossPoints: guideGlideTransition.includes("transform"),
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as { result: { value: Record<string, unknown> } };

    expect(res.result.value).toEqual({
      popOpened: true,
      closingAttr: "true",
      closingStayedAnchored: true,
      unmountedAfterExit: true,
      tiltTransformStyle: "preserve-3d",
      tiltRootOverflow: "visible",
      tiltSurfaceOverflow: "hidden",
      trackingDuringMove: true,
      trackingAfterLeave: false,
      initialCols: 2,
      afterIncCols: 3,
      tickerTabular: true,
      tickerAria: "100",
      blurOverflowX: "clip",
      trayFootOverflowX: "clip",
      trayFootClosing: "true",
      trayFootUnmounted: true,
      shimmerBgAttachment: "scroll",
      normalizedLinePaths: 2,
      cursorRendered: true,
      cursorHasTransformFlyIn: false,
      cursorGlidesAcrossPoints: true,
    });
  });

  it("verifies P0-1 transparent/document/controlled AsterThemeProvider and P0-2 isolated createRoot plugin runtime bridge", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));

        // 1. P0-2: Isolated createRoot plugin shares host theme, .af-portal-root, afMessage, and AfToastProvider
        const unmountPlugin = window.__p0RuntimeBridge.mountIsolatedPlugin();
        await wait(80);

        const hostPortalRoot = document.querySelector("#root > .af > .af-portal-root");
        const pluginProbe = document.getElementById("isolated-plugin-probe");
        const pluginInitialAccent = pluginProbe?.getAttribute("data-plugin-accent");
        const pluginHasRuntime = pluginProbe?.getAttribute("data-has-runtime");
        const pluginPop = document.getElementById("isolated-plugin-popover");
        const pluginPopInner = document.getElementById("isolated-plugin-pop-inner");
        const pluginPopInsideHostPortal = Boolean(hostPortalRoot && pluginPop && hostPortalRoot.contains(pluginPop));
        const pluginPopInheritedCustomAccent = pluginPopInner ? getComputedStyle(pluginPopInner).color : "";

        document.getElementById("isolated-plugin-msg-btn")?.click();
        await wait(60);
        const msgFoundInHostPortal = Boolean(
          hostPortalRoot && [...hostPortalRoot.querySelectorAll(".af-message")].some((el) => el.textContent?.includes("插件跨根轻提示")),
        );
        const toastFoundInHostPortal = Boolean(
          hostPortalRoot && [...hostPortalRoot.querySelectorAll(".af-toast")].some((el) => el.textContent?.includes("插件跨根通知")),
        );

        document.getElementById("isolated-plugin-accent-btn")?.click();
        await wait(50);
        const hostAccentAfterPluginSet = document.querySelector("#root > .af")?.getAttribute("data-accent");
        const pluginAccentAfterSet = pluginProbe?.getAttribute("data-plugin-accent");
        document.getElementById("isolated-plugin-cleanup-btn")?.click();

        unmountPlugin();
        await wait(40);

        // 2. P0-1: target="document" + transparent + storage={false} + controlled onChange + unmount restoration
        document.documentElement.classList.add("pre-host-marker");
        document.documentElement.setAttribute("data-theme", "light");
        const prevStoredAccent = localStorage.getItem("aster-ui:theme-accent");
        const snapshots = [];
        const unmountDoc = window.__p0RuntimeBridge.mountTransparentDocument((s) => snapshots.push(s));
        await wait(80);

        const htmlDuring = {
          hasAfClass: document.documentElement.classList.contains("af"),
          hasPreMarker: document.documentElement.classList.contains("pre-host-marker"),
          theme: document.documentElement.getAttribute("data-theme"),
          afTheme: document.documentElement.getAttribute("data-af-theme"),
          accent: document.documentElement.getAttribute("data-accent"),
          afAccent: document.documentElement.getAttribute("data-af-accent"),
          density: document.documentElement.getAttribute("data-density"),
          afDensity: document.documentElement.getAttribute("data-af-density"),
          radius: document.documentElement.getAttribute("data-radius"),
          afRadius: document.documentElement.getAttribute("data-af-radius"),
          transparent: document.documentElement.getAttribute("data-af-transparent"),
          colorScheme: document.documentElement.style.colorScheme,
          htmlBg: getComputedStyle(document.documentElement).backgroundColor,
          bodyBg: getComputedStyle(document.body).backgroundColor,
        };

        const docScopeRoot = document.querySelector("#transparent-doc-mount > .af");
        const docScopeBg = docScopeRoot ? getComputedStyle(docScopeRoot).backgroundColor : "";
        const docPortalRoot = docScopeRoot?.querySelector(".af-portal-root");
        const docPortalCanvasVar = docPortalRoot ? getComputedStyle(docPortalRoot).getPropertyValue("--af-canvas").trim() : "";
        const docPop = document.getElementById("transparent-doc-popover");
        const docPopBg = docPop ? getComputedStyle(docPop).backgroundColor : "";

        document.getElementById("transparent-doc-green-btn")?.click();
        await wait(60);
        const accentAfterControlledChange = document.documentElement.getAttribute("data-accent");
        const storageStayedUntouched = localStorage.getItem("aster-ui:theme-accent") === prevStoredAccent;

        unmountDoc();
        await wait(50);

        const htmlAfterUnmount = {
          hasAfClass: document.documentElement.classList.contains("af"),
          hasPreMarker: document.documentElement.classList.contains("pre-host-marker"),
          restoredTheme: document.documentElement.getAttribute("data-theme"),
          afThemeRemoved: document.documentElement.getAttribute("data-af-theme"),
          transparentRemoved: document.documentElement.getAttribute("data-af-transparent"),
        };
        document.documentElement.classList.remove("pre-host-marker");
        document.documentElement.removeAttribute("data-theme");

        return {
          globalRegistered: window.__p0RuntimeBridge.getRuntimeSnapshot(),
          pluginInitialAccent,
          pluginHasRuntime,
          pluginPopInsideHostPortal,
          pluginPopInheritedCustomAccent,
          msgFoundInHostPortal,
          toastFoundInHostPortal,
          hostAccentAfterPluginSet,
          pluginAccentAfterSet,
          htmlDuring,
          docScopeBg,
          docPortalCanvasVar,
          docPopBg,
          accentAfterControlledChange,
          snapshotCount: snapshots.length,
          lastSnapshotAccent: snapshots[snapshots.length - 1]?.accent ?? null,
          storageStayedUntouched,
          htmlAfterUnmount,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as { result: { value: Record<string, unknown> } };

    expect(res.result.value).toEqual({
      globalRegistered: true,
      pluginInitialAccent: "#e11d48",
      pluginHasRuntime: "true",
      pluginPopInsideHostPortal: true,
      pluginPopInheritedCustomAccent: "rgb(225, 29, 72)",
      msgFoundInHostPortal: true,
      toastFoundInHostPortal: true,
      hostAccentAfterPluginSet: "violet",
      pluginAccentAfterSet: "violet",
      htmlDuring: {
        hasAfClass: true,
        hasPreMarker: true,
        theme: "dark",
        afTheme: "dark",
        accent: "violet",
        afAccent: "violet",
        density: "compact",
        afDensity: "compact",
        radius: "lg",
        afRadius: "lg",
        transparent: "true",
        colorScheme: "dark",
        htmlBg: "rgba(0, 0, 0, 0)",
        bodyBg: "rgba(0, 0, 0, 0)",
      },
      docScopeBg: "rgba(0, 0, 0, 0)",
      docPortalCanvasVar: "#0e0e0e",
      docPopBg: "rgb(32, 32, 32)",
      accentAfterControlledChange: "green",
      snapshotCount: 1,
      lastSnapshotAccent: "green",
      storageStayedUntouched: true,
      htmlAfterUnmount: {
        hasAfClass: false,
        hasPreMarker: true,
        restoredTheme: "light",
        afThemeRemoved: null,
        transparentRemoved: null,
      },
    });
  });

  it("verifies P0-3 controlled list exit retention, async ApprovalCard ResizeObserver receipt, pointer-capture spring drag boards, and streaming/scrub/overflow primitives", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const firePointer = (target, type, x, y, extra = {}) => {
          target.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              composed: true,
              pointerId: 1,
              pointerType: "mouse",
              isPrimary: true,
              button: 0,
              buttons: type === "pointerup" ? 0 : 1,
              clientX: x,
              clientY: y,
              ...extra,
            }),
          );
        };

        const unmount = window.__p03MotionBridge.mount();
        await wait(80);

        try {
          // 1. Async Promise AfApprovalCardPattern + ResizeObserver dynamic multi-line receipt height
          const approvalRoot = document.querySelector('#p03-approval .af-agb-approval');
          const approveBtn = Array.from(document.querySelectorAll('#p03-approval button')).find((b) =>
            /Approve|批准/.test(b.textContent || ""),
          );
          approveBtn?.click();
          await wait(260);
          const phaseWhilePendingPromise = approvalRoot?.getAttribute("data-phase");
          const ariaBusyWhilePending = approvalRoot?.getAttribute("aria-busy");
          window.__p03ResolveApproval?.();
          await wait(80);
          const phaseAfterResolve = approvalRoot?.getAttribute("data-phase");
          const recordEl = document.querySelector('#p03-approval .af-agb-approval__record');
          const recordOffsetHeight = recordEl ? recordEl.offsetHeight : 0;
          const approvalInlineHeight = approvalRoot ? Number.parseFloat(approvalRoot.style.height || "0") : 0;

          // 4. AfTaskBoard real pointer-capture spring drag across columns + portal-scoped ghost
          const card101 = document.querySelector('#p03-board [data-drag-item-id="AST-101"]');
          const doneCol = document.querySelector('#p03-board [data-drag-col-id="done"]');
          card101?.scrollIntoView({ block: "center" });
          await wait(30);
          const cRect = card101.getBoundingClientRect();
          const dRect = doneCol.getBoundingClientRect();
          const startX = cRect.left + cRect.width / 2;
          const startY = cRect.top + cRect.height / 2;
          const targetX = dRect.left + dRect.width / 2;
          const targetY = dRect.top + 80;

          firePointer(card101, "pointerdown", startX, startY);
          firePointer(card101, "pointermove", startX + 14, startY + 6);
          await wait(30);
          firePointer(card101, "pointermove", targetX, targetY);
          await wait(40);

          const ghostEl = document.querySelector("#p03-workbench-mount .af-portal-root .af-drag-ghost");
          const ghostOnBodyDirect = Array.from(document.body.children).some((el) => el.classList?.contains("af-drag-ghost"));
          const doneColHasDrop = Boolean(doneCol?.hasAttribute("data-drop"));

          firePointer(card101, "pointerup", targetX, targetY);
          await wait(60);
          const card101InDone = Boolean(doneCol?.querySelector('[data-drag-item-id="AST-101"]'));
          const ghostCleanedUp = !document.querySelector("#p03-workbench-mount .af-drag-ghost");

          // 5. AfDelegateBoard requireDirectColumnHit: blank drop cancels, direct agent drop assigns
          const delTask = document.querySelector("#p03-delegate .af-dbc__task");
          const delAgent = document.querySelector("#p03-delegate .af-dbc__agent");
          delTask?.scrollIntoView({ block: "center" });
          await wait(30);
          const dtRect = delTask.getBoundingClientRect();
          const daRect = delAgent.getBoundingClientRect();
          const initialUnassigned = document.querySelectorAll("#p03-delegate .af-dbc__task").length;

          // Drag into empty space far to the right of the board -> must NOT assign
          firePointer(delTask, "pointerdown", dtRect.left + 30, dtRect.top + 16);
          firePointer(delTask, "pointermove", dtRect.left + 44, dtRect.top + 20);
          await wait(25);
          firePointer(delTask, "pointermove", daRect.right + 120, daRect.top - 80);
          await wait(25);
          firePointer(delTask, "pointerup", daRect.right + 120, daRect.top - 80);
          await wait(50);
          const unassignedAfterBlankDrop = document.querySelectorAll("#p03-delegate .af-dbc__task").length;

          // Drag directly onto first agent -> must highlight data-drop and assign
          const delTask2 = document.querySelector("#p03-delegate .af-dbc__task");
          const dtRect2 = delTask2.getBoundingClientRect();
          const daRect2 = delAgent.getBoundingClientRect();
          firePointer(delTask2, "pointerdown", dtRect2.left + 30, dtRect2.top + 16);
          firePointer(delTask2, "pointermove", dtRect2.left + 44, dtRect2.top + 20);
          await wait(25);
          firePointer(delTask2, "pointermove", daRect2.left + 60, daRect2.top + 24);
          await wait(30);
          const agentDropHighlight = delAgent.getAttribute("data-drop");
          firePointer(delTask2, "pointerup", daRect2.left + 60, daRect2.top + 24);
          await wait(50);
          const unassignedAfterAgentDrop = document.querySelectorAll("#p03-delegate .af-dbc__task").length;

          // 6. AfAgentPlan sortable list drag reorder
          const planStepsBefore = Array.from(document.querySelectorAll("#p03-plan .af-plc__step-title")).map((n) => n.textContent);
          const step0 = document.querySelectorAll("#p03-plan .af-plc__step")[0];
          const step1 = document.querySelectorAll("#p03-plan .af-plc__step")[1];
          step0?.scrollIntoView({ block: "center" });
          await wait(30);
          const s0Rect = step0.getBoundingClientRect();
          const s1Rect = step1.getBoundingClientRect();
          firePointer(step0, "pointerdown", s0Rect.left + 40, s0Rect.top + 14);
          firePointer(step0, "pointermove", s0Rect.left + 40, s0Rect.top + 26);
          await wait(25);
          firePointer(step0, "pointermove", s1Rect.left + 40, s1Rect.bottom - 4);
          await wait(30);
          firePointer(step0, "pointerup", s1Rect.left + 40, s1Rect.bottom - 4);
          await wait(50);
          const planStepsAfter = Array.from(document.querySelectorAll("#p03-plan .af-plc__step-title")).map((n) => n.textContent);

          // 7. useStreamingTokens, usePointerScrub, useOverflowCollapse
          const overflowBadgeNarrow = document.getElementById("p03-overflow-badge")?.textContent?.trim() ?? null;
          const visibleItemsNarrow = document.querySelectorAll("#p03-overflow [data-overflow-item]").length;
          document.getElementById("p03-overflow-widen")?.click();
          await wait(60);
          const overflowBadgeWide = document.getElementById("p03-overflow-badge")?.textContent?.trim() ?? null;
          const visibleItemsWide = document.querySelectorAll("#p03-overflow [data-overflow-item]").length;

          const scrubEl = document.getElementById("p03-scrub");
          scrubEl?.scrollIntoView({ block: "center" });
          await wait(20);
          const scRect = scrubEl.getBoundingClientRect();
          firePointer(scrubEl, "pointerdown", scRect.left + 10, scRect.top + 8);
          firePointer(scrubEl, "pointermove", scRect.left + 35, scRect.top + 8); // +25px / 5px = +5 steps * 2 = +10 => 60
          await wait(20);
          const scrubbingAttrMid = scrubEl.getAttribute("data-scrubbing");
          const scrubValNormal = Number(scrubEl.textContent?.trim());
          firePointer(scrubEl, "pointermove", scRect.left + 45, scRect.top + 8, { shiftKey: true }); // +10px / 5px = +2 steps * (2*10) = +40 => 100
          await wait(20);
          const scrubValShift = Number(scrubEl.textContent?.trim());
          firePointer(scrubEl, "pointerup", scRect.left + 45, scRect.top + 8);
          await wait(20);

          document.getElementById("p03-stream-start")?.click();
          await wait(35);
          const streamTokenCountMid = document.querySelectorAll("#p03-stream-out .af-stream-token").length;
          document.getElementById("p03-stream-finish")?.click();
          await wait(260);
          const streamCompletedText = document.getElementById("p03-stream-out")?.getAttribute("data-completed");
          const streamStableFinal = document.getElementById("p03-stream-stable")?.textContent;
          const streamTokensAfterSettle = document.querySelectorAll("#p03-stream-out .af-stream-token").length;

          return {
            phaseWhilePendingPromise,
            ariaBusyWhilePending,
            phaseAfterResolve,
            receiptHeightMatchesDynamicDom: recordOffsetHeight > 48 && approvalInlineHeight === recordOffsetHeight,
            ghostMountedInPortal: Boolean(ghostEl),
            ghostOnBodyDirect,
            doneColHasDrop,
            card101InDone,
            ghostCleanedUp,
            unassignedChangedOnBlankDrop: unassignedAfterBlankDrop !== initialUnassigned,
            agentDropHighlight,
            assignedCountOnDirectDrop: initialUnassigned - unassignedAfterAgentDrop,
            planReorderedFirstTwo:
              planStepsBefore.length >= 2 &&
              planStepsAfter[0] === planStepsBefore[1] &&
              planStepsAfter[1] === planStepsBefore[0],
            overflowNarrowCollapsed: visibleItemsNarrow < 6 && overflowBadgeNarrow === \`+\${6 - visibleItemsNarrow}\`,
            overflowWideExpanded: visibleItemsWide === 6 && overflowBadgeWide === null,
            scrubbingAttrMid,
            scrubValNormal,
            scrubValShift,
            streamHadAnimatedTokens: streamTokenCountMid > 0,
            streamCompletedText,
            streamStableFinal,
            streamTokensAfterSettle,
          };
        } finally {
          unmount();
        }
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as { result: { value: Record<string, unknown> } };

    expect(res.result.value).toEqual({
      phaseWhilePendingPromise: "busy",
      ariaBusyWhilePending: "true",
      phaseAfterResolve: "approved",
      receiptHeightMatchesDynamicDom: true,
      ghostMountedInPortal: true,
      ghostOnBodyDirect: false,
      doneColHasDrop: true,
      card101InDone: true,
      ghostCleanedUp: true,
      unassignedChangedOnBlankDrop: false,
      agentDropHighlight: "true",
      assignedCountOnDirectDrop: 1,
      planReorderedFirstTwo: true,
      overflowNarrowCollapsed: true,
      overflowWideExpanded: true,
      scrubbingAttrMid: "true",
      scrubValNormal: 60,
      scrubValShift: 100,
      streamHadAnimatedTokens: true,
      streamCompletedText: "Aster 🚀 流式渲染完成",
      streamStableFinal: "Aster 🚀 流式渲染完成",
      streamTokensAfterSettle: 0,
    });
  });

  it("verifies P0-4 AppMark, OverflowTagList, HotkeyInput, NumberInput scrub/unit/commit, AutoComplete groups, DateTimeRangePicker zh-CN, Dropzone paste/abort, Table tri-state/sticky/expand, Resizable persistence/snap, ImagePreview zoom/checkerboard, Tree cascade/search, and interactive Sparkline", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const firePointer = (target, type, x, y, extra = {}) => {
          target.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              composed: true,
              pointerId: 1,
              pointerType: "mouse",
              isPrimary: true,
              button: 0,
              buttons: type === "pointerup" ? 0 : 1,
              clientX: x,
              clientY: y,
              ...extra,
            }),
          );
        };

        const unmount = window.__p04WorkbenchBridge.mount();
        await wait(90);

        try {
          // 1. AfOverflowTagList narrow collapse -> popover -> widen expand
          const moreBtn = document.querySelector("#p04-tags-wrap .af-overflow-tags__more");
          const collapsedLabel = moreBtn?.textContent?.trim() ?? null;
          moreBtn?.click();
          await wait(50);
          const overflowPopVisible = Boolean(document.querySelector(".af-overflow-tags__pop"));
          moreBtn?.click();
          await wait(40);
          document.getElementById("p04-tags-widen")?.click();
          await wait(70);
          const moreAfterWiden = document.querySelector("#p04-tags-wrap .af-overflow-tags__more");

          // 2. AfHotkeyInput record combo + conflict interception + reset
          const hkBox = document.querySelector("#p04-hotkey-zone .af-hotkey__field");
          hkBox?.click();
          await wait(30);
          const hkRecording = document.querySelector("#p04-hotkey-zone .af-hotkey")?.getAttribute("data-recording");
          hkBox?.dispatchEvent(
            new KeyboardEvent("keydown", { key: "c", code: "KeyC", ctrlKey: true, bubbles: true, cancelable: true }),
          );
          await wait(30);
          const hkConflictMsg = document.querySelector("#p04-hotkey-zone .af-hotkey__msg")?.textContent?.trim() ?? "";
          const hkValAfterConflict = document.getElementById("p04-hotkey-zone")?.getAttribute("data-val");

          hkBox?.click();
          await wait(20);
          hkBox?.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "P",
              code: "KeyP",
              ctrlKey: true,
              shiftKey: true,
              bubbles: true,
              cancelable: true,
            }),
          );
          await wait(30);
          const hkValAfterRecord = document.getElementById("p04-hotkey-zone")?.getAttribute("data-val");
          document.querySelector("#p04-hotkey-zone .af-hotkey__reset")?.click();
          await wait(30);
          const hkValAfterReset = document.getElementById("p04-hotkey-zone")?.getAttribute("data-val");

          // 3. AfNumberInput scrub + commitMode="blur" + unitOptions switcher
          const scrubHandle = document.querySelector('#p04-number-zone [data-scrub-handle="true"]');
          scrubHandle?.scrollIntoView({ block: "center" });
          await wait(20);
          const shRect = scrubHandle.getBoundingClientRect();
          firePointer(scrubHandle, "pointerdown", shRect.left + 8, shRect.top + 8);
          firePointer(scrubHandle, "pointermove", shRect.left + 32, shRect.top + 8); // +24px / 6px = +4 steps * 2 = +8 => 28
          firePointer(scrubHandle, "pointerup", shRect.left + 32, shRect.top + 8);
          await wait(30);
          const numAfterScrub = Number(document.getElementById("p04-number-zone")?.getAttribute("data-val"));
          const committedAfterScrub = Number(document.getElementById("p04-number-zone")?.getAttribute("data-committed"));

          const numInput = document.querySelector("#p04-number-zone input.af-number__input");
          numInput?.focus();
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
          setter.call(numInput, "64");
          numInput?.dispatchEvent(new Event("input", { bubbles: true }));
          await wait(25);
          const valBeforeBlur = Number(document.getElementById("p04-number-zone")?.getAttribute("data-val"));
          numInput?.blur();
          numInput?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
          await wait(25);
          const valAfterBlur = Number(document.getElementById("p04-number-zone")?.getAttribute("data-val"));
          const committedAfterBlur = Number(document.getElementById("p04-number-zone")?.getAttribute("data-committed"));

          document.querySelector("#p04-number-zone .af-number__unit-select")?.click();
          await wait(50);
          const tbUnitBtn = [...document.querySelectorAll(".af-number__unit-option")].find((b) => b.textContent?.trim() === "TB");
          tbUnitBtn?.click();
          await wait(40);
          const unitAfterSwitch = document.getElementById("p04-number-zone")?.getAttribute("data-unit");

          // 4. AfAutoComplete group header + removable option button
          const acInput = document.querySelector('#p04-ac-zone input[role="combobox"]');
          acInput?.focus();
          acInput?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
          await wait(60);
          const acGroupCount = document.querySelectorAll(".af-autocomplete__group-head").length;
          const acRemoveBtn = document.querySelector(".af-autocomplete__opt-remove");
          acRemoveBtn?.click();
          await wait(40);
          const acCountAfterRemove = Number(document.getElementById("p04-ac-zone")?.getAttribute("data-count"));
          acInput?.blur();

          // 5. AfDateTimeRangePicker zh-CN + showSeconds + preset click
          document.querySelector("#p04-dtrp-zone .af-select__trigger")?.click();
          await wait(70);
          const dtrpPop = document.querySelector(".af-datetimerangepicker__pop");
          const dtrpTimeCols = dtrpPop ? dtrpPop.querySelectorAll(".af-timepicker__col").length : 0;
          const dtrpPresetBtn = [...(dtrpPop?.querySelectorAll(".af-datetimepicker__preset") ?? [])].find((b) =>
            b.textContent?.includes("近 7 天"),
          );
          dtrpPresetBtn?.click();
          await wait(60);
          const dtrpApplied = document.getElementById("p04-dtrp-zone")?.getAttribute("data-has-range");

          // 6. AfDropzone allowPaste + AbortController cancel -> status="canceled"
          const dropSurface = document.querySelector("#p04-drop-zone .af-in-drop__zone");
          const dt = new DataTransfer();
          dt.items.add(new File(["hello-aster"], "clipboard.png", { type: "image/png" }));
          const pasteEvt = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: dt });
          dropSurface?.dispatchEvent(pasteEvt);
          await wait(60);
          const statusWhileHashing = document.querySelector("#p04-drop-zone .af-in-drop__row")?.getAttribute("data-status");
          document.querySelector("#p04-drop-zone .af-in-drop__cancel")?.click();
          await wait(60);
          const statusAfterCancel = document.querySelector("#p04-drop-zone .af-in-drop__row")?.getAttribute("data-status");

          // 7. AfTable tri-state sort (ascending -> descending -> none), horizontal sticky shadow ping, expandable row
          const latSortBtn = [...document.querySelectorAll("#p04-table-zone th button.af-table__sort-btn")].find((b) =>
            b.textContent?.includes("延迟"),
          );
          const latTh = latSortBtn?.closest("th");
          latSortBtn?.click();
          await wait(30);
          const sort1 = latTh?.getAttribute("aria-sort");
          latSortBtn?.click();
          await wait(30);
          const sort2 = latTh?.getAttribute("aria-sort");
          latSortBtn?.click();
          await wait(30);
          const sort3 = latTh?.getAttribute("aria-sort");

          const tableWrap = document.querySelector("#p04-table-zone .af-table-wrap");
          const pingRightInitial = tableWrap?.getAttribute("data-ping-right");
          if (tableWrap) {
            tableWrap.scrollLeft = 60;
            tableWrap.dispatchEvent(new Event("scroll"));
          }
          await wait(40);
          const pingLeftAfterScroll = tableWrap?.getAttribute("data-ping-left");

          document.querySelector("#p04-table-zone .af-table__expand-btn")?.click();
          await wait(30);
          const expandedDetailText = document.querySelector("#p04-table-zone .p04-exp-detail")?.textContent?.trim();

          // 8. AfResizableGroup drag-below-min snap collapse, localStorage persistence, double-click reset
          const splitHandle = document.querySelector("#p04-split-zone .af-resizable__handle");
          splitHandle?.scrollIntoView({ block: "center" });
          await wait(20);
          const hRect = splitHandle.getBoundingClientRect();
          firePointer(splitHandle, "pointerdown", hRect.left + 3, hRect.top + 20);
          firePointer(splitHandle, "pointermove", hRect.left - 155, hRect.top + 20);
          firePointer(splitHandle, "pointerup", hRect.left - 155, hRect.top + 20);
          await wait(40);
          const leftCollapsedAfterSnap = Boolean(document.querySelector("#p04-split-zone .af-resizable__panel[data-collapsed='true']"));
          const persistedJson = Boolean(localStorage.getItem("af-resizable:p04-test-split"));
          splitHandle?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
          await wait(40);
          const leftExpandedAfterDblClick = !document.querySelector("#p04-split-zone .af-resizable__panel[data-collapsed='true']");

          // 9. AfImagePreview wheel zoom + double-click toggle/reset + filmstrip + checkerboard
          document.getElementById("p04-open-preview")?.click();
          await wait(60);
          const stage = document.querySelector(".af-image-preview__stage");
          const stageRect = stage.getBoundingClientRect();
          stage?.dispatchEvent(
            new WheelEvent("wheel", {
              deltaY: -120,
              clientX: stageRect.left + stageRect.width / 2,
              clientY: stageRect.top + stageRect.height / 2,
              bubbles: true,
              cancelable: true,
            }),
          );
          await wait(40);
          const zoomTextAfterWheel = document.querySelector(".af-image-preview__zoom")?.textContent?.trim();
          const previewImg = document.querySelector(".af-image-preview__img");
          previewImg?.dispatchEvent(
            new MouseEvent("dblclick", {
              clientX: stageRect.left + stageRect.width / 2,
              clientY: stageRect.top + stageRect.height / 2,
              bubbles: true,
            }),
          );
          await wait(40);
          const zoomTextAfterReset = document.querySelector(".af-image-preview__zoom")?.textContent?.trim();
          document.querySelector('[aria-label="切换透明棋盘格衬底"]')?.click();
          await wait(30);
          const checkerboardActive = previewImg?.getAttribute("data-checkerboard");
          const thumbs = document.querySelectorAll(".af-image-preview__thumb");
          thumbs[1]?.click();
          await wait(30);
          const counterAfterThumb = document.querySelector(".af-image-preview__counter")?.textContent?.trim();
          document.querySelector('[aria-label="关闭预览"]')?.click();
          await wait(160);

          // 10. AfTree tri-state cascading check + search highlight + AfSparkline interactive magnetic cursor
          const parentIndet = document.querySelector("#p04-tree-zone .af-tree__item[data-tree-key='p1'] .af-check__box")?.getAttribute("data-indeterminate");
          const treeMarkText = document.querySelector("#p04-tree-zone mark.af-tree__highlight")?.textContent?.trim();
          document.querySelector("#p04-tree-zone .af-tree__item[data-tree-key='p1'] input[type='checkbox']")?.click();
          await wait(30);
          const checkedAfterParentClick = document.getElementById("p04-tree-zone")?.getAttribute("data-checked");

          const sparkWrap = document.querySelector("#p04-spark-zone .af-spark-wrap");
          sparkWrap?.scrollIntoView({ block: "center" });
          await wait(20);
          const spRect = sparkWrap.getBoundingClientRect();
          firePointer(sparkWrap, "pointermove", spRect.left + spRect.width * 0.5, spRect.top + spRect.height * 0.5);
          await wait(30);
          const sparkReadout = document.querySelector("#p04-spark-zone .af-spark__readout")?.textContent?.trim();
          const sparkCursorPresent = Boolean(document.querySelector("#p04-spark-zone .af-spark__cursor"));

          const qrRects = document.querySelectorAll("#p04-qr-zone .af-qr-card__svg path").length;

          return {
            collapsedHasPlus: Boolean(collapsedLabel && collapsedLabel.startsWith("+")),
            overflowPopVisible,
            moreHiddenAfterWiden: moreAfterWiden === null,
            hkRecording,
            hkConflictIntercepted: hkConflictMsg.includes("冲突") && hkValAfterConflict === "Mod+K",
            hkValAfterRecord,
            hkValAfterReset,
            numAfterScrub,
            committedAfterScrub,
            valBeforeBlur,
            valAfterBlur,
            committedAfterBlur,
            unitAfterSwitch,
            acGroupCount,
            acCountAfterRemove,
            dtrpHasThreeTimeCols: dtrpTimeCols === 3,
            dtrpApplied,
            statusWhileHashing,
            statusAfterCancel,
            sortCycle: [sort1, sort2, sort3],
            pingRightInitial,
            pingLeftAfterScroll,
            expandedDetailText,
            leftCollapsedAfterSnap,
            persistedJson,
            leftExpandedAfterDblClick,
            zoomIncreasedOnWheel: zoomTextAfterWheel !== "100%",
            zoomTextAfterReset,
            checkerboardActive,
            counterAfterThumb,
            parentIndet,
            treeMarkText,
            checkedAllChildren: checkedAfterParentClick?.includes("c1") && checkedAfterParentClick?.includes("c2"),
            sparkCursorPresent,
            sparkReadoutHasT3: Boolean(sparkReadout && sparkReadout.includes("T3") && sparkReadout.includes("40")),
            qrRenderedPath: qrRects >= 1,
          };
        } finally {
          unmount();
        }
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as { result: { value: Record<string, unknown> } };

    expect(res.result.value).toEqual({
      collapsedHasPlus: true,
      overflowPopVisible: true,
      moreHiddenAfterWiden: true,
      hkRecording: "true",
      hkConflictIntercepted: true,
      hkValAfterRecord: "Ctrl+Shift+P",
      hkValAfterReset: "Alt+Space",
      numAfterScrub: 28,
      committedAfterScrub: 28,
      valBeforeBlur: 28,
      valAfterBlur: 64,
      committedAfterBlur: 64,
      unitAfterSwitch: "TB",
      acGroupCount: 2,
      acCountAfterRemove: 2,
      dtrpHasThreeTimeCols: true,
      dtrpApplied: "true",
      statusWhileHashing: "hashing",
      statusAfterCancel: "canceled",
      sortCycle: ["ascending", "descending", null],
      pingRightInitial: "true",
      pingLeftAfterScroll: "true",
      expandedDetailText: "Expanded:Node-B",
      leftCollapsedAfterSnap: true,
      persistedJson: true,
      leftExpandedAfterDblClick: true,
      zoomIncreasedOnWheel: true,
      zoomTextAfterReset: "100%",
      checkerboardActive: "true",
      counterAfterThumb: "2 / 2",
      parentIndet: "true",
      treeMarkText: "日志",
      checkedAllChildren: true,
      sparkCursorPresent: true,
      sparkReadoutHasT3: true,
      qrRenderedPath: true,
    });
  });

  it("v0.5.1 real-browser imperative AfModal.confirm (await & destroy) and afMessage.dismissByKey exit transitions", async () => {
    const res = (await send("Runtime.evaluate", {
      expression: `(async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const { AfModal, afMessage } = window.__AsterRuntime;

        // 1. Imperative AfModal.confirm resolves true on confirm click with async loading guard
        let okCalled = false;
        const p1 = AfModal.confirm({
          title: "确认卸载扩展？",
          content: "卸载后本地工作区缓存仍会保留。",
          okText: "确认卸载",
          cancelText: "保留",
          tone: "danger",
          onOk: async () => {
            await wait(35);
            okCalled = true;
          },
        });
        await wait(30);
        const dialogEl = document.querySelector(".af-modal__panel");
        const renderedInPortal = Boolean(dialogEl && dialogEl.closest(".af-portal-root"));
        const descPromoted = dialogEl?.querySelector(".af-modal__desc")?.textContent === "卸载后本地工作区缓存仍会保留。";
        const okBtn = Array.from(dialogEl?.querySelectorAll(".af-modal__foot button") ?? []).find((b) =>
          b.textContent?.includes("确认卸载"),
        );
        okBtn?.click();
        const resolvedTrue = await p1;
        await wait(220);

        // 2. Imperative AfModal.confirm handle.destroy() closes cleanly and resolves false
        const handle = AfModal.confirm({
          title: "已存在同名条目",
          content: "请选择替换或跳过。",
        });
        await wait(25);
        const openBeforeDestroy = Boolean(document.querySelector(".af-modal__panel"));
        handle.destroy();
        const resolvedFalse = (await handle) === false;
        await wait(220);
        const unmountedAfterExit = !document.querySelector(".af-modal__panel");

        // 3. afMessage title + dismissByKey triggers smooth [data-leaving] exit
        afMessage.destroy();
        await wait(20);
        afMessage.open({ key: "undo-op", type: "info", title: "已归档", content: "支持随时撤销", duration: 0 });
        await wait(25);
        const msgEl = document.querySelector(".af-message");
        const hasTitle = msgEl?.querySelector(".af-message__title")?.textContent === "已归档";
        afMessage.dismissByKey("undo-op");
        await wait(20);
        const hadLeavingAttr = document.querySelector(".af-message")?.getAttribute("data-leaving") === "true";
        await wait(180);
        const msgRemoved = !document.querySelector(".af-message");

        return {
          renderedInPortal,
          descPromoted,
          okCalled,
          resolvedTrue,
          openBeforeDestroy,
          resolvedFalse,
          unmountedAfterExit,
          hasTitle,
          hadLeavingAttr,
          msgRemoved,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    })) as { result: { value: Record<string, unknown> } };

    expect(res.result.value).toEqual({
      renderedInPortal: true,
      descPromoted: true,
      okCalled: true,
      resolvedTrue: true,
      openBeforeDestroy: true,
      resolvedFalse: true,
      unmountedAfterExit: true,
      hasTitle: true,
      hadLeavingAttr: true,
      msgRemoved: true,
    });
  });
});
