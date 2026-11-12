// FACT-001 only. Pure, dependency-free, unit-testable identity and policy logic.
export const ACCOUNT_ID='e39a57e1ac42650ca5a6d5307cf0ac8e';
export const REPO='carlosjmunoz78/fenix-capital-inmo-map';
export const BRANCH='refs/heads/cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109';
export const OIDC_AUDIENCE='cerebro-fact001-cloudflare-d1-write-lab-20261109';
export const WORKFLOW_REF=`${REPO}/.github/workflows/fact001-cerebro-cloudflare-d1-write-e2e-lab.yml@${BRANCH}`;
export const VAULT_NAME='cerebro_fact001_cf_readonly_lab_20261109';
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
export function assertScope(body,{pair=false}={}){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('SCOPE_INVALID');
 const keys=Object.keys(body).sort();const expected=Object.keys(SCOPE).concat(pair?['api_token']:[]).sort();
 if(JSON.stringify(keys)!==JSON.stringify(expected))throw Error('SCOPE_FIELDS_DENIED');
 for(const [k,v] of Object.entries(SCOPE))if(body[k]!==v)throw Error('SCOPE_DENIED');
 if(pair&&(typeof body.api_token!=='string'||body.api_token.length<15||body.api_token.length>1024||/[\s\r\n]/.test(body.api_token)))throw Error('PAIR_CREDENTIAL_DENIED');
 return true;
}
export function validateInventory(d1,workers){
 if(!d1||!workers||d1.success!==true||workers.success!==true||!Array.isArray(d1.result)||!Array.isArray(workers.result))throw Error('CF_UNTRUSTED_INVENTORY');
 const count=d1.result_info?.total_count;
 if(!Number.isSafeInteger(count)||count<0||count>10000)throw Error('CF_PAGINATION_UNTRUSTED');
 if(workers.result.length>1000)throw Error('CF_WORKERS_COUNT_UNTRUSTED');
 return Object.freeze({d1_count:count,workers_count:workers.result.length,cloudflare_writes:0,account_id:ACCOUNT_ID});
}


export const D1_OPERATION='cloudflare.d1.lab.create_sql_read_delete';
export const D1_BASELINE=Object.freeze(["e8fe801d-4b01-4e34-ac12-26014b79adc1","c428b85c-dbaf-4844-a2f8-15cadc23a6c9","968e86d4-617c-4539-adde-541edc9ec215","be037644-3da6-4a96-8cb7-9ee3af9ba196","8f966fb3-32db-43a0-aa55-67f88616a522","c446f17c-c26d-4c76-a3ea-f62c843d461b","988b11e1-21aa-4cf9-8b9d-110319df7ccc","a859fde1-126b-4c40-bc0d-aec2f8839f7b"]);
export function assertD1Order(o){
 if(!o||typeof o!=='object'||Array.isArray(o))throw Error('D1_ORDER_INVALID');
 const keys=['account_id','client_id','company_id','engine_id','environment','operation','request_id','version'].sort();
 if(JSON.stringify(Object.keys(o).sort())!==JSON.stringify(keys))throw Error('D1_ORDER_FIELDS_DENIED');
 for(const [k,v] of Object.entries(SCOPE))if(o[k]!==v)throw Error('D1_ORDER_TENANT_DENIED');
 if(o.account_id!==ACCOUNT_ID||o.client_id!=='cerebro'||o.operation!==D1_OPERATION||!/^CD1-[0-9]{8}-[0-9]{3}$/.test(o.request_id))throw Error('D1_ORDER_SCOPE_DENIED');
 return o.request_id;
}
export function d1NameFor(id){
 if(typeof id!=='string'||!/^CD1-[0-9]{8}-[0-9]{3}$/.test(id))throw Error('D1_NAME_INVALID');
 return 'cerebro-fact001-d1-eu-'+id.slice(4);
}
export function assertD1Snapshot(r,name){
 if(r?.success!==true||!Array.isArray(r.result)||r.result_info?.total_count!==8||r.result.length!==8)throw Error('D1_COUNT_CHANGED');
 const ids=r.result.map(x=>x.uuid);
 if(D1_BASELINE.some(x=>!ids.includes(x))||ids.some(x=>!D1_BASELINE.includes(x))||r.result.some(x=>x.name===name))throw Error('D1_BASELINE_CHANGED');
 return true;
}
