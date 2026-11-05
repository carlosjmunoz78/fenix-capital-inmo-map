/**
 * FACT-001 parallel AI image lane for already-leased creative jobs.
 * Existing deterministic jobs remain unchanged. Paid images and future videos are allowed.
 * The legacy queue is still zero-cost-only, so use a metered media lane before paid execution.
 */
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {buildCerebroCreativeOrder} from './creative-social-prompt-v0.mjs';
import {generateOpenAiScene,preflightOpenAiCost} from './creative-openai-image-adapter-v0.mjs';
import {fetchFenixOfficialLogo,renderSocialImage} from './creative-social-compositor-v0.mjs';

function sha(b){return createHash('sha256').update(b).digest('hex');}
export function assessAiCreativeJob(job,{env=process.env}={}){
 const request=job?.request??{};
 if(request.creative_payload?.scene_provider!=='OPENAI_IMAGE')
   return {is_ai:false,status:'LEGACY_DETERMINISTIC_UNCHANGED'};
 if(job.environment!=='PREPROD'||job.company_id!=='fenix'||job.engine_id!=='FACT-001'||job.channel!=='FACEBOOK'||job.output_type!=='SQUARE_POST')
   return {is_ai:true,ready:false,status:'HOLD',reason:'SCOPE_DENIED'};
 const b=request.creative_payload?.brief;
 let order;
 try{order=buildCerebroCreativeOrder(b);}catch{return {is_ai:true,ready:false,status:'HOLD',reason:'BRIEF_NOT_READY'};}
 if(order.company_id!==job.company_id||order.engine_id!=='SOC-001'||order.environment!==job.environment||
    request.creative_payload?.requester_engine_id!=='SOC-001')
   return {is_ai:true,ready:false,status:'HOLD',reason:'SCOPE_MISMATCH'};
 if(!Number.isFinite(Number(request.expected_cost_eur))||Number(request.expected_cost_eur)<=0)
   return {is_ai:true,ready:false,status:'HOLD',reason:'MONEY_LIMIT'};
 const reserve=request.ai_spend_approval?.estimated_max_eur;
 if(Number(request.expected_cost_eur)<Number(reserve))
   return {is_ai:true,ready:false,status:'HOLD',reason:'MONEY_LIMIT'};
 const gate=preflightOpenAiCost({order,approval:request.ai_spend_approval,env});
 if(!gate.allowed)return {is_ai:true,ready:false,status:'HOLD',reason:gate.reason,order};
 return {is_ai:true,ready:true,status:'AI_IMAGE_AUTHORIZED_BUT_NOT_PUBLISHED',order,approval:request.ai_spend_approval};
}
export async function renderAiCreativeJob(job,{env=process.env,fetch_impl=fetch}={}){
 const assessment=assessAiCreativeJob(job,{env});
 if(!assessment.is_ai)throw Error('AI_MODE_NOT_REQUESTED');
 if(!assessment.ready)return {status:'HOLD',reason:assessment.reason,publish_authorized:false,spent_eur:0};
 const scene=await generateOpenAiScene({order:assessment.order,approval:assessment.approval,env,fetch_impl});
 if(!scene.allowed)return {status:'HOLD',reason:scene.reason,publish_authorized:false,api_called:scene.api_called,cost_uncertain:scene.cost_uncertain??false};
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'fact001-photo-ai-'));
 try{
   const logo=await fetchFenixOfficialLogo({fetch_impl});
   const render=await renderSocialImage({order:assessment.order,photo_png:scene.photo_png,logo_png:logo});
   const aiName=`scene-${job.job_id}.png`,finalName=`facebook-${job.job_id}.png`;
   const photoPath=path.join(temp,aiName),finalPath=path.join(temp,finalName);
   await fs.writeFile(photoPath,scene.photo_png);
   await fs.writeFile(finalPath,render.png);
   return {status:'RENDERED_QA_PENDING',temp,preset:{width:1080,height:1080,kind:'IMAGE'},
     artifacts:[
       {filename:aiName,mime:'image/png',local_path:photoPath,bytes:scene.photo_png.length,sha256:scene.image_sha256,width:1024,height:1024,role:'PRIVATE_GENERATED_SCENE'},
       {filename:finalName,mime:'image/png',local_path:finalPath,bytes:render.png.length,sha256:render.sha256,width:1080,height:1080,role:'PRIVATE_SOCIAL_CANDIDATE'}
     ],evaluation:{visual_quality:'PENDING_INDEPENDENT',brand:'PENDING_INDEPENDENT',policy:'PENDING_INDEPENDENT',
       provenance:{prompt_sha256:assessment.order.prompt_sha256,work_order_sha256:assessment.order.work_order_sha256,
       photo_sha256:scene.image_sha256,final_sha256:render.sha256,model:scene.model,logo_alpha_verified:render.checks.logo_transparent_fraction>0.1,
       real_photo_claim:false,synthetic_scene:true}},
     cost:{request_reserved_eur:assessment.approval.estimated_max_eur,spent_eur_verified:false},
     provider_request_id:scene.provider_request_id,publish_authorized:false};
 }catch(e){await fs.rm(temp,{recursive:true,force:true});throw e;}
}
