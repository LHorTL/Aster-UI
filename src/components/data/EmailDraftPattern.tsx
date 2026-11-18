import { cn, useIsomorphicLayoutEffect, useSlidingTabIndicator } from "../../primitives";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { AfButton, AfKbd, AfTag } from "../../ui";
import { AfIcon } from "../../icons";
import { DRAFT_CONTACTS, DRAFT_TONE_LABEL, Demo, DraftContact, DraftTone, Note, draftBody } from "../_shared/data";

export type { DraftContact, DraftTone };

export interface AfEmailDraftPatternProps {
  /** 账户/客户标题。 */
  account?: ReactNode;
  /** 单据参考编号。 */
  refCode?: ReactNode;
  /** 状态标签文本。 */
  statusLabel?: ReactNode;
  /** 金额展示文本。 */
  amount?: ReactNode;
  /** 联系人列表。 */
  contacts?: DraftContact[];
  /** 默认语气。 */
  defaultTone?: DraftTone;
  /** 默认附件文件名（设为 `null` 无附件）。 */
  defaultAttachment?: string | null;
  /** 发送确认回调。 */
  onSend?: (payload: { contact: DraftContact; tone: DraftTone; body: string; attachment: string | null }) => void;
  /** 丢弃回调。 */
  onDiscard?: () => void;
  /** 是否显示底部演示说明（默认 false）。 */
  showNote?: boolean;
  /** 附加类名。 */
  className?: string;
  /** 内联样式。 */
  style?: CSSProperties;
}

function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * 邮件草稿：顶部单据头与底栏固定常驻，顶行同列摆放收件人头像下拉与附件胶囊，
 * 正文下方为滑动语气药丸与快捷键提示；点击发送后中间编辑区平滑折叠为单行回执并支持撤销展开。
 */
function EmailDraftDemo({
  account = "Northwind Logistics",
  refCode = "SUB-1182",
  statusLabel = "Renews in 5 days",
  amount = "$8,900",
  contacts = DRAFT_CONTACTS,
  defaultTone = "friendly",
  defaultAttachment = "Renewal-quote.pdf",
  onSend,
  onDiscard,
  showNote = false,
  className,
  style,
}: AfEmailDraftPatternProps = {}) {
  const [contact, setContact] = useState(contacts[0]);
  const [tone, setTone] = useState<DraftTone>(defaultTone);
  const [body, setBody] = useState(() => draftBody(defaultTone, contacts[0]));
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(defaultAttachment);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"sent" | "discarded" | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const tonesRef = useRef<HTMLDivElement>(null);
  const stageInnerRef = useRef<HTMLDivElement>(null);
  const [stageHeight, setStageHeight] = useState<number | null>(null);

  const tonePill = useSlidingTabIndicator(tonesRef, "[data-on]", `${tone}-${result ?? "compose"}`);

  useEffect(() => {
    if (!menuOpen) return;
    const away = (event: PointerEvent) => !toRef.current?.contains(event.target as Node) && setMenuOpen(false);
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  /** 就地编辑时让 textarea 高度贴合正文。 */
  useIsomorphicLayoutEffect(() => {
    const field = bodyRef.current;
    if (!editing || !field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [editing, body]);

  /** 监听中间内容区高度，发送后平滑收拢成单行回执，头尾保持不动。 */
  useIsomorphicLayoutEffect(() => {
    const el = stageInnerRef.current;
    if (!el) return;
    const sync = () => setStageHeight(el.offsetHeight);
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [result, editing, body, tone, contact.id, attachment]);

  const switchDraft = (nextTone: DraftTone, nextContact: DraftContact) => {
    setTone(nextTone);
    setContact(nextContact);
    setBody(draftBody(nextTone, nextContact));
  };

  const send = () => {
    if (sending || result) return;
    setSending(true);
    setEditing(false);
    setMenuOpen(false);
    window.setTimeout(() => {
      setSending(false);
      setResult("sent");
      onSend?.({ contact, tone, body, attachment });
    }, 680);
  };

  const undoReceipt = () => {
    setResult(null);
  };

  const onKey = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      setEditing(false);
      setMenuOpen(false);
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      send();
    }
  };

  return (
    <Demo>
      <section className={cn("af-dt-mail", className)} style={style} data-result={result ?? undefined} aria-label="Email draft" onKeyDown={onKey}>
        <header className="af-dt-mail__head">
          <div className="af-dt-mail__ref">
            <strong className="af-dt-mail__code">{refCode}</strong>
            <AfTag tone={result === "sent" ? "success" : "warning"}>{result === "sent" ? "Sent" : statusLabel}</AfTag>
          </div>
          <strong className="af-dt-mail__amount">{amount}</strong>
        </header>
        <div className="af-dt-mail__account">{account}</div>

        <div className="af-dt-mail__stage" style={{ height: stageHeight ?? undefined }}>
          <div ref={stageInnerRef} className="af-dt-mail__stage-inner">
            {result ? (
              <div className="af-dt-mail__receipt" role="status">
                <span className="af-dt-mail__receipticon" data-discard={result === "discarded" || undefined} aria-hidden>
                  <AfIcon name={result === "sent" ? "check" : "x"} size={14} />
                </span>
                <div className="af-dt-mail__receipttext">
                  <strong>{result === "sent" ? `Sent to ${contact.name}` : "Draft discarded"}</strong>
                  <small>{result === "sent" ? `${contact.email} · Just now${attachment ? ` · ${attachment}` : ""}` : "Click undo to restore your draft"}</small>
                </div>
                <button type="button" className="af-dt-mail__receiptundo" onClick={undoReceipt}>
                  Undo
                </button>
              </div>
            ) : (
              <>
                <div className="af-dt-mail__row">
                  <span className="af-dt-mail__label">To</span>
                  <div className="af-dt-mail__to" ref={toRef}>
                    <button
                      type="button"
                      className="af-dt-mail__tobtn"
                      aria-haspopup="listbox"
                      aria-expanded={menuOpen}
                      onClick={() => setMenuOpen((value) => !value)}
                    >
                      <span className="af-dt-mail__toname">{contact.name}</span>
                      <span className="af-dt-mail__toemail">{contact.email}</span>
                      <AfIcon name="chevronDown" size={12} />
                    </button>
                    {menuOpen ? (
                      <div className="af-dt-mail__menu" role="listbox" aria-label="Select recipient">
                        {contacts.map((item, idx) => (
                          <button
                            key={item.id}
                            type="button"
                            role="option"
                            aria-selected={item.id === contact.id}
                            data-on={item.id === contact.id || undefined}
                            onClick={() => {
                              switchDraft(tone, item);
                              setMenuOpen(false);
                            }}
                          >
                            <span className="af-dt-mail__avatar" data-hue={(idx % 3) + 1} aria-hidden>{contactInitials(item.name)}</span>
                            <span className="af-dt-mail__menuitem-text">
                              <b>{item.name}</b>
                              <small>{item.email}</small>
                            </span>
                            {item.id === contact.id ? <AfIcon name="check" size={14} /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <span className="af-dt-grow" />
                  {attachment ? (
                    <span className="af-dt-mail__attach">
                      <AfIcon name="paperclip" size={12} />
                      <span>{attachment}</span>
                      <button type="button" onClick={() => setAttachment(null)} aria-label="Remove attachment">
                        <AfIcon name="x" size={10} />
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="af-dt-mail__addattach" onClick={() => setAttachment(defaultAttachment ?? "Renewal quote.pdf")}>
                      <AfIcon name="paperclip" size={12} />
                      Attach file
                    </button>
                  )}
                </div>

                <div className="af-dt-mail__bodywrap">
                  {editing ? (
                    <textarea
                      ref={bodyRef}
                      className="af-dt-mail__textarea"
                      value={body}
                      rows={1}
                      aria-label="Email body"
                      autoFocus
                      onBlur={() => setEditing(false)}
                      onChange={(event) => setBody(event.target.value)}
                    />
                  ) : (
                    <p className="af-dt-mail__body" key={`${tone}-${contact.id}`} onClick={() => setEditing(true)}>
                      {body.endsWith(": Review quote") ? (
                        <>
                          {body.slice(0, -12)}
                          <strong className="af-dt-mail__reviewlink">Review quote</strong>
                        </>
                      ) : (
                        body
                      )}
                    </p>
                  )}
                  <div className="af-dt-mail__tools">
                    <div ref={tonesRef} className="af-dt-mail__tones" role="group" aria-label="Draft tone">
                      {tonePill ? (
                        <span
                          className="af-dt-mail__tonepill"
                          aria-hidden
                          data-ready={tonePill.ready || undefined}
                          style={{ width: tonePill.width, transform: `translateX(${tonePill.x}px)` }}
                        />
                      ) : null}
                      {(["friendly", "short", "formal"] as DraftTone[]).map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="af-dt-mail__tone"
                          data-on={tone === item || undefined}
                          aria-pressed={tone === item}
                          onClick={() => switchDraft(item, contact)}
                        >
                          {DRAFT_TONE_LABEL[item]}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="af-dt-mail__editbtn"
                      aria-label="Edit draft"
                      aria-pressed={editing}
                      onClick={() => setEditing((v) => !v)}
                    >
                      <AfIcon name="edit" size={13} />
                    </button>
                    <span className="af-dt-grow" />
                    <span className="af-dt-mail__kbdhint">
                      {editing ? <><AfKbd>Esc</AfKbd> done · </> : null}
                      ⌘ Enter to send
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="af-dt-mail__foot">
          <span className="af-dt-mail__agent">
            <span>Renewal agent</span>
            {result === "sent" ? (
              <AfTag tone="success">Delivery logged</AfTag>
            ) : result === "discarded" ? (
              <AfTag>Draft discarded</AfTag>
            ) : (
              <AfTag tone="success">Ready for review</AfTag>
            )}
          </span>
          {result ? null : (
            <>
              <AfButton size="sm" variant="secondary" onClick={() => { setResult("discarded"); onDiscard?.(); }}>Discard</AfButton>
              <AfButton size="sm" variant="primary" loading={sending} onClick={send}>Send email</AfButton>
            </>
          )}
        </footer>
      </section>
      {showNote ? <Note>520px email draft: recipient picker & attachment chip on one row, sliding tone pill, and smooth receipt collapse on send.</Note> : null}
    </Demo>
  );
}

export { EmailDraftDemo as AfEmailDraftPattern, EmailDraftDemo as AfEmailDraft };
export type { AfEmailDraftPatternProps as AfEmailDraftProps };
