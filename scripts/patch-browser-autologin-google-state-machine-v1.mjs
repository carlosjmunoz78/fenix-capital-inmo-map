import fs from 'node:fs';

const runtimePath='cerebro/runtime/browser-interactive-session-v3.mjs';
let runtime=fs.readFileSync(runtimePath,'utf8');

const start=runtime.indexOf('async function autoLoginWithCredential(worker,base,credential){');
const end=runtime.indexOf('async function verifyOrAutoLogin(',start);
if(start<0||end<0||end<=start)throw new Error('GOOGLE_AUTH_STATE_MACHINE_PATCH_ANCHOR_MISSING');

const stateMachine=`function googlePasswordRoute(raw){const value=String(raw||'').toLowerCase();return /\\/challenge\\/pwd(?:[/?#]|$)|\\/signin\\/v2\\/challenge\\/pwd(?:[/?#]|$)/.test(value);}
function authStageFailure(code,reason='LOW_CONFIDENCE'){return{status:'HUMAN_REQUIRED',reason,code};}
async function executeAuthStage(worker,base,actions,stage){
  try{
    const result=await worker.execute({...base,actions,keep_session_open:true,capture_final_evidence:false});
    if(result?.ok!==true)return{ok:false,code:\`AUTH_\${stage}_ACTION_FAILED\`,result:null,final_url:''};
    return{ok:true,code:null,result,final_url:normalizedAuthUrl(result.final_url)};
  }catch{return{ok:false,code:\`AUTH_\${stage}_FORM_UNAVAILABLE\`,result:null,final_url:''};}
}
async function autoLoginWithCredential(worker,base,credential){
  const fields=credentialFields(credential);if(!fields.identifier||!fields.password)return authStageFailure('CREDENTIAL_FIELDS_UNAVAILABLE');
  const meta=credentialLoginMetadata(credential);if(!meta.loginUrl)return authStageFailure('CREDENTIAL_LOGIN_URL_REQUIRED');
  const loginOrigin=normalizedAuthOrigin(meta.loginUrl);if(!loginOrigin||!meta.allowedOrigins.includes(loginOrigin))return authStageFailure('AUTH_LOGIN_ORIGIN_DENIED','SECURITY_INCIDENT');

  if(meta.provider==='google'){
    const navigation=await executeAuthStage(worker,base,[{type:'NAVIGATE',url:meta.loginUrl},{type:'WAIT',ms:350}],'NAVIGATION');
    if(!navigation.ok)return authStageFailure(navigation.code||'AUTH_NAVIGATION_FAILED');
    let finalUrl=navigation.final_url;
    let challenge=googleChallenge(finalUrl);if(challenge)return authStageFailure(challenge);
    let finalOrigin=normalizedAuthOrigin(finalUrl);if(finalOrigin&&!meta.allowedOrigins.includes(finalOrigin))return authStageFailure('AUTH_REDIRECT_ORIGIN_DENIED','SECURITY_INCIDENT');
    if(finalOrigin&&finalOrigin!=='https://accounts.google.com')return{status:'ATTEMPTED',provider:meta.provider,final_url:finalUrl,auth_stage:'EXISTING_SESSION'};

    const identifier=await executeAuthStage(worker,base,[{type:'FILL',target:{selector:'input[type="email"],input[name="identifier"]'},value:fields.identifier,timeout_ms:7000},{type:'PRESS',target:{selector:'input[type="email"],input[name="identifier"]'},key:'Enter',timeout_ms:7000},{type:'WAIT',ms:1300}],'IDENTIFIER');
    if(!identifier.ok)return authStageFailure(identifier.code||'AUTH_IDENTIFIER_FORM_UNAVAILABLE');
    finalUrl=identifier.final_url;
    challenge=googleChallenge(finalUrl);if(challenge)return authStageFailure(challenge);
    finalOrigin=normalizedAuthOrigin(finalUrl);if(finalOrigin&&!meta.allowedOrigins.includes(finalOrigin))return authStageFailure('AUTH_REDIRECT_ORIGIN_DENIED','SECURITY_INCIDENT');
    if(finalOrigin&&finalOrigin!=='https://accounts.google.com')return{status:'ATTEMPTED',provider:meta.provider,final_url:finalUrl,auth_stage:'IDENTIFIER_ACCEPTED_SESSION_RESUMED'};

    const password=await executeAuthStage(worker,base,[{type:'FILL',target:{selector:'input[type="password"],input[name="Passwd"]'},value:fields.password,timeout_ms:7000},{type:'PRESS',target:{selector:'input[type="password"],input[name="Passwd"]'},key:'Enter',timeout_ms:7000},{type:'WAIT',ms:2200}],'PASSWORD');
    if(!password.ok)return authStageFailure(password.code||'AUTH_PASSWORD_FORM_UNAVAILABLE');
    finalUrl=password.final_url;
    challenge=googleChallenge(finalUrl);if(challenge)return authStageFailure(challenge);
    if(googlePasswordRoute(finalUrl))return authStageFailure('CREDENTIAL_REJECTED_OR_PASSWORD_NOT_ACCEPTED');
    finalOrigin=normalizedAuthOrigin(finalUrl);if(finalOrigin&&!meta.allowedOrigins.includes(finalOrigin))return authStageFailure('AUTH_REDIRECT_ORIGIN_DENIED','SECURITY_INCIDENT');
    return{status:'ATTEMPTED',provider:meta.provider,final_url:finalUrl,auth_stage:'PASSWORD_SUBMITTED'};
  }

  try{
    const actions=[{type:'NAVIGATE',url:meta.loginUrl},{type:'FILL',target:{selector:meta.usernameSelector},value:fields.identifier,timeout_ms:7000}];
    if(meta.usernameSubmitSelector)actions.push({type:'CLICK',target:{selector:meta.usernameSubmitSelector},timeout_ms:7000},{type:'WAIT',ms:600});
    actions.push({type:'FILL',target:{selector:meta.passwordSelector},value:fields.password,timeout_ms:7000});
    if(meta.submitSelector)actions.push({type:'CLICK',target:{selector:meta.submitSelector},timeout_ms:7000});
    else actions.push({type:'PRESS',target:{selector:meta.passwordSelector},key:'Enter',timeout_ms:7000});
    actions.push({type:'WAIT',ms:1500});
    const result=await worker.execute({...base,actions,keep_session_open:true,capture_final_evidence:false});
    if(result?.ok!==true)return authStageFailure('AUTH_FORM_UNAVAILABLE');
    const finalUrl=normalizedAuthUrl(result.final_url);const challenge=genericAuthChallenge(finalUrl);if(challenge)return authStageFailure(challenge);
    const finalOrigin=normalizedAuthOrigin(finalUrl);if(finalOrigin&&!meta.allowedOrigins.includes(finalOrigin))return authStageFailure('AUTH_REDIRECT_ORIGIN_DENIED','SECURITY_INCIDENT');
    if(meta.successUrlContains&&!String(finalUrl).includes(meta.successUrlContains))return authStageFailure('AUTH_SUCCESS_NOT_CONFIRMED');
    if(!meta.successUrlContains&&sameLoginLocation(finalUrl,meta.loginUrl))return authStageFailure('AUTH_SUCCESS_NOT_CONFIRMED');
    return{status:'ATTEMPTED',provider:meta.provider,final_url:finalUrl,auth_stage:'GENERIC_SUBMITTED'};
  }catch{return authStageFailure('AUTH_CHALLENGE_OR_FORM_UNAVAILABLE');}
}
`;

runtime=runtime.slice(0,start)+stateMachine+runtime.slice(end);
if(!runtime.includes('auth_state_machine:true')){
  runtime=runtime.replace(
    'google_autologin_adapter:true,universal_form_autologin:true',
    'google_autologin_adapter:true,auth_state_machine:true,auth_stage_diagnostics:true,universal_form_autologin:true'
  );
}
fs.writeFileSync(runtimePath,runtime);

console.log(JSON.stringify({ok:true,patch:'browser-autologin-google-state-machine-v1',google_auth_state_machine:true,auth_stage_diagnostics:true,auth_challenges_human_only:true,mfa_bypass:false,captcha_bypass:false,secret_material_logged:false}));
