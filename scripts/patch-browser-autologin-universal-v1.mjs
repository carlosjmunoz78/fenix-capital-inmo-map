import fs from 'node:fs';

const runnerPath='cerebro/runtime/browser-job-runner-v2.mjs';
const runtimePath='cerebro/runtime/browser-interactive-session-v3.mjs';
let runner=fs.readFileSync(runnerPath,'utf8');
let runtime=fs.readFileSync(runtimePath,'utf8');

function replaceOnce(source,from,to,label){
 if(!source.includes(from))throw new Error(`UNIVERSAL_AUTOLOGIN_PATCH_ANCHOR_MISSING:${label}`);
 return source.replace(from,to);
}

runner=replaceOnce(runner,
 "  let secretPayload=null; let credentialProvider=null; let effectiveCommands=job.commands; let credentialMaterialized=false; let heartbeatTimer=null;",
 "  let secretPayload=null; let credentialProvider=null; let credentialLoginOrigin=''; let credentialAllowedOrigins=[]; let credentialLoginConfig={}; let effectiveCommands=job.commands; let credentialMaterialized=false; let heartbeatTimer=null;",
 'RUNNER_STATE');
runner=replaceOnce(runner,
 "      secretPayload=materialized.secret_payload;credentialProvider=String(materialized.provider||'').trim().toLowerCase();",
 "      secretPayload=materialized.secret_payload;credentialProvider=String(materialized.provider||'').trim().toLowerCase();credentialLoginOrigin=String(materialized.login_origin||'').trim().toLowerCase();credentialAllowedOrigins=Array.isArray(materialized.allowed_origins)?materialized.allowed_origins.map(x=>String(x||'').trim().toLowerCase()).filter(Boolean):[];credentialLoginConfig=materialized.login_config&&typeof materialized.login_config==='object'&&!Array.isArray(materialized.login_config)?materialized.login_config:{};",
 'RUNNER_CREDENTIAL_METADATA');
runner=replaceOnce(runner,
 "credential:credentialMaterialized?{provider:credentialProvider,secret_payload:secretPayload}:null",
 "credential:credentialMaterialized?{provider:credentialProvider,secret_payload:secretPayload,login_origin:credentialLoginOrigin,allowed_origins:credentialAllowedOrigins,login_config:credentialLoginConfig}:null",
 'RUNNER_CREDENTIAL_ENVELOPE');
fs.writeFileSync(runnerPath,runner);

const start=runtime.indexOf('async function autoLoginWithCredential(worker,base,credential){');
const end=runtime.indexOf('async function captureFrame(',start);
if(start<0||end<0||end<=start)throw new Error('UNIVERSAL_AUTOLOGIN_PATCH_ANCHOR_MISSING:RUNTIME_LOGIN_BLOCK');
const universalBlock=`function normalizedAuthOrigin(raw){try{const u=new URL(String(raw||''));if(u.protocol!=='https:')return'';return u.origin.toLowerCase();}catch{return'';}}
function normalizedAuthUrl(raw){try{const u=new URL(String(raw||''));if(u.protocol!=='https:')return'';u.username='';u.password='';u.hash='';return u.toString();}catch{return'';}}
function credentialLoginMetadata(credential){
  const secret=credential?.secret_payload;
  const config=credential?.login_config&&typeof credential.login_config==='object'&&!Array.isArray(credential.login_config)?credential.login_config:{};
  const provider=String(credential?.provider||'generic').trim().toLowerCase()||'generic';
  const allowedOrigins=Array.isArray(credential?.allowed_origins)?credential.allowed_origins.map(normalizedAuthOrigin).filter(Boolean):[];
  const brokerOrigin=normalizedAuthOrigin(credential?.login_origin);
  const meta=(keys)=>credentialScalar(config,keys)||credentialScalar(secret,keys);
  const configuredUrl=meta(['loginurl','signinurl','authurl','authenticationurl']);
  const loginUrl=provider==='google'?'https://accounts.google.com/ServiceLogin':(normalizedAuthUrl(configuredUrl)||(brokerOrigin?brokerOrigin+'/':''));
  const usernameSelector=meta(['usernameselector','emailselector','identifierselector'])||'input[autocomplete="username"],input[type="email"],input[name*="user" i],input[name*="login" i]';
  const usernameSubmitSelector=meta(['usernamesubmitselector','identifiersubmitselector','nextselector']);
  const passwordSelector=meta(['passwordselector'])||'input[autocomplete="current-password"],input[type="password"]';
  const submitSelector=meta(['submitselector','loginsubmitselector','signinsubmitselector']);
  const successUrlContains=meta(['successurlcontains','authenticatedurlcontains','successpathcontains']);
  return{provider,allowedOrigins,brokerOrigin,loginUrl,usernameSelector,usernameSubmitSelector,passwordSelector,submitSelector,successUrlContains};
}
function genericAuthChallenge(raw){const value=String(raw||'').toLowerCase();if(/captcha|recaptcha|challenge|webauthn|security[-_]?key|\\/mfa(?:\\/|$)|\\/2fa(?:\\/|$)|\\/otp(?:\\/|$)|verify[-_]?identity|device[-_]?approval/.test(value))return'AUTH_CHALLENGE_REQUIRED';return'';}
function sameLoginLocation(a,b){try{const x=new URL(String(a||'')),y=new URL(String(b||''));return x.origin===y.origin&&x.pathname.replace(/\\/+$/,'')===y.pathname.replace(/\\/+$/,'');}catch{return false;}}
async function autoLoginWithCredential(worker,base,credential){
  const fields=credentialFields(credential);if(!fields.identifier||!fields.password)return{status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:'CREDENTIAL_FIELDS_UNAVAILABLE'};
  const meta=credentialLoginMetadata(credential);if(!meta.loginUrl)return{status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:'CREDENTIAL_LOGIN_URL_REQUIRED'};
  const loginOrigin=normalizedAuthOrigin(meta.loginUrl);if(!loginOrigin||!meta.allowedOrigins.includes(loginOrigin))return{status:'HUMAN_REQUIRED',reason:'SECURITY_INCIDENT',code:'AUTH_LOGIN_ORIGIN_DENIED'};
  try{
    let actions;
    if(meta.provider==='google'){
      actions=[{type:'NAVIGATE',url:meta.loginUrl},{type:'FILL',target:{selector:'input[type="email"],input[name="identifier"]'},value:fields.identifier,timeout_ms:7000},{type:'PRESS',target:{selector:'input[type="email"],input[name="identifier"]'},key:'Enter',timeout_ms:7000},{type:'WAIT',ms:800},{type:'FILL',target:{selector:'input[type="password"],input[name="Passwd"]'},value:fields.password,timeout_ms:7000},{type:'PRESS',target:{selector:'input[type="password"],input[name="Passwd"]'},key:'Enter',timeout_ms:7000},{type:'WAIT',ms:1600}];
    }else{
      actions=[{type:'NAVIGATE',url:meta.loginUrl},{type:'FILL',target:{selector:meta.usernameSelector},value:fields.identifier,timeout_ms:7000}];
      if(meta.usernameSubmitSelector)actions.push({type:'CLICK',target:{selector:meta.usernameSubmitSelector},timeout_ms:7000},{type:'WAIT',ms:600});
      actions.push({type:'FILL',target:{selector:meta.passwordSelector},value:fields.password,timeout_ms:7000});
      if(meta.submitSelector)actions.push({type:'CLICK',target:{selector:meta.submitSelector},timeout_ms:7000});
      else actions.push({type:'PRESS',target:{selector:meta.passwordSelector},key:'Enter',timeout_ms:7000});
      actions.push({type:'WAIT',ms:1500});
    }
    const result=await worker.execute({...base,actions,keep_session_open:true,capture_final_evidence:false});
    if(result?.ok!==true)return{status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:'AUTH_FORM_UNAVAILABLE'};
    const finalUrl=normalizedAuthUrl(result.final_url);const challenge=meta.provider==='google'?googleChallenge(finalUrl):genericAuthChallenge(finalUrl);if(challenge)return{status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:challenge};
    const finalOrigin=normalizedAuthOrigin(finalUrl);if(finalOrigin&&!meta.allowedOrigins.includes(finalOrigin))return{status:'HUMAN_REQUIRED',reason:'SECURITY_INCIDENT',code:'AUTH_REDIRECT_ORIGIN_DENIED'};
    if(meta.successUrlContains&&!String(finalUrl).includes(meta.successUrlContains))return{status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:'AUTH_SUCCESS_NOT_CONFIRMED'};
    if(meta.provider!=='google'&&!meta.successUrlContains&&sameLoginLocation(finalUrl,meta.loginUrl))return{status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:'AUTH_SUCCESS_NOT_CONFIRMED'};
    return{status:'ATTEMPTED',provider:meta.provider,final_url:finalUrl};
  }catch{return{status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:'AUTH_CHALLENGE_OR_FORM_UNAVAILABLE'};}
}
async function verifyOrAutoLogin(worker,base,job,restoreUrl,endpoint,tokenProvider,fetch_impl,credential){
  const quiet=await verifyWorkspaceIdentity(worker,base,job,restoreUrl,endpoint,tokenProvider,fetch_impl,{emitHumanRequired:false,credentialBacked:Boolean(credential)});
  if(String(quiet?.status||'')==='VERIFIED')return quiet;
  if(!credential){
    if(String(quiet?.status||'')==='NOT_APPLICABLE')return quiet;
    return verifyWorkspaceIdentity(worker,base,job,restoreUrl,endpoint,tokenProvider,fetch_impl,{emitHumanRequired:true,credentialBacked:false});
  }
  const login=await autoLoginWithCredential(worker,base,credential);
  if(login.status==='HUMAN_REQUIRED'){await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:login.reason||'LOW_CONFIDENCE',detail:{code:login.code||'REAUTH_REQUIRED',provider:String(credential?.provider||'generic')}},fetch_impl).catch(()=>null);return{status:'REAUTH_REQUIRED',code:login.code};}
  if(String(credential?.provider||'').toLowerCase()==='google')return verifyWorkspaceIdentity(worker,base,job,restoreUrl,endpoint,tokenProvider,fetch_impl,{emitHumanRequired:true,credentialBacked:true});
  const confirmed=await callAutologin('worker/confirm-bound-login',tokenProvider,{session_id:String(job.job_id),final_url:login.final_url},fetch_impl).catch(()=>null);
  if(confirmed?.status==='VERIFIED')return{status:'VERIFIED',verification_method:confirmed.verification_method||'CREDENTIAL_BROKER_AUTH_ACCEPTED'};
  await callInteractive(endpoint,'worker/human-required',tokenProvider,{session_id:String(job.job_id),reason:'LOW_CONFIDENCE',detail:{code:'AUTH_SUCCESS_NOT_CONFIRMED',provider:String(credential?.provider||'generic')}},fetch_impl).catch(()=>null);
  return{status:'REAUTH_REQUIRED',code:'AUTH_SUCCESS_NOT_CONFIRMED'};
}
`;
runtime=runtime.slice(0,start)+universalBlock+runtime.slice(end);
runtime=replaceOnce(runtime,
 'credential_broker_autologin:true,google_autologin_adapter:true,no_mfa_or_captcha_bypass:true',
 'credential_broker_autologin:true,google_autologin_adapter:true,universal_form_autologin:true,manual_login_default:false,allowed_origin_bound:true,login_metadata_separated:true,no_mfa_or_captcha_bypass:true',
 'RUNTIME_CONTRACT');
fs.writeFileSync(runtimePath,runtime);

console.log(JSON.stringify({ok:true,patch:'browser-autologin-universal-v1',universal_form_autologin:true,manual_login_default:false,allowed_origin_bound:true,login_metadata_separated:true,frame_helpers_preserved:true,session_reuse_first:true,auth_challenges_human_only:true,mfa_bypass:false,captcha_bypass:false,secret_material_logged:false}));