import test from 'node:test';
import assert from 'node:assert/strict';
import {factSafeEngineeringCapability,planFactEngineeringTask,FACT_ENGINEERING_TASK_KINDS} from '../runtime/fact-safe-engineering-bootstrap-v1.mjs';

test('FACT reuses Safe Engineering as one capability, not a new engine',()=>{
  const cap=factSafeEngineeringCapability();
  assert.equal(cap.engine_id,'FACT-001');
  assert.equal(cap.environment,'PREPROD');
  assert.equal(cap.new_engine_required,false);
  assert.equal(cap.profile_id,'CEREBRO_SAFE_ENGINEERING_PROFILE_V1');
  assert.equal(cap.additional_cost_eur,0);
  assert.equal(cap.prod_write_authorized,false);
  assert.equal(cap.external_skill_code_execution,false);
  assert.deepEqual(cap.task_kinds,FACT_ENGINEERING_TASK_KINDS);
});

test('read-only repository analysis becomes ready when inventory/dependencies/reuse are proven',()=>{
  const plan=planFactEngineeringTask({
    company_id:'fenix',candidate_id:'repo:test',task_kind:'REPO_ANALYSIS',objective:'Understand repository capabilities safely',
    source_refs:['github://example/repo'],inventory_complete:true,dependencies_mapped:true,reuse_checked:true,
    mutation:false,planned_files_changed:0,additional_cost_eur:0
  });
  assert.equal(plan.status,'FACT_ENGINEERING_READY');
  assert.equal(plan.engine_id,'FACT-001');
  assert.equal(plan.engineering_plan.decision,'PASS_PREPROD_PLAN');
  assert.ok(plan.execution_contract.requested_outputs.includes('capability_inventory'));
  assert.equal(plan.execution_contract.direct_prod_execution,false);
  assert.equal(plan.execution_contract.raw_external_code_execution,false);
  assert.match(plan.task_id,/^facteng_[a-f0-9]{24}$/);
});

test('mutation plan requires isolation tests backup rollback and rebuild',()=>{
  const plan=planFactEngineeringTask({
    task_kind:'WRAPPER_ADAPTER',objective:'Create wrapper',inventory_complete:true,dependencies_mapped:true,reuse_checked:true,
    new_code:true,new_code_justified:true,mutation:true,planned_files_changed:2
  });
  assert.equal(plan.status,'HOLD');
  for(const blocker of ['worktree_or_equivalent_isolation_required','tests_before_change_required','rollback_required','rebuild_required','backup_or_snapshot_required']){
    assert.ok(plan.blockers.includes(blocker));
  }
});

test('safe wrapper mutation is ready and preserves zero-cost PREPROD authority',()=>{
  const plan=planFactEngineeringTask({
    task_kind:'WRAPPER_ADAPTER',objective:'Generate governed adapter contract',candidate_id:'candidate:alpha',
    inventory_complete:true,dependencies_mapped:true,reuse_checked:true,new_code:true,new_code_justified:true,
    mutation:true,worktree_isolated:true,tests_before_change:true,rollback_ready:true,rebuild_ready:true,backup_or_snapshot_ready:true,
    planned_files_changed:4,max_files_changed:10,additional_cost_eur:0
  });
  assert.equal(plan.status,'FACT_ENGINEERING_READY');
  assert.equal(plan.execution_contract.old_vs_new_required,true);
  assert.equal(plan.execution_contract.rollback_rebuild_required,true);
  assert.equal(plan.prod_authorized,false);
  assert.equal(plan.trading_access,false);
});

test('PROD, Trading, secret exposure and spend fail closed into canonical human reasons',()=>{
  const plan=planFactEngineeringTask({
    task_kind:'DEBUG_FIX',objective:'Unsafe request should not pass',inventory_complete:true,dependencies_mapped:true,reuse_checked:true,
    prod_write:true,trading_access:true,secret_exposure:true,additional_cost_eur:1
  });
  assert.equal(plan.status,'HUMAN_REQUIRED');
  assert.ok(plan.human_required.includes('HIGH_RISK'));
  assert.ok(plan.human_required.includes('SECURITY_INCIDENT'));
  assert.ok(plan.human_required.includes('MONEY_LIMIT'));
  assert.equal(plan.prod_write_authorized,false);
});

test('task identity is deterministic for exact same governed request',()=>{
  const input={task_kind:'SEMANTIC_CONTRACT',objective:'Create domain contract',candidate_id:'candidate:stable',source_refs:['source:a'],inventory_complete:true,dependencies_mapped:true,reuse_checked:true};
  const a=planFactEngineeringTask(input),b=planFactEngineeringTask(input);
  assert.equal(a.task_id,b.task_id);
  assert.equal(a.engineering_plan.plan_id,b.engineering_plan.plan_id);
});

test('unsupported task kinds and outputs are rejected',()=>{
  assert.throws(()=>planFactEngineeringTask({task_kind:'MAGIC',objective:'x'}),/unsupported task_kind/);
  assert.throws(()=>planFactEngineeringTask({task_kind:'REPO_ANALYSIS',objective:'x',requested_outputs:['shell-root']}),/unsupported output/);
});
