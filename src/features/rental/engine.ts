import { addDays, startOfWeekIso } from '@/lib/format';

import type { VehicleRentalDay } from './types';

export const DAY_COUNT_PRESETS = [4, 5, 6, 7] as const;

export type RentalRateMode = 'daily' | 'weekly';

export function weekDates(anchor: string): string[] {
  const start = startOfWeekIso(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function weekdayIndexMon0(iso: string): number {
  const day = new Date(`${iso}T00:00:00`).getDay();
  return day === 0 ? 6 : day - 1;
}

export function shiftWeek(weekStart: string, weeks: number): string {
  return addDays(startOfWeekIso(weekStart), weeks * 7);
}

export function sameDates(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const set = new Set(left);
  return right.every((date) => set.has(date));
}

export function toggleDate(selected: string[], date: string): string[] {
  return selected.includes(date)
    ? selected.filter((item) => item !== date)
    : [...selected, date].sort();
}

export function datesForDayCount(week: string[], count: number, today: string): string[] {
  if (count <= 1) return week.includes(today) ? [today] : [week[0] ?? today];
  if (count >= 7) return week;
  return week.slice(0, count);
}

export function inferSelectedDates(
  days: VehicleRentalDay[] | undefined,
  week: string[],
  today: string,
  preferredCount?: number,
): string[] {
  const rows = days ?? [];
  const currentLogged = week.filter((date) => rows.some((row) => row.work_date === date));
  if (currentLogged.length) return currentLogged;

  const lookbackStart = addDays(week[0] ?? today, -21);
  const recent = rows.filter((row) => row.work_date >= lookbackStart && row.work_date < (week[0] ?? today));
  if (recent.length >= 2) {
    const frequency = [0, 0, 0, 0, 0, 0, 0];
    for (const row of recent) {
      const index = weekdayIndexMon0(row.work_date);
      frequency[index] = (frequency[index] ?? 0) + 1;
    }
    const peak = Math.max(...frequency);
    const threshold = Math.max(1, Math.ceil(peak * 0.5));
    const mirrored = week.filter((_, index) => (frequency[index] ?? 0) >= threshold);
    if (mirrored.length) return mirrored;
  }

  const previous = weekDates(shiftWeek(week[0] ?? today, -1));
  const previousLogged = rows.filter((row) => previous.includes(row.work_date));
  if (previousLogged.length) {
    const indexes = new Set(previousLogged.map((row) => weekdayIndexMon0(row.work_date)));
    const mirrored = week.filter((date) => indexes.has(weekdayIndexMon0(date)));
    if (mirrored.length) return mirrored;
  }

  if (preferredCount && preferredCount >= 1) return datesForDayCount(week, preferredCount, today);
  if (week.includes(today) && weekdayIndexMon0(today) >= 5) return [today];
  return week.slice(0, 5);
}

export function splitAmount(total: number, count: number): number[] {
  if (count <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, index) => (base + (index === count - 1 ? remainder : 0)) / 100);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function dailyFromWeekly(weekly: number, days: number): number {
  if (days <= 0) return 0;
  return roundMoney(weekly / days);
}

export function previewRental(
  count: number,
  amount: number,
  mode: RentalRateMode,
): { count: number; total: number; perDay: number } {
  if (count <= 0 || !Number.isFinite(amount) || amount < 0) {
    return { count: Math.max(count, 0), total: 0, perDay: 0 };
  }
  if (mode === 'weekly') {
    return { count, total: roundMoney(amount), perDay: dailyFromWeekly(amount, count) };
  }
  return { count, total: roundMoney(amount * count), perDay: roundMoney(amount) };
}

export function convertRateAmount(
  amount: number,
  from: RentalRateMode,
  to: RentalRateMode,
  days: number,
): number {
  if (from === to || days <= 0) return roundMoney(amount);
  if (to === 'weekly') return roundMoney(amount * days);
  return dailyFromWeekly(amount, days);
}

export function resolveStoredDailyRate(amount: number, mode: RentalRateMode, days: number): number {
  return mode === 'weekly' ? dailyFromWeekly(amount, Math.max(days, 1)) : roundMoney(amount);
}

export function buildRentalEntries(
  dates: string[],
  amount: number,
  mode: RentalRateMode,
): Array<{ work_date: string; rental_amount: number }> {
  const sorted = [...dates].sort();
  const amounts = mode === 'weekly' ? splitAmount(amount, sorted.length) : sorted.map(() => roundMoney(amount));
  return sorted.map((work_date, index) => ({
    work_date,
    rental_amount: amounts[index] ?? 0,
  }));
}
