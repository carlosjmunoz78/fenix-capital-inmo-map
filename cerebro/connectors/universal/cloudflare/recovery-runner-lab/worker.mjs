// FACT-001 LAB: scheduled-only, D1-only, no HTTP ingress, no external provider side effects.
// State machine is intentionally limited to internal heartbeat verification.
// All real provider commands remain BLOCKED until separate policy, IAM, budget & replay gates.
const ID='cerebro-fact001-recovery-runner-lab';
const VALID_JOB='fact001.lab.heartbeat';
const SCOPE={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const heads={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
async function sha256(value){
 const data=new TextEncoder().encode(value);
 const hash=await crypto.subtle.digest('SHA-256',data);
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}

export async function processRecoveryTick(env,scheduledTime=Date.now()){
 if(!env?.RECOVERY_DB||!Number.isSafeInteger(scheduledTime)||scheduledTime<0)return {status:'BLOCKED',reason:'RUNTIME_INVALID'};
 const db=env.RECOVERY_DB;
 const cfg=await db.prepare('SELECT enabled,max_jobs_per_tick FROM fact001_runner_config_v1 WHERE id=1').first();
 if(!cfg||Number(cfg.enabled)!==1)return {status:'DISABLED'};
 if(Number(cfg.max_jobs_per_tick)!==1)return {status:'BLOCKED',reason:'BUDGET_POLICY'};
 const tickKey='lab-utc-'+String(scheduledTime);
 const tick=await db.prepare('INSERT INTO fact001_runner_ticks_v1(tick_key,outcome) VALUES(?1,?2) ON CONFLICT(tick_key) DO NOTHING RETURNING tick_key')
   .bind(tickKey,'EMPTY').first();
 if(!tick)return {status:'ALREADY_TICKED'};
 // Interrupted jobs may have performed effects; never retry them automatically.
 await db.prepare(`UPDATE fact001_runner_jobs_v1 SET state='RECONCILE',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
   WHERE state='RUNNING' AND lease_until_ms<=?1`).bind(scheduledTime).run();
 const claimed=await db.prepare(`UPDATE fact001_runner_jobs_v1 SET state='RUNNING',attempts=attempts+1,lease_until_ms=?1,
   updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
   WHERE id=(SELECT id FROM fact001_runner_jobs_v1 WHERE state='QUEUED' AND attempts=0 AND client_id='cerebro'
      AND company_id='fenix-capital' AND engine_id='FACT-001' AND environment='LAB'
      AND version='1.0.0' AND operation='fact001.lab.heartbeat'
      ORDER BY created_at,id LIMIT 1) AND state='QUEUED' AND attempts=0
   RETURNING id,company_id,engine_id,environment,version,client_id,operation,payload_hash`).bind(scheduledTime+15000).first();
 if(!claimed){
   await db.prepare("UPDATE fact001_runner_ticks_v1 SET outcome='EMPTY' WHERE tick_key=?1").bind(tickKey).run();
   return {status:'EMPTY'};
 }
 const approved=claimed.company_id===SCOPE.company_id&&claimed.engine_id===SCOPE.engine_id&&
 claimed.environment===SCOPE.environment&&claimed.version===SCOPE.version&&
 claimed.client_id==='cerebro'&&claimed.operation===VALID_JOB;
 if(!approved){
  await db.prepare("UPDATE fact001_runner_jobs_v1 SET state='BLOCKED' WHERE id=?1 AND state='RUNNING'").bind(claimed.id).run();
  await db.prepare("UPDATE fact001_runner_ticks_v1 SET outcome='BLOCKED' WHERE tick_key=?1").bind(tickKey).run();
  return {status:'BLOCKED'};
 }
 // Register a durable recovery key before the internal heartbeat, without a payload or token.
 const key=await sha256([claimed.company_id,claimed.engine_id,claimed.environment,claimed.version,
     claimed.client_id,claimed.operation,claimed.id].join(':'));
 if(!/^[a-f0-9]{64}$/.test(claimed.payload_hash))return {status:'BLOCKED',reason:'PAYLOAD_HASH_INVALID'};
 const claimLedger=await db.prepare(`INSERT INTO fact001_recovery_v1
    (key_hash,fingerprint,state,retryable_read,attempt,lease_until,retry_at,updated_at)
    VALUES(?1,?2,'RUNNING',0,1,?3,NULL,?4)
    ON CONFLICT(key_hash) DO NOTHING RETURNING key_hash`)
   .bind(key,claimed.payload_hash,scheduledTime+15000,scheduledTime).first();
 if(!claimLedger){
   await db.prepare("UPDATE fact001_runner_jobs_v1 SET state='RECONCILE' WHERE id=?1 AND state='RUNNING'").bind(claimed.id).run();
   await db.prepare("UPDATE fact001_runner_ticks_v1 SET outcome='BLOCKED' WHERE tick_key=?1").bind(tickKey).run();
   return {status:'RECONCILIATION_REQUIRED'};
 }
 // The only operation allowed is an internal deterministic heartbeat. No outbound APIs.
 const ledgerDone=await db.prepare(`UPDATE fact001_recovery_v1 SET state='COMPLETED',updated_at=?3
    WHERE key_hash=?1 AND fingerprint=?2 AND state='RUNNING' AND attempt=1 RETURNING key_hash`)
    .bind(key,claimed.payload_hash,scheduledTime).first();
 if(!ledgerDone)return {status:'RECONCILIATION_REQUIRED'};
 const done=await db.prepare(`UPDATE fact001_runner_jobs_v1 SET state='COMPLETED',lease_until_ms=NULL,
 updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE id=?1 AND state='RUNNING' AND attempts=1 RETURNING id`).bind(claimed.id).first();
 if(!done)return {status:'RECONCILIATION_REQUIRED'};
 await db.prepare("UPDATE fact001_runner_ticks_v1 SET outcome='COMPLETED' WHERE tick_key=?1").bind(tickKey).run();
 return {status:'COMPLETED',operation:VALID_JOB};
}
export default {
 async fetch(_request,_env){ return new Response('Not Found',{status:404,headers:heads});},
 async scheduled(controller,env,ctx){
  // No user-visible endpoint. Cloudflare cron is the only intended executor entrypoint.
  const run=processRecoveryTick(env,controller.scheduledTime);
  ctx.waitUntil(run);
 }
};
