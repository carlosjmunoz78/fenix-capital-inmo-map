import {createGithubOidcJwksLoader} from './github-oidc-jwks.mjs';
const issuer = 'https://token.actions.githubusercontent.com';
const audience = 'cerebro-zeus-lrn-cp103-lab';
const repo = 'carlosjmunoz78/fenix-capital-inmo-map';
const ref = 'refs/heads/lab/zeus-lrn-oidc-cp103';
const workflow = repo + '/.github/workflows/cerebro-rsi-learning-control-plane-v0.yml@' + ref;
const decoder = new TextDecoder('utf-8', { fatal: true });
const encoder = new TextEncoder();

function fromBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw Error('FORMAT');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  try { return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), c => c.charCodeAt(0)); }
  catch { throw Error('ENCODING'); }
}

export async function authorize(header, expectedSha, loadKeys, now = Math.floor(Date.now() / 1000)) {
  if (!header?.startsWith('Bearer ') || header.length > 12288) throw Error('FORMAT');
  const segments = header.slice(7).split('.');
  if (segments.length !== 3) throw Error('FORMAT');
  const [head, body, signature] = segments;
  const { alg, kid } = JSON.parse(decoder.decode(fromBase64Url(head)));
  const claims = JSON.parse(decoder.decode(fromBase64Url(body)));
  if (alg !== 'RS256' || typeof kid !== 'string' || !/^[a-f0-9]{40}$/.test(expectedSha) ||
      claims.iss !== issuer || claims.aud !== audience ||
      claims.repository !== repo || claims.repository_id !== '1441445836' ||
      claims.repository_owner_id !== '130542695' || claims.ref !== ref ||
      claims.sub !== 'repo:carlosjmunoz78@130542695/fenix-capital-inmo-map@1441445836:ref:' + ref ||
      claims.workflow_ref !== workflow || claims.workflow_sha !== expectedSha ||
      claims.sha !== expectedSha || claims.event_name !== 'push' ||
      claims.runner_environment !== 'github-hosted' ||
      !/^[1-9][0-9]{0,15}$/.test(claims.run_id) || !/^[1-9][0-9]{0,5}$/.test(claims.run_attempt)) throw Error('SCOPE');
  if (      ![claims.iat, claims.nbf, claims.exp].every(Number.isSafeInteger) ||
      claims.iat > now + 30 || claims.nbf > now + 30 || claims.exp <= now ||
      claims.exp <= claims.iat || claims.exp - claims.iat > 600) throw Error('TIME');
  const supplied = await loadKeys(kid);
  if (!Array.isArray(supplied?.keys)) throw Error('JWKS_FORMAT');
  const keys = supplied.keys.filter(key =>
    key.kty === 'RSA' && key.kid === kid && (!key.use || key.use === 'sig') && (!key.alg || key.alg === alg));
  if (keys.length !== 1) throw Error('KEY');
  const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
  let key;
  try { key = await crypto.subtle.importKey('jwk', keys[0], algorithm, false, ['verify']); }
  catch { throw Error('IMPORT'); }
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromBase64Url(signature), encoder.encode(head + '.' + body));
  if (!valid) throw Error('SIGNATURE');
  return { run: claims.run_id, attempt: claims.run_attempt };
}

const githubKeys = createGithubOidcJwksLoader();

async function historicalManifest(request) {
  if (request.headers.get('Content-Type') !== 'application/json') throw Error('CONTENT');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) throw Error('LENGTH');
      chunks.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    await reader.cancel();
  }
  return chunks.join('') + decoder.decode();
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/v1/replay') return new Response(null, { status: 404 });
    let principal;
    try {
      principal = await authorize(request.headers.get('Authorization'), env.WORKFLOW_SHA, githubKeys);
    } catch (error) {
      const diagnostic = { SCOPE: 412, TIME: 410, KEY: 401, SIGNATURE: 400, JWKS: 503, FORMAT: 403, ENCODING: 415, IMPORT: 421, KEYS_FETCH: 424, JWKS_FORMAT: 425, JWKS_DISCOVERY: 503, JWKS_SIZE: 413 };
      return Response.json({ code: 'OIDC_DENIED' }, { status: diagnostic[error.message] ?? 502 });
    }
    const expected = statements[1].params[1];
    try {
      if (await historicalManifest(request) !== expected) return Response.json({ code: 'MANIFEST_DENIED' }, { status: 422 });
    } catch {
      return Response.json({ code: 'MANIFEST_DENIED' }, { status: 422 });
    }
    try {
      const lock = statements[1].params[0];
      const canonical = await env.ZEUS_DB.prepare(
        "SELECT p.manifest, c.position FROM zeus_lrn_provenance_v1 p JOIN zeus_lrn_replay_cursor_v1 c ON c.id='fenix:LRN-001:PREPROD:daily' WHERE p.lock_key=?"
      ).bind(lock).first();
      if (canonical?.manifest !== expected || canonical.position !== 1) throw Error('BASELINE');
      const result = await env.ZEUS_DB.batch(statements.map(({ sql, params }) => env.ZEUS_DB.prepare(sql).bind(...params)));
      const changes = result.map(query => query.meta.changes);
      if (!['1,1,1', '0,0,0'].includes(changes.join(','))) throw Error('ATOMIC_RESULT');
      const read = await env.ZEUS_DB.prepare(
        "SELECT p.manifest, c.position FROM zeus_lrn_cp103_provenance p JOIN zeus_lrn_cp103_cursor c ON c.id='fenix:LRN-001:PREPROD:daily' WHERE p.lock_key=?"
      ).bind(lock).first();
      if (read?.manifest !== expected || read.position !== 1) throw Error('READBACK');
      return Response.json({ status: 'REPLAY', changes, position: 1, run: principal.run, attempt: principal.attempt });
    } catch {
      return Response.json({ code: 'D1_REPLAY_FAILED' }, { status: 503 });
    }
  },
};

const statements = [{"sql":"INSERT INTO zeus_lrn_cp103_observations (company_id,engine_id,environment,version,lock_key,source_commit,source_blob,source_sha256,source_run_id,source_job_id,observed_at,execution_state,health_state,autonomy_state,promotion_allowed,additional_cost_eur) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?\n      WHERE EXISTS (SELECT 1 FROM zeus_lrn_cp103_cursor WHERE id=? AND position=?)\n    AND NOT EXISTS (SELECT 1 FROM zeus_lrn_cp103_provenance WHERE lock_key=? AND manifest<>?)\n      ON CONFLICT(company_id,engine_id,environment,lock_key) DO NOTHING","params":["fenix","LRN-001","PREPROD","0.6.0","eb5da601d613a78eb996be1933d5821a32c5359e53512144bf81347e5b7827c1","565f5d75b82a1fcd5d196386ea930a672f101000","7e2cbcb9efbbd998b20542bf4523452a65e37fbf","fa223279dd427750e59186681de6474368ed3a1074a175d57a3149355066f92f","45150907763","137611733062","2026-11-23T09:52:37.697Z","COMPLETED","GREEN_AT_OBSERVATION","PREPROD_POLICY_ONLY",0,0,"fenix:LRN-001:PREPROD:daily",0,"eb5da601d613a78eb996be1933d5821a32c5359e53512144bf81347e5b7827c1","{\"schema\":\"zeus-lrn-provenance/v1\",\"repository\":\"carlosjmunoz78/fenix-capital-inmo-map\",\"branch\":\"cerebro-rsi-learning-state-v0\",\"scope\":{\"company_id\":\"fenix\",\"engine_id\":\"LRN-001\",\"environment\":\"PREPROD\",\"version\":\"0.6.0\"},\"runId\":45150907763,\"attempt\":1,\"workflowId\":403468557,\"jobId\":137611733062,\"stateCommit\":\"565f5d75b82a1fcd5d196386ea930a672f101000\",\"sourceHead\":\"902022f5d4dcc4aab29e6d35411a63c38fe438e7\",\"lock_key\":\"eb5da601d613a78eb996be1933d5821a32c5359e53512144bf81347e5b7827c1\",\"summary\":{\"path\":\"cerebro/runtime/rsi-learning-state/last-control-plane-run.json\",\"git_blob\":\"59eacf1453d8c9277b52ae9de6051353ba335840\",\"sha256\":\"ad23027e7708f57b8b895196c5ab2765c2654c1a6df63f62ea2e1adb8dc89cda\"},\"result\":{\"path\":\"cerebro/runtime/rsi-learning-state/data/fenix/LRN-001/orchestration-results/eb5da601d613a78eb996be1933d5821a32c5359e53512144bf81347e5b7827c1.json\",\"git_blob\":\"7e2cbcb9efbbd998b20542bf4523452a65e37fbf\",\"sha256\":\"fa223279dd427750e59186681de6474368ed3a1074a175d57a3149355066f92f\"}}"]},{"sql":"INSERT INTO zeus_lrn_cp103_provenance (lock_key,manifest) SELECT ?,?\n      WHERE EXISTS (SELECT 1 FROM zeus_lrn_cp103_cursor WHERE id=? AND position=?)\n      AND EXISTS (SELECT 1 FROM zeus_lrn_cp103_observations WHERE company_id=? AND engine_id=? AND environment=? AND version=? AND lock_key=? AND source_commit=? AND source_blob=? AND source_sha256=? AND source_run_id=? AND source_job_id=? AND observed_at=? AND execution_state=? AND health_state=? AND autonomy_state=? AND promotion_allowed=? AND additional_cost_eur=?) ON CONFLICT(lock_key) DO NOTHING","params":["eb5da601d613a78eb996be1933d5821a32c5359e53512144bf81347e5b7827c1","{\"schema\":\"zeus-lrn-provenance/v1\",\"repository\":\"carlosjmunoz78/fenix-capital-inmo-map\",\"branch\":\"cerebro-rsi-learning-state-v0\",\"scope\":{\"company_id\":\"fenix\",\"engine_id\":\"LRN-001\",\"environment\":\"PREPROD\",\"version\":\"0.6.0\"},\"runId\":45150907763,\"attempt\":1,\"workflowId\":403468557,\"jobId\":137611733062,\"stateCommit\":\"565f5d75b82a1fcd5d196386ea930a672f101000\",\"sourceHead\":\"902022f5d4dcc4aab29e6d35411a63c38fe438e7\",\"lock_key\":\"eb5da601d613a78eb996be1933d5821a32c5359e53512144bf81347e5b7827c1\",\"summary\":{\"path\":\"cerebro/runtime/rsi-learning-state/last-control-plane-run.json\",\"git_blob\":\"59eacf1453d8c9277b52ae9de6051353ba335840\",\"sha256\":\"ad23027e7708f57b8b895196c5ab2765c2654c1a6df63f62ea2e1adb8dc89cda\"},\"result\":{\"path\":\"cerebro/runtime/rsi-learning-state/data/fenix/LRN-001/orchestration-results/eb5da601d613a78eb996be1933d5821a32c5359e53512144bf81347e5b7827c1.json\",\"git_blob\":\"7e2cbcb9efbbd998b20542bf4523452a65e37fbf\",\"sha256\":\"fa223279dd427750e59186681de6474368ed3a1074a175d57a3149355066f92f\"}}","fenix:LRN-001:PREPROD:daily",0,"fenix","LRN-001","PREPROD","0.6.0","eb5da601d613a78eb996be1933d5821a32c5359e53512144bf81347e5b7827c1","565f5d75b82a1fcd5d196386ea930a672f101000","7e2cbcb9efbbd998b20542bf4523452a65e37fbf","fa223279dd427750e59186681de6474368ed3a1074a175d57a3149355066f92f","45150907763","137611733062","2026-11-23T09:52:37.697Z","COMPLETED","GREEN_AT_OBSERVATION","PREPROD_POLICY_ONLY",0,0]},{"sql":"UPDATE zeus_lrn_cp103_cursor SET position=position+1\n      WHERE id=? AND position=? AND EXISTS (SELECT 1 FROM zeus_lrn_cp103_observations WHERE company_id=? AND engine_id=? AND environment=? AND version=? AND lock_key=? AND source_commit=? AND source_blob=? AND source_sha256=? AND source_run_id=? AND source_job_id=? AND observed_at=? AND execution_state=? AND health_state=? AND autonomy_state=? AND promotion_allowed=? AND additional_cost_eur=?)\n    AND EXISTS (SELECT 1 FROM zeus_lrn_cp103_provenance WHERE lock_key=? AND manifest=?)","params":["fenix:LRN-001:PREPROD:daily",0,"fenix","LRN-001","PREPROD","0.6.0","eb5da601d613a78eb996be1933d5821a32c5359e53512144bf81347e5b7827c1","565f5d75b82a1fcd5d196386ea930a672f101000","7e2cbcb9efbbd998b20542bf4523452a65e37fbf","fa223279dd427750e59186681de6474368ed3a1074a175d57a3149355066f92f","45150907763","137611733062","2026-11-23T09:52:37.697Z","COMPLETED","GREEN_AT_OBSERVATION","PREPROD_POLICY_ONLY",0,0,"eb5da601d613a78eb996be1933d5821a32c5359e53512144bf81347e5b7827c1","{\"schema\":\"zeus-lrn-provenance/v1\",\"repository\":\"carlosjmunoz78/fenix-capital-inmo-map\",\"branch\":\"cerebro-rsi-learning-state-v0\",\"scope\":{\"company_id\":\"fenix\",\"engine_id\":\"LRN-001\",\"environment\":\"PREPROD\",\"version\":\"0.6.0\"},\"runId\":45150907763,\"attempt\":1,\"workflowId\":403468557,\"jobId\":137611733062,\"stateCommit\":\"565f5d75b82a1fcd5d196386ea930a672f101000\",\"sourceHead\":\"902022f5d4dcc4aab29e6d35411a63c38fe438e7\",\"lock_key\":\"eb5da601d613a78eb996be1933d5821a32c5359e53512144bf81347e5b7827c1\",\"summary\":{\"path\":\"cerebro/runtime/rsi-learning-state/last-control-plane-run.json\",\"git_blob\":\"59eacf1453d8c9277b52ae9de6051353ba335840\",\"sha256\":\"ad23027e7708f57b8b895196c5ab2765c2654c1a6df63f62ea2e1adb8dc89cda\"},\"result\":{\"path\":\"cerebro/runtime/rsi-learning-state/data/fenix/LRN-001/orchestration-results/eb5da601d613a78eb996be1933d5821a32c5359e53512144bf81347e5b7827c1.json\",\"git_blob\":\"7e2cbcb9efbbd998b20542bf4523452a65e37fbf\",\"sha256\":\"fa223279dd427750e59186681de6474368ed3a1074a175d57a3149355066f92f\"}}"]}];
