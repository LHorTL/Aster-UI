import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  AfButton,
  AfCheckbox,
  AfFormField,
  AfIconButton,
  AfInput,
  AfNumberInput,
  AfPasswordInput,
  AfRadio,
  AfRadioGroup,
  AfRating,
  AfSegmented,
  AfSelect,
  AfSlider,
  AfSwitch,
  AfTextarea,
  AfTimePicker,
  AfToggleGroup,
  type AfThumbValue,
} from "../components/controls";
import { AfTag } from "../components/display";
import type { ComponentSpec } from "../types";

const STAGE_COL: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
  width: "100%",
  maxWidth: 440,
  margin: "0 auto",
};

const SPEC_CARD: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: 20,
  borderRadius: 10,
  background: "var(--af-surface)",
  boxShadow: "var(--af-shadow-hairline)",
};

function StageSection({
  caption,
  children,
  centered = false,
}: {
  caption?: string;
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: centered ? "center" : "stretch",
        gap: centered ? 10 : 8,
      }}
    >
      {caption ? (
        <span
          style={{
            fontSize: centered ? 13 : 12,
            fontWeight: centered ? 400 : 500,
            lineHeight: "16px",
            color: "var(--af-muted)",
          }}
        >
          {caption}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function FlexRow({
  children,
  gap = 8,
  align = "center",
  justify = "flex-start",
}: {
  children: ReactNode;
  gap?: number;
  align?: "center" | "flex-start" | "baseline";
  justify?: "flex-start" | "center" | "space-between";
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: align, justifyContent: justify, gap }}>
      {children}
    </div>
  );
}

/* ========================================================================== */
/* 1. Button (1:1 affectUI)                                                   */
/* ========================================================================== */

function ButtonSpecimen() {
  const [copied, setCopied] = useState(false);
  const [copiedOnly, setCopiedOnly] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done">("idle");

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!copiedOnly) return;
    const t = window.setTimeout(() => setCopiedOnly(false), 1600);
    return () => window.clearTimeout(t);
  }, [copiedOnly]);

  useEffect(() => {
    if (uploadState !== "uploading") return;
    const t = window.setTimeout(() => setUploadState("done"), 1100);
    return () => window.clearTimeout(t);
  }, [uploadState]);

  useEffect(() => {
    if (uploadState !== "done") return;
    const t = window.setTimeout(() => setUploadState("idle"), 1600);
    return () => window.clearTimeout(t);
  }, [uploadState]);

  return (
    <div style={{ ...STAGE_COL, maxWidth: 520, gap: 22, alignItems: "center" }}>
      <StageSection caption="Styles" centered>
        <FlexRow gap={10} justify="center">
          <AfButton variant="primary">Save changes</AfButton>
          <AfButton variant="secondary">Secondary</AfButton>
          <AfButton variant="ghost">Ghost</AfButton>
          <AfButton variant="destructive" icon="trash">
            Delete
          </AfButton>
        </FlexRow>
      </StageSection>

      <StageSection caption="Icons and sizes" centered>
        <FlexRow gap={10} justify="center">
          <AfButton size="sm" variant="secondary" icon="plus">
            Add item
          </AfButton>
          <AfButton size="md" variant="primary" rightIcon="arrowRight">
            Continue
          </AfButton>
          <AfButton size="md" variant="ghost" icon="more" aria-label="More options" />
          <AfButton size="lg" variant="secondary">
            Large
          </AfButton>
        </FlexRow>
      </StageSection>

      <StageSection caption="Feedback and states" centered>
        <FlexRow gap={10} justify="center">
          <AfButton
            variant="secondary"
            icon={copied ? "check" : "copy"}
            onClick={() => setCopied(true)}
          >
            {copied ? "Copied" : "Copy link"}
          </AfButton>
          <AfButton
            variant="secondary"
            icon={copiedOnly ? "check" : "copy"}
            aria-label={copiedOnly ? "Copied" : "Copy"}
            onClick={() => setCopiedOnly(true)}
          />
          <AfButton
            variant="secondary"
            loading={uploadState === "uploading"}
            icon={uploadState === "done" ? "check" : UploadTrayGlyph}
            onClick={() => {
              if (uploadState === "idle") setUploadState("uploading");
            }}
          >
            {uploadState === "uploading"
              ? "Uploading…"
              : uploadState === "done"
                ? "Uploaded"
                : "Upload file"}
          </AfButton>
          <AfButton variant="secondary" disabled>
            Disabled
          </AfButton>
        </FlexRow>
      </StageSection>
    </div>
  );
}

/* ========================================================================== */
/* 2. Icon Button (1:1 affectUI)                                              */
/* ========================================================================== */

const UploadTrayGlyph = (
  <svg
    className="af-icon af-btn__icon"
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const SlidersGlyph = (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7h3M3 17h6M18 17h3M15 7h6" />
    <circle cx="9" cy="7" r="3" />
    <circle cx="15" cy="17" r="3" />
  </svg>
);

const PinGlyph = (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m15 4.5-4 4L7 10l-1.5 1.5 7 7L14 17l1.5-4 4-4-4.5-4.5Z" />
    <path d="m9 15-4.5 4.5" />
  </svg>
);

function IconButtonSpecimen() {
  const [helpful, setHelpful] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <div style={{ ...STAGE_COL, maxWidth: 400 }}>
      <div style={{ ...SPEC_CARD, padding: 0, gap: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            height: 52,
            padding: "0 12px 0 16px",
            boxShadow: "var(--af-divider-hairline)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              color: "var(--af-muted)",
            }}
          >
            <span>Runs</span>
            <span style={{ color: "var(--af-faint)", fontVariantNumeric: "tabular-nums" }}>24</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <AfIconButton size="md" variant="secondary" icon="search" label="Search runs" />
            <AfIconButton size="md" variant="secondary" icon={SlidersGlyph} label="Filter runs" />
            <AfIconButton
              size="md"
              variant="secondary"
              icon={PinGlyph}
              label={pinned ? "Unpin run" : "Pin run"}
              pressed={pinned}
              onClick={() => setPinned((prev) => !prev)}
            />
            <AfIconButton size="md" variant="primary" icon="plus" label="New run" />
          </div>
        </div>

        <div style={{ padding: "14px 16px 10px" }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "var(--af-ink)" }}>
            Summarised 14 support tickets – three mention the export timeout, so I opened a draft fix in billing-api.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              margin: "8px 0 0 -4px",
            }}
          >
            <AfIconButton
              size="md"
              variant="ghost"
              icon={copied ? "check" : "copy"}
              label={copied ? "Copied" : "Copy summary"}
              onClick={() => setCopied(true)}
            />
            <AfIconButton
              size="md"
              variant="ghost"
              icon="thumbsUp"
              label="Helpful"
              pressed={helpful}
              onClick={() => setHelpful((prev) => !prev)}
            />
            <AfIconButton size="md" variant="ghost" icon="refresh" loading label="Refreshing" />
            <AfIconButton size="md" variant="ghost" icon="more" label="More actions" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 3. Segmented Control (1:1 affectUI)                                        */
/* ========================================================================== */

function SegmentedSpecimen() {
  const [dashboard, setDashboard] = useState("overview");
  const [layout, setLayout] = useState("board");
  const [billing, setBilling] = useState("yearly");

  return (
    <div style={{ ...STAGE_COL, maxWidth: 440 }}>
      <div style={{ ...SPEC_CARD, padding: "4px 20px", gap: 0 }}>
        <div style={{ padding: "16px 0" }}>
          <StageSection caption="Dashboard">
            <AfSegmented
              variant="tray"
              aria-label="Dashboard"
              value={dashboard}
              onValueChange={setDashboard}
              options={[
                { value: "overview", label: "Overview" },
                { value: "analytics", label: "Analytics" },
                { value: "reports", label: "Reports" },
                { value: "notifications", label: "Notifications", count: 3 },
              ]}
            />
          </StageSection>
        </div>

        <div style={{ padding: "16px 0", boxShadow: "var(--af-divider-hairline-top)" }}>
          <StageSection caption="Layout">
            <div>
              <AfSegmented
                variant="tray"
                aria-label="Layout"
                value={layout}
                onValueChange={setLayout}
                options={[
                  { value: "list", label: "List", icon: "list" },
                  { value: "board", label: "Board", icon: "kanban" },
                  { value: "calendar", label: "Calendar", icon: "calendar" },
                ]}
              />
            </div>
          </StageSection>
        </div>

        <div style={{ padding: "16px 0", boxShadow: "var(--af-divider-hairline-top)" }}>
          <StageSection caption="Billing">
            <div>
              <AfSegmented
                variant="underline"
                kind="radio"
                aria-label="Billing"
                value={billing}
                onValueChange={setBilling}
                options={[
                  { value: "monthly", label: "Monthly" },
                  {
                    value: "yearly",
                    label: "Yearly",
                    badge: (
                      <AfTag size="xs" tone="accent" variant="soft" shape="pill">
                        Save 20%
                      </AfTag>
                    ),
                  },
                ]}
              />
            </div>
          </StageSection>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 4. Toggle Group (1:1 affectUI — zero custom font-family)                   */
/* ========================================================================== */

const BoldGlyph = (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 3h4.25a2.5 2.5 0 0 1 0 5H4.5V3Z" />
    <path d="M4.5 8h5a2.5 2.5 0 0 1 0 5H4.5V8Z" />
  </svg>
);

const ItalicGlyph = (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 3H6.5M9.5 13H6M9 3 7 13" />
  </svg>
);

function ToggleGroupSpecimen() {
  const [runFilters, setRunFilters] = useState<string[]>(["running", "needs-you"]);
  const [inlineMarks, setInlineMarks] = useState<string[]>(["bold"]);
  const [groupBy, setGroupBy] = useState<string | null>("agent");

  return (
    <div style={{ ...STAGE_COL, maxWidth: 440 }}>
      <div style={{ ...SPEC_CARD, padding: "4px 20px", gap: 0 }}>
        <div style={{ padding: "16px 0" }}>
          <StageSection caption="Show runs">
            <AfToggleGroup
              type="multiple"
              size="md"
              variant="buttons"
              aria-label="Show runs"
              value={runFilters}
              onValueChange={setRunFilters}
              items={[
                { value: "running", label: "Running" },
                { value: "needs-you", label: "Needs you" },
                { value: "done", label: "Done" },
                { value: "failed", label: "Failed" },
              ]}
            />
          </StageSection>
        </div>

        <div style={{ padding: "16px 0", boxShadow: "var(--af-divider-hairline-top)" }}>
          <StageSection caption="Prompt formatting">
            <FlexRow gap={10}>
              <AfToggleGroup
                type="multiple"
                size="sm"
                variant="tray"
                aria-label="Prompt formatting"
                value={inlineMarks}
                onValueChange={setInlineMarks}
                items={[
                  { value: "bold", icon: BoldGlyph, ariaLabel: "Bold" },
                  { value: "italic", icon: ItalicGlyph, ariaLabel: "Italic" },
                  { value: "code", ariaLabel: "Code", icon: "code" },
                  { value: "list", ariaLabel: "List", icon: "list" },
                ]}
              />
            </FlexRow>
          </StageSection>
        </div>

        <div style={{ padding: "16px 0", boxShadow: "var(--af-divider-hairline-top)" }}>
          <StageSection caption="Group by · press again for none">
            <AfToggleGroup
              type="single"
              size="sm"
              variant="buttons"
              allowClear
              aria-label="Group by"
              value={groupBy}
              onValueChange={setGroupBy}
              items={[
                { value: "agent", label: "Agent" },
                { value: "model", label: "Model" },
                { value: "day", label: "Day" },
              ]}
            />
          </StageSection>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 5. Rating (1:1 affectUI)                                                   */
/* ========================================================================== */

const RATING_WORDS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Excellent",
};

const ResearchAgentMark = (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: "none", color: "var(--af-accent)" }}>
    <rect x="2" y="2" width="3" height="3" rx="0.75" fill="currentColor" />
    <rect x="6.5" y="2" width="3" height="3" rx="0.75" fill="currentColor" />
    <rect x="11" y="2" width="3" height="3" rx="0.75" fill="currentColor" />
    <rect x="6.5" y="6.5" width="3" height="3" rx="0.75" fill="currentColor" />
    <rect x="2" y="11" width="3" height="3" rx="0.75" fill="currentColor" />
    <rect x="11" y="11" width="3" height="3" rx="0.75" fill="currentColor" />
  </svg>
);

function RatingSpecimen() {
  const [thumb, setThumb] = useState<AfThumbValue | null>(null);
  const [stars, setStars] = useState<number | null>(4);
  const [hoverWord, setHoverWord] = useState<number | null>(null);
  const displayScore = hoverWord ?? stars ?? 0;

  return (
    <div style={{ ...STAGE_COL, maxWidth: 400 }}>
      <div style={{ ...SPEC_CARD, padding: 0, gap: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {ResearchAgentMark}
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--af-ink)" }}>Research agent</span>
            <span style={{ fontSize: 12, color: "var(--af-faint)", fontVariantNumeric: "tabular-nums" }}>
              2m
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "var(--af-text)" }}>
            Three of the five competitors raised prices this quarter, by 8 to 15%. Linear and Height moved seats to annual billing only; the others kept monthly plans.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 28,
              marginRight: -4,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--af-muted)" }}>
              {thumb === "up"
                ? "Thanks for the feedback"
                : thumb === "down"
                  ? "Got it — we'll review this run"
                  : "Was this helpful?"}
            </span>
            <AfRating variant="thumbs" value={thumb} onValueChange={setThumb} label="Response helpfulness" />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 52,
            padding: "8px 16px",
            boxShadow: "var(--af-divider-hairline-top)",
          }}
          onPointerMove={(e) => {
            const btn = (e.target as HTMLElement).closest<HTMLElement>(".af-rating__star");
            if (btn) {
              const parent = btn.parentElement;
              if (parent) {
                const idx = Array.from(parent.children).indexOf(btn);
                if (idx >= 0) setHoverWord(idx + 1);
              }
            }
          }}
          onPointerLeave={() => setHoverWord(null)}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--af-ink)" }}>Rate this run</span>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <AfRating value={stars} onValueChange={setStars} allowClear label="Rate this run" />
            <span
              style={{
                width: 64,
                textAlign: "right",
                fontSize: 12,
                color: "var(--af-muted)",
              }}
            >
              {displayScore > 0 ? RATING_WORDS[displayScore] : "Unrated"}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 40,
            padding: "0 16px",
            boxShadow: "var(--af-divider-hairline-top)",
          }}
        >
          <AfRating size="sm" value={4.5} readOnly label="4.5 out of 5" />
          <span style={{ fontSize: 12, color: "var(--af-muted)", fontVariantNumeric: "tabular-nums" }}>
            <strong style={{ fontWeight: 500, color: "var(--af-ink)" }}>4.5</strong> · 2,184 runs rated
          </span>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 6. Input (1:1 affectUI)                                                    */
/* ========================================================================== */

function InputSpecimen() {
  const [name, setName] = useState("Maya Labs");
  const [slug, setSlug] = useState("maya-labs");
  const [email, setEmail] = useState("maya@acme");
  const apiKey = "aui_demo_4f9a2c71e8b3";

  const emailInvalid = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div style={{ ...STAGE_COL, maxWidth: 380 }}>
      <div style={{ ...SPEC_CARD, gap: 16 }}>
        <AfInput
          label="Workspace name"
          value={name}
          onValueChange={setName}
          clearable
          maxLength={32}
          counter
        />

        <AfInput
          label="Workspace URL"
          prefix="acme.app/"
          value={slug}
          onValueChange={setSlug}
          hint="Lowercase letters, numbers and dashes."
        />

        <AfInput
          label="Billing email"
          optional
          type="email"
          value={email}
          onValueChange={setEmail}
          error={emailInvalid ? "Enter a full email, like maya@acme.com" : undefined}
        />

        <AfPasswordInput
          label="Password"
          defaultValue="correct-horse1"
        />

        <AfInput
          label="API key"
          value={apiKey}
          readOnly
          copyable
          variant="filled"
          style={{ fontFamily: "var(--af-mono)", fontSize: 12.5 }}
        />
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 7. Textarea (1:1 affectUI)                                                 */
/* ========================================================================== */

const INITIAL_COMPANY_CONTEXT =
  "We're Acme, a 40-person B2B company selling scheduling software to clinics in Germany and Austria.\nCommon terms: MRR, churn, onboarding call, practice (= customer).\nAnswer in English unless someone writes in German.";

function TextareaSpecimen() {
  const [context, setContext] = useState(INITIAL_COMPANY_CONTEXT);
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [sentAt, setSentAt] = useState<string | null>(null);

  return (
    <div style={{ ...STAGE_COL, maxWidth: 400 }}>
      <div style={{ ...SPEC_CARD, gap: 18 }}>
        <AfTextarea
          label="Company context"
          value={context}
          onValueChange={setContext}
          minRows={5}
          maxRows={8}
          expandable
          expanded={expanded}
          expandedRows={10}
          onExpandedChange={setExpanded}
          maxLength={2000}
          counter
          hint="Added to every chat in this workspace."
        />

        <AfTextarea
          label="Note for the reviewer"
          optional
          value={note}
          onValueChange={(val) => {
            setNote(val);
            if (sentAt) setSentAt(null);
          }}
          placeholder="What should they look at first?"
          minRows={2}
          maxRows={4}
          aria-keyshortcuts="Control+Enter Meta+Enter"
          onSubmitShortcut={() => {
            if (!note.trim()) return;
            setSentAt("Sent");
            setNote("");
          }}
          hint={sentAt ? "Sent to reviewer" : "⌘ Enter to send"}
        />
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 8. Number Input (1:1 affectUI)                                             */
/* ========================================================================== */

function NumberInputSpecimen() {
  const [maxTokens, setMaxTokens] = useState<number | null>(32000);
  const [budget, setBudget] = useState<number | null>(25);
  const [agents, setAgents] = useState<number | null>(3);
  const [temp, setTemp] = useState<number | null>(0.7);

  return (
    <div style={{ ...STAGE_COL, maxWidth: 380 }}>
      <div style={{ ...SPEC_CARD, gap: 16 }}>
        <AfNumberInput
          label="Max tokens per run"
          value={maxTokens}
          onValueChange={setMaxTokens}
          min={1000}
          max={200000}
          step={1000}
          largeStep={10000}
          locale="en-US"
          formatOptions={{ maximumFractionDigits: 0 }}
          unit="tokens"
          hint="The answer stops here – Page Up adds 10,000."
        />

        <AfNumberInput
          label="Budget per run"
          value={budget}
          onValueChange={setBudget}
          min={1}
          max={100}
          step={5}
          precision={2}
          prefix="$"
          hint="Your plan allows up to $100."
        />

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <AfNumberInput
              label="Parallel agents"
              value={agents}
              onValueChange={setAgents}
              min={1}
              max={8}
              step={1}
              hint="Up to 8"
            />
          </div>
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <AfNumberInput
              label="Temperature"
              value={temp}
              onValueChange={setTemp}
              min={0}
              max={2}
              step={0.1}
              precision={1}
              hint="0 to 2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 9. Select (1:1 affectUI)                                                   */
/* ========================================================================== */

const ROLE_OPTIONS = [
  { value: "design", label: "Design", icon: "pencil" as const },
  { value: "engineering", label: "Engineering", icon: "code" as const },
  { value: "product", label: "Product", icon: "layers" as const },
  { value: "founder", label: "Founder", icon: "compass" as const },
  { value: "other", label: "Something else", icon: "sparkle" as const },
];

const DEFAULT_MODEL_OPTIONS = [
  { value: "auto", label: "Auto", description: "Picks the model for each message" },
  { value: "claude-opus-4-6", label: "Claude Opus 4.6", icon: "bot" as const, description: "Best for hard, long problems" },
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", icon: "sparkle" as const, description: "Fast and strong for most work" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5", icon: "bolt" as const, description: "Lightest, for short answers" },
  {
    value: "custom",
    label: "Your own model",
    description: "Add an endpoint in Models first",
    disabled: true,
  },
];

const TIME_ZONE_OPTIONS = [
  { value: "America/Los_Angeles", label: "Pacific Time – Los Angeles" },
  { value: "America/Denver", label: "Mountain Time – Denver" },
  { value: "America/Chicago", label: "Central Time – Chicago" },
  { value: "America/New_York", label: "Eastern Time – New York" },
  { value: "Europe/London", label: "Greenwich Time – London" },
  { value: "Europe/Berlin", label: "Central European Time – Berlin" },
  { value: "Europe/Vienna", label: "Central European Time – Vienna" },
  { value: "Asia/Tokyo", label: "Japan Time – Tokyo" },
];

function SelectSpecimen() {
  const [role, setRole] = useState("design");
  const [defaultModel, setDefaultModel] = useState("auto");
  const [timeZone, setTimeZone] = useState("");

  return (
    <div style={{ ...STAGE_COL, maxWidth: 360 }}>
      <div style={{ ...SPEC_CARD, gap: 16 }}>
        <AfSelect
          fieldLabel="Role"
          label="Role"
          width="100%"
          value={role}
          onValueChange={setRole}
          options={ROLE_OPTIONS}
          hint="Helps tailor suggestions to your work."
        />

        <AfSelect
          fieldLabel="Default model"
          label="Default model"
          width="100%"
          searchable
          value={defaultModel}
          onValueChange={setDefaultModel}
          options={DEFAULT_MODEL_OPTIONS}
        />

        <AfSelect
          fieldLabel="Time zone"
          label="Time zone"
          width="100%"
          searchable
          placeholder="Choose a time zone"
          value={timeZone}
          onValueChange={setTimeZone}
          options={TIME_ZONE_OPTIONS}
          error={!timeZone ? "Pick one, so reminders arrive on time." : undefined}
        />
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 10. Checkbox (1:1 affectUI)                                                */
/* ========================================================================== */

const EMAIL_TOPICS = [
  { key: "mentions", label: "Mentions", desc: "Someone mentions you in a chat or a file" },
  { key: "approvals", label: "Approvals", desc: "An agent waits for your OK before it acts" },
  { key: "weekly", label: "Weekly summary" },
];

function CheckboxSpecimen() {
  const [selected, setSelected] = useState<string[]>(["mentions"]);
  const [keepCopy, setKeepCopy] = useState(true);
  const [agreed, setAgreed] = useState(false);

  const allChecked = selected.length === EMAIL_TOPICS.length;
  const someChecked = selected.length > 0 && !allChecked;

  return (
    <div style={{ ...STAGE_COL, maxWidth: 360 }}>
      <div style={{ ...SPEC_CARD, gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, lineHeight: "18px", color: "var(--af-ink)" }}>
            Email me about
          </span>
          <AfCheckbox
            checked={allChecked}
            indeterminate={someChecked}
            onCheckedChange={(next) => setSelected(next ? EMAIL_TOPICS.map((i) => i.key) : [])}
          >
            Everything
          </AfCheckbox>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 26 }}>
            {EMAIL_TOPICS.map((item) => {
              const isOn = selected.includes(item.key);
              return (
                <AfCheckbox
                  key={item.key}
                  checked={isOn}
                  description={item.desc}
                  onCheckedChange={(next) =>
                    setSelected((prev) => (next ? [...prev, item.key] : prev.filter((k) => k !== item.key)))
                  }
                >
                  {item.label}
                </AfCheckbox>
              );
            })}
          </div>
        </div>

        <AfCheckbox
          variant="card"
          checked={keepCopy}
          onCheckedChange={setKeepCopy}
          description="Inputs and outputs stay for 30 days, so you can replay a run."
        >
          Keep a copy of every run
        </AfCheckbox>

        <AfCheckbox
          checked={agreed}
          onCheckedChange={setAgreed}
          error={!agreed ? "Agree to the terms to continue." : undefined}
        >
          I agree to the terms of service
        </AfCheckbox>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 11. Radio & Choice Card                                                    */
/* ========================================================================== */

function RadioSpecimen() {
  const [isolation, setIsolation] = useState("sandbox");
  const [tier, setTier] = useState("pro");

  return (
    <div style={{ ...STAGE_COL, maxWidth: 440 }}>
      <div style={{ ...SPEC_CARD, gap: 18 }}>
        <AfRadioGroup
          label="Execution isolation"
          value={isolation}
          onValueChange={setIsolation}
          options={[
            {
              value: "sandbox",
              label: "Ephemeral microVM sandbox",
              description: "Fresh filesystem per run with outbound domain allowlist.",
            },
            {
              value: "vpc",
              label: "Dedicated VPC runner",
              description: "Private peering to internal Postgres and artifact buckets.",
            },
            {
              value: "local",
              label: "Host passthrough (restricted)",
              description: "Requires admin policy unlock.",
              disabled: true,
            },
          ]}
        />

        <div style={{ paddingTop: 14, boxShadow: "var(--af-divider-hairline-top)" }}>
          <AfRadioGroup
            label="Compute tier"
            variant="card"
            orientation="horizontal"
            value={tier}
            onValueChange={setTier}
            options={[
              {
                value: "starter",
                label: "Shared CPU",
                icon: "server",
                badge: "$0 / hr",
                description: "2 vCPU · 4 GB RAM.",
              },
              {
                value: "pro",
                label: "Accelerated Burst",
                icon: "bolt",
                badge: <AfTag size="xs" tone="accent" variant="soft">Recommended</AfTag>,
                description: "8 vCPU · 16 GB RAM · sub-80ms cold start.",
              },
            ]}
          />
        </div>

        <div style={{ paddingTop: 12, boxShadow: "var(--af-divider-hairline-top)" }}>
          <AfRadio defaultChecked name="standalone-demo">
            Primary read-write replica
          </AfRadio>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 12. Switch (1:1 affectUI)                                                  */
/* ========================================================================== */

function SwitchSpecimen() {
  const [dailyDigest, setDailyDigest] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [holdNight, setHoldNight] = useState(true);
  const [compactRows, setCompactRows] = useState(false);

  return (
    <div style={{ ...STAGE_COL, maxWidth: 400, gap: 16 }}>
      <div style={{ ...SPEC_CARD, padding: "4px 16px", gap: 0 }}>
        <div style={{ padding: "12px 0" }}>
          <AfSwitch
            checked={dailyDigest}
            onCheckedChange={setDailyDigest}
            label="Daily digest"
            description="Approvals waiting, runs that finished or failed"
          />
        </div>
        <div style={{ padding: "12px 0", boxShadow: "var(--af-divider-hairline-top)" }}>
          <AfSwitch
            checked={weeklyReport}
            onCheckedChange={setWeeklyReport}
            label="Weekly usage report"
            description="Credits spent and the busiest agents, every Monday"
          />
        </div>
        <div style={{ padding: "12px 0", boxShadow: "var(--af-divider-hairline-top)" }}>
          <AfSwitch
            checked={holdNight}
            onCheckedChange={setHoldNight}
            label="Hold pushes at night"
            description="Mobile pushes wait until morning"
          />
        </div>
        <div style={{ padding: "12px 0", boxShadow: "var(--af-divider-hairline-top)" }}>
          <AfSwitch
            disabled
            label="Sound on new messages"
            description="Needs the desktop app"
          />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", paddingLeft: 4 }}>
        <AfSwitch
          size="sm"
          placement="start"
          checked={compactRows}
          onCheckedChange={setCompactRows}
        >
          Compact rows
        </AfSwitch>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 13. Slider                                                                 */
/* ========================================================================== */

function SliderSpecimen() {
  const [contextK, setContextK] = useState(128);
  const [latencyBand, setLatencyBand] = useState<[number, number]>([40, 180]);

  return (
    <div style={{ ...STAGE_COL, maxWidth: 420 }}>
      <div style={{ ...SPEC_CARD, gap: 24 }}>
        <AfSlider
          label="Context window budget"
          min={16}
          max={256}
          step={16}
          value={contextK}
          onValueChange={setContextK}
          format={(v) => `${v}k`}
          marks={{ 16: "16k", 64: "64k", 128: "128k", 256: "256k" }}
        />

        <div style={{ paddingTop: 16, boxShadow: "var(--af-divider-hairline-top)" }}>
          <AfSlider
            range
            label="Target latency SLO band"
            ariaLabel={["Min latency", "Max latency"]}
            min={10}
            max={300}
            step={10}
            value={latencyBand}
            onValueChange={setLatencyBand}
            format={(v) => `${v}ms`}
          />
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 14. Form Field (1:1 affectUI)                                              */
/* ========================================================================== */

const FORM_MODEL_OPTIONS = [
  { value: "sonnet", label: "Claude Sonnet" },
  { value: "opus", label: "Claude Opus" },
  { value: "haiku", label: "Claude Haiku" },
];

const FORM_MODEL_HINTS: Record<string, string> = {
  sonnet: "Opus thinks longer and costs more.",
  opus: "Opus thinks longer and costs more.",
  haiku: "Haiku answers fastest at a fraction of the cost.",
};

function FormFieldSpecimen() {
  const [agentName, setAgentName] = useState("Release notes writer");
  const [model, setModel] = useState("sonnet");
  const [budgetStr, setBudgetStr] = useState("140");
  const [brief, setBrief] = useState("Summarise merged pull requests for the changelog.");

  const nameMissing = agentName.trim().length === 0;
  const budgetNum = Number(budgetStr);
  const budgetInvalid = budgetStr.trim() === "" || Number.isNaN(budgetNum) || budgetNum > 100 || budgetNum < 1;

  return (
    <div style={{ ...STAGE_COL, maxWidth: 360 }}>
      <div style={{ ...SPEC_CARD, gap: 16 }}>
        <AfFormField
          label="Agent name"
          required
          counter={`${agentName.length}/40`}
          error={nameMissing ? "Give the agent a name." : undefined}
        >
          <AfInput value={agentName} onValueChange={setAgentName} maxLength={40} />
        </AfFormField>

        <AfFormField label="Model" hint={FORM_MODEL_HINTS[model]}>
          <AfSelect
            label="Model"
            width="100%"
            value={model}
            onValueChange={setModel}
            options={FORM_MODEL_OPTIONS}
          />
        </AfFormField>

        <AfFormField
          label="Budget per run"
          hint={!budgetInvalid ? "Your plan allows up to $100 per run." : undefined}
          error={budgetInvalid ? "Your plan allows up to $100 per run." : undefined}
        >
          <AfInput
            inputMode="decimal"
            value={budgetStr}
            onValueChange={setBudgetStr}
          />
        </AfFormField>

        <AfFormField
          label="Brief"
          optional
          counter={`${brief.length}/280`}
        >
          <AfTextarea value={brief} onValueChange={setBrief} minRows={2} maxRows={4} maxLength={280} />
        </AfFormField>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 15. Time Picker (1:1 affectUI)                                             */
/* ========================================================================== */

function TimePickerSpecimen() {
  const [runAt, setRunAt] = useState("09:30");
  const [cutoff, setCutoff] = useState("");

  return (
    <div style={{ ...STAGE_COL, maxWidth: 320 }}>
      <div style={{ ...SPEC_CARD, gap: 16 }}>
        <AfTimePicker
          fieldLabel="Run at"
          label="Run at"
          width="100%"
          value={runAt}
          onValueChange={setRunAt}
          hint="Every weekday, in your time zone (Europe/Vienna)."
        />
        <AfTimePicker
          fieldLabel="Don't start after"
          label="Don't start after"
          optional
          clearable
          step={30}
          placeholder="Any time"
          width="100%"
          value={cutoff}
          onValueChange={setCutoff}
          hint="A run that would start later waits for the next day."
        />
      </div>
    </div>
  );
}

/**
 * 基础表单控件与底层交互原语展示规格（1:1 对齐 affectUI 纯净舞台）。
 * 由 Showcase 在 baseSpecs / inputSpecs 之前注册，自动覆盖旧同 id 条目并新增 icon-button 与 rating。
 */
export const controlsSpecs: ComponentSpec[] = [
  {
    id: "button",
    title: "Button",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。八档操作层级、宽度自适应按压微缩回弹、加载扫描光带与 useWidthMorph 平滑宽度形变。",
    render: ButtonSpecimen,
    width: 720,
  },
  {
    id: "icon-button",
    title: "Icon Button",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。等宽高纯图标触控按钮，强制无障碍命名、自动悬停提示、aria-pressed 切换与加载旋转。",
    render: IconButtonSpecimen,
    width: 720,
  },
  {
    id: "segmented-control",
    title: "Segmented Control",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。非对称双边时序胶囊滑块、按下弹性下沉与横向拖拽漫游，支持 tabs 与 radiogroup 双语义。",
    render: SegmentedSpecimen,
    width: 720,
  },
  {
    id: "toggle-group",
    title: "Toggle Group",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。6px 独立发丝切换按钮组与多选/单选托盘胶囊，基于 [aria-pressed] 表达激活态与四向键盘漫游。",
    render: ToggleGroupSpecimen,
    width: 720,
  },
  {
    id: "rating",
    title: "Rating",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。赞踩微倾弹簧回弹（thumbs）与五星错峰点亮评价（stars），支持半星只读裁剪与再次点击清零。",
    render: RatingSpecimen,
    width: 720,
  },
  {
    id: "input",
    title: "Input",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。内建标签/说明/错误抖动/字数统计，支持 Escape 清空、自绘勾线复制反馈与密码显隐。",
    render: InputSpecimen,
    width: 720,
  },
  {
    id: "textarea",
    title: "Textarea",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。右上角 26×26 展开切换器、minRows/maxRows 自适应生长、⌘/Ctrl+Enter 提交与轻量代码着色。",
    render: TextareaSpecimen,
    width: 720,
  },
  {
    id: "number-input",
    title: "Number Input",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。末端成组步进器长按加速连发、步进微滚入动效、失焦 Intl 千分位/货币格式化与 Shift×10 微调。",
    render: NumberInputSpecimen,
    width: 720,
  },
  {
    id: "select",
    title: "Select",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。90ms 滑动悬停底块、pathLength=1 选中勾线绘制、关闭态 A–Z 快跳、框内检索与多选标签入场。",
    render: SelectSpecimen,
    width: 720,
    height: 560,
  },
  {
    id: "checkbox",
    title: "Checkbox",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。pathLength=1 勾线自绘动画与点按回弹，支持半选父子树联动、发丝可选卡片与行内错误态。",
    render: CheckboxSpecimen,
    width: 720,
  },
  {
    id: "radio",
    title: "Radio & Choice Card",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。中性发丝按压反馈与中心白点弹簧绽放，支持纵向滑动高光列表与发丝可选卡片。",
    render: RadioSpecimen,
    width: 720,
  },
  {
    id: "switch",
    title: "Switch",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。圆胶囊弹性推拉与按下拇指拉长形变，支持 accent/solid 双色调与零遮挡 ON/OFF 内嵌字。",
    render: SwitchSpecimen,
    width: 720,
  },
  {
    id: "slider",
    title: "Slider",
    group: "基础控件",
    source: "project",
    note: "Aster UI 基础控件。悬停/聚焦/拖拽浮现拇指刻度气泡，支持单值、双拇指区间与可点击刻度点。",
    render: SliderSpecimen,
    width: 720,
  },
  {
    id: "form-field",
    title: "Form Field",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。统一管理 label / optional / hint / counter / error，并向下游控件自动注入无障碍与禁用态上下文。",
    render: FormFieldSpecimen,
    width: 720,
  },
  {
    id: "time-picker",
    title: "Time Picker",
    group: "基础控件",
    source: "free",
    note: "affectUI 免费组件。默认单列 15 分钟步进滑动高亮时段列表并自动居中选中项，同时兼容多列拨盘、自然文本快输与日期时间联合面板。",
    render: TimePickerSpecimen,
    width: 720,
    height: 520,
  },
];
