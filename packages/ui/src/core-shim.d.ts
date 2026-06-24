declare module "@d2-tools/core" {
  export interface AppSettings {
    readonly dataDir: string;
    readonly bungie: {
      readonly apiKeyConfigured: boolean;
    };
    readonly ai: {
      readonly providerConfigured: boolean;
      readonly providerId: string | null;
      readonly model: string | null;
    };
  }

  export type ManifestStatusState = "missing" | "ready" | "refreshing" | "failed";

  export interface ManifestStatus {
    readonly state: ManifestStatusState;
    readonly version: string | null;
    readonly updatedAt: string | null;
    readonly errorMessage: string | null;
  }

  export interface AiMessage {
    readonly id: string;
    readonly role: "user" | "assistant" | "system";
    readonly content: string;
    readonly createdAt: string;
  }

  export interface AiConversation {
    readonly id: string;
    readonly title: string;
    readonly messages: readonly AiMessage[];
    readonly updatedAt: string;
  }
}
