import {
  createAssistantCapabilityCatalog,
  type CreateAssistantCapabilityCatalogOptions
} from "./catalog.js";
import type { AssistantCapabilityCatalog } from "./contracts.js";
import {
  createAssistantReadOnlyCapabilityAdapters,
  type AssistantReadOnlyCapabilityDependencies
} from "./readOnlyAdapters.js";

export type CreateReadOnlyAssistantCapabilityCatalogOptions = Omit<
  CreateAssistantCapabilityCatalogOptions,
  "adapters"
>;

export function createReadOnlyAssistantCapabilityCatalog(
  dependencies: AssistantReadOnlyCapabilityDependencies,
  options: CreateReadOnlyAssistantCapabilityCatalogOptions = {}
): AssistantCapabilityCatalog {
  return createAssistantCapabilityCatalog({
    ...options,
    adapters: createAssistantReadOnlyCapabilityAdapters(dependencies)
  });
}

