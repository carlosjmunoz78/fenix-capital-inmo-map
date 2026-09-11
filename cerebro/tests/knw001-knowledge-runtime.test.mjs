import test from 'node:test';
import assert from 'node:assert/strict';
import {KnowledgeEngineV0,KNW001_CONTRACT} from '../knowledge/knowledge-runtime.mjs';

const c={company_id:'fenix',engine_id:'KNW-001',environment:'PREPROD',version:'0.1.0'};
const o={...c,company_id:'other'};
const item=(x={})=>({knowledge_id:'k1',subject:'ratio',content:'value-a',state:'VALIDATED',confidence:0.95,source_ref:'notion:page-1',review_at:'2026-12-01',version:'1',...x});

test('KNW contract is safe and zero-cost',()=>{
  assert.equal(KNW001_CONTRACT.prod_write,false);
  assert.equal(KNW001_CONTRACT.trading_access,false);
  assert.equal(KNW001_CONTRACT.additional_cost_target_eur,0);
  assert.equal(KNW001_CONTRACT.autonomous_prod,false);
});

test('stores and resolves validated knowledge with evidence hash',()=>{
  const k=new KnowledgeEngineV0();
  const r=k.put({context:c,item:item()});
  assert.equal(r.status,'GREEN');
  assert.match(r.item.evidence_hash,/^[a-f0-9]{64}$/);
  assert.equal(k.resolve({context:c,subject:'ratio'}).item.content,'value-a');
});

test('low confidence cannot be marked validated',()=>{
  const k=new KnowledgeEngineV0();
  const r=k.put({context:c,item:item({confidence:0.4})});
  assert.deepEqual([r.status,r.reason],['HUMAN_REQUIRED','LOW_CONFIDENCE']);
});

test('tenant isolation fails closed',()=>{
  const k=new KnowledgeEngineV0();
  k.put({context:c,item:item()});
  const r=k.get({context:o,knowledge_id:'k1'});
  assert.deepEqual([r.status,r.reason],['HUMAN_REQUIRED','POLICY_CONFLICT']);
});

test('superseding an item marks prior SUPERSEDED',()=>{
  const k=new KnowledgeEngineV0();
  k.put({context:c,item:item()});
  const r=k.put({context:c,item:item({knowledge_id:'k2',content:'value-b',supersedes:'k1',version:'2'})});
  assert.equal(r.status,'GREEN');
  assert.equal(k.get({context:c,knowledge_id:'k1'}).state,'SUPERSEDED');
  assert.equal(k.resolve({context:c,subject:'ratio'}).item.knowledge_id,'k2');
});

test('conflicting validated knowledge fails closed',()=>{
  const k=new KnowledgeEngineV0();
  k.put({context:c,item:item()});
  k.put({context:c,item:item({knowledge_id:'k2',content:'different',source_ref:'git:rule-2'})});
  const r=k.resolve({context:c,subject:'ratio'});
  assert.deepEqual([r.status,r.reason],['HUMAN_REQUIRED','POLICY_CONFLICT']);
});

test('uncertain knowledge returns LOW_CONFIDENCE and PROD is forbidden',()=>{
  const k=new KnowledgeEngineV0();
  k.put({context:c,item:item({state:'UNCERTAIN',confidence:0.9})});
  assert.equal(k.resolve({context:c,subject:'ratio'}).reason,'LOW_CONFIDENCE');
  assert.throws(()=>k.list({context:{...c,environment:'PROD'}}),/LAB\/PREPROD/);
});
