import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

/* ========================================================================== *
 * 1. AfEmptyCalendar
 * ========================================================================== */

export interface AfEmptyCalendarProps {
  /** Accessible description of the illustration. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Stacked empty calendar cards with breathing rainbow glow, skeleton shimmer, and hover fan-out.
 */
export function AfEmptyCalendar(props: AfEmptyCalendarProps = {}) {
  const {
    label = "Stacked calendar cards marked empty, with a disabled join meeting button",
    className,
    style,
  } = props;
  const uid = useId().replace(/:/g, "_");

  const renderCardInternals = () => (
    <>
      <rect
        className="ui-ec-card"
        x="40"
        y="20"
        width="240"
        height="140"
        rx="10"
        fill="#FFFFFF"
        stroke="#E4E7EC"
        strokeWidth="0.5"
        filter={`url(#ui-ec-${uid}-shadow)`}
      />
      <text className="ui-ec-title" x="56" y="48" fontSize="13" fontWeight="500" fill="#8A8A8A">
        Calendar
      </text>
      <g transform="translate(218 34)">
        <rect className="ui-ec-badge" width="46" height="18" rx="5" fill="#FEF8EF" />
        <text x="23" y="12" textAnchor="middle" fontSize="9" fontWeight="600" letterSpacing="0.06em" fill="#FAB082">
          EMPTY
        </text>
      </g>
      <rect className="ui-ec-bar" x="56" y="64" width="208" height="7" rx="2" fill="#EFF1F4" />
      <rect className="ui-ec-bar" x="56" y="74" width="208" height="7" rx="2" fill="#EFF1F4" />
      <rect className="ui-ec-bar" x="56" y="84" width="168" height="7" rx="2" fill="#EFF1F4" />
      <g transform="translate(56 104)">
        <rect className="ui-ec-btn" width="208" height="40" rx="8" fill="#F4F4F6" stroke="#E4E7EC" strokeWidth="0.5" />
        <g
          className="ui-ec-btn-ink"
          transform="translate(64 14)"
          fill="none"
          stroke="#9A9AA3"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="6" cy="6" r="5" />
          <line x1="2.5" y1="9.5" x2="9.5" y2="2.5" />
        </g>
        <text className="ui-ec-btn-label" x="84" y="24" fontSize="10" fontWeight="500" fill="#9A9AA3">
          Join meeting
        </text>
      </g>
    </>
  );

  return (
    <div
      className={className ? `ui-ec ${className}` : "ui-ec"}
      role="img"
      aria-label={label}
      style={style}
    >
      <svg className="ui-ec-art" viewBox="0 0 320 240" aria-hidden="true">
        <defs>
          <filter id={`ui-ec-${uid}-blur`} x="-30%" y="-100%" width="160%" height="300%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id={`ui-ec-${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow className="ui-ec-drop" dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.06" />
          </filter>
          <linearGradient id={`ui-ec-${uid}-blob`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFA0AB" stopOpacity="0.25" />
            <stop offset="33%" stopColor="#FFB89E" stopOpacity="0.25" />
            <stop offset="66%" stopColor="#C8A8E5" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#A8B5FF" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id={`ui-ec-${uid}-stroke`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop className="ui-ec-edge" offset="0%" stopColor="#E4E7EC" />
            <stop offset="18%" stopColor="#FFB5BC" />
            <stop offset="40%" stopColor="#FFC5AB" />
            <stop offset="60%" stopColor="#D5BBEF" />
            <stop offset="82%" stopColor="#B5C0FF" />
            <stop className="ui-ec-edge" offset="100%" stopColor="#E4E7EC" />
          </linearGradient>
        </defs>
        <g transform="translate(30 47) scale(0.814)">
          <g className="ui-ec-back ui-ec-back-left">{renderCardInternals()}</g>
          <g className="ui-ec-back ui-ec-back-right">{renderCardInternals()}</g>
          <g className="ui-ec-front">
            <ellipse
              className="ui-ec-blob"
              cx="160"
              cy="152"
              rx="125"
              ry="35"
              fill={`url(#ui-ec-${uid}-blob)`}
              filter={`url(#ui-ec-${uid}-blur)`}
            />
            {renderCardInternals()}
            <path
              d="M40 150 A 10 10 0 0 0 50 160 L270 160 A 10 10 0 0 0 280 150"
              fill="none"
              stroke={`url(#ui-ec-${uid}-stroke)`}
              strokeWidth="0.5"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

/* ========================================================================== *
 * 2. AfEnrichmentOrbit
 * ========================================================================== */

export interface AfEnrichmentOrbitProps {
  /** Accessible description of the illustration. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const ORBIT_NODE_PATH =
  "M278 88C278 115.614 300.386 138 328 138H366C393.614 138 416 160.386 416 188V228C416 255.614 393.614 278 366 278H328C300.386 278 278 300.386 278 328V366C278 393.614 255.614 416 228 416H188C160.386 416 138 393.614 138 366V328C138 300.386 115.614 278 88 278H50C22.3858 278 0 255.614 0 228V188C0 160.386 22.3858 138 50 138H88C115.614 138 138 115.614 138 88V50C138 22.3858 160.386 0 188 0H228C255.614 0 278 22.3858 278 50V88ZM140 226C140 253.614 162.386 276 190 276H226C253.614 276 276 253.614 276 226V190C276 162.386 253.614 140 226 140H190C162.386 140 140 162.386 140 190V226Z";

/**
 * Orbital enrichment illustration with counter-rotating rainbow comets and upright data nodes.
 */
export function AfEnrichmentOrbit(props: AfEnrichmentOrbitProps = {}) {
  const {
    label = "A Grok tile with data nodes orbiting around it",
    className,
    style,
  } = props;
  const uid = useId().replace(/:/g, "_");
  const delays = ["0s", "-7.33s", "-14.66s"] as const;

  return (
    <div
      className={className ? `ui-eo ${className}` : "ui-eo"}
      role="img"
      aria-label={label}
      style={style}
    >
      <svg className="ui-eo-art" viewBox="0 0 320 240" aria-hidden="true">
        <defs>
          <filter id={`ui-eo-${uid}-tile`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="dropBlur" />
            <feOffset in="dropBlur" dx="0" dy="3" result="dropOffset" />
            <feFlood className="ui-eo-drop" floodColor="#000000" floodOpacity="0.06" result="dropColor" />
            <feComposite in="dropColor" in2="dropOffset" operator="in" result="dropShadow" />
            <feOffset in="SourceAlpha" dx="0" dy="-4" result="alphaUp" />
            <feComposite in="SourceAlpha" in2="alphaUp" operator="out" result="sliver" />
            <feFlood className="ui-eo-sliver" floodColor="#EAECEF" floodOpacity="1" result="innerColor" />
            <feComposite in="innerColor" in2="sliver" operator="in" result="innerShadow" />
            <feMerge>
              <feMergeNode in="dropShadow" />
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="innerShadow" />
            </feMerge>
          </filter>
          <filter id={`ui-eo-${uid}-node`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="dropBlur" />
            <feOffset in="dropBlur" dx="0" dy="2" result="dropOffset" />
            <feFlood className="ui-eo-drop" floodColor="#000000" floodOpacity="0.07" result="dropColor" />
            <feComposite in="dropColor" in2="dropOffset" operator="in" result="dropShadow" />
            <feOffset in="SourceAlpha" dx="0" dy="-3" result="alphaUp" />
            <feComposite in="SourceAlpha" in2="alphaUp" operator="out" result="sliver" />
            <feFlood className="ui-eo-sliver" floodColor="#EAECEF" floodOpacity="1" result="innerColor" />
            <feComposite in="innerColor" in2="sliver" operator="in" result="innerShadow" />
            <feMerge>
              <feMergeNode in="dropShadow" />
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="innerShadow" />
            </feMerge>
          </filter>
          <linearGradient id={`ui-eo-${uid}-comet`}>
            <stop offset="0%" stopColor="#FF6B5C" stopOpacity="0" />
            <stop offset="22%" stopColor="#FFB89E" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#C8A8E5" stopOpacity="0.9" />
            <stop offset="78%" stopColor="#A8B5FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#A8B5FF" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="ui-eo-rings" fill="none" stroke="#E4E7EC" strokeWidth="1.2">
          <circle cx="160" cy="120" r="56" strokeOpacity="0.45" />
          <circle cx="160" cy="120" r="80" />
        </g>
        <g className="ui-eo-spin">
          <path
            fill="none"
            stroke={`url(#ui-eo-${uid}-comet)`}
            strokeWidth="1.6"
            strokeLinecap="round"
            d="M114.1 54.5 A80 80 0 0 1 205.9 54.5"
          />
        </g>
        <g className="ui-eo-spin ui-eo-reverse">
          <path
            fill="none"
            stroke={`url(#ui-eo-${uid}-comet)`}
            strokeWidth="1.6"
            strokeLinecap="round"
            d="M120.4 80.4 A56 56 0 0 1 199.6 80.4"
          />
        </g>

        <rect
          className="ui-eo-tile"
          x="134"
          y="94"
          width="52"
          height="52"
          rx="12"
          fill="#FFFFFF"
          stroke="#E4E7EC"
          strokeWidth="0.5"
          filter={`url(#ui-eo-${uid}-tile)`}
        />
        <svg x="147" y="107" width="26" height="26" viewBox="0 0 33.4 32" overflow="visible">
          <path
            className="ui-eo-mark"
            fill="#171717"
            d="M12.8734 20.5407L23.9549 12.3506C24.4982 11.9491 25.2747 12.1057 25.5336 12.7294C26.896 16.0185 26.2873 19.9712 23.5766 22.6851C20.866 25.3989 17.0944 25.9941 13.6471 24.6386L9.88123 26.3843C15.2826 30.0806 21.8416 29.1665 25.9403 25.0601C29.1914 21.8051 30.1983 17.3683 29.2568 13.3673L29.2653 13.3758C27.9 7.49809 29.601 5.14871 33.0853 0.344576C33.1677 0.230667 33.2502 0.116757 33.3327 0L28.7476 4.59055V4.57631L12.8706 20.5436"
          />
          <path
            className="ui-eo-mark"
            fill="#171717"
            d="M10.5867 22.5312C6.70979 18.8234 7.37821 13.0852 10.6862 9.77618C13.1323 7.3271 17.14 6.32755 20.6385 7.79698L24.3959 6.05986C23.719 5.57005 22.8514 5.04322 21.8559 4.67301C17.3562 2.81914 11.969 3.7418 8.31115 7.40114C4.79271 10.9238 3.68626 16.3402 5.58628 20.9621C7.0056 24.4164 4.67893 26.8597 2.3352 29.3259C1.50465 30.2001 0.67126 31.0744 0 31.9999L10.5838 22.534"
          />
        </svg>

        {delays.map((delay) => (
          <g key={delay} className="ui-eo-orbit" style={{ animationDelay: delay }}>
            <g className="ui-eo-upright" style={{ animationDelay: delay }}>
              <circle
                className="ui-eo-tile"
                cx="160"
                cy="40"
                r="17"
                fill="#FFFFFF"
                stroke="#E4E7EC"
                strokeWidth="0.5"
                filter={`url(#ui-eo-${uid}-node)`}
              />
              <g transform="translate(154 34) scale(0.0288)" className="ui-eo-icon" fill="#6B6F76" fillOpacity="0.55">
                <path d={ORBIT_NODE_PATH} />
              </g>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ========================================================================== *
 * 3. AfGhostedChat
 * ========================================================================== */

export interface AfGhostedChatProps {
  /** Accessible description of the illustration. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Unanswered chat messages illustration with staggered arrival, red shimmer, and hover reply bubble.
 */
export function AfGhostedChat(props: AfGhostedChatProps = {}) {
  const {
    label = "A chat with three unanswered messages marked as read",
    className,
    style,
  } = props;

  const rootRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.55556);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setScale(w / 360);
        setReady(true);
      }
    };
    update();
    if (typeof ResizeObserver === "undefined") {
      setReady(true);
      return;
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={className ? `ui-gc ${className}` : "ui-gc"}
      role="img"
      aria-label={label}
      style={style}
    >
      <div
        className="ui-gc-stage"
        aria-hidden="true"
        data-play="true"
        style={{
          transform: `scale(${scale.toFixed(5)})`,
          visibility: ready ? "visible" : "hidden",
        }}
      >
        <div className="ui-gc-content">
          <span className="ui-gc-status">No new messages</span>
          <div className="ui-gc-bubbles">
            <div className="ui-gc-bubble">
              <span>Hi team!</span>
            </div>
            <div className="ui-gc-bubble">
              <span>Are you by any chance looking for a recruiter?</span>
            </div>
            <div className="ui-gc-bubble ui-gc-bubble-last">
              <span className="ui-gc-alert">Hello?</span>
            </div>
            <span className="ui-gc-read">Read</span>
          </div>
          <div className="ui-gc-bubble ui-gc-reply">
            <span>👎</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== *
 * 4. AfGlassFolder
 * ========================================================================== */

export interface AfGlassFolderProps {
  /** Accessible description of the illustration. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const FOLDER_BACK_PATH =
  "M38 0H176Q196 0 204 14L218 30Q224 38 246 38H562Q600 38 600 76V462Q600 500 562 500H38Q0 500 0 462V38Q0 0 38 0Z";

/**
 * Translucent glass folder holding three document sheets that fan out when hovered.
 */
export function AfGlassFolder(props: AfGlassFolderProps = {}) {
  const {
    label = "Blue folder holding three documents behind a frosted front pocket",
    className,
    style,
  } = props;
  const uid = useId().replace(/:/g, "_");

  return (
    <div
      className={className ? `ui-fd ${className}` : "ui-fd"}
      role="img"
      aria-label={label}
      style={style}
    >
      <div className="ui-fd-icon" aria-hidden="true">
        <svg className="ui-fd-layer ui-fd-back" viewBox="0 0 600 500">
          <defs>
            <filter id={`ui-fd-${uid}-hl`} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
              <feOffset in="blur" dy="3" result="offset" />
              <feComposite in="blur" in2="offset" operator="arithmetic" k2="1" k3="-1" result="diff" />
              <feFlood floodColor="#fff" floodOpacity="0.65" />
              <feComposite in2="diff" operator="in" result="light" />
              <feComposite in="light" in2="SourceAlpha" operator="in" />
            </filter>
          </defs>
          <path className="ui-fd-back-fill" d={FOLDER_BACK_PATH} fill="#5bb7ea" />
          <path d={FOLDER_BACK_PATH} fill="#000" filter={`url(#ui-fd-${uid}-hl)`} />
        </svg>

        <svg className="ui-fd-layer" viewBox="0 0 600 500">
          <defs>
            <linearGradient id={`ui-fd-${uid}-paper`} x1="0" y1="0" x2="0" y2="1">
              <stop className="ui-fd-paper-top" offset="0%" stopColor="#fff" />
              <stop className="ui-fd-paper-bottom" offset="100%" stopColor="#eaf2f8" />
            </linearGradient>
            <symbol id={`ui-fd-${uid}-doc`} overflow="visible">
              <rect
                className="ui-fd-paper"
                x="0.6"
                y="0.6"
                width="278.8"
                height="348.8"
                rx="19.4"
                fill={`url(#ui-fd-${uid}-paper)`}
                stroke="rgba(0,0,0,0.12)"
                strokeWidth="1.2"
              />
              <rect className="ui-fd-line" x="30" y="87" width="78" height="9" rx="4.5" fill="rgba(0,0,0,0.12)" />
              <rect className="ui-fd-line" x="30" y="115" width="180" height="9" rx="4.5" fill="rgba(0,0,0,0.12)" />
              <rect className="ui-fd-line" x="30" y="143" width="140" height="9" rx="4.5" fill="rgba(0,0,0,0.12)" />
              <rect className="ui-fd-line" x="30" y="171" width="175" height="9" rx="4.5" fill="rgba(0,0,0,0.12)" />
              <rect className="ui-fd-line" x="30" y="199" width="126" height="9" rx="4.5" fill="rgba(0,0,0,0.12)" />
              <rect className="ui-fd-line" x="30" y="227" width="168" height="9" rx="4.5" fill="rgba(0,0,0,0.12)" />
              <rect className="ui-fd-line" x="30" y="255" width="110" height="9" rx="4.5" fill="rgba(0,0,0,0.12)" />
            </symbol>
          </defs>
          <use className="ui-fd-doc ui-fd-doc--left" href={`#ui-fd-${uid}-doc`} />
          <use className="ui-fd-doc ui-fd-doc--right" href={`#ui-fd-${uid}-doc`} />
          <use className="ui-fd-doc ui-fd-doc--middle" href={`#ui-fd-${uid}-doc`} />
        </svg>

        <div className="ui-fd-front" />
      </div>
    </div>
  );
}
