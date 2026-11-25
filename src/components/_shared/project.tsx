/* ------------------------------------------------------------------ */
/* Pro Agent & Workspace Blocks 矢量品牌标与状态微图标                  */
/* ------------------------------------------------------------------ */

/** 模型厂商矢量徽标（Anthropic / OpenAI / Gemini）。 */
export function ModelVendorMark({ model = "", size = 14 }: { model?: string; size?: number }) {
  const m = model.toLowerCase();
  if (m.includes("gpt") || m.includes("openai") || m.includes("o3") || m.includes("sol")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.5a4.5 4.5 0 0 1 4.1 2.7 4.5 4.5 0 0 1 3.7 6.5 4.5 4.5 0 0 1-2.1 6.3 4.5 4.5 0 0 1-5.7 1.2 4.5 4.5 0 0 1-6.1-2.5 4.5 4.5 0 0 1-.8-6.4A4.5 4.5 0 0 1 8.8 5 4.5 4.5 0 0 1 12 3.5Z"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (m.includes("gemini") || m.includes("flash")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3c.6 5.2 3.8 8.4 9 9-5.2.6-8.4 3.8-9 9-.6-5.2-3.8-8.4-9-9 5.2-.6 8.4-3.8 9-9Z"
          fill="#3b82f6"
        />
      </svg>
    );
  }
  // Default Anthropic sunburst (Opus / Sonnet / Haiku)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#d97757" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3.5v17M3.5 12h17M5.9 5.9l12.2 12.2M18.1 5.9 5.9 18.1M8.7 4.1l6.6 15.8M15.3 4.1 8.7 19.9" />
    </svg>
  );
}

/** 集成应用彩色品牌磁贴 SVG（Slack / Notion / Linear / Figma / GitHub / Stripe / Zapier / HubSpot 等）。 */
export function BrandAppTile({ id, name: _name, tileColor, size = 32 }: { id: string; name: string; tileColor?: string; size?: number }) {
  const key = id.toLowerCase();
  if (key === "slack") {
    return (
      <span className="af-pj-brandtile af-pj-brandtile--light" style={{ width: size, height: size }} aria-hidden="true">
        <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24" fill="none">
          <rect x="13" y="3" width="3.6" height="8.5" rx="1.8" fill="#2EB67D" />
          <circle cx="18.8" cy="9.7" r="1.8" fill="#2EB67D" />
          <rect x="12.5" y="13" width="8.5" height="3.6" rx="1.8" fill="#ECB22E" />
          <circle cx="14.3" cy="18.8" r="1.8" fill="#ECB22E" />
          <rect x="7.4" y="12.5" width="3.6" height="8.5" rx="1.8" fill="#E01E5A" />
          <circle cx="5.2" cy="14.3" r="1.8" fill="#E01E5A" />
          <rect x="3" y="7.4" width="8.5" height="3.6" rx="1.8" fill="#36C5F0" />
          <circle cx="9.7" cy="5.2" r="1.8" fill="#36C5F0" />
        </svg>
      </span>
    );
  }
  if (key === "notion") {
    return (
      <span className="af-pj-brandtile af-pj-brandtile--light" style={{ width: size, height: size }} aria-hidden="true">
        <svg width={Math.round(size * 0.58)} height={Math.round(size * 0.58)} viewBox="0 0 24 24" fill="none">
          <rect x="4" y="3.5" width="16" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8.5 16.5V8l7 8.5V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (key === "linear") {
    return (
      <span className="af-pj-brandtile" style={{ width: size, height: size, background: "#5E6AD2", color: "#fff" }} aria-hidden="true">
        <svg width={Math.round(size * 0.56)} height={Math.round(size * 0.56)} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5.5 14.5 9.5 18.5M4.5 10.5l9 9M7 6.5l10.5 10.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (key === "figma") {
    return (
      <span className="af-pj-brandtile af-pj-brandtile--light" style={{ width: size, height: size }} aria-hidden="true">
        <svg width={Math.round(size * 0.56)} height={Math.round(size * 0.56)} viewBox="0 0 24 24" fill="none">
          <path d="M8.5 3.5h3.5v5H8.5a2.5 2.5 0 0 1 0-5Z" fill="#F24E1E" />
          <path d="M12 3.5h3.5a2.5 2.5 0 0 1 0 5H12v-5Z" fill="#FF7262" />
          <path d="M12 8.5h3.5a2.5 2.5 0 0 1 0 5H12v-5Z" fill="#1ABCFE" />
          <path d="M8.5 8.5H12v5H8.5a2.5 2.5 0 0 1 0-5Z" fill="#A259FF" />
          <path d="M8.5 13.5H12v2.5a2.5 2.5 0 1 1-3.5-2.5Z" fill="#0ACF83" />
        </svg>
      </span>
    );
  }
  if (key === "github") {
    return (
      <span className="af-pj-brandtile" style={{ width: size, height: size, background: "#18181b", color: "#fff" }} aria-hidden="true">
        <svg width={Math.round(size * 0.58)} height={Math.round(size * 0.58)} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.8c-2.6.6-3.2-1.1-3.2-1.1-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.1-.2-4.3-1-4.3-4.7 0-1 .4-1.9 1-2.6-.1-.2-.4-1.2.1-2.5 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.5.6.7 1 1.6 1 2.6 0 3.7-2.2 4.5-4.3 4.7.3.3.7.9.7 1.8v2.7c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5Z" />
        </svg>
      </span>
    );
  }
  if (key === "stripe") {
    return (
      <span className="af-pj-brandtile" style={{ width: size, height: size, background: "#635BFF", color: "#fff" }} aria-hidden="true">
        <strong style={{ fontSize: Math.round(size * 0.52), fontWeight: 800, lineHeight: 1 }}>S</strong>
      </span>
    );
  }
  if (key === "zapier") {
    return (
      <span className="af-pj-brandtile" style={{ width: size, height: size, background: "#FF4F00", color: "#fff" }} aria-hidden="true">
        <svg width={Math.round(size * 0.54)} height={Math.round(size * 0.54)} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7" />
        </svg>
      </span>
    );
  }
  if (key === "hubspot") {
    return (
      <span className="af-pj-brandtile af-pj-brandtile--light" style={{ width: size, height: size }} aria-hidden="true">
        <svg width={Math.round(size * 0.58)} height={Math.round(size * 0.58)} viewBox="0 0 24 24" fill="none" stroke="#FF7A59" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3.5" />
          <circle cx="18" cy="6" r="1.8" fill="#FF7A59" />
          <circle cx="6" cy="17.5" r="1.8" fill="#FF7A59" />
          <path d="M14.6 9.4 16.8 7.2M9.4 14.6l-2.1 1.8M12 8.5V4.5" />
        </svg>
      </span>
    );
  }
  if (key === "intercom") {
    return (
      <span className="af-pj-brandtile af-pj-brandtile--light" style={{ width: size, height: size, color: "#0057FF" }} aria-hidden="true">
        <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <path d="M8 8.5v5M10.7 7.5v7M13.3 7.5v7M16 8.5v5M8.5 16.2c2 1.4 5 1.4 7 0" />
        </svg>
      </span>
    );
  }
  if (key === "calendly" || key === "gong") {
    return (
      <span className="af-pj-brandtile" style={{ width: size, height: size, background: "#006BFF", color: "#fff" }} aria-hidden="true">
        <svg width={Math.round(size * 0.58)} height={Math.round(size * 0.58)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
          <path d="M16.2 8.6a5.5 5.5 0 1 0 0 6.8" />
          <circle cx="16.8" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      </span>
    );
  }
  if (key === "loom" || key === "miro") {
    return (
      <span className="af-pj-brandtile" style={{ width: size, height: size, background: "#0B5CFF", color: "#fff" }} aria-hidden="true">
        <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="2.3" />
          <path d="M12 4.2v3.3M12 16.5v3.3M4.2 12h3.3M16.5 12h3.3M6.5 6.5l2.3 2.3M15.2 15.2l2.3 2.3M17.5 6.5l-2.3 2.3M8.8 15.2l-2.3 2.3" />
        </svg>
      </span>
    );
  }
  if (key === "gmail") {
    return (
      <span className="af-pj-brandtile af-pj-brandtile--light" style={{ width: size, height: size }} aria-hidden="true">
        <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24" fill="none">
          <path d="M4 7.5V18a1.5 1.5 0 0 0 1.5 1.5H7v-7.2L12 16l5-3.7v7.2h1.5A1.5 1.5 0 0 0 20 18V7.5l-8 6-8-6Z" fill="#EA4335" />
          <path d="M4 7.5 7 9.8V6L5.8 5.1A1.2 1.2 0 0 0 4 6.1v1.4Z" fill="#C5221F" />
          <path d="M20 7.5 17 9.8V6l1.2-.9A1.2 1.2 0 0 1 20 6.1v1.4Z" fill="#FBBC04" />
        </svg>
      </span>
    );
  }
  if (key === "discord") {
    return (
      <span className="af-pj-brandtile" style={{ width: size, height: size, background: "#5865F2", color: "#fff" }} aria-hidden="true">
        <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.9 6.3A14.5 14.5 0 0 0 15.2 5l-.5 1a13 13 0 0 0-5.4 0l-.5-1A14.5 14.5 0 0 0 5.1 6.3C2.8 9.8 2.2 13.2 2.5 16.5A14.7 14.7 0 0 0 7 18.8l.9-1.3c-.6-.2-1.2-.5-1.7-.9l.4-.3a10.4 10.4 0 0 0 10.8 0l.4.3c-.5.4-1.1.7-1.7.9l.9 1.3a14.7 14.7 0 0 0 4.5-2.3c.4-3.8-.6-7.1-2.6-10.2ZM9.2 14.3c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Zm5.6 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Z" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="af-pj-brandtile"
      style={{ width: size, height: size, background: tileColor ?? "#2563eb", color: "#fff" }}
      aria-hidden="true"
    >
      <svg width={Math.round(size * 0.56)} height={Math.round(size * 0.56)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="13" y="4.5" width="6.5" height="6.5" rx="1.5" />
        <rect x="4.5" y="13" width="6.5" height="6.5" rx="1.5" />
        <circle cx="16.25" cy="16.25" r="3.25" />
      </svg>
    </span>
  );
}

/** 人物拟真插画圆头像（用于 ClientContext、TaskBoard 等人物标识）。 */
export function PersonAvatarSvg({ name, size = 18 }: { name: string; size?: number }) {
  const n = name.toLowerCase();
  const variant =
    n.includes("jonas")
      ? { bg1: "#334155", bg2: "#1e293b", skin: "#f4c7a5", hair: "#29201b", shirt: "#0f172a", female: false }
      : n.includes("maya") || n.includes("mara")
        ? { bg1: "#7c3aed", bg2: "#4c1d95", skin: "#f2c29b", hair: "#1f1924", shirt: "#ddd6fe", female: true }
        : n.includes("theo")
          ? { bg1: "#b45309", bg2: "#78350f", skin: "#e5a97c", hair: "#271b14", shirt: "#fef3c7", female: false }
          : { bg1: "#6366f1", bg2: "#3730a3", skin: "#f6cfb2", hair: "#3b2316", shirt: "#e0e7ff", female: true };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", borderRadius: "999px", flexShrink: 0 }}
    >
      <circle cx="16" cy="16" r="16" fill={variant.bg1} />
      <circle cx="22" cy="10" r="12" fill={variant.bg2} fillOpacity="0.45" />
      {variant.female && <path d="M8.5 16c0-5 3.4-8.6 7.5-8.6s7.5 3.6 7.5 8.6v5.5h-15V16Z" fill={variant.hair} />}
      <path d="M6.5 29.5c1.5-5.2 5.1-7.8 9.5-7.8s8 2.6 9.5 7.8a16 16 0 0 1-19 0Z" fill={variant.shirt} />
      <rect x="13.8" y="18.5" width="4.4" height="4.2" rx="2" fill={variant.skin} />
      <circle cx="16" cy="14.2" r="5.3" fill={variant.skin} />
      {variant.female ? (
        <path d="M10.4 13.8c.4-3.8 3.1-5.8 6.1-5.8 2.7 0 5 1.7 5.3 5.2-1.6-1.3-3.2-2-5.1-1.9-2.2.1-4.3 1-6.3 2.5Z" fill={variant.hair} />
      ) : (
        <path d="M10.8 13.4c.2-3.4 2.5-5.3 5.2-5.3s5 1.8 5.2 5.1c-1.4-1.4-3.2-2-5.2-2s-3.8.7-5.2 2.2Z" fill={variant.hair} />
      )}
      <circle cx="14.1" cy="14.5" r="0.65" fill="#1f2937" />
      <circle cx="17.9" cy="14.5" r="0.65" fill="#1f2937" />
      <path d="M14.5 16.8c.9.6 2.1.6 3 0" stroke="#9a5b42" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

/** 认证蓝勾徽章。 */
export function VerifiedBadge() {
  return (
    <svg className="af-pj-vbadge" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#0190fe" />
      <path d="m5.1 8.1 1.9 1.9 3.9-4" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
