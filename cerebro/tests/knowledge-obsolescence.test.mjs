import test from 'node:test';
import assert from 'node:assert/strict';
import {assessKnowledge,historicalTransition} from '../runtime/knowledge-obsolescence.mjs';

test('drift and contradiction reduce confidence without destructive delete',()=>{
  const a=assessKnowledge({company_id:'fenix',engine_id:'SEO-001',knowledge_ref:'k:1',confidence:0.9,age_ms:100,ttl_ms:1000,drift:true,contradictions:1,evidence_refs:['e:1']});
  assert.equal(a.state,'UNCERTAIN');
  assert.equal(a.confidence,0.65);
  assert.equal(a.history_preserved,true);
  assert.equal(a.delete_original,false);
  assert.equal(a.prod_authorized,false);
});

test('TTL expiry marks stale and replacement marks superseded',()=>{
  const stale=assessKnowledge({company_id:'fenix',engine_id:'SEO-001',knowledge_ref:'k:1',confidence:0.8,age_ms:2000,ttl_ms:1000});
  assert.equal(stale.state,'STALE');
  assert.ok(stale.confidence<=0.49);
  const replaced=assessKnowledge({company_id:'fenix',engine_id:'SEO-001',knowledge_ref:'k:1',confidence:0.8,age_ms:100,ttl_ms:1000,replacement_ref:'k:2'});
  assert.equal(replaced.state,'SUPERSEDED');
  assert.equal(replaced.replacement_ref,'k:2');
});

test('historical transition is append-only and scoped',()=>{
  const t=historicalTransition({company_id:'fenix',engine_id:'SEO-001',knowledge_ref:'k:1',prior_state:'CURRENT',next_state:'HISTORICAL',evidence_ref:'e:archive'});
  assert.equal(t.append_history,true);
  assert.equal(t.destructive_delete,false);
  assert.equal(t.company_id,'fenix');
});
