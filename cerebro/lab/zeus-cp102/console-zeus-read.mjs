import {createGithubOidcJwksLoader} from './github-oidc-jwks.mjs';
const issuer = 'https://token.actions.githubusercontent.com';
const audience = 'cerebro-zeus-console-read-v0-lab';
const repo = 'carlosjmunoz78/fenix-capital-inmo-map';
const ref = 'refs/heads/lab/cerebro-console-zeus-read-v0-20261123';
const workflow = repo + '/.github/workflows/cerebro-console-zeus-live-read-v0-lab.yml@' + ref;
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

const SCOPES = new Set(['fenix:LRN-001:PREPROD','fenix-capital:FACT-001:LAB']);
const QUERY = 'SELECT company_id,engine_id,environment,version,evidence_ref,execution_state,health_state,autonomy_state,promotion_allowed,source_sha256 FROM zeus_scoped_observations_v1 WHERE company_id=? AND engine_id=? AND environment=? LIMIT 2';
const response = (data, status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {
 async fetch(request,env) {
  const url=new URL(request.url);
  if(request.method!=='GET'||url.pathname!=='/v1/engine')return new Response(null,{status:404});
  try { await authorize(request.headers.get('Authorization'),env.WORKFLOW_SHA,githubKeys); }
  catch { return response({ok:false,error:'unauthorized'},403); }
  const company_id=url.searchParams.get('company_id'), engine_id=url.searchParams.get('engine_id'), environment=url.searchParams.get('environment');
  if(!SCOPES.has(company_id+':'+engine_id+':'+environment)||url.searchParams.size!==3)
    return response({ok:false,error:'scope_not_found'},404);
  try {
    const rows=await env.ZEUS_DB.prepare(QUERY).bind(company_id,engine_id,environment).all();
    if(rows.results?.length!==1)return response({ok:false,error:'source_ambiguous_or_missing'},503);
    const record=rows.results[0];
    if(record.promotion_allowed!==0)return response({ok:false,error:'promotion_gate_violation'},503);
    const extras={};
    if(company_id==='fenix'&&engine_id==='LRN-001'&&environment==='PREPROD'){
      const [cursor,publications]=await Promise.all([
       env.ZEUS_DB.prepare("SELECT position FROM zeus_lrn_replay_cursor_v1 WHERE id='fenix:LRN-001:PREPROD:daily'").first(),
       env.ZEUS_DB.prepare("SELECT COUNT(*) AS total,MAX(CAST(run_id AS INTEGER)) AS latest_run_id FROM zeus_lrn_publications_cp106_lab WHERE company_id='fenix' AND engine_id='LRN-001' AND environment='PREPROD'").first()
      ]);
      if(!Number.isSafeInteger(cursor?.position)||!Number.isSafeInteger(publications?.total))
        return response({ok:false,error:'missing_lrn_evidence'},503);
      extras.daily_cursor_position=cursor.position;
      extras.publications_received=publications.total;
      extras.latest_publication_run_id=publications.latest_run_id?String(publications.latest_run_id):null;
    }
    return response({ok:true,source:'LIVE_CLOUDFLARE_D1_LAB',reader:'ZEUS_CONSOLE_READ_V0',scope:{company_id,engine_id,environment},engine:record,details:extras,external_writes:0,prod_promoted:false});
  }catch{return response({ok:false,error:'backend_unavailable'},503)}
 }
};
