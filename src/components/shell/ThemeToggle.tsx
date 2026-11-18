import { AfTooltip } from "../../ui";
import { AfIcon } from "../../icons";

/** 明暗主题切换：太阳/月亮双图标交叉旋转，按钮尺寸与窗口操作保持一致。 */
export function AfThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <AfTooltip label={dark ? "切换到浅色" : "切换到深色"} side="bottom">
      <button type="button" className="af-theme" data-dark={dark || undefined} aria-label={dark ? "切换到浅色" : "切换到深色"} aria-pressed={dark} onClick={onToggle}>
        <span className="af-theme__icon af-theme__sun" aria-hidden>
          <AfIcon name="sun" size={14} />
        </span>
        <span className="af-theme__icon af-theme__moon" aria-hidden>
          <AfIcon name="moon" size={14} />
        </span>
      </button>
    </AfTooltip>
  );
}
