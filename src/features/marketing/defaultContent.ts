import { PRODUCT } from '@/lib/constants';

import type { LandingContent, LandingLocale } from './types';

const fr: LandingContent = {
  metaTitle: 'MileTax — Vos dossiers, prêts pour votre comptable',
  metaDescription:
    'Organisez km, reçus, dépenses et revenus. Remettez un dossier clair à votre comptable. Pas un logiciel d’impôt. Support : support@miletaxe.com',
  login: 'Connexion',
  register: 'Créer un compte',
  downloads: {
    playLabel: 'Télécharger sur Google Play',
    playUrl: PRODUCT.playStoreUrl,
    iosLabel: 'Télécharger sur l’App Store',
    iosUrl: '',
  },
  hero: {
    eyebrow: 'Pour travailleurs autonomes au Canada',
    title: 'Vos dossiers, prêts pour votre comptable.',
    body: 'Photoz l’odomètre et les reçus. Classez kilomètres, dépenses et revenus. Exportez un paquet clair — sans calculer l’impôt, sans remplacer votre comptable.',
    cta: 'Commencer gratuitement',
    secondary: 'J’ai déjà un compte',
    note: 'MileTax organise vos dossiers. Ce n’est pas un avis fiscal.',
  },
  footer: {
    rights: '© {{year}} MileTax. Tous droits réservés.',
    privacy: 'Politique de confidentialité',
    terms: 'Conditions d’utilisation',
  },
  sections: [
    {
      id: 'problem',
      kind: 'cards',
      variant: 'grid',
      title: 'Le comptable ne peut pas classer une boîte à chaussures.',
      body: 'Les km dans un carnet, les reçus au fond du sac, les revenus dans trois applis. En fin d’année, vous perdez du temps — et souvent des montants que vous auriez pu justifier.',
      visible: true,
      cards: [
        { id: 'pain-1', title: 'Kilomètres flous', body: 'Sans relevés d’odomètre datés, le dossier de déplacement ne tient pas. Votre comptable ne peut pas inventer les chiffres.' },
        { id: 'pain-2', title: 'Reçus illisibles', body: 'Une photo trop tard, un montant oublié, une catégorie au hasard. Le dossier devient incomplet.' },
        { id: 'pain-3', title: 'Rien de prêt à remettre', body: 'Vous avez travaillé toute l’année. Il manque encore le paquet unique, daté, que le comptable peut ouvrir.' },
      ],
    },
    {
      id: 'features',
      kind: 'cards',
      variant: 'grid',
      title: 'Tout ce qu’il faut pour un dossier propre.',
      body: '',
      visible: true,
      navId: 'features',
      navLabel: 'Fonctionnalités',
      showIcons: true,
      cards: [
        { id: 'feat-1', title: 'Odomètre photographié', body: 'Cadrez le compteur. Confirmez le relevé. Les segments de distance se construisent à partir de vos chiffres.' },
        { id: 'feat-2', title: 'Reçus à confirmer', body: 'La lecture automatique propose des champs. Rien n’est enregistré tant que vous n’avez pas validé.' },
        { id: 'feat-3', title: 'Dépenses et revenus', body: 'Classez selon les catalogues de votre province. Les totaux sont des sommes de ce que vous avez saisi — pas un impôt.' },
        { id: 'feat-4', title: 'Dossier pour le comptable', body: 'Un PDF préparatoire rassemble relevés, reçus et revenus. Vous le transmettez. Aucun envoi automatique.' },
        { id: 'feat-5', title: 'Vos données, votre compte', body: 'Chaque dossier est isolé. Vous pouvez exporter une copie et supprimer le compte quand vous voulez.' },
        { id: 'feat-6', title: 'Aide quand ça bloque', body: 'Un fil avec un agent, sans exposer le détail de vos montants à tout le monde.' },
      ],
    },
    { id: 'screens', kind: 'screens', title: 'L’app, telle qu’elle est.', visible: true },
    {
      id: 'how',
      kind: 'cards',
      variant: 'steps',
      title: 'Trois gestes, toute l’année.',
      body: '',
      visible: true,
      navId: 'how',
      navLabel: 'Comment ça marche',
      cards: [
        { id: 'step-1', title: 'Ouvrez le compte', body: 'Courriel, province, métier. L’app s’aligne sur les catalogues de votre territoire — pas sur un calcul d’impôt.' },
        { id: 'step-2', title: 'Capturez au fil des jours', body: 'Odomètre après une tournée. Reçu avant qu’il disparaisse. Revenu quand il arrive.' },
        { id: 'step-3', title: 'Remettez le paquet', body: 'Quand le comptable le demande, le dossier est déjà là. Vous gardez les originaux.' },
      ],
    },
    {
      id: 'trust',
      kind: 'cards',
      variant: 'trust',
      title: 'Clair sur ce que MileTax n’est pas.',
      body: '',
      visible: true,
      navId: 'trust',
      navLabel: 'Confiance',
      cards: [
        { id: 'trust-1', title: 'Pas un logiciel d’impôt', body: 'Aucun calcul de TPS/TVQ à payer, aucun formulaire prérempli, aucun conseil fiscal. Votre comptable reste le professionnel.' },
        { id: 'trust-2', title: 'Confirmation avant enregistrement', body: 'OCR et suggestions restent des propositions. C’est vous qui validez le montant, la date et la catégorie.' },
        { id: 'trust-3', title: 'Pages légales publiques', body: 'Politique de confidentialité et conditions : https://miletaxe.com/legal/privacy et https://miletaxe.com/legal/terms' },
        { id: 'trust-4', title: 'Un seul courriel de support', body: 'support@miletaxe.com — pour une question, un droit d’accès, ou un problème de compte.' },
      ],
    },
    {
      id: 'cta',
      kind: 'cta',
      title: 'Arrêtez de reconstituer l’année en mars.',
      body: 'Tenez le dossier maintenant. Votre comptable recevra quelque chose qu’il peut lire.',
      playSoon: 'Disponible sur Google Play. La version iOS apparaîtra ici dès qu’elle sera en ligne.',
      visible: true,
    },
  ],
};

const en: LandingContent = {
  metaTitle: 'MileTax — Your records, ready for your accountant',
  metaDescription:
    'Organize mileage, receipts, expenses and income. Hand your accountant a clear package. Not tax software. Support: support@miletaxe.com',
  login: 'Sign in',
  register: 'Create account',
  downloads: {
    playLabel: 'Get it on Google Play',
    playUrl: PRODUCT.playStoreUrl,
    iosLabel: 'Download on the App Store',
    iosUrl: '',
  },
  hero: {
    eyebrow: 'For self-employed workers in Canada',
    title: 'Your records, ready for your accountant.',
    body: 'Photograph the odometer and receipts. File mileage, expenses and income. Export a clear package — without computing tax, without replacing your accountant.',
    cta: 'Start for free',
    secondary: 'I already have an account',
    note: 'MileTax organizes your records. It is not tax advice.',
  },
  footer: {
    rights: '© {{year}} MileTax. All rights reserved.',
    privacy: 'Privacy policy',
    terms: 'Terms of use',
  },
  sections: [
    {
      id: 'problem',
      kind: 'cards',
      variant: 'grid',
      title: 'Your accountant cannot file a shoebox.',
      body: 'Mileage in a notebook, receipts at the bottom of a bag, income in three apps. At year-end you lose time — and often amounts you could have supported.',
      visible: true,
      cards: [
        { id: 'pain-1', title: 'Fuzzy kilometres', body: 'Without dated odometer readings, the travel file does not hold. Your accountant cannot invent the numbers.' },
        { id: 'pain-2', title: 'Unreadable receipts', body: 'A photo taken too late, a forgotten amount, a random category. The file becomes incomplete.' },
        { id: 'pain-3', title: 'Nothing ready to hand over', body: 'You worked all year. You still lack the single, dated package your accountant can open.' },
      ],
    },
    {
      id: 'features',
      kind: 'cards',
      variant: 'grid',
      title: 'Everything a clean file needs.',
      body: '',
      visible: true,
      navId: 'features',
      navLabel: 'Features',
      showIcons: true,
      cards: [
        { id: 'feat-1', title: 'Photographed odometer', body: 'Frame the meter. Confirm the reading. Distance segments are built from your numbers.' },
        { id: 'feat-2', title: 'Receipts you confirm', body: 'Automated reading suggests fields. Nothing is saved until you approve it.' },
        { id: 'feat-3', title: 'Expenses and income', body: 'File against your province’s catalogs. Totals are sums of what you entered — not a tax figure.' },
        { id: 'feat-4', title: 'Accountant package', body: 'A preparatory PDF gathers readings, receipts and income. You send it. Nothing is emailed automatically.' },
        { id: 'feat-5', title: 'Your data, your account', body: 'Each file is isolated. Export a copy or delete the account whenever you want.' },
        { id: 'feat-6', title: 'Help when you are stuck', body: 'A thread with an agent, without exposing every amount to the whole team.' },
      ],
    },
    { id: 'screens', kind: 'screens', title: 'The app, as it is.', visible: true },
    {
      id: 'how',
      kind: 'cards',
      variant: 'steps',
      title: 'Three moves, all year.',
      body: '',
      visible: true,
      navId: 'how',
      navLabel: 'How it works',
      cards: [
        { id: 'step-1', title: 'Open the account', body: 'Email, province, occupation. The app follows your jurisdiction’s catalogs — not a tax calculation.' },
        { id: 'step-2', title: 'Capture as you go', body: 'Odometer after a run. Receipt before it vanishes. Income when it lands.' },
        { id: 'step-3', title: 'Hand over the package', body: 'When the accountant asks, the file is already there. Keep your originals.' },
      ],
    },
    {
      id: 'trust',
      kind: 'cards',
      variant: 'trust',
      title: 'Clear about what MileTax is not.',
      body: '',
      visible: true,
      navId: 'trust',
      navLabel: 'Trust',
      cards: [
        { id: 'trust-1', title: 'Not tax software', body: 'No GST/HST amount due, no pre-filled return, no tax advice. Your accountant remains the professional.' },
        { id: 'trust-2', title: 'Confirm before save', body: 'OCR and suggestions stay proposals. You confirm the amount, date and category.' },
        { id: 'trust-3', title: 'Public legal pages', body: 'Privacy policy and terms: https://miletaxe.com/legal/privacy and https://miletaxe.com/legal/terms' },
        { id: 'trust-4', title: 'One support address', body: 'support@miletaxe.com — for a question, an access request, or an account issue.' },
      ],
    },
    {
      id: 'cta',
      kind: 'cta',
      title: 'Stop rebuilding the year in March.',
      body: 'Keep the file now. Your accountant will receive something they can read.',
      playSoon: 'Available on Google Play. The iOS app will appear here once it is live.',
      visible: true,
    },
  ],
};

export function defaultLandingContent(locale: LandingLocale): LandingContent {
  return locale === 'en' ? structuredClone(en) : structuredClone(fr);
}
