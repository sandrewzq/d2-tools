export type ItemTransferCharacterInput = {
  selectedCharacterId: string;
  sourceCharacterId?: string;
  sourceKind?: "equipped" | "inventory" | "vault" | "postmaster";
  transferToVault: boolean;
};

export function resolveItemTransferCharacterId(input: ItemTransferCharacterInput): string {
  if (!input.transferToVault) {
    return input.selectedCharacterId;
  }

  if (input.sourceKind === "equipped") {
    throw new Error("已装备的物品不能直接移入仓库。请先在游戏或工具里装备同位置替代品，再移动原装备。");
  }

  if (input.sourceCharacterId) {
    return input.sourceCharacterId;
  }

  throw new Error("移入仓库需要知道装备当前所在角色。请从角色装备或背包列表重新打开这件装备后再试。");
}
