import test from 'node:test';
import assert from 'node:assert/strict';
import {sealNotionIndexManifest} from '../notion-encrypted-index-manifest.mjs';
import {planNextNotionBackupBatch,verifyNotionBackupBatch} from '../notion-content-batch-planner.mjs';
const key='84'.repeat(32),token='CEREBRO_TEST_SOURCE_TOKEN_12345678901234567';
const ids=Array.from({length:52},(_,i)=>(i+100).toString(16).padStart(8,'0')+'-1111-4111-8111-111111111111');
async function index(){
 const response={results:ids.map((id,i)=>({id,object:i%7===0?'data_source':'page',
  parent:{type:'workspace',workspace:true},last_edited_time:'2026-11-10T00:00:00Z',
  title:'MUST_NOT_RETURN_TITLE'})),has_more:false,next_cursor:null};
 return sealNotionIndexManifest({notionToken:token,encryptionKey:key,http:async()=>({status:200,json:async()=>response})});
}
test('52 encrypted index objects produce deterministic 25/25/2 lots, no IDs or titles in envelopes',async()=>{
 const a=await index();
 const batches=[];let offset=0;
 do{
  const b=await planNextNotionBackupBatch({encryptionKey:key,indexArtifact:a,offset,maxItems:25});
  batches.push(b);offset=b.next_offset;
  assert.equal(b.provider_writes,0);assert.equal(b.queue_activated,false);
  assert.equal(b.content_downloaded,false);
  for(const id of ids)assert.ok(!JSON.stringify(b).includes(id));
  assert.ok(!JSON.stringify(b).includes('MUST_NOT_RETURN_TITLE'));
  const proof=await verifyNotionBackupBatch({encryptionKey:key,artifact:b,expectedIndexSha256:a.id_list_sha256});
  assert.equal(proof.status,'FACT001_NOTION_BATCH_PLAN_REBUILT');
  assert.equal(proof.item_count,b.items);
 }while(batches.at(-1).has_more);
 assert.deepEqual(batches.map(x=>x.items),[25,25,2]);
 assert.equal(offset,52);
 const done=await planNextNotionBackupBatch({encryptionKey:key,indexArtifact:a,offset});
 assert.equal(done.status,'NO_MORE_OBJECTS');assert.equal(done.items,0);
});
test('retries of a lot use same stable idempotency batch reference, different AES nonce',async()=>{
 const a=await index();
 const first=await planNextNotionBackupBatch({encryptionKey:key,indexArtifact:a,offset:5,maxItems:10});
 const second=await planNextNotionBackupBatch({encryptionKey:key,indexArtifact:a,offset:5,maxItems:10});
 assert.equal(first.batch_ref,second.batch_ref);
 assert.notEqual(first.envelope.nonce_b64,second.envelope.nonce_b64);
});
test('incorrect key or tampered fingerprint cannot create verified batch',async()=>{
 const a=await index(),b=await planNextNotionBackupBatch({encryptionKey:key,indexArtifact:a});
 await assert.rejects(()=>planNextNotionBackupBatch({encryptionKey:'aa'.repeat(32),indexArtifact:a}),/AUTHENTICITY/);
 await assert.rejects(()=>verifyNotionBackupBatch({encryptionKey:key,artifact:b,expectedIndexSha256:'0'.repeat(64)}),/ARTIFACT_DENIED/);
 await assert.rejects(()=>verifyNotionBackupBatch({encryptionKey:'aa'.repeat(32),artifact:b,expectedIndexSha256:a.id_list_sha256}),/AUTHENTICITY_DENIED/);
});
test('partial source index cannot seed a content batch; bounds fail before calls',async()=>{
 const a=await sealNotionIndexManifest({notionToken:token,encryptionKey:key,maxPages:1,
  http:async()=>({status:200,json:async()=>({results:[{id:ids[0],object:'page'}],has_more:true,next_cursor:'more'})})});
 await assert.rejects(()=>planNextNotionBackupBatch({encryptionKey:key,indexArtifact:a}),/NEEDS_COMPLETE_INDEX/);
 const full=await index();
 for(const bad of [{offset:-1},{offset:100},{maxItems:26},{maxItems:0}]){
  await assert.rejects(()=>planNextNotionBackupBatch({encryptionKey:key,indexArtifact:full,...bad}));
 }
});
