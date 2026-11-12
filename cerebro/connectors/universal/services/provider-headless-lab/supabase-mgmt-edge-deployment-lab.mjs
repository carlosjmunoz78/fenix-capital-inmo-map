// FACT-001 · Supabase isolated LAB Edge lifecycle only. Never imported by deployed broker.
// Runtime policy: no writes to either protected Supabase project, App, CRM or customer data.
// A signed server operator may invoke this ONLY after a separate LAB preview project exists.
export const SUPABASE_PROTECTED_REFS=Object.freeze(['cluhljgonannaafpmblx','hnqlnvakzaywtafeiybt']);
export const SUPABASE_CANARY='cerebro-fact001-sb-mgmt-canary-lab';
const REF=/^[a-z0-9]{15,30}$/;const SHA=/^[a-f0-9]{64}$/;
const fail=s=>{throw Error(s)};
const checked=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function assertSupabaseIsolatedLab({trustedConfig,principal}={}){
 if(!checked(principal)||principal.trusted!==true||principal.client_id!=='cerebro'||principal.company_id!=='fenix-capital'||principal.engine_id!=='FACT-001'||principal.environment!=='LAB'||principal.source!=='github_oidc')fail('SB_LAB_SIGNED_PRINCIPAL_REQUIRED');
 if(!checked(trustedConfig)||trustedConfig.origin!=='CEREBRO_SERVER_PRIVATE_CONFIG'||trustedConfig.environment!=='LAB'||trustedConfig.owner_approved!==true||trustedConfig.max_cost_eur!==0||typeof trustedConfig.project_ref!=='string'||!REF.test(trustedConfig.project_ref)||SUPABASE_PROTECTED_REFS.includes(trustedConfig.project_ref))fail('SB_LAB_SEPARATE_PROJECT_REQUIRED');
 return Object.freeze({project_ref:trustedConfig.project_ref,slug:SUPABASE_CANARY,environment:'LAB'});
}
export const CANARY_SOURCES=Object.freeze({
 v1:"// FACT-001 isolated LAB inert canary V1. Never contacts data, auth, networks or logs.\nDeno.serve(() => new Response(null,{status:404,headers:{'cache-control':'no-store','x-fact001-lab-canary':'v1'}}));\n",
 v2:"// FACT-001 isolated LAB inert canary V2. Never contacts data, auth, networks or logs.\nDeno.serve(() => new Response(null,{status:404,headers:{'cache-control':'no-store','x-fact001-lab-canary':'v2'}}));\n"
});
export async function exerciseSupabaseIsolatedCanary({trustedConfig,principal,managementToken,http=fetch}={}){
 const cfg=assertSupabaseIsolatedLab({trustedConfig,principal});
 if(typeof managementToken!=='string'||managementToken.length<24||managementToken.length>8192||/\s/.test(managementToken)||typeof http!=='function')fail('SB_LAB_PRIVATE_TOKEN_REQUIRED');
 const root='https://api.supabase.com/v1/projects/'+cfg.project_ref+'/functions';
 const target=root+'/'+SUPABASE_CANARY;
 const headers={Authorization:'Bearer '+managementToken,Accept:'application/json'};
 async function query(){
  let resp;try{resp=await http(target,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(15000)})}catch{fail('SB_LAB_READ_FAILED')}
  if(resp.status===404)return {exists:false};
  if(resp.status!==200)fail('SB_LAB_READ_HTTP_'+resp.status);
  let j;try{j=await resp.json()}catch{fail('SB_LAB_BAD_JSON')}
  if(j?.slug!==SUPABASE_CANARY||j.status!=='ACTIVE'||!Number.isSafeInteger(j.version)||j.version<1||!SHA.test(j.ezbr_sha256)||j.verify_jwt!==true)fail('SB_LAB_UNTRUSTED_CANARY_METADATA');
  return {exists:true,sha:j.ezbr_sha256,version:j.version,verify_jwt:j.verify_jwt};
 }
 async function deploy(source){
  const form=new FormData();
  form.append('metadata',JSON.stringify({name:SUPABASE_CANARY,entrypoint_path:'index.ts',verify_jwt:true}));
  form.append('file',new Blob([source],{type:'application/typescript'}),'index.ts');
  let resp;try{resp=await http(root+'/deploy?slug='+SUPABASE_CANARY,{method:'POST',headers,body:form,redirect:'error',signal:AbortSignal.timeout(40000)})}catch{fail('SB_LAB_DEPLOY_FAILED')}
  if(resp.status!==201&&resp.status!==200)fail('SB_LAB_DEPLOY_HTTP_'+resp.status);
  let j;try{j=await resp.json()}catch{fail('SB_LAB_DEPLOY_JSON')}
  if(j?.slug!==SUPABASE_CANARY||j.status!=='ACTIVE'||j.verify_jwt!==true)fail('SB_LAB_DEPLOY_RESPONSE_DENIED');
  return j;
 }
 const first=await query();if(first.exists)fail('SB_LAB_BASELINE_NOT_EMPTY');
 let created=false,updated=false,rolledBack=false,cleaned=false;
 try{
  await deploy(CANARY_SOURCES.v1);created=true;
  const v1=await query();if(!v1.exists)fail('SB_LAB_CREATE_NOT_VERIFIED');
  await deploy(CANARY_SOURCES.v2);updated=true;
  const v2=await query();if(!v2.exists||v2.version<=v1.version||v2.sha===v1.sha)fail('SB_LAB_UPDATE_NOT_VERIFIED');
  await deploy(CANARY_SOURCES.v1);
  const revert=await query();if(!revert.exists||revert.version<=v2.version||revert.sha!==v1.sha)fail('SB_LAB_ROLLBACK_NOT_VERIFIED');
  rolledBack=true;
  // Destruction restricted to the canary created during this exact operation.
  let deletion;try{deletion=await http(target,{method:'DELETE',headers,redirect:'error',signal:AbortSignal.timeout(15000)})}catch{fail('SB_LAB_CLEANUP_UNVERIFIED')}
  if(![200,204].includes(deletion.status))fail('SB_LAB_CLEANUP_HTTP_'+deletion.status);
  const absent=await query();if(absent.exists)fail('SB_LAB_RESIDUAL_CANARY');
  cleaned=true;
  return {status:'VERIFIED_ISOLATED_LAB_CANARY_ONLY',created,updated,rolledBack,cleaned,provider_writes:4,customer_writes:0,protected_projects_modified:0,additional_subscription_eur:0,canary_slug:SUPABASE_CANARY};
 }catch(e){
  // Any uncertain write is NOT automatically retried or claimed as cleaned.
  // Failure requires isolated-canary reconciliation by a signed operator.
  const reason=e instanceof Error&&/^SB_LAB_[A-Z0-9_]+$/.test(e.message)?e.message:'SB_LAB_RECONCILE_REQUIRED';
  throw Error(reason);
 }
}
