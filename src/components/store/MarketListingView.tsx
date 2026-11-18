import { useMemo, useRef } from "react";
import {
  AfAppMark,
  AfButton,
  AfCountdown,
  AfIcon,
  AfOverflowTagList,
  AfSegmented,
  AfTable,
  AfTag,
  cn,
  useControllableState,
  useListFlip,
  type AfTableColumn,
} from "../../ui";
import { useTweens } from "../../ui-pro";

export type AfMarketViewMode = "table" | "rows" | "split";
export type AfMarketSortKey = "newest" | "price-asc" | "price-desc" | "favorites";

export interface AfMarketGoodsItem extends Record<string, unknown> {
  id: string;
  code: string;
  title: string;
  sect: string;
  bodyType: string;
  server: string;
  gearScore: number;
  achievePoints: number;
  priceCny: number;
  favorites: number;
  status: "publicity" | "selling";
  /** 公示期剩余毫秒数（建议 > 1 天使 compact 格式稳定展示 `Xd XXh XXm`）。 */
  publicityRemainingMs?: number;
  tags: string[];
  summary: string;
}

export interface AfMarketListingViewProps {
  /** 商品数组。 */
  items?: AfMarketGoodsItem[];
  /** 受控视图形态（`table | rows | split`）。 */
  viewMode?: AfMarketViewMode;
  defaultViewMode?: AfMarketViewMode;
  onViewModeChange?: (mode: AfMarketViewMode) => void;
  /** 受控排序键。 */
  sortBy?: AfMarketSortKey;
  defaultSortBy?: AfMarketSortKey;
  onSortChange?: (sort: AfMarketSortKey) => void;
  /** 双栏或行点击当前选中的商品 ID。 */
  selectedGoodsId?: string;
  defaultSelectedGoodsId?: string;
  onSelectGoods?: (item: AfMarketGoodsItem) => void;
  /** 点击购买/锁单回调。 */
  onBuyGoods?: (item: AfMarketGoodsItem) => void;
  /** 点击查看深度 1120px 详情弹窗回调。 */
  onInspectGoods?: (item: AfMarketGoodsItem) => void;
  className?: string;
}

const DEFAULT_MARKET_ITEMS: AfMarketGoodsItem[] = [
  {
    id: "gd-101",
    code: "AST-20261116-8821",
    title: "次世代影视级赛博义体角色 · 含全套面部表情绑定",
    sect: "三维角色",
    bodyType: "团队商业版",
    server: "实时渲染 · Unreal Engine 5",
    gearScore: 9840,
    achievePoints: 14860,
    priceCny: 4280,
    favorites: 86,
    status: "selling",
    tags: ["4K PBR 贴图", "ARKit 52 表情", "布料解算", "LOD0-LOD3", "含工程源码"],
    summary: "完整四级 LOD 拓扑与双骨骼控制器绑定，含 68 张 4K UDIM 材质贴图与示例光照场景，授权证书支持即时签发。",
  },
  {
    id: "gd-102",
    code: "AST-20261116-9045",
    title: "模块化现代科技园区建筑群 · 昼夜动态光照套件",
    sect: "建筑场景",
    bodyType: "企业买断版",
    server: "离线渲染 · Blender Cycles",
    gearScore: 9920,
    achievePoints: 12640,
    priceCny: 6800,
    favorites: 142,
    status: "publicity",
    publicityRemainingMs: 2 * 86400000 + 6 * 3600000 + 1800000,
    tags: ["模块化拼接", "8K 扫描材质", "体积雾预设", "商业买断"],
    summary: "内置 120 组可无缝拼接建筑构件与街道植被资产，附带完整 Cycles / Eevee 双渲染管线预设。",
  },
  {
    id: "gd-103",
    code: "AST-20261116-7719",
    title: "程序化工业金属磨损与织物着色器节点库",
    sect: "PBR 材质",
    bodyType: "个人标准版",
    server: "通用标准 · glTF / GLB",
    gearScore: 9450,
    achievePoints: 9240,
    priceCny: 1350,
    favorites: 39,
    status: "selling",
    tags: ["参数化节点", "无缝平铺", "轻量移动端"],
    summary: "零版权纠纷原创程序化材质库，支持一键烘焙导出标准金属粗糙度工作流贴图，适合独立团队快速搭建场景。",
  },
];

function formatPrice(val: number): string {
  return `¥ ${val.toLocaleString("en-US")}`;
}

/**
 * 数字资产交易市场 · 多态商品列表与双栏速览工作台：
 * - 支持 `table`（复用左右固定列 `AfTable`）、`rows`（高密横卡 + `AfOverflowTagList` + `AfCountdown`）、`split`（左列表 + 右侧 `key={selectedGoodsId}` 平滑切入速览）三态无缝切换。
 */
export function AfMarketListingView({
  items = DEFAULT_MARKET_ITEMS,
  viewMode: viewModeProp,
  defaultViewMode = "split",
  onViewModeChange,
  sortBy: sortProp,
  defaultSortBy = "newest",
  onSortChange,
  selectedGoodsId: selectedProp,
  defaultSelectedGoodsId,
  onSelectGoods,
  onBuyGoods,
  onInspectGoods,
  className,
}: AfMarketListingViewProps = {}) {
  const [viewMode, setViewMode] = useControllableState<AfMarketViewMode>({
    value: viewModeProp,
    defaultValue: defaultViewMode,
    onChange: onViewModeChange,
  });
  const [sortBy, setSortBy] = useControllableState<AfMarketSortKey>({
    value: sortProp,
    defaultValue: defaultSortBy,
    onChange: onSortChange,
  });
  const [selectedId, setSelectedId] = useControllableState<string>({
    value: selectedProp,
    defaultValue: defaultSelectedGoodsId ?? items[0]?.id ?? "",
  });

  const sortedItems = useMemo(() => {
    const copy = [...items];
    if (sortBy === "price-asc") copy.sort((a, b) => a.priceCny - b.priceCny);
    else if (sortBy === "price-desc") copy.sort((a, b) => b.priceCny - a.priceCny);
    else if (sortBy === "favorites") copy.sort((a, b) => b.favorites - a.favorites);
    return copy;
  }, [items, sortBy]);

  const activeItem = useMemo(
    () => sortedItems.find((it) => it.id === selectedId) ?? sortedItems[0] ?? null,
    [sortedItems, selectedId],
  );

  const rowsListRef = useRef<HTMLDivElement>(null);
  const splitListRef = useRef<HTMLDivElement>(null);
  const rowsFlip = useListFlip(rowsListRef);
  const splitFlip = useListFlip(splitListRef);
  const [smoothPrice = 0, smoothGear = 0, smoothAchieve = 0, smoothFavs = 0] = useTweens(
    [
      activeItem?.priceCny ?? 0,
      activeItem?.gearScore ?? 0,
      activeItem?.achievePoints ?? 0,
      activeItem?.favorites ?? 0,
    ],
    380,
  );

  const columns = useMemo<AfTableColumn<AfMarketGoodsItem>[]>(
    () => [
      {
        key: "title",
        title: "数字资产 / 授权规格摘要",
        width: 280,
        fixed: "left",
        render: (_v, row) => (
          <div className="af-mkt-list__tbl-goods">
            <AfAppMark size={32} name={row.sect} tone="accent" />
            <div className="af-mkt-list__tbl-meta">
              <strong>{row.title}</strong>
              <span>
                {row.server} · {row.sect} · {row.bodyType}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "gearScore",
        title: "评级 / 复用量",
        width: 140,
        align: "right",
        sortable: true,
        sortType: "number",
        sortValue: (row) => row.gearScore,
        render: (_v, row) => (
          <span className="af-mkt-list__num">
            {row.gearScore.toLocaleString("en-US")} / {(row.achievePoints / 1000).toFixed(1)}k
          </span>
        ),
      },
      {
        key: "tags",
        title: "核心技术规格标签",
        width: 220,
        render: (_v, row) => <AfOverflowTagList items={row.tags} size="sm" />,
      },
      {
        key: "status",
        title: "状态",
        width: 120,
        render: (_v, row) =>
          row.status === "publicity" ? (
            <AfTag tone="warning" size="sm">
              公示期
            </AfTag>
          ) : (
            <AfTag tone="success" size="sm">
              在售秒发
            </AfTag>
          ),
      },
      {
        key: "priceCny",
        title: "挂牌价 & 操作",
        width: 190,
        align: "right",
        fixed: "right",
        render: (_v, row) => (
          <div className="af-mkt-list__tbl-cta">
            <strong className="af-mkt-list__price">{formatPrice(row.priceCny)}</strong>
            <AfButton
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                onBuyGoods?.(row);
              }}
            >
              选购
            </AfButton>
          </div>
        ),
      },
    ],
    [onBuyGoods],
  );

  const handleSelect = (item: AfMarketGoodsItem) => {
    setSelectedId(item.id);
    onSelectGoods?.(item);
  };

  return (
    <section className={cn("af-mkt-list", className)} aria-label="交易商品列表">
      {/* 顶栏：排序胶囊 + 结果计数 + 三态视图切换 */}
      <div className="af-mkt-list__bar">
        <div className="af-mkt-list__sorts" role="group" aria-label="排序方式">
          {(
            [
              { key: "newest" as const, label: "最新上架" },
              { key: "price-asc" as const, label: "价格升序" },
              { key: "price-desc" as const, label: "价格降序" },
              { key: "favorites" as const, label: "收藏最多" },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              type="button"
              className="af-mkt-list__sort-pill"
              data-active={sortBy === s.key ? "true" : undefined}
              onClick={() => {
                rowsFlip.capture();
                splitFlip.capture();
                setSortBy(s.key);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="af-mkt-list__right">
          <span className="af-mkt-list__count">共 {sortedItems.length} 件在售商品</span>
          <AfSegmented<AfMarketViewMode>
            size="xs"
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: "table", label: "表格" },
              { value: "rows", label: "横卡" },
              { value: "split", label: "双栏速览" },
            ]}
          />
        </div>
      </div>

      <div key={viewMode} className="af-pj-panel-in">
      {/* 形态 1：固定列增强版 AfTable */}
      {viewMode === "table" ? (
        <div className="af-mkt-list__table-wrap">
          <AfTable
            size="sm"
            columns={columns}
            data={sortedItems}
            rowKey="id"
            scrollX={950}
            activeRowKey={selectedId}
            onRowClick={(row) => handleSelect(row)}
          />
        </div>
      ) : null}

      {/* 形态 2：高密横卡视图 */}
      {viewMode === "rows" ? (
        <div ref={rowsListRef} className="af-mkt-list__rows" role="list">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              data-flip={item.id}
              role="button"
              tabIndex={0}
              className="af-mkt-list__row-card"
              data-selected={item.id === selectedId ? "true" : undefined}
              onClick={() => handleSelect(item)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(item);
                }
              }}
            >
              <AfAppMark size={44} name={item.sect} tone="accent" />
              <div className="af-mkt-list__row-main">
                <div className="af-mkt-list__row-head">
                  <strong>{item.title}</strong>
                  {item.status === "publicity" && item.publicityRemainingMs ? (
                    <span className="af-mkt-list__pub-badge">
                      <AfIcon name="clock" size={11} />
                      <span>公示剩余</span>
                      <AfCountdown
                        durationMs={item.publicityRemainingMs}
                        format="compact"
                        size="xs"
                        paused
                      />
                    </span>
                  ) : (
                    <AfTag tone="success" size="sm">
                      即时交付
                    </AfTag>
                  )}
                </div>
                <span className="af-mkt-list__row-sub">
                  {item.server} · {item.sect}({item.bodyType}) · 评级 {item.gearScore.toLocaleString("en-US")} · 收藏 {item.favorites}
                </span>
                <AfOverflowTagList items={item.tags} size="sm" />
              </div>
              <div className="af-mkt-list__row-side">
                <strong className="af-mkt-list__price">{formatPrice(item.priceCny)}</strong>
                <div className="af-mkt-list__row-btns">
                  <AfButton
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectGoods?.(item);
                    }}
                  >
                    详情
                  </AfButton>
                  <AfButton
                    size="sm"
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBuyGoods?.(item);
                    }}
                  >
                    立即锁单
                  </AfButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* 形态 3：左列表 + 右侧 key={selectedGoodsId} 速览 */}
      {viewMode === "split" ? (
        <div className="af-mkt-list__split">
          <div ref={splitListRef} className="af-mkt-list__split-left" data-af-hover-list="hover" role="listbox" aria-label="商品列表">
            {sortedItems.map((item, idx) => {
              const active = item.id === activeItem?.id;
              return (
                <div
                  key={item.id}
                  data-flip={item.id}
                  role="option"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  data-af-hover-item
                  data-selected={active ? "true" : undefined}
                  className="af-mkt-list__split-item"
                  onClick={() => handleSelect(item)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(item);
                      return;
                    }
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      const nextIdx =
                        (idx + (e.key === "ArrowDown" ? 1 : -1) + sortedItems.length) %
                        sortedItems.length;
                      const nextItem = sortedItems[nextIdx];
                      if (nextItem) {
                        handleSelect(nextItem);
                        const opts = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="option"]');
                        opts?.[nextIdx]?.focus();
                      }
                    }
                  }}
                >
                  <AfAppMark size={36} name={item.sect} tone={active ? "accent" : "neutral"} />
                  <div className="af-mkt-list__split-item-main">
                    <strong>{item.title}</strong>
                    <span>
                      {item.server} · {item.sect} · {item.bodyType}
                    </span>
                    <AfOverflowTagList items={item.tags} size="sm" />
                  </div>
                  <strong className="af-mkt-list__price">{formatPrice(item.priceCny)}</strong>
                </div>
              );
            })}
          </div>

          {activeItem ? (
            <div key={activeItem.id} className="af-mkt-list__split-detail af-pj-panel-in">
              <div className="af-mkt-list__detail-top">
                <div>
                  <span className="af-mkt-list__code">{activeItem.code}</span>
                  <h4>{activeItem.title}</h4>
                </div>
                <strong className="af-mkt-list__price af-mkt-list__price--lg">
                  {formatPrice(Math.round(smoothPrice))}
                </strong>
              </div>

              <div className="af-mkt-list__detail-stats">
                <div>
                  <span>兼容生态</span>
                  <strong>{activeItem.server}</strong>
                </div>
                <div>
                  <span>质量评级</span>
                  <strong>{Math.round(smoothGear).toLocaleString("en-US")}</strong>
                </div>
                <div>
                  <span>累计复用</span>
                  <strong>{Math.round(smoothAchieve).toLocaleString("en-US")}</strong>
                </div>
                <div>
                  <span>关注热度</span>
                  <strong>{Math.round(smoothFavs)} 人收藏</strong>
                </div>
              </div>

              <p className="af-mkt-list__detail-desc">{activeItem.summary}</p>

              <AfOverflowTagList items={activeItem.tags} size="sm" />

              <div className="af-mkt-list__detail-foot">
                <AfButton
                  size="sm"
                  variant="secondary"
                  icon="maximize"
                  onClick={() => onInspectGoods?.(activeItem)}
                >
                  3D 资产深度检视
                </AfButton>
                <AfButton
                  size="sm"
                  variant="primary"
                  icon="wallet"
                  onClick={() => onBuyGoods?.(activeItem)}
                >
                  锁定订单并支付
                </AfButton>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      </div>
    </section>
  );
}
