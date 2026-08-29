import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  consecutiveValidReadings,
  currentOdometerFromReadings,
  evaluateProposedReading,
  groupDailyMileage,
  normalizeReadingKind,
  previousValidReading,
  sumPositiveDistance,
} from '@/features/mileage/engine';
import { emptyExtraction, EdgeFunctionOdometerOcrProvider, UnconfiguredOdometerOcrProvider } from '@/features/mileage/ocr/provider';
import { uploadOdometerPhoto } from '@/features/mileage/storage';
import type { OdometerReading, OdometerRevision } from '@/features/mileage/types';
import { addDays, startOfMonthIso, startOfWeekIso, todayIso } from '@/lib/format';
import { rebuildLocalSegments } from '@/lib/local/segments';
import { loadLocal, newId, updateLocal } from '@/lib/local/store';
import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import type { DistanceUnit, OdometerReadingKind, OdometerSource, ReadingValidationStatus, RevisionSource } from '@/types/domain';
import { useVehicles, type Vehicle } from '@/features/vehicles/hooks';
import type { DistanceSegment } from './types';

function hydrateReading(row: Record<string, unknown>): OdometerReading {
  const recorded_on = String(row.recorded_on ?? todayIso());
  const recorded_at = String(row.recorded_at ?? `${recorded_on}T12:00:00.000Z`);
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    vehicle_id: String(row.vehicle_id),
    reading: Number(row.reading),
    unit: (row.unit as DistanceUnit) ?? 'km',
    kind: normalizeReadingKind(String(row.kind ?? 'manual')),
    recorded_on,
    recorded_at,
    photo_path: (row.photo_path as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    is_valid: row.is_valid !== false,
    validation_status: (row.validation_status as ReadingValidationStatus) ?? (row.is_valid === false ? 'invalid' : 'valid'),
    extracted_reading: row.extracted_reading == null ? null : Number(row.extracted_reading),
    ocr_status: (row.ocr_status as OdometerReading['ocr_status']) ?? null,
    ocr_payload: (row.ocr_payload as OdometerReading['ocr_payload']) ?? null,
    ocr_provider: (row.ocr_provider as string | null) ?? null,
    ocr_confirmed_at: (row.ocr_confirmed_at as string | null) ?? null,
    source: (row.source as OdometerSource) ?? 'typed',
    created_at: String(row.created_at ?? recorded_at),
    updated_at: String(row.updated_at ?? row.created_at ?? recorded_at),
  };
}

export function useOdometerReadings(vehicleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['odometer', user?.id, vehicleId],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (isLocalMode()) {
        const local = await loadLocal();
        return (local.readings as Record<string, unknown>[])
          .map(hydrateReading)
          .filter((row) => !vehicleId || row.vehicle_id === vehicleId)
          .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
      }
      let query = getSupabase()
        .from('odometer_readings')
        .select('*')
        .eq('user_id', user!.id)
        .order('recorded_at', { ascending: false });
      if (vehicleId) query = query.eq('vehicle_id', vehicleId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(hydrateReading);
    },
  });
}

export function useOdometerReading(id?: string) {
  const readings = useOdometerReadings();
  return { ...readings, data: readings.data?.find((row) => row.id === id) };
}

export function useDistanceSegments(vehicleId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['distance-segments', user?.id, vehicleId],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (isLocalMode()) {
        const local = await loadLocal();
        return (local.segments as DistanceSegment[]).filter((row) => !vehicleId || row.vehicle_id === vehicleId);
      }
      let query = getSupabase().from('distance_segments').select('*').eq('user_id', user!.id);
      if (vehicleId) query = query.eq('vehicle_id', vehicleId);
      const { data, error } = await query;
      if (error) throw error;
      return data as DistanceSegment[];
    },
  });
}

export function useDistanceSummary(yearStart?: string, yearEnd?: string, vehicleId?: string, displayUnit?: DistanceUnit) {
  const segments = useDistanceSegments(vehicleId);
  return {
    ...segments,
    data: sumPositiveDistance(segments.data ?? [], yearStart, yearEnd, displayUnit),
  };
}

export function useDailyMileage(vehicleId?: string) {
  const readings = useOdometerReadings(vehicleId);
  const vehicles = useVehicles();
  const vehicle = vehicles.data?.find((row) => row.id === vehicleId) ?? vehicles.data?.[0];
  const unit = (vehicle?.distance_unit ?? 'km') as DistanceUnit;
  const data = vehicleId || vehicle?.id ? groupDailyMileage(readings.data ?? [], vehicleId ?? vehicle!.id, unit) : [];
  return { ...readings, data, unit, vehicle };
}

export function useMileageDashboard(vehicleId?: string) {
  const readings = useOdometerReadings(vehicleId);
  const segments = useDistanceSegments(vehicleId);
  const vehicles = useVehicles();
  const today = todayIso();
  const weekStart = startOfWeekIso(today);
  const monthStart = startOfMonthIso(today);
  const vehicle = vehicleId ? vehicles.data?.find((row) => row.id === vehicleId) : undefined;
  const unit = (vehicle?.distance_unit ?? vehicles.data?.[0]?.distance_unit ?? 'km') as DistanceUnit;
  const scoped = (readings.data ?? []).filter((row) => !vehicleId || row.vehicle_id === vehicleId);
  const invalidCount = scoped.filter((row) => !row.is_valid).length;
  const latest = consecutiveValidReadings(scoped).at(-1);
  const segmentRows = segments.data ?? [];

  return {
    isLoading: readings.isLoading || segments.isLoading,
    today: sumPositiveDistance(segmentRows, today, today, unit),
    week: sumPositiveDistance(segmentRows, weekStart, today, unit),
    month: sumPositiveDistance(segmentRows, monthStart, today, unit),
    latest: vehicleId ? latest : undefined,
    currentOdometer: vehicle?.current_odometer ?? (vehicleId ? currentOdometerFromReadings(scoped, unit) : null),
    unit,
    invalidCount,
    missingEndToday: Boolean(
      scoped.some((row) => row.recorded_on === today && row.kind === 'start_of_day' && row.is_valid) &&
        !scoped.some((row) => row.recorded_on === today && row.kind === 'end_of_day' && row.is_valid),
    ),
  };
}

export type CreateReadingInput = {
  vehicle_id: string;
  reading: number;
  unit: DistanceUnit;
  kind: OdometerReadingKind;
  recorded_on: string;
  recorded_at: string;
  notes?: string;
  photoUri?: string;
  photoPath?: string | null;
  extracted_reading?: number | null;
  ocr_status?: OdometerReading['ocr_status'];
  ocr_payload?: Record<string, unknown> | null;
  ocr_provider?: string | null;
  source?: OdometerSource;
  saveDespiteInvalid?: boolean;
};

async function insertRevision(row: Omit<OdometerRevision, 'id' | 'created_at'> & { id?: string }) {
  const saved: OdometerRevision = {
    id: row.id ?? (await newId()),
    created_at: new Date().toISOString(),
    reading_id: row.reading_id,
    user_id: row.user_id,
    field_name: row.field_name,
    old_value: row.old_value,
    new_value: row.new_value,
    reason: row.reason,
    source: row.source,
  };
  if (isLocalMode()) {
    await updateLocal((state) => ({ ...state, revisions: [saved, ...state.revisions] }));
    return saved;
  }
  const { error } = await getSupabase().from('odometer_reading_revisions').insert({
    reading_id: saved.reading_id,
    user_id: saved.user_id,
    field_name: saved.field_name,
    old_value: saved.old_value,
    new_value: saved.new_value,
    reason: saved.reason,
    source: saved.source,
  });
  if (error) throw error;
  return saved;
}

export function useCreateOdometerReading() {
  const { user } = useAuth();
  const client = useQueryClient();
  const allReadings = useOdometerReadings();

  return useMutation({
    mutationFn: async (input: CreateReadingInput) => {
      if (!user) throw new Error('unauthenticated');
      const previous = previousValidReading(
        (allReadings.data ?? []).filter((row) => row.vehicle_id === input.vehicle_id),
        input.recorded_at,
      );
      const evaluation = evaluateProposedReading(previous, {
        reading: input.reading,
        unit: input.unit,
        recorded_on: input.recorded_on,
        recorded_at: input.recorded_at,
      });
      if (!evaluation.is_valid && !input.saveDespiteInvalid) {
        throw new Error('odometer_not_monotonic');
      }

      let photo_path = input.photoPath ?? null;
      if (input.photoUri && !photo_path) {
        photo_path = await uploadOdometerPhoto(user.id, input.photoUri, input.vehicle_id);
      }

      const source = input.source ?? (input.extracted_reading != null ? 'ocr' : 'typed');
      const now = new Date().toISOString();
      const row: OdometerReading = {
        id: await newId(),
        user_id: user.id,
        vehicle_id: input.vehicle_id,
        reading: input.reading,
        unit: input.unit,
        kind: input.kind,
        recorded_on: input.recorded_on,
        recorded_at: input.recorded_at,
        photo_path,
        notes: input.notes ?? null,
        is_valid: evaluation.is_valid,
        validation_status: evaluation.status,
        extracted_reading: input.extracted_reading ?? null,
        ocr_status: input.ocr_status ?? (source === 'ocr' ? 'complete' : null),
        ocr_payload: input.ocr_payload ?? null,
        ocr_provider: input.ocr_provider ?? null,
        ocr_confirmed_at: source === 'ocr' ? now : null,
        source,
        created_at: now,
        updated_at: now,
      };

      if (isLocalMode()) {
        await updateLocal((state) => ({ ...state, readings: [row, ...state.readings] }));
        await rebuildLocalSegments(input.vehicle_id);
      } else {
        const { id: _id, ...insertable } = row;
        const { data, error } = await getSupabase().from('odometer_readings').insert(insertable).select('*').single();
        if (error) throw error;
        row.id = (data as { id: string }).id;
      }

      if (row.extracted_reading != null && row.extracted_reading !== row.reading) {
        await insertRevision({
          reading_id: row.id,
          user_id: user.id,
          field_name: 'reading',
          old_value: String(row.extracted_reading),
          new_value: String(row.reading),
          reason: 'ocr_corrected_before_save',
          source: 'ocr_confirm',
        });
      }
      if (!evaluation.is_valid) {
        await insertRevision({
          reading_id: row.id,
          user_id: user.id,
          field_name: 'is_valid',
          old_value: 'true',
          new_value: 'false',
          reason: 'lower_than_previous',
          source: 'system',
        });
      }
      return { reading: row, evaluation };
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['odometer'] });
      client.invalidateQueries({ queryKey: ['distance-summary'] });
      client.invalidateQueries({ queryKey: ['distance-segments'] });
      client.invalidateQueries({ queryKey: ['vehicles'] });
      client.invalidateQueries({ queryKey: ['integrity'] });
      client.invalidateQueries({ queryKey: ['revisions'] });
    },
  });
}

export function useUpdateOdometerReading() {
  const { user } = useAuth();
  const client = useQueryClient();
  const allReadings = useOdometerReadings();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      reading?: number;
      notes?: string | null;
      kind?: OdometerReadingKind;
      recorded_on?: string;
      recorded_at?: string;
      saveDespiteInvalid?: boolean;
    }) => {
      if (!user) throw new Error('unauthenticated');
      const current = allReadings.data?.find((row) => row.id === input.id);
      if (!current) throw new Error('not_found');
      const nextReading = input.reading ?? current.reading;
      const recorded_at = input.recorded_at ?? current.recorded_at;
      const others = (allReadings.data ?? []).filter((row) => row.id !== current.id && row.vehicle_id === current.vehicle_id);
      const previous = previousValidReading(others, recorded_at);
      const evaluation = evaluateProposedReading(previous, {
        reading: nextReading,
        unit: current.unit,
        recorded_on: input.recorded_on ?? current.recorded_on,
        recorded_at,
      });
      if (!evaluation.is_valid && !input.saveDespiteInvalid) {
        throw new Error('odometer_not_monotonic');
      }
      const patch = {
        reading: nextReading,
        notes: input.notes ?? current.notes,
        kind: input.kind ?? current.kind,
        recorded_on: input.recorded_on ?? current.recorded_on,
        recorded_at,
        is_valid: evaluation.is_valid,
        validation_status: evaluation.status,
        updated_at: new Date().toISOString(),
      };

      if (nextReading !== current.reading) {
        await insertRevision({
          reading_id: current.id,
          user_id: user.id,
          field_name: 'reading',
          old_value: String(current.reading),
          new_value: String(nextReading),
          reason: 'user_correction',
          source: 'user',
        });
      }

      if (isLocalMode()) {
        await updateLocal((state) => ({
          ...state,
          readings: state.readings.map((row) =>
            (row as { id: string }).id === current.id ? { ...row, ...patch } : row,
          ),
        }));
        await rebuildLocalSegments(current.vehicle_id);
      } else {
        const { error } = await getSupabase()
          .from('odometer_readings')
          .update(patch)
          .eq('id', current.id)
          .eq('user_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['odometer'] });
      client.invalidateQueries({ queryKey: ['distance-segments'] });
      client.invalidateQueries({ queryKey: ['vehicles'] });
      client.invalidateQueries({ queryKey: ['integrity'] });
      client.invalidateQueries({ queryKey: ['revisions'] });
    },
  });
}

export function useOdometerRevisions(readingId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['revisions', user?.id, readingId],
    enabled: Boolean(user?.id && readingId),
    queryFn: async () => {
      if (isLocalMode()) {
        const local = await loadLocal();
        return (local.revisions as OdometerRevision[])
          .filter((row) => row.reading_id === readingId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
      }
      const { data, error } = await getSupabase()
        .from('odometer_reading_revisions')
        .select('*')
        .eq('reading_id', readingId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OdometerRevision[];
    },
  });
}

export function useOdometerOcr() {
  return useMutation({
    mutationFn: async (input: { imageUri: string; storagePath?: string; hintReading?: number }) => {
      const name = process.env.EXPO_PUBLIC_ODOMETER_OCR_FUNCTION_NAME ?? 'extract-odometer';
      if (!isLocalMode() && input.storagePath) {
        const provider = new EdgeFunctionOdometerOcrProvider(async ({ storagePath, hintReading }) => {
          const { data, error } = await getSupabase().functions.invoke(name, {
            body: { storage_path: storagePath, hint_reading: hintReading },
          });
          if (error || !data?.extraction) {
            return { ...emptyExtraction('edge-failed'), raw: { error: String(error) } };
          }
          return { ...data.extraction, requires_confirmation: true as const };
        });
        return provider.extract(input);
      }
      return new UnconfiguredOdometerOcrProvider().extract(input);
    },
  });
}

export function useEvaluateReading(vehicleId: string | undefined, proposed?: { reading: number; unit: DistanceUnit; recorded_at: string }) {
  const readings = useOdometerReadings(vehicleId);
  const previous = previousValidReading(readings.data ?? [], proposed?.recorded_at);
  if (!proposed) return { previous, evaluation: undefined, readings };
  return {
    previous,
    evaluation: evaluateProposedReading(previous, {
      reading: proposed.reading,
      unit: proposed.unit,
      recorded_on: proposed.recorded_at.slice(0, 10),
      recorded_at: proposed.recorded_at,
    }),
    readings,
  };
}

export function vehicleUnit(vehicle?: Vehicle, fallback: DistanceUnit = 'km'): DistanceUnit {
  return vehicle?.distance_unit ?? fallback;
}

export { addDays };
