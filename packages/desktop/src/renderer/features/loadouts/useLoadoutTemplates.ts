import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import type { LoadoutTemplate } from "../../api/types";

export function useLoadoutTemplates() {
  const [templates, setTemplates] = useState<LoadoutTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [compareTemplateId, setCompareTemplateId] = useState("");
  const [renameDraft, setRenameDraft] = useState("");
  const [showDiffOnly, setShowDiffOnly] = useState(true);

  const applyTemplates = useCallback((
    nextTemplates: LoadoutTemplate[],
    preferredSelectedId = selectedTemplateId,
    preferredCompareId = compareTemplateId
  ) => {
    const nextSelected = nextTemplates.find((template) => template.id === preferredSelectedId)
      ?? nextTemplates[0]
      ?? null;
    const nextCompare = nextTemplates.find((template) =>
      template.id === preferredCompareId && template.id !== nextSelected?.id
    ) ?? nextTemplates.find((template) => template.id !== nextSelected?.id) ?? null;

    setTemplates(nextTemplates);
    setSelectedTemplateId(nextSelected?.id ?? "");
    setCompareTemplateId(nextCompare?.id ?? "");
    setRenameDraft(nextSelected?.name ?? "");
  }, [compareTemplateId, selectedTemplateId]);

  const reloadTemplates = useCallback(async () => {
    try {
      applyTemplates(await api.listLoadoutTemplates());
    } catch {
      applyTemplates([]);
    }
  }, [applyTemplates]);

  useEffect(() => {
    void reloadTemplates();
  }, [reloadTemplates]);

  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null,
    [selectedTemplateId, templates]
  );

  const selectTemplate = useCallback((id: string) => {
    const template = templates.find((entry) => entry.id === id);
    setSelectedTemplateId(id);
    setRenameDraft(template?.name ?? "");
  }, [templates]);

  const renameTemplate = useCallback(async (template: LoadoutTemplate) => {
    const renamed = await api.renameLoadoutTemplate(template.id, renameDraft);
    applyTemplates(await api.listLoadoutTemplates(), renamed.id);
    setRenameDraft(renamed.name);
    return renamed;
  }, [applyTemplates, renameDraft]);

  const deleteTemplate = useCallback(async (id: string) => {
    const nextTemplates = await api.deleteLoadoutTemplate(id);
    applyTemplates(nextTemplates);
    return nextTemplates;
  }, [applyTemplates]);

  return {
    templates,
    selectedTemplateId,
    compareTemplateId,
    renameDraft,
    showDiffOnly,
    activeTemplate,
    selectTemplate,
    setCompareTemplateId,
    setRenameDraft,
    setShowDiffOnly,
    reloadTemplates,
    renameTemplate,
    deleteTemplate
  };
}
