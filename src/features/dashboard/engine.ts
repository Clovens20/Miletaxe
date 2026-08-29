import type { IntegritySeverity } from '@/types/domain';

export function completenessScore(findings: Array<{ severity: IntegritySeverity }>): {
  score: number;
  blocking: number;
  warning: number;
  info: number;
  total: number;
} {
  const blocking = findings.filter((row) => row.severity === 'blocking').length;
  const warning = findings.filter((row) => row.severity === 'warning').length;
  const info = findings.filter((row) => row.severity === 'info').length;
  const score = Math.max(0, Math.min(100, 100 - blocking * 20 - warning * 10 - info * 4));
  return { score, blocking, warning, info, total: findings.length };
}

export function completenessTone(score: number, blocking: number): 'ok' | 'warn' | 'danger' {
  if (blocking > 0 || score < 50) return 'danger';
  if (score < 85) return 'warn';
  return 'ok';
}

export function inDateRange(isoDate: string, start?: string, end?: string): boolean {
  if (start && isoDate < start) return false;
  if (end && isoDate > end) return false;
  return true;
}

export function dateOfTimestamp(iso: string): string {
  return iso.slice(0, 10);
}
