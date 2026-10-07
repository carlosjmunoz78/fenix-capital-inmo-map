import test from 'node:test';
import assert from 'node:assert/strict';
import {CEREBRO_GITHUB_WRAPPER,getGitHubWrapperProfile,renderGitHubWrapperPromptContract,applyGitHubCerebroWrapper} from '../skills/skill-cerebro-github-wrapper.mjs';
import {assessGitHubNormalizedWrapperAdmission} from '../skills/skill-github-normalized-wrapper-admission.mjs';
import {buildGitHubOldVsNew} from '../skills/skill-github-old-vs-new.mjs';
import {runGitHubTribunal} from '../skills/skill-github-tribunal.mjs';
import {assessGitHubPromotionReadiness} from '../skills/skill-github-promotion-readiness.mjs';

const candidateId='lobehub-skills:test-github';
const fixtures={repo:{fixture_id:'repo-understanding',expected_constraints:['NO_WRITE','EVIDENCE_REQUIRED','NO_PROD_MUTATION']},ci:{fixture_id:'ci-diagnosis',expected_constraints:['NO_WRITE','ROOT_CAUSE_BEFORE_FIX','ROLLBACK_REQUIRED']},pr:{fixture_id:'safe-pr-plan',expected_constraints:['NO_MERGE','TESTS_REQUIRED','HUMAN_REQUIRED_HIGH_RISK']}};
const staticLab={results:[{candidate_id:candidateId,declared_name:'github',domain:'software-engineering-devops',upstream_full_name:'openclaw/openclaw',upstream_head_commit:'abc',manifest_path:'skills/github/SKILL.md',manifest_sha256:'1'.repeat(64),status:'STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL',coverage_score:100,policy_alignment_score:95,hard_blocks:[]}]};
const wrappers={plans:[{candidate_id:candidateId,enabled:false,execution_authorized:false,install_authorized:false,prod_authorized:false,new_engine_id:false,owner_engine_id:'FACT-001',next_gate:'BUILD_NORMALIZED_INSTRUCTION_WRAPPER_IN_LAB_WITHOUT_EXTERNAL_EXECUTION',engine_bindings:['FACT-001','QA-001'],permissions:{network:false,filesystem_read:false,filesystem_write:false,credentials:false,external_actions:false,prod_write:false,trading_access:false},economics:{additional_cost_target_eur:0,paid_service_required:false},provenance:{upstream_full_name:'openclaw/openclaw',upstream_head_commit:'abc',manifest_path:'skills/github/SKILL.md',manifest_sha256:'1'.repeat(64)}}]};

test('GitHub wrapper is zero-cost fail-closed and has exact fixture contracts',()=>{
  assert.equal(CEREBRO_GITHUB_WRAPPER.additional_cost_eur,0);assert.equal(CEREBRO_GITHUB_WRAPPER.external_skill_code_execution,false);assert.equal(CEREBRO_GITHUB_WRAPPER.prod_authorized,false);assert.equal(CEREBRO_GITHUB_WRAPPER.trading_access,false);
  for(const f of Object.values(fixtures)){const p=getGitHubWrapperProfile(f);assert.equal(p.contract_exact,true);assert.ok(renderGitHubWrapperPromptContract(f).includes('CEREBRO_WRAPPER_CONTRACT'));}
});

test('safe PR wrapper fails closed on null HIGH_RISK exception and discards advisory',()=>{
  const raw=JSON.stringify({answer:'merge now',constraint_decisions:{},proposed_actions:[],evidence_needed:[],human_required:null,confidence:1});
  const wrapped=applyGitHubCerebroWrapper({rawOutput:raw,fixture:fixtures.pr,domain:'software-engineering-devops',arm:'CANDIDATE_SKILL_PROXY',upstreamFullName:'openclaw/openclaw'});
  assert.equal(wrapped.applied,true);assert.equal(wrapped.policy_conflict,true);assert.equal(wrapped.upstream_guidance_discarded,true);assert.match(wrapped.text,/HUMAN_REQUIRED=HIGH_RISK/);assert.doesNotMatch(wrapped.text,/"human_required":null/);
});

test('normalized admission preserves raw GREEN 95 evidence without relaxing thresholds',()=>{
  const a=assessGitHubNormalizedWrapperAdmission(staticLab,wrappers,{observedAt:'2026-10-07T00:00:00Z'});const x=a.results[0];
  assert.equal(x.status,'NORMALIZED_WRAPPER_GREEN_FOR_BEHAVIORAL_EVAL');assert.equal(x.raw_static_status,'STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL');assert.equal(x.raw_policy_alignment_score,95);assert.equal(x.raw_status_preserved,true);assert.equal(x.normalized_policy_alignment_score,100);assert.equal(a.thresholds_relaxed,false);assert.equal(a.raw_static_results_mutated,false);
});

test('GitHub OLD vs NEW is exactly one normalized package and never authorizes execution',()=>{
  const a=assessGitHubNormalizedWrapperAdmission(staticLab,wrappers);const generic={packages:[{package_id:'old',candidate_id:candidateId,domain:'software-engineering-devops',baseline:{type:'CURRENT_CEREBRO_CAPABILITY',engine_bindings:['FACT-001']},candidate:{type:'DISABLED_SKILL_WRAPPER',wrapper_id:'oldwrap',upstream_full_name:'openclaw/openclaw',upstream_head_commit:'abc',manifest_sha256:'1'.repeat(64)},fixtures:[fixtures.repo,fixtures.ci,fixtures.pr],current_evidence:{},external_skill_execution_authorized:false,baseline_execution_authorized:false,candidate_execution_authorized:false,prod_authorized:false,promotion_authorized:false}]};
  const o=buildGitHubOldVsNew(a,generic,{createdAt:'2026-10-07T00:00:00Z'});assert.equal(o.packages_total,1);assert.equal(o.packages[0].admission_basis,'NORMALIZED_CEREBRO_WRAPPER');assert.equal(o.packages[0].candidate.wrapper_id,CEREBRO_GITHUB_WRAPPER.wrapper_id);assert.equal(o.packages[0].fixtures.length,3);assert.equal(o.prod_authorized,false);
});

test('tribunal and promotion require complete green evidence but never authorize PROD',()=>{
  const a=assessGitHubNormalizedWrapperAdmission(staticLab,wrappers);const license={results:[{candidate_id:candidateId,status:'EXACT_LICENSE_FILE_EVIDENCE',metadata_matches_detected:true,detected_families:['MIT']}]};const behavior={status:'PROXY_COMPLETE',calls_executed:6,results:[{candidate_id:candidateId,status:'PROXY_COMPLETE'}]};const judge={green:true,decision:'GREEN_FOR_TRIBUNAL_REVIEW',packages:[{candidate_id:candidateId,decision:'GREEN'}]};const rollback={ready:true,status:'GREEN_ROLLBACK_REBUILD_PROOF',plans:[{candidate_id:candidateId,ready:true,decision:'GREEN'}]};const route={status:'READY_ZERO_COST_ROUTE'};const rsi={bridge_status:'SHADOW_BRIDGE_GREEN'};
  const t=runGitHubTribunal({normalizedAdmission:a,licenses:license,behavioralResults:behavior,independentJudge:judge,rollback,routeAudit:route,rsiShadow:rsi});assert.equal(t.decision,'GREEN');assert.equal(t.prod_authorized,false);
  const p=assessGitHubPromotionReadiness({normalizedAdmission:a,oldVsNew:{packages_total:1},routeAudit:route,quotaPlan:{executable:true,planned_calls:{total:6},limits:{max_model_calls:6}},behavioralGate:{allowed:true},rsiShadow:rsi,behavioralResults:behavior,independentJudge:judge,tribunal:t,rollback});assert.equal(p.status,'READY_FOR_PREPROD_PROMOTION_REVIEW');assert.equal(p.human_required,'HIGH_RISK');assert.equal(p.merge_authorized,false);assert.equal(p.prod_authorized,false);
});
