import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createEmptyLocalLoadoutPlanDraft,
  createLocalLoadoutPlanDraftFromInGameLoadout,
  createLocalLoadoutPlanDraftFromCharacter,
  selectLocalLoadoutPlanWorkbench,
  toLocalLoadoutPlanDraft
} from "@d2-tools/app/loadouts";
import type { CharacterSummary } from "@d2-tools/core/account/summary";
import type { CreateLocalLoadoutPlanInput, LocalLoadoutPlan } from "@d2-tools/core/loadouts/plans";
import { matchLocalLoadoutPlan } from "@d2-tools/core/loadouts/plans";
import { createLocalLoadoutPlanExecutionPlan, type LocalLoadoutPlanExecutionPlan } from "@d2-tools/core/loadouts/localPlanExecution";
import type { DimLoadoutImportPreview } from "@d2-tools/core/loadouts/dimImport";
import type { BuildGuideLoadoutDraft } from "@d2-tools/core/assistant/guideSchema";
import { api } from "../../api/client";
import { useAccountSummaryStore } from "../../shared/stores/accountEntityStore";

export type LocalPlanExecutionReport = {
  plan: LocalLoadoutPlanExecutionPlan;
  completed_steps: string[];
  failed_step?: string;
  error?: string;
  refresh_verified: boolean;
};

export function useLocalLoadoutPlans(input: {
  refreshAccount?: () => Promise<ReturnType<typeof useAccountSummaryStore> | null>;
} = {}) {
  const accountSummary = useAccountSummaryStore();
  const [plans, setPlans] = useState<LocalLoadoutPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CreateLocalLoadoutPlanInput | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [dimPreview, setDimPreview] = useState<DimLoadoutImportPreview | null>(null);
  const [isPreviewingDim, setIsPreviewingDim] = useState(false);
  const [isImportingGuide, setIsImportingGuide] = useState(false);
  const [executionReport, setExecutionReport] = useState<LocalPlanExecutionReport | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const applyPlans = useCallback((nextPlans: LocalLoadoutPlan[], preferredId = selectedPlanId) => {
    const selected = nextPlans.find((plan) => plan.id === preferredId) ?? nextPlans[0] ?? null;
    setPlans(nextPlans);
    setSelectedPlanId(selected?.id ?? "");
  }, [selectedPlanId]);

  const reload = useCallback(async () => {
    try {
      applyPlans(await api.listLocalLoadoutPlans());
      setError("");
    } catch {
      applyPlans([]);
      setError("本地方案读取失败，请检查本地数据目录后重试。");
    }
  }, [applyPlans]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const workspace = useMemo(() => selectLocalLoadoutPlanWorkbench({
    accountSummary,
    plans,
    selectedPlanId
  }), [accountSummary, plans, selectedPlanId]);

  const executionPlan = useMemo(() => {
    if (!draft || !accountSummary || !draft.target_character_id) return null;
    try {
      return createLocalLoadoutPlanExecutionPlan({
        plan: draft,
        account: accountSummary,
        target_character_id: draft.target_character_id
      });
    } catch {
      return null;
    }
  }, [accountSummary, draft]);

  const selectPlan = useCallback((id: string) => {
    const plan = plans.find((candidate) => candidate.id === id);
    if (!plan) return;
    setSelectedPlanId(plan.id);
    setEditingPlanId(plan.id);
    setDraft(toLocalLoadoutPlanDraft(plan));
    setError("");
    setExecutionReport(null);
  }, [plans]);

  const startNewPlan = useCallback((character: CharacterSummary | null) => {
    if (!character) return;
    setSelectedPlanId("");
    setEditingPlanId(null);
    setDraft(createEmptyLocalLoadoutPlanDraft({
      class_name: character.class_name,
      target_character_id: character.character_id
    }));
    setError("");
    setExecutionReport(null);
  }, []);

  const startFromCurrentCharacter = useCallback((character: CharacterSummary | null) => {
    if (!character) return;
    setSelectedPlanId("");
    setEditingPlanId(null);
    setDraft(createLocalLoadoutPlanDraftFromCharacter(character));
    setError("");
    setExecutionReport(null);
  }, []);

  const startFromInGameLoadout = useCallback((character: CharacterSummary, slot: CharacterSummary["loadout_slots"][number]) => {
    if (!accountSummary) return;
    setSelectedPlanId("");
    setEditingPlanId(null);
    setDraft(createLocalLoadoutPlanDraftFromInGameLoadout({ accountSummary, character, slot }));
    setDimPreview(null);
    setExecutionReport(null);
    setError("");
  }, [accountSummary]);

  const closeEditor = useCallback(() => {
    setDraft(null);
    setEditingPlanId(null);
    setError("");
    setDimPreview(null);
    setExecutionReport(null);
  }, []);

  const previewDimImport = useCallback(async (url: string) => {
    if (isPreviewingDim) return;
    setIsPreviewingDim(true);
    setError("");
    try {
      setDimPreview(await api.previewDimLoadoutImport(url));
    } catch (previewError) {
      const message = previewError instanceof Error ? previewError.message : String(previewError);
      setDimPreview(null);
      setError(`DIM 导入预览失败：${message}`);
    } finally {
      setIsPreviewingDim(false);
    }
  }, [isPreviewingDim]);

  const acceptDimImport = useCallback((character: CharacterSummary | null) => {
    if (!dimPreview || !character) return;
    setSelectedPlanId("");
    setEditingPlanId(null);
    setDraft({
      ...dimPreview.draft,
      class_name: dimPreview.draft.class_name === "未限定职业" ? character.class_name : dimPreview.draft.class_name,
      target_character_id: character.character_id
    });
    setDimPreview(null);
    setExecutionReport(null);
    setError("");
  }, [dimPreview]);

  const dismissDimImport = useCallback(() => setDimPreview(null), []);

  const startFromGuideDraft = useCallback((guide: BuildGuideLoadoutDraft) => {
    const target = accountSummary?.characters.find((character) => character.character_id === guide.character_id) ?? null;
    setSelectedPlanId("");
    setEditingPlanId(null);
    setDraft({
      name: guide.name || "攻略配装",
      class_name: guide.class_name || target?.class_name || "未限定职业",
      target_character_id: guide.character_id || target?.character_id,
      source: { kind: "guide", label: "攻略解析" },
      item_targets: guide.items.map((item, index) => ({
        slot: item.bucket_name || `攻略目标 ${index + 1}`,
        item_hash: item.hash,
        ...(item.instance_id ? { selected_instance_id: item.instance_id } : {}),
        plug_hashes: [],
        notes: item.reason
      })),
      notes: guide.notes.join("\n") || undefined,
      guidance: {
        raw_text: guide.raw_text,
        warnings: guide.missing_requirements,
        evidence: guide.notes
      }
    });
    setDimPreview(null);
    setExecutionReport(null);
    setError("");
  }, [accountSummary]);

  const importGuideText = useCallback(async (rawText: string, character: CharacterSummary | null) => {
    if (!character || !rawText.trim() || isImportingGuide) return;
    setIsImportingGuide(true);
    setError("");
    try {
      const parsed = await api.parseBuildGuide({ rawText });
      const match = await api.matchBuildGuide({ requirement: parsed.requirement, characterId: character.character_id });
      const guide = await api.createGuideLoadoutDraft({
        match,
        characterId: character.character_id,
        fallbackName: rawText.trim().split(/\r?\n/).find(Boolean) ?? "攻略配装"
      });
      startFromGuideDraft(guide);
    } catch (guideError) {
      const message = guideError instanceof Error ? guideError.message : String(guideError);
      setError(`攻略解析失败：${message}`);
    } finally {
      setIsImportingGuide(false);
    }
  }, [isImportingGuide, startFromGuideDraft]);

  const executeDraft = useCallback(async () => {
    if (!draft || !accountSummary || !draft.target_character_id || isExecuting) return;
    if (!editingPlanId) {
      setError("请先显式保存本地方案，再生成并执行应用计划。");
      return;
    }
    const target = accountSummary.characters.find((character) => character.character_id === draft.target_character_id);
    if (!target) {
      setError("目标角色不在当前账号快照中，请刷新账号后重试。");
      return;
    }
    if (draft.class_name && draft.class_name !== "未限定职业" && draft.class_name !== target.class_name) {
      setError(`方案职业为 ${draft.class_name}，当前目标角色为 ${target.class_name}，不能直接应用。`);
      return;
    }
    const plan = createLocalLoadoutPlanExecutionPlan({ plan: draft, account: accountSummary, target_character_id: target.character_id });
    if (!plan.executable_steps.length) {
      setExecutionReport({ plan, completed_steps: [], refresh_verified: false });
      setError(plan.gaps.length ? `没有可执行步骤：${plan.gaps.join("；")}` : "方案没有已确认的可执行实例。");
      return;
    }
    const config = await api.getConfig().catch(() => null);
    if (!config?.features.write_actions_enabled) {
      setError("d2-tools 本地写操作开关未开启。请到设置页开启后再执行。");
      return;
    }
    if (!window.confirm(`将按顺序执行 ${plan.executable_steps.length} 个步骤。${plan.gaps.length ? `\n仍有 ${plan.gaps.length} 项缺口不会执行。` : ""}\n任一步失败会停止后续操作并刷新账号。继续吗？`)) {
      return;
    }

    setIsExecuting(true);
    setError("");
    const completedSteps: string[] = [];
    let failedStep: string | undefined;
    let failure: string | undefined;
    let refreshedAccount = null as typeof accountSummary | null;
    try {
      for (const step of plan.executable_steps) {
        try {
          if (step.kind === "transfer-to-vault") {
            await api.transferItem({ membership_type: accountSummary.membership_type, character_id: step.character_id, item_id: step.item_instance_id, item_reference_hash: step.item_hash, item_name: step.item_name, transfer_to_vault: true });
          } else if (step.kind === "transfer-from-vault") {
            await api.transferItem({ membership_type: accountSummary.membership_type, character_id: step.character_id, item_id: step.item_instance_id, item_reference_hash: step.item_hash, item_name: step.item_name, transfer_to_vault: false });
          } else if (step.kind === "equip" || step.kind === "equip-source-replacement") {
            await api.equipItem({ membership_type: accountSummary.membership_type, character_id: step.character_id, item_id: step.item_instance_id, item_name: step.item_name });
          } else if (step.socket_index !== undefined && step.plug_hash !== undefined) {
            await api.insertSocketPlug({ membership_type: accountSummary.membership_type, character_id: step.character_id, item_id: step.item_instance_id, item_name: step.item_name, socket_index: step.socket_index, plug_hash: step.plug_hash });
          }
          completedSteps.push(step.id);
        } catch (stepError) {
          failedStep = step.label;
          failure = stepError instanceof Error ? stepError.message : String(stepError);
          break;
        }
      }
    } finally {
      try {
        refreshedAccount = input.refreshAccount
          ? await input.refreshAccount()
          : await api.getAccountSummary({ force: true });
      } catch (refreshError) {
        failure = failure ?? `账号刷新失败：${refreshError instanceof Error ? refreshError.message : String(refreshError)}`;
      }
      const targetAfterRefresh = refreshedAccount?.characters.find((character) => character.character_id === target.character_id);
      const selectedInstanceIds = draft.item_targets
        .map((item) => item.selected_instance_id)
        .filter((item): item is string => Boolean(item));
      const verified = !failedStep
        && Boolean(targetAfterRefresh)
        && matchLocalLoadoutPlan(draft, refreshedAccount ?? accountSummary).selected_count === draft.item_targets.length
        && selectedInstanceIds.every((instanceId) => targetAfterRefresh?.equipped_items.some((item) => item.instance_id === instanceId));
      const report = { plan, completed_steps: completedSteps, ...(failedStep ? { failed_step: failedStep } : {}), ...(failure ? { error: failure } : {}), refresh_verified: verified };
      setExecutionReport(report);
      if (failedStep) {
        setError(`已完成 ${completedSteps.length} 步；${failedStep} 失败，后续 ${plan.executable_steps.length - completedSteps.length - 1} 步未执行。${failure ?? ""}`);
      } else if (!verified) {
        setError(`已执行 ${completedSteps.length} 步，但刷新后的账号状态未完整核对通过。请检查缺口后再保存到 Bungie 槽位。`);
      }
      setIsExecuting(false);
    }
  }, [accountSummary, draft, editingPlanId, input, isExecuting]);

  const saveDraft = useCallback(async () => {
    if (!draft || isSaving) return null;
    setIsSaving(true);
    try {
      const saved = editingPlanId
        ? await api.updateLocalLoadoutPlan(editingPlanId, draft)
        : await api.createLocalLoadoutPlan(draft);
      const nextPlans = editingPlanId
        ? plans.map((plan) => plan.id === saved.id ? saved : plan)
        : [saved, ...plans];
      applyPlans(nextPlans, saved.id);
      setEditingPlanId(saved.id);
      setDraft(toLocalLoadoutPlanDraft(saved));
      setError("");
      return saved;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setError(`保存本地方案失败：${message}`);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [applyPlans, draft, editingPlanId, isSaving, plans]);

  const deletePlan = useCallback(async (id: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const nextPlans = await api.deleteLocalLoadoutPlan(id);
      applyPlans(nextPlans, selectedPlanId === id ? "" : selectedPlanId);
      if (editingPlanId === id) closeEditor();
      setError("");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : String(deleteError);
      setError(`删除本地方案失败：${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [applyPlans, closeEditor, editingPlanId, isSaving, selectedPlanId]);

  return {
    workspace,
    draft,
    editingPlanId,
    isSaving,
    error,
    reload,
    selectPlan,
    startNewPlan,
    startFromCurrentCharacter,
    startFromInGameLoadout,
    setDraft,
    saveDraft,
    closeEditor,
    deletePlan,
    dimPreview,
    isPreviewingDim,
    previewDimImport,
    acceptDimImport,
    dismissDimImport,
    startFromGuideDraft,
    isImportingGuide,
    importGuideText,
    executionPlan,
    executionReport,
    isExecuting,
    executeDraft
  };
}
