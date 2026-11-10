import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createD1RecoveryLedger,RECOVERY_D1_SCHEMA} from '../../../src/recovery-d1-ledger.mjs';
import {createNotionLabGovernedOperator,NOTION_WIKI_LAB_ID} from '../notion-governed-operator.mjs';

const pageId='41481b1a-756d-8119-b1fa-c38a9d013a35';
const wikiTitle='Wiki Fénix Capital';
const title='FACT001 CEREBRO Notion LAB CRUD temporal 20261110 verificado';
const updated='FACT001 CEREBRO Notion LAB CRUD temporal 20261110 nuevo';
const timestamp='2026-11-10T16:56:40.978Z';
const order=(overrides={})=>({
 company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',
 client_id:'cerebro',source:'owner_order',operation:'notion.lab.child.restore',
 request_id:'FACT001-OWNER-ORDER-20261110-AB01',idempotency_key:'FACT001-IDEMPOTENCY-20261110-AB01',
 page_id:pageId,expected_title:title,expected_last_edited_time:timestamp,...overrides
});
function fixture({enabled=true,owned=true,allowCost=true,malformedParent=false,throwAfterWrite=false,failAudit=false,failSnapshot=false,invalidIdentity=false}={}){
 const db=new DatabaseSync(':memory:');
 db.exec(RECOVERY_D1_SCHEMA);
 const ledger=createD1RecoveryLedger({query:async(sql,params)=>db.prepare(sql).all(...params)});
 const actions=[],events=[],snapshots=[];
 let patchCount=0,live=false,currentTitle=title,time=timestamp;
 const provider={
  async getPage(id){
   actions.push(['GET',id]);
   if(id===NOTION_WIKI_LAB_ID)return {object:'page',id,title:wikiTitle,in_trash:false};
   if(id!==pageId)throw Error('GET_FOREIGN');
   return {object:'page',id,parent:{type:'page_id',page_id:malformedParent?'11111111-1111-4111-8111-111111111111':NOTION_WIKI_LAB_ID},
    title:currentTitle,last_edited_time:time,in_trash:!live};
  },
  async patchPage(id,patch){
   patchCount++;actions.push(['PATCH',id,patch]);
   assert.equal(id,pageId);
   assert.ok(Object.keys(patch).length===1);
   if('in_trash' in patch)live=!patch.in_trash;
   if('title' in patch)currentTitle=patch.title;
   time='2026-11-10T17:30:00.000Z';
   if(throwAfterWrite)throw Error('UPSTREAM_DISCONNECTED');
   return {id};
  }
 };
 const ownership={durable:true,async get(){return owned?{page_id:pageId,parent_id:NOTION_WIKI_LAB_ID,company_id:'fenix-capital',
  environment:'LAB',approved:true,synthetic:true}:null;}};
 const snapshotStore={durable:true,async save(x){if(failSnapshot)throw Error('SNAPSHOT_UNAVAILABLE');snapshots.push(x);return {ref:'snapshot://fact001/1'};}};
 const audit={durable:true,async append(e){if(failAudit)throw Error('AUDIT_UNAVAILABLE');events.push(e);}};
 const verifyTransport=async()=>invalidIdentity?{verified:false}:{verified:true,client_id:'cerebro',
  actor_id:'carlosjmunoz78',identity_ref:'cerebro-service-v1',source:'owner_order',authority:'owner_signed_command'};
 const deps={ledger,ownership,snapshots:snapshotStore,audit,provider,verifyTransport,
  costGuard:async()=>allowCost,now:()=>10000,writesEnabled:enabled};
 const make=()=>createNotionLabGovernedOperator(deps);
 return {db,ledger,events,snapshots,actions,make,provider,getPatchCount:()=>patchCount,setLive:v=>live=v};
}
test('candidate defaults OFF and makes no provider or ledger writes',async()=>{
 const s=fixture({enabled:false});const result=await s.make().run(order(),{});
 assert.equal(result.reason,'NOTION_WRITES_DISABLED');assert.equal(s.actions.length,0);
 assert.equal(s.db.prepare('SELECT COUNT(*) as n FROM fact001_recovery_v1').get().n,0);
});
test('signature/4D/PROD/automation and unsafe payloads are blocked before any provider call',async()=>{
 const s=fixture();
 const bad=[{environment:'PROD'},{company_id:'other'},{source:'automation'},
  {operation:'notion.page.delete_permanent'},{page_id:NOTION_WIKI_LAB_ID},
  {arbitrary_token:'not-a-token'},{idempotency_key:''},{new_title:'silent-injection'}];
 for(const b of bad){
  const r=await s.make().run(order(b),{});
  assert.equal(r.status,'BLOCKED');
 }
 assert.equal(s.actions.length,0);
});
test('unsigned caller and unregistered child fail closed without calls',async()=>{
 for(const opts of [{invalidIdentity:true},{owned:false}]){
  const s=fixture(opts);assert.equal((await s.make().run(order(),{})).status,'BLOCKED');
  assert.equal(s.actions.length,0);
 }
});
test('cost 0 hard guard blocks before any D1 claim or provider operation',async()=>{
 const s=fixture({allowCost:false});assert.equal((await s.make().run(order(),{})).reason,'MONEY_LIMIT');
 assert.equal(s.actions.length,0);assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM fact001_recovery_v1').get().n,0);
});
test('RESTORE of registered isolated child: D1 CAS + durable snapshot + verified readback + audit',async()=>{
 const s=fixture();
 const out=await s.make().run(order(),{});
 assert.equal(out.status,'COMPLETED');assert.equal(out.additional_cost_eur,0);
 assert.equal(s.getPatchCount(),1);assert.equal(s.snapshots.length,1);
 assert.equal(s.snapshots[0].record.in_trash,true);
 assert.deepEqual(s.events.map(e=>e.event),['NOTION_MUTATION_PREPARED','NOTION_MUTATION_VERIFIED']);
 const data=s.db.prepare('SELECT * FROM fact001_recovery_v1').get();
 assert.equal(data.state,'COMPLETED');assert.equal(data.attempt,1);assert.equal(data.retryable_read,0);
 assert.ok(!JSON.stringify(data).includes(title));
 assert.ok(!JSON.stringify(data).includes(pageId));
 const second=await s.make().run(order(),{});
 assert.equal(second.status,'ALREADY_COMPLETED');assert.equal(s.getPatchCount(),1);
});
test('same idempotency key with changed operation never re-executes',async()=>{
 const s=fixture();assert.equal((await s.make().run(order(),{})).status,'COMPLETED');
 const altered=order({operation:'notion.lab.child.trash'});
 assert.equal((await s.make().run(altered,{})).status,'IDEMPOTENCY_CONFLICT');
 assert.equal(s.getPatchCount(),1);
});
test('upstream uncertain response after PATCH goes to D1 RECONCILE; no automatic retry',async()=>{
 const s=fixture({throwAfterWrite:true});
 assert.equal((await s.make().run(order(),{})).status,'RECONCILIATION_REQUIRED');
 assert.equal(s.db.prepare('SELECT state FROM fact001_recovery_v1').get().state,'RECONCILE');
 assert.equal((await s.make().run(order(),{})).status,'RECONCILIATION_REQUIRED');
 assert.equal(s.getPatchCount(),1);
});
test('foreign parent, stale revision and non-trashed restore stop before PATCH',async()=>{
 for(const variant of ['foreign','stale','live']){
  const s=fixture({malformedParent:variant==='foreign'});
  if(variant==='live')s.setLive(true);
  const cmd=variant==='stale'?order({expected_last_edited_time:'2026-11-10T17:59:59Z'}):order();
  const r=await s.make().run(cmd,{});
  assert.equal(r.status,'BLOCKED');assert.equal(s.getPatchCount(),0);
  assert.equal(s.db.prepare('SELECT state FROM fact001_recovery_v1').get().state,'STOPPED');
 }
});
test('failed snapshot or durable audit denies write, no provider PATCH',async()=>{
 for(const opt of [{failSnapshot:true},{failAudit:true}]){
  const s=fixture(opt),out=await s.make().run(order(),{});
  assert.equal(out.status,'BLOCKED');assert.equal(s.getPatchCount(),0);
  assert.equal(s.db.prepare('SELECT state FROM fact001_recovery_v1').get().state,'STOPPED');
 }
});
test('requires durable stores and provider interface; refuses memory-only fake ledger',()=>{
 const s=fixture();assert.throws(()=>createNotionLabGovernedOperator({ledger:{durable:false}}),/NOTION_GOVERNED_DEPENDENCIES_REQUIRED/);
 assert.equal(s.getPatchCount(),0);
});
test('RENAME / TRASH do not touch Wiki and are constrained to registered LAB child',async()=>{
 const rename=fixture();rename.setLive(true);
 const cmd=order({operation:'notion.lab.child.rename',new_title:updated});
 assert.equal((await rename.make().run(cmd,{})).status,'COMPLETED');
 assert.equal(rename.actions.filter(x=>x[0]==='PATCH').length,1);
 assert.equal(rename.actions.find(x=>x[0]==='PATCH')[1],pageId);
 const trash=fixture();trash.setLive(true);
 const x=order({operation:'notion.lab.child.trash'});
 assert.equal((await trash.make().run(x,{})).status,'COMPLETED');
 assert.equal(trash.actions.filter(x=>x[0]==='PATCH')[0][2].in_trash,true);
});
