import { useRef, type ReactNode } from "react";
import { AfMenu, useWidthMorph, type AfMenuItem } from "../../ui";
import { AfIcon, renderAfIconSlot } from "../../icons";
import { AfAppEntry } from "./types";

/** 左上角应用切换器：展示当前应用图标与名称，菜单列出全部已安装应用；compact 仅显示图标。 */
export function AfAppSwitcher({
  apps,
  value,
  onChange,
  label = "切换应用",
  compact,
  children,
}: {
  /** 全部应用。 */
  apps: AfAppEntry[];
  /** 当前应用 id。 */
  value: string;
  /** 切换回调。 */
  onChange: (id: string) => void;
  /** 菜单标题。 */
  label?: string;
  /** 紧凑模式：只显示图标，用于窄侧栏模式。 */
  compact?: boolean;
  /** 切换器右侧的操作（搜索、收起侧栏等）。 */
  children?: ReactNode;
}) {
  const current = apps.find((app) => app.id === value) ?? apps[0];
  const widthRef = useRef<HTMLButtonElement>(null);
  useWidthMorph(widthRef, compact ? "__compact__" : (current?.id ?? ""));
  const items: AfMenuItem[] = [
    { type: "label", key: "apps-label", label },
    ...apps.map((app) => ({ key: app.id, label: app.id === current?.id ? `${app.name} · 当前` : app.name, icon: app.icon })),
  ];
  return (
    <div className={["af-workspace", compact ? "af-workspace--compact" : undefined].filter(Boolean).join(" ")}>
      <AfMenu align="start" items={items} onSelect={(key) => onChange(key)}>
        {({ toggle, open }) => (
          <button
            ref={widthRef}
            type="button"
            className="af-workspace__switch"
            aria-label={`${label}，当前 ${current?.name ?? "未选择"}`}
            aria-expanded={open}
            onClick={toggle}
          >
            <span className="af-workspace__appicon" aria-hidden>
              {renderAfIconSlot(current?.icon ?? "file", 12)}
            </span>
            <span className="af-workspace__name">{current?.name ?? "选择应用"}</span>
            <AfIcon name="chevronDown" size={12} className="af-workspace__chevron" />
          </button>
        )}
      </AfMenu>
      {children}
    </div>
  );
}
