import fs from 'node:fs';

const runtimePath='cerebro/runtime/browser-interactive-session-v3.mjs';
let runtime=fs.readFileSync(runtimePath,'utf8');
function replaceOnce(from,to,label){if(!runtime.includes(from))throw new Error(`PREPROD_FIXTURE_PATCH_ANCHOR_MISSING:${label}`);runtime=runtime.replace(from,to);}

replaceOnce(
"function genericAuthChallenge(raw){",
"function normalizedFixtureUrl(raw){try{const u=new URL(String(raw||''));if(u.protocol!=='http:')return'';if(!['127.0.0.1','localhost'].includes(u.hostname))return'';u.username='';u.password='';u.hash='';return u.toString();}catch{return'';}}\nfunction normalizedFixtureOrigin(raw){try{const u=new URL(String(raw||''));if(u.protocol!=='http:')return'';if(!['127.0.0.1','localhost'].includes(u.hostname))return'';return u.origin.toLowerCase();}catch{return'';}}\nfunction genericAuthChallenge(raw){",
'FIXTURE_ORIGIN_HELPER');
replaceOnce(
"  const meta=credentialLoginMetadata(credential);if(!meta.loginUrl)return{status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:'CREDENTIAL_LOGIN_URL_REQUIRED'};",
"  const meta=credentialLoginMetadata(credential);const configuredFixtureUrl=normalizedFixtureUrl(credential?.login_config?.login_url);const configuredFixtureOrigin=normalizedFixtureOrigin(credential?.login_config?.fixture_origin);if(base?.environment==='PREPROD'&&meta.provider==='synthetic'&&configuredFixtureUrl&&normalizedFixtureOrigin(configuredFixtureUrl)===configuredFixtureOrigin)meta.loginUrl=configuredFixtureUrl;if(!meta.loginUrl)return{status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',code:'CREDENTIAL_LOGIN_URL_REQUIRED'};",
'LOCAL_FIXTURE_LOGIN_URL');
replaceOnce(
"  const loginOrigin=normalizedAuthOrigin(meta.loginUrl);if(!loginOrigin||!meta.allowedOrigins.includes(loginOrigin))return{status:'HUMAN_REQUIRED',reason:'SECURITY_INCIDENT',code:'AUTH_LOGIN_ORIGIN_DENIED'};",
"  const httpsLoginOrigin=normalizedAuthOrigin(meta.loginUrl);const fixtureLoginOrigin=normalizedFixtureOrigin(meta.loginUrl);const fixtureAllowed=base?.environment==='PREPROD'&&meta.provider==='synthetic'&&fixtureLoginOrigin&&fixtureLoginOrigin===configuredFixtureOrigin;const loginOrigin=httpsLoginOrigin||fixtureLoginOrigin;if(!loginOrigin||(!meta.allowedOrigins.includes(loginOrigin)&&!fixtureAllowed))return{status:'HUMAN_REQUIRED',reason:'SECURITY_INCIDENT',code:'AUTH_LOGIN_ORIGIN_DENIED'};",
'LOCAL_FIXTURE_POLICY');
replaceOnce(
"login_metadata_separated:true,no_mfa_or_captcha_bypass:true",
"login_metadata_separated:true,preprod_local_fixture_isolated:true,no_mfa_or_captcha_bypass:true",
'RUNTIME_CONTRACT');
fs.writeFileSync(runtimePath,runtime);
console.log(JSON.stringify({ok:true,patch:'browser-autologin-preprod-fixture-v1',environment:'PREPROD',provider:'synthetic',localhost_only:true,prod_authorized:false,fixture_login_url_preserved:true,secret_material_logged:false}));
