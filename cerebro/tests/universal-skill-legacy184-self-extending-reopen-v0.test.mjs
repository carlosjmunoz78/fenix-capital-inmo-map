import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLegacy184ScalePlan} from '../runtime/universal-skill-legacy184-scale-v1.mjs';
import {buildLegacy184SelfExtendingReopenPlan,buildLegacy184SelfExtendingDispatchBatch,LEGACY184_SELF_EXTENDING_REOPEN_V0_CONTRACT} from '../runtime/universal-skill-legacy184-self-extending-reopen-v0.mjs';

test('real 184 catalog reopens every nonterminal BLOCKED_EXTERNAL as dependency/human mission without false FULL',()=>{
  const legacy=buildLegacy184ScalePlan();
  const expected=legacy.normalized.filter(x=>x.expected_outcome==='BLOCKED_EXTERNAL'&&x.excluded_from_activation_batch!==true);
  const out=buildLegacy184SelfExtendingReopenPlan();
  assert.equal(out.catalog_size,184);
  assert.equal(out.reopened_count,expected.length);
  assert.equal(out.missions.length,expected.length);
  assert.equal(out.full_claim,false);
  assert.equal(out.prod_authorized,false);
  assert.equal(out.additional_cost_eur,0);
  assert.ok(out.reopened_count>0);
  for(const mission of out.missions){
    assert.equal(mission.legacy_outcome,'BLOCKED_EXTERNAL');
    assert.equal(mission.resume_original_skill,true);
    assert.ok(['DEPENDENCY_RESOLUTION_REQUIRED','HUMAN_REQUIRED'].includes(mission.new_outcome));
    assert.notEqual(mission.resolution.status,'REJECTED');
    assert.equal(mission.resolution.terminal,false);
  }
});

test('terminal legacy outcomes are preserved and not silently reopened',()=>{
  const legacy=buildLegacy184ScalePlan();
  const terminalIds=new Set(legacy.normalized.filter(x=>x.excluded_from_activation_batch===true).map(x=>x.source_item_id));
  const out=buildLegacy184SelfExtendingReopenPlan();
  for(const mission of out.missions)assert.equal(terminalIds.has(mission.item_id),false);
  const preservedTerminal=out.preserved.filter(x=>x.excluded_terminal===true);
  assert.equal(preservedTerminal.length,terminalIds.size);
});

test('dispatch batch is idempotent, PREPROD-only, zero-cost and excludes human gates from JOB queue',()=>{
  const plan=buildLegacy184SelfExtendingReopenPlan();
  const a=buildLegacy184SelfExtendingDispatchBatch();
  const b=buildLegacy184SelfExtendingDispatchBatch();
  assert.equal(a.status,'DISPATCH_BATCH_READY');
  assert.equal(a.environment,'PREPROD');
  assert.equal(a.jobs.length,plan.dependency_resolution_required);
  assert.equal(a.human_required.length,plan.human_required);
  assert.equal(a.batch_hash,b.batch_hash);
  assert.deepEqual(a.jobs.map(x=>x.idempotency_key),b.jobs.map(x=>x.idempotency_key));
  assert.equal(a.prod_authorized,false);
  assert.equal(a.trading_access,false);
  assert.equal(a.additional_cost_eur,0);
  for(const job of a.jobs){assert.equal(job.engine_id,'FACT-001');assert.equal(job.resume_original_skill,true);assert.equal(job.resolution.status,'DEPENDENCY_RESOLUTION_REQUIRED');}
});

test('contract explicitly forbids BLOCKED_EXTERNAL terminal semantics',()=>{
  assert.equal(LEGACY184_SELF_EXTENDING_REOPEN_V0_CONTRACT.catalog_size,184);
  assert.equal(LEGACY184_SELF_EXTENDING_REOPEN_V0_CONTRACT.blocked_external_terminal,false);
  assert.equal(LEGACY184_SELF_EXTENDING_REOPEN_V0_CONTRACT.prod,false);
});
