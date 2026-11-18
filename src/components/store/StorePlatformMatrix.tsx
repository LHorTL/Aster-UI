import { AfIcon, type AfIconName } from "../../icons";
import { cn } from "../../primitives";
import { AfButton, AfCopyButton, AfTag } from "../../ui";

/** 单个架构安装包下载条目。 */
export type AfStoreArtifactItem = {
  arch: "x64" | "arm64" | "universal";
  format: string;
  fileName: string;
  sizeLabel: string;
  buildDate: string;
  sha256: string;
  recommended?: boolean;
};

/** 操作系统平台分组。 */
export type AfStorePlatformGroup = {
  os: "windows" | "macos" | "linux";
  title: string;
  subtitle: string;
  icon: AfIconName;
  artifacts: AfStoreArtifactItem[];
};

/** 历史归档版本条目。 */
export type AfStoreHistoricalRelease = {
  version: string;
  date: string;
  channel: string;
  summary: string;
};

/** 商城公开展示站全平台架构下载矩阵属性。 */
export type AfStorePlatformMatrixProps = {
  version?: string;
  groups?: AfStorePlatformGroup[];
  archives?: AfStoreHistoricalRelease[];
  onDownloadArtifact?: (os: AfStorePlatformGroup["os"], artifact: AfStoreArtifactItem) => void;
  onSelectArchive?: (release: AfStoreHistoricalRelease) => void;
  className?: string;
};

const DEFAULT_PLATFORM_GROUPS: AfStorePlatformGroup[] = [
  {
    os: "windows",
    title: "Windows 10 / 11",
    subtitle: "标准离线安装程序与免安装便携包",
    icon: "grid",
    artifacts: [
      {
        arch: "x64",
        format: ".exe",
        fileName: "CloudDesk-Setup-1.4.2-x64.exe",
        sizeLabel: "68.4 MB",
        buildDate: "2026-11-16",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        recommended: true,
      },
      {
        arch: "arm64",
        format: ".exe",
        fileName: "CloudDesk-Setup-1.4.2-arm64.exe",
        sizeLabel: "65.1 MB",
        buildDate: "2026-11-16",
        sha256: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
      },
    ],
  },
  {
    os: "macos",
    title: "macOS 13+",
    subtitle: "Apple 官方公证签名 DMG 磁盘映像",
    icon: "compass",
    artifacts: [
      {
        arch: "arm64",
        format: ".dmg",
        fileName: "CloudDesk-1.4.2-arm64.dmg",
        sizeLabel: "71.2 MB",
        buildDate: "2026-11-16",
        sha256: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
        recommended: true,
      },
      {
        arch: "x64",
        format: ".dmg",
        fileName: "CloudDesk-1.4.2-x64.dmg",
        sizeLabel: "73.8 MB",
        buildDate: "2026-11-16",
        sha256: "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
      },
    ],
  },
  {
    os: "linux",
    title: "Linux 桌面发行版",
    subtitle: "通用 AppImage 镜像与 Debian 安装包",
    icon: "terminal",
    artifacts: [
      {
        arch: "x64",
        format: ".AppImage",
        fileName: "CloudDesk-1.4.2-x86_64.AppImage",
        sizeLabel: "74.0 MB",
        buildDate: "2026-11-16",
        sha256: "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
        recommended: true,
      },
      {
        arch: "arm64",
        format: ".deb",
        fileName: "cloud-desk_1.4.2_arm64.deb",
        sizeLabel: "62.9 MB",
        buildDate: "2026-11-16",
        sha256: "7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451",
      },
    ],
  },
];

const DEFAULT_ARCHIVES: AfStoreHistoricalRelease[] = [
  {
    version: "1.4.1",
    date: "2026-11-02",
    channel: "正式版",
    summary: "修复多显示器不同缩放比例切换时的边缘悬浮球对齐偏移",
  },
  {
    version: "1.4.0",
    date: "2026-10-18",
    channel: "正式版",
    summary: "全新内置应用商城、断点续传下载队列与多扩展协作机制上线",
  },
  {
    version: "1.3.6",
    date: "2026-09-29",
    channel: "长期支持",
    summary: "长期支持归档版 · 支持旧版配置文件自动无损迁移",
  },
];

/**
 * 商城公开展示站全平台架构下载矩阵（100% Flexbox 三栏响应式卡片、`SHA-256` 一键复制与 `<details>` 平滑展开历史归档抽屉）。
 */
export function AfStorePlatformMatrix({
  version = "1.4.2",
  groups = DEFAULT_PLATFORM_GROUPS,
  archives = DEFAULT_ARCHIVES,
  onDownloadArtifact,
  onSelectArchive,
  className,
}: AfStorePlatformMatrixProps = {}) {
  return (
    <section className={cn("af-store-matrix", className)} aria-label="全平台安装包矩阵">
      <div className="af-store-matrix__head">
        <div>
          <h3>全平台架构安装包与校验清单</h3>
          <p>当前发行版本 v{version} · 请在离线部署前核对 SHA-256 指纹</p>
        </div>
        <AfTag tone="success" dot size="sm">
          双架构同步构建
        </AfTag>
      </div>

      <div className="af-store-matrix__cards">
        {groups.map((group) => (
          <div key={group.os} className="af-store-matrix__card">
            <div className="af-store-matrix__card-head">
              <span className="af-store-matrix__os-icon" aria-hidden="true">
                <AfIcon name={group.icon} size={16} />
              </span>
              <div className="af-store-matrix__os-titles">
                <strong>{group.title}</strong>
                <span>{group.subtitle}</span>
              </div>
            </div>

            <div className="af-store-matrix__artifacts" data-af-hover-list="wash">
              {group.artifacts.map((art) => (
                <div key={`${group.os}-${art.arch}-${art.format}`} data-af-hover-item className="af-store-matrix__artifact">
                  <div className="af-store-matrix__art-top">
                    <div className="af-store-matrix__art-badges">
                      <code className="af-pj-codechip">{art.arch}</code>
                      <span className="af-store-matrix__fmt">{art.format}</span>
                      {art.recommended ? (
                        <AfTag tone="accent" size="sm">
                          推荐
                        </AfTag>
                      ) : null}
                    </div>
                    <AfButton
                      size="xs"
                      variant={art.recommended ? "primary" : "secondary"}
                      icon="download"
                      onClick={() => onDownloadArtifact?.(group.os, art)}
                    >
                      {art.sizeLabel}
                    </AfButton>
                  </div>

                  <div className="af-store-matrix__art-meta">
                    <span>{art.buildDate}</span>
                    <span className="af-store-matrix__sha-box">
                      <code>SHA-256: {art.sha256.slice(0, 12)}…</code>
                      <AfCopyButton
                        size="sm"
                        text={art.sha256}
                        label={`复制 ${group.title} ${art.arch} SHA-256`}
                      />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {archives.length > 0 ? (
        <details className="af-store-matrix__archive">
          <summary>
            <AfIcon name="clock" size={13} />
            <span>历史归档版本下载 ({archives.length} 个旧版本)</span>
            <AfIcon name="chevronDown" size={12} />
          </summary>
          <div className="af-store-matrix__archive-list" data-af-hover-list="wash">
            {archives.map((rel) => (
              <div key={rel.version} className="af-store-matrix__archive-row" data-af-hover-item>
                <div className="af-store-matrix__archive-main">
                  <code className="af-pj-codechip">v{rel.version}</code>
                  <AfTag tone="neutral" size="sm">
                    {rel.channel}
                  </AfTag>
                  <span className="af-store-matrix__archive-date">{rel.date}</span>
                  <span className="af-store-matrix__archive-note">{rel.summary}</span>
                </div>
                <AfButton size="xs" variant="ghost" icon="download" onClick={() => onSelectArchive?.(rel)}>
                  获取归档
                </AfButton>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
