// Revue de dossier. Ne touche pas aux dépenses ni aux relevés.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Signal = {
  check_code: string;
  fingerprint: string;
  entity_type: string;
  entity_id: string | null;
  related_entity_id: string | null;
  confidence: 'needs_review';
  source: 'ai';
  title_i18n: { fr: string; en: string };
  body_i18n: { fr: string; en: string };
  evidence: Record<string, unknown>;
  proposed_patch: null;
  requires_review: true;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const provider = Deno.env.get('ASSISTANT_PROVIDER') ?? Deno.env.get('OCR_PROVIDER') ?? 'none';
  const signals: Signal[] = [];

  if (provider !== 'none') {
    // Branchement modèle plus tard.
  }

  return json({
    signals,
    provider,
    requires_confirmation: true,
    disclaimer: 'Assistant de dossier seulement. Ça ne remplace pas un comptable.',
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
