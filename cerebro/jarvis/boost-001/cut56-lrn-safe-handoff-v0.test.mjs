import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CONTRACT, makeSafeLearningHandoff } from './cut56-lrn-safe-handoff-v0.mjs';
test('handoff targets existing LRN-001 but is not an enabled execution endpoint',()=>{
 assert.equal(CONTRACT.target_engine_id,'LRN-001');
 assert.equal(CONTRACT.environment,'LAB');
 assert.equal(CONTRACT.company_id,'fenix');
 assert.ok(CONTRACT.allowed_reasons.includes('HUMAN_ESCALATION_WITHOUT_EXCEPTION'));
});
test('tampered, empty or unauthenticated verdict cannot be transformed',()=>{
 assert.throws(()=>makeSafeLearningHandoff({},Buffer.from('{}')),/UNTRUSTED_TRIBUNAL_REPORT_SHA/);
 assert.throws(()=>makeSafeLearningHandoff({release_authorized:true},Buffer.from('{}')),/UNTRUSTED_TRIBUNAL_REPORT_SHA/);
});
test('actual CUT56 verdict yields five immutable quarantined non-executable events',()=>{
 const file=process.env.JARVIS_CUT56_VERDICT_FIXTURE;
 if(!file)return;
 const bytes=fs.readFileSync(file);
 const obj=makeSafeLearningHandoff(JSON.parse(bytes.toString('utf8')),bytes);
 assert.equal(obj.total,5);
 assert.equal(obj.quarantined,5);
 assert.equal(obj.released,0);
 assert.equal(obj.accepted_as_memory,0);
 assert.equal(obj.physical_lrn_ingest_verified,false);
 assert.equal(obj.production_ready,false);
 assert.equal(new Set(obj.records.map(r=>r.idempotency_key)).size,5);
 for (const v of obj.records){
  assert.equal(v.status,'QUARANTINED_SEMANTIC_REJECTED');
  assert.equal(v.candidate_text_included,false);
  assert.equal(v.memory_write_authorized,false);
  assert.equal(v.release_manifest_authorized,false);
  assert.equal(v.execute_authorized,false);
  assert.equal(v.prod_authorized,false);
 }
});
