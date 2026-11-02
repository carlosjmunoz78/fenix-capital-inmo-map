import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
import {createRemoteJWKSet,jwtVerify} from "npm:jose@5.10.0";

const U=Deno.env.get('SUPABASE_URL')??'';
const S=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const ISSUER='https://token.actions.githubusercontent.com';
const AUD='jarvis-work-worker-v1';
const REPO='carlosjmunoz78/fenix-capital-inmo-map';
const REF='refs/heads/cerebro/jarvis-work-codex-complete-20261102';
const WORKFLOW='.github/workflows/jarvis-work-codex-preprod-worker.yml';
const PROJECT='hnqlnvakzaywtafeiybt';
const JWKS=createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

function out(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function bearer(req:Request){const h=req.headers.get('authorization')??'';return h.toLowerCase().startsWith('bearer ')?h.slice(7).trim():''}
async function worker(req:Request){
 if(!U.includes(PROJECT))return{ok:false,error:'PREPROD_PROJECT_REF_MISMATCH'} as const;
 const token=bearer(req);if(!token)return{ok:false,error:'GITHUB_OIDC_REQUIRED'} as const;
 try{
  const{payload}=await jwtVerify(token,JWKS,{issuer:ISSUER,audience:AUD});
  if(payload.repository!==REPO)return{ok:false,error:'GITHUB_REPOSITORY_DENIED'} as const;
  if(String(payload.ref??'')!==REF)return{ok:false,error:'GITHUB_REF_DENIED'} as const;
  if(String(payload.workflow_ref??'')!==`${REPO}/${WORKFLOW}@${REF}`)return{ok:false,error:'GITHUB_WORKFLOW_DENIED'} as const;
  return{ok:true,worker_id:`jarvis-work-v1-preprod:${String(payload.run_id??'unknown')}:${String(payload.run_attempt??'1')}`} as const;
 }catch(error){return{ok:false,error:'GITHUB_OIDC_INVALID',detail:error instanceof Error?error.message:String(error)} as const}
}

Deno.serve(async req=>{
 const route=new URL(req.url).pathname.split('/').filter(Boolean).at(-1)??'';
 if(req.method==='GET'&&route==='health')return out(200,{ok:true,service:'jarvis-work-dispatch-v1-preprod',environment:'PREPROD',repository:REPO,branch_ref:REF,workflow:WORKFLOW,credential_materialization:false,prod_access:false,trading_access:false,incremental_cost_eur:0});
 if(req.method!=='POST')return out(404,{ok:false,error:'ROUTE_NOT_AVAILABLE'});
 const auth=await worker(req);if(!auth.ok)return out(403,auth);
 let body:any={};try{body=await req.json()}catch{}
 try{
  if(route==='lease-v1'){
   const{data,error}=await svc.rpc('jarvis_work_lease_v1',{p_worker_id:auth.worker_id,p_company_id:'fenix',p_environment:'PREPROD',p_lease_seconds:Number(body.lease_seconds||300)});if(error)throw error;
   return out(200,{...data,worker_id:auth.worker_id});
  }
  if(route==='heartbeat-v1'){
   const{data,error}=await svc.rpc('jarvis_work_heartbeat_v1',{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:auth.worker_id,p_extend_seconds:Number(body.extend_seconds||300)});if(error)throw error;return out(200,{ok:true,job:data});
  }
  if(route==='checkpoint-v1'){
   const{data,error}=await svc.rpc('jarvis_work_checkpoint_v1',{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:auth.worker_id,p_checkpoint:body.checkpoint??{}});if(error)throw error;return out(200,{ok:true,job:data});
  }
  if(route==='complete-v1'){
   const{data,error}=await svc.rpc('jarvis_work_complete_v1',{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:auth.worker_id,p_result_summary:body.result_summary??{}});if(error)throw error;return out(200,{ok:true,job:data});
  }
  if(route==='fail-v1'){
   const{data,error}=await svc.rpc('jarvis_work_fail_v1',{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:auth.worker_id,p_error_code:String(body.error_code||'WORKER_FAILED'),p_error_detail:body.error_detail?String(body.error_detail):null,p_retryable:body.retryable!==false});if(error)throw error;return out(200,{ok:true,job:data});
  }
  if(route==='status-v1'){
   const{data,error}=await svc.from('jarvis_work_job_v1').select('status').eq('company_id','fenix').eq('environment','PREPROD');if(error)throw error;
   const states:Record<string,number>={};for(const row of data||[]){const key=String(row.status||'UNKNOWN');states[key]=(states[key]||0)+1}
   return out(200,{ok:true,environment:'PREPROD',states,worker_id:auth.worker_id,prod_access:false,trading_access:false,additional_cost_eur:0});
  }
  return out(404,{ok:false,error:'WORK_DISPATCH_ROUTE_NOT_AVAILABLE'});
 }catch(error){return out(400,{ok:false,error:'WORK_DISPATCH_OPERATION_FAILED',detail:error instanceof Error?error.message:String(error)})}
});
