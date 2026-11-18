import { useMemo, useRef, useState } from "react";
import {
  AfButton,
  AfDatePicker,
  AfIcon,
  AfInput,
  AfSegmented,
  AfSelect,
  AfTag,
  cn,
  useAnimatedList,
  useControllableState,
} from "../../ui";
import { useTween } from "../../ui-pro";

export type AfGrantSubjectKind = "user" | "team" | "token";
export type AfGrantRole = "viewer" | "tester" | "maintainer";
export type AfGrantStatus = "active" | "expiring" | "revoked";
export type AfGrantFilter = "all" | AfGrantStatus;

export interface AfAppGrantRecord {
  id: string;
  subject: string;
  displayName: string;
  kind: AfGrantSubjectKind;
  role: AfGrantRole;
  grantedAt: string;
  expiresAt: string | null;
  status: AfGrantStatus;
}

export interface AfAppGrantEditorProps {
  /** 应用名称标识。 */
  appName?: string;
  /** 受控授权白名单列表。 */
  grants?: AfAppGrantRecord[];
  /** 非受控默认白名单列表。 */
  defaultGrants?: AfAppGrantRecord[];
  /** 列表变更回调。 */
  onGrantsChange?: (next: AfAppGrantRecord[]) => void;
  /** 批量新增授权回调。 */
  onGrantAdd?: (added: AfAppGrantRecord[]) => void;
  /** 吊销单条授权回调。 */
  onGrantRevoke?: (record: AfAppGrantRecord) => void;
  className?: string;
}

const FIXED_TODAY = new Date(2026, 10, 16);
const FIXED_DEFAULT_EXPIRY = new Date(2026, 11, 31);

const DEFAULT_GRANTS: AfAppGrantRecord[] = [
  {
    id: "gr-1",
    subject: "sec-audit@company.cn",
    displayName: "安全审计工作组",
    kind: "team",
    role: "maintainer",
    grantedAt: "2026-09-12",
    expiresAt: null,
    status: "active",
  },
  {
    id: "gr-2",
    subject: "lin.zhou@partner.cn",
    displayName: "周琳 · 企业内测代表",
    kind: "user",
    role: "tester",
    grantedAt: "2026-10-28",
    expiresAt: "2026-11-24",
    status: "expiring",
  },
  {
    id: "gr-3",
    subject: "ci-runner-prod-04",
    displayName: "自动化流水线令牌 #04",
    kind: "token",
    role: "viewer",
    grantedAt: "2026-10-02",
    expiresAt: "2027-04-01",
    status: "active",
  },
];

function roleLabel(role: AfGrantRole): string {
  if (role === "maintainer") return "协同发布";
  if (role === "tester") return "灰度内测";
  return "可安装使用";
}

function kindMeta(kind: AfGrantSubjectKind): { label: string; icon: "user" | "users" | "key" } {
  if (kind === "team") return { label: "团队", icon: "users" };
  if (kind === "token") return { label: "部署令牌", icon: "key" };
  return { label: "个人账号", icon: "user" };
}

/**
 * 商城发布后台 · 私有应用白名单访问控制工作台（`P2-3`）：
 * - 支持逗号分隔批量输入邮箱/账号/团队并设定有效期（本地化 `AfDatePicker`）；
 * - 下方列表支持状态快筛与关键词检索，吊销时通过 `useAnimatedList` 平滑退场补位。
 */
export function AfAppGrantEditor({
  appName = "企业内网规则网关",
  grants: grantsProp,
  defaultGrants = DEFAULT_GRANTS,
  onGrantsChange,
  onGrantAdd,
  onGrantRevoke,
  className,
}: AfAppGrantEditorProps = {}) {
  const [grants, setGrants] = useControllableState<AfAppGrantRecord[]>({
    value: grantsProp,
    defaultValue: defaultGrants,
    onChange: onGrantsChange,
  });

  const [batchInput, setBatchInput] = useState("");
  const [role, setRole] = useState<AfGrantRole>("viewer");
  const [expiryDate, setExpiryDate] = useState<Date | null>(FIXED_DEFAULT_EXPIRY);
  const [filter, setFilter] = useState<AfGrantFilter>("all");
  const [search, setSearch] = useState("");

  const filteredGrants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return grants.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!q) return true;
      return (
        item.subject.toLowerCase().includes(q) ||
        item.displayName.toLowerCase().includes(q)
      );
    });
  }, [grants, filter, search]);

  const listRef = useRef<HTMLDivElement>(null);
  const animated = useAnimatedList({
    items: filteredGrants,
    getKey: (item) => item.id,
    exitDuration: 190,
    containerRef: listRef,
  });

  const handleBatchGrant = () => {
    const tokens = batchInput
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (tokens.length === 0) return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const expiresStr = expiryDate
      ? `${expiryDate.getFullYear()}-${String(expiryDate.getMonth() + 1).padStart(2, "0")}-${String(expiryDate.getDate()).padStart(2, "0")}`
      : null;
    const created: AfAppGrantRecord[] = tokens.map((subject, idx) => {
      const kind: AfGrantSubjectKind = subject.includes("team") || subject.includes("group")
        ? "team"
        : subject.startsWith("ci-") || subject.startsWith("tok_")
          ? "token"
          : "user";
      return {
        id: `gr-${Date.now()}-${idx}`,
        subject,
        displayName: subject.split("@")[0] || subject,
        kind,
        role,
        grantedAt: todayStr,
        expiresAt: expiresStr,
        status: "active",
      };
    });

    setGrants([...created, ...grants]);
    onGrantAdd?.(created);
    setBatchInput("");
  };

  const handleRevoke = (record: AfAppGrantRecord) => {
    setGrants(grants.filter((g) => g.id !== record.id));
    onGrantRevoke?.(record);
  };

  const activeSubjectCount = Math.round(
    useTween(grants.filter((g) => g.status !== "revoked").length, 320),
  );

  return (
    <section className={cn("af-store-grants", className)} aria-label="内部应用授权名单管理">
      <div className="af-store-grants__head">
        <div>
          <h4>内部应用访问授权 · {appName}</h4>
          <span>仅授权列表内的账号、团队或部署令牌可下载与安装此应用</span>
        </div>
        <AfTag tone="info" size="sm">
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            已授权 {activeSubjectCount} 个主体
          </span>
        </AfTag>
      </div>

      {/* 顶部批量授权输入舱 */}
      <div className="af-store-grants__composer">
        <div className="af-store-grants__input-main">
          <AfInput
            size="sm"
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            placeholder="输入邮箱、账号 ID 或团队标识（多个用逗号分隔）…"
            aria-label="批量授权账号或邮箱"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleBatchGrant();
              }
            }}
          />
        </div>
        <div className="af-store-grants__role-sel">
          <AfSelect
            size="sm"
            value={role}
            onChange={(val) => setRole(val as AfGrantRole)}
            options={[
              { value: "viewer", label: "可安装使用" },
              { value: "tester", label: "灰度内测" },
              { value: "maintainer", label: "协同发布" },
            ]}
          />
        </div>
        <div className="af-store-grants__date-sel">
          <AfDatePicker
            locale="zh-CN"
            clearable
            today={FIXED_TODAY}
            value={expiryDate}
            onChange={setExpiryDate}
            placeholder="永久有效"
            label="授权有效期"
            showLabel={false}
          />
        </div>
        <AfButton size="sm" variant="primary" icon="plus" onClick={handleBatchGrant}>
          授予权限
        </AfButton>
      </div>

      {/* 审计筛选工具栏 */}
      <div className="af-store-grants__toolbar">
        <AfSegmented<AfGrantFilter>
          size="xs"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `全部 (${grants.length})` },
            { value: "active", label: "生效中" },
            { value: "expiring", label: "即将到期" },
            { value: "revoked", label: "已吊销" },
          ]}
        />
        <div className="af-store-grants__search">
          <AfInput
            size="sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="检索已授权主体…"
            aria-label="检索已授权主体"
          />
        </div>
      </div>

      {/* 授权主体列表 */}
      <div
        ref={listRef}
        className="af-store-grants__list"
        data-af-hover-list="hover"
        role="list"
      >
        {animated.entries.length === 0 ? (
          <div className="af-store-grants__empty">当前筛选条件下暂无白名单记录</div>
        ) : (
          animated.entries.map(({ item, key, leaving }) => {
            const meta = kindMeta(item.kind);
            return (
              <div
                key={key}
                role="listitem"
                data-flip={key}
                data-af-hover-item
                data-leaving={leaving ? "true" : undefined}
                className="af-store-grants__row"
              >
                <span className="af-store-grants__avatar" aria-hidden="true">
                  <AfIcon name={meta.icon} size={14} />
                </span>

                <div className="af-store-grants__subject">
                  <div className="af-store-grants__subject-top">
                    <strong>{item.displayName}</strong>
                    <AfTag tone="neutral" size="sm">
                      {meta.label}
                    </AfTag>
                    <AfTag
                      tone={
                        item.role === "maintainer"
                          ? "accent"
                          : item.role === "tester"
                            ? "warning"
                            : "info"
                      }
                      size="sm"
                    >
                      {roleLabel(item.role)}
                    </AfTag>
                  </div>
                  <code>{item.subject}</code>
                </div>

                <div className="af-store-grants__dates">
                  <span>授权于 {item.grantedAt}</span>
                  <strong data-expiring={item.status === "expiring" ? "true" : undefined}>
                    {item.expiresAt ? `有效至 ${item.expiresAt}` : "长期有效"}
                  </strong>
                </div>

                <AfButton
                  size="sm"
                  variant="ghost"
                  icon="trash"
                  onClick={() => handleRevoke(item)}
                >
                  吊销
                </AfButton>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
