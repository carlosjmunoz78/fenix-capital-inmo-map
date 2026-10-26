import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {createGovernedCloudBrowserWorker} from './cloud-browser-governed-session-v1.mjs';
import {compileBrowser1Commands} from './browser1-access-v1.mjs';
import {decryptWorkspaceSnapshot,encryptWorkspaceSnapshot,exportProfileStorageState,restoreProfileStorageState} from './browser-session-bundle-v1.mjs';
import {pollInteractiveWithRetry} from './browser-interactive-poll-retry-v1.mjs';

const PROD_PROJECT_REF='cluhljgonannaafpmblx';
const PREPROD_PROJECT_REF='hnqlnvakzaywtafeiybt';
const DEFAULT_ENDPOINT=process.env.CEREBRO_BROWSER_INTERACTIVE_URL || `https://${PROD_PROJECT_REF}.supabase.co/functions/v1/cerebro-browser-interactive-v3`;
const WORKSPACE_ENDPOINT=String(process.env.CEREBRO_BROWSER_WORKSPACE_URL||'').trim();
const MAX_SESSION_MS=Math.min(Number(process.env.CEREBRO_BROWSER_INTERACTIVE_MAX_MS||780000),780000);
const FRAME_INTERVAL_MS=Math.max(900,Number(process.env.CEREBRO_BROWSER_INTERACTIVE_FRAME_MS||1400));
const POLL_INTERVAL_MS=Math.max(25,Number(process.env.CEREBRO_BROWSER_INTERACTIVE_POLL_MS||35));
const POLL_TRANSIENT_MAX_ATTEMPTS=Math.max(1,Math.min(Number(process.env.CEREBRO_BROWSER_INTERACTIVE_POLL_RETRY_ATTEMPTS||4),8));
const POLL_TRANSIENT_BASE_DELAY_MS=Math.max(25,Math.min(Number(process.env.CEREBRO_BROWSER_INTERACTIVE_POLL_RETRY_BASE_MS||300),3000));

function required(value,name){if(value===undefined||value===null||value==='')throw new Error(`MISSING_${name}`);return value;}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function b64ToBuffer(v){return Buffer.from(String(v||''),'base64');}
function scrubUrl(raw){try{const u=new URL(String(raw||''));u.username='';u.password='';u.search='';u.hash='';return u.toString();}catch{return '';}}
function privateUrl(raw){const value=String(raw||'');if(value.startsWith('data:'))return value.slice(0,16384);try{const u=new URL(value);if(!['http:','https:','about:'].includes(u.protocol))return'';u.username='';u.password='';return u.toString().slice(0,16384);}catch{return'';}}
function browserChannel(){return String(process.env.CEREBRO_BROWSER_CHANNEL||'').trim();}
function browserWorkerOptions(){const channel=browserChannel();return channel?{launch_options:{channel}}:{};}
function workspaceEnabled(job){const environment=String(job?.environment||'');if(environment==='PREPROD')return WORKSPACE_ENDPOINT.includes(PREPROD_PROJECT_REF);if(environment==='PROD')return String(job?.company_id||'')==='fenix'&&WORKSPACE_ENDPOINT.includes(PROD_PROJECT_REF);return false;}
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

async function callApi(endpoint,route,tokenProvider,body={},fetch_impl=fetch,prefix='BROWSER_V3'){
  const token=required(await tokenProvider(),'WORKER_TOKEN');
  const response=await fetch_impl(`${endpoint.replace(/\/$/,'')}/${route}`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),redirect:'error'});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true)throw new Error(`${prefix}_${route.replace(/\//g,'_').toUpperCase()}_FAILED:${response.status}:${data?.error||'UNKNOWN'}`);
  return data;
}
async function callInteractive(endpoint,route,tokenProvider,body={},fetch_impl=fetch){return callApi(endpoint,route,tokenProvider,body,fetch_impl,'BROWSER_V3');}
async function callWorkspace(route,tokenProvider,body={},fetch_impl=fetch){if(!WORKSPACE_ENDPOINT)throw new Error('BROWSER_WORKSPACE_ENDPOINT_REQUIRED');return callApi(WORKSPACE_ENDPOINT,route,tokenProvider,body,fetch_impl,'BROWSER_WORKSPACE');}

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
    case'KEYBOARD_TYPE':return{type:'KEYBOARD_TYPE',value:String(payload.value??'').slice(0,4000),delay_ms:0};
    case'KEYBOARD_PRESS':return{type:'KEYBOARD_PRESS',key:String(payload.key||'').slice(0,80)};
    case'SCROLL':return{type:'SCROLL',delta_x:Number(payload.delta_x||0),delta_y:Number(payload.delta_y||0)};
    case'SWITCH_TAB':return{type:'SWITCH_TAB',index:Number(payload.index)};
    case'BACK':return{type:'BACK'};
    case'FORWARD':return{type:'FORWARD'};
    case'RELOAD':return{type:'RELOAD'};
    case'NAVIGATE':return{type:'NAVIGATE',url:String(payload.url||'').slice(0,4000)};
    case'OPEN_TAB':return{type:'OPEN_TAB',url:String(payload.url||'').slice(0,4000)};
    case'CLOSE_TAB':return{type:'CLOSE_TAB'};
    default:throw new Error('HUMAN_COMMAND_TYPE_DENIED');
  }
}

function normalizePrivateTabs(raw){return Array.isArray(raw)?raw.slice(0,8).map((tab,index)=>({index:Number.isInteger(tab?.index)?tab.index:index,url:privateUrl(tab?.url),title:String(tab?.title||'').slice(0,240),active:tab?.active===true})).filter(tab=>Boolean(tab.url)):[];}
function actionsFromWorkspaceSnapshot(snapshot){const tabs=normalizePrivateTabs(snapshot?.tabs);if(!tabs.length)return null;const actions=[{type:'NAVIGATE',url:tabs[0].url}];for(const tab of tabs.slice(1))actions.push({type:'OPEN_TAB',url:tab.url});const active=Math.max(0,Math.min(Number(snapshot?.active_tab_index||0),tabs.length-1));if(active>0)actions.push({type:'SWITCH_TAB',index:active});return actions;}
function firstEmail(text){const match=String(text||'').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);return match?match[0].toLowerCase():null;}
function identityState(value){return String(value?.status||value?.verification_state||value||'UNVERIFIED');}
function requireVerifiedIdentity(value){const state=identityState(value);if(state!=='VERIFIED')throw new Error(`WORKSPACE_IDENTITY_NOT_VERIFIED:${state}`);return state;}
function humanRequiredFromIdentity(value){
  const status=identityState(value);
  if(status==='MISMATCH')return{status,reason:'SECURITY_INCIDENT',code:'ACCOUNT_MISMATCH'};
  if(status==='REAUTH_REQUIRED')return{status,reason:'LOW_CONFIDENCE',code:'REAUTH_REQUIRED'};
  if(status==='PENDING_CONFIRMATION')return{status,reason:'LOW_CONFIDENCE',code:'ACCOUNT_CONFIRMATION_REQUIRED'};
  return{status,reason:'LOW_CONFIDENCE',code:'ACCOUNT_IDENTITY_UNVERIFIED'};
}

async function restoreWorkspace(job,tokenProvider,fetch_impl){
  if(!workspaceEnabled(job))return null;
  const restored=await callWorkspace('worker/restore',tokenProvider,{session_id:String(job.job_id)},fetch_impl);
  const bundle=restored?.bundle;
  if(!bundle)return{restored:false,reason:restored?.reason||'NO_ACTIVE_BUNDLE',profile:restored?.profile||null};
  const verificationState=String(bundle.verification_state||'UNVERIFIED');
  if(verificationState!=='VERIFIED')return{restored:false,reason:`IDENTITY_NOT_VERIFIED:${verificationState}`,bundle,profile:restored?.profile||null};
  const key=b64ToBuffer(bundle.key_b64);if(key.length!==32)throw new Error('WORKSPACE_BUNDLE_KEY_INVALID');
  const decrypted=decryptWorkspaceSnapshot(bundle.bundle_ciphertext,bundle.bundle_iv,key,bundle.bundle_sha256);
  await restoreProfileStorageState({browser_profile_id:job.browser_profile_id,storage_state:decrypted.snapshot.storage_state,channel:browserChannel()});
  await callWorkspace('worker/restore-complete',tokenProvider,{session_id:String(job.job_id),bundle_id:bundle.bundle_id},fetch_impl);
  return{restored:true,snapshot:decrypted.snapshot,bundle,profile:restored?.profile||null};
}

async function saveWorkspace(job,tokenProvider,fetch_impl,privateTabs,activeTabIndex,identityVerification){
  if(!workspaceEnabled(job))return null;
  requireVerifiedIdentity(identityVerification);
  const prep=await callWorkspace('worker/prepare-save',tokenProvider,{session_id:String(job.job_id)},fetch_impl);
  const key=b64ToBuffer(prep.key_b64);if(key.length!==32)throw new Error('WORKSPACE_BUNDLE_KEY_INVALID');
  const exported=await exportProfileStorageState({browser_profile_id:job.browser_profile_id,storage_state:undefined,channel:browserChannel()});
  const snapshot={storage_state:exported.storage_state,tabs:normalizePrivateTabs(privateTabs),active_tab_index:Number.isInteger(activeTabIndex)?activeTabIndex:0};
  const encrypted=encryptWorkspaceSnapshot(snapshot,key);
  const committed=await callWorkspace('worker/commit-save',tokenProvider,{session_id:String(job.job_id),bundle_id:prep.bundle_id,bundle_ciphertext:encrypted.ciphertext,bundle_iv:encrypted.iv,bundle_sha256:encrypted.sha256,tabs:snapshot.tabs,active_tab_index:snapshot.active_tab_index,cookie_count:encrypted.cookie_count,origin_count:encrypted.origin_count,expires_at:prep.expires_at},fetch_impl);
  if(String(committed?.bundle?.verification_state||'UNVERIFIED')!=='VERIFIED')throw new Error('WORKSPACE_COMMIT_NOT_VERIFIED');
  return{hibernated:true,bundle_id:committed.bundle.bundle_id||prep.bundle_id,cookie_count:encrypted.cookie_count,origin_count:encrypted.origin_count,tab_count:encrypted.tab_count,verification_state:'VERIFIED'};
}

async function verifyWorkspaceIdentity(worker,base,job,restoreActiveTabIndex,endpoint,tokenProvider,fetch_impl){
  if(!workspaceEnabled(job))return{status:'NOT_APPLICABLE'};
  const profileState=await callWorkspace('worker/profile-state',tokenProvider,{session_id:String(job.job_id)},fetch_impl);
  const profile=profileState?.profile||null;
  const profileVerification=String(profile?.verification_state||'UNVERIFIED');
  const provider=String(profile?.provider||'');
  if(profileVerification==='VERIFIED')return{status:'VERIFIED',provider};
  if(provider!=='google')return{status:profileVerification,provider};
  const originalIndex=Number.isInteger(restoreActiveTabIndex)?Math.max(0,restoreActiveTabIndex):0;
  let verificationTabOpened=false;
  try{
    const opened=await worker.execute({...base,actions:[{type:'OPEN_TAB',url:'https://myaccount.google.com/'}],keep_session_open:true,capture_final_evidence:false});
    if(opened?.ok!==true){
      await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:'LOW_CONFIDENCE',detail:{code:'ACCOUNT_IDENTITY_UNVERIFIED',provider:'google'}},fetch_impl).catch(()=>null);
      return{status:'UNVERIFIED'};
    }
    verificationTabOpened=true;
    const inspected=await worker.execute({...base,actions:[{type:'WAIT',ms:1200},{type:'EXTRACT_TEXT',target:{selector:'body'}}],keep_session_open:true,capture_final_evidence:false});
    if(inspected?.ok!==true){
      await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:'LOW_CONFIDENCE',detail:{code:'ACCOUNT_IDENTITY_UNVERIFIED',provider:'google'}},fetch_impl).catch(()=>null);
      return{status:'UNVERIFIED'};
    }
    const accountUrl=String(inspected.final_url||opened.final_url||'');
    if(accountUrl.includes('accounts.google.com')&&(accountUrl.includes('signin')||accountUrl.includes('ServiceLogin'))){
      const observed=await callWorkspace('worker/observe-account',tokenProvider,{session_id:String(job.job_id),reauth_required:true},fetch_impl);
      await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:'LOW_CONFIDENCE',detail:{code:'REAUTH_REQUIRED',provider:'google'}},fetch_impl).catch(()=>null);
      return observed;
    }
    const email=firstEmail(inspected.results?.[1]);
    if(!email){
      await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:'LOW_CONFIDENCE',detail:{code:'ACCOUNT_IDENTITY_UNVERIFIED',provider:'google'}},fetch_impl).catch(()=>null);
      return{status:'UNVERIFIED'};
    }
    const observed=await callWorkspace('worker/observe-account',tokenProvider,{session_id:String(job.job_id),account_email:email},fetch_impl);
    if(observed.status==='PENDING_CONFIRMATION')await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:'LOW_CONFIDENCE',detail:{code:'ACCOUNT_CONFIRMATION_REQUIRED',provider:'google',account_hint:observed.account_hint}},fetch_impl).catch(()=>null);
    else if(observed.status==='MISMATCH')await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:'SECURITY_INCIDENT',detail:{code:'ACCOUNT_MISMATCH',provider:'google',account_hint:observed.account_hint}},fetch_impl).catch(()=>null);
    return observed;
  }finally{
    if(verificationTabOpened){
      await worker.execute({...base,actions:[{type:'CLOSE_TAB'},{type:'SWITCH_TAB',index:originalIndex}],keep_session_open:true,capture_final_evidence:false}).catch(()=>{});
    }
  }
}

async function captureFrame(worker,base,sessionId,key,seq,endpoint,tokenProvider,fetch_impl){
  const result=await worker.execute({...base,actions:[{type:'SCREENSHOT',label:`live-${seq}`}],keep_session_open:true,capture_final_evidence:false});
  if(result?.ok!==true)throw new Error(`INTERACTIVE_FRAME_NOT_AUTHORIZED:${result?.authorization?.status||'UNKNOWN'}`);
  const file=result.results?.[0]?.file;if(!file)throw new Error('INTERACTIVE_FRAME_FILE_MISSING');
  let bytes;try{bytes=await fs.readFile(file);}finally{await fs.unlink(file).catch(()=>{});}
  const encrypted=encryptBytes(bytes,key);const url=scrubUrl(result.final_url);
  const privateTabs=normalizePrivateTabs(result.tabs);
  const tabs=privateTabs.length?privateTabs.map(tab=>({...tab,url:scrubUrl(tab.url)})):(url?[{index:0,url,title:'',active:true}]:[]);
  const activeTabIndex=Number.isInteger(result.active_tab_index)?result.active_tab_index:(tabs.find(tab=>tab.active)?.index??0);
  await callInteractive(endpoint,'worker/frame',tokenProvider,{session_id:sessionId,frame_ciphertext:encrypted.ciphertext,frame_iv:encrypted.iv,frame_seq:seq,frame_mime:'image/png',current_url:url,current_title:String(result.current_title||'').slice(0,240),tabs,active_tab_index:activeTabIndex,viewport_width:Number(result.viewport_width||1440),viewport_height:Number(result.viewport_height||1000)},fetch_impl);
  return{final_url:url,frame_seq:seq,private_tabs:privateTabs,active_tab_index:activeTabIndex};
}

export async function runInteractiveBrowserSessionV3({job,token=null,token_provider=null,fetch_impl=fetch,endpoint=DEFAULT_ENDPOINT}={}){
  required(job?.job_id,'JOB_ID');
  const tokenProvider=typeof token_provider==='function'?token_provider:async()=>required(token,'WORKER_TOKEN');
  if(String(job.capability)!=='browser1.interactive')throw new Error('INTERACTIVE_CAPABILITY_REQUIRED');
  assertInteractiveScope(job,endpoint);
  const base=buildBaseJob(job);const sessionId=String(job.job_id);
  const restoredWorkspace=await restoreWorkspace(job,tokenProvider,fetch_impl);
  const worker=createGovernedCloudBrowserWorker({max_tabs:8,...browserWorkerOptions()});
  const startedAt=Date.now();let seq=0,lastFrameAt=0,lastUrl='';let opened=false,closed=false,stopRequested=false,hibernateRequested=false;let lastPrivateTabs=[],lastActiveTabIndex=0;let identityVerification={status:'NOT_APPLICABLE'};
  const publishFrame=async key=>{seq+=1;const frame=await captureFrame(worker,base,sessionId,key,seq,endpoint,tokenProvider,fetch_impl);lastUrl=frame.final_url||lastUrl;lastPrivateTabs=frame.private_tabs;lastActiveTabIndex=frame.active_tab_index;lastFrameAt=Date.now();return frame;};
  try{
    const resumeActions=restoredWorkspace?.restored?actionsFromWorkspaceSnapshot(restoredWorkspace.snapshot):null;
    const initialActions=resumeActions||compileBrowser1Commands(job.commands||[],{mode:'MUTATE'});
    const initial=await worker.execute({...base,actions:initialActions,keep_session_open:true,capture_final_evidence:false});
    if(initial?.ok!==true)throw new Error(`INTERACTIVE_INITIAL_NOT_AUTHORIZED:${initial?.authorization?.status||'UNKNOWN'}`);
    lastUrl=scrubUrl(initial.final_url);lastPrivateTabs=normalizePrivateTabs(initial.tabs);lastActiveTabIndex=Number.isInteger(initial.active_tab_index)?initial.active_tab_index:0;
    await callInteractive(endpoint,'worker/open',tokenProvider,{session_id:sessionId},fetch_impl);opened=true;
    const keyResult=await callInteractive(endpoint,'worker/key',tokenProvider,{session_id:sessionId},fetch_impl);const key=b64ToBuffer(keyResult.key_b64);if(key.length!==32)throw new Error('INTERACTIVE_KEY_INVALID');
    if(workspaceEnabled(job))identityVerification=await verifyWorkspaceIdentity(worker,base,job,lastActiveTabIndex,endpoint,tokenProvider,fetch_impl);
    await publishFrame(key);
    while(Date.now()-startedAt<MAX_SESSION_MS){
      const poll=await pollInteractiveWithRetry({
        poll:()=>callInteractive(endpoint,'worker/poll',tokenProvider,{session_id:sessionId},fetch_impl),
        sleep,
        max_attempts:POLL_TRANSIENT_MAX_ATTEMPTS,
        base_delay_ms:POLL_TRANSIENT_BASE_DELAY_MS
      });
      if(poll.stop===true||poll.state==='STOPPED'){stopRequested=true;break;}
      if(poll.hibernate===true||poll.state==='HIBERNATE_PENDING'){hibernateRequested=true;break;}
      let processedCommand=false;
      if(poll.command){
        processedCommand=true;
        let ok=false,errorCode=null;
        try{
          const payload=decryptJson(poll.command.payload_ciphertext,poll.command.payload_iv,key);
          const action=humanAction(poll.command.command_type,payload);
          const result=await worker.execute({...base,actions:[action],keep_session_open:true,capture_final_evidence:false});
          ok=result?.ok===true;lastUrl=scrubUrl(result?.final_url||lastUrl);lastPrivateTabs=normalizePrivateTabs(result?.tabs||lastPrivateTabs);lastActiveTabIndex=Number.isInteger(result?.active_tab_index)?result.active_tab_index:lastActiveTabIndex;if(!ok)errorCode=result?.authorization?.status||'HUMAN_ACTION_NOT_AUTHORIZED';
        }catch(error){errorCode=String(error?.message||error).slice(0,120);}
        await callInteractive(endpoint,'worker/complete',tokenProvider,{session_id:sessionId,command_id:poll.command.command_id,ok,error_code:errorCode},fetch_impl);
      }
      if(poll.handback===true){
        await publishFrame(key);
        identityVerification=await verifyWorkspaceIdentity(worker,base,job,lastActiveTabIndex,endpoint,tokenProvider,fetch_impl);
        await publishFrame(key);
        await callInteractive(endpoint,'worker/handback-complete',tokenProvider,{session_id:sessionId},fetch_impl);
      }else if(!processedCommand&&Date.now()-lastFrameAt>=FRAME_INTERVAL_MS){
        await publishFrame(key);
      }
      if(processedCommand)continue;
      await sleep(POLL_INTERVAL_MS);
    }
    if(opened&&!stopRequested)await publishFrame(key);
    if(workspaceEnabled(job)&&!stopRequested&&identityState(identityVerification)!=='VERIFIED')identityVerification=await verifyWorkspaceIdentity(worker,base,job,lastActiveTabIndex,endpoint,tokenProvider,fetch_impl);
    const verificationState=identityState(identityVerification);
    await worker.stop(stopRequested?'INTERACTIVE_SESSION_STOPPED':hibernateRequested?'INTERACTIVE_SESSION_HIBERNATE_REQUESTED':'INTERACTIVE_SESSION_AUTO_HIBERNATE');
    if(stopRequested){
      if(opened){await callInteractive(endpoint,'worker/close',tokenProvider,{session_id:sessionId,state:'CLOSED'},fetch_impl);closed=true;}
      return{ok:true,authorization:{status:'AUTHORIZED'},results:[],final_url:lastUrl,final_evidence:null,interactive_session:true,session_id:sessionId,frame_seq:seq,workspace_hibernated:false,workspace_bundle_id:null,workspace_verification_state:verificationState,workspace_hibernate_reason:'STOPPED',workspace_restore:restoredWorkspace?.restored===true?'RESTORED':restoredWorkspace?.reason||'NONE'};
    }
    if(workspaceEnabled(job)&&verificationState!=='VERIFIED'){
      const human=humanRequiredFromIdentity(identityVerification);
      if(opened){await callInteractive(endpoint,'worker/close',tokenProvider,{session_id:sessionId,state:'CLOSED'},fetch_impl);closed=true;}
      return{ok:false,authorization:{status:'HUMAN_REQUIRED',reason:human.reason,code:human.code},results:[],final_url:lastUrl,final_evidence:null,interactive_session:true,session_id:sessionId,frame_seq:seq,human_required:true,human_required_reason:human.reason,human_required_code:human.code,workspace_hibernated:false,workspace_bundle_id:null,workspace_verification_state:verificationState,workspace_hibernate_reason:hibernateRequested?'REQUESTED':'AUTO_TIMEOUT',workspace_restore:restoredWorkspace?.restored===true?'RESTORED':restoredWorkspace?.reason||'NONE'};
    }
    const workspace=await saveWorkspace(job,tokenProvider,fetch_impl,lastPrivateTabs,lastActiveTabIndex,identityVerification);
    if(opened){await callInteractive(endpoint,'worker/close',tokenProvider,{session_id:sessionId,state:workspace?.hibernated===true?'HIBERNATED':'CLOSED'},fetch_impl);closed=true;}
    return{ok:true,authorization:{status:'AUTHORIZED'},results:[],final_url:lastUrl,final_evidence:null,interactive_session:true,session_id:sessionId,frame_seq:seq,workspace_hibernated:workspace?.hibernated===true,workspace_bundle_id:workspace?.bundle_id||null,workspace_verification_state:workspace?.verification_state||verificationState,workspace_hibernate_reason:hibernateRequested?'REQUESTED':'AUTO_TIMEOUT',workspace_restore:restoredWorkspace?.restored===true?'RESTORED':restoredWorkspace?.reason||'NONE'};
  }catch(error){
    await worker.stop('INTERACTIVE_SESSION_FAILED').catch(()=>{});
    if(opened&&!closed)await callInteractive(endpoint,'worker/close',tokenProvider,{session_id:sessionId,state:'ERROR'},fetch_impl).catch(()=>{});
    throw error;
  }
}

export const BROWSER_INTERACTIVE_V3_CONTRACT=Object.freeze({schema_version:'3.5.7',capability:'browser1.interactive',supported_environments:['PREPROD','PROD'],environment_endpoint_binding:true,multi_company_preprod:true,prod_company_scope:'fenix',same_runtime:'PLAYWRIGHT_CHROMIUM',same_v2_queue:true,host_browser_channel_supported:true,oidc_refresh_provider_supported:true,exclusive_control_lease:true,frames_encrypted_aes_gcm:true,human_input_encrypted_aes_gcm:true,adaptive_realtime_loop:true,transient_poll_retry:true,transient_poll_retry_attempts:POLL_TRANSIENT_MAX_ATTEMPTS,immediate_post_action_frame:false,privacy_frame_suppression_during_human_input:true,workspace_hibernate_preprod:true,workspace_hibernate_prod:true,workspace_immediate_hibernate:true,workspace_tabs_encrypted:true,workspace_identity_verification:'OWNER_OR_GOOGLE_VERIFIED_ONLY_FAIL_CLOSED',handback_preserves_active_tab:true,human_required_queue_outcome:'HOLD',workspace_prod_enabled:true,raw_cdp_exposed:false,max_tabs:8,default_browser1_unchanged:true,incremental_cost_eur:0});