export const xurVendorHash = 2190858386;

const xurBoundaryHourUtc = 17;
const xurArrivalDayUtc = 5;
const xurDepartureDayUtc = 2;

export function isXurActiveAt(now = new Date()): boolean {
  return xurPeriodKey(now).startsWith("active:");
}

export function xurPeriodKey(now = new Date()): string {
  const boundary = latestXurBoundary(now);
  return `${boundary.getUTCDay() === xurArrivalDayUtc ? "active" : "inactive"}:${boundary.toISOString()}`;
}

export function nextXurBoundaryAt(now = new Date()): Date {
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + offset,
      xurBoundaryHourUtc,
      0,
      0,
      0
    ));
    if ((candidate.getUTCDay() === xurArrivalDayUtc || candidate.getUTCDay() === xurDepartureDayUtc) && candidate > now) {
      return candidate;
    }
  }
  return new Date(now.getTime() + 7 * 24 * 60 * 60_000);
}

function latestXurBoundary(now: Date): Date {
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - offset,
      xurBoundaryHourUtc,
      0,
      0,
      0
    ));
    if ((candidate.getUTCDay() === xurArrivalDayUtc || candidate.getUTCDay() === xurDepartureDayUtc) && candidate <= now) {
      return candidate;
    }
  }
  return new Date(now);
}
