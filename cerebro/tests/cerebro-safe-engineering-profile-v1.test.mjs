import test from 'node:test';
import assert from 'node:assert/strict';
import {safeEngineeringProfile,planEngineeringChange,compareEngineeringOutcomes,sourceDisposition,SAFE_ENGINEERING_PHASES} from '../runtime/cerebro-safe-engineering-profile-v1.mjs';

test('profile is one zero-cost PREPROD capability profile, not 13 engines',()=>{
  const profile=safeEngineeringProfile();
  assert.equal(profile.state_type,'CEREBRO_SAFE_ENGINEERING_PROFILE_V1');
  assert.equal(profile.environment,'PREPROD');
  assert.equal(profile.sources.length,13);
  assert.equal(profile.new_engine_required,false);
  assert.equal(profile.paid_model_required,false);
  assert.equal(profile.additional_cost_eur,0);
  assert.equal(profile.prod_write_authorized,false);
  assert.equal(profile.trading_access,false);
  assert.equal(new Set(profile.sources.map((s)=>s.item)).size,13);
});

test('safe plan passes only with preserve understand wrap test improve discipline',()=>{
  const plan=planEngineeringChange({
    company_id:'fenix',engine_id:'AUTO-001',environment:'PREPROD',version:'1.0.0',
    inventory_complete:true,dependencies_mapped:true,reuse_checked:true,new_code:true,new_code_justified:true,
    mutation:true,worktree_isolated:true,tests_before_change:true,rollback_ready:true,rebuild_ready:true,
    backup_or_snapshot_ready:true,planned_files_changed:3,max_files_changed:10,additional_cost_eur:0
  });
  assert.equal(plan.decision,'PASS_PREPROD_PLAN');
  assert.deepEqual(plan.blockers,[]);
  assert.deepEqual(plan.human_required,[]);
  assert.equal(plan.prod_authorized,false);
  assert.equal(plan.phases.length,SAFE_ENGINEERING_PHASES.length);
  assert.equal(plan.execution_policy.reuse_before_build,true);
  assert.equal(plan.execution_policy.old_vs_new,true);
  assert.match(plan.plan_id,/^[a-f0-9]{64}$/);
});

test('profile fails closed when reuse, isolation, tests or rollback are missing',()=>{
  const plan=planEngineeringChange({
    inventory_complete:true,dependencies_mapped:true,reuse_checked:false,new_code:true,new_code_justified:false,
    mutation:true,worktree_isolated:false,tests_before_change:false,rollback_ready:false,rebuild_ready:false,
    backup_or_snapshot_ready:false,planned_files_changed:1,max_files_changed:10
  });
  assert.equal(plan.decision,'HOLD');
  for(const expected of ['reuse_before_build_required','new_code_not_justified','worktree_or_equivalent_isolation_required','tests_before_change_required','rollback_required','rebuild_required','backup_or_snapshot_required']){
    assert.ok(plan.blockers.includes(expected));
  }
});

test('profile refuses PROD authority, Trading access, secrets and customer test data',()=>{
  const plan=planEngineeringChange({
    inventory_complete:true,dependencies_mapped:true,reuse_checked:true,mutation:false,
    prod_write:true,trading_access:true,secret_exposure:true,customer_data_in_test:true
  });
  assert.equal(plan.decision,'HUMAN_REQUIRED');
  assert.ok(plan.human_required.includes('HIGH_RISK'));
  assert.ok(plan.human_required.includes('SECURITY_INCIDENT'));
  assert.equal(plan.prod_write_authorized,false);
  assert.equal(plan.trading_access,false);
});

test('zero cost gate maps non-zero incremental cost to MONEY_LIMIT',()=>{
  const plan=planEngineeringChange({
    inventory_complete:true,dependencies_mapped:true,reuse_checked:true,mutation:false,additional_cost_eur:1
  });
  assert.equal(plan.decision,'HUMAN_REQUIRED');
  assert.ok(plan.blockers.includes('zero_cost_gate_failed'));
  assert.deepEqual(plan.human_required,['MONEY_LIMIT']);
});

test('scope discipline forces oversized change to split instead of big-bang',()=>{
  const plan=planEngineeringChange({
    inventory_complete:true,dependencies_mapped:true,reuse_checked:true,mutation:true,worktree_isolated:true,
    tests_before_change:true,rollback_ready:true,rebuild_ready:true,backup_or_snapshot_ready:true,
    planned_files_changed:25,max_files_changed:10
  });
  assert.equal(plan.decision,'HOLD');
  assert.ok(plan.blockers.includes('scope_too_large_split_change'));
});

test('OLD vs NEW accepts measurable improvement only when hard safety/cost dimensions do not regress',()=>{
  const baseline={tests_failed:2,security_regressions:0,policy_regressions:0,additional_cost_eur:0,files_changed:8,defects_found_postchange:3,quality_score:70,prod_authority:false,trading_access:false};
  const candidate={...baseline,tests_failed:0,files_changed:4,defects_found_postchange:1,quality_score:85};
  const result=compareEngineeringOutcomes({old_result:baseline,new_result:candidate});
  assert.equal(result.decision,'NEW_BETTER');
  assert.deepEqual(result.hard_regressions,[]);
  assert.ok(result.improvements.includes('quality'));
});

test('OLD vs NEW rejects security, cost or authority regression regardless of quality score',()=>{
  const baseline={tests_failed:0,security_regressions:0,policy_regressions:0,additional_cost_eur:0,files_changed:4,defects_found_postchange:1,quality_score:80,prod_authority:false,trading_access:false};
  const candidate={...baseline,security_regressions:1,additional_cost_eur:3,quality_score:99,prod_authority:true};
  const result=compareEngineeringOutcomes({old_result:baseline,new_result:candidate});
  assert.equal(result.decision,'REJECT_NEW');
  assert.ok(result.hard_regressions.includes('security_regressed'));
  assert.ok(result.hard_regressions.includes('cost_regressed'));
  assert.ok(result.hard_regressions.includes('authority_expanded'));
  assert.equal(result.rollback_required,true);
});

test('source dispositions pin safe use and keep Evolver patterns-only',()=>{
  assert.equal(sourceDisposition(25).source,'anomalyco/opencode');
  assert.equal(sourceDisposition(33).source,'openclaw/openclaw');
  assert.equal(sourceDisposition(37).mode,'PATTERNS_ONLY');
  assert.equal(sourceDisposition(999).decision,'HOLD_UNKNOWN_SOURCE');
});
