import { convertDistance } from '@/lib/format';
import type { DistanceUnit } from '@/types/domain';
import { buildDistanceSegments } from '@/features/mileage/engine';
import type { OdometerReading } from '@/features/mileage/types';
import { loadLocal, newId, updateLocal } from './store';

type Reading = OdometerReading;

export async function rebuildLocalSegments(vehicleId: string) {
  const state = await loadLocal();
  const vehicle = state.vehicles.find((row) => (row as { id: string }).id === vehicleId) as
    | { id: string; distance_unit?: DistanceUnit; user_id: string }
    | undefined;
  const unit = vehicle?.distance_unit ?? 'km';
  const readings = (state.readings as Reading[]).filter((row) => row.vehicle_id === vehicleId);
  const drafts = buildDistanceSegments(readings, vehicle?.user_id ?? readings[0]?.user_id ?? '', vehicleId, unit);
  const segments = await Promise.all(
    drafts.map(async (row) => ({
      id: await newId(),
      ...row,
    })),
  );

  const latestValid = [...readings]
    .filter((row) => row.is_valid && row.validation_status === 'valid')
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    .at(-1);

  await updateLocal((current) => ({
    ...current,
    segments: [
      ...current.segments.filter((row) => (row as { vehicle_id: string }).vehicle_id !== vehicleId),
      ...segments,
    ],
    vehicles: current.vehicles.map((row) => {
      const item = row as { id: string; distance_unit?: DistanceUnit };
      if (item.id !== vehicleId) return row;
      return {
        ...row,
        current_odometer: latestValid
          ? convertDistance(latestValid.reading, latestValid.unit, item.distance_unit ?? 'km')
          : null,
      };
    }),
  }));
}
