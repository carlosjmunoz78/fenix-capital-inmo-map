import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureNeuronalSourceV1 } from '../runtime/neuronal-source-integrity-v1.mjs';
import {
  buildNeuronalSubmissionsV1,
  validateNeuronalDagV1,
  planNeuronalFanoutV1,
  deepSeekCandidatesV1,
  NEURONAL_SUPERPARALLEL_SOURCE_V1_CONTRACT,
} from '../runtime/neuronal-superparallel-source-v1.mjs';

// Global sharded CI may run this test directly before a campaign-specific prepare step.
// Rebuild and checksum the canonical source from the eight immutable parts so the
// same test is deterministic in GitHub, the installed Windows runtime and local PREPROD.
ensureNeuronalSourceV1();

test('canonical neuronal campaign reconstructs exactly 6,449 unique acyclic submissions',()=>{
  const submissions=buildNeuronalSubmissionsV1();
  const report=validateNeuronalDagV1(submissions);
  assert.equal(submissions.length,6449);
  assert.equal(report.unique_ids,6449);
  assert.equal(report.broken_dependencies,0);
  assert.equal(report.acyclic,true);
});

test('enterprise discovery plan is bounded and does not claim completion or PROD authority',()=>{
  const plan=planNeuronalFanoutV1({requested_units:147,offset:0});
  assert.equal(plan.planned_units,147);
  assert.equal(new Set(plan.matrix.map(x=>x.submission_id)).size,147);
  assert.equal(plan.discovery_only,true);
  assert.equal(plan.completion_authority,false);
  assert.equal(plan.prod_authorized,false);
  assert.equal(plan.prod_write_authorized,false);
  assert.equal(plan.trading_access,false);
});

test('DeepSeek candidates remain bounded and are only eligible P0/NOW submissions',()=>{
  const candidates=deepSeekCandidatesV1({limit:32});
  assert.equal(candidates.length,32);
  for(const item of candidates){
    assert.equal(item.deepseek_allowed,true);
    assert.equal(item.priority,'P0');
    assert.equal(item.horizon,'NOW');
    assert.equal(item.environment,'PREPROD');
    assert.equal(item.prod_write_allowed,false);
    assert.equal(item.trading_access,false);
  }
});

test('contract reuses CEREBRO control plane and blocks extra authority',()=>{
  const c=NEURONAL_SUPERPARALLEL_SOURCE_V1_CONTRACT;
  assert.equal(c.approved_requirements,493);
  assert.equal(c.submissions,6449);
  assert.equal(c.enterprise_discovery_parallel_target,147);
  assert.equal(c.deepseek_parallel_max,8);
  assert.equal(c.second_queue,false);
  assert.equal(c.second_scheduler,false);
  assert.equal(c.second_daemon,false);
  assert.equal(c.prod_authorized,false);
  assert.equal(c.prod_write_authorized,false);
  assert.equal(c.trading_access,false);
});
