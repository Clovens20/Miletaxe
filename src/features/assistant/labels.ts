import type { AssistantConfidence } from '@/types/domain';

type Translate = (key: string) => string;

export function confidenceLabel(value: AssistantConfidence, t: Translate): string {
  if (value === 'high') return t('assistant.confidenceHigh');
  if (value === 'medium') return t('assistant.confidenceMedium');
  return t('assistant.confidenceReview');
}

export function confidenceTone(value: AssistantConfidence): 'danger' | 'warning' | 'info' {
  if (value === 'high') return 'danger';
  if (value === 'medium') return 'warning';
  return 'info';
}
