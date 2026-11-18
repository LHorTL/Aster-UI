import { useEffect, useId, useRef, useState } from "react";
import type { ClipboardEvent, DragEvent } from "react";
import { AfButton } from "../controls/Button";
import { cn, useControllableState } from "../../primitives";
import {
  type AfDropzoneProps,
  type UploadFile,
  type UploadProgressMeta,
  type UploadStatus,
  uploadKindOf,
} from "../_shared/inputs";

type DroppedFileEntry = {
  file: File;
  relativePath?: string;
};

type WebkitEntryLike = {
  isFile?: boolean;
  isDirectory?: boolean;
  name: string;
  fullPath?: string;
  file?: (ok: (f: File) => void, err?: (e: unknown) => void) => void;
  createReader?: () => {
    readEntries: (ok: (entries: WebkitEntryLike[]) => void, err?: (e: unknown) => void) => void;
  };
};

async function readWebkitEntryRecursive(entry: WebkitEntryLike, prefix = ""): Promise<DroppedFileEntry[]> {
  if (entry.isFile && entry.file) {
    return new Promise<DroppedFileEntry[]>((resolve) => {
      entry.file!(
        (f) => resolve([{ file: f, relativePath: `${prefix}${entry.name}` }]),
        () => resolve([]),
      );
    });
  }
  if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    const children: WebkitEntryLike[] = [];
    while (true) {
      const batch = await new Promise<WebkitEntryLike[]>((resolve) => {
        reader.readEntries((entries) => resolve(entries ?? []), () => resolve([]));
      });
      if (!batch.length) break;
      children.push(...batch);
    }
    const nested = await Promise.all(
      children.map((child) => readWebkitEntryRecursive(child, `${prefix}${entry.name}/`)),
    );
    return nested.flat();
  }
  return [];
}

function isActiveUploadStatus(status: UploadStatus): boolean {
  return status === "hashing" || status === "uploading" || status === "merging";
}

/** Folded-corner document badge SVG (`PDF` left sheet or `PNG` right sheet). */
function DocBadgeSvg({ label, tone }: { label: "PDF" | "PNG"; tone: "pdf" | "png" }) {
  return (
    <svg className="af-in-drop__badge-svg" viewBox="0 0 30 36" fill="none" aria-hidden="true">
      <path
        className="af-in-drop__badge-sheet"
        d="M5 1.5h13.5L26.5 9.5v21a4 4 0 0 1-4 4h-17a4 4 0 0 1-4-4v-25a4 4 0 0 1 4-4Z"
      />
      <path className="af-in-drop__badge-fold" d="M18.5 1.5v5.5a2.5 2.5 0 0 0 2.5 2.5h5.5" />
      <text
        x="14"
        y="27"
        textAnchor="middle"
        className="af-in-drop__badge-text"
        data-tone={tone}
      >
        {label}
      </text>
    </svg>
  );
}

/** Small file row sheet icon SVG matching affectUI `ui-dzc__file`. */
function FileRowSvg() {
  return (
    <svg className="af-in-drop__file-svg" viewBox="0 0 16 16" width={16} height={16} fill="none" aria-hidden="true">
      <path
        className="af-in-drop__file-sheet"
        d="M4 1.75h5.5L13 5.25v8a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 13.25v-10A1.5 1.5 0 0 1 4.5 1.75Z"
      />
      <path className="af-in-drop__file-fold" d="M9.5 1.75v3a.75.75 0 0 0 .75.75H13" />
    </svg>
  );
}

/**
 * Dropzone: three-sheet fan stack (`PDF` + upload tray glyph + `PNG`) that lifts and spreads
 * on hover/drag-over, live upload progress, retry on failure, drawn completion checkmark,
 * and persistent summary footer (`No files yet` when empty).
 */
export function AfDropzone({
  accept,
  maxSize,
  maxSizeMb = 25,
  files: filesProp,
  defaultFiles = [],
  onChange,
  onUpload,
  onCancel,
  allowPaste = true,
  directory = false,
  allowDirectoryDrop = true,
  locale = "en",
  hint,
  autoplay = true,
  disabled = false,
  multiple = true,
  className,
}: AfDropzoneProps = {}) {
  const zh = locale === "zh-CN";
  const effectiveMaxBytes = maxSize ?? maxSizeMb * 1024 * 1024;
  const displayMaxMb = Math.round((effectiveMaxBytes / 1024 / 1024) * 10) / 10;

  const [files, setFiles] = useControllableState<UploadFile[]>({
    value: filesProp,
    defaultValue: defaultFiles,
    onChange,
  });
  const [dragging, setDragging] = useState(false);
  const [dragCount, setDragCount] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const counter = useRef(10);
  const rawFilesRef = useRef<Map<string, File>>(new Map());
  const abortMapRef = useRef<Map<string, AbortController>>(new Map());
  const inputId = useId();

  useEffect(() => {
    const map = abortMapRef.current;
    return () => {
      map.forEach((ctrl) => ctrl.abort());
      map.clear();
    };
  }, []);

  useEffect(() => {
    if (!autoplay || onUpload) return;
    const timer = window.setInterval(() => {
      setFiles((list) => {
        if (!list.some((f) => isActiveUploadStatus(f.status))) return list;
        return list.map((file) => {
          if (!isActiveUploadStatus(file.status)) return file;
          const progress = Math.min(100, file.progress + 9);
          return {
            ...file,
            progress,
            status: progress >= 100 ? "done" : file.status,
            stageText: progress >= 100 ? undefined : file.stageText,
          };
        });
      });
    }, 240);
    return () => window.clearInterval(timer);
  }, [autoplay, onUpload, setFiles]);

  const runCustomUpload = (id: string, rawFile: File, relativePath?: string) => {
    if (!onUpload) return;
    abortMapRef.current.get(id)?.abort();
    const controller = new AbortController();
    abortMapRef.current.set(id, controller);

    onUpload(
      rawFile,
      (pct: number, meta?: UploadProgressMeta) => {
        if (controller.signal.aborted) return;
        const clamped = Math.max(0, Math.min(100, Math.round(pct)));
        setFiles((list) =>
          list.map((f) => {
            if (f.id !== id) return f;
            const nextStatus: UploadStatus =
              meta?.status ?? (clamped >= 100 ? "done" : f.status === "hashing" || f.status === "merging" ? f.status : "uploading");
            return {
              ...f,
              progress: clamped,
              status: nextStatus,
              stageText: meta?.stageText !== undefined ? meta.stageText : nextStatus === "done" ? undefined : f.stageText,
            };
          }),
        );
      },
      { id, signal: controller.signal, relativePath },
    )
      .then(() => {
        if (controller.signal.aborted) return;
        abortMapRef.current.delete(id);
        setFiles((list) =>
          list.map((f) =>
            f.id === id ? { ...f, progress: 100, status: "done", stageText: undefined, error: undefined } : f,
          ),
        );
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        abortMapRef.current.delete(id);
        const message = err instanceof Error ? err.message : zh ? "上传失败 — 点击重试" : "Upload failed — retry";
        setFiles((list) =>
          list.map((f) => (f.id === id ? { ...f, status: "failed", stageText: undefined, error: message } : f)),
        );
      });
  };

  const addFileEntries = (incoming: DroppedFileEntry[]) => {
    if (disabled || !incoming.length) return;
    const accepted = multiple ? incoming : incoming.slice(0, 1);
    const parsed = accepted.map<UploadFile>(({ file, relativePath }) => {
      counter.current += 1;
      const id = `u-${counter.current}`;
      rawFilesRef.current.set(id, file);
      const tooLarge = file.size > effectiveMaxBytes;
      const sizeMb = Math.max(0.1, Math.round((file.size / 1024 / 1024) * 10) / 10);
      const displayName = relativePath || file.name;
      return {
        id,
        name: displayName,
        size: `${sizeMb.toFixed(1)} MB`,
        sizeMb,
        kind: uploadKindOf(file.name),
        progress: tooLarge ? 100 : 0,
        status: tooLarge ? "failed" : "uploading",
        relativePath,
        error: tooLarge
          ? zh
            ? `超出单文件 ${displayMaxMb} MB 限制`
            : `Exceeds ${displayMaxMb} MB limit`
          : undefined,
      };
    });
    setFiles((list) => (multiple ? [...list, ...parsed] : parsed));
    if (onUpload) {
      for (const item of parsed) {
        const raw = rawFilesRef.current.get(item.id);
        if (item.status === "uploading" && raw) {
          runCustomUpload(item.id, raw, item.relativePath);
        }
      }
    }
  };

  const addFiles = (incoming: File[]) => {
    addFileEntries(
      incoming.map((file) => ({
        file,
        relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || undefined,
      })),
    );
  };

  const cancel = (id: string) => {
    const ctrl = abortMapRef.current.get(id);
    if (ctrl) {
      ctrl.abort();
      abortMapRef.current.delete(id);
    }
    let canceledSnapshot: UploadFile | undefined;
    setFiles((list) =>
      list.map((file) => {
        if (file.id !== id) return file;
        const updated: UploadFile = {
          ...file,
          status: "canceled",
          stageText: undefined,
          error: zh ? "已取消" : "Canceled",
        };
        canceledSnapshot = updated;
        return updated;
      }),
    );
    if (canceledSnapshot) {
      onCancel?.(canceledSnapshot);
    }
  };

  const retry = (id: string) => {
    let targetRelPath: string | undefined;
    setFiles((list) =>
      list.map((file) => {
        if (file.id !== id) return file;
        targetRelPath = file.relativePath;
        return { ...file, status: "uploading", progress: 0, stageText: undefined, error: undefined };
      }),
    );
    const raw = rawFilesRef.current.get(id);
    if (onUpload && raw) runCustomUpload(id, raw, targetRelPath);
  };

  const remove = (id: string) => {
    abortMapRef.current.get(id)?.abort();
    abortMapRef.current.delete(id);
    rawFilesRef.current.delete(id);
    setFiles((list) => list.filter((file) => file.id !== id));
  };

  const clearCompleted = () => {
    setFiles((list) => list.filter((file) => file.status !== "done"));
  };

  const handlePaste = (event: ClipboardEvent<HTMLElement>) => {
    if (!allowPaste || disabled) return;
    const dt = event.clipboardData;
    if (!dt) return;
    let pastedFiles: File[] = dt.files && dt.files.length > 0 ? Array.from(dt.files) : [];
    if (pastedFiles.length === 0 && dt.items) {
      pastedFiles = Array.from(dt.items)
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter((f): f is File => Boolean(f));
    }
    if (pastedFiles.length === 0) return;
    event.preventDefault();
    const normalized = pastedFiles.map((file, idx) =>
      file.name
        ? file
        : new File([file], `pasted-${Date.now()}-${idx + 1}.png`, { type: file.type || "image/png" }),
    );
    addFiles(normalized);
  };

  const stats = {
    uploading: files.filter((file) => isActiveUploadStatus(file.status)).length,
    done: files.filter((file) => file.status === "done").length,
    total: files.length,
    totalMb: files.reduce((sum, file) => sum + file.sizeMb, 0),
    doneMb: files.reduce(
      (sum, file) => sum + (file.status === "done" ? file.sizeMb : (file.progress / 100) * file.sizeMb),
      0,
    ),
  };

  const renderFileMeta = (file: UploadFile): string | undefined => {
    if (file.status === "hashing") {
      return file.stageText ?? (zh ? `校验中 · ${file.progress}%` : `Hashing · ${file.progress}%`);
    }
    if (file.status === "merging") {
      return file.stageText ?? (zh ? `正在合并分片 · ${file.progress}%` : `Merging chunks · ${file.progress}%`);
    }
    if (file.status === "uploading") {
      if (file.stageText) return `${file.stageText} · ${file.progress}%`;
      return `${((file.progress / 100) * file.sizeMb).toFixed(1)} / ${file.sizeMb.toFixed(1)} MB · ${
        file.progress >= 80 ? (zh ? "即将完成" : "Almost done") : `${file.progress}%`
      }`;
    }
    if (file.status === "done") {
      return file.size;
    }
    if (file.status === "canceled") {
      return file.error ?? (zh ? "已取消" : "Canceled");
    }
    return file.error;
  };

  return (
    <section className={cn("af-in-drop", className)} onPaste={handlePaste}>
      <div
        className="af-in-drop__area"
        data-dragging={dragging || undefined}
        data-disabled={disabled || undefined}
        onDragEnter={(event) => {
          if (disabled) return;
          event.preventDefault();
          dragDepthRef.current += 1;
          setDragging(true);
          const count = event.dataTransfer?.items?.length ?? 0;
          if (count > 0) setDragCount(count);
        }}
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          if (!dragging) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) {
            setDragging(false);
            setDragCount(0);
          }
        }}
        onDrop={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          dragDepthRef.current = 0;
          setDragging(false);
          setDragCount(0);
          if (disabled) return;
          const fallbackFiles = [...(event.dataTransfer?.files ?? [])];
          const rawItems =
            allowDirectoryDrop && event.dataTransfer?.items ? Array.from(event.dataTransfer.items) : [];
          const entries = rawItems
            .map(
              (it) =>
                (it as unknown as { webkitGetAsEntry?: () => WebkitEntryLike | null }).webkitGetAsEntry?.() ?? null,
            )
            .filter((entry): entry is WebkitEntryLike => entry !== null);

          if (entries.length > 0 && entries.some((entry) => entry.isDirectory)) {
            void Promise.all(entries.map((entry) => readWebkitEntryRecursive(entry))).then((groups) => {
              addFileEntries(groups.flat());
            });
            return;
          }
          addFiles(fallbackFiles);
        }}
      >
        <button
          type="button"
          className="af-in-drop__zone"
          disabled={disabled}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <span className="af-in-drop__fan" aria-hidden="true">
            <span className="af-in-drop__doc" data-kind="pdf">
              <DocBadgeSvg label="PDF" tone="pdf" />
            </span>
            <span className="af-in-drop__doc" data-kind="png">
              <DocBadgeSvg label="PNG" tone="png" />
            </span>
            <span className="af-in-drop__doc" data-kind="center">
              <svg
                className="af-in-drop__upload-glyph"
                viewBox="0 0 24 24"
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.65"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />
              </svg>
            </span>
          </span>
          <span className="af-in-drop__title">
            {dragging ? (
              dragCount > 1 ? (
                zh ? `松开即可上传 ${dragCount} 个文件` : `Release to upload ${dragCount} files`
              ) : zh ? (
                "松开即可上传"
              ) : (
                "Release to upload"
              )
            ) : zh ? (
              <>
                拖拽{directory ? "文件夹" : "文件"}到此处，或 <span className="af-in-drop__browse">点击选择</span>
              </>
            ) : (
              <>
                Drop {directory ? "folders" : "files"} here or <span className="af-in-drop__browse">browse</span>
              </>
            )}
          </span>
          <span className="af-in-drop__sub">
            {hint ??
              (zh
                ? `支持常见文档与压缩包 · 单个文件最大 ${displayMaxMb} MB`
                : `PDF, PNG, JPG and more · up to ${displayMaxMb} MB each`)}
          </span>
        </button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          hidden
          {...(directory ? ({ webkitdirectory: "", directory: "" } as Record<string, string>) : {})}
          onChange={(event) => {
            addFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />

        {files.length > 0 ? (
          <div className="af-in-drop__list" role="list" aria-label="Uploaded files">
            {files.map((file) => {
              const active = isActiveUploadStatus(file.status);
              return (
                <div key={file.id} className="af-in-drop__row" data-status={file.status} role="listitem">
                  <span className="af-in-drop__file-icon" data-kind={file.kind} aria-hidden>
                    <FileRowSvg />
                  </span>
                  <span className="af-in-drop__info">
                    <span className="af-in-drop__name-line">
                      <span className="af-in-drop__name">{file.name}</span>
                      {file.status === "done" ? (
                        <span className="af-in-drop__check" aria-label="Completed">
                          <svg viewBox="0 0 14 14" width={14} height={14} fill="none" aria-hidden="true">
                            <path
                              d="M2.5 7.4L5.6 10.5L11.5 3.8"
                              pathLength={1}
                              stroke="currentColor"
                              strokeWidth={1.75}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      ) : null}
                    </span>
                    <span className="af-in-drop__meta">{renderFileMeta(file)}</span>
                    {file.status !== "done" ? (
                      <span
                        className="af-in-drop__bar"
                        role="progressbar"
                        aria-label={`${file.name} upload progress`}
                        aria-valuenow={file.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span style={{ width: `${file.progress}%` }} />
                      </span>
                    ) : null}
                  </span>
                  <span className="af-in-drop__actions">
                    {active ? (
                      <AfButton
                        size="sm"
                        variant="ghost"
                        className="af-in-drop__cancel"
                        aria-label={`Cancel ${file.name}`}
                        onClick={() => cancel(file.id)}
                      >
                        <svg viewBox="0 0 12 12" width={12} height={12} fill="none" aria-hidden="true">
                          <rect x="2.5" y="2.5" width="7" height="7" rx="1.4" fill="currentColor" />
                        </svg>
                      </AfButton>
                    ) : null}
                    {file.status === "failed" || file.status === "canceled" ? (
                      <AfButton
                        size="sm"
                        variant="ghost"
                        icon="refresh"
                        aria-label={`Retry ${file.name}`}
                        onClick={() => retry(file.id)}
                      />
                    ) : null}
                    <AfButton
                      size="sm"
                      variant="ghost"
                      icon="x"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => remove(file.id)}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <footer className="af-in-drop__foot">
        {files.length === 0 ? (
          <span>{zh ? "暂未选择文件" : "No files yet"}</span>
        ) : (
          <>
            <span className="af-in-drop__summary">
              {stats.uploading > 0
                ? zh
                  ? `正在上传 ${stats.uploading} / ${stats.total}`
                  : `Uploading ${stats.uploading} of ${stats.total}`
                : zh
                  ? `共 ${stats.total} 个文件`
                  : `${stats.total} ${stats.total === 1 ? "file" : "files"}`}{" "}
              · {stats.doneMb.toFixed(1)} / {stats.totalMb.toFixed(1)} MB
            </span>
            {stats.done > 0 ? (
              <button type="button" className="af-in-drop__clear-done" onClick={clearCompleted}>
                {zh ? "清除已完成" : "Clear completed"}
              </button>
            ) : null}
          </>
        )}
      </footer>
    </section>
  );
}

/** Semantic alias of `AfDropzone`. */
export const AfUpload = AfDropzone;
/** Semantic alias of `AfDropzoneProps`. */
export type AfUploadProps = AfDropzoneProps;
