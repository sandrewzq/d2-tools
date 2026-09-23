import type { ReactNode } from "react";
import type { VendorOfferContext } from "./SharedItemDetailDialog.js";

/**
 * 商人售卖区。装备详情弹框和资料库定义弹框渲染的是同一份 `VendorOfferContext`，
 * 字段名却各自写死过一遍；这里收成一份，`text` / `template` 由调用方按自己页面的 copy 绑好传进来。
 * `extra` 放调用方独有的尾巴（资料库定义弹框会在这里补一行售卖属性）。
 */
export function ItemDetailVendorContext(props: {
  context: VendorOfferContext;
  text: (key: string) => string;
  template: (key: string, values: Record<string, string | number>) => string;
  showRollLabels?: boolean;
  extra?: ReactNode;
}) {
  const { text, template, context } = props;
  return (
    <section className="shared-item-detail-vendor" role="region" aria-label={text("商人售卖信息")}>
      <strong>{context.vendorName}</strong>
      <span>{context.costLabel}</span>
      <span>{context.affordabilityLabel}</span>
      <span>{context.characterLabel}</span>
      <span>{context.refreshLabel}</span>
      {context.ownershipLabel ? (
        <span>{template("账号状态：{value}", { value: context.ownershipLabel })}</span>
      ) : null}
      {context.ownershipLocationLabel ? (
        <span>{template("实例位置：{value}", { value: context.ownershipLocationLabel })}</span>
      ) : null}
      {context.ownershipAsOfLabel ? (
        <span>{template("账号数据：{value}", { value: context.ownershipAsOfLabel })}</span>
      ) : null}
      {props.showRollLabels !== false && context.rollLabels?.length ? (
        <span>{template("当前售卖 Perk：{value}", { value: context.rollLabels.join(" / ") })}</span>
      ) : null}
      {props.extra}
    </section>
  );
}
