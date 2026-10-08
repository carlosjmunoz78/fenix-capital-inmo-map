import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLearningRecord} from '../runtime/continuous-improvement-contract.mjs';
import {observeOutcome,createEvidence,proposeCandidate} from '../runtime/learning-pipeline.mjs';
import {defineExperiment,recordArmResult,compareArms} from '../runtime/experiment-pipeline.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from '../runtime/evaluation-tribunal.mjs';
import {createPromotionPlan,advancePromotion} from '../runtime/promotion-pipeline.mjs';
import {createMetaCandidate,metaGate} from '../runtime/meta-learning.mjs';
import {scopedKnowledge,transferCandidate,validateLocalTransfer} from '../runtime/multi-company-learning.mjs';
import {detectRepeatedFailurePattern,proposeFactoryVnext} from '../runtime/factory-supervisor-improvement.mjs';
import {assessKnowledge} from '../runtime/knowledge-obsolescence.mjs';
import {cycleTelemetryEnvelope,externalChangeGate} from '../runtime/rsi-observability-adapter.mjs';
import {buildContinuityState,minimalResumePlan} from '../runtime/continuity-handoff.mjs';

const ctx={company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0'};
const event={...ctx,event_id:'evt:e2e',occurred_at:'2026-10-08T12:00:00Z',source_type:'OUTCOME',evidence_refs:['run:e2e']};

test('RSI recovery E2E can learn evaluate and reach CANARY evidence without any PROD authority',()=>{
  const outcome=observeOutcome({event,expected:70,actual:82,observed_at:'2026-10-08T12:01:00Z'});
  const evidence=createEvidence({outcome,refs:['metric:seo-quality'],confidence:0.92,provenance:{source:'preprod-e2e'}});
  const learning=proposeCandidate({event,outcome,evidence,hypothesis:'candidate may improve SEO quality',expected_metric_delta:{metric:'score',direction:'HIGHER'},risk_class:'LOW',created_by:'LRN-001'});
  assert.equal(validateLearningRecord(learning).ok,true);
  assert.equal(learning.prod_authorized,false);

  const experiment=defineExperiment({...ctx,hypothesis:learning.hypothesis,baseline_version:'seo-old',candidate_version:'seo-new',metrics:['score'],dataset_kind:'HOLDOUT'});
  const oldResult=recordArmResult({...ctx,experiment_id:experiment.experiment_id,arm:'OLD',metrics:{score:70},evidence_refs:['old:holdout']});
  const newResult=recordArmResult({...ctx,experiment_id:experiment.experiment_id,arm:'NEW',metrics:{score:84},evidence_refs:['new:holdout']});
  assert.equal(compareArms({old_result:oldResult,new_result:newResult,metric:'score'}).better,true);

  const benchmark=defineBenchmark({...ctx,benchmark_id:'seo-quality',benchmark_version:'v1',metric:'score',holdout_ref:'holdout:secret'});
  const evaluation=evaluateOldNew({benchmark,old_result:oldResult,new_result:newResult});
  const judge=tribunalDecision({evaluation,judge_id:'JDG-001',candidate_actor_id:'LRN-001',real_outcome_delta:12});
  assert.equal(judge.decision,'PASS');

  const promotion=createPromotionPlan({...ctx,baseline_version:'seo-old',candidate_version:'seo-new',judge_decision:'PASS',tribunal_decision:'PASS',rollback_ref:'rollback:seo',rebuild_ref:'rebuild:seo',post_metrics:{score:{min:80}},canary_percent:5});
  const shadow=advancePromotion(promotion,{shadow_pass:true});
  const canary=advancePromotion(shadow,{canary_pass:true});
  assert.equal(canary.state,'CANARY');
  assert.equal(canary.next_gate,'CURRENT_PROMOTION_AUTHORITY_REQUIRED');
  assert.equal(canary.prod_authorized,false);
  assert.equal(canary.prod_write_authorized,false);

  const external=externalChangeGate({auditable:true,reversible:true,policy_pass:true,security_pass:true,preprod_evidence:true});
  assert.equal(external.allowed,true);
  assert.equal(external.prod_write_authorized,false);
});

test('meta learning transfer factory knowledge telemetry and continuity remain isolated and non-PROD',()=>{
  const meta=createMetaCandidate({company_id:'fenix',engine_id:'LRN-001',environment:'LAB',version:'0.1.0',target_stage:'learn',prior_strategy_version:'v1',candidate_strategy_version:'v2',dataset_scope:'synthetic-holdout',metric_definition:{name:'yield'},leakage_checks:['holdout'],anti_gaming_checks:['real-outcome'],proposed_change:{kind:'threshold'}});
  assert.equal(metaGate({candidate:meta,independent_evaluation:true,independent_judge:true,rollback_ready:true,rebuild_ready:true}).ok,true);

  const globalKnowledge=scopedKnowledge({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0',rule_id:'seo-rule',scope:'GLOBAL_CANDIDATE',context_signature:'ctx:real-estate-seo',evidence_refs:['e:1']});
  const transfer=transferCandidate({source:globalKnowledge,target_company_id:'company-b',target_context_signature:'ctx:real-estate-seo',context_compatible:true});
  assert.equal(validateLocalTransfer({transfer,local_evidence_refs:['target:evidence'],local_validation_passed:true}).accepted,true);

  const pattern=detectRepeatedFailurePattern({company_id:'fenix',environment:'LAB',version:'0.1.0',error_class:'SCHEMA_DRIFT',engine_ids:['SEO-001','LOCAL-SEO-001'],occurrences:3,evidence_refs:['e:a','e:b']});
  const factory=proposeFactoryVnext({pattern,current_scaffold_version:'1',candidate_scaffold_version:'2',new_contract_test:'schema-v2',fixture_engine_ids:['SEO-001'],rollback_ref:'rb:factory',rebuild_ref:'rebuild:factory'});
  assert.equal(factory.mutate_existing_engines,false);
  assert.equal(factory.prod_authorized,false);

  const knowledge=assessKnowledge({company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0',knowledge_ref:'seo:k1',confidence:0.9,age_ms:100,ttl_ms:1000,evidence_refs:['e:k1']});
  assert.equal(knowledge.delete_original,false);

  const telemetry=cycleTelemetryEnvelope({company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.1.0',cycle_id:'cycle:e2e',started_at:'2026-10-08T12:00:00Z',ended_at:'2026-10-08T12:02:00Z',cost_eur:0,candidates:2,useful_improvements:1,attempts:1});
  assert.equal(telemetry.finops_input.cost_eur,0);
  assert.equal(telemetry.persistent_write_authorized,false);

  const head='0123456789abcdef0123456789abcdef01234567';
  const continuity=buildContinuityState({repository:'carlosjmunoz78/fenix-capital-inmo-map',branch:'recovery-fixture',head,pr:{number:502,state:'open',draft:true},runs:[{id:1,status:'completed',conclusion:'success'}],blocks:{NEXT:{state:'PLANNED'}},next_block:'NEXT',live_verification_targets:['HEAD','PR','CI']});
  assert.equal(minimalResumePlan(continuity,head).action,'RESUME_NEXT_BLOCK');
  assert.equal(continuity.prod_authorized,false);
});
