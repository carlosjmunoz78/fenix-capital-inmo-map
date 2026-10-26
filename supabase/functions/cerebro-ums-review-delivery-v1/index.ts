import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.10.0";

const U=Deno.env.get("SUPABASE_URL")??"";
const S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const BREVO=Deno.env.get("BREVO_API_KEY")??"";
const db=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const PREPROD_REF="hnqlnvakzaywtafeiybt";
const BUCKET="cerebro-creative-assets";
const ISSUER="https://token.actions.githubusercontent.com";
const AUDIENCE="cerebro-ums-review-delivery-v1";
const REPO="carlosjmunoz78/fenix-capital-inmo-map";
const WORKFLOW=".github/workflows/cerebro-ums-review-delivery-v1.yml";
const REF="refs/heads/cerebro/ums-physical-production-executor-20261026";
const JWKS=createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));
const LINK_TTL=60*60*24*7;

function json(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});}
function bearer(req:Request){const h=req.headers.get("authorization")??"";return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():"";}
function msg(e:unknown){return e instanceof Error?e.message:String(e);}

async function worker(req:Request){
  const token=bearer(req);if(!token)throw new Error("GITHUB_OIDC_REQUIRED");
  const {payload}=await jwtVerify(token,JWKS,{issuer:ISSUER,audience:AUDIENCE});
  if(payload.repository!==REPO)throw new Error("GITHUB_REPOSITORY_DENIED");
  if(String(payload.ref??"")!==REF)throw new Error("GITHUB_REF_DENIED");
  const workflowRef=String(payload.workflow_ref??"");
  if(!workflowRef.includes(`${REPO}/${WORKFLOW}@`))throw new Error("GITHUB_WORKFLOW_DENIED");
  return {run_id:String(payload.run_id??"unknown"),run_attempt:String(payload.run_attempt??"1")};
}

async function activeSender(){
  if(!BREVO)throw new Error("BREVO_API_KEY_MISSING");
  const r=await fetch("https://api.brevo.com/v3/senders",{headers:{accept:"application/json","api-key":BREVO}});
  if(!r.ok)throw new Error(`BREVO_SENDERS_FAILED:${r.status}`);
  const data=await r.json();
  const senders=Array.isArray(data?.senders)?data.senders:[];
  const preferred=senders.find((s:any)=>s?.active===true&&String(s?.email??"").toLowerCase().endsWith("@fenixcapital.es"))
    ?? senders.find((s:any)=>s?.active===true);
  if(!preferred?.email)throw new Error("BREVO_ACTIVE_SENDER_NOT_FOUND");
  return {name:String(preferred.name??"Fénix Capital"),email:String(preferred.email)};
}

async function sendEmail({to,subject,html,sender,runId}:{to:string,subject:string,html:string,sender:{name:string,email:string},runId:string}){
  const r=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{accept:"application/json","api-key":BREVO,"content-type":"application/json"},body:JSON.stringify({sender,to:[{email:to}],subject,htmlContent:html,tags:["FENIX_PREPROD","CEREBRO_UMS_OWNER_REVIEW"],headers:{"Idempotency-Key":runId}})});
  const text=await r.text();let data:any=null;try{data=text?JSON.parse(text):null}catch{data={raw:text}}
  if(!r.ok)throw new Error(`BREVO_SEND_FAILED:${r.status}`);
  return String(data?.messageId??"");
}

Deno.serve(async(req:Request)=>{
  try{
    if(!U.includes(PREPROD_REF))return json(503,{ok:false,error:"UMS_PREPROD_ONLY"});
    if(req.method==="GET")return json(200,{ok:true,service:"cerebro-ums-review-delivery-v1",environment:"PREPROD",delivery:"OWNER_EMAIL",signed_link_ttl_seconds:LINK_TTL,public_bucket:false,publish_authorized:false});
    if(req.method!=="POST")return json(405,{ok:false,error:"METHOD_NOT_ALLOWED"});
    const actor=await worker(req);
    const body=await req.json();const jobId=String(body?.job_id??"").trim();if(!jobId)throw new Error("JOB_ID_REQUIRED");
    const runId=`ums-owner-review-${jobId}`;
    const {data:prior}=await db.from("brevo_integration_runs_preprod").select("status,remote_id,detail").eq("run_id",runId).maybeSingle();
    if(prior?.status==="success")return json(200,{ok:true,idempotent:true,job_id:jobId,message_id:prior.remote_id,delivery_status:"SENT"});

    const {data:job,error:jobErr}=await db.from("cerebro_creative_job_v1").select("job_id,company_id,engine_id,environment,status,error_code,result_summary,artifact_manifest").eq("job_id",jobId).maybeSingle();
    if(jobErr||!job)throw new Error("UMS_JOB_NOT_FOUND");
    if(job.engine_id!=="UMS-001"||job.environment!=="PREPROD"||job.status!=="HOLD"||job.error_code!=="CREATIVE_REVIEW_REQUIRED")throw new Error("UMS_JOB_NOT_REVIEWABLE");
    const artifacts=Array.isArray(job.artifact_manifest?.artifacts)?job.artifact_manifest.artifacts:[];
    const video=artifacts.find((a:any)=>a?.mime==="video/mp4");if(!video?.path)throw new Error("UMS_VIDEO_ARTIFACT_MISSING");

    const {data:recipient,error:recipientErr}=await db.rpc("cerebro_ums_owner_review_recipient_v1");
    if(recipientErr||!recipient?.ok||!recipient?.email)throw new Error("OWNER_REVIEW_RECIPIENT_NOT_FOUND");
    const {data:signed,error:signErr}=await db.storage.from(BUCKET).createSignedUrl(String(video.path),LINK_TTL);
    if(signErr||!signed?.signedUrl)throw new Error("UMS_REVIEW_LINK_FAILED");
    const sender=await activeSender();
    const subject="CEREBRO Productora · vídeo listo para tu revisión";
    const html=`<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#222"><h2 style="margin-bottom:8px">CEREBRO Productora</h2><p>El primer vídeo físico de prueba está listo para tu revisión.</p><p><strong>Estado:</strong> CREATIVE_REVIEW_REQUIRED<br><strong>Duración:</strong> ${Number(job.result_summary?.technical?.duration_sec??0).toFixed(1)} s<br><strong>Formato:</strong> ${job.result_summary?.technical?.width??1080}×${job.result_summary?.technical?.height??1920}<br><strong>BM-13:</strong> pendiente de tribunal creativo</p><p style="margin:28px 0"><a href="${signed.signedUrl}" style="background:#870064;color:#fff;padding:14px 20px;text-decoration:none;border-radius:6px;font-weight:700">Ver / descargar vídeo</a></p><p style="font-size:13px;color:#666">Enlace privado temporal válido durante 7 días. El vídeo no está publicado en PROD.</p></div>`;
    const messageId=await sendEmail({to:String(recipient.email),subject,html,sender,runId});
    const detail={job_id:jobId,delivery:"OWNER_REVIEW",link_ttl_seconds:LINK_TTL,github_run_id:actor.run_id,recipient_actor_code:"CARLOS-ADMIN"};
    await db.from("brevo_integration_runs_preprod").upsert({run_id:runId,operation:"ums-owner-review",status:"success",remote_id:messageId||null,detail},{onConflict:"run_id"});
    const nextSummary={...(job.result_summary??{}),delivery:{status:"SENT",channel:"EMAIL",recipient_actor_code:"CARLOS-ADMIN",message_id:messageId||null,sent_at:new Date().toISOString(),link_ttl_seconds:LINK_TTL}};
    await db.from("cerebro_creative_job_v1").update({result_summary:nextSummary,updated_at:new Date().toISOString()}).eq("job_id",jobId);
    return json(200,{ok:true,idempotent:false,job_id:jobId,delivery_status:"SENT",message_id:messageId||null,link_ttl_seconds:LINK_TTL});
  }catch(e){return json(400,{ok:false,error:msg(e)});}
});
