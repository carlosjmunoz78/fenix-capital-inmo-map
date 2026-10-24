import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {createGovernedCloudBrowserWorker} from './cloud-browser-governed-session-v1.mjs';
import {compileBrowser1Commands} from './browser1-access-v1.mjs';

const PROD_PROJECT_REF='cluhljgonannaafpmblx';
const PREPROD_PROJECT_REF='hnqlnvakzaywtafeiybt';
const DEFAULT_ENDPOINT=process.env.CEREBRO_BROWSER_INTERACTIVE_URL || `https://${PROD_PROJECT_REF}.supabase.co/functions/v1/cerebro-browser-interactive-v3`;
const MAX_SESSION_MS=Math.min(Number(process.env.CEREBRO_BROWSER_INTERACTIVE_MAX_MS||780000),780000);
const FRAME_INTERVAL_MS=Math.max(900,Number(process.env.CEREBRO_BROWSER_INTERACTIVE_FRAME_MS||1400));
const POLL_INTERVAL_MS=Math.max(250,Number(process.env.CEREBRO_BROWSER_INTERACTIVE_POLL_MS||450));

function required(value,name){if(value===undefined||value===null||value==='')throw new Error(`MISSING_${name}`);return value;}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function b64ToBuffer(v){return Buffer.from(String(v||''),'base64');}
function scrubUrl(raw){try{const u=new URL(String(raw||''));u.username='';u.password='';u.search='';u.hash='';return u.toString();}catch{return '';}}
function browserWorkerOptions(){const channel=String(process.env.CEREBRO_BROWSER_CHANNEL||'').trim();return channel?{launch_options:{channel}}:{};}
function assertInteractiveScope(job,endpoint){
  const environment=String(job?.environment||'');
  const company=String(job?.company_id||'');
  const target=String(endpoint||'');
  if(environment==='PROD'){
    if(company!=='fenix'||!target.includes(PROD_PROJECT_REF))throw new Error('INTERACTIVE_SCOPE_DENIED');
    return;
  }
  if(environment==='PREPROD'){
    if(!company||company.length>120||!target.includes(PREPROD_PROJECT_REF))throw new Error('INTERACTIVE_SCOPE_DENIED');
    return;
  }
  throw new Error('INTERACTIVE_SCOPE_DENIED');
}

async function callInteractive(endpoint,route,tokenProvider,body={},fetch_impl=fetch){
  const token=required(await tokenProvider(),'WORKER_TOKEN');
  const response=await fetch_impl(`${endpoint.replace(/\/$/,'')}/${route}`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),redirect:'error'});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true)throw new Error(`BROWSER_V3_${route.replace(/\//g,'_').toUpperCase()}_FAILED:${response.status}:${data?.error||'UNKNOWN'}`);
  return data;
}

function encryptBytes(bytes,key){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const encrypted=Buffer.concat([cipher.update(bytes),cipher.final(),cipher.getAuthTag()]);
  return{ciphertext:encrypted.toString('base64'),iv:iv.toString('base64')};
}
function decryptJson(ciphertextB64,ivB64,key){
  const packed=b64ToBuffer(ciphertextB64);if(packed.length<17)throw new Error('ENCRYPTED_INPUT_INVALID');
  const body=packed.subarray(0,-16),tag=packed.subarray(-16);
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,b64ToBuffer(ivB64));decipher.setAuthTag(tag);
  const plain=Buffer.concat([decipher.update(body),decipher.final()]).toString('utf8');
  const value=JSON.parse(plain);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('INPUT_PAYLOAD_INVALID');return value;
}

function buildBaseJob(job){
  const authority=job.authority&&typeof job.authority==='object'?job.authority:{};
  return{
    request_id:String(job.job_id),audit_id:required(job.audit_id,'AUDIT_ID'),company_id:required(job.company_id,'COMPANY_ID'),department_id:required(job.department_id,'DEPARTMENT_ID'),engine_id:required(job.engine_id,'ENGINE_ID'),environment:required(job.environment,'ENVIRONMENT'),version:job.version||'v3',identity_id:job.identity_id||'public',account_id:job.account_id||'public',browser_profile_id:required(job.browser_profile_id,'BROWSER_PROFILE_ID'),
    profile_scope:{company_id:job.company_id,identity_id:job.identity_id||'public',environment:job.environment},canonical_engine_ids:authority.canonical_engine_ids||[],browser_binding:authority.browser_binding||{},engine_authority:authority.engine_authority||{},kill_switch_enabled:authority.kill_switch_enabled===true,
    operation:{kind:'ROUTINE_MUTATION',authenticated_session_required:false,incremental_spend_eur:0},action_timeout_ms:30000,capture_final_evidence:false,keep_session_open:true
  };
}
function humanAction(commandType,payload){
  switch(String(commandType||'')){
    case'CLICK_POINT':return{type:'CLICK_POINT',x:Number(payload.x),y:Number(payload.y),button:payload.button||'left'};
    case'DOUBLE_CLICK_POINT':return{type:'DOUBLE_CLICK_POINT',x:Number(payload.x),y:Number(payload.y),button:payload.button||'left'};
    case'MOVE_POINT':return{type:'MOVE_POINT',x:Number(payload.x),y:Number(payload.y),steps:Math.max(1,Math.min(Number(payload.steps||1),20))};
    case'KEYBOARD_TYPE':return{type:'KEYBOARD_TYPE',value:String(payload.value??'').slice(0,4000),delay_ms:Math.max(0,Math.min(Number(payload.delay_ms||0),80))};
    case'KEYBOARD_PRESS':return{type:'KEYBOARD_PRESS',key:String(payload.key||'').slice(0,80)};
    case'SCROLL':return{type:'SCROLL',delta_x:Number(payload.delta_x||0),delta_y:Number(payload.delta_y||0)};
    case'SWITCH_TAB':return{type:'SWITCH_TAB',index:Number(payload.index)};
    case'BACK':return{type:'BACK'};
    case'FORWARD':return{type:'FORWARD'};
    case'RELOAD':return{type:'RELOAD'};
    case'OPEN_TAB':return{type:'OPEN_TAB',url:String(payload.url||'').slice(0,4000)};
    case'CLOSE_TAB':return{type:'CLOSE_TAB'};
    default:throw new Error('HUMAN_COMMAND_TYPE_DENIED');
  }
}

async function captureFrame(worker,base,sessionId,key,seq,endpoint,tokenProvider,fetch_impl){
  const result=await worker.execute({...base,actions:[{type:'SCREENSHOT',label:`live-${seq}`}],keep_session_open:true,capture_final_evidence:false});
  if(result?.ok!==true)throw new Error(`INTERACTIVE_FRAME_NOT_AUTHORIZED:${result?.authorization?.status||'UNKNOWN'}`);
  const file=result.results?.[0]?.file;if(!file)throw new Error('INTERACTIVE_FRAME_FILE_MISSING');
  let bytes;try{bytes=await fs.readFile(file);}finally{await fs.unlink(file).catch(()=>{});}
  const encrypted=encryptBytes(bytes,key);const url=scrubUrl(result.final_url);
  const tabs=Array.isArray(result.tabs)&&result.tabs.length?result.tabs.slice(0,32).map((tab,index)=>({index:Number.isInteger(tab?.index)?tab.index:index,url:scrubUrl(tab?.url),title:String(tab?.title||'').slice(0,240),active:tab?.active===true})):(url?[{index:0,url,title:'',active:true}]:[]);
  const activeTabIndex=Number.isInteger(result.active_tab_index)?result.active_tab_index:(tabs.find(tab=>tab.active)?.index??0);
  await callInteractive(endpoint,'worker/frame',tokenProvider,{session_id:sessionId,frame_ciphertext:encrypted.ciphertext,frame_iv:encrypted.iv,frame_seq:seq,frame_mime:'image/png',current_url:url,current_title:String(result.current_title||'').slice(0,240),tabs,active_tab_index:activeTabIndex,viewport_width:Number(result.viewport_width||1440),viewport_height:Number(result.viewport_height||1000)},fetch_impl);
  return{final_url:url,frame_seq:seq};
}

export async function runInteractiveBrowserSessionV3({job,token=null,token_provider=null,fetch_impl=fetch,endpoint=DEFAULT_ENDPOINT}={}){
  required(job?.job_id,'JOB_ID');
  const tokenProvider=typeof token_provider==='function'?token_provider:async()=>required(token,'WORKER_TOKEN');
  if(String(job.capability)!=='browser1.interactive')throw new Error('INTERACTIVE_CAPABILITY_REQUIRED');
  assertInteractiveScope(job,endpoint);
  const base=buildBaseJob(job);const sessionId=String(job.job_id);
  const worker=createGovernedCloudBrowserWorker({max_tabs:8,...browserWorkerOptions()});
  const startedAt=Date.now();let seq=0,lastFrameAt=0,lastUrl='';let opened=false;let closed=false;
  try{
    const initialActions=compileBrowser1Commands(job.commands||[],{mode:'MUTATE'});
    const initial=await worker.execute({...base,actions:initialActions,keep_session_open:true,capture_final_evidence:false});
    if(initial?.ok!==true)throw new Error(`INTERACTIVE_INITIAL_NOT_AUTHORIZED:${initial?.authorization?.status||'UNKNOWN'}`);
    lastUrl=scrubUrl(initial.final_url);
    await callInteractive(endpoint,'worker/open',tokenProvider,{session_id:sessionId},fetch_impl);opened=true;
    const keyResult=await callInteractive(endpoint,'worker/key',tokenProvider,{session_id:sessionId},fetch_impl);const key=b64ToBuffer(keyResult.key_b64);if(key.length!==32)throw new Error('INTERACTIVE_KEY_INVALID');
    while(Date.now()-startedAt<MAX_SESSION_MS){
      const poll=await callInteractive(endpoint,'worker/poll',tokenProvider,{session_id:sessionId},fetch_impl);
      if(poll.stop===true||poll.state==='STOPPED')break;
      if(poll.command){
        let ok=false,errorCode=null;
        try{
          const payload=decryptJson(poll.command.payload_ciphertext,poll.command.payload_iv,key);
          const action=humanAction(poll.command.command_type,payload);
          const result=await worker.execute({...base,actions:[action],keep_session_open:true,capture_final_evidence:false});
          ok=result?.ok===true;lastUrl=scrubUrl(result?.final_url||lastUrl);if(!ok)errorCode=result?.authorization?.status||'HUMAN_ACTION_NOT_AUTHORIZED';
        }catch(error){errorCode=String(error?.message||error).slice(0,120);}
        await callInteractive(endpoint,'worker/complete',tokenProvider,{session_id:sessionId,command_id:poll.command.command_id,ok,error_code:errorCode},fetch_impl);
      }
      if(poll.handback===true){
        seq+=1;const frame=await captureFrame(worker,base,sessionId,key,seq,endpoint,tokenProvider,fetch_impl);lastUrl=frame.final_url||lastUrl;lastFrameAt=Date.now();
        await callInteractive(endpoint,'worker/handback-complete',tokenProvider,{session_id:sessionId},fetch_impl);
      }
      if(Date.now()-lastFrameAt>=FRAME_INTERVAL_MS){seq+=1;const frame=await captureFrame(worker,base,sessionId,key,seq,endpoint,tokenProvider,fetch_impl);lastUrl=frame.final_url||lastUrl;lastFrameAt=Date.now();}
      await sleep(POLL_INTERVAL_MS);
    }
    await worker.stop('INTERACTIVE_SESSION_COMPLETE');
    if(opened){await callInteractive(endpoint,'worker/close',tokenProvider,{session_id:sessionId,state:'CLOSED'},fetch_impl);closed=true;}
    return{ok:true,authorization:{status:'AUTHORIZED'},results:[],final_url:lastUrl,final_evidence:null,interactive_session:true,session_id:sessionId,frame_seq:seq};
  }catch(error){
    await worker.stop('INTERACTIVE_SESSION_FAILED').catch(()=>{});
    if(opened&&!closed)await callInteractive(endpoint,'worker/close',tokenProvider,{session_id:sessionId,state:'ERROR'},fetch_impl).catch(()=>{});
    throw error;
  }
}

export const BROWSER_INTERACTIVE_V3_CONTRACT=Object.freeze({schema_version:'3.2.0',capability:'browser1.interactive',supported_environments:['PREPROD','PROD'],environment_endpoint_binding:true,multi_company_preprod:true,prod_company_scope:'fenix',same_runtime:'PLAYWRIGHT_CHROMIUM',same_v2_queue:true,host_browser_channel_supported:true,oidc_refresh_provider_supported:true,exclusive_control_lease:true,frames_encrypted_aes_gcm:true,human_input_encrypted_aes_gcm:true,raw_cdp_exposed:false,max_tabs:8,default_browser1_unchanged:true,incremental_cost_eur:0});
