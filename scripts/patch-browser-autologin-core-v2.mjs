import fs from 'node:fs';

const runnerPath='cerebro/runtime/browser-job-runner-v2.mjs';
const runtimePath='cerebro/runtime/browser-interactive-session-v3.mjs';
const ownerPath='supabase/functions/cerebro-browser-work-total-owner-v1-prod/index.ts';
let runner=fs.readFileSync(runnerPath,'utf8');
let runtime=fs.readFileSync(runtimePath,'utf8');
let owner=fs.readFileSync(ownerPath,'utf8');

function replaceOnce(source,from,to,label){
  if(!source.includes(from))throw new Error(`AUTOLOGIN_CORE_V2_ANCHOR_MISSING:${label}`);
  return source.replace(from,to);
}

// Runner: materialize interactive credentials only through the governed broker and keep the secret in memory.
runner=replaceOnce(runner,
  "const DEFAULT_ENDPOINT=process.env.CEREBRO_BROWSER_DISPATCH_URL || '';",
  "const DEFAULT_ENDPOINT=process.env.CEREBRO_BROWSER_DISPATCH_URL || '';\nconst AUTOLOGIN_ENDPOINT=String(process.env.CEREBRO_BROWSER_AUTOLOGIN_URL||'').trim();",
  'RUNNER_ENDPOINT');
runner=replaceOnce(runner,
  "async function callDispatch(endpoint,route,token,body={},fetch_impl=fetch){",
  "async function callAutologin(route,tokenProvider,body={},fetch_impl=fetch){if(!AUTOLOGIN_ENDPOINT)throw new Error('BROWSER_AUTOLOGIN_ENDPOINT_REQUIRED');const token=await tokenProvider();const response=await fetch_impl(`${AUTOLOGIN_ENDPOINT.replace(/\\\/$/,'')}/${route}`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),redirect:'error'});const data=await response.json().catch(()=>null);if(!response.ok||data?.ok!==true)throw new Error(`BROWSER_AUTOLOGIN_${route.replace(/\\//g,'_').toUpperCase()}_FAILED:${response.status}:${data?.error||'UNKNOWN'}`);return data;}\n\nasync function callDispatch(endpoint,route,token,body={},fetch_impl=fetch){",
  'RUNNER_CALL_AUTOLOGIN');
runner=replaceOnce(runner,
  "  let secretPayload=null; let effectiveCommands=job.commands; let credentialMaterialized=false; let heartbeatTimer=null;",
  "  let secretPayload=null; let credentialProvider=null; let effectiveCommands=job.commands; let credentialMaterialized=false; let heartbeatTimer=null;",
  'RUNNER_STATE');
runner=replaceOnce(runner,
  "    if(job.credential_ref_id){\n      const materialized=await dispatch('credential-materialize-v2',{worker_slot,job_id:job.job_id,lease_id:job.lease_id});\n      if(!materialized?.ok||!plainObject(materialized.secret_payload))throw new Error('CREDENTIAL_MATERIALIZATION_INVALID');\n      secretPayload=materialized.secret_payload; effectiveCommands=hydrateCredentialPlaceholdersV2(job.commands,secretPayload); credentialMaterialized=true;\n    }",
  "    if(job.credential_ref_id){\n      const interactive=String(job.capability||'')==='browser1.interactive';\n      const materialized=interactive?await callAutologin('worker/materialize',tokenProvider,{session_id:job.job_id},fetch_impl):await dispatch('credential-materialize-v2',{worker_slot,job_id:job.job_id,lease_id:job.lease_id});\n      if(!materialized?.ok||!plainObject(materialized.secret_payload))throw new Error('CREDENTIAL_MATERIALIZATION_INVALID');\n      secretPayload=materialized.secret_payload;credentialProvider=String(materialized.provider||'').trim().toLowerCase();\n      if(!interactive)effectiveCommands=hydrateCredentialPlaceholdersV2(job.commands,secretPayload);\n      credentialMaterialized=true;\n    }",
  'RUNNER_MATERIALIZE');
runner=replaceOnce(runner,
  "    if(String(job.capability||'')==='browser1.interactive'){\n      if(credentialMaterialized)throw new Error('INTERACTIVE_V3_CREDENTIAL_MATERIALIZATION_NOT_YET_ALLOWED');\n      result=await runInteractiveBrowserSessionV3({job:{...job,commands:effectiveCommands},token_provider:tokenProvider,fetch_impl});",
  "    if(String(job.capability||'')==='browser1.interactive'){\n      result=await runInteractiveBrowserSessionV3({job:{...job,commands:effectiveCommands},credential:credentialMaterialized?{provider:credentialProvider,secret_payload:secretPayload}:null,token_provider:tokenProvider,fetch_impl});",
  'RUNNER_INTERACTIVE');
runner=replaceOnce(runner,
  "export const BROWSER_JOB_RUNNER_V2_CONTRACT=Object.freeze({schema_version:'2.4.1'",
  "export const BROWSER_JOB_RUNNER_V2_CONTRACT=Object.freeze({schema_version:'2.5.0',interactive_vault_autologin:true,credential_secret_memory_only:true",
  'RUNNER_CONTRACT');
fs.writeFileSync(runnerPath,runner);

// Runtime: add the autologin endpoint without changing the 3.5.5 handback semantics.
runtime=replaceOnce(runtime,
  "const WORKSPACE_ENDPOINT=String(process.env.CEREBRO_BROWSER_WORKSPACE_URL||'').trim();",
  "const WORKSPACE_ENDPOINT=String(process.env.CEREBRO_BROWSER_WORKSPACE_URL||'').trim();\nconst AUTOLOGIN_ENDPOINT=String(process.env.CEREBRO_BROWSER_AUTOLOGIN_URL||'').trim();",
  'RUNTIME_ENDPOINT');
runtime=replaceOnce(runtime,
  "async function callWorkspace(route,tokenProvider,body={},fetch_impl=fetch){if(!WORKSPACE_ENDPOINT)throw new Error('BROWSER_WORKSPACE_ENDPOINT_REQUIRED');return callApi(WORKSPACE_ENDPOINT,route,tokenProvider,body,fetch_impl,'BROWSER_WORKSPACE');}",
  "async function callWorkspace(route,tokenProvider,body={},fetch_impl=fetch){if(!WORKSPACE_ENDPOINT)throw new Error('BROWSER_WORKSPACE_ENDPOINT_REQUIRED');return callApi(WORKSPACE_ENDPOINT,route,tokenProvider,body,fetch_impl,'BROWSER_WORKSPACE');}\nasync function callAutologin(route,tokenProvider,body={},fetch_impl=fetch){if(!AUTOLOGIN_ENDPOINT)throw new Error('BROWSER_AUTOLOGIN_ENDPOINT_REQUIRED');return callApi(AUTOLOGIN_ENDPOINT,route,tokenProvider,body,fetch_impl,'BROWSER_AUTOLOGIN');}",
  'RUNTIME_CALL_AUTOLOGIN');

const verifyStart=runtime.indexOf('async function verifyWorkspaceIdentity(');
const captureStart=runtime.indexOf('async function captureFrame(',verifyStart);
if(verifyStart<0||captureStart<0||captureStart<=verifyStart)throw new Error('AUTOLOGIN_CORE_V2_ANCHOR_MISSING:RUNTIME_VERIFY_BLOCK');
const verifyAndLogin=`async function verifyWorkspaceIdentity(worker,base,job,restoreActiveTabIndex,endpoint,tokenProvider,fetch_impl,options={}){
  if(!workspaceEnabled(job))return{status:'NOT_APPLICABLE'};
  const emitHumanRequired=options.emitHumanRequired!==false,credentialBacked=options.credentialBacked===true;
  const profileState=await callWorkspace('worker/profile-state',tokenProvider,{session_id:String(job.job_id)},fetch_impl);
  if(String(profileState?.profile?.provider||'')!=='google')return{status:'NOT_APPLICABLE'};
  const originalIndex=Number.isInteger(restoreActiveTabIndex)?Math.max(0,restoreActiveTabIndex):0;
  let verificationTabOpened=false;
  try{
    const opened=await worker.execute({...base,actions:[{type:'OPEN_TAB',url:'https://myaccount.google.com/'}],keep_session_open:true,capture_final_evidence:false});
    if(opened?.ok!==true){
      if(emitHumanRequired)await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:'LOW_CONFIDENCE',detail:{code:'ACCOUNT_IDENTITY_UNVERIFIED',provider:'google'}},fetch_impl).catch(()=>null);
      return{status:'UNVERIFIED'};
    }
    verificationTabOpened=true;
    const inspected=await worker.execute({...base,actions:[{type:'WAIT',ms:1200},{type:'EXTRACT_TEXT',target:{selector:'body'}}],keep_session_open:true,capture_final_evidence:false});
    if(inspected?.ok!==true){
      if(emitHumanRequired)await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:'LOW_CONFIDENCE',detail:{code:'ACCOUNT_IDENTITY_UNVERIFIED',provider:'google'}},fetch_impl).catch(()=>null);
      return{status:'UNVERIFIED'};
    }
    const accountUrl=String(inspected.final_url||opened.final_url||'');
    if(accountUrl.includes('accounts.google.com')&&(accountUrl.includes('signin')||accountUrl.includes('ServiceLogin'))){
      if(!emitHumanRequired)return{status:'REAUTH_REQUIRED'};
      const observed=await callWorkspace('worker/observe-account',tokenProvider,{session_id:String(job.job_id),reauth_required:true},fetch_impl);
      await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:'LOW_CONFIDENCE',detail:{code:'REAUTH_REQUIRED',provider:'google'}},fetch_impl).catch(()=>null);
      return observed;
    }
    const email=firstEmail(inspected.results?.[1]);
    if(!email){
      if(emitHumanRequired)await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:'LOW_CONFIDENCE',detail:{code:'ACCOUNT_IDENTITY_UNVERIFIED',provider:'google'}},fetch_impl).catch(()=>null);
      return{status:'UNVERIFIED'};
    }
    let observed=await callWorkspace('worker/observe-account',tokenProvider,{session_id:String(job.job_id),account_email:email},fetch_impl);
    if(observed.status==='PENDING_CONFIRMATION'&&credentialBacked){
      observed=await callAutologin('worker/confirm-account',tokenProvider,{session_id:String(job.job_id),account_email:email},fetch_impl).catch(()=>observed);
    }
    if(emitHumanRequired&&observed.status==='PENDING_CONFIRMATION')await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:'LOW_CONFIDENCE',detail:{code:'ACCOUNT_CONFIRMATION_REQUIRED',provider:'google',account_hint:observed.account_hint}},fetch_impl).catch(()=>null);
    else if(emitHumanRequired&&observed.status==='MISMATCH')await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:'SECURITY_INCIDENT',detail:{code:'ACCOUNT_MISMATCH',provider:'google',account_hint:observed.account_hint}},fetch_impl).catch(()=>null);
    return observed;
  }finally{
    if(verificationTabOpened){
      await worker.execute({...base,actions:[{type:'CLOSE_TAB'},{type:'SWITCH_TAB',index:originalIndex}],keep_session_open:true,capture_final_evidence:false}).catch(()=>{});
    }
  }
}
function credentialScalar(value,names,depth=0){if(depth>4||value===null||value===undefined)return'';if(typeof value!=='object')return'';if(Array.isArray(value)){for(const item of value){const found=credentialScalar(item,names,depth+1);if(found)return found;}return'';}for(const [key,nested] of Object.entries(value)){const normalized=key.toLowerCase().replace(/[^a-z0-9]/g,'');if(names.includes(normalized)&&['string','number','boolean'].includes(typeof nested))return String(nested);}for(const nested of Object.values(value)){const found=credentialScalar(nested,names,depth+1);if(found)return found;}return'';}
function credentialFields(credential){const secret=credential?.secret_payload;return{identifier:credentialScalar(secret,['email','username','user','login','account','identifier']),password:credentialScalar(secret,['password','passwd','pass','secret'])};}
function googleChallenge(url){const value=String(url||'').toLowerCase();if(value.includes('captcha')||value.includes('recaptcha')||value.includes('challenge/totp')||value.includes('challenge/phone')||value.includes('challenge/selection')||value.includes('challenge/webauthn')||value.includes('challenge/ipp'))return'AUTH_CHALLENGE_REQUIRED';return'';}
async function autoLoginWithCredential(worker,base,credential){
  const provider=String(credential?.provider||'').toLowerCase();if(provider!=='google')return{status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:'AUTO_LOGIN_PROVIDER_NOT_READY'};
  const fields=credentialFields(credential);if(!fields.identifier||!fields.password)return{status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:'CREDENTIAL_FIELDS_UNAVAILABLE'};
  try{
    const result=await worker.execute({...base,actions:[{type:'NAVIGATE',url:'https://accounts.google.com/ServiceLogin'},{type:'FILL',target:{selector:'input[type="email"],input[name="identifier"]'},value:fields.identifier,timeout_ms:7000},{type:'PRESS',target:{selector:'input[type="email"],input[name="identifier"]'},key:'Enter',timeout_ms:7000},{type:'WAIT',ms:800},{type:'FILL',target:{selector:'input[type="password"],input[name="Passwd"]'},value:fields.password,timeout_ms:7000},{type:'PRESS',target:{selector:'input[type="password"],input[name="Passwd"]'},key:'Enter',timeout_ms:7000},{type:'WAIT',ms:1600}],keep_session_open:true,capture_final_evidence:false});
    const challenge=googleChallenge(result?.final_url);if(challenge)return{status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:challenge};return{status:result?.ok===true?'ATTEMPTED':'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:result?.ok===true?null:'CREDENTIAL_REJECTED'};
  }catch{return{status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:'AUTH_CHALLENGE_OR_FORM_UNAVAILABLE'};}
}
async function verifyOrAutoLogin(worker,base,job,restoreActiveTabIndex,endpoint,tokenProvider,fetch_impl,credential){
  const quiet=await verifyWorkspaceIdentity(worker,base,job,restoreActiveTabIndex,endpoint,tokenProvider,fetch_impl,{emitHumanRequired:false,credentialBacked:Boolean(credential)});
  if(['VERIFIED','NOT_APPLICABLE'].includes(String(quiet?.status||'')))return quiet;
  if(!credential)return verifyWorkspaceIdentity(worker,base,job,restoreActiveTabIndex,endpoint,tokenProvider,fetch_impl,{emitHumanRequired:true,credentialBacked:false});
  const login=await autoLoginWithCredential(worker,base,credential);
  if(login.status==='HUMAN_REQUIRED'){await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:login.reason||'LOW_CONFIDENCE',detail:{code:login.code||'REAUTH_REQUIRED',provider:String(credential?.provider||'unknown')}},fetch_impl).catch(()=>null);return{status:'REAUTH_REQUIRED',code:login.code};}
  return verifyWorkspaceIdentity(worker,base,job,restoreActiveTabIndex,endpoint,tokenProvider,fetch_impl,{emitHumanRequired:true,credentialBacked:true});
}

`;
runtime=runtime.slice(0,verifyStart)+verifyAndLogin+runtime.slice(captureStart);
runtime=replaceOnce(runtime,
  "export async function runInteractiveBrowserSessionV3({job,token=null,token_provider=null,fetch_impl=fetch,endpoint=DEFAULT_ENDPOINT}={}){",
  "export async function runInteractiveBrowserSessionV3({job,credential=null,token=null,token_provider=null,fetch_impl=fetch,endpoint=DEFAULT_ENDPOINT}={}){",
  'RUNTIME_SIGNATURE');
runtime=runtime.replaceAll("identityVerification=await verifyWorkspaceIdentity(worker,base,job,lastActiveTabIndex,endpoint,tokenProvider,fetch_impl);","identityVerification=await verifyOrAutoLogin(worker,base,job,lastActiveTabIndex,endpoint,tokenProvider,fetch_impl,credential);");
runtime=runtime.replaceAll("identityVerification=await verifyWorkspaceIdentity(worker,base,job,lastActiveTabIndex,endpoint,tokenProvider,fetch_impl)","identityVerification=await verifyOrAutoLogin(worker,base,job,lastActiveTabIndex,endpoint,tokenProvider,fetch_impl,credential)");
runtime=replaceOnce(runtime,
  "handback_preserves_active_tab:true",
  "handback_preserves_active_tab:true,credential_broker_autologin:true,google_autologin_adapter:true,no_mfa_or_captcha_bypass:true",
  'RUNTIME_CONTRACT');
fs.writeFileSync(runtimePath,runtime);

// Owner: reuse VERIFIED bundles first; otherwise lease the bound credential and start at the broker-approved login origin.
owner=owner.replaceAll("login_policy:'HUMAN_LOGIN_REQUIRED'","login_policy:b.data?.credential_ref_id?'CREDENTIAL_BROKER_ALLOWED':'HUMAN_LOGIN_REQUIRED'");
owner=replaceOnce(owner,
  "const bundle=await svc.from('cerebro_browser_session_bundle_v1').select('verification_state,expires_at').eq('company_id',company).eq('environment',ENV).eq('browser_profile_id',p.browser_profile_id).eq('status','ACTIVE').order('updated_at',{ascending:false}).limit(1).maybeSingle();if(bundle.error)throw bundle.error;const allowed=new Set(Array.isArray(p.allowed_origins)?p.allowed_origins:[]);const fallback=String(p.provider)==='google'?'https://www.google.com/':String((p.allowed_origins as string[]|undefined)?.[0]||'https://fenixcapital.es/');const target=String(body?.target_url||fallback);if(!allowed.has(origin(target)))throw new Error('WORKSPACE_START_ORIGIN_DENIED');",
  "const bundle=await svc.from('cerebro_browser_session_bundle_v1').select('verification_state,expires_at').eq('company_id',company).eq('environment',ENV).eq('browser_profile_id',p.browser_profile_id).eq('status','ACTIVE').order('updated_at',{ascending:false}).limit(1).maybeSingle();if(bundle.error)throw bundle.error;const resumable=Boolean(bundle.data&&Date.parse(bundle.data.expires_at)>Date.now()&&String(p.verification_state||'UNVERIFIED')==='VERIFIED'&&String(bundle.data.verification_state||'UNVERIFIED')==='VERIFIED');const credentialRef=String(p.login_policy||'')==='CREDENTIAL_BROKER_ALLOWED'?String(p.credential_ref_id||'').trim():'';const allowed=new Set(Array.isArray(p.allowed_origins)?p.allowed_origins:[]);const fallback=String(p.provider)==='google'?'https://www.google.com/':String((p.allowed_origins as string[]|undefined)?.[0]||'https://fenixcapital.es/');const requested=String(body?.target_url||'');const target=!resumable&&credentialRef&&String(p.provider)==='google'?'https://accounts.google.com/ServiceLogin':(requested||fallback);if(!allowed.has(origin(target)))throw new Error('WORKSPACE_START_ORIGIN_DENIED');",
  'OWNER_START_POLICY');
owner=replaceOnce(owner,"p_credential_ref_id:null","p_credential_ref_id:resumable?null:(credentialRef||null)",'OWNER_CREDENTIAL_REF');
owner=replaceOnce(owner,
  "await emit(id,'PROFILE_SELECTED','HUMAN',{identity_id:p.identity_id,account_id:p.account_id,browser_profile_id:p.browser_profile_id,provider:p.provider});const resumable=Boolean(bundle.data&&Date.parse(bundle.data.expires_at)>Date.now()&&String(p.verification_state||'UNVERIFIED')==='VERIFIED'&&String(bundle.data.verification_state||'UNVERIFIED')==='VERIFIED');return{ok:true,reused:false,session:ins.data,provider:p.provider,session_restore_expected:resumable,human_login_required:!resumable,verification_state:p.verification_state||'UNVERIFIED',credential_materialization:false};",
  "await emit(id,'PROFILE_SELECTED','HUMAN',{identity_id:p.identity_id,account_id:p.account_id,browser_profile_id:p.browser_profile_id,provider:p.provider});return{ok:true,reused:false,session:ins.data,provider:p.provider,session_restore_expected:resumable,auto_login_expected:Boolean(!resumable&&credentialRef),human_login_required:Boolean(!resumable&&!credentialRef),verification_state:p.verification_state||'UNVERIFIED',credential_materialization:Boolean(!resumable&&credentialRef)};",
  'OWNER_RETURN');
owner=replaceOnce(owner,"verified_bundle_reuse_only:true","verified_bundle_reuse_only:true,credential_broker_autologin:true,automatic_relogin:true",'OWNER_HEALTH');
fs.writeFileSync(ownerPath,owner);

console.log(JSON.stringify({ok:true,patch:'browser-autologin-core-v2',handback_355_compatible:true,handback_preserves_active_tab:true,interactive_vault_autologin:true,google_adapter:true,automatic_relogin:true,human_required_for_challenges:true,mfa_bypass:false,captcha_bypass:false,secret_material_logged:false}));
