import { useState, type CSSProperties } from "react";
import { AfColorPicker } from "../color-picker";
import type { ComponentSpec } from "../types";

const PIXEL_MASK = [1, 1, 1, 0, 1, 0, 1, 0, 1] as const;

function AgentPixelMark({ color, size = 12 }: { color: string; size?: number }) {
  const dot = size === 12 ? 3 : 3;
  const gap = 1.5;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        width: dot * 3 + gap * 2,
        height: dot * 3 + gap * 2,
        gap,
        flex: "none",
      }}
    >
      {PIXEL_MASK.map((on, idx) => (
        <i
          key={idx}
          style={{
            display: "block",
            width: dot,
            height: dot,
            borderRadius: 0.75,
            background: on ? color : "transparent",
          }}
        />
      ))}
    </span>
  );
}

/** Color Picker 舞台（1:1 对齐 affectUI Research agent 实时配色预览卡片）。 */
function ColorPickerSpecimen() {
  const [color, setColor] = useState("#a651f0");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        width: "100%",
        paddingTop: 12,
        paddingBottom: 248,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 10,
          background: "var(--af-surface)",
          boxShadow: "var(--af-shadow-card)",
          overflow: "hidden",
          fontFamily: "var(--af-font)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 14px 14px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span
              style={
                {
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: `color-mix(in srgb, ${color} 12%, transparent)`,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              <AgentPixelMark color={color} />
            </span>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 500, color: "var(--af-strong)" }}>
                Research agent
              </span>
              <span style={{ fontSize: 12, lineHeight: "16px", color: "var(--af-muted)" }}>
                Its color on runs, mentions and the board
              </span>
            </div>
          </div>

          <AfColorPicker defaultOpen label="Agent color" value={color} onValueChange={setColor} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            height: 40,
            padding: "0 16px",
            boxShadow: "inset 0 0.5px 0 var(--af-line)",
            fontSize: 12,
            lineHeight: "16px",
            color: "var(--af-muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                flex: "none",
              }}
              aria-hidden="true"
            >
              <AgentPixelMark color={color} />
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <b style={{ color, fontWeight: 500 }}>Research agent</b> finished “Competitor pricing”
            </span>
          </div>
          <span
            style={{
              flex: "none",
              fontSize: 12,
              lineHeight: "16px",
              color: "var(--af-faint)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            2m
          </span>
        </div>
      </div>
    </div>
  );
}

export const colorPickerSpecs: ComponentSpec[] = [
  {
    id: "color-picker",
    title: "Color Picker",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。SV 画布 + Hue + 可选 Alpha 棋盘格透明度滑条、Hex/RGB/HSL 智能解析与命名快捷色单选组。",
    render: ColorPickerSpecimen,
    width: 460,
    height: 440,
  },
];
