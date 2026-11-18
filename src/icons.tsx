import type { CSSProperties, ComponentType, ReactNode, SVGProps } from "react";
import type { AffectIconKey } from "./model";

/** 16 × 16 线形图标的路径表，统一 1.5px 描边、圆角端点。 */
const paths: Record<AffectIconKey, string> = {
  home: "M2.75 7.25 8 2.75l5.25 4.5v6a.5.5 0 0 1-.5.5H9.5v-3.5h-3v3.5H3.25a.5.5 0 0 1-.5-.5z",
  chart: "M2.75 13.25h10.5M4.75 11V7.5M8 11V4.25M11.25 11V8.75",
  translate: "M2.75 3.75h6M5.75 2.5v1.25M4 3.75c.4 2.6 2.1 4.4 4.25 5.25M7.5 3.75C7.1 6.4 5.3 8.6 2.75 9.5M8.25 13.5l2.5-6 2.5 6M9.1 11.5h3.3",
  store: "M2.75 6 3.6 2.75h8.8L13.25 6M2.75 6v6.75a.5.5 0 0 0 .5.5h9.5a.5.5 0 0 0 .5-.5V6M2.75 6h10.5M6 8.75a2 2 0 0 0 4 0",
  server: "M3.25 2.75h9.5a.5.5 0 0 1 .5.5v3.5a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5v-3.5a.5.5 0 0 1 .5-.5zM3.25 8.75h9.5a.5.5 0 0 1 .5.5v3.5a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5v-3.5a.5.5 0 0 1 .5-.5zM5 5h.01M5 11h.01",
  game: "M5 5.25h6a3 3 0 0 1 2.95 3.55l-.45 2.4a1.5 1.5 0 0 1-2.55.75L9.5 10.5h-3l-1.45 1.45a1.5 1.5 0 0 1-2.55-.75l-.45-2.4A3 3 0 0 1 5 5.25zM5.25 7.25v2M4.25 8.25h2M10.5 8.25h.01",
  message: "M2.75 4.25a1.5 1.5 0 0 1 1.5-1.5h7.5a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H7l-2.75 2.5v-2.5a1.5 1.5 0 0 1-1.5-1.5z",
  file: "M4.25 2.75h4.5l3 3v7a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-9.5a.5.5 0 0 1 .5-.5zM8.75 2.75v3h3M5.75 9h4.5M5.75 11h3",
  proxy: "M8 2.75a5.25 5.25 0 1 0 0 10.5A5.25 5.25 0 0 0 8 2.75zM2.75 8h10.5M8 2.75c1.4 1.5 2 3.25 2 5.25s-.6 3.75-2 5.25C6.6 11.75 6 10 6 8s.6-3.75 2-5.25z",
  settings: "M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 1.75v1.5M8 12.75v1.5M3.6 3.6l1.05 1.05M11.35 11.35l1.05 1.05M1.75 8h1.5M12.75 8h1.5M3.6 12.4l1.05-1.05M11.35 4.65l1.05-1.05",
  search: "M7.25 12.25a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM13.25 13.25 10.8 10.8",
  plus: "M8 3.25v9.5M3.25 8h9.5",
  minus: "M3.25 8h9.5",
  refresh: "M12.9 6.5A5 5 0 0 0 3.6 5.2M3.1 9.5a5 5 0 0 0 9.3 1.3M3.25 2.75v2.75H6M12.75 13.25V10.5H10",
  chevronDown: "M4.75 6.5 8 9.75l3.25-3.25",
  chevronRight: "M6.5 4.75 9.75 8 6.5 11.25",
  check: "M3.75 8.25 6.5 11l5.75-6",
  x: "M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5",
  more: "M3.75 8h.01M8 8h.01M12.25 8h.01",
  sun: "M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 1.75v1M8 13.25v1M14.25 8h-1M2.75 8h-1M12.4 3.6l-.7.7M4.3 11.7l-.7.7M12.4 12.4l-.7-.7M4.3 4.3l-.7-.7",
  moon: "M13 9.6A5.25 5.25 0 0 1 6.4 3a5.25 5.25 0 1 0 6.6 6.6z",
  bell: "M4.25 6.5a3.75 3.75 0 0 1 7.5 0c0 3.25 1.25 4.5 1.25 4.5H3s1.25-1.25 1.25-4.5zM6.75 13.25a1.4 1.4 0 0 0 2.5 0",
  copy: "M5.75 5.75h6a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5v-6a.5.5 0 0 1 .5-.5zM10.25 3.75H4.25a.5.5 0 0 0-.5.5v6",
  trash: "M3.25 4.75h9.5M6.25 4.75V3.25h3.5v1.5M4.5 4.75l.6 8a.5.5 0 0 0 .5.5h4.8a.5.5 0 0 0 .5-.5l.6-8",
  download: "M8 2.75v7.5M5 7.5 8 10.5l3-3M3.25 13.25h9.5",
  sparkle: "M8 2.25c.4 2.9 1.85 4.35 4.75 4.75C9.85 7.4 8.4 8.85 8 11.75 7.6 8.85 6.15 7.4 3.25 7 6.15 6.6 7.6 5.15 8 2.25zM12.25 11v2.5M11 12.25h2.5",
  clock: "M8 13.25A5.25 5.25 0 1 0 8 2.75a5.25 5.25 0 0 0 0 10.5zM8 5.25V8l1.75 1.25",
  square: "M4.25 4.25h7.5v7.5h-7.5z",
  filter: "M2.75 4.25h10.5M4.75 8h6.5M6.75 11.75h2.5",
  sidebar: "M3.25 2.75h9.5a.5.5 0 0 1 .5.5v9.5a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5v-9.5a.5.5 0 0 1 .5-.5zM10 2.75v10.5",
  database: "M8 2.75c2.9 0 5.25.9 5.25 2s-2.35 2-5.25 2-5.25-.9-5.25-2 2.35-2 5.25-2zM2.75 4.75v6.5c0 1.1 2.35 2 5.25 2s5.25-.9 5.25-2v-6.5M2.75 8c0 1.1 2.35 2 5.25 2s5.25-.9 5.25-2",
  calendar: "M3.25 3.75h9.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5v-8.5a.5.5 0 0 1 .5-.5zM2.75 6.75h10.5M5.5 2.25v2.5M10.5 2.25v2.5",
  chevronLeft: "M9.5 4.75 6.25 8l3.25 3.25",
  undo: "M5.25 4.25 2.75 6.75l2.5 2.5M2.75 6.75h6.5a3.25 3.25 0 0 1 0 6.5h-2",
  alert: "M8 2.75 13.5 12.5a.5.5 0 0 1-.43.75H2.93a.5.5 0 0 1-.43-.75zM8 6.5v2.75M8 11.25h.01",
  info: "M8 13.25A5.25 5.25 0 1 0 8 2.75a5.25 5.25 0 0 0 0 10.5zM8 7.5v3M8 5.25h.01",
  folder: "M2.75 4.25a.5.5 0 0 1 .5-.5h3.2l1.3 1.5h5a.5.5 0 0 1 .5.5v6.5a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5z",
  bolt: "M8.75 2.25 3.75 9h4l-.5 4.75 5-6.75h-4z",
  tag: "M2.75 3.25v4.1a.5.5 0 0 0 .15.35l5.4 5.4a.5.5 0 0 0 .7 0l4.1-4.1a.5.5 0 0 0 0-.7l-5.4-5.4a.5.5 0 0 0-.35-.15h-4.1a.5.5 0 0 0-.5.5zM5.5 5.5h.01",
  play: "M5.5 3.25 12.5 8l-7 4.75z",
  pause: "M5.25 3.5v9M10.75 3.5v9",
  stop: "M4.75 4.75h6.5v6.5h-6.5z",
  send: "M2.75 8 13.25 3.5 10.75 12.5 8 8.75zM8 8.75 13.25 3.5",
  paperclip: "M11.5 7.25 7 11.75a2.5 2.5 0 0 1-3.5-3.5l5.25-5.25a2 2 0 0 1 2.75 2.75L6.25 10.75a1.25 1.25 0 0 1-1.75-1.75L9.75 3.75",
  mic: "M8 9.5a2 2 0 0 0 2-2V4.25a2 2 0 1 0-4 0V7.5a2 2 0 0 0 2 2zM3.75 7.5a4.25 4.25 0 0 0 8.5 0M8 11.75v2",
  shield: "M8 2.5 3.25 4.25v3.5c0 3 2 5 4.75 5.75 2.75-.75 4.75-2.75 4.75-5.75v-3.5z",
  lock: "M4.75 7.25h6.5v5.5h-6.5zM5.75 7.25V5.5a2.25 2.25 0 0 1 4.5 0v1.75",
  eye: "M1.75 8s2.25-3.75 6.25-3.75S14.25 8 14.25 8 12 11.75 8 11.75 1.75 8 1.75 8zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  external: "M9.25 2.75h4v4M13.25 2.75 8 8M6.75 3.75h-3a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-3",
  upload: "M8 13.25V5.5M5 8.5 8 5.5l3 3M3.25 2.75h9.5",
  users: "M5.75 7.25a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM2.75 12.75c0-1.8 1.35-3.25 3-3.25s3 1.45 3 3.25M10 5.5a1.75 1.75 0 1 0 0-3.5M10.5 9.75c1.4.2 2.5 1.5 2.5 3",
  layers: "M8 2.75 2.75 5.5 8 8.25l5.25-2.75zM2.75 8.25 8 11l5.25-2.75M2.75 11 8 13.75 13.25 11",
  target: "M8 13.25A5.25 5.25 0 1 0 8 2.75a5.25 5.25 0 0 0 0 10.5zM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM2.75 8h1.5M11.75 8h1.5M8 2.75v1.5M8 11.75v1.5",
  gitBranch: "M5 4.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM5 14.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM11.5 8.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM5 4.25v7.5M5 8.5h2.25a2.75 2.75 0 0 0 2.75-2.75",
  terminal: "M2.75 3.25h10.5v9.5H2.75zM5 6.25 7 8l-2 1.75M8.5 10h2.5",
  sliders: "M3.25 5h9.5M3.25 11h9.5M6.25 3.5v3M9.75 9.5v3",
  grid: "M3.25 3.25h4v4h-4zM8.75 3.25h4v4h-4zM3.25 8.75h4v4h-4zM8.75 8.75h4v4h-4z",
  list: "M5.25 4.25h8M5.25 8h8M5.25 11.75h8M2.75 4.25h.01M2.75 8h.01M2.75 11.75h.01",
  arrowRight: "M3.25 8h9.5M9.25 4.5 12.75 8l-3.5 3.5",
  arrowUpRight: "M4.5 11.5 11.5 4.5M6 4.5h5.5V10",
  arrowDown: "M8 3.25v9.5M4.5 9.25 8 12.75l3.5-3.5",
  arrowUp: "M8 12.75V3.25M4.5 6.75 8 3.25l3.5 3.5",
  maximize: "M3.25 3.25h4M3.25 3.25v4M12.75 3.25h-4M12.75 3.25v4M3.25 12.75h4M3.25 12.75v-4M12.75 12.75h-4M12.75 12.75v-4",
  minimize: "M3.25 8h9.5",
  wallet: "M3.25 4.25h9.5v7.5h-9.5zM3.25 6.25h9.5M10.5 9.5h.01",
  globe: "M8 13.25A5.25 5.25 0 1 0 8 2.75a5.25 5.25 0 0 0 0 10.5zM2.75 8h10.5M8 2.75c1.4 1.5 2 3.25 2 5.25s-.6 3.75-2 5.25C6.6 11.75 6 10 6 8s.6-3.75 2-5.25z",
  loader: "M8 2.75v2M12.5 8h-2M8 13.25v-2M3.5 8h2M11.2 4.8l-1.4 1.4M11.2 11.2l-1.4-1.4M4.8 11.2l1.4-1.4M4.8 4.8l1.4 1.4",
  key: "M9.5 6.5a2.5 2.5 0 1 1-3.4 2.3l-3.35 3.45v1.5h1.5v-1.5h1.5v-1.5h1.5l.85-.85A2.5 2.5 0 0 1 9.5 6.5z",
  thumbsUp: "M5.25 7.25 7.5 2.75c.9.15 1.5.85 1.5 1.75v2.25h2.75a1 1 0 0 1 .98 1.2l-.7 3.5a1.5 1.5 0 0 1-1.47 1.2H5.25zM5.25 7.25v5.4M3.25 7.25v5.4h2",
  thumbsDown: "M5.25 8.75 7.5 13.25c.9-.15 1.5-.85 1.5-1.75V9.25h2.75a1 1 0 0 0 .98-1.2l-.7-3.5a1.5 1.5 0 0 0-1.47-1.2H5.25zM5.25 8.75v-5.4M3.25 8.75v-5.4h2",
  heart: "M8 13.5S2.75 10.4 2.75 6.6A2.85 2.85 0 0 1 8 4.9a2.85 2.85 0 0 1 5.25 1.7c0 3.8-5.25 6.9-5.25 6.9z",
  speaker: "M3.25 6.25h2L8.25 3.5v9L5.25 9.75h-2zM10.5 6a2.8 2.8 0 0 1 0 4M12.25 4.4a5 5 0 0 1 0 7.2",
  pencil: "M3.25 12.75l.45-2.2 7.1-7.1a1.1 1.1 0 1 1 1.55 1.55l-7.1 7.1zM9.8 4.6l1.6 1.6",
  quote: "M3.25 9.25V7.5a2.5 2.5 0 0 1 2.5-2.5M3.25 9.25h2.5M8.25 9.25V7.5a2.5 2.5 0 0 1 2.5-2.5M8.25 9.25h2.5",
  chevronUp: "M4.75 9.5 8 6.25l3.25 3.25",
  user: "M8 7.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5zM3.25 13.25c0-2.1 2.13-3.5 4.75-3.5s4.75 1.4 4.75 3.5",
  star: "M8 2.25 9.75 5.8l3.9.57-2.82 2.75.67 3.88L8 11.15 4.5 13l.67-3.88L2.35 6.37l3.9-.57z",
  image: "M2.75 3.25h10.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-.5.5H2.75a.5.5 0 0 1-.5-.5v-8.5a.5.5 0 0 1 .5-.5zM5.75 6.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5zM3.5 11.75l3-3.25 2.25 2.25 1.5-1.5 2.25 2.5",
  camera: "M2.75 5.25h2l1-1.5h4.5l1 1.5h2a.5.5 0 0 1 .5.5v6.5a.5.5 0 0 1-.5.5H2.75a.5.5 0 0 1-.5-.5v-6.5a.5.5 0 0 1 .5-.5zM8 10.75a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  code: "M5.5 5.25 2.75 8 5.5 10.75M10.5 5.25 13.25 8 10.5 10.75M8.75 4.25l-1.5 7.5",
  palette: "M8 2.75a5.25 5.25 0 1 0 0 10.5c.85 0 1.25-.45 1.25-1.05 0-.4-.15-.7-.15-1.1 0-.6.45-1 1.15-1h1.15a1.85 1.85 0 0 0 1.85-1.85C13.25 5.1 10.9 2.75 8 2.75zM5.5 6.75h.01M7.75 5h.01M10.25 6.25h.01M5.75 9.5h.01",
  mapPin: "M8 13.5s4-3.65 4-6.75a4 4 0 1 0-8 0C4 9.85 8 13.5 8 13.5zM8 8.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  compass: "M8 13.25A5.25 5.25 0 1 0 8 2.75a5.25 5.25 0 0 0 0 10.5zM6.25 6.25l4.25-1.75-1.75 4.25-4.25 1.75z",
  folderOpen: "M2.75 4.25a.5.5 0 0 1 .5-.5h3l1.2 1.25h4.3a.5.5 0 0 1 .5.5v1.25H4.25L2.75 12V4.25zM2.75 12l1.5-5.25h9.5l-1.35 5.25a.5.5 0 0 1-.48.35H3.23a.5.5 0 0 1-.48-.35z",
  checkCircle: "M8 13.25A5.25 5.25 0 1 0 8 2.75a5.25 5.25 0 0 0 0 10.5zM5.5 8.25l1.75 1.75 3.5-3.5",
  xCircle: "M8 13.25A5.25 5.25 0 1 0 8 2.75a5.25 5.25 0 0 0 0 10.5zM6 6l4 4M10 6l-4 4",
  menu: "M2.75 4.5h10.5M2.75 8h10.5M2.75 11.5h10.5",
  eyeOff: "M2.75 2.75l10.5 10.5M6.6 4.45A6 6 0 0 1 8 4.25c4 0 6.25 3.75 6.25 3.75a10 10 0 0 1-1.65 2.1M4.2 5.9A10 10 0 0 0 1.75 8s2.25 3.75 6.25 3.75c.75 0 1.45-.12 2.08-.33",
  rotateLeft: "M3.25 7.5A4.75 4.75 0 1 1 5.1 11.75M3.25 4v3.5h3.5",
  rotateRight: "M12.75 7.5A4.75 4.75 0 1 0 10.9 11.75M12.75 4v3.5h-3.5",
  zoomIn: "M7.25 11.75a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM13.25 13.25l-2.8-2.8M7.25 5.5v3.5M5.5 7.25h3.5",
  zoomOut: "M7.25 11.75a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM13.25 13.25l-2.8-2.8M5.5 7.25h3.5",
  windowRestore: "M5.5 3.25h7.25v7.25M3.25 5.5h7.25v7.25H3.25z",
  panelLeft: "M2.75 3.25h10.5v9.5H2.75zM6.25 3.25v9.5",
  panelRight: "M2.75 3.25h10.5v9.5H2.75zM9.75 3.25v9.5",
  mail: "M2.75 4.25h10.5a.5.5 0 0 1 .5.5v6.5a.5.5 0 0 1-.5.5H2.75a.5.5 0 0 1-.5-.5v-6.5a.5.5 0 0 1 .5-.5zM2.5 4.5 8 8.5l5.5-4",
  link: "M6.75 9.25a2.5 2.5 0 0 0 3.54 0l2-2a2.5 2.5 0 0 0-3.54-3.54l-1.1 1.1M9.25 6.75a2.5 2.5 0 0 0-3.54 0l-2 2a2.5 2.5 0 0 0 3.54 3.54l1.1-1.1",
  bulb: "M6.25 11.25h3.5M6.75 13.25h2.5M8 2.5a3.75 3.75 0 0 0-2.15 6.82c.45.32.65.72.65 1.18h3c0-.46.2-.86.65-1.18A3.75 3.75 0 0 0 8 2.5z",
  arrowLeft: "M12.75 8H3.25M6.75 4.5 3.25 8l3.5 3.5",
  redo: "M10.75 4.25 13.25 6.75l-2.5 2.5M13.25 6.75h-6.5a3.25 3.25 0 0 0 0 6.5h2",
  unlock: "M4.75 7.25h6.5v5.5h-6.5zM5.75 7.25V5.25a2.25 2.25 0 0 1 4.35-.8",
  grip: "M6 4.25h.01M10 4.25h.01M6 8h.01M10 8h.01M6 11.75h.01M10 11.75h.01",
  webhook: "M8 4.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM4.25 12.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM11.75 12.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM8 4.75v2.5L5.2 9.9M8 7.25l2.8 2.65",
  schedule: "M3.25 3.75h6.5M2.75 6.75h6M5.25 2.25v2.25M8.75 2.25v2.25M3.25 3.75a.5.5 0 0 0-.5.5v7.5a.5.5 0 0 0 .5.5h4.25M11 13.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5zM11 9.5V11l1 1",
  form: "M3.75 2.75h8.5a.5.5 0 0 1 .5.5v9.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5v-9.5a.5.5 0 0 1 .5-.5zM5.5 5.75h5M5.5 8.25h5M5.5 10.75h3",
  slack: "M6.25 2.75v10.5M9.75 2.75v10.5M2.75 6.25h10.5M2.75 9.75h10.5",
  http: "M2.75 8h2.5l1.25-3 2 6 1.25-3h3.5",
  wait: "M4.5 2.75h7M4.5 13.25h7M5.25 2.75c0 2.5 2.75 3.5 2.75 5.25s-2.75 2.75-2.75 5.25M10.75 2.75c0 2.5-2.75 3.5-2.75 5.25s2.75 2.75 2.75 5.25",
  branch: "M4.5 4.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM4.5 14.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM11.5 9.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM4.5 4.25v7.5M4.5 8h5.75",
  task: "M3.75 3.25h8.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5v-8.5a.5.5 0 0 1 .5-.5zM5.75 8.25 7.25 9.75 10.5 6.25",
  flash: "M8.75 2.25 3.75 9h4l-.5 4.75 5-6.75h-4z",
  starHalf: "M8 2.25v8.9L4.5 13l.67-3.88L2.35 6.37l3.9-.57z",
  creditCard: "M2.75 4.25h10.5a.5.5 0 0 1 .5.5v6.5a.5.5 0 0 1-.5.5H2.75a.5.5 0 0 1-.5-.5v-6.5a.5.5 0 0 1 .5-.5zM2.25 6.75h11.5M4.75 9.75h2.5",
  receipt: "M3.75 2.75h8.5v10.5L10.5 12 8.85 13.25 7.15 12 5.5 13.25 3.75 12zM5.75 5.75h4.5M5.75 8.25h3",
  kanban: "M2.75 3.25h2.75v9.5H2.75zM6.62 3.25h2.75v6.5H6.62zM10.5 3.25h2.75v8H10.5z",
  workflow: "M2.75 3.25h3.5v3.5h-3.5zM9.75 9.25h3.5v3.5h-3.5zM6.25 5h2a1.5 1.5 0 0 1 1.5 1.5v4.5",
  bot: "M4.25 5.25h7.5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1zM8 2.75v2.5M6.25 8.25h.01M9.75 8.25h.01M6.5 10.5h3",
  gitCommit: "M8 10.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5zM2.25 8h3.5M10.25 8h3.5",
  gitPullRequest: "M4.5 4.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM4.5 13.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM11.5 13.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM4.5 4.75v6.5M8.5 3.5h1.75a1.25 1.25 0 0 1 1.25 1.25v6.5M9.75 2.25 8.25 3.5l1.5 1.25",
  share: "M11.75 4.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM4.25 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM11.75 14.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM5.6 7.25l4.8-2.6M5.6 8.75l4.8 2.6",
  bookmark: "M4.25 2.75h7.5a.5.5 0 0 1 .5.5v10l-4.25-2.75L3.75 13.25v-10a.5.5 0 0 1 .5-.5z",
  inbox: "M2.75 8.75 4.25 3.5h7.5l1.5 5.25v3.5a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5zM2.75 8.75h3l1 1.5h2.5l1-1.5h3",
  building: "M3.75 2.75h6.5v10.5h-6.5zM10.25 6.25h2.5v7h-2.5M5.75 5.25h.01M8.25 5.25h.01M5.75 7.75h.01M8.25 7.75h.01M6.5 13.25v-2.5h1v2.5",
  phone: "M4.5 3.25h2l1 2.5-1.4 1.1a7.5 7.5 0 0 0 3.05 3.05l1.1-1.4 2.5 1v2a1 1 0 0 1-1 1A8.5 8.5 0 0 1 3.5 4.25a1 1 0 0 1 1-1z",
  help: "M8 13.25A5.25 5.25 0 1 0 8 2.75a5.25 5.25 0 0 0 0 10.5zM6.6 6.4a1.5 1.5 0 0 1 2.85.6c0 1-1.45 1.25-1.45 2.25M8 11.25h.01",
  zap: "M8.75 2.25 3.75 9h4l-.5 4.75 5-6.75h-4z",
};

/** 历史宿主迁移兼容的图标别名映射。 */
export const AF_ICON_ALIASES = {
  aim: "compass",
  appstore: "grid",
  AppstoreOutlined: "grid",
  barChart: "chart",
  border: "square",
  checkCircleFilled: "checkCircle",
  chevDown: "chevronDown",
  chevLeft: "chevronLeft",
  chevRight: "chevronRight",
  chevUp: "chevronUp",
  clockCircleFilled: "clock",
  close: "x",
  closeCircle: "xCircle",
  dashboard: "chart",
  edit: "pencil",
  environment: "mapPin",
  loading: "loader",
  native: "external",
  picture: "image",
  reload: "refresh",
  starFilled: "star",
  swap: "arrowRight",
  sync: "refresh",
  unorderedList: "list",
  volume: "speaker",
  zap: "bolt",
  fullscreen: "maximize",
  exitFullscreen: "minimize",
  windowMinimize: "minus",
  windowMaximize: "square",
  windowRestore: "windowRestore",
  windowClose: "x",
  AimOutlined: "compass",
  ArrowDownOutlined: "arrowDown",
  ArrowLeftOutlined: "arrowLeft",
  ArrowRightOutlined: "arrowRight",
  ArrowUpOutlined: "arrowUp",
  BarChartOutlined: "chart",
  BellOutlined: "bell",
  CalendarOutlined: "calendar",
  CameraOutlined: "camera",
  CaretDownOutlined: "chevronDown",
  CaretUpOutlined: "chevronUp",
  CheckCircleFilled: "checkCircle",
  CheckCircleOutlined: "checkCircle",
  CheckOutlined: "check",
  ClockCircleOutlined: "clock",
  CloseCircleOutlined: "xCircle",
  CloseOutlined: "x",
  CloudServerOutlined: "server",
  CodeOutlined: "code",
  CopyOutlined: "copy",
  DatabaseOutlined: "database",
  DeleteOutlined: "trash",
  DownOutlined: "chevronDown",
  DownloadOutlined: "download",
  EditOutlined: "pencil",
  EllipsisOutlined: "more",
  EnvironmentOutlined: "mapPin",
  ExclamationCircleOutlined: "alert",
  EyeInvisibleOutlined: "eyeOff",
  EyeOutlined: "eye",
  FileOutlined: "file",
  FileTextOutlined: "file",
  FilterOutlined: "filter",
  FolderOpenOutlined: "folderOpen",
  FolderOutlined: "folder",
  FullscreenExitOutlined: "minimize",
  FullscreenOutlined: "maximize",
  GlobalOutlined: "globe",
  HomeOutlined: "home",
  InfoCircleOutlined: "info",
  LeftOutlined: "chevronLeft",
  LinkOutlined: "link",
  LoadingOutlined: "loader",
  LockOutlined: "lock",
  MinusCircleOutlined: "minus",
  MinusOutlined: "minus",
  MoreOutlined: "more",
  PauseCircleOutlined: "pause",
  PictureOutlined: "image",
  PlayCircleOutlined: "play",
  PlusOutlined: "plus",
  QqOutlined: "message",
  QuestionCircleOutlined: "help",
  RedoOutlined: "redo",
  ReloadOutlined: "refresh",
  RightOutlined: "chevronRight",
  RobotOutlined: "sparkle",
  SearchOutlined: "search",
  SendOutlined: "send",
  SettingOutlined: "settings",
  ShopOutlined: "store",
  StarFilled: "star",
  StarOutlined: "star",
  SwapOutlined: "arrowRight",
  SwapRightOutlined: "arrowRight",
  SyncOutlined: "refresh",
  ThunderboltOutlined: "bolt",
  TranslationOutlined: "translate",
  UndoOutlined: "undo",
  UnlockOutlined: "unlock",
  UnorderedListOutlined: "list",
  UpOutlined: "chevronUp",
  UploadOutlined: "upload",
  UserOutlined: "user",
  WarningOutlined: "alert",
  ZoomInOutlined: "zoomIn",
  ZoomOutOutlined: "zoomOut",
  email: "mail",
  envelope: "mail",
  lightbulb: "bulb",
  drag: "grip",
  card: "creditCard",
  invoice: "receipt",
  agent: "bot",
  robot: "bot",
  question: "help",
  pr: "gitPullRequest",
  commit: "gitCommit",
  fork: "branch",
} as const satisfies Record<string, AffectIconKey>;

export type AfIconAliasKey = keyof typeof AF_ICON_ALIASES;
export type AfIconName = AffectIconKey | AfIconAliasKey;
/** 支持内置图标名自动补全与任意自定义 ReactNode（如 `<AfAppMark />`、`<svg />`、`<img>`）的通用图标槽类型。 */
export type AfIconSlot = AfIconName | (string & {}) | Exclude<import("react").ReactNode, string>;

/** 判断字符串是否为已注册的内置图标键或别名。 */
export function isKnownAfIconName(name: string): name is AfIconName {
  return name in paths || name in AF_ICON_ALIASES;
}

/** `isKnownAfIconName` 的简写校验辅助函数。 */
export const isAfIconName = isKnownAfIconName;

/** 将经典或别名图标键解析为规范的 `AffectIconKey`。 */
export function resolveAfIconKey(name: AfIconName | string): AffectIconKey {
  if (name in paths) return name as AffectIconKey;
  return AF_ICON_ALIASES[name as AfIconAliasKey] ?? "info";
}

/** `resolveAfIconKey` 的语义化别名。 */
export const resolveAfIconName = resolveAfIconKey;

/** 渲染通用图标槽：传入字符串时渲染 `<AfIcon>`，传入自定义节点时原样渲染。 */
export function renderAfIconSlot(
  icon: AfIconSlot | import("react").ReactNode,
  size = 16,
  className?: string,
): import("react").ReactNode {
  if (icon === undefined || icon === null || typeof icon === "boolean") return null;
  if (typeof icon === "string") {
    return <AfIcon name={icon} size={size} className={className} />;
  }
  return icon;
}

/** 图标组件的属性，尺寸默认 16px，颜色跟随 currentColor。 */
export type AfIconProps = SVGProps<SVGSVGElement> & {
  /** 图标键（支持 affectUI 规范名与历史宿主迁移别名）。 */
  name: AfIconName | (string & {});
  /** 像素尺寸。 */
  size?: number;
  /** 语义说明；传入时自动开放无障碍标题，不再隐藏为装饰元素。 */
  title?: string;
};

/** 新风格原型的线形图标，默认装饰性隐藏，传入 `title` 时切换为语义图形。 */
export function AfIcon({ name, size = 16, title, ...rest }: AfIconProps) {
  const key = resolveAfIconKey(name);
  const label = title || undefined;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    >
      {label ? <title>{label}</title> : null}
      <path d={paths[key]} />
    </svg>
  );
}

/** 命名单图标组件属性。 */
export type AfNamedIconProps = Omit<AfIconProps, "name"> & {
  /** 兼容 AntD `spin` 旋转属性。 */
  spin?: boolean;
};

function renderNamedIcon(key: AffectIconKey, filled: boolean, { style, spin, className, ...rest }: AfNamedIconProps = {}) {
  return (
    <AfIcon
      name={key}
      className={[spin ? "af-spin-icon" : undefined, className].filter(Boolean).join(" ") || undefined}
      fill={filled ? "currentColor" : "none"}
      fillOpacity={filled ? 0.22 : undefined}
      style={spin ? { animation: "af-spin 1s linear infinite", ...style } : style}
      {...rest}
    />
  );
}

export function AimOutlined(props?: AfNamedIconProps) { return renderNamedIcon("compass", false, props); }
export function AppstoreOutlined(props?: AfNamedIconProps) { return renderNamedIcon("grid", false, props); }
export function BarChartOutlined(props?: AfNamedIconProps) { return renderNamedIcon("chart", false, props); }
export function BellOutlined(props?: AfNamedIconProps) { return renderNamedIcon("bell", false, props); }
export function CalendarOutlined(props?: AfNamedIconProps) { return renderNamedIcon("calendar", false, props); }
export function CameraOutlined(props?: AfNamedIconProps) { return renderNamedIcon("camera", false, props); }
export function CaretDownOutlined(props?: AfNamedIconProps) { return renderNamedIcon("chevronDown", false, props); }
export function CaretUpOutlined(props?: AfNamedIconProps) { return renderNamedIcon("chevronUp", false, props); }
export function CheckCircleFilled(props?: AfNamedIconProps) { return renderNamedIcon("checkCircle", true, props); }
export function CheckCircleOutlined(props?: AfNamedIconProps) { return renderNamedIcon("checkCircle", false, props); }
export function CheckOutlined(props?: AfNamedIconProps) { return renderNamedIcon("check", false, props); }
export function ClockCircleOutlined(props?: AfNamedIconProps) { return renderNamedIcon("clock", false, props); }
export function CloseCircleOutlined(props?: AfNamedIconProps) { return renderNamedIcon("xCircle", false, props); }
export function CloseOutlined(props?: AfNamedIconProps) { return renderNamedIcon("x", false, props); }
export function CopyOutlined(props?: AfNamedIconProps) { return renderNamedIcon("copy", false, props); }
export function DeleteOutlined(props?: AfNamedIconProps) { return renderNamedIcon("trash", false, props); }
export function DownOutlined(props?: AfNamedIconProps) { return renderNamedIcon("chevronDown", false, props); }
export function DownloadOutlined(props?: AfNamedIconProps) { return renderNamedIcon("download", false, props); }
export function EditOutlined(props?: AfNamedIconProps) { return renderNamedIcon("pencil", false, props); }
export function EllipsisOutlined(props?: AfNamedIconProps) { return renderNamedIcon("more", false, props); }
export function EnvironmentOutlined(props?: AfNamedIconProps) { return renderNamedIcon("mapPin", false, props); }
export function ExclamationCircleOutlined(props?: AfNamedIconProps) { return renderNamedIcon("alert", false, props); }
export function EyeInvisibleOutlined(props?: AfNamedIconProps) { return renderNamedIcon("eyeOff", false, props); }
export function EyeOutlined(props?: AfNamedIconProps) { return renderNamedIcon("eye", false, props); }
export function FileOutlined(props?: AfNamedIconProps) { return renderNamedIcon("file", false, props); }
export function FileTextOutlined(props?: AfNamedIconProps) { return renderNamedIcon("file", false, props); }
export function FilterOutlined(props?: AfNamedIconProps) { return renderNamedIcon("filter", false, props); }
export function FolderOpenOutlined(props?: AfNamedIconProps) { return renderNamedIcon("folderOpen", false, props); }
export function FolderOutlined(props?: AfNamedIconProps) { return renderNamedIcon("folder", false, props); }
export function GlobalOutlined(props?: AfNamedIconProps) { return renderNamedIcon("globe", false, props); }
export function HomeOutlined(props?: AfNamedIconProps) { return renderNamedIcon("home", false, props); }
export function InfoCircleOutlined(props?: AfNamedIconProps) { return renderNamedIcon("info", false, props); }
export function LeftOutlined(props?: AfNamedIconProps) { return renderNamedIcon("chevronLeft", false, props); }
export function LinkOutlined(props?: AfNamedIconProps) { return renderNamedIcon("link", false, props); }
export function LoadingOutlined(props?: AfNamedIconProps) { return renderNamedIcon("loader", false, props); }
export function LockOutlined(props?: AfNamedIconProps) { return renderNamedIcon("lock", false, props); }
export function MinusCircleOutlined(props?: AfNamedIconProps) { return renderNamedIcon("minus", false, props); }
export function MinusOutlined(props?: AfNamedIconProps) { return renderNamedIcon("minus", false, props); }
export function MoreOutlined(props?: AfNamedIconProps) { return renderNamedIcon("more", false, props); }
export function PictureOutlined(props?: AfNamedIconProps) { return renderNamedIcon("image", false, props); }
export function PlusOutlined(props?: AfNamedIconProps) { return renderNamedIcon("plus", false, props); }
export function QqOutlined(props?: AfNamedIconProps) { return renderNamedIcon("message", false, props); }
export function QuestionCircleOutlined(props?: AfNamedIconProps) { return renderNamedIcon("help", false, props); }
export function ReloadOutlined(props?: AfNamedIconProps) { return renderNamedIcon("refresh", false, props); }
export function RightOutlined(props?: AfNamedIconProps) { return renderNamedIcon("chevronRight", false, props); }
export function RobotOutlined(props?: AfNamedIconProps) { return renderNamedIcon("sparkle", false, props); }
export function SearchOutlined(props?: AfNamedIconProps) { return renderNamedIcon("search", false, props); }
export function SettingOutlined(props?: AfNamedIconProps) { return renderNamedIcon("settings", false, props); }
export function StarFilled(props?: AfNamedIconProps) { return renderNamedIcon("star", true, props); }
export function StarOutlined(props?: AfNamedIconProps) { return renderNamedIcon("star", false, props); }
export function SwapOutlined(props?: AfNamedIconProps) { return renderNamedIcon("arrowRight", false, props); }
export function SwapRightOutlined(props?: AfNamedIconProps) { return renderNamedIcon("arrowRight", false, props); }
export function SyncOutlined(props?: AfNamedIconProps) { return renderNamedIcon("refresh", false, props); }
export function ThunderboltOutlined(props?: AfNamedIconProps) { return renderNamedIcon("bolt", false, props); }
export function UnlockOutlined(props?: AfNamedIconProps) { return renderNamedIcon("unlock", false, props); }
export function UnorderedListOutlined(props?: AfNamedIconProps) { return renderNamedIcon("list", false, props); }
export function UpOutlined(props?: AfNamedIconProps) { return renderNamedIcon("chevronUp", false, props); }
export function UploadOutlined(props?: AfNamedIconProps) { return renderNamedIcon("upload", false, props); }
export function UserOutlined(props?: AfNamedIconProps) { return renderNamedIcon("user", false, props); }
export function WarningOutlined(props?: AfNamedIconProps) { return renderNamedIcon("alert", false, props); }

/** 历史宿主迁移兼容命名图标表：按组件名映射到可直接渲染的图标组件。 */
export const NAMED_ICON_MAP = {
  AimOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  CalendarOutlined,
  CameraOutlined,
  CaretDownOutlined,
  CaretUpOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  DownloadOutlined,
  EditOutlined,
  EllipsisOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileOutlined,
  FileTextOutlined,
  FilterOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  GlobalOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  LinkOutlined,
  LoadingOutlined,
  LockOutlined,
  MinusCircleOutlined,
  MinusOutlined,
  MoreOutlined,
  PictureOutlined,
  PlusOutlined,
  QqOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  StarFilled,
  StarOutlined,
  SwapOutlined,
  SwapRightOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  UnlockOutlined,
  UnorderedListOutlined,
  UpOutlined,
  UploadOutlined,
  UserOutlined,
  WarningOutlined,
} as const satisfies Record<string, ComponentType<AfNamedIconProps>>;

/** 兼容图标名联合类型。 */
export type IconName = keyof typeof NAMED_ICON_MAP | AfIconName;

/** 通用图标插槽类型：支持图标名称或自定义 ReactNode。 */
export type IconSlot = IconName | ReactNode;

/** 着色/徽标图标容器属性。 */
export type AfPaintedIconProps = {
  /** 图标名称（AffectIconKey、别名或命名图标键）。 */
  name?: IconName | (string & {});
  /** 图标插槽（优先级高于 name，支持传 ReactNode 或图标名）。 */
  icon?: IconSlot;
  /** 图标像素尺寸（默认 16）。 */
  size?: number;
  /** 前景色（默认继承 currentColor 或 accent）。 */
  color?: string;
  /** 背景色（启用 surface 时默认淡强调底）。 */
  background?: string;
  /** 是否包裹在带淡底圆角块中。 */
  surface?: boolean;
  /** 容器圆角（默认 8px）。 */
  radius?: number | string;
  /** 语义说明。 */
  title?: string;
  className?: string;
  style?: CSSProperties;
};

/** 宿主工作台着色图标：支持单色染色与淡底胶囊容器，兼容历史宿主 `PaintedIcon`。 */
export function AfPaintedIcon({
  name,
  icon,
  size = 16,
  color,
  background,
  surface = false,
  radius = 8,
  title,
  className,
  style,
}: AfPaintedIconProps = {}) {
  const iconNode = (() => {
    if (icon !== undefined && icon !== null && typeof icon !== "string") {
      return icon;
    }
    const key = typeof icon === "string" ? icon : name ?? "sparkle";
    const Named = (NAMED_ICON_MAP as Record<string, ComponentType<AfNamedIconProps>>)[key];
    if (Named) return <Named size={size} title={title} />;
    return <AfIcon name={key} size={size} title={title} />;
  })();

  if (!surface && !background) {
    return (
      <span
        className={["af-painted-icon", className].filter(Boolean).join(" ")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: color ?? "currentColor",
          lineHeight: 0,
          ...style,
        }}
      >
        {iconNode}
      </span>
    );
  }

  const boxSize = Math.max(24, Math.round(size * 1.75));
  return (
    <span
      className={["af-painted-icon af-painted-icon--surface", className].filter(Boolean).join(" ")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: boxSize,
        height: boxSize,
        borderRadius: radius,
        background: background ?? "color-mix(in srgb, var(--af-accent) 12%, transparent)",
        color: color ?? "var(--af-accent-ink)",
        flexShrink: 0,
        lineHeight: 0,
        ...style,
      }}
    >
      {iconNode}
    </span>
  );
}

/** 历史宿主迁移兼容别名。 */
export const PaintedIcon = AfPaintedIcon;
export type PaintedIconProps = AfPaintedIconProps;
