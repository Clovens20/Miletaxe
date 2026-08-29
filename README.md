# MileTax

App mobile (Expo / React Native) pour les travailleurs autonomes : chauffeurs, livreurs, taxi, pigistes.

On garde les véhicules, le kilométrage, les reçus et les revenus, puis on prépare un dossier pour le comptable. Ce n’est pas un logiciel d’impôt.

## Stack

Expo SDK 57, TypeScript, Expo Router, TanStack Query, React Hook Form, Zod, Supabase, i18n FR/EN.

## Lancer

```bash
cp .env.example .env
npm install
npm start
```

Il faut un projet Supabase (URL + clé `anon` dans `.env`) et les fichiers de `supabase/migrations/`.

## Dossier

```
app/                  écrans
src/features/         métier
src/components/ui/    UI
src/lib/i18n/         textes
supabase/             schéma, catalogues, fonctions
docs/ARCHITECTURE.md
```

Catégories, provinces et États vivent en base, pas dans les écrans.

Les totaux à l’écran sont la somme de ce que la personne a entré. Si on affiche un taux officiel un jour, c’est une référence pour le comptable, pas un calcul d’impôt.

## Publication

Compte EAS, migrations à jour (dont `00009`–`00014`), fonctions `delete-account` et `admin-delete-user` avec `SUPABASE_SERVICE_ROLE_KEY` **seulement** côté serveur.

Fiche Play Console : textes, Data safety et captures dans `store/play/`.

```bash
npx eas-cli login
npx eas-cli init
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://VOTRE-PROJET.supabase.co
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value VOTRE_CLE_ANON
npx eas-cli build --profile production --platform android
```

Le profil `production` produit un AAB. Le premier envoi Play doit aller en **test interne**, pas en production.

## Site web (Vercel + miletaxe.com)

L’export web est un site statique (`dist/`). Sur Vercel :

1. Import du repo GitHub `Clovens20/Miletaxe`
2. Framework : Other — `vercel.json` fixe déjà build et dossier `dist`
3. Variables **avant** le premier déploiement (elles sont injectées au build) :
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_UI_PREVIEW` = `false`
4. Domaine : ajouter `miletaxe.com` et `www` dans Vercel → Domains

Ne jamais mettre `SUPABASE_SERVICE_ROLE_KEY` ni `RESEND_API_KEY` sur Vercel : le navigateur ne doit pas les voir.

```bash
npm run ci
npm run build:web
```

## Admin web

Sur le navigateur : `/admin` (`npm run web`). iOS/Android n’ouvrent pas cet écran.

Le rôle `admin` vit dans `auth.users.raw_app_meta_data` (JWT). Un compte ne peut pas se le donner depuis l’app. Après les migrations `00009_admin_staff.sql` et `00010_admin_catalog_crud.sql`, et `npx supabase functions deploy admin-delete-user`, promouvoir un compte dans le SQL Editor :

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'TON_COURRIEL';
```

Puis se reconnecter sur `/admin` pour rafraîchir le jeton.

Support : migration `00011_support_desk.sql` et `npx supabase functions deploy admin-hire-agent`. L’admin embauche des agents (Équipe). Les utilisateurs écrivent depuis Plus → Aide. Les agents se connectent sur `/employes`. Un cas trop complexe se transfère vers Administration → Technique. L’admin et l’agent changent leur mot de passe dans leur interface.
