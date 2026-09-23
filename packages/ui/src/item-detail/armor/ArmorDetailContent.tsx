import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode
} from "react";
import type {
  ArmorDetailInstance,
  ArmorDetailViewModel,
  ArmorRecommendation,
  ArmorStatTrack
} from "@d2-tools/app/items";
import type { ItemReleaseKind } from "@d2-tools/core/items/release";
import { GameAssetImage } from "../../media/GameAssetImage.js";
import { EquipmentDetailContextLedger } from "../EquipmentDetailContextLedger.js";
import type { ItemDetailCopy } from "../../i18n/types.js";
import { itemDetailTemplate, itemDetailText } from "../itemDetailCopy.js";
import {
  armorSocketLabelText,
  armorStatLabel,
  itemDetailEntryLabel,
  itemDetailSourceLocationLabel
} from "../itemDetailLabels.js";

export type ArmorDetailSection = "overview" | "configuration" | "targets" | "upgrades";

export type ArmorDetailContentActions = {
  selectInstance?: (instance: ArmorDetailInstance) => boolean | void;
};

export type ArmorDetailContentProps = {
  model: ArmorDetailViewModel;
  copy: ItemDetailCopy;
  actions?: ArmorDetailContentActions;
  activeSection?: ArmorDetailSection;
  onSectionChange?: (section: ArmorDetailSection) => void;
  instanceActions?: ReactNode;
  className?: string;
};

const sectionLabels: Array<{ key: ArmorDetailSection; label: string }> = [
  { key: "overview", label: "属性与获取" },
  { key: "configuration", label: "护甲配置" },
  { key: "targets", label: "目标匹配" },
  { key: "upgrades", label: "强化状态" }
];

export function ArmorDetailContent(props: ArmorDetailContentProps) {
  const { model } = props;
  const detailLoading = model.loading
    || model.loading_state.definition
    || (model.context.kind === "account_item" && model.loading_state.instance);
  const [internalSection, setInternalSection] = useState<ArmorDetailSection>("overview");
  const [instanceRailOpen, setInstanceRailOpen] = useState(false);
  const section = props.activeSection ?? internalSection;
  const sectionIdPrefix = useId();
  const detailRef = useRef<HTMLElement>(null);
  const instanceRailRef = useRef<HTMLElement>(null);
  const instanceRailTriggerRef = useRef<HTMLButtonElement>(null);
  const instanceRailCloseRef = useRef<HTMLButtonElement>(null);
  const observedSectionRef = useRef<ArmorDetailSection>("overview");
  const sectionRefs = useRef<Record<ArmorDetailSection, HTMLElement | null>>({
    overview: null,
    configuration: null,
    targets: null,
    upgrades: null
  });

  useEffect(() => {
    setInternalSection("overview");
    setInstanceRailOpen(false);
    observedSectionRef.current = "overview";
  }, [model.identity.hash, model.context.object_id, model.context.kind]);

  useEffect(() => {
    if (!instanceRailOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : instanceRailTriggerRef.current;
    requestAnimationFrame(() => instanceRailCloseRef.current?.focus());
    return () => previousFocus?.focus();
  }, [instanceRailOpen]);

  useEffect(() => {
    const detail = detailRef.current;
    const scrollRoot = detail?.closest<HTMLElement>(".shared-item-detail-body");
    if (!detail || !scrollRoot) return;
    const updateActiveSection = () => {
      const activationLine = scrollRoot.getBoundingClientRect().top + 96;
      let next: ArmorDetailSection = "overview";
      for (const item of sectionLabels) {
        const element = sectionRefs.current[item.key];
        if (element && element.getBoundingClientRect().top <= activationLine) next = item.key;
      }
      if (observedSectionRef.current === next) return;
      observedSectionRef.current = next;
      if (props.activeSection === undefined) setInternalSection(next);
      props.onSectionChange?.(next);
    };
    scrollRoot.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    updateActiveSection();
    return () => {
      scrollRoot.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [model.context.object_id, model.identity.hash, props.activeSection, props.onSectionChange]);

  const changeSection = (next: ArmorDetailSection) => {
    observedSectionRef.current = next;
    if (props.activeSection === undefined) setInternalSection(next);
    props.onSectionChange?.(next);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    sectionRefs.current[next]?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  const handleInstanceRailKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setInstanceRailOpen(false);
      return;
    }
    if (event.key !== "Tab" || !instanceRailRef.current) return;
    const focusable = [...instanceRailRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <article
        ref={detailRef}
        className={["armor-detail", props.className].filter(Boolean).join(" ")}
        data-contract-root="detail-dossier"
        data-contract-id="armor.detail"
        data-detail-contract="detail.dossier"
        data-layout="hybrid-workspace"
        data-surface="page"
        data-state={detailLoading ? "loading" : "normal"}
        aria-busy={detailLoading}
      >
        <ArmorIdentity model={model} copy={props.copy} />

        <nav className="armor-detail-nav" data-ui-kind="section-navigation" aria-label={itemDetailText(props.copy, "护甲详情章节")}>
          <div>
            {sectionLabels.map((item) => (
              <button
                key={item.key}
                type="button"
                data-ui-kind="button"
                data-control-variant="quiet"
                aria-current={section === item.key ? "location" : undefined}
                aria-controls={`${sectionIdPrefix}-${item.key}`}
                className={section === item.key ? "is-active" : undefined}
                onClick={() => changeSection(item.key)}
              >
                {itemDetailText(props.copy, item.label)}
              </button>
            ))}
          </div>
          <button
            ref={instanceRailTriggerRef}
            type="button"
            className="armor-detail-rail-toggle"
            data-ui-kind="button"
            data-control-variant="secondary"
            aria-expanded={instanceRailOpen}
            aria-controls={`${sectionIdPrefix}-instance-rail`}
            onClick={() => setInstanceRailOpen((value) => !value)}
          >{itemDetailText(props.copy, "我的同版本护甲")}</button>
        </nav>

        <div className="armor-detail-workspace" data-surface="split">
          <div className="armor-detail-sections" data-surface="content-stack">
            <section ref={(node) => { sectionRefs.current.overview = node; }} id={`${sectionIdPrefix}-overview`} className="armor-detail-section">
              <OverviewSection model={model} copy={props.copy} />
            </section>
            <section ref={(node) => { sectionRefs.current.configuration = node; }} id={`${sectionIdPrefix}-configuration`} className="armor-detail-section">
              <ConfigurationSection model={model} copy={props.copy} />
            </section>
            <section ref={(node) => { sectionRefs.current.targets = node; }} id={`${sectionIdPrefix}-targets`} className="armor-detail-section">
              <TargetSection model={model} copy={props.copy} />
            </section>
            <section ref={(node) => { sectionRefs.current.upgrades = node; }} id={`${sectionIdPrefix}-upgrades`} className="armor-detail-section">
              <UpgradeSection model={model} copy={props.copy} />
            </section>
          </div>

          <aside
            ref={instanceRailRef}
            id={`${sectionIdPrefix}-instance-rail`}
            className={["armor-detail-instance-rail", instanceRailOpen && "is-open"].filter(Boolean).join(" ")}
            data-surface="drawer"
            data-ui-kind="drawer"
            data-scroll-region="pane"
            aria-label={itemDetailText(props.copy, "当前对象与我的同版本护甲")}
            onKeyDown={handleInstanceRailKeyDown}
          >
            <header className="armor-detail-rail-drawer-head">
              <div><span>{itemDetailText(props.copy, "护甲操作")}</span><strong>{itemDetailText(props.copy, "我的同版本护甲")}</strong></div>
              <button
                ref={instanceRailCloseRef}
                type="button"
                className="armor-detail-rail-close"
                data-ui-kind="button"
                data-control-variant="quiet"
                aria-label={itemDetailText(props.copy, "关闭我的同版本护甲")}
                title={itemDetailText(props.copy, "关闭")}
                onClick={() => setInstanceRailOpen(false)}
              >×</button>
            </header>
            {props.instanceActions ? (
              <div className="armor-detail-instance-actions">{props.instanceActions}</div>
            ) : (
              <div className="armor-detail-instance-readonly" data-status="neutral">
                <span>{model.context.kind === "vendor_offer" ? itemDetailText(props.copy, "当前售卖只读") : itemDetailText(props.copy, "资料库内容只读")}</span>
                <h3>{armorObjectLabel(props.copy, model.context.kind)}</h3>
                <p>{model.context.kind === "vendor_offer"
                  ? itemDetailText(props.copy, "选择下方账号中已有的同版本护甲，可以比较售卖属性并管理已有装备。")
                  : itemDetailText(props.copy, "选择下方账号中已有的同版本护甲后，可执行装备、转移、锁定和本地整理。")}</p>
              </div>
            )}
            <InstancesRail
              model={model}
              copy={props.copy}
              onSelect={props.actions?.selectInstance ? (instance) => {
                const selected = props.actions?.selectInstance?.(instance);
                if (selected !== false) setInstanceRailOpen(false);
                return selected;
              } : undefined}
            />
          </aside>
        </div>
      </article>
      <button
        type="button"
        className={["armor-detail-rail-scrim", instanceRailOpen && "is-open"].filter(Boolean).join(" ")}
        data-ui-kind="button"
        data-control-variant="quiet"
        aria-label={itemDetailText(props.copy, "关闭我的同版本护甲")}
        onClick={() => setInstanceRailOpen(false)}
      />
    </>
  );
}

function ArmorIdentity({ model, copy }: { model: ArmorDetailViewModel; copy: ItemDetailCopy }) {
  const { identity, context } = model;
  const primaryAbilityGroup = model.ability_groups[0];
  const selectedGroupOption = primaryAbilityGroup?.options.find((option) => option.hash === primaryAbilityGroup.selected_option_hash);
  const feature = identity.armor_set
    ? { label: identity.armor_set.name, tone: "set", title: identity.armor_set.description }
    : model.abilities[0]
      ? { label: model.abilities[0].name, tone: "ability", title: model.abilities[0].description }
      : primaryAbilityGroup
        ? {
            label: selectedGroupOption?.name ?? primaryAbilityGroup.name,
            tone: "ability",
            title: primaryAbilityGroup.options.map((option) => option.name).join(" / ")
          }
        : undefined;
  const releaseLabel = identity.release?.description ?? itemDetailText(copy, "官方定义未提供发布信息");
  const watermarks = identity.definition_version?.watermark_icons ?? [];
  const currentWatermark = identity.definition_version?.current_watermark_icon;
  return (
    <header className="armor-detail-identity" data-surface="section">
      <div className="armor-detail-identity-main">
        <GameAssetImage src={identity.icon} alt="" loading="eager" fallback={<span className="armor-detail-icon-placeholder" aria-hidden="true" />} />
        <div>
          <h2 data-ui-part="value" data-text-tone="primary" data-info-priority="display">{identity.name}</h2>
          <p data-ui-part="detail" data-text-tone="body" data-info-priority="reading">{[identity.tier, identity.item_type, identity.class_name].filter(Boolean).join(" · ")}</p>
          <div className="armor-detail-facts" aria-label={itemDetailText(copy, "护甲摘要")}>
            {identity.tier ? <Fact label={identity.tier} tone={/异域|exotic/i.test(identity.tier) ? "exotic" : "legendary"} /> : null}
            {identity.item_type ? <Fact label={identity.item_type} /> : null}
            {identity.class_name ? <Fact label={identity.class_name} /> : null}
            {feature
              ? <Fact label={feature.label} tone={feature.tone} title={feature.title} />
              : <Fact label={model.loading_state.definition ? itemDetailText(copy, "套装与能力读取中") : itemDetailText(copy, "没有可确认的套装或固有能力")} tone="incomplete" />}
          </div>
        </div>
      </div>

      <div className="armor-detail-identity-context">
        <EquipmentDetailContextLedger
          copy={copy}
          entryLabel={context.entry_label ?? itemDetailEntryLabel(copy, context.entry)}
          currentViewLabel={armorObjectLabel(copy, context.kind)}
          locationLabel={identity.bucket_name ?? identity.item_type ?? itemDetailText(copy, "护甲")}
          versionFieldLabel={context.kind === "account_item" ? itemDetailText(copy, "装备版本") : context.kind === "vendor_offer" ? itemDetailText(copy, "售卖版本") : itemDetailText(copy, "发布版本")}
          versionValue={releaseLabel}
          watermarkIcon={currentWatermark}
        />
        <details className="armor-detail-definition-details">
          <summary>{itemDetailText(copy, "护甲定义信息")}</summary>
          <div>
            <dl><dt>{itemDetailText(copy, "装备 Hash")}</dt><dd>{identity.hash}</dd></dl>
            <dl><dt>{itemDetailText(copy, "发布版本")}</dt><dd>{identity.release?.description ?? itemDetailText(copy, "资料未返回")}</dd></dl>
            <dl><dt>{itemDetailText(copy, "赛季 Hash")}</dt><dd>{identity.release?.season_hash ?? itemDetailText(copy, "资料未返回")}</dd></dl>
            <dl><dt>{itemDetailText(copy, "发布类型")}</dt><dd>{armorReleaseKindLabel(copy, identity.release?.kind)}</dd></dl>
            <dl><dt>{itemDetailText(copy, "定义版本")}</dt><dd>{identity.definition_version?.label ?? itemDetailText(copy, "资料未返回")}</dd></dl>
            <dl><dt>{itemDetailText(copy, "光等上限 Hash")}</dt><dd>{identity.definition_version?.power_cap_hash ?? itemDetailText(copy, "资料未返回")}</dd></dl>
            <dl><dt>{itemDetailText(copy, "版本水印")}</dt><dd>{watermarks.length ? <span className="armor-detail-definition-watermarks">{watermarks.map((icon, index) => <GameAssetImage key={`${icon}:${index}`} src={icon} alt={itemDetailTemplate(copy, "官方版本水印 {index}", { index: index + 1 })} title={itemDetailText(copy, "官方定义版本水印")} loading="eager" />)}</span> : itemDetailText(copy, "资料未返回")}</dd></dl>
            <dl><dt>{itemDetailText(copy, "职业限制")}</dt><dd>{identity.class_name ?? itemDetailText(copy, "所有职业")}</dd></dl>
            <dl><dt>{itemDetailText(copy, "护甲部位")}</dt><dd>{identity.bucket_name ?? identity.item_type ?? itemDetailText(copy, "护甲")}</dd></dl>
              <dl><dt>{itemDetailText(copy, "套装或固有能力")}</dt><dd>{identity.armor_set?.name ?? ([...model.abilities.map((ability) => ability.name), ...model.ability_groups.map((group) => `${group.name}（${group.options.map((option) => option.name).join(" / ")}）`)].join(" / ") || itemDetailText(copy, "资料未返回"))}</dd></dl>
            <dl><dt>{itemDetailText(copy, "套装 Hash")}</dt><dd>{identity.armor_set?.hash ?? itemDetailText(copy, "资料未返回")}</dd></dl>
            <dl className="is-wide"><dt>{itemDetailText(copy, "定义说明")}</dt><dd>{identity.description || itemDetailText(copy, "当前游戏资料未返回额外说明")}</dd></dl>
          </div>
        </details>
      </div>
    </header>
  );
}

function armorReleaseKindLabel(copy: ItemDetailCopy, kind: ItemReleaseKind | undefined): string {
  if (kind === "season") return itemDetailText(copy, "赛季");
  if (kind === "annual") return itemDetailText(copy, "年度资料片");
  if (kind === "dlc") return itemDetailText(copy, "内容包");
  if (kind === "core") return itemDetailText(copy, "常规版本");
  if (kind === "update") return itemDetailText(copy, "版本更新");
  return itemDetailText(copy, "官方未标注");
}

type ArmorObjectKind = ArmorDetailViewModel["context"]["kind"];

function armorObjectLabel(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "account_item") return itemDetailText(copy, "当前装备");
  if (kind === "vendor_offer") return itemDetailText(copy, "当前售卖");
  return itemDetailText(copy, "资料库版本");
}

function armorOverviewTitle(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "account_item") return itemDetailText(copy, "本件属性与获取方式");
  if (kind === "vendor_offer") return itemDetailText(copy, "售卖属性与购买信息");
  return itemDetailText(copy, "属性规则与获取方式");
}

function armorOverviewDescription(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "account_item") return itemDetailText(copy, "区分这件护甲的基础属性、当前实际值和已确认加成。");
  if (kind === "vendor_offer") return itemDetailText(copy, "只展示本次售卖的真实属性、购买状态和刷新边界。");
  return itemDetailText(copy, "资料库版本只说明随机属性规则、固定能力和已确认获取方式。");
}

function ArmorObjectSummary({ model, copy }: { model: ArmorDetailViewModel; copy: ItemDetailCopy }) {
  const loading = model.loading_state.definition
    || (model.context.kind === "account_item" && model.loading_state.instance);
  return (
    <div className="armor-detail-object-summary" aria-busy={loading}>
      {armorOverviewSummaryItems(copy, model).map((item) => (
        <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>
      ))}
    </div>
  );
}

function armorOverviewSummaryItems(copy: ItemDetailCopy, model: ArmorDetailViewModel): Array<{ label: string; value: string }> {
  const baseTotal = confirmedBaseTotal(model.stats);
  const currentTotal = model.stats.length ? model.stat_total ?? sumCurrentStats(model.stats) : undefined;
  const feature = model.identity.armor_set?.name ?? model.abilities[0]?.name ?? model.ability_groups[0]?.name;
  if (model.context.kind === "account_item") {
    return [
      { label: itemDetailText(copy, "当前查看"), value: itemDetailText(copy, "当前装备") },
      { label: itemDetailText(copy, "基础总属性"), value: baseTotal !== undefined ? String(baseTotal) : model.loading_state.instance ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "未确认") },
      { label: itemDetailText(copy, "当前总属性"), value: currentTotal !== undefined ? String(currentTotal) : model.loading_state.instance ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "未确认") },
      { label: itemDetailText(copy, "强化状态"), value: model.energy ? itemDetailTemplate(copy, "{capacity} 级能量", { capacity: model.energy.capacity }) : model.loading_state.instance ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "未确认") }
    ];
  }
  if (model.context.kind === "vendor_offer") {
    const offer = model.sources.offer;
    const purchase = offer?.purchase_label
      ?? (offer?.can_purchase === true ? itemDetailText(copy, "当前可购买") : offer?.can_purchase === false ? itemDetailText(copy, "条件未满足") : model.loading_state.definition ? itemDetailText(copy, "正在核对") : itemDetailText(copy, "资格未知"));
    return [
      { label: itemDetailText(copy, "当前查看"), value: itemDetailText(copy, "当前售卖") },
      { label: itemDetailText(copy, "售卖总属性"), value: currentTotal !== undefined ? String(currentTotal) : model.loading_state.definition ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "未提供") },
      { label: itemDetailText(copy, "购买状态与价格"), value: [purchase, offer?.cost_label].filter(Boolean).join(" · ") },
      { label: itemDetailText(copy, "刷新时间"), value: offer?.refresh_label ?? (model.loading_state.definition ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "未提供")) }
    ];
  }
  return [
    { label: itemDetailText(copy, "当前查看"), value: itemDetailText(copy, "资料库版本") },
    { label: itemDetailText(copy, "属性规则"), value: model.loading_state.definition ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "每件实例随机") },
    { label: itemDetailText(copy, "固定内容"), value: feature ?? (model.loading_state.definition ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "没有固定能力")) },
    { label: itemDetailText(copy, "获取状态"), value: model.sources.entries.length ? sourceStatusShortLabel(copy, model.sources.status) : model.loading_state.definition ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "尚未确认") }
  ];
}

function ArmorLoadingNote({ text }: { text: string }) {
  return <p className="armor-detail-loading-note" role="status" aria-live="polite"><span aria-hidden="true" />{text}</p>;
}

function ArmorDataSkeleton({ rows }: { rows: number }) {
  return <div className="armor-detail-data-skeleton" aria-hidden="true">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>;
}

function ArmorFeatureSkeleton() {
  return <div className="armor-detail-feature-skeleton" aria-hidden="true"><i /><div><b /><span /><span /></div></div>;
}

function ArmorSocketSkeleton() {
  return <div className="armor-detail-socket-skeleton" aria-hidden="true">{Array.from({ length: 3 }, (_, index) => <span key={index} />)}</div>;
}

function ArmorDefinitionStatRule({ copy }: { copy: ItemDetailCopy }) {
  return (
    <article className="armor-detail-definition-rule" data-ui-kind="callout" data-callout-tone="info">
      <strong>{itemDetailText(copy, "这个版本没有固定六维属性")}</strong>
      <p>{itemDetailText(copy, "实际属性只存在于商人当前售卖品或账号中的具体护甲；资料库不会模拟一件不存在的 Roll。")}</p>
    </article>
  );
}

function armorStatsLoadingText(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "account_item") return itemDetailText(copy, "正在读取这件护甲的基础属性、当前实际值和强化状态。");
  if (kind === "vendor_offer") return itemDetailText(copy, "正在读取本次售卖的六维属性、价格和购买条件。");
  return itemDetailText(copy, "正在读取这个版本的属性规则、固定能力和获取方式。");
}

function armorStatSourceLabel(copy: ItemDetailCopy, model: ArmorDetailViewModel): string {
  if (model.context.kind === "account_item") return model.stats.length ? itemDetailText(copy, "当前装备 · 已确认") : model.loading_state.instance ? itemDetailText(copy, "当前装备 · 读取中") : itemDetailText(copy, "当前装备未返回属性");
  if (model.context.kind === "vendor_offer") return model.stats.length ? itemDetailText(copy, "当前售卖 · 已确认") : model.loading_state.definition ? itemDetailText(copy, "当前售卖 · 读取中") : itemDetailText(copy, "当前售卖未提供属性");
  return model.loading_state.definition ? itemDetailText(copy, "资料库属性规则 · 读取中") : itemDetailText(copy, "资料库版本没有固定属性");
}

function armorStatNote(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "account_item") return itemDetailText(copy, "当前实际值只包含可确认归属于这件护甲的数值；角色级加成不会补入。");
  if (kind === "vendor_offer") return itemDetailText(copy, "这些数值只代表本次售卖品，不会回退展示其他角色或上一次售卖属性。");
  return itemDetailText(copy, "资料库定义不生成单件护甲属性。");
}

function armorSourceNote(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "vendor_offer") return itemDetailText(copy, "历史获取方式和当前售卖分别展示；购买资格未知时不会推断为可购买。");
  if (kind === "account_item") return itemDetailText(copy, "获取来源描述这件护甲的版本来源，不代表当前仍然可以获得。");
  return itemDetailText(copy, "资料库记录历史来源；只有实时商人或活动数据才能说明当前是否存在获取入口。");
}

function armorConfigurationTitle(copy: ItemDetailCopy, kind: ArmorObjectKind, isExotic: boolean, hasSet: boolean): string {
  const feature = isExotic ? itemDetailText(copy, "异域能力") : hasSet ? itemDetailText(copy, "套装效果") : itemDetailText(copy, "固定能力");
  if (kind === "account_item") return itemDetailTemplate(copy, "{feature}与本件配置", { feature });
  if (kind === "vendor_offer") return itemDetailTemplate(copy, "{feature}与售卖配置", { feature });
  return itemDetailTemplate(copy, "{feature}与支持项", { feature });
}

function armorConfigurationDescription(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "account_item") return itemDetailText(copy, "固定能力、套装规则和这件护甲已安装的真实内容分别展示。");
  if (kind === "vendor_offer") return itemDetailText(copy, "固定能力、套装规则和本次售卖可确认的配置分别展示，全部只读。");
  return itemDetailText(copy, "资料库版本只说明固定能力、套装规则和定义可确认的支持项。");
}

function armorConfigurationSource(copy: ItemDetailCopy, kind: ArmorObjectKind, loading: boolean): string {
  const state = loading ? itemDetailText(copy, "读取中") : itemDetailText(copy, "当前确认");
  if (kind === "account_item") return itemDetailTemplate(copy, "当前装备 + 游戏资料 · {state}", { state });
  if (kind === "vendor_offer") return itemDetailTemplate(copy, "当前售卖 + 游戏资料 · {state}", { state });
  return itemDetailTemplate(copy, "资料库版本 · {state}", { state });
}

function armorConfigurationLoadingText(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "account_item") return itemDetailText(copy, "已确认的本件配置会先显示，固定能力和完整插槽信息随后补齐。");
  if (kind === "vendor_offer") return itemDetailText(copy, "正在读取本次售卖配置；不会用资料库支持项代替当前售卖内容。");
  return itemDetailText(copy, "正在读取固定能力、套装规则和这个版本支持的插槽信息。");
}

function armorConfigurationStatus(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "account_item") return itemDetailText(copy, "可管理装备");
  if (kind === "vendor_offer") return itemDetailText(copy, "售卖只读");
  return itemDetailText(copy, "定义只读");
}

function armorSocketCountLabel(copy: ItemDetailCopy, kind: ArmorObjectKind, count: number, loading: boolean): string {
  if (loading && count === 0) return itemDetailText(copy, "配置插槽读取中");
  if (kind === "account_item") return itemDetailTemplate(copy, "{count} 个本件配置项", { count });
  if (kind === "vendor_offer") return itemDetailTemplate(copy, "{count} 个售卖配置项", { count });
  return itemDetailTemplate(copy, "{count} 个定义支持项", { count });
}

function armorConfigurationCountLabel(
  copy: ItemDetailCopy,
  kind: ArmorObjectKind,
  socketCount: number,
  abilityGroupCount: number,
  loading: boolean
): string {
  if (!abilityGroupCount) return armorSocketCountLabel(copy, kind, socketCount, loading);
  const socketLabel = socketCount > 0 ? ` · ${armorSocketCountLabel(copy, kind, socketCount, false)}` : "";
  return itemDetailTemplate(copy, "{count} 个异域能力组{rest}", { count: abilityGroupCount, rest: socketLabel });
}

function armorSocketFallback(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "account_item") return itemDetailText(copy, "这件护甲当前已安装的内容");
  if (kind === "vendor_offer") return itemDetailText(copy, "本次售卖可确认的配置");
  return itemDetailText(copy, "资料库定义支持内容");
}

function armorSocketEmptyText(copy: ItemDetailCopy, kind: ArmorObjectKind, hasAbilityGroups = false): string {
  if (hasAbilityGroups) return itemDetailText(copy, "没有返回额外的护甲模组配置；异域能力支持项已在上方列出。");
  if (kind === "account_item") return itemDetailText(copy, "读取完成，但游戏没有返回这件护甲的可显示配置。");
  if (kind === "vendor_offer") return itemDetailText(copy, "读取完成，但当前售卖没有返回可显示的护甲配置。");
  return itemDetailText(copy, "资料库没有返回这个版本可确认的玩家配置插槽。");
}

function armorUpgradeTitle(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "account_item") return itemDetailText(copy, "本件能量与强化状态");
  if (kind === "vendor_offer") return itemDetailText(copy, "当前售卖强化状态");
  return itemDetailText(copy, "强化规则与定义支持");
}

function armorUpgradeDescription(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "account_item") return itemDetailText(copy, "只展示这件护甲可确认的能量、强化和属性变化。");
  if (kind === "vendor_offer") return itemDetailText(copy, "只展示本次售卖明确提供的强化事实，未提供的状态不补造。");
  return itemDetailText(copy, "资料库版本不保存单件升级进度，只展示定义可确认的强化支持。");
}

function armorUpgradeSource(copy: ItemDetailCopy, kind: ArmorObjectKind, loading: boolean): string {
  const state = loading ? itemDetailText(copy, "读取中") : itemDetailText(copy, "当前确认");
  if (kind === "account_item") return itemDetailTemplate(copy, "当前装备 + 游戏规则 · {state}", { state });
  if (kind === "vendor_offer") return itemDetailTemplate(copy, "当前售卖 + 游戏规则 · {state}", { state });
  return itemDetailTemplate(copy, "资料库强化规则 · {state}", { state });
}

function armorUpgradeLoadingText(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "account_item") return itemDetailText(copy, "正在读取这件护甲的能量容量、使用情况和强化插槽。");
  if (kind === "vendor_offer") return itemDetailText(copy, "正在核对当前售卖是否提供可确认的强化状态。");
  return itemDetailText(copy, "正在读取这个版本可确认的强化规则和支持项。");
}

function armorUpgradeSummary(
  copy: ItemDetailCopy,
  model: ArmorDetailViewModel,
  upgradeSocketCount: number,
  loading: boolean
): Array<{ label: string; value: string }> {
  if (model.context.kind === "account_item") {
    return [
      { label: itemDetailText(copy, "当前查看"), value: itemDetailText(copy, "当前装备") },
      { label: itemDetailText(copy, "能量容量"), value: model.energy ? itemDetailTemplate(copy, "{capacity} 级", { capacity: model.energy.capacity }) : loading ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "未确认") },
      { label: itemDetailText(copy, "已用能量"), value: model.energy ? String(model.energy.used) : loading ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "未确认") },
      { label: itemDetailText(copy, "剩余能量"), value: model.energy ? String(model.energy.unused) : loading ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "未确认") }
    ];
  }
  if (model.context.kind === "vendor_offer") {
    return [
      { label: itemDetailText(copy, "当前查看"), value: itemDetailText(copy, "当前售卖") },
      { label: itemDetailText(copy, "售卖能量"), value: model.energy ? itemDetailTemplate(copy, "{capacity} 级", { capacity: model.energy.capacity }) : loading ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "商人未提供") },
      { label: itemDetailText(copy, "强化内容"), value: upgradeSocketCount ? itemDetailTemplate(copy, "{count} 项", { count: upgradeSocketCount }) : loading ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "未提供") },
      { label: itemDetailText(copy, "操作状态"), value: loading ? itemDetailText(copy, "读取中") : itemDetailText(copy, "购买前只读") }
    ];
  }
  return [
    { label: itemDetailText(copy, "当前查看"), value: itemDetailText(copy, "资料库版本") },
    { label: itemDetailText(copy, "单件进度"), value: itemDetailText(copy, "由具体装备决定") },
    { label: itemDetailText(copy, "定义支持"), value: upgradeSocketCount ? itemDetailTemplate(copy, "{count} 项", { count: upgradeSocketCount }) : loading ? itemDetailText(copy, "正在读取") : itemDetailText(copy, "未标注") },
    { label: itemDetailText(copy, "操作状态"), value: loading ? itemDetailText(copy, "读取中") : itemDetailText(copy, "规则只读") }
  ];
}

function armorUpgradeEmptyText(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "account_item") return itemDetailText(copy, "读取完成，但游戏没有返回这件护甲的强化状态。");
  if (kind === "vendor_offer") return itemDetailText(copy, "当前商人没有提供这件售卖护甲的强化状态。");
  return itemDetailText(copy, "资料库不保存单件护甲的能量和升级进度。");
}

function armorTargetUnknownText(copy: ItemDetailCopy, kind: ArmorObjectKind): string {
  if (kind === "definition") return itemDetailText(copy, "资料库版本没有单件属性，无法判断属性门槛。");
  if (kind === "vendor_offer") return itemDetailText(copy, "当前售卖没有可确认的属性匹配数据。");
  return itemDetailText(copy, "当前装备没有可确认的属性匹配数据。");
}

function sourceStatusShortLabel(copy: ItemDetailCopy, status: ArmorDetailViewModel["sources"]["status"]): string {
  if (status === "ready") return itemDetailText(copy, "当前可确认");
  if (status === "partial") return itemDetailText(copy, "部分可用");
  return itemDetailText(copy, "尚未确认");
}

function OverviewSection({ model, copy }: { model: ArmorDetailViewModel; copy: ItemDetailCopy }) {
  const statsLoading = model.context.kind === "account_item"
    ? model.loading_state.instance
    : model.loading_state.definition;
  const sourceLoading = model.loading_state.definition && !model.sources.entries.length;
  return (
    <>
      <SectionHeading
        eyebrow={itemDetailText(copy, "属性与获取")}
        title={armorOverviewTitle(copy, model.context.kind)}
        description={armorOverviewDescription(copy, model.context.kind)}
      />
      <ArmorObjectSummary model={model} copy={copy} />
      {statsLoading ? <ArmorLoadingNote text={armorStatsLoadingText(copy, model.context.kind)} /> : null}
      <div className="armor-detail-overview-grid">
        <section className="armor-detail-data-block">
          <DataBlockHeading title={itemDetailText(copy, "护甲属性")} source={armorStatSourceLabel(copy, model)} />
          {model.stats.length ? (
            <>
              <div className="armor-detail-stat-list">
                {model.stats.map((stat) => <ArmorStatRow key={stat.key} stat={stat} kind={model.context.kind} copy={copy} />)}
              </div>
              <p className="armor-detail-stat-note">{armorStatNote(copy, model.context.kind)}</p>
            </>
          ) : statsLoading
            ? <ArmorDataSkeleton rows={6} />
            : model.context.kind === "definition"
              ? <ArmorDefinitionStatRule copy={copy} />
              : <EmptyState text={model.context.kind === "vendor_offer"
                ? itemDetailText(copy, "读取完成，但当前售卖内容没有返回可显示的护甲属性。")
                : itemDetailText(copy, "读取完成，但游戏没有返回这件护甲的可显示属性。")} />}
        </section>

        <section className="armor-detail-data-block">
          <DataBlockHeading title={itemDetailText(copy, "获取来源")} source={sourceStatusLabel(copy, model)} />
          {model.sources.entries.length ? (
            <div className="armor-detail-source-ledger">
              {model.sources.entries.map((source) => (
                <article key={source.id} className="armor-detail-source-row" data-surface="row" data-status={source.available_now === true ? "success" : source.available_now === false ? "warning" : "neutral"}>
                  <strong>{source.label}</strong>
                  <p>{source.description}</p>
                  <span className={source.available_now === false ? "is-muted" : source.available_now === undefined ? "is-neutral" : undefined}>{source.status_label ?? (source.available_now ? itemDetailText(copy, "当前可获得") : itemDetailText(copy, "来源已记录"))}</span>
                </article>
              ))}
            </div>
          ) : sourceLoading
            ? <ArmorDataSkeleton rows={3} />
            : <EmptyState text={itemDetailText(copy, "这件护甲的获取方式暂未确认。")} />}
          <p className="armor-detail-note" data-ui-kind="callout" data-callout-tone="info">{armorSourceNote(copy, model.context.kind)}</p>
        </section>
      </div>
    </>
  );
}

function ConfigurationSection({ model, copy }: { model: ArmorDetailViewModel; copy: ItemDetailCopy }) {
  const isExotic = /异域|exotic/i.test(model.identity.tier ?? "");
  const armorSet = model.identity.armor_set;
  const abilityOptionHashes = new Set(model.ability_groups.flatMap((group) => group.options.map((option) => option.hash)));
  const configurationSockets = model.sockets.filter((socket) => socket.kind !== "upgrade" && !abilityOptionHashes.has(socket.hash));
  const configurationLoading = model.loading_state.definition
    || (model.context.kind === "account_item" && model.loading_state.instance);
  const featureLoading = model.loading_state.definition && !armorSet && !model.abilities.length && !model.ability_groups.length;
  const socketLoading = configurationLoading && !configurationSockets.length;
  return (
    <>
      <SectionHeading
        eyebrow={itemDetailText(copy, "护甲配置")}
        title={armorConfigurationTitle(copy, model.context.kind, isExotic, Boolean(armorSet))}
        description={armorConfigurationDescription(copy, model.context.kind)}
      />
      <DataBlockHeading title={itemDetailText(copy, "配置数据")} source={armorConfigurationSource(copy, model.context.kind, configurationLoading)} />
      {configurationLoading ? <ArmorLoadingNote text={armorConfigurationLoadingText(copy, model.context.kind)} /> : null}
      <div className="armor-detail-configuration">
        <div className="armor-detail-configuration-grid">
          <div className="armor-detail-core-features">
            {armorSet ? <ArmorSetBonus armorSet={armorSet} copy={copy} /> : null}
            {model.abilities.length ? model.abilities.map((ability) => (
              <article key={ability.hash} className={["armor-detail-core-feature", isExotic && "is-exotic"].filter(Boolean).join(" ")} data-ui-kind="object-card">
                <GameAssetImage className="game-definition-icon" src={ability.icon} alt="" loading="eager" fallback={<span className="armor-detail-core-feature-icon" aria-hidden="true" />} />
                <div><span>{isExotic ? itemDetailText(copy, "异域固有能力") : itemDetailText(copy, "护甲能力")}</span><h4>{ability.name}</h4><p>{ability.description}</p><small>{itemDetailText(copy, "固定能力与单件随机属性、已安装配置分别展示。")}</small></div>
              </article>
            )) : null}
            {model.ability_groups.map((group) => (
              <ArmorAbilityGroupCard key={group.key} model={model} group={group} copy={copy} />
            ))}
            {!armorSet && !model.abilities.length && !model.ability_groups.length
              ? featureLoading
                ? <ArmorFeatureSkeleton />
                : <EmptyState text={itemDetailText(copy, "游戏资料没有返回可确认的固定护甲能力。")} />
              : null}
          </div>
          <div className="armor-detail-capability-table">
            <CapabilityRow label={itemDetailText(copy, "适用职业")} value={model.identity.class_name ?? itemDetailText(copy, "所有职业")} status={itemDetailText(copy, "装备要求")} />
            <CapabilityRow label={itemDetailText(copy, "护甲部位")} value={model.identity.bucket_name ?? model.identity.item_type ?? itemDetailText(copy, "护甲")} status={itemDetailText(copy, "部位规则")} />
            <CapabilityRow label={itemDetailText(copy, "随机属性")} value={itemDetailText(copy, "每件商人售卖品或账号中的具体护甲可能拥有不同属性分布")} status={itemDetailText(copy, "每件可能不同")} />
            <CapabilityRow label={itemDetailText(copy, "当前查看")} value={armorObjectLabel(copy, model.context.kind)} status={armorConfigurationStatus(copy, model.context.kind)} />
            {isExotic ? <CapabilityRow label={itemDetailText(copy, "异域限制")} value={itemDetailText(copy, "同一时间只能装备一件异域护甲")} status={itemDetailText(copy, "装备规则")} /> : null}
          </div>
        </div>

        <div className="armor-detail-socket-block">
          <div className="armor-detail-socket-heading">
            <strong>{armorConfigurationCountLabel(copy, model.context.kind, configurationSockets.length, model.ability_groups.length, socketLoading)}</strong>
            <span>{armorObjectLabel(copy, model.context.kind)}</span>
          </div>
          {configurationSockets.length ? configurationSockets.map((socket) => (
            <article key={socket.key} className={socket.kind === "special" ? "is-special" : undefined}>
              <strong>{armorSocketLabelText(copy, socket.label)}</strong>
              <div><GameAssetImage className="game-definition-icon" src={socket.icon} alt="" loading="eager" /><p>{socket.name}</p></div>
              <small>{socket.description ?? armorSocketFallback(copy, model.context.kind)}</small>
            </article>
          )) : socketLoading
            ? <ArmorSocketSkeleton />
            : <EmptyState text={armorSocketEmptyText(copy, model.context.kind, model.ability_groups.length > 0)} />}
        </div>
      </div>
    </>
  );
}

function ArmorAbilityGroupCard(props: {
  model: ArmorDetailViewModel;
  group: ArmorDetailViewModel["ability_groups"][number];
  copy: ItemDetailCopy;
}) {
  const selectedOption = props.group.options.find((option) => option.hash === props.group.selected_option_hash);
  const contextLabel = props.model.context.kind === "account_item"
    ? itemDetailText(props.copy, "本件当前选择")
    : props.model.context.kind === "vendor_offer"
      ? itemDetailText(props.copy, "当前售卖选择")
      : itemDetailText(props.copy, "资料库支持能力");
  const selectionStatus = selectedOption
    ? itemDetailTemplate(props.copy, "{label}：{name}", { label: contextLabel, name: selectedOption.name })
    : props.model.context.kind === "vendor_offer"
      ? itemDetailText(props.copy, "本次售卖未固定学派，购买后可在游戏中选择")
      : props.model.context.kind === "account_item"
        ? itemDetailText(props.copy, "本件当前选择尚未返回")
        : itemDetailText(props.copy, "该护甲支持以下异域能力选择");
  return (
    <section className="armor-detail-ability-group" data-ui-kind="object-card" aria-label={props.group.name}>
      <header>
        <div><span>{itemDetailText(props.copy, "异域能力选择")}</span><h4>{props.group.name}</h4></div>
        <small>{selectionStatus}</small>
      </header>
      <ol>
        {props.group.options.map((option) => {
          const selected = option.hash === props.group.selected_option_hash;
          return (
            <li key={option.hash} data-selected={selected ? "true" : undefined}>
              <GameAssetImage className="game-definition-icon" src={option.icon} alt="" loading="eager" fallback={<span className="armor-detail-ability-option-icon" aria-hidden="true" />} />
              <div><strong>{option.name}</strong><p>{option.description}</p></div>
              <em>{selected ? contextLabel : itemDetailText(props.copy, "可选能力")}</em>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ArmorSetBonus(props: { armorSet: NonNullable<ArmorDetailViewModel["identity"]["armor_set"]>; copy: ItemDetailCopy }) {
  const bonuses = props.armorSet.bonuses ?? [];
  return (
    <section className="armor-detail-set-bonus" data-ui-kind="object-card" aria-label={itemDetailTemplate(props.copy, "{name}套装效果", { name: props.armorSet.name })}>
      <header>
        <div><span>{itemDetailText(props.copy, "套装效果")}</span><h4>{props.armorSet.name}</h4></div>
        <small>{itemDetailText(props.copy, "游戏官方套装规则")}</small>
      </header>
      {props.armorSet.description ? <p className="armor-detail-set-description">{props.armorSet.description}</p> : null}
      {bonuses.length ? (
        <ol>
          {bonuses.map((bonus, index) => (
            <li key={`${bonus.required_piece_count}:${bonus.perk_hash}`}>
              <strong>{itemDetailTemplate(props.copy, "{count} 件套", { count: bonus.required_piece_count })}</strong>
              <GameAssetImage className="game-definition-icon" src={bonus.icon} alt="" loading="eager" fallback={<span className="armor-detail-set-perk-icon" aria-hidden="true" />} />
              <div><b>{bonus.name ?? itemDetailTemplate(props.copy, "套装效果 {index}", { index: index + 1 })}</b><p>{bonus.description ?? itemDetailText(props.copy, "官方套装效果定义未返回说明。")}</p></div>
            </li>
          ))}
        </ol>
      ) : <EmptyState text={itemDetailText(props.copy, "官方套装定义未返回可确认的套装效果。")} />}
    </section>
  );
}

/**
 * 目标匹配：装备目标与本地目标规则各出一张卡，来源名直接读 `recommendation.source_label`
 * （生产侧按数据取名），这里不按来源身份分叉，也不做跨来源合并或排序（T62）。
 */
function TargetSection({ model, copy }: { model: ArmorDetailViewModel; copy: ItemDetailCopy }) {
  const targets = model.recommendations;
  return (
    <>
      <SectionHeading eyebrow={itemDetailText(copy, "目标匹配")} title={itemDetailText(copy, "独立数据源条件匹配")} description={itemDetailText(copy, "装备目标与本地目标规则分别匹配，不合并排序，不生成保留或购买结论。")} />
      <div className="armor-detail-target-list">
        {targets.length
          ? targets.map((recommendation) => <RecommendationCard key={recommendation.id} model={model} recommendation={recommendation} copy={copy} />)
          : <EmptyState text={itemDetailText(copy, "当前没有可匹配的护甲目标；不会从其他来源补齐。")} />}
      </div>
    </>
  );
}

function UpgradeSection({ model, copy }: { model: ArmorDetailViewModel; copy: ItemDetailCopy }) {
  const upgradeSockets = model.sockets.filter((socket) => socket.kind === "upgrade");
  const baseTotal = confirmedBaseTotal(model.stats);
  const upgradeLoading = model.context.kind === "account_item"
    ? model.loading_state.instance
    : model.loading_state.definition;
  const objectLabel = armorObjectLabel(copy, model.context.kind);
  const rows = [
    model.context.kind !== "definition" && model.energy ? {
      key: "capacity",
      label: itemDetailText(copy, "能量容量"),
      definition: itemDetailText(copy, "游戏返回的强化状态"),
      current: itemDetailTemplate(copy, "{capacity} 级", { capacity: model.energy.capacity }),
      source: model.context.kind === "vendor_offer" ? itemDetailText(copy, "当前售卖") : itemDetailText(copy, "当前装备")
    } : null,
    model.context.kind !== "definition" && model.energy ? {
      key: "usage",
      label: itemDetailText(copy, "能量使用"),
      definition: itemDetailText(copy, "已用与剩余能量"),
      current: itemDetailTemplate(copy, "已用 {used} · 剩余 {unused}", { used: model.energy.used, unused: model.energy.unused }),
      source: model.context.kind === "vendor_offer" ? itemDetailText(copy, "当前售卖") : itemDetailText(copy, "当前装备")
    } : null,
    model.context.kind === "account_item" && baseTotal !== undefined ? {
      key: "stats",
      label: itemDetailText(copy, "强化后属性"),
      definition: itemDetailTemplate(copy, "基础 {value}", { value: baseTotal }),
      current: itemDetailTemplate(copy, "当前 {value}", { value: model.stat_total ?? sumCurrentStats(model.stats) }),
      source: itemDetailText(copy, "本件属性与模组")
    } : null,
    ...upgradeSockets.map((socket) => ({
      key: socket.key,
      label: armorSocketLabelText(copy, socket.label),
      definition: socket.description ?? itemDetailText(copy, "强化类插槽"),
      current: socket.name,
      source: model.context.kind === "definition" ? itemDetailText(copy, "资料库版本") : objectLabel
    }))
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));
  const summary = armorUpgradeSummary(copy, model, upgradeSockets.length, upgradeLoading);
  return (
    <>
      <SectionHeading eyebrow={itemDetailText(copy, "强化状态")} title={armorUpgradeTitle(copy, model.context.kind)} description={armorUpgradeDescription(copy, model.context.kind)} />
      <DataBlockHeading title={itemDetailText(copy, "强化数据")} source={armorUpgradeSource(copy, model.context.kind, upgradeLoading)} />
      {upgradeLoading ? <ArmorLoadingNote text={armorUpgradeLoadingText(copy, model.context.kind)} /> : null}
      <div className="armor-detail-upgrade-layout">
        <div className="armor-detail-upgrade-summary">
          {summary.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
        </div>
        {rows.length ? (
          <div className="armor-detail-upgrade-table" role="table" aria-label={itemDetailText(copy, "护甲强化状态")}>
            <div role="row"><strong role="columnheader">{itemDetailText(copy, "项目")}</strong><strong role="columnheader">{itemDetailText(copy, "规则／基础")}</strong><strong role="columnheader">{objectLabel}</strong><strong role="columnheader">{itemDetailText(copy, "数据来源")}</strong></div>
            {rows.map((row) => <div key={row.key} role="row"><strong role="cell">{row.label}</strong><span role="cell">{row.definition}</span><span role="cell">{row.current}</span><span role="cell">{row.source}</span></div>)}
          </div>
        ) : upgradeLoading
          ? <ArmorDataSkeleton rows={3} />
          : <EmptyState text={armorUpgradeEmptyText(copy, model.context.kind)} />}
      </div>
    </>
  );
}

function InstancesRail(props: { model: ArmorDetailViewModel; copy: ItemDetailCopy; onSelect?: (instance: ArmorDetailInstance) => boolean | void }) {
  return (
    <section className="armor-detail-rail-instances">
      <div className="armor-detail-rail-heading">
        <div><span>{itemDetailText(props.copy, "账号已有")}</span><h3>{itemDetailText(props.copy, "同版本护甲")}</h3></div>
        <strong>{itemDetailTemplate(props.copy, "{count} 件", { count: props.model.same_hash_instances.length })}</strong>
      </div>
      {props.model.same_hash_instances.length ? (
        <div className="armor-detail-instance-list" role="list">
          {props.model.same_hash_instances.map((instance) => (
            <button
              key={instance.instance_id}
              type="button"
              role="listitem"
              className={instance.current ? "is-current" : undefined}
              aria-current={instance.current ? "true" : undefined}
              onClick={() => props.onSelect?.(instance)}
              disabled={!props.onSelect}
            >
              <header><strong>{instance.current ? itemDetailText(props.copy, "当前装备") : instance.equipped ? itemDetailText(props.copy, "已装备护甲") : itemDetailText(props.copy, "账号护甲")}</strong><span>{instance.location ?? itemDetailSourceLocationLabel(props.copy, instance.source_kind)}{instance.power ? ` · ${instance.power}` : ""}</span></header>
              <div className="armor-detail-instance-total"><strong>{instance.stats?.total ?? "—"}</strong><span>{energyLabel(props.copy, instance.energy)}</span></div>
              {instance.stats ? <div className="armor-detail-stat-strip">{instanceStatEntries(props.copy, instance).map(([label, value]) => <span key={label}>{label}<b>{value}</b></span>)}</div> : <small className="armor-detail-instance-no-stats">{itemDetailText(props.copy, "属性暂未获取")}</small>}
              <div className="armor-detail-instance-foot">
                <span>{instance.locked === undefined ? itemDetailText(props.copy, "锁定状态未知") : instance.locked ? itemDetailText(props.copy, "已锁定") : itemDetailText(props.copy, "未锁定")}</span>
                <span>{instance.equipped ? itemDetailText(props.copy, "已装备") : itemDetailText(props.copy, "未装备")}</span>
                {instance.plug_names.slice(0, 2).map((name, plugIndex) => <span key={`${name}-${plugIndex}`}>{name}</span>)}
              </div>
            </button>
          ))}
        </div>
      ) : <EmptyState text={itemDetailText(props.copy, "账号中没有这个版本的护甲。")} />}
      <p className="armor-detail-rail-note">{itemDetailText(props.copy, "这里只显示账号中相同游戏版本的护甲；装备和转移仍受职业兼容性限制。")}</p>
    </section>
  );
}

function SectionHeading(props: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="armor-detail-section-heading">
      <div><span data-ui-part="label" data-text-tone="meta" data-info-priority="support">{props.eyebrow}</span><h3 data-ui-part="value" data-text-tone="primary" data-info-priority="display">{props.title}</h3></div>
      <p data-ui-part="detail" data-text-tone="body" data-info-priority="reading">{props.description}</p>
    </div>
  );
}

function DataBlockHeading(props: { title: string; source: string }) {
  return <div className="armor-detail-data-heading"><h4 data-ui-part="value" data-text-tone="primary" data-info-priority="context">{props.title}</h4><span data-ui-part="source" data-text-tone="meta" data-info-priority="trace">{props.source}</span></div>;
}

function Fact(props: { label: string; tone?: string; title?: string }) {
  return <span className={["armor-detail-fact", props.tone].filter(Boolean).join(" ")} title={props.title} data-ui-part="value" data-text-tone="primary" data-info-priority="support">{props.label}</span>;
}

function CapabilityRow(props: { label: string; value: string; status: string }) {
  return <div><strong>{props.label}</strong><span>{props.value}</span><em>{props.status}</em></div>;
}

function ArmorStatRow({ stat, kind, copy }: { stat: ArmorStatTrack; kind: ArmorObjectKind; copy: ItemDetailCopy }) {
  const base = stat.base;
  const showBase = kind === "account_item" && base !== undefined;
  const baseWidth = showBase ? Math.max(0, Math.min(100, ((base ?? 0) / 45) * 100)) : 0;
  const currentWidth = Math.max(0, Math.min(100, (stat.value / 45) * 100));
  const style = {
    "--armor-stat-base": `${baseWidth}%`,
    "--armor-stat-current": `${currentWidth}%`
  } as CSSProperties;
  return (
    <div className="armor-detail-stat-row" data-surface="row">
      <strong>{armorStatLabel(copy, stat.key)}</strong>
      <span className="armor-detail-stat-base">{kind === "vendor_offer" ? itemDetailText(copy, "售卖属性") : base !== undefined ? itemDetailTemplate(copy, "基础 {value}", { value: base }) : itemDetailText(copy, "基础未确认")}</span>
      <i style={style} aria-hidden="true"><b className="is-current" />{showBase ? <b className="is-base" /> : null}</i>
      <span className="armor-detail-stat-current">{stat.value}</span>
      {stat.mod ? <small>{itemDetailTemplate(copy, "已确认加成 +{value}", { value: stat.mod })}</small> : null}
    </div>
  );
}

function RecommendationCard({ model, recommendation, copy }: { model: ArmorDetailViewModel; recommendation: ArmorRecommendation; copy: ItemDetailCopy }) {
  const match = recommendationMatch(copy, recommendation.match);
  const objectLabel = armorObjectLabel(copy, model.context.kind);
  return (
    <article className="armor-detail-recommendation" data-surface="object-card" data-ui-kind="object-card">
      <header><div><h4>{recommendation.title}</h4><p>{itemDetailTemplate(copy, "{source} · 独立来源", { source: recommendation.source_label })}</p></div><span>{itemDetailText(copy, "条件匹配")}</span></header>
      <div className="armor-detail-condition-list">
        <div><span>{itemDetailText(copy, "目标条件")}</span><strong>{recommendation.value}</strong><em>{itemDetailText(copy, "来源定义")}</em></div>
        <div data-status={recommendation.match === "full" ? "success" : recommendation.match ? "warning" : "neutral"}><span>{objectLabel}</span><strong>{recommendation.match ? itemDetailTemplate(copy, "{object}：{match}", { object: objectLabel, match }) : armorTargetUnknownText(copy, model.context.kind)}</strong><em className={recommendation.match === "full" ? "is-hit" : recommendation.match ? "is-miss" : "is-unknown"}>{match}</em></div>
      </div>
      <p className="armor-detail-source-quote" data-ui-kind="callout" data-callout-tone="info">{recommendation.reason}</p>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="armor-detail-empty">{text}</p>;
}

function confirmedBaseTotal(stats: ArmorStatTrack[]): number | undefined {
  return stats.length && stats.every((stat) => stat.base !== undefined)
    ? stats.reduce((total, stat) => total + (stat.base ?? 0), 0)
    : undefined;
}

function sumCurrentStats(stats: ArmorStatTrack[]): number {
  return stats.reduce((total, stat) => total + stat.value, 0);
}

function energyLabel(copy: ItemDetailCopy, energy: ArmorDetailViewModel["energy"]): string {
  if (!energy) return itemDetailText(copy, "强化状态未确认");
  return itemDetailTemplate(copy, "{capacity} 级能量 · 剩余 {unused}", { capacity: energy.capacity, unused: energy.unused });
}

function sourceStatusLabel(copy: ItemDetailCopy, model: ArmorDetailViewModel): string {
  const state = sourceStatusShortLabel(copy, model.sources.status);
  if (model.context.kind === "vendor_offer") return itemDetailTemplate(copy, "当前售卖 + 游戏资料 · {state}", { state });
  if (model.context.kind === "account_item") return itemDetailTemplate(copy, "装备版本来源 + 当前获取状态 · {state}", { state });
  return itemDetailTemplate(copy, "资料库历史来源 + 当前获取状态 · {state}", { state });
}

function recommendationMatch(copy: ItemDetailCopy, match: ArmorRecommendation["match"]): string {
  if (match === "full") return itemDetailText(copy, "达到条件");
  if (match === "partial") return itemDetailText(copy, "部分达到");
  if (match === "none") return itemDetailText(copy, "未达到条件");
  return itemDetailText(copy, "无实例数据");
}

function instanceStatEntries(copy: ItemDetailCopy, instance: ArmorDetailInstance): Array<[string, number]> {
  if (!instance.stats) return [];
  return [
    [itemDetailText(copy, "生"), instance.stats.health],
    [itemDetailText(copy, "近"), instance.stats.melee],
    [itemDetailText(copy, "雷"), instance.stats.grenade],
    [itemDetailText(copy, "超"), instance.stats.super],
    [itemDetailText(copy, "职"), instance.stats.class],
    [itemDetailText(copy, "武"), instance.stats.weapon]
  ];
}
