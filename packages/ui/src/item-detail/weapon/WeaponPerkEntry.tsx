import { useEffect, useId, useRef, useState } from "react";
import { GameAssetImage } from "../../media/GameAssetImage.js";

/**
 * Perk 条目的唯一实现。
 *
 * 本件 Roll、固有能力、完整掉落池（含异域配置候选）与推荐判断的两列对照全部渲染这个组件——
 * 外观只有一处，任何一处改样子别处自动跟着。图标、名称、短状态与说明浮层都由这里产出；
 * 「点击做什么」由调用方决定：
 * - 传 `onActivate`＝点击执行这个动作（当前只有「换 Perk」这一种）；
 * - 不传＝点击展开说明浮层（只读条目，与推荐区一致）。
 * 需要「打开说明之后再做一件事」的调用方（推荐对照区的选择 / 取消选择）用 `action`，
 * 不动点击语义，触屏也仍然有看说明的路。
 */
export function WeaponPerkEntry(props: {
  name: string;
  englishName?: string;
  description?: string;
  icon?: string;
  /** 条目第二行：短状态（没有就不占行） */
  statusLabel?: string;
  /** 浮层与空态文案里的完整状态 */
  statusDetail?: string;
  /** 浮层底部身份行的标题（如「本件拥有」「完整掉落池」） */
  contextLabel: string;
  ariaLabel: string;
  /** 有＝点击执行这个动作；没有＝点击只看说明 */
  onActivate?: () => void;
  /** 配合 `onActivate` 的按下态（换 Perk 的待提交判定） */
  pressed?: boolean;
  /** 蓝点：当前已选 / 当前启用 */
  selected?: boolean;
  /**
   * 「当前」这一处按哪条规格表达：
   * - `marker`（默认）：推荐对照区——蓝点 + 状态文字，表面保持中性，不与绿色命中条抢信号；
   * - `selected`：本件 Roll / 固有能力 / 完整掉落池——整页通用的蓝色选中语义（选中底 + 选中边框 +
   *   左缘实色条），因为在这一区「当前」就是唯一要表达的状态。
   */
  emphasis?: "marker" | "selected";
  /** 命中来源要求：绿勾 + 左缘实色条 */
  hit?: boolean;
  /** 本条不是当前对照的重点（命中其他候选时其余项降权） */
  muted?: boolean;
  /** 资料库没有这条记录：虚线边框 */
  unknown?: boolean;
  /** 待提交：边框与短状态用待提交色 */
  pending?: boolean;
  /**
   * **本件当前装着它，而来源没要它**——一栏里唯一值得单点出来的那张卡（T73 加、T84 改判据）。
   *
   * 判定条件只有一条，而且只读卡片自己的事实：`!hit && active`。
   * T84 之前这里还挂了一道 `这一栏 state === "different"`，于是同一张卡在「符合」栏里静默、
   * 在「不符」栏里被打三下——「符合」说的是你**拥有**来源要的那项（哪怕没装），不等于你装的就是它，
   * 拿栏位结论去决定卡片长什么样，就把同一个事实画成了两种。现在这道门控没有了。
   *
   * 不必担心「一屏都是叉」：`active` 来自这一栏的当前启用项，正常一栏只有一项，所以每栏最多一枚。
   * 叉是这一路唯一的**形状**信号；「当前启用」那枚环不参与表达对错，颜色只表示「当前」。
   */
  mismatch?: boolean;
  /**
   * 浮层底部的一行显式动作（当前只有推荐对照区的「选择 / 取消选择」）。
   *
   * 与 `onActivate` 分开：`onActivate` 占的是「点这张卡做什么」（本件 Roll 的换 Perk），
   * 这里占的是「打开说明之后能做什么」——推荐对照区点击仍然只是看说明，动作是浮层里的一次显式点击，
   * 所以触屏也不会因为整卡点击被占用而失去看说明的路。
   */
  action?: { label: string; onActivate: () => void };
}) {
  const { name, englishName, description, icon } = props;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  // 点击含义被调用方占用（换 Perk）时，浮层只靠悬停与键盘聚焦打开，不抢点击。
  const opensOnClick = !props.onActivate;

  useEffect(() => {
    if (!open) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className="weapon-detail-perk-entry"
      data-hit={props.hit ? "true" : undefined}
      data-active={props.selected ? "true" : undefined}
      data-muted={props.muted ? "true" : undefined}
      data-unknown={props.unknown ? "true" : undefined}
      data-pending={props.pending ? "true" : undefined}
      data-mismatch={props.mismatch ? "true" : undefined}
      data-action={props.onActivate ? "true" : undefined}
      data-open={open ? "true" : undefined}
      data-emphasis={props.emphasis === "selected" ? "selected" : undefined}
    >
      {opensOnClick ? (
        <button type="button" className="weapon-detail-perk-entry-box" aria-label={props.ariaLabel} aria-describedby={tooltipId} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <PerkEntryBody {...props} />
        </button>
      ) : (
        <button type="button" className="weapon-detail-perk-entry-box" aria-label={props.ariaLabel} aria-describedby={tooltipId} aria-pressed={props.pressed === true} onClick={props.onActivate}>
          <PerkEntryBody {...props} />
        </button>
      )}
      <span id={tooltipId} className="weapon-detail-perk-entry-popover" role="tooltip">
        <span className="weapon-detail-perk-entry-popover-heading">
          <span className="weapon-detail-perk-entry-art">
            <GameAssetImage
              src={normalizePerkIconUrl(icon)}
              alt=""
              loading="lazy"
              fallback={<span className="weapon-detail-perk-entry-placeholder" aria-hidden="true">◆</span>}
            />
          </span>
          <span><strong>{name}</strong>{englishName ? <small>{englishName}</small> : null}</span>
        </span>
        <span className="weapon-detail-perk-entry-description">{description || "游戏资料没有返回这项 Perk 的说明。"}</span>
        <span className="weapon-detail-perk-entry-context"><strong>{props.contextLabel}</strong>{props.statusDetail ? <small>{props.statusDetail}</small> : null}</span>
        {props.action ? (
          <span className="weapon-detail-perk-entry-action">
            <button
              type="button"
              data-ui-kind="button"
              data-control-variant="secondary"
              aria-label={`${props.action.label}：${name}`}
              onClick={props.action.onActivate}
            >{props.action.label}</button>
          </span>
        ) : null}
      </span>
    </span>
  );
}

function PerkEntryBody(props: { name: string; icon?: string; statusLabel?: string; hit?: boolean; selected?: boolean; pending?: boolean; mismatch?: boolean }) {
  return (
    <>
      <span className="weapon-detail-perk-entry-art">
        <GameAssetImage
          src={normalizePerkIconUrl(props.icon)}
          alt=""
          loading="lazy"
          fallback={<span className="weapon-detail-perk-entry-placeholder" aria-hidden="true">◆</span>}
        />
      </span>
      <span className="weapon-detail-perk-entry-copy">
        <strong>{props.name}</strong>
        {props.statusLabel ? <small>{props.statusLabel}</small> : null}
      </span>
      {/* 四枚标记各占 36px 图标的一个角，互不重叠：右上＝命中勾、左下＝待应用方块、
          右下＝当前环、左上＝不匹配叉。一屏实测最多同时亮两枚。 */}
      {props.mismatch ? <span className="weapon-detail-perk-entry-mismatch" aria-hidden="true">✕</span> : null}
      {props.hit ? <span className="weapon-detail-perk-entry-hit" aria-hidden="true">✓</span> : null}
      {props.pending ? <span className="weapon-detail-perk-entry-pending" aria-hidden="true" /> : null}
      {props.selected ? <span className="weapon-detail-perk-entry-active" aria-hidden="true" /> : null}
    </>
  );
}

/**
 * 条目盒子的两种「还不是条目」的形态：等定义返回时是骨架，确实没有这一栏时是一句说明。
 *
 * 与条目共用同一个盒子类（`.weapon-detail-perk-entry-box`），几何只有一处定义——
 * 占位不会比条目高、矮、圆角不同，加载前后卡片不跳位。
 */
export function WeaponPerkPlaceholder(props: { variant: "loading" | "empty"; text?: string }) {
  if (props.variant === "empty") {
    return (
      <span className="weapon-detail-perk-entry" data-placeholder="empty">
        <span className="weapon-detail-perk-entry-box">
          <span className="weapon-detail-perk-entry-copy weapon-detail-perk-entry-empty-text">{props.text}</span>
        </span>
      </span>
    );
  }
  return (
    <span className="weapon-detail-perk-entry" data-placeholder="loading" aria-hidden="true">
      <span className="weapon-detail-perk-entry-box" aria-busy="true">
        <span className="weapon-detail-perk-entry-art">
          <span className="weapon-detail-perk-entry-bar weapon-detail-perk-entry-bar-art" />
        </span>
        <span className="weapon-detail-perk-entry-copy">
          <span className="weapon-detail-perk-entry-bar weapon-detail-perk-entry-bar-title" />
          <span className="weapon-detail-perk-entry-bar weapon-detail-perk-entry-bar-status" />
        </span>
      </span>
    </span>
  );
}

/** 部分来源给出的图标是相对路径，进 UI 前补全主机名。 */
export function normalizePerkIconUrl(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return normalized.startsWith("/") ? `https://www.bungie.net${normalized}` : normalized;
}
