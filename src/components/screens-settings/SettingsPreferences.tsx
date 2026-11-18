import { useId, useMemo, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import type { AffectIconKey } from "../../model";
import { AfButton } from "../controls/Button";
import { AfSelect, type AfSelectOption } from "../controls/Select";
import { AfSwitch } from "../controls/Switch";
import { AfTextarea } from "../controls/Textarea";
import { AfBadge } from "../display/Badge";
import {
  DEFAULT_SETTINGS_PROVIDERS,
  DEFAULT_SETTINGS_USER,
  ModelAutoExplainer,
  SettingsModelGlyph,
  SettingsRow,
  SettingsSection,
  SettingsShell,
  SettingsSkel,
  useSettingsToast,
  type AfModelProvider,
  type AfSettingsUser,
} from "./SettingsShell";

export type AfMemoryItem = {
  id: string;
  text: string;
  date?: string;
};

export type AfPreferenceValues = {
  defaultChat: string;
  defaultImage: string;
  language: string;
  theme: "system" | "light" | "dark";
  appActions: boolean;
  chatTools: string[];
  instructions: {
    on: boolean;
    about: string;
    style: string;
  };
  memoryOn: boolean;
  memories: AfMemoryItem[];
};

export type AfSettingsPreferencesProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  /** Personal preference values; uses sample defaults when omitted. */
  preferences?: AfPreferenceValues;
  /** Workspace model providers — only models with `on: true` can be picked. */
  providers?: AfModelProvider[];
  /** Called whenever settings are saved (text fields on blur, everything else at once). */
  onSave?: (preferences: AfPreferenceValues) => void;
  /** Called with the label of a sidebar item. */
  onNavigate?: (label: string) => void;
  /** Workspace name in the sidebar. */
  workspace?: string;
  /** Account at the bottom of the sidebar. */
  user?: AfSettingsUser;
  /** Shows skeleton shapes matching the real controls while loading. */
  loading?: boolean;
  /** Empty state: no custom instructions and no memories yet. */
  empty?: boolean;
};

const DEFAULT_PREFERENCES: AfPreferenceValues = {
  defaultChat: "claude-sonnet-5-5",
  defaultImage: "gpt-image-2",
  language: "en-GB",
  theme: "system",
  appActions: true,
  chatTools: ["web-search", "image-gen"],
  instructions: {
    on: false,
    about: "Head of Product at a B2B SaaS company. Comfortable with TypeScript, SQL and financial cohort tables.",
    style: "Be concise and direct. Skip filler intros, show formulas when calculating metrics, and highlight risks.",
  },
  memoryOn: false,
  memories: [
    { id: "m1", text: "Prefers concise TypeScript examples without boilerplate explanations", date: "Nov 8" },
    { id: "m2", text: "Weekly product review runs every Tuesday at 10:00 CET", date: "Nov 2" },
    { id: "m3", text: "Uses metric units and USD for revenue and pricing benchmarks", date: "Oct 24" },
  ],
};

function LanguageFlag({ code }: { code: string }) {
  if (code === "en-US") {
    return (
      <svg width="15" height="11" viewBox="0 0 15 11" aria-hidden="true" style={{ display: "block", borderRadius: 2, flex: "none" }}>
        <rect width="15" height="11" fill="#ffffff" />
        <path d="M0 0h15v1.57H0zm0 3.14h15v1.57H0zm0 3.14h15v1.57H0zm0 3.15h15V11H0z" fill="#b22234" />
        <rect width="6.5" height="6.28" fill="#3c3b6e" />
      </svg>
    );
  }
  if (code === "de-DE") {
    return (
      <svg width="15" height="11" viewBox="0 0 15 11" aria-hidden="true" style={{ display: "block", borderRadius: 2, flex: "none" }}>
        <rect width="15" height="3.67" fill="#18181b" />
        <rect y="3.67" width="15" height="3.67" fill="#dd0000" />
        <rect y="7.33" width="15" height="3.67" fill="#ffce00" />
      </svg>
    );
  }
  if (code === "fr-FR") {
    return (
      <svg width="15" height="11" viewBox="0 0 15 11" aria-hidden="true" style={{ display: "block", borderRadius: 2, flex: "none" }}>
        <rect width="5" height="11" fill="#002395" />
        <rect x="5" width="5" height="11" fill="#ffffff" />
        <rect x="10" width="5" height="11" fill="#ed2939" />
      </svg>
    );
  }
  if (code === "ja-JP") {
    return (
      <svg width="15" height="11" viewBox="0 0 15 11" aria-hidden="true" style={{ display: "block", borderRadius: 2, flex: "none" }}>
        <rect width="15" height="11" fill="#ffffff" />
        <circle cx="7.5" cy="5.5" r="2.8" fill="#bc002d" />
      </svg>
    );
  }
  if (code === "zh-CN") {
    return (
      <svg width="15" height="11" viewBox="0 0 15 11" aria-hidden="true" style={{ display: "block", borderRadius: 2, flex: "none" }}>
        <rect width="15" height="11" fill="#de2910" />
        <circle cx="3.4" cy="3.3" r="1.4" fill="#ffde00" />
      </svg>
    );
  }
  return (
    <svg width="15" height="11" viewBox="0 0 15 11" aria-hidden="true" style={{ display: "block", borderRadius: 2, flex: "none" }}>
      <rect width="15" height="11" fill="#012169" />
      <path d="M0 0L15 11M15 0L0 11" stroke="#ffffff" strokeWidth="2.1" />
      <path d="M0 0L15 11M15 0L0 11" stroke="#c8102e" strokeWidth="1.1" />
      <path d="M7.5 0v11M0 5.5h15" stroke="#ffffff" strokeWidth="3.3" />
      <path d="M7.5 0v11M0 5.5h15" stroke="#c8102e" strokeWidth="1.9" />
    </svg>
  );
}

const LANGUAGE_OPTIONS: AfSelectOption[] = [
  { value: "en-GB", label: "English" },
  { value: "en-US", label: "English (US)" },
  { value: "de-DE", label: "Deutsch" },
  { value: "fr-FR", label: "Français" },
  { value: "ja-JP", label: "日本語" },
  { value: "zh-CN", label: "简体中文" },
];

const CHAT_TOOLS_DEF: { id: string; title: string; description: string; icon: AffectIconKey }[] = [
  { id: "web-search", title: "Web search", description: "Looks things up when it needs fresh facts", icon: "globe" },
  { id: "image-gen", title: "Image generation", description: "Draws pictures when you ask for one", icon: "image" },
  { id: "memory", title: "Memory", description: "Remembers things you tell it across chats", icon: "bookmark" },
];

/** Settings / Preferences — Default models with Auto & Model Wheel, language, appearance, chat tools, custom instructions and memories. */
export function AfSettingsPreferences(props: AfSettingsPreferencesProps = {}) {
  const {
    preferences: preferencesProp,
    providers = DEFAULT_SETTINGS_PROVIDERS,
    onSave,
    onNavigate,
    workspace = "Acme",
    user = DEFAULT_SETTINGS_USER,
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const initial = useMemo<AfPreferenceValues>(() => {
    const base = preferencesProp ?? DEFAULT_PREFERENCES;
    if (!empty) return base;
    return {
      ...base,
      instructions: { on: false, about: "", style: "" },
      memories: [],
    };
  }, [empty, preferencesProp]);

  const [values, setValues] = useState<AfPreferenceValues>(initial);
  const [saved, setSaved] = useState<AfPreferenceValues>(initial);

  const aboutId = useId();
  const styleId = useId();
  const { toastMessage, announce } = useSettingsToast();

  const chatModelOptions = useMemo<AfSelectOption[]>(() => {
    const enabled = providers
      .flatMap((p) => p.models)
      .filter((m) => m.kind === "chat" && m.on)
      .map((m) => ({ value: m.id, label: m.name }));
    return [{ value: "auto", label: "Auto (Recommended)" }, ...enabled];
  }, [providers]);

  const imageModelOptions = useMemo<AfSelectOption[]>(() => {
    const enabled = providers
      .flatMap((p) => p.models)
      .filter((m) => m.kind === "image" && m.on)
      .map((m) => ({ value: m.id, label: m.name }));
    return enabled.length > 0 ? enabled : [{ value: "gpt-image", label: "GPT Image 1" }];
  }, [providers]);

  const commit = (next: AfPreferenceValues, msg: string) => {
    setValues(next);
    setSaved(next);
    onSave?.(next);
    announce(msg);
  };

  const toggleChatTool = (toolId: string) => {
    const has = values.chatTools.includes(toolId);
    const nextTools = has ? values.chatTools.filter((t) => t !== toolId) : [...values.chatTools, toolId];
    const nextMemoryOn = toolId === "memory" ? !has : values.memoryOn;
    commit({ ...values, chatTools: nextTools, memoryOn: nextMemoryOn }, "Chat tools updated");
  };

  return (
    <SettingsShell
      activeSlug="settings-preferences"
      data-page="preferences"
      title="Preferences"
      lead="Make the assistant work the way you do."
      workspace={workspace}
      user={user}
      toastMessage={toastMessage}
      onNavigate={onNavigate}
      onAnnounce={announce}
      className={className}
      {...rest}
    >
      <SettingsSection title="Models">
        <div className="af-ss__card" data-overflow="visible">
          <SettingsRow label="Default model" hint="Picked whenever you start a new chat" wideControl>
            {loading ? (
              <SettingsSkel width="100%" height={32} />
            ) : (
              <AfSelect
                label="Default model"
                icon={values.defaultChat === "auto" ? "sparkle" : <SettingsModelGlyph glyph="claude" />}
                value={values.defaultChat}
                options={chatModelOptions}
                width="100%"
                onChange={(val) => commit({ ...values, defaultChat: val }, "Default chat model saved")}
              />
            )}
          </SettingsRow>

          {!loading && values.defaultChat === "auto" ? (
            <ModelAutoExplainer compact />
          ) : !loading ? (
            <div className="af-ss__subrow">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
                  <span style={{ display: "inline-flex", color: "var(--af-icon)", marginTop: 2, flex: "none" }} aria-hidden="true">
                    <AfIcon name="sparkle" size={14} />
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span className="af-ss__auto-title">Get more out of your plan with Auto</span>
                    <span className="af-ss__row-hint">
                      It picks the right model for each message, so quick questions don&apos;t use up your credits.
                    </span>
                  </div>
                </div>
                <AfButton
                  size="sm"
                  variant="primary"
                  onClick={() => commit({ ...values, defaultChat: "auto" }, "Switched default model to Auto")}
                >
                  Switch to Auto
                </AfButton>
              </div>
            </div>
          ) : null}

          <SettingsRow label="Image model" hint="Used when you ask for a picture" wideControl>
            {loading ? (
              <SettingsSkel width="100%" height={32} />
            ) : (
              <AfSelect
                label="Image model"
                value={values.defaultImage}
                options={imageModelOptions}
                width="100%"
                onChange={(val) => commit({ ...values, defaultImage: val }, "Image model saved")}
              />
            )}
          </SettingsRow>
        </div>

        <div className="af-ss__card" data-overflow="visible">
          <SettingsRow label="Language" hint="For menus and the assistant's answers" wideControl>
            {loading ? (
              <SettingsSkel width="100%" height={32} />
            ) : (
              <AfSelect
                label="Language"
                icon={<LanguageFlag code={values.language} />}
                value={values.language}
                options={LANGUAGE_OPTIONS}
                width="100%"
                onChange={(val) => commit({ ...values, language: val }, "Language updated")}
              />
            )}
          </SettingsRow>

          <SettingsRow label="Appearance" hint="System follows your device">
            {loading ? (
              <SettingsSkel width={200} height={30} />
            ) : (
              <div className="af-ss__pills" role="radiogroup" aria-label="Appearance">
                {(
                  [
                    { id: "system", label: "System", icon: "sidebar" },
                    { id: "light", label: "Light", icon: "sun" },
                    { id: "dark", label: "Dark", icon: "moon" },
                  ] as const
                ).map((opt) => {
                  const checked = values.theme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      className="af-ss__pill"
                      onClick={() => commit({ ...values, theme: opt.id }, `Appearance set to ${opt.label}`)}
                    >
                      <AfIcon name={opt.icon} size={13} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </SettingsRow>
        </div>

        <div className="af-ss__card">
          <SettingsRow
            label="Find app actions on its own"
            badge={<AfBadge tone="neutral" size="sm">Beta</AfBadge>}
            hint="The chat can use connected apps without you tagging them first"
            inlineMobile
          >
            {loading ? (
              <SettingsSkel width={34} height={20} radius={999} />
            ) : (
              <AfSwitch
                ariaLabel="Find app actions on its own"
                checked={values.appActions}
                onChange={(checked) => commit({ ...values, appActions: checked }, "App actions preference saved")}
              />
            )}
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection title="Chat tools" description="Extra tools for your own chats. Agents bring their own.">
        {loading ? (
          <div className="af-ss__tool-cards">
            <SettingsSkel width="calc(33.3% - 7px)" height={92} radius={14} />
            <SettingsSkel width="calc(33.3% - 7px)" height={92} radius={14} />
            <SettingsSkel width="calc(33.3% - 7px)" height={92} radius={14} />
          </div>
        ) : (
          <div className="af-ss__tool-cards">
            {CHAT_TOOLS_DEF.map((tool) => {
              const checked = values.chatTools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  className="af-ss__tool-card"
                  onClick={() => toggleChatTool(tool.id)}
                >
                  <span className="af-ss__tool-card-top">
                    <span className="af-ss__tile-icon" aria-hidden="true">
                      <AfIcon name={tool.icon} size={15} />
                    </span>
                    <span className="af-ss__tile-check" aria-hidden="true">
                      <AfIcon name="check" size={12} />
                    </span>
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span className="af-ss__row-label">{tool.title}</span>
                    <span className="af-ss__row-hint">{tool.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Custom instructions"
        description="Added to every message you send, so you don't have to repeat yourself."
        extra={
          loading ? (
            <SettingsSkel width={34} height={20} radius={999} />
          ) : (
            <AfSwitch
              ariaLabel="Enable custom instructions"
              checked={values.instructions.on}
              onChange={(on) =>
                commit(
                  { ...values, instructions: { ...values.instructions, on } },
                  on ? "Custom instructions enabled" : "Custom instructions paused",
                )
              }
            />
          )
        }
      >
        {loading ? (
          <SettingsSkel width="100%" height={156} radius={14} />
        ) : values.instructions.on ? (
          <div className="af-ss__card" style={{ padding: 16, gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor={aboutId} className="af-ss__row-label">
                What would you like the assistant to know about you?
              </label>
              <AfTextarea
                id={aboutId}
                rows={2}
                value={values.instructions.about}
                placeholder="Your role, domain and recurring projects…"
                onChange={(e) =>
                  setValues((p) => ({
                    ...p,
                    instructions: { ...p.instructions, about: e.target.value },
                  }))
                }
                onBlur={() => {
                  if (values.instructions.about !== saved.instructions.about) {
                    commit(values, "Custom instructions saved");
                  }
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor={styleId} className="af-ss__row-label">
                How should the assistant respond?
              </label>
              <AfTextarea
                id={styleId}
                rows={2}
                value={values.instructions.style}
                placeholder="Tone, formatting, level of detail…"
                onChange={(e) =>
                  setValues((p) => ({
                    ...p,
                    instructions: { ...p.instructions, style: e.target.value },
                  }))
                }
                onBlur={() => {
                  if (values.instructions.style !== saved.instructions.style) {
                    commit(values, "Custom instructions saved");
                  }
                }}
              />
            </div>
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Memory"
        description="What the assistant has kept from your chats. Only you can see it."
        extra={
          !loading && values.memories.length > 0 ? (
            <AfButton
              size="sm"
              variant="ghost"
              onClick={() => commit({ ...values, memories: [] }, "Cleared all memories")}
            >
              Clear all
            </AfButton>
          ) : null
        }
      >
        {loading ? (
          <SettingsSkel width="100%" height={124} radius={14} />
        ) : values.memories.length === 0 ? (
          <div className="af-ss__empty">
            <span className="af-ss__empty-title">No memories yet</span>
            <p className="af-ss__empty-desc">
              {values.memoryOn
                ? "Useful details from your conversations will appear here automatically."
                : "Memory is currently turned off for your chats."}
            </p>
            {values.memoryOn ? (
              <AfButton size="sm" variant="secondary" onClick={() => onNavigate?.("Chat")}>
                Start a chat
              </AfButton>
            ) : (
              <AfButton
                size="sm"
                variant="primary"
                onClick={() =>
                  commit(
                    {
                      ...values,
                      memoryOn: true,
                      chatTools: values.chatTools.includes("memory")
                        ? values.chatTools
                        : [...values.chatTools, "memory"],
                    },
                    "Memory turned on",
                  )
                }
              >
                Turn on memory
              </AfButton>
            )}
          </div>
        ) : (
          <div className="af-ss__card">
            {values.memories.map((mem) => (
              <SettingsRow key={mem.id} label={mem.text} hint={mem.date ? `Saved ${mem.date}` : undefined} inlineMobile>
                <AfButton
                  size="sm"
                  variant="ghost"
                  aria-label={`Forget ${mem.text}`}
                  onClick={() =>
                    commit(
                      { ...values, memories: values.memories.filter((m) => m.id !== mem.id) },
                      "Memory forgotten",
                    )
                  }
                >
                  Forget
                </AfButton>
              </SettingsRow>
            ))}
          </div>
        )}
      </SettingsSection>
    </SettingsShell>
  );
}
