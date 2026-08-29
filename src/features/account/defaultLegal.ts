import { PRODUCT } from '@/lib/constants';

import type { LegalKind, LegalLocale, LegalPageContent } from './legalTypes';

const fr: Record<LegalKind, LegalPageContent> = {
  privacy: {
    title: 'Politique de confidentialité',
    updatedOn: PRODUCT.legalUpdatedOn,
    sections: [
      {
        id: 'who',
        heading: 'Qui nous sommes',
        body: 'MileTax est une application (mobile et web) qui aide les travailleurs autonomes à organiser leurs dossiers (véhicules, kilométrage, reçus, dépenses, revenus) pour les transmettre à leur comptable. Site : https://miletaxe.com. Elle n’est pas un logiciel d’impôt et ne remplace pas un professionnel. Contact : support@miletaxe.com.',
      },
      {
        id: 'data',
        heading: 'Données collectées',
        body: 'Nous collectons le courriel du compte ; le profil (nom, pays, province ou État, métier, unités, langue) ; un numéro de téléphone si vous le fournissez (notamment pour les comptes employés) ; les véhicules et, si vous les saisissez, la plaque, le NIV et vos notes ; les relevés d’odomètre ; les photos de compteur et de reçus ; les montants, taxes, commerçants, catégories, notes et le mode de paiement que vous indiquez sur un reçu ; les revenus ; le nom et le courriel du comptable que vous inscrivez ; les dossiers préparatoires et fichiers que vous générez ; les journaux de correction que vous confirmez ; et, si vous utilisez l’aide, le contenu des conversations de soutien. Le mot de passe est traité par le prestataire d’authentification : nous ne le stockons pas en clair. Nous ne collectons pas votre position GPS : le kilométrage vient des relevés d’odomètre que vous confirmez. Nous ne collectons pas de numéro de carte bancaire : le mode de paiement d’un reçu est une étiquette (comptant, carte, etc.). Nous ne vendons pas vos données.',
      },
      {
        id: 'photos',
        heading: 'Photos et lecture automatique',
        body: 'Les photos de reçus et d’odomètre sont stockées dans un espace privé lié à votre compte. Une lecture automatique (sur l’appareil ou, si configuré, sur un service d’OCR) propose des champs. Si un service d’OCR est activé, la photo est transmise à ce prestataire uniquement pour suggérer des champs ; le résultat est ensuite enregistré dans votre compte, à confirmer. Ce sont des suggestions : rien n’est enregistré comme dépense ou relevé tant que vous n’avez pas confirmé. Ne photographiez pas de pièces d’identité ni d’autres documents sans lien avec votre activité professionnelle.',
      },
      {
        id: 'cookies',
        heading: 'Témoins et mesure d’audience',
        body: 'Le site miletaxe.com peut utiliser des témoins (cookies) et des outils de mesure d’audience pour comprendre la fréquentation et améliorer le site public. Vous pouvez gérer vos préférences dans les paramètres de votre navigateur. L’application connectée utilise des témoins ou jetons de session nécessaires pour vous authentifier et maintenir la connexion. Ces outils de mesure, s’ils sont présents, s’appliquent au site web public, pas au contenu de vos dossiers dans l’application.',
      },
      {
        id: 'use',
        heading: 'Utilisation et conservation',
        body: 'Les données servent à vous connecter, à classer vos dossiers, à produire le paquet pour votre comptable, à vous offrir le soutien et à faire fonctionner le service (sécurité, prévention des abus). Elles sont conservées tant que le compte existe. Vous pouvez exporter une copie JSON et supprimer le compte dans l’application, ce qui efface les dossiers, les photos associées et le compte. Après suppression, des copies techniques (sauvegardes) peuvent subsister un court délai d’exploitation, puis expirer. La récupération des dossiers n’est plus possible une fois la suppression effectuée.',
      },
      {
        id: 'share',
        heading: 'Partage',
        body: 'Vos dossiers restent les vôtres. Le nom et le courriel du comptable que vous inscrivez ne déclenchent aucun envoi automatique. Si vous partagez un PDF, c’est vous qui le transmettez. Les sous-traitants d’hébergement et d’authentification (Supabase) traitent les données pour fournir le service, avec un accès limité au compte authentifié (contrôle d’accès par compte). Resend nous sert uniquement à envoyer les courriels d’embauche de nos agents (lien d’accès, mot de passe temporaire) ; il ne reçoit aucune donnée de nos clients et n’est pas utilisé pour du marketing. Le personnel MileTax n’accède à un dossier que si c’est nécessaire pour le soutien que vous avez demandé, pour la sécurité du service ou pour respecter la loi.',
      },
      {
        id: 'transfers',
        heading: 'Hébergement et transferts',
        body: 'L’infrastructure (hébergement, authentification, stockage des fichiers) et certains prestataires (courriel d’équipe, OCR si activé) peuvent se trouver hors du Québec ou du Canada. Ces communications se font uniquement pour fournir le service. Pour des précisions : support@miletaxe.com.',
      },
      {
        id: 'security',
        heading: 'Sécurité',
        body: 'Nous utilisons une connexion chiffrée (HTTPS), une authentification par compte et une isolation des dossiers par utilisateur. Les photos sont dans des espaces de stockage privés liés à votre compte. Aucune mesure n’est infaillible : protégez votre mot de passe et le courriel de votre compte.',
      },
      {
        id: 'rights',
        heading: 'Vos droits',
        body: 'Selon la LPRPDE et, au Québec, la Loi 25, vous pouvez consulter, corriger et obtenir une copie de vos renseignements, retirer votre consentement lorsque la loi le permet, et demander la suppression du compte dans l’application. Pour une demande écrite : support@miletaxe.com. Vous pouvez aussi porter plainte auprès de la Commission d’accès à l’information du Québec ou, au fédéral, du Commissariat à la protection de la vie privée du Canada.',
      },
      {
        id: 'children',
        heading: 'Enfants',
        body: 'MileTax s’adresse aux travailleurs autonomes. Le service n’est pas destiné aux personnes de moins de 18 ans ; en créant un compte, vous confirmez avoir atteint l’âge de la majorité légale dans votre province ou pays de résidence.',
      },
      {
        id: 'changes',
        heading: 'Modifications',
        body: 'Nous pouvons mettre à jour cette politique. La date en haut de la page indique la version en vigueur. La version à jour est toujours publiée sur https://miletaxe.com/legal/privacy.',
      },
      {
        id: 'contact',
        heading: 'Contact',
        body: 'Pour toute question sur cette politique ou pour exercer vos droits, écrivez à support@miletaxe.com (responsable de la protection des renseignements personnels). MileTax — https://miletaxe.com.',
      },
    ],
  },
  terms: {
    title: 'Conditions d’utilisation',
    updatedOn: PRODUCT.legalUpdatedOn,
    sections: [
      {
        id: 'acceptance',
        heading: 'Acceptation',
        body: 'En créant un compte ou en utilisant MileTax (application mobile ou site https://miletaxe.com), vous acceptez ces conditions. Si vous n’êtes pas d’accord, n’utilisez pas le service.',
      },
      {
        id: 'object',
        heading: 'Objet du service',
        body: 'MileTax organise vos dossiers professionnels ; elle ne remplace pas le comptable. Elle prépare un paquet pour votre comptable, mais ne produit pas de déclaration fiscale, ne calcule pas d’impôt et ne fournit pas de conseil juridique ou fiscal.',
      },
      {
        id: 'accuracy',
        heading: 'Exactitude',
        body: 'Vous êtes responsable des montants, dates, catégories et relevés que vous confirmez. Les totaux affichés sont des sommes de ce que vous avez saisi, pas un montant d’impôt. Les suggestions OCR doivent être vérifiées avant enregistrement. Conservez vos originaux (reçus, carnets, relevés).',
      },
      {
        id: 'account',
        heading: 'Compte',
        body: 'Vous devez fournir un courriel valide, protéger votre mot de passe et avoir au moins 18 ans. Vous êtes responsable de l’activité effectuée avec votre compte. Vous pouvez exporter vos données et supprimer le compte à tout moment. Après suppression, la récupération des dossiers n’est plus possible.',
      },
      {
        id: 'availability',
        heading: 'Disponibilité',
        body: 'Le service est fourni « tel quel ». Nous pouvons modifier, interrompre ou retirer des fonctions, notamment pour maintenance ou sécurité. Nous ne garantissons pas une disponibilité continue ni l’absence d’erreur.',
      },
      {
        id: 'use',
        heading: 'Usage acceptable',
        body: 'N’utilisez pas l’app à des fins illégales, pour usurper une identité, ou pour téléverser des contenus dont vous n’avez pas le droit. Les photos doivent concerner vos activités professionnelles. Nous pouvons suspendre ou fermer un compte en cas d’abus, de risque pour la sécurité ou d’exigence légale.',
      },
      {
        id: 'ip',
        heading: 'Propriété intellectuelle',
        body: 'Le contenu, la marque et le fonctionnement de MileTax nous appartiennent. Les documents et données que vous téléversez demeurent votre propriété ; vous nous accordez uniquement le droit de les traiter pour vous fournir le service.',
      },
      {
        id: 'third',
        heading: 'Services de tiers',
        body: 'L’app peut s’appuyer sur des boutiques d’applications, un hébergeur (Supabase), un envoi de courriel d’équipe (Resend) et, si configuré, un service d’OCR. Ces services ont leurs propres conditions. MileTax n’envoie pas automatiquement vos dossiers à votre comptable.',
      },
      {
        id: 'liability',
        heading: 'Limitation de responsabilité',
        body: 'Dans la mesure permise par la loi, MileTax n’est pas responsable des pertes liées à une déclaration fiscale, à une amende, à une mauvaise catégorisation ou à une lecture OCR incorrecte que vous n’auriez pas corrigée. Conservez vos originaux. Rien dans ces conditions ne limite les droits impératifs du consommateur.',
      },
      {
        id: 'changes',
        heading: 'Modifications des conditions',
        body: 'Nous pouvons mettre à jour ces conditions. La date en haut de la page indique la version en vigueur, publiée sur https://miletaxe.com/legal/terms. Si vous continuez à utiliser le service après une mise à jour, vous acceptez la nouvelle version.',
      },
      {
        id: 'law',
        heading: 'Droit applicable',
        body: 'Ces conditions sont régies par les lois du Québec et du Canada. Les tribunaux du Québec sont compétents, sous réserve des droits impératifs du consommateur.',
      },
      {
        id: 'contact',
        heading: 'Contact',
        body: 'Questions : support@miletaxe.com. MileTax — https://miletaxe.com.',
      },
    ],
  },
};

const en: Record<LegalKind, LegalPageContent> = {
  privacy: {
    title: 'Privacy policy',
    updatedOn: PRODUCT.legalUpdatedOn,
    sections: [
      {
        id: 'who',
        heading: 'Who we are',
        body: 'MileTax is a mobile and web app that helps self-employed workers organize records (vehicles, mileage, receipts, expenses, income) for their accountant. Website: https://miletaxe.com. It is not tax software and does not replace a professional. Contact: support@miletaxe.com.',
      },
      {
        id: 'data',
        heading: 'Data we collect',
        body: 'We collect the account email; profile (name, country, province or state, occupation, units, language); a phone number if you provide one (including for staff accounts); vehicles and, if you enter them, plate, VIN and notes; odometer readings; meter and receipt photos; amounts, tax, merchants, categories, notes and the payment method you record on a receipt; income; the accountant name and email you enter; preparatory packages and files you generate; correction logs you confirm; and, if you use help, support conversation content. Passwords are handled by the authentication provider; we do not store them in plain text. We do not collect GPS location: mileage comes from odometer readings you confirm. We do not collect card numbers: a receipt payment method is a label (cash, card, etc.). We do not sell your data.',
      },
      {
        id: 'photos',
        heading: 'Photos and automated reading',
        body: 'Receipt and odometer photos are stored in a private space tied to your account. Automated reading (on-device or, if configured, an OCR service) suggests fields. If cloud OCR is enabled, the photo is sent to that processor only to suggest fields; the result is then stored on your account for you to confirm. These are suggestions: nothing is saved as an expense or reading until you confirm. Do not photograph identity documents or other files unrelated to your business activity.',
      },
      {
        id: 'cookies',
        heading: 'Cookies and audience measurement',
        body: 'The miletaxe.com website may use cookies and audience-measurement tools to understand traffic and improve the public site. You can manage preferences in your browser settings. The signed-in app uses session cookies or tokens needed to authenticate you and keep you signed in. Audience tools, if present, apply to the public website, not to the contents of your records in the app.',
      },
      {
        id: 'use',
        heading: 'Use and retention',
        body: 'Data is used to sign you in, organize your records, build the accountant package, provide support, and operate the service (security, abuse prevention). It is kept while the account exists. You can export a JSON copy and delete the account in the app, which removes records, associated photos and the account. After deletion, technical copies (backups) may remain for a short operational period, then expire. Records cannot be recovered once deletion is complete.',
      },
      {
        id: 'share',
        heading: 'Sharing',
        body: 'Your records remain yours. The accountant name and email you enter do not trigger automatic sending. If you share a PDF, you send it. Hosting and authentication processors (Supabase) handle data to operate the service, limited to the authenticated account. Resend is used only to send hire emails to our agents (access link, temporary password); it does not receive client records and is not used for marketing. MileTax staff access a file only when needed for support you requested, for service security, or to comply with the law.',
      },
      {
        id: 'transfers',
        heading: 'Hosting and transfers',
        body: 'Infrastructure (hosting, authentication, file storage) and some processors (staff email, OCR if enabled) may be located outside Quebec or Canada. These transfers are made only to provide the service. For details: support@miletaxe.com.',
      },
      {
        id: 'security',
        heading: 'Security',
        body: 'We use encrypted connections (HTTPS), account authentication and per-user isolation of records. Photos sit in private storage tied to your account. No measure is foolproof: protect your password and account email.',
      },
      {
        id: 'rights',
        heading: 'Your rights',
        body: 'Under PIPEDA and, in Quebec, Law 25, you may access, correct and obtain a copy of your information, withdraw consent where the law allows, and delete the account in the app. For a written request: support@miletaxe.com. You may also complain to the Commission d’accès à l’information du Québec or, federally, the Office of the Privacy Commissioner of Canada.',
      },
      {
        id: 'children',
        heading: 'Children',
        body: 'MileTax is for self-employed workers. The service is not intended for anyone under 18; by creating an account, you confirm you have reached the age of majority in your province or country of residence.',
      },
      {
        id: 'changes',
        heading: 'Changes',
        body: 'We may update this policy. The date at the top of the page is the version in force. The current version is always published at https://miletaxe.com/legal/privacy.',
      },
      {
        id: 'contact',
        heading: 'Contact',
        body: 'For questions about this policy or to exercise your rights, write to support@miletaxe.com (person responsible for the protection of personal information). MileTax — https://miletaxe.com.',
      },
    ],
  },
  terms: {
    title: 'Terms of use',
    updatedOn: PRODUCT.legalUpdatedOn,
    sections: [
      {
        id: 'acceptance',
        heading: 'Acceptance',
        body: 'By creating an account or using MileTax (mobile app or https://miletaxe.com), you accept these terms. If you do not agree, do not use the service.',
      },
      {
        id: 'object',
        heading: 'Service',
        body: 'MileTax organizes your business records; it does not replace an accountant. It prepares a package for your accountant, but does not file tax returns, compute tax, or provide legal or tax advice.',
      },
      {
        id: 'accuracy',
        heading: 'Accuracy',
        body: 'You are responsible for the amounts, dates, categories and readings you confirm. Displayed totals are sums of what you entered, not a tax figure. OCR suggestions must be reviewed before saving. Keep your originals (receipts, logs, statements).',
      },
      {
        id: 'account',
        heading: 'Account',
        body: 'You must provide a valid email, protect your password and be at least 18. You are responsible for activity on your account. You may export your data and delete the account at any time. After deletion, records cannot be recovered.',
      },
      {
        id: 'availability',
        heading: 'Availability',
        body: 'The service is provided “as is”. We may change, interrupt or remove features, including for maintenance or security. We do not guarantee uninterrupted availability or the absence of errors.',
      },
      {
        id: 'use',
        heading: 'Acceptable use',
        body: 'Do not use the app for illegal purposes, identity fraud, or uploads you have no right to store. Photos must relate to your business activity. We may suspend or close an account in case of abuse, a security risk, or a legal requirement.',
      },
      {
        id: 'ip',
        heading: 'Intellectual property',
        body: 'MileTax content, brand and operation belong to us. Documents and data you upload remain yours; you grant us only the right to process them to provide the service.',
      },
      {
        id: 'third',
        heading: 'Third-party services',
        body: 'The app may rely on app stores, a host (Supabase), staff email (Resend) and, if configured, an OCR service. Those services have their own terms. MileTax does not automatically send your records to your accountant.',
      },
      {
        id: 'liability',
        heading: 'Limitation of liability',
        body: 'To the extent permitted by law, MileTax is not liable for losses related to a tax filing, a penalty, a miscategorized item, or an OCR reading you did not correct. Keep your originals. Nothing in these terms limits mandatory consumer-protection rights.',
      },
      {
        id: 'changes',
        heading: 'Changes to the terms',
        body: 'We may update these terms. The date at the top of the page is the version in force, published at https://miletaxe.com/legal/terms. If you keep using the service after an update, you accept the new version.',
      },
      {
        id: 'law',
        heading: 'Governing law',
        body: 'These terms are governed by the laws of Quebec and Canada. Quebec courts have jurisdiction, subject to mandatory consumer-protection rights.',
      },
      {
        id: 'contact',
        heading: 'Contact',
        body: 'Questions: support@miletaxe.com. MileTax — https://miletaxe.com.',
      },
    ],
  },
};

export function defaultLegalContent(kind: LegalKind, locale: LegalLocale): LegalPageContent {
  return structuredClone(locale === 'en' ? en[kind] : fr[kind]);
}
