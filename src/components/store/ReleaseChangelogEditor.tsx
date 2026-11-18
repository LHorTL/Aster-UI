import { useMemo, type ReactNode } from "react";
import {
  AfButton,
  AfDateTimePicker,
  AfIcon,
  AfInput,
  AfSegmented,
  AfSwitch,
  AfTag,
  AfTextarea,
  cn,
  useControllableState,
  useExitTransition,
} from "../../ui";
import { useTween } from "../../ui-pro";

export type AfSemverBumpKind = "patch" | "minor" | "major";
export type AfChangelogViewMode = "split" | "edit" | "preview";

export interface AfSigningCertComparison {
  previousSubject: string;
  previousFingerprint: string;
  nextSubject: string;
  nextFingerprint: string;
  validUntil: string;
}

export interface AfReleaseChangelogDraft {
  version: string;
  channel: "stable" | "beta";
  markdown: string;
  scheduled: boolean;
  scheduledAt: string;
}

export interface AfReleaseChangelogEditorProps {
  /** 线上当前最新正式版本号。 */
  currentVersion?: string;
  /** 受控目标发布版本号。 */
  version?: string;
  /** 非受控初始版本号。 */
  defaultVersion?: string;
  /** 版本号变更回调。 */
  onVersionChange?: (nextVersion: string) => void;
  /** 发布渠道（`stable` | `beta`）。 */
  channel?: "stable" | "beta";
  defaultChannel?: "stable" | "beta";
  onChannelChange?: (channel: "stable" | "beta") => void;
  /** 受控 Markdown 发行说明正文。 */
  markdown?: string;
  defaultMarkdown?: string;
  onMarkdownChange?: (markdown: string) => void;
  /** 编辑器布局模式（双栏对照 / 仅编辑 / 仅预览）。 */
  viewMode?: AfChangelogViewMode;
  defaultViewMode?: AfChangelogViewMode;
  onViewModeChange?: (mode: AfChangelogViewMode) => void;
  /** 是否启用定时生效发布。 */
  scheduled?: boolean;
  defaultScheduled?: boolean;
  onScheduledChange?: (scheduled: boolean) => void;
  /** 定时发布时间（`YYYY-MM-DD HH:mm`）。 */
  scheduledAt?: string;
  defaultScheduledAt?: string;
  onScheduledAtChange?: (scheduledAt: string) => void;
  /** 代码签名证书指纹新旧对比信息。 */
  certificate?: AfSigningCertComparison;
  /** 保存草稿回调。 */
  onSaveDraft?: (draft: AfReleaseChangelogDraft) => void;
  /** 提交发布回调。 */
  onPublish?: (draft: AfReleaseChangelogDraft) => void;
  className?: string;
}

/** 根据当前 Semver 版本号推算 `patch / minor / major` 下一版本号。 */
export function bumpSemverVersion(current: string, kind: AfSemverBumpKind): string {
  const cleaned = current.trim().replace(/^v/i, "");
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(cleaned);
  if (!match) return "1.0.0";
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const DEFAULT_MARKDOWN = `### ✨ 核心特性更新
- **多轨时间码磁吸对齐**：新增关键节点吸附与逐帧精准定位支持
- **离线词库增量包**：冷启动内存占用降低 \`34%\`，首屏唤醒速度显著提升

### 🐛 问题修复与安全加固
- 优化高分屏多显示器切换时的窗口布局自适应表现
- 升级扩展安装包离线数字签名与完整性校验机制`;

const DEFAULT_CERT: AfSigningCertComparison = {
  previousSubject: "CN=CloudDesk Release G2, O=CloudDesk Inc.",
  previousFingerprint: "9F:4B:18:C2:77:A0:3E:91:5D:88:12:E4",
  nextSubject: "CN=CloudDesk Release G3, O=CloudDesk Inc.",
  nextFingerprint: "3A:E9:04:71:B6:2F:8C:19:D0:45:7E:11",
  validUntil: "2028-06-30",
};

function renderInlineMarkdown(line: string): ReactNode[] {
  const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((seg, i) => {
    if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 2) {
      return (
        <code key={i} className="af-store-release__md-code">
          {seg.slice(1, -1)}
        </code>
      );
    }
    if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4) {
      return <strong key={i}>{seg.slice(2, -2)}</strong>;
    }
    return seg;
  });
}

function renderMarkdownBlocks(src: string): ReactNode {
  const lines = src.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listItems: ReactNode[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length > 0) {
      blocks.push(
        <ul key={`${keyPrefix}-ul`} className="af-store-release__md-list">
          {listItems}
        </ul>,
      );
      listItems = [];
    }
  };

  lines.forEach((raw, idx) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      flushList(`b-${idx}`);
      return;
    }
    if (trimmed.startsWith("### ")) {
      flushList(`b-${idx}`);
      blocks.push(
        <h5 key={`h-${idx}`} className="af-store-release__md-h">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h5>,
      );
      return;
    }
    if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      flushList(`b-${idx}`);
      const content = trimmed.replace(/^#{1,2}\s+/, "");
      blocks.push(
        <h4 key={`h2-${idx}`} className="af-store-release__md-h4">
          {renderInlineMarkdown(content)}
        </h4>,
      );
      return;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(<li key={`li-${idx}`}>{renderInlineMarkdown(trimmed.slice(2))}</li>);
      return;
    }
    flushList(`b-${idx}`);
    blocks.push(
      <p key={`p-${idx}`} className="af-store-release__md-p">
        {renderInlineMarkdown(trimmed)}
      </p>,
    );
  });

  flushList("end");

  if (blocks.length === 0) {
    return <span className="af-store-release__md-empty">暂无发行说明正文，请在左侧输入 Markdown…</span>;
  }
  return blocks;
}

/**
 * 商城发布后台 · 版本发行说明与定时重签工作台（`P2-3`）：
 * - Semver Patch / Minor / Major 智能升位步进器；
 * - 双栏实时 Markdown 编辑与高保真预览；
 * - 本地化 `AfDateTimePicker` 定时生效开关与代码签名证书指纹变更预警。
 */
export function AfReleaseChangelogEditor({
  currentVersion = "2.4.1",
  version: versionProp,
  defaultVersion,
  onVersionChange,
  channel: channelProp,
  defaultChannel = "stable",
  onChannelChange,
  markdown: markdownProp,
  defaultMarkdown = DEFAULT_MARKDOWN,
  onMarkdownChange,
  viewMode: viewModeProp,
  defaultViewMode = "split",
  onViewModeChange,
  scheduled: scheduledProp,
  defaultScheduled = true,
  onScheduledChange,
  scheduledAt: scheduledAtProp,
  defaultScheduledAt = "2026-11-20 10:00",
  onScheduledAtChange,
  certificate = DEFAULT_CERT,
  onSaveDraft,
  onPublish,
  className,
}: AfReleaseChangelogEditorProps = {}) {
  const initialNext = defaultVersion ?? bumpSemverVersion(currentVersion, "patch");
  const [version, setVersion] = useControllableState<string>({
    value: versionProp,
    defaultValue: initialNext,
    onChange: onVersionChange,
  });
  const [channel, setChannel] = useControllableState<"stable" | "beta">({
    value: channelProp,
    defaultValue: defaultChannel,
    onChange: onChannelChange,
  });
  const [markdown, setMarkdown] = useControllableState<string>({
    value: markdownProp,
    defaultValue: defaultMarkdown,
    onChange: onMarkdownChange,
  });
  const [viewMode, setViewMode] = useControllableState<AfChangelogViewMode>({
    value: viewModeProp,
    defaultValue: defaultViewMode,
    onChange: onViewModeChange,
  });
  const [scheduled, setScheduled] = useControllableState<boolean>({
    value: scheduledProp,
    defaultValue: defaultScheduled,
    onChange: onScheduledChange,
  });
  const [scheduledAt, setScheduledAt] = useControllableState<string>({
    value: scheduledAtProp,
    defaultValue: defaultScheduledAt,
    onChange: onScheduledAtChange,
  });

  const patchCandidate = useMemo(() => bumpSemverVersion(currentVersion, "patch"), [currentVersion]);
  const minorCandidate = useMemo(() => bumpSemverVersion(currentVersion, "minor"), [currentVersion]);
  const majorCandidate = useMemo(() => bumpSemverVersion(currentVersion, "major"), [currentVersion]);

  const certChanged = certificate.previousFingerprint !== certificate.nextFingerprint;
  const smoothCharCount = Math.round(useTween(markdown.trim().length, 260));
  const scheduleExit = useExitTransition(scheduled, 160);

  const appendTemplate = (snippet: string) => {
    const next = markdown.trim() ? `${markdown.trimEnd()}\n\n${snippet}` : snippet;
    setMarkdown(next);
  };

  const draftPayload = (): AfReleaseChangelogDraft => ({
    version,
    channel,
    markdown,
    scheduled,
    scheduledAt,
  });

  return (
    <section className={cn("af-store-release", className)} aria-label="版本发行说明与定时发布配置">
      {/* 顶部版本号 Semver 智能升位栏 */}
      <div className="af-store-release__top">
        <div className="af-store-release__ver-group">
          <div className="af-store-release__ver-title">
            <span>线上基线版本</span>
            <AfTag tone="neutral" size="sm">
              v{currentVersion}
            </AfTag>
            <AfIcon name="arrowRight" size={12} />
            <strong>目标发布版本</strong>
          </div>
          <div className="af-store-release__ver-controls">
            <AfInput
              size="sm"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              aria-label="目标发布版本号"
              className="af-store-release__ver-input"
            />
            <div className="af-store-release__bump-pills" role="group" aria-label="Semver 快捷升位">
              {(
                [
                  { kind: "patch" as const, label: "Patch", target: patchCandidate },
                  { kind: "minor" as const, label: "Minor", target: minorCandidate },
                  { kind: "major" as const, label: "Major", target: majorCandidate },
                ] as const
              ).map((item) => {
                const active = version === item.target;
                return (
                  <button
                    key={item.kind}
                    type="button"
                    className="af-store-release__bump"
                    data-active={active ? "true" : undefined}
                    onClick={() => setVersion(item.target)}
                  >
                    <span>{item.label}</span>
                    <strong>v{item.target}</strong>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="af-store-release__channel">
          <span className="af-store-release__sub-label">分发通道</span>
          <AfSegmented<"stable" | "beta">
            size="xs"
            value={channel}
            onChange={setChannel}
            options={[
              { value: "stable", label: "正式通道" },
              { value: "beta", label: "测试通道" },
            ]}
          />
        </div>
      </div>

      {/* Markdown 双栏实时编辑与预览 */}
      <div className="af-store-release__editor-card">
        <div className="af-store-release__editor-bar">
          <div className="af-store-release__snippets">
            <span className="af-store-release__bar-title">更新说明正文</span>
            <button
              type="button"
              className="af-store-release__tpl-btn"
              onClick={() => appendTemplate("### ✨ 新增功能\n- 补充新特性描述")}
            >
              + 新增特性段落
            </button>
            <button
              type="button"
              className="af-store-release__tpl-btn"
              onClick={() => appendTemplate("### 🐛 缺陷修复\n- 修复已知稳定性问题")}
            >
              + 问题修复段落
            </button>
            <button
              type="button"
              className="af-store-release__tpl-btn"
              onClick={() => appendTemplate("### ⚠️ 升级说明\n- 建议将客户端升级至最新版本")}
            >
              + 升级说明
            </button>
          </div>

          <AfSegmented<AfChangelogViewMode>
            size="xs"
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: "split", label: "双栏对照" },
              { value: "edit", label: "编辑" },
              { value: "preview", label: "预览" },
            ]}
          />
        </div>

        <div key={viewMode} className="af-store-release__panes af-pj-panel-in" data-mode={viewMode}>
          {viewMode !== "preview" ? (
            <div className="af-store-release__pane af-store-release__pane--edit">
              <AfTextarea
                rows={8}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                aria-label="更新说明内容"
                placeholder="输入版本更新内容（支持 ### 标题、列表、行内代码与加粗）…"
              />
            </div>
          ) : null}

          {viewMode !== "edit" ? (
            <div
              className="af-store-release__pane af-store-release__pane--preview"
              aria-label="更新说明实时预览"
            >
              <div className="af-store-release__preview-head">
                <strong>v{version} 更新日志预览</strong>
                <AfTag tone={channel === "beta" ? "warning" : "success"} size="sm">
                  {channel === "beta" ? "测试通道" : "正式通道"}
                </AfTag>
              </div>
              <div className="af-store-release__md-body">{renderMarkdownBlocks(markdown)}</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* 底部双卡：定时发布配置 + 代码签名证书指纹新旧比对 */}
      <div className="af-store-release__bottom">
        <div className="af-store-release__schedule-card">
          <div className="af-store-release__schedule-top">
            <div className="af-store-release__schedule-label">
              <AfIcon name="clock" size={14} />
              <div>
                <strong>定时自动上架生效</strong>
                <span>到达设定时间后自动上架并向客户端推送更新通知</span>
              </div>
            </div>
            <AfSwitch
              checked={scheduled}
              onCheckedChange={setScheduled}
              aria-label="启用定时发布"
            />
          </div>
          {scheduleExit.mounted ? (
            <div
              className="af-store-release__schedule-picker af-pj-panel-in"
              data-closing={scheduleExit.closing ? "true" : undefined}
              style={scheduleExit.closing ? { opacity: 0, transition: "opacity 140ms ease-in" } : undefined}
            >
              <AfDateTimePicker
                size="sm"
                locale="zh-CN"
                disabled={!scheduled}
                value={scheduledAt}
                onChange={setScheduledAt}
                label="定时发布时间"
              />
              <span className="af-store-release__tz">UTC+08:00 北京时间</span>
            </div>
          ) : null}
        </div>

        <div
          className="af-store-release__cert-card"
          data-changed={certChanged ? "true" : undefined}
        >
          <div className="af-store-release__cert-head">
            <div className="af-store-release__cert-title">
              <AfIcon name={certChanged ? "alert" : "shield"} size={14} />
              <strong>代码签名证书比对</strong>
            </div>
            <AfTag tone={certChanged ? "warning" : "success"} size="sm">
              {certChanged ? "检测到证书变更" : "签名一致"}
            </AfTag>
          </div>

          <div className="af-store-release__cert-rows">
            <div className="af-store-release__cert-row">
              <span>线上旧证书</span>
              <code>{certificate.previousFingerprint}</code>
            </div>
            <div className="af-store-release__cert-row">
              <span>本次包签名</span>
              <code data-highlight={certChanged ? "true" : undefined}>
                {certificate.nextFingerprint}
              </code>
            </div>
          </div>

          {certChanged ? (
            <p className="af-store-release__cert-warn">
              新旧签名证书不一致（有效期至 {certificate.validUntil}），客户端自动更新时将提示确认新的发布者签名。
            </p>
          ) : null}
        </div>
      </div>

      {/* 操作底栏 */}
      <div className="af-store-release__foot">
        <span className="af-store-release__foot-meta" style={{ fontVariantNumeric: "tabular-nums" }}>
          字数统计：{smoothCharCount} 字符 · {scheduled ? `将于 ${scheduledAt} 自动发布` : "审核通过后立即全量生效"}
        </span>
        <div className="af-store-release__foot-actions">
          <AfButton size="sm" variant="secondary" onClick={() => onSaveDraft?.(draftPayload())}>
            保存草稿
          </AfButton>
          <AfButton
            size="sm"
            variant="primary"
            icon="send"
            onClick={() => onPublish?.(draftPayload())}
          >
            {scheduled ? "提交定时发布单" : "立即推送上线"}
          </AfButton>
        </div>
      </div>
    </section>
  );
}
