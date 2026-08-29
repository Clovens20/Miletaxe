import { clampAiSignal } from './engine';
import type { AssistantSignal } from './types';

export type AssistantAiProvider = {
  review(input: { locale: string }): Promise<AssistantSignal[]>;
};

export function emptyAssistantSignals(): AssistantSignal[] {
  return [];
}

export class UnconfiguredAssistantProvider implements AssistantAiProvider {
  async review(_input: { locale: string }): Promise<AssistantSignal[]> {
    return emptyAssistantSignals();
  }
}

export class EdgeFunctionAssistantProvider implements AssistantAiProvider {
  constructor(private readonly invoke: () => Promise<{ signals?: unknown }>) {}

  async review(_input: { locale: string }): Promise<AssistantSignal[]> {
    const payload = await this.invoke();
    const rows = Array.isArray(payload.signals) ? payload.signals : [];
    return rows.map((row) => clampAiSignal(row)).filter((row): row is AssistantSignal => Boolean(row));
  }
}
