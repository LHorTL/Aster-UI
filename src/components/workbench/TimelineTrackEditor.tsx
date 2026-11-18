import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  AfButton,
  AfIcon,
  AfIconButton,
  AfSwitch,
  AfTag,
  cn,
  useControllableState,
  usePointerScrub,
} from "../../ui";

export type AfTimelineTrackKind = "video" | "subtitle" | "audio";

export interface AfTimelineClipItem {
  id: string;
  trackId: string;
  title: string;
  startSec: number;
  endSec: number;
  tone?: "accent" | "success" | "warning";
}

export interface AfTimelineTrackItem {
  id: string;
  name: string;
  kind: AfTimelineTrackKind;
  muted?: boolean;
  hidden?: boolean;
  locked?: boolean;
}

export interface AfTimelineTrackEditorProps {
  /** 轨道元数据列表。 */
  tracks?: AfTimelineTrackItem[];
  defaultTracks?: AfTimelineTrackItem[];
  onTracksChange?: (tracks: AfTimelineTrackItem[]) => void;
  /** 片段数组。 */
  clips?: AfTimelineClipItem[];
  defaultClips?: AfTimelineClipItem[];
  onClipsChange?: (clips: AfTimelineClipItem[]) => void;
  /** 时间轴总时长（秒，默认 `20`）。 */
  durationSec?: number;
  /** 当前播放头位置（秒）。 */
  currentTime?: number;
  defaultCurrentTime?: number;
  onCurrentTimeChange?: (sec: number) => void;
  /** 每秒对应的水平像素宽度（默认 `44`）。 */
  pixelsPerSecond?: number;
  defaultPixelsPerSecond?: number;
  onPixelsPerSecondChange?: (pps: number) => void;
  /** 是否开启 `6px` 边缘磁吸对齐（默认 `true`）。 */
  snapEnabled?: boolean;
  defaultSnapEnabled?: boolean;
  onSnapEnabledChange?: (enabled: boolean) => void;
  className?: string;
}

const DEFAULT_TRACKS: AfTimelineTrackItem[] = [
  { id: "trk-v1", name: "V1 · 主画面轨", kind: "video" },
  { id: "trk-s1", name: "S1 · 双语字幕轨", kind: "subtitle" },
  { id: "trk-a1", name: "A1 · 降噪人声轨", kind: "audio" },
];

const DEFAULT_CLIPS: AfTimelineClipItem[] = [
  { id: "clip-1", trackId: "trk-v1", title: "片头产品演示.mp4", startSec: 0, endSec: 6.5, tone: "accent" },
  { id: "clip-2", trackId: "trk-v1", title: "桌面多窗口切换特写.mp4", startSec: 6.5, endSec: 14.5, tone: "accent" },
  { id: "clip-3", trackId: "trk-s1", title: "中英对齐字幕 #01–#08", startSec: 0.8, endSec: 12.2, tone: "warning" },
  { id: "clip-4", trackId: "trk-a1", title: "AI 配音旁白 · 48kHz.wav", startSec: 0.5, endSec: 15.0, tone: "success" },
];

export function formatTimecode30Fps(sec: number): string {
  const safe = Math.max(0, sec);
  const whole = Math.floor(safe);
  const frames = Math.floor((safe - whole) * 30);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  return [hrs, m, secs, frames].map((n) => String(n).padStart(2, "0")).join(":");
}

/**
 * 多媒体非线性剪辑多轨时间轴工作台（`P3-2`）：
 * - **100% Flexbox 布局**（零 CSS Grid）：左列固定宽轨道控制头（静音/隐藏/锁定），右列同步横向滚动标尺与多轨槽；
 * - 顶部时间码读数与标尺均支持 `usePointerScrub` 无极擦洗播放头；
 * - 片段块支持 `setPointerCapture` 拖拽移位、左右 `6px` 热区入出点裁剪（Trim），靠近相邻片段边缘或播放头 `<= 6px` 自动磁吸并点亮 `1px` 强调色对齐线。
 */
export function AfTimelineTrackEditor({
  tracks: tracksProp,
  defaultTracks = DEFAULT_TRACKS,
  onTracksChange,
  clips: clipsProp,
  defaultClips = DEFAULT_CLIPS,
  onClipsChange,
  durationSec = 18,
  currentTime: timeProp,
  defaultCurrentTime = 6.5,
  onCurrentTimeChange,
  pixelsPerSecond: ppsProp,
  defaultPixelsPerSecond = 44,
  onPixelsPerSecondChange,
  snapEnabled: snapProp,
  defaultSnapEnabled = true,
  onSnapEnabledChange,
  className,
}: AfTimelineTrackEditorProps = {}) {
  const [tracks, setTracks] = useControllableState<AfTimelineTrackItem[]>({
    value: tracksProp,
    defaultValue: defaultTracks,
    onChange: onTracksChange,
  });

  const [clips, setClips] = useControllableState<AfTimelineClipItem[]>({
    value: clipsProp,
    defaultValue: defaultClips,
    onChange: onClipsChange,
  });

  const [currentTime, setCurrentTime] = useControllableState<number>({
    value: timeProp,
    defaultValue: defaultCurrentTime,
    onChange: onCurrentTimeChange,
  });

  const [snapEnabled, setSnapEnabled] = useControllableState<boolean>({
    value: snapProp,
    defaultValue: defaultSnapEnabled,
    onChange: onSnapEnabledChange,
  });

  const [pps, setPps] = useControllableState<number>({
    value: ppsProp,
    defaultValue: defaultPixelsPerSecond,
    onChange: onPixelsPerSecondChange,
  });
  const [playing, setPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string>(clips[0]?.id ?? "");
  const [snapGuideSec, setSnapGuideSec] = useState<number | null>(null);
  const rulerScrubbingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || typeof window === "undefined") return;
    const id = window.setInterval(() => {
      setCurrentTime((prev) => {
        const next = Math.round((prev + 1 / 30) * 100) / 100;
        if (next >= durationSec) {
          setPlaying(false);
          return durationSec;
        }
        return next;
      });
    }, 33);
    return () => window.clearInterval(id);
  }, [playing, durationSec, setCurrentTime]);

  const scrub = usePointerScrub({
    value: Math.round(currentTime * 100) / 100,
    min: 0,
    max: durationSec,
    step: 0.1,
    pixelsPerStep: 4,
    onChange: (next) => setCurrentTime(next),
  });

  const dragSessionRef = useRef<{
    pointerId: number;
    clipId: string;
    mode: "move" | "trim-start" | "trim-end";
    startClientX: number;
    originStart: number;
    originEnd: number;
  } | null>(null);

  const snapCandidates = useMemo(() => {
    const pts = new Set<number>([0, currentTime, durationSec]);
    for (const c of clips) {
      pts.add(c.startSec);
      pts.add(c.endSec);
    }
    return Array.from(pts);
  }, [clips, currentTime, durationSec]);

  const trySnap = (rawSec: number, excludeClipId: string): { sec: number; snappedTo: number | null } => {
    if (!snapEnabled) return { sec: rawSec, snappedTo: null };
    const snapToleranceSec = 6 / pps;
    let best: number | null = null;
    let bestDiff = snapToleranceSec + 0.001;

    const candidates = [0, currentTime, durationSec];
    for (const c of clips) {
      if (c.id === excludeClipId) continue;
      candidates.push(c.startSec, c.endSec);
    }
    for (const pt of candidates) {
      const diff = Math.abs(rawSec - pt);
      if (diff <= snapToleranceSec && diff < bestDiff) {
        bestDiff = diff;
        best = pt;
      }
    }
    return best !== null ? { sec: best, snappedTo: best } : { sec: rawSec, snappedTo: null };
  };

  const toggleTrackProp = (trackId: string, field: "muted" | "hidden" | "locked") => {
    setTracks(
      tracks.map((t) => (t.id === trackId ? { ...t, [field]: !t[field] } : t)),
    );
  };

  const startClipDrag = (
    clip: AfTimelineClipItem,
    mode: "move" | "trim-start" | "trim-end",
    locked: boolean | undefined,
    e: ReactPointerEvent<HTMLElement>,
  ) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);
    if (locked) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore synthetic events
    }
    dragSessionRef.current = {
      pointerId: e.pointerId,
      clipId: clip.id,
      mode,
      startClientX: e.clientX,
      originStart: clip.startSec,
      originEnd: clip.endSec,
    };
  };

  const handleClipPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const s = dragSessionRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const deltaSec = (e.clientX - s.startClientX) / pps;
    const minLen = 0.4;

    if (s.mode === "move") {
      const len = s.originEnd - s.originStart;
      const rawStart = Math.max(0, Math.min(durationSec - len, s.originStart + deltaSec));
      const snapStart = trySnap(rawStart, s.clipId);
      const snapEnd = trySnap(rawStart + len, s.clipId);
      const startDiff = snapStart.snappedTo !== null ? Math.abs(rawStart - snapStart.snappedTo) : Infinity;
      const endDiff = snapEnd.snappedTo !== null ? Math.abs(rawStart + len - snapEnd.snappedTo) : Infinity;

      let resolvedStart = rawStart;
      let guide: number | null = null;
      if (startDiff <= endDiff && snapStart.snappedTo !== null) {
        resolvedStart = snapStart.sec;
        guide = snapStart.snappedTo;
      } else if (snapEnd.snappedTo !== null) {
        resolvedStart = Math.max(0, Math.min(durationSec - len, snapEnd.sec - len));
        guide = snapEnd.snappedTo;
      }

      const finalStart = Math.round(resolvedStart * 100) / 100;
      const finalEnd = Math.round((finalStart + len) * 100) / 100;
      setSnapGuideSec(guide);
      setClips(
        clips.map((c) =>
          c.id === s.clipId ? { ...c, startSec: finalStart, endSec: finalEnd } : c,
        ),
      );
    } else if (s.mode === "trim-start") {
      const rawStart = Math.max(0, Math.min(s.originEnd - minLen, s.originStart + deltaSec));
      const snapped = trySnap(rawStart, s.clipId);
      const finalStart = Math.min(s.originEnd - minLen, Math.round(snapped.sec * 100) / 100);
      setSnapGuideSec(snapped.snappedTo);
      setClips(
        clips.map((c) => (c.id === s.clipId ? { ...c, startSec: finalStart } : c)),
      );
    } else {
      const rawEnd = Math.min(durationSec, Math.max(s.originStart + minLen, s.originEnd + deltaSec));
      const snapped = trySnap(rawEnd, s.clipId);
      const finalEnd = Math.max(s.originStart + minLen, Math.round(snapped.sec * 100) / 100);
      setSnapGuideSec(snapped.snappedTo);
      setClips(
        clips.map((c) => (c.id === s.clipId ? { ...c, endSec: finalEnd } : c)),
      );
    }
  };

  const handleClipPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const s = dragSessionRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    dragSessionRef.current = null;
    setSnapGuideSec(null);
  };

  const totalWidthPx = Math.max(520, Math.ceil(durationSec * pps));
  const tickSeconds = useMemo(() => {
    const arr: number[] = [];
    for (let s = 0; s <= durationSec; s += 2) arr.push(s);
    return arr;
  }, [durationSec]);

  void snapCandidates;

  return (
    <section className={cn("af-nle-timeline", className)} aria-label="非线性多轨剪辑时间轴">
      {/* 顶部播放传输与磁吸缩放栏 */}
      <div className="af-nle-timeline__bar">
        <div className="af-nle-timeline__transport">
          <AfIconButton
            size="sm"
            variant="secondary"
            icon={playing ? "pause" : "play"}
            aria-label={playing ? "暂停预览" : "播放预览"}
            onClick={() => setPlaying((p) => !p)}
          />
          <div {...scrub.scrubProps} className="af-nle-timeline__timecode" title="水平拖拽擦洗时间码">
            <span>TC</span>
            <strong>{formatTimecode30Fps(currentTime)}</strong>
          </div>
          <AfTag tone="neutral" size="sm">
            30 FPS · 总长 {durationSec}s
          </AfTag>
        </div>

        <div className="af-nle-timeline__tools">
          <label className="af-nle-timeline__snap-toggle">
            <AfSwitch
              size="sm"
              checked={snapEnabled}
              onCheckedChange={setSnapEnabled}
              aria-label="启用自动吸附对齐"
            />
            <span>自动吸附对齐</span>
          </label>

          <div className="af-nle-timeline__zoom">
            <AfIconButton
              size="sm"
              variant="ghost"
              icon="zoomOut"
              aria-label="缩小时间轴刻度"
              onClick={() => setPps((v) => Math.max(24, v - 8))}
            />
            <span>{pps} px/s</span>
            <AfIconButton
              size="sm"
              variant="ghost"
              icon="zoomIn"
              aria-label="放大时间轴刻度"
              onClick={() => setPps((v) => Math.min(96, v + 8))}
            />
          </div>
        </div>
      </div>

      {/* 主体：左列固定轨道控制头 + 右列横向同步滚动标尺与多轨片段 */}
      <div className="af-nle-timeline__body">
        <div className="af-nle-timeline__headers">
          <div className="af-nle-timeline__corner">轨道控制 ({tracks.length})</div>
          {tracks.map((trk) => (
            <div
              key={trk.id}
              className="af-nle-timeline__trk-head"
              data-locked={trk.locked ? "true" : undefined}
            >
              <div className="af-nle-timeline__trk-title">
                <AfIcon
                  name={
                    trk.kind === "video"
                      ? "play"
                      : trk.kind === "subtitle"
                        ? "translate"
                        : "speaker"
                  }
                  size={12}
                />
                <strong>{trk.name}</strong>
              </div>
              <div className="af-nle-timeline__trk-btns">
                <button
                  type="button"
                  className="af-nle-timeline__trk-btn"
                  data-active={trk.muted ? "true" : undefined}
                  aria-label={`${trk.name} 静音开关`}
                  onClick={() => toggleTrackProp(trk.id, "muted")}
                >
                  M
                </button>
                <button
                  type="button"
                  className="af-nle-timeline__trk-btn"
                  data-active={trk.hidden ? "true" : undefined}
                  aria-label={`${trk.name} 显隐开关`}
                  onClick={() => toggleTrackProp(trk.id, "hidden")}
                >
                  <AfIcon name={trk.hidden ? "eyeOff" : "eye"} size={11} />
                </button>
                <button
                  type="button"
                  className="af-nle-timeline__trk-btn"
                  data-active={trk.locked ? "true" : undefined}
                  aria-label={`${trk.name} 锁定开关`}
                  onClick={() => toggleTrackProp(trk.id, "locked")}
                >
                  <AfIcon name={trk.locked ? "lock" : "unlock"} size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="af-nle-timeline__scroll">
          <div className="af-nle-timeline__stage" style={{ width: totalWidthPx }}>
            {/* 顶部可连续擦洗时间码标尺 */}
            <div
              className="af-nle-timeline__ruler"
              onPointerDown={(e) => {
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // ignore synthetic events
                }
                rulerScrubbingRef.current = e.pointerId;
                const r = e.currentTarget.getBoundingClientRect();
                const sec = Math.max(0, Math.min(durationSec, (e.clientX - r.left) / pps));
                setCurrentTime(Math.round(sec * 100) / 100);
              }}
              onPointerMove={(e) => {
                if (rulerScrubbingRef.current !== e.pointerId) return;
                const r = e.currentTarget.getBoundingClientRect();
                const sec = Math.max(0, Math.min(durationSec, (e.clientX - r.left) / pps));
                setCurrentTime(Math.round(sec * 100) / 100);
              }}
              onPointerUp={(e) => {
                if (rulerScrubbingRef.current !== e.pointerId) return;
                try {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                } catch {
                  // ignore
                }
                rulerScrubbingRef.current = null;
              }}
              onPointerCancel={(e) => {
                if (rulerScrubbingRef.current !== e.pointerId) return;
                rulerScrubbingRef.current = null;
              }}
            >
              {tickSeconds.map((sec) => (
                <span
                  key={sec}
                  className="af-nle-timeline__tick"
                  style={{ left: sec * pps }}
                >
                  <em>00:{String(sec).padStart(2, "0")}</em>
                </span>
              ))}
            </div>

            {/* 轨道槽与可拖拽/入出点裁剪片段 */}
            <div className="af-nle-timeline__lanes">
              {tracks.map((trk) => {
                const trackClips = clips.filter((c) => c.trackId === trk.id);
                return (
                  <div
                    key={trk.id}
                    className="af-nle-timeline__lane"
                    data-hidden={trk.hidden ? "true" : undefined}
                    data-locked={trk.locked ? "true" : undefined}
                  >
                    {trackClips.map((clip) => {
                      const leftPx = clip.startSec * pps;
                      const widthPx = Math.max(22, (clip.endSec - clip.startSec) * pps);
                      const selected = clip.id === selectedClipId;
                      return (
                        <div
                          key={clip.id}
                          role="button"
                          tabIndex={0}
                          data-clip-id={clip.id}
                          data-start={clip.startSec}
                          data-end={clip.endSec}
                          data-tone={clip.tone ?? "accent"}
                          data-selected={selected ? "true" : undefined}
                          className="af-nle-timeline__clip"
                          style={{ left: leftPx, width: widthPx }}
                          onPointerDown={(e) => startClipDrag(clip, "move", trk.locked, e)}
                          onPointerMove={handleClipPointerMove}
                          onPointerUp={handleClipPointerUp}
                          onPointerCancel={handleClipPointerUp}
                          onKeyDown={(e) => {
                            if (e.target !== e.currentTarget || trk.locked) return;
                            const len = clip.endSec - clip.startSec;
                            if (e.key === "ArrowRight") {
                              e.preventDefault();
                              const nextStart = Math.min(durationSec - len, clip.startSec + 0.5);
                              setClips(
                                clips.map((c) =>
                                  c.id === clip.id
                                    ? {
                                        ...c,
                                        startSec: Math.round(nextStart * 100) / 100,
                                        endSec: Math.round((nextStart + len) * 100) / 100,
                                      }
                                    : c,
                                ),
                              );
                            } else if (e.key === "ArrowLeft") {
                              e.preventDefault();
                              const nextStart = Math.max(0, clip.startSec - 0.5);
                              setClips(
                                clips.map((c) =>
                                  c.id === clip.id
                                    ? {
                                        ...c,
                                        startSec: Math.round(nextStart * 100) / 100,
                                        endSec: Math.round((nextStart + len) * 100) / 100,
                                      }
                                    : c,
                                ),
                              );
                            }
                          }}
                        >
                          {/* 左侧 6px 入点裁剪手柄 */}
                          <span
                            data-trim="start"
                            className="af-nle-timeline__trim af-nle-timeline__trim--start"
                            onPointerDown={(e) => startClipDrag(clip, "trim-start", trk.locked, e)}
                            onPointerMove={handleClipPointerMove}
                            onPointerUp={handleClipPointerUp}
                            onPointerCancel={handleClipPointerUp}
                          />

                          <div className="af-nle-timeline__clip-label">
                            <strong>{clip.title}</strong>
                            <span>{(clip.endSec - clip.startSec).toFixed(1)}s</span>
                          </div>

                          {/* 右侧 6px 出点裁剪手柄 */}
                          <span
                            data-trim="end"
                            className="af-nle-timeline__trim af-nle-timeline__trim--end"
                            onPointerDown={(e) => startClipDrag(clip, "trim-end", trk.locked, e)}
                            onPointerMove={handleClipPointerMove}
                            onPointerUp={handleClipPointerUp}
                            onPointerCancel={handleClipPointerUp}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* 磁吸对齐 1px 强调色参考线 */}
            {snapGuideSec !== null ? (
              <div
                data-snap-guide="true"
                className="af-nle-timeline__snap-line"
                style={{ left: snapGuideSec * pps }}
              />
            ) : null}

            {/* 贯穿全轨播放头竖线 */}
            <div
              className="af-nle-timeline__playhead"
              style={{ left: currentTime * pps }}
              aria-hidden="true"
            >
              <span className="af-nle-timeline__playhead-cap" />
            </div>
          </div>
        </div>
      </div>

      <div className="af-nle-timeline__foot">
        <span>拖拽片段可调整时间位置，拖动片段左右两侧边缘可修剪起止时长</span>
        <AfButton
          size="sm"
          variant="ghost"
          icon="undo"
          onClick={() => setClips(DEFAULT_CLIPS)}
        >
          恢复初始轨道
        </AfButton>
      </div>
    </section>
  );
}
