import fs from 'node:fs';

const runnerPath='cerebro/runtime/browser-job-runner-v2.mjs';
const runtimePath='cerebro/runtime/browser-interactive-session-v3.mjs';
let runner=fs.readFileSync(runnerPath,'utf8');
let runtime=fs.readFileSync(runtimePath,'utf8');

function replaceOnce(source,from,to,label){if(!source.includes(from))throw new Error(`LAZY_CREDENTIAL_PATCH_ANCHOR_MISSING:${label}`);return source.replace(from,to);}

const eager=`    const interactiveCredentialFlow=String(job.capability||'')==='browser1.interactive';
    if(job.credential_ref_id||interactiveCredentialFlow){
      const interactive=interactiveCredentialFlow;
      const materialized=interactive?await callAutologin('worker/materialize',tokenProvider,{session_id:job.job_id},fetch_impl):await dispatch('credential-materialize-v2',{worker_slot,job_id:job.job_id,lease_id:job.lease_id});
      if(!materialized?.ok||!plainObject(materialized.secret_payload))throw new Error('CREDENTIAL_MATERIALIZATION_INVALID');
      secretPayload=materialized.secret_payload;credentialProvider=String(materialized.provider||'').trim().toLowerCase();credentialLoginOrigin=String(materialized.login_origin||'').trim().toLowerCase();credentialAllowedOrigins=Array.isArray(materialized.allowed_origins)?materialized.allowed_origins.map(x=>String(x||'').trim().toLowerCase()).filter(Boolean):[];credentialLoginConfig=materialized.login_config&&typeof materialized.login_config==='object'&&!Array.isArray(materialized.login_config)?materialized.login_config:{};
      if(!interactive)effectiveCommands=hydrateCredentialPlaceholdersV2(job.commands,secretPayload);
      credentialMaterialized=true;
    }`;
const lazy=`    const interactiveCredentialFlow=String(job.capability||'')==='browser1.interactive';
    let interactiveCredentialEnvelope=null;
    const interactiveCredentialLoader=interactiveCredentialFlow?async()=>{
      if(interactiveCredentialEnvelope)return interactiveCredentialEnvelope;
      const materialized=await callAutologin('worker/materialize',tokenProvider,{session_id:job.job_id},fetch_impl);
      if(!materialized?.ok||!plainObject(materialized.secret_payload))throw new Error('CREDENTIAL_MATERIALIZATION_INVALID');
      secretPayload=materialized.secret_payload;credentialProvider=String(materialized.provider||'').trim().toLowerCase();credentialLoginOrigin=String(materialized.login_origin||'').trim().toLowerCase();credentialAllowedOrigins=Array.isArray(materialized.allowed_origins)?materialized.allowed_origins.map(x=>String(x||'').trim().toLowerCase()).filter(Boolean):[];credentialLoginConfig=materialized.login_config&&typeof materialized.login_config==='object'&&!Array.isArray(materialized.login_config)?materialized.login_config:{};
      credentialMaterialized=true;
      interactiveCredentialEnvelope={provider:credentialProvider,secret_payload:secretPayload,login_origin:credentialLoginOrigin,allowed_origins:credentialAllowedOrigins,login_config:credentialLoginConfig};
      return interactiveCredentialEnvelope;
    }:null;
    if(job.credential_ref_id&&!interactiveCredentialFlow){
      const materialized=await dispatch('credential-materialize-v2',{worker_slot,job_id:job.job_id,lease_id:job.lease_id});
      if(!materialized?.ok||!plainObject(materialized.secret_payload))throw new Error('CREDENTIAL_MATERIALIZATION_INVALID');
      secretPayload=materialized.secret_payload;effectiveCommands=hydrateCredentialPlaceholdersV2(job.commands,secretPayload);credentialMaterialized=true;
    }`;
runner=replaceOnce(runner,eager,lazy,'RUNNER_EAGER_MATERIALIZATION');
runner=replaceOnce(runner,
  "result=await runInteractiveBrowserSessionV3({job:{...job,commands:effectiveCommands},credential:credentialMaterialized?{provider:credentialProvider,secret_payload:secretPayload,login_origin:credentialLoginOrigin,allowed_origins:credentialAllowedOrigins,login_config:credentialLoginConfig}:null,token_provider:tokenProvider,fetch_impl});",
  "result=await runInteractiveBrowserSessionV3({job:{...job,commands:effectiveCommands},credential:null,credential_loader:interactiveCredentialLoader,token_provider:tokenProvider,fetch_impl});",
  'RUNNER_INTERACTIVE_CALL');
runner=replaceOnce(runner,
  "interactive_vault_autologin:true,credential_secret_memory_only:true",
  "interactive_vault_autologin:true,credential_secret_memory_only:true,lazy_credential_materialization:true,restore_before_credential_materialization:true",
  'RUNNER_CONTRACT');
fs.writeFileSync(runnerPath,runner);

runtime=replaceOnce(runtime,
  "export async function runInteractiveBrowserSessionV3({job,credential=null,token=null,token_provider=null,fetch_impl=fetch,endpoint=DEFAULT_ENDPOINT}={}){",
  "export async function runInteractiveBrowserSessionV3({job,credential=null,credential_loader=null,token=null,token_provider=null,fetch_impl=fetch,endpoint=DEFAULT_ENDPOINT}={}){",
  'RUNTIME_SIGNATURE');
const verifyStart=runtime.indexOf('async function verifyOrAutoLogin(');
const verifyEnd=runtime.indexOf('\nasync function captureFrame(',verifyStart);
if(verifyStart<0||verifyEnd<0||verifyEnd<=verifyStart)throw new Error('LAZY_CREDENTIAL_PATCH_ANCHOR_MISSING:VERIFY_BLOCK');
const oldVerify=runtime.slice(verifyStart,verifyEnd);
if(!oldVerify.includes('const login=await autoLoginWithCredential(worker,base,credential);'))throw new Error('LAZY_CREDENTIAL_PATCH_ANCHOR_MISSING:VERIFY_LOGIN');
const newVerify=oldVerify
  .replace(/async function verifyOrAutoLogin\(([^)]*),credential\)\{/,'async function verifyOrAutoLogin($1,credential,credentialLoader=null){')
  .replace('const quiet=await verifyWorkspaceIdentity(worker,base,job,restoreUrl,endpoint,tokenProvider,fetch_impl,{emitHumanRequired:false,credentialBacked:Boolean(credential)});','const credentialAvailable=Boolean(credential)||typeof credentialLoader===\'function\';const quiet=await verifyWorkspaceIdentity(worker,base,job,restoreUrl,endpoint,tokenProvider,fetch_impl,{emitHumanRequired:false,credentialBacked:credentialAvailable});')
  .replace('if(!credential){','if(!credentialAvailable){')
  .replace("  const login=await autoLoginWithCredential(worker,base,credential);","  const resolvedCredential=credential||await credentialLoader();if(!resolvedCredential)return{status:'REAUTH_REQUIRED',code:'CREDENTIAL_UNAVAILABLE'};\n  const login=await autoLoginWithCredential(worker,base,resolvedCredential);")
  .replaceAll("String(credential?.provider||'generic')","String(resolvedCredential?.provider||'generic')");
runtime=runtime.slice(0,verifyStart)+newVerify+runtime.slice(verifyEnd);

runtime=replaceOnce(runtime,
  "    if(workspaceEnabled(job))identityVerification=await verifyOrAutoLogin(worker,base,job,lastActiveTabIndex,endpoint,tokenProvider,fetch_impl,credential);",
  "    if(workspaceEnabled(job))identityVerification=restoredWorkspace?.restored===true?{status:'VERIFIED',verification_method:'SESSION_BUNDLE_RESTORE'}:await verifyOrAutoLogin(worker,base,job,lastActiveTabIndex,endpoint,tokenProvider,fetch_impl,credential,credential_loader);",
  'INITIAL_RESTORE_FIRST');
runtime=runtime.replaceAll(
  "verifyOrAutoLogin(worker,base,job,lastActiveTabIndex,endpoint,tokenProvider,fetch_impl,credential)",
  "verifyOrAutoLogin(worker,base,job,lastActiveTabIndex,endpoint,tokenProvider,fetch_impl,credential,credential_loader)"
);
runtime=replaceOnce(runtime,
  "auth_stage_diagnostics:true,universal_form_autologin:true",
  "auth_stage_diagnostics:true,lazy_credential_materialization:true,restore_before_credential_materialization:true,universal_form_autologin:true",
  'RUNTIME_CONTRACT');
fs.writeFileSync(runtimePath,runtime);

console.log(JSON.stringify({ok:true,patch:'browser-autologin-lazy-credential-v1',restore_before_credential_materialization:true,lazy_credential_materialization:true,verified_bundle_short_circuit:true,secret_material_logged:false}));
