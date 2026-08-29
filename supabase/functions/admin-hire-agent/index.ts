// Embauche : mot de passe temporaire généré, courriel envoyé, changement forcé.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true }, 200);
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'server_misconfigured' }, 500);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  if (user.app_metadata?.role !== 'admin') return json({ error: 'forbidden' }, 403);

  let email = '';
  let fullName = '';
  let phone = '';
  let action = 'hire';
  try {
    const body = (await req.json()) as {
      email?: unknown;
      fullName?: unknown;
      phone?: unknown;
      action?: unknown;
    };
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    action = typeof body.action === 'string' ? body.action : 'hire';
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'invalid_email' }, 400);
  if (action !== 'hire' && action !== 'revoke') return json({ error: 'invalid_action' }, 400);
  if (action === 'hire' && fullName.length < 2) return json({ error: 'invalid_name' }, 400);

  const admin = createClient(supabaseUrl, serviceKey);
  const existing = await findUserByEmail(admin, email);

  if (action === 'revoke') {
    if (!existing) return json({ error: 'not_found' }, 404);
    if (existing.app_metadata?.role === 'admin') return json({ error: 'cannot_revoke_admin' }, 400);
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      app_metadata: { ...existing.app_metadata, role: null, must_change_password: null },
    });
    if (error) return json({ error: 'update_failed' }, 500);
    return json({ ok: true, revoked: true });
  }

  const password = randomPassword();
  const origin = (req.headers.get('origin') ?? Deno.env.get('EMPLOYE_APP_URL') ?? '').replace(/\/$/, '');
  const accessUrl = `${origin || 'https://miletaxe.com'}/employes`;

  let userId = existing?.id;
  if (existing) {
    if (existing.app_metadata?.role === 'admin') return json({ error: 'cannot_demote_admin' }, 400);
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...existing.user_metadata, full_name: fullName, phone },
      app_metadata: { ...existing.app_metadata, role: 'agent', must_change_password: true },
    });
    if (error) return json({ error: 'update_failed' }, 500);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, preferred_locale: 'fr' },
      app_metadata: { role: 'agent', must_change_password: true },
    });
    if (error || !data.user) return json({ error: 'create_failed' }, 500);
    userId = data.user.id;
  }

  await admin.from('profiles').update({ full_name: fullName, phone: phone || null }).eq('id', userId as string);
  const emailed = await sendHireEmail({ email, fullName, password, accessUrl });
  return json({
    ok: true,
    userId,
    hired: true,
    emailed,
    temporaryPassword: emailed ? undefined : password,
  });
});

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const found = data.users.find((row) => row.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => chars[byte % chars.length]).join('');
}

async function sendHireEmail(input: { email: string; fullName: string; password: string; accessUrl: string }) {
  const key = Deno.env.get('RESEND_API_KEY') ?? '';
  const from = Deno.env.get('RESEND_FROM') ?? 'MileTax <support@miletaxe.com>';
  if (!key) return false;
  try {
  const html = `
    <p>Bonjour ${escapeHtml(input.fullName)},</p>
    <p>Votre accès employé MileTax est prêt.</p>
    <p>Lien : <a href="${escapeHtml(input.accessUrl)}">${escapeHtml(input.accessUrl)}</a></p>
    <p>Mot de passe temporaire : <strong>${escapeHtml(input.password)}</strong></p>
    <p>À la première connexion, vous devrez le changer.</p>
  `;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: 'Votre accès employé MileTax',
      html,
    }),
  });
  return response.ok;
  } catch {
    return false;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
