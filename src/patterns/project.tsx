import "./project.css";

/* Pro Agent & Workspace Blocks */
export {
  AfAgentGallery,
  AfAgentGalleryPattern,
  AgentGallery,
  DEFAULT_GALLERY_ITEMS,
  type AfAgentGalleryProps,
  type AfAgentGalleryPatternProps,
  type GalleryItem,
  type GalleryItemMetric,
} from "../components/project/AgentGallery";
export {
  AfAppDirectory,
  AfAppDirectoryPattern,
  AppDirectory,
  DEFAULT_APP_CATEGORIES,
  DEFAULT_DIRECTORY_APPS,
  type AfAppDirectoryProps,
  type AfAppDirectoryPatternProps,
  type AppDirectoryCategory,
  type AppDirectoryItem,
} from "../components/project/AppDirectory";
export {
  AfClientContext,
  AfClientContextPattern,
  ClientContext,
  DEFAULT_CONTEXT_CLIENTS,
  type AfClientContextProps,
  type AfClientContextPatternProps,
  type ClientFileAttachment,
  type ClientKpiItem,
  type ClientReportItem,
  type ContextClient,
  type ContextEntry,
} from "../components/project/ClientContext";
export {
  AfLiveSession,
  AfLiveSessionPattern,
  LiveSession,
  type AfLiveSessionProps,
  type AfLiveSessionPatternProps,
  type SessionContextConfig,
  type SessionContextPart,
  type SessionStep,
} from "../components/project/LiveSession";
export {
  AfMissionControl,
  AfMissionControlPattern,
  MissionControl,
  DEFAULT_MISSION_AGENTS,
  DEFAULT_MISSION_EVENTS,
  type AfMissionControlProps,
  type AfMissionControlPatternProps,
  type MissionAgent,
  type MissionEvent,
  type MissionFilter,
  type MissionStatus,
} from "../components/project/MissionControl";
export {
  AfMissionTimeline,
  AfMissionTimelinePattern,
  MissionTimeline,
  DEFAULT_TIMELINE_AGENTS,
  type AfMissionTimelineProps,
  type AfMissionTimelinePatternProps,
  type MissionLaneTask,
  type MissionTimelineAgent,
} from "../components/project/MissionTimeline";
export {
  AfRunInspector,
  AfRunInspectorPattern,
  RunInspector,
  DEFAULT_RUN_SPAN,
  DEFAULT_SUPERVISOR_SPAN,
  type AfRunInspectorProps,
  type AfRunInspectorPatternProps,
  type RunSpan,
  type RunSpanKind,
  type RunSpanStatus,
} from "../components/project/RunInspector";
export {
  AfTaskBoard,
  AfTaskBoardPattern,
  TaskBoard,
  DEFAULT_BOARD_LABELS,
  DEFAULT_BOARD_PEOPLE,
  DEFAULT_BOARD_STATUSES,
  DEFAULT_BOARD_TASKS,
  type AfTaskBoardProps,
  type AfTaskBoardPatternProps,
  type BoardTaskItem,
  type TaskLabelItem,
  type TaskPersonItem,
  type TaskPriority,
  type TaskStatusColumn,
} from "../components/project/TaskBoard";
