/**
 * Aster UI 无样式副作用纯运行时入口（`@fangxinyan/aster-ui/runtime`）。
 *
 * 完整重导出 `@fangxinyan/aster-ui` 全量组件、原语、图标、动效、复合模式、主题与插件运行时桥接 API，
 * 且不包含任何顶层 `.css` 副作用导入，供多窗口宿主、预加载子窗口与动态插件统一由宿主 `<link>` 控制样式注入顺序。
 */
export * from "./index";
