import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeKnowledgeUpdate,evaluateKnowledgeUpdatePromotion,UPD001_CONTRACT} from '../knowledge/knowledge-update-runtime.mjs';

const context={company_id:'fenix',engine_id:'UPD-001',environment:'PREPROD',version:'0.1.0'};
const base={context,source_knowledge_ref:'KNW:k1',research_dossier_ref:'RSH:d1',provenance_refs:['PRV:p1','PRV:p2'],confidence:0.92,proposed_value:{answer:'new'},rollback_ref:'KNW:k1@v1'};

test('UPD-001 contract stays proposal-only and zero-cost',()=>{
  assert.equal(UPD001_CONTRACT.direct_knowledge_write,false);
  assert.equal(UPD001_CONTRACT.direct_rule_write,false);
  assert.equal(UPD001_CONTRACT.prod_write,false);
  assert.equal(UPD001_CONTRACT.trading_access,false);
  assert.equal(UPD001_CONTRACT.additional_cost_target_eur,0);
});

test('creates deterministic update proposal without executing write',()=>{
  const a=proposeKnowledgeUpdate(base); const b=proposeKnowledgeUpdate(base);
  assert.equal(a.status,'UPDATE_PROPOSAL_READY');
  assert.equal(a.ready,true);
  assert.equal(a.knowledge_write,false);
  assert.equal(a.proposal_hash,b.proposal_hash);
  assert.match(a.proposal_hash,/^[a-f0-9]{64}$/);
});

test('low confidence and validated contradiction fail closed',()=>{
  assert.equal(proposeKnowledgeUpdate({...base,confidence:0.79}).reason,'LOW_CONFIDENCE');
  assert.equal(proposeKnowledgeUpdate({...base,contradicts_validated_knowledge:true}).reason,'POLICY_CONFLICT');
});

test('trading and PROD writes are blocked',()=>{
  assert.equal(proposeKnowledgeUpdate({...base,trading_access:true}).reason,'POLICY_CONFLICT');
  assert.equal(proposeKnowledgeUpdate({...base,prod_write:true}).reason,'HIGH_RISK');
  assert.throws(()=>proposeKnowledgeUpdate({...base,context:{...context,environment:'PROD'}}),/LAB\/PREPROD/);
});

test('promotion requires KNW, provenance, policy, rollback and PREPROD gates',()=>{
  const blocked=evaluateKnowledgeUpdatePromotion(base);
  assert.equal(blocked.status,'BLOCKED');
  assert.equal(blocked.missing.length,5);
  const ok=evaluateKnowledgeUpdatePromotion({...base,knw_reviewed:true,prv_verified:true,policy_passed:true,rollback_verified:true,preprod_passed:true});
  assert.equal(ok.status,'KNOWLEDGE_UPDATE_APPROVED_FOR_KNW');
  assert.equal(ok.target_engine,'KNW-001');
  assert.equal(ok.executed,false);
  assert.equal(ok.knowledge_write,false);
});

test('provenance, research dossier and rollback reference are mandatory',()=>{
  assert.throws(()=>proposeKnowledgeUpdate({...base,provenance_refs:[]}),/non-empty/);
  assert.throws(()=>proposeKnowledgeUpdate({...base,research_dossier_ref:''}),/required/);
  assert.throws(()=>proposeKnowledgeUpdate({...base,rollback_ref:''}),/required/);
});
