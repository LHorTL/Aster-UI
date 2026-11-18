import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AfButton,
  AfCopyButton,
  AfIcon,
  AfIconButton,
  AfInput,
  AfSegmented,
  AfTag,
  cn,
  useAutoScrollStick,
  useControllableState,
  useExitTransition,
} from "../../ui";

export type AfJobStageState = "done" | "running" | "queued" | "failed";

export interface AfJobStageItem {
  id: string;
  label: string;
  state: AfJobStageState;
  /** 已消耗毫秒数。 */
  elapsedMs: number;
}

export interface AfJobStageTimerProps {
  /** 流水线阶段数组。 */
  stages?: AfJobStageItem[];
  /** 排列方向（横向步骤条 / 纵向列表）。 */
  orientation?: "horizontal" | "vertical";
  /** 是否开启真实客户端毫秒跳动计时（默认 `false` 保持静态确定性快照，运行时可设 `true`）。 */
  liveTick?: boolean;
  className?: string;
}

const DEFAULT_JOB_STAGES: AfJobStageItem[] = [
  { id: "prep", label: "拉取构建缓存", state: "done", elapsedMs: 1840 },
  { id: "compile", label: "编译应用包与静态资源", state: "done", elapsedMs: 6420 },
  { id: "sign", label: "数字证书签名", state: "running", elapsedMs: 3280 },
  { id: "cdn", label: "分发至下载节点", state: "queued", elapsedMs: 0 },
];

export function formatStageMs(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  const totalSec = Math.floor(clamped / 1000);
  const centis = Math.floor((clamped % 1000) / 10);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins > 0) {
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
  }
  return `${secs}.${String(centis).padStart(2, "0")}s`;
}

/**
 * 毫秒级流水线阶段计时器（`P2-3`）：
 * - 全程 `tabular-nums` 等宽数字，零跳动展示各阶段耗时与总耗时。
 */
export function AfJobStageTimer({
  stages = DEFAULT_JOB_STAGES,
  orientation = "horizontal",
  liveTick = false,
  className,
}: AfJobStageTimerProps = {}) {
  const [extraMs, setExtraMs] = useState(0);

  useEffect(() => {
    if (!liveTick) {
      setExtraMs(0);
      return;
    }
    const hasRunning = stages.some((s) => s.state === "running");
    if (!hasRunning) return;
    const started = performance.now();
    const id = window.setInterval(() => {
      setExtraMs(Math.floor(performance.now() - started));
    }, 50);
    return () => window.clearInterval(id);
  }, [liveTick, stages]);

  const totalMs = stages.reduce(
    (acc, st) => acc + st.elapsedMs + (st.state === "running" ? extraMs : 0),
    0,
  );

  return (
    <div
      className={cn("af-job-timer", className)}
      data-orientation={orientation}
      aria-label="构建发布阶段耗时"
    >
      <div className="af-job-timer__stages">
        {stages.map((st, idx) => {
          const ms = st.elapsedMs + (st.state === "running" ? extraMs : 0);
          return (
            <div key={st.id} className="af-job-timer__step" data-state={st.state}>
              <span className="af-job-timer__badge" aria-hidden="true">
                {st.state === "done" ? (
                  <AfIcon name="check" size={11} />
                ) : st.state === "failed" ? (
                  <AfIcon name="x" size={11} />
                ) : (
                  idx + 1
                )}
              </span>
              <div className="af-job-timer__meta">
                <strong>{st.label}</strong>
                <span>{st.state === "queued" ? "等待中" : formatStageMs(ms)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="af-job-timer__total">
        <span>累计总耗时</span>
        <strong>{formatStageMs(totalMs)}</strong>
      </div>
    </div>
  );
}

export type AfLogLevel = "INFO" | "WARN" | "ERROR";
export type AfLogLevelFilter = "ALL" | AfLogLevel;

export interface AfLogLineItem {
  id: string;
  timestamp: string;
  level: AfLogLevel;
  message: string;
}

export interface AfLogTailViewerProps {
  /** 终端标题。 */
  title?: string;
  /** 受控日志行数组。 */
  lines?: AfLogLineItem[];
  /** 非受控初始日志行数组。 */
  defaultLines?: AfLogLineItem[];
  /** 日志行数组变化回调（如模拟追加或外部联动）。 */
  onLinesChange?: (lines: AfLogLineItem[]) => void;
  /** 配套顶栏阶段计时器数据（传 `null` 隐藏）。 */
  stages?: AfJobStageItem[] | null;
  /** 级别过滤受控值。 */
  levelFilter?: AfLogLevelFilter;
  defaultLevelFilter?: AfLogLevelFilter;
  onLevelFilterChange?: (level: AfLogLevelFilter) => void;
  /** 视口固定像素高度（默认 `240`）。 */
  viewportHeight?: number;
  /** 初始是否触底粘滞（默认 `true`）。 */
  defaultStuck?: boolean;
  /** 点击模拟追加一行流式日志（便于交互演示与测试）。 */
  allowSimulateAppend?: boolean;
  className?: string;
}

const DEFAULT_LOG_LINES: AfLogLineItem[] = [
  { id: "l-01", timestamp: "10:42:01.120", level: "INFO", message: "[builder] 正在读取版本配置 translate-workbench@2.4.2" },
  { id: "l-02", timestamp: "10:42:02.045", level: "INFO", message: "[bundle] 已打包 142 个模块与样式资源 (842ms)" },
  { id: "l-03", timestamp: "10:42:03.310", level: "INFO", message: "[pack] 安装包归档完成：48.0 MB，开始计算 16 个分片校验值" },
  { id: "l-04", timestamp: "10:42:04.880", level: "WARN", message: "[cert-check] 检测到新版发布证书 Release G3，已自动启用过渡期兼容签名" },
  { id: "l-05", timestamp: "10:42:06.102", level: "INFO", message: "[upload] 分片 #01 ~ #12 上传校验完成 (18.6 MB/s)" },
  { id: "l-06", timestamp: "10:42:07.419", level: "WARN", message: "[upload] 分片 #15 节点响应超时，已切换备用线路重试" },
  { id: "l-07", timestamp: "10:42:08.205", level: "INFO", message: "[upload] 分片 #15 重传成功，等待云端合并校验…" },
  { id: "l-08", timestamp: "10:42:09.640", level: "ERROR", message: "[policy-audit] 新增权限 fs.userDictionary 需安全管理员复核通过后生效" },
  { id: "l-09", timestamp: "10:42:10.012", level: "INFO", message: "[signer] 离线时间戳签名注入中，等待审核确认…" },
];

function highlightKeyword(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, idx) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={idx} className="af-log-tail__mark">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/**
 * 商城发布后台 · 流式构建签名终端日志台（`P2-3`）：
 * - 底层直连 `useAutoScrollStick`：用户主动上滚查阅历史时自动暂停跟底并累计未读数，浮现「↓ 新增 N 行日志」回底胶囊；
 * - 支持级别过滤（`ALL / INFO / WARN / ERROR`）、关键词高亮上下跳转与一键全量复制；
 * - 100% 语义令牌配色，零违禁裸 `#hex`。
 */
export function AfLogTailViewer({
  title = "构建与签名实时日志 · 任务 #8942",
  lines: linesProp,
  defaultLines = DEFAULT_LOG_LINES,
  onLinesChange,
  stages = DEFAULT_JOB_STAGES,
  levelFilter: levelProp,
  defaultLevelFilter = "ALL",
  onLevelFilterChange,
  viewportHeight = 236,
  defaultStuck = true,
  allowSimulateAppend = true,
  className,
}: AfLogTailViewerProps = {}) {
  const [lines, setLines] = useControllableState<AfLogLineItem[]>({
    value: linesProp,
    defaultValue: defaultLines,
    onChange: onLinesChange,
  });
  const [level, setLevel] = useControllableState<AfLogLevelFilter>({
    value: levelProp,
    defaultValue: defaultLevelFilter,
    onChange: (next) => {
      setActiveHitCursor(0);
      onLevelFilterChange?.(next);
    },
  });

  const [keyword, setKeyword] = useState("");
  const [activeHitCursor, setActiveHitCursor] = useState(0);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const visibleLines = useMemo(() => {
    if (level === "ALL") return lines;
    return lines.filter((l) => l.level === level);
  }, [lines, level]);

  const matchedIds = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return [];
    return visibleLines
      .filter((l) => l.message.toLowerCase().includes(q) || l.timestamp.includes(q))
      .map((l) => l.id);
  }, [visibleLines, keyword]);

  const stick = useAutoScrollStick<HTMLDivElement>({
    itemCount: visibleLines.length,
    threshold: 24,
    defaultStuck,
  });

  const pillExit = useExitTransition(!stick.isStuck, 140);
  const frozenUnreadRef = useRef(stick.unreadCount);
  if (!stick.isStuck) {
    frozenUnreadRef.current = stick.unreadCount;
  }

  const safeHitCursor =
    matchedIds.length === 0 ? 0 : Math.min(activeHitCursor, matchedIds.length - 1);

  const jumpHit = (delta: 1 | -1) => {
    if (matchedIds.length === 0) return;
    const nextIdx = (safeHitCursor + delta + matchedIds.length) % matchedIds.length;
    setActiveHitCursor(nextIdx);
    const targetId = matchedIds[nextIdx];
    const rowEl = targetId ? rowRefs.current[targetId] : null;
    const scroller = stick.containerRef.current;
    if (rowEl && scroller) {
      const scrollerRect = scroller.getBoundingClientRect();
      const rowRect = rowEl.getBoundingClientRect();
      if (rowRect.top < scrollerRect.top) {
        scroller.scrollTop += rowRect.top - scrollerRect.top - 8;
      } else if (rowRect.bottom > scrollerRect.bottom) {
        scroller.scrollTop += rowRect.bottom - scrollerRect.bottom + 8;
      }
    }
  };

  const appendSimulatedLine = () => {
    const seq = lines.length + 1;
    const nextLine: AfLogLineItem = {
      id: `l-${seq}-${Date.now()}`,
      timestamp: `10:42:${String(10 + (seq % 49)).padStart(2, "0")}.340`,
      level: seq % 5 === 0 ? "WARN" : "INFO",
      message: `[cdn-sync] 边缘节点 #${seq} 增量块同步校验通过 (SHA-256 OK)`,
    };
    setLines([...lines, nextLine]);
  };

  const fullCopyText = useMemo(
    () => visibleLines.map((l) => `${l.timestamp} [${l.level}] ${l.message}`).join("\n"),
    [visibleLines],
  );

  return (
    <section className={cn("af-log-tail", className)} aria-label={title}>
      {stages ? <AfJobStageTimer stages={stages} /> : null}

      <div className="af-log-tail__card">
        {/* 顶栏：标题 + 级别快筛 + 关键词上下跳转 + 一键复制 */}
        <div className="af-log-tail__bar">
          <div className="af-log-tail__title">
            <AfIcon name="terminal" size={14} />
            <strong>{title}</strong>
            <AfTag tone={stick.isStuck ? "success" : "neutral"} size="sm">
              {stick.isStuck ? "自动跟底中" : "已暂停滚动"}
            </AfTag>
          </div>

          <div className="af-log-tail__controls">
            <AfSegmented<AfLogLevelFilter>
              size="xs"
              value={level}
              onChange={setLevel}
              options={[
                { value: "ALL", label: "全部" },
                { value: "INFO", label: "信息" },
                { value: "WARN", label: "警告" },
                { value: "ERROR", label: "错误" },
              ]}
            />

            <div className="af-log-tail__search">
              <AfInput
                size="sm"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setActiveHitCursor(0);
                }}
                placeholder="检索日志关键词…"
                aria-label="检索日志关键词"
              />
              {keyword.trim() ? (
                <div className="af-log-tail__hit-nav">
                  <span>
                    {matchedIds.length === 0
                      ? "0/0"
                      : `${safeHitCursor + 1}/${matchedIds.length}`}
                  </span>
                  <AfIconButton
                    size="sm"
                    variant="ghost"
                    icon="chevronUp"
                    aria-label="上一个匹配行"
                    disabled={matchedIds.length === 0}
                    onClick={() => jumpHit(-1)}
                  />
                  <AfIconButton
                    size="sm"
                    variant="ghost"
                    icon="chevronDown"
                    aria-label="下一个匹配行"
                    disabled={matchedIds.length === 0}
                    onClick={() => jumpHit(1)}
                  />
                </div>
              ) : null}
            </div>

            {allowSimulateAppend ? (
              <AfButton
                size="sm"
                variant="secondary"
                icon="plus"
                onClick={appendSimulatedLine}
              >
                追加日志
              </AfButton>
            ) : null}

            <AfCopyButton text={fullCopyText} label="复制全量日志" />
          </div>
        </div>

        {/* 滚动终端视口 + 底部未读粘滞回底胶囊 */}
        <div className="af-log-tail__viewport-wrap">
          <div
            ref={stick.containerRef}
            {...stick.bindScroll}
            className="af-log-tail__viewport"
            style={{ height: viewportHeight }}
            role="log"
            aria-live="polite"
          >
            {visibleLines.map((line, idx) => {
              const isActiveHit =
                matchedIds.length > 0 && matchedIds[safeHitCursor] === line.id;
              return (
                <div
                  key={line.id}
                  ref={(el) => {
                    rowRefs.current[line.id] = el;
                  }}
                  className="af-log-tail__line"
                  data-level={line.level}
                  data-active-hit={isActiveHit ? "true" : undefined}
                >
                  <span className="af-log-tail__lineno">{idx + 1}</span>
                  <span className="af-log-tail__ts">{line.timestamp}</span>
                  <span className="af-log-tail__lvl">{line.level}</span>
                  <span className="af-log-tail__msg">
                    {highlightKeyword(line.message, keyword)}
                  </span>
                </div>
              );
            })}
          </div>

          {pillExit.mounted ? (
            <button
              type="button"
              className="af-log-tail__stick-pill"
              data-closing={pillExit.closing ? "true" : undefined}
              onClick={() => stick.scrollToBottom(true)}
            >
              <AfIcon name="arrowDown" size={12} />
              <span>
                {(pillExit.closing ? frozenUnreadRef.current : stick.unreadCount) > 0
                  ? `新增 ${pillExit.closing ? frozenUnreadRef.current : stick.unreadCount} 行日志 · 点击回到底部`
                  : "回到底部继续跟随"}
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
