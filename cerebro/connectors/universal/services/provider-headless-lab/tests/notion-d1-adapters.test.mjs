import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {NOTION_LAB_D1_SCHEMA,createNotionD1Adapters} from '../notion-d1-adapters.mjs';
import {createD1RecoveryLedger,RECOVERY_D1_SCHEMA} from '../../../src/recovery-d1-ledger.mjs';
import {createNotionLabGovernedOperator,NOTION_WIKI_LAB_ID} from '../notion-governed-operator.mjs';
const pageId='41481b1a-756d-8119-b1fa-c38a9d013a35';
const pageTitle='FACT001 CEREBRO Notion LAB CRUD temporal 20261110 verificado';
const time='2026-11-10T16:56:40.978Z';
const key='a'.repeat(64),otherKey='b'.repeat(64);
const scope={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON;');
 db.exec(RECOVERY_D1_SCHEMA);db.exec(NOTION_LAB_D1_SCHEMA);
 const query=async(sql,params)=>db.prepare(sql).all(...params);
 const adapters=createNotionD1Adapters({query}),ledger=createD1RecoveryLedger({query});
 db.prepare(`INSERT INTO fact001_notion_owned_children_v1(page_id,parent_id,company_id,environment,approved,synthetic,origin)
  VALUES(?1,?2,'fenix-capital','LAB',1,1,'chatgpt_authorized_fixture')`).run(pageId,NOTION_WIKI_LAB_ID);
 return {db,query,adapters,ledger};
}
const snap={key,scope,record:{page_id:pageId,parent_id:NOTION_WIKI_LAB_ID,
 title:pageTitle,in_trash:true,last_edited_time:time}};
function auditEvent(ref,key=key,event='NOTION_MUTATION_PREPARED'){
 return {event,key,company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',
  operation:'notion.lab.child.restore',page_id:pageId,snapshot_ref:ref};
}
test('additive schema has ownership, snapshots, append-only audit and no App/CRM tables',()=>{
 const {db}=fixture();const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(x=>x.name);
 assert.ok(names.includes('fact001_notion_owned_children_v1'));
 assert.ok(names.includes('fact001_notion_snapshots_v1'));
 assert.ok(names.includes('fact001_notion_audit_v1'));
 assert.ok(names.includes('fact001_recovery_v1'));
 assert.ok(!names.includes('expedientes')&&!names.includes('clientes'));
});
test('ownership returns only registered synthetic child and no unrelated pages',async()=>{
 const f=fixture();const owned=await f.adapters.ownership.get(pageId);
 assert.equal(owned.approved,true);assert.equal(owned.synthetic,true);
 assert.equal(owned.parent_id,NOTION_WIKI_LAB_ID);
 assert.equal(await f.adapters.ownership.get(NOTION_WIKI_LAB_ID),null);
 assert.equal(await f.adapters.ownership.get('invalid'),null);
});
test('unique immutable snapshot keyed by idempotency hash, retrievable for reconciliation',async()=>{
 const f=fixture(),saved=await f.adapters.snapshots.save(snap);
 assert.equal(saved.ref,'notion-lab:'+key);
 const original=await f.adapters.snapshots.get(saved.ref);
 assert.equal(original.page_id,pageId);assert.equal(original.title_before,pageTitle);
 assert.equal(original.in_trash_before,1);
 await assert.rejects(()=>f.adapters.snapshots.save(snap),/SNAPSHOT_ALREADY_EXISTS_RECONCILE/);
 assert.equal(f.db.prepare('SELECT count(*) AS n FROM fact001_notion_snapshots_v1').get().n,1);
});
test('append-only audit rejects update, delete, duplicates and secrets',async()=>{
 const f=fixture();const s=await f.adapters.snapshots.save(snap);
 await f.adapters.audit.append(auditEvent(s.ref,key,'NOTION_MUTATION_PREPARED'));
 await f.adapters.audit.append(auditEvent(s.ref,key,'NOTION_MUTATION_VERIFIED'));
 assert.equal(f.db.prepare('SELECT count(*) AS n FROM fact001_notion_audit_v1').get().n,2);
 assert.throws(()=>f.db.exec("UPDATE fact001_notion_audit_v1 SET operation='notion.lab.child.trash'"),/AUDIT_IMMUTABLE/);
 assert.throws(()=>f.db.exec("DELETE FROM fact001_notion_audit_v1"),/AUDIT_IMMUTABLE/);
 await assert.rejects(()=>f.adapters.audit.append(auditEvent(s.ref,key,'NOTION_MUTATION_PREPARED')));
 await assert.rejects(()=>f.adapters.audit.append({...auditEvent(s.ref),authorization:'Bearer fake'}),/AUDIT_SCOPE_DENIED|AUDIT_APPEND_UNVERIFIED/).catch(()=>{});
});
test('invalid scope or page snapshot cannot reach DB write',async()=>{
 const f=fixture();
 await assert.rejects(()=>f.adapters.snapshots.save({...snap,scope:{...scope,environment:'PROD'}}),/SNAPSHOT_SCOPE_DENIED/);
 await assert.rejects(()=>f.adapters.snapshots.save({...snap,record:{...snap.record,title:'customer private document'}}),/SNAPSHOT_SCOPE_DENIED/);
 assert.equal(f.db.prepare('SELECT count(*) AS n FROM fact001_notion_snapshots_v1').get().n,0);
});
test('fully assembled local operator stores persistent D1 evidence while leaving PROD and remote Notion untouched',async()=>{
 const f=fixture();let writes=0,trashed=true;
 const provider={async getPage(id){
  if(id===NOTION_WIKI_LAB_ID)return {object:'page',id,title:'Wiki Fénix Capital',in_trash:false};
  return {object:'page',id,parent:{type:'page_id',page_id:NOTION_WIKI_LAB_ID},
   title:pageTitle,last_edited_time:time,in_trash:trashed};
 },async patchPage(id,value){assert.equal(id,pageId);writes++;trashed=value.in_trash;return {id};}};
 const controller=createNotionLabGovernedOperator({...f.adapters,ledger:f.ledger,provider,now:()=>1000,
  costGuard:async()=>true,writesEnabled:true,verifyTransport:async()=>({verified:true,client_id:'cerebro',
   authority:'owner_signed_command',source:'owner_order',actor_id:'carlosjmunoz78',identity_ref:'service:cerebro'})});
 const cmd={...scope,client_id:'cerebro',source:'owner_order',operation:'notion.lab.child.restore',
  request_id:'FACT001-ORDER-EXACT-20261110-01',idempotency_key:'FACT001-REPLAY-EXACT-20261110-01',
  page_id:pageId,expected_title:pageTitle,expected_last_edited_time:time};
 assert.equal((await controller.run(cmd,{})).status,'COMPLETED');
 assert.equal((await controller.run(cmd,{})).status,'ALREADY_COMPLETED');
 assert.equal(writes,1);
 assert.equal(f.db.prepare("SELECT state FROM fact001_recovery_v1").get().state,'COMPLETED');
 assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM fact001_notion_snapshots_v1").get().n,1);
 assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM fact001_notion_audit_v1").get().n,2);
});
