-- Après transfert, l’employé ne voit plus le fil. L’admin continue avec l’utilisateur.
-- Répertoire : fiches supplémentaires (idempotent via code).

drop policy if exists "support threads own select" on public.support_threads;
create policy "support threads own select"
  on public.support_threads for select to authenticated using (
    user_id = auth.uid()
    or public.is_staff()
    or (public.is_agent() and status <> 'escalated' and escalated_by is null)
  );

drop policy if exists "support threads support update" on public.support_threads;
create policy "support threads support update"
  on public.support_threads for update to authenticated
  using (
    public.is_staff()
    or (public.is_agent() and status <> 'escalated' and escalated_by is null)
  )
  with check (public.is_staff() or public.is_agent());

drop policy if exists "support messages select" on public.support_messages;
create policy "support messages select"
  on public.support_messages for select to authenticated using (
    public.is_staff()
    or exists (select 1 from public.support_threads t where t.id = thread_id and t.user_id = auth.uid())
    or (
      public.is_agent()
      and exists (
        select 1 from public.support_threads t
        where t.id = thread_id and t.status <> 'escalated' and t.escalated_by is null
      )
    )
  );

drop policy if exists "support messages insert" on public.support_messages;
create policy "support messages insert"
  on public.support_messages for insert to authenticated with check (
    author_id = auth.uid()
    and (
      (author_role = 'user' and exists (select 1 from public.support_threads t where t.id = thread_id and t.user_id = auth.uid()))
      or (
        author_role = 'agent' and public.is_agent()
        and exists (
          select 1 from public.support_threads t
          where t.id = thread_id and t.status <> 'escalated' and t.escalated_by is null
        )
      )
      or (author_role = 'admin' and public.is_staff())
    )
  );

create or replace function public.support_inbox()
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  user_name text,
  status text,
  assigned_agent_id uuid,
  topic_id uuid,
  last_message_at timestamptz,
  created_at timestamptz,
  last_message text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_support() then
    raise exception 'not_support' using errcode = '42501';
  end if;
  return query
  select
    t.id,
    t.user_id,
    u.email::text,
    p.full_name,
    t.status,
    t.assigned_agent_id,
    t.topic_id,
    t.last_message_at,
    t.created_at,
    (
      select m.body
      from public.support_messages m
      where m.thread_id = t.id
      order by m.created_at desc
      limit 1
    ) as last_message
  from public.support_threads t
  join auth.users u on u.id = t.user_id
  left join public.profiles p on p.id = t.user_id
  where public.is_staff() or (t.status <> 'escalated' and t.escalated_by is null)
  order by t.last_message_at desc
  limit 300;
end;
$$;

insert into public.support_topics (code, category, title_i18n, body_i18n, sort_order) values
(
  'login',
  'compte',
  '{"fr":"Connexion impossible","en":"Cannot sign in"}',
  '{"fr":"Vérifier le courriel, afficher le mot de passe avec l’œil, puis réessayer. Mot de passe oublié envoie un lien. Si le compte n’existe pas : Créer un compte.","en":"Check the email, reveal the password, then try again. Forgot password sends a link. If no account exists: Create account."}',
  10
),
(
  'password',
  'compte',
  '{"fr":"Changer le mot de passe","en":"Change password"}',
  '{"fr":"Connecté : Paramètres → Changer le mot de passe (actuel + nouveau, 8 caractères). Déconnecté : Mot de passe oublié.","en":"Signed in: Settings → Change password. Signed out: Forgot password."}',
  20
),
(
  'email-missing',
  'compte',
  '{"fr":"Courriel de confirmation ou de reset introuvable","en":"Confirmation or reset email missing"}',
  '{"fr":"Regarder les indésirables. Attendre 2 minutes, renvoyer le lien. Confirmer l’orthographe du courriel. Si rien n’arrive : transférer au technique.","en":"Check spam. Wait 2 minutes, resend the link. Confirm the email spelling. If nothing arrives: transfer to technical."}',
  25
),
(
  'scan-receipt',
  'depenses',
  '{"fr":"Le scan de reçu est incorrect","en":"Receipt scan is wrong"}',
  '{"fr":"La lecture automatique est une suggestion. Corriger le marchand, la date, le montant et la catégorie, puis confirmer. Photo floue : saisir à la main.","en":"OCR is a suggestion. Correct merchant, date, amount and category, then confirm. Blurry photo: type the values."}',
  30
),
(
  'receipt-manual',
  'depenses',
  '{"fr":"Saisir une dépense sans photo","en":"Enter an expense without a photo"}',
  '{"fr":"Dépenses → saisie manuelle. Date du reçu (pas aujourd’hui). Montant et catégorie obligatoires.","en":"Expenses → manual entry. Use the receipt date, not today. Amount and category are required."}',
  32
),
(
  'past-expenses',
  'depenses',
  '{"fr":"Ajouter des dépenses passées","en":"Add past expenses"}',
  '{"fr":"Accueil ou Dépenses → dépenses passées. Photo/import ou saisie. La date doit être celle du reçu.","en":"Home or Expenses → past expenses. Photo/import or typing. The date must be the receipt date."}',
  34
),
(
  'wrong-category',
  'depenses',
  '{"fr":"Mauvaise catégorie de dépense","en":"Wrong expense category"}',
  '{"fr":"Ouvrir la dépense et changer la catégorie du catalogue de la province. Les totaux sont la somme de ce qui est saisi, pas un calcul d’impôt.","en":"Open the expense and change the province catalog category. Totals are the sum of what was entered, not a tax calculation."}',
  36
),
(
  'odometer',
  'kilometrage',
  '{"fr":"Relevé d’odomètre refusé","en":"Odometer reading rejected"}',
  '{"fr":"Le nouveau relevé doit être ≥ au précédent. Vérifier les chiffres, l’unité (km/mi) et le véhicule. Un relevé matin et soir le même jour aide le dossier.","en":"The new reading must be ≥ the previous one. Check digits, unit (km/mi) and vehicle."}',
  40
),
(
  'vehicle',
  'vehicule',
  '{"fr":"Ajouter ou modifier un véhicule","en":"Add or edit a vehicle"}',
  '{"fr":"Plus → Véhicules → Ajouter. Surnom obligatoire. Sans véhicule, le dossier reste incomplet.","en":"More → Vehicles → Add. Nickname required. Without a vehicle the file stays incomplete."}',
  50
),
(
  'income',
  'revenus',
  '{"fr":"Ajouter un revenu","en":"Add income"}',
  '{"fr":"Revenus → Ajouter. Date, montant et source. Ce n’est pas une cote d’impôt : c’est ce que l’utilisateur a saisi.","en":"Income → Add. Date, amount and source. This is not a tax assessment."}',
  55
),
(
  'package',
  'dossier',
  '{"fr":"Préparer le dossier comptable","en":"Prepare the accountant package"}',
  '{"fr":"Accueil → Préparer le dossier pour le comptable. Ce n’est pas une déclaration d’impôt. Corriger les points du dossier avant le PDF.","en":"Home → Prepare the accountant package. This is not a tax return. Fix file items before the PDF."}',
  60
),
(
  'integrity',
  'dossier',
  '{"fr":"Score du dossier / points à vérifier","en":"File score / items to check"}',
  '{"fr":"L’accueil liste les trous (véhicule, relevé, reçu). Chaque point corrigé fait monter le dossier. Ce n’est pas un avis fiscal.","en":"Home lists gaps (vehicle, reading, receipt). Each fix improves the file. This is not tax advice."}',
  62
),
(
  'not-tax-software',
  'dossier',
  '{"fr":"L’app calcule-t-elle l’impôt ?","en":"Does the app calculate tax?"}',
  '{"fr":"Non. MileTax organise km, reçus, dépenses et revenus pour le comptable. Pas un logiciel d’impôt, pas une déclaration.","en":"No. MileTax organizes mileage, receipts, expenses and income for the accountant. Not tax software."}',
  64
),
(
  'export-delete',
  'compte',
  '{"fr":"Exporter ou supprimer le compte","en":"Export or delete the account"}',
  '{"fr":"Paramètres → Exporter mes données (JSON). Suppression : confirmation, irréversible.","en":"Settings → Export my data (JSON). Deletion is confirmed and permanent."}',
  70
),
(
  'language',
  'app',
  '{"fr":"Changer la langue","en":"Change language"}',
  '{"fr":"Paramètres → Français ou English. Le choix est enregistré sur le profil.","en":"Settings → French or English. Saved on the profile."}',
  80
),
(
  'offline',
  'app',
  '{"fr":"L’app ne charge pas","en":"The app will not load"}',
  '{"fr":"Vérifier le réseau, fermer et rouvrir. Les données déjà enregistrées restent. Si ça continue : transférer au technique.","en":"Check the network, close and reopen. Saved records stay. If it continues: transfer to technical."}',
  90
),
(
  'bug-screen',
  'technique',
  '{"fr":"Écran blanc, bouton qui ne répond pas","en":"White screen or button does nothing"}',
  '{"fr":"Demander le navigateur ou l’appareil, l’écran exact, et ce qui a été cliqué. Ne pas inventer un correctif. Transférer au technique.","en":"Ask for browser or device, the exact screen, and what was tapped. Do not invent a fix. Transfer to technical."}',
  100
),
(
  'bug-code',
  'technique',
  '{"fr":"Erreur technique / bug de code","en":"Technical error / code bug"}',
  '{"fr":"Noter le message d’erreur visible, l’heure, et le compte. Transférer tout de suite à l’admin. Ne pas demander de mot de passe.","en":"Note the visible error, the time, and the account. Transfer to admin immediately. Never ask for a password."}',
  110
)
on conflict (code) do update set
  category = excluded.category,
  title_i18n = excluded.title_i18n,
  body_i18n = excluded.body_i18n,
  sort_order = excluded.sort_order,
  is_active = true;
