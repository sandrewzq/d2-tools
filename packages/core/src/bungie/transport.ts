/**
 * Core only describes the external request seam. Platform adapters provide
 * the actual HTTP implementation from the services package.
 */
export type BungieJsonFetcher = <T>(path: string, accessToken?: string) => Promise<T>;
