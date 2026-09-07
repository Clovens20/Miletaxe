import type { IntegritySeverity } from '@/types/domain';

export function dossierCompleteness(input: {
  hasVehicle: boolean;
  hasOpeningOdometer: boolean;
  hasActivity: boolean;
  findings: Array<{ severity: IntegritySeverity }>;
}): {
  score: number;
  checkDone: number;
  checkTotal: number;
  blocking: number;
  warning: number;
  info: number;
  total: number;
} {
  const blocking = input.findings.filter((row) => row.severity === 'blocking').length;
  const warning = input.findings.filter((row) => row.severity === 'warning').length;
  const info = input.findings.filter((row) => row.severity === 'info').length;
  const checks = [
    input.hasVehicle,
    input.hasVehicle && input.hasOpeningOdometer,
    input.hasActivity,
    blocking === 0 && warning === 0,
  ];
  const checkDone = checks.filter(Boolean).length;
  const checkTotal = checks.length;
  const score = Math.round((checkDone / checkTotal) * 100);
  return { score, checkDone, checkTotal, blocking, warning, info, total: input.findings.length };
}

export function completenessTone(score: number, blocking: number): 'ok' | 'warn' | 'danger' {
  if (blocking > 0 || score < 50) return 'danger';
  if (score < 100) return 'warn';
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
