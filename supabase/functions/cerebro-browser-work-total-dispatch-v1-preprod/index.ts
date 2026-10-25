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
const REFS=new Set([FEATURE_REF,FINAL_REF]);
const WORKFLOW='.github/workflows/cerebro-browser-work-total-v1-preprod.yml';
const PROJECT='hnqlnvakzaywtafeiybt';
const FEATURE_PREFIX='browser-work-total-v1-legacy-';
const FINAL_PREFIX='browser-work-total-v1-final-';
const JWKS=createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));
function out(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
function bearer(req:Request){const h=req.headers.get('authorization')??'';return h.toLowerCase().startsWith('bearer ')?h.slice(7).trim():'';}
function prefixForRef(ref:string){return ref===FINAL_REF?FINAL_PREFIX:FEATURE_PREFIX;}
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
Deno.serve(async req=>{
  const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)??'';
  if(req.method==='GET'&&route==='health')return out(200,{ok:true,service:'cerebro-browser-work-total-dispatch-v1-preprod',environment:'PREPROD',branch_refs:[...REFS],branch_isolated_prefixes:{feature:FEATURE_PREFIX,final:FINAL_PREFIX},credential_materialization:false,prod_access:false,trading_access:false,incremental_cost_eur:0});
  if(req.method!=='POST')return out(404,{ok:false,error:'ROUTE_NOT_AVAILABLE'});
  const w=await worker(req);if(!w.ok)return out(403,w);
  let body:any={};try{body=await req.json();}catch{}
  try{
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
