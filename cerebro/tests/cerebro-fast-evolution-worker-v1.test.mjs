import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DurableJobRuntimeV1} from '../runtime/durable-job-runtime-v1.mjs';
import {buildFastEvolutionPlan} from '../runtime/cerebro-fast-evolution-planner-v1.mjs';
import {enqueueFastEvolutionPlan} from '../runtime/cerebro-fast-evolution-job001-bridge-v1.mjs';
import {createFastEvolutionWorker, drainFastEvolutionCompany, CEREBRO_FAST_EVOLUTION_WORKER_V1_CONTRACT} from '../runtime/cerebro-fast-evolution-worker-v1.mjs';

function tempRuntime() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-fast-worker-'));
  return new DurableJobRuntimeV1({file_path: path.join(dir, 'jobs.journal'), environment: 'PREPROD'});
}

function fiveSignalPlan() {
  return buildFastEvolutionPlan({signals: [
    {id:'sec:1', type:'SECURITY_FINDING'},
    {id:'err:1', type:'ERROR'},
    {id:'human:1', type:'HUMAN_FEEDBACK'},
    {id:'perf:1', type:'PERFORMANCE_REGRESSION'},
    {id:'cap:1', type:'NEW_CAPABILITY'}
  ], now:'2026-10-19T00:00:00.000Z'});
}

test('fast evolution worker can execute five same-company PREPROD microcycles concurrently', async () => {
  const runtime = tempRuntime();
  const plan = fiveSignalPlan();
  const dispatch = enqueueFastEvolutionPlan({job_runtime: runtime, plan, company_id:'fenix', version:'1.0.0', now_ms:1000});
  assert.equal(dispatch.accepted_total, 5);

  let active = 0;
  let peak = 0;
  let started = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });

  const runner = createFastEvolutionWorker({
    job_runtime: runtime,
    max_concurrency: 5,
    max_per_company: 5,
    execute_candidate: async ({task}) => {
      active += 1;
      started += 1;
      peak = Math.max(peak, active);
      if (started === 5) release();
      await gate;
      active -= 1;
      return {
        metric: 'quality_score',
        old: 0,
        new: 1,
        direction: 'higher',
        judge_id: 'JDG-001',
        candidate_actor_id: `candidate:${task.task_id}`,
        evidence_refs: [`evidence:${task.task_id}`],
        real_outcome_delta: 1
      };
    }
  });

  const outcomes = await drainFastEvolutionCompany({runner, company_id:'fenix', version:'1.0.0', slots:5, max_rounds:1});
  assert.equal(peak, 5);
  assert.equal(outcomes.length, 5);
  assert.ok(outcomes.every(x => x.status === 'SUCCEEDED'));
  assert.ok(outcomes.every(x => x.job.result.status === 'PREPROD_MICROCYCLE_GREEN'));
  assert.ok(outcomes.every(x => x.job.result.adoption_authorized === false));
  assert.equal(runner.snapshot().max_per_company, 5);
});

test('fast worker refuses concurrency above the proven five-slot PREPROD ceiling', () => {
  const runtime = tempRuntime();
  assert.throws(() => createFastEvolutionWorker({job_runtime: runtime, execute_candidate: async () => ({}), max_concurrency: 6}), /1\.\.5/);
});

test('fast worker contract keeps authority and cost closed', () => {
  assert.equal(CEREBRO_FAST_EVOLUTION_WORKER_V1_CONTRACT.max_concurrency, 5);
  assert.equal(CEREBRO_FAST_EVOLUTION_WORKER_V1_CONTRACT.max_per_company, 5);
  assert.equal(CEREBRO_FAST_EVOLUTION_WORKER_V1_CONTRACT.adoption_authorized, false);
  assert.equal(CEREBRO_FAST_EVOLUTION_WORKER_V1_CONTRACT.prod_authorized, false);
  assert.equal(CEREBRO_FAST_EVOLUTION_WORKER_V1_CONTRACT.prod_write_authorized, false);
  assert.equal(CEREBRO_FAST_EVOLUTION_WORKER_V1_CONTRACT.spend_authorized, false);
  assert.equal(CEREBRO_FAST_EVOLUTION_WORKER_V1_CONTRACT.trading_access, false);
  assert.equal(CEREBRO_FAST_EVOLUTION_WORKER_V1_CONTRACT.additional_cost_target_eur, 0);
});
