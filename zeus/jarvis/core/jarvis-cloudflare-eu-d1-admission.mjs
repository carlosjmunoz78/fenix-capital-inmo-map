/**
 * CUT23: read-only Cloudflare D1 EU residency admission (LAB only).
 * Admits an API-reported D1 identity, NOT an asserted region string or UUID
 * copied by a caller. This is a prerequisite only; never promotes or deploys.
 * Cloudflare's D1 database JSON uses result.uuid/name/jurisdiction.
 */
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
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
 if(typeof accountId!=='string'||!UUID.test(accountId))
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
