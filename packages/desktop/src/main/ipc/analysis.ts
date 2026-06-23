import { ipcMain } from "electron";
import {
  generateAiChatReply,
  generateItemAiAdvice,
  generateVaultAiAdvice,
  listAiModels,
  testAiConnection,
  type ItemAiAdviceInput
} from "@d2-tools/core/ai/chat";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import { analyzeVault } from "@d2-tools/core/analysis/vault";
import type { D2Config } from "@d2-tools/core/config/schema";
import { loadConfig } from "@d2-tools/core/config/store";
import type { VaultTags } from "@d2-tools/core/vault/tags";

export function registerAnalysisIpcHandlers(): void {
  ipcMain.handle("ai:models", (_event, config: D2Config) => {
    return listAiModels({ config });
  });

  ipcMain.handle("ai:test", () => {
    const config = loadConfig();
    return testAiConnection({ config });
  });

  ipcMain.handle("analysis:vault", (_event, input: { items: AccountItemSummary[]; tags: VaultTags }) => {
    return analyzeVault(input);
  });

  ipcMain.handle("analysis:vault:ai", (_event, input: { items: AccountItemSummary[]; tags: VaultTags }) => {
    const config = loadConfig();
    return generateVaultAiAdvice({
      config,
      items: input.items,
      tags: input.tags
    });
  });

  ipcMain.handle("analysis:item:ai", (_event, input: Omit<ItemAiAdviceInput, "config">) => {
    const config = loadConfig();
    return generateItemAiAdvice({
      config,
      item: input.item,
      tags: input.tags
    });
  });

  ipcMain.handle("analysis:chat:ai", (_event, input: { question: string; context: string }) => {
    const config = loadConfig();
    return generateAiChatReply({
      config,
      question: input.question,
      context: input.context
    });
  });
}
