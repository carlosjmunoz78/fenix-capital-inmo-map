// FACT-001 / Notion LAB D1 status probe. Read-only, fixed table set, no user SQL.
// Invoked only AFTER the parent headless broker has verified GitHub OIDC.
export const NOTION_D1_READ_VAULT_NAME='cerebro_cf_d1_read_lab_20261110';
export const FACT001_D1_UUID='1305f791-7c44-47f9-946b-f330a09c88aa';
const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
const URL='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/d1/database/'+FACT001_D1_UUID+'/query';
const SQL=`SELECT
  (SELECT COUNT(*) FROM fact001_notion_owned_children_v1) AS owned_total,
  (SELECT COUNT(*) FROM fact001_notion_owned_children_v1 WHERE approved=1) AS approved_total,
  (SELECT COUNT(*) FROM fact001_notion_snapshots_v1) AS snapshots_total,
  (SELECT COUNT(*) FROM fact001_notion_audit_v1) AS audit_total`;
function validCount(x){return Number.isSafeInteger(x)&&x>=0&&x<=100000000;}
export async function probeNotionD1Lab({token,http=fetch}={}){
 if(typeof token!=='string'||token.length<24||token.length>8192||/\s/.test(token))throw Error('D1_SCOPED_TOKEN_INVALID');
 let response;
 try{response=await http(URL,{method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'},
  body:JSON.stringify({sql:SQL}),redirect:'error',signal:AbortSignal.timeout(15000)});}
 catch{throw Error('D1_STATUS_NETWORK_UNAVAILABLE');}
 if(response.status===401||response.status===403)throw Error('D1_STATUS_AUTH_'+response.status);
 if(response.status!==200)throw Error('D1_STATUS_HTTP_'+response.status);
 let body;try{body=await response.json()}catch{throw Error('D1_STATUS_MALFORMED_JSON');}
 if(body?.success!==true||!Array.isArray(body.result)||body.result.length!==1||
    body.result[0]?.success!==true||!Array.isArray(body.result[0].results)||body.result[0].results.length!==1)
    throw Error('D1_STATUS_UPSTREAM_UNVERIFIED');
 const r=body.result[0].results[0];
 const fields=['owned_total','approved_total','snapshots_total','audit_total'];
 if(!r||Object.keys(r).sort().join(',')!==fields.slice().sort().join(',')||
    fields.some(k=>!validCount(r[k])))throw Error('D1_STATUS_SHAPE_DENIED');
 if(r.approved_total>r.owned_total)throw Error('D1_STATUS_CONFLICT');
 return {status:'FACT001_NOTION_D1_SIGNED_READ_VERIFIED',scope:{company_id:'fenix-capital',
  engine_id:'FACT-001',environment:'LAB',version:'1.0.0'},provider:'cloudflare-d1',
  target:'fact001-notion-lab',owned_count:r.owned_total,approved_count:r.approved_total,
  snapshot_count:r.snapshots_total,audit_count:r.audit_total,authenticated_service:true,
  credential_exposed:false,mutations:0,external_provider_writes:0};
}
