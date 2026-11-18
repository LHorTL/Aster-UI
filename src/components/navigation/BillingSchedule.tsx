import { useEffect, useMemo, useRef, useState } from "react";
import { TODAY } from "../../model";
import { AfIcon } from "../../icons";
import { AfInput, AfSelect } from "../../ui";
import { cn, installAfListHover, useIsomorphicLayoutEffect } from "../../primitives";
import {
  type AfBillingScheduleProps,
  BILLING_CATALOG,
  BILLING_REPEATS,
  type BillingCatalogItem,
  type BillingRow,
  INITIAL_BILLING_ROWS,
  StagePopover,
  billingMoney,
  formatBillingDate,
  fromIsoDate,
  toIsoDate,
} from "../_shared/inputs";
import { AfDatePicker } from "./DatePicker";

function formatPriceDisplay(raw: string): string {
  const num = Number.parseFloat(raw.replace(/,/g, ""));
  if (!Number.isFinite(num)) return raw;
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Billing Schedule builder: editable phase name, start date & duration (with live computed end date),
 * inline product rows with cycle & advance/arrears toggles, smooth row height transitions, and live summary.
 */
export function AfBillingSchedule({
  title = "Create a billing schedule",
  phase,
  defaultPhaseName = "Build-out phase",
  defaultStart,
  defaultStartDate = "2026-01-01",
  defaultMilestone = "milestone",
  currency = "$",
  seatPrice,
  catalog = BILLING_CATALOG,
  defaultLines,
  defaultRows,
  onRowsChange,
  onChange,
  className,
}: AfBillingScheduleProps = {}) {
  const initialLines = useMemo<BillingRow[]>(() => {
    if (defaultLines) return defaultLines;
    if (defaultRows) return defaultRows;
    if (seatPrice !== undefined) {
      return [
        {
          id: "b-seat",
          name: "Team seats",
          description: `Per active member · ${currency}${seatPrice}/mo`,
          repeat: "monthly",
          price: String(seatPrice),
          timing: "advance",
        },
        ...INITIAL_BILLING_ROWS,
      ];
    }
    return INITIAL_BILLING_ROWS;
  }, []);

  const [phaseName, setPhaseName] = useState(phase ?? defaultPhaseName);
  const [startDate, setStartDate] = useState(defaultStart ?? defaultStartDate);
  const [milestone, setMilestone] = useState(defaultMilestone);
  const [rows, setRows] = useState<BillingRow[]>(initialLines);
  const [discount, setDiscount] = useState(false);
  const [minimum, setMinimum] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [focusedPriceId, setFocusedPriceId] = useState<string | null>(null);
  const [rowsHeight, setRowsHeight] = useState<number | undefined>(undefined);
  const [interacted, setInteracted] = useState(false);

  const addRef = useRef<HTMLButtonElement>(null);
  const rowsInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => installAfListHover(), []);

  useIsomorphicLayoutEffect(() => {
    const inner = rowsInnerRef.current;
    if (!inner) return;
    const sync = () => setRowsHeight(inner.offsetHeight);
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [rows.length]);

  const isMilestone = milestone === "milestone";
  const monthCount = isMilestone ? 1 : Number(milestone) || 1;
  const parsedStart = fromIsoDate(startDate);
  const computedEndDate = useMemo(
    () => new Date(parsedStart.getFullYear(), parsedStart.getMonth() + monthCount, parsedStart.getDate()),
    [parsedStart, monthCount],
  );

  const totals = useMemo(() => {
    let firstInvoice = 0;
    let phaseTotal = 0;
    for (const row of rows) {
      const price = Number.parseFloat(row.price.replace(/,/g, "")) || 0;
      const repeat = BILLING_REPEATS.find((item) => item.value === row.repeat);
      const cycles = repeat && repeat.months > 0 ? Math.max(1, Math.ceil(monthCount / repeat.months)) : 1;
      firstInvoice += price;
      phaseTotal += price * cycles;
    }
    if (discount) {
      firstInvoice *= 0.9;
      phaseTotal *= 0.9;
    }
    if (minimum) phaseTotal = Math.max(phaseTotal, 500);
    return { firstInvoice, phaseTotal };
  }, [rows, monthCount, discount, minimum]);

  useEffect(() => {
    onChange?.({
      phaseName,
      startDate,
      months: monthCount,
      rows,
      discount,
      minimum,
      firstInvoice: totals.firstInvoice,
      phaseTotal: totals.phaseTotal,
    });
  }, [phaseName, startDate, monthCount, rows, discount, minimum, totals.firstInvoice, totals.phaseTotal]);

  const commitRows = (updater: (current: BillingRow[]) => BillingRow[]) => {
    setInteracted(true);
    setRows((current) => {
      const next = updater(current);
      onRowsChange?.(next);
      return next;
    });
  };

  const updateRow = (id: string, patch: Partial<BillingRow>) =>
    commitRows((value) => value.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const removeRow = (id: string) => commitRows((value) => value.filter((row) => row.id !== id));

  const addProduct = (item: BillingCatalogItem) => {
    const id = `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    commitRows((value) => [
      ...value,
      {
        id,
        name: item.name,
        description: item.description,
        repeat: item.repeat,
        price: String(item.price),
        timing: "advance",
      },
    ]);
    setCatalogOpen(false);
  };

  return (
    <section className={cn("af-in-billing", className)} data-interacted={interacted || undefined}>
      <header className="af-in-billing__head">
        <h3 className="af-in-billing__heading">{title}</h3>
        <div className="af-in-billing__subtitle">
          <AfInput
            variant="borderless"
            size="sm"
            className="af-in-billing__phase-field"
            value={phaseName}
            placeholder="Phase name"
            onChange={(event) => setPhaseName(event.target.value)}
            aria-label="Phase name"
          />
          <span className="af-in-billing__dot" aria-hidden>
            ·
          </span>
          <span key={`${startDate}:${milestone}`} className="af-in-billing__dates">
            <span>{formatBillingDate(parsedStart)}</span>
            <svg className="af-in-billing__arrow-svg" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14m0 0-5-5m5 5-5 5" />
            </svg>
            <span>{isMilestone ? "Milestone" : formatBillingDate(computedEndDate)}</span>
          </span>
        </div>
      </header>

      <div className="af-in-billing__fields">
        <div className="af-in-billing__field">
          <span className="af-in-billing__label">Start date</span>
          <AfDatePicker
            value={parsedStart}
            onChange={(date) => {
              setInteracted(true);
              setStartDate(date ? toIsoDate(date) : "");
            }}
            formatDisplay={formatBillingDate}
            label="Start date"
            placeholder="Select start date"
            today={TODAY}
            className="af-in-billing__datepicker"
          />
        </div>
        <label className="af-in-billing__field">
          <span className="af-in-billing__label">Duration</span>
          <AfSelect
            label="Duration"
            value={milestone}
            onChange={(next) => {
              setInteracted(true);
              setMilestone(next);
            }}
            size="md"
            options={[
              { value: "milestone", label: "Milestone" },
              { value: "3", label: "3 months" },
              { value: "6", label: "6 months" },
              { value: "12", label: "12 months" },
              { value: "24", label: "24 months" },
            ]}
          />
        </label>
      </div>

      <div className="af-in-billing__table" role="table" aria-label="Billing lines">
        <div className="af-in-billing__thead" role="row">
          <span role="columnheader">Name</span>
          <span role="columnheader">Repeats</span>
          <span role="columnheader">Price</span>
        </div>
        <div
          className="af-in-billing__rows-shell"
          style={rowsHeight !== undefined ? { height: rowsHeight } : undefined}
        >
          <div ref={rowsInnerRef} className="af-in-billing__rows-inner">
            {rows.map((row) => {
              const repeat = BILLING_REPEATS.find((item) => item.value === row.repeat) ?? BILLING_REPEATS[0];
              const displayPrice = focusedPriceId === row.id ? row.price : formatPriceDisplay(row.price);
              return (
                <div key={row.id} className="af-in-billing__row" role="row">
                  <div className="af-in-billing__cell af-in-billing__cell-name" role="cell">
                    <AfInput
                      variant="borderless"
                      size="sm"
                      className="af-in-billing__name-field"
                      value={row.name}
                      onChange={(event) => updateRow(row.id, { name: event.target.value })}
                      aria-label={`${row.name} product name`}
                    />
                    {row.description ? <span className="af-in-billing__desc">{row.description}</span> : null}
                  </div>
                  <div className="af-in-billing__cell af-in-billing__cell-repeat" role="cell">
                    <button
                      type="button"
                      className="af-in-billing__repeat-btn"
                      aria-label={`${row.name} repeats: ${repeat.label}`}
                      onClick={() =>
                        updateRow(row.id, {
                          repeat:
                            BILLING_REPEATS[
                              (BILLING_REPEATS.findIndex((item) => item.value === row.repeat) + 1) %
                                BILLING_REPEATS.length
                            ].value,
                        })
                      }
                    >
                      <svg className="af-in-billing__svg" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M17 3.5 19.5 6 17 8.5M19.5 6H9a5 5 0 0 0-5 5M7 20.5 4.5 18 7 15.5M4.5 18H15a5 5 0 0 0 5-5" />
                      </svg>
                      <span key={repeat.value} className="af-in-filter__roll">
                        {repeat.label}
                      </span>
                      <svg className="af-in-billing__chev" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m7 10 5 5 5-5" />
                      </svg>
                    </button>
                  </div>
                  <div className="af-in-billing__cell af-in-billing__cell-price" role="cell">
                    <span className="af-in-billing__amount-block">
                      <span className="af-in-billing__price-main">
                        <label className="af-in-billing__price">
                          <span aria-hidden>{currency}</span>
                          <input
                            inputMode="decimal"
                            value={displayPrice}
                            size={Math.max(1, displayPrice.length)}
                            style={{
                              width: `${Math.max(
                                1.4,
                                [...displayPrice].reduce(
                                  (sum, ch) => sum + (ch === "." || ch === "," ? 0.44 : 1.0),
                                  0.12,
                                ),
                              ).toFixed(2)}ch`,
                            }}
                            aria-label={`${row.name} price`}
                            onFocus={() => setFocusedPriceId(row.id)}
                            onBlur={() => setFocusedPriceId((cur) => (cur === row.id ? null : cur))}
                            onChange={(event) =>
                              updateRow(row.id, { price: event.target.value.replace(/[^\d.]/g, "") })
                            }
                          />
                        </label>
                        <span className="af-in-billing__unit">/ {repeat.short}</span>
                        <button
                          type="button"
                          className="af-in-billing__del"
                          aria-label={`Remove ${row.name}`}
                          onClick={() => removeRow(row.id)}
                        >
                          <AfIcon name="x" size={14} />
                        </button>
                      </span>
                      <button
                        type="button"
                        className="af-in-billing__timing"
                        onClick={() =>
                          updateRow(row.id, { timing: row.timing === "advance" ? "arrears" : "advance" })
                        }
                      >
                        <span>{row.timing === "advance" ? "Billed in advance" : "Billed in arrears"}</span>
                        <svg className="af-in-billing__chev" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m7 10 5 5 5-5" />
                        </svg>
                      </button>
                    </span>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 ? (
              <p className="af-in-billing__empty">No items yet — click Add product below to build this phase.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="af-in-billing__actions">
        <button
          ref={addRef}
          type="button"
          className="af-in-billing__btn"
          aria-haspopup="listbox"
          aria-expanded={catalogOpen}
          onClick={() => setCatalogOpen((value) => !value)}
        >
          <svg className="af-in-billing__svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5.5v13M5.5 12h13" />
          </svg>
          Add product
        </button>
        <span className="af-in-billing__actions-spacer" />
        <button
          type="button"
          className="af-in-billing__btn"
          data-active={discount || undefined}
          onClick={() => {
            setInteracted(true);
            setDiscount((value) => !value);
          }}
        >
          <svg className="af-in-billing__svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 15 15 9M9.5 9.5h.01M14.5 14.5h.01M12 3l2.1 1.6 2.6-.2.9 2.5 2.3 1.2-.4 2.6L21 12.6l-1.5 2.1.4 2.6-2.3 1.2-.9 2.5-2.6-.2L12 21.4l-2.1-1.6-2.6.2-.9-2.5L4.1 16.3l.4-2.6L3 12l1.5-2.1-.4-2.6 2.3-1.2.9-2.5 2.6.2Z" />
          </svg>
          Add discount
        </button>
        <button
          type="button"
          className="af-in-billing__btn"
          data-active={minimum || undefined}
          onClick={() => {
            setInteracted(true);
            setMinimum((value) => !value);
          }}
        >
          <svg className="af-in-billing__svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 19.5h14M7 15.5h10M9 11.5h6M10 7.5h4M12 4v1" />
          </svg>
          Add minimum
        </button>
      </div>

      <footer className="af-in-billing__summary" aria-live="polite">
        <span className="af-in-billing__sum">
          <em>First invoice</em>
          <strong key={totals.firstInvoice} className="af-in-billing__sum-num">
            {billingMoney(totals.firstInvoice, currency)}
          </strong>
        </span>
        <span className="af-in-billing__sum">
          <em>
            Phase total
            {discount ? <i className="af-in-billing__badge">-10%</i> : null}
            {minimum ? <i className="af-in-billing__badge">Min applied</i> : null}
          </em>
          <strong key={totals.phaseTotal} className="af-in-billing__sum-num">
            {billingMoney(totals.phaseTotal, currency)}
          </strong>
        </span>
      </footer>

      <StagePopover
        open={catalogOpen}
        anchorRef={addRef}
        onClose={() => setCatalogOpen(false)}
        className="af-in-billing__catalog"
      >
        <div className="af-in-billing__catalog-head">Products</div>
        {catalog.map((item) => (
          <button key={item.name} type="button" className="af-in-billing__catalog-item" onClick={() => addProduct(item)}>
            <span className="af-in-billing__catalog-main">
              <span className="af-in-billing__catalog-name">{item.name}</span>
              <span className="af-in-billing__catalog-desc">{item.description}</span>
            </span>
            <span className="af-in-billing__catalog-price">
              {billingMoney(item.price, currency)}
              <em>/ {BILLING_REPEATS.find((repeat) => repeat.value === item.repeat)?.short ?? item.repeat}</em>
            </span>
          </button>
        ))}
      </StagePopover>
    </section>
  );
}
