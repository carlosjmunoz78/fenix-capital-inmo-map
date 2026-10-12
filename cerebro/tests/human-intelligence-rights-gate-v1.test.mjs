import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSourceRights,canEnterKnowledgeFoundry} from '../human-intelligence/knowledge/rights-gate.mjs';

function source(rights_status,overrides={}){
  return {
    source_id:`src-${rights_status.toLowerCase()}`,
    rights_status,
    provenance_ref:`https://example.test/${rights_status.toLowerCase()}`,
    license:null,
    ...overrides
  };
}

test('FULLTEXT_ALLOWED still does not imply training rights',()=>{
  const noTraining=evaluateSourceRights(source('FULLTEXT_ALLOWED',{license:'example'}));
  assert.equal(noTraining.fulltext_ingestion_allowed,true);
  assert.equal(noTraining.training_use_allowed,false);
  assert.equal(noTraining.decision,'ALLOW_FULLTEXT_NOT_TRAINING');

  const explicit=evaluateSourceRights(source('FULLTEXT_ALLOWED',{license:'example',training_use_explicitly_allowed:true}));
  assert.equal(explicit.fulltext_ingestion_allowed,true);
  assert.equal(explicit.training_use_allowed,true);
  assert.equal(explicit.decision,'ALLOW_WITH_SCOPE');
});

test('REFERENCE_ONLY permits discovery metadata but blocks full-text ingestion',()=>{
  const result=canEnterKnowledgeFoundry(source('REFERENCE_ONLY'));
  assert.equal(result.discovery_reference,true);
  assert.equal(result.extract_fulltext,false);
  assert.equal(result.training_use,false);
  assert.equal(result.hold,false);
  assert.equal(result.prod_authorized,false);
  assert.equal(result.additional_cost_eur,0);
});

test('CONDITIONAL and UNKNOWN fail closed pending rights resolution',()=>{
  for(const status of ['CONDITIONAL','UNKNOWN']){
    const result=canEnterKnowledgeFoundry(source(status));
    assert.equal(result.extract_fulltext,false);
    assert.equal(result.training_use,false);
    assert.equal(result.hold,true);
  }
});

test('BLOCKED cannot enter extraction or training',()=>{
  const result=canEnterKnowledgeFoundry(source('BLOCKED'));
  assert.equal(result.discovery_reference,false);
  assert.equal(result.extract_fulltext,false);
  assert.equal(result.training_use,false);
  assert.equal(result.hold,true);
  assert.equal(result.decision,'BLOCK');
});

test('Rights gate rejects unknown status and malformed sources',()=>{
  assert.throws(()=>evaluateSourceRights(source('FREE')),/invalid rights_status/);
  assert.throws(()=>evaluateSourceRights(null),/source object required/);
  assert.throws(()=>evaluateSourceRights({rights_status:'UNKNOWN',provenance_ref:'x'}),/source_id required/);
});
