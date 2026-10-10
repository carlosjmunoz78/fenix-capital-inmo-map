import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAutonomousRemediationState} from '../qa/autonomous-remediation-loop.mjs';

function baseQuality(issue){
  return {
    company_id:'fenix',updated_at:'2026-10-11T01:00:00Z',
    issues:issue?[issue]:[]
  };
}

test('normal QA bug becomes a versioned PREPROD candidate with permanent regression gate',()=>{
  const state=buildAutonomousRemediationState({
    quality:baseQuality({fingerprint:'abc123',severity:'MEDIUM',kind:'WEB',title:'[WEB] responsive regression',owner_engine:'WEB-001',evidence:['overflow']}),
    improvements:{updated_at:'2026-10-11T01:00:00Z',candidates:[]},
    now:'2026-10-11T01:00:01Z'
  });
  assert.equal(state.status,'ROUTED_AUTONOMOUSLY_TO_PREPROD');
  assert.equal(state.bug_cases,1);
  assert.equal(state.candidate_packages_total,1);
  assert.equal(state.cases[0].repair_mode,'VERSIONED_PREPROD_CANDIDATE');
  assert.equal(state.cases[0].gates.regression_test_required,true);
  assert.equal(state.cases[0].gates.old_vs_new_required,true);
  assert.equal(state.cases[0].promotion_authorized,false);
  assert.equal(state.candidate_packages[0].next_gate,'OLD_VS_NEW_EXPERIMENT');
  assert.equal(state.candidate_packages[0].prod_write_authorized,false);
  assert.equal(state.safety.additional_subscription_eur,0);
});

test('security-like finding fails closed with canonical HUMAN_REQUIRED and no autonomous candidate',()=>{
  const state=buildAutonomousRemediationState({
    quality:baseQuality({fingerprint:'sec123',severity:'HIGH',kind:'APP',title:'access_token leak in console',owner_engine:'APP-001',evidence:['credential exposure']}),
    improvements:{updated_at:'2026-10-11T01:00:00Z',candidates:[]},
    now:'2026-10-11T01:00:01Z'
  });
  assert.equal(state.status,'ROUTED_WITH_HUMAN_HOLDS');
  assert.equal(state.human_required.length,1);
  assert.equal(state.human_required[0].reason,'SECURITY_INCIDENT');
  assert.equal(state.candidate_packages_total,0);
  assert.equal(state.cases[0].repair_mode,'HOLD');
  assert.equal(state.authority.prod_write_authorized,false);
});

test('measured improvement is converted through the existing RSI candidate contract',()=>{
  const state=buildAutonomousRemediationState({
    quality:baseQuality(null),
    improvements:{updated_at:'2026-10-11T01:00:00Z',candidates:[{
      improvement_id:'qa-imp:improve1',company_id:'fenix',engine_id:'HCI-001',version:'0.1.0',
      title:'small touch targets',hypothesis:'larger targets reduce missed taps',confidence:0.8,risk_class:'LOW',
      expected_metric_delta:{name:'small_touch_target_count',direction:'LOWER',measurement:'CONTROLLED_OLD_VS_NEW'}
    }]},
    now:'2026-10-11T01:00:01Z'
  });
  assert.equal(state.improvement_cases,1);
  assert.equal(state.learning_records_total,1);
  assert.equal(state.candidate_packages_total,1);
  assert.equal(state.candidate_packages[0].engine_id,'HCI-001');
  assert.equal(state.candidate_packages[0].environment,'PREPROD');
  assert.equal(state.next_gate,'OLD_VS_NEW_EXPERIMENT');
});
