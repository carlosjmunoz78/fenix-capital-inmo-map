// FACT-001 Recovery D1 ledger adapter. SQL is parameterized, no secrets, no remote API on import.
// Explicit construction only in isolated LAB. Requires a D1-compatible query(sql, params) adapter
// using a scoped credential. No Supabase App/CRM changes or automatic new database creation.
export const RECOVERY_D1_SCHEMA = `
CREATE TABLE IF NOT EXISTS fact001_recovery_v1 (
  key_hash TEXT PRIMARY KEY NOT NULL,
  fingerprint TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('RUNNING','BACKOFF','COMPLETED','RECONCILE','STOPPED','EXHAUSTED')),
  retryable_read INTEGER NOT NULL CHECK(retryable_read IN (0,1)),
  attempt INTEGER NOT NULL CHECK(attempt BETWEEN 1 AND 3),
  lease_until INTEGER NOT NULL,
  retry_at INTEGER,
  updated_at INTEGER NOT NULL
);
`;
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const positiveInt=x=>Number.isSafeInteger(x)&&x>=0;
function single(rows){if(!Array.isArray(rows)||rows.length>1)throw Error('D1_RESULT_INVALID');return rows[0]??null;}
function assertQuery(query){if(typeof query!=='function')throw Error('D1_QUERY_REQUIRED');}
export function createD1RecoveryLedger({query}={}){
 assertQuery(query);
 async function run(sql,params){const rows=await query(sql,params);if(!Array.isArray(rows))throw Error('D1_ROWS_INVALID');return rows;}
 return {
  durable:true,
  async claim({key,fingerprint,now,leaseMs,maxAttempts,retryableRead}){
   if(!hash(key)||!hash(fingerprint)||!positiveInt(now)||!positiveInt(leaseMs)||!Number.isSafeInteger(maxAttempts)||maxAttempts<1||maxAttempts>3||typeof retryableRead!=='boolean')throw Error('CLAIM_INVALID');
   const created=await run(`INSERT INTO fact001_recovery_v1 (key_hash,fingerprint,state,retryable_read,attempt,lease_until,retry_at,updated_at)
     VALUES (?1,?2,'RUNNING',?3,1,?4,NULL,?5) ON CONFLICT(key_hash) DO NOTHING RETURNING attempt`,[key,fingerprint,retryableRead?1:0,now+leaseMs,now]);
   if(single(created))return {status:'CLAIMED',attempt:1};
   const row=single(await run('SELECT fingerprint,state,retryable_read,attempt,lease_until,retry_at FROM fact001_recovery_v1 WHERE key_hash=?1',[key]));
   if(!row)throw Error('D1_MISSING_AFTER_CONFLICT');
   if(row.fingerprint!==fingerprint)return {status:'CONFLICT'};
   if(Number(row.retryable_read)!==(retryableRead?1:0))return {status:'CONFLICT'};
   if(row.state==='COMPLETED')return {status:'COMPLETED'};
   if(row.state==='RECONCILE')return {status:'RECONCILE'};
   if(row.state==='STOPPED'||row.state==='EXHAUSTED')return {status:'EXHAUSTED'};
   if(row.state==='RUNNING'&&Number(row.lease_until)>now)return {status:'PENDING'};
   if(row.state==='BACKOFF'&&Number(row.retry_at)>now)return {status:'BACKOFF',retryAt:Number(row.retry_at)};
   if(!retryableRead){
    // An expired mutating lease is ambiguous; reconcile, never replay.
    await run(`UPDATE fact001_recovery_v1 SET state='RECONCILE',updated_at=?3
      WHERE key_hash=?1 AND fingerprint=?2 AND state='RUNNING' AND attempt=?4 AND lease_until<=?3 RETURNING key_hash`,[key,fingerprint,now,row.attempt]);
    return {status:'RECONCILE'};
   }
   if(Number(row.attempt)>=maxAttempts){
    const done=await run(`UPDATE fact001_recovery_v1 SET state='EXHAUSTED',updated_at=?3
      WHERE key_hash=?1 AND fingerprint=?2 AND attempt=?4 AND ((state='RUNNING' AND lease_until<=?3) OR (state='BACKOFF' AND retry_at<=?3)) RETURNING key_hash`,[key,fingerprint,now,row.attempt]);
    if(single(done))return {status:'EXHAUSTED'};
    return {status:'PENDING'};
   }
   const ret=await run(`UPDATE fact001_recovery_v1 SET state='RUNNING',attempt=attempt+1,lease_until=?3,retry_at=NULL,updated_at=?4
     WHERE key_hash=?1 AND fingerprint=?2 AND retryable_read=1 AND attempt=?5
     AND ((state='RUNNING' AND lease_until<=?4) OR (state='BACKOFF' AND retry_at<=?4))
     RETURNING attempt`,[key,fingerprint,now+leaseMs,now,row.attempt]);
   const winner=single(ret);
   return winner?{status:'CLAIMED',attempt:Number(winner.attempt)}:{status:'PENDING'};
  },
  async settle({key,fingerprint,attempt,now,status,retryAt}){
   if(!hash(key)||!hash(fingerprint)||!Number.isSafeInteger(attempt)||attempt<1||attempt>3||!positiveInt(now)||!['COMPLETED','RECONCILE','BACKOFF','STOPPED','EXHAUSTED'].includes(status))throw Error('SETTLE_INVALID');
   if(status==='BACKOFF'&&!positiveInt(retryAt))throw Error('RETRY_TIME_INVALID');
   const updated=await run(`UPDATE fact001_recovery_v1 SET state=?4,retry_at=?5,updated_at=?6
     WHERE key_hash=?1 AND fingerprint=?2 AND state='RUNNING' AND attempt=?3 AND lease_until>=?6
     RETURNING key_hash`,[key,fingerprint,attempt,status,status==='BACKOFF'?retryAt:null,now]);
   if(!single(updated))throw Error('CAS_CONFLICT');
  }
 };
}
