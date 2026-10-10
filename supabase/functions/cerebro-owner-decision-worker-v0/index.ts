import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5.10.0';

const REPOSITORY = 'carlosjmunoz78/fenix-capital-inmo-map';
const AUDIENCE = 'cerebro-owner-decision-worker-v0';
const ISSUER = 'https://token.actions.githubusercontent.com';
const JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function verifyGithubOidc(req: Request) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) throw new Error('OIDC_REQUIRED');
  const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: AUDIENCE });
  if (payload.repository !== REPOSITORY) throw new Error('REPOSITORY_NOT_ALLOWED');
  if (payload.ref !== 'refs/heads/main') throw new Error('REF_NOT_ALLOWED');
  const workflowRef = String(payload.workflow_ref || '');
  if (!workflowRef.includes('/.github/workflows/cerebro-human-communication-v1.yml@')) throw new Error('WORKFLOW_NOT_ALLOWED');
  return payload;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { ok: false, code: 'METHOD_NOT_ALLOWED' });
  try { await verifyGithubOidc(req); }
  catch (error) { return json(401, { ok: false, code: error instanceof Error ? error.message : 'OIDC_INVALID' }); }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json(503, { ok: false, code: 'SERVER_CONFIG_MISSING' });
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json(400, { ok: false, code: 'INVALID_JSON' }); }
  const operation = String(body.operation || '').trim().toLowerCase();

  if (operation === 'pull') {
    const { data, error } = await service
      .from('cerebro_action_requests_preprod')
      .select('id,created_at,scope,requested_by')
      .eq('company_id', 'FENIX_CAPITAL')
      .eq('engine_id', 'ACTGW-001')
      .eq('environment', 'PREPROD')
      .eq('action_type', 'OWNER_DECISION')
      .eq('state', 'RECEIVED')
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) return json(500, { ok: false, code: 'PULL_FAILED' });
    const items = (data || []).map((row: any) => ({
      action_request_id: row.id,
      message_id: `app:${row.id}`,
      in_reply_to: null,
      from_identity: 'OWNER_AUTHENTICATED_APP',
      subject: 'CEREBRO authenticated owner decision',
      date: row.created_at,
      text: `${String(row.scope?.decision || '').toUpperCase()} ${String(row.scope?.approval_id || '').toUpperCase()}`,
      requested_by: row.requested_by,
    }));
    return json(200, { ok: true, items });
  }

  if (operation === 'ack') {
    const rawIds = Array.isArray(body.ids) ? body.ids : [];
    const ids = rawIds.map((x) => String(x)).filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 50);
    if (!ids.length) return json(200, { ok: true, acknowledged: 0 });
    const { data, error } = await service
      .from('cerebro_action_requests_preprod')
      .update({
        state: 'CONSUMED_BY_COMMUNICATION_CONTROLLER',
        result: {
          executed: false,
          reconciliation: 'CONTROLLER_CONSUMED',
          canonical_effect: 'DETERMINED_BY_COMMUNICATION_CONTROLLER',
          business_write: false,
          trading_access: false,
          additional_cost_eur: 0,
        },
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)
      .eq('company_id', 'FENIX_CAPITAL')
      .eq('engine_id', 'ACTGW-001')
      .eq('environment', 'PREPROD')
      .eq('action_type', 'OWNER_DECISION')
      .eq('state', 'RECEIVED')
      .select('id');
    if (error) return json(500, { ok: false, code: 'ACK_FAILED' });
    return json(200, { ok: true, acknowledged: data?.length || 0 });
  }

  return json(400, { ok: false, code: 'INVALID_OPERATION' });
});
