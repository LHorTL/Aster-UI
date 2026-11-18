import { useId, useRef, useState, type ChangeEvent, type HTMLAttributes } from "react";
import { AfIcon } from "../../icons";
import { AfButton } from "../controls/Button";
import { AfInput } from "../controls/Input";
import { AfTextarea } from "../controls/Textarea";
import {
  DEFAULT_SETTINGS_USER,
  SettingsRow,
  SettingsSection,
  SettingsShell,
  SettingsSkel,
  useSettingsToast,
  type AfSettingsUser,
} from "./SettingsShell";

export type AfWorkspaceValues = {
  name: string;
  slug: string;
  context: string;
  icon?: string;
};

export type AfSettingsGeneralProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  /** Workspace configuration values; uses sample Acme workspace when omitted. */
  workspace?: AfWorkspaceValues;
  /** Called with the whole workspace whenever something is saved (text on blur, icon at once). */
  onSave?: (workspace: AfWorkspaceValues) => void;
  /** Called once deletion is confirmed by typing the workspace's name. */
  onDelete?: () => void;
  /** Called with the label of a settings page, or `"Back to app"`. */
  onNavigate?: (label: string) => void;
  /** Account at the bottom of the sidebar. */
  user?: AfSettingsUser;
  /** Shows skeleton shapes matching the real controls while loading. */
  loading?: boolean;
};

const DEFAULT_WORKSPACE: AfWorkspaceValues = {
  name: "Acme",
  slug: "acme",
  context: "",
};

const SAMPLE_ICONS = [
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' rx='10' fill='%230060e2'/><path d='M20 9l10 22h-4.6l-2.2-5.2h-6.4L14.6 31H10L20 9zm-1.6 12.8h3.2L20 17.6l-1.6 4.2z' fill='white'/></svg>",
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' rx='10' fill='%230f9f7f'/><circle cx='20' cy='20' r='9' fill='none' stroke='white' stroke-width='3.2'/></svg>",
];

function normalizeSlug(raw: string): string {
  return (
    raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "acme"
  );
}

/** Settings / General — Workspace icon, name, URL slug, assistant company context, and name-gated danger zone. */
export function AfSettingsGeneral(props: AfSettingsGeneralProps = {}) {
  const {
    workspace: workspaceProp,
    onSave,
    onDelete,
    onNavigate,
    user = DEFAULT_SETTINGS_USER,
    loading = false,
    className,
    ...rest
  } = props;

  const initial = workspaceProp ?? DEFAULT_WORKSPACE;
  const [values, setValues] = useState<AfWorkspaceValues>(initial);
  const [savedSnapshot, setSavedSnapshot] = useState<AfWorkspaceValues>(initial);
  const [iconSeed, setIconSeed] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const nameId = useId();
  const slugId = useId();
  const contextId = useId();
  const confirmId = useId();

  const { toastMessage, announce } = useSettingsToast();

  const commitSave = (next: AfWorkspaceValues, toastText: string) => {
    setValues(next);
    setSavedSnapshot(next);
    onSave?.(next);
    announce(toastText);
  };

  const handleUploadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        commitSave({ ...values, icon: reader.result }, "Workspace icon updated");
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleCycleSampleIcon = () => {
    const nextUrl = SAMPLE_ICONS[iconSeed % SAMPLE_ICONS.length];
    setIconSeed((s) => s + 1);
    commitSave({ ...values, icon: nextUrl }, "Workspace icon updated");
  };

  const handleRemoveIcon = () => {
    const next: AfWorkspaceValues = { ...values, icon: undefined };
    commitSave(next, "Workspace icon removed");
  };

  const handleBlurName = () => {
    const trimmed = values.name.trim() || savedSnapshot.name || "Acme";
    if (trimmed !== savedSnapshot.name || values.name !== trimmed) {
      commitSave({ ...values, name: trimmed }, "Workspace name saved");
    }
  };

  const handleBlurSlug = () => {
    const cleaned = normalizeSlug(values.slug);
    if (cleaned !== savedSnapshot.slug || values.slug !== cleaned) {
      commitSave({ ...values, slug: cleaned }, "Workspace URL saved");
    }
  };

  const handleBlurContext = () => {
    if (values.context !== savedSnapshot.context) {
      commitSave(values, "Company context saved");
    }
  };

  const approxTokens = Math.max(1, Math.round(values.context.trim().length / 4));
  const canDelete = confirmName.trim() === values.name.trim() && values.name.trim().length > 0;

  return (
    <SettingsShell
      activeSlug="settings-general"
      title="General"
      lead="Set up the basics of your workspace."
      workspace={values.name || "Acme"}
      user={user}
      toastMessage={toastMessage}
      onNavigate={onNavigate}
      onAnnounce={announce}
      className={className}
      {...rest}
    >
      <div className="af-ss__card">
        <SettingsRow label="Workspace icon" hint="Square, PNG or JPEG, up to 512 KB" inlineMobile>
          {loading ? (
            <SettingsSkel width={36} height={36} radius={9} />
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                tabIndex={-1}
                aria-hidden="true"
                onChange={handleUploadFile}
              />
              <span className="af-ss__ws-mark" aria-hidden="true">
                {values.icon ? (
                  <img src={values.icon} alt="" />
                ) : (
                  (values.name.trim().charAt(0) || "A").toUpperCase()
                )}
              </span>
              <AfButton
                size="sm"
                variant="secondary"
                icon="upload"
                aria-label="Upload workspace icon"
                onClick={handleCycleSampleIcon}
              >
                Upload
              </AfButton>
              {values.icon ? (
                <AfButton
                  size="sm"
                  variant="ghost"
                  aria-label="Remove workspace icon"
                  onClick={handleRemoveIcon}
                >
                  Remove
                </AfButton>
              ) : null}
            </>
          )}
        </SettingsRow>

        <SettingsRow label="Workspace name" hint="Shown in the sidebar and in invites" htmlFor={nameId} wideControl>
          {loading ? (
            <SettingsSkel width="100%" height={32} />
          ) : (
            <AfInput
              id={nameId}
              value={values.name}
              onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
              onBlur={handleBlurName}
              onPressEnter={(e) => e.currentTarget.blur()}
              style={{ width: "100%" }}
            />
          )}
        </SettingsRow>

        <SettingsRow label="Workspace URL" hint="Changing it breaks links people have saved" htmlFor={slugId} wideControl>
          {loading ? (
            <SettingsSkel width={260} height={32} />
          ) : (
            <div className="af-ss__prefix-field" style={{ width: "100%" }}>
              <span className="af-ss__prefix-tag">app.workspace.ai/</span>
              <input
                id={slugId}
                type="text"
                className="af-ss__prefix-input"
                value={values.slug}
                onChange={(e) => setValues((prev) => ({ ...prev, slug: e.target.value }))}
                onBlur={handleBlurSlug}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
            </div>
          )}
        </SettingsRow>
      </div>

      <SettingsSection
        title="Company context"
        description="Added to every chat in this workspace, so the assistant already knows how your company works. Keep it short – it counts toward every message."
      >
        {loading ? (
          <SettingsSkel width="100%" height={108} radius={12} />
        ) : (
          <AfTextarea
            id={contextId}
            aria-label="Company context"
            value={values.context}
            rows={4}
            expandedRows={8}
            expandable
            maxLength={2000}
            counter
            placeholder="E.g. We have three business units – Sales, Operations and Finance. Common terms: CRM (customer relationship management), SLA (service level agreement). Regional leads escalate to the COO."
            hint={
              values.context.trim().length > 0
                ? `~${approxTokens} tokens · Two or three short paragraphs work best.`
                : "Two or three short paragraphs work best: what the company does, how it's organised and the terms people use. Leave out slogans and history."
            }
            onChange={(e) => setValues((prev) => ({ ...prev, context: e.target.value }))}
            onBlur={handleBlurContext}
          />
        )}
      </SettingsSection>

      <SettingsSection title="Danger zone">
        <div className="af-ss__card" data-danger="true">
          <SettingsRow
            label="Delete workspace"
            hint={`All chats, files and agents of ${values.name || "Acme"} go for good, for every member.`}
          >
            <AfButton
              size="sm"
              variant="destructive"
              icon="trash"
              aria-expanded={deleteOpen}
              onClick={() => {
                setDeleteOpen((v) => !v);
                setConfirmName("");
              }}
            >
              Delete workspace
            </AfButton>
          </SettingsRow>

          {deleteOpen ? (
            <div className="af-ss__subrow">
              <label htmlFor={confirmId} className="af-ss__row-label" style={{ fontSize: "var(--af-fs-sm)" }}>
                Type <strong>{values.name}</strong> to confirm deletion
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <AfInput
                  id={confirmId}
                  value={confirmName}
                  placeholder={values.name}
                  onChange={(e) => setConfirmName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setDeleteOpen(false);
                      setConfirmName("");
                    }
                  }}
                  style={{ flex: "1 1 200px" }}
                />
                <AfButton
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDeleteOpen(false);
                    setConfirmName("");
                  }}
                >
                  Cancel
                </AfButton>
                <AfButton
                  size="sm"
                  variant="danger"
                  disabled={!canDelete}
                  icon={<AfIcon name="trash" size={13} />}
                  onClick={() => {
                    if (!canDelete) return;
                    setDeleteOpen(false);
                    setConfirmName("");
                    onDelete?.();
                    announce(`Deleted workspace "${values.name}"`);
                  }}
                >
                  Permanently delete
                </AfButton>
              </div>
            </div>
          ) : null}
        </div>
      </SettingsSection>
    </SettingsShell>
  );
}
