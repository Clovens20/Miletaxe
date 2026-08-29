export type LandingCard = {
  id: string;
  title: string;
  body: string;
};

export type LandingCardsSection = {
  id: string;
  kind: 'cards';
  variant: 'grid' | 'steps' | 'trust';
  title: string;
  body: string;
  visible: boolean;
  navId?: string;
  navLabel?: string;
  showIcons?: boolean;
  cards: LandingCard[];
};

export type LandingScreensSection = {
  id: string;
  kind: 'screens';
  title: string;
  visible: boolean;
};

export type LandingCtaSection = {
  id: string;
  kind: 'cta';
  title: string;
  body: string;
  playSoon: string;
  visible: boolean;
};

export type LandingSection = LandingCardsSection | LandingScreensSection | LandingCtaSection;

export type LandingDownloads = {
  playLabel: string;
  playUrl: string;
  iosLabel: string;
  iosUrl: string;
};

export type LandingContent = {
  metaTitle: string;
  metaDescription: string;
  login: string;
  register: string;
  downloads: LandingDownloads;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    secondary: string;
    note: string;
  };
  footer: {
    rights: string;
    privacy: string;
    terms: string;
  };
  sections: LandingSection[];
};

export type LandingLocale = 'fr' | 'en';
