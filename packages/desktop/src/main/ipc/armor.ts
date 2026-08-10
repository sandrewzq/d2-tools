import { ipcMain } from "electron";
import type {
  ArmorPlannerClientRunRequest,
  ArmorPlannerWorkspaceJob
} from "../../contracts/armor.js";
import {
  classifyArmorIpcError,
  encodeDesktopIpcFailure
} from "../../contracts/errors.js";
import {
  invalidateArmorPlannerRuntime
} from "../runtime/armorPlannerRuntime.js";
import { planArmorWorkspaceInRuntime } from "../runtime/armorWorkspaceRuntime.js";

export function registerArmorIpcHandlers(): void {
  ipcMain.handle("armor:plan", (_event, input: unknown) => encodeDesktopIpcFailure(async () => {
    const request = parseArmorPlannerRequest(input);
    return planArmorWorkspaceInRuntime(request);
  }, classifyArmorIpcError));

  ipcMain.handle("armor:invalidate", (_event, scopeId?: unknown) => encodeDesktopIpcFailure(async () => {
    invalidateArmorPlannerRuntime(normalizeOptionalScopeId(scopeId));
  }, classifyArmorIpcError));
}

function parseArmorPlannerRequest(
  input: unknown
): ArmorPlannerClientRunRequest<ArmorPlannerWorkspaceJob> {
  if (!input || typeof input !== "object") {
    throw new Error("护甲规划请求无效");
  }
  const value = input as Record<string, unknown>;
  const scopeId = typeof value.scopeId === "string" ? value.scopeId.trim() : "";
  if (!scopeId) throw new Error("护甲规划 scopeId 不能为空");
  if (!Number.isInteger(value.revision) || Number(value.revision) < 0) {
    throw new Error("护甲规划 revision 必须是非负整数");
  }
  if (!value.job || typeof value.job !== "object") {
    throw new Error("护甲规划 job 无效");
  }
  const job = value.job as Record<string, unknown>;
  if (!["theoretical", "owned", "acquisition", "upgrade"].includes(String(job.mode))) {
    throw new Error("护甲规划模式无效");
  }
  if (!job.request || typeof job.request !== "object") {
    throw new Error("护甲规划参数无效");
  }
  return {
    scopeId,
    revision: Number(value.revision),
    job: job as unknown as ArmorPlannerWorkspaceJob
  };
}

function normalizeOptionalScopeId(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error("护甲规划 scopeId 无效");
  const scopeId = value.trim();
  if (!scopeId) throw new Error("护甲规划 scopeId 不能为空");
  return scopeId;
}
