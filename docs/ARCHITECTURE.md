# Architecture

MileTax prépare un dossier pour l’utilisateur et son comptable. Pas de déclaration, pas de « déduction calculée » dans l’app.

## Modules

| Dossier | Contenu |
| --- | --- |
| `src/features/auth` | session, profil, onboarding |
| `src/features/tax-config` | pays, régions, catégories, années |
| `src/features/vehicles` | véhicules |
| `src/features/mileage` | odomètre et distances |
| `src/features/expenses` | reçus et dépenses |
| `src/features/income` | revenus |
| `src/features/integrity` | trous dans le dossier |
| `src/features/reports` | paquet pour le comptable |
| `src/features/assistant` | rappels de dossier (à valider) |
| `src/features/admin` | back-office web (`/admin`), rôle JWT `app_metadata.role = admin` |

## Nav

Connexion → onboarding (pays, région, métier) → onglets Accueil, Km, Dépenses, Revenus, Plus.

## Auth

Courriel / mot de passe via Supabase. Un trigger crée le profil. L’onboarding est obligatoire. Session dans SecureStore (téléphone) ou AsyncStorage (web).

## Config fiscale

Nouveau pays ou nouvelle province = des lignes en SQL, pas une mise à jour d’app. Le client charge ça avec TanStack Query.

Les km entre deux relevés valides sont recalculés en base (`rebuild_distance_segments`). On ne multiplie pas de taux dans l’UI.

## OCR

Photo d’abord, lecture ensuite (`extract-receipt` / odomètre). Si ça ne lit rien, la personne tape. Rien n’est figé tant qu’elle n’a pas confirmé.

## RLS

Chaque table perso est filtrée par `auth.uid()`. Photos dans `receipts`, `odometer-photos`, `report-packages`, préfixe `{user_id}/`.
