import type { analyzeLoadoutTemplate } from "@d2-tools/core/loadouts/analysis";
import {
  api,
  type AccountItemSummary,
  type AccountSummary,
  type D2Config,
  type ItemActionResult,
  type LoadoutTemplate
} from "../../api/client";
import {
  createHighestPowerEquipPlan,
  createHighestPowerExecutionPlan
} from "../../utils/highestPower";
import {
  buildMissingLoadoutTransferPlan
} from "../../utils/loadoutTransfer";
import { buildLoadoutActionFeedbackKey } from "../../utils/loadoutActionFeedback";
import type { SelectedItemSource } from "../../shared/hooks/useItemDetail";
import {
  findBestTemplateSourceItem,
  getMissingLoadoutActionableCount
} from "./loadoutViewModel";

type LoadoutLibraryBridge = {
  reloadTemplates: () => Promise<void>;
  renameTemplate: (template: LoadoutTemplate) => Promise<LoadoutTemplate>;
  deleteTemplate: (id: string) => Promise<LoadoutTemplate[]>;
};

type DiagnosticsBridge = {
  setWriteActionsEnabled: (enabled: boolean) => void;
  loadActionLog: () => Promise<void>;
};

type LoadoutActionFeedbackBridge = {
  setSingleActionFeedback: (key: string, state: "idle" | "pending" | "success") => void;
};

export function useLoadoutWriteActions(input: {
  accountSummary: AccountSummary | null;
  loadoutLibrary: LoadoutLibraryBridge;
  diagnostics: DiagnosticsBridge;
  loadoutActionFeedback: LoadoutActionFeedbackBridge;
  setLoadoutMessage: (message: string) => void;
  setItemActionMessage: (message: string) => void;
  setIsRunningItemAction: (isRunning: boolean) => void;
  loadAccountSummary: () => Promise<void>;
  openItemDetail: (item: AccountItemSummary, source?: SelectedItemSource) => void | Promise<void>;
}) {
  async function ensureWriteActionsEnabled(setMessage: (message: string) => void): Promise<D2Config | null> {
    try {
      const latestConfig = await api.getConfig();
      input.diagnostics.setWriteActionsEnabled(latestConfig.features.write_actions_enabled);
      if (!latestConfig.features.write_actions_enabled) {
        setMessage("d2-tools 本地写操作开关未开启。请到左侧“设置”页开启后再执行。");
        return null;
      }
      return latestConfig;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取写操作配置失败");
      return null;
    }
  }

  async function saveCharacterLoadout(character: AccountSummary["characters"][number]) {
    input.setLoadoutMessage("");
    try {
      const template = await api.createLoadoutTemplate({
        name: `${character.class_name} 光等 ${character.light ?? "-"}`,
        character_id: character.character_id,
        class_name: character.class_name,
        equipped_items: character.equipped_items
      });
      await input.loadoutLibrary.reloadTemplates();
      input.setLoadoutMessage(`已保存本地配装模板：${template.name}`);
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : "配装模板保存失败");
    }
  }

  async function equipHighestPowerItems(character: AccountSummary["characters"][number]) {
    if (!input.accountSummary) return;

    const plan = createHighestPowerEquipPlan({
      character,
      vaultItems: input.accountSummary.vault.items
    });
    const executionPlan = createHighestPowerExecutionPlan(plan);

    input.setLoadoutMessage("");
    input.setItemActionMessage("");

    if (!plan.executable_items.length) {
      input.setLoadoutMessage(`${character.class_name} 当前已经是最高光等组合。`);
      return;
    }

    const latestConfig = await ensureWriteActionsEnabled(input.setLoadoutMessage);
    if (!latestConfig) return;

    const executionSummary = [plan.summary, executionPlan.summary]
      .filter(Boolean)
      .join("\n");
    const actionPreview = plan.executable_items
      .map((entry) => `${entry.slot_label}：${entry.item.name} / 光等 ${entry.item.power ?? "-"} / ${formatHighestPowerSource(entry.source)}`)
      .join("\n");
    if (!window.confirm([
      `确认给 ${character.class_name} 装备最高光等组合？`,
      executionSummary,
      actionPreview,
      "说明：仓库里的装备会先取出到该角色，再执行装备。不会分解装备。"
    ].join("\n"))) {
      input.setLoadoutMessage("已取消装备最高光等。");
      return;
    }

    input.setIsRunningItemAction(true);

    try {
      let transferResult = { success_count: 0, failed_count: 0 };
      let equipResult = { success_count: 0, failed_count: 0 };

      if (executionPlan.transfer_items.length) {
        input.setItemActionMessage(`正在从仓库取出 ${executionPlan.transfer_items.length} 件最高光等装备...`);
        transferResult = await api.batchTransferItems({
          membership_type: input.accountSummary.membership_type,
          character_id: character.character_id,
          items: executionPlan.transfer_items.map((entry) => ({
            membership_type: input.accountSummary?.membership_type ?? 0,
            character_id: character.character_id,
            item_id: entry.item.instance_id ?? "",
            item_reference_hash: entry.item.hash,
            item_name: entry.item.name,
            transfer_to_vault: false
          }))
        });
      }

      if (executionPlan.equip_items.length) {
        input.setItemActionMessage(`正在装备最高光等 ${executionPlan.equip_items.length} 件装备...`);
        equipResult = await api.batchEquipItems({
          membership_type: input.accountSummary.membership_type,
          character_id: character.character_id,
          items: executionPlan.equip_items.map((entry) => ({
            membership_type: input.accountSummary?.membership_type ?? 0,
            character_id: character.character_id,
            item_id: entry.item.instance_id ?? "",
            item_name: entry.item.name
          }))
        });
      }

      const failedSteps = transferResult.failed_count + equipResult.failed_count;
      input.setLoadoutMessage(failedSteps
        ? `最高光等执行完成：转移成功 ${transferResult.success_count}/${executionPlan.transfer_items.length}，装备成功 ${equipResult.success_count}/${executionPlan.equip_items.length}，失败步骤 ${failedSteps}。可在设置页查看操作日志。`
        : `已给 ${character.class_name} 装备 ${equipResult.success_count} 件最高光等装备。`);
      input.setItemActionMessage("正在刷新账号数据...");
      void Promise.all([input.loadAccountSummary(), input.diagnostics.loadActionLog()]).finally(() => {
        input.setItemActionMessage("");
      });
    } finally {
      input.setIsRunningItemAction(false);
    }
  }

  async function runLoadoutWriteAction(
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number],
    label: string,
    run: () => Promise<ItemActionResult>
  ) {
    input.setLoadoutMessage("");
    input.setItemActionMessage(`${label}执行中...`);

    const latestConfig = await ensureWriteActionsEnabled(input.setLoadoutMessage);
    if (!latestConfig) return;

    if (!window.confirm([
      `确认要${label}吗？`,
      `角色：${character.class_name}`,
      `配装栏：${slot.name || `槽位 ${slot.index + 1}`}`,
      "说明：这会直接调用 Bungie 的游戏内配装栏接口，并写入本地操作日志。"
    ].join("\n"))) {
      return;
    }

    input.setIsRunningItemAction(true);
    try {
      const result = await run();
      input.setLoadoutMessage(result.message);
      await Promise.all([input.loadAccountSummary(), input.diagnostics.loadActionLog()]);
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : `${label}失败`);
      await input.diagnostics.loadActionLog();
    } finally {
      input.setIsRunningItemAction(false);
    }
  }

  async function equipSavedLoadout(
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) {
    await runLoadoutWriteAction(
      character,
      slot,
      `应用游戏内配装栏「${slot.name}」`,
      () => api.equipLoadout({
        membership_type: input.accountSummary?.membership_type ?? 0,
        character_id: character.character_id,
        loadout_index: slot.index,
        loadout_name: slot.name
      })
    );
  }

  async function snapshotCurrentLoadout(
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) {
    await runLoadoutWriteAction(
      character,
      slot,
      `用当前装备覆盖游戏内配装栏「${slot.name}」`,
      () => api.snapshotLoadout({
        membership_type: input.accountSummary?.membership_type ?? 0,
        character_id: character.character_id,
        loadout_index: slot.index,
        loadout_name: slot.name
      })
    );
  }

  async function deleteLoadoutTemplate(id: string) {
    try {
      await input.loadoutLibrary.deleteTemplate(id);
      input.setLoadoutMessage("已删除本地配装模板。");
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : "删除配装模板失败");
    }
  }

  async function renameLoadoutTemplate(template: LoadoutTemplate) {
    input.setLoadoutMessage("");
    try {
      const renamed = await input.loadoutLibrary.renameTemplate(template);
      input.setLoadoutMessage(`已重命名本地方案：${renamed.name}`);
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : "本地方案重命名失败");
    }
  }

  async function executeMissingLoadoutTransfer(
    template: LoadoutTemplate,
    analysis: ReturnType<typeof analyzeLoadoutTemplate> | null
  ) {
    void analysis;
    if (!input.accountSummary) {
      input.setLoadoutMessage("请先读取账号数据。");
      return;
    }

    const targetCharacter = input.accountSummary.characters.find((character) => character.character_id === template.character_id)
      ?? input.accountSummary.characters[0];
    if (!targetCharacter) {
      input.setLoadoutMessage("没有可用角色，无法转移缺失件。");
      return;
    }

    const transferPlan = buildMissingLoadoutTransferPlan({
      template,
      missingItems: template.items,
      accountSummary: input.accountSummary
    });
    const actionableItemCount = new Set(
      transferPlan.steps
        .filter((step) => step.phase !== "equip-swap")
        .flatMap((step) => step.items.map((item) => item.item_id))
    ).size;
    if (!actionableItemCount) {
      input.setLoadoutMessage(transferPlan.blocked.length > 0
        ? `当前没有可自动转移的缺失件，还有 ${transferPlan.blocked.length} 件需要手动处理。`
        : "当前方案装备已全部就位。");
      return;
    }

    const latestConfig = await ensureWriteActionsEnabled(input.setLoadoutMessage);
    if (!latestConfig) return;

    if (!window.confirm([
      `确认给 ${targetCharacter.class_name} 补齐 ${actionableItemCount} 件缺失装备？`,
      transferPlan.steps.some((step) => step.phase === "equip-swap")
        ? "其中一部分会先在来源角色身上装备替代装备，再把目标装备转出。"
        : null,
      transferPlan.steps.some((step) => step.phase === "pull-postmaster")
        ? "其中一部分会先从邮政官取回，再继续后续转移。"
        : null,
      transferPlan.steps.some((step) => step.phase === "to-vault")
        ? "其中一部分会先从其他角色背包移回仓库，再转到当前角色。"
        : "这次可以直接从仓库补齐到当前角色。",
      transferPlan.steps.some((step) => step.phase === "equip-target")
        ? "补齐完成后，会自动把这些方案装备穿到目标角色身上。"
        : null,
      transferPlan.blocked.length > 0
        ? `还有 ${transferPlan.blocked.length} 件暂时不会自动转移，例如其他角色已装备或仍在邮政官。`
        : null
    ].filter(Boolean).join("\n"))) {
      input.setLoadoutMessage("已取消缺失件转移。");
      return;
    }

    input.setIsRunningItemAction(true);
    input.setItemActionMessage(`正在准备 ${actionableItemCount} 件缺失装备...`);

    try {
      let targetTransferCount = 0;
      let autoEquipCount = 0;
      let prepStepCount = 0;
      for (const step of transferPlan.steps) {
        if (step.phase === "equip-swap") {
          input.setItemActionMessage(`正在在来源角色身上装备 ${step.items.length} 件替代装备...`);
          const equipResult = await api.batchEquipItems({
            membership_type: input.accountSummary.membership_type,
            character_id: step.character_id,
            items: step.items.map((item) => ({
              membership_type: input.accountSummary?.membership_type ?? 0,
              character_id: step.character_id,
              item_id: item.item_id,
              item_name: item.item_name
            }))
          });

          if (equipResult.failed_count > 0) {
            throw new Error(equipResult.message || "替代装备装备失败，请检查来源角色装备状态后重试。");
          }
          prepStepCount += equipResult.success_count;
          continue;
        }
        if (step.phase === "pull-postmaster") {
          input.setItemActionMessage(`正在从邮政官取回 ${step.items.length} 件装备...`);
          for (const item of step.items) {
            await api.pullFromPostmaster({
              membership_type: input.accountSummary.membership_type,
              character_id: step.character_id,
              item_id: item.item_id,
              item_reference_hash: item.item_reference_hash,
              item_name: item.item_name
            });
          }
          prepStepCount += step.items.length;
          continue;
        }
        if (step.phase === "equip-target") {
          input.setItemActionMessage(`正在给 ${targetCharacter.class_name} 自动装备 ${step.items.length} 件方案装备...`);
          const equipResult = await api.batchEquipItems({
            membership_type: input.accountSummary.membership_type,
            character_id: step.character_id,
            items: step.items.map((item) => ({
              membership_type: input.accountSummary?.membership_type ?? 0,
              character_id: step.character_id,
              item_id: item.item_id,
              item_name: item.item_name
            }))
          });

          autoEquipCount += equipResult.success_count;
          if (equipResult.failed_count > 0) {
            throw new Error(equipResult.message || "方案装备自动穿戴失败，请检查当前角色状态后重试。");
          }
          continue;
        }
        input.setItemActionMessage(
          step.phase === "to-vault"
            ? `正在从来源角色移回 ${step.items.length} 件装备到仓库...`
            : `正在转入 ${step.items.length} 件装备到 ${targetCharacter.class_name}...`
        );

        const result = await api.batchTransferItems({
          membership_type: input.accountSummary.membership_type,
          character_id: step.character_id,
          items: step.items.map((item) => ({
            membership_type: input.accountSummary?.membership_type ?? 0,
            character_id: step.character_id,
            item_id: item.item_id,
            item_reference_hash: item.item_reference_hash,
            item_name: item.item_name,
            transfer_to_vault: step.transfer_to_vault
          }))
        });
        if (step.phase === "to-character") {
          targetTransferCount += result.success_count;
        } else {
          prepStepCount += result.success_count;
        }

        if (result.failed_count > 0) {
          throw new Error(result.message || "缺失件转移未全部成功，请检查物品状态后重试。");
        }
      }
      await Promise.all([input.loadAccountSummary(), input.diagnostics.loadActionLog()]);
      const finishedParts = [
        targetTransferCount > 0 ? `转入 ${targetTransferCount} 件` : null,
        autoEquipCount > 0 ? `自动装备 ${autoEquipCount} 件` : null,
        prepStepCount > 0 ? `前置处理 ${prepStepCount} 步` : null,
        transferPlan.blocked.length > 0 ? `仍有 ${transferPlan.blocked.length} 件需手动处理` : null
      ].filter(Boolean);
      input.setLoadoutMessage(
        finishedParts.length
          ? `方案补齐完成：${finishedParts.join("，")}。`
          : "方案补齐完成。"
      );
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : "缺失件转移失败");
    } finally {
      input.setIsRunningItemAction(false);
      input.setItemActionMessage("");
    }
  }

  async function executeSingleLoadoutItemTransfer(
    template: LoadoutTemplate,
    item: LoadoutTemplate["items"][number]
  ) {
    const feedbackKey = buildLoadoutActionFeedbackKey(template.id, item, "transfer");
    if (!input.accountSummary) {
      input.setLoadoutMessage("请先读取账号数据。");
      return;
    }

    const targetCharacter = input.accountSummary.characters.find((character) => character.character_id === template.character_id)
      ?? input.accountSummary.characters[0];
    if (!targetCharacter) {
      input.setLoadoutMessage("没有可用角色，无法补齐这件装备。");
      return;
    }

    const transferPlan = buildMissingLoadoutTransferPlan({
      template: { ...template, items: [item] },
      missingItems: [item],
      accountSummary: input.accountSummary
    });
    const actionableItemCount = getMissingLoadoutActionableCount(transferPlan);
    if (!actionableItemCount) {
      input.setLoadoutMessage(transferPlan.blocked.length > 0
        ? `这件装备当前无法自动补齐：${item.name}。`
        : `这件装备已经就位：${item.name}。`);
      return;
    }

    const latestConfig = await ensureWriteActionsEnabled(input.setLoadoutMessage);
    if (!latestConfig) {
      input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "idle");
      return;
    }

    if (!window.confirm(`确认只补齐「${item.name}」吗？`)) {
      input.setLoadoutMessage("已取消单件补齐。");
      return;
    }

    input.setIsRunningItemAction(true);
    input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "pending");
    input.setItemActionMessage(`正在补齐 ${item.name}...`);
    input.setLoadoutMessage(`正在补齐 ${item.name}...`);
    let actionSucceeded = false;

    try {
      let targetTransferCount = 0;
      let autoEquipCount = 0;
      let prepStepCount = 0;
      for (const step of transferPlan.steps) {
        if (step.phase === "equip-swap") {
          const stepMessage = `正在为来源角色换下 ${item.name}...`;
          input.setItemActionMessage(stepMessage);
          input.setLoadoutMessage(stepMessage);
          const equipResult = await api.batchEquipItems({
            membership_type: input.accountSummary.membership_type,
            character_id: step.character_id,
            items: step.items.map((entry) => ({
              membership_type: input.accountSummary?.membership_type ?? 0,
              character_id: step.character_id,
              item_id: entry.item_id,
              item_name: entry.item_name
            }))
          });

          if (equipResult.failed_count > 0) {
            throw new Error(equipResult.message || "来源角色替换装备失败，请稍后重试。");
          }
          prepStepCount += equipResult.success_count;
          continue;
        }

        if (step.phase === "pull-postmaster") {
          const stepMessage = `正在从邮政官取回 ${item.name}...`;
          input.setItemActionMessage(stepMessage);
          input.setLoadoutMessage(stepMessage);
          for (const entry of step.items) {
            await api.pullFromPostmaster({
              membership_type: input.accountSummary.membership_type,
              character_id: step.character_id,
              item_id: entry.item_id,
              item_reference_hash: entry.item_reference_hash,
              item_name: entry.item_name
            });
          }
          prepStepCount += step.items.length;
          continue;
        }

        if (step.phase === "equip-target") {
          const stepMessage = `正在给 ${targetCharacter.class_name} 装备 ${item.name}...`;
          input.setItemActionMessage(stepMessage);
          input.setLoadoutMessage(stepMessage);
          const equipResult = await api.batchEquipItems({
            membership_type: input.accountSummary.membership_type,
            character_id: step.character_id,
            items: step.items.map((entry) => ({
              membership_type: input.accountSummary?.membership_type ?? 0,
              character_id: step.character_id,
              item_id: entry.item_id,
              item_name: entry.item_name
            }))
          });

          autoEquipCount += equipResult.success_count;
          if (equipResult.failed_count > 0) {
            throw new Error(equipResult.message || "目标角色装备失败，请稍后重试。");
          }
          continue;
        }

        const stepMessage = step.phase === "to-vault"
          ? `正在把 ${item.name} 转回仓库...`
          : `正在把 ${item.name} 转入 ${targetCharacter.class_name}...`;
        input.setItemActionMessage(stepMessage);
        input.setLoadoutMessage(stepMessage);

        const result = await api.batchTransferItems({
          membership_type: input.accountSummary.membership_type,
          character_id: step.character_id,
          items: step.items.map((entry) => ({
            membership_type: input.accountSummary?.membership_type ?? 0,
            character_id: step.character_id,
            item_id: entry.item_id,
            item_reference_hash: entry.item_reference_hash,
            item_name: entry.item_name,
            transfer_to_vault: step.transfer_to_vault
          }))
        });

        if (step.phase === "to-character") {
          targetTransferCount += result.success_count;
        } else {
          prepStepCount += result.success_count;
        }

        if (result.failed_count > 0) {
          throw new Error(result.message || "单件补齐未全部成功，请检查物品状态后重试。");
        }
      }

      await Promise.all([input.loadAccountSummary(), input.diagnostics.loadActionLog()]);
      const finishedParts = [
        targetTransferCount > 0 ? `转入 ${targetTransferCount} 件` : null,
        autoEquipCount > 0 ? `自动装备 ${autoEquipCount} 件` : null,
        prepStepCount > 0 ? `前置处理 ${prepStepCount} 步` : null
      ].filter(Boolean);
      input.setLoadoutMessage(
        finishedParts.length
          ? `单件补齐完成：${item.name}，${finishedParts.join("，")}。`
          : `单件补齐完成：${item.name}。`
      );
      actionSucceeded = true;
      input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "success");
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : `单件补齐失败：${item.name}`);
    } finally {
      input.setIsRunningItemAction(false);
      input.setItemActionMessage("");
      if (!actionSucceeded) {
        input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "idle");
      }
    }
  }

  async function equipSingleLoadoutItem(
    template: LoadoutTemplate,
    item: LoadoutTemplate["items"][number]
  ) {
    const feedbackKey = buildLoadoutActionFeedbackKey(template.id, item, "equip");
    if (!input.accountSummary) {
      input.setLoadoutMessage("请先读取账号数据。");
      return;
    }

    const sourceItem = findBestTemplateSourceItem(item, input.accountSummary, template.character_id);
    if (!sourceItem?.instance_id) {
      input.setLoadoutMessage(`找不到可直接装备的物品实例：${item.name}。`);
      return;
    }
    if (sourceItem.source_kind !== "inventory" || sourceItem.source_character_id !== template.character_id) {
      input.setLoadoutMessage(`「${item.name}」当前不在目标角色背包，请先用“只补这一件”。`);
      return;
    }

    const latestConfig = await ensureWriteActionsEnabled(input.setLoadoutMessage);
    if (!latestConfig) {
      input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "idle");
      return;
    }

    if (!window.confirm(`确认只装备「${item.name}」吗？`)) {
      input.setLoadoutMessage("已取消单件装备。");
      return;
    }

    input.setIsRunningItemAction(true);
    input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "pending");
    input.setItemActionMessage(`正在装备 ${item.name}...`);
    input.setLoadoutMessage(`正在装备 ${item.name}...`);
    let actionSucceeded = false;

    try {
      const result = await api.equipItem({
        membership_type: input.accountSummary.membership_type,
        character_id: template.character_id,
        item_id: sourceItem.instance_id,
        item_name: sourceItem.name
      });
      await Promise.all([input.loadAccountSummary(), input.diagnostics.loadActionLog()]);
      input.setLoadoutMessage(result.message);
      actionSucceeded = true;
      input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "success");
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : `单件装备失败：${item.name}`);
    } finally {
      input.setIsRunningItemAction(false);
      input.setItemActionMessage("");
      if (!actionSucceeded) {
        input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "idle");
      }
    }
  }

  function openTemplateSourceItem(
    item: LoadoutTemplate["items"][number],
    templateCharacterId?: string
  ) {
    const matchedItem = findBestTemplateSourceItem(item, input.accountSummary, templateCharacterId);
    if (!matchedItem) {
      input.setLoadoutMessage(`没有找到「${item.name}」的可用来源。`);
      return;
    }

    void input.openItemDetail(matchedItem, {
      source_character_id: matchedItem.source_character_id,
      is_vault_item: matchedItem.is_vault_item,
      is_postmaster_item: matchedItem.is_postmaster_item
    });
  }

  return {
    saveCharacterLoadout,
    equipHighestPowerItems,
    equipSavedLoadout,
    snapshotCurrentLoadout,
    deleteLoadoutTemplate,
    renameLoadoutTemplate,
    executeMissingLoadoutTransfer,
    executeSingleLoadoutItemTransfer,
    equipSingleLoadoutItem,
    openTemplateSourceItem
  };
}

function formatHighestPowerSource(source: "equipped" | "inventory" | "vault"): string {
  if (source === "equipped") return "已装备";
  if (source === "inventory") return "角色背包";
  return "仓库";
}
