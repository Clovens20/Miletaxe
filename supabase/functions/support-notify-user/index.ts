// Prévenir l’utilisateur qu’un agent a répondu, pour qu’il continue dans l’app.

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
  const role = user.app_metadata?.role;
  if (role !== 'admin' && role !== 'agent') return json({ error: 'forbidden' }, 403);

  let threadId = '';
  let body = '';
  try {
    const payload = (await req.json()) as { threadId?: unknown; body?: unknown };
    threadId = typeof payload.threadId === 'string' ? payload.threadId : '';
    body = typeof payload.body === 'string' ? payload.body.trim() : '';
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  if (!threadId || !body) return json({ error: 'invalid_body' }, 400);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: thread, error: threadError } = await admin
    .from('support_threads')
    .select('id, user_id')
    .eq('id', threadId)
    .maybeSingle();
  if (threadError || !thread) return json({ error: 'not_found' }, 404);

  const { data: owner, error: ownerError } = await admin.auth.admin.getUserById(thread.user_id);
  const email = owner.user?.email;
  if (ownerError || !email) return json({ ok: true, emailed: false });

  const origin = (req.headers.get('origin') ?? Deno.env.get('EMPLOYE_APP_URL') ?? 'https://miletaxe.com').replace(
    /\/$/,
    '',
  );
  const conversationUrl = `${origin}/support/${threadId}`;
  const excerpt = body.length > 280 ? `${body.slice(0, 277)}…` : body;
  const key = Deno.env.get('RESEND_API_KEY') ?? '';
  const from = Deno.env.get('RESEND_FROM') ?? 'MileTax <support@miletaxe.com>';
  if (!key) return json({ ok: true, emailed: false });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Nouvelle réponse à votre conversation MileTax',
        html: `
          <p>Un agent MileTax a répondu à votre message.</p>
          <p>${escapeHtml(excerpt)}</p>
          <p><a href="${escapeHtml(conversationUrl)}">Ouvrir la conversation</a></p>
        `,
      }),
    });
    return json({ ok: true, emailed: response.ok });
  } catch {
    return json({ ok: true, emailed: false });
  }
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
