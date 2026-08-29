import type { Href } from 'expo-router';

import type { OdometerReadingKind } from '@/types/domain';

export function odometerCaptureHref(params?: {
  vehicleId?: string;
  kind?: OdometerReadingKind | string;
}): Href {
  const query = new URLSearchParams();
  if (params?.vehicleId) query.set('vehicleId', params.vehicleId);
  if (params?.kind) query.set('kind', String(params.kind));
  const suffix = query.toString();
  return (`/(app)/odometer/capture${suffix ? `?${suffix}` : ''}`) as Href;
}
