import test from 'node:test';
import assert from 'node:assert/strict';
import {NOTION_SYNC_SCOPE,NOTION_SYNC_PARENT,planNotionIncrementalSync} from '../notion-incremental-sync.mjs';
const id='41481b1a-756d-8119-b1fa-c38a9d013a35',a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64),ts='2026-11-11T09:00:00Z';
const base=()=>({scope:{...NOTION_SYNC_SCOPE},local:[{page_id:id,parent_id:NOTION_SYNC_PARENT,approved:true,synthetic:true,last_synced_hash:a,current_hash:a,last_edited_time:ts}],
 remote:[{page_id:id,parent_id:NOTION_SYNC_PARENT,current_hash:a,last_edited_time:ts,in_trash:false}]});
test('known synthetic LAB unchanged emits no Notion write or job',()=>{
 const x=planNotionIncrementalSync(base());
 assert.equal(x.status,'READ_ONLY_PLAN');assert.equal(x.provider_writes,0);assert.equal(x.queued_jobs,0);
 assert.equal(x.decisions[0].status,'UNCHANGED');assert.equal(x.activation,'OFF');
});
test('remote edit goes to snapshot review; no automatic overwrite',()=>{
 const x=base();x.remote[0].current_hash=b;
 assert.equal(planNotionIncrementalSync(x).decisions[0].status,'REMOTE_CHANGE_REQUIRES_SNAPSHOT_REVIEW');
});
test('local edit requires explicit owner authorization, no provider write',()=>{
 const x=base();x.local[0].current_hash=b;
 assert.equal(planNotionIncrementalSync(x).decisions[0].status,'LOCAL_CHANGE_REQUIRES_EXPLICIT_OWNER_ORDER');
});
test('simultaneous edit and trash are conflict not auto-synced',()=>{
 for(const option of ['both','trash']){
  const x=base();x.local[0].current_hash=b;x.remote[0].current_hash=c;
  if(option==='trash')x.remote[0].in_trash=true;
  const y=planNotionIncrementalSync(x);
  assert.equal(y.status,'REVIEW_REQUIRED');
  assert.equal(y.decisions[0].status,'CONFLICT_HUMAN_REVIEW');
  assert.equal(y.provider_writes,0);
 }
});
test('cross company, PROD, unexpected fields, denied parent, unapproved child fail closed',()=>{
 const bad=[
  x=>{x.scope.company_id='other'},
  x=>{x.scope.environment='PROD'},
  x=>{x.remote[0].access_token='secret'},
  x=>{x.remote[0].parent_id='00000000-0000-4000-8000-000000000000'},
  x=>{x.local[0].approved=false},
  x=>{x.local[0].synthetic=false},
  x=>{x.local[0].page_id=NOTION_SYNC_PARENT}
 ];
 for(const fn of bad){const x=base();fn(x);assert.throws(()=>planNotionIncrementalSync(x));}
});
test('duplicate, foreign remote object, mismatched counts, invalid digest and invalid bound fail closed',()=>{
 const bad=[
  x=>{x.remote[0].page_id='ffffffff-ffff-4fff-8fff-ffffffffffff'},
  x=>{x.remote.push({...x.remote[0]})},
  x=>{x.local.push({...x.local[0]});x.remote.push({...x.remote[0]})},
  x=>{x.remote[0].current_hash='bad'},
  x=>{x.limit=26}
 ];
 for(const fn of bad){const x=base();fn(x);assert.throws(()=>planNotionIncrementalSync(x));}
});
