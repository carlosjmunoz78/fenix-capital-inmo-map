import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import { DurableWorkerRunnerV1 } from '../runtime/durable-worker-runner-v1.mjs';
import { GovernedExecutionHandoffRouterV1 } from '../runtime/governed-execution-handoff-router-v1.mjs';
import { createDeepSeekGovernedHandoffHandlerV1 } from '../runtime/deepseek-governed-handoff-handler-v1.mjs';

const SOURCE = Object.freeze({ company_id: 'fenix', engine_id: 'BOOST-001', environment: 'PREPROD', version: 'soak-v1' });
const TARGET = Object.freeze({ company_id: 'fenix', engine_id: 'FACT-001', environment: 'PREPROD', version: 'soak-v1' });
const TARGET_JOB = 'repo.sandbox.public.readonly.v0';

function router(runtime) {
  return new GovernedExecutionHandoffRouterV1({
    job_runtime: runtime,
    targets: {
      [TARGET_JOB]: {
        context: TARGET,
        enabled: true,
        sanitize_payload: payload => payload,
        timeout_ms: 10_000,
      },
    },
  });
}

async function drain(worker, runtime) {
  for (let round = 0; round < 50; round += 1) {
    await worker.runSaturatedRound({ contexts: [SOURCE, TARGET], completion_budget: 64 });
    const live = [...runtime.listForContext(SOURCE), ...runtime.listForContext(TARGET)]
      .filter(job => !['SUCCEEDED', 'DEAD_LETTER', 'CANCELLED'].includes(job.status));
    if (live.length === 0) return;
  }
  throw new Error('soak did not drain');
}

test('MODEL result -> governed handoff -> same durable queue -> restart stays idempotent', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-handoff-soak-'));
  const journal = path.join(dir, 'jobs.v8journal');
  const runtime = new DurableJobRuntimeV1({ file_path: journal });
  const handoffRouter = router(runtime);
  const base = async ({ job, payload, checkpoint }) => {
    checkpoint?.({ stage: 'MODEL_DONE', n: payload.n });
    const handoffPayload = { n: payload.n, source_job_id: job.job_id };
    return {
      provider: 'deepseek-test-double',
      model: 'bounded-test',
      output_text: `evidence:${payload.n}\nCEREBRO_EXECUTION_HANDOFF_JSON=${JSON.stringify({ job_name: TARGET_JOB, payload: handoffPayload })}`,
      prod_authorized: false,
      trading_access: false,
    };
  };
  base.snapshot = () => ({ status: 'GREEN' });
  const modelHandler = createDeepSeekGovernedHandoffHandlerV1({ base_handler: base, handoff_router: handoffRouter });
  const physicallyExecuted = [];
  const worker = new DurableWorkerRunnerV1({
    job_runtime: runtime,
    worker_id: 'soak-worker-1',
    lease_ms: 5_000,
    heartbeat_ms: 100,
    max_concurrency: 16,
    max_per_company: 16,
  });
  worker.register({ name: 'model.deepseek.agent', handler: modelHandler });
  worker.register({
    name: TARGET_JOB,
    handler: async ({ payload, checkpoint }) => {
      checkpoint?.({ stage: 'PHYSICAL_PREPROD_GREEN', n: payload.n });
      physicallyExecuted.push(payload.n);
      return { status: 'PHYSICAL_PREPROD_GREEN', n: payload.n, prod_authorized: false, trading_access: false };
    },
  });

  for (let n = 0; n < 12; n += 1) {
    runtime.enqueue({
      name: 'model.deepseek.agent',
      context: SOURCE,
      payload: { input: `task-${n}`, n, __work_pump: { kind: 'BLOCK_SUBTASK' } },
      idempotency_key: `soak:model:${n}`,
      timeout_ms: 10_000,
    });
  }
  await drain(worker, runtime);
  assert.equal(runtime.listForContext(SOURCE).filter(job => job.status === 'SUCCEEDED').length, 12);
  assert.equal(runtime.listForContext(TARGET).filter(job => job.status === 'SUCCEEDED').length, 12);
  assert.deepEqual(physicallyExecuted.sort((a, b) => a - b), [...Array(12).keys()]);

  const restarted = new DurableJobRuntimeV1({ file_path: journal });
  const restartedRouter = router(restarted);
  for (const source of restarted.listForContext(SOURCE)) {
    const receipt = restartedRouter.handleOutcome({ outcome: { status: 'SUCCEEDED', job: source } });
    assert.equal(receipt.status, 'DUPLICATE');
  }
  assert.equal(restarted.listForContext(TARGET).length, 12);
  assert.equal(restartedRouter.snapshot().duplicates, 12);
});