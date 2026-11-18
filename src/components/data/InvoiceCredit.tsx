import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { cn, useSlidingTabIndicator } from "../../primitives";

export interface InvoiceParty {
  name: string;
  lines: string[];
}

export interface InvoiceLineItem {
  id: string;
  name: string;
  qty: number;
  rate: number;
  /** Tax percentage, e.g. `20` for 20%. */
  tax: number;
  /** Optional section subheader (e.g. `"Usage"`). */
  group?: string;
}

export interface AfInvoiceCreditProps {
  /** Seller party details. */
  seller?: InvoiceParty;
  /** Buyer party details. */
  buyer?: InvoiceParty;
  /** Invoice number (default `"INV-2041"`). */
  invoiceNo?: string;
  /** Credit note number (default `"CN-0117"`). */
  creditNo?: string;
  /** Invoice issue date. */
  invoiceDate?: string;
  /** Payment due date. */
  dueDate?: string;
  /** Billing period string. */
  period?: string;
  /** Line items. */
  lines?: InvoiceLineItem[];
  /** Currency symbol (e.g. `"$"`) or ISO code (e.g. `"USD"`). */
  currency?: string;
  /** Fired when a credit note is issued. */
  onIssue?: (credits: Record<string, number>, totalInclTax: number) => void;
  /** Extra class name. */
  className?: string;
  /** Inline styles. */
  style?: CSSProperties;
}

export type AfInvoiceCreditPatternProps = AfInvoiceCreditProps;

const DEFAULT_SELLER: InvoiceParty = {
  name: "Lumen Labs, Inc.",
  lines: ["48 Harbour Street", "Bristol", "BS1 4RN", "United Kingdom"],
};

const DEFAULT_BUYER: InvoiceParty = {
  name: "Northwind Logistics GmbH",
  lines: ["Speicherstraße 12", "Hamburg", "20457", "Germany"],
};

const DEFAULT_LINES: InvoiceLineItem[] = [
  { id: "growth", name: "Growth plan", qty: 1, rate: 1250, tax: 20 },
  { id: "seats", name: "Extra seats", qty: 12, rate: 40, tax: 20 },
  { id: "api", name: "API calls (per 1k)", qty: 18420, rate: 0.42, tax: 20, group: "Metered usage" },
];

function createCurrencyHelper(currency: string) {
  const trimmed = currency.trim();
  const isIso = /^[A-Z]{3}$/i.test(trimmed);
  const code = isIso ? trimmed.toUpperCase() : trimmed === "$" ? "USD" : trimmed === "£" ? "GBP" : trimmed === "¥" ? "CNY" : "USD";
  if (isIso) {
    try {
      const fmt = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const sample = fmt.formatToParts(0).find((p) => p.type === "currency")?.value ?? code;
      return {
        symbol: sample,
        code,
        format: (v: number) => fmt.format(v),
        plain: (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      };
    } catch {
      // Fallback to symbol mode
    }
  }
  const sym = trimmed || "$";
  return {
    symbol: sym,
    code,
    format: (v: number) => {
      const abs = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return v < 0 ? `-${sym}${abs}` : `${sym}${abs}`;
    },
    plain: (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  };
}

function lineNet(line: InvoiceLineItem): number {
  if (!Number.isFinite(line.rate) || !Number.isFinite(line.qty)) return 0;
  return Math.round(line.qty * line.rate * 100) / 100;
}

/**
 * Invoice & Credit Note (affectUI Pro Block 1:1, pure Flexbox stacked paper sheets):
 * Two physical sheets stack front-to-back with smooth promotion on tab switch,
 * per-line credit selection & clamped net amount editing, and one-click credit note issuance.
 */
export function AfInvoiceCredit({
  seller = DEFAULT_SELLER,
  buyer = DEFAULT_BUYER,
  invoiceNo = "INV-2041",
  creditNo = "CN-0117",
  invoiceDate = "1 Oct 2026",
  dueDate = "31 Oct 2026",
  period = "1 Sep – 30 Sep 2026",
  lines = DEFAULT_LINES,
  currency = "$",
  onIssue,
  className,
  style,
}: AfInvoiceCreditProps = {}) {
  const [view, setView] = useState<"invoice" | "credit">("invoice");
  const [issued, setIssued] = useState(false);
  const [paid, setPaid] = useState(false);
  const [pdfNotice, setPdfNotice] = useState(false);

  const creditEligible = useMemo(
    () => lines.filter((l) => Number.isFinite(l.rate) && lineNet(l) > 0),
    [lines],
  );

  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const l of creditEligible) init[l.id] = true;
    return init;
  });

  const [creditAmounts, setCreditAmounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const l of creditEligible) init[l.id] = lineNet(l);
    return init;
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");

  const segRef = useRef<HTMLDivElement>(null);
  const invTabRef = useRef<HTMLButtonElement>(null);
  const credTabRef = useRef<HTMLButtonElement>(null);
  const issueBtnRef = useRef<HTMLButtonElement>(null);
  const segThumb = useSlidingTabIndicator(segRef, '[aria-selected="true"]', view);

  const uid = useId().replace(/:/g, "");
  const money = useMemo(() => createCurrencyHelper(currency), [currency]);

  const invoiceTotals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const l of lines) {
      const net = lineNet(l);
      subtotal += net;
      tax += net * ((Number.isFinite(l.tax) ? l.tax : 0) / 100);
    }
    subtotal = Math.round(subtotal * 100) / 100;
    tax = Math.round(tax * 100) / 100;
    return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
  }, [lines]);

  const creditTotals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const l of creditEligible) {
      if (!checkedIds[l.id]) continue;
      const maxNet = lineNet(l);
      const amt = Math.max(0, Math.min(maxNet, creditAmounts[l.id] ?? maxNet));
      subtotal += amt;
      tax += amt * ((Number.isFinite(l.tax) ? l.tax : 0) / 100);
    }
    subtotal = Math.round(subtotal * 100) / 100;
    tax = Math.round(tax * 100) / 100;
    return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
  }, [creditEligible, checkedIds, creditAmounts]);

  const groupedRows = useMemo(() => {
    const rows: ({ kind: "group"; title: string } | { kind: "line"; line: InvoiceLineItem; indent: boolean })[] = [];
    let lastGroup: string | undefined;
    for (const l of lines) {
      if (l.group && l.group !== lastGroup) {
        rows.push({ kind: "group", title: l.group });
        lastGroup = l.group;
      }
      rows.push({ kind: "line", line: l, indent: Boolean(l.group) });
    }
    return rows;
  }, [lines]);

  const switchTo = (next: "invoice" | "credit", focusTab = false) => {
    setView(next);
    if (focusTab) {
      requestAnimationFrame(() => {
        (next === "invoice" ? invTabRef.current : credTabRef.current)?.focus();
      });
    }
  };

  const onSegKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "Home") {
      e.preventDefault();
      switchTo("invoice", true);
    } else if (e.key === "ArrowRight" || e.key === "End") {
      e.preventDefault();
      switchTo("credit", true);
    }
  };

  const toggleLine = (line: InvoiceLineItem) => {
    if (issued) return;
    setCheckedIds((prev) => ({ ...prev, [line.id]: !prev[line.id] }));
  };

  const commitDraft = (line: InvoiceLineItem) => {
    const cleaned = Number.parseFloat(draftText.replace(/,/g, ""));
    const maxNet = lineNet(line);
    if (Number.isFinite(cleaned)) {
      const clamped = Math.round(Math.max(0, Math.min(maxNet, cleaned)) * 100) / 100;
      setCreditAmounts((prev) => ({ ...prev, [line.id]: clamped }));
      if (clamped === 0) {
        setCheckedIds((prev) => ({ ...prev, [line.id]: false }));
      } else {
        setCheckedIds((prev) => ({ ...prev, [line.id]: true }));
      }
    }
    setEditingId(null);
  };

  const handleIssueToggle = () => {
    if (!issued) {
      if (creditTotals.total <= 0) return;
      const payload: Record<string, number> = {};
      for (const l of creditEligible) {
        payload[l.id] = checkedIds[l.id] ? Math.min(lineNet(l), creditAmounts[l.id] ?? lineNet(l)) : 0;
      }
      setIssued(true);
      onIssue?.(payload, creditTotals.total);
    } else {
      setIssued(false);
    }
    requestAnimationFrame(() => issueBtnRef.current?.focus());
  };

  const balanceDue = issued ? Math.max(0, Math.round((invoiceTotals.total - creditTotals.total) * 100) / 100) : invoiceTotals.total;

  return (
    <section className={cn("af-dt-ivc", className)} style={style} data-view={view} aria-label="Invoice and credit note">
      <div className="af-dt-ivc__bar">
        <div ref={segRef} className="af-dt-ivc__seg" role="tablist" aria-label="Document view" onKeyDown={onSegKey}>
          {segThumb ? (
            <span
              className="af-dt-ivc__seg-thumb"
              aria-hidden="true"
              data-ready={segThumb.ready || undefined}
              style={{ width: segThumb.width, transform: `translateX(${segThumb.x}px)` }}
            />
          ) : null}
          <button
            ref={invTabRef}
            type="button"
            role="tab"
            id={`${uid}-tab-invoice`}
            aria-selected={view === "invoice"}
            aria-controls={`${uid}-panel-invoice`}
            tabIndex={view === "invoice" ? 0 : -1}
            onClick={() => switchTo("invoice")}
          >
            Invoice
          </button>
          <button
            ref={credTabRef}
            type="button"
            role="tab"
            id={`${uid}-tab-credit`}
            aria-selected={view === "credit"}
            aria-controls={`${uid}-panel-credit`}
            tabIndex={view === "credit" ? 0 : -1}
            onClick={() => switchTo("credit")}
          >
            Credit note
          </button>
        </div>

        <div className="af-dt-ivc__actions">
          <button
            type="button"
            className="af-dt-ivc__btn"
            title="Download PDF"
            onClick={() => {
              setPdfNotice(true);
              window.setTimeout(() => setPdfNotice(false), 1600);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {pdfNotice ? (
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              ) : (
                <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" />
              )}
            </svg>
            {pdfNotice ? "Saved PDF" : "PDF"}
          </button>
          {view === "invoice" ? (
            <button type="button" className="af-dt-ivc__btn" onClick={() => switchTo("credit", true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 14 4.5 9.5 9 5M4.5 9.5h10a5 5 0 0 1 0 10H12" />
              </svg>
              Credit invoice
            </button>
          ) : (
            <button type="button" className="af-dt-ivc__btn" onClick={() => switchTo("invoice", true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7M14 5l5 5M14 5v5h5" />
              </svg>
              View invoice
            </button>
          )}
        </div>
      </div>

      <div className="af-dt-ivc__stack">
        <article
          className="af-dt-ivc__sheet"
          data-doc="invoice"
          data-active={view === "invoice" || undefined}
          id={`${uid}-panel-invoice`}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-invoice`}
          aria-hidden={view !== "invoice"}
          {...(view !== "invoice" ? { inert: "true" as unknown as boolean } : undefined)}
        >
          <header className="af-dt-ivc__head">
            <div>
              <p className="af-dt-ivc__big">{money.format(balanceDue)}</p>
              <p className="af-dt-ivc__due">
                {issued ? (
                  <>
                    <span className="af-dt-ivc__badge">{balanceDue === 0 ? "Credited in full" : "Partially credited"}</span>
                    <span>Credit note {creditNo} applied</span>
                  </>
                ) : (
                  <>
                    {paid ? <span className="af-dt-ivc__badge">Paid</span> : dueDate ? <span>Due {dueDate}</span> : null}
                    <a
                      href="#pay"
                      onClick={(e) => {
                        e.preventDefault();
                        setPaid((v) => !v);
                      }}
                    >
                      {paid ? "Receipt" : "Pay online"}
                    </a>
                  </>
                )}
              </p>
            </div>
            <span className="af-dt-ivc__brand" title={seller.name}>
              <span className="af-dt-ivc__logo" aria-hidden="true" />
              <span className="af-dt-ivc__brand-name">{seller.name}</span>
            </span>
          </header>

          <div className="af-dt-ivc__parties">
            <div className="af-dt-ivc__party">
              <p className="af-dt-ivc__label">From</p>
              <p className="af-dt-ivc__party-name">{seller.name}</p>
              {seller.lines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <div className="af-dt-ivc__party">
              <p className="af-dt-ivc__label">To</p>
              <p className="af-dt-ivc__party-name">{buyer.name}</p>
              {buyer.lines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>

          <div className="af-dt-ivc__terms">
            <p className="af-dt-ivc__label">Terms</p>
            <dl>
              <div>
                <dt>Invoice no</dt>
                <dd>
                  <span className="af-dt-ivc__ref">{invoiceNo}</span>
                </dd>
              </div>
              {invoiceDate ? (
                <div>
                  <dt>Invoice date</dt>
                  <dd>{invoiceDate}</dd>
                </div>
              ) : null}
              {dueDate ? (
                <div>
                  <dt>Due date</dt>
                  <dd>{dueDate}</dd>
                </div>
              ) : null}
              {period ? (
                <div>
                  <dt>Billing period</dt>
                  <dd>{period}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <table className="af-dt-ivc__table" data-wide="">
            <thead>
              <tr>
                <th>Name</th>
                <th>Qty</th>
                <th className="af-dt-ivc__num">Rate</th>
                <th className="af-dt-ivc__num">Tax</th>
                <th className="af-dt-ivc__num">Price</th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.length === 0 ? (
                <tr className="af-dt-ivc__empty">
                  <td colSpan={5}>No line items</td>
                </tr>
              ) : (
                groupedRows.map((row, idx) =>
                  row.kind === "group" ? (
                    <tr key={`g-${idx}`} className="af-dt-ivc__group">
                      <td colSpan={5}>{row.title}</td>
                    </tr>
                  ) : (
                    <tr key={row.line.id} data-indent={row.indent || undefined}>
                      <td className="af-dt-ivc__name">{row.line.name}</td>
                      <td>{row.line.qty.toLocaleString("en-US")}</td>
                      <td className="af-dt-ivc__num">
                        {Number.isFinite(row.line.rate) ? money.format(row.line.rate) : "—"}
                      </td>
                      <td className="af-dt-ivc__num">{Number.isFinite(row.line.tax) ? `${row.line.tax}%` : "0%"}</td>
                      <td className="af-dt-ivc__num">
                        {Number.isFinite(row.line.rate) ? money.format(lineNet(row.line)) : "—"}
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>

          <div className="af-dt-ivc__totals">
            <div>
              <span>Subtotal</span>
              <span>{money.format(invoiceTotals.subtotal)}</span>
            </div>
            <div>
              <span>Tax</span>
              <span>{money.format(invoiceTotals.tax)}</span>
            </div>
            {issued ? (
              <div>
                <span>Credit note ({creditNo})</span>
                <span>-{money.format(creditTotals.total)}</span>
              </div>
            ) : null}
            <div className="af-dt-ivc__total">
              <span>{issued ? "Balance due" : "Total"}</span>
              <b>{money.format(balanceDue)}</b>
            </div>
          </div>
        </article>

        <article
          className="af-dt-ivc__sheet"
          data-doc="credit"
          data-active={view === "credit" || undefined}
          id={`${uid}-panel-credit`}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-credit`}
          aria-hidden={view !== "credit"}
          {...(view !== "credit" ? { inert: "true" as unknown as boolean } : undefined)}
        >
          <header className="af-dt-ivc__head">
            <div>
              <p className="af-dt-ivc__big">Credit note</p>
              <p className="af-dt-ivc__due">
                {issued ? (
                  <>
                    <span className="af-dt-ivc__badge">Issued</span>
                    <span>
                      {money.format(creditTotals.total)} credited{invoiceDate ? ` on ${invoiceDate}` : ""}
                    </span>
                  </>
                ) : (
                  <span>
                    {money.format(creditTotals.total)} credited{invoiceDate ? ` on ${invoiceDate}` : ""}
                  </span>
                )}
              </p>
            </div>
            <span className="af-dt-ivc__brand" title={seller.name}>
              <span className="af-dt-ivc__logo" aria-hidden="true" />
              <span className="af-dt-ivc__brand-name">{seller.name}</span>
            </span>
          </header>

          <div className="af-dt-ivc__terms">
            <p className="af-dt-ivc__label">Terms</p>
            <dl>
              <div>
                <dt>Credit note no</dt>
                <dd>
                  <span className="af-dt-ivc__ref">{creditNo}</span>
                </dd>
              </div>
              <div>
                <dt>Related invoice</dt>
                <dd>
                  <button type="button" className="af-dt-ivc__ref" onClick={() => switchTo("invoice", true)}>
                    {invoiceNo}
                  </button>
                </dd>
              </div>
              {period ? (
                <div>
                  <dt>Billing period</dt>
                  <dd>{period}</dd>
                </div>
              ) : null}
              {invoiceDate ? (
                <div>
                  <dt>Date of issue</dt>
                  <dd>{invoiceDate}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="af-dt-ivc__tray">
            <p className="af-dt-ivc__tray-title">Lines to credit</p>
            <div className="af-dt-ivc__card">
              <div className="af-dt-ivc__crow af-dt-ivc__crow--head">
                <span className="af-dt-ivc__ccol-check" />
                <span className="af-dt-ivc__ccol-name">Name</span>
                <span className="af-dt-ivc__ccol-orig af-dt-ivc__num">Total</span>
                <span className="af-dt-ivc__ccol-amt af-dt-ivc__num">Credit amount</span>
              </div>

              {creditEligible.length === 0 ? (
                <div className="af-dt-ivc__none">No eligible lines to credit</div>
              ) : (
                creditEligible.map((line) => {
                  const isOn = Boolean(checkedIds[line.id]);
                  const maxNet = lineNet(line);
                  const currentAmt = creditAmounts[line.id] ?? maxNet;
                  const displayVal = editingId === line.id ? draftText : money.plain(isOn ? currentAmt : 0);

                  return (
                    <div key={line.id} className="af-dt-ivc__crow" data-off={!isOn || undefined}>
                      <span className="af-dt-ivc__ccol-check">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isOn}
                          aria-label={`Credit ${line.name}`}
                          disabled={issued}
                          className="af-dt-ivc__check"
                          onClick={() => toggleLine(line)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="m6 12.5 4 4 8-9" />
                          </svg>
                        </button>
                      </span>
                      <span className="af-dt-ivc__ccol-name af-dt-ivc__cname" title={line.name}>
                        {line.name}
                      </span>
                      <span className="af-dt-ivc__ccol-orig af-dt-ivc__num">{money.format(maxNet)}</span>
                      <span className="af-dt-ivc__ccol-amt af-dt-ivc__num">
                        <label className="af-dt-ivc__amount" data-disabled={(!isOn || issued) || undefined}>
                          <span>{money.symbol}</span>
                          <input
                            size={8}
                            inputMode="decimal"
                            disabled={!isOn || issued}
                            aria-label={`${line.name} credit amount`}
                            value={displayVal}
                            onFocus={(e) => {
                              setEditingId(line.id);
                              setDraftText((isOn ? currentAmt : 0).toFixed(2));
                              requestAnimationFrame(() => e.target.select());
                            }}
                            onChange={(e) => setDraftText(e.target.value)}
                            onBlur={() => commitDraft(line)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                (e.currentTarget as HTMLInputElement).blur();
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                setEditingId(null);
                                (e.currentTarget as HTMLInputElement).blur();
                              }
                            }}
                          />
                        </label>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="af-dt-ivc__totals">
            <div>
              <span>Subtotal</span>
              <span>{money.format(creditTotals.subtotal)}</span>
            </div>
            <div>
              <span>Tax</span>
              <span>{money.format(creditTotals.tax)}</span>
            </div>
            <div className="af-dt-ivc__total">
              <span>Adjustment total</span>
              <b>-{money.format(creditTotals.total)}</b>
            </div>
            <div className="af-dt-ivc__note">
              <span>Applied to invoice</span>
              <span>
                -{money.format(creditTotals.total)} {money.code}
              </span>
            </div>
          </div>

          <div className="af-dt-ivc__issue">
            <button
              ref={issueBtnRef}
              type="button"
              className="af-dt-ivc__primary"
              disabled={!issued && creditTotals.total <= 0}
              onClick={handleIssueToggle}
            >
              {issued ? "Edit credit note" : "Issue credit note"}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

export const AfInvoiceCreditPattern = AfInvoiceCredit;
