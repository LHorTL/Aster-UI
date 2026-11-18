import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { AfIcon } from "../../icons";
import { AfButton, AfInput, AfSwitch } from "../../ui";
import { cn, installAfListHover, useImeEnterGuard } from "../../primitives";
import { type AfIntegrationPickerProps, INITIAL_CONNECTED, INTEGRATION_SERVICES } from "../_shared/inputs";
import { INTEGRATION_BRAND_STYLE, NavBrandLogo } from "./_brand";

/**
 * Integration Picker: borderless search header with `Integrations` crumb & `⌘/`,
 * Connected / Available grouped brand list with sliding hover pill,
 * and right detail pane with dual brand tiles, concentric rings, capabilities checklist & connection switch.
 */
export function AfIntegrationPicker({
  appName = "affectUI",
  appIcon,
  services: servicesProp,
  integrations,
  defaultConnected = INITIAL_CONNECTED,
  defaultSelected,
  onConnectedChange,
  onToggle,
  onExplore,
  onBack,
  onClose,
  className,
}: AfIntegrationPickerProps = {}) {
  const services = integrations ?? servicesProp ?? INTEGRATION_SERVICES;
  const [connected, setConnected] = useState<string[]>(defaultConnected);
  const [selectedId, setSelectedId] = useState(
    defaultSelected ?? defaultConnected[0] ?? services[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLSpanElement>(null);
  const ime = useImeEnterGuard();

  useEffect(() => installAfListHover(), []);

  const keyword = query.trim().toLowerCase();
  const matched = services.filter(
    (service) =>
      !keyword ||
      `${service.name} ${service.category ?? ""} ${service.description}`.toLowerCase().includes(keyword),
  );
  const connectedServices = matched.filter((service) => connected.includes(service.id));
  const availableServices = matched.filter((service) => !connected.includes(service.id));
  const flat = [...connectedServices, ...availableServices];
  const service = services.find((item) => item.id === selectedId) ?? services[0];
  if (!service) return null;
  const isConnected = connected.includes(service.id);

  const toggle = (id: string) => {
    setConnected((value) => {
      const willConnect = !value.includes(id);
      const next = willConnect ? [...value, id] : value.filter((item) => item !== id);
      onToggle?.(id, willConnect);
      onConnectedChange?.(next);
      return next;
    });
  };

  const move = (step: number) => {
    if (!flat.length) return;
    const index = flat.findIndex((item) => item.id === selectedId);
    const next = flat[(index + step + flat.length) % flat.length];
    setSelectedId(next.id);
  };

  const handleBack = () => {
    if (query) {
      setQuery("");
    } else if (services[0]) {
      setSelectedId(connected[0] ?? services[0].id);
    }
    onBack?.();
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
    } else if (
      event.key === "ArrowLeft" &&
      !query &&
      (event.target as HTMLElement).tagName === "INPUT"
    ) {
      event.preventDefault();
      handleBack();
    } else if (
      event.key === "Enter" &&
      !ime.shouldBlockEnter(event) &&
      (event.target as HTMLElement).tagName !== "BUTTON"
    ) {
      event.preventDefault();
      toggle(service.id);
    } else if (event.key === "Escape") {
      if (query) {
        event.preventDefault();
        setQuery("");
      } else if (onClose) {
        event.preventDefault();
        onClose();
      }
    } else if (event.key === "/" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      searchRef.current?.querySelector("input")?.focus();
    }
  };

  const renderBrandTile = (item: (typeof services)[number], size: number, cls: string) => {
    const brandSpec = INTEGRATION_BRAND_STYLE[item.id];
    if (brandSpec) {
      const isLight = brandSpec.tileTone === "light";
      const isInk = brandSpec.tileTone === "ink";
      const style: CSSProperties | undefined = isLight
        ? undefined
        : isInk
          ? { background: "var(--af-solid)", color: "var(--af-on-solid)", boxShadow: "none" }
          : { background: brandSpec.bg, color: "#ffffff", boxShadow: "none" };
      return (
        <span className={cls} data-hairline={isLight || undefined} style={style} aria-hidden>
          <NavBrandLogo
            brand={brandSpec.brand}
            size={size}
            fillOverride={!isLight && !isInk ? "#ffffff" : undefined}
          />
        </span>
      );
    }
    return (
      <span className={cls} data-tone={item.tone} aria-hidden>
        <AfIcon name={item.icon} size={size} />
      </span>
    );
  };

  return (
    <div
      className={cn("af-in-inter", className)}
      onCompositionStart={ime.onCompositionStart}
      onCompositionEnd={ime.onCompositionEnd}
      onKeyDown={onPanelKeyDown}
    >
      <header className="af-in-inter__head">
        <button type="button" className="af-in-inter__back" aria-label="Back" onClick={handleBack}>
          <AfIcon name="chevronLeft" size={14} />
        </button>
        <span className="af-in-inter__crumb">Integrations</span>
        <span className="af-in-inter__search" ref={searchRef}>
          <AfInput
            variant="borderless"
            size="sm"
            className="af-in-inter__search-field"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search integrations"
            aria-label="Search integrations"
          />
        </span>
        <kbd className="af-kbd">⌘/</kbd>
      </header>

      <div className="af-in-inter__body">
        <div className="af-in-inter__list" role="listbox" aria-label="Integrations">
          {[
            { label: "Connected", items: connectedServices },
            { label: "Available", items: availableServices },
          ]
            .filter((section) => section.items.length > 0)
            .map((section) => (
              <div key={section.label} className="af-in-inter__section">
                <div className="af-in-inter__section-head">
                  <span>{section.label}</span>
                </div>
                {section.items.map((item) => {
                  const sub = item.category ?? item.description;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={item.id === selectedId}
                      className="af-in-inter__row"
                      data-active={item.id === selectedId || undefined}
                      onClick={() => setSelectedId(item.id)}
                    >
                      {renderBrandTile(item, 16, "af-in-inter__logo")}
                      <span className="af-in-inter__row-text">
                        <span className="af-in-inter__row-name">{item.name}</span>
                        <span className="af-in-inter__row-desc" title={sub}>
                          {sub}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          {flat.length === 0 ? <p className="af-in-inter__empty">No integrations matching “{query}”</p> : null}
        </div>

        <div className="af-in-inter__detail" key={service.id}>
          <div className="af-in-inter__tiles" data-connected={isConnected || undefined}>
            <span className="af-in-inter__wave" aria-hidden />
            <span className="af-in-inter__wave" data-i="2" aria-hidden />
            <span className="af-in-inter__wave" data-i="3" aria-hidden />
            <span className="af-in-inter__tile" data-tone="self" aria-hidden>
              {appIcon ?? <NavBrandLogo brand="affectui" size={22} />}
            </span>
            <span className="af-in-inter__arrow" aria-hidden>
              <svg viewBox="0 0 16 16" width={16} height={16} fill="none">
                <path
                  d="M3.5 6h9L9.8 3.3M12.5 10h-9l2.7 2.7"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {renderBrandTile(service, 22, "af-in-inter__tile")}
          </div>

          <div className="af-in-inter__title-row">
            <h4>
              {appName} + {service.name}
            </h4>
            <AfSwitch tone="accent" checked={isConnected} onChange={() => toggle(service.id)} label={`Connect ${service.name}`} />
          </div>
          <p className="af-in-inter__meta">
            <span>{service.domain}</span>
            <span className="af-in-inter__connected-text" data-on={isConnected || undefined}>
              {isConnected ? "Connected" : "Not connected"}
            </span>
          </p>
          <p className="af-in-inter__desc">{service.description}</p>

          <div className="af-in-inter__caps">
            {service.capabilities.map((capability) => (
              <span key={capability}>
                <AfIcon name="check" size={14} />
                {capability}
              </span>
            ))}
          </div>

          <div className="af-in-inter__detail-foot">
            <AfButton
              size="md"
              variant="secondary"
              iconRight="chevronRight"
              onClick={() => onExplore?.(service.id)}
            >
              Explore integration
            </AfButton>
          </div>
        </div>
      </div>

      <footer className="af-in-inter__foot">
        <span className="af-in-inter__connected">
          <i aria-hidden />
          <span key={connected.length} className="af-in-filter__roll">
            {connected.length}
          </span>{" "}
          of {services.length} connected
        </span>
        <span className="af-in-inter__keys">
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          <span>to move</span>
          <kbd>↵</kbd>
          <span>to switch</span>
        </span>
      </footer>
    </div>
  );
}
