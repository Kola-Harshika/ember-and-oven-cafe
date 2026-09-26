/** Time helpers — timestamps travel as ISO-8601 strings everywhere. */

export function nowIso(): string {
  return new Date().toISOString();
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function addHours(iso: string, hours: number): string {
  return addMinutes(iso, hours * 60);
}

export function minutesBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000;
}

export function minutesSince(iso: string, now: Date = new Date()): number {
  return (now.getTime() - new Date(iso).getTime()) / 60_000;
}

export function isExpired(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).getTime() <= now.getTime();
}
