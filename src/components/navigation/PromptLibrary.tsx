import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AfButton, AfInput } from "../../ui";
import { cn, installAfListHover, useControllableState, useImeEnterGuard } from "../../primitives";
import {
  type AfPromptLibraryProps,
  DEFAULT_PROMPT_VALUES,
  PROMPT_TEMPLATES,
  parsePromptParts,
} from "../_shared/inputs";
import { copyText } from "../_shared/chat";

const CATEGORY_TONE_MAP: Record<string, string> = {
  Notes: "accent",
  Product: "violet",
  Debug: "warn",
  Sales: "ok",
};

function resolvePromptTone(category?: string, fallback?: string): string {
  if (category && CATEGORY_TONE_MAP[category]) return CATEGORY_TONE_MAP[category];
  return fallback ?? "accent";
}

/**
 * Prompt Library: left searchable template list (with sliding hover pill & category tone tags),
 * right inline auto-sizing variable chips inside the sentence, live assembled preview with active
 * variable highlight, and fill-gated primary action.
 */
export function AfPromptLibrary({
  title = "Prompts",
  templates = PROMPT_TEMPLATES,
  value: valueProp,
  defaultValue,
  onSelect,
  defaultValues,
  onUse,
  onUsePrompt,
  onCopy,
  useLabel = "Use prompt",
  className,
}: AfPromptLibraryProps = {}) {
  const [currentId, setCurrentId] = useControllableState<string>({
    value: valueProp,
    defaultValue: defaultValue ?? templates[0]?.id ?? "",
    onChange: onSelect,
  });
  const [values, setValues] = useState<Record<string, string>>(
    () => defaultValues ?? (templates === PROMPT_TEMPLATES ? DEFAULT_PROMPT_VALUES : {}),
  );
  const [query, setQuery] = useState("");
  const [focusedVar, setFocusedVar] = useState<string | null>(null);
  const [flashedVar, setFlashedVar] = useState<string | null>(null);
  const [used, setUsed] = useState(0);
  const [copied, setCopied] = useState(false);

  const copyTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const varInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const ime = useImeEnterGuard();

  useEffect(() => installAfListHover(), []);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    },
    [],
  );

  const template = templates.find((item) => item.id === currentId) ?? templates[0];
  const parts = useMemo(() => (template ? parsePromptParts(template) : []), [template]);

  const visibleTemplates = useMemo(
    () =>
      templates.filter(
        (item) => !query.trim() || `${item.name} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [templates, query],
  );

  const valueOf = (key: string) => {
    if (!template) return "";
    return values[`${template.id}:${key}`] ?? values[key] ?? "";
  };

  const setValue = (key: string, val: string) => {
    if (!template) return;
    setValues((prev) => ({ ...prev, [`${template.id}:${key}`]: val }));
    setFlashedVar(key);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashedVar(null), 420);
  };

  const allFilled = template ? template.variables.every((variable) => valueOf(variable.key).trim().length > 0) : false;

  /** Assemble final prompt text; unfilled variables appear as `{variable}`. */
  const assembled = template
    ? parts
        .map((part) => {
          if ("text" in part) return part.text;
          const variable = template.variables.find((item) => item.key === part.variable);
          return valueOf(part.variable).trim() || `{${variable?.key ?? part.variable}}`;
        })
        .join("")
    : "";

  const estimates = Math.max(8, Math.round(assembled.length / 4));

  const triggerUse = () => {
    if (!allFilled || !template) return;
    setUsed((prev) => prev + 1);
    const currentValues: Record<string, string> = {};
    for (const variable of template.variables) {
      currentValues[variable.key] = valueOf(variable.key).trim();
    }
    onUse?.(assembled, template, currentValues);
    onUsePrompt?.(assembled, template, currentValues);
  };

  const handleCopy = () => {
    if (!template) return;
    copyText(assembled);
    onCopy?.(assembled, template);
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  /** Jump to next empty variable slot on Enter, or submit when all variables are filled. */
  const onVariableKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== "Enter" || ime.shouldBlockEnter(event) || !template) return;
    event.preventDefault();
    const next = template.variables.slice(index + 1).find((variable) => !valueOf(variable.key).trim());
    if (next) {
      varInputs.current[next.key]?.focus();
      return;
    }
    triggerUse();
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!visibleTemplates.length) return;
    const idx = Math.max(0, visibleTemplates.findIndex((item) => item.id === template?.id));
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const target = visibleTemplates[(idx + step + visibleTemplates.length) % visibleTemplates.length];
      setCurrentId(target.id);
      setFocusedVar(null);
      listRef.current?.querySelector<HTMLButtonElement>(`[data-tpl-id="${CSS.escape(target.id)}"]`)?.focus();
    }
  };

  if (!template) return null;

  const filledCount = template.variables.filter((variable) => valueOf(variable.key).trim().length > 0).length;
  const tone = resolvePromptTone(template.category, template.tone);

  return (
    <section className={cn("af-in-prompt", className)}>
      <div className="af-in-prompt__body">
        <aside className="af-in-prompt__side">
          <div className="af-in-prompt__count">
            <span>{title}</span>
            <span className="af-in-prompt__count-num">{templates.length}</span>
          </div>
          <AfInput
            size="sm"
            icon="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                setQuery("");
              } else if (event.key === "ArrowDown" && visibleTemplates.length > 0) {
                event.preventDefault();
                const first = visibleTemplates[0];
                setCurrentId(first.id);
                listRef.current?.querySelector<HTMLButtonElement>(`[data-tpl-id="${CSS.escape(first.id)}"]`)?.focus();
              }
            }}
            placeholder="Search templates"
            aria-label="Search templates"
          />
          <div
            ref={listRef}
            className="af-in-prompt__list"
            role="listbox"
            aria-label="Prompt templates"
            onKeyDown={onListKeyDown}
          >
            {visibleTemplates.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                data-tpl-id={item.id}
                aria-selected={item.id === template.id}
                className="af-in-prompt__row"
                data-active={item.id === template.id || undefined}
                onClick={() => {
                  setCurrentId(item.id);
                  setFocusedVar(null);
                }}
              >
                <span className="af-in-prompt__row-name">{item.name}</span>
                <span className="af-in-prompt__tag" data-tone={resolvePromptTone(item.category, item.tone)}>
                  {item.category}
                </span>
              </button>
            ))}
            {visibleTemplates.length === 0 ? <p className="af-in-prompt__empty">No matching templates</p> : null}
          </div>
        </aside>

        <div className="af-in-prompt__main" key={template.id}>
          <header className="af-in-prompt__main-head">
            <h4>{template.name}</h4>
            <span className="af-in-prompt__tag" data-tone={tone}>
              {template.category}
            </span>
            <span
              className="af-in-prompt__filled"
              aria-label={`${filledCount} of ${template.variables.length} filled`}
            >
              <span className="af-in-prompt__squares" aria-hidden>
                {template.variables.map((variable, index) => (
                  <i key={variable.key || index} data-on={Boolean(valueOf(variable.key).trim()) || undefined} />
                ))}
              </span>
              {filledCount} of {template.variables.length} filled
            </span>
          </header>

          <div className="af-in-prompt__sentence">
            {parts.map((part, index) => {
              if ("text" in part) {
                const prevIsVar = index > 0 && "variable" in parts[index - 1]!;
                const textVal = prevIsVar ? part.text.replace(/^[.,;:?!]+/, "") : part.text;
                if (!textVal) return null;
                return <span key={index}>{textVal}</span>;
              }
              const nextPart = parts[index + 1];
              const trailingPunct =
                nextPart && "text" in nextPart ? (nextPart.text.match(/^[.,;:?!]+/)?.[0] ?? "") : "";
              const variable = template.variables.find((item) => item.key === part.variable) ?? {
                key: part.variable,
                label: part.variable,
                placeholder: part.variable,
                width: 72,
              };
              const variableIndex = template.variables.findIndex((item) => item.key === part.variable);
              const val = valueOf(variable.key);
              const sizerText = val || variable.placeholder || variable.label;
              return (
                <span
                  key={`${template.id}:${variable.key}:${index}`}
                  className="af-in-prompt__var-unit"
                  data-has-punct={trailingPunct ? "" : undefined}
                >
                  <span
                    className="af-in-prompt__var-chip"
                    data-filled={val.trim() ? "" : undefined}
                    data-focus={focusedVar === variable.key || undefined}
                  >
                    <span className="af-in-prompt__var-sizer" aria-hidden="true">
                      {sizerText}
                    </span>
                    <AfInput
                      ref={(element) => {
                        varInputs.current[variable.key] = element;
                      }}
                      variant="borderless"
                      size="sm"
                      className="af-in-prompt__var-field"
                      value={val}
                      placeholder={variable.placeholder}
                      aria-label={`${variable.label} variable`}
                      onChange={(event) => setValue(variable.key, event.target.value)}
                      onFocus={() => setFocusedVar(variable.key)}
                      onBlur={() => setFocusedVar(null)}
                      onCompositionStart={ime.onCompositionStart}
                      onCompositionEnd={ime.onCompositionEnd}
                      onKeyDown={(event) => onVariableKeyDown(event, variableIndex)}
                    />
                  </span>
                  {trailingPunct ? <span>{trailingPunct}</span> : null}
                </span>
              );
            })}
          </div>

          <div className="af-in-prompt__preview">
            <span className="af-in-prompt__preview-label">Preview</span>
            <div className="af-in-prompt__preview-body">
              <p>
                {parts.map((part, index) => {
                  if ("text" in part) return <span key={index}>{part.text}</span>;
                  const variable = template.variables.find((item) => item.key === part.variable);
                  const rawVal = valueOf(part.variable).trim();
                  const text = rawVal || `{${variable?.key ?? part.variable}}`;
                  const lit = focusedVar === part.variable || flashedVar === part.variable;
                  return (
                    <span
                      key={index}
                      className="af-in-prompt__assemble"
                      data-empty={!rawVal || undefined}
                      data-lit={lit || undefined}
                    >
                      {text}
                    </span>
                  );
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="af-in-prompt__foot">
        <span className="af-in-prompt__tokens">
          <span>
            ~<span key={estimates} className="af-in-filter__roll">{estimates}</span>
          </span>
          <span>tokens</span>
        </span>
        {used > 0 ? <span className="af-in-prompt__used">Used ×{used}</span> : null}
        <AfButton size="sm" variant="secondary" icon={copied ? "check" : "copy"} onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </AfButton>
        <span className="af-in-prompt__use-wrap" data-ready={allFilled || undefined} key={allFilled ? "ready" : "idle"}>
          <AfButton size="sm" variant="primary" iconRight="arrowRight" disabled={!allFilled} onClick={triggerUse}>
            {useLabel}
          </AfButton>
        </span>
      </footer>
    </section>
  );
}
