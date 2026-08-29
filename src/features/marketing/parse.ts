import { defaultLandingContent } from './defaultContent';
import { newLandingId } from './ids';
import type { LandingCard, LandingContent, LandingDownloads, LandingLocale, LandingSection } from './types';

function parseDownloads(value: unknown, fallback: LandingDownloads): LandingDownloads {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    playLabel: text(row.playLabel, fallback.playLabel),
    playUrl: text(row.playUrl, fallback.playUrl),
    iosLabel: text(row.iosLabel, fallback.iosLabel),
    iosUrl: text(row.iosUrl, fallback.iosUrl),
  };
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function flag(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function cards(value: unknown, fallback: LandingCard[]): LandingCard[] {
  if (!Array.isArray(value)) return fallback;
  return value.map((item, index) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      id: text(row.id, `card-${index}`),
      title: text(row.title, ''),
      body: text(row.body, ''),
    };
  });
}

function section(value: unknown, fallback: LandingSection): LandingSection {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const kind = row.kind;
  if (kind === 'screens') {
    return {
      id: text(row.id, fallback.id),
      kind: 'screens',
      title: text(row.title, fallback.kind === 'screens' ? fallback.title : ''),
      visible: flag(row.visible, true),
    };
  }
  if (kind === 'cta') {
    const fb = fallback.kind === 'cta' ? fallback : { title: '', body: '', playSoon: '' };
    return {
      id: text(row.id, fallback.id),
      kind: 'cta',
      title: text(row.title, fb.title),
      body: text(row.body, fb.body),
      playSoon: text(row.playSoon, fb.playSoon),
      visible: flag(row.visible, true),
    };
  }
  const fb = fallback.kind === 'cards' ? fallback : null;
  const variant = row.variant === 'steps' || row.variant === 'trust' || row.variant === 'grid' ? row.variant : (fb?.variant ?? 'grid');
  return {
    id: text(row.id, fallback.id || newLandingId()),
    kind: 'cards',
    variant,
    title: text(row.title, fb?.title ?? ''),
    body: text(row.body, fb?.body ?? ''),
    visible: flag(row.visible, true),
    navId: typeof row.navId === 'string' ? row.navId : fb?.navId,
    navLabel: typeof row.navLabel === 'string' ? row.navLabel : fb?.navLabel,
    showIcons: flag(row.showIcons, fb?.showIcons ?? false),
    cards: cards(row.cards, fb?.cards ?? []),
  };
}

export function parseLandingContent(raw: unknown, locale: LandingLocale): LandingContent {
  const fallback = defaultLandingContent(locale);
  if (!raw || typeof raw !== 'object') return fallback;
  const row = raw as Record<string, unknown>;
  const hero = row.hero && typeof row.hero === 'object' ? (row.hero as Record<string, unknown>) : {};
  const footer = row.footer && typeof row.footer === 'object' ? (row.footer as Record<string, unknown>) : {};
  const rawSections = Array.isArray(row.sections) ? row.sections : null;
  return {
    metaTitle: text(row.metaTitle, fallback.metaTitle),
    metaDescription: text(row.metaDescription, fallback.metaDescription),
    login: text(row.login, fallback.login),
    register: text(row.register, fallback.register),
    downloads: parseDownloads(row.downloads, fallback.downloads),
    hero: {
      eyebrow: text(hero.eyebrow, fallback.hero.eyebrow),
      title: text(hero.title, fallback.hero.title),
      body: text(hero.body, fallback.hero.body),
      cta: text(hero.cta, fallback.hero.cta),
      secondary: text(hero.secondary, fallback.hero.secondary),
      note: text(hero.note, fallback.hero.note),
    },
    footer: {
      rights: text(footer.rights, fallback.footer.rights),
      privacy: text(footer.privacy, fallback.footer.privacy),
      terms: text(footer.terms, fallback.footer.terms),
    },
    sections: rawSections
      ? rawSections.map((item, index) => section(item, fallback.sections[index] ?? { id: newLandingId(), kind: 'cards', variant: 'grid', title: '', body: '', visible: true, cards: [] }))
      : fallback.sections,
  };
}
