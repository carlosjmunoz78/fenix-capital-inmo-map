// FACT-001 only. Pure, dependency-free, unit-testable identity and policy logic.
export const SUPABASE_REF='cluhljgonannaafpmblx';
export const REPO='carlosjmunoz78/fenix-capital-inmo-map';
export const BRANCH='refs/heads/cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109';
export const OIDC_AUDIENCE='cerebro-fact001-supabase-admin-once-20261110';
export const WORKFLOW_REF=`${REPO}/.github/workflows/fact001-supabase-admin-delete-once.yml@${BRANCH}`;
export const VAULT_NAME='cerebro_supabase_management_pat_v1';
export const SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'});
const TOKEN_URI='https://token.actions.githubusercontent.com';
const JWKS_URL=TOKEN_URI+'/.well-known/jwks';
export function fromB64url(value){
 if(typeof value!=='string'||value.length>16384||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('MALFORMED_OIDC');
 return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));
}
export function assertClaims(payload,now=Math.floor(Date.now()/1000)){
 if(payload?.iss!==TOKEN_URI||payload.aud!==OIDC_AUDIENCE||payload.repository!==REPO||payload.ref!==BRANCH||payload.workflow_ref!==WORKFLOW_REF||payload.event_name!=='push')throw Error('OIDC_SCOPE_DENIED');
 if(!Number.isSafeInteger(payload.exp)||!Number.isSafeInteger(payload.iat)||payload.exp<=now||payload.iat>now+30||payload.iat<now-900||payload.exp>now+900)throw Error('OIDC_TIME_DENIED');
 if(payload.nbf!==undefined && (!Number.isSafeInteger(payload.nbf)||payload.nbf>now+30))throw Error('OIDC_NOT_YET_VALID');
 return Object.freeze({trusted:true,company_id:SCOPE.company_id,engine_id:SCOPE.engine_id,environment:SCOPE.environment,client_id:'cerebro'});
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


export const TEST_FUNCTION='cerebro-fact001-vercel-service-lab';
export const TEST_FUNCTION_ID='f004e7f1-4911-440d-8809-c656f5f89b38';
export const ORDER={...SCOPE,client_id:'cerebro',project_ref:SUPABASE_REF,function_slug:TEST_FUNCTION,function_id:TEST_FUNCTION_ID,operation:'supabase.edge_function.delete_disposable_test',request_id:'FACT001-SUPABASE-CLEANUP-20261110-001'};
export function assertCleanupOrder(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('INVALID_BODY');
 if(JSON.stringify(Object.keys(body).sort())!==JSON.stringify(Object.keys(ORDER).sort())||Object.entries(ORDER).some(([k,v])=>body[k]!==v))throw Error('SCOPE_DENIED');
 return true;
}
