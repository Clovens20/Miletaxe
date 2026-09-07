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

  const allowed = ['hire', 'revoke', 'suspend', 'unsuspend', 'reset_password', 'list'];
  if (!allowed.includes(action)) return json({ error: 'invalid_action' }, 400);

  if (action === 'list') {
    const admin = createClient(supabaseUrl, serviceKey);
    const agents = [];
    for (let page = 1; page <= 20; page += 1) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const users = data?.users ?? [];
      for (const row of users) {
        if (row.app_metadata?.role !== 'agent') continue;
        const flag = row.app_metadata?.must_change_password;
        const extra = row as { banned_until?: string | null };
        agents.push({
          id: row.id,
          email: row.email ?? null,
          full_name: typeof row.user_metadata?.full_name === 'string' ? row.user_metadata.full_name : null,
          phone: typeof row.user_metadata?.phone === 'string' ? row.user_metadata.phone : null,
          created_at: row.created_at,
          last_sign_in_at: row.last_sign_in_at ?? null,
          banned_until: extra.banned_until ?? null,
          must_change_password: flag === true || flag === 'true' || flag === 1,
        });
      }
      if (users.length < 200) break;
    }
    const ids = agents.map((row) => row.id);
    if (ids.length) {
      const { data: profiles } = await admin.from('profiles').select('id, full_name, phone').in('id', ids);
      const byId = new Map((profiles ?? []).map((row) => [row.id, row]));
      for (const agent of agents) {
        const profile = byId.get(agent.id);
        if (profile?.full_name) agent.full_name = profile.full_name;
        if (profile?.phone) agent.phone = profile.phone;
      }
    }
    agents.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return json({ ok: true, agents });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'invalid_email' }, 400);
  if (action === 'hire' && fullName.length < 2) return json({ error: 'invalid_name' }, 400);

  const admin = createClient(supabaseUrl, serviceKey);
  const existing = await findUserByEmail(admin, email);

  if (action === 'revoke' || action === 'suspend' || action === 'unsuspend' || action === 'reset_password') {
    if (!existing) return json({ error: 'not_found' }, 404);
    if (existing.app_metadata?.role === 'admin') return json({ error: 'cannot_revoke_admin' }, 400);
  }

  if (action === 'revoke') {
    const { error } = await admin.auth.admin.updateUserById(existing!.id, {
      app_metadata: { ...existing!.app_metadata, role: null, must_change_password: null },
      ban_duration: 'none',
    });
    if (error) return json({ error: 'update_failed' }, 500);
    return json({ ok: true, revoked: true });
  }

  if (action === 'suspend') {
    const { error } = await admin.auth.admin.updateUserById(existing!.id, { ban_duration: '876000h' });
    if (error) return json({ error: 'update_failed' }, 500);
    return json({ ok: true, suspended: true });
  }

  if (action === 'unsuspend') {
    const { error } = await admin.auth.admin.updateUserById(existing!.id, { ban_duration: 'none' });
    if (error) return json({ error: 'update_failed' }, 500);
    return json({ ok: true, unsuspended: true });
  }

  if (action === 'reset_password') {
    const origin = (req.headers.get('origin') ?? Deno.env.get('EMPLOYE_APP_URL') ?? '').replace(/\/$/, '');
    const redirectTo = `${origin || 'https://miletaxe.com'}/auth/reset`;
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });
    if (error || !data?.properties?.action_link) return json({ error: 'reset_failed' }, 500);
    const emailed = await sendResetEmail({
      email,
      fullName: (existing!.user_metadata?.full_name as string) || email,
      resetUrl: data.properties.action_link,
    });
    return json({
      ok: true,
      reset: true,
      emailed,
      recoveryLink: emailed ? undefined : data.properties.action_link,
    });
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

async function sendResetEmail(input: { email: string; fullName: string; resetUrl: string }) {
  const key = Deno.env.get('RESEND_API_KEY') ?? '';
  const from = Deno.env.get('RESEND_FROM') ?? 'MileTax <support@miletaxe.com>';
  if (!key) return false;
  try {
    const html = `
      <p>Bonjour ${escapeHtml(input.fullName)},</p>
      <p>Un administrateur MileTax a demandé la réinitialisation de votre mot de passe employé.</p>
      <p><a href="${escapeHtml(input.resetUrl)}">Choisir un nouveau mot de passe</a></p>
      <p>Si vous n’êtes pas à l’origine de cette demande, ignorez ce courriel.</p>
    `;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [input.email],
        subject: 'Réinitialisation de votre mot de passe employé MileTax',
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
