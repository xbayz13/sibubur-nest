export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const HOLIDAYS = new Set<string>([
  '2025-12-25',
  '2026-01-01',
  '2026-02-10',
  '2026-03-12',
  '2026-03-29',
  '2026-04-10',
  '2026-04-11',
  '2026-05-01',
  '2026-05-14',
  '2026-05-25',
]);

const DEFAULT_DAYS_BACK = 365;

export function resolveDaysBack(raw?: string | number, fallback = DEFAULT_DAYS_BACK): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }

  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }

  return fallback;
}

export function resolveBaseDate(raw?: string): Date {
  const base = raw ? new Date(raw) : new Date();
  base.setHours(0, 0, 0, 0);
  return base;
}

export function createDateRange(daysBack: number, baseDate: Date): { start: Date; end: Date } {
  const safeDays = Math.max(1, daysBack);
  const end = new Date(baseDate);
  const start = new Date(end.getTime() - (safeDays - 1) * ONE_DAY_MS);
  return { start, end };
}

export function isWeekendOrHoliday(date: Date): boolean {
  const day = date.getDay();
  const iso = date.toISOString().split('T')[0];
  return day === 0 || day === 6 || HOLIDAYS.has(iso);
}

export function monthIndexFrom(date: Date, baseDate: Date): number {
  const monthsDiff =
    baseDate.getFullYear() * 12 + baseDate.getMonth() - (date.getFullYear() * 12 + date.getMonth());
  const m = 12 - monthsDiff;
  return Math.max(1, Math.min(12, m));
}

export function growthAdjustedVolume(baseKg: number, date: Date, baseDate: Date): number {
  const m = monthIndexFrom(date, baseDate);
  const monthsBehind = 12 - m;
  const scaled = baseKg / Math.pow(1.03, monthsBehind);
  const surge = isWeekendOrHoliday(date) ? 1.6 : 1;
  return Number((scaled * surge).toFixed(3));
}

export function dateWithRandomTime(dateISO: string, startHour: number, endHour: number): Date {
  const base = new Date(`${dateISO}T00:00:00.000Z`);
  const hour = startHour + Math.random() * Math.max(1, endHour - startHour);
  const minute = Math.floor(Math.random() * 60);
  base.setUTCHours(hour, minute, Math.floor(Math.random() * 60), 0);
  return base;
}
