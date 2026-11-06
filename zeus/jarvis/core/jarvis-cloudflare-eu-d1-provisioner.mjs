/**
 * CUT27 · Cloudflare D1 EU LAB one-time provisioning (NOT executed).
 *
 * Intent: replace fragile dashboard clicks with an idempotent, auditable,
 * write-capable operation once a short-lived account-scoped D1 token is
 * available from a secure secret manager. Explicit create opt-in required.
 *
 * Modes: inspect (GET-only); create (at most one POST, no retries).
 * Always NO PROD, NO Worker deployment, NO schema/data/secret writes.
 * Never logs or returns Authorization headers, token, response body or errors.
 *
 * Cloudflare official API:
 * GET  /accounts/{account_id}/d1/database?name=...
 * POST /accounts/{account_id}/d1/database
 * GET  /accounts/{account_id}/d1/database/{database_id}
 */
const ACCOUNT_ID='e39a57e1ac42650ca5a6d5307cf0ac8e';
const DB_NAME='cerebro-jarvis-lab-eu';
const OLD_DB_ID='a859fde1-126b-4c40-bc0d-aec2f8839f7b';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const IDENTIFIER=/^[0-9a-f]{32}$/i;
const HOST='https://api.cloudflare.com/client/v4/accounts/';
const no=(state,other={})=>Object.freeze({state,environment:'LAB',deployAllowed:false,prod:'NO_GO',...other});
function apiOK(body){
 return body?.success===true&&Array.isArray(body.errors)&&body.errors.length===0;
}
// List D1 API returns only identity metadata. Only the GET-by-UUID readback
// can certify read-replication policy. Do not reject list rows for omitting it.
function safeIdentity(d){
 return typeof d?.uuid==='string'&&UUID.test(d.uuid)&&d.uuid.toLowerCase()!==OLD_DB_ID
  &&d.name===DB_NAME&&d.jurisdiction==='eu';
}
function safeRecord(d){
 return safeIdentity(d)&&d.read_replication?.mode==='disabled';
}
export function createJarvisEuD1Provisioner({
 fetchImpl,apiToken,accountId=ACCOUNT_ID,environment='LAB',
 enabled=false
}={}){
 if(typeof enabled!=='boolean')throw TypeError('BOOLEAN_GATE_REQUIRED');
 if(enabled&&environment!=='LAB')throw TypeError('LAB_ONLY');
 if(enabled&&(typeof fetchImpl!=='function'||typeof apiToken!=='string'||
    apiToken.length<8||apiToken.length>4096||/[\r\n]/.test(apiToken)||
    !IDENTIFIER.test(accountId)||accountId!==ACCOUNT_ID))
  throw TypeError('SCOPED_CLOUDFLARE_D1_TOKEN_REQUIRED');
 if(!enabled)return Object.freeze({run:async()=>no('DISABLED')});
 const endpoint=HOST+accountId+'/d1/database';
 async function invoke(url,method='GET',payload){
  const headers={accept:'application/json',authorization:'Bearer '+apiToken};
  if(method==='POST')headers['content-type']='application/json';
  try{
   const response=await fetchImpl(url,{
    method,headers,redirect:'error',cache:'no-store',
    ...(payload===undefined?{}:{body:JSON.stringify(payload)})
   });
   if(!response?.ok||!(method==='GET'?response.status===200:[200,201].includes(response.status)))
    return null;
   const raw=await response.text();
   if(typeof raw!=='string'||raw.length>65536)return null;
   const body=JSON.parse(raw);
   return apiOK(body)?body:null;
  }catch{return null}
 }
 async function verify(uuid){
  if(typeof uuid!=='string'||!UUID.test(uuid)||uuid.toLowerCase()===OLD_DB_ID)return false;
  const details=await invoke(endpoint+'/'+uuid);
  return Boolean(details&&safeRecord(details.result)&&
    details.result.uuid.toLowerCase()===uuid.toLowerCase());
 }
 return Object.freeze({async run({mode='inspect',approved=false,confirmation}={}){
  if(!['inspect','create'].includes(mode))return no('INVALID_MODE');
  if(mode==='create'&&(approved!==true||confirmation!=='CREATE_JARVIS_EU_LAB'))
   return no('CREATE_REQUIRES_EXPLICIT_AUTHORIZATION');
  const list=await invoke(endpoint+'?name='+encodeURIComponent(DB_NAME)+'&page=1&per_page=100');
  if(!list||!Array.isArray(list.result))
   return no('INVENTORY_UNAVAILABLE_NO_WRITE');
  if(list.result.length>1||list.result.some(d=>d?.name!==DB_NAME))
   return no('AMBIGUOUS_DATABASE_NAME_NO_WRITE');
  if(list.result.length===1){
   const d=list.result[0];
   if(!safeIdentity(d))return no('EXISTING_DATABASE_NOT_EU_NO_WRITE');
   if(!(await verify(d.uuid)))return no('EXISTING_EU_DATABASE_NOT_VERIFIED');
   return no('EXISTING_EU_VERIFIED_NO_WRITE',{databaseId:d.uuid});
  }
  if(mode==='inspect')return no('MISSING_EU_D1_NO_WRITE');
  const count=list.result_info?.total_count;
  if(!Number.isSafeInteger(count)||count<0||count>=10)
   return no('FREE_D1_CAPACITY_UNVERIFIED_NO_WRITE');
  // Exactly ONE attempt. Do not automatically retry on network/timeouts:
  // remote success may have occurred even if the response was lost.
  const body=await invoke(endpoint,'POST',{
   name:DB_NAME,jurisdiction:'eu',read_replication:{mode:'disabled'}
  });
  if(!body)return no('CREATE_OUTCOME_UNKNOWN_RECHECK_INVENTORY');
  const d=body.result;
  if(!safeIdentity(d))return no('CREATED_METADATA_UNSAFE_HUMAN_REVIEW',
    {databaseId:typeof d?.uuid==='string'&&UUID.test(d.uuid)?d.uuid:null});
  if(!(await verify(d.uuid)))return no('CREATED_NEEDS_READBACK_HUMAN_REVIEW',{databaseId:d.uuid});
  return no('NEW_EU_D1_CREATED_UNMIGRATED',{databaseId:d.uuid,created:true});
 }});
}
