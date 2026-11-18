/**
 * Aster UI 新组件脚手架生成器。
 *
 * 用法：
 *   npm run new:component -- controls/Rating
 *   npm run new:component -- display/TimelineCard
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawArg = process.argv[2];

if (!rawArg || !rawArg.includes("/")) {
  console.error("用法: npm run new:component -- <category>/<ComponentName>  (例如 controls/Rating)");
  process.exit(1);
}

const [category, rawName] = rawArg.split("/");
const pascal = rawName.replace(/^Af/, "");
const afName = `Af${pascal}`;
const kebab = pascal.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const compPath = path.join(root, "src/components", category, `${pascal}.tsx`);
if (fs.existsSync(compPath)) {
  console.error(`目标文件已存在: ${path.relative(root, compPath)}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(compPath), { recursive: true });

const template = `import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../primitives";

export interface ${afName}Props extends HTMLAttributes<HTMLDivElement> {
  /** 尺寸规格。 */
  size?: "sm" | "md";
  /** 子节点内容。 */
  children?: ReactNode;
}

/**
 * ${afName} 组件（遵循 affectUI Clean/Pro 令牌与无障碍契约）。
 */
export const ${afName} = forwardRef<HTMLDivElement, ${afName}Props>(function ${afName}(
  { size = "md", className, children, ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      data-size={size !== "md" ? size : undefined}
      className={cn("af-${kebab}", className)}
    >
      {children}
    </div>
  );
});
`;

fs.writeFileSync(compPath, template, "utf8");
console.log(
  [
    `已生成组件骨架: src/components/${category}/${pascal}.tsx`,
    "",
    "后续步骤:",
    `  1. 在 src/ui.tsx（或对应桶文件）导出: export { ${afName}, type ${afName}Props } from "./components/${category}/${pascal}";`,
    `  2. 在 src/ui.css 中使用 --af-* 语义令牌补充 .af-${kebab} 样式（严禁硬编码裸色值）`,
    `  3. 在 src/specs/ 对应演示集中注册 ComponentSpec 预览用例并运行 npm run lint:arch && npm test`,
  ].join("\n"),
);
