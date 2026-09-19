import { useRef, type KeyboardEvent } from "react";
import { getRovingFocusIndex } from "../interaction/rovingFocus.js";
import { GameAssetImage } from "../media/GameAssetImage.js";

/**
 * 当前角色 / 当前装备上下文切换器。账号页用 full 变体（徽标 + 职业名 + 双行光等 + 容量），
 * 仓库工作流栏用 compact 变体（徽标 + 职业名 + 光等）。
 *
 * 组件本身不渲染任何用户可见文案，title / detail / meta / capacity.label 全部由调用方拼好传入；
 * 类名固定在 `.context-switcher` 上，外观只在 `styles/components/14-context-switcher.css` 里定义。
 */
export type ContextSwitcherItem = {
  key: string;
  /** 职业名，同时用作徽标加载失败时的首字。 */
  className: string;
  emblemUrl?: string;
  isSelected: boolean;
  /** 悬停说明。 */
  title: string;
  /** full 变体第二行。 */
  detail?: string;
  /** compact 变体第二行。 */
  meta?: string;
  capacity?: { label: string; risk: string };
};

export type ContextSwitcherProps = {
  variant?: "full" | "compact";
  /** role=group 的 aria-label。 */
  label: string;
  items: readonly ContextSwitcherItem[];
  onSelect: (key: string) => void;
  /** 选中之后的收尾动作，例如收起账号页的光等浮层。 */
  onAfterSelect?: () => void;
};

export function ContextSwitcher({
  variant = "full",
  label,
  items,
  onSelect,
  onAfterSelect
}: ContextSwitcherProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const nextIndex = getRovingFocusIndex({
      key: event.key,
      currentIndex: index,
      itemCount: items.length,
      orientation: "both"
    });
    if (nextIndex === null) return;

    event.preventDefault();
    const nextItem = items[nextIndex];
    onSelect(nextItem.key);
    onAfterSelect?.();
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      className="context-switcher"
      data-ui-kind="context-switcher"
      data-variant={variant}
      role="group"
      aria-label={label}
    >
      {items.map((item, index) => (
        <button
          type="button"
          aria-pressed={item.isSelected}
          tabIndex={item.isSelected ? 0 : -1}
          key={item.key}
          ref={(element) => { buttonRefs.current[index] = element; }}
          title={item.title}
          onClick={() => {
            onSelect(item.key);
            onAfterSelect?.();
          }}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          <GameAssetImage
            className="context-switcher-emblem"
            src={item.emblemUrl}
            alt=""
            loading="eager"
            fallback={<b aria-hidden="true">{item.className.slice(0, 1)}</b>}
          />
          {variant === "compact" ? (
            <>
              <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{item.className}</strong>
              {item.meta ? (
                <small data-ui-part="detail" data-info-priority="support" data-text-tone="body">{item.meta}</small>
              ) : null}
            </>
          ) : (
            <span>
              <strong data-ui-part="value" data-info-priority="context" data-text-tone="primary">{item.className}</strong>
              {item.detail ? (
                <small data-ui-part="detail" data-info-priority="support" data-text-tone="body">{item.detail}</small>
              ) : null}
              {item.capacity ? (
                <small className="context-switcher-capacity" data-risk={item.capacity.risk}>{item.capacity.label}</small>
              ) : null}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
