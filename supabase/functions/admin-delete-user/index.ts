// Suppression d’un compte par un staff. Identité via JWT, jamais via le corps seul.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKETS = ['receipts', 'odometer-photos', 'report-packages'] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return json({ ok: true }, 200);
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'server_misconfigured' }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  if (user.app_metadata?.role !== 'admin') return json({ error: 'forbidden' }, 403);

  const { data: staffFlag, error: staffError } = await userClient.rpc('is_staff');
  if (staffError || staffFlag !== true) return json({ error: 'forbidden' }, 403);

  let targetId = '';
  try {
    const body = (await req.json()) as { userId?: unknown };
    targetId = typeof body.userId === 'string' ? body.userId.trim() : '';
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  if (!isUuid(targetId)) return json({ error: 'invalid_target' }, 400);
  if (targetId === user.id) return json({ error: 'cannot_delete_self' }, 400);

  const admin = createClient(supabaseUrl, serviceKey);

  for (const bucket of BUCKETS) {
    const paths = await listAll(admin, bucket, targetId);
    for (const chunk of chunks(paths, 100)) {
      if (!chunk.length) continue;
      const { error } = await admin.storage.from(bucket).remove(chunk);
      if (error) return json({ error: 'storage_delete_failed', bucket }, 500);
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(targetId);
  if (deleteError) return json({ error: 'auth_delete_failed' }, 500);

  const userHash = await sha256(targetId);
  await admin.from('account_lifecycle_events').insert({ event: 'deleted', user_hash: userHash });

  return json({ ok: true, deleted: true });
});

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function listAll(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data?.length) return paths;
  for (const item of data) {
    const path = `${prefix}/${item.name}`;
    if (!item.id) {
      paths.push(...(await listAll(admin, bucket, path)));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
