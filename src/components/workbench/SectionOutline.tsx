import { useState, type RefObject } from "react";
import {
  AfButton,
  AfIcon,
  AfIconButton,
  AfInput,
  AfTag,
  cn,
  useControllableState,
  useSortableList,
} from "../../ui";

export interface AfOutlineSectionItem {
  id: string;
  title: string;
  entryCount: number;
  visible: boolean;
  /** 是否允许删除（核心必填章节可设 `false`）。 */
  removable?: boolean;
}

export interface AfSectionOutlineProps {
  /** 大纲章节列表。 */
  sections?: AfOutlineSectionItem[];
  defaultSections?: AfOutlineSectionItem[];
  onSectionsChange?: (next: AfOutlineSectionItem[]) => void;
  /** 当前选中定位的章节 ID。 */
  activeSectionId?: string;
  defaultActiveSectionId?: string;
  onSelectSection?: (section: AfOutlineSectionItem) => void;
  className?: string;
}

const DEFAULT_SECTIONS: AfOutlineSectionItem[] = [
  { id: "sec-basic", title: "个人基本信息", entryCount: 1, visible: true, removable: false },
  { id: "sec-exp", title: "核心工作经历", entryCount: 3, visible: true, removable: false },
  { id: "sec-proj", title: "代表性项目经历", entryCount: 4, visible: true, removable: true },
  { id: "sec-edu", title: "教育背景与证书", entryCount: 2, visible: true, removable: false },
  { id: "sec-skill", title: "专业技能与开源", entryCount: 6, visible: true, removable: true },
  { id: "sec-award", title: "竞赛与荣誉奖项", entryCount: 2, visible: false, removable: true },
];

/**
 * 文档编排工作台 · 指针捕获拖拽章节大纲树（`P3-3`）：
 * - 直接复用 `useSortableList` 实现 `200ms var(--af-ease)` 兄弟弹簧让位与 `Alt + ArrowUp/Down` 键盘调序；
 * - 外层采用 `<div role="button" tabIndex={0}>`，彻底规避 `<button>` 嵌套 `<button>`，支持显隐切换、行内改名与新增自定义章节。
 */
export function AfSectionOutline({
  sections: sectionsProp,
  defaultSections = DEFAULT_SECTIONS,
  onSectionsChange,
  activeSectionId: activeProp,
  defaultActiveSectionId,
  onSelectSection,
  className,
}: AfSectionOutlineProps = {}) {
  const [sections, setSections] = useControllableState<AfOutlineSectionItem[]>({
    value: sectionsProp,
    defaultValue: defaultSections,
    onChange: onSectionsChange,
  });

  const [activeId, setActiveId] = useControllableState<string>({
    value: activeProp,
    defaultValue: defaultActiveSectionId ?? sections[0]?.id ?? "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const sortable = useSortableList({
    items: sections,
    getKey: (s) => s.id,
    onReorder: (next) => setSections(next),
  });

  const toggleVisible = (id: string) => {
    setSections(
      sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
    );
  };

  const commitRename = (id: string) => {
    const trimmed = draftTitle.trim();
    if (trimmed) {
      setSections(sections.map((s) => (s.id === id ? { ...s, title: trimmed } : s)));
    }
    setEditingId(null);
  };

  const handleAddSection = () => {
    const idx = sections.length + 1;
    const created: AfOutlineSectionItem = {
      id: `sec-custom-${Date.now()}`,
      title: `自定义模块 #${idx}`,
      entryCount: 0,
      visible: true,
      removable: true,
    };
    setSections([...sections, created]);
    setActiveId(created.id);
    onSelectSection?.(created);
  };

  return (
    <aside className={cn("af-sec-outline", className)} aria-label="简历文档章节大纲">
      <div className="af-sec-outline__head">
        <strong>章节模块大纲</strong>
        <AfTag tone="neutral" size="sm">
          显示 {sections.filter((s) => s.visible).length}/{sections.length}
        </AfTag>
      </div>

      <div
        ref={sortable.listRef as RefObject<HTMLDivElement>}
        className="af-sec-outline__list"
        data-af-hover-list="hover"
        role="group"
        aria-label="拖拽调整章节排版顺序"
      >
        {sections.map((sec, idx) => {
          const itemProps = sortable.getItemProps(sec, idx);
          const selected = sec.id === activeId;
          const isEditing = editingId === sec.id;

          return (
            <div
              key={sec.id}
              data-af-hover-item
              {...itemProps}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              data-section-id={sec.id}
              data-selected={selected ? "true" : undefined}
              data-muted={!sec.visible ? "true" : undefined}
              className="af-sec-outline__row"
              onClick={() => {
                setActiveId(sec.id);
                onSelectSection?.(sec);
              }}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                itemProps.onKeyDown(e);
                if (!e.defaultPrevented && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setActiveId(sec.id);
                  onSelectSection?.(sec);
                }
              }}
            >
              <span className="af-sec-outline__grip" aria-hidden="true">
                <AfIcon name="grip" size={13} />
              </span>

              <div className="af-sec-outline__main">
                {isEditing ? (
                  <div data-no-drag="true" onClick={(e) => e.stopPropagation()}>
                    <AfInput
                      size="sm"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onBlur={() => commitRename(sec.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(sec.id);
                        else if (e.key === "Escape") setEditingId(null);
                      }}
                      aria-label="修改章节标题"
                    />
                  </div>
                ) : (
                  <>
                    <strong>{sec.title}</strong>
                    <span>
                      {sec.entryCount} 条记录{!sec.visible ? " · 已隐藏" : ""}
                    </span>
                  </>
                )}
              </div>

              <div
                className="af-sec-outline__ops"
                data-no-drag="true"
                onClick={(e) => e.stopPropagation()}
              >
                <AfIconButton
                  size="sm"
                  variant="ghost"
                  icon={sec.visible ? "eye" : "eyeOff"}
                  aria-label={sec.visible ? `隐藏「${sec.title}」` : `显示「${sec.title}」`}
                  onClick={() => toggleVisible(sec.id)}
                />
                <AfIconButton
                  size="sm"
                  variant="ghost"
                  icon="pencil"
                  aria-label={`重命名「${sec.title}」`}
                  onClick={() => {
                    setEditingId(sec.id);
                    setDraftTitle(sec.title);
                  }}
                />
                {sec.removable ? (
                  <AfIconButton
                    size="sm"
                    variant="ghost"
                    icon="trash"
                    aria-label={`删除「${sec.title}」`}
                    onClick={() => setSections(sections.filter((s) => s.id !== sec.id))}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {sortable.ghostPortal}

      <div className="af-sec-outline__foot">
        <AfButton
          size="sm"
          variant="secondary"
          icon="plus"
          onClick={handleAddSection}
        >
          添加自定义章节
        </AfButton>
      </div>
    </aside>
  );
}
