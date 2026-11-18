import { AfIcon } from "../../icons";
import { AfButton } from "../../ui";

/** 保存栏：常驻托盘底部；没有改动时按钮降到 0.4 且不可点，有改动后亮起。 */
export function AfSaveBar({ dirty, count, state, onReset, onSave }: { dirty: boolean; count: number; state: "idle" | "saving" | "saved"; onReset: () => void; onSave: () => void }) {
  return (
    <div className="af-savebar" data-dirty={dirty || undefined}>
      <span className="af-savebar__hint" key={dirty ? "dirty" : state}>
        {state === "saved" ? (
          <>
            <AfIcon name="check" size={12} />
            已保存
          </>
        ) : dirty ? (
          <>
            <span className="af-savebar__dot" aria-hidden />
            {count} 项更改未保存
          </>
        ) : (
          "修改后点击保存生效"
        )}
      </span>
      <span className="af-savebar__actions">
        <AfButton size="sm" variant="ghost" disabled={!dirty || state === "saving"} onClick={onReset}>
          还原
        </AfButton>
        <AfButton size="sm" variant="primary" loading={state === "saving"} disabled={!dirty || state === "saving"} onClick={onSave}>
          {state === "saving" ? "保存中" : "保存"}
        </AfButton>
      </span>
    </div>
  );
}
