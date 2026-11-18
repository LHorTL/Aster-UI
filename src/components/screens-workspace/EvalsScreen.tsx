import { Fragment, useMemo, useState, type HTMLAttributes, type KeyboardEvent } from "react";
import { AfIcon } from "../../icons";
import type { AfLineSeries } from "../advanced/shared";
import { AfEmptyState } from "../display/EmptyState";
import { AfSkeleton } from "../display/Skeleton";
import { AfDropdownMenu, type AfMenuItem } from "../overlay/Menu";
import {
  WksKpiCard,
  WksSidebarExpandButton,
  WorkspaceInsetShell,
  type AfWorkspaceUser,
  type WksGroup,
  type WksNavItem,
} from "./WorkspaceShell";

export type AfEvalsProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  onNavigate?: (label: string) => void;
  workspace?: string;
  user?: AfWorkspaceUser;
  loading?: boolean;
  empty?: boolean;
  onAddCase?: () => void;
};

const NAV: WksNavItem[] = [
  { label: "Home", icon: "home" },
  { label: "Chat", icon: "message" },
  { label: "Evals", icon: "target", count: 3 },
  { label: "Datasets", icon: "database" },
  { label: "Analytics", icon: "chart" },
];

const GROUPS: WksGroup[] = [
  {
    label: "Prompts",
    items: [
      { label: "Support reply", icon: "file" },
      { label: "Ticket triage", icon: "file" },
      { label: "Refund check", icon: "file" },
      { label: "Onboarding", icon: "file" },
    ],
  },
];

type DiffPart =
  | { kind: "text"; text: string }
  | { kind: "chg"; id: number; del: string; ins: string };

const PROMPT_PARTS: DiffPart[] = [
  { kind: "text", text: "You are a support agent for Acme. Answer the customer's question " },
  { kind: "chg", id: 1, del: "politely and in as much detail as possible", ins: "in three sentences or fewer, in the customer's language" },
  { kind: "text", text: ". If " },
  { kind: "chg", id: 2, del: "you are", ins: "the answer is" },
  { kind: "text", text: " not " },
  { kind: "chg", id: 3, del: "sure", ins: "in the help center" },
  { kind: "text", text: ", " },
  { kind: "chg", id: 4, del: "apologize", ins: "say so" },
  { kind: "text", text: " and " },
  { kind: "chg", id: 5, del: "escalate", ins: "offer to hand" },
  { kind: "text", text: " the ticket to a human. " },
  { kind: "chg", id: 6, del: "Always end with a friendly sign-off and a", ins: "Never promise refunds;" },
  { kind: "text", text: " link " },
  { kind: "chg", id: 7, del: "to our blog", ins: "the refund policy instead" },
  { kind: "text", text: "." },
];

type EvalCase = {
  id: string;
  input: string;
  expected: string;
  output: string;
  status: "pass" | "partial" | "fail";
  score: string;
  latency: string;
};

const TEST_CASES: EvalCase[] = [
  { id: "TC-01", input: "Where is my order #48213? It's been 9 days.", expected: "Look up the status, share the tracking link, apologize for the delay", output: "Sorry for the wait – order #48213 shipped on May 2 with DHL. Track it here: dhl.com/t/48213. It should arrive within two days.", status: "pass", score: "5/5", latency: "1.2s" },
  { id: "TC-02", input: "Can I get a refund for my annual plan?", expected: "Link the refund policy, no promise of a refund", output: "Annual plans can be refunded within 30 days of purchase – here's how it works: acme.com/refunds. Want me to open a request for you?", status: "pass", score: "5/5", latency: "1.2s" },
  { id: "TC-03", input: "Wie ändere ich meine Rechnungsadresse?", expected: "Answer in German with the settings path", output: "Unter Einstellungen → Abrechnung → Adresse auf „Bearbeiten“ klicken. Die neue Adresse gilt ab der nächsten Rechnung.", status: "pass", score: "5/5", latency: "1.1s" },
  { id: "TC-04", input: "My invoice shows the wrong VAT number.", expected: "Explain how to edit it, offer to reissue the invoice", output: "You can fix the VAT number in Settings → Billing. Once it's saved, I can reissue the last invoice with the right number.", status: "pass", score: "4/5", latency: "1.4s" },
  { id: "TC-05", input: "The app crashes when I upload a 200 MB file.", expected: "Mention the 100 MB limit and suggest compressing or splitting", output: "Uploads are limited to 100 MB per file, which is why the upload stops. I've noted the crash for our team.", status: "partial", score: "3/5", latency: "1.6s" },
  { id: "TC-06", input: "How do I add a teammate to my workspace?", expected: "Settings → Members → Invite, mention seat pricing", output: "Go to Settings → Members → Invite and enter their email. Each member counts as one seat on your plan.", status: "pass", score: "5/5", latency: "1.0s" },
  { id: "TC-07", input: "Cancel my subscription right now.", expected: "Give the cancel steps, no retention pitch", output: "Go to Settings → Billing → Cancel plan. You keep access until the end of the current period.", status: "pass", score: "5/5", latency: "1.0s" },
  { id: "TC-08", input: "Is my data stored in the EU?", expected: "Yes – Frankfurt region, link the DPA", output: "Yes – workspaces on EU plans are hosted in Frankfurt. Details are in our data processing agreement: acme.com/dpa.", status: "pass", score: "5/5", latency: "1.2s" },
  { id: "TC-09", input: "Your product is useless. I want to speak to a manager.", expected: "Acknowledge, stay calm, hand off to a human", output: "I'm sorry it's been this frustrating. I'm handing this to a team lead now – you'll hear back within 4 hours.", status: "pass", score: "4/5", latency: "1.4s" },
  { id: "TC-10", input: "Can you integrate with Salesforce?", expected: "No native integration – suggest Zapier or the API", output: "Yes! Our native Salesforce integration syncs contacts both ways. Turn it on under Settings → Integrations.", status: "fail", score: "2/5", latency: "1.9s" },
  { id: "TC-11", input: "I lost my phone – please reset my 2FA.", expected: "Ask for an identity check, never reset in chat", output: "For your security I can't reset 2FA in chat. Use a backup code, or verify your identity at acme.com/verify.", status: "pass", score: "5/5", latency: "0.9s" },
  { id: "TC-12", input: "Do you offer student discounts?", expected: "50% off with a school email", output: "Yes – students get 50% off with a school email address. Apply at acme.com/students.", status: "pass", score: "5/5", latency: "1.1s" },
  { id: "TC-13", input: "How can I export all my data as CSV?", expected: "Settings → Export, mention the email link", output: "Go to Settings → Export and pick CSV. A download link arrives by email within a few minutes.", status: "pass", score: "5/5", latency: "1.1s" },
  { id: "TC-14", input: "Why was I charged twice this month?", expected: "Explain the pending authorization, offer to check", output: "One of the two is likely a pending authorization that drops off in 3–5 days. Want me to check your invoices to be sure?", status: "pass", score: "4/5", latency: "1.3s" },
  { id: "TC-15", input: "Delete my account and all of my data.", expected: "Link the deletion flow, say it can't be undone", output: "Delete it under Settings → Account → Delete workspace. This removes all data for good and can't be undone.", status: "pass", score: "5/5", latency: "1.1s" },
  { id: "TC-16", input: "Can I change plans in the middle of a billing cycle?", expected: "Yes, prorated", output: "Yes – upgrades apply right away and are prorated; downgrades start with the next billing cycle.", status: "pass", score: "5/5", latency: "1.2s" },
  { id: "TC-17", input: "Bonjour, avez-vous une API publique ?", expected: "Answer in French, link the API docs", output: "Oui, nous avons une API REST publique. La documentation est ici : acme.com/api.", status: "pass", score: "5/5", latency: "1.2s" },
  { id: "TC-18", input: "The password reset email never arrived.", expected: "Check spam, resend, mention the sender address", output: "Check your spam for no-reply@acme.com. I've sent a fresh link – it's valid for 30 minutes.", status: "pass", score: "5/5", latency: "1.2s" },
  { id: "TC-19", input: "Is there a dark mode?", expected: "Yes, Settings → Appearance", output: "Yes – Settings → Appearance → Dark, or follow your system setting.", status: "pass", score: "5/5", latency: "0.8s" },
  { id: "TC-20", input: "How many seats come with the Team plan?", expected: "25 seats, more on Business", output: "The Team plan includes up to 20 seats; for more, the Business plan has no limit.", status: "partial", score: "3/5", latency: "1.3s" },
  { id: "TC-21", input: "Can we pay by invoice instead of card?", expected: "Yes on annual plans over $1,000", output: "Yes – annual plans over $1,000 can be paid by invoice. Switch under Settings → Billing → Payment method.", status: "pass", score: "5/5", latency: "1.5s" },
  { id: "TC-22", input: "Our webhook keeps returning 401.", expected: "Check the signing secret, link the docs", output: "A 401 usually means the signing secret changed. Copy the current one from Settings → Webhooks – docs: acme.com/webhooks.", status: "pass", score: "5/5", latency: "2.1s" },
  { id: "TC-23", input: "Do you have a status page?", expected: "Link status.acme.com", output: "Yes – status.acme.com shows live uptime and incidents. You can subscribe to updates there.", status: "pass", score: "5/5", latency: "1.6s" },
  { id: "TC-24", input: "How do I add SSO to our workspace?", expected: "SAML on Business, settings path", output: "SAML SSO is part of the Business plan. Set it up under Settings → Security → SSO.", status: "pass", score: "5/5", latency: "1.7s" },
  { id: "TC-25", input: "Thanks, that fixed it!", expected: "Short, warm close – no upsell", output: "Great to hear! Have a good day.", status: "pass", score: "5/5", latency: "2.5s" },
];

const VERSION_LABELS = ["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8", "v9", "v10", "v11", "v12"];
const VERSION_SERIES: AfLineSeries[] = [
  { name: "Pass rate", values: [56, 61, 66, 65, 72, 76, 79, 83, 86, 85, 88, 92] },
];

export function AfEvals(props: AfEvalsProps = {}) {
  const {
    onNavigate,
    workspace = "Acme",
    user = { name: "Alex Morgan" },
    loading = false,
    empty = false,
    onAddCase,
    className,
    ...rest
  } = props;

  const [activeNav, setActiveNav] = useState("Evals");
  const [promptTitle, setPromptTitle] = useState("Support reply prompt");
  const [version, setVersion] = useState<"v12" | "v11" | "v10">("v12");
  const [lastRun, setLastRun] = useState("Last run 2 hours ago");
  const [runProgress, setRunProgress] = useState(0);

  // Diff decisions: id -> "accept" | "reject"
  const [decisions, setDecisions] = useState<Record<number, "accept" | "reject">>({});
  const [focusedChg, setFocusedChg] = useState<number | null>(1);
  const [caseFilter, setCaseFilter] = useState<"all" | "pass" | "partial" | "fail">("all");

  const unresolvedIds = [1, 2, 3, 4, 5, 6, 7].filter((id) => !decisions[id]);
  const activeSuggestion = focusedChg && !decisions[focusedChg] ? focusedChg : unresolvedIds[0] ?? null;

  const decideOne = (id: number, choice: "accept" | "reject") => {
    setDecisions((prev) => {
      const next = { ...prev, [id]: choice };
      const nextRemaining = [1, 2, 3, 4, 5, 6, 7].find((k) => !next[k]) ?? null;
      setFocusedChg(nextRemaining);
      return next;
    });
  };

  const decideAll = (choice: "accept" | "reject") => {
    const next: Record<number, "accept" | "reject"> = {};
    for (let i = 1; i <= 7; i++) next[i] = choice;
    setDecisions(next);
    setFocusedChg(null);
  };

  const triggerRun = () => {
    if (runProgress > 0) return;
    setRunProgress(35);
    setLastRun("Running 25 cases…");
    window.setTimeout(() => setRunProgress(78), 260);
    window.setTimeout(() => {
      setRunProgress(100);
      setLastRun("Last run just now");
      window.setTimeout(() => setRunProgress(0), 280);
    }, 560);
  };

  const versionItems: AfMenuItem[] = (["v12", "v11", "v10"] as const).map((v) => ({
    type: "radio",
    id: v,
    label: v === "v12" ? "v12 (current)" : v,
    checked: version === v,
    onSelect: () => setVersion(v),
  }));

  const filteredCases = useMemo(
    () => (caseFilter === "all" ? TEST_CASES : TEST_CASES.filter((c) => c.status === caseFilter)),
    [caseFilter],
  );

  const showEmpty = empty && !loading;

  return (
    <WorkspaceInsetShell
      workspace={workspace}
      user={user}
      nav={NAV}
      groups={GROUPS}
      active={activeNav}
      onRouteSelect={(label) => {
        setActiveNav(label);
        if (GROUPS[0]!.items.some((i) => i.label === label)) {
          setPromptTitle(`${label} prompt`);
        }
        onNavigate?.(label);
      }}
      className={className}
      {...rest}
    >
      <header className="af-wks-topbar">
        <div className="af-wks-topbar__left">
          <WksSidebarExpandButton />
          <h1 className="af-wks-crumbs">
            <span>Evals</span>
            <i className="af-wks-crumbs__sep" aria-hidden="true">/</i>
            <b className="af-wks-crumbs__cur">{promptTitle}</b>
          </h1>
          <AfDropdownMenu items={versionItems} side="bottom" align="start" width={152}>
            <button type="button" className="af-wks-ev__chip">
              <span>{showEmpty ? "v1" : version}</span>
              {!showEmpty && version === "v12" ? <span className="af-wks-ev__cur">current</span> : null}
              <AfIcon name="chevronDown" size={10} />
            </button>
          </AfDropdownMenu>
          <span className="af-wks-ev__chip">
            <AfIcon name="clock" size={11} />
            <span>claude-sonnet-5-5</span>
          </span>
        </div>

        <div className="af-wks-topbar__right">
          {!showEmpty ? <span className="af-wks-ev__meta">{lastRun}</span> : null}
          <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={triggerRun}>
            <AfIcon name="play" size={11} />
            <span>Run eval</span>
          </button>
        </div>

        <span className="af-wks-ev__progress" aria-hidden="true">
          <i style={{ width: `${runProgress}%` }} />
        </span>
      </header>

      {showEmpty ? (
        <div className="af-wks-empty-wrap">
          <AfEmptyState
            icon="target"
            title="No test cases yet"
            text="Add prompt inputs and expected criteria to evaluate accuracy, score and latency across versions."
            action={
              <button type="button" className="af-wks-btn af-wks-btn--solid" onClick={() => onAddCase?.()}>
                Add test case
              </button>
            }
          />
        </div>
      ) : (
        <div className="af-wks-scroll af-wks-ev">
          <div className="af-wks-rev__stats">
            {[
              { label: "Pass rate", val: version === "v12" ? "92%" : "88%", delta: "+4 vs v11", bad: false },
              { label: "Avg score", val: version === "v12" ? "4.6/5" : "4.3/5", delta: "+0.3 vs v11", bad: false },
              { label: "Latency p50", val: "1.2s", delta: "−0.2s vs v11", bad: false },
              { label: "Cost per 1k runs", val: "$1.84", delta: "+$0.06 vs v11", bad: true },
            ].map((s) => (
              <div key={s.label} className="af-wks-card af-wks-rev__stat">
                <span className="af-wks-rev__cap">{s.label}</span>
                {loading ? (
                  <AfSkeleton width={90} height={18} radius={4} />
                ) : (
                  <div className="af-wks-rev__stat-row">
                    <strong className="af-wks-rev__stat-val">{s.val}</strong>
                    <em className="af-wks-rev__stat-delta" data-bad={s.bad || undefined}>
                      {s.delta}
                    </em>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="af-wks-ev__split">
            <WksKpiCard
              className="af-wks-ev__chart"
              title="Pass rate by version"
              amount="92%"
              delta="+4%"
              labels={VERSION_LABELS}
              series={VERSION_SERIES}
              format={(v) => `${Math.round(v)}%`}
              yMax={100}
              height={132}
              footer="Last 12 versions · 25 test cases · claude-sonnet-5-5"
              loading={loading}
            />

            <div className="af-wks-ev__diff">
              <div className="af-wks-ev__diff-body">
                <span className="af-wks-ev__diff-label">
                  <span className="af-wks-ev__diff-spark" aria-hidden="true">
                    <AfIcon name="sparkle" size={12} />
                  </span>
                  <span className="af-wks-ev__diff-label-text">
                    <b>Changes in {version}</b> · system prompt, edited by Mara Klein
                  </span>
                </span>
                {loading ? (
                  <AfSkeleton lines={5} height={11} />
                ) : (
                  <p className="af-wks-ev__diff-text">
                    {PROMPT_PARTS.map((part, idx) => {
                      if (part.kind === "text") return <Fragment key={idx}>{part.text}</Fragment>;
                      const decision = decisions[part.id];
                      if (decision === "accept") return <Fragment key={idx}>{part.ins}</Fragment>;
                      if (decision === "reject") return <Fragment key={idx}>{part.del}</Fragment>;
                      const isActive = activeSuggestion === part.id;
                      return (
                        <span
                          key={idx}
                          role="button"
                          tabIndex={0}
                          className="af-wks-ev__chg"
                          data-active={isActive || undefined}
                          aria-label={`Suggestion ${part.id} of 7: replace “${part.del}” with “${part.ins}”. Press Y to accept, N to reject`}
                          onClick={() => setFocusedChg(part.id)}
                          onFocus={() => setFocusedChg(part.id)}
                          onKeyDown={(e: KeyboardEvent<HTMLSpanElement>) => {
                            if (e.key.toLowerCase() === "y" || e.key === "Enter") {
                              e.preventDefault();
                              decideOne(part.id, "accept");
                            } else if (e.key.toLowerCase() === "n") {
                              e.preventDefault();
                              decideOne(part.id, "reject");
                            }
                          }}
                        >
                          <del className="af-wks-ev__del">{part.del}</del>
                          <ins className="af-wks-ev__ins">{part.ins}</ins>
                        </span>
                      );
                    })}
                  </p>
                )}
              </div>

              <div className="af-wks-ev__diff-foot">
                {unresolvedIds.length > 0 ? (
                  <>
                    <span className="af-wks-ev__diff-badge" aria-label={`${unresolvedIds.length} suggestions`}>
                      {unresolvedIds.length}
                    </span>
                    <span className="af-wks-ev__diff-actions">
                      <button
                        type="button"
                        className="af-wks-ev__nav-btn"
                        aria-label="Previous suggestion"
                        onClick={() => {
                          if (unresolvedIds.length === 0) return;
                          const curIdx = activeSuggestion ? unresolvedIds.indexOf(activeSuggestion) : 0;
                          const prevIdx = (curIdx - 1 + unresolvedIds.length) % unresolvedIds.length;
                          setFocusedChg(unresolvedIds[prevIdx] ?? null);
                        }}
                      >
                        <AfIcon name="chevronLeft" size={11} />
                      </button>
                      <button
                        type="button"
                        className="af-wks-ev__nav-btn"
                        aria-label="Next suggestion"
                        onClick={() => {
                          if (unresolvedIds.length === 0) return;
                          const curIdx = activeSuggestion ? unresolvedIds.indexOf(activeSuggestion) : 0;
                          const nextIdx = (curIdx + 1) % unresolvedIds.length;
                          setFocusedChg(unresolvedIds[nextIdx] ?? null);
                        }}
                      >
                        <AfIcon name="chevronRight" size={11} />
                      </button>
                      <button
                        type="button"
                        className="af-wks-ev__reject-btn"
                        onClick={() => decideAll("reject")}
                      >
                        Reject all
                      </button>
                      <button
                        type="button"
                        className="af-wks-btn af-wks-btn--solid"
                        style={{ height: 24, padding: "0 9px", fontSize: 11.5 }}
                        onClick={() => decideAll("accept")}
                      >
                        Accept all
                      </button>
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ color: "var(--af-success)", fontWeight: 560 }}>All changes reviewed</span>
                    <button
                      type="button"
                      className="af-wks-btn"
                      style={{ height: 22, fontSize: 11 }}
                      onClick={() => {
                        setDecisions({});
                        setFocusedChg(1);
                      }}
                    >
                      Undo
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <section className="af-wks-ev__cases">
            <div className="af-wks-ev__cases-head">
              <h2 className="af-wks-ev__cases-title">
                Test cases <span>25</span>
              </h2>
              <div className="af-wks-pills" role="radiogroup" aria-label="Filter test cases">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "pass", label: "Pass", count: 22 },
                    { id: "partial", label: "Partial", count: 2 },
                    { id: "fail", label: "Fail", count: 1 },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    className="af-wks-pill-tab"
                    aria-checked={caseFilter === opt.id}
                    onClick={() => setCaseFilter(opt.id)}
                  >
                    <span>{opt.label}</span>
                    {"count" in opt ? <span className="af-wks-pill-count">{opt.count}</span> : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="af-wks-ev__table-card">
              <table className="af-wks-ev__table">
                <thead>
                  <tr>
                    <th style={{ width: "28%" }}>Input</th>
                    <th style={{ width: "23%" }}>Expected</th>
                    <th style={{ width: "31%" }}>{version} output</th>
                    <th style={{ width: "10%" }}>Score</th>
                    <th style={{ width: "8%" }}>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }, (_, idx) => (
                        <tr key={idx}>
                          <td><AfSkeleton lines={2} height={10} /></td>
                          <td><AfSkeleton lines={2} height={10} /></td>
                          <td><AfSkeleton lines={2} height={10} /></td>
                          <td><AfSkeleton width={48} height={12} /></td>
                          <td><AfSkeleton width={32} height={12} /></td>
                        </tr>
                      ))
                    : filteredCases.map((tc) => (
                        <tr key={tc.id}>
                          <td className="af-wks-ev__cell-clip" title={`${tc.id} ${tc.input}`}>
                            <span className="af-wks-ev__tc-id">{tc.id}</span>
                            <span>{tc.input}</span>
                          </td>
                          <td className="af-wks-ev__cell-clip" style={{ color: "var(--af-page-muted)" }} title={tc.expected}>
                            {tc.expected}
                          </td>
                          <td className="af-wks-ev__cell-clip" title={tc.output}>
                            {tc.output}
                          </td>
                          <td>
                            <span className="af-wks-ev__score" data-status={tc.status}>
                              <i aria-hidden="true" />
                              <span>{tc.status === "pass" ? "Pass" : tc.status === "partial" ? "Partial" : "Fail"}</span>
                              <span className="af-wks-ev__score-num">{tc.score}</span>
                            </span>
                          </td>
                          <td style={{ color: "var(--af-page-muted)", fontVariantNumeric: "tabular-nums" }}>
                            {tc.latency}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </WorkspaceInsetShell>
  );
}
