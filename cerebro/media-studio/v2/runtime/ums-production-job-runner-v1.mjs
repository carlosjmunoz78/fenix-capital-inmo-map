import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderOwnedAssetsPremiumVideo } from './premium-owned-assets-renderer.mjs';

const DEFAULT_ENDPOINT='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-ums-production-dispatch-v1';
const DEFAULT_AUDIENCE='cerebro-ums-production-worker-v1';

function required(value,name){if(value===undefined||value===null||String(value).trim()==='')throw new Error(`MISSING_${name}`);return value;}

export async function getGitHubOidcToken({audience=process.env.CEREBRO_UMS_OIDC_AUDIENCE||DEFAULT_AUDIENCE,request_url=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,request_token=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,fetch_impl=fetch}={}){
  required(request_url,'ACTIONS_ID_TOKEN_REQUEST_URL');required(request_token,'ACTIONS_ID_TOKEN_REQUEST_TOKEN');
  const url=new URL(request_url);url.searchParams.set('audience',audience);
  const response=await fetch_impl(url,{headers:{authorization:`Bearer ${request_token}`},redirect:'error'});
  if(!response.ok)throw new Error(`GITHUB_OIDC_TOKEN_REQUEST_FAILED:${response.status}`);
  const body=await response.json();if(!body?.value||typeof body.value!=='string')throw new Error('GITHUB_OIDC_TOKEN_MISSING');return body.value;
}

async function dispatch(endpoint,route,token,body=undefined,fetch_impl=fetch){
  const response=await fetch_impl(`${endpoint.replace(/\/$/,'')}/${route}`,{
    method:body===undefined?'GET':'POST',
    headers:{authorization:`Bearer ${token}`,...(body===undefined?{}:{'content-type':'application/json'})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error'
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(`UMS_DISPATCH_${route.toUpperCase()}_FAILED:${response.status}:${data?.error||'UNKNOWN'}:${data?.detail||''}`);
  return data;
}

async function uploadArtifacts(endpoint,token,job,rendered,fetch_impl=fetch){
  const descriptors=rendered.artifacts.map(a=>({filename:a.filename,mime:a.mime}));
  const tickets=await dispatch(endpoint,'artifact-ticket',token,{job_id:job.job_id,lease_id:job.lease_id,artifacts:descriptors},fetch_impl);
  if(!Array.isArray(tickets?.tickets)||tickets.tickets.length!==rendered.artifacts.length)throw new Error('UMS_ARTIFACT_TICKETS_INVALID');
  const manifest=[];
  for(const artifact of rendered.artifacts){
    const ticket=tickets.tickets.find(t=>t.filename===artifact.filename);if(!ticket?.signed_url)throw new Error('UMS_ARTIFACT_TICKET_MISSING');
    const body=await fs.readFile(artifact.local_path);
    const response=await fetch_impl(ticket.signed_url,{method:'PUT',headers:{'content-type':artifact.mime,'cache-control':'max-age=3600','x-upsert':'false'},body,redirect:'error'});
    if(!response.ok)throw new Error(`UMS_ARTIFACT_UPLOAD_FAILED:${response.status}`);
    manifest.push({filename:artifact.filename,mime:artifact.mime,path:ticket.path,bytes:artifact.bytes,sha256:artifact.sha256,width:artifact.width??null,height:artifact.height??null,duration_sec:artifact.duration_sec??null,review_frame_count:artifact.review_frame_count??null});
  }
  return manifest;
}

async function exportForWorkflow(rendered,exportDir){
  if(!exportDir)return;
  await fs.mkdir(exportDir,{recursive:true});
  for(const artifact of rendered.artifacts)await fs.copyFile(artifact.local_path,path.join(exportDir,artifact.filename));
  await fs.writeFile(path.join(exportDir,'PROVENANCE.json'),JSON.stringify({technical:rendered.technical,provenance:rendered.provenance},null,2));
}

export async function runOneUmsProductionJob({
  endpoint=process.env.CEREBRO_UMS_DISPATCH_URL||DEFAULT_ENDPOINT,
  seed_order_path=process.env.CEREBRO_UMS_SEED_ORDER_PATH||'',
  export_dir=process.env.CEREBRO_UMS_EXPORT_DIR||'',
  fetch_impl=fetch
}={}){
  required(endpoint,'CEREBRO_UMS_DISPATCH_URL');
  const token=await getGitHubOidcToken({fetch_impl});
  let seeded=null;
  if(seed_order_path){
    const order=JSON.parse(await fs.readFile(seed_order_path,'utf8'));
    seeded=await dispatch(endpoint,'enqueue',token,order,fetch_impl);
  }
  const leased=await dispatch(endpoint,'lease',token,{},fetch_impl);const job=leased?.job;
  if(!job)return Object.freeze({ok:true,status:'NO_JOB',seeded});
  let rendered=null;
  try{
    if(job.engine_id!=='UMS-001'||job.environment!=='PREPROD'||job.request?.kind!=='cerebro.ums.production_order.v1')throw new Error('UMS_JOB_SCOPE_DENIED');
    rendered=await renderOwnedAssetsPremiumVideo(job,{fetch_impl});
    await exportForWorkflow(rendered,export_dir);
    const manifest=await uploadArtifacts(endpoint,token,job,rendered,fetch_impl);
    const resultSummary={
      ok:true,
      stage:'CREATIVE_REVIEW_REQUIRED',
      physical_deliverable:true,
      artifact_count:manifest.length,
      output_type:job.output_type,
      quality_profile:job.request?.quality_profile,
      technical:rendered.technical,
      provenance:rendered.provenance,
      legacy_programmatic_renderer:false,
      bm13_status:'NOT_PASSED_PENDING_CREATIVE_TRIBUNAL',
      human_exception_reason:'CUSTOMER_HUMAN_REQUEST',
      additional_cost_eur:0,
      publish_authorized:false
    };
    await dispatch(endpoint,'complete',token,{job_id:job.job_id,lease_id:job.lease_id,status:'HOLD',result_summary:resultSummary,artifact_manifest:{bucket:'cerebro-creative-assets',artifacts:manifest},error_code:'CREATIVE_REVIEW_REQUIRED'},fetch_impl);
    return Object.freeze({ok:true,status:'CREATIVE_REVIEW_REQUIRED',job_id:job.job_id,seeded,manifest,result_summary:resultSummary});
  }catch(error){
    await dispatch(endpoint,'complete',token,{job_id:job.job_id,lease_id:job.lease_id,status:'FAILED',result_summary:{ok:false,stage:'RENDER_FAILED',additional_cost_eur:0,publish_authorized:false,legacy_programmatic_renderer:false},artifact_manifest:null,error_code:String(error?.message||error).slice(0,240)},fetch_impl).catch(()=>null);
    throw error;
  }finally{if(rendered?.temp)await fs.rm(rendered.temp,{recursive:true,force:true});}
}

async function main(){
  const result=await runOneUmsProductionJob();
  console.log(JSON.stringify({ok:result.ok,status:result.status,job_id:result.job_id??null,seeded_job_id:result.seeded?.job_id??null,artifacts:result.manifest?.map(a=>({filename:a.filename,path:a.path,mime:a.mime,bytes:a.bytes,sha256:a.sha256}))??[],additional_cost_eur:0,publish_authorized:false,legacy_programmatic_renderer:false}));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

export const UMS_PRODUCTION_JOB_RUNNER_V1_CONTRACT=Object.freeze({
  schema_version:'1.0.0',engine_id:'UMS-001',environment:'PREPROD',queue:'cerebro_creative_job_v1',
  dispatcher:'cerebro-ums-production-dispatch-v1',renderer:'UMS_OWNED_ASSETS_CINEMATIC_V1',
  terminal_before_owner_review:'HOLD',stage:'CREATIVE_REVIEW_REQUIRED',legacy_programmatic_renderer:false,
  additional_cost_eur:0,publish_authorized:false
});
