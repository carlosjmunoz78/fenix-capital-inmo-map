import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const ALLOWED_DECISIONS = new Set(['AUTORIZO','NO AUTORIZO','EXPLICAME','APARCO']);
const APPROVAL_RE = /^APR-\d{8}-[A-F0-9]{8}$/;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return json(405, { ok: false, code: 'METHOD_NOT_ALLOWED', mutation_performed: false });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(503, { ok: false, code: 'SERVER_CONFIG_MISSING', mutation_performed: false });
  }

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return json(401, { ok: false, code: 'AUTH_REQUIRED', mutation_performed: false });

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json(401, { ok: false, code: 'INVALID_SESSION', mutation_performed: false });

  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actorContext, error: actorError } = await service.rpc('preprod_test_actor_context_by_auth_server', { p_auth_user_id: user.id });
  if (actorError || !actorContext?.ok) {
    return json(403, { ok: false, code: 'ACTOR_NOT_LINKED', mutation_performed: false });
  }
  if (actorContext.actor_code !== 'CARLOS-ADMIN' || actorContext.role !== 'Direccion' || actorContext.active !== true) {
    return json(403, { ok: false, code: 'OWNER_ONLY', mutation_performed: false });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json(400, { ok: false, code: 'INVALID_JSON', mutation_performed: false }); }

  const approvalId = String(body.approval_id || '').trim().toUpperCase();
  const decision = String(body.decision || '').trim().toUpperCase();
  if (!APPROVAL_RE.test(approvalId)) return json(400, { ok: false, code: 'INVALID_APPROVAL_ID', mutation_performed: false });
  if (!ALLOWED_DECISIONS.has(decision)) return json(400, { ok: false, code: 'INVALID_DECISION', mutation_performed: false });

  const companyId = 'FENIX_CAPITAL';
  const engineId = 'ACTGW-001';
  const environment = 'PREPROD';
  const version = 'v0';
  const canonical = `${companyId}|${engineId}|${environment}|${approvalId}|${decision}|${actorContext.actor_code}`;
  const proposalHash = await sha256Hex(canonical);
  const row = {
    company_id: companyId,
    engine_id: engineId,
    environment,
    version,
    action_type: 'OWNER_DECISION',
    proposal_hash: proposalHash,
    requested_by: actorContext.actor_code,
    scope: {
      approval_id: approvalId,
      decision,
      source: 'CEREBRO_EMAIL_BUTTON',
      transport: 'AUTHENTICATED_APP_POST',
    },
    state: 'RECEIVED',
    result: {
      executed: false,
      reconciliation: 'PENDING',
      business_write: false,
      trading_access: false,
      additional_cost_eur: 0,
    },
  };

  const { error: insertError } = await service.from('cerebro_action_requests_preprod').insert(row);
  if (insertError && insertError.code !== '23505') {
    return json(500, { ok: false, code: 'INGRESS_WRITE_FAILED', mutation_performed: false });
  }
  const { data: stored, error: readError } = await service
    .from('cerebro_action_requests_preprod')
    .select('id,state,created_at')
    .eq('company_id', companyId)
    .eq('engine_id', engineId)
    .eq('environment', environment)
    .eq('proposal_hash', proposalHash)
    .maybeSingle();
  if (readError || !stored) return json(500, { ok: false, code: 'INGRESS_CONFIRMATION_FAILED', mutation_performed: false });

  return json(insertError?.code === '23505' ? 200 : 202, {
    ok: true,
    status: 'ACCEPTED_FOR_RECONCILIATION',
    idempotent_replay: insertError?.code === '23505',
    request_id: stored.id,
    approval_id: approvalId,
    decision,
    state: stored.state,
    executed: false,
    mutation_scope: 'CONTROL_PLANE_INGRESS_ONLY',
  });
});
