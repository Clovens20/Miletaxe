import type { OdometerReadingKind } from '@/types/domain';

type Translate = (key: string) => string;

export function readingKindLabel(kind: string, t: Translate): string {
  if (kind === 'start_of_day') return t('mileage.kindStart');
  if (kind === 'end_of_day') return t('mileage.kindEnd');
  return t('mileage.kindManual');
}

export const readingKindOptions = (t: Translate): { value: OdometerReadingKind; label: string }[] => [
  { value: 'start_of_day', label: t('mileage.kindStart') },
  { value: 'end_of_day', label: t('mileage.kindEnd') },
  { value: 'manual', label: t('mileage.kindManual') },
];
