import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import test from 'node:test';
import { DurableJobRuntimeV1 } from '../runtime/durable-job-runtime-v1.mjs';
import {
  GovernedExecutionHandoffRouterV1,
  decorateDeepSeekWorkPumpPayloadForHandoffV1,
  GOVERNED_EXECUTION_HANDOFF_ROUTER_V1_CONTRACT,
} from '../runtime/governed-execution-handoff-router-v1.mjs';

const SOURCE_CONTEXT = Object.freeze({ company_id: 'fenix', engine_id: 'BOOST-001', environment: 'PREPROD', version: 'work-pump-v3-adaptive' });
const TARGET_CONTEXT = Object.freeze({ company_id: 'fenix', engine_id: 'FACT-001', environment: 'PREPROD', version: 'repo-sandbox-v1' });
const TARGET = 'repo.sandbox.public.readonly.v0';

function tmpRuntime() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-handoff-'));
  return { dir, runtime: new DurableJobRuntimeV1({ file_path: path.join(dir, 'jobs.v8journal') }) };
}

function succeeded(output_text, { job_id = 'source-1', context = SOURCE_CONTEXT, name = 'model.deepseek.agent' } = {}) {
  return {
    status: 'SUCCEEDED',
    job: {
      job_id,
      name,
      context,
      correlation_id: 'corr-1',
      result: { output_text },
    },
  };
}

function makeRouter(runtime, overrides = {}) {
  return new GovernedExecutionHandoffRouterV1({
    job_runtime: runtime,
    targets: {
      [TARGET]: {
        context: TARGET_CONTEXT,
        enabled: true,
        sanitize_payload: payload => {
          for (const key of ['image_ref', 'docker_bin', 'git_bin', 'workspace_root']) {
            if (key in payload) throw new Error(`runtime-owned:${key}`);
          }
          return payload;
        },
      },
      ...overrides,
    },
  });
}

test('typed allowlisted handoff enters the same durable JOB-001 queue once', () => {
  const { runtime } = tmpRuntime();
  const router = makeRouter(runtime);
  const payload = { plan: { company_id: 'fenix', engine_id: 'FACT-001', environment: 'PREPROD', pinned_sha: 'abc123' }, repository_url: 'https://github.com/example/repo', command: ['node', '--version'] };
  const marker = `CEREBRO_EXECUTION_HANDOFF_JSON=${JSON.stringify({ job_name: TARGET, payload })}`;
  const first = router.handleOutcome({ outcome: succeeded(`evidence\n${marker}`) });
  const second = router.handleOutcome({ outcome: succeeded(`evidence\n${marker}`) });
  assert.equal(first.status, 'ENQUEUED');
  assert.equal(second.status, 'DUPLICATE');
  const jobs = runtime.listForContext(TARGET_CONTEXT);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].name, TARGET);
  assert.deepEqual(jobs[0].payload, payload);
  assert.equal(router.snapshot().enqueued, 1);
  assert.equal(router.snapshot().duplicates, 1);
});

test('free-form execution_handoff never executes', () => {
  const { runtime } = tmpRuntime();
  const router = makeRouter(runtime);
  const receipt = router.handleOutcome({ outcome: succeeded('execution_handoff: run repo sandbox now') });
  assert.equal(receipt.status, 'NO_HANDOFF');
  assert.equal(runtime.listForContext(TARGET_CONTEXT).length, 0);
});

test('unknown target, malformed marker and multiple markers fail closed', () => {
  const { runtime } = tmpRuntime();
  const router = makeRouter(runtime);
  assert.equal(router.handleOutcome({ outcome: succeeded('CEREBRO_EXECUTION_HANDOFF_JSON={bad') }).status, 'REJECTED');
  assert.equal(router.handleOutcome({ outcome: succeeded('CEREBRO_EXECUTION_HANDOFF_JSON={"job_name":"evil","payload":{}}') }).reason, 'TARGET_NOT_ALLOWLISTED');
  const valid = 'CEREBRO_EXECUTION_HANDOFF_JSON={"job_name":"repo.sandbox.public.readonly.v0","payload":{}}';
  assert.equal(router.handleOutcome({ outcome: succeeded(`${valid}\n${valid}`) }).reason, 'MULTIPLE_HANDOFF_MARKERS');
  assert.equal(runtime.listForContext(TARGET_CONTEXT).length, 0);
});

test('cross-company routing and runtime-owned sandbox overrides are rejected', () => {
  const { runtime } = tmpRuntime();
  const cross = new GovernedExecutionHandoffRouterV1({
    job_runtime: runtime,
    targets: { [TARGET]: { context: { ...TARGET_CONTEXT, company_id: 'other' } } },
  });
  const marker = `CEREBRO_EXECUTION_HANDOFF_JSON=${JSON.stringify({ job_name: TARGET, payload: {} })}`;
  assert.equal(cross.handleOutcome({ outcome: succeeded(marker) }).reason, 'CROSS_COMPANY_HANDOFF_FORBIDDEN');

  const router = makeRouter(runtime);
  const override = `CEREBRO_EXECUTION_HANDOFF_JSON=${JSON.stringify({ job_name: TARGET, payload: { workspace_root: '/tmp/evil' } })}`;
  assert.equal(router.handleOutcome({ outcome: succeeded(override) }).reason, 'TARGET_PAYLOAD_REJECTED');
  assert.equal(runtime.listForContext(TARGET_CONTEXT).length, 0);
});

test('PROD and Trading target contexts cannot be constructed', () => {
  const { runtime } = tmpRuntime();
  assert.throws(() => new GovernedExecutionHandoffRouterV1({
    job_runtime: runtime,
    targets: { x: { context: { ...TARGET_CONTEXT, environment: 'PROD' } } },
  }), /PREPROD/);
  assert.throws(() => new GovernedExecutionHandoffRouterV1({
    job_runtime: runtime,
    targets: { x: { context: { ...TARGET_CONTEXT, engine_id: 'TRADING-LAB' } } },
  }), /Trading/);
});

test('work-pump child payload receives strict machine handoff protocol but decomposition does not', () => {
  const child = decorateDeepSeekWorkPumpPayloadForHandoffV1({
    input: 'do bounded work',
    instructions: 'bounded',
    __work_pump: { kind: 'BLOCK_SUBTASK' },
  }, { allowed_job_names: [TARGET] });
  assert.match(child.input, /CEREBRO_EXECUTION_HANDOFF_JSON=/);
  assert.match(child.input, new RegExp(TARGET.replaceAll('.', '\\.')));
  const parent = { input: 'decompose', __work_pump: { kind: 'BLOCK_DECOMPOSE' } };
  assert.equal(decorateDeepSeekWorkPumpPayloadForHandoffV1(parent, { allowed_job_names: [TARGET] }), parent);
});

test('contract keeps one queue, no second daemon, no PROD and no Trading', () => {
  assert.equal(GOVERNED_EXECUTION_HANDOFF_ROUTER_V1_CONTRACT.same_durable_queue, true);
  assert.equal(GOVERNED_EXECUTION_HANDOFF_ROUTER_V1_CONTRACT.second_daemon, false);
  assert.equal(GOVERNED_EXECUTION_HANDOFF_ROUTER_V1_CONTRACT.second_scheduler, false);
  assert.equal(GOVERNED_EXECUTION_HANDOFF_ROUTER_V1_CONTRACT.prod_authorized, false);
  assert.equal(GOVERNED_EXECUTION_HANDOFF_ROUTER_V1_CONTRACT.trading_access, false);
});