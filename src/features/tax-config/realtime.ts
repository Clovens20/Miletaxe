import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getSupabase, isLocalMode, isSupabaseConfigured } from '@/lib/supabase/client';

const CATALOG_TABLES = [
  'countries',
  'jurisdictions',
  'tax_years',
  'occupation_catalog',
  'expense_category_catalog',
  'income_category_catalog',
  'mileage_rate_methods',
  'mileage_rate_tiers',
  'record_requirements',
  'integrity_rule_definitions',
  'report_section_templates',
  'assistant_check_definitions',
] as const;

export function CatalogRealtime({ enabled = true }: { enabled?: boolean }) {
  const client = useQueryClient();

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || isLocalMode()) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void client.invalidateQueries({ queryKey: ['catalog'] });
        void client.invalidateQueries({ queryKey: ['admin', 'catalog'] });
      }, 200);
    };

    const supabase = getSupabase();
    const channel = supabase.channel('catalog-live');
    for (const table of CATALOG_TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, bump);
    }
    channel.subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [client, enabled]);

  return null;
}
