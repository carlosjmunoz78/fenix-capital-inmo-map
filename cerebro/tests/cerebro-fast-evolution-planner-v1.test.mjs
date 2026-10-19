import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildFastEvolutionPlan, CEREBRO_FAST_EVOLUTION_PLANNER_V1_CONTRACT} from '../runtime/cerebro-fast-evolution-planner-v1.mjs';

const execution = JSON.parse(fs.readFileSync(new URL('../registry/cerebro-fast-evolution-execution.v1.json', import.meta.url), 'utf8'));

test('fast evolution contract is event-driven, microcycle-first and not daily-only', () => {
  assert.equal(execution.environment, 'PREPROD');
  assert.equal(execution.execution_model.primary_trigger, 'EVENT_DRIVEN');
  assert.equal(execution.execution_model.polling_primary, false);
  assert.equal(execution.execution_model.daily_cycle_only, false);
  assert.equal(execution.execution_model.microcycles_enabled, true);
  assert.equal(execution.execution_model.deterministic_fast_path_before_ai, true);
  assert.equal(execution.execution_model.heavy_work_async, true);
  assert.ok(execution.execution_model.batch_coalescing_ms <= 250);
});

test('latency targets force seconds/minutes fast paths rather than slow monolithic cycles', () => {
  assert.ok(execution.latency_classes.ROUTE_AND_CLASSIFY.target_ms <= 250);
  assert.ok(execution.latency_classes.DETERMINISTIC_VALIDATION.target_ms <= 2000);
  assert.ok(execution.latency_classes.CANDIDATE_SCORE.target_ms <= 10000);
  assert.ok(execution.latency_classes.MICRO_EXPERIMENT.target_ms <= 60000);
  assert.ok(execution.latency_classes.STANDARD_EXPERIMENT.target_ms <= 300000);
});

test('planner prioritizes security/regression and caps active work at five fronts', () => {
  const signals = [
    {id:'m1',type:'MARKET_SIGNAL'},
    {id:'h1',type:'HUMAN_FEEDBACK'},
    {id:'s1',type:'SECURITY_FINDING'},
    {id:'e1',type:'ERROR'},
    {id:'p1',type:'PERFORMANCE_REGRESSION'},
    {id:'c1',type:'NEW_CAPABILITY'}
  ];
  const plan = buildFastEvolutionPlan({signals, now:'2026-10-19T00:15:00Z'});
  assert.equal(plan.status, 'FAST_PATH_READY_PREPROD');
  assert.equal(plan.trigger_mode, 'EVENT_DRIVEN');
  assert.equal(plan.tasks_total, 6);
  assert.equal(plan.active_wave.length, 5);
  assert.equal(plan.deferred_queue.length, 1);
  assert.equal(plan.active_wave[0].priority, 'P0');
  assert.equal(plan.active_wave[1].priority, 'P0');
  assert.ok(plan.active_wave.some(x => x.signal_type === 'SECURITY_FINDING'));
  assert.ok(plan.active_wave.some(x => x.signal_type === 'ERROR'));
});

test('planner deduplicates repeated signals and keeps blocked work from globally blocking', () => {
  const plan = buildFastEvolutionPlan({signals:[
    {id:'same',type:'NEW_EVIDENCE'},
    {id:'same',type:'NEW_EVIDENCE'},
    {id:'other',type:'HUMAN_FEEDBACK'}
  ], now:'2026-10-19T00:15:01Z'});
  assert.equal(plan.tasks_total, 2);
  assert.equal(plan.blocked_work_never_blocks_other_safe_fronts, true);
  assert.equal(plan.heavy_work_async, true);
});

test('every task requires OLD vs NEW and Tribunal before adoption', () => {
  const plan = buildFastEvolutionPlan({signals:[{id:'x',type:'PROACTIVE_IMPROVEMENT'}], now:'2026-10-19T00:15:02Z'});
  assert.equal(plan.active_wave.length, 1);
  const task = plan.active_wave[0];
  assert.equal(task.old_vs_new_required, true);
  assert.equal(task.tribunal_required, true);
  assert.ok(task.engine_chain.includes('EVA-001'));
  assert.ok(task.engine_chain.includes('JDG-001'));
  assert.equal(task.deterministic_fast_path_before_ai, true);
});

test('speed never broadens authority, spend, trading or external execution', () => {
  const plan = buildFastEvolutionPlan({signals:[{id:'s',type:'SECURITY_FINDING'}], now:'2026-10-19T00:15:03Z'});
  assert.equal(plan.authority.prod_authorized, false);
  assert.equal(plan.authority.prod_write_authorized, false);
  assert.equal(plan.authority.auto_merge_authorized, false);
  assert.equal(plan.authority.spend_authorized, false);
  assert.equal(plan.authority.external_dependency_install_authorized, false);
  assert.equal(plan.authority.external_skill_code_execution_authorized, false);
  assert.equal(plan.authority.trading_access, false);
  assert.equal(plan.authority.additional_cost_eur, 0);
  assert.equal(CEREBRO_FAST_EVOLUTION_PLANNER_V1_CONTRACT.max_active_fronts, 5);
});

test('speed misses become learning signals instead of evidence-skipping shortcuts', () => {
  assert.equal(execution.speed_failure_policy.target_miss_is_learning_signal, true);
  assert.equal(execution.speed_failure_policy.repeated_target_miss_requires_root_cause, true);
  assert.equal(execution.speed_failure_policy.no_evidence_skipping_for_speed, true);
  assert.equal(execution.speed_failure_policy.no_permission_broadening_for_speed, true);
  assert.equal(execution.speed_failure_policy.no_prod_bypass_for_speed, true);
});
