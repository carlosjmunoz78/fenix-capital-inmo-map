import test from 'node:test';
import assert from 'node:assert/strict';
import {scopedKnowledge,transferCandidate,validateLocalTransfer,tenantIsolation} from '../runtime/multi-company-learning.mjs';

const transferable=()=>scopedKnowledge({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0',rule_id:'rule-1',scope:'GLOBAL_CANDIDATE',context_signature:'ctx:real-estate-seo',evidence_refs:['evidence:1']});

test('global candidate carries no raw company data or secrets',()=>{
  const k=transferable();
  assert.equal(k.contains_secrets,false);
  assert.equal(k.contains_raw_company_data,false);
  assert.equal(k.prod_authorized,false);
  assert.throws(()=>scopedKnowledge({company_id:'fenix',engine_id:'SEO-001',rule_id:'r',scope:'GLOBAL_CANDIDATE',context_signature:'ctx',evidence_refs:['e'],contains_raw_company_data:true}),/raw company data/);
  assert.throws(()=>scopedKnowledge({company_id:'fenix',engine_id:'SEO-001',rule_id:'r',scope:'GLOBAL_CANDIDATE',context_signature:'ctx',evidence_refs:['e'],contains_secrets:true}),/secrets/);
});

test('cross-company transfer requires global scope exact compatible context and no sensitive material',()=>{
  const source=transferable();
  const ok=transferCandidate({source,target_company_id:'company-b',target_context_signature:'ctx:real-estate-seo',context_compatible:true});
  assert.equal(ok.allowed,true);
  assert.equal(ok.requires_local_validation,true);
  assert.equal(ok.prod_authorized,false);
  assert.equal(transferCandidate({source,target_company_id:'company-b',target_context_signature:'ctx:other',context_compatible:true}).allowed,false);
  assert.equal(transferCandidate({source,target_company_id:'company-b',target_context_signature:'ctx:real-estate-seo',context_compatible:false}).allowed,false);
});

test('transfer cannot become locally accepted without target evidence and validation',()=>{
  const transfer=transferCandidate({source:transferable(),target_company_id:'company-b',target_context_signature:'ctx:real-estate-seo',context_compatible:true});
  assert.equal(validateLocalTransfer({transfer,local_evidence_refs:[],local_validation_passed:true}).accepted,false);
  assert.equal(validateLocalTransfer({transfer,local_evidence_refs:['target:test'],local_validation_passed:false}).accepted,false);
  const accepted=validateLocalTransfer({transfer,local_evidence_refs:['target:test'],local_validation_passed:true});
  assert.equal(accepted.accepted,true);
  assert.equal(accepted.prod_write_authorized,false);
});

test('tenant isolation denies direct cross-company reads',()=>{
  assert.equal(tenantIsolation({request_company_id:'fenix',record_company_id:'fenix'}).allowed,true);
  assert.deepEqual(tenantIsolation({request_company_id:'fenix',record_company_id:'other'}),{allowed:false,reason:'CROSS_COMPANY_DENY'});
});
