import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AfIcon } from "../../icons";
import { AfButton, AfCopyButton, AfInput, AfSelect, AfSwitch } from "../../ui";
import { cn } from "../../primitives";
import {
  type AfIntegrationSettingsProps,
  INTEGRATION_DEFAULTS,
  INTEGRATION_TIMEZONES,
  type IntegrationSnapshot,
} from "../_shared/inputs";
import { NavBrandLogo } from "./_brand";

/**
 * Integration Settings card: header with Shopify green shopping-bag logo, title, count badge,
 * connection status & master toggle; one-time generated API key with green fresh-key highlight & regenerate;
 * `https://` domain validation; timezone selector with clock glyph; and smooth collapsible unsaved changes bar.
 */
export function AfIntegrationSettings({
  name,
  title,
  logo,
  badge,
  count,
  meta,
  icon,
  defaultValue,
  defaultValues,
  siteHint = "Your store's primary domain from Settings › Domains",
  timezones,
  timeZones,
  onGenerateKey,
  onToggle,
  onSave,
  className,
}: AfIntegrationSettingsProps = {}) {
  const effectiveName = title ?? name ?? "Shopify store";
  const effectiveBadge = count !== undefined ? count : badge !== undefined ? badge : "128";

  const normalizedZones = useMemo(() => {
    const raw = timeZones ?? timezones ?? INTEGRATION_TIMEZONES;
    return raw.map((item) => (typeof item === "string" ? { value: item, label: item } : item));
  }, [timeZones, timezones]);

  const initialSnapshot: IntegrationSnapshot = {
    ...INTEGRATION_DEFAULTS,
    site: "lumen-studio.com",
    ...defaultValue,
    ...(defaultValues
      ? {
          ...(defaultValues.apiKey !== undefined ? { apiKey: defaultValues.apiKey } : {}),
          ...(defaultValues.site !== undefined
            ? { site: defaultValues.site }
            : defaultValues.siteUrl !== undefined
              ? { site: defaultValues.siteUrl }
              : {}),
          ...(defaultValues.zone !== undefined
            ? { zone: defaultValues.zone }
            : defaultValues.timeZone !== undefined
              ? { zone: defaultValues.timeZone }
              : {}),
          ...(defaultValues.enabled !== undefined ? { enabled: defaultValues.enabled } : {}),
        }
      : {}),
  };

  const siteInputId = useId();
  const [enabled, setEnabled] = useState(initialSnapshot.enabled);
  const [apiKey, setApiKey] = useState(initialSnapshot.apiKey);
  const [freshKey, setFreshKey] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [site, setSite] = useState(initialSnapshot.site);
  const [zone, setZone] = useState(initialSnapshot.zone);
  const [saved, setSaved] = useState<IntegrationSnapshot>(initialSnapshot);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const siteValid = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(site.trim());
  const dirty = enabled !== saved.enabled || apiKey !== saved.apiKey || site !== saved.site || zone !== saved.zone;
  const changeCount = [
    enabled !== saved.enabled,
    apiKey !== saved.apiKey,
    site !== saved.site,
    zone !== saved.zone,
  ].filter(Boolean).length;

  const handleToggle = (nextEnabled: boolean) => {
    setEnabled(nextEnabled);
    onToggle?.(nextEnabled);
  };

  const save = async () => {
    if (!dirty || !siteValid || saveState === "saving") return;
    setSaveState("saving");
    const snapshot: IntegrationSnapshot = { apiKey, site: site.trim(), zone, enabled };

    if (onSave) {
      try {
        const res = onSave(snapshot);
        if (res && typeof (res as Promise<void>).then === "function") {
          await res;
        } else {
          await new Promise((resolve) => {
            timers.current.push(window.setTimeout(resolve, 480));
          });
        }
      } catch {
        setSaveState("idle");
        return;
      }
      setSaved(snapshot);
      setFreshKey(false);
      setSaveState("saved");
      timers.current.push(window.setTimeout(() => setSaveState("idle"), 1600));
      return;
    }

    timers.current.push(
      window.setTimeout(() => {
        setSaved(snapshot);
        setFreshKey(false);
        setSaveState("saved");
        timers.current.push(window.setTimeout(() => setSaveState("idle"), 1600));
      }, 640),
    );
  };

  const reset = () => {
    setEnabled(saved.enabled);
    setApiKey(saved.apiKey);
    setFreshKey(false);
    setSite(saved.site);
    setZone(saved.zone);
    setSaveState("idle");
  };

  const generateKey = async () => {
    if (generating) return;
    if (onGenerateKey) {
      setGenerating(true);
      try {
        const nextKey = await onGenerateKey();
        setApiKey(nextKey);
        setFreshKey(true);
      } finally {
        setGenerating(false);
      }
      return;
    }
    setGenerating(true);
    timers.current.push(
      window.setTimeout(() => {
        const rand = Math.random().toString(16).slice(2, 10);
        setApiKey(`sk-live-${rand}8b1d`);
        setFreshKey(true);
        setGenerating(false);
      }, 260),
    );
  };

  const displayKey = freshKey ? apiKey : apiKey ? `${apiKey.slice(0, 7)}••••••${apiKey.slice(-4)}` : "";
  const showBar = dirty || saveState !== "idle";

  return (
    <section className={cn("af-in-intset", className)} data-enabled={enabled || undefined}>
      <header className="af-in-intset__head">
        <span className="af-in-intset__logo" aria-hidden>
          {logo ?? (icon ? <AfIcon name={icon} size={20} /> : <NavBrandLogo brand="shopify-green" size={22} />)}
        </span>
        <span className="af-in-intset__who">
          <span className="af-in-intset__name">
            <span className="af-in-intset__name-text">{effectiveName}</span>
            {effectiveBadge !== undefined && effectiveBadge !== null ? (
              <span className="af-in-intset__badge">{effectiveBadge}</span>
            ) : null}
          </span>
          <span className="af-in-intset__desc">
            {enabled ? (meta ?? "Connected on March 4, 2026 at 09:12") : "Paused · No data is being synced"}
          </span>
        </span>
        <AfSwitch tone="accent" checked={enabled} onChange={handleToggle} label={`Enable ${effectiveName} integration`} />
      </header>

      <div className="af-in-intset__body" data-collapsed={!enabled || undefined}>
        <div className="af-in-intset__body-inner">
          <div className="af-in-intset__section">
            <span className="af-in-intset__label">API key</span>
            {apiKey ? (
              <>
                <div className="af-in-intset__key" data-fresh={freshKey || undefined}>
                  <code>{displayKey}</code>
                  <AfCopyButton text={apiKey} label="Copy API key" />
                  <button
                    type="button"
                    className="af-in-intset__regen"
                    disabled={generating}
                    onClick={() => void generateKey()}
                  >
                    {generating ? "Generating…" : "Regenerate"}
                  </button>
                </div>
                {freshKey ? (
                  <p className="af-in-intset__key-note">
                    Copy and store this key now — it won&apos;t be shown in full again.
                  </p>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                className="af-in-intset__gen"
                disabled={generating}
                onClick={() => void generateKey()}
              >
                <span>{generating ? "Generating API key…" : "Generate a new API key"}</span>
                <svg viewBox="0 0 16 16" width={15} height={15} fill="none" aria-hidden="true">
                  <path
                    d="M10.75 2.25a3.5 3.5 0 0 0-3.32 4.62L2.25 12.05V14h2.15l1.1-1.1v-1.3h1.3l1.33-1.33A3.5 3.5 0 1 0 10.75 2.25Zm1 3.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="af-in-intset__section">
            <label className="af-in-intset__label" htmlFor={siteInputId}>
              Site address
            </label>
            <div className="af-in-intset__group" data-invalid={!siteValid || undefined}>
              <span className="af-in-intset__prefix" aria-hidden>
                https://
              </span>
              <AfInput
                id={siteInputId}
                variant="borderless"
                size="sm"
                className="af-in-intset__site-input"
                value={site}
                aria-invalid={!siteValid || undefined}
                onChange={(event) => setSite(event.target.value)}
                spellCheck={false}
              />
              {siteValid ? <AfIcon name="check" size={14} className="af-in-intset__valid" /> : null}
            </div>
            {siteValid ? (
              <p className="af-in-intset__help">{siteHint}</p>
            ) : (
              <p className="af-in-intset__error" role="alert">
                Enter a valid domain, e.g. yourstore.com.
              </p>
            )}
          </div>

          <div className="af-in-intset__section">
            <span className="af-in-intset__label">Time zone</span>
            <div className="af-in-intset__select-row">
              <AfSelect label="Time zone" value={zone} onChange={setZone} size="md" options={normalizedZones} />
              <svg
                className="af-in-intset__clock"
                viewBox="0 0 16 16"
                width={15}
                height={15}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="8" cy="8" r="5.75" />
                <path d="M8 4.85V8l2.2 1.35" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="af-in-intset__bar-fold" data-open={showBar || undefined} aria-hidden={!showBar || undefined}>
        <div className="af-in-intset__bar-inner">
          <footer className="af-in-intset__bar" data-dirty={dirty || undefined}>
            <span className="af-in-intset__hint" key={dirty ? `dirty-${changeCount}` : saveState}>
              {saveState === "saved" ? "Changes saved" : "Unsaved changes"}
            </span>
            <span className="af-in-intset__actions">
              <AfButton size="sm" variant="secondary" disabled={!dirty || saveState === "saving"} onClick={reset}>
                Discard
              </AfButton>
              <AfButton
                size="sm"
                variant="primary"
                loading={saveState === "saving"}
                disabled={!dirty || !siteValid || saveState === "saving"}
                onClick={() => void save()}
              >
                {saveState === "saving" ? "Saving" : "Save"}
              </AfButton>
            </span>
          </footer>
        </div>
      </div>
    </section>
  );
}
