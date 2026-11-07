/**
 * CUT64 · Anonymous GET-only security probe of existing owner gates.
 * NEVER sends bearer/api keys/cookies, redirects, bodies or POST requests.
 * Never logs headers, response bodies, cookies, private URLs or access params.
 * A 401/403 from platform does NOT prove E2E function-level owner handling.
 */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
export const PROBE_PLAN = Object.freeze([
 {id:'JARVIS_WORK_OWNER_HEALTH',url:'https://cluhljgonannaafpmblx.supabase.co/functions/v1/jarvis-work-gateway-v1/health',route_type:'SUPABASE_JARVIS_OWNER_ONLY'},
 {id:'JARVIS_GIT_OWNER_HEALTH',url:'https://cluhljgonannaafpmblx.supabase.co/functions/v1/jarvis-git-gateway-v1/health',route_type:'SUPABASE_JARVIS_OWNER_ONLY'},
 {id:'CUT30_EXISTING_ACCESS_OWNER_CHECK_READONLY',url:'https://cerebro-jarvis-lab-eu.carlosj-munozcabeza.workers.dev/__jarvis/owner-check',route_type:'CLOUDFLARE_ACCESS_OWNER_ONLY'}
]);
export function classifyHttpStatus({status,accessLoginRedirect=false}){
 if(status===401||status===403)return 'ANONYMOUS_REQUEST_DENIED_BY_SOME_LAYER';
 if([301,302,303,307,308].includes(status))return accessLoginRedirect
  ? 'CLOUDFLARE_ACCESS_LOGIN_CHALLENGE_PRESENT'
  : 'REDIRECT_NOT_PROOF_OF_AUTHORIZATION';
 if(status>=200&&status<300)return 'ANONYMOUS_HTTP_SUCCESS_MANUAL_SECURITY_REVIEW';
 if(status===404||status===410)return 'ENDPOINT_NOT_AVAILABLE_NOT_AUTH_PROOF';
 if(status===405)return 'METHOD_NOT_ALLOWED_NOT_AUTH_PROOF';
 if(status===0)return 'TRANSPORT_FAILURE_NOT_AUTH_PROOF';
 return 'INCONCLUSIVE_NOT_AUTH_PROOF';
}
export function assertProbePlan(plan){
 if(!Array.isArray(plan)||plan.length!==3)throw Error('PROBE_PLAN_CARDINALITY');
 const uniq=new Set();
 for(const p of plan){
  const u=new URL(p.url);
  if(!['JARVIS_WORK_OWNER_HEALTH','JARVIS_GIT_OWNER_HEALTH','CUT30_EXISTING_ACCESS_OWNER_CHECK_READONLY'].includes(p.id)||
    uniq.has(p.id)||
    u.protocol!=='https:'||u.username||u.password||u.search||u.hash||
    !(u.hostname==='cluhljgonannaafpmblx.supabase.co'||u.hostname==='cerebro-jarvis-lab-eu.carlosj-munozcabeza.workers.dev')||
    !['SUPABASE_JARVIS_OWNER_ONLY','CLOUDFLARE_ACCESS_OWNER_ONLY'].includes(p.route_type))
   throw Error('NONALLOWLISTED_OR_UNSAFE_PROBE');
  const path=u.pathname;
  if(p.route_type==='SUPABASE_JARVIS_OWNER_ONLY' && ![
    '/functions/v1/jarvis-work-gateway-v1/health',
    '/functions/v1/jarvis-git-gateway-v1/health'].includes(path))throw Error('UNSAFE_SUPABASE_PATH');
  if(p.route_type==='CLOUDFLARE_ACCESS_OWNER_ONLY' && path!=='/__jarvis/owner-check')
   throw Error('UNSAFE_WORKER_PATH');
  uniq.add(p.id);
 }
 if(uniq.size!==3)throw Error('PROBE_PLAN_MISSING');
 return true;
}
const isCloudflareLogin=location=>{
 if(!location||typeof location!=='string')return false;
 try{
  const u=new URL(location);
  return u.protocol==='https:' &&
    (u.hostname.endsWith('.cloudflareaccess.com') ||
     u.pathname.startsWith('/cdn-cgi/access/login'));
 }catch{return false;}
};
export async function runAnonymousGetProbes(fetchImpl=fetch){
 assertProbePlan(PROBE_PLAN);
 const results=[];
 for(const p of PROBE_PLAN){
  let status=0,login=false,transport_error=false;
  try{
   // Deliberately provide NO headers, body, tokens, cookies, proxy creds, service_role.
   const response=await fetchImpl(p.url,{
    method:'GET',redirect:'manual',credentials:'omit',cache:'no-store',
    signal:AbortSignal.timeout(10000)
   });
   status=response.status;
   // Inspect only whether the redirect is to Cloudflare Access. Never record its value.
   login=isCloudflareLogin(response.headers.get('location'));
   // No body read; discard the response. No response headers logged.
   await response.body?.cancel?.().catch(()=>{});
  }catch{transport_error=true;}
  results.push(Object.freeze({
   id:p.id,route_type:p.route_type,anonymous:true,method:'GET',
   bearer_sent:false,api_key_sent:false,cookies_sent:false,
   followed_redirects:false,body_read:false,
   http_status:status,cloudflare_access_login_redirect:login,
   conclusion:classifyHttpStatus({status,accessLoginRedirect:login}),
   transport_error
  }));
 }
 return Object.freeze({
  schema:'jarvis.cut64.anonymous.safe.get.probe.report.v1',
  company_id:'fenix',engine_id:'JARVIS',environment:'LAB',
  version:'CUT64-v0.1',observation_context_date:'2026-11-07',
  origin:'GITHUB_ACTIONS_NO_USER_SESSION_NO_SECRETS',
  probes:results,
  direct_prod_data_access_attempted:false,
  authorization_test_scope:'ANONYMOUS_GET_ONLY',
  b2_owner_grant_verified:false,b3_owner_grant_verified:false,
  owner_authenticated_path_verified:false,
  no_redirect_followed:true,
  post_mutations:0,prod_data_writes:0,
  run_has_production_release_authority:false,
  prod_write_authorized:false,
  security_attention:results.some(x=>x.conclusion==='ANONYMOUS_HTTP_SUCCESS_MANUAL_SECURITY_REVIEW')
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3)throw Error('REPORT_PATH_REQUIRED');
 const x=await runAnonymousGetProbes();
 fs.writeFileSync(process.argv[2],JSON.stringify(x,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({probes:x.probes.map(y=>({id:y.id,status:y.http_status,conclusion:y.conclusion})),
  prod_writes:0,owner_authenticated:false,security_attention:x.security_attention}));
 // An unexpected HTTP 2xx on a purported owner gate is a hard fail.
 if(x.security_attention)process.exitCode=2;
}
