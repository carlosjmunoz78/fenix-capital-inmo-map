// FACT-001 Notion QUEUE LAB v0. No public HTTP; no token; no Notion API; no routes.
// Dedicated D1 binding grants access ONLY to cerebro-fact001-recovery-lab-eu.
// The queue currently accepts ONLY an internal deterministic probe.
// No general Notion write job exists, so a config flip cannot expose provider writes.
const SCOPE={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export async function processNotionQueueTick(env,scheduledTime=Date.now()){
 if(!env||!env.FACT001_D1||!Number.isSafeInteger(scheduledTime)||scheduledTime<0)
  return {status:'BLOCKED',reason:'RUNTIME_INVALID'};
 const db=env.FACT001_D1;
 const cfg=await db.prepare('SELECT enabled,provider_writes_enabled,max_jobs_per_tick,max_additional_cost_eur FROM fact001_notion_queue_config_v1 WHERE id=1').first();
 if(!cfg||Number(cfg.enabled)!==1)return {status:'DISABLED',provider_writes:0};
 if(Number(cfg.provider_writes_enabled)!==0||Number(cfg.max_jobs_per_tick)!==1||
    Number(cfg.max_additional_cost_eur)!==0)return {status:'BLOCKED',reason:'COST_OR_PROVIDER_POLICY'};
 // Crash-safe: expired claims are irreversibly RECONCILE, never re-queued.
 await db.prepare(`UPDATE fact001_notion_queue_jobs_v1 SET state='RECONCILE',
    updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE state='RUNNING' AND lease_until_ms<=?1`).bind(scheduledTime).run();
 // Only pre-existing synthetic probe rows can ever be processed in v0. Notion is not called.
 const claimed=await db.prepare(`UPDATE fact001_notion_queue_jobs_v1
   SET state='RUNNING',attempts=attempts+1,lease_until_ms=?1,
    updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
   WHERE id=(SELECT id FROM fact001_notion_queue_jobs_v1
     WHERE state='QUEUED' AND attempts=0 AND client_id='cerebro' AND
      company_id='fenix-capital' AND engine_id='FACT-001' AND
      environment='LAB' AND version='1.0.0' AND operation='notion.lab.queue.probe'
     ORDER BY created_at,id LIMIT 1)
   AND state='QUEUED' AND attempts=0
   RETURNING id,company_id,engine_id,environment,version,client_id,operation,payload_hash`)
   .bind(scheduledTime+15000).first();
 if(!claimed)return {status:'EMPTY',provider_writes:0};
 const valid=claimed.company_id===SCOPE.company_id&&claimed.engine_id===SCOPE.engine_id&&
   claimed.environment===SCOPE.environment&&claimed.version===SCOPE.version&&
   claimed.client_id==='cerebro'&&claimed.operation==='notion.lab.queue.probe'&&
   /^[0-9a-f]{64}$/.test(claimed.payload_hash);
 if(!valid){
  await db.prepare("UPDATE fact001_notion_queue_jobs_v1 SET state='BLOCKED' WHERE id=?1 AND state='RUNNING'").bind(claimed.id).run();
  return {status:'BLOCKED',reason:'SCOPE_INVALID',provider_writes:0};
 }
 const done=await db.prepare(`UPDATE fact001_notion_queue_jobs_v1
    SET state='COMPLETED',lease_until_ms=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id=?1 AND state='RUNNING' AND attempts=1
    RETURNING id`).bind(claimed.id).first();
 if(!done)return {status:'RECONCILIATION_REQUIRED',provider_writes:0};
 return {status:'COMPLETED',operation:'notion.lab.queue.probe',provider_writes:0,external_calls:0};
}
export default {
 async fetch(){return new Response('Not Found',{status:404,headers:HEADERS});},
 async scheduled(controller,env,ctx){ctx.waitUntil(processNotionQueueTick(env,controller.scheduledTime));}
};
