export function nowIso(): string {
  return new Date().toISOString();
}

export function parseIsoDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
