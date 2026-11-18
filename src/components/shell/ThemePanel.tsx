import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AfIcon } from "../../icons";
import { cn, useListFlip } from "../../primitives";
import {
  ASTER_ACCENT_HEX_MAP,
  ASTER_ACCENT_PRESETS,
  ASTER_THEME_PRESETS,
  isAsterAccentPreset,
  useAsterThemeOptional,
  type AsterAccentPreset,
  type AsterDensity,
  type AsterRadiusScale,
  type AsterThemeMode,
  type AsterThemePresetItem,
  type ThemePanelApplyPayload,
  type ThemePanelCreateThemePayload,
  type ThemePanelDeleteThemePayload,
  type ThemePanelSavePayload,
  type ThemePanelUpdateThemePayload,
} from "../../theme";
import { AfColorPicker } from "../advanced/ColorPicker";
import { AfButton, AfIconButton } from "../controls/Button";
import { AfInput } from "../controls/Input";
import { AfSegmented } from "../controls/Segmented";

/** 主题调节面板属性。 */
export type AfThemePanelProps = {
  /** 受控/外置模式值。 */
  mode?: AsterThemeMode;
  /** 受控/外置强调色。 */
  accent?: string;
  /** 受控/外置界面密度。 */
  density?: AsterDensity;
  /** 受控/外置圆角档位。 */
  radius?: AsterRadiusScale;
  /** 主题列表（默认读取上下文内置预设与自定义主题）。 */
  themes?: AsterThemePresetItem[];
  /** 当前激活预设 id。 */
  activeThemeId?: string;
  /** 模式/强调色/密度/圆角合并变更回调（外置受控或桥接宿主使用）。 */
  onApply?: (payload: ThemePanelApplyPayload) => void;
  /** 保存为自定义主题回调。 */
  onSave?: (payload: ThemePanelSavePayload) => void;
  /** 删除自定义主题回调。 */
  onDelete?: (id: string) => void;
  /** 紧凑模式（适配设置侧栏或浮层弹框）。 */
  compact?: boolean;
  /** 顶部说明文案。 */
  description?: ReactNode;
  /** 新建自定义主题的默认名称。 */
  defaultCreateThemeName?: string;
  /** 新建自定义主题的键名前缀。 */
  createThemeKeyPrefix?: string;
  /** 历史宿主迁移兼容：新建主题回调。 */
  onCreateTheme?: (payload: ThemePanelCreateThemePayload) => void;
  /** 历史宿主迁移兼容：更新主题回调。 */
  onUpdateTheme?: (payload: ThemePanelUpdateThemePayload) => void;
  /** 历史宿主迁移兼容：删除主题回调。 */
  onDeleteTheme?: (payload: ThemePanelDeleteThemePayload) => void;
  /** 是否显示保存自定义主题入口，默认 true。 */
  allowSaveCustom?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
};

const PRESET_LABELS: Record<AsterAccentPreset, string> = {
  blue: "科技蓝",
  violet: "鸢尾紫",
  green: "翡翠绿",
  orange: "琥珀橙",
};

/**
 * 主题调节面板：集成明暗模式切换、强调色预设/自定义选色器、界面密度、圆角档位与自定义主题方案保存。
 */
export function AfThemePanel({
  mode: modeProp,
  accent: accentProp,
  density: densityProp,
  radius: radiusProp,
  themes: themesProp,
  activeThemeId: activeThemeIdProp,
  onApply,
  onSave,
  onDelete,
  compact = false,
  description,
  defaultCreateThemeName = "",
  createThemeKeyPrefix,
  onCreateTheme,
  onUpdateTheme,
  onDeleteTheme,
  allowSaveCustom = true,
  className,
  style,
}: AfThemePanelProps = {}) {
  const ctx = useAsterThemeOptional();
  const [draftName, setDraftName] = useState(defaultCreateThemeName);
  const [localState, setLocalState] = useState<{
    mode: AsterThemeMode;
    accent: string;
    density: AsterDensity;
    radius: AsterRadiusScale;
    activeThemeId?: string;
  }>({
    mode: "system",
    accent: "blue",
    density: "comfortable",
    radius: "md",
  });

  const mode = modeProp ?? ctx?.mode ?? localState.mode;
  const accent = accentProp ?? ctx?.accent ?? localState.accent;
  const density = densityProp ?? ctx?.density ?? localState.density;
  const radius = radiusProp ?? ctx?.radius ?? localState.radius;
  const activeThemeId = activeThemeIdProp ?? ctx?.activeThemeId ?? localState.activeThemeId;
  const themes = themesProp ?? ctx?.themes ?? ASTER_THEME_PRESETS;

  const customHex = isAsterAccentPreset(accent) ? ASTER_ACCENT_HEX_MAP[accent] : accent;

  const emitApply = (patch: ThemePanelApplyPayload) => {
    setLocalState((prev) => ({
      ...prev,
      ...(patch.mode ? { mode: patch.mode } : null),
      ...(patch.accent ? { accent: patch.accent } : null),
      ...(patch.density ? { density: patch.density } : null),
      ...(patch.radius ? { radius: patch.radius } : null),
      ...("id" in patch ? { activeThemeId: patch.id } : null),
    }));
    ctx?.applyTheme(patch);
    onApply?.(patch);
  };

  const builtinThemes = themes.filter((t) => t.builtin !== false);
  const customThemes = themes.filter((t) => t.builtin === false);
  const customListRef = useRef<HTMLDivElement>(null);
  const customFlip = useListFlip(customListRef);

  return (
    <div
      className={cn("af-theme-panel", className)}
      data-compact={compact ? "true" : undefined}
      style={style}
    >
      {description ? <p className="af-theme-panel__desc">{description}</p> : null}

      <div className="af-theme-panel__row">
        <div className="af-theme-panel__meta">
          <span className="af-theme-panel__label">外观模式</span>
          <span className="af-theme-panel__sub">切换浅色、深色外观，或跟随系统设置</span>
        </div>
        <AfSegmented
          size="sm"
          value={mode}
          onChange={(next) => emitApply({ mode: next as AsterThemeMode })}
          options={[
            { value: "light", label: "浅色", icon: "sun" },
            { value: "dark", label: "深色", icon: "moon" },
            { value: "system", label: "跟随系统", icon: "sliders" },
          ]}
        />
      </div>

      <div className="af-theme-panel__section">
        <div className="af-theme-panel__section-head">
          <span className="af-theme-panel__label">品牌强调色</span>
          <code className="af-theme-panel__hex">{customHex.toUpperCase()}</code>
        </div>
        <div className="af-theme-panel__presets">
          {ASTER_ACCENT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="af-theme-panel__preset"
              data-active={accent === preset ? "true" : undefined}
              onClick={() => emitApply({ accent: preset })}
            >
              <span className="af-theme-panel__swatch" style={{ background: ASTER_ACCENT_HEX_MAP[preset] }} />
              <span>{PRESET_LABELS[preset]}</span>
            </button>
          ))}
          <AfColorPicker
            variant="swatch"
            value={customHex}
            label="自定义强调色"
            onChange={(hex) => emitApply({ accent: hex })}
          />
        </div>
      </div>

      <div className="af-theme-panel__split">
        <div className="af-theme-panel__section">
          <span className="af-theme-panel__label">控件密度</span>
          <AfSegmented
            size="sm"
            value={density}
            onChange={(next) => emitApply({ density: next as AsterDensity })}
            options={[
              { value: "comfortable", label: "标准 32px" },
              { value: "compact", label: "紧凑 28px" },
            ]}
          />
        </div>

        <div className="af-theme-panel__section">
          <span className="af-theme-panel__label">圆角曲率</span>
          <AfSegmented
            size="sm"
            value={radius}
            onChange={(next) => emitApply({ radius: next as AsterRadiusScale })}
            options={[
              { value: "sm", label: "利落" },
              { value: "md", label: "标准" },
              { value: "lg", label: "柔和" },
            ]}
          />
        </div>
      </div>

      <div className="af-theme-panel__section">
        <span className="af-theme-panel__label">官方主题组合</span>
        <div className="af-theme-panel__presets">
          {builtinThemes.map((item) => (
            <button
              key={item.id}
              type="button"
              className="af-theme-panel__preset af-theme-panel__preset--card"
              data-active={activeThemeId === item.id ? "true" : undefined}
              onClick={() =>
                emitApply({
                  id: item.id,
                  mode: item.mode,
                  accent: item.accent,
                  density: item.density,
                  radius: item.radius,
                })
              }
            >
              <span
                className="af-theme-panel__mode-chip"
                data-mode={item.mode}
                style={{ "--preset-accent": item.accentHex } as CSSProperties}
                aria-hidden="true"
              />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {allowSaveCustom ? (
        <div className="af-theme-panel__section af-theme-panel__section--save">
          <span className="af-theme-panel__label">保存为自定义预设</span>
          <div className="af-theme-panel__save-bar">
            <AfInput
              size="sm"
              placeholder="输入预设名称，如 极简浅灰…"
              value={draftName}
              onValueChange={setDraftName}
            />
            <AfButton
              size="sm"
              variant="primary"
              icon="plus"
              disabled={!draftName.trim()}
              onClick={() => {
                const name = draftName.trim();
                if (!name) return;
                customFlip.capture();
                const generatedId = createThemeKeyPrefix ? `${createThemeKeyPrefix}-${Date.now()}` : undefined;
                const payload: ThemePanelSavePayload = {
                  ...(generatedId ? { id: generatedId } : null),
                  name,
                  mode,
                  accent,
                  density,
                  radius,
                };
                ctx?.saveTheme(payload);
                onSave?.(payload);
                onCreateTheme?.(payload);
                onUpdateTheme?.(payload);
                setDraftName(defaultCreateThemeName);
              }}
            >
              保存主题
            </AfButton>
          </div>
          {customThemes.length > 0 ? (
            <div ref={customListRef} className="af-theme-panel__custom-list" data-af-hover-list="wash">
              {customThemes.map((item) => (
                <div key={item.id} data-flip={item.id} data-af-hover-item className="af-theme-panel__custom-row">
                  <button
                    type="button"
                    className="af-theme-panel__custom-select"
                    data-active={activeThemeId === item.id ? "true" : undefined}
                    onClick={() =>
                      emitApply({
                        id: item.id,
                        mode: item.mode,
                        accent: item.accent,
                        density: item.density,
                        radius: item.radius,
                      })
                    }
                  >
                    <span className="af-theme-panel__swatch" style={{ background: item.accentHex }} />
                    <span>{item.name}</span>
                    <AfIcon name="arrowUpRight" size={11} />
                  </button>
                  <AfIconButton
                    size="xs"
                    icon="trash"
                    label={`删除主题 ${item.name}`}
                    onClick={() => {
                      customFlip.capture();
                      ctx?.deleteTheme(item.id);
                      onDelete?.(item.id);
                      onDeleteTheme?.({ id: item.id });
                    }}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
