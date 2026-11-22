import test from 'node:test';
import assert from 'node:assert/strict';
import {runSeoEditorialMission,compareSeoCandidate,recordMerit,assessReplacement} from '../runtime/seo-workforce-lab-v0.mjs';
const mission={mission_id:'SEO_LAB_001',company_id:'fenix',environment:'LAB',version:'0_1_0',author_actor_id:'SEO_D15_WORKER',reviewer_actor_id:'SEO_D31_QA',judge_actor_id:'SEO_JUDGE_1',budget_eur:0,allow_writes:false,allow_paid_ai:false,sources:['https://fenixcapital.es/'],text:'Calcular mi furura cuota. Reformas y constucción. Un texto para revisar.'};
test('LAB performs useful copy QA with independent reviewer and grounded source digest',()=>{
 const r=runSeoEditorialMission(mission);assert.equal(r.worker.output.length,2);assert.equal(r.reviewer.passed,true);assert.equal(r.verdict.decision,'LAB_FINDINGS_VERIFIED');assert.equal(r.promotion.allowed,false);assert.equal(r.cost.additional_eur,0);assert.equal(r.merit.awarded,false);assert.equal(r.evidence.source_freshness_verified,false);
});
test('rejects self-review and collusion among worker, QA and judge',()=>{
 for(const k of ['reviewer_actor_id','judge_actor_id'])assert.throws(()=>runSeoEditorialMission({...mission,[k]:mission.author_actor_id}),/SELF_REVIEW_DENIED/);
 assert.throws(()=>runSeoEditorialMission({...mission,reviewer_actor_id:mission.judge_actor_id}),/SELF_REVIEW_DENIED/);
});
test('blocks PROD, spending, writes, unsupported provenance and keeps tenant scope',()=>{
 assert.throws(()=>runSeoEditorialMission({...mission,environment:'PROD'}),/ENVIRONMENT_DENIED/);
 assert.throws(()=>runSeoEditorialMission({...mission,budget_eur:1}),/ZERO_COST/);
 assert.throws(()=>runSeoEditorialMission({...mission,allow_writes:true}),/ZERO_COST/);
 assert.throws(()=>runSeoEditorialMission({...mission,sources:[]}),/PROVENANCE_REQUIRED/);
 const a=runSeoEditorialMission(mission),b=runSeoEditorialMission({...mission,company_id:'otherco'});assert.notEqual(a.evidence.company_id,b.evidence.company_id);
});
test('suspicious mortgage claims always require independent human review',()=>{
 const r=runSeoEditorialMission({...mission,text:'Hipoteca garantizada sin requisitos: no se puede publicar.'});assert.equal(r.evidence.risk_flags.length,2);assert.equal(r.verdict.decision,'HUMAN_REVIEW_REQUIRED');assert.equal(r.merit.eligible_for_verified_task_badge,false);
});
test('reuses canonical OLD vs NEW tribunal, detects own judging',()=>{
 const z=compareSeoCandidate({company_id:'fenix',experiment_id:'LAB_C1',old_quality:70,new_quality:80,candidate_actor_id:'SEO_D15_WORKER',judge_actor_id:'JUDGE_A'});assert.equal(z.tribunal.decision,'PASS');assert.equal(z.prod_authorized,false);
 const bad=compareSeoCandidate({company_id:'fenix',experiment_id:'LAB_C2',old_quality:70,new_quality:80,candidate_actor_id:'SEO_D15_WORKER',judge_actor_id:'SEO_D15_WORKER'});assert.equal(bad.tribunal.decision,'FAIL');
});
test('merit for tribunal/supervision requires distinct reviewers and produces no automatic prize',()=>{
 const e=runSeoEditorialMission(mission);
 assert.throws(()=>recordMerit({subject_actor_id:'AA',evaluator_actor_id:'AA',independent_second_actor_id:'BB',evaluator_class:'TRIBUNAL',mission_evidence:e}),/INDEPENDENCE_DENIED/);
 for(const role of ['AGENT','SUBAGENT','DIRECTOR','DEPARTMENT_HEAD','SUPERVISOR','JUDGE','TRIBUNAL','GUARDIAN','META_SUPERVISOR','QA_AGENT']){
  const r=recordMerit({subject_actor_id:'AA',evaluator_actor_id:'BB',independent_second_actor_id:'CC',evaluator_class:role,mission_evidence:e});assert.equal(r.awarded,false);assert.equal(r.autonomy_increased,false);
 }
});
test('replacement cannot occur without shadow, rollback, independence and equal permissions',()=>{
 const old_new=compareSeoCandidate({company_id:'fenix',experiment_id:'LAB_C3',old_quality:70,new_quality:80,candidate_actor_id:'NEW',judge_actor_id:'JUDGE'});
 assert.equal(assessReplacement({old_actor_id:'OLD',new_actor_id:'NEW',independent_judge_id:'JUDGE',old_new}).state,'BLOCKED');
 const ok=assessReplacement({old_actor_id:'OLD',new_actor_id:'NEW',independent_judge_id:'JUDGE',old_new,shadow_passed:true,rollback_tested:true,identical_permissions:true});assert.equal(ok.state,'LAB_CANDIDATE_ELIGIBLE_FOR_CANARY');assert.equal(ok.automatically_replaced,false);
});
