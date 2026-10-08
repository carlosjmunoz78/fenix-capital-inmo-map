import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {buildLearningOutbox,persistLearningOutbox,normalizeLearningSubscribers} from '../runtime/rsi-event-outbox.mjs';

function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-rsi-outbox-'));}
const source={workflow:'CEREBRO Skill Discovery Scout',run_id:123456,head_sha:'a'.repeat(40)};
function registry(extra=[]){return {schema_version:'1.0.0',state_type:'CEREBRO_RSI_LEARNING_SUBSCRIBERS',environment:'PREPROD',engine_id:'LRN-001',prod_authorized:false,trading_access:false,subscribers:[{company_id:'fenix',enabled:true,environment:'PREPROD',version:'0.5.0',local_validation_required:true,prod_authorized:false,prod_write_authorized:false,trading_access:false},...extra]};}
function event(id='evt:skill:abc',company_id='GLOBAL_ONLY'){return {event_id:id,event_type:'SKILL_CANDIDATE_STATIC_LAB_GREEN',severity:'INFO',company_id,engine_id:'FACT-001',environment:'PREPROD_CANDIDATE',version:'0.1.0',candidate_id:'candidate:x',reason:'STATIC_LAB_GREEN',evidence_ref:{source_ref:'source:x'},payload:{domain:'seo'},target_engine_bindings:['SEO-001'],publish_authorized:false,prod_authorized:false};}

test('subscriber registry is exact PREPROD and cannot expand PROD or Trading',()=>{
  assert.equal(normalizeLearningSubscribers(registry()).length,1);
  assert.throws(()=>normalizeLearningSubscribers({...registry(),environment:'PROD'}),/PREPROD LRN-001/);
  assert.throws(()=>normalizeLearningSubscribers({...registry(),prod_authorized:true}),/deny PROD/);
  assert.throws(()=>normalizeLearningSubscribers(registry([{company_id:'bad',enabled:true,environment:'PREPROD',version:'0.1.0',local_validation_required:true,prod_authorized:true,prod_write_authorized:false,trading_access:false}])),/expanded forbidden authority/);
});

test('GLOBAL_ONLY skill events fan out to tenant-local PREPROD candidates with stable IDs',()=>{
  const input={events:[event()]};
  const first=buildLearningOutbox({event_report:input,subscriber_registry:registry(),source});
  const second=buildLearningOutbox({event_report:input,subscriber_registry:registry(),source});
  assert.equal(first.batches_total,1);
  assert.deepEqual(first,second);
  const batch=first.batches[0];
  assert.equal(batch.company_id,'fenix');assert.equal(batch.environment,'PREPROD');assert.equal(batch.prod_authorized,false);assert.equal(batch.trading_access,false);
  assert.equal(batch.events[0].company_id,'fenix');assert.equal(batch.events[0].origin_company_id,'GLOBAL_ONLY');assert.equal(batch.events[0].origin_event_id,'evt:skill:abc');assert.equal(batch.events[0].local_validation_required,true);
});

test('tenant-specific event never leaks into a different subscriber',()=>{
  const other={company_id:'other',enabled:true,environment:'PREPROD',version:'0.5.0',local_validation_required:true,prod_authorized:false,prod_write_authorized:false,trading_access:false};
  const build=buildLearningOutbox({event_report:{events:[event('evt:tenant','fenix')]},subscriber_registry:registry([other]),source});
  assert.equal(build.batches_total,1);assert.equal(build.batches[0].company_id,'fenix');
});

test('persisted outbox is append-only/idempotent and maintains raw-byte checksum index',()=>{
  const root=temp();
  try{
    const build=buildLearningOutbox({event_report:{events:[event()]},subscriber_registry:registry(),source});
    const first=persistLearningOutbox({build,output_root:root});
    assert.equal(first.status,'OUTBOX_GREEN');assert.equal(first.created_total,1);
    const second=persistLearningOutbox({build,output_root:root});
    assert.equal(second.created_total,0);
    const index=JSON.parse(fs.readFileSync(path.join(root,'fenix','index.json'),'utf8'));
    assert.equal(index.batches_total,1);assert.equal(index.prod_authorized,false);assert.equal(index.trading_access,false);
    const batchPath=path.join(root,'fenix',index.batches[0].path);assert.equal(fs.existsSync(batchPath),true);
    const rawBytes=fs.readFileSync(batchPath);
    const expected=crypto.createHash('sha256').update(rawBytes).digest('hex');
    const expectedFromConsumerText=crypto.createHash('sha256').update(rawBytes.toString('utf8'),'utf8').digest('hex');
    assert.equal(index.batches[0].sha256,expected);
    assert.equal(index.batches[0].sha256,expectedFromConsumerText);
    assert.match(index.batches[0].sha256,/^[0-9a-f]{64}$/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('same source run with changed payload conflicts instead of overwriting immutable batch evidence',()=>{
  const root=temp();
  try{
    const build=buildLearningOutbox({event_report:{events:[event()]},subscriber_registry:registry(),source});
    persistLearningOutbox({build,output_root:root});
    const batch=build.batches[0];
    const file=path.join(root,'fenix','batches',`${batch.batch_id.replace(/[^A-Za-z0-9._-]/g,'_')}.json`);
    const tampered=JSON.parse(fs.readFileSync(file,'utf8'));tampered.events[0].reason='TAMPERED';fs.writeFileSync(file,JSON.stringify(tampered));
    assert.throws(()=>persistLearningOutbox({build,output_root:root}),/OUTBOX_BATCH_CONFLICT/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
