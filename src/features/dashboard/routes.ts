import type { Href } from 'expo-router';

import { odometerCaptureHref } from '@/features/mileage/routes';
import type { IntegrityFinding } from '@/features/integrity/engine';

export function findingHref(item: IntegrityFinding): Href {
  switch (item.entity_type) {
    case 'vehicle':
      return '/(app)/vehicles/new';
    case 'odometer':
      if (item.rule_code === 'invalid_odometer_reading' && item.entity_id) {
        return `/(app)/odometer/${item.entity_id}` as Href;
      }
      if (item.rule_code === 'missing_end_of_day') {
        return odometerCaptureHref({ kind: 'end_of_day' });
      }
      if (item.rule_code === 'missing_start_of_day' || item.rule_code === 'missing_opening_odometer') {
        return odometerCaptureHref({ kind: 'start_of_day' });
      }
      return odometerCaptureHref();
    case 'expense':
      if (item.rule_code === 'receipt_pending_review' && item.entity_id) {
        return `/(app)/expenses/review?receiptId=${item.entity_id}`;
      }
      if (item.entity_id && item.rule_code !== 'receipt_pending_review') {
        return `/(app)/expenses/${item.entity_id}` as Href;
      }
      return '/(app)/expenses/scan';
    case 'income':
      return '/(app)/income/new';
    default:
      return '/(app)/completeness';
  }
}
