import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
import {createRemoteJWKSet,jwtVerify} from "npm:jose@5.10.0";

const U=Deno.env.get('SUPABASE_URL')??'';
const S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const ISSUER='https://token.actions.githubusercontent.com';
const AUD='cerebro-browser-worker-v1';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const REF='refs/heads/promote/browser-work-total-prod-20261025';
const WORKFLOW='.github/workflows/cerebro-browser-work-total-v1-prod.yml';
const PROJECT='cluhljgonannaafpmblx';
const ENV='PROD';
const JWKS=createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

function out(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function bearer(req:Request){const h=req.headers.get('authorization')??'';return h.toLowerCase().startsWith('bearer ')?h.slice(7).trim():'';}
function maskEmail(email:string){const [local,domain]=email.split('@');if(!local||!domain)return'cuenta';return `${local.slice(0,1)}${'*'.repeat(Math.min(6,Math.max(2,local.length-1)))}@${domain}`.slice(0,240);}
function maskAccount(value:string){const v=String(value||'').trim();if(!v)return'cuenta';if(v.includes('@'))return maskEmail(v.toLowerCase());return `${v.slice(0,2)}${'*'.repeat(Math.min(8,Math.max(3,v.length-2)))}`.slice(0,120);}
function normalizedOrigin(raw:unknown){try{const u=new URL(String(raw||''));if(u.protocol!=='https:')return'';return u.origin.toLowerCase();}catch{return'';}}
function profileOrigins(p:any){return Array.isArray(p?.allowed_origins)?[...new Set(p.allowed_origins.map((x:unknown)=>normalizedOrigin(x)).filter(Boolean))]:[];}
function challengeUrl(raw:unknown){const v=String(raw||'').toLowerCase();return /captcha|recaptcha|challenge|webauthn|security[-_]?key|\/mfa(?:\/|$)|\/2fa(?:\/|$)|\/otp(?:\/|$)|verify[-_]?identity|device[-_]?approval/.test(v);}
async function hmac(label:string,value:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(S),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${label}|${value}`)));return Array.from(sig).map(x=>x.toString(16).padStart(2,'0')).join('');}
async function event(sessionId:string,eventType:string,detail:Record<string,unknown>={}){const r=await svc.from('cerebro_browser_event_v3').insert({session_id:sessionId,event_type:eventType,actor:'SYSTEM',detail:{...detail,secret_material_logged:false}});if(r.error)throw r.error;}
async function worker(req:Request){
 if(!U.includes(PROJECT))return{ok:false,error:'PROD_PROJECT_REF_MISMATCH'} as const;
 const token=bearer(req);if(!token)return{ok:false,error:'GITHUB_OIDC_REQUIRED'} as const;
 try{
  const {payload}=await jwtVerify(token,JWKS,{issuer:ISSUER,audience:AUD});
  if(payload.repository!==REPO)return{ok:false,error:'GITHUB_REPOSITORY_DENIED'} as const;
  if(String(payload.ref??'')!==REF)return{ok:false,error:'GITHUB_REF_DENIED'} as const;
  if(String(payload.workflow_ref??'')!==`${REPO}/${WORKFLOW}@${REF}`)return{ok:false,error:'GITHUB_WORKFLOW_DENIED'} as const;
  return{ok:true,worker_id:`github-work-total-v1-prod:${String(payload.run_id??'unknown')}:${String(payload.run_attempt??'1')}`} as const;
 }catch(e){return{ok:false,error:'GITHUB_OIDC_INVALID',detail:e instanceof Error?e.message:String(e)} as const;}
}
async function activeJob(sessionId:string,workerId:string){
 const q=await svc.from('cerebro_browser_job_v2').select('job_id,company_id,environment,identity_id,account_id,browser_profile_id,capability,mode,lease_id,leased_by,lease_expires_at,status').eq('job_id',sessionId).eq('environment',ENV).eq('capability','browser1.interactive').eq('status','LEASED').eq('leased_by',workerId).maybeSingle();
 if(q.error)throw q.error;if(!q.data||Date.parse(q.data.lease_expires_at||'')<=Date.now())throw new Error('INTERACTIVE_JOB_LEASE_NOT_ACTIVE');if(String(q.data.mode)!=='MUTATE')throw new Error('INTERACTIVE_MUTATE_REQUIRED');return q.data;
}
async function profileForJob(job:any){
 const p=await svc.from('cerebro_browser_workspace_profile_v1').select('workspace_profile_id,company_id,environment,identity_id,account_id,browser_profile_id,provider,login_policy,credential_ref_id,verification_state,expected_account_hash,allowed_origins,login_config,active').eq('company_id',job.company_id).eq('environment',ENV).eq('identity_id',job.identity_id).eq('account_id',job.account_id).eq('browser_profile_id',job.browser_profile_id).eq('active',true).maybeSingle();
 if(p.error)throw p.error;if(!p.data)return null;return p.data;
}
function brokerOrigin(p:any){
 const allowed=profileOrigins(p);const provider=String(p?.provider||'').trim().toLowerCase();
 if(provider==='google'&&allowed.includes('https://accounts.google.com'))return'https://accounts.google.com';
 return allowed[0]||'';
}
function findEmail(value:unknown,depth=0):string{
 if(depth>4||value===null||value===undefined)return'';
 if(typeof value==='string'){const v=value.trim().toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?v:'';}
 if(Array.isArray(value)){for(const item of value){const found=findEmail(item,depth+1);if(found)return found;}return'';}
 if(typeof value!=='object')return'';
 const obj=value as Record<string,unknown>;
 for(const [key,nested] of Object.entries(obj)){
  const normalized=key.toLowerCase().replace(/[^a-z0-9]/g,'');
  if(['email','username','user','login','account','identifier'].includes(normalized)){const found=findEmail(nested,depth+1);if(found)return found;}
 }
 for(const nested of Object.values(obj)){const found=findEmail(nested,depth+1);if(found)return found;}
 return'';
}
async function materialize(job:any,w:any){
 const p=await profileForJob(job);if(!p)return{ok:false,error:'WORKSPACE_PROFILE_NOT_FOUND'};
 if(String(p.login_policy)!=='CREDENTIAL_BROKER_ALLOWED'||!p.credential_ref_id)return{ok:false,error:'AUTOLOGIN_NOT_AUTHORIZED_FOR_PROFILE'};
 const provider=String(p.provider||'generic').trim().toLowerCase()||'generic';const origin=brokerOrigin(p);if(!origin)return{ok:false,error:'AUTOLOGIN_ALLOWED_ORIGIN_REQUIRED'};
 const allowed=profileOrigins(p);if(!allowed.includes(origin))return{ok:false,error:'PROFILE_LOGIN_ORIGIN_DENIED'};
 const {data,error}=await svc.rpc('cerebro_browser_credential_materialize_v3',{p_job_id:job.job_id,p_lease_id:job.lease_id,p_worker_id:w.worker_id,p_credential_ref_id:p.credential_ref_id,p_origin:origin});
 if(error)throw error;if(!data?.ok)return data||{ok:false,error:'CREDENTIAL_MATERIALIZATION_FAILED'};
 return{...data,provider,login_origin:origin,allowed_origins:allowed,login_config:p.login_config&&typeof p.login_config==='object'?p.login_config:{},universal_form_autologin:true,secret_material_logged:false};
}
async function confirmCredentialAccount(body:any,w:any){
 const sessionId=String(body?.session_id||'');const observed=String(body?.account_email||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(observed))return{ok:false,error:'ACCOUNT_EMAIL_INVALID'};
 const job=await activeJob(sessionId,w.worker_id);const p=await profileForJob(job);if(!p)return{ok:false,error:'WORKSPACE_PROFILE_NOT_FOUND'};
 const secret=await materialize(job,w);if(!secret?.ok)return secret;
 const credentialEmail=findEmail(secret.secret_payload);(secret as any).secret_payload=null;
 if(!credentialEmail)return{ok:false,error:'CREDENTIAL_IDENTITY_UNAVAILABLE',secret_material_logged:false};
 const scope=`${job.company_id}|${ENV}|${job.identity_id}|${job.account_id}|${job.browser_profile_id}`;const observedHash=await hmac('CEREBRO_BROWSER_ACCOUNT_V1',`${scope}|${observed}`);const hint=maskEmail(observed);const when=new Date().toISOString();
 const expectedMismatch=Boolean(p.expected_account_hash&&p.expected_account_hash!==observedHash);const credentialMismatch=credentialEmail!==observed;
 if(expectedMismatch||credentialMismatch){
  const up=await svc.from('cerebro_browser_workspace_profile_v1').update({verification_state:'MISMATCH',pending_account_hash:observedHash,pending_account_hint:hint,updated_at:when}).eq('workspace_profile_id',p.workspace_profile_id);if(up.error)throw up.error;
  await svc.from('cerebro_browser_session_bundle_v1').update({status:'REVOKED',verification_state:'MISMATCH',revoked_at:when,updated_at:when}).eq('company_id',job.company_id).eq('environment',ENV).eq('browser_profile_id',job.browser_profile_id).eq('status','ACTIVE');
  await event(sessionId,'ACCOUNT_VERIFICATION_OBSERVED',{provider:p.provider,account_hint:hint,status:'MISMATCH',verification_method:'CREDENTIAL_BROKER_EXACT_MATCH'});
  return{ok:true,status:'MISMATCH',account_hint:hint,secret_material_logged:false};
 }
 const up=await svc.from('cerebro_browser_workspace_profile_v1').update({expected_account_hash:observedHash,expected_account_hint:hint,pending_account_hash:null,pending_account_hint:null,verification_state:'VERIFIED',last_verified_at:when,updated_at:when}).eq('workspace_profile_id',p.workspace_profile_id);if(up.error)throw up.error;
 await event(sessionId,'ACCOUNT_VERIFIED',{provider:p.provider,account_hint:hint,verification_method:'CREDENTIAL_BROKER_EXACT_MATCH'});
 return{ok:true,status:'VERIFIED',account_hint:hint,secret_material_logged:false};
}
async function confirmBoundLogin(body:any,w:any){
 const sessionId=String(body?.session_id||'');const finalUrl=String(body?.final_url||'');const finalOrigin=normalizedOrigin(finalUrl);
 const job=await activeJob(sessionId,w.worker_id);const p=await profileForJob(job);if(!p)return{ok:false,error:'WORKSPACE_PROFILE_NOT_FOUND'};
 const allowed=profileOrigins(p);if(!finalOrigin||!allowed.includes(finalOrigin))return{ok:false,error:'BOUND_LOGIN_FINAL_ORIGIN_DENIED'};
 if(challengeUrl(finalUrl))return{ok:false,error:'AUTH_CHALLENGE_REQUIRED'};
 const materialized=await materialize(job,w);if(!materialized?.ok)return materialized;
 const email=findEmail(materialized.secret_payload);(materialized as any).secret_payload=null;
 const when=new Date().toISOString();const hint=maskAccount(email||String(job.account_id||'cuenta'));
 const up=await svc.from('cerebro_browser_workspace_profile_v1').update({expected_account_hint:hint,pending_account_hash:null,pending_account_hint:null,verification_state:'VERIFIED',last_verified_at:when,updated_at:when}).eq('workspace_profile_id',p.workspace_profile_id);if(up.error)throw up.error;
 await event(sessionId,'ACCOUNT_VERIFIED',{provider:p.provider,account_hint:hint,verification_method:'CREDENTIAL_BROKER_AUTH_ACCEPTED',final_origin:finalOrigin});
 return{ok:true,status:'VERIFIED',account_hint:hint,verification_method:'CREDENTIAL_BROKER_AUTH_ACCEPTED',secret_material_logged:false};
}

Deno.serve(async req=>{
 const route=new URL(req.url).pathname.split('/').filter(Boolean).slice(-2).join('/');
 if(req.method==='GET'&&route.endsWith('health'))return out(200,{ok:U.includes(PROJECT),service:'cerebro-browser-work-total-autologin-v1-prod',environment:ENV,schema_version:'1.3.0',credential_materialization:true,interactive_autologin:true,profile_resolved_credential:true,owner_ui_unchanged:true,first_account_auto_confirmation:true,universal_form_autologin:true,allowed_origin_bound:true,login_metadata_separated:true,manual_login_default:false,auth_challenge_requires_human:true,secret_material_exposed_to_frontend:false,trading_access:false,incremental_cost_eur:0});
 if(req.method!=='POST')return out(404,{ok:false,error:'ROUTE_NOT_AVAILABLE'});
 const w=await worker(req);if(!w.ok)return out(403,w);let body:any={};try{body=await req.json();}catch{}
 try{
  if(route==='worker/materialize'){const job=await activeJob(String(body?.session_id||''),w.worker_id);return out(200,await materialize(job,w));}
  if(route==='worker/confirm-account')return out(200,await confirmCredentialAccount(body,w));
  if(route==='worker/confirm-bound-login')return out(200,await confirmBoundLogin(body,w));
  return out(404,{ok:false,error:'AUTOLOGIN_ROUTE_NOT_AVAILABLE'});
 }catch(e){return out(400,{ok:false,error:'AUTOLOGIN_OPERATION_FAILED',detail:e instanceof Error?e.message:String(e)});}
});