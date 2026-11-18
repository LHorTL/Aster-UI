import {
  useEffect,
  useRef,
  useState,
} from "react";
import { AfIcon, AfInput, AfTag } from "../../ui";
import { AfHoverList, cn, useImeEnterGuard } from "../../primitives";
import {
  type CommentsPanelProps,
  type PanelComment,
  type PanelFilter,
  StagePopover,
  resolveCommentAuthor,
} from "../_shared/chat";
import { ChatPortraitAvatar } from "./portraits";

const DEFAULT_PANEL_COMMENTS: PanelComment[] = [
  {
    id: "c1",
    author: { name: "Mara Lindqvist", initials: "M", tone: "blue" },
    createdAt: "2min ago",
    text: "/Edit Rename every “customers” to “members” on the pricing page.",
    resolved: false,
  },
  {
    id: "c2",
    author: { name: "Jonas Weber", initials: "J", tone: "purple" },
    createdAt: "5min ago",
    text: "Should we mention the launch discount in the hero too?",
    resolved: false,
  },
  {
    id: "c3",
    author: { name: "Lena Hart", initials: "L", tone: "green" },
    createdAt: "11min ago",
    text: "The new illustrations look great on mobile.",
    resolved: false,
  },
  {
    id: "c4",
    author: { name: "Theo Brandt", initials: "T", tone: "amber" },
    createdAt: "18min ago",
    text: "/Edit Shorten every FAQ answer to two sentences.",
    resolved: false,
  },
  {
    id: "c5",
    author: { name: "Sofia Marin", initials: "S", tone: "blue" },
    createdAt: "26min ago",
    text: "Can we ship this before Friday?",
    resolved: false,
  },
];

function isEditComment(text: string) {
  return /^\/edit\s+/i.test(text);
}

function isQuestionComment(text: string) {
  return !isEditComment(text) && /\?/.test(text);
}

function SortLinesSvg() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3" />
    </svg>
  );
}

function ResolveCircleSvg() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM5.5 8.2l1.7 1.7 3.3-3.8" />
    </svg>
  );
}

function SolidPlaySvg() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
      <path d="M5 3.6a.8.8 0 0 1 1.2-.7l6.3 3.9a1.4 1.4 0 0 1 0 2.4l-6.3 3.9a.8.8 0 0 1-1.2-.7V3.6Z" />
    </svg>
  );
}

/**
 * Comments Panel: single clean card with header, individual hairline filter pills + sort menu,
 * scrollable comments list with illustrated portraits + /Edit runner + hover resolve, and bottom composer.
 */
function CommentsPanel({
  comments: initial = DEFAULT_PANEL_COMMENTS,
  title = "Comments",
  description,
  currentUser = "Noah",
  onRunEdit,
  onAdd,
  onResolveChange,
  onClose,
  className,
}: CommentsPanelProps) {
  const [comments, setComments] = useState(initial);
  const [filter, setFilter] = useState<PanelFilter>("all");
  const [sort, setSort] = useState<"new" | "old">("new");
  const [sortOpen, setSortOpen] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [ranIds, setRanIds] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [added, setAdded] = useState(0);
  const [closed, setClosed] = useState(false);

  const sortAnchor = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seed = useRef(0);
  const ime = useImeEnterGuard();

  const counts = {
    all: comments.length,
    questions: comments.filter((comment) => isQuestionComment(comment.text)).length,
    edits: comments.filter((comment) => isEditComment(comment.text)).length,
  };

  const visible = comments.filter((comment) => {
    if (filter === "questions") return isQuestionComment(comment.text);
    if (filter === "edits") return isEditComment(comment.text);
    if (filter === "open") return !comment.resolved;
    if (filter === "resolved") return comment.resolved;
    return true;
  });

  useEffect(() => {
    if (!sortOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSortOpen(false);
        sortAnchor.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sortOpen]);

  const runEdit = (comment: PanelComment) => {
    if (runningId) return;
    setRunningId(comment.id);
    const maybePromise = onRunEdit?.(comment);
    if (maybePromise && typeof (maybePromise as Promise<void>).then === "function") {
      (maybePromise as Promise<void>)
        .then(() => {
          setRunningId(null);
          setRanIds((list) => [...list, comment.id]);
        })
        .catch(() => setRunningId(null));
      return;
    }
    window.setTimeout(() => {
      setRunningId(null);
      setRanIds((list) => [...list, comment.id]);
    }, 850);
  };

  const addComment = () => {
    const text = draft.trim();
    if (!text) return;
    seed.current += 1;
    setComments((list) => [
      { id: `new-${seed.current}`, author: currentUser, createdAt: "Just now", text, resolved: false },
      ...list,
    ]);
    onAdd?.(text);
    setAdded((value) => value + 1);
    setDraft("");
    inputRef.current?.focus();
  };

  const order = (list: PanelComment[]) => (sort === "new" ? list : [...list].reverse());
  const tabs: { value: PanelFilter; label: string; count?: number }[] = [
    { value: "all", label: "All" },
    { value: "questions", label: "Questions" },
    { value: "edits", label: "Edits", count: counts.edits },
  ];

  if (closed) {
    return (
      <button type="button" className="af-ch-comments__reopen" onClick={() => setClosed(false)}>
        <AfIcon name="message" size={14} />
        {title} · {counts.all}
        <AfIcon name="chevronDown" size={12} />
      </button>
    );
  }

  const sortLabel = "Sort comments";
  const currentResolved = resolveCommentAuthor(currentUser);

  return (
    <section className={cn("af-ch-comments", className)} aria-label="Comments">
      <header className="af-ch-comments__head">
        <h3 className="af-ch-comments__title">{title}</h3>
        {description ? <span className="af-ch-comments__sub">{description}</span> : null}
        <span className="af-ch-comments__spacer" />
        <button
          type="button"
          className="af-ch-comments__iconbtn"
          aria-label="Close comments"
          onClick={() => {
            onClose?.();
            setClosed(true);
          }}
        >
          <AfIcon name="x" size={14} />
        </button>
      </header>

      <div className="af-ch-comments__bar">
        <div className="af-ch-comments__tabs" role="tablist" aria-label="Filter comments">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              data-tab-key={tab.value}
              aria-selected={filter === tab.value}
              className="af-ch-comments__tab"
              data-active={filter === tab.value || undefined}
              onClick={() => setFilter(tab.value)}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined ? <span className="af-ch-comments__count">{tab.count}</span> : null}
            </button>
          ))}
        </div>
        <button
          ref={sortAnchor}
          type="button"
          className="af-ch-comments__iconbtn"
          aria-label={sortLabel}
          aria-haspopup="menu"
          aria-expanded={sortOpen}
          onClick={() => setSortOpen((value) => !value)}
        >
          <SortLinesSvg />
        </button>
        <StagePopover
          open={sortOpen}
          anchorRef={sortAnchor}
          align="end"
          role="menu"
          label={sortLabel}
          onClose={() => setSortOpen(false)}
          className="af-ch-comments__sortmenu"
        >
          <AfHoverList tone="hover" className="af-ch-composer__menulist">
            {(["new", "old"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={sort === value}
                className="af-ch-menuitem"
                data-active={sort === value || undefined}
                onClick={() => {
                  setSort(value);
                  setSortOpen(false);
                }}
              >
                <span>{value === "new" ? "Newest first" : "Oldest first"}</span>
                {sort === value ? <AfIcon name="check" size={14} /> : null}
              </button>
            ))}
          </AfHoverList>
        </StagePopover>
      </div>

      <div className="af-ch-comments__list" aria-live="polite">
        {visible.length === 0 ? <p className="af-ch-comments__empty">No matching comments.</p> : null}
        {order(visible).map((comment) => {
          const author = resolveCommentAuthor(comment.author);
          const isEdit = isEditComment(comment.text);
          const editBody = isEdit ? comment.text.replace(/^\/edit\s+/i, "") : comment.text;
          const editCmd = isEdit ? comment.text.slice(0, 5) : "/Edit";
          const ran = ranIds.includes(comment.id);
          return (
            <article
              key={comment.id}
              className="af-ch-comments__item"
              data-resolved={comment.resolved || undefined}
            >
              <header className="af-ch-comments__itemhead">
                <span className="af-ch-comments__avatar" aria-hidden>
                  <ChatPortraitAvatar name={author.name} size={20} />
                </span>
                <span className="af-ch-comments__name">{author.name}</span>
                <time className="af-ch-comments__time">{comment.createdAt}</time>
                <button
                  type="button"
                  className="af-ch-comments__resolve"
                  data-active={comment.resolved || undefined}
                  aria-label={comment.resolved ? "Reopen comment" : "Resolve comment"}
                  aria-pressed={comment.resolved}
                  onClick={() => {
                    const nextResolved = !comment.resolved;
                    setComments((list) =>
                      list.map((item) => (item.id === comment.id ? { ...item, resolved: nextResolved } : item)),
                    );
                    onResolveChange?.(comment.id, nextResolved);
                  }}
                >
                  <ResolveCircleSvg />
                </button>
              </header>
              <p className="af-ch-comments__text">
                {isEdit ? <span className="af-ch-comments__cmd">{editCmd}</span> : null}
                {isEdit ? ` ${editBody}` : editBody}
              </p>
              {isEdit ? (
                <div className="af-ch-comments__actions">
                  {ran ? (
                    <>
                      <AfTag tone="success" dot>
                        Edit applied
                      </AfTag>
                      <button
                        type="button"
                        className="af-ch-linkbtn"
                        onClick={() => setRanIds((list) => list.filter((id) => id !== comment.id))}
                      >
                        Undo
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="af-ch-comments__runbtn"
                      disabled={runningId === comment.id}
                      onClick={() => runEdit(comment)}
                    >
                      {runningId === comment.id ? (
                        <span className="af-ch-composer__spinner" aria-hidden />
                      ) : (
                        <SolidPlaySvg />
                      )}
                      <span>{runningId === comment.id ? "Running…" : "Run edit"}</span>
                    </button>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div
        className="af-ch-comments__composer"
        onPointerDown={(event) => {
          if (!(event.target as HTMLElement).closest("button, input")) {
            inputRef.current?.focus();
          }
        }}
      >
        <span className="af-ch-comments__avatar" aria-hidden>
          <ChatPortraitAvatar name={currentResolved.name} size={20} />
        </span>
        <div className="af-ch-comments__field">
          <AfInput
            ref={inputRef}
            variant="borderless"
            inputClassName="af-ch-comments__input"
            value={draft}
            placeholder="Add a comment or /edit…"
            aria-label="Add a comment"
            onCompositionStart={ime.onCompositionStart}
            onCompositionEnd={ime.onCompositionEnd}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                if (ime.shouldBlockEnter(event)) return;
                event.preventDefault();
                addComment();
              }
            }}
          />
        </div>
        <button
          type="button"
          className="af-ch-comments__send"
          disabled={!draft.trim()}
          aria-label="Send comment"
          onClick={addComment}
        >
          <AfIcon name="arrowUp" size={14} />
        </button>
      </div>
      <span className="af-ch-live" role="status">
        {added ? `Added ${added} comment${added === 1 ? "" : "s"}` : ""}
      </span>
    </section>
  );
}

export { CommentsPanel as AfCommentsPanel };
