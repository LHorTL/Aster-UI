import { useEffect, useMemo, useRef, useState } from "react";
import {
  AfAutoComplete,
  AfButton,
  AfCascader,
  AfIcon,
  AfIconButton,
  AfNumberInput,
  AfSelect,
  AfTag,
  cn,
  useControllableState,
  useListFlip,
  type AfAutoCompleteOption,
  type AfCascaderOption,
} from "../../ui";
import { useTween } from "../../ui-pro";

export interface AfMarketAttrRule {
  id: string;
  field: string;
  operator: ">=" | "=";
  value: number;
}

export interface AfMarketFilterPreset {
  id: string;
  name: string;
  keyword: string;
  serverPath: string[];
  bodyTypes: string[];
  sects: string[];
  minPrice: number | null;
  maxPrice: number | null;
}

export interface AfMarketFilterValue {
  keyword: string;
  serverPath: string[];
  bodyTypes: string[];
  sects: string[];
  minPrice: number | null;
  maxPrice: number | null;
  priceUnit: string;
  attributes: AfMarketAttrRule[];
}

export interface AfMarketFilterBarProps {
  /** 受控筛选条件对象。 */
  value?: AfMarketFilterValue;
  /** 非受控默认筛选条件。 */
  defaultValue?: AfMarketFilterValue;
  /** 条件变更回调。 */
  onChange?: (next: AfMarketFilterValue) => void;
  /** 搜索候选词列表。 */
  suggestions?: AfAutoCompleteOption[];
  /** 分区/生态级联树。 */
  serverOptions?: AfCascaderOption[];
  /** 常用筛选预设列表。 */
  presets?: AfMarketFilterPreset[];
  /** 保存新预设回调。 */
  onSavePreset?: (preset: AfMarketFilterPreset) => void;
  /** 重置回调。 */
  onReset?: () => void;
  className?: string;
}

const DEFAULT_SUGGESTIONS: AfAutoCompleteOption[] = [
  { value: "次世代科幻机甲 · PBR", group: "最近搜索", icon: "clock", removable: true },
  { value: "赛博街区模块化场景", group: "最近搜索", icon: "clock", removable: true },
  { value: "写实角色面部绑定包", group: "热门资产词条", icon: "sparkle" },
  { value: "影视级体积云与光效", group: "热门资产词条", icon: "sparkle" },
  { value: "8K 扫描建筑材质合集", group: "热门资产词条", icon: "bolt" },
];

const DEFAULT_SERVERS: AfCascaderOption[] = [
  {
    value: "rt",
    label: "实时渲染引擎",
    children: [
      { value: "ue5", label: "Unreal Engine 5" },
      { value: "unity", label: "Unity HDRP" },
      { value: "godot", label: "Godot 4" },
    ],
  },
  {
    value: "dcc",
    label: "数字内容创作",
    children: [
      { value: "blender", label: "Blender Cycles" },
      { value: "c4d", label: "Cinema 4D" },
    ],
  },
  {
    value: "std",
    label: "通用交换标准",
    children: [
      { value: "gltf", label: "glTF / GLB" },
      { value: "usdz", label: "OpenUSD" },
    ],
  },
];

const BODY_TYPES = ["个人标准版", "团队商业版", "企业买断版", "教育研究版"] as const;
const SECTS = ["三维角色", "建筑场景", "PBR 材质", "粒子特效", "动作捕捉", "绑定预设", "着色器", "音频采样"] as const;

const ATTR_FIELD_OPTIONS = [
  { value: "gearScore", label: "质量评级分" },
  { value: "texCount", label: "4K 贴图张数" },
  { value: "lodCount", label: "LOD 层级数" },
  { value: "achievePts", label: "累计复用次数" },
];

const DEFAULT_FILTER_VALUE: AfMarketFilterValue = {
  keyword: "",
  serverPath: ["rt", "ue5"],
  bodyTypes: ["团队商业版"],
  sects: ["三维角色", "建筑场景"],
  minPrice: 200,
  maxPrice: 4800,
  priceUnit: "cny",
  attributes: [
    { id: "attr-1", field: "achievePts", operator: ">=", value: 1200 },
  ],
};

const DEFAULT_PRESETS: AfMarketFilterPreset[] = [
  {
    id: "pre-1",
    name: "UE5 商业授权 · 高精角色",
    keyword: "",
    serverPath: ["rt", "ue5"],
    bodyTypes: ["团队商业版"],
    sects: ["三维角色", "建筑场景"],
    minPrice: 200,
    maxPrice: 4800,
  },
  {
    id: "pre-2",
    name: "企业买断全场景资产包",
    keyword: "模块化场景",
    serverPath: ["dcc", "blender"],
    bodyTypes: ["企业买断版"],
    sects: ["建筑场景", "PBR 材质"],
    minPrice: 1500,
    maxPrice: 12000,
  },
];

/**
 * 数字资产交易市场 · 吸顶多维商品检索舱：
 * - 100% 复用增强版分组 `AfAutoComplete`（单条删除/清空历史）、`AfCascader` 二级生态选择、双端 `AfNumberInput`（`commitMode="blur"` + 单位切换）；
 * - 支持授权规格/资产类型多选胶囊、动态高级指标增删与常用筛选预设存取。
 */
export function AfMarketFilterBar({
  value: valueProp,
  defaultValue = DEFAULT_FILTER_VALUE,
  onChange,
  suggestions: suggestionsProp,
  serverOptions = DEFAULT_SERVERS,
  presets: presetsProp,
  onSavePreset,
  onReset,
  className,
}: AfMarketFilterBarProps = {}) {
  const [filter, setFilter] = useControllableState<AfMarketFilterValue>({
    value: valueProp,
    defaultValue,
    onChange,
  });

  const [suggestions, setSuggestions] = useState<AfAutoCompleteOption[]>(
    suggestionsProp ?? DEFAULT_SUGGESTIONS,
  );
  const [presets, setPresets] = useState<AfMarketFilterPreset[]>(
    presetsProp ?? DEFAULT_PRESETS,
  );

  useEffect(() => {
    if (suggestionsProp !== undefined) {
      setSuggestions(suggestionsProp);
    }
  }, [suggestionsProp]);

  useEffect(() => {
    if (presetsProp !== undefined) {
      setPresets(presetsProp);
    }
  }, [presetsProp]);

  const patch = (partial: Partial<AfMarketFilterValue>) => {
    setFilter({ ...filter, ...partial });
  };

  const togglePill = (list: string[], item: string): string[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const attrListRef = useRef<HTMLDivElement>(null);
  const attrFlip = useListFlip(attrListRef);

  const handleAddAttr = () => {
    attrFlip.capture();
    const nextAttr: AfMarketAttrRule = {
      id: `attr-${Date.now()}`,
      field: "gearScore",
      operator: ">=",
      value: 9200,
    };
    patch({ attributes: [...filter.attributes, nextAttr] });
  };

  const handleRemoveAttr = (id: string) => {
    attrFlip.capture();
    patch({ attributes: filter.attributes.filter((a) => a.id !== id) });
  };

  const handleSavePreset = () => {
    const labelParts = [
      filter.bodyTypes[0] ?? "全规格",
      filter.keyword || (filter.minPrice ? `¥${filter.minPrice}+` : "自选配置"),
    ];
    const created: AfMarketFilterPreset = {
      id: `pre-${Date.now()}`,
      name: labelParts.join(" · "),
      keyword: filter.keyword,
      serverPath: filter.serverPath,
      bodyTypes: filter.bodyTypes,
      sects: filter.sects,
      minPrice: filter.minPrice,
      maxPrice: filter.maxPrice,
    };
    setPresets([created, ...presets]);
    onSavePreset?.(created);
  };

  const handleReset = () => {
    setFilter({
      keyword: "",
      serverPath: [],
      bodyTypes: [],
      sects: [],
      minPrice: null,
      maxPrice: null,
      priceUnit: "cny",
      attributes: [],
    });
    onReset?.();
  };

  const activeCount = useMemo(() => {
    let n = 0;
    if (filter.keyword.trim()) n += 1;
    if (filter.serverPath.length > 0) n += 1;
    n += filter.bodyTypes.length + filter.sects.length + filter.attributes.length;
    if (filter.minPrice !== null || filter.maxPrice !== null) n += 1;
    return n;
  }, [filter]);

  return (
    <section className={cn("af-mkt-filter", className)} aria-label="商品多维检索舱">
      {/* 第一行：关键词联想 + 引擎生态级联 + 常用预设胶囊 */}
      <div className="af-mkt-filter__top">
        <div className="af-mkt-filter__search">
          <AfAutoComplete
            size="sm"
            leadingIcon
            allowClear
            value={filter.keyword}
            onChange={(v) => patch({ keyword: v })}
            options={suggestions}
            clearableGroups={["最近搜索"]}
            onRemoveOption={(val) =>
              setSuggestions((prev) => prev.filter((item) => item.value !== val))
            }
            onClearGroup={(grp) =>
              setSuggestions((prev) => prev.filter((item) => item.group !== grp))
            }
            placeholder="搜索模型名称、PBR 材质、绑定规格或资产编号…"
            aria-label="搜索商品关键词"
          />
        </div>

        <div className="af-mkt-filter__cascader">
          <AfCascader
            size="sm"
            options={serverOptions}
            value={filter.serverPath}
            onChange={(path) => patch({ serverPath: path })}
            expandTrigger="hover"
            searchable
            allowClear
            placeholder="选择生态 / 目标格式"
            label="兼容生态"
          />
        </div>

        <div className="af-mkt-filter__presets" aria-label="快捷筛选预设">
          {presets.slice(0, 2).map((pre) => (
            <button
              key={pre.id}
              type="button"
              className="af-mkt-filter__preset-pill"
              onClick={() =>
                patch({
                  keyword: pre.keyword,
                  serverPath: pre.serverPath,
                  bodyTypes: pre.bodyTypes,
                  sects: pre.sects,
                  minPrice: pre.minPrice,
                  maxPrice: pre.maxPrice,
                })
              }
            >
              <AfIcon name="bookmark" size={11} />
              <span>{pre.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 第二行：授权规格与资产类型多选胶囊 */}
      <div className="af-mkt-filter__pills-row">
        <div className="af-mkt-filter__pill-group" role="group" aria-label="授权规格筛选">
          <span className="af-mkt-filter__label">规格</span>
          <div className="af-mkt-filter__pills">
            {BODY_TYPES.map((bt) => {
              const active = filter.bodyTypes.includes(bt);
              return (
                <button
                  key={bt}
                  type="button"
                  aria-pressed={active}
                  className="af-mkt-filter__pill"
                  data-active={active ? "true" : undefined}
                  onClick={() => patch({ bodyTypes: togglePill(filter.bodyTypes, bt) })}
                >
                  {bt}
                </button>
              );
            })}
          </div>
        </div>

        <div className="af-mkt-filter__pill-group" role="group" aria-label="资产类型筛选">
          <span className="af-mkt-filter__label">品类</span>
          <div className="af-mkt-filter__pills">
            {SECTS.map((sect) => {
              const active = filter.sects.includes(sect);
              return (
                <button
                  key={sect}
                  type="button"
                  aria-pressed={active}
                  className="af-mkt-filter__pill"
                  data-active={active ? "true" : undefined}
                  onClick={() => patch({ sects: togglePill(filter.sects, sect) })}
                >
                  {sect}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 第三行：价格区间双端输入 + 动态词条行 + 保存预设 / 重置 */}
      <div className="af-mkt-filter__bottom">
        <div className="af-mkt-filter__price">
          <span className="af-mkt-filter__label">价格区间</span>
          <div className="af-mkt-filter__price-inputs">
            <AfNumberInput
              aria-label="最低价格"
              min={0}
              max={999999}
              step={100}
              controls={false}
              commitMode="blur"
              value={filter.minPrice}
              onChange={(v: number | null) => {
                if (v !== null && filter.maxPrice !== null && v > filter.maxPrice) {
                  patch({ minPrice: filter.maxPrice, maxPrice: v });
                } else {
                  patch({ minPrice: v });
                }
              }}
              unitOptions={[
                { value: "cny", label: "元" },
                { value: "pts", label: "点数" },
              ]}
              unitValue={filter.priceUnit}
              onUnitChange={(u) => patch({ priceUnit: u })}
            />
            <span className="af-mkt-filter__price-sep">—</span>
            <AfNumberInput
              aria-label="最高价格"
              min={0}
              max={999999}
              step={100}
              controls={false}
              commitMode="blur"
              value={filter.maxPrice}
              onChange={(v: number | null) => {
                if (v !== null && filter.minPrice !== null && v < filter.minPrice) {
                  patch({ minPrice: v, maxPrice: filter.minPrice });
                } else {
                  patch({ maxPrice: v });
                }
              }}
              unit={filter.priceUnit === "pts" ? "点数" : "元"}
            />
          </div>
        </div>

        <div ref={attrListRef} className="af-mkt-filter__attrs">
          {filter.attributes.map((attr) => (
            <div key={attr.id} data-flip={attr.id} className="af-mkt-filter__attr-chip">
              <AfSelect
                size="sm"
                value={attr.field}
                onChange={(val) =>
                  patch({
                    attributes: filter.attributes.map((a) =>
                      a.id === attr.id ? { ...a, field: String(val) } : a,
                    ),
                  })
                }
                options={ATTR_FIELD_OPTIONS}
              />
              <button
                type="button"
                className="af-mkt-filter__attr-op"
                aria-label={`切换比较符（当前 ${attr.operator === "=" ? "等于" : "大于等于"}）`}
                onClick={() =>
                  patch({
                    attributes: filter.attributes.map((a) =>
                      a.id === attr.id ? { ...a, operator: a.operator === "=" ? ">=" : "=" } : a,
                    ),
                  })
                }
              >
                {attr.operator === "=" ? "=" : "≥"}
              </button>
              <AfNumberInput
                aria-label="词条阈值"
                min={0}
                step={1000}
                controls={false}
                commitMode="blur"
                value={attr.value}
                onChange={(v: number | null) =>
                  patch({
                    attributes: filter.attributes.map((a) =>
                      a.id === attr.id ? { ...a, value: v ?? 0 } : a,
                    ),
                  })
                }
              />
              <AfIconButton
                size="sm"
                variant="ghost"
                icon="x"
                aria-label="移除该高级词条"
                onClick={() => handleRemoveAttr(attr.id)}
              />
            </div>
          ))}
          <button
            type="button"
            className="af-mkt-filter__add-attr"
            onClick={handleAddAttr}
          >
            <AfIcon name="plus" size={11} />
            <span>添加词条</span>
          </button>
        </div>

        <div className="af-mkt-filter__actions">
          <AfTag tone="accent" size="sm">
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              已启用 {Math.round(useTween(activeCount, 240))} 项条件
            </span>
          </AfTag>
          <AfButton size="sm" variant="secondary" onClick={handleSavePreset}>
            保存预设
          </AfButton>
          <AfButton size="sm" variant="ghost" icon="refresh" onClick={handleReset}>
            重置
          </AfButton>
        </div>
      </div>
    </section>
  );
}
