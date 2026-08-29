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

Compte EAS, migrations à jour (dont `00009_admin_staff.sql`), fonctions `delete-account` et `admin-delete-user` avec `SUPABASE_SERVICE_ROLE_KEY` **seulement** côté serveur. Builds :

```bash
npx eas-cli build --profile internal --platform android
npx eas-cli build --profile production --platform android
```

## Admin web

Sur le navigateur : `/admin` (`npm run web`). iOS/Android n’ouvrent pas cet écran.

Le rôle `admin` vit dans `auth.users.raw_app_meta_data` (JWT). Un compte ne peut pas se le donner depuis l’app. Après la migration `00009_admin_staff.sql` et `npx supabase functions deploy admin-delete-user`, promouvoir un compte dans le SQL Editor :

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'TON_COURRIEL';
```

Puis se reconnecter sur `/admin` pour rafraîchir le jeton.
