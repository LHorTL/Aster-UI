import { useMemo, useState, type RefObject } from "react";
import {
  AfButton,
  AfCheckbox,
  AfIcon,
  AfInput,
  AfSwitch,
  AfTag,
  cn,
  useAnimatedList,
  useControllableState,
  useSortableList,
} from "../../ui";

export type AfProxyRuleKind =
  | "PROCESS-NAME"
  | "DOMAIN-SUFFIX"
  | "DOMAIN-KEYWORD"
  | "IP-CIDR"
  | "FINAL";
export type AfProxyRuleVerdict = "PROXY" | "DIRECT" | "REJECT";

export interface AfProxyChainRule {
  id: string;
  kind: AfProxyRuleKind;
  pattern: string;
  verdict: AfProxyRuleVerdict;
  outboundGroup: string;
  enabled: boolean;
}

export interface AfRuleSimulationResult {
  matchedRule: AfProxyChainRule | null;
  matchedIndex: number;
  verdict: AfProxyRuleVerdict;
  outboundGroup: string;
  latencyMs: number;
}

export interface AfRuleChainListProps {
  /** 受控规则链数组（按匹配优先级从上到下排列）。 */
  rules?: AfProxyChainRule[];
  defaultRules?: AfProxyChainRule[];
  onRulesChange?: (next: AfProxyChainRule[]) => void;
  /** 顶部规则命中模拟器输入文本。 */
  testTarget?: string;
  defaultTestTarget?: string;
  onTestTargetChange?: (target: string) => void;
  className?: string;
}

const DEFAULT_CHAIN_RULES: AfProxyChainRule[] = [
  {
    id: "rl-1",
    kind: "PROCESS-NAME",
    pattern: "node.exe",
    verdict: "PROXY",
    outboundGroup: "东京 BGP 专线组",
    enabled: true,
  },
  {
    id: "rl-2",
    kind: "DOMAIN-SUFFIX",
    pattern: "anthropic.com",
    verdict: "PROXY",
    outboundGroup: "美西低延迟 AI 组",
    enabled: true,
  },
  {
    id: "rl-3",
    kind: "DOMAIN-KEYWORD",
    pattern: "telemetry",
    verdict: "REJECT",
    outboundGroup: "广告与遥测阻断",
    enabled: true,
  },
  {
    id: "rl-4",
    kind: "IP-CIDR",
    pattern: "192.168.0.0/16",
    verdict: "DIRECT",
    outboundGroup: "局域网直连",
    enabled: true,
  },
  {
    id: "rl-5",
    kind: "FINAL",
    pattern: "*",
    verdict: "DIRECT",
    outboundGroup: "默认国内直连",
    enabled: true,
  },
];

function parseIpv4Uint32(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let acc = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    acc = ((acc << 8) | n) >>> 0;
  }
  return acc;
}

function matchIpv4Cidr(targetIp: string, cidrPattern: string): boolean {
  const targetNum = parseIpv4Uint32(targetIp);
  if (targetNum === null) return false;
  const [netPart, maskPart] = cidrPattern.split("/");
  if (!netPart) return false;
  const netNum = parseIpv4Uint32(netPart);
  if (netNum === null) return false;
  const prefixLen = maskPart !== undefined ? Number(maskPart) : 32;
  if (!Number.isInteger(prefixLen) || prefixLen < 0 || prefixLen > 32) return false;
  const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0;
  return ((targetNum & mask) >>> 0) === ((netNum & mask) >>> 0);
}

/** 按优先级顺序评估测试目标（域名:端口 / 进程名 / 内网 IP）命中的首条规则。 */
export function evaluateRuleChain(
  rawTarget: string,
  rules: readonly AfProxyChainRule[],
): AfRuleSimulationResult {
  const clean = rawTarget
    .trim()
    .toLowerCase()
    .replace(/^\[([^\]]+)\](?::\d+)?$/, "$1")
    .replace(/:\d+$/, "");
  for (let idx = 0; idx < rules.length; idx += 1) {
    const r = rules[idx];
    if (!r.enabled) continue;
    const pat = r.pattern.trim().toLowerCase();
    let hit = false;

    if (r.kind === "FINAL") {
      hit = true;
    } else if (!clean) {
      hit = false;
    } else if (r.kind === "PROCESS-NAME") {
      hit = clean === pat || clean.endsWith(`/${pat}`) || clean.endsWith(`\\${pat}`);
    } else if (r.kind === "DOMAIN-SUFFIX") {
      hit = clean === pat || clean.endsWith(`.${pat}`);
    } else if (r.kind === "DOMAIN-KEYWORD") {
      hit = Boolean(pat && clean.includes(pat));
    } else if (r.kind === "IP-CIDR") {
      hit = matchIpv4Cidr(clean, pat);
    }

    if (hit) {
      return {
        matchedRule: r,
        matchedIndex: idx,
        verdict: r.verdict,
        outboundGroup: r.outboundGroup,
        latencyMs: Math.round((0.08 + idx * 0.03) * 100) / 100,
      };
    }
  }

  return {
    matchedRule: null,
    matchedIndex: -1,
    verdict: "DIRECT",
    outboundGroup: "未命中任何启用规则（兜底直连）",
    latencyMs: 0.22,
  };
}

function verdictTagTone(v: AfProxyRuleVerdict): "accent" | "success" | "danger" {
  if (v === "PROXY") return "accent";
  if (v === "REJECT") return "danger";
  return "success";
}

/**
 * 系统网络工作台 · 代理分流规则优先级编排链与命中模拟器（`P3-4`）：
 * - 顶部内置实时命中测试输入舱：键入任意域名/进程/IP 即刻高亮首条命中的规则行与最终动作徽章；
 * - 下方列表同时接入 `useSortableList`（指针捕获拖拽调优先级、`Alt+Arrow` 键盘调序）与 `useAnimatedList`（批量删除退场升位）。
 */
export function AfRuleChainList({
  rules: rulesProp,
  defaultRules = DEFAULT_CHAIN_RULES,
  onRulesChange,
  testTarget: targetProp,
  defaultTestTarget = "api.anthropic.com:443",
  onTestTargetChange,
  className,
}: AfRuleChainListProps = {}) {
  const [rules, setRules] = useControllableState<AfProxyChainRule[]>({
    value: rulesProp,
    defaultValue: defaultRules,
    onChange: onRulesChange,
  });

  const [target, setTarget] = useControllableState<string>({
    value: targetProp,
    defaultValue: defaultTestTarget,
    onChange: onTestTargetChange,
  });

  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  const sim = useMemo(() => evaluateRuleChain(target, rules), [target, rules]);

  const sortable = useSortableList({
    items: rules,
    getKey: (r) => r.id,
    onReorder: (next) => {
      const nonFinal = next.filter((r) => r.kind !== "FINAL");
      const finals = next.filter((r) => r.kind === "FINAL");
      setRules([...nonFinal, ...finals]);
    },
  });

  const animated = useAnimatedList({
    items: rules,
    getKey: (r) => r.id,
    exitDuration: 190,
    containerRef: sortable.listRef,
  });

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleBatchToggle = (enabled: boolean) => {
    if (checkedIds.length === 0) return;
    setRules(
      rules.map((r) => (checkedIds.includes(r.id) ? { ...r, enabled } : r)),
    );
  };

  const handleBatchDelete = () => {
    if (checkedIds.length === 0) return;
    setRules(rules.filter((r) => !checkedIds.includes(r.id)));
    setCheckedIds([]);
  };

  return (
    <section className={cn("af-rule-chain", className)} aria-label="分流规则优先级链与命中模拟器">
      {/* 顶部实时规则命中模拟器 */}
      <div className="af-rule-chain__sim">
        <div className="af-rule-chain__sim-input">
          <span className="af-rule-chain__sim-label">
            <AfIcon name="target" size={13} />
            <strong>规则命中实时模拟</strong>
          </span>
          <AfInput
            size="sm"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="输入测试域名、IP 或进程名（如 api.anthropic.com:443 / node.exe）…"
            aria-label="规则命中测试目标"
          />
        </div>

        <div
          key={`${sim.verdict}-${sim.matchedIndex}`}
          className="af-rule-chain__sim-result af-pj-panel-in"
          data-verdict={sim.verdict}
        >
          <AfTag tone={verdictTagTone(sim.verdict)} size="sm">
            {sim.verdict}
          </AfTag>
          <strong>
            {sim.matchedRule
              ? `命中 #${String(sim.matchedIndex + 1).padStart(2, "0")} · ${sim.outboundGroup}`
              : sim.outboundGroup}
          </strong>
          <span className="af-rule-chain__sim-ms">{sim.latencyMs.toFixed(2)} ms</span>
        </div>
      </div>

      {/* 批量管理工具条 */}
      <div className="af-rule-chain__bar">
        <span className="af-rule-chain__hint">
          拖拽左侧手柄调整匹配优先级（从上至下首条命中即终止）
        </span>

        <div className="af-rule-chain__batch">
          <AfButton
            size="sm"
            variant="secondary"
            disabled={checkedIds.length === 0}
            onClick={() => handleBatchToggle(true)}
          >
            批量启用
          </AfButton>
          <AfButton
            size="sm"
            variant="secondary"
            disabled={checkedIds.length === 0}
            onClick={() => handleBatchToggle(false)}
          >
            批量停用
          </AfButton>
          <AfButton
            size="sm"
            variant="ghost"
            icon="trash"
            disabled={checkedIds.length === 0}
            onClick={handleBatchDelete}
          >
            删除选中 ({checkedIds.length})
          </AfButton>
        </div>
      </div>

      {/* 优先级规则链列表 */}
      <div
        ref={sortable.listRef as RefObject<HTMLDivElement>}
        className="af-rule-chain__list"
        data-af-hover-list="hover"
        role="list"
      >
        {animated.entries.map(({ item: rule, key, leaving }) => {
          const idx = rules.findIndex((r) => r.id === rule.id);
          const safeIdx = idx >= 0 ? idx : 0;
          const sortProps = leaving
            ? undefined
            : sortable.getItemProps(rule, safeIdx, { disabled: rule.kind === "FINAL" });
          const isMatched = !leaving && sim.matchedRule?.id === rule.id;
          const checked = checkedIds.includes(rule.id);

          return (
            <div
              key={key}
              data-flip={key}
              data-af-hover-item
              {...sortProps}
              role="listitem"
              data-rule-id={rule.id}
              data-matched={isMatched ? "true" : undefined}
              data-disabled-rule={!rule.enabled ? "true" : undefined}
              data-leaving={leaving ? "true" : undefined}
              className="af-rule-chain__row"
            >
              <span className="af-rule-chain__grip" aria-hidden="true">
                <AfIcon name="grip" size={13} />
              </span>

              <div data-no-drag="true" onClick={(e) => e.stopPropagation()}>
                <AfCheckbox
                  size="sm"
                  variant="plain"
                  checked={checked}
                  disabled={rule.kind === "FINAL"}
                  onCheckedChange={() => toggleChecked(rule.id)}
                  ariaLabel={`勾选规则 ${rule.pattern}`}
                />
              </div>

              <span className="af-rule-chain__prio">
                #{String(safeIdx + 1).padStart(2, "0")}
              </span>

              <span className="af-rule-chain__kind">{rule.kind}</span>

              <code className="af-rule-chain__pattern">{rule.pattern}</code>

              {isMatched ? (
                <span className="af-rule-chain__hit-pill">首条命中</span>
              ) : null}

              <div className="af-rule-chain__right" data-no-drag="true">
                <AfTag tone={verdictTagTone(rule.verdict)} size="sm">
                  {rule.verdict}
                </AfTag>
                <span className="af-rule-chain__group">{rule.outboundGroup}</span>
                <AfSwitch
                  size="sm"
                  checked={rule.enabled}
                  disabled={rule.kind === "FINAL"}
                  onCheckedChange={(en) =>
                    setRules(rules.map((r) => (r.id === rule.id ? { ...r, enabled: en } : r)))
                  }
                  aria-label={`启用规则 ${rule.pattern}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {sortable.ghostPortal}
    </section>
  );
}
