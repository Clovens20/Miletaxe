import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { landingLocale } from '@/features/marketing/hooks';
import { getSupabase, isLocalMode, isSupabaseConfigured } from '@/lib/supabase/client';

import { defaultLegalContent } from './defaultLegal';
import type { LegalKind, LegalLocale, LegalPageContent, LegalPageSection } from './legalTypes';

function text(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function parseLegalContent(raw: unknown, kind: LegalKind, locale: LegalLocale): LegalPageContent {
  const fallback = defaultLegalContent(kind, locale);
  if (!raw || typeof raw !== 'object') return fallback;
  const row = raw as Record<string, unknown>;
  const sections = Array.isArray(row.sections)
    ? row.sections.map((item, index): LegalPageSection => {
        const section = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        return {
          id: text(section.id, `section-${index}`),
          heading: text(section.heading, ''),
          body: text(section.body, ''),
        };
      })
    : fallback.sections;
  return {
    title: text(row.title, fallback.title),
    updatedOn: text(row.updatedOn, fallback.updatedOn),
    sections,
  };
}

export function useLegalPage(kind: LegalKind, locale?: LegalLocale) {
  const { i18n } = useTranslation();
  const resolved = locale ?? landingLocale(i18n.language);

  return useQuery({
    queryKey: ['legal', kind, resolved],
    queryFn: async (): Promise<LegalPageContent> => {
      if (!isSupabaseConfigured || isLocalMode()) return defaultLegalContent(kind, resolved);
      const { data, error } = await getSupabase()
        .from('legal_pages')
        .select('content')
        .eq('locale', resolved)
        .eq('kind', kind)
        .maybeSingle();
      if (error || !data) return defaultLegalContent(kind, resolved);
      return parseLegalContent((data as { content: unknown }).content, kind, resolved);
    },
    staleTime: 60_000,
  });
}

export function useSaveLegalPage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      locale,
      kind,
      content,
    }: {
      locale: LegalLocale;
      kind: LegalKind;
      content: LegalPageContent;
    }) => {
      const { data: sessionData } = await getSupabase().auth.getUser();
      const { error } = await getSupabase().from('legal_pages').upsert({
        locale,
        kind,
        content,
        updated_at: new Date().toISOString(),
        updated_by: sessionData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: async (_data, variables) => {
      await client.invalidateQueries({ queryKey: ['legal', variables.kind, variables.locale] });
    },
  });
}
