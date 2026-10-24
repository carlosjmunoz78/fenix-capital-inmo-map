import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.10.0";

const U=Deno.env.get("SUPABASE_URL")??"";
const A=Deno.env.get("SUPABASE_ANON_KEY")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const svc=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const auth=createClient(U,A,{auth:{persistSession:false,autoRefreshToken:false}});
const PREPROD=U.includes("hnqlnvakzaywtafeiybt");
const BUCKET="cerebro-creative-assets";
const GITHUB_ISSUER="https://token.actions.githubusercontent.com";
const GITHUB_AUDIENCE="cerebro-creative-worker-v1";
const GITHUB_REPOSITORY="carlosjmunoz78/fenix-capital-inmo-map";
const GITHUB_WORKFLOW=".github/workflows/cerebro-creative-job-runner-v1.yml";
const JWKS=createRemoteJWKSet(new URL(`${GITHUB_ISSUER}/.well-known/jwks`));
const ALLOWED_ORIGINS=new Set(["https://app.fenixcapital.es","https://www.app.fenixcapital.es"]);
const MIME=new Set(["image/png","image/jpeg","image/webp","application/pdf","video/mp4"]);

function headers(origin:string|null=null){const h:Record<string,string>={"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"origin"};if(origin&&ALLOWED_ORIGINS.has(origin))h["access-control-allow-origin"]=origin;return h;}
function out(req:Request,status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:headers(req.headers.get("origin"))});}
function bearer(req:Request){const h=req.headers.get("authorization")??"";return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():"";}
function safeError(e:unknown){return e instanceof Error?e.message:String(e);}
function safeName(v:unknown){const s=String(v??"").trim().replace(/[^A-Za-z0-9._-]/g,"_");if(!s||s.length>120||s.startsWith("."))throw new Error("ARTIFACT_FILENAME_DENIED");return s;}

async function githubWorker(req:Request){
  const token=bearer(req);if(!token)return {ok:false,error:"GITHUB_OIDC_REQUIRED"} as const;
  try{
    const {payload}=await jwtVerify(token,JWKS,{issuer:GITHUB_ISSUER,audience:GITHUB_AUDIENCE});
    if(payload.repository!==GITHUB_REPOSITORY)return {ok:false,error:"GITHUB_REPOSITORY_DENIED"} as const;
    const workflowRef=String(payload.workflow_ref??"");
    if(!workflowRef.includes(`${GITHUB_REPOSITORY}/${GITHUB_WORKFLOW}@`))return {ok:false,error:"GITHUB_WORKFLOW_DENIED"} as const;
    const ref=String(payload.ref??"");
    if(PREPROD){
      const allowed=new Set(["refs/heads/main","refs/heads/cerebro/creative-output-pipeline-v1-2026-10-24"]);
      if(!allowed.has(ref))return {ok:false,error:"GITHUB_REF_DENIED"} as const;
    } else if(ref!=="refs/heads/main")return {ok:false,error:"GITHUB_REF_DENIED"} as const;
    const worker_id=`github:${String(payload.run_id??"unknown")}:${String(payload.run_attempt??"1")}`;
    return {ok:true,worker_id,claims:{repository:payload.repository,ref,workflow_ref:workflowRef,run_id:payload.run_id}} as const;
  }catch(e){return {ok:false,error:"GITHUB_OIDC_INVALID",detail:safeError(e)} as const;}
}

async function owner(req:Request){
  const token=bearer(req);if(!token)return {ok:false,error:"OWNER_TOKEN_REQUIRED"} as const;
  const {data,error}=await auth.auth.getUser(token);if(error||!data.user)return {ok:false,error:"OWNER_TOKEN_INVALID"} as const;
  const {data:ctx,error:ce}=await svc.rpc("fenix_prod_actor_context_by_auth_server",{p_auth_user_id:data.user.id});
  if(ce||ctx?.ok!==true||String(ctx?.actor_code??"")!=="CARLOS-ADMIN")return {ok:false,error:"OWNER_REQUIRED"} as const;
  return {ok:true,actor:"CARLOS-ADMIN"} as const;
}

async function enqueue(body:any,createdBy:string){
  if(!body||typeof body!=="object"||Array.isArray(body))throw new Error("CREATIVE_REQUEST_INVALID");
  const request={...body,created_by:createdBy,environment:String(body.environment||(PREPROD?"PREPROD":"PROD")).toUpperCase(),expected_cost_eur:0,publish_requested:false};
  const {data,error}=await svc.rpc("cerebro_creative_enqueue_v1",{p_request:request});if(error)throw error;return data;
}

function canaryBody(runId:string){return {
  idempotency_key:`creative-${PREPROD?'preprod':'prod'}-canary-${runId}`,
  company_id:"fenix",engine_id:"FACT-001",department_id:"creative",version:"v1",
  channel:"SEO",output_type:"SEO_IMAGE",audit_id:`creative-canary-${runId}`,priority:100,max_attempts:1,
  brand_profile_ref:"brand:fenix-capital:synthetic-canary",brief_ref:"brief:creative-canary",
  creative_payload:{headline:"CEREBRO CREATIVE",subheadline:"Physical zero-cost canary",cta:"PREPROD",brand:{background:"#161616",primary:"#ffffff",accent:"#8a1d63"}}
};}

async function leaseRow(jobId:string,leaseId:string,workerId:string){
  const {data,error}=await svc.from("cerebro_creative_job_v1").select("job_id,company_id,environment,status,lease_id,lease_owner").eq("job_id",jobId).eq("status","LEASED").eq("lease_id",leaseId).eq("lease_owner",workerId).maybeSingle();
  if(error)throw error;if(!data)throw new Error("CREATIVE_JOB_LEASE_MISMATCH");return data;
}

Deno.serve(async req=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS"){
    if(!origin||!ALLOWED_ORIGINS.has(origin))return new Response(null,{status:403});
    return new Response(null,{status:204,headers:{...headers(origin),"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"authorization,content-type,apikey","access-control-max-age":"600"}});
  }
  const route=new URL(req.url).pathname.split("/").filter(Boolean).slice(-1)[0]||"";
  if(req.method==="GET"&&route==="health")return out(req,200,{ok:true,service:"cerebro-creative-dispatch-v1",environment:PREPROD?"PREPROD":"PROD",queue:"cerebro_creative_job_v1",bucket:BUCKET,github_oidc:true,heavy_render_outside_supabase:true,additional_cost_eur:0});

  if(req.method==="POST"&&route==="canary-seed"){
    if(!PREPROD)return out(req,404,{ok:false,error:"CANARY_ROUTE_NOT_AVAILABLE"});
    const w=await githubWorker(req);if(!w.ok)return out(req,403,w);
    try{return out(req,200,await enqueue(canaryBody(String(w.claims.run_id??Date.now())),w.worker_id));}catch(e){return out(req,400,{ok:false,error:"CANARY_ENQUEUE_FAILED",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="enqueue"){
    const o=await owner(req);if(!o.ok)return out(req,403,o);
    try{return out(req,200,await enqueue(await req.json(),o.actor));}catch(e){return out(req,400,{ok:false,error:"ENQUEUE_FAILED",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="lease"){
    const w=await githubWorker(req);if(!w.ok)return out(req,403,w);
    const {data,error}=await svc.rpc("cerebro_creative_lease_v1",{p_worker_id:w.worker_id,p_lease_seconds:600});
    if(error)return out(req,500,{ok:false,error:"LEASE_FAILED",detail:error.message});
    return out(req,200,{...data,worker:{...w.claims,authenticated:true}});
  }

  if(req.method==="POST"&&route==="artifact-ticket"){
    const w=await githubWorker(req);if(!w.ok)return out(req,403,w);
    try{
      const body=await req.json();const jobId=String(body.job_id??"");const leaseId=String(body.lease_id??"");
      const row=await leaseRow(jobId,leaseId,w.worker_id);
      const artifacts=Array.isArray(body.artifacts)?body.artifacts:[];if(artifacts.length<1||artifacts.length>25)throw new Error("ARTIFACT_COUNT_DENIED");
      const tickets=[];
      for(const item of artifacts){
        const filename=safeName(item?.filename);const mime=String(item?.mime??"");if(!MIME.has(mime))throw new Error("ARTIFACT_MIME_DENIED");
        const path=`${row.company_id}/${row.environment}/${jobId}/${filename}`;
        const {data,error}=await svc.storage.from(BUCKET).createSignedUploadUrl(path);if(error)throw error;
        tickets.push({filename,mime,path,token:data.token,signed_url:data.signedUrl});
      }
      return out(req,200,{ok:true,bucket:BUCKET,tickets});
    }catch(e){return out(req,400,{ok:false,error:"ARTIFACT_TICKET_FAILED",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="complete"){
    const w=await githubWorker(req);if(!w.ok)return out(req,403,w);
    try{
      const body=await req.json();
      const {data,error}=await svc.rpc("cerebro_creative_complete_v1",{
        p_job_id:body.job_id,p_lease_id:body.lease_id,p_worker_id:w.worker_id,p_status:body.status,
        p_result_summary:body.result_summary??null,p_artifact_manifest:body.artifact_manifest??null,p_error_code:body.error_code??null
      });
      if(error)throw error;return out(req,200,data);
    }catch(e){return out(req,400,{ok:false,error:"COMPLETE_FAILED",detail:safeError(e)});}
  }

  if(req.method==="POST"&&route==="asset-url"){
    const o=await owner(req);if(!o.ok)return out(req,403,o);
    try{const body=await req.json();const path=String(body.path??"");if(!/^[-A-Za-z0-9_./]{1,500}$/.test(path)||path.includes(".."))throw new Error("ASSET_PATH_DENIED");const {data,error}=await svc.storage.from(BUCKET).createSignedUrl(path,Math.min(Math.max(Number(body.expires_in??3600),60),86400));if(error)throw error;return out(req,200,{ok:true,path,signed_url:data.signedUrl});}catch(e){return out(req,400,{ok:false,error:"ASSET_URL_FAILED",detail:safeError(e)});}
  }

  return out(req,404,{ok:false,error:"ROUTE_NOT_AVAILABLE"});
});
