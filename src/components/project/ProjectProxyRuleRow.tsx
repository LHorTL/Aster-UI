import { useState, type ReactNode } from "react";
import { AfIcon, type AfIconName } from "../../icons";
import { cn } from "../../primitives";
import { AfButton, AfSegmented, AfSwitch, AfTag } from "../../ui";
import { CardHead, proxyActions, type ProxyAction, type ProxyRule } from "../_shared/project";

export type AfProjectProxyRule = ProxyRule;
export type AfProjectProxyAction = ProxyAction;

/** 进程分流规则行属性。 */
export type AfProjectProxyRuleRowProps = {
  rules?: AfProjectProxyRule[];
  title?: ReactNode;
  desc?: ReactNode;
  onActionChange?: (rule: AfProjectProxyRule, action: ProxyAction) => void;
  onToggleEnabled?: (rule: AfProjectProxyRule, enabled: boolean) => void;
  onAddRule?: () => void;
  className?: string;
};

const DEFAULT_RULES: AfProjectProxyRule[] = [
  { id: "r1", process: "browser.exe", match: "*.cdn-assets.dev · 443", action: "proxy", enabled: true },
  { id: "r2", process: "node.exe", match: "registry.npmjs.org · 80,443", action: "direct", enabled: true },
  { id: "r3", process: "crash-reporter.exe", match: "telemetry.example.com · ALL", action: "block", enabled: false },
];

function processIcon(proc: string): AfIconName {
  const lower = proc.toLowerCase();
  if (lower.includes("browser") || lower.includes("web")) return "globe";
  if (lower.includes("node") || lower.includes("git") || lower.includes("python")) return "terminal";
  if (lower.includes("telemetry") || lower.includes("crash") || lower.includes("guard")) return "shield";
  return "proxy";
}

/** 进程代理规则行：专属进程磁贴 + 等宽域名端口芯片 + 策略三段切换 + 启用开关。 */
function ProjectProxyRuleRow({
  rules: rulesProp,
  title = "网络分流规则",
  desc = "按本地应用程序与目标域名端口配置路由转发策略",
  onActionChange,
  onToggleEnabled,
  onAddRule,
  className,
}: AfProjectProxyRuleRowProps = {}) {
  const [innerRules, setInnerRules] = useState<AfProjectProxyRule[]>(DEFAULT_RULES);
  const rules = rulesProp ?? innerRules;

  const setAction = (rule: AfProjectProxyRule, next: ProxyAction) => {
    if (!rulesProp) {
      setInnerRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, action: next } : r)));
    }
    onActionChange?.(rule, next);
  };

  const setEnabled = (rule: AfProjectProxyRule, next: boolean) => {
    if (!rulesProp) {
      setInnerRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: next } : r)));
    }
    onToggleEnabled?.(rule, next);
  };

  const activeCount = rules.filter((r) => r.enabled).length;

  return (
    <div className={cn("af-pj-proxy", className)}>
      <CardHead
        title={title}
        desc={desc}
        extra={
          onAddRule ? (
            <AfButton size="xs" variant="secondary" icon="plus" onClick={onAddRule}>
              新建规则
            </AfButton>
          ) : (
            <span className="af-pj-pill-group">
              <AfTag tone="success" dot size="sm">
                规则已启用
              </AfTag>
              <span className="af-pj-count">{activeCount} 条生效</span>
            </span>
          )
        }
      />
      <div className="af-pj-proxy__list" role="list" data-af-hover-list="wash">
        {rules.map((rule) => (
          <div
            className="af-pj-rule"
            key={rule.id}
            role="listitem"
            data-af-hover-item
            data-disabled={!rule.enabled || undefined}
          >
            <span className="af-pj-sqtile af-pj-sqtile--md" data-action={rule.action} aria-hidden="true">
              <AfIcon name={processIcon(rule.process)} size={15} />
            </span>
            <div className="af-pj-rule__main">
              <span className="af-pj-rule__proc">{rule.process}</span>
              <span className="af-pj-rule__match">
                <code className="af-pj-codechip">{rule.match}</code>
              </span>
            </div>
            <AfSegmented
              size="sm"
              value={rule.action}
              disabled={!rule.enabled}
              onChange={(next) => setAction(rule, next as ProxyAction)}
              options={proxyActions}
            />
            <AfSwitch
              checked={rule.enabled}
              aria-label={`启用规则 ${rule.process}`}
              onChange={(checked) => setEnabled(rule, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export { ProjectProxyRuleRow as AfProjectProxyRuleRow };
