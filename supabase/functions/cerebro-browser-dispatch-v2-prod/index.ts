import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.10.0";

const U=Deno.env.get('SUPABASE_URL')??'';
const S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const ISSUER='https://token.actions.githubusercontent.com';
const AUD='cerebro-browser-worker-v1';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const PROD_PROJECT_REF='cluhljgonannaafpmblx';
const PROD_WORKFLOW='.github/workflows/cerebro-browser-phase2-prod-rollout-v1.yml';
const PROD_REF='refs/heads/cerebro/browser1-phase2-prod-canary-v1';
const JWKS=createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

function out(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function bearer(req:Request){const h=req.headers.get('authorization')??'';return h.toLowerCase().startsWith('bearer ')?h.slice(7).trim():'';}
function slot(v:unknown){const n=Number(v);if(!Number.isInteger(n)||n<1||n>8)throw new Error('INVALID_WORKER_SLOT');return n;}
function stage(v:unknown){const n=Number(v);if(!Number.isInteger(n)||![1,2,4,8].includes(n))throw new Error('INVALID_STAGE_CONCURRENCY');return n;}
function profile(identity:string,account:string){const s=(x:string)=>x.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120);return `b1-fenix-${s(identity)}-${s(account)}-PROD-CANARY`;}

async function worker(req:Request){
  if(!U.includes(PROD_PROJECT_REF))return {ok:false,error:'PROD_PROJECT_REF_MISMATCH'} as const;
  const token=bearer(req);if(!token)return {ok:false,error:'GITHUB_OIDC_REQUIRED'} as const;
  try{
    const {payload}=await jwtVerify(token,JWKS,{issuer:ISSUER,audience:AUD});
    if(payload.repository!==REPO)return {ok:false,error:'GITHUB_REPOSITORY_DENIED'} as const;
    if(String(payload.ref??'')!==PROD_REF)return {ok:false,error:'GITHUB_REF_DENIED'} as const;
    const workflowRef=String(payload.workflow_ref??'');
    if(!workflowRef.includes(`${REPO}/${PROD_WORKFLOW}@`))return {ok:false,error:'GITHUB_WORKFLOW_DENIED'} as const;
    const runId=String(payload.run_id??'unknown');
    const runAttempt=String(payload.run_attempt??'1');
    return {ok:true,benchmark_id:`${runId}-a${runAttempt}`,base_worker:`github:${runId}:${runAttempt}`} as const;
  }catch(e){return {ok:false,error:'GITHUB_OIDC_INVALID',detail:e instanceof Error?e.message:String(e)} as const;}
}

async function seed(benchmarkId:string,n:number,c:number,createdBy:string){
  const departments=['seo','marketing','crm','finance','social','support','training','operations'];
  const department=departments[(n-1)%departments.length];
  const identity=`prod-canary-${benchmarkId}-${n}`;
  const account=`acct-prod-canary-${benchmarkId}-${n}`;
  const html=encodeURIComponent(`<html><body><h1>CEREBRO Browser Phase 2 PROD Canary</h1><p>${benchmarkId}/${n}/${c}</p></body></html>`);
  const target=`data:text/html;charset=utf-8,${html}`;
  const {data,error}=await svc.rpc('cerebro_browser_enqueue_v2',{
    p_idempotency_key:`browser1-phase2-${benchmarkId}-stage-${c}-slot-${n}`,
    p_company_id:'fenix',p_engine_id:'CONSOLE-001',p_department_id:department,p_environment:'PROD',p_version:'v2',p_mode:'OBSERVE',
    p_identity_id:identity,p_account_id:account,p_browser_profile_id:profile(identity,account),p_credential_ref_id:null,p_target_url:target,
    p_commands:[{command:'goto',url:target},{command:'wait',ms:2500},{command:'extract_text',target:{selector:'h1'}},{command:'screenshot',label:`phase2-PROD-${c}-${n}`}],
    p_authority:{canonical_engine_ids:['CONSOLE-001'],browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true,attestation_source:'GITHUB_OIDC_PROD_CANARY_V2'},engine_authority:{browser_use_authorized:true},kill_switch_enabled:true},
    p_priority:90,p_risk:'LOW',p_capability:'browser1.observe',p_expected_cost_eur:0,p_timeout_seconds:300,p_max_attempts:1,
    p_audit_id:`browser-v2-PROD-${benchmarkId}-${n}`,p_created_by:createdBy
  });
  if(error)throw error;
  return data;
}

async function configure(action:string,c:number|undefined,updatedBy:string){
  let enabled=false,global=1,company=1,department=1;
  if(action==='STAGE'){
    const value=stage(c);enabled=true;global=value;company=value;department=1;
  }else if(action==='FINALIZE'){
    enabled=true;global=8;company=4;department=2;
  }else if(action==='DISABLE'){
    enabled=false;global=1;company=1;department=1;
  }else throw new Error('INVALID_PROD_PROMOTION_ACTION');
  const {data,error}=await svc.from('cerebro_browser_orchestrator_config_v2')
    .update({enabled,global_max_concurrent:global,default_company_max_concurrent:company,default_department_max_concurrent:department,updated_at:new Date().toISOString(),updated_by:updatedBy})
    .eq('environment','PROD')
    .select('environment,enabled,global_max_concurrent,default_company_max_concurrent,default_department_max_concurrent,updated_by')
    .single();
  if(error)throw error;
  return {ok:true,config:data,incremental_cost_eur:0};
}

Deno.serve(async req=>{
  const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)??'';
  if(req.method==='GET'&&route==='health')return out(200,{ok:U.includes(PROD_PROJECT_REF),service:'cerebro-browser-dispatch-v2-prod',environment:'PROD',allowed_workflow:PROD_WORKFLOW,allowed_ref:PROD_REF,credential_materialization:false,observe_only_canary:true,serial_v1_rollback_preserved:true,incremental_cost_eur:0});
  if(req.method!=='POST')return out(404,{ok:false,error:'ROUTE_NOT_AVAILABLE'});
  const w=await worker(req);if(!w.ok)return out(403,w);
  let body:any={};try{body=await req.json();}catch{}
  try{
    if(route==='promotion-config-v2')return out(200,await configure(String(body.action||'').toUpperCase(),body.stage_concurrency===undefined?undefined:Number(body.stage_concurrency),`${w.base_worker}:${String(body.action||'UNKNOWN').toLowerCase()}`));
    if(route==='phase2-canary-seed'){
      const n=slot(body.worker_slot),c=stage(body.stage_concurrency);
      return out(200,await seed(w.benchmark_id,n,c,`${w.base_worker}:slot-${n}`));
    }
    if(route==='lease-v2'){
      const n=slot(body.worker_slot);const wid=`${w.base_worker}:slot-${n}`;const prefix=`browser1-phase2-${w.benchmark_id}-stage-`;
      const {data,error}=await svc.rpc('cerebro_browser_lease_benchmark_v2',{p_worker_id:wid,p_environment:'PROD',p_idempotency_prefix:prefix,p_lease_seconds:300});if(error)throw error;return out(200,{...data,worker_id:wid,benchmark_id:w.benchmark_id});
    }
    if(route==='heartbeat-v2'){
      const n=slot(body.worker_slot);const {data,error}=await svc.rpc('cerebro_browser_heartbeat_v2',{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:`${w.base_worker}:slot-${n}`,p_extend_seconds:Number(body.extend_seconds||300)});if(error)throw error;return out(200,data);
    }
    if(route==='complete-v2'){
      const n=slot(body.worker_slot);const {data,error}=await svc.rpc('cerebro_browser_complete_v2',{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:`${w.base_worker}:slot-${n}`,p_outcome:String(body.outcome||'FAILED'),p_result_summary:body.result_summary??null,p_error_code:body.error_code??null,p_retryable:false});if(error)throw error;return out(200,data);
    }
    if(route==='metrics-v2'){
      const n=slot(body.worker_slot),c=stage(body.stage_concurrency);
      const {data,error}=await svc.rpc('cerebro_browser_metrics_insert_v2',{p_run_id:String(body.run_id||w.benchmark_id),p_worker_id:`${w.base_worker}:slot-${n}`,p_environment:'PROD',p_stage_concurrency:c,p_job_id:body.job_id,p_company_id:body.company_id,p_department_id:body.department_id,p_browser_profile_id:body.browser_profile_id,p_started_at:body.started_at,p_finished_at:body.finished_at,p_duration_ms:Number(body.duration_ms||0),p_rss_start_bytes:Number(body.rss_start_bytes||0),p_rss_end_bytes:Number(body.rss_end_bytes||0),p_heap_used_start_bytes:Number(body.heap_used_start_bytes||0),p_heap_used_end_bytes:Number(body.heap_used_end_bytes||0),p_cpu_user_micros:Number(body.cpu_user_micros||0),p_cpu_system_micros:Number(body.cpu_system_micros||0),p_outcome:String(body.outcome||'UNKNOWN')});if(error)throw error;return out(200,data);
    }
    if(route==='status-v2'){
      const {data,error}=await svc.rpc('cerebro_browser_status_v2',{p_environment:'PROD'});if(error)throw error;return out(200,{...data,benchmark_id:w.benchmark_id});
    }
    return out(404,{ok:false,error:'ROUTE_NOT_AVAILABLE'});
  }catch(e){return out(400,{ok:false,error:'PROD_CANARY_OPERATION_FAILED',detail:e instanceof Error?e.message:String(e)});}
});