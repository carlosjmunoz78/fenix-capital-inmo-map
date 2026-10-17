import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildUniversalActivationPlan} from '../runtime/universal-skill-activation-planner-v1.mjs';
import {resolveSemanticContract} from '../runtime/universal-skill-semantic-contracts-v1.mjs';
import {runUniversalSkillBatchOnce,prepareBatchCandidate} from '../runtime/universal-skill-batch-orchestrator-v1.mjs';

const base={company_id:'fenix',inventory_complete:true,dependencies_mapped:true,reuse_checked:true,provenance_license_green:true,additional_cost_eur:0};
function safeAuthority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function candidateForDomain({id,domain,work_class,low_risk=true}){
  return {work_class,low_risk,external_side_effects:false,activation_input:{...base,candidate_id:id,technical_name:`opaque-${id}`,source_refs:[`repo://${id}`],capabilities:[{capability_id:`${id}:cap`,technical_name:'opaque-capability',declared_domains:[domain],domain_evidence:{[domain]:[`manifest:${id}:${domain}`]}}]}};
}
function addExactEvidence(candidate,{physical=true,execution_kind='DECLARATIVE'}={}){
  const plan=buildUniversalActivationPlan(candidate.activation_input);const rows=[];
  for(const cap of plan.capabilities)for(const domain of cap.domains)for(const engine_id of domain.engine_bindings){const contract=resolveSemanticContract({domain_id:domain.domain_id,engine_id});rows.push({...safeAuthority(),capability_id:cap.capability_id,domain_id:domain.domain_id,engine_id,evidence_kind:physical?'PHYSICAL_PREPROD':'NORMALIZED_STATIC_LAB',execution_kind,real_consumption_proven:true,observed_constraints:[...contract.required_constraints],evidence_refs:[`blind-evidence:${candidate.activation_input.candidate_id}:${domain.domain_id}:${engine_id}`],physical_evidence:physical});}
  return {...candidate,candidate_evidence:{semantic_bindings:rows}};
}

test('batch scheduler classifies a small zero-cost candidate into FAST_LANE when eligible',()=>{
  const c=candidateForDomain({id:'blind:fast',domain:'documents-office-pdf',work_class:'EXPRESS',low_risk:true});
  const p=prepareBatchCandidate(c);
  assert.equal(p.scheduling.work_class,'EXPRESS');
  assert.equal(p.scheduling.lane,'FAST_LANE');
});

test('durable batch independently reaches FULL, engineering-required, human-required and blocked-external outcomes',()=>{
  const full=addExactEvidence(candidateForDomain({id:'blind:full-engineering',domain:'software-engineering-devops',work_class:'STANDARD'}));
  const needsEngineering=candidateForDomain({id:'blind:needs-adapter',domain:'knowledge-research-training',work_class:'STANDARD'});
  const lowConfidence={low_risk:true,activation_input:{...base,candidate_id:'blind:unknown',technical_name:'zxq-unknown-capability',description:'unmapped zxq feature',terms:['zxq']}};
  const media=addExactEvidence(candidateForDomain({id:'blind:media',domain:'multimedia-voice-video-design',work_class:'DEEP'}),{physical:false,execution_kind:'EXECUTABLE'});
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'usaf-batch-mixed-'));
  const report=runUniversalSkillBatchOnce({root_dir:root,candidates:[full,needsEngineering,lowConfidence,media],max_jobs:20,source_run_id:456,source_head_sha:'2222222222222222222222222222222222222222',now_ms:1000000});
  assert.equal(report.processed,4);
  const byId=Object.fromEntries(report.results.map((r)=>[r.candidate_id,r]));
  assert.equal(byId['blind:full-engineering'].status,'FULL_SAFE_PREPROD');
  assert.equal(byId['blind:needs-adapter'].status,'ENGINEERING_TASK_REQUIRED');
  assert.equal(byId['blind:unknown'].status,'HUMAN_REQUIRED');
  assert.deepEqual(byId['blind:unknown'].human_required,['LOW_CONFIDENCE']);
  assert.equal(byId['blind:media'].status,'BLOCKED_EXTERNAL');
  assert.equal(report.prod_authorized,false);
  assert.equal(report.trading_access,false);
  assert.equal(report.additional_cost_eur,0);
});

test('one blocked candidate does not stop unrelated candidates',()=>{
  const blocked=candidateForDomain({id:'blind:block-one',domain:'software-engineering-devops'});
  const full=addExactEvidence(candidateForDomain({id:'blind:continue-two',domain:'data-database-supabase'}));
  const report=runUniversalSkillBatchOnce({root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'usaf-batch-independent-')),candidates:[blocked,full],max_jobs:10,now_ms:2000000});
  assert.equal(report.processed,2);
  assert.equal(report.results.find((r)=>r.candidate_id==='blind:block-one').status,'ENGINEERING_TASK_REQUIRED');
  assert.equal(report.results.find((r)=>r.candidate_id==='blind:continue-two').status,'FULL_SAFE_PREPROD');
});

test('same durable batch replay is idempotent and does not execute completed candidate again',()=>{
  const c=addExactEvidence(candidateForDomain({id:'blind:idempotent',domain:'finance-accounting-payments'}));
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'usaf-batch-idempotent-'));
  const first=runUniversalSkillBatchOnce({root_dir:root,candidates:[c],max_jobs:10,now_ms:3000000});
  assert.equal(first.processed,1);
  assert.equal(first.results[0].status,'FULL_SAFE_PREPROD');
  const second=runUniversalSkillBatchOnce({root_dir:root,candidates:[c],max_jobs:10,now_ms:3001000});
  assert.equal(second.processed,0);
  assert.equal(second.status,'NO_WORK');
  assert.equal(second.accepted,1);
});

test('batch output keeps per-candidate lane and no global HUMAN_REQUIRED freeze',()=>{
  const human={activation_input:{...base,candidate_id:'blind:human',technical_name:'opaque',description:'no known mapping'}};
  const full=addExactEvidence(candidateForDomain({id:'blind:growth-full',domain:'seo-search-content'}));
  const report=runUniversalSkillBatchOnce({root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'usaf-batch-human-')),candidates:[human,full],max_jobs:10,now_ms:4000000});
  assert.equal(report.results.find((r)=>r.candidate_id==='blind:human').status,'HUMAN_REQUIRED');
  assert.equal(report.results.find((r)=>r.candidate_id==='blind:growth-full').status,'FULL_SAFE_PREPROD');
  assert.equal(report.results.find((r)=>r.candidate_id==='blind:growth-full').lane,'GROWTH');
});
