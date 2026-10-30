import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planEnterpriseGlobalFanoutV1, buildPaidEnterpriseTopologyV1, ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT } from '../runtime/enterprise-global-fanout-v1.mjs';

const policy=JSON.parse(fs.readFileSync(new URL('../config/github-enterprise-execution.v1.json',import.meta.url),'utf8'));

test('global fanout contract is PREPROD and reuses existing control plane',()=>{
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.environment,'PREPROD');
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.second_queue,false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.second_scheduler,false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.second_daemon,false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.self_refill,true);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.offset_aware,true);
  assert.ok(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.total_mission_work_units>360);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.prod_authorized,false);
  assert.equal(ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.trading_access,false);
});

test('verified Enterprise cap is 360 and queue buffer is bounded by documented 500 topology',()=>{
  const first=planEnterpriseGlobalFanoutV1({policy,requested_units:360,offset:0});
  const second=planEnterpriseGlobalFanoutV1({policy,requested_units:500,offset:first.next_offset});
  assert.equal(first.effective_physical_cap,360);
  assert.equal(first.queue_buffer_cap,500);
  assert.equal(first.planned_units,360);
  assert.equal(first.matrix_a.length,180);
  assert.equal(first.matrix_b.length,180);
  assert.equal(first.next_offset,360);
  assert.equal(second.offset,360);
  assert.equal(second.planned_units,500);
  assert.equal(second.matrix_a.length,250);
  assert.equal(second.matrix_b.length,250);
  const a=new Set([...first.matrix_a,...first.matrix_b].map(x=>x.work_unit_id));
  const b=new Set([...second.matrix_a,...second.matrix_b].map(x=>x.work_unit_id));
  assert.equal([...b].some(id=>a.has(id)),false);
});

test('final buffered wave shrinks to remaining useful work and stops',()=>{
  const total=ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT.total_mission_work_units;
  const plan=planEnterpriseGlobalFanoutV1({policy,requested_units:500,offset:total-17});
  assert.equal(plan.planned_units,17);
  assert.equal(plan.next_offset,total);
  assert.equal(plan.has_more,false);
});

test('500 topology remains legal as two 250-job matrices but physical live cap remains 360',()=>{
  const topology=buildPaidEnterpriseTopologyV1(500,0);
  assert.equal(topology.all.length,500);
  assert.equal(topology.matrix_a.length,250);
  assert.equal(topology.matrix_b.length,250);
  const plan=planEnterpriseGlobalFanoutV1({policy,requested_units:500,offset:0});
  assert.equal(plan.effective_physical_cap,360);
  assert.equal(plan.global_500_fanout_enabled,false);
});

test('requests above the bounded 500 logical buffer fail closed and fallback remains 20',()=>{
  assert.throws(()=>planEnterpriseGlobalFanoutV1({policy,requested_units:501}),/1\.\.500/);
  const fallback=structuredClone(policy);
  fallback.entitlement_gate.enterprise_actions_concurrency_entitlement_verified=false;
  fallback.entitlement_gate.enterprise_account_state='TRIAL';
  fallback.entitlement_gate.global_fanout_enabled=false;
  const fallbackPlan=planEnterpriseGlobalFanoutV1({policy:fallback,requested_units:40});
  assert.equal(fallbackPlan.effective_physical_cap,20);
  assert.equal(fallbackPlan.queue_buffer_cap,40);
});
