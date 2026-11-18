import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AfExpand, AfIcon, AfKbd, AfSegmented, AfSwitch, useMenuHighlight } from "../../ui";
import { AfSwap, useTween } from "../../ui-pro";
import { cn, useControllableState } from "../../primitives";
import {
  ModelBars,
  type ModelEffort,
  type ModelPickerProps,
  type PickerModel,
  StagePopover,
  composerModels,
  effortFactor,
  effortOptions,
} from "../_shared/chat";

function AutoStarSvg() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true">
      <path d="M8 2c.24 2.45 1.31 3.52 3.76 3.76C9.31 6 8.24 7.07 8 9.52 7.76 7.07 6.69 6 4.24 5.76 6.69 5.52 7.76 4.45 8 2Z" />
      <path d="M12.2 9.4c.13 1.15.61 1.63 1.76 1.76-1.15.13-1.63.61-1.76 1.76-.13-1.15-.61-1.63-1.76-1.76 1.15-.13 1.63-.61 1.76-1.76Z" />
    </svg>
  );
}

function ModelGlyph({ model }: { model?: PickerModel }) {
  const id = (model?.id ?? "").toLowerCase();
  const letter = (model?.letter ?? "").toUpperCase();
  if (id === "auto") return <AutoStarSvg />;
  if (id.includes("opus") || letter === "O") {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" aria-hidden="true">
        <path d="M8 2.2v11.6M2.2 8h11.6M3.9 3.9l8.2 8.2M12.1 3.9l-8.2 8.2" />
      </svg>
    );
  }
  if (id.includes("sonnet") || letter === "S") {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
        <path d="M8 1.9c.34 3.2 1.76 4.62 4.96 4.96C9.76 7.2 8.34 8.62 8 11.82 7.66 8.62 6.24 7.2 3.04 6.86 6.24 6.52 7.66 5.1 8 1.9Z" />
      </svg>
    );
  }
  if (id.includes("haiku") || letter === "H") {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
        <path d="M8.9 2.1 4.1 8.8h3.65L7.1 13.9l4.8-6.7H8.25L8.9 2.1Z" />
      </svg>
    );
  }
  return <>{model?.letter ?? "S"}</>;
}

/**
 * Model Picker: compact 28px trigger with 18x18 rounded-5px model tile + thinking bulb +
 * 320px rounded-10px single-card menu (gliding highlight, horizontal 5-segment SPEED/QUALITY/COST meters,
 * Extended thinking + Effort segmented control, Web search, and tweened first-token / price footer).
 */
function ModelPicker({
  models = composerModels,
  value: valueProp,
  defaultValue,
  onChange,
  onModelChange,
  thinking: thinkingProp,
  defaultThinking = false,
  onThinkingChange,
  effort: effortProp,
  defaultEffort = "medium",
  onEffortChange,
  webSearch: webSearchProp,
  defaultWebSearch = false,
  onWebSearchChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  align = "start",
  side = "bottom",
  compact = false,
  className,
}: ModelPickerProps) {
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue: defaultValue ?? models[0]?.id ?? "",
  });
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [thinking, setThinking] = useControllableState({
    value: thinkingProp,
    defaultValue: defaultThinking,
    onChange: onThinkingChange,
  });
  const [effort, setEffort] = useControllableState<ModelEffort>({
    value: effortProp,
    defaultValue: defaultEffort,
    onChange: onEffortChange,
  });
  const [webSearch, setWebSearch] = useControllableState({
    value: webSearchProp,
    defaultValue: defaultWebSearch,
    onChange: onWebSearchChange,
  });

  const [active, setActive] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const onModelChangeRef = useRef(onModelChange);
  onModelChangeRef.current = onModelChange;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const selected = models.find((model) => model.id === value) ?? models[0];
  const pointed = (active >= 0 ? models[active] : undefined) ?? selected;
  const thumb = useMenuHighlight(listRef, active, open, `${models.length}:${compact ? 1 : 0}`);

  const latency = (pointed?.latencyMs ?? 0) * (thinking ? effortFactor[effort] : 1);
  const tweenedLatency = useTween(latency, 360);
  const tweenedPrice = useTween(pointed?.pricePerM ?? 0, 360);

  const openMenu = () => {
    setActive(Math.max(0, models.findIndex((model) => model.id === value)));
    setOpen(true);
  };

  const choose = (model: PickerModel) => {
    setValue(model.id);
    onChangeRef.current?.(model.id, model);
    onModelChangeRef.current?.(model);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    const insideSettings = Boolean((event.target as HTMLElement).closest(".af-ch-model__settings"));
    if (!open) {
      if (!insideSettings && (event.key === "Enter" || event.key === " " || event.key === "ArrowDown")) {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (insideSettings) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) =>
        index < 0 ? (step > 0 ? 0 : models.length - 1) : (index + step + models.length) % models.length,
      );
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(models.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = active >= 0 ? models[active] : undefined;
      if (picked) choose(picked);
    }
  };

  return (
    <div className={cn("af-ch-model", className)} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className="af-ch-model__trigger"
        data-compact={compact || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Model: ${selected?.name ?? "Auto"}${thinking ? ", extended thinking enabled" : ""}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span className="af-ch-model__letter" aria-hidden>
          <ModelGlyph model={selected} />
        </span>
        <AfSwap swapKey={selected?.id ?? ""} className="af-ch-model__swap">
          <span className="af-ch-model__name">{selected?.name ?? "Auto"}</span>
        </AfSwap>
        <span className="af-ch-model__bulb" data-open={thinking || undefined} aria-hidden>
          <AfIcon name="bulb" size={13} />
        </span>
        <AfIcon name="chevronDown" size={12} className="af-ch-model__chevron" />
      </button>

      <StagePopover
        open={open}
        anchorRef={triggerRef}
        align={align}
        side={side}
        role="dialog"
        label="Select model"
        onClose={() => setOpen(false)}
        className={cn("af-ch-model__menu", compact && "af-ch-model__menu--compact")}
      >
        <div className="af-ch-model__card">
          <div className="af-ch-model__head" aria-hidden>
            <span className="af-ch-model__headlabel">Model</span>
            <span className="af-ch-model__cols">
              <span>Speed</span>
              <span>Quality</span>
              <span>Cost</span>
            </span>
          </div>

          <div
            ref={listRef}
            className="af-ch-model__list"
            data-pointing={active >= 0 || undefined}
            role="listbox"
            aria-label="Models"
            aria-activedescendant={active >= 0 && pointed ? `af-ch-model-${pointed.id}` : undefined}
            onPointerLeave={() => setActive(-1)}
          >
            {thumb ? (
              <span
                className="af-menu__thumb"
                style={
                  {
                    transform: `translate(${thumb.x}px, ${thumb.y}px)`,
                    width: thumb.width,
                    height: thumb.height,
                    borderRadius: "6px",
                  } as CSSProperties
                }
                aria-hidden="true"
              />
            ) : null}
            {models.map((model, index) => {
              const isSelected = model.id === value;
              const isLit = index === active || (active < 0 && isSelected);
              return (
                <div
                  key={model.id}
                  id={`af-ch-model-${model.id}`}
                  role="option"
                  aria-selected={isSelected}
                  className="af-ch-model__row"
                  data-menu-index={index}
                  data-active={index === active || undefined}
                  data-lit={isLit || undefined}
                  data-selected={isSelected || undefined}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => choose(model)}
                >
                  <span className="af-ch-model__rowletter" aria-hidden>
                    <ModelGlyph model={model} />
                  </span>
                  <span className="af-ch-model__rowtext">
                    <span className="af-ch-model__rowname">
                      {model.name}
                      {isSelected ? <AfIcon name="check" size={12} /> : null}
                    </span>
                    <span className="af-ch-model__rowdesc">{model.description}</span>
                  </span>
                  <ModelBars model={model} />
                </div>
              );
            })}
          </div>

          <div className="af-ch-model__settings">
            <div className="af-ch-model__toggle">
              <AfIcon name="bulb" size={15} className="af-ch-model__toggleicon" />
              <span className="af-ch-model__togglelabel">Extended thinking</span>
              <AfSwitch checked={thinking} onChange={setThinking} label="Extended thinking" />
            </div>
            <AfExpand open={thinking}>
              <div className="af-ch-model__effort">
                <span className="af-ch-model__effortlabel">Effort</span>
                <AfSegmented<ModelEffort>
                  size="sm"
                  label="Effort"
                  value={effort}
                  onChange={setEffort}
                  options={effortOptions.map((option) => ({ value: option.value, label: option.label }))}
                />
              </div>
            </AfExpand>
            <div className="af-ch-model__toggle">
              <AfIcon name="globe" size={15} className="af-ch-model__toggleicon" />
              <span className="af-ch-model__togglelabel">Web search</span>
              <AfSwitch checked={webSearch} onChange={setWebSearch} label="Web search" />
            </div>
          </div>

          {!compact ? (
            <div className="af-ch-model__foot">
              <span className="af-ch-model__caption">
                ~<b>{(tweenedLatency / 1000).toFixed(1)}s</b> first token · <b>${tweenedPrice.toFixed(0)}</b> / M tokens
              </span>
              <span className="af-ch-model__keys" aria-hidden>
                <AfKbd>↑↓</AfKbd>
                <AfKbd>↵</AfKbd>
              </span>
            </div>
          ) : null}
        </div>
      </StagePopover>
    </div>
  );
}

export { ModelPicker as AfModelPicker };
