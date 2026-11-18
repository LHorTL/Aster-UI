import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { cn } from "../../primitives";
import { AfButton } from "../controls/Button";
import { AfCommandPalette, type AfCommand } from "../overlay/CommandPalette";
import { AfDrawer } from "../overlay/Drawer";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import { AfTooltip } from "../overlay/Tooltip";

export type AfSettingsSlug =
  | "settings-profile"
  | "settings-preferences"
  | "settings-notifications"
  | "settings-privacy"
  | "settings-general"
  | "settings-members"
  | "settings-models"
  | "settings-security"
  | "settings-subscription";

export type AfSettingsUser = {
  name: string;
  avatar?: string;
  email?: string;
};

export type AfProviderModel = {
  id: string;
  name: string;
  kind: "chat" | "image";
  badge?: string;
  on: boolean;
  access: "everyone" | "pro" | "admins";
};

export type AfModelProvider = {
  id: string;
  name: string;
  region: "eu" | "global" | "custom";
  logo?: string;
  models: AfProviderModel[];
};

export const DEFAULT_SETTINGS_USER: AfSettingsUser = {
  name: "Alex Morgan",
  email: "alex@acme.com",
};

export const DEFAULT_SETTINGS_PROVIDERS: AfModelProvider[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    region: "eu",
    logo: "claude",
    models: [
      { id: "claude-opus-5-5", name: "Claude Opus 5.5", kind: "chat", on: true, access: "everyone" },
      { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", kind: "chat", on: true, access: "everyone" },
      { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", kind: "chat", on: true, access: "everyone" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    region: "global",
    logo: "O",
    models: [
      { id: "gpt-5", name: "GPT-5", kind: "chat", badge: "Reasoning", on: true, access: "everyone" },
      { id: "gpt-5-mini", name: "GPT-5 mini", kind: "chat", badge: "Fast", on: true, access: "everyone" },
      { id: "gpt-image-2", name: "GPT Image 2", kind: "image", on: true, access: "everyone" },
    ],
  },
  {
    id: "google",
    name: "Google",
    region: "global",
    logo: "G",
    models: [
      { id: "gemini-3-pro", name: "Gemini 3 Pro", kind: "chat", badge: "1M ctx", on: true, access: "pro" },
      { id: "imagen-3", name: "Imagen 3", kind: "image", on: false, access: "pro" },
    ],
  },
];

export type SettingsNavEntry = {
  slug: AfSettingsSlug;
  label: string;
  icon: AffectIconKey;
  group: "account" | "workspace";
};

export const SETTINGS_NAV_ENTRIES: SettingsNavEntry[] = [
  { slug: "settings-profile", label: "Profile", icon: "user", group: "account" },
  { slug: "settings-preferences", label: "Preferences", icon: "sliders", group: "account" },
  { slug: "settings-notifications", label: "Notifications", icon: "bell", group: "account" },
  { slug: "settings-privacy", label: "Privacy", icon: "shield", group: "account" },
  { slug: "settings-general", label: "General", icon: "settings", group: "workspace" },
  { slug: "settings-members", label: "Members", icon: "users", group: "workspace" },
  { slug: "settings-models", label: "Models", icon: "sparkle", group: "workspace" },
  { slug: "settings-security", label: "Security", icon: "lock", group: "workspace" },
  { slug: "settings-subscription", label: "Billing", icon: "creditCard", group: "workspace" },
];

/** Map sidebar label or slug to AfSettingsSlug. */
export function resolveSettingsSlug(labelOrSlug: string): AfSettingsSlug | null {
  const norm = labelOrSlug.trim().toLowerCase();
  for (const item of SETTINGS_NAV_ENTRIES) {
    if (item.slug === norm || item.label.toLowerCase() === norm) return item.slug;
  }
  if (norm === "teams" || norm === "members & teams") return "settings-members";
  if (norm === "subscription" || norm === "plans") return "settings-subscription";
  return null;
}

/** Lightweight status toast controller scoped inside SettingsShell. */
export function useSettingsToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const announce = useCallback((text: string) => {
    setMessage(text);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setMessage(null);
      timerRef.current = null;
    }, 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return { toastMessage: message, announce };
}

export type SettingsShellProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  activeSlug: AfSettingsSlug;
  title: ReactNode;
  lead?: ReactNode;
  headerActions?: ReactNode;
  workspace?: string;
  user?: AfSettingsUser;
  wide?: boolean;
  toastMessage?: string | null;
  onNavigate?: (label: string) => void;
  onAnnounce?: (msg: string) => void;
  children: ReactNode;
};

/** Shared App Shell frame for all 9 Settings pages (sidebar, Cmd+K palette, mobile sheet, status toast). */
export function SettingsShell({
  activeSlug,
  title,
  lead,
  headerActions,
  workspace = "Acme",
  user = DEFAULT_SETTINGS_USER,
  wide = false,
  toastMessage,
  onNavigate,
  onAnnounce,
  className,
  children,
  ...rest
}: SettingsShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const handleNav = useCallback(
    (label: string) => {
      setMobileOpen(false);
      onNavigate?.(label);
      if (label === "Back to app") {
        onAnnounce?.(`Returned to ${workspace}`);
      }
    },
    [onAnnounce, onNavigate, workspace],
  );

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const accountItems = SETTINGS_NAV_ENTRIES.filter((e) => e.group === "account");
  const workspaceItems = SETTINGS_NAV_ENTRIES.filter((e) => e.group === "workspace");

  const userMenuItems = useMemo<AfMenuItem[]>(
    () => [
      { type: "label", label: `${user.name}${user.email ? ` · ${user.email}` : ""}` },
      { id: "profile", label: "Profile", icon: "user", onSelect: () => handleNav("Profile") },
      { id: "preferences", label: "Preferences", icon: "sliders", onSelect: () => handleNav("Preferences") },
      { type: "separator" },
      { id: "back", label: "Back to app", icon: "arrowLeft", onSelect: () => handleNav("Back to app") },
      { id: "logout", label: "Sign out", icon: "x", onSelect: () => handleNav("Sign out") },
    ],
    [handleNav, user.email, user.name],
  );

  const commands = useMemo<AfCommand[]>(
    () => [
      ...SETTINGS_NAV_ENTRIES.map((entry) => ({
        id: entry.slug,
        group: entry.group === "account" ? "Account" : workspace,
        label: `Settings / ${entry.label}`,
        icon: entry.icon,
        onSelect: () => handleNav(entry.label),
      })),
      {
        id: "back-to-app",
        group: "Navigation",
        label: "Back to app",
        icon: "arrowLeft" as AffectIconKey,
        onSelect: () => handleNav("Back to app"),
      },
    ],
    [handleNav, workspace],
  );

  const renderNavContent = () => (
    <>
      <button
        type="button"
        className="af-ss__search"
        aria-keyshortcuts="Meta+K"
        aria-haspopup="dialog"
        aria-expanded={paletteOpen}
        onClick={() => setPaletteOpen(true)}
      >
        <span className="af-ss__search-left">
          <AfIcon name="search" size={14} />
          <span>Search…</span>
        </span>
        <kbd className="af-ss__kbd">⌘K</kbd>
      </button>

      <nav className="af-ss__nav" aria-label="Settings menu">
        <div className="af-ss__group">
          <span className="af-ss__group-label">Personal</span>
          {accountItems.map((entry) => {
            const active = entry.slug === activeSlug;
            return (
              <button
                key={entry.slug}
                type="button"
                className="af-ss__nav-item"
                data-active={active ? "true" : undefined}
                aria-current={active ? "page" : undefined}
                onClick={() => handleNav(entry.label)}
              >
                <span className="af-ss__nav-left">
                  <AfIcon name={entry.icon} size={15} className="af-ss__nav-icon" />
                  <span>{entry.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="af-ss__group">
          <span className="af-ss__group-label">Workspace</span>
          {workspaceItems.map((entry) => {
            const active = entry.slug === activeSlug;
            return (
              <button
                key={entry.slug}
                type="button"
                className="af-ss__nav-item"
                data-active={active ? "true" : undefined}
                aria-current={active ? "page" : undefined}
                onClick={() => handleNav(entry.label)}
              >
                <span className="af-ss__nav-left">
                  <AfIcon name={entry.icon} size={15} className="af-ss__nav-icon" />
                  <span>{entry.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="af-ss__side-foot">
        <AfDropdownMenu items={userMenuItems} side="top" align="start" width={220}>
          <button type="button" className="af-ss__user-btn" aria-label={`Account menu for ${user.name}`}>
            <span className="af-ss__user-badge" aria-hidden="true">
              {user.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                user.name
                  .split(/\s+/)
                  .map((p) => p.charAt(0))
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "AM"
              )}
            </span>
            <span className="af-ss__user-name">{user.name}</span>
            <AfIcon name="chevronDown" size={12} />
          </button>
        </AfDropdownMenu>
      </div>
    </>
  );

  return (
    <div
      className={cn("af-ss", className)}
      data-collapsed={collapsed ? "true" : undefined}
      onPointerDownCapture={(event) => {
        const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("button, [tabindex]");
        if (target) target.dataset.pointerFocus = "true";
        rest.onPointerDownCapture?.(event);
      }}
      onKeyDownCapture={(event) => {
        if (event.key === "Tab" || event.key.startsWith("Arrow")) {
          event.currentTarget
            .querySelectorAll<HTMLElement>('[data-pointer-focus="true"]')
            .forEach((el) => delete el.dataset.pointerFocus);
        }
        rest.onKeyDownCapture?.(event);
      }}
      onBlurCapture={(event) => {
        const target = event.target as HTMLElement | null;
        if (target?.dataset?.pointerFocus) delete target.dataset.pointerFocus;
        rest.onBlurCapture?.(event);
      }}
      {...rest}
    >
      <aside className="af-ss__side" aria-hidden={collapsed || undefined}>
        <header className="af-ss__side-head">
          <button
            type="button"
            className="af-ss__back"
            aria-label="Back to app"
            onClick={() => handleNav("Back to app")}
          >
            <AfIcon name="chevronLeft" size={14} />
            <span>Settings</span>
          </button>
          <AfTooltip content="Collapse sidebar" side="right">
            <button
              type="button"
              className="af-ss__icon-btn"
              aria-label="Collapse sidebar"
              onClick={() => setCollapsed(true)}
            >
              <AfIcon name="panelLeft" size={15} />
            </button>
          </AfTooltip>
        </header>
        {renderNavContent()}
      </aside>

      <main className="af-ss__main">
        {collapsed ? (
          <div className="af-ss__reopen">
            <AfTooltip content="Open sidebar" side="right">
              <button
                type="button"
                className="af-ss__icon-btn"
                aria-label="Open sidebar"
                onClick={() => setCollapsed(false)}
              >
                <AfIcon name="panelLeft" size={15} />
              </button>
            </AfTooltip>
          </div>
        ) : null}

        <div className="af-ss__mobile-bar">
          <button
            type="button"
            className="af-ss__back"
            aria-label="Open settings menu"
            onClick={() => setMobileOpen(true)}
          >
            <AfIcon name="menu" size={15} />
            <span>Settings</span>
          </button>
          <button
            type="button"
            className="af-ss__icon-btn"
            aria-label="Search settings"
            onClick={() => setPaletteOpen(true)}
          >
            <AfIcon name="search" size={15} />
          </button>
        </div>

        <div className="af-ss__scroll">
          <div className="af-ss__inner" data-wide={wide ? "true" : undefined}>
            <header className="af-ss__head">
              <div className="af-ss__head-copy">
                <h1 className="af-ss__title">{title}</h1>
                {lead ? <p className="af-ss__lead">{lead}</p> : null}
              </div>
              {headerActions ? <div className="af-ss__sec-extra">{headerActions}</div> : null}
            </header>
            {children}
          </div>
        </div>

        {toastMessage ? (
          <div className="af-ss__toast" role="status" aria-live="polite">
            <span className="af-ss__toast-dot" aria-hidden="true">
              <AfIcon name="checkCircle" size={14} />
            </span>
            <span>{toastMessage}</span>
          </div>
        ) : null}
      </main>

      <AfDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        side="left"
        width={264}
        title="Settings"
        contained
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
          {renderNavContent()}
        </div>
      </AfDrawer>

      <AfCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
        placeholder="Jump to a settings page…"
      />
    </div>
  );
}

/** Section wrapper with title, optional description, and optional header slot. */
export function SettingsSection({
  title,
  description,
  extra,
  danger,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="af-ss__sec">
      <div className="af-ss__sec-head">
        <div className="af-ss__sec-titles">
          <h2 className="af-ss__sec-title" data-danger={danger ? "true" : undefined}>
            {title}
          </h2>
          {description ? <p className="af-ss__sec-desc">{description}</p> : null}
        </div>
        {extra ? <div className="af-ss__sec-extra">{extra}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Labelled settings row with optional htmlFor label, hint, and right-aligned control. */
export function SettingsRow({
  label,
  htmlFor,
  hint,
  badge,
  wideControl,
  align = "center",
  inlineMobile,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  badge?: ReactNode;
  wideControl?: boolean;
  align?: "center" | "start";
  inlineMobile?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="af-ss__row"
      data-align={align === "start" ? "start" : undefined}
      data-inline-mobile={inlineMobile ? "true" : undefined}
    >
      <div className="af-ss__row-info">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="af-ss__row-label">
            <span>{label}</span>
            {badge}
          </label>
        ) : (
          <div className="af-ss__row-label">
            <span>{label}</span>
            {badge}
          </div>
        )}
        {hint ? <p className="af-ss__row-hint">{hint}</p> : null}
      </div>
      <div className="af-ss__row-ctrl" data-wide={wideControl ? "true" : undefined}>
        {children}
      </div>
    </div>
  );
}

/** Skeleton placeholder block shaped like real controls during loading={true}. */
export function SettingsSkel({
  width,
  height = 32,
  radius,
  style,
}: {
  width: number | string;
  height?: number | string;
  radius?: number | string;
  style?: CSSProperties;
}) {
  return (
    <span
      className="af-ss__skel"
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** Safe async clipboard helper with DOM execCommand fallback; never leaks unhandled rejections. */
export async function copySettingsText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }
  if (typeof document === "undefined" || !document.body) return false;
  let textarea: HTMLTextAreaElement | null = null;
  try {
    textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return Boolean(document.execCommand?.("copy"));
  } catch {
    return false;
  } finally {
    if (textarea?.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
  }
}

/** Copy button that briefly morphs into a checkmark and announces in the status toast. */
export function CopyActionButton({
  value,
  label = "Copy",
  variant = "ghost",
  ariaLabel,
  onCopied,
}: {
  value: string;
  label?: string;
  variant?: "ghost" | "secondary";
  ariaLabel: string;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = () => {
    void copySettingsText(value).then((ok) => {
      if (!ok || !mountedRef.current) return;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      setCopied(true);
      onCopied?.();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        if (mountedRef.current) setCopied(false);
      }, 1400);
    });
  };

  return (
    <AfButton
      size="sm"
      variant={variant}
      aria-label={ariaLabel}
      icon={<AfIcon name={copied ? "check" : "copy"} size={13} />}
      onClick={handleCopy}
    >
      {copied ? "Copied" : label}
    </AfButton>
  );
}

const DRUM_MODELS: { id: string; name: string; glyph: "openai" | "gemini" | "claude" }[] = [
  { id: "gpt-5-mini", name: "GPT-5 mini", glyph: "openai" },
  { id: "gemini-3-pro", name: "Gemini 3 Pro", glyph: "gemini" },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", glyph: "claude" },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", glyph: "claude" },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", glyph: "claude" },
];

export function SettingsModelGlyph({ glyph }: { glyph: "openai" | "gemini" | "claude" }) {
  if (glyph === "claude") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ color: "#d97757", flex: "none" }}>
        <path
          d="M8 1.6v12.8M1.6 8h12.8M3.5 3.5l9 9M12.5 3.5l-9 9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (glyph === "gemini") {
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ color: "#6366f1", flex: "none" }}>
        <path d="M8 1.5C8.4 5.4 10.6 7.6 14.5 8 10.6 8.4 8.4 10.6 8 14.5 7.6 10.6 5.4 8.4 1.5 8 5.4 7.6 7.6 5.4 8 1.5Z" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ color: "currentColor", flex: "none" }}>
      <circle cx="8" cy="8" r="5.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** Animated Auto routing explainer + scrolling Drum Model Wheel (stands still with prefers-reduced-motion). */
export function ModelAutoExplainer({ compact = false }: { compact?: boolean }) {
  const [centerIdx, setCenterIdx] = useState(2);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mql?.matches) return;
    const id = window.setInterval(() => {
      setCenterIdx((prev) => (prev + 1) % DRUM_MODELS.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  const orderedSlots = [-2, -1, 0, 1, 2].map((offset) => {
    const idx = (centerIdx + offset + DRUM_MODELS.length) % DRUM_MODELS.length;
    return { item: DRUM_MODELS[idx]!, offset };
  });

  return (
    <div className="af-ss__auto-box">
      <div className="af-ss__auto-copy">
        <span className="af-ss__auto-title">How Auto works</span>
        <p className="af-ss__row-hint">
          {compact
            ? "Picks a fast model for quick questions and a reasoning model when a task needs depth."
            : "Auto picks the model and how long it thinks for each message – the strongest one for hard questions, a fast one for quick replies."}
        </p>
        {!compact ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
            <span className="af-ss__row-hint" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AfIcon name="check" size={12} />
              <span>The best answer for what it costs</span>
            </span>
            <span className="af-ss__row-hint" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AfIcon name="check" size={12} />
              <span>Only models you&apos;ve turned on, hosted in the EU first</span>
            </span>
          </div>
        ) : null}
      </div>
      <div
        className="af-ss__drum"
        role="img"
        aria-label="Auto routes between fast, balanced and reasoning models depending on prompt complexity."
      >
        {orderedSlots.map(({ item, offset }) => (
          <div
            key={`${item.id}-${offset}`}
            className="af-ss__drum-item"
            data-active={offset === 0 ? "true" : undefined}
            data-near={Math.abs(offset) === 1 ? "true" : undefined}
            aria-hidden="true"
          >
            <SettingsModelGlyph glyph={item.glyph} />
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
