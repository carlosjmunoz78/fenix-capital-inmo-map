import test from 'node:test';
import assert from 'node:assert/strict';
import {runAgentBrowserTribunal} from '../skills/skill-agent-browser-tribunal.mjs';
import {assessAgentBrowserPromotionReadiness} from '../skills/skill-agent-browser-promotion-readiness.mjs';

const candidateId='browser-candidate';
const admission={results:[{candidate_id:candidateId,domain:'browser-automation-scraping',wrapper_id:'skillwrap:cerebro-agent-browser-v0.1.0',status:'NORMALIZED_WRAPPER_GREEN_FOR_BEHAVIORAL_EVAL',raw_static_status:'STATIC_LAB_HOLD',raw_status_preserved:true,raw_policy_alignment_score:75,raw_coverage_score:88.89,raw_hard_blocks:[],normalized_policy_alignment_score:100,fixture_contracts:[{contract_exact:true},{contract_exact:true},{contract_exact:true}],additional_cost_eur:0,external_skill_code_executed:false,prod_authorized:false,trading_access:false}]};
const licenses={results:[{candidate_id:candidateId,status:'EXACT_LICENSE_FILE_EVIDENCE',metadata_matches_detected:true,detected_families:['Apache-2.0']}]};
const behavioral={status:'PROXY_COMPLETE',calls_executed:6,results:[{candidate_id:candidateId,status:'PROXY_COMPLETE'}]};
const judge={green:true,decision:'GREEN_FOR_TRIBUNAL_REVIEW',packages:[{candidate_id:candidateId,decision:'GREEN'}]};
const rollback={ready:true,status:'GREEN_ROLLBACK_REBUILD_PROOF',plans:[{candidate_id:candidateId,ready:true,decision:'GREEN'}]};
const route={status:'READY_ZERO_COST_ROUTE'};
const rsi={bridge_status:'SHADOW_BRIDGE_GREEN'};

test('normalized agent-browser tribunal can be GREEN while raw HOLD remains preserved',()=>{
  const tribunal=runAgentBrowserTribunal({normalizedAdmission:admission,licenses,behavioralResults:behavioral,independentJudge:judge,rollback,routeAudit:route,rsiShadow:rsi});
  assert.equal(tribunal.decision,'GREEN');
  assert.equal(tribunal.green,true);
  assert.equal(tribunal.raw_static_thresholds_relaxed,false);
  assert.equal(tribunal.raw_static_results_mutated,false);
  assert.equal(tribunal.candidates[0].evidence.raw_static_status,'STATIC_LAB_HOLD');
  assert.equal(tribunal.prod_authorized,false);
});

test('tribunal blocks any raw hard security block even when normalized admission claims green',()=>{
  const unsafe=structuredClone(admission);unsafe.results[0].raw_hard_blocks=['ANTI_DETECT'];
  const tribunal=runAgentBrowserTribunal({normalizedAdmission:unsafe,licenses,behavioralResults:behavioral,independentJudge:judge,rollback,routeAudit:route,rsiShadow:rsi});
  assert.equal(tribunal.decision,'NOT_READY');
  assert.ok(tribunal.candidates[0].blockers.includes('RAW_STATIC_SECURITY_HARD_BLOCK'));
});

test('PREPROD readiness requires exact six-call quota and returns HIGH_RISK without merge or PROD authorization',()=>{
  const tribunal=runAgentBrowserTribunal({normalizedAdmission:admission,licenses,behavioralResults:behavioral,independentJudge:judge,rollback,routeAudit:route,rsiShadow:rsi});
  const report=assessAgentBrowserPromotionReadiness({normalizedAdmission:admission,oldVsNew:{packages_total:1,packages:[{}]},routeAudit:route,quotaPlan:{executable:true,planned_calls:{total:6},limits:{max_model_calls:6}},behavioralGate:{allowed:true},rsiShadow:rsi,behavioralResults:behavioral,independentJudge:judge,tribunal,rollback});
  assert.equal(report.status,'READY_FOR_PREPROD_PROMOTION_REVIEW');
  assert.equal(report.human_required,'HIGH_RISK');
  assert.equal(report.merge_authorized,false);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.autonomous_promotion_authorized,false);
});

test('PREPROD readiness fails closed when call cap is wider than six',()=>{
  const tribunal=runAgentBrowserTribunal({normalizedAdmission:admission,licenses,behavioralResults:behavioral,independentJudge:judge,rollback,routeAudit:route,rsiShadow:rsi});
  const report=assessAgentBrowserPromotionReadiness({normalizedAdmission:admission,oldVsNew:{packages_total:1,packages:[{}]},routeAudit:route,quotaPlan:{executable:true,planned_calls:{total:6},limits:{max_model_calls:12}},behavioralGate:{allowed:true},rsiShadow:rsi,behavioralResults:behavioral,independentJudge:judge,tribunal,rollback});
  assert.equal(report.status,'NOT_READY');
  assert.ok(report.blockers.includes('HARD_SIX_CALL_QUOTA_NOT_PROVEN'));
});
