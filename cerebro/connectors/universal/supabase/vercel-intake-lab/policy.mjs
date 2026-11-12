// FACT001 independent Vercel LAB signed intake, no Vercel provider token or write API exposed.
export const REPO='carlosjmunoz78/fenix-capital-inmo-map';
export const BRANCH='refs/heads/cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109';
export const OIDC_AUDIENCE='cerebro-fact001-vercel-intake-lab-20261111';
export const WORKFLOW_REF=`${REPO}/.github/workflows/fact001-vercel-intake-oidc-probe.yml@${BRANCH}`;
export const SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'0.1.0'});
export const CF_ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
export const CF_RECOVERY_DB='1305f791-7c44-47f9-946b-f330a09c88aa';
export const VAULT_D1='cerebro_cf_gateway_recovery_d1_write_lab_20261111';
export const VERCEL_TEAM='team_qnh6u1Ofy2WPp0MGEKlyMA50';
export const VERCEL_PROJECT='prj_LxPzJA5AkHJvhYzTAbVJbRrAvvLu';
export const VERCEL_PROJECT_NAME='cerebro-fact001-vercel-lab-20261111';
export const OPERATIONS=Object.freeze(['vercel.project.read_lab','vercel.project.set_framework_vite_lab','vercel.project.rollback_framework_null_lab','vercel.deployment.list_lab']);
const TOKEN_URI='https://token.actions.githubusercontent.com';
const JWKS_URL=TOKEN_URI+'/.well-known/jwks';
export function fromB64url(value){
 if(typeof value!=='string'||value.length>16384||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('MALFORMED_OIDC');
 return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));
}
export function assertClaims(payload,now=Math.floor(Date.now()/1000)){
 if(payload?.iss!==TOKEN_URI||payload.aud!==OIDC_AUDIENCE||payload.repository!==REPO||payload.ref!==BRANCH||payload.workflow_ref!==WORKFLOW_REF||payload.event_name!=='push'||payload.actor!=='carlosjmunoz78')throw Error('OIDC_SCOPE_DENIED');
 if(!Number.isSafeInteger(payload.exp)||!Number.isSafeInteger(payload.iat)||payload.exp<=now||payload.iat>now+30||payload.iat<now-900||payload.exp>now+900)throw Error('OIDC_TIME_DENIED');
 if(payload.nbf!==undefined && (!Number.isSafeInteger(payload.nbf)||payload.nbf>now+30))throw Error('OIDC_NOT_YET_VALID');
 return Object.freeze({trusted:true,company_id:SCOPE.company_id,engine_id:SCOPE.engine_id,environment:SCOPE.environment,client_id:'cerebro-github-oidc'});
}
export async function verifyGitHubOidc(token,{http=fetch,now=Math.floor(Date.now()/1000),cryptoImpl=crypto}={}){
 if(typeof token!=='string'||token.length<100||token.length>16384)throw Error('OIDC_TOKEN_INVALID');
 const fragments=token.split('.');if(fragments.length!==3)throw Error('OIDC_FORMAT_DENIED');
 let head,claims;
 try{head=JSON.parse(new TextDecoder().decode(fromB64url(fragments[0])));claims=JSON.parse(new TextDecoder().decode(fromB64url(fragments[1])));}catch{throw Error('OIDC_JSON_DENIED');}
 if(head?.alg!=='RS256'||typeof head.kid!=='string'||!head.kid||head.kid.length>128)throw Error('OIDC_ALGORITHM_DENIED');
 // Reject forged claims before any external call; verify the JWS signature before trusting claims.
 assertClaims(claims,now);
 let response;
 try{response=await http(JWKS_URL,{method:'GET',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}});}catch{throw Error('OIDC_JWKS_NETWORK');}
 if(response?.status!==200)throw Error('OIDC_JWKS_UNAVAILABLE');
 let keys;
 try{keys=(await response.json())?.keys;}catch{throw Error('OIDC_JWKS_INVALID');}
 if(!Array.isArray(keys)||keys.length>30)throw Error('OIDC_JWKS_INVALID');
 const selected=keys.filter(k=>k.kid===head.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256'));
 if(selected.length!==1)throw Error('OIDC_KID_NOT_TRUSTED');
 let key,ok=false;
 try{
  key=await cryptoImpl.subtle.importKey('jwk',selected[0],{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  ok=await cryptoImpl.subtle.verify('RSASSA-PKCS1-v1_5',key,fromB64url(fragments[2]),new TextEncoder().encode(fragments[0]+'.'+fragments[1]));
 }catch{throw Error('OIDC_SIGNATURE_DENIED');}
 if(!ok)throw Error('OIDC_SIGNATURE_DENIED');
 return assertClaims(claims,now);
}

export function assertCommand(j){
 const fixed={...SCOPE,provider:'vercel',team_id:VERCEL_TEAM,project_id:VERCEL_PROJECT,project_name:VERCEL_PROJECT_NAME,max_cost_eur:0};
 const keys=[...Object.keys(fixed),'operation','job_id','request_id','idempotency_key'];
 if(!j||typeof j!=='object'||Array.isArray(j)||
 JSON.stringify(Object.keys(j).sort())!==JSON.stringify(keys.sort())||
 Object.entries(fixed).some(([k,v])=>j[k]!==v)||
 !OPERATIONS.includes(j.operation)||
 typeof j.job_id!=='string'||!/^FACT001-VERCEL-CMD-[A-Z0-9-]{8,72}$/.test(j.job_id)||
 typeof j.request_id!=='string'||!/^FACT001-VERCEL-[A-Z0-9-]{8,70}$/.test(j.request_id)||
 typeof j.idempotency_key!=='string'||!/^[a-z0-9-]{12,96}$/.test(j.idempotency_key))
 throw Error('VERCEL_LAB_COMMAND_SCOPE_DENIED');
 return true;
}
