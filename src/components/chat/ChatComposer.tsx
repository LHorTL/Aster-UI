import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AfIcon, AfTextarea, AfTooltip } from "../../ui";
import { AfHoverList, cn, useControllableState, useImeEnterGuard } from "../../primitives";
import {
  AlertShieldSvg,
  ApprovalHandSvg,
  BrandFavicon,
  type ChatComposerApp,
  type ChatComposerProps,
  MacFolderSvg,
  StagePopover,
  composerModels,
} from "../_shared/chat";

const DEFAULT_ATTACH_OPTIONS = [
  "Files and folders",
  "Attach Claude",
  "Work in a folder",
  "Goal",
  "Plan mode",
  "Record a skill",
  "Draw",
];

const RICH_ADD_ITEMS = [
  { label: "Files and folders", icon: "paperclip" as const },
  { label: "Attach Claude", brand: "claude" },
  { label: "Work in a folder", desc: "Choose a folder for this chat", icon: "folder" as const },
  { label: "Goal", desc: "Set a goal to keep working toward", icon: "target" as const },
  { label: "Plan mode", desc: "Turn on plan mode", icon: "bulb" as const },
  { label: "Record a skill", icon: "record" as const },
  { label: "Draw", desc: "Sketch a drawing", icon: "draw" as const },
];

const RICH_PLUGIN_ITEMS = [
  { label: "Documents", desc: "Create and edit documents", docColor: "#3e7bfa" },
  { label: "PDF", desc: "Read, create and verify PDFs", docColor: "#e5484d" },
];

const DEFAULT_FOLDERS = ["Q3 Campaign", "Brand assets", "Hiring", "Research"];

const DEFAULT_APPS: ChatComposerApp[] = [
  { id: "gmail", name: "Gmail", mark: "M", tone: "mail", connected: true },
  { id: "slack", name: "Slack", mark: "#", tone: "chat", connected: true },
  { id: "clickup", name: "ClickUp", mark: "C", tone: "code", connected: true },
  { id: "notion", name: "Notion", mark: "N", tone: "docs", connected: false },
  { id: "linear", name: "Linear", mark: "L", tone: "code", connected: false },
];

function renderAppGlyph(app: ChatComposerApp, size = 13) {
  const key = app.id.toLowerCase();
  if (key === "gmail" || key === "slack" || key === "clickup" || key === "notion" || key === "linear") {
    return <BrandFavicon brand={key} size={size} bare />;
  }
  return <span className="af-ch-composer__appfallback">{app.mark ?? app.name.slice(0, 1)}</span>;
}

function renderAddIcon(item: (typeof RICH_ADD_ITEMS)[number]) {
  if (item.brand) {
    return <BrandFavicon brand={item.brand} size={15} bare />;
  }
  if (item.icon === "paperclip") {
    return <AfIcon name="paperclip" size={15} />;
  }
  if (item.icon === "folder") {
    return <AfIcon name="folder" size={15} />;
  }
  if (item.icon === "target") {
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12A9 9 0 1 1 12 3" />
        <path d="M17 12A5 5 0 1 1 12 7" />
        <path d="M12 12L19 5M16 4.5V8H19.5" />
      </svg>
    );
  }
  if (item.icon === "bulb") {
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18H15M10 21H14M12 3C8.7 3 6 5.6 6 8.9C6 11.1 7.2 12.6 8.4 13.8C9 14.4 9.4 15.2 9.4 16V16.5H14.6V16C14.6 15.2 15 14.4 15.6 13.8C16.8 12.6 18 11.1 18 8.9C18 5.6 15.3 3 12 3Z" />
      </svg>
    );
  }
  if (item.icon === "record") {
    return (
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4.6" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#14b8a6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15C6 10 8.5 6 10 6.5C12 7.2 6 15 8 16C10 17 13.5 9 15.5 10C17.3 10.9 13 16 14.8 16.8C16 17.3 18 15 20 13" />
      <path d="M4 20H12" />
    </svg>
  );
}

function renderPluginDocIcon(color: string) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M6.5 2.5H14L19.5 8V19.5C19.5 20.6 18.6 21.5 17.5 21.5H6.5C5.4 21.5 4.5 20.6 4.5 19.5V4.5C4.5 3.4 5.4 2.5 6.5 2.5Z" fill={color} />
      <path d="M14 2.5V6.5C14 7.3 14.7 8 15.5 8H19.5" fill="#fff" fillOpacity="0.45" />
      <path d="M8 13H16M8 16.5H13.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AutoSparkleStrokeSvg() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 2L15.5387 4.39157C15.9957 6.42015 17.5798 8.00431 19.6084 8.46127L22 9L19.6084 9.53873C17.5798 9.99569 15.9957 11.5798 15.5387 13.6084L15 16L14.4613 13.6084C14.0043 11.5798 12.4202 9.99569 10.3916 9.53873L8 9L10.3916 8.46127C12.4201 8.00431 14.0043 6.42015 14.4613 4.39158L15 2Z" />
      <path d="M7 12L7.38481 13.7083C7.71121 15.1572 8.84275 16.2888 10.2917 16.6152L12 17L10.2917 17.3848C8.84275 17.7112 7.71121 18.8427 7.38481 20.2917L7 22L6.61519 20.2917C6.28879 18.8427 5.15725 17.7112 3.70827 17.3848L2 17L3.70827 16.6152C5.15725 16.2888 6.28879 15.1573 6.61519 13.7083L7 12Z" />
    </svg>
  );
}

/**
 * Chat Composer: sunken tray + white inner card (auto-growing textarea, Add menu with Plugins,
 * 3-state Approval menu, clean Model dropdown, Voice recording bar, Send) + Folder & Connect apps footer.
 */
function ChatComposer({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  model: modelProp,
  defaultModel,
  onModelChange,
  placeholder = "Start by typing...",
  models = composerModels,
  attachments: attachmentsProp,
  defaultAttachments = [],
  attachOptions = DEFAULT_ATTACH_OPTIONS,
  onAttach,
  onAttachSelect,
  onAttachmentRemove,
  folders = DEFAULT_FOLDERS,
  folder: folderProp,
  defaultFolder = null,
  onFolderChange,
  apps = DEFAULT_APPS,
  connectedApps: connectedAppsProp,
  defaultConnectedApps,
  onAppsChange,
  approval: approvalProp,
  defaultApproval = "request",
  onApprovalChange,
  dictationText = "Summarize why Q3 enterprise retention improved and draft three slides for Tuesday's review.",
  disabled = false,
  loading: loadingProp,
  onSubmit,
  onSend,
  className,
}: ChatComposerProps) {
  const [text, setText] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const initialModelId =
    defaultModel ??
    (models.some((item) => item.id === "auto") ? "auto" : models[0]?.id ?? "");
  const [modelId, setModelId] = useControllableState({
    value: modelProp,
    defaultValue: initialModelId,
    onChange: onModelChange,
  });
  const [attachments, setAttachments] = useControllableState<string[]>({
    value: attachmentsProp,
    defaultValue: defaultAttachments,
  });
  const [folder, setFolder] = useControllableState<string | null>({
    value: folderProp,
    defaultValue: defaultFolder,
    onChange: onFolderChange,
  });
  const [connectedIds, setConnectedIds] = useControllableState<string[]>({
    value: connectedAppsProp,
    defaultValue: defaultConnectedApps ?? apps.filter((a) => a.connected).map((a) => a.id),
    onChange: onAppsChange,
  });
  const [approval, setApproval] = useControllableState<"request" | "approve" | "granted">({
    value: approvalProp,
    defaultValue: defaultApproval,
    onChange: onApprovalChange,
  });

  const [attachOpen, setAttachOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachAnchor = useRef<HTMLButtonElement>(null);
  const approvalAnchor = useRef<HTMLButtonElement>(null);
  const modelAnchor = useRef<HTMLButtonElement>(null);
  const folderAnchor = useRef<HTMLButtonElement>(null);
  const appsAnchor = useRef<HTMLButtonElement>(null);
  const pending = useRef<{ message: string; model: string } | null>(null);
  const dictationBase = useRef("");
  const onSendRef = useRef(onSend);
  onSendRef.current = onSend;
  const ime = useImeEnterGuard();

  const isSending = loadingProp ?? status === "sending";
  const effectiveStatus = isSending ? "sending" : status;
  const model = models.find((item) => item.id === modelId) ?? models[0];
  const isDefaultAttach = attachOptions === DEFAULT_ATTACH_OPTIONS;

  useEffect(() => {
    const field = textareaRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(140, Math.max(40, field.scrollHeight))}px`;
  }, [text]);

  useEffect(() => {
    if (status === "sending" && !onSubmit) {
      const id = window.setTimeout(() => {
        const data = pending.current;
        if (data) onSendRef.current?.(data.message, data.model);
        setText("");
        setStatus("sent");
      }, 950);
      return () => window.clearTimeout(id);
    }
    if (status === "sent") {
      const id = window.setTimeout(() => setStatus("idle"), 1600);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [status, onSubmit, setText]);

  useEffect(() => {
    if (!listening) return;
    let index = 0;
    const base = dictationBase.current ? `${dictationBase.current} ` : "";
    const id = window.setInterval(() => {
      index = Math.min(dictationText.length, index + 1);
      setText(base + dictationText.slice(0, index));
      if (index >= dictationText.length) {
        window.clearInterval(id);
      }
    }, 52);
    return () => window.clearInterval(id);
  }, [listening, dictationText, setText]);

  useEffect(() => {
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setListening(false);
        setText(dictationBase.current);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [listening, setText]);

  const send = () => {
    const message = text.trim();
    if (!message || disabled || isSending || !model) return;
    setListening(false);

    if (onSubmit) {
      const currentAttachments = [...attachments];
      const result = onSubmit({
        message,
        model: model.id,
        attachments: currentAttachments,
        folder,
        connectedApps: connectedIds,
        approval,
      });
      onSendRef.current?.(message, model.id);
      if (result && typeof (result as Promise<void>).then === "function") {
        setStatus("sending");
        (result as Promise<void>)
          .then(() => {
            setText("");
            setStatus("sent");
          })
          .catch(() => {
            setStatus("idle");
          });
      } else {
        setText("");
        setStatus("sent");
      }
      return;
    }

    pending.current = { message, model: model.id };
    setStatus("sending");
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      if (ime.shouldBlockEnter(event)) return;
      event.preventDefault();
      send();
    }
  };

  const removeAttachment = (item: string) => {
    setAttachments((list) => list.filter((entry) => entry !== item));
    onAttachmentRemove?.(item);
  };

  const pickAttachment = (label: string) => {
    setAttachments((list) => (list.includes(label) ? list : [...list, label]));
    onAttachSelect?.(label);
    setAttachOpen(false);
  };

  const toggleApp = (id: string) => {
    setConnectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const visibleAppBadges = apps.filter((app) => connectedIds.includes(app.id)).slice(0, 3);
  const displayApps = visibleAppBadges.length > 0 ? visibleAppBadges : apps.slice(0, 3);

  const approvalLabel =
    approval === "granted"
      ? "Full access"
      : approval === "approve"
        ? "Approve for me"
        : "Request approval";

  return (
    <div
      className={cn("af-ch-composer", className)}
      data-status={effectiveStatus}
      data-listening={listening || undefined}
    >
      <section
        className="af-ch-composer__card"
        aria-label="Message composer"
        onPointerDown={(event) => {
          const target = event.target as HTMLElement;
          if (!target.closest("button, textarea, [role='listbox'], [role='menu'], [role='dialog']")) {
            textareaRef.current?.focus();
          }
        }}
      >
        {attachments.length > 0 ? (
          <div className="af-ch-composer__attach-list">
            {attachments.map((attachment) => (
              <div key={attachment} className="af-ch-composer__attach">
                <AfIcon name="paperclip" size={12} />
                <span>{attachment}</span>
                <button
                  type="button"
                  className="af-ch-composer__attachremove"
                  aria-label={`Remove ${attachment}`}
                  disabled={disabled}
                  onClick={() => removeAttachment(attachment)}
                >
                  <AfIcon name="x" size={11} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="af-ch-composer__field">
          <AfTextarea
            ref={textareaRef}
            variant="borderless"
            resize="none"
            inputClassName="af-ch-composer__input"
            rows={1}
            value={text}
            disabled={disabled}
            placeholder={placeholder}
            aria-label="Message"
            onCompositionStart={ime.onCompositionStart}
            onCompositionEnd={ime.onCompositionEnd}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onInputKeyDown}
          />
        </div>

        <div className="af-ch-composer__tools">
          <div className="af-ch-composer__group">
            <AfTooltip label="Add">
              <button
                ref={attachAnchor}
                type="button"
                className="af-ch-composer__iconbtn"
                aria-label="Add"
                aria-haspopup="menu"
                aria-expanded={attachOpen}
                disabled={disabled}
                onClick={() => {
                  onAttach?.();
                  setAttachOpen((value) => !value);
                }}
              >
                <AfIcon name="plus" size={15} />
              </button>
            </AfTooltip>

            <button
              ref={approvalAnchor}
              type="button"
              className="af-ch-composer__approval"
              data-state={approval}
              data-granted={approval === "granted" || undefined}
              aria-haspopup="listbox"
              aria-expanded={approvalOpen}
              disabled={disabled}
              onClick={() => setApprovalOpen((v) => !v)}
            >
              <span className="af-ch-composer__approvalicon" aria-hidden>
                {approval === "granted" ? (
                  <AlertShieldSvg size={14} />
                ) : approval === "approve" ? (
                  <AfIcon name="checkCircle" size={14} />
                ) : (
                  <ApprovalHandSvg size={14} />
                )}
              </span>
              <span className="af-ch-composer__approvallabel">{approvalLabel}</span>
            </button>
          </div>

          <div className="af-ch-composer__end">
            {listening ? (
              <div className="af-ch-composer__voicebar">
                <div className="af-ch-composer__trace" aria-hidden>
                  {Array.from({ length: 16 }, (_, index) => (
                    <i key={index} style={{ animationDelay: `${(index % 6) * 85}ms` }} />
                  ))}
                </div>
                <AfTooltip label="Discard recording">
                  <button
                    type="button"
                    className="af-ch-composer__voicebtn"
                    aria-label="Discard recording"
                    onClick={() => {
                      setListening(false);
                      setText(dictationBase.current);
                      textareaRef.current?.focus();
                    }}
                  >
                    <AfIcon name="x" size={14} />
                  </button>
                </AfTooltip>
                <AfTooltip label="Use recording">
                  <button
                    type="button"
                    className="af-ch-composer__voicebtn af-ch-composer__voicebtn--ok"
                    aria-label="Use recording"
                    onClick={() => {
                      setListening(false);
                      textareaRef.current?.focus();
                    }}
                  >
                    <AfIcon name="check" size={14} />
                  </button>
                </AfTooltip>
              </div>
            ) : (
              <>
                <button
                  ref={modelAnchor}
                  type="button"
                  className="af-ch-composer__modelbtn"
                  aria-haspopup="listbox"
                  aria-expanded={modelOpen}
                  disabled={disabled}
                  onClick={() => setModelOpen((v) => !v)}
                >
                  <span className="af-ch-composer__modelname">{model?.name ?? "Auto"}</span>
                  <AfIcon name="chevronDown" size={13} className="af-ch-composer__modelchev" />
                </button>

                <AfTooltip label="Voice input">
                  <button
                    type="button"
                    className="af-ch-composer__iconbtn"
                    aria-label="Voice input"
                    aria-pressed={false}
                    disabled={disabled}
                    onClick={() => {
                      dictationBase.current = text;
                      setListening(true);
                    }}
                  >
                    <AfIcon name="mic" size={15} />
                  </button>
                </AfTooltip>
                <button
                  type="button"
                  className="af-ch-composer__send"
                  disabled={disabled || !text.trim() || isSending}
                  aria-label="Send message"
                  aria-busy={isSending || undefined}
                  onClick={send}
                >
                  {isSending ? (
                    <span className="af-ch-composer__spinner" aria-hidden />
                  ) : (
                    <AfIcon name={effectiveStatus === "sent" ? "check" : "arrowUp"} size={15} />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="af-ch-composer__foot">
        <button
          ref={folderAnchor}
          type="button"
          className="af-ch-composer__folder"
          data-selected={Boolean(folder) || undefined}
          aria-haspopup="listbox"
          aria-expanded={folderOpen}
          disabled={disabled}
          onClick={() => setFolderOpen((v) => !v)}
        >
          <span className="af-ch-composer__foldericon" aria-hidden>
            <MacFolderSvg size={15} />
          </span>
          <span className="af-ch-composer__folderlabel">{folder ?? "Work in a folder"}</span>
        </button>

        {effectiveStatus === "sent" ? (
          <span className="af-ch-composer__status" role="status">
            <AfIcon name="check" size={12} />
            Sent · {model?.name}
          </span>
        ) : null}

        <button
          ref={appsAnchor}
          type="button"
          className="af-ch-composer__connect"
          aria-haspopup="menu"
          aria-expanded={appsOpen}
          disabled={disabled}
          onClick={() => setAppsOpen((v) => !v)}
        >
          <span>Connect apps</span>
          <span className="af-ch-composer__logos" aria-hidden>
            {displayApps.map((app) => (
              <span
                key={app.id}
                className="af-ch-composer__logo"
                data-off={!connectedIds.includes(app.id) || undefined}
              >
                {renderAppGlyph(app, 13)}
              </span>
            ))}
          </span>
        </button>
      </div>

      <StagePopover
        open={attachOpen}
        anchorRef={attachAnchor}
        side="top"
        role="menu"
        label="Add to the chat"
        onClose={() => setAttachOpen(false)}
        className="af-ch-composer__attachmenu"
      >
        {isDefaultAttach ? (
          <AfHoverList tone="hover" className="af-ch-composer__menulist">
            <div className="af-ch-composer__menutitle" aria-hidden>
              Add
            </div>
            {RICH_ADD_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className="af-ch-menuitem af-ch-composer__richitem"
                onClick={() => pickAttachment(item.label)}
              >
                <span className="af-ch-composer__richicon" aria-hidden>
                  {renderAddIcon(item)}
                </span>
                <span className="af-ch-composer__richtext">
                  <span className="af-ch-composer__richname">{item.label}</span>
                  {item.desc ? <span className="af-ch-composer__richdesc">{item.desc}</span> : null}
                </span>
              </button>
            ))}
            <div className="af-ch-composer__menutitle af-ch-composer__menutitle--sep" aria-hidden>
              Plugins
            </div>
            {RICH_PLUGIN_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className="af-ch-menuitem af-ch-composer__richitem"
                onClick={() => pickAttachment(item.label)}
              >
                <span className="af-ch-composer__richicon" aria-hidden>
                  {renderPluginDocIcon(item.docColor)}
                </span>
                <span className="af-ch-composer__richtext">
                  <span className="af-ch-composer__richname">{item.label}</span>
                  <span className="af-ch-composer__richdesc">{item.desc}</span>
                </span>
              </button>
            ))}
          </AfHoverList>
        ) : (
          <AfHoverList tone="hover" className="af-ch-composer__menulist">
            {attachOptions.map((label) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                className="af-ch-menuitem"
                onClick={() => pickAttachment(label)}
              >
                <span>{label}</span>
              </button>
            ))}
          </AfHoverList>
        )}
      </StagePopover>

      <StagePopover
        open={approvalOpen}
        anchorRef={approvalAnchor}
        side="top"
        role="listbox"
        label="How should actions be approved?"
        onClose={() => setApprovalOpen(false)}
        className="af-ch-composer__approvalmenu"
      >
        <div className="af-ch-composer__menuhead">
          <span>How should actions be approved?</span>
          <span className="af-ch-composer__menulink">Learn more</span>
        </div>
        <AfHoverList tone="hover" className="af-ch-composer__menulist">
          {[
            {
              id: "request" as const,
              title: "Request approval",
              desc: "Always ask before editing outside files or using the internet",
              icon: <ApprovalHandSvg size={15} />,
              alert: false,
            },
            {
              id: "approve" as const,
              title: "Approve for me",
              desc: "Only ask for potentially unsafe actions",
              icon: <AfIcon name="checkCircle" size={15} />,
              alert: false,
            },
            {
              id: "granted" as const,
              title: "Full access",
              desc: "Unrestricted access to the internet and all files on your computer",
              icon: <AlertShieldSvg size={15} />,
              alert: true,
            },
          ].map((opt) => {
            const active = approval === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                className="af-ch-menuitem af-ch-composer__richitem"
                data-active={active || undefined}
                data-tone={opt.alert ? "alert" : undefined}
                onClick={() => {
                  setApproval(opt.id);
                  setApprovalOpen(false);
                }}
              >
                <span className="af-ch-composer__richicon" aria-hidden>
                  {opt.icon}
                </span>
                <span className="af-ch-composer__richtext">
                  <span className="af-ch-composer__richname">{opt.title}</span>
                  <span className="af-ch-composer__richdesc">{opt.desc}</span>
                </span>
                {active ? <AfIcon name="check" size={14} className="af-ch-composer__check" /> : null}
              </button>
            );
          })}
        </AfHoverList>
      </StagePopover>

      <StagePopover
        open={modelOpen}
        anchorRef={modelAnchor}
        align="end"
        side="top"
        role="listbox"
        label="Select a model"
        onClose={() => setModelOpen(false)}
        className="af-ch-composer__modelmenu"
      >
        <AfHoverList tone="hover" className="af-ch-composer__menulist">
          {models.map((item) => {
            const active = item.id === model?.id;
            const isAuto = item.id === "auto";
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={active}
                className="af-ch-menuitem af-ch-composer__richitem"
                data-active={active || undefined}
                onClick={() => {
                  setModelId(item.id);
                  setModelOpen(false);
                }}
              >
                <span className="af-ch-composer__richicon" aria-hidden>
                  {isAuto ? <AutoSparkleStrokeSvg /> : <BrandFavicon brand="claude" size={15} bare />}
                </span>
                <span className="af-ch-composer__richtext">
                  <span className="af-ch-composer__richname">{item.name}</span>
                  {item.description ? <span className="af-ch-composer__richdesc">{item.description}</span> : null}
                </span>
                {active ? <AfIcon name="check" size={14} className="af-ch-composer__check" /> : null}
              </button>
            );
          })}
        </AfHoverList>
      </StagePopover>

      <StagePopover
        open={folderOpen}
        anchorRef={folderAnchor}
        side="top"
        role="listbox"
        label="Select folder"
        onClose={() => setFolderOpen(false)}
        className="af-ch-composer__foldermenu"
      >
        <AfHoverList tone="hover" className="af-ch-composer__menulist">
          {folders.map((item) => {
            const active = folder === item;
            return (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={active}
                className="af-ch-menuitem"
                data-active={active || undefined}
                onClick={() => {
                  setFolder(active ? null : item);
                  setFolderOpen(false);
                }}
              >
                <span className="af-ch-composer__menuitem-lead">
                  <span className="af-ch-composer__foldericon" aria-hidden>
                    <MacFolderSvg size={15} />
                  </span>
                  <span>{item}</span>
                </span>
                {active ? <AfIcon name="check" size={14} /> : null}
              </button>
            );
          })}
        </AfHoverList>
      </StagePopover>

      <StagePopover
        open={appsOpen}
        anchorRef={appsAnchor}
        align="end"
        side="top"
        role="menu"
        label="Connect apps"
        onClose={() => setAppsOpen(false)}
        className="af-ch-composer__appsmenu"
      >
        <AfHoverList tone="hover" className="af-ch-composer__menulist">
          {apps.map((app) => {
            const active = connectedIds.includes(app.id);
            return (
              <button
                key={app.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={active}
                className="af-ch-menuitem"
                data-active={active || undefined}
                onClick={() => toggleApp(app.id)}
              >
                <span className="af-ch-composer__menuitem-lead">
                  <span className="af-ch-composer__logo" aria-hidden>
                    {renderAppGlyph(app, 14)}
                  </span>
                  <span>{app.name}</span>
                </span>
                {active ? <AfIcon name="check" size={14} /> : null}
              </button>
            );
          })}
        </AfHoverList>
      </StagePopover>
    </div>
  );
}

export { ChatComposer as AfChatComposer };
