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
      id: 'about',
      kind: 'cards',
      variant: 'prose',
      title: 'À propos de nous',
      body:
        'Nous sommes des livreurs et des chauffeurs Uber. Nous avons créé l’app qu’il nous manquait.\n\nChaque année, au moment de faire les impôts, c’était la même histoire. Les kilomètres à reconstituer, les reçus d’essence et de réparations introuvables, les revenus éparpillés. Un comptable ne peut pas inventer des chiffres, et nous perdions du temps, du sommeil, et parfois des montants que nous aurions pu justifier.\n\nAu fil des ans, nous avons compris que le problème n’était pas le manque de rigueur. Il manquait un outil simple, pensé pour ceux qui travaillent au volant. Alors nous l’avons construit.\n\nMileTax est née de notre propre expérience, pour les livreurs et les chauffeurs Uber, Lyft et taxi du Canada et des États-Unis.',
      visible: true,
      navId: 'about',
      navLabel: 'À propos de nous',
      cards: [
        {
          id: 'about-problem',
          title: 'Le problème, nous le connaissons par cœur',
          body:
            'Quand on gagne sa vie sur la route, l’année ressemble souvent à ça :\n\n• Des kilomètres notés sur un bout de papier, ou pas notés du tout\n• Des reçus d’essence, de service mécanique, de lavage, de stationnement et de pièces, éparpillés entre la boîte à gants, le sac et les poches\n• Des revenus répartis entre plusieurs plateformes\n• Et au moment de la déclaration, la course pour tout reconstituer de mémoire\n\nSans relevés datés et sans reçus lisibles, votre comptable ne peut pas défendre vos chiffres. Il travaille avec ce que vous lui donnez, et il ne peut pas deviner le reste.',
        },
        {
          id: 'about-solution',
          title: 'Notre solution : un dossier qui se construit au fil des jours',
          body:
            'Photographiez votre odomètre — Cadrez le compteur, confirmez le relevé. Vos distances se construisent à partir de vos propres chiffres, datés, comme un vrai registre.\n\nPhotographiez tous vos reçus — Essence, service mécanique, changement d’huile, pneus, réparations, lavage, stationnement : prenez-les en photo avant qu’ils disparaissent. La lecture automatique propose les champs (montant, date, catégorie), et rien n’est enregistré tant que vous n’avez pas validé.\n\nSuivez vos revenus et vos dépenses — Tout au même endroit, sans jongler entre plusieurs applis ni plusieurs tableurs.\n\nRemettez un dossier prêt pour votre comptable — Un PDF préparatoire regroupe vos relevés, vos reçus et vos revenus. Vous le transmettez quand vous le décidez. Aucun envoi automatique, et vous gardez toujours vos originaux.',
        },
        {
          id: 'about-who',
          title: 'Pour qui est MileTax ?',
          body:
            '• Chauffeurs Uber\n• Chauffeurs Lyft\n• Chauffeurs de taxi, propriétaires ou locataires de leur véhicule\n• Livreurs de repas, de colis et d’épicerie\n\nSi vous conduisez pour gagner votre vie et que votre comptable vous réclame vos papiers à chaque déclaration, MileTax est faite pour vous.',
        },
        {
          id: 'about-steps',
          title: 'Trois gestes, toute l’année',
          body:
            '1. Créez votre compte : courriel, région, métier.\n2. Capturez au fil des jours : l’odomètre après une tournée, le reçu avant qu’il disparaisse, le revenu quand il arrive.\n3. Remettez le paquet : quand votre comptable le demande, votre dossier est déjà là.',
        },
        {
          id: 'about-not',
          title: 'Ce que nous ne faisons pas, et pourquoi c’est volontaire',
          body:
            'MileTax n’est pas un logiciel d’impôt. Pas de déclaration fiscale, pas de calcul d’impôt ni de taxes, pas de formulaires préremplis, pas de conseil fiscal. Les totaux que vous voyez sont la somme de ce que vous avez saisi, rien de plus.\n\nLes règles changent d’un pays à l’autre, d’une province ou d’un État à l’autre, et d’une situation à l’autre. Votre comptable est le seul à pouvoir vous conseiller correctement. Notre rôle est de lui faciliter la tâche, pas de le remplacer.',
        },
        {
          id: 'about-control',
          title: 'Vous gardez le contrôle',
          body:
            '• Vous validez tout : montant, date, catégorie. Les suggestions restent des propositions.\n• Vos données vous appartiennent : chaque dossier est isolé, vous pouvez exporter une copie et supprimer votre compte quand vous le voulez.\n• Aucun envoi automatique à qui que ce soit.\n• Une vraie aide humaine : si quelque chose bloque, un agent de support vous répond.',
        },
        {
          id: 'about-mission',
          title: 'Notre mission',
          body:
            'Redonner du temps et de la tranquillité d’esprit à ceux qui travaillent sur la route. Tenir ses dossiers à jour ne devrait pas être un deuxième emploi.\n\nsupport@miletaxe.com · miletaxe.com',
        },
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
      id: 'about',
      kind: 'cards',
      variant: 'prose',
      title: 'About us',
      body:
        'We are delivery drivers and Uber drivers. We built the app we were missing.\n\nEvery year at tax time, it was the same story. Mileage to rebuild from memory, gas and repair receipts nowhere to be found, income scattered across apps. An accountant cannot invent numbers, and we were losing time, sleep, and sometimes amounts we could have supported.\n\nOver the years we realized the problem was not a lack of discipline. What was missing was a simple tool built for people who work behind the wheel. So we built it.\n\nMileTax was born from our own experience, for delivery drivers and Uber, Lyft and taxi drivers in Canada and the United States.',
      visible: true,
      navId: 'about',
      navLabel: 'About us',
      cards: [
        {
          id: 'about-problem',
          title: 'We know the problem by heart',
          body:
            'When you earn your living on the road, the year often looks like this:\n\n• Mileage scribbled on scrap paper — or not written down at all\n• Gas, mechanic, wash, parking and parts receipts scattered between the glovebox, a bag and your pockets\n• Income split across several platforms\n• And at filing time, a scramble to rebuild everything from memory\n\nWithout dated readings and readable receipts, your accountant cannot defend your numbers. They work with what you give them, and they cannot guess the rest.',
        },
        {
          id: 'about-solution',
          title: 'Our solution: a file that builds itself day by day',
          body:
            'Photograph your odometer — Frame the meter, confirm the reading. Your distances are built from your own dated figures, like a real logbook.\n\nPhotograph every receipt — Gas, mechanic work, oil changes, tires, repairs, washes, parking: take the photo before it disappears. Automated reading suggests the fields (amount, date, category), and nothing is saved until you confirm.\n\nTrack income and expenses — Everything in one place, without juggling apps or spreadsheets.\n\nHand over a package ready for your accountant — A preparatory PDF gathers your readings, receipts and income. You send it when you decide. No automatic email, and you always keep your originals.',
        },
        {
          id: 'about-who',
          title: 'Who is MileTax for?',
          body:
            '• Uber drivers\n• Lyft drivers\n• Taxi drivers, whether they own or rent their vehicle\n• Meal, parcel and grocery delivery drivers\n\nIf you drive for a living and your accountant asks for your paperwork every filing season, MileTax is for you.',
        },
        {
          id: 'about-steps',
          title: 'Three moves, all year',
          body:
            '1. Create your account: email, region, occupation.\n2. Capture as you go: the odometer after a run, the receipt before it vanishes, income when it lands.\n3. Hand over the package: when your accountant asks, your file is already there.',
        },
        {
          id: 'about-not',
          title: 'What we do not do — and why that is intentional',
          body:
            'MileTax is not tax software. No tax return, no tax or levy calculation, no pre-filled forms, no tax advice. The totals you see are the sum of what you entered, nothing more.\n\nRules change from country to country, province or state to province or state, and situation to situation. Your accountant is the only one who can advise you properly. Our job is to make their work easier, not to replace them.',
        },
        {
          id: 'about-control',
          title: 'You stay in control',
          body:
            '• You confirm everything: amount, date, category. Suggestions stay proposals.\n• Your data is yours: each file is isolated; you can export a copy and delete your account whenever you want.\n• Nothing is sent automatically to anyone.\n• Real human help: if something blocks, a support agent answers.',
        },
        {
          id: 'about-mission',
          title: 'Our mission',
          body:
            'Give time and peace of mind back to people who work on the road. Keeping records up to date should not be a second job.\n\nsupport@miletaxe.com · miletaxe.com',
        },
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
