export type LoadoutActionFeedbackState = "idle" | "pending" | "success";
export type LoadoutActionKind = "transfer" | "equip";

const actionLabels: Record<LoadoutActionKind, Record<LoadoutActionFeedbackState, string>> = {
  transfer: {
    idle: "只补这一件",
    pending: "补齐中...",
    success: "已补齐"
  },
  equip: {
    idle: "只装备这一件",
    pending: "装备中...",
    success: "已装备"
  }
};

export function buildLoadoutActionFeedbackKey(
  templateId: string,
  item: { hash: number; instance_id?: string },
  action: LoadoutActionKind
): string {
  return `${templateId}:${item.instance_id ?? `hash:${item.hash}`}:${action}`;
}

export function getLoadoutActionButtonLabel(
  action: LoadoutActionKind,
  state: LoadoutActionFeedbackState
): string {
  return actionLabels[action][state];
}
