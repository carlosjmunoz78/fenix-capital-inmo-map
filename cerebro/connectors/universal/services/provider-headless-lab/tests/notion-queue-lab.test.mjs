import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {NOTION_QUEUE_LAB_SCHEMA} from '../../../cloudflare/notion-queue-lab/schema.mjs';
import worker,{processNotionQueueTick} from '../../../cloudflare/notion-queue-lab/worker.mjs';
import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync('cerebro/connectors/universal/cloudflare/notion-queue-lab/wrangler.lab.jsonc','utf8'));
const FIXED='f'.repeat(64);
function f(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(NOTION_QUEUE_LAB_SCHEMA);
 const wrapper={prepare(sql){return {
   async first(){return db.prepare(sql).get()??null;},
   bind(...args){return {
     async first(){return db.prepare(sql).get(...args)??null;},
     async run(){return db.prepare(sql).run(...args);}
   }}
 }}};
 return {db,env:{FACT001_D1:wrapper},enqueue({id='FACT001-QUEUE-PROBE-1',operation='notion.lab.queue.probe',environment='LAB'}={}){
  return db.prepare(`INSERT INTO fact001_notion_queue_jobs_v1
   (id,company_id,engine_id,environment,version,client_id,operation,payload_hash)
   VALUES(?1,'fenix-capital','FACT-001',?2,'1.0.0','cerebro',?3,?4)`).run(id,environment,operation,FIXED);
 },enable(){
  db.exec('UPDATE fact001_notion_queue_config_v1 SET enabled=1 WHERE id=1');
 },count(){return db.prepare('SELECT COUNT(*) AS n FROM fact001_notion_queue_jobs_v1').get().n;}
 };
}
test('deploy definition has exclusive Recovery D1 binding and no endpoints/cron',()=>{
 assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);
 assert.deepEqual(config.triggers.crons,[]);
 assert.equal(config.d1_databases.length,1);
 assert.equal(config.d1_databases[0].binding,'FACT001_D1');
 assert.equal(config.d1_databases[0].database_id,'1305f791-7c44-47f9-946b-f330a09c88aa');
 const workerSource=readFileSync('cerebro/connectors/universal/cloudflare/notion-queue-lab/worker.mjs','utf8');
 assert.ok(workerSource.includes("status:404"));
 assert.ok(!/api\.notion\.com|\bawait\s+fetch\(|\bglobalThis\.fetch\(|Bearer |service_role|process\.env|env\..*TOKEN/.test(workerSource));
});
test('config defaults OFF and zero authorized provider writes',async()=>{
 const x=f();const cfg=x.db.prepare('SELECT * FROM fact001_notion_queue_config_v1 WHERE id=1').get();
 assert.equal(cfg.enabled,0);assert.equal(cfg.provider_writes_enabled,0);
 assert.equal(cfg.max_additional_cost_eur,0);
 x.enqueue();const out=await processNotionQueueTick(x.env,1111);
 assert.equal(out.status,'DISABLED');assert.equal(out.provider_writes,0);
 assert.equal(x.db.prepare('SELECT state FROM fact001_notion_queue_jobs_v1').get().state,'QUEUED');
});
test('strict SQL policy blocks PROD, arbitrary Notion writes and non-CEREBRO actors',()=>{
 const x=f();for(const b of [{environment:'PROD'},{operation:'notion.lab.child.restore'}])
 assert.throws(()=>x.enqueue(b),/CHECK constraint failed/);
 assert.equal(x.count(),0);
});
test('enabling synthetic probe processes exactly once without provider API',async()=>{
 const x=f();x.enqueue();x.enable();
 const ok=await processNotionQueueTick(x.env,12345);
 assert.deepEqual(ok,{status:'COMPLETED',operation:'notion.lab.queue.probe',provider_writes:0,external_calls:0});
 assert.equal(x.db.prepare('SELECT state,attempts FROM fact001_notion_queue_jobs_v1').get().state,'COMPLETED');
 assert.equal(x.db.prepare('SELECT attempts FROM fact001_notion_queue_jobs_v1').get().attempts,1);
 const next=await processNotionQueueTick(x.env,12346);
 assert.equal(next.status,'EMPTY');assert.equal(x.count(),1);
});
test('schema hard denies provider_writes_enabled or cost limit > 0',()=>{
 const x=f();for(const sql of ['UPDATE fact001_notion_queue_config_v1 SET provider_writes_enabled=1 WHERE id=1',
  'UPDATE fact001_notion_queue_config_v1 SET max_additional_cost_eur=1 WHERE id=1',
  'UPDATE fact001_notion_queue_config_v1 SET max_jobs_per_tick=2 WHERE id=1'])assert.throws(()=>x.db.exec(sql),/CHECK constraint failed/);
});
test('HTTP fetch returns 404 unconditionally',async()=>{
 const r=await worker.fetch(new Request('https://example.com/?secret=hidden'),{FACT001_D1:'untrusted'});
 assert.equal(r.status,404);assert.equal(await r.text(),'Not Found');
});
test('missing binding always fails closed',async()=>{
 assert.equal((await processNotionQueueTick({},1)).status,'BLOCKED');
});
