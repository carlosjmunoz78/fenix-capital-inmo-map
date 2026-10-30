import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
import {createRemoteJWKSet,jwtVerify} from "npm:jose@5.10.0";

const U=Deno.env.get('SUPABASE_URL')??'';
const S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const ISSUER='https://token.actions.githubusercontent.com';
const AUD='cerebro-browser-worker-v1';
const REPOSITORIES=new Set([
  'carlosjmunoz78/fenix-capital-inmo-map',
  'fenix-cerebro/fenix-capital-inmo-map'
]);
const LEGACY_REF='refs/heads/promote/browser-work-total-prod-20261025';
const LEGACY_WORKFLOW='.github/workflows/cerebro-browser-work-total-v1-prod.yml';
const LIVE_REF='refs/heads/main';
const LIVE_WORKFLOW='.github/workflows/cerebro-browser-job-runner-v2-live.yml';
const PROJECT='cluhljgonannaafpmblx';
const ENV='PROD';
const BUNDLE_TTL_MS=14*24*60*60*1000;
const VERIFIED='VERIFIED';
const JWKS=createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

function out(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function bearer(req:Request){const v=req.headers.get('authorization')??'';return v.toLowerCase().startsWith('bearer ')?v.slice(7).trim():'';}
function base64(bytes:Uint8Array){let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return btoa(binary);}
function cleanUrl(raw:unknown){try{const u=new URL(String(raw||''));u.username='';u.password='';u.search='';u.hash='';return u.toString();}catch{return'';}}
function cleanTabs(raw:unknown){return Array.isArray(raw)?raw.slice(0,8).map((t:any,index)=>({index:Number.isInteger(t?.index)?t.index:index,url:cleanUrl(t?.url),title:String(t?.title||'').slice(0,240),active:t?.active===true})):[];}
function maskEmail(email:string){const [local,domain]=email.split('@');if(!local||!domain)return'cuenta-google';return `${local.slice(0,1)}${'*'.repeat(Math.min(6,Math.max(2,local.length-1)))}@${domain}`.slice(0,240);}
async function worker(req:Request){
 if(!U.includes(PROJECT))return{ok:false,error:'PROD_PROJECT_REF_MISMATCH'} as const;
 const token=bearer(req);if(!token)return{ok:false,error:'GITHUB_OIDC_REQUIRED'} as const;
 try{
  const {payload}=await jwtVerify(token,JWKS,{issuer:ISSUER,audience:AUD});
  const repository=String(payload.repository??'');
  if(!REPOSITORIES.has(repository))return{ok:false,error:'GITHUB_REPOSITORY_DENIED'} as const;
  const ref=String(payload.ref??'');
  const workflowRef=String(payload.workflow_ref??'');
  const runId=String(payload.run_id??'unknown');
  const runAttempt=String(payload.run_attempt??'1');
  if(ref===LEGACY_REF&&workflowRef===`${repository}/${LEGACY_WORKFLOW}@${LEGACY_REF}`)return{ok:true,repository,worker_kind:'LEGACY',worker_id:`github-work-total-v1-prod:${runId}:${runAttempt}`} as const;
  if(ref===LIVE_REF&&workflowRef===`${repository}/${LIVE_WORKFLOW}@${LIVE_REF}`)return{ok:true,repository,worker_kind:'LIVE',worker_id:`github:${runId}:${runAttempt}`} as const;
  return{ok:false,error:'GITHUB_WORKFLOW_OR_REF_DENIED'} as const;
 }catch(e){return{ok:false,error:'GITHUB_OIDC_INVALID',detail:e instanceof Error?e.message:String(e)} as const;}
}
async function hmac(label:string,value:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(S),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${label}|${value}`)));return Array.from(sig).map(x=>x.toString(16).padStart(2,'0')).join('');}
async function bundleKey(bundleId:string,scope:string){const hex=await hmac('CEREBRO_BROWSER_BUNDLE_V1',`${bundleId}|${scope}`);return base64(Uint8Array.from(hex.match(/../g)!.map(x=>parseInt(x,16))));}
async function event(sessionId:string,eventType:string,detail:Record<string,unknown>={}){const r=await svc.from('cerebro_browser_event_v3').insert({session_id:sessionId,event_type:eventType,actor:'SYSTEM',detail:{...detail,secret_material_logged:false}});if(r.error)throw r.error;}
async function activeJob(sessionId:string,w:any){
 const q=await svc.from('cerebro_browser_job_v2').select('job_id,company_id,environment,identity_id,account_id,browser_profile_id,capability,lease_id,leased_by,lease_expires_at,status').eq('job_id',sessionId).eq('environment',ENV).eq('capability','browser1.interactive').eq('status','LEASED').maybeSingle();if(q.error)throw q.error;if(!q.data||Date.parse(q.data.lease_expires_at||'')<=Date.now())throw new Error('INTERACTIVE_JOB_LEASE_NOT_ACTIVE');
 const leasedBy=String(q.data.leased_by||'');const workerMatch=w.worker_kind==='LIVE'?leasedBy.startsWith(`${w.worker_id}:slot-`):leasedBy===w.worker_id;if(!workerMatch)throw new Error('INTERACTIVE_JOB_WORKER_MISMATCH');
 const scope=`${q.data.company_id}::${ENV}::${q.data.browser_profile_id}`;const p=await svc.from('cerebro_browser_profile_lease_v2').select('lease_id,worker_id,lease_expires_at').eq('scope_key',scope).eq('job_id',sessionId).eq('lease_id',q.data.lease_id).eq('worker_id',leasedBy).maybeSingle();if(p.error)throw p.error;if(!p.data||Date.parse(p.data.lease_expires_at||'')<=Date.now())throw new Error('PROFILE_LEASE_NOT_ACTIVE');return q.data;
}
async function profile(job:any){const r=await svc.from('cerebro_browser_workspace_profile_v1').select('workspace_profile_id,provider,display_label,login_policy,verification_state,expected_account_hash,expected_account_hint,pending_account_hash,pending_account_hint').eq('company_id',job.company_id).eq('environment',ENV).eq('identity_id',job.identity_id).eq('account_id',job.account_id).eq('browser_profile_id',job.browser_profile_id).eq('active',true).maybeSingle();if(r.error)throw r.error;return r.data||null;}
function requireVerifiedProfile(p:any){const state=String(p?.verification_state||'UNVERIFIED');if(state!==VERIFIED)throw new Error(`WORKSPACE_IDENTITY_NOT_VERIFIED:${state}`);return state;}
async function revokeActiveBundles(job:any,verificationState:string){const when=new Date().toISOString();const r=await svc.from('cerebro_browser_session_bundle_v1').update({verification_state:verificationState,status:'REVOKED',revoked_at:when,updated_at:when}).eq('company_id',job.company_id).eq('environment',ENV).eq('browser_profile_id',job.browser_profile_id).eq('status','ACTIVE');if(r.error)throw r.error;}
async function prepareSave(body:any,w:any){const job=await activeJob(String(body?.session_id||''),w);const p=await profile(job);requireVerifiedProfile(p);const bundleId=crypto.randomUUID();const scope=`${job.company_id}|${ENV}|${job.identity_id}|${job.account_id}|${job.browser_profile_id}`;return{ok:true,bundle_id:bundleId,key_b64:await bundleKey(bundleId,scope),expires_at:new Date(Date.now()+BUNDLE_TTL_MS).toISOString(),verification_state:VERIFIED,secret_material_logged:false};}
async function commitSave(body:any,w:any){
 const sessionId=String(body?.session_id||'');const job=await activeJob(sessionId,w);const bundleId=String(body?.bundle_id||'');const ciphertext=String(body?.bundle_ciphertext||''),iv=String(body?.bundle_iv||''),sha=String(body?.bundle_sha256||''),expiresAt=String(body?.expires_at||'');
 if(!/^[0-9a-f-]{36}$/i.test(bundleId)||!ciphertext||ciphertext.length>7000000||!iv||iv.length>128||!/^[0-9a-f]{64}$/i.test(sha))throw new Error('BUNDLE_PAYLOAD_INVALID');if(!expiresAt||Date.parse(expiresAt)<=Date.now()||Date.parse(expiresAt)>Date.now()+BUNDLE_TTL_MS+60_000)throw new Error('BUNDLE_EXPIRY_INVALID');
 const p=await profile(job);requireVerifiedProfile(p);const when=new Date().toISOString();
 await svc.from('cerebro_browser_session_bundle_v1').update({status:'REVOKED',revoked_at:when,updated_at:when}).eq('company_id',job.company_id).eq('environment',ENV).eq('browser_profile_id',job.browser_profile_id).eq('status','ACTIVE');
 const row={bundle_id:bundleId,company_id:job.company_id,environment:ENV,identity_id:job.identity_id,account_id:job.account_id,browser_profile_id:job.browser_profile_id,provider:p?.provider||null,source_session_id:sessionId,bundle_ciphertext:ciphertext,bundle_iv:iv,bundle_sha256:sha,tabs:cleanTabs(body?.tabs),active_tab_index:Number.isInteger(body?.active_tab_index)?body.active_tab_index:null,cookie_count:Math.max(0,Number(body?.cookie_count||0)),origin_count:Math.max(0,Number(body?.origin_count||0)),verification_state:VERIFIED,verified_account_hint:p?.expected_account_hint||null,verified_account_hash:p?.expected_account_hash||null,verification_method:String(p?.provider||'')==='owner'?'OWNER_PROFILE_BINDING':'WORK_TOTAL_V1_ACCOUNT_HMAC',status:'ACTIVE',expires_at:expiresAt,last_verified_at:when};
 const ins=await svc.from('cerebro_browser_session_bundle_v1').insert(row).select('bundle_id,status,verification_state,expires_at').single();if(ins.error)throw ins.error;await event(sessionId,'SESSION_HIBERNATED',{bundle_id:bundleId,browser_profile_id:job.browser_profile_id,cookie_count:row.cookie_count,origin_count:row.origin_count,verification_state:VERIFIED});return{ok:true,bundle:ins.data,secret_material_logged:false};
}
async function restore(body:any,w:any){
 const sessionId=String(body?.session_id||'');const job=await activeJob(sessionId,w);const p=await profile(job);const r=await svc.from('cerebro_browser_session_bundle_v1').select('bundle_id,bundle_ciphertext,bundle_iv,bundle_sha256,tabs,active_tab_index,cookie_count,origin_count,verification_state,verified_account_hint,verified_account_hash,expires_at').eq('company_id',job.company_id).eq('environment',ENV).eq('identity_id',job.identity_id).eq('account_id',job.account_id).eq('browser_profile_id',job.browser_profile_id).eq('status','ACTIVE').order('updated_at',{ascending:false}).limit(1).maybeSingle();if(r.error)throw r.error;
 if(!r.data)return{ok:true,bundle:null,reason:'NO_ACTIVE_BUNDLE',profile:{provider:p?.provider||null,verification_state:p?.verification_state||'UNVERIFIED'}};if(Date.parse(r.data.expires_at)<=Date.now()){await svc.from('cerebro_browser_session_bundle_v1').update({status:'EXPIRED',updated_at:new Date().toISOString()}).eq('bundle_id',r.data.bundle_id);await event(sessionId,'SESSION_EXPIRED',{bundle_id:r.data.bundle_id});return{ok:true,bundle:null,reason:'BUNDLE_EXPIRED'};}
 const profileState=String(p?.verification_state||'UNVERIFIED'),bundleState=String(r.data.verification_state||'UNVERIFIED');if(profileState!==VERIFIED||bundleState!==VERIFIED)return{ok:true,bundle:null,reason:`IDENTITY_NOT_VERIFIED:${profileState}:${bundleState}`,profile:{provider:p?.provider||null,verification_state:profileState}};const scope=`${job.company_id}|${ENV}|${job.identity_id}|${job.account_id}|${job.browser_profile_id}`;return{ok:true,bundle:{...r.data,verification_state:VERIFIED,key_b64:await bundleKey(String(r.data.bundle_id),scope)},profile:{provider:p?.provider||null,verification_state:VERIFIED,expected_account_hint:p?.expected_account_hint||null},secret_material_logged:false};
}
async function restoreComplete(body:any,w:any){const sessionId=String(body?.session_id||'');const job=await activeJob(sessionId,w);const bundleId=String(body?.bundle_id||'');const r=await svc.from('cerebro_browser_session_bundle_v1').update({updated_at:new Date().toISOString()}).eq('bundle_id',bundleId).eq('company_id',job.company_id).eq('environment',ENV).eq('browser_profile_id',job.browser_profile_id).eq('status','ACTIVE').eq('verification_state',VERIFIED).select('bundle_id').maybeSingle();if(r.error)throw r.error;if(!r.data)return{ok:false,error:'BUNDLE_SCOPE_OR_VERIFICATION_MISMATCH'};await event(sessionId,'SESSION_RESUMED',{bundle_id:bundleId,browser_profile_id:job.browser_profile_id});return{ok:true,bundle_id:bundleId};}
async function profileState(body:any,w:any){const job=await activeJob(String(body?.session_id||''),w);const p=await profile(job);return{ok:true,profile:p?{provider:p.provider,display_label:p.display_label,login_policy:p.login_policy,verification_state:p.verification_state,expected_account_hint:p.expected_account_hint}:null};}
async function observeAccount(body:any,w:any){
 const sessionId=String(body?.session_id||'');const job=await activeJob(sessionId,w);const p=await profile(job);if(!p)return{ok:false,error:'WORKSPACE_PROFILE_NOT_FOUND'};if(String(p.provider)!=='google')return{ok:true,status:String(p.verification_state||'UNVERIFIED'),provider:p.provider};
 if(body?.reauth_required===true){const up=await svc.from('cerebro_browser_workspace_profile_v1').update({verification_state:'REAUTH_REQUIRED',pending_account_hash:null,pending_account_hint:null,updated_at:new Date().toISOString()}).eq('workspace_profile_id',p.workspace_profile_id);if(up.error)throw up.error;await revokeActiveBundles(job,'REAUTH_REQUIRED');await event(sessionId,'REAUTH_REQUIRED',{provider:'google'});return{ok:true,status:'REAUTH_REQUIRED'};}
 const email=String(body?.account_email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return{ok:false,error:'ACCOUNT_EMAIL_INVALID'};const scope=`${job.company_id}|${ENV}|${job.identity_id}|${job.account_id}|${job.browser_profile_id}`;const hash=await hmac('CEREBRO_BROWSER_ACCOUNT_V1',`${scope}|${email}`);const hint=maskEmail(email);const status=p.expected_account_hash?(p.expected_account_hash===hash?'VERIFIED':'MISMATCH'):'PENDING_CONFIRMATION';const patch:any={pending_account_hash:hash,pending_account_hint:hint,verification_state:status,updated_at:new Date().toISOString()};if(status==='VERIFIED')patch.last_verified_at=new Date().toISOString();const up=await svc.from('cerebro_browser_workspace_profile_v1').update(patch).eq('workspace_profile_id',p.workspace_profile_id);if(up.error)throw up.error;if(status==='MISMATCH')await revokeActiveBundles(job,'MISMATCH');await event(sessionId,'ACCOUNT_VERIFICATION_OBSERVED',{provider:'google',account_hint:hint,status});if(status==='VERIFIED')await event(sessionId,'ACCOUNT_VERIFIED',{provider:'google',account_hint:hint});return{ok:true,status,account_hint:hint,secret_material_logged:false};
}
Deno.serve(async req=>{
 const route=new URL(req.url).pathname.split('/').filter(Boolean).slice(-2).join('/');if(req.method==='GET'&&route.endsWith('health'))return out(200,{ok:U.includes(PROJECT),service:'cerebro-browser-work-total-v1-prod',environment:ENV,schema_version:'1.2.1',session_bundles:'AES-256-GCM',account_binding:'OWNER_PROFILE_OR_HMAC',identity_gate:'VERIFIED_ONLY_FAIL_CLOSED',repository_allowlist:[...REPOSITORIES],profile_isolation:true,legacy_branch_ref:LEGACY_REF,live_branch_ref:LIVE_REF,live_workflow:LIVE_WORKFLOW,prod_write_authorized:true,trading_access:false,incremental_cost_eur:0});if(req.method!=='POST')return out(404,{ok:false,error:'ROUTE_NOT_AVAILABLE'});const w=await worker(req);if(!w.ok)return out(403,w);let body:any={};try{body=await req.json();}catch{}
 try{if(route==='worker/prepare-save')return out(200,await prepareSave(body,w));if(route==='worker/commit-save')return out(200,await commitSave(body,w));if(route==='worker/restore')return out(200,await restore(body,w));if(route==='worker/restore-complete')return out(200,await restoreComplete(body,w));if(route==='worker/profile-state')return out(200,await profileState(body,w));if(route==='worker/observe-account')return out(200,await observeAccount(body,w));return out(404,{ok:false,error:'WORK_TOTAL_BROKER_ROUTE_NOT_AVAILABLE'});}catch(e){return out(400,{ok:false,error:'BROWSER_WORK_TOTAL_V1_PROD_OPERATION_FAILED',detail:e instanceof Error?e.message:String(e)});}
});
