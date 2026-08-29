export type MarketingCard = {
  title: string;
  body: string;
};

export function asCards(value: unknown): MarketingCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as { title?: unknown; body?: unknown };
    if (typeof row.title !== 'string' || typeof row.body !== 'string') return [];
    return [{ title: row.title, body: row.body }];
  });
}
