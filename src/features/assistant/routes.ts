import type { Href } from 'expo-router';

import { odometerCaptureHref } from '@/features/mileage/routes';
import type { AssistantRecommendation } from './types';

export function recommendationHref(item: AssistantRecommendation): Href {
  const id = item.entity_id;
  switch (item.entity_type) {
    case 'odometer':
      if (item.check_code === 'missing_odometer_reading') {
        const kind = String(item.evidence.kind ?? '');
        if (kind === 'end_of_day') return odometerCaptureHref({ kind: 'end_of_day' });
        if (kind === 'start_of_day' || kind === 'opening') return odometerCaptureHref({ kind: 'start_of_day' });
        return odometerCaptureHref();
      }
      if (id) return `/(app)/odometer/${id}` as Href;
      return odometerCaptureHref();
    case 'expense':
      if (id) return `/(app)/expenses/${id}` as Href;
      return '/(app)/expenses/scan';
    case 'income':
      return '/(app)/income/new';
    default:
      return '/(app)/assistant' as Href;
  }
}
