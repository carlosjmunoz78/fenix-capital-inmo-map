/**
 * FACT-001 provider adapter for OpenAI /images/generations.
 * It NEVER executes unless a finance-approved paid lane has explicitly been
 * enabled on the secure worker. No subscription, no publish authority,
 * no secrets in logs. Prompt comes from buildCerebroCreativeOrder().
 */
import {createHash} from 'node:crypto';
import {buildCerebroCreativeOrder} from './creative-social-prompt-v0.mjs';

const URL='https://api.openai.com/v1/images/generations';
const MODEL='gpt-image-2.5-flare';
const PNG_MAGIC=Buffer.from([137,80,78,71,13,10,26,10]);
function hash(b){return createHash('sha256').update(b).digest('hex');}
function isPosNumber(v){return typeof v==='number'&&Number.isFinite(v)&&v>0;}
export function preflightOpenAiCost({order,approval=null,env={}}){
 if(!order||order.environment!=='PREPROD')return {allowed:false,status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT'};
 if(order.ai_scene_request?.model!==MODEL||order.ai_scene_request.n!==1)return {allowed:false,status:'BLOCKED',reason:'PROVIDER_MODEL_OR_COUNT_DENIED'};
 if(env.OPENAI_IMAGE_PROVIDER_ENABLED!=='true')return {allowed:false,status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT'};
 if(!approval||approval.decision!=='APPROVED'||approval.approver!=='CARLOS-ADMIN'||typeof approval.approval_id!=='string'||!/^CREATIVE-AI-[A-Za-z0-9_-]{8,90}$/.test(approval.approval_id))
   return {allowed:false,status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT'};
 const expires=Date.parse(approval.expires_at??'');
 if(!Number.isFinite(expires)||expires<=Date.now()||expires>Date.now()+7*86400000)return {allowed:false,status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT'};
 if(approval.company_id!==order.company_id||approval.engine_id!==order.engine_id||approval.request_key!==order.request_key||approval.work_order_sha256!==order.work_order_sha256)
   return {allowed:false,status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT'};
 const maxBudget=Number(env.OPENAI_IMAGE_MAX_EUR_PER_REQUEST);
 const confirmed=approval.max_eur;
 const reservation=approval.estimated_max_eur;
 if(!isPosNumber(maxBudget)||!isPosNumber(confirmed)||!isPosNumber(reservation)||reservation>confirmed||reservation>maxBudget||approval.max_images!==1)
   return {allowed:false,status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT'};
 // The environment approval must be backed by a server-side checked record.
 // A user-supplied approval object alone must never authorize spending.
 if(env.OPENAI_IMAGE_VERIFIED_APPROVAL_ID!==approval.approval_id)
   return {allowed:false,status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT'};
 return {allowed:true,status:'COST_LANE_APPROVED_FOR_ONE_IMAGE',max_cost_eur:confirmed,reservation_eur:reservation,approved_record:approval.approval_id};
}

export async function generateOpenAiScene({order,approval=null,env=process.env,fetch_impl=fetch}={}){
 const gate=preflightOpenAiCost({order,approval,env});
 if(!gate.allowed)return {...gate,api_called:false,cost_incurred:false};
 const apiKey=env.OPENAI_API_KEY;
 if(!apiKey||typeof apiKey!=='string'||apiKey.length<15)return {allowed:false,status:'BLOCKED',reason:'OPENAI_API_KEY_MISSING',api_called:false,cost_incurred:false};
 let response;
 try{
   response=await fetch_impl(URL,{
     method:'POST',
     redirect:'error',
     headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
     body:JSON.stringify({
       model:MODEL,
       prompt:order.ai_scene_request.prompt,
       size:'1024x1024',
       quality:'high',
       output_format:'png',
       n:1,
       background:'opaque'
     }),
     signal:AbortSignal.timeout(90000)
   });
 }catch(e){return {allowed:false,status:'HOLD_PROVIDER_UNAVAILABLE',reason:'NETWORK_OR_TIMEOUT',api_called:true,cost_uncertain:true};}
 if(!response.ok)return {allowed:false,status:'HOLD_PROVIDER_ERROR',reason:`OPENAI_HTTP_${response.status}`,api_called:true,cost_uncertain:response.status>=500};
 const data=await response.json().catch(()=>null);
 const b64=data?.data?.[0]?.b64_json;
 if(typeof b64!=='string'||b64.length>16000000||!/^[a-zA-Z0-9+/=]+$/.test(b64))
   return {allowed:false,status:'HOLD_INVALID_IMAGE_RESPONSE',api_called:true,cost_uncertain:true};
 const png=Buffer.from(b64,'base64');
 if(png.length<10000||png.length>12000000||!png.subarray(0,8).equals(PNG_MAGIC))
   return {allowed:false,status:'HOLD_INVALID_PNG',api_called:true,cost_uncertain:true};
 return {
   allowed:true,status:'GENERATED_SCENE_NOT_BRANDED_NOT_PUBLISHABLE',
   api_called:true,model:MODEL,image_sha256:hash(png),image_bytes:png.length,
   photo_png:png,provider_request_id:response.headers?.get?.('x-request-id')??null,
   api_usage:data?.usage??null,
   spent_eur_verified:false,spend_reservation_eur:gate.reservation_eur,
   brand_qa:false,editorial_qa:false,publish_authorized:false
 };
}
export function prepareCerebroAiSocialJob(input){
 const order=buildCerebroCreativeOrder(input);
 return {order,execution:'HOLD_UNTIL_EXISTING_GATEWAY_BUDGET_APPROVED',model:MODEL,
         publish_authorized:false,uses_existing_factory:'FACT-001',consumer:'SOC-001'};
}
