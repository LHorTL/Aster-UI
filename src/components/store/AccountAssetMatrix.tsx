import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  AfAppMark,
  AfButton,
  AfIcon,
  AfSegmented,
  AfTag,
  cn,
  useControllableState,
  useListFlip,
  useReversibleEdgePeek,
} from "../../ui";
import { AfTray, useTweens } from "../../ui-pro";

export interface AfRoleOrderBrief {
  id: string;
  title: string;
  priceLabel: string;
  state: "selling" | "publicity" | "watching";
}

export interface AfGameRoleAsset {
  id: string;
  accountLabel: string;
  roleName: string;
  sect: string;
  server: string;
  gearScore: number;
  goldAmount: number;
  activeListings: number;
  watchingCount: number;
  syncedAt: string;
  /** 在售商品总估值（元）。 */
  valuationCny?: number;
  /** 是否常用置顶。 */
  pinned?: boolean;
  /** 关联寄售与关注清单。 */
  orders?: AfRoleOrderBrief[];
}

export interface AfAccountAssetMatrixProps {
  /** 多账号角色资产列表。 */
  roles?: AfGameRoleAsset[];
  /** 当前选中检视的角色 ID。 */
  activeRoleId?: string;
  defaultActiveRoleId?: string;
  onSelectRole?: (role: AfGameRoleAsset) => void;
  /** 当前默认交易身份 ID。 */
  defaultTradingRoleId?: string;
  onDefaultTradingRoleChange?: (roleId: string, role: AfGameRoleAsset) => void;
  /** 角色常用置顶或顺序变更回调。 */
  onRolesOrderChange?: (roles: AfGameRoleAsset[]) => void;
  /** 批量同步最新资产回调。 */
  onSyncAll?: () => void;
  /** 是否挂载右侧边缘身份快切栏。 */
  showEdgeRail?: boolean;
  className?: string;
}

export interface AfEdgeIdentityRailProps {
  /** 可快速切换的角色身份列表。 */
  roles?: AfGameRoleAsset[];
  /** 当前激活角色 ID。 */
  activeRoleId?: string;
  defaultActiveRoleId?: string;
  onSelectRole?: (role: AfGameRoleAsset) => void;
  /** 收起态手柄露头比例（默认 `0.25`，对应 `55px / 220px`）。 */
  collapsedRatio?: number;
  className?: string;
}

const DEFAULT_ROLE_ASSETS: AfGameRoleAsset[] = [
  {
    id: "role-studio",
    accountLabel: "企业主账号 · 9912",
    roleName: "星澜视觉工坊",
    sect: "三维角色",
    server: "华东旗舰节点 · 上海",
    gearScore: 9840,
    goldAmount: 184500,
    valuationCny: 4280,
    activeListings: 2,
    watchingCount: 7,
    syncedAt: "2 分钟前",
    pinned: true,
    orders: [
      { id: "ord-1", title: "赛博义体高精度绑定套件", priceLabel: "¥ 2,680", state: "publicity" },
      { id: "ord-2", title: "面部 ARKit 52 表情预设包", priceLabel: "¥ 1,600", state: "selling" },
      { id: "ord-3", title: "次世代写实毛发着色器", priceLabel: "¥ 3,950", state: "watching" },
    ],
  },
  {
    id: "role-arch",
    accountLabel: "企业主账号 · 9912",
    roleName: "云栖场景实验室",
    sect: "建筑场景",
    server: "华北渲染节点 · 北京",
    gearScore: 9920,
    goldAmount: 426000,
    valuationCny: 1680,
    activeListings: 1,
    watchingCount: 4,
    syncedAt: "2 分钟前",
    orders: [
      { id: "ord-4", title: "模块化现代街区建筑构件组", priceLabel: "¥ 1,680", state: "selling" },
      { id: "ord-5", title: "动态体积云与全局光照预设", priceLabel: "¥ 880", state: "watching" },
    ],
  },
  {
    id: "role-mat",
    accountLabel: "独立创作号 · 3408",
    roleName: "清墨材质库",
    sect: "PBR 材质",
    server: "华南边缘节点 · 深圳",
    gearScore: 9450,
    goldAmount: 65200,
    valuationCny: 0,
    activeListings: 0,
    watchingCount: 12,
    syncedAt: "15 分钟前",
    orders: [
      { id: "ord-6", title: "8K 扫描岩石与地形材质集", priceLabel: "¥ 5,200", state: "watching" },
      { id: "ord-7", title: "工业级车漆多层清漆节点", priceLabel: "¥ 6,800", state: "watching" },
    ],
  },
  {
    id: "role-vfx",
    accountLabel: "独立创作号 · 3408",
    roleName: "星移光影组",
    sect: "粒子特效",
    server: "亚太加速节点 · 新加坡",
    gearScore: 9610,
    goldAmount: 118000,
    valuationCny: 880,
    activeListings: 1,
    watchingCount: 3,
    syncedAt: "8 分钟前",
    orders: [
      { id: "ord-8", title: "流体烟火与能量护盾特效包", priceLabel: "¥ 880", state: "selling" },
    ],
  },
];

const SHARE_TONES = ["accent", "success", "info", "warning"] as const;

function estimateValuation(role: AfGameRoleAsset): number {
  if (typeof role.valuationCny === "number") return role.valuationCny;
  return role.activeListings * 1200;
}

/**
 * 窗口右缘创作者身份快切栏：
 * - 闲置态仅保留紧凑侧翼手柄露头，列表完全隐藏零裁字；
 * - 指针移入丝滑探出完整身份切换胶囊，中途移出可无缝折返。
 */
export function AfEdgeIdentityRail({
  roles = DEFAULT_ROLE_ASSETS,
  activeRoleId: activeProp,
  defaultActiveRoleId,
  onSelectRole,
  collapsedRatio = 0.22,
  className,
}: AfEdgeIdentityRailProps = {}) {
  const handleActiveChange = useMemo(() => {
    if (!onSelectRole) return undefined;
    return (nextId: string) => {
      const found = roles.find((r) => r.id === nextId);
      if (found) onSelectRole(found);
    };
  }, [onSelectRole, roles]);

  const [activeId, setActiveId] = useControllableState<string>({
    value: activeProp,
    defaultValue: defaultActiveRoleId ?? roles[0]?.id ?? "",
    onChange: handleActiveChange,
  });

  const peek = useReversibleEdgePeek({
    edge: "right",
    collapsedRatio,
    enterDelay: 60,
    leaveDelay: 280,
    duration: 220,
  });

  const hiddenFraction = (1 - collapsedRatio) * (1 - peek.progress);
  const translateStyle: CSSProperties = {
    transform: `translate3d(${(hiddenFraction * 100).toFixed(2)}%, 0, 0)`,
  };
  const listRevealOpacity = Math.max(0, Math.min(1, (peek.progress - 0.08) / 0.72));

  const currentRole = roles.find((r) => r.id === activeId) ?? roles[0];

  return (
    <aside
      {...peek.bindPeek}
      className={cn("af-edge-id-rail", className)}
      data-peeking={peek.peeking ? "true" : undefined}
      data-peek-progress={peek.progress.toFixed(2)}
      style={translateStyle}
      aria-label="快捷切换交易身份"
    >
      <div className="af-edge-id-rail__handle" aria-hidden="true">
        <span className="af-edge-id-rail__chevron">
          <AfIcon name="chevronLeft" size={12} />
        </span>
        <AfAppMark size={22} name={currentRole?.sect ?? "身"} tone="accent" />
        <strong>{currentRole?.roleName ?? "空间"}</strong>
        <small>{currentRole?.sect ?? `${roles.length} 个身份`}</small>
      </div>

      <div
        className="af-edge-id-rail__list"
        data-af-hover-list="hover"
        role="listbox"
        aria-label="选择当前交易身份"
        style={{
          opacity: listRevealOpacity,
          pointerEvents: peek.progress > 0.35 ? "auto" : "none",
        }}
      >
        <div className="af-edge-id-rail__list-head">
          <span>快捷切换身份</span>
          <small>{roles.length} 个身份</small>
        </div>
        {roles.map((role, idx) => {
          const selected = role.id === activeId;
          return (
            <button
              key={role.id}
              type="button"
              role="option"
              tabIndex={selected ? 0 : -1}
              aria-selected={selected}
              data-af-hover-item
              className="af-edge-id-rail__item"
              data-selected={selected ? "true" : undefined}
              onClick={() => setActiveId(role.id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const nextIdx = (idx + (e.key === "ArrowDown" ? 1 : -1) + roles.length) % roles.length;
                  const nextRole = roles[nextIdx];
                  if (nextRole) {
                    setActiveId(nextRole.id);
                    const opts = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="option"]');
                    opts?.[nextIdx]?.focus();
                  }
                }
              }}
            >
              <AfAppMark size={24} name={role.sect} tone={selected ? "accent" : "neutral"} />
              <div className="af-edge-id-rail__meta">
                <strong>{role.roleName}</strong>
                <span>{role.server}</span>
              </div>
              <em className="af-edge-id-rail__gold">{(role.goldAmount / 10000).toFixed(1)}w</em>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

/**
 * 多账号创作者身份与数字资产管理工作台：
 * - 顶部提供账号分段筛选与 `useTweens` 实时汇总指标插值；
 * - 中部提供结算积分占比分段条，支持悬停聚光联动（`data-dim`）；
 * - 主体采用内嵌式左名册（`useListFlip` 置顶调序 + 滑动悬停底块）+ 右详情检视卡（身份切换淡入、单项同步与 `<AfTray>` 在售明细抽屉）；
 * - 右侧集成紧凑型悬浮 `AfEdgeIdentityRail` 身份快切标签。
 */
export function AfAccountAssetMatrix({
  roles: rolesProp,
  activeRoleId: activeProp,
  defaultActiveRoleId,
  onSelectRole,
  defaultTradingRoleId: defaultTradingProp,
  onDefaultTradingRoleChange,
  onRolesOrderChange,
  onSyncAll,
  showEdgeRail = true,
  className,
}: AfAccountAssetMatrixProps = {}) {
  const [internalRoles, setInternalRoles] = useState<AfGameRoleAsset[]>(
    () => rolesProp ?? DEFAULT_ROLE_ASSETS,
  );

  useEffect(() => {
    if (rolesProp) setInternalRoles(rolesProp);
  }, [rolesProp]);

  const roles = rolesProp ?? internalRoles;

  const handleSelectChange = useMemo(() => {
    if (!onSelectRole) return undefined;
    return (nextId: string) => {
      const found = roles.find((r) => r.id === nextId);
      if (found) onSelectRole(found);
    };
  }, [onSelectRole, roles]);

  const [activeId, setActiveId] = useControllableState<string>({
    value: activeProp,
    defaultValue: defaultActiveRoleId ?? roles[0]?.id ?? "",
    onChange: handleSelectChange,
  });

  const handleDefaultRoleChange = useMemo(() => {
    if (!onDefaultTradingRoleChange) return undefined;
    return (nextId: string) => {
      const found = roles.find((r) => r.id === nextId);
      if (found) onDefaultTradingRoleChange(nextId, found);
    };
  }, [onDefaultTradingRoleChange, roles]);

  const [defaultRoleId, setDefaultRoleId] = useControllableState<string>({
    value: defaultTradingProp,
    defaultValue: roles[0]?.id ?? "",
    onChange: handleDefaultRoleChange,
  });

  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [hoveredRoleId, setHoveredRoleId] = useState<string | null>(null);
  const [ordersOpen, setOrdersOpen] = useState<boolean>(true);
  const [syncingAll, setSyncingAll] = useState<boolean>(false);
  const [syncingRoleId, setSyncingRoleId] = useState<string | null>(null);
  const syncTimerRef = useRef<number | null>(null);
  const roleSyncTimerRef = useRef<number | null>(null);

  const rosterListRef = useRef<HTMLDivElement>(null);
  const flip = useListFlip(rosterListRef);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
      if (roleSyncTimerRef.current !== null) window.clearTimeout(roleSyncTimerRef.current);
    };
  }, []);

  const accountNames = useMemo(
    () => Array.from(new Set(roles.map((r) => r.accountLabel))),
    [roles],
  );

  const visibleRoles = useMemo(
    () =>
      accountFilter === "all"
        ? roles
        : roles.filter((r) => r.accountLabel === accountFilter),
    [roles, accountFilter],
  );

  const selectedRole = useMemo(
    () =>
      visibleRoles.find((r) => r.id === activeId) ??
      roles.find((r) => r.id === activeId) ??
      visibleRoles[0] ??
      roles[0],
    [visibleRoles, roles, activeId],
  );

  const totalGold = visibleRoles.reduce((sum, r) => sum + r.goldAmount, 0);
  const totalValuation = visibleRoles.reduce((sum, r) => sum + estimateValuation(r), 0);
  const totalSelling = visibleRoles.reduce((sum, r) => sum + r.activeListings, 0);
  const totalWatching = visibleRoles.reduce((sum, r) => sum + r.watchingCount, 0);

  const [tweenTotalGold, tweenTotalVal, tweenTotalSell] = useTweens(
    [totalGold / 10000, totalValuation, totalSelling],
    440,
  );

  const [tweenRoleGear, tweenRoleGold, tweenRoleVal, tweenRoleSell] = useTweens(
    [
      selectedRole?.gearScore ?? 0,
      (selectedRole?.goldAmount ?? 0) / 10000,
      selectedRole ? estimateValuation(selectedRole) : 0,
      selectedRole?.activeListings ?? 0,
    ],
    400,
  );

  const handleAccountFilterChange = (next: string) => {
    flip.capture();
    setAccountFilter(next);
    const nextList = next === "all" ? roles : roles.filter((r) => r.accountLabel === next);
    if (nextList.length > 0 && !nextList.some((r) => r.id === activeId)) {
      setActiveId(nextList[0]!.id);
    }
  };

  const handlePinRole = (targetId: string) => {
    flip.capture();
    const updater = (prev: AfGameRoleAsset[]) => {
      const idx = prev.findIndex((r) => r.id === targetId);
      if (idx < 0) return prev;
      const target = prev[idx]!;
      const nextPinned = !target.pinned;
      const updated = prev.map((r) => (r.id === targetId ? { ...r, pinned: nextPinned } : r));
      updated.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
      onRolesOrderChange?.(updated);
      return updated;
    };
    if (!rolesProp) {
      setInternalRoles(updater);
    } else {
      updater(rolesProp);
    }
  };

  const handleTriggerSyncAll = () => {
    onSyncAll?.();
    if (syncingAll) return;
    setSyncingAll(true);
    if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      setSyncingAll(false);
      if (!rolesProp) {
        setInternalRoles((prev) => prev.map((r) => ({ ...r, syncedAt: "刚刚" })));
      }
    }, 480);
  };

  const handleTriggerSyncSingle = (roleId: string) => {
    if (syncingRoleId) return;
    setSyncingRoleId(roleId);
    if (roleSyncTimerRef.current !== null) window.clearTimeout(roleSyncTimerRef.current);
    roleSyncTimerRef.current = window.setTimeout(() => {
      setSyncingRoleId(null);
      if (!rolesProp) {
        setInternalRoles((prev) =>
          prev.map((r) => (r.id === roleId ? { ...r, syncedAt: "刚刚" } : r)),
        );
      }
    }, 420);
  };

  const roleOrders = selectedRole?.orders ?? [];
  const isSelectedDefault = selectedRole ? selectedRole.id === defaultRoleId : false;

  return (
    <div
      className={cn("af-asset-matrix-shell", className)}
      data-with-rail={showEdgeRail ? "true" : undefined}
    >
      <section className="af-asset-matrix" aria-label="创作者身份与资产管理">
      {/* 1. 顶栏：账号分段切换 + 实时插值汇总指标 */}
      <div className="af-asset-matrix__bar">
        <div className="af-asset-matrix__title">
          <h4>店铺与资产管理</h4>
          <AfSegmented<string>
            size="xs"
            value={accountFilter}
            onChange={handleAccountFilterChange}
            options={[
              { value: "all", label: `全部账号 (${roles.length})` },
              ...accountNames.map((acc) => ({ value: acc, label: acc })),
            ]}
          />
        </div>

        <div className="af-asset-matrix__summary">
          <div className="af-asset-matrix__stat">
            <span>结算积分</span>
            <strong>{tweenTotalGold.toFixed(2)} 万点</strong>
          </div>
          <div className="af-asset-matrix__stat">
            <span>在售估值</span>
            <strong>¥ {Math.round(tweenTotalVal).toLocaleString("en-US")}</strong>
          </div>
          <div className="af-asset-matrix__stat">
            <span>在售 / 关注</span>
            <strong>
              {Math.round(tweenTotalSell)} / {totalWatching}
            </strong>
          </div>
          <AfButton
            size="sm"
            variant="secondary"
            icon="refresh"
            loading={syncingAll}
            onClick={handleTriggerSyncAll}
          >
            同步全部
          </AfButton>
        </div>
      </div>

      {/* 2. 多身份收益积分与资产占比条（支持悬停聚光联动） */}
      {visibleRoles.length > 0 ? (
        <div className="af-asset-matrix__share" onPointerLeave={() => setHoveredRoleId(null)}>
          <div className="af-asset-matrix__share-bar" role="presentation">
            {visibleRoles.map((role, idx) => {
              const weight = Math.max(role.goldAmount, 10000);
              const tone = SHARE_TONES[idx % SHARE_TONES.length];
              const dimmed = hoveredRoleId !== null && hoveredRoleId !== role.id;
              return (
                <span
                  key={role.id}
                  className="af-asset-matrix__share-seg"
                  data-tone={tone}
                  data-dim={dimmed ? "true" : undefined}
                  style={{ flexGrow: Math.round(weight / 1000) }}
                  onPointerEnter={() => setHoveredRoleId(role.id)}
                  onClick={() => setActiveId(role.id)}
                  title={`${role.roleName} · ${(role.goldAmount / 10000).toFixed(2)} 万点`}
                />
              );
            })}
          </div>
          <div className="af-asset-matrix__share-legend">
            {visibleRoles.map((role, idx) => {
              const pct = totalGold > 0 ? Math.round((role.goldAmount / totalGold) * 100) : 0;
              const tone = SHARE_TONES[idx % SHARE_TONES.length];
              const dimmed = hoveredRoleId !== null && hoveredRoleId !== role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  className="af-asset-matrix__legend-item"
                  data-tone={tone}
                  data-dim={dimmed ? "true" : undefined}
                  data-active={role.id === selectedRole?.id ? "true" : undefined}
                  onPointerEnter={() => setHoveredRoleId(role.id)}
                  onClick={() => setActiveId(role.id)}
                >
                  <i className="af-asset-matrix__legend-dot" aria-hidden="true" />
                  <span>{role.roleName}</span>
                  <em>{pct}%</em>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 3. 内嵌式双栏管理舞台 */}
      <div className="af-asset-matrix__stage">
        <div className="af-asset-matrix__workspace">
          {/* 左栏：可置顶调序的角色名册 */}
          <div
            ref={rosterListRef}
            className="af-asset-matrix__roster"
            data-af-hover-list="wash"
            role="listbox"
            aria-label="角色名册"
          >
            {visibleRoles.map((role) => {
              const active = role.id === selectedRole?.id;
              const isDefault = role.id === defaultRoleId;
              const dimmed = hoveredRoleId !== null && hoveredRoleId !== role.id;
              return (
                <div
                  key={role.id}
                  data-flip={role.id}
                  data-af-hover-item
                  role="option"
                  tabIndex={0}
                  aria-selected={active}
                  className="af-asset-matrix__row"
                  data-active={active ? "true" : undefined}
                  data-dim={dimmed ? "true" : undefined}
                  onClick={() => setActiveId(role.id)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveId(role.id);
                    }
                  }}
                >
                  <AfAppMark size={34} name={role.sect} tone={active ? "accent" : "neutral"} />

                  <div className="af-asset-matrix__row-main">
                    <div className="af-asset-matrix__row-title">
                      <strong>{role.roleName}</strong>
                      <AfTag tone={active ? "accent" : "neutral"} size="sm">
                        {role.sect}
                      </AfTag>
                      {isDefault ? (
                        <span className="af-asset-matrix__default-pill">默认</span>
                      ) : null}
                    </div>
                    <span className="af-asset-matrix__row-sub">
                      {role.server} · {role.accountLabel}
                    </span>
                  </div>

                  <div className="af-asset-matrix__row-metrics">
                    <strong>{(role.goldAmount / 10000).toFixed(2)} 万点</strong>
                    <span>评级 {role.gearScore.toLocaleString("en-US")}</span>
                  </div>

                  <button
                    type="button"
                    className="af-asset-matrix__pin-btn"
                    data-pinned={role.pinned ? "true" : undefined}
                    aria-label={role.pinned ? `取消置顶 ${role.roleName}` : `置顶常用身份 ${role.roleName}`}
                    title={role.pinned ? "已置顶常用（点击取消）" : "置顶常用身份"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinRole(role.id);
                    }}
                  >
                    <AfIcon name="star" size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* 右栏：当前选中身份详情与交易身份控制卡 */}
          {selectedRole ? (
            <div className="af-asset-matrix__inspector">
              <div key={selectedRole.id} className="af-asset-matrix__inspector-head af-pj-panel-in">
                <div className="af-asset-matrix__role-identity">
                  <AfAppMark size={40} name={selectedRole.sect} tone="accent" />
                  <div className="af-asset-matrix__role-head">
                    <div className="af-asset-matrix__role-name">
                      <strong>{selectedRole.roleName}</strong>
                      <AfTag tone="accent" size="sm">
                        {selectedRole.sect}
                      </AfTag>
                      {isSelectedDefault ? (
                        <AfTag tone="success" size="sm">
                          默认交易身份
                        </AfTag>
                      ) : null}
                    </div>
                    <span>
                      {selectedRole.server} · {selectedRole.accountLabel} · 同步于 {selectedRole.syncedAt}
                    </span>
                  </div>
                </div>

                <div className="af-asset-matrix__inspector-actions">
                  <AfButton
                    size="xs"
                    variant={isSelectedDefault ? "secondary" : "primary"}
                    icon={isSelectedDefault ? "check" : undefined}
                    disabled={isSelectedDefault}
                    onClick={() => setDefaultRoleId(selectedRole.id)}
                  >
                    {isSelectedDefault ? "已设为默认" : "设为默认身份"}
                  </AfButton>
                  <AfButton
                    size="xs"
                    variant="ghost"
                    icon="refresh"
                    loading={syncingRoleId === selectedRole.id}
                    aria-label={`刷新 ${selectedRole.roleName} 资产`}
                    onClick={() => handleTriggerSyncSingle(selectedRole.id)}
                  >
                    刷新
                  </AfButton>
                </div>
              </div>

              <div className="af-asset-matrix__kpis">
                <div className="af-asset-matrix__kpi-cell">
                  <span>质量评级</span>
                  <strong>{Math.round(tweenRoleGear).toLocaleString("en-US")}</strong>
                </div>
                <div className="af-asset-matrix__kpi-cell">
                  <span>可用积分</span>
                  <strong>{tweenRoleGold.toFixed(2)} 万点</strong>
                </div>
                <div className="af-asset-matrix__kpi-cell">
                  <span>在售估值</span>
                  <strong>¥ {Math.round(tweenRoleVal).toLocaleString("en-US")}</strong>
                </div>
                <div className="af-asset-matrix__kpi-cell">
                  <span>在售 / 关注</span>
                  <strong>
                    {Math.round(tweenRoleSell)} / {selectedRole.watchingCount}
                  </strong>
                </div>
              </div>

              <AfTray
                className="af-asset-matrix__orders-tray"
                footer={
                  ordersOpen ? (
                    roleOrders.length > 0 ? (
                      <div className="af-asset-matrix__orders" data-af-hover-list="wash">
                        {roleOrders.map((ord) => (
                          <div key={ord.id} data-af-hover-item className="af-asset-matrix__order-row">
                            <span className="af-asset-matrix__order-title">{ord.title}</span>
                            <div className="af-asset-matrix__order-right">
                              <AfTag
                                size="sm"
                                tone={
                                  ord.state === "selling"
                                    ? "success"
                                    : ord.state === "publicity"
                                      ? "warning"
                                      : "neutral"
                                }
                              >
                                {ord.state === "selling"
                                  ? "在售中"
                                  : ord.state === "publicity"
                                    ? "公示期"
                                    : "已关注"}
                              </AfTag>
                              <strong>{ord.priceLabel}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="af-asset-matrix__orders-empty">当前身份暂无在售或关注商品</div>
                    )
                  ) : null
                }
              >
                <button
                  type="button"
                  className="af-asset-matrix__orders-toggle"
                  aria-expanded={ordersOpen}
                  onClick={() => setOrdersOpen((v) => !v)}
                >
                  <span>在售与关注清单（{roleOrders.length}）</span>
                  <span className="af-asset-matrix__orders-chevron" data-open={ordersOpen ? "true" : undefined}>
                    <AfIcon name="chevronDown" size={13} />
                  </span>
                </button>
              </AfTray>
            </div>
          ) : null}
        </div>
      </div>
      </section>

      {showEdgeRail ? (
        <div className="af-asset-matrix__rail-anchor">
          <AfEdgeIdentityRail
            roles={roles}
            activeRoleId={selectedRole?.id ?? activeId}
            onSelectRole={(role) => {
              if (accountFilter !== "all" && role.accountLabel !== accountFilter) {
                flip.capture();
                setAccountFilter("all");
              }
              setActiveId(role.id);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
