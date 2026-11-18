import { useMemo, useState, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import { AfButton } from "../controls/Button";
import { AfInput, AfPasswordInput } from "../controls/Input";
import { AfSelect, type AfSelectOption } from "../controls/Select";
import { AfSwitch } from "../controls/Switch";
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
  type AfProviderModel,
  type AfSettingsUser,
} from "./SettingsShell";

export type AfWorkspaceApiKey = {
  provider: string;
  masked: string;
  added: string;
};

export type AfSettingsModelsSaveState = {
  providers: AfModelProvider[];
  defaultChat: string;
  defaultImage: string;
  keys: AfWorkspaceApiKey[];
};

export type AfSettingsModelsProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  /** Model providers grouped by region; uses sample list when omitted. */
  providers?: AfModelProvider[];
  /** Model ID of the default chat model, or `"auto"`. Default `"auto"`. */
  defaultChat?: string;
  /** Model ID of the default image model. Default `"gpt-image"`. */
  defaultImage?: string;
  /** Workspace BYOK API keys, already masked. */
  keys?: AfWorkspaceApiKey[];
  /** Called with `{ providers, defaultChat, defaultImage, keys }` whenever anything changes. */
  onSave?: (state: AfSettingsModelsSaveState) => void;
  /** Called with the label of a sidebar item. */
  onNavigate?: (label: string) => void;
  /** Workspace name in the sidebar. */
  workspace?: string;
  /** Account at the bottom of the sidebar. */
  user?: AfSettingsUser;
  /** Shows skeleton shapes matching defaults, providers and API keys. */
  loading?: boolean;
  /** Empty state: defaults on Auto, "No models yet" and "No API keys". */
  empty?: boolean;
};

const DEFAULT_KEYS: AfWorkspaceApiKey[] = [
  { provider: "Anthropic", masked: "sk-ant-••••9f2a", added: "Added Oct 18" },
];

const ACCESS_OPTIONS: AfSelectOption[] = [
  { value: "everyone", label: "Everyone" },
  { value: "pro", label: "Pro seats" },
  { value: "admins", label: "Admins only" },
];

const KEY_PROVIDER_OPTIONS: AfSelectOption[] = [
  { value: "Anthropic", label: "Anthropic" },
  { value: "OpenAI", label: "OpenAI" },
  { value: "Google", label: "Google Vertex / Gemini" },
  { value: "Mistral", label: "Mistral" },
];

const REGION_LABELS: Record<AfModelProvider["region"], string> = {
  eu: "Hosted in the EU",
  global: "Global hosting",
  custom: "Custom endpoints",
};

/** Settings / Models — Defaults with Auto & Model Wheel, regional provider cards, per-model switch & access, custom endpoints and BYOK keys. */
export function AfSettingsModels(props: AfSettingsModelsProps = {}) {
  const {
    providers: providersProp,
    defaultChat: defaultChatProp = "auto",
    defaultImage: defaultImageProp = "gpt-image-2",
    keys: keysProp,
    onSave,
    onNavigate,
    workspace = "Acme",
    user = DEFAULT_SETTINGS_USER,
    loading = false,
    empty = false,
    className,
    ...rest
  } = props;

  const [providers, setProviders] = useState<AfModelProvider[]>(() =>
    empty ? [] : providersProp ?? DEFAULT_SETTINGS_PROVIDERS,
  );
  const [defaultChat, setDefaultChat] = useState(empty ? "auto" : defaultChatProp);
  const [defaultImage, setDefaultImage] = useState(defaultImageProp);
  const [keys, setKeys] = useState<AfWorkspaceApiKey[]>(() => (empty ? [] : keysProp ?? DEFAULT_KEYS));

  const [kindFilter, setKindFilter] = useState<"all" | "chat" | "image" | "on">("all");
  const [search, setSearch] = useState("");
  const [openProviders, setOpenProviders] = useState<Record<string, boolean>>({
    anthropic: true,
    openai: true,
  });

  // Custom model inline form
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [customKind, setCustomKind] = useState<"chat" | "image">("chat");

  // BYOK inline form
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyProvider, setKeyProvider] = useState("OpenAI");
  const [keySecret, setKeySecret] = useState("");

  const { toastMessage, announce } = useSettingsToast();

  const emitSave = (
    nextProviders: AfModelProvider[],
    nextChat: string,
    nextImage: string,
    nextKeys: AfWorkspaceApiKey[],
    msg: string,
  ) => {
    setProviders(nextProviders);
    setDefaultChat(nextChat);
    setDefaultImage(nextImage);
    setKeys(nextKeys);
    onSave?.({
      providers: nextProviders,
      defaultChat: nextChat,
      defaultImage: nextImage,
      keys: nextKeys,
    });
    announce(msg);
  };

  const chatOptions = useMemo<AfSelectOption[]>(() => {
    const enabled = providers
      .flatMap((p) => p.models)
      .filter((m) => m.kind === "chat" && m.on)
      .map((m) => ({ value: m.id, label: m.name }));
    return [{ value: "auto", label: "Auto" }, ...enabled];
  }, [providers]);

  const imageOptions = useMemo<AfSelectOption[]>(() => {
    const enabled = providers
      .flatMap((p) => p.models)
      .filter((m) => m.kind === "image" && m.on)
      .map((m) => ({ value: m.id, label: m.name }));
    return enabled.length > 0 ? enabled : [{ value: "auto", label: "Auto" }];
  }, [providers]);

  const trimmedQuery = search.trim().toLowerCase();

  const filteredProviders = useMemo(() => {
    return providers
      .map((p) => {
        const models = p.models.filter((m) => {
          if (kindFilter === "chat" && m.kind !== "chat") return false;
          if (kindFilter === "image" && m.kind !== "image") return false;
          if (kindFilter === "on" && !m.on) return false;
          if (!trimmedQuery) return true;
          return (
            m.name.toLowerCase().includes(trimmedQuery) ||
            p.name.toLowerCase().includes(trimmedQuery)
          );
        });
        return { ...p, models };
      })
      .filter((p) => p.models.length > 0);
  }, [kindFilter, providers, trimmedQuery]);

  const toggleModel = (providerId: string, modelId: string, on: boolean) => {
    const nextProviders = providers.map((p) =>
      p.id !== providerId
        ? p
        : { ...p, models: p.models.map((m) => (m.id === modelId ? { ...m, on } : m)) },
    );
    let nextChat = defaultChat;
    let nextImage = defaultImage;
    let note = on ? "Model enabled" : "Model disabled";
    if (!on && defaultChat === modelId) {
      nextChat = "auto";
      note = "Model disabled — default chat fell back to Auto";
    }
    if (!on && defaultImage === modelId) {
      const firstImg = nextProviders.flatMap((p) => p.models).find((m) => m.kind === "image" && m.on);
      nextImage = firstImg?.id ?? "auto";
    }
    emitSave(nextProviders, nextChat, nextImage, keys, note);
  };

  const changeModelAccess = (providerId: string, modelId: string, access: AfProviderModel["access"]) => {
    const nextProviders = providers.map((p) =>
      p.id !== providerId
        ? p
        : { ...p, models: p.models.map((m) => (m.id === modelId ? { ...m, access } : m)) },
    );
    emitSave(nextProviders, defaultChat, defaultImage, keys, "Model access updated");
  };

  const submitCustomModel = () => {
    const name = customName.trim();
    if (!name) return;
    const modelId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newModel: AfProviderModel = {
      id: modelId,
      name,
      kind: customKind,
      badge: "Custom",
      on: true,
      access: "everyone",
    };
    const hasCustom = providers.some((p) => p.id === "custom");
    const nextProviders: AfModelProvider[] = hasCustom
      ? providers.map((p) => (p.id === "custom" ? { ...p, models: [...p.models, newModel] } : p))
      : [
          ...providers,
          {
            id: "custom",
            name: customEndpoint.trim() || "Custom OpenAI-compatible",
            region: "custom",
            logo: "C",
            models: [newModel],
          },
        ];
    setOpenProviders((prev) => ({ ...prev, custom: true }));
    setCustomName("");
    setCustomEndpoint("");
    setCustomOpen(false);
    emitSave(nextProviders, defaultChat, defaultImage, keys, `Added custom model "${name}"`);
  };

  const submitApiKey = () => {
    const raw = keySecret.trim();
    if (raw.length < 6) {
      announce("Enter a valid API key");
      return;
    }
    const tail = raw.slice(-4);
    const prefix = raw.slice(0, Math.min(5, raw.length - 4)) || "key-";
    const nextKeys: AfWorkspaceApiKey[] = [
      ...keys,
      { provider: keyProvider, masked: `${prefix}••••${tail}`, added: "Added just now" },
    ];
    setKeySecret("");
    setKeyOpen(false);
    emitSave(providers, defaultChat, defaultImage, nextKeys, `Saved ${keyProvider} API key`);
  };

  const regions: AfModelProvider["region"][] = ["eu", "global", "custom"];

  return (
    <SettingsShell
      activeSlug="settings-models"
      title="Models"
      lead="Choose the models people in your workspace can use."
      workspace={workspace}
      user={user}
      toastMessage={toastMessage}
      onNavigate={onNavigate}
      onAnnounce={announce}
      className={className}
      {...rest}
    >
      {/* Defaults */}
      <SettingsSection title="Defaults">
        <div className="af-ss__card" data-overflow="visible">
          <SettingsRow
            label="Chat model"
            hint="Every new chat starts with it. People can pick their own in their preferences."
            wideControl
          >
            {loading ? (
              <SettingsSkel width="100%" height={32} />
            ) : (
              <AfSelect
                label="Chat model"
                icon="sparkle"
                value={defaultChat}
                options={chatOptions}
                width="100%"
                onChange={(val) => emitSave(providers, val, defaultImage, keys, "Default chat model saved")}
              />
            )}
          </SettingsRow>

          {!loading && defaultChat === "auto" ? <ModelAutoExplainer /> : null}

          <SettingsRow
            label="Image model"
            hint="Used when someone asks for a picture"
            wideControl
          >
            {loading ? (
              <SettingsSkel width="100%" height={32} />
            ) : (
              <AfSelect
                label="Image model"
                icon="palette"
                value={defaultImage}
                options={imageOptions}
                width="100%"
                onChange={(val) => emitSave(providers, defaultChat, val, keys, "Default image model saved")}
              />
            )}
          </SettingsRow>
        </div>
      </SettingsSection>

      {/* Catalog toolbar + Regional provider groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="af-ss__toolbar">
          <div className="af-ss__toolbar-left">
            <div className="af-ss__pills" role="tablist" aria-label="Filter models">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "chat", label: "Chat" },
                  { id: "image", label: "Image" },
                  { id: "on", label: "Custom" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={kindFilter === tab.id}
                  className="af-ss__pill"
                  onClick={() => setKindFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="af-ss__toolbar-right">
            <AfInput
              aria-label="Search models"
              icon="search"
              placeholder="Search models…"
              value={search}
              allowClear
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              style={{ width: 184 }}
            />
            <AfButton
              size="sm"
              variant="secondary"
              icon={<AfIcon name="plus" size={13} />}
              aria-expanded={customOpen}
              onClick={() => setCustomOpen((v) => !v)}
            >
              Custom model
            </AfButton>
          </div>
        </div>

        {customOpen ? (
          <div className="af-ss__card" data-overflow="visible">
            <div className="af-ss__inline-form" style={{ boxShadow: "none" }}>
              <AfInput
                aria-label="Custom model name"
                placeholder="Model name (e.g. Llama 3.3 70B)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setCustomOpen(false);
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitCustomModel();
                  }
                }}
                style={{ flex: "1 1 180px" }}
              />
              <AfInput
                aria-label="Endpoint URL"
                placeholder="https://llm.acme.internal/v1"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setCustomOpen(false);
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitCustomModel();
                  }
                }}
                style={{ flex: "1 1 200px" }}
              />
              <AfSelect
                label="Custom model kind"
                size="md"
                value={customKind}
                options={[
                  { value: "chat", label: "Chat" },
                  { value: "image", label: "Image" },
                ]}
                width={104}
                onChange={(v) => setCustomKind(v as "chat" | "image")}
              />
              <AfButton size="sm" variant="ghost" onClick={() => setCustomOpen(false)}>
                Cancel
              </AfButton>
              <AfButton size="sm" variant="primary" disabled={!customName.trim()} onClick={submitCustomModel}>
                Add
              </AfButton>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SettingsSkel width="100%" height={132} radius={14} />
            <SettingsSkel width="100%" height={132} radius={14} />
          </div>
        ) : providers.length === 0 ? (
          <div className="af-ss__empty">
            <span className="af-ss__empty-title">No models yet</span>
            <p className="af-ss__empty-desc">
              Connect a custom OpenAI-compatible endpoint or enable workspace model providers.
            </p>
            <AfButton size="sm" variant="primary" onClick={() => setCustomOpen(true)}>
              Custom model
            </AfButton>
          </div>
        ) : (
          regions.map((region) => {
            const group = filteredProviders.filter((p) => p.region === region);
            if (group.length === 0) return null;
            return (
              <SettingsSection
                key={region}
                title={
                  region === "eu" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 16,
                          height: 12,
                          borderRadius: 2,
                          background: "#1d4ed8",
                          color: "#facc15",
                          fontSize: 8,
                          fontWeight: 700,
                        }}
                        aria-hidden="true"
                      >
                        ★
                      </span>
                      <span>Hosted in the EU</span>
                      <span style={{ color: "var(--af-page-muted)", fontWeight: 450, fontSize: "var(--af-fs-xs)" }}>
                        Zero data retention, data stays in Frankfurt
                      </span>
                    </span>
                  ) : (
                    REGION_LABELS[region]
                  )
                }
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {group.map((prov) => {
                    // Searching opens every card with a match automatically
                    const isOpen = trimmedQuery.length > 0 ? true : Boolean(openProviders[prov.id]);
                    const enabledCount = prov.models.filter((m) => m.on).length;
                    return (
                      <div key={prov.id} className="af-ss__card" data-overflow="visible">
                        <button
                          type="button"
                          className="af-ss__prov-head"
                          aria-expanded={isOpen}
                          onClick={() =>
                            setOpenProviders((prev) => ({ ...prev, [prov.id]: !isOpen }))
                          }
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                            <span className="af-ss__prov-logo" aria-hidden="true">
                              {prov.logo === "claude" ? (
                                <SettingsModelGlyph glyph="claude" />
                              ) : (
                                prov.logo ?? prov.name.charAt(0)
                              )}
                            </span>
                            <span style={{ fontWeight: 560 }}>{prov.name}</span>
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <AfBadge tone="neutral" size="sm">
                              {enabledCount}/{prov.models.length} on
                            </AfBadge>
                            <AfIcon name="chevronDown" size={14} className="af-ss__chev" />
                          </span>
                        </button>

                        {isOpen ? (
                          <div style={{ boxShadow: "var(--af-divider-hairline-top)" }}>
                            {prov.models.map((model) => (
                              <SettingsRow
                                key={model.id}
                                label={model.name}
                                badge={
                                  model.badge ? (
                                    <AfBadge tone="neutral" size="sm">
                                      {model.badge}
                                    </AfBadge>
                                  ) : undefined
                                }
                                hint={
                                  prov.region === "eu"
                                    ? `Hosted by ${prov.name} in the EU`
                                    : model.kind === "image"
                                      ? "Image generation"
                                      : "Chat & tool use"
                                }
                                inlineMobile
                              >
                                <AfSelect
                                  label={`Access for ${model.name}`}
                                  icon="users"
                                  size="sm"
                                  value={model.access}
                                  options={ACCESS_OPTIONS}
                                  width={136}
                                  disabled={!model.on}
                                  onChange={(acc) =>
                                    changeModelAccess(prov.id, model.id, acc as AfProviderModel["access"])
                                  }
                                />
                                <AfSwitch
                                  ariaLabel={`Enable ${model.name}`}
                                  checked={model.on}
                                  onChange={(on) => toggleModel(prov.id, model.id, on)}
                                />
                              </SettingsRow>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </SettingsSection>
            );
          })
        )}
      </div>

      {/* Bring Your Own API Keys */}
      <SettingsSection
        title="API keys"
        description="Bring your own key and that provider bills you directly – its usage no longer counts toward your plan."
        extra={
          !loading ? (
            <AfButton
              size="sm"
              variant="secondary"
              icon={<AfIcon name="plus" size={13} />}
              aria-expanded={keyOpen}
              onClick={() => setKeyOpen((v) => !v)}
            >
              Add key
            </AfButton>
          ) : null
        }
      >
        {keyOpen ? (
          <div className="af-ss__card" data-overflow="visible">
            <div className="af-ss__inline-form" style={{ boxShadow: "none" }}>
              <AfSelect
                label="Key provider"
                value={keyProvider}
                options={KEY_PROVIDER_OPTIONS}
                width={176}
                onChange={setKeyProvider}
              />
              <AfPasswordInput
                aria-label="API secret key"
                placeholder="sk-••••••••••••"
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setKeyOpen(false);
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitApiKey();
                  }
                }}
                style={{ flex: "1 1 200px" }}
              />
              <AfButton size="sm" variant="ghost" onClick={() => setKeyOpen(false)}>
                Cancel
              </AfButton>
              <AfButton size="sm" variant="primary" disabled={keySecret.trim().length < 6} onClick={submitApiKey}>
                Save key
              </AfButton>
            </div>
          </div>
        ) : null}

        {loading ? (
          <SettingsSkel width="100%" height={72} radius={14} />
        ) : keys.length === 0 ? (
          <div className="af-ss__empty">
            <span className="af-ss__empty-title">No API keys</span>
            <p className="af-ss__empty-desc">
              Add your own provider key to route usage directly through your enterprise agreement.
            </p>
            <AfButton size="sm" variant="secondary" onClick={() => setKeyOpen(true)}>
              Add key
            </AfButton>
          </div>
        ) : (
          <div className="af-ss__card">
            {keys.map((item, idx) => (
              <SettingsRow
                key={`${item.provider}-${idx}`}
                label={item.provider}
                hint={`${item.masked} · ${item.added}`}
                inlineMobile
              >
                <AfButton
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${item.provider} key`}
                  onClick={() => {
                    const nextKeys = keys.filter((_, i) => i !== idx);
                    emitSave(providers, defaultChat, defaultImage, nextKeys, `Removed ${item.provider} API key`);
                  }}
                >
                  Remove
                </AfButton>
              </SettingsRow>
            ))}
          </div>
        )}
      </SettingsSection>
    </SettingsShell>
  );
}
