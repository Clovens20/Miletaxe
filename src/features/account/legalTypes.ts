import type { LandingLocale } from '@/features/marketing/types';

export type LegalKind = 'privacy' | 'terms';

export type LegalPageSection = {
  id: string;
  heading: string;
  body: string;
};

export type LegalPageContent = {
  title: string;
  updatedOn: string;
  sections: LegalPageSection[];
};

export type LegalLocale = LandingLocale;
