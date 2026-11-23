import {createGithubOidcJwksLoader} from './github-oidc-jwks.mjs';
const ISSUER='https://token.actions.githubusercontent.com';
const AUDIENCE='cerebro-zeus-lrn-auto-lab';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const WORKFLOW_REF=REPO+'/.github/workflows/cerebro-rsi-learning-control-plane-v0.yml@refs/heads/main';
const IMMUTABLE='e88ca2983ec9f6595f20f121bd31637d981a96e8';
const JOB_REF=REPO+'/.github/workflows/cerebro-zeus-lrn-verified-reusable-v1.yml@'+IMMUTABLE;
const REF='refs/heads/main';
const SUBJECT='repo:carlosjmunoz78@130542695/fenix-capital-inmo-map@1441445836:ref:'+REF;
const SCOPE={company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.6.0'};
const keyLoader=createGithubOidcJwksLoader();
const respond=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function decode64(t) {
 if(typeof t!=='string'||!/^[A-Za-z0-9_-]{1,12000}$/.test(t))throw Error('FORMAT');
 const norm=t.replace(/-/g,'+').replace(/_/g,'/');
 return Uint8Array.from(atob(norm.padEnd(Math.ceil(norm.length/4)*4,'=')),c=>c.charCodeAt(0));
}
function part(token) {return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode64(token)));}
async function authorize(request) {
 const header=request.headers.get('Authorization');
 if(!header?.startsWith('Bearer ')||header.length>12288)throw Error('NO_TOKEN');
 const segments=header.slice(7).split('.');
 if(segments.length!==3)throw Error('FORMAT');
 const [h,p,sig]=segments;
 let head,claims;try{head=part(h);claims=part(p);}catch{throw Error('FORMAT');}
 if(head.alg!=='RS256'||typeof head.kid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(head.kid)||
  claims.iss!==ISSUER||claims.aud!==AUDIENCE||claims.sub!==SUBJECT||
  claims.repository!==REPO||claims.repository_id!=='1441445836'||claims.repository_owner_id!=='130542695'||
  claims.ref!==REF||claims.workflow_ref!==WORKFLOW_REF||
  claims.job_workflow_ref!==JOB_REF||claims.job_workflow_sha!==IMMUTABLE||
  typeof claims.workflow_sha!=='string'||!/^[a-f0-9]{40}$/.test(claims.workflow_sha)||
  claims.sha!==claims.workflow_sha||!['schedule','workflow_run'].includes(claims.event_name)||
  claims.runner_environment!=='github-hosted'||
  !/^[1-9][0-9]{0,15}$/.test(claims.run_id||'')||
  !/^[1-9][0-9]{0,5}$/.test(claims.run_attempt||''))throw Error('IDENTITY_DENIED');
 const now=Math.floor(Date.now()/1000);
 if(![claims.iat,claims.nbf,claims.exp].every(Number.isSafeInteger)||claims.iat>now+30||
    claims.nbf>now+30||claims.exp<=now||claims.exp<=claims.iat||claims.exp-claims.iat>600)
   throw Error('EXPIRY');
 const set=await keyLoader(head.kid);
 const matches=set.keys.filter(k=>k.kid===head.kid&&k.kty==='RSA'&&k.use==='sig'&&k.alg==='RS256');
 if(matches.length!==1)throw Error('KID_INVALID');
 let key;try{key=await crypto.subtle.importKey('jwk',matches[0],
  {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);}
 catch{throw Error('SIGNING_KEY');}
 const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode64(sig),new TextEncoder().encode(h+'.'+p));
 if(!ok)throw Error('SIGNATURE');
 return claims;
}
export function validate(m,claims) {
 if(!m||typeof m!=='object'||Array.isArray(m)||m.schema!=='zeus-lrn-publication-auto/v1'||
    m.repository!==REPO||m.workflow_id!==403468557||m.source_branch!=='cerebro-rsi-learning-state-v0'||
    m.scope?.company_id!==SCOPE.company_id||m.scope?.engine_id!==SCOPE.engine_id||
    m.scope?.environment!==SCOPE.environment||m.scope?.version!==SCOPE.version||
    m.run_id!==Number(claims.run_id)||m.run_attempt!==Number(claims.run_attempt)||
    !Number.isSafeInteger(m.publisher_job_id)||m.publisher_job_id<1||
    !/^[a-f0-9]{40}$/.test(m.source_head_sha||'')||m.source_head_sha!==claims.sha||
    !/^[a-f0-9]{40}$/.test(m.state_commit||'')||
    m.event!==claims.event_name||m.execution_state!=='PUBLISHER_JOB_SUCCESS'||
    m.health_state!=='GREEN_AT_OBSERVATION'||m.autonomy_state!=='PREPROD_POLICY_ONLY'||
    m.promotion_allowed!==false||m.additional_cost_eur!==0||
    m.summary?.path!=='cerebro/runtime/rsi-learning-state/last-control-plane-run.json'||
    !/^[a-f0-9]{40}$/.test(m.summary.git_blob||'')||
    !/^[a-f0-9]{64}$/.test(m.summary.sha256||''))
    throw Error('MANIFEST_DENIED');
 const s=m.daily_result?.status;
 if(s!=='ELIGIBLE'&&s!=='NO_DAILY_RESULT')throw Error('DAILY_STATUS');
 if(s==='ELIGIBLE'&&!/^[a-f0-9]{64}$/.test(m.daily_result.lock_key||''))throw Error('DAILY_LOCK');
 if(s==='NO_DAILY_RESULT'&&Object.hasOwn(m.daily_result,'lock_key'))throw Error('DAILY_LOCK');
}
export default {
 async fetch(request,env) {
  if(request.method!=='POST'||new URL(request.url).pathname!=='/v1/publication')
    return new Response(null,{status:404});
  let claims;try{claims=await authorize(request);}catch{return respond({ok:false,reason:'IDENTITY_REJECTED'},403);}
  if(request.headers.get('Content-Type')!=='application/json')return respond({ok:false,reason:'CONTENT_TYPE'},415);
  let raw;try{raw=await request.text();if(raw.length>8192)throw Error('LIMIT');}
  catch{return respond({ok:false,reason:'TOO_LARGE'},413);}
  let m;try{m=JSON.parse(raw);validate(m,claims);}
  catch{return respond({ok:false,reason:'MANIFEST_REJECTED'},422);}
  try{
   const statement=env.ZEUS_DB.prepare("INSERT INTO zeus_lrn_auto_receipts_v1(company_id,engine_id,environment,run_id,run_attempt,publisher_job_id,source_head_sha,state_commit,daily_status,daily_lock_key,manifest) VALUES ('fenix','LRN-001','PREPROD',?,?,?,?,?,?,?,?) ON CONFLICT(company_id,engine_id,environment,run_id,run_attempt) DO NOTHING")
     .bind(String(m.run_id),m.run_attempt,String(m.publisher_job_id),m.source_head_sha,m.state_commit,m.daily_result.status,
       m.daily_result.status==='ELIGIBLE'?m.daily_result.lock_key:null,raw);
   const extra=m.daily_result.status==='ELIGIBLE'?
     env.ZEUS_DB.prepare("INSERT INTO zeus_lrn_auto_daily_v1(company_id,engine_id,environment,daily_lock_key,first_run_id,state_commit) SELECT 'fenix','LRN-001','PREPROD',?,?,? WHERE EXISTS(SELECT 1 FROM zeus_lrn_auto_receipts_v1 WHERE company_id='fenix' AND engine_id='LRN-001' AND environment='PREPROD' AND run_id=? AND run_attempt=? AND manifest=?) ON CONFLICT(company_id,engine_id,environment,daily_lock_key) DO NOTHING")
       .bind(m.daily_result.lock_key,String(m.run_id),m.state_commit,String(m.run_id),m.run_attempt,raw):null;
   const all=await env.ZEUS_DB.batch(extra?[statement,extra]:[statement]);
   const record=await env.ZEUS_DB.prepare("SELECT manifest FROM zeus_lrn_auto_receipts_v1 WHERE company_id='fenix' AND engine_id='LRN-001' AND environment='PREPROD' AND run_id=? AND run_attempt=?")
     .bind(String(m.run_id),m.run_attempt).first();
   if(record?.manifest!==raw)return respond({ok:false,reason:'CONFLICT'},409);
   return respond({ok:true,run_id:m.run_id,run_attempt:m.run_attempt,new_writes:all[0]?.meta?.changes??0,
     new_daily:extra?all[1]?.meta?.changes??0:0,scope:SCOPE});
  }catch{return respond({ok:false,reason:'D1_FAILURE'},503);}
 }
};
