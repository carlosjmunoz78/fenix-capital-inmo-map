import test from 'node:test';
import assert from 'node:assert/strict';
import {buildUniversalActivationPlan} from '../runtime/universal-skill-activation-planner-v1.mjs';
import {resolveSemanticContract} from '../runtime/universal-skill-semantic-contracts-v1.mjs';
import {decideAutomaticAdapter,createAutomaticAdapterResolver,adapterFactorySummary} from '../runtime/universal-skill-adapter-factory-v1.mjs';

const base={company_id:'fenix',inventory_complete:true,dependencies_mapped:true,reuse_checked:true,provenance_license_green:true,additional_cost_eur:0};
function plan(domain='software-engineering-devops'){
  return buildUniversalActivationPlan({...base,candidate_id:`blind:${domain}`,technical_name:'opaque-capability',source_refs:['repo://blind/source'],capabilities:[{capability_id:`blind:${domain}:cap`,technical_name:'opaque',declared_domains:[domain],domain_evidence:{[domain]:['manifest:declared-capability']}}]});
}
function safeEvidence(extra={}){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0,...extra};}

test('missing semantic evidence does not fabricate observed constraints from contract',()=>{
  const p=plan();const cap=p.capabilities[0],domain=cap.domains[0],engine_id=domain.engine_bindings[0];const contract=resolveSemanticContract({domain_id:domain.domain_id,engine_id});
  const d=decideAutomaticAdapter({activation_plan:p,capability:cap,domain_id:domain.domain_id,engine_id,contract,candidate_evidence:{semantic_bindings:[]}});
  assert.equal(d.status,'ENGINEERING_TASK_REQUIRED');
  assert.equal(d.adapter,null);
  assert.ok(d.blockers.includes('semantic_adapter_evidence_missing'));
  assert.equal(d.engineering_task.status,'FACT_ENGINEERING_READY');
});

test('partial evidence cannot be upgraded by echoing contract requirements',()=>{
  const p=plan();const cap=p.capabilities[0],domain=cap.domains[0],engine_id=domain.engine_bindings[0];const contract=resolveSemanticContract({domain_id:domain.domain_id,engine_id});
  const row=safeEvidence({capability_id:cap.capability_id,domain_id:domain.domain_id,engine_id,evidence_kind:'NORMALIZED_STATIC_LAB',execution_kind:'DECLARATIVE',real_consumption_proven:true,observed_constraints:contract.required_constraints.slice(0,-1),evidence_refs:['artifact:static-lab:123']});
  const d=decideAutomaticAdapter({activation_plan:p,capability:cap,domain_id:domain.domain_id,engine_id,contract,candidate_evidence:{semantic_bindings:[row]}});
  assert.equal(d.status,'ENGINEERING_TASK_REQUIRED');
  assert.equal(d.adapter,null);
});

test('exact evidence-grounded declarative capability becomes internal adapter and probe replays only evidence',()=>{
  const p=plan();const cap=p.capabilities[0],domain=cap.domains[0],engine_id=domain.engine_bindings[0];const contract=resolveSemanticContract({domain_id:domain.domain_id,engine_id});
  const observed=[...contract.required_constraints];
  const row=safeEvidence({capability_id:cap.capability_id,domain_id:domain.domain_id,engine_id,evidence_kind:'NORMALIZED_STATIC_LAB',execution_kind:'DECLARATIVE',real_consumption_proven:true,observed_constraints:observed,evidence_refs:['artifact:blind-eval:abc']});
  const d=decideAutomaticAdapter({activation_plan:p,capability:cap,domain_id:domain.domain_id,engine_id,contract,candidate_evidence:{semantic_bindings:[row]}});
  assert.equal(d.status,'ADAPTER_READY');
  assert.equal(d.decision,'GENERATE_DECLARATIVE_ADAPTER');
  assert.notEqual(d.adapter,null);
  const probe=d.adapter.probe();
  assert.deepEqual([...probe.observed_constraints].sort(),[...observed].sort());
  assert.deepEqual([...probe.evidence_refs],['artifact:blind-eval:abc']);
  assert.equal(probe.real_consumption,true);
  assert.equal(probe.external_skill_code_execution,false);
});

test('unsafe or unsupported evidence kind cannot manufacture an adapter',()=>{
  const p=plan();const cap=p.capabilities[0],domain=cap.domains[0],engine_id=domain.engine_bindings[0];const contract=resolveSemanticContract({domain_id:domain.domain_id,engine_id});
  const row=safeEvidence({capability_id:cap.capability_id,domain_id:domain.domain_id,engine_id,evidence_kind:'UNTRUSTED_WEB_TEXT',execution_kind:'DECLARATIVE',real_consumption_proven:true,observed_constraints:[...contract.required_constraints],evidence_refs:['web:unknown']});
  const d=decideAutomaticAdapter({activation_plan:p,capability:cap,domain_id:domain.domain_id,engine_id,contract,candidate_evidence:{semantic_bindings:[row]}});
  assert.equal(d.status,'ENGINEERING_TASK_REQUIRED');
});

test('media runtime contract requires physical PREPROD evidence',()=>{
  const p=plan('multimedia-voice-video-design');const cap=p.capabilities[0],domain=cap.domains[0],engine_id=domain.engine_bindings[0];const contract=resolveSemanticContract({domain_id:domain.domain_id,engine_id});
  const row=safeEvidence({capability_id:cap.capability_id,domain_id:domain.domain_id,engine_id,evidence_kind:'NORMALIZED_STATIC_LAB',execution_kind:'EXECUTABLE',real_consumption_proven:true,observed_constraints:[...contract.required_constraints],evidence_refs:['artifact:media-static'],physical_evidence:false});
  const d=decideAutomaticAdapter({activation_plan:p,capability:cap,domain_id:domain.domain_id,engine_id,contract,candidate_evidence:{semantic_bindings:[row]}});
  assert.equal(d.status,'BLOCKED_EXTERNAL');
  assert.equal(d.decision,'PHYSICAL_EVIDENCE_REQUIRED');
  assert.equal(d.adapter,null);
});

test('governed existing adapter is reused before generation',()=>{
  const p=plan();const cap=p.capabilities[0],domain=cap.domains[0],engine_id=domain.engine_bindings[0];const contract=resolveSemanticContract({domain_id:domain.domain_id,engine_id});
  const existing={execution_authority:'INTERNAL_PREPROD_PROBE',profile:{adapter_id:'existing:one',contract_exact:true,required_constraints:[...contract.required_constraints],prod_authorized:false,prod_write_authorized:false,external_skill_code_execution:false,trading_access:false,additional_cost_eur:0},probe:()=>safeEvidence({status:'PASS',real_consumption:true,observed_constraints:[...contract.required_constraints],evidence_refs:['existing:evidence'],physical_evidence:true})};
  const d=decideAutomaticAdapter({activation_plan:p,capability:cap,domain_id:domain.domain_id,engine_id,contract,candidate_evidence:{semantic_bindings:[]},existing_adapters:{[`${cap.capability_id}:${domain.domain_id}:${engine_id}`]:existing}});
  assert.equal(d.status,'ADAPTER_READY');
  assert.equal(d.decision,'REUSE_EXISTING_ADAPTER');
  assert.equal(d.adapter_id,'existing:one');
});

test('resolver accumulates independent decisions and summary exposes unresolved work',()=>{
  const p=plan();
  const f=createAutomaticAdapterResolver({activation_plan:p,candidate_evidence:{semantic_bindings:[]}});
  for(const cap of p.capabilities)for(const domain of cap.domains)for(const engine_id of domain.engine_bindings){const contract=resolveSemanticContract({domain_id:domain.domain_id,engine_id});f.resolver({capability:cap,domain_id:domain.domain_id,engine_id,contract});}
  const s=adapterFactorySummary(f.getDecisions());
  assert.equal(s.status,'ENGINEERING_TASK_REQUIRED');
  assert.equal(s.counts.ENGINEERING_TASK_REQUIRED,p.binding_count);
  assert.equal(s.additional_cost_eur,0);
});
