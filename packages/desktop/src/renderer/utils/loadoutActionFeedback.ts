export type LoadoutActionFeedbackState = "idle" | "pending" | "success";
export type LoadoutActionKind = "transfer" | "equip";

export const LOADOUT_ACTION_FEEDBACK_TIMEOUT_MS = 1600;

export function buildLoadoutActionFeedbackKey(
  templateId: string,
  item: { hash: number; instance_id?: string },
  action: LoadoutActionKind
): string {
  return `${templateId}:${item.instance_id ?? `hash:${item.hash}`}:${action}`;
}
