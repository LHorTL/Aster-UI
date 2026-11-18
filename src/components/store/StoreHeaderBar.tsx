import { useEffect, useRef, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn, useControllableState, useWidthMorph } from "../../primitives";
import { AfInput, AfKbd, AfSegmented } from "../../ui";

/** 内置应用商城顶栏四大页签。 */
export type AfStoreNavTab = "discover" | "installed" | "updates" | "tasks";

/** 目录源同步状态。 */
export type AfStoreSyncState = "synced" | "syncing" | "offline";

/** 商城已登录通行证摘要。 */
export type AfStoreAccountInfo = {
  name: string;
  badge?: string;
};

/** 商城顶栏与目录同步舱属性。 */
export type AfStoreHeaderBarProps = {
  /** 当前激活页签。 */
  activeTab?: AfStoreNavTab;
  defaultActiveTab?: AfStoreNavTab;
  onTabChange?: (tab: AfStoreNavTab) => void;
  /** 已安装应用数。 */
  installedCount?: number;
  /** 可更新数量角标。 */
  updatesCount?: number;
  /** 活跃传输任务角标。 */
  activeTasksCount?: number;
  /** 搜索关键词。 */
  searchValue?: string;
  defaultSearchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** 是否监听全局 `/` 或 `Ctrl+K` 自动聚焦搜索框，默认 `true`。 */
  enableShortcutFocus?: boolean;
  /** 目录索引同步状态。 */
  syncState?: AfStoreSyncState;
  /** 最近一次同步时间说明，如 `"2 分钟前"`。 */
  lastSyncedLabel?: string;
  /** 点击同步状态胶囊手动刷新目录时触发。 */
  onRefreshCatalog?: () => void;
  /** 当前私有源账号信息；传 `null` 表示未登录态（省略时默认展示演示通行证）。 */
  account?: AfStoreAccountInfo | null;
  /** 点击账号或“通行证登录”按钮回调。 */
  onAccountClick?: () => void;
  extra?: ReactNode;
  className?: string;
};

/**
 * 客户端内置应用商城顶栏（四页签切换 + `/` 快捷搜索 + 三态目录同步胶囊 + 私有源通行证入口）。
 */
export function AfStoreHeaderBar({
  activeTab: tabProp,
  defaultActiveTab = "discover",
  onTabChange,
  installedCount = 12,
  updatesCount = 3,
  activeTasksCount = 2,
  searchValue: searchProp,
  defaultSearchValue = "",
  onSearchChange,
  searchPlaceholder = "搜索扩展、工具或协议…",
  enableShortcutFocus = true,
  syncState = "synced",
  lastSyncedLabel = "刚刚同步",
  onRefreshCatalog,
  account = { name: "产品研发组", badge: "Pro" },
  onAccountClick,
  extra,
  className,
}: AfStoreHeaderBarProps = {}) {
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const syncMorphRef = useRef<HTMLButtonElement>(null);
  useWidthMorph(syncMorphRef, `${syncState}:${lastSyncedLabel}`);

  const [activeTab, setActiveTab] = useControllableState<AfStoreNavTab>({
    value: tabProp,
    defaultValue: defaultActiveTab,
    onChange: onTabChange,
  });

  const [search, setSearch] = useControllableState<string>({
    value: searchProp,
    defaultValue: defaultSearchValue,
    onChange: onSearchChange,
  });

  useEffect(() => {
    if (!enableShortcutFocus || typeof window === "undefined") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const wrap = searchWrapRef.current;
      if (!wrap || wrap.closest('[inert], [aria-hidden="true"]')) return;
      const openOverlay = document.querySelector('[aria-modal="true"]');
      if (openOverlay && !openOverlay.contains(wrap)) return;
      const inEditable =
        e.target instanceof Element &&
        Boolean(
          e.target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'),
        );
      if ((e.key === "/" && !inEditable && !e.metaKey && !e.ctrlKey && !e.altKey) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        const input = wrap.querySelector<HTMLInputElement>("input");
        if (input) {
          e.preventDefault();
          input.focus();
          input.select();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enableShortcutFocus]);

  const syncTitle =
    syncState === "syncing"
      ? "正在同步目录索引…"
      : syncState === "offline"
        ? "离线缓存模式 · 点击重试"
        : `目录在线 · ${lastSyncedLabel}`;

  return (
    <header className={cn("af-store-header", className)}>
      <div className="af-store-header__tabs">
        <AfSegmented<AfStoreNavTab>
          size="sm"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "discover", label: "应用广场" },
            { value: "installed", label: `已安装 (${installedCount})` },
            {
              value: "updates",
              label: updatesCount > 0 ? `可更新 (${updatesCount})` : "可更新",
            },
            {
              value: "tasks",
              label: activeTasksCount > 0 ? `传输任务 (${activeTasksCount})` : "传输任务",
            },
          ]}
        />
      </div>

      <div className="af-store-header__right">
        <div ref={searchWrapRef} className="af-store-header__search">
          <AfInput
            size="sm"
            prefix={<AfIcon name="search" size={13} />}
            suffix={!search ? <AfKbd>/</AfKbd> : undefined}
            allowClear
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
        </div>

        <button
          ref={syncMorphRef}
          type="button"
          className="af-store-header__sync"
          data-sync-state={syncState}
          aria-label={syncTitle}
          title="点击立即刷新远程应用目录"
          onClick={onRefreshCatalog}
        >
          <span className="af-store-header__sync-dot" aria-hidden="true" />
          <AfIcon
            name="refresh"
            size={12}
            className={syncState === "syncing" ? "af-store-header__spin" : undefined}
          />
          <span>{syncTitle}</span>
        </button>

        <button
          type="button"
          className="af-store-header__account"
          aria-label={account ? `当前账号 ${account.name}` : "登录私有商城通行证"}
          onClick={onAccountClick}
        >
          <span className="af-store-header__avatar" aria-hidden="true">
            {account ? account.name.slice(0, 1).toUpperCase() : <AfIcon name="user" size={12} />}
          </span>
          <span className="af-store-header__account-name">
            {account ? account.name : "登录通行证"}
          </span>
          {account?.badge ? (
            <span className="af-store-header__account-badge">{account.badge}</span>
          ) : null}
        </button>

        {extra}
      </div>
    </header>
  );
}
