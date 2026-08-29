import type { CurrencyCode, DistanceUnit, SupportedLocale } from '@/types/domain';
import { intlLocale } from '@/lib/i18n/localize';

export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function formatMoney(
  amount: number,
  currency: CurrencyCode | string,
  language: SupportedLocale,
  countryCode?: string | null,
): string {
  return new Intl.NumberFormat(intlLocale(language, countryCode), {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDistance(
  value: number,
  unit: DistanceUnit,
  language: SupportedLocale,
  countryCode?: string | null,
): string {
  const formatted = new Intl.NumberFormat(intlLocale(language, countryCode), {
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted} ${unit}`;
}

export function formatDate(
  isoDate: string,
  language: SupportedLocale,
  countryCode?: string | null,
): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat(intlLocale(language, countryCode), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function toKm(value: number, unit: DistanceUnit): number {
  return unit === 'mi' ? value * 1.609344 : value;
}

export function fromKm(valueKm: number, unit: DistanceUnit): number {
  return unit === 'mi' ? valueKm / 1.609344 : valueKm;
}

export function convertDistance(value: number, from: DistanceUnit, to: DistanceUnit): number {
  if (from === to) return value;
  return fromKm(toKm(value, from), to);
}

export const todayIso = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function nowTimeHm(): string {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function combineDateAndTime(date: string, time: string): string {
  const [hour = '00', minute = '00'] = time.split(':');
  const local = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), Number(hour), Number(minute), 0);
  return local.toISOString();
}

export function timeFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return nowTimeHm();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatDateTime(
  iso: string,
  language: SupportedLocale,
  countryCode?: string | null,
): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(intlLocale(language, countryCode), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfWeekIso(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(isoDate, diff);
}

export function startOfMonthIso(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function lastDayOfMonth(yearMonth: string): string {
  const year = Number(yearMonth.slice(0, 4));
  const month = Number(yearMonth.slice(5, 7));
  const date = new Date(Date.UTC(year, month, 0));
  return date.toISOString().slice(0, 10);
}

export function addMonths(yearMonth: string, delta: number): string {
  const year = Number(yearMonth.slice(0, 4));
  const month = Number(yearMonth.slice(5, 7));
  const index = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

export function yearMonthNow(): string {
  return todayIso().slice(0, 7);
}

export function formatYearMonth(
  yearMonth: string,
  language: SupportedLocale,
  countryCode?: string | null,
): string {
  const date = new Date(`${yearMonth}-01T00:00:00`);
  return new Intl.DateTimeFormat(intlLocale(language, countryCode), {
    month: 'long',
    year: 'numeric',
  }).format(date);
}
