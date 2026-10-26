import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
import {createRemoteJWKSet,jwtVerify} from "npm:jose@5.10.0";

const U=Deno.env.get('SUPABASE_URL')??'';
const S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const ISSUER='https://token.actions.githubusercontent.com';
const AUD='cerebro-browser-worker-v1';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const FEATURE_REF='refs/heads/feat/browser-work-total-v1-20261024';
const FINAL_REF='refs/heads/promote/browser-work-total-prod-20261025';
const CANARY_REF='refs/heads/preprod/browser-autologin-universal-v1-20261026';
const REFS=new Set([FEATURE_REF,FINAL_REF,CANARY_REF]);
const WORKFLOW='.github/workflows/cerebro-browser-work-total-v1-preprod.yml';
const PROJECT='hnqlnvakzaywtafeiybt';
const FEATURE_PREFIX='browser-work-total-v1-legacy-';
const FINAL_PREFIX='browser-work-total-v1-final-';
const CANARY_PREFIX='browser-autologin-universal-v1-canary-';
const CANARY_IDENTITY='iam:browser-phase1-synthetic';
const CANARY_ACCOUNT='acct:browser-phase1-synthetic';
const CANARY_PROFILE='b1-fenix-iam_browser-phase1-synthetic-acct_browser-phase1-synthetic-PREPROD';
const CANARY_TARGET='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-browser-autologin-canary-preprod';
const JWKS=createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));
function out(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function bearer(req:Request){const h=req.headers.get('authorization')??'';return h.toLowerCase().startsWith('bearer ')?h.slice(7).trim():'';}
function prefixForRef(ref:string){return ref===FINAL_REF?FINAL_PREFIX:ref===CANARY_REF?CANARY_PREFIX:FEATURE_PREFIX;}
function safe(value:unknown){return String(value??'').replace(/[^a-zA-Z0-9._:-]/g,'_').slice(0,120);}
async function worker(req:Request){
  if(!U.includes(PROJECT))return{ok:false,error:'PREPROD_PROJECT_REF_MISMATCH'} as const;
  const token=bearer(req);if(!token)return{ok:false,error:'GITHUB_OIDC_REQUIRED'} as const;
  try{
    const {payload}=await jwtVerify(token,JWKS,{issuer:ISSUER,audience:AUD});
    if(payload.repository!==REPO)return{ok:false,error:'GITHUB_REPOSITORY_DENIED'} as const;
    const ref=String(payload.ref??'');
    if(!REFS.has(ref))return{ok:false,error:'GITHUB_REF_DENIED'} as const;
    if(String(payload.workflow_ref??'')!==`${REPO}/${WORKFLOW}@${ref}`)return{ok:false,error:'GITHUB_WORKFLOW_DENIED'} as const;
    return{ok:true,ref,prefix:prefixForRef(ref),worker_id:`github-work-total-v1-preprod:${String(payload.run_id??'unknown')}:${String(payload.run_attempt??'1')}`} as const;
  }catch(e){return{ok:false,error:'GITHUB_OIDC_INVALID',detail:e instanceof Error?e.message:String(e)} as const;}
}
async function status(prefix:string){
  const base=await svc.rpc('cerebro_browser_status_v2',{p_environment:'PREPROD'});if(base.error)throw base.error;
  const jobs=await svc.from('cerebro_browser_job_v2').select('status').eq('environment','PREPROD').eq('capability','browser1.interactive').like('idempotency_key',`${prefix}%`);if(jobs.error)throw jobs.error;
  const states:Record<string,number>={};for(const row of jobs.data||[]){const key=String(row.status||'UNKNOWN');states[key]=(states[key]||0)+1;}
  return{...base.data,ok:true,states,work_total_v1:true,lease_prefix:prefix,status_scope:'WORK_TOTAL_V1_BRANCH_ISOLATED'};
}
async function seedCanary(body:any,w:{ref:string,prefix:string,worker_id:string}){
  if(w.ref!==CANARY_REF)throw new Error('AUTOLOGIN_CANARY_REF_REQUIRED');
  const phase=String(body?.phase||'login').toLowerCase()==='restore'?'restore':'login';
  const pending=await svc.from('cerebro_browser_job_v2').select('job_id,status').eq('environment','PREPROD').eq('capability','browser1.interactive').like('idempotency_key',`${CANARY_PREFIX}%`).in('status',['QUEUED','RETRY_WAIT','LEASED']);
  if(pending.error)throw pending.error;if((pending.data||[]).length)throw new Error('AUTOLOGIN_CANARY_QUEUE_NOT_EMPTY');
  const p=await svc.from('cerebro_browser_workspace_profile_v1').select('workspace_profile_id,provider,login_policy,credential_ref_id,active').eq('company_id','fenix').eq('environment','PREPROD').eq('identity_id',CANARY_IDENTITY).eq('account_id',CANARY_ACCOUNT).eq('browser_profile_id',CANARY_PROFILE).maybeSingle();
  if(p.error)throw p.error;if(!p.data||p.data.active!==true||String(p.data.provider)!=='synthetic'||String(p.data.login_policy)!=='CREDENTIAL_BROKER_ALLOWED'||!p.data.credential_ref_id)throw new Error('AUTOLOGIN_CANARY_PROFILE_NOT_READY');
  const now=new Date().toISOString();
  if(phase==='login'){
    const revoke=await svc.from('cerebro_browser_session_bundle_v1').update({status:'REVOKED',revoked_at:now,updated_at:now}).eq('company_id','fenix').eq('environment','PREPROD').eq('browser_profile_id',CANARY_PROFILE).eq('status','ACTIVE');if(revoke.error)throw revoke.error;
    const reset=await svc.from('cerebro_browser_workspace_profile_v1').update({verification_state:'UNVERIFIED',updated_at:now}).eq('workspace_profile_id',p.data.workspace_profile_id);if(reset.error)throw reset.error;
  }
  const nonce=safe(body?.canary_id||`${Date.now()}-${crypto.randomUUID()}`);
  const idem=`${CANARY_PREFIX}${nonce}-${phase}`;
  const authority={canonical_engine_ids:['CONSOLE-001'],browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true,attestation_source:`AUTOLOGIN_UNIVERSAL_CANARY_PREPROD_${phase.toUpperCase()}`},engine_authority:{browser_use_authorized:true,operation_authorized:true,prod_mutation_authorized:false,promotion_gate_green:false,rollback_ready:true,observability_ready:true,audit_ready:true,idempotency_proven:false},kill_switch_enabled:true};
  const enq=await svc.rpc('cerebro_browser_enqueue_v2',{p_idempotency_key:idem,p_company_id:'fenix',p_engine_id:'CONSOLE-001',p_department_id:'cerebro',p_environment:'PREPROD',p_version:'work-total-v1',p_mode:'MUTATE',p_identity_id:CANARY_IDENTITY,p_account_id:CANARY_ACCOUNT,p_browser_profile_id:CANARY_PROFILE,p_credential_ref_id:null,p_target_url:CANARY_TARGET,p_commands:[{command:'goto',url:CANARY_TARGET},{command:'wait',ms:500}],p_authority:authority,p_priority:100,p_risk:'LOW',p_capability:'browser1.interactive',p_expected_cost_eur:0,p_timeout_seconds:900,p_max_attempts:1,p_audit_id:idem,p_created_by:'SYSTEM:AUTOLOGIN_CANARY'});if(enq.error)throw enq.error;
  const jobId=String(enq.data?.job_id||'');if(!jobId)throw new Error('AUTOLOGIN_CANARY_JOB_ID_MISSING');
  const existing=await svc.from('cerebro_browser_session_v3').select('session_id').eq('session_id',jobId).maybeSingle();if(existing.error)throw existing.error;
  if(!existing.data){const ins=await svc.from('cerebro_browser_session_v3').insert({session_id:jobId,job_id:jobId,company_id:'fenix',engine_id:'CONSOLE-001',department_id:'cerebro',environment:'PREPROD',version:'work-total-v1',identity_id:CANARY_IDENTITY,account_id:CANARY_ACCOUNT,browser_profile_id:CANARY_PROFILE,state:'CONNECTING',control_owner:'NONE',expires_at:new Date(Date.now()+15*60_000).toISOString()});if(ins.error)throw ins.error;const ev=await svc.from('cerebro_browser_event_v3').insert({session_id:jobId,event_type:'SESSION_OPENED',actor:'SYSTEM',detail:{source:'AUTOLOGIN_CANARY_SEED',phase,secret_material_logged:false}});if(ev.error)throw ev.error;}
  return{ok:true,job_id:jobId,idempotency_key:idem,phase,provider:'synthetic',credential_broker_expected:phase==='login',verified_bundle_restore_expected:phase==='restore',prod_execution:false,secret_material_logged:false};
}
Deno.serve(async req=>{
  const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)??'';
  if(req.method==='GET'&&route==='health')return out(200,{ok:true,service:'cerebro-browser-work-total-dispatch-v1-preprod',environment:'PREPROD',branch_refs:[...REFS],branch_isolated_prefixes:{feature:FEATURE_PREFIX,final:FINAL_PREFIX,autologin_canary:CANARY_PREFIX},deterministic_canary_seed:true,credential_materialization:false,prod_access:false,trading_access:false,incremental_cost_eur:0});
  if(req.method!=='POST')return out(404,{ok:false,error:'ROUTE_NOT_AVAILABLE'});
  const w=await worker(req);if(!w.ok)return out(403,w);
  let body:any={};try{body=await req.json();}catch{}
  try{
    if(route==='phase2-canary-seed')return out(200,await seedCanary(body,w));
    if(route==='lease-v2'){
      const {data,error}=await svc.rpc('cerebro_browser_lease_benchmark_v2',{p_worker_id:w.worker_id,p_environment:'PREPROD',p_idempotency_prefix:w.prefix,p_lease_seconds:300});if(error)throw error;
      if(data?.job&&String(data.job.capability||'')!=='browser1.interactive')return out(409,{ok:false,error:'NON_INTERACTIVE_JOB_LEASED'});
      return out(200,{...data,worker_id:w.worker_id,work_total_v1:true,lease_prefix:w.prefix,branch_ref:w.ref});
    }
    if(route==='heartbeat-v2'){const {data,error}=await svc.rpc('cerebro_browser_heartbeat_v2',{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:w.worker_id,p_extend_seconds:Number(body.extend_seconds||300)});if(error)throw error;return out(200,data);}
    if(route==='complete-v2'){const {data,error}=await svc.rpc('cerebro_browser_complete_v2',{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:w.worker_id,p_outcome:String(body.outcome||'FAILED'),p_result_summary:body.result_summary??null,p_error_code:body.error_code??null,p_retryable:body.retryable!==false});if(error)throw error;return out(200,data);}
    if(route==='metrics-v2'){const {data,error}=await svc.rpc('cerebro_browser_metrics_insert_v2',{p_run_id:String(body.run_id||'work-total-v1-preprod'),p_worker_id:w.worker_id,p_environment:'PREPROD',p_stage_concurrency:Number(body.stage_concurrency||1),p_job_id:body.job_id,p_company_id:body.company_id,p_department_id:body.department_id,p_browser_profile_id:body.browser_profile_id,p_started_at:body.started_at,p_finished_at:body.finished_at,p_duration_ms:Number(body.duration_ms||0),p_rss_start_bytes:Number(body.rss_start_bytes||0),p_rss_end_bytes:Number(body.rss_end_bytes||0),p_heap_used_start_bytes:Number(body.heap_used_start_bytes||0),p_heap_used_end_bytes:Number(body.heap_used_end_bytes||0),p_cpu_user_micros:Number(body.cpu_user_micros||0),p_cpu_system_micros:Number(body.cpu_system_micros||0),p_outcome:String(body.outcome||'UNKNOWN')});if(error)throw error;return out(200,data);}
    if(route==='status-v2')return out(200,await status(w.prefix));
    return out(404,{ok:false,error:'WORK_TOTAL_DISPATCH_ROUTE_NOT_AVAILABLE'});
  }catch(e){return out(400,{ok:false,error:'WORK_TOTAL_DISPATCH_V1_OPERATION_FAILED',detail:e instanceof Error?e.message:String(e)});}
});