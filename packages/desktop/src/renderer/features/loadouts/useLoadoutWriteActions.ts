import type { analyzeLoadoutTemplate } from "@d2-tools/core/loadouts/analysis";
import { api } from "../../api/client";
import {
  type AccountItemActionPatch,
  type AccountItemSummary,
  type AccountSummary,
  type BatchItemActionResult,
  type BuildGuideLoadoutDraft,
  type D2Config,
  type ItemActionResult,
  type LoadoutTemplate
} from "../../api/types";
import {
  buildHighestPowerAlreadyOptimalMessage,
  buildHighestPowerConfirmText,
  buildHighestPowerEquipProgressMessage,
  buildHighestPowerResultMessage,
  buildHighestPowerTransferProgressMessage,
  createHighestPowerEquipPlan,
  createHighestPowerExecutionPlan
} from "../../utils/highestPower";
import {
  buildMissingLoadoutTransferPlan
} from "../../utils/loadoutTransfer";
import {
  buildCharacterLoadoutTemplateName,
  buildLoadoutItemActionFailureMessage,
  buildLoadoutSlotActionConfirmText,
  buildLoadoutSlotActionLabel,
  buildLoadoutSlotActionProgressMessage,
  buildLoadoutTemplateDeletedMessage,
  buildLoadoutTemplateRenamedMessage,
  buildMissingLoadoutConfirmText,
  buildMissingLoadoutNoActionMessage,
  buildMissingLoadoutPrepareMessage,
  buildMissingLoadoutResultMessage,
  buildMissingLoadoutStepProgressMessage,
  buildSaveCharacterLoadoutSuccessMessage,
  buildSingleLoadoutEquipConfirmText,
  buildSingleLoadoutEquipMissingSourceMessage,
  buildSingleLoadoutEquipProgressMessage,
  buildSingleLoadoutEquipWrongLocationMessage,
  buildSingleLoadoutTransferConfirmText,
  buildSingleLoadoutTransferCancelledMessage,
  buildSingleLoadoutTransferNoActionMessage,
  buildSingleLoadoutTransferNoTargetMessage,
  buildSingleLoadoutTransferResultMessage,
  buildSingleLoadoutTransferStartMessage,
  buildSingleLoadoutTransferStepProgressMessage,
  getMissingLoadoutActionableCount
} from "../../utils/loadoutActions";
import { buildLoadoutActionFeedbackKey } from "../../utils/loadoutActionFeedback";
import type { SelectedItemSource } from "../../shared/hooks/useItemDetail";
import { findBestTemplateSourceItem } from "../../shared/domain/loadouts/loadoutSources";

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
  applyAccountActionPatches: (patches: readonly AccountItemActionPatch[]) => void;
  loadoutLibrary: LoadoutLibraryBridge;
  diagnostics: DiagnosticsBridge;
  loadoutActionFeedback: LoadoutActionFeedbackBridge;
  setLoadoutMessage: (message: string) => void;
  setItemActionMessage: (message: string) => void;
  setIsRunningItemAction: (isRunning: boolean) => void;
  loadAccountSummary: () => Promise<void>;
  openItemDetail: (item: AccountItemSummary, source?: SelectedItemSource) => void | Promise<void>;
}) {
  function applySuccessfulWriteResult(result: ItemActionResult | BatchItemActionResult): {
    hasSuccessfulWrite: boolean;
    requiresFullRefresh: boolean;
  } {
    const patches = "account_patches" in result
      ? result.account_patches
      : result.account_patch
        ? [result.account_patch]
        : [];
    input.applyAccountActionPatches(patches);
    const successCount = "success_count" in result ? result.success_count : 1;
    const hasEquipPatch = patches.some((patch) => patch.kind === "equip");
    return {
      hasSuccessfulWrite: successCount > 0,
      requiresFullRefresh: successCount > patches.length || (successCount > 0 && hasEquipPatch)
    };
  }

  function finishWriteActionsInBackground(requiresFullRefresh: boolean): void {
    if (requiresFullRefresh) {
      void input.loadAccountSummary().catch(() => undefined);
    }
    void input.diagnostics.loadActionLog().catch(() => undefined);
  }

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
        name: buildCharacterLoadoutTemplateName(character),
        character_id: character.character_id,
        class_name: character.class_name,
        equipped_items: character.equipped_items
      });
      await input.loadoutLibrary.reloadTemplates();
      input.setLoadoutMessage(buildSaveCharacterLoadoutSuccessMessage(template.name));
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : "配装模板保存失败");
    }
  }

  async function saveGuideDraft(draft: BuildGuideLoadoutDraft) {
    input.setLoadoutMessage("");
    try {
      const template = await api.createLoadoutTemplate({
        name: draft.name,
        character_id: draft.character_id,
        class_name: draft.class_name ?? "未知职业",
        equipped_items: draft.items.map((item) => ({
          hash: item.hash,
          instance_id: item.instance_id,
          name: item.name,
          bucket_name: item.bucket_name,
          item_type: item.item_type,
          group_key: "other",
          socket_plugs: []
        }))
      });
      await input.loadoutLibrary.reloadTemplates();
      input.setLoadoutMessage(`已保存攻略草稿：${template.name}`);
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : "攻略草稿保存失败");
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
      input.setLoadoutMessage(buildHighestPowerAlreadyOptimalMessage(character.class_name));
      return;
    }

    const latestConfig = await ensureWriteActionsEnabled(input.setLoadoutMessage);
    if (!latestConfig) return;

    if (!window.confirm(buildHighestPowerConfirmText({
      characterClassName: character.class_name,
      plan,
      executionPlan
    }))) {
      input.setLoadoutMessage("已取消装备最高光等。");
      return;
    }

    input.setIsRunningItemAction(true);
    let hasSuccessfulWrite = false;
    let requiresFullRefresh = false;

    try {
      let transferResult = { success_count: 0, failed_count: 0 };
      let equipResult = { success_count: 0, failed_count: 0 };
      const successfullyTransferredItemIds = new Set<string>();
      let firstFailureReason: string | undefined;

      if (executionPlan.transfer_items.length) {
        input.setItemActionMessage(buildHighestPowerTransferProgressMessage(executionPlan.transfer_items.length));
        const result = await api.batchTransferItems({
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
        transferResult = result;
        firstFailureReason ??= result.failure_messages?.[0];
        for (const itemId of result.succeeded_item_ids ?? result.account_patches
          .filter((patch) => patch.kind === "transfer" && patch.target === "character-inventory")
          .map((patch) => patch.item_instance_id)) {
          successfullyTransferredItemIds.add(itemId);
        }
        const outcome = applySuccessfulWriteResult(result);
        hasSuccessfulWrite = outcome.hasSuccessfulWrite || hasSuccessfulWrite;
        requiresFullRefresh = outcome.requiresFullRefresh || requiresFullRefresh;
      }

      const equipItems = executionPlan.equip_items.filter((entry) => (
        entry.source !== "vault"
        || successfullyTransferredItemIds.has(entry.item.instance_id ?? "")
      ));

      if (equipItems.length) {
        input.setItemActionMessage(buildHighestPowerEquipProgressMessage(equipItems.length));
        const result = await api.batchEquipItems({
          membership_type: input.accountSummary.membership_type,
          character_id: character.character_id,
          items: equipItems.map((entry) => ({
            membership_type: input.accountSummary?.membership_type ?? 0,
            character_id: character.character_id,
            item_id: entry.item.instance_id ?? "",
            item_name: entry.item.name
          }))
        });
        equipResult = result;
        firstFailureReason ??= result.failure_messages?.[0];
        const outcome = applySuccessfulWriteResult(result);
        hasSuccessfulWrite = outcome.hasSuccessfulWrite || hasSuccessfulWrite;
        requiresFullRefresh = outcome.requiresFullRefresh || requiresFullRefresh;
      }

      const failedSteps = transferResult.failed_count + equipResult.failed_count;
      input.setLoadoutMessage(buildHighestPowerResultMessage({
        characterClassName: character.class_name,
        transferSuccessCount: transferResult.success_count,
        transferTotalCount: executionPlan.transfer_items.length,
        equipSuccessCount: equipResult.success_count,
        equipTotalCount: equipItems.length,
        failedCount: failedSteps,
        failureReason: firstFailureReason
      }));
    } finally {
      if (hasSuccessfulWrite) finishWriteActionsInBackground(requiresFullRefresh);
      input.setItemActionMessage("");
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
    input.setItemActionMessage(buildLoadoutSlotActionProgressMessage(label));

    const latestConfig = await ensureWriteActionsEnabled(input.setLoadoutMessage);
    if (!latestConfig) return;

    if (!window.confirm(buildLoadoutSlotActionConfirmText({
      label,
      characterClassName: character.class_name,
      slotName: slot.name,
      slotIndex: slot.index
    }))) {
      return;
    }

    input.setIsRunningItemAction(true);
    try {
      const result = await run();
      const outcome = applySuccessfulWriteResult(result);
      input.setLoadoutMessage(result.message);
      finishWriteActionsInBackground(outcome.requiresFullRefresh);
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
      buildLoadoutSlotActionLabel("equip", slot),
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
      buildLoadoutSlotActionLabel("snapshot", slot),
      () => api.snapshotLoadout({
        membership_type: input.accountSummary?.membership_type ?? 0,
        character_id: character.character_id,
        loadout_index: slot.index,
        loadout_name: slot.name,
        loadout_name_hash: slot.name_hash,
        loadout_icon_hash: slot.icon_hash,
        loadout_color_hash: slot.color_hash
      })
    );
  }

  async function clearSavedLoadout(
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number]
  ) {
    await runLoadoutWriteAction(
      character,
      slot,
      "清空游戏内配装栏",
      () => api.clearLoadout({
        membership_type: input.accountSummary?.membership_type ?? 0,
        character_id: character.character_id,
        loadout_index: slot.index,
        loadout_name: slot.name
      })
    );
  }

  async function updateSavedLoadoutIdentifiers(
    character: AccountSummary["characters"][number],
    slot: AccountSummary["characters"][number]["loadout_slots"][number],
    identifiers: { name_hash?: number; icon_hash?: number; color_hash?: number }
  ) {
    await runLoadoutWriteAction(
      character,
      slot,
      "更新游戏内配装标识",
      () => api.updateLoadoutIdentifiers({
        membership_type: input.accountSummary?.membership_type ?? 0,
        character_id: character.character_id,
        loadout_index: slot.index,
        loadout_name: slot.name,
        loadout_name_hash: identifiers.name_hash,
        loadout_icon_hash: identifiers.icon_hash,
        loadout_color_hash: identifiers.color_hash
      })
    );
  }

  async function deleteLoadoutTemplate(id: string) {
    try {
      await input.loadoutLibrary.deleteTemplate(id);
      input.setLoadoutMessage(buildLoadoutTemplateDeletedMessage());
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : "删除配装模板失败");
    }
  }

  async function renameLoadoutTemplate(template: LoadoutTemplate) {
    input.setLoadoutMessage("");
    try {
      const renamed = await input.loadoutLibrary.renameTemplate(template);
      input.setLoadoutMessage(buildLoadoutTemplateRenamedMessage(renamed.name));
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
    const actionableItemCount = getMissingLoadoutActionableCount(transferPlan);
    if (!actionableItemCount) {
      input.setLoadoutMessage(buildMissingLoadoutNoActionMessage(transferPlan));
      return;
    }

    const latestConfig = await ensureWriteActionsEnabled(input.setLoadoutMessage);
    if (!latestConfig) return;

    if (!window.confirm(buildMissingLoadoutConfirmText({
      targetCharacterClassName: targetCharacter.class_name,
      actionableItemCount,
      transferPlan
    }))) {
      input.setLoadoutMessage("已取消缺失件转移。");
      return;
    }

    input.setIsRunningItemAction(true);
    input.setItemActionMessage(buildMissingLoadoutPrepareMessage(actionableItemCount));
    let hasSuccessfulWrite = false;
    let requiresFullRefresh = false;

    try {
      let targetTransferCount = 0;
      let autoEquipCount = 0;
      let prepStepCount = 0;
      for (const step of transferPlan.steps) {
        if (step.phase === "equip-swap") {
          input.setItemActionMessage(buildMissingLoadoutStepProgressMessage(step, targetCharacter.class_name));
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
          const outcome = applySuccessfulWriteResult(equipResult);
          hasSuccessfulWrite = outcome.hasSuccessfulWrite || hasSuccessfulWrite;
          requiresFullRefresh = outcome.requiresFullRefresh || requiresFullRefresh;

          if (equipResult.failed_count > 0) {
            throw new Error(equipResult.message || "替代装备装备失败，请检查来源角色装备状态后重试。");
          }
          prepStepCount += equipResult.success_count;
          continue;
        }
        if (step.phase === "pull-postmaster") {
          input.setItemActionMessage(buildMissingLoadoutStepProgressMessage(step, targetCharacter.class_name));
          for (const item of step.items) {
            const result = await api.pullFromPostmaster({
              membership_type: input.accountSummary.membership_type,
              character_id: step.character_id,
              item_id: item.item_id,
              item_reference_hash: item.item_reference_hash,
              item_name: item.item_name
            });
            const outcome = applySuccessfulWriteResult(result);
            hasSuccessfulWrite = outcome.hasSuccessfulWrite || hasSuccessfulWrite;
            requiresFullRefresh = outcome.requiresFullRefresh || requiresFullRefresh;
          }
          prepStepCount += step.items.length;
          continue;
        }
        if (step.phase === "equip-target") {
          input.setItemActionMessage(buildMissingLoadoutStepProgressMessage(step, targetCharacter.class_name));
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
          const outcome = applySuccessfulWriteResult(equipResult);
          hasSuccessfulWrite = outcome.hasSuccessfulWrite || hasSuccessfulWrite;
          requiresFullRefresh = outcome.requiresFullRefresh || requiresFullRefresh;

          autoEquipCount += equipResult.success_count;
          if (equipResult.failed_count > 0) {
            throw new Error(equipResult.message || "方案装备自动穿戴失败，请检查当前角色状态后重试。");
          }
          continue;
        }
        input.setItemActionMessage(buildMissingLoadoutStepProgressMessage(step, targetCharacter.class_name));

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
        const outcome = applySuccessfulWriteResult(result);
        hasSuccessfulWrite = outcome.hasSuccessfulWrite || hasSuccessfulWrite;
        requiresFullRefresh = outcome.requiresFullRefresh || requiresFullRefresh;
        if (step.phase === "to-character") {
          targetTransferCount += result.success_count;
        } else {
          prepStepCount += result.success_count;
        }

        if (result.failed_count > 0) {
          throw new Error(result.message || "缺失件转移未全部成功，请检查物品状态后重试。");
        }
      }
      input.setLoadoutMessage(buildMissingLoadoutResultMessage({
        targetTransferCount,
        autoEquipCount,
        prepStepCount,
        blockedCount: transferPlan.blocked.length
      }));
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : "缺失件转移失败");
    } finally {
      if (hasSuccessfulWrite) finishWriteActionsInBackground(requiresFullRefresh);
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
      input.setLoadoutMessage(buildSingleLoadoutTransferNoTargetMessage());
      return;
    }

    const transferPlan = buildMissingLoadoutTransferPlan({
      template: { ...template, items: [item] },
      missingItems: [item],
      accountSummary: input.accountSummary
    });
    const actionableItemCount = getMissingLoadoutActionableCount(transferPlan);
    if (!actionableItemCount) {
      input.setLoadoutMessage(buildSingleLoadoutTransferNoActionMessage({
        itemName: item.name,
        transferPlan
      }));
      return;
    }

    const latestConfig = await ensureWriteActionsEnabled(input.setLoadoutMessage);
    if (!latestConfig) {
      input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "idle");
      return;
    }

    if (!window.confirm(buildSingleLoadoutTransferConfirmText(item.name))) {
      input.setLoadoutMessage(buildSingleLoadoutTransferCancelledMessage());
      return;
    }

    input.setIsRunningItemAction(true);
    input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "pending");
    input.setItemActionMessage(buildSingleLoadoutTransferStartMessage(item.name));
    input.setLoadoutMessage(buildSingleLoadoutTransferStartMessage(item.name));
    let actionSucceeded = false;
    let hasSuccessfulWrite = false;
    let requiresFullRefresh = false;

    try {
      let targetTransferCount = 0;
      let autoEquipCount = 0;
      let prepStepCount = 0;
      for (const step of transferPlan.steps) {
        if (step.phase === "equip-swap") {
          const stepMessage = buildSingleLoadoutTransferStepProgressMessage({
            step,
            itemName: item.name,
            targetCharacterClassName: targetCharacter.class_name
          });
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
          const outcome = applySuccessfulWriteResult(equipResult);
          hasSuccessfulWrite = outcome.hasSuccessfulWrite || hasSuccessfulWrite;
          requiresFullRefresh = outcome.requiresFullRefresh || requiresFullRefresh;

          if (equipResult.failed_count > 0) {
            throw new Error(equipResult.message || "来源角色替换装备失败，请稍后重试。");
          }
          prepStepCount += equipResult.success_count;
          continue;
        }

        if (step.phase === "pull-postmaster") {
          const stepMessage = buildSingleLoadoutTransferStepProgressMessage({
            step,
            itemName: item.name,
            targetCharacterClassName: targetCharacter.class_name
          });
          input.setItemActionMessage(stepMessage);
          input.setLoadoutMessage(stepMessage);
          for (const entry of step.items) {
            const result = await api.pullFromPostmaster({
              membership_type: input.accountSummary.membership_type,
              character_id: step.character_id,
              item_id: entry.item_id,
              item_reference_hash: entry.item_reference_hash,
              item_name: entry.item_name
            });
            const outcome = applySuccessfulWriteResult(result);
            hasSuccessfulWrite = outcome.hasSuccessfulWrite || hasSuccessfulWrite;
            requiresFullRefresh = outcome.requiresFullRefresh || requiresFullRefresh;
          }
          prepStepCount += step.items.length;
          continue;
        }

        if (step.phase === "equip-target") {
          const stepMessage = buildSingleLoadoutTransferStepProgressMessage({
            step,
            itemName: item.name,
            targetCharacterClassName: targetCharacter.class_name
          });
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
          const outcome = applySuccessfulWriteResult(equipResult);
          hasSuccessfulWrite = outcome.hasSuccessfulWrite || hasSuccessfulWrite;
          requiresFullRefresh = outcome.requiresFullRefresh || requiresFullRefresh;

          autoEquipCount += equipResult.success_count;
          if (equipResult.failed_count > 0) {
            throw new Error(equipResult.message || "目标角色装备失败，请稍后重试。");
          }
          continue;
        }

        const stepMessage = buildSingleLoadoutTransferStepProgressMessage({
          step,
          itemName: item.name,
          targetCharacterClassName: targetCharacter.class_name
        });
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
        const outcome = applySuccessfulWriteResult(result);
        hasSuccessfulWrite = outcome.hasSuccessfulWrite || hasSuccessfulWrite;
        requiresFullRefresh = outcome.requiresFullRefresh || requiresFullRefresh;

        if (step.phase === "to-character") {
          targetTransferCount += result.success_count;
        } else {
          prepStepCount += result.success_count;
        }

        if (result.failed_count > 0) {
          throw new Error(result.message || "单件补齐未全部成功，请检查物品状态后重试。");
        }
      }

      input.setLoadoutMessage(buildSingleLoadoutTransferResultMessage({
        itemName: item.name,
        targetTransferCount,
        autoEquipCount,
        prepStepCount
      }));
      actionSucceeded = true;
      input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "success");
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : buildLoadoutItemActionFailureMessage("transfer", item.name));
    } finally {
      if (hasSuccessfulWrite) finishWriteActionsInBackground(requiresFullRefresh);
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
      input.setLoadoutMessage(buildSingleLoadoutEquipMissingSourceMessage(item.name));
      return;
    }
    if (sourceItem.source_kind !== "inventory" || sourceItem.source_character_id !== template.character_id) {
      input.setLoadoutMessage(buildSingleLoadoutEquipWrongLocationMessage(item.name));
      return;
    }

    const latestConfig = await ensureWriteActionsEnabled(input.setLoadoutMessage);
    if (!latestConfig) {
      input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "idle");
      return;
    }

    if (!window.confirm(buildSingleLoadoutEquipConfirmText(item.name))) {
      input.setLoadoutMessage("已取消单件装备。");
      return;
    }

    input.setIsRunningItemAction(true);
    input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "pending");
    input.setItemActionMessage(buildSingleLoadoutEquipProgressMessage(item.name));
    input.setLoadoutMessage(buildSingleLoadoutEquipProgressMessage(item.name));
    let actionSucceeded = false;

    try {
      const result = await api.equipItem({
        membership_type: input.accountSummary.membership_type,
        character_id: template.character_id,
        item_id: sourceItem.instance_id,
        item_name: sourceItem.name
      });
      const outcome = applySuccessfulWriteResult(result);
      finishWriteActionsInBackground(outcome.requiresFullRefresh);
      input.setLoadoutMessage(result.message);
      actionSucceeded = true;
      input.loadoutActionFeedback.setSingleActionFeedback(feedbackKey, "success");
    } catch (error) {
      input.setLoadoutMessage(error instanceof Error ? error.message : buildLoadoutItemActionFailureMessage("equip", item.name));
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
    saveGuideDraft,
    equipHighestPowerItems,
    equipSavedLoadout,
    snapshotCurrentLoadout,
    clearSavedLoadout,
    updateSavedLoadoutIdentifiers,
    deleteLoadoutTemplate,
    renameLoadoutTemplate,
    executeMissingLoadoutTransfer,
    executeSingleLoadoutItemTransfer,
    equipSingleLoadoutItem,
    openTemplateSourceItem
  };
}
