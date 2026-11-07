/**
 * CUT23: read-only Cloudflare D1 EU residency admission (LAB only).
 * Admits an API-reported D1 identity, NOT an asserted region string or UUID
 * copied by a caller. This is a prerequisite only; never promotes or deploys.
 * Cloudflare's D1 database JSON uses result.uuid/name/jurisdiction.
 */
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const ACCOUNT_ID=/^[0-9a-f]{32}$/i;
const EXISTING_SYNTHETIC_D1='a859fde1-126b-4c40-bc0d-aec2f8839f7b';
const EXPECTED_NAME='cerebro-jarvis-lab-eu';
export const CUT23_EU_D1=Object.freeze({
 name:EXPECTED_NAME,excludedDatabaseId:EXISTING_SYNTHETIC_D1,
 jurisdiction:'eu',workersDev:false,protectedProduction:true
});
const blocked=(reason)=>Object.freeze({
 accepted:false,environment:'LAB',deployAllowed:false,prod:'NO_GO',reason
});
export function assessCloudflareD1EUResponse({
 apiResponse,accountId,expectedDatabaseId,environment='LAB'
}={}){
 if(environment!=='LAB')return blocked('LAB_ONLY');
 if(typeof accountId!=='string'||!ACCOUNT_ID.test(accountId))
  return blocked('ACCOUNT_ID_UNVERIFIED');
 if(typeof expectedDatabaseId!=='string'||!UUID.test(expectedDatabaseId)||
    expectedDatabaseId.toLowerCase()==='00000000-0000-0000-0000-000000000000'||
    expectedDatabaseId.toLowerCase()===EXISTING_SYNTHETIC_D1)
  return blocked('NEW_D1_ID_UNVERIFIED');
 if(!apiResponse||typeof apiResponse!=='object'||apiResponse.success!==true||
   !Array.isArray(apiResponse.errors)||apiResponse.errors.length!==0||
   !apiResponse.result||typeof apiResponse.result!=='object')
  return blocked('CLOUDFLARE_API_RESPONSE_UNVERIFIED');
 const d=apiResponse.result;
 if(typeof d.uuid!=='string'||d.uuid.toLowerCase()!==expectedDatabaseId.toLowerCase())
  return blocked('DATABASE_UUID_MISMATCH');
 if(d.name!==EXPECTED_NAME)return blocked('NEW_LAB_DATABASE_NAME_MISMATCH');
 if(d.jurisdiction!=='eu')return blocked('EU_JURISDICTION_MISSING');
 if(d.read_replication?.mode==='auto')
  return blocked('READ_REPLICATION_NOT_REVIEWED');
 return Object.freeze({
  accepted:true,environment:'LAB',deployAllowed:false,prod:'NO_GO',
  reason:'EU_D1_METADATA_VERIFIED_BUT_VAULT_B2_B3_B10_PENDING',
  databaseId:expectedDatabaseId.toLowerCase(),databaseName:EXPECTED_NAME,
  jurisdiction:'eu'
 });
}


/**
 * Read-only verification against Cloudflare's authenticated D1 control-plane API.
 * Token remains in memory and is NEVER returned, serialized or logged.
 * This is an operator-run LAB check only; it cannot create, migrate or deploy.
 * Caller MUST supply a secret from an external protected vault/environment.
 */
export async function verifyCloudflareD1EUReadOnly({
 fetchImpl,token,accountId,expectedDatabaseId,environment='LAB'
}={}){
 if(environment!=='LAB')return blocked('LAB_ONLY');
 if(typeof accountId!=='string'||!ACCOUNT_ID.test(accountId)||
    typeof expectedDatabaseId!=='string'||!UUID.test(expectedDatabaseId)||
    expectedDatabaseId.toLowerCase()===EXISTING_SYNTHETIC_D1||
    expectedDatabaseId==='00000000-0000-0000-0000-000000000000')
  return blocked('REMOTE_TARGET_UNVERIFIED');
 if(typeof fetchImpl!=='function'||typeof token!=='string'||
    token.length<8||token.length>4096||/[\r\n]/.test(token))
  return blocked('TRUSTED_FETCH_AND_SCOPED_TOKEN_REQUIRED');
 let res,body;
 try{
  res=await fetchImpl('https://api.cloudflare.com/client/v4/accounts/'+accountId+
     '/d1/database/'+expectedDatabaseId,{
    method:'GET',redirect:'error',cache:'no-store',
    headers:{accept:'application/json',authorization:'Bearer '+token}
  });
  if(!res||res.status!==200||res.ok!==true)
    return blocked('CLOUDFLARE_READ_UNAVAILABLE');
  const raw=await res.text();
  if(typeof raw!=='string'||raw.length>32768)return blocked('CLOUDFLARE_RESPONSE_TOO_LARGE');
  body=JSON.parse(raw);
 }catch{
  return blocked('CLOUDFLARE_READ_UNAVAILABLE');
 }
 return assessCloudflareD1EUResponse({
  apiResponse:body,accountId,expectedDatabaseId,environment
 });
}
