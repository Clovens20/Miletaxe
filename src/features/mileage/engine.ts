import { convertDistance } from '@/lib/format';
import type { DistanceUnit, OdometerReadingKind } from '@/types/domain';
import type {
  DailyMileage,
  DistanceSegment,
  OdometerReading,
  ProposedReading,
  ReadingEvaluation,
} from './types';

const LEGACY_KIND: Record<string, OdometerReadingKind> = {
  opening: 'start_of_day',
  closing: 'end_of_day',
  periodic: 'manual',
};

export function normalizeReadingKind(kind: string): OdometerReadingKind {
  if (kind === 'start_of_day' || kind === 'end_of_day' || kind === 'manual') return kind;
  return LEGACY_KIND[kind] ?? 'manual';
}

export function sortReadings(readings: OdometerReading[]): OdometerReading[] {
  return [...readings].sort((a, b) => {
    const byTime = a.recorded_at.localeCompare(b.recorded_at);
    if (byTime !== 0) return byTime;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function isAcceptedReading(row: OdometerReading): boolean {
  return row.is_valid && row.validation_status === 'valid';
}

export function consecutiveValidReadings(readings: OdometerReading[]): OdometerReading[] {
  return sortReadings(readings).filter(isAcceptedReading);
}

export function previousValidReading(
  readings: OdometerReading[],
  beforeIso?: string,
): OdometerReading | undefined {
  const valid = consecutiveValidReadings(readings);
  if (!beforeIso) return valid[valid.length - 1];
  return [...valid].reverse().find((row) => row.recorded_at <= beforeIso);
}

export function evaluateProposedReading(
  previous: OdometerReading | undefined,
  proposed: ProposedReading,
): ReadingEvaluation {
  if (!previous) {
    return { status: 'valid', is_valid: true, distance: null, reason: 'first' };
  }
  const prev = convertDistance(previous.reading, previous.unit, proposed.unit);
  const distance = proposed.reading - prev;
  if (distance < 0) {
    return {
      status: 'invalid',
      is_valid: false,
      distance,
      previous,
      reason: 'lower_than_previous',
    };
  }
  return { status: 'valid', is_valid: true, distance, previous };
}

export function buildDistanceSegments(
  readings: OdometerReading[],
  userId: string,
  vehicleId: string,
  unit: DistanceUnit,
): Omit<DistanceSegment, 'id'>[] {
  const valid = consecutiveValidReadings(readings);
  const segments: Omit<DistanceSegment, 'id'>[] = [];
  for (let index = 1; index < valid.length; index += 1) {
    const start = valid[index - 1];
    const end = valid[index];
    if (!start || !end) continue;
    const distance =
      convertDistance(end.reading, end.unit, unit) - convertDistance(start.reading, start.unit, unit);
    if (distance < 0) continue;
    segments.push({
      user_id: userId,
      vehicle_id: vehicleId,
      start_reading_id: start.id,
      end_reading_id: end.id,
      distance,
      unit,
      started_on: start.recorded_on,
      ended_on: end.recorded_on,
      purpose: 'unspecified',
      business_distance: null,
    });
  }
  return segments;
}

export function sumPositiveDistance(
  segments: Array<{ distance: number; ended_on: string; unit?: DistanceUnit }>,
  from?: string,
  to?: string,
  displayUnit?: DistanceUnit,
): number {
  return segments.reduce((total, row) => {
    if (from && row.ended_on < from) return total;
    if (to && row.ended_on > to) return total;
    const distance =
      displayUnit && row.unit ? convertDistance(row.distance, row.unit, displayUnit) : row.distance;
    return total + (distance > 0 ? distance : 0);
  }, 0);
}

function pickDayStart(dayReadings: OdometerReading[]): OdometerReading | null {
  return dayReadings.find((row) => row.kind === 'start_of_day') ?? dayReadings[0] ?? null;
}

function pickDayEnd(dayReadings: OdometerReading[]): OdometerReading | null {
  const ends = dayReadings.filter((row) => row.kind === 'end_of_day');
  if (ends.length) return ends[ends.length - 1] ?? null;
  if (dayReadings.length > 1) return dayReadings[dayReadings.length - 1] ?? null;
  return null;
}

export function groupDailyMileage(
  readings: OdometerReading[],
  vehicleId: string,
  unit: DistanceUnit,
): DailyMileage[] {
  const byDate = new Map<string, OdometerReading[]>();
  for (const row of consecutiveValidReadings(readings).filter((item) => item.vehicle_id === vehicleId)) {
    const list = byDate.get(row.recorded_on) ?? [];
    list.push(row);
    byDate.set(row.recorded_on, list);
  }

  const invalidByDate = new Set(
    readings.filter((row) => row.vehicle_id === vehicleId && !isAcceptedReading(row)).map((row) => row.recorded_on),
  );

  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayReadings]) => {
      const start = pickDayStart(dayReadings);
      const end = pickDayEnd(dayReadings);
      const samePoint = start && end && start.id === end.id;
      const distance =
        start && end && !samePoint
          ? convertDistance(end.reading, end.unit, unit) - convertDistance(start.reading, start.unit, unit)
          : null;
      const warnings: DailyMileage['warnings'] = [];
      if (!start) warnings.push('missing_start');
      if (start && (!end || samePoint)) warnings.push('missing_end');
      if (invalidByDate.has(date)) warnings.push('invalid_reading');
      return {
        date,
        vehicle_id: vehicleId,
        start,
        end: samePoint ? null : end,
        distance,
        unit,
        complete: Boolean(start && end && !samePoint && (distance ?? 0) >= 0),
        warnings,
      };
    });
}

export function currentOdometerFromReadings(
  readings: OdometerReading[],
  unit: DistanceUnit,
): number | null {
  const latest = consecutiveValidReadings(readings).at(-1);
  if (!latest) return null;
  return convertDistance(latest.reading, latest.unit, unit);
}
