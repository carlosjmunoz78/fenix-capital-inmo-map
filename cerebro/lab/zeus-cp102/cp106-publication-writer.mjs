import {createGithubOidcJwksLoader} from './github-oidc-jwks.mjs';
const issuer = 'https://token.actions.githubusercontent.com';
const audience = 'cerebro-zeus-lrn-cp106-lab';
const repo = 'carlosjmunoz78/fenix-capital-inmo-map';
const ref = 'refs/heads/lab/zeus-lrn-publication-cp106-20261123';
const workflow = repo + '/.github/workflows/cerebro-zeus-lrn-publication-cp106-lab.yml@' + ref;
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

const RECORD = {runId:45198055197,attempt:1,workflowId:403468557,jobId:137773725781,stateCommit:'c9d7a17bf3632413facd6439a1b8738d69f2e023'};
function check(m) {
  if(!m||m.schema!=='zeus-lrn-publication/v1'||m.repository!==repo||
     m.branch!=='cerebro-rsi-learning-state-v0'||
     m.scope?.company_id!=='fenix'||m.scope?.engine_id!=='LRN-001'||
     m.scope?.environment!=='PREPROD'||m.scope?.version!=='0.6.0'||
     Object.entries(RECORD).some(([k,v])=>m[k]!==v)||
     m.event!=='workflow_run'||!/^[a-f0-9]{40}$/.test(m.sourceHead||'')||
     !/^[a-f0-9]{40}$/.test(m.summary?.git_blob||'')||
     !/^[a-f0-9]{64}$/.test(m.summary?.sha256||'')||
     m.daily_result?.status!=='NO_DAILY_RESULT'||
     m.execution_state!=='COMPLETED'||m.health_state!=='GREEN_AT_OBSERVATION'||
     m.autonomy_state!=='PREPROD_POLICY_ONLY'||m.promotion_allowed!==false||
     m.additional_cost_eur!==0)throw Error('MANIFEST_DENIED');
}
export default {
 async fetch(request,env) {
  if(request.method!=='POST'||new URL(request.url).pathname!=='/v1/publication')return new Response(null,{status:404});
  try{await authorize(request.headers.get('Authorization'),env.WORKFLOW_SHA,githubKeys)}
  catch{return Response.json({code:'OIDC_DENIED'},{status:403})}
  if(request.headers.get('Content-Type')!=='application/json')return new Response(null,{status:415});
  const raw=await request.text();
  if(raw.length>8192)return new Response(null,{status:413});
  let m;try{m=JSON.parse(raw);check(m)}catch{return Response.json({code:'MANIFEST_DENIED'},{status:422})}
  try{
   const t=env.ZEUS_DB;
   const v=await t.prepare("INSERT INTO zeus_lrn_publications_cp106_lab(company_id,engine_id,environment,run_id,run_attempt,job_id,state_commit,daily_result,manifest) VALUES('fenix','LRN-001','PREPROD',?,?,?,?,?,?) ON CONFLICT(company_id,engine_id,environment,run_id,run_attempt) DO NOTHING")
     .bind(String(m.runId),m.attempt,String(m.jobId),m.stateCommit,'NO_DAILY_RESULT',raw).run();
   const row=await t.prepare("SELECT manifest FROM zeus_lrn_publications_cp106_lab WHERE run_id=? AND run_attempt=?")
     .bind(String(m.runId),m.attempt).first();
   if(row?.manifest!==raw)return Response.json({code:'MANIFEST_CONFLICT'},{status:409});
   return Response.json({status:'RECORDED',writes:v.meta.changes,runId:m.runId,classification:'NO_DAILY_RESULT',promotion_allowed:false});
  }catch{return Response.json({code:'D1_NOT_READY'},{status:503})}
 }
};
