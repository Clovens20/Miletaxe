import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { combineDateAndTime, nowTimeHm, parseDecimal, todayIso } from '@/lib/format';
import { loadLocal, newId, updateLocal } from '@/lib/local/store';
import { rebuildLocalSegments } from '@/lib/local/segments';
import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import type { TableRow } from '@/types/database';
import type { DistanceUnit } from '@/types/domain';

export type Vehicle = TableRow<'vehicles'> & {
  distance_unit: DistanceUnit;
  current_odometer: number | null;
};

function withVehicleDefaults(row: Partial<Vehicle> & { nickname: string; user_id: string }): Vehicle {
  const now = new Date().toISOString();
  return {
    id: row.id ?? '',
    user_id: row.user_id,
    nickname: row.nickname,
    make: row.make ?? null,
    model: row.model ?? null,
    year: row.year ?? null,
    plate: row.plate ?? null,
    vin: row.vin ?? null,
    fuel_type: row.fuel_type ?? null,
    ownership_type: row.ownership_type ?? null,
    business_use_percent: row.business_use_percent ?? null,
    distance_unit: row.distance_unit ?? 'km',
    current_odometer: row.current_odometer ?? null,
    is_active: row.is_active ?? true,
    acquired_on: row.acquired_on ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at ?? now,
    updated_at: row.updated_at ?? now,
  };
}

export function useVehicles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['vehicles', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (isLocalMode()) {
        const local = await loadLocal();
        return (local.vehicles as Vehicle[]).filter((row) => row.is_active !== false);
      }
      const { data, error } = await getSupabase()
        .from('vehicles')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Vehicle[];
    },
  });
}

export function useVehicle(id?: string) {
  const vehicles = useVehicles();
  return {
    ...vehicles,
    data: vehicles.data?.find((row) => row.id === id),
  };
}

type CreateVehicleInput = {
  nickname: string;
  make: string;
  model: string;
  year: number;
  distance_unit: DistanceUnit;
  current_odometer: number;
  plate?: string | null;
  notes?: string | null;
};

export function useCreateVehicle() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVehicleInput) => {
      if (!user) throw new Error('unauthenticated');
      const payload = {
        user_id: user.id,
        nickname: input.nickname,
        make: input.make,
        model: input.model,
        year: input.year,
        distance_unit: input.distance_unit,
        current_odometer: input.current_odometer,
        plate: input.plate ?? null,
        notes: input.notes ?? null,
        is_active: true,
      };

      let vehicle: Vehicle;
      if (isLocalMode()) {
        vehicle = withVehicleDefaults({ ...payload, id: await newId() });
        await updateLocal((state) => ({ ...state, vehicles: [vehicle, ...state.vehicles] }));
      } else {
        const { data, error } = await getSupabase().from('vehicles').insert(payload).select('*').single();
        if (error) throw error;
        vehicle = data as Vehicle;
      }

      const recorded_on = todayIso();
      const recorded_at = combineDateAndTime(recorded_on, nowTimeHm());
      const readingRow = {
        user_id: user.id,
        vehicle_id: vehicle.id,
        reading: input.current_odometer,
        unit: input.distance_unit,
        kind: 'manual' as const,
        recorded_on,
        recorded_at,
        photo_path: null,
        notes: null,
        is_valid: true,
        validation_status: 'valid' as const,
        extracted_reading: null,
        ocr_status: null,
        ocr_payload: null,
        ocr_provider: null,
        ocr_confirmed_at: null,
        source: 'typed' as const,
      };

      if (isLocalMode()) {
        const saved = {
          id: await newId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...readingRow,
        };
        await updateLocal((state) => ({ ...state, readings: [saved, ...state.readings] }));
        await rebuildLocalSegments(vehicle.id);
      } else {
        await getSupabase().from('odometer_readings').insert(readingRow);
      }

      return vehicle;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['vehicles'] });
      client.invalidateQueries({ queryKey: ['odometer'] });
      client.invalidateQueries({ queryKey: ['distance-summary'] });
    },
  });
}

export function useUpdateVehicle() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<CreateVehicleInput> & { is_active?: boolean }) => {
      if (!user) throw new Error('unauthenticated');
      const { id, ...patch } = input;
      if (isLocalMode()) {
        await updateLocal((state) => ({
          ...state,
          vehicles: state.vehicles.map((row) =>
            (row as { id: string }).id === id ? { ...row, ...patch, updated_at: new Date().toISOString() } : row,
          ),
        }));
        return;
      }
      const { error } = await getSupabase().from('vehicles').update(patch).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function parseVehicleYear(value: string): number | null {
  const year = Number(value);
  return Number.isInteger(year) ? year : null;
}

export function parseCurrentOdometer(value: string): number | null {
  return parseDecimal(value);
}
