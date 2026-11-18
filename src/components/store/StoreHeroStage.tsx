import { useEffect, useRef, useState, type ReactNode } from "react";
import { type AfIconSlot } from "../../icons";
import { AfGridBackground } from "../../motion";
import { cn, useControllableState, useWidthMorph } from "../../primitives";
import { AfAppMark, AfButton, AfCopyButton, AfSegmented, AfTag } from "../../ui";
import { AfBlurCrossfade } from "../../motion";

/** 公开展示站安装包目标平台与架构标识。 */
export type AfStorePlatformKey =
  | "win-x64"
  | "win-arm64"
  | "mac-arm64"
  | "mac-x64"
  | "linux-x64"
  | "linux-arm64";

/** 单个平台推荐安装包元数据。 */
export type AfStoreHeroBuildOption = {
  key: AfStorePlatformKey;
  label: string;
  shortLabel: string;
  fileName: string;
  sizeLabel: string;
  sha256: string;
  downloadUrl?: string;
};

interface NavigatorUADataLike {
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string; platform?: string }>;
}

/** 结合客户端环境识别推荐平台架构（支持 SSR 安全默认回退 `"win-x64"`）。 */
export function detectClientStorePlatform(): AfStorePlatformKey {
  if (typeof navigator === "undefined") return "win-x64";
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUADataLike }).userAgentData;
  const rawPlatform = (uaData?.platform || navigator.platform || navigator.userAgent || "").toLowerCase();
  const rawUa = (navigator.userAgent || "").toLowerCase();
  const isArm = rawUa.includes("arm64") || rawUa.includes("aarch64");

  if (rawPlatform.includes("mac") || rawPlatform.includes("darwin")) {
    return isArm || !rawUa.includes("intel") ? "mac-arm64" : "mac-x64";
  }
  if (rawPlatform.includes("linux")) {
    return isArm ? "linux-arm64" : "linux-x64";
  }
  return isArm ? "win-arm64" : "win-x64";
}

/** 商城公开展示站首屏安装包识别舞台属性。 */
export type AfStoreHeroStageProps = {
  appName?: string;
  version?: string;
  releaseChannel?: string;
  tagline?: ReactNode;
  description?: ReactNode;
  icon?: AfIconSlot;
  builds?: AfStoreHeroBuildOption[];
  /** 受控指定当前平台架构（用于 SSR 确定性渲染或预览切换）。 */
  detectedPlatform?: AfStorePlatformKey;
  /** 是否在客户端挂载后自动根据 `navigator.userAgentData` 识别系统架构，默认 `false` 以保障测试与截图确定性。 */
  autoDetectClient?: boolean;
  onPlatformChange?: (platform: AfStorePlatformKey) => void;
  onDownload?: (build: AfStoreHeroBuildOption) => void;
  onViewAllPlatforms?: () => void;
  className?: string;
};

const DEFAULT_HERO_BUILDS: AfStoreHeroBuildOption[] = [
  {
    key: "win-x64",
    label: "Windows x64 安装包",
    shortLabel: "Windows x64",
    fileName: "CloudDesk-Setup-1.4.2-x64.exe",
    sizeLabel: "68.4 MB",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
  {
    key: "mac-arm64",
    label: "macOS Apple Silicon (M1–M4)",
    shortLabel: "macOS arm64",
    fileName: "CloudDesk-1.4.2-arm64.dmg",
    sizeLabel: "71.2 MB",
    sha256: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
  },
  {
    key: "linux-x64",
    label: "Linux AppImage x64",
    shortLabel: "Linux x64",
    fileName: "CloudDesk-1.4.2-x86_64.AppImage",
    sizeLabel: "74.0 MB",
    sha256: "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
  },
];

/**
 * 商城公开展示站首屏舞台（`AfGridBackground` 动效底衬 + 平台架构自动识别主下载按钮 + SHA-256 指纹核验）。
 */
export function AfStoreHeroStage({
  appName = "云端效率工作台",
  version = "1.4.2",
  releaseChannel = "正式版",
  tagline = "集桌面快捷工具与专业扩展生态于一体的效率工作空间",
  description = "融合悬浮快捷工具、本地安全环境与按需安装的扩展应用中心，自动为您推荐匹配当前系统架构的安装程序。",
  icon = "sparkle",
  builds = DEFAULT_HERO_BUILDS,
  detectedPlatform: platformProp,
  autoDetectClient = false,
  onPlatformChange,
  onDownload,
  onViewAllPlatforms,
  className,
}: AfStoreHeroStageProps = {}) {
  const [selectedKey, setSelectedKey] = useControllableState<AfStorePlatformKey>({
    value: platformProp,
    defaultValue: builds[0]?.key ?? "win-x64",
    onChange: onPlatformChange,
  });

  const [uaHint, setUaHint] = useState<string | null>(null);

  useEffect(() => {
    if (!autoDetectClient || platformProp !== undefined || typeof navigator === "undefined") return;
    let cancelled = false;
    const guessed = detectClientStorePlatform();
    if (builds.some((b) => b.key === guessed)) {
      setSelectedKey(guessed);
      setUaHint("已根据当前设备自动推荐版本");
    }
    const uaData = (navigator as Navigator & { userAgentData?: NavigatorUADataLike }).userAgentData;
    uaData
      ?.getHighEntropyValues?.(["architecture", "platform"])
      .then((high) => {
        if (cancelled) return;
        const p = (high.platform || "").toLowerCase();
        const arch = (high.architecture || "").toLowerCase();
        const isArm = arch.includes("arm");
        const next: AfStorePlatformKey = p.includes("mac")
          ? isArm
            ? "mac-arm64"
            : "mac-x64"
          : p.includes("linux")
            ? isArm
              ? "linux-arm64"
              : "linux-x64"
            : isArm
              ? "win-arm64"
              : "win-x64";
        if (builds.some((b) => b.key === next)) {
          setSelectedKey(next);
          setUaHint("已自动匹配当前系统架构");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [autoDetectClient, platformProp, builds, setSelectedKey]);

  const currentBuild = builds.find((b) => b.key === selectedKey) ?? builds[0];
  const dlMorphRef = useRef<HTMLDivElement>(null);
  useWidthMorph(dlMorphRef, currentBuild?.key ?? "win-x64");

  return (
    <section className={cn("af-store-hero", className)} aria-label={`${appName} 下载首屏`}>
      <AfGridBackground size={44} fade={74} speed={0} reveal={false} className="af-store-hero__bg">
        <div className="af-store-hero__inner">
          <div className="af-store-hero__badges">
            <AfTag tone="accent" size="sm">
              v{version} · {releaseChannel}
            </AfTag>
            <span className="af-store-hero__hint">
              {uaHint ?? "全平台双架构原生构建 · EV 代码签名"}
            </span>
          </div>

          <div className="af-store-hero__brand">
            <AfAppMark size={64} icon={icon} name={appName} tone="accent" statusBadge="online" />
            <div className="af-store-hero__titles">
              <h2>{appName}</h2>
              <p className="af-store-hero__tagline">{tagline}</p>
            </div>
          </div>

          <p className="af-store-hero__desc">{description}</p>

          {builds.length > 1 ? (
            <div className="af-store-hero__switcher">
              <AfSegmented<AfStorePlatformKey>
                size="sm"
                value={currentBuild?.key ?? "win-x64"}
                onChange={setSelectedKey}
                options={builds.map((b) => ({ value: b.key, label: b.shortLabel }))}
              />
            </div>
          ) : null}

          {currentBuild ? (
            <div className="af-store-hero__cta">
              <div ref={dlMorphRef} style={{ display: "inline-flex" }}>
                <AfButton
                  size="lg"
                  variant="primary"
                  icon="download"
                  onClick={() => onDownload?.(currentBuild)}
                >
                  下载 {currentBuild.label} · {currentBuild.sizeLabel}
                </AfButton>
              </div>

              <AfButton
                size="lg"
                variant="secondary"
                icon="layers"
                onClick={onViewAllPlatforms}
              >
                查看全部平台与校验码
              </AfButton>
            </div>
          ) : null}

          {currentBuild ? (
            <AfBlurCrossfade id={currentBuild.key} morph="height">
              <div className="af-store-hero__digest">
                <span className="af-store-hero__file">{currentBuild.fileName}</span>
                <span className="af-store-hero__sep" aria-hidden="true" />
                <span className="af-store-hero__sha">
                  SHA-256: <code>{currentBuild.sha256.slice(0, 16)}…</code>
                </span>
                <AfCopyButton
                  size="sm"
                  text={currentBuild.sha256}
                  label="复制完整 SHA-256"
                  copiedLabel="已复制校验值"
                />
              </div>
            </AfBlurCrossfade>
          ) : null}
        </div>
      </AfGridBackground>
    </section>
  );
}
