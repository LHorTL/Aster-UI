import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AfIcon } from "../../icons";
import { AfButton, AfChipInput, AfInput } from "../../ui";
import {
  cn,
  useControllableState,
  useImeEnterGuard,
  useIsomorphicLayoutEffect,
  useWidthMorph,
} from "../../primitives";
import {
  type AfStepperFormProps,
  STEPPER_PLANS,
  STEPPER_STEPS,
  type StepperDefaultValues,
  type StepperPlan,
  type StepperRenderContext,
} from "../_shared/inputs";

/* ------------------------------------------------------------------ */
/* Stepper Form composable sub-components                              */
/* ------------------------------------------------------------------ */

export type AfStepperFieldProps = {
  label: ReactNode;
  optional?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  shake?: number | boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
};

export function AfStepperField({
  label,
  optional,
  hint,
  error,
  shake,
  htmlFor,
  children,
  className,
}: AfStepperFieldProps) {
  const Tag = htmlFor ? "label" : "div";
  return (
    <Tag
      htmlFor={htmlFor}
      className={cn("af-in-step__field", className)}
      data-shake={shake && error ? String(shake) : undefined}
    >
      <span className="af-in-step__label">
        <span>{label}</span>
        {optional ? <em>{optional === true ? "Optional" : optional}</em> : null}
      </span>
      {children}
      {error ? (
        <p className="af-in-step__field-error" role="alert">
          <AfIcon name="alert" size={12} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="af-in-step__help">{hint}</p>
      ) : null}
    </Tag>
  );
}

export function AfStepperInput(props: ComponentProps<typeof AfInput>) {
  return <AfInput size="lg" {...props} />;
}

export function AfStepperTags(props: ComponentProps<typeof AfChipInput>) {
  return <AfChipInput {...props} />;
}

export type AfStepperChoiceOption = {
  id: string;
  name: string;
  description?: ReactNode;
  price?: ReactNode;
};

export type AfStepperChoicesProps = {
  options: AfStepperChoiceOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
};

export function AfStepperChoices({
  options,
  value,
  onChange,
  ariaLabel = "Options",
  className,
}: AfStepperChoicesProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!options.length) return;
    const index = Math.max(0, options.findIndex((item) => item.id === value));
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!delta) return;
    event.preventDefault();
    const target = options[(index + delta + options.length) % options.length];
    onChange(target.id);
    groupRef.current?.querySelector<HTMLElement>(`[data-plan="${CSS.escape(target.id)}"]`)?.focus();
  };

  return (
    <div
      ref={groupRef}
      className={cn("af-in-step__plans", className)}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {options.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            data-plan={item.id}
            data-active={active || undefined}
            className="af-in-step__plan"
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
          >
            <span className="af-in-step__plan-head">
              <span className="af-in-step__plan-name">{item.name}</span>
              <span className="af-in-step__plan-radio" aria-hidden>
                {active ? <AfIcon name="check" size={10} /> : null}
              </span>
            </span>
            {item.description ? <span className="af-in-step__plan-desc">{item.description}</span> : null}
            {item.price ? <span className="af-in-step__plan-price">{item.price}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export type AfStepperReviewItem = {
  label: ReactNode;
  value: ReactNode;
  meta?: ReactNode;
  onEdit?: () => void;
};

export function AfStepperReview({
  items,
  className,
}: {
  items: AfStepperReviewItem[];
  className?: string;
}) {
  return (
    <dl className={cn("af-in-step__summary", className)}>
      {items.map((item, idx) => (
        <div key={idx}>
          <dt>{item.label}</dt>
          <dd>
            <span>{item.value}</span>
            {item.meta ? <em>{item.meta}</em> : null}
            {item.onEdit ? (
              <button type="button" className="af-in-step__edit-link" onClick={item.onEdit}>
                Edit
              </button>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AfStepperSuccess({
  title = "Workspace created",
  description,
  resetLabel = "Start over",
  onReset,
}: {
  title?: ReactNode;
  description?: ReactNode;
  resetLabel?: string;
  onReset?: () => void;
}) {
  return (
    <div className="af-in-step__done">
      <span className="af-in-step__done-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
          <path
            className="af-in-step__done-check"
            d="M7.5 12.4L10.6 15.5L16.8 8.8"
            pathLength={1}
            stroke="currentColor"
            strokeWidth="1.85"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <h4>{title}</h4>
      {description ? <p>{description}</p> : null}
      {onReset ? (
        <AfButton size="sm" variant="secondary" icon="undo" onClick={onReset}>
          {resetLabel}
        </AfButton>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main AfStepperForm                                                  */
/* ------------------------------------------------------------------ */

type LeavingPane = {
  key: string;
  node: ReactNode;
  dir: "forward" | "back";
};

/**
 * Stepper Form: 4-segment numbered progress bar (numbers draw-morph into checkmarks on completion),
 * directional crossfade slide between steps, ResizeObserver height morphing, and primary button width morph.
 */
function normalizeStepLabel(label: string): string {
  if (label && label === label.toUpperCase() && /^[A-Z\s]+$/.test(label)) {
    return label.charAt(0) + label.slice(1).toLowerCase();
  }
  return label;
}

const DEFAULT_STEPPER_STEPS = [
  {
    id: "workspace",
    label: "Workspace",
    title: "Name your workspace",
    description: "This is where your team's projects live.",
  },
  {
    id: "team",
    label: "Team",
    title: "Invite your team",
    description: "You can always add more people later.",
  },
  {
    id: "plan",
    label: "Plan",
    title: "Choose a plan",
    description: "Change or cancel anytime from settings.",
  },
  {
    id: "review",
    label: "Review",
    title: "Review and create",
    description: "Double-check everything before creating your workspace.",
  },
];

export function AfStepperForm<TValues extends Record<string, any> = StepperDefaultValues>({
  steps = (DEFAULT_STEPPER_STEPS ?? STEPPER_STEPS) as any,
  plans = STEPPER_PLANS,
  defaultValues,
  initialValues,
  initialStep = 0,
  step: stepProp,
  onStepChange,
  onComplete,
  submitLabel = "Create workspace",
  submittingLabel = "Creating…",
  success,
  className,
}: AfStepperFormProps<TValues> = {}) {
  const nameInputId = useId();
  const urlInputId = useId();
  const mergedDefaults = {
    name: "Northwind Studio",
    url: "northwind-studio",
    domains: [],
    plan: "pro" as StepperPlan["id"],
    ...defaultValues,
    ...initialValues,
  } as unknown as TValues;

  const [step, setStep] = useControllableState<number>({
    value: stepProp,
    defaultValue: Math.max(0, Math.min(initialStep, Math.max(0, steps.length - 1))),
    onChange: onStepChange,
  });
  const [values, setValuesState] = useState<TValues>(mergedDefaults);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [hasMoved, setHasMoved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bannerError, setBannerError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  const [leaving, setLeaving] = useState<LeavingPane | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const submitWrapRef = useRef<HTMLSpanElement>(null);
  const leaveTimerRef = useRef<number | null>(null);
  const prevPaneRef = useRef<{ key: string; node: ReactNode } | null>(null);
  const ime = useImeEnterGuard();

  useEffect(
    () => () => {
      if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
    },
    [],
  );

  const setValue = <K extends keyof TValues>(key: K, val: TValues[K]) => {
    setValuesState((prev) => ({ ...prev, [key]: val }));
    if (errors[String(key)]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[String(key)];
        return next;
      });
    }
    if (bannerError) setBannerError("");
  };

  const setValues = (patch: Partial<TValues>) => {
    setValuesState((prev) => ({ ...prev, ...patch }));
    if (bannerError) setBannerError("");
  };

  const current = steps[step] ?? steps[0];
  const isLastStep = step >= steps.length - 1;
  const primaryBtnText = submitting ? submittingLabel : isLastStep ? submitLabel : "Continue";
  useWidthMorph(submitWrapRef, `${isLastStep}:${submitting}:${primaryBtnText}`, 280);

  const goTo = (targetIndex: number) => {
    const clamped = Math.max(0, Math.min(targetIndex, steps.length - 1));
    if (clamped === step && !done) return;
    const nextDir: "forward" | "back" = done || clamped < step ? "back" : "forward";
    if (prevPaneRef.current) {
      setLeaving({ key: prevPaneRef.current.key, node: prevPaneRef.current.node, dir: nextDir });
      if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = window.setTimeout(() => setLeaving(null), 320);
    }
    setHasMoved(true);
    setDirection(nextDir);
    setDone(false);
    setErrors({});
    setBannerError("");
    setStep(clamped);
  };

  const runValidation = (): boolean => {
    if (current?.validate) {
      const res = current.validate(values);
      if (!res) return true;
      if (typeof res === "string") {
        setBannerError(res);
        setShakeKey((k) => k + 1);
        return false;
      }
      const keys = Object.keys(res).filter((k) => Boolean(res[k]));
      if (keys.length > 0) {
        setErrors(res);
        setBannerError(res[keys[0]]);
        setShakeKey((k) => k + 1);
        return false;
      }
      return true;
    }

    if (!current?.render) {
      const wsName = String(values.name ?? "").trim();
      const wsUrl = String(values.url ?? "").replace(/^affect\.app\//, "").trim();
      const wsDomains: string[] = Array.isArray(values.domains) ? values.domains : [];
      if (step === 0 && !wsName) {
        setErrors({ name: "Enter a workspace name." });
        setBannerError("Enter a workspace name.");
        setShakeKey((k) => k + 1);
        return false;
      }
      if (step === 0 && !wsUrl) {
        setErrors({ url: "Enter a workspace URL." });
        setBannerError("Enter a workspace URL.");
        setShakeKey((k) => k + 1);
        return false;
      }
      if (
        step === 1 &&
        wsDomains.some(
          (entry) =>
            !/^(?:[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}|[a-z0-9.-]+\.[a-z]{2,})$/i.test(entry),
        )
      ) {
        setErrors({ domains: "Enter a valid email address, e.g. name@company.com." });
        setBannerError("Enter a valid email address, e.g. name@company.com.");
        setShakeKey((k) => k + 1);
        return false;
      }
    }
    return true;
  };

  const next = async () => {
    if (done || submitting) return;
    if (!runValidation()) return;

    setErrors({});
    setBannerError("");

    if (step < steps.length - 1) {
      goTo(step + 1);
      return;
    }

    const trimmedValues = {
      ...values,
      ...(typeof values.name === "string" ? { name: values.name.trim() } : {}),
      ...(typeof values.url === "string" ? { url: values.url.trim() } : {}),
    } as TValues;

    if (onComplete) {
      try {
        const maybePromise = onComplete(trimmedValues);
        if (maybePromise && typeof (maybePromise as Promise<void>).then === "function") {
          setSubmitting(true);
          await maybePromise;
          setSubmitting(false);
        }
      } catch (err) {
        setSubmitting(false);
        const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setBannerError(msg);
        setShakeKey((k) => k + 1);
        return;
      }
    }

    if (prevPaneRef.current) {
      setLeaving({ key: prevPaneRef.current.key, node: prevPaneRef.current.node, dir: "forward" });
      if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = window.setTimeout(() => setLeaving(null), 320);
    }
    setHasMoved(true);
    setDirection("forward");
    setDone(true);
  };

  const back = () => {
    if (step === 0 || done || submitting) return;
    goTo(step - 1);
  };

  const resetAll = () => {
    if (prevPaneRef.current) {
      setLeaving({ key: prevPaneRef.current.key, node: prevPaneRef.current.node, dir: "back" });
      if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = window.setTimeout(() => setLeaving(null), 320);
    }
    setHasMoved(true);
    setDirection("back");
    setDone(false);
    setErrors({});
    setBannerError("");
    setStep(0);
  };

  useIsomorphicLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const sync = () => setContentHeight(element.offsetHeight);
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    return () => observer.disconnect();
  }, [step, done, bannerError]);

  const selectedPlan = plans.find((item) => item.id === values.plan) ?? plans[0];
  const renderCtx: StepperRenderContext<TValues> = {
    values,
    setValue,
    setValues,
    errors,
    shakeKey,
    goTo,
    stepIndex: step,
  };

  const wsName = String(values.name ?? "");
  const wsUrl = String(values.url ?? "");
  const cleanSlug = wsUrl.replace(/^affect\.app\//, "");
  const wsDomains: string[] = Array.isArray(values.domains) ? values.domains : [];

  const activeKey = done ? "done" : `step-${step}`;
  const headingText = current?.heading ?? current?.title ?? "";

  const activePaneBody: ReactNode = done ? (
    success ? (
      success(values, resetAll)
    ) : (
      <AfStepperSuccess
        title="Workspace created"
        description={
          <>
            <strong>{wsName || "Your workspace"}</strong> is ready on the {selectedPlan?.name ?? "Pro"} plan
            {wsDomains.length ? `, with auto-join enabled for ${wsDomains.join(", ")}` : ""}.
          </>
        }
        onReset={resetAll}
      />
    )
  ) : (
    <>
      <header className="af-in-step__head">
        <h4>{headingText}</h4>
        {current?.description ? <p>{current.description}</p> : null}
      </header>

      {current?.render ? (
        <div className="af-in-step__custom" data-shake={shakeKey && bannerError ? shakeKey : undefined}>
          {current.render(renderCtx)}
        </div>
      ) : (
        <>
          {step === 0 ? (
            <div className="af-in-step__fields" data-shake={shakeKey && bannerError ? shakeKey : undefined}>
              <AfStepperField label="Workspace name" htmlFor={nameInputId}>
                <AfStepperInput
                  id={nameInputId}
                  value={wsName}
                  invalid={Boolean(errors.name)}
                  onChange={(event) => setValue("name" as keyof TValues, event.target.value as any)}
                  placeholder="Acme Inc."
                  aria-label="Workspace name"
                />
              </AfStepperField>
              <AfStepperField
                label="Workspace URL"
                htmlFor={urlInputId}
                hint="Lowercase letters, numbers and dashes"
              >
                <div className="af-in-intset__group" data-invalid={Boolean(errors.url) || undefined}>
                  <span className="af-in-intset__prefix" aria-hidden>
                    affect.app/
                  </span>
                  <AfInput
                    id={urlInputId}
                    variant="borderless"
                    size="sm"
                    className="af-in-intset__site-input"
                    value={cleanSlug}
                    aria-invalid={Boolean(errors.url) || undefined}
                    onChange={(event) =>
                      setValue(
                        "url" as keyof TValues,
                        event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") as any,
                      )
                    }
                    placeholder="acme"
                    aria-label="Workspace URL"
                    spellCheck={false}
                  />
                </div>
              </AfStepperField>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="af-in-step__fields" data-shake={shakeKey && bannerError ? shakeKey : undefined}>
              <AfStepperField
                label="Email addresses"
                optional="Optional"
                hint="Press Enter or comma to add"
              >
                <AfStepperTags
                  values={wsDomains}
                  onChange={(nextDomains) => setValue("domains" as keyof TValues, nextDomains as any)}
                  placeholder="name@company.com"
                  label="Email addresses"
                />
              </AfStepperField>
            </div>
          ) : null}

          {step === 2 ? (
            <AfStepperChoices
              ariaLabel="Choose a plan"
              options={plans}
              value={String(values.plan ?? plans[0]?.id ?? "")}
              onChange={(planId) => setValue("plan" as keyof TValues, planId as any)}
            />
          ) : null}

          {step === 3 ? (
            <AfStepperReview
              items={[
                { label: "Workspace", value: wsName || "Untitled", onEdit: () => goTo(0) },
                {
                  label: "Workspace URL",
                  value: cleanSlug ? `affect.app/${cleanSlug}` : "Not set",
                  onEdit: () => goTo(0),
                },
                {
                  label: "Team",
                  value: wsDomains.length ? wsDomains.join(", ") : "None invited yet",
                  onEdit: () => goTo(1),
                },
                {
                  label: "Plan",
                  value: selectedPlan?.name ?? "—",
                  meta: selectedPlan?.price,
                  onEdit: () => goTo(2),
                },
              ]}
            />
          ) : null}
        </>
      )}

      <div className="af-in-step__error" data-show={bannerError || undefined} role="alert">
        <div className="af-in-step__error-inner">
          {bannerError ? (
            <p key={shakeKey}>
              <AfIcon name="alert" size={14} />
              <span>{bannerError}</span>
            </p>
          ) : null}
        </div>
      </div>
    </>
  );

  prevPaneRef.current = { key: activeKey, node: activePaneBody };

  return (
    <section
      className={cn("af-in-step", className)}
      onCompositionStart={ime.onCompositionStart}
      onCompositionEnd={ime.onCompositionEnd}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          !ime.shouldBlockEnter(event) &&
          !(event.target as HTMLElement).closest("button, textarea, .af-chips")
        ) {
          event.preventDefault();
          void next();
        }
      }}
    >
      <ol className="af-in-step__steps" aria-label="Setup steps">
        {steps.map((item, index) => {
          const stepDone = done || index < step;
          const stepCurrent = !done && index === step;
          const state = stepDone ? "done" : stepCurrent ? "current" : "upcoming";
          const stepLabel = normalizeStepLabel(item.label ?? item.title);
          const inner = (
            <>
              <span className="af-in-step__track" aria-hidden="true">
                <span className="af-in-step__track-fill" />
              </span>
              <span className="af-in-step__step-top">
                <span className="af-in-step__mark" aria-hidden="true">
                  <span className="af-in-step__num">{index + 1}.</span>
                  <svg
                    className="af-in-step__check-svg"
                    viewBox="0 0 14 14"
                    width={12}
                    height={12}
                    fill="none"
                  >
                    <path
                      d="M2.4 7.4L5.6 10.5L11.6 3.8"
                      pathLength={1}
                      stroke="currentColor"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="af-in-step__step-label">{stepLabel}</span>
              </span>
            </>
          );

          return (
            <li
              key={item.id ?? `${index}-${stepLabel}`}
              className="af-in-step__step-item"
              data-state={state}
              aria-current={stepCurrent ? "step" : undefined}
            >
              {stepDone && !done && !submitting ? (
                <button
                  type="button"
                  className="af-in-step__step-btn"
                  aria-label={`Back to step ${index + 1}: ${stepLabel}`}
                  onClick={() => goTo(index)}
                >
                  {inner}
                </button>
              ) : (
                <div className="af-in-step__step-static">{inner}</div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="af-in-step__viewport" style={contentHeight !== undefined ? { height: contentHeight } : undefined}>
        {leaving ? (
          <div
            key={`leave-${leaving.key}`}
            className="af-in-step__content af-in-step__content--leave"
            data-dir={leaving.dir}
            aria-hidden="true"
          >
            {leaving.node}
          </div>
        ) : null}
        <div
          ref={contentRef}
          key={activeKey}
          className="af-in-step__content"
          data-dir={hasMoved ? direction : undefined}
        >
          {activePaneBody}
        </div>
      </div>

      {done ? null : (
        <footer className="af-in-step__foot">
          <span className="af-in-step__back-slot" data-hidden={step === 0 || undefined}>
            <AfButton
              size="sm"
              variant="secondary"
              icon="chevronLeft"
              disabled={step === 0 || submitting}
              tabIndex={step === 0 ? -1 : undefined}
              onClick={back}
            >
              Back
            </AfButton>
          </span>
          <span className="af-in-step__foot-spacer" />
          <span ref={submitWrapRef} className="af-in-step__submit-morph">
            <AfButton
              size="sm"
              variant="primary"
              loading={submitting}
              disabled={submitting}
              onClick={() => void next()}
            >
              {primaryBtnText}
            </AfButton>
          </span>
        </footer>
      )}
    </section>
  );
}
