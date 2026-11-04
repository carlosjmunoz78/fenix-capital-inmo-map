/** ZEUS/JARVIS B6 CUT02 — parameterized PostgreSQL journal adapter, isolated LAB.
 * Inject a trusted query(sql, values) from the SHARED worker.
 * No Supabase PROD installation, no retries after failed/in-progress claims.
 */
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const HASH=/^[0-9a-f]{64}$/;
const valid=x=>typeof x==='string'&&ID.test(x);
const validScope=s=>s&&[s.ownerId,s.companyId,s.missionId,s.capability,s.connectorId,s.idempotencyKey].every(valid)&&
 s.environment==='LAB'&&HASH.test(s.fingerprint);
const values=s=>[s.ownerId,s.companyId,s.environment,s.missionId,s.capability,s.connectorId,s.idempotencyKey,s.fingerprint];
const SQL_CLAIM="SELECT zeus_jarvis_b6_lab.claim_read($1,$2,$3,$4,$5,$6,$7,$8) AS result";
const SQL_RECEIPT="SELECT owner_id,company_id,environment,mission_id,capability,connector_id,"+
 " idempotency_key,fingerprint,evidence_hash,state FROM zeus_jarvis_b6_lab.execution_claim"+
 " WHERE owner_id=$1 AND company_id=$2 AND environment=$3 AND mission_id=$4"+
 " AND capability=$5 AND connector_id=$6 AND idempotency_key=$7 AND fingerprint=$8";
const SQL_COMPLETE="SELECT zeus_jarvis_b6_lab.complete_read($1,$2,$3,$4,$5,$6,$7,$8,$9) AS result";
const SQL_FAIL="SELECT zeus_jarvis_b6_lab.fail_read($1,$2,$3,$4,$5,$6,$7,$8,$9) AS result";
const errCode=s=>typeof s==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(s);
export function createJarvisB6PgJournal({query}={}){
 if(typeof query!=='function')throw Error('B6_TRUSTED_PARAMETERIZED_QUERY_REQUIRED');
 const fetchReceipt=async s=>{
  const rows=await query(SQL_RECEIPT,values(s));
  const row=Array.isArray(rows)?rows[0]:null;
  if(!row||row.state!=='COMPLETED'||row.owner_id!==s.ownerId||
    row.company_id!==s.companyId||row.environment!==s.environment||
    row.mission_id!==s.missionId||row.capability!==s.capability||
    row.connector_id!==s.connectorId||row.idempotency_key!==s.idempotencyKey||
    row.fingerprint!==s.fingerprint||!HASH.test(row.evidence_hash))
   return{state:'DENY'};
  return{state:'ALREADY_COMPLETED',ownerId:row.owner_id,companyId:row.company_id,
   environment:row.environment,missionId:row.mission_id,
   capability:row.capability,connectorId:row.connector_id,
   idempotencyKey:row.idempotency_key,fingerprint:row.fingerprint,
   evidenceHash:row.evidence_hash};
 };
 return Object.freeze({
  async claim(s){
   if(!validScope(s))return{state:'DENY'};
   const rows=await query(SQL_CLAIM,values(s));
   const status=Array.isArray(rows)?rows[0]?.result:null;
   if(status==='CLAIMED')return{state:'CLAIMED'};
   if(status==='IN_PROGRESS')return{state:'IN_PROGRESS'};
   if(status==='CONFLICT')return{state:'CONFLICT'};
   if(status==='ALREADY_COMPLETED')return fetchReceipt(s);
   return{state:'DENY'};
  },
  async complete(s){
   if(!validScope(s)||!HASH.test(s.evidenceHash))return false;
   const rows=await query(SQL_COMPLETE,[...values(s),s.evidenceHash]);
   return Array.isArray(rows)&&rows[0]?.result==='COMPLETED';
  },
  async fail(s){
   if(!validScope(s)||!errCode(s.reason))return false;
   const rows=await query(SQL_FAIL,[...values(s),s.reason]);
   return Array.isArray(rows)&&rows[0]?.result==='FAILED';
  }
 });
}
