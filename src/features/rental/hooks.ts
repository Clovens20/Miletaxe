import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { rentalVehiclesOf, useCreateVehicle, type Vehicle } from '@/features/vehicles/hooks';
import { parseDecimal, startOfMonthIso, todayIso } from '@/lib/format';
import { loadLocal, newId, updateLocal } from '@/lib/local/store';
import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import type { DistanceUnit } from '@/types/domain';

import type { VehicleRentalDay } from './types';

function asDay(row: Record<string, unknown>): VehicleRentalDay {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    vehicle_id: String(row.vehicle_id),
    work_date: String(row.work_date),
    rental_amount: Number(row.rental_amount),
    notes: typeof row.notes === 'string' ? row.notes : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

export function useRentalDays() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['rental-days', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (isLocalMode()) {
        const local = await loadLocal();
        return (local.rental_days as Record<string, unknown>[]).map(asDay);
      }
      const { data, error } = await getSupabase()
        .from('vehicle_rental_days')
        .select('*')
        .eq('user_id', user!.id)
        .order('work_date', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => asDay(row as Record<string, unknown>));
    },
  });
}

export function useLogRentalDay() {
  const { user, profile } = useAuth();
  const client = useQueryClient();
  const createVehicle = useCreateVehicle();

  return useMutation({
    mutationFn: async (input: {
      work_date: string;
      rental_amount: number;
      notes?: string | null;
      nickname?: string;
      rental_vendor?: string | null;
    }) => {
      if (!user) throw new Error('unauthenticated');
      const cached = client.getQueryData(['vehicles', user.id]) as Vehicle[] | undefined;
      let vehicle = rentalVehiclesOf(cached)[0];
      if (!vehicle) {
        if (isLocalMode()) {
          const local = await loadLocal();
          vehicle = rentalVehiclesOf(local.vehicles as Parameters<typeof rentalVehiclesOf>[0])[0];
        } else {
          const { data } = await getSupabase().from('vehicles').select('*').eq('user_id', user.id);
          vehicle = rentalVehiclesOf((data ?? []) as Parameters<typeof rentalVehiclesOf>[0])[0];
        }
      }
      if (!vehicle) {
        vehicle = await createVehicle.mutateAsync({
          nickname: (input.nickname ?? '').trim() || 'Location',
          distance_unit: (profile?.default_distance_unit ?? 'km') as DistanceUnit,
          tracking_mode: 'rental_daily',
          ownership_type: 'rented',
          daily_rental_rate: input.rental_amount,
          rental_vendor: input.rental_vendor ?? null,
        });
      }

      const now = new Date().toISOString();
      const payload = {
        user_id: user.id,
        vehicle_id: vehicle.id,
        work_date: input.work_date,
        rental_amount: input.rental_amount,
        notes: input.notes ?? null,
      };

      if (isLocalMode()) {
        const local = await loadLocal();
        const existing = (local.rental_days as Record<string, unknown>[]).find(
          (row) => row.vehicle_id === vehicle.id && row.work_date === input.work_date,
        );
        if (existing) {
          await updateLocal((state) => ({
            ...state,
            rental_days: state.rental_days.map((row) =>
              (row as { id: string }).id === existing.id
                ? { ...row, ...payload, updated_at: now }
                : row,
            ),
          }));
          return asDay({ ...existing, ...payload, updated_at: now });
        }
        const saved = { id: await newId(), created_at: now, updated_at: now, ...payload };
        await updateLocal((state) => ({ ...state, rental_days: [saved, ...state.rental_days] }));
        return asDay(saved);
      }

      const { data, error } = await getSupabase()
        .from('vehicle_rental_days')
        .upsert(payload, { onConflict: 'vehicle_id,work_date' })
        .select('*')
        .single();
      if (error) throw error;
      return asDay(data as Record<string, unknown>);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['rental-days'] });
      client.invalidateQueries({ queryKey: ['vehicles'] });
      client.invalidateQueries({ queryKey: ['integrity'] });
    },
  });
}

export function rentalTotals(days: VehicleRentalDay[] | undefined, today = todayIso()) {
  const monthStart = startOfMonthIso(today);
  const rows = days ?? [];
  const todayRow = rows.find((row) => row.work_date === today);
  return {
    todayAmount: todayRow?.rental_amount ?? 0,
    todayLogged: Boolean(todayRow),
    monthAmount: rows
      .filter((row) => row.work_date >= monthStart && row.work_date <= today)
      .reduce((sum, row) => sum + Number(row.rental_amount), 0),
    yearAmount: rows.reduce((sum, row) => sum + Number(row.rental_amount), 0),
    count: rows.length,
  };
}

export function useLogRentalDays() {
  const { user, profile } = useAuth();
  const client = useQueryClient();
  const createVehicle = useCreateVehicle();

  return useMutation({
    mutationFn: async (input: {
      entries: Array<{ work_date: string; rental_amount: number }>;
      removeDates?: string[];
      notes?: string | null;
      nickname?: string;
      rental_vendor?: string | null;
      daily_rental_rate?: number | null;
    }) => {
      if (!user) throw new Error('unauthenticated');
      const removeDates = [...new Set((input.removeDates ?? []).filter(Boolean))];
      if (!input.entries.length && !removeDates.length) return [];
      const cached = client.getQueryData(['vehicles', user.id]) as Vehicle[] | undefined;
      let vehicle = rentalVehiclesOf(cached)[0];
      if (!vehicle) {
        if (isLocalMode()) {
          const local = await loadLocal();
          vehicle = rentalVehiclesOf(local.vehicles as Vehicle[])[0];
        } else {
          const { data } = await getSupabase().from('vehicles').select('*').eq('user_id', user.id);
          vehicle = rentalVehiclesOf((data ?? []) as Vehicle[])[0];
        }
      }
      const rate = input.daily_rental_rate ?? input.entries[0]?.rental_amount ?? null;
      if (!vehicle && input.entries.length) {
        vehicle = await createVehicle.mutateAsync({
          nickname: (input.nickname ?? '').trim() || 'Location',
          distance_unit: (profile?.default_distance_unit ?? 'km') as DistanceUnit,
          tracking_mode: 'rental_daily',
          ownership_type: 'rented',
          daily_rental_rate: rate,
          rental_vendor: input.rental_vendor ?? null,
        });
      }
      if (!vehicle && input.entries.length) throw new Error('missing_vehicle');
      const rentalVehicle = vehicle;
      if (
        rentalVehicle &&
        rate != null &&
        (rate !== rentalVehicle.daily_rental_rate ||
          (input.rental_vendor != null && input.rental_vendor !== rentalVehicle.rental_vendor))
      ) {
        const patch = {
          daily_rental_rate: rate,
          rental_vendor: input.rental_vendor ?? rentalVehicle.rental_vendor,
        };
        if (isLocalMode()) {
          await updateLocal((state) => ({
            ...state,
            vehicles: state.vehicles.map((row) =>
              (row as { id: string }).id === rentalVehicle.id
                ? { ...row, ...patch, updated_at: new Date().toISOString() }
                : row,
            ),
          }));
        } else {
          const { error } = await getSupabase()
            .from('vehicles')
            .update(patch)
            .eq('id', rentalVehicle.id)
            .eq('user_id', user.id);
          if (error) throw error;
        }
      }

      const now = new Date().toISOString();
      const payloads = rentalVehicle
        ? input.entries.map((entry) => ({
            user_id: user.id,
            vehicle_id: rentalVehicle.id,
            work_date: entry.work_date,
            rental_amount: entry.rental_amount,
            notes: input.notes ?? null,
          }))
        : [];

      const dropDates = (rows: Record<string, unknown>[]) =>
        rows.filter((row) => {
          if (!removeDates.includes(String(row.work_date))) return true;
          if (rentalVehicle && String(row.vehicle_id) !== rentalVehicle.id) return true;
          return false;
        });

      if (isLocalMode()) {
        const ids = await Promise.all(payloads.map(() => newId()));
        const saved: VehicleRentalDay[] = [];
        await updateLocal((state) => {
          let rentalDays = dropDates([...state.rental_days]);
          payloads.forEach((payload, index) => {
            const existingIndex = rentalDays.findIndex(
              (row) =>
                (row as { vehicle_id: string }).vehicle_id === payload.vehicle_id &&
                (row as { work_date: string }).work_date === payload.work_date,
            );
            if (existingIndex >= 0) {
              const current = rentalDays[existingIndex] as Record<string, unknown>;
              const next = { ...current, ...payload, updated_at: now };
              rentalDays[existingIndex] = next;
              saved.push(asDay(next));
            } else {
              const row = { id: ids[index] ?? '', created_at: now, updated_at: now, ...payload };
              rentalDays.unshift(row);
              saved.push(asDay(row));
            }
          });
          return { ...state, rental_days: rentalDays };
        });
        return saved;
      }

      if (payloads.length) {
        const { error } = await getSupabase()
          .from('vehicle_rental_days')
          .upsert(payloads, { onConflict: 'vehicle_id,work_date' });
        if (error) throw error;
      }
      if (removeDates.length) {
        let query = getSupabase()
          .from('vehicle_rental_days')
          .delete()
          .eq('user_id', user.id)
          .in('work_date', removeDates);
        if (rentalVehicle) query = query.eq('vehicle_id', rentalVehicle.id);
        const { error } = await query;
        if (error) throw error;
      }
      return [];
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['rental-days'] });
      client.invalidateQueries({ queryKey: ['vehicles'] });
      client.invalidateQueries({ queryKey: ['integrity'] });
    },
  });
}

export function useDeleteRentalDays() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { dates: string[]; vehicleId?: string }) => {
      if (!user) throw new Error('unauthenticated');
      const dates = [...new Set(input.dates.filter(Boolean))];
      if (!dates.length) return;
      if (isLocalMode()) {
        await updateLocal((state) => ({
          ...state,
          rental_days: state.rental_days.filter((row) => {
            const date = (row as { work_date: string }).work_date;
            const vehicleId = (row as { vehicle_id: string }).vehicle_id;
            if (!dates.includes(date)) return true;
            if (input.vehicleId && vehicleId !== input.vehicleId) return true;
            return false;
          }),
        }));
        return;
      }
      let query = getSupabase()
        .from('vehicle_rental_days')
        .delete()
        .eq('user_id', user.id)
        .in('work_date', dates);
      if (input.vehicleId) query = query.eq('vehicle_id', input.vehicleId);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['rental-days'] });
      client.invalidateQueries({ queryKey: ['integrity'] });
    },
  });
}

export function parseRentalAmount(value: string): number | null {
  const amount = parseDecimal(value);
  if (amount == null || amount < 0) return null;
  return amount;
}
