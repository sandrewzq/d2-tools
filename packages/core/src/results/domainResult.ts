import type { EvidenceRef } from "../evidence/reference.js";

export type DomainResultStatus = "complete" | "partial" | "failed";

export type DomainWarning = {
  code: string;
  message: string;
  source?: string;
  retryable?: boolean;
};

export type DomainResult<TData, TQuery = unknown> = {
  result_id: string;
  kind: string;
  version: number;
  status: DomainResultStatus;
  checked_at: string;
  expires_at?: string;
  query: TQuery;
  data: TData;
  evidence: EvidenceRef[];
  warnings: DomainWarning[];
  composed_from?: string[];
};

export type CreateDomainResultInput<TData, TQuery> = Omit<
  DomainResult<TData, TQuery>,
  "evidence" | "warnings" | "composed_from"
> & {
  evidence?: readonly EvidenceRef[];
  warnings?: readonly DomainWarning[];
  composed_from?: readonly string[];
};

export function createDomainResult<TData, TQuery>(
  input: CreateDomainResultInput<TData, TQuery>
): DomainResult<TData, TQuery> {
  const { evidence, warnings, composed_from: composedFrom, ...result } = input;
  return {
    ...result,
    evidence: [...(evidence ?? [])],
    warnings: [...(warnings ?? [])],
    ...(composedFrom?.length
      ? { composed_from: [...new Set(composedFrom)] }
      : {})
  };
}

export function isDomainResultExpired(
  result: Pick<DomainResult<unknown>, "expires_at">,
  now: string | Date = new Date()
): boolean {
  if (!result.expires_at) return false;
  const expiresAt = Date.parse(result.expires_at);
  const checkedAt = now instanceof Date ? now.getTime() : Date.parse(now);
  return Number.isFinite(expiresAt) && Number.isFinite(checkedAt) && expiresAt <= checkedAt;
}
