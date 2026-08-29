import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { getSupabase, isLocalMode, isSupabaseConfigured } from '@/lib/supabase/client';

import { defaultLandingContent } from './defaultContent';
import { parseLandingContent } from './parse';
import type { LandingContent, LandingLocale } from './types';

export function landingLocale(language?: string): LandingLocale {
  return language === 'en' ? 'en' : 'fr';
}

export function useLandingContent(locale?: LandingLocale) {
  const { i18n } = useTranslation();
  const resolved = locale ?? landingLocale(i18n.language);

  return useQuery({
    queryKey: ['landing', resolved],
    queryFn: async (): Promise<LandingContent> => {
      if (!isSupabaseConfigured || isLocalMode()) return defaultLandingContent(resolved);
      const { data, error } = await getSupabase()
        .from('landing_pages')
        .select('content')
        .eq('locale', resolved)
        .maybeSingle();
      if (error || !data) return defaultLandingContent(resolved);
      return parseLandingContent((data as { content: unknown }).content, resolved);
    },
    staleTime: 60_000,
  });
}

export function useSaveLanding() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ locale, content }: { locale: LandingLocale; content: LandingContent }) => {
      const { data: sessionData } = await getSupabase().auth.getUser();
      const { error } = await getSupabase().from('landing_pages').upsert({
        locale,
        content,
        updated_at: new Date().toISOString(),
        updated_by: sessionData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: async (_data, variables) => {
      await client.invalidateQueries({ queryKey: ['landing', variables.locale] });
    },
  });
}
