import type {
  AssistantCapabilityAdapter,
  AssistantCapabilityCatalog,
  AssistantCapabilityDescriptor,
  AssistantCapabilityInput,
  AssistantCapabilityInvocationAudit,
  AssistantCapabilityInvokeContext,
  AssistantCapabilityName,
  AssistantCapabilityResult,
  AnyAssistantCapabilityAdapter,
  AnyAssistantCapabilityResult
} from "./contracts.js";
import type { AssistantCapabilityResultCache } from "./resultCache.js";

export type CreateAssistantCapabilityCatalogOptions = {
  adapters: readonly AnyAssistantCapabilityAdapter[];
  now?: () => string;
  createResultId?: (capability: AssistantCapabilityName) => string;
  onAudit?: (entry: AssistantCapabilityInvocationAudit) => void | Promise<void>;
  resultCache?: Pick<AssistantCapabilityResultCache, "set">;
};

export class AssistantCapabilityUnavailableError extends Error {
  readonly code = "assistant_capability_unavailable";

  constructor(readonly capability: AssistantCapabilityName) {
    super(`Assistant capability is unavailable: ${capability}`);
    this.name = "AssistantCapabilityUnavailableError";
  }
}

export function createAssistantCapabilityCatalog(
  options: CreateAssistantCapabilityCatalogOptions
): AssistantCapabilityCatalog {
  const adapters = new Map<AssistantCapabilityName, AnyAssistantCapabilityAdapter>();
  let resultSequence = 0;

  for (const adapter of options.adapters) {
    if (adapters.has(adapter.descriptor.name)) {
      throw new Error(`Duplicate assistant capability: ${adapter.descriptor.name}`);
    }
    adapters.set(adapter.descriptor.name, adapter);
  }

  const now = options.now ?? (() => new Date().toISOString());
  const createResultId = options.createResultId ?? ((capability) => (
    `${capability}:${Date.now()}:${++resultSequence}`
  ));

  return {
    list(): AssistantCapabilityDescriptor[] {
      return [...adapters.values()].map((adapter) => ({ ...adapter.descriptor }));
    },

    async invoke<Name extends AssistantCapabilityName>(
      name: Name,
      input: AssistantCapabilityInput<Name>,
      context: AssistantCapabilityInvokeContext
    ): Promise<AssistantCapabilityResult<Name>> {
      const adapter = adapters.get(name);
      if (!adapter) throw new AssistantCapabilityUnavailableError(name);
      const typedAdapter = adapter as AssistantCapabilityAdapter<Name>;

      const startedAt = now();
      const startedMs = Date.now();
      const resultId = createResultId(name);

      try {
        const result = await typedAdapter.invoke(input, {
          ...context,
          result_id: resultId,
          checked_at: startedAt
        });
        cacheResult(options.resultCache, result);
        await recordAudit(options.onAudit, {
          result_id: result.result_id,
          capability: name,
          caller: context.caller,
          started_at: startedAt,
          duration_ms: Math.max(0, Date.now() - startedMs),
          status: result.status,
          warning_codes: result.warnings.map((warning) => warning.code),
          input_summary: summarizeCapabilityInput(name, input),
          result_summary: summarizeCapabilityResult(result)
        });
        return result;
      } catch (error) {
        await recordAudit(options.onAudit, {
          result_id: resultId,
          capability: name,
          caller: context.caller,
          started_at: startedAt,
          duration_ms: Math.max(0, Date.now() - startedMs),
          status: "error",
          warning_codes: [],
          input_summary: summarizeCapabilityInput(name, input),
          error_code: errorCode(error)
        });
        throw error;
      }
    }
  };
}

function summarizeCapabilityInput<Name extends AssistantCapabilityName>(
  name: Name,
  input: AssistantCapabilityInput<Name>
): Record<string, string | number | boolean> {
  const value = input as unknown as Record<string, unknown>;
  const summary: Record<string, string | number | boolean> = {};
  if (typeof value.query === "string") summary.query = value.query.trim().slice(0, 120);
  if (typeof value.limit === "number" && Number.isFinite(value.limit)) summary.limit = Math.trunc(value.limit);
  if (typeof value.group === "string") summary.group = value.group;
  if (typeof value.plan_id === "string") summary.plan_id = value.plan_id.slice(0, 120);
  if (typeof value.status === "string") summary.status = value.status;
  if (typeof value.category === "string") summary.category = value.category.trim().slice(0, 80);
  if (typeof value.favorites_only === "boolean") summary.favorites_only = value.favorites_only;
  if (typeof value.mode === "string") summary.mode = value.mode;
  if (value.request && typeof value.request === "object") {
    const request = value.request as Record<string, unknown>;
    if (typeof request.class === "string") summary.class = request.class;
    if (request.target && typeof request.target === "object") {
      summary.target_count = Object.keys(request.target).length;
    }
  }
  summary.capability = name;
  return summary;
}

function summarizeCapabilityResult(result: AnyAssistantCapabilityResult): {
  total?: number;
  evidence_ids: string[];
} {
  const data = result.data as unknown as { total?: unknown };
  return {
    ...(typeof data.total === "number" && Number.isFinite(data.total)
      ? { total: Math.max(0, Math.trunc(data.total)) }
      : {}),
    evidence_ids: result.evidence.map((evidence) => evidence.evidence_id)
  };
}

function cacheResult(
  cache: CreateAssistantCapabilityCatalogOptions["resultCache"],
  result: AnyAssistantCapabilityResult
): void {
  try {
    cache?.set(result);
  } catch {
    // Result caching is an optimization and must not change domain behavior.
  }
}

function errorCode(error: unknown): string {
  const code = typeof error === "object" && error
    ? (error as { code?: unknown }).code
    : undefined;
  if (typeof code === "string") {
    return code;
  }
  return "assistant_capability_error";
}

async function recordAudit(
  onAudit: CreateAssistantCapabilityCatalogOptions["onAudit"],
  entry: AssistantCapabilityInvocationAudit
): Promise<void> {
  try {
    await onAudit?.(entry);
  } catch {
    // Audit persistence must not change the capability result seen by the caller.
  }
}
