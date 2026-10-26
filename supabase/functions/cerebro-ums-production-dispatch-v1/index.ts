import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.10.0";

const U=Deno.env.get("SUPABASE_URL")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const EXPECTED_PREPROD_REF="hnqlnvakzaywtafeiybt";
const BUCKET="cerebro-creative-assets";
const GITHUB_ISSUER="https://token.actions.githubusercontent.com";
const GITHUB_AUDIENCE="cerebro-ums-production-worker-v1";
const GITHUB_REPOSITORY="carlosjmunoz78/fenix-capital-inmo-map";
const GITHUB_WORKFLOW=".github/workflows/cerebro-ums-production-job-runner-v1.yml";
const GITHUB_REF="refs/heads/cerebro/ums-physical-production-executor-20261026";
const JWKS=createRemoteJWKSet(new URL(`${GITHUB_ISSUER}/.well-known/jwks`));
const MIME=new Set(["image/png","image/jpeg","image/webp","application/pdf","video/mp4","audio/wav","audio/mpeg"]);
const QUALITY=new Set(["PREMIUM_GENERAL","PREMIUM_SOCIAL","PREMIUM_BRAND"]);
const VIDEO_OUTPUTS=new Set(["REEL","SHORT_VIDEO","LANDSCAPE_VIDEO","LONG_VIDEO"]);

function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});}
function bearer(req:Request){const h=req.headers.get("authorization")??"";return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():"";}
function safeError(e:unknown){return e instanceof Error?e.message:String(e);}
function safeName(v:unknown){const s=String(v??"").trim().replace(/[^A-Za-z0-9._-]/g,"_");if(!s||s.length>120||s.startsWith("."))throw new Error("ARTIFACT_FILENAME_DENIED");return s;}
function assertPreprod(){if(!U.includes(EXPECTED_PREPROD_REF))throw new Error("UMS_PREPROD_ONLY");}

async function githubWorker(req:Request){
  const token=bearer(req);if(!token)return {ok:false,error:"GITHUB_OIDC_REQUIRED"} as const;
  try{
    const {payload}=await jwtVerify(token,JWKS,{issuer:GITHUB_ISSUER,audience:GITHUB_AUDIENCE});
    if(payload.repository!==GITHUB_REPOSITORY)return {ok:false,error:"GITHUB_REPOSITORY_DENIED"} as const;
    const workflowRef=String(payload.workflow_ref??"");
    if(!workflowRef.includes(`${GITHUB_REPOSITORY}/${GITHUB_WORKFLOW}@`))return {ok:false,error:"GITHUB_WORKFLOW_DENIED"} as const;
    if(String(payload.ref??"")!==GITHUB_REF)return {ok:false,error:"GITHUB_REF_DENIED"} as const;
    return {ok:true,worker_id:`github-ums:${String(payload.run_id??"unknown")}:${String(payload.run_attempt??"1")}`,claims:{repository:payload.repository,ref:payload.ref,workflow_ref:workflowRef,run_id:payload.run_id}} as const;
  }catch(e){return {ok:false,error:"GITHUB_OIDC_INVALID",detail:safeError(e)} as const;}
}

function validateProductionOrder(body:any){
  if(!body||typeof body!=="object"||Array.isArray(body))throw new Error("UMS_ORDER_INVALID");
  if(String(body.kind??"")!=="cerebro.ums.production_order.v1")throw new Error("UMS_ORDER_KIND_DENIED");
  if(String(body.company_id??"")!=="fenix"||String(body.engine_id??"")!=="UMS-001")throw new Error("UMS_ORDER_SCOPE_DENIED");
  if(String(body.environment??"PREPROD").toUpperCase()!=="PREPROD")throw new Error("UMS_ORDER_PREPROD_ONLY");
  if(!QUALITY.has(String(body.quality_profile??"").toUpperCase()))throw new Error("UMS_ORDER_QUALITY_PROFILE_REQUIRED");
  if(!VIDEO_OUTPUTS.has(String(body.output_type??"").toUpperCase()))throw new Error("UMS_ORDER_VIDEO_OUTPUT_REQUIRED");
  if(Number(body.expected_cost_eur??0)!==0)throw new Error("UMS_ORDER_MONEY_LIMIT");
  if(body.publish_requested===true)throw new Error("UMS_ORDER_PUBLISH_DENIED");
  if(!body.idempotency_key||!body.audit_id)throw new Error("UMS_ORDER_AUDIT_REQUIRED");
  if(!body.creative_payload||typeof body.creative_payload!=="object"||Array.isArray(body.creative_payload))throw new Error("UMS_ORDER_PAYLOAD_REQUIRED");
  const assets=body.creative_payload.assets;
  if(!Array.isArray(assets)||assets.length<4)throw new Error("UMS_ORDER_REAL_ASSETS_MIN_4");
}

async function enqueueOrder(body:any,workerId:string){
  validateProductionOrder(body);
  const request={...body,created_by:workerId,environment:"PREPROD",expected_cost_eur:0,publish_requested:false};
  const {data,error}=await svc.rpc("cerebro_creative_enqueue_v1",{p_request:request});
  if(error)throw error;return data;
}

async function leaseRow(jobId:string,leaseId:string,workerId:string){
  const {data,error}=await svc.from("cerebro_creative_job_v1")
    .select("job_id,company_id,engine_id,environment,status,lease_id,lease_owner,request")
    .eq("job_id",jobId).eq("status","LEASED").eq("lease_id",leaseId).eq("lease_owner",workerId).maybeSingle();
  if(error)throw error;if(!data)throw new Error("UMS_JOB_LEASE_MISMATCH");
  if(data.engine_id!=="UMS-001"||data.environment!=="PREPROD"||data.request?.kind!=="cerebro.ums.production_order.v1")throw new Error("UMS_JOB_SCOPE_DENIED");
  return data;
}

Deno.serve(async req=>{
  try{assertPreprod();}catch(e){return json(503,{ok:false,error:safeError(e)});}
  const route=new URL(req.url).pathname.split("/").filter(Boolean).slice(-1)[0]||"";
  if(req.method==="GET"&&route==="health")return json(200,{ok:true,service:"cerebro-ums-production-dispatch-v1",environment:"PREPROD",engine_id:"UMS-001",queue:"cerebro_creative_job_v1",lease_rpc:"cerebro_ums_production_lease_v1",bucket:BUCKET,github_oidc:true,legacy_renderer_allowed:false,heavy_render_outside_supabase:true,additional_cost_eur:0,publish_authorized:false});

  const w=await githubWorker(req);if(!w.ok)return json(403,w);

  if(req.method==="POST"&&route==="enqueue"){
    try{return json(200,await enqueueOrder(await req.json(),w.worker_id));}
    catch(e){return json(400,{ok:false,error:"UMS_ENQUEUE_FAILED",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="lease"){
    const {data,error}=await svc.rpc("cerebro_ums_production_lease_v1",{p_worker_id:w.worker_id,p_lease_seconds:900});
    if(error)return json(500,{ok:false,error:"UMS_LEASE_FAILED",detail:error.message});
    return json(200,{...data,worker:{...w.claims,authenticated:true}});
  }

  if(req.method==="POST"&&route==="artifact-ticket"){
    try{
      const body=await req.json();const jobId=String(body.job_id??"");const leaseId=String(body.lease_id??"");
      const row=await leaseRow(jobId,leaseId,w.worker_id);
      const artifacts=Array.isArray(body.artifacts)?body.artifacts:[];if(artifacts.length<1||artifacts.length>40)throw new Error("ARTIFACT_COUNT_DENIED");
      const tickets=[];
      for(const item of artifacts){
        const filename=safeName(item?.filename);const mime=String(item?.mime??"");if(!MIME.has(mime))throw new Error("ARTIFACT_MIME_DENIED");
        const path=`${row.company_id}/${row.environment}/ums/${jobId}/${filename}`;
        const {data,error}=await svc.storage.from(BUCKET).createSignedUploadUrl(path);if(error)throw error;
        tickets.push({filename,mime,path,token:data.token,signed_url:data.signedUrl});
      }
      return json(200,{ok:true,bucket:BUCKET,tickets});
    }catch(e){return json(400,{ok:false,error:"UMS_ARTIFACT_TICKET_FAILED",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="complete"){
    try{
      const body=await req.json();
      await leaseRow(String(body.job_id??""),String(body.lease_id??""),w.worker_id);
      const status=String(body.status??"").toUpperCase();if(!["SUCCEEDED","FAILED","HOLD"].includes(status))throw new Error("UMS_COMPLETE_STATUS_DENIED");
      const {data,error}=await svc.rpc("cerebro_creative_complete_v1",{p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:w.worker_id,p_status:status,p_result_summary:body.result_summary??null,p_artifact_manifest:body.artifact_manifest??null,p_error_code:body.error_code??null});
      if(error)throw error;return json(200,data);
    }catch(e){return json(400,{ok:false,error:"UMS_COMPLETE_FAILED",detail:safeError(e)});}
  }

  return json(404,{ok:false,error:"ROUTE_NOT_AVAILABLE"});
});
