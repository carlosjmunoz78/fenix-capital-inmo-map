import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeepSeekGovernedHandoffHandlerV1, DEEPSEEK_GOVERNED_HANDOFF_HANDLER_V1_CONTRACT } from '../runtime/deepseek-governed-handoff-handler-v1.mjs';

const TARGET = 'repo.sandbox.public.readonly.v0';

test('wrapper decorates only work-pump leaves and routes exact marker once', async () => {
  const routed = [];
  const router = {
    allowed_job_names: [TARGET],
    handleOutcome({ outcome }) { routed.push(outcome); return { status: 'ENQUEUED', target_job_name: TARGET }; },
    snapshot() { return { status: 'READY' }; },
  };
  let seenPayload;
  const base = async ({ payload }) => {
    seenPayload = payload;
    return { output_text: `done\nCEREBRO_EXECUTION_HANDOFF_JSON={"job_name":"${TARGET}","payload":{}}` };
  };
  base.snapshot = () => ({ status: 'READY', reserved_spend_eur: 0, calls: 0 });
  const handler = createDeepSeekGovernedHandoffHandlerV1({ base_handler: base, handoff_router: router });
  const result = await handler({
    job: { job_id: 'j1', name: 'model.deepseek.agent', context: { company_id: 'fenix', engine_id: 'BOOST-001', environment: 'PREPROD', version: 'v1' } },
    payload: { input: 'task', instructions: 'bounded', __work_pump: { kind: 'BLOCK_SUBTASK' } },
  });
  assert.match(seenPayload.input, /GOVERNED_EXECUTION_HANDOFF_PROTOCOL_V1/);
  assert.equal(routed.length, 1);
  assert.equal(result.governed_execution_handoff.status, 'ENQUEUED');
  const snapshot = handler.snapshot();
  assert.equal(snapshot.handoff_enqueued, 1);
  assert.equal(snapshot.reserved_spend_eur, 0);
  assert.equal(snapshot.calls, 0);
  assert.equal(snapshot.governed_handoff_wrapper, 'V1');
  assert.equal(snapshot.governed_execution_handoff_router.status, 'READY');
});

test('HUMAN_REQUIRED never creates an execution handoff', async () => {
  const router = {
    allowed_job_names: [TARGET],
    handleOutcome() { throw new Error('must not be called'); },
    snapshot() { return {}; },
  };
  const base = async () => ({ status: 'HUMAN_REQUIRED', reason: 'MONEY_LIMIT' });
  base.snapshot = () => ({ reserved_spend_eur: 0 });
  const handler = createDeepSeekGovernedHandoffHandlerV1({ base_handler: base, handoff_router: router });
  const result = await handler({ job: { job_id: 'j2' }, payload: { input: 'task', __work_pump: { kind: 'BLOCK_SUBTASK' } } });
  assert.equal(result.governed_execution_handoff.status, 'NO_HANDOFF');
  assert.equal(handler.snapshot().reserved_spend_eur, 0);
  assert.equal(handler.snapshot().handoff_handled, 0);
});

test('contract preserves base telemetry, one queue, and forbids direct PROD/Trading execution', () => {
  assert.equal(DEEPSEEK_GOVERNED_HANDOFF_HANDLER_V1_CONTRACT.preserves_base_telemetry_shape, true);
  assert.equal(DEEPSEEK_GOVERNED_HANDOFF_HANDLER_V1_CONTRACT.same_durable_queue, true);
  assert.equal(DEEPSEEK_GOVERNED_HANDOFF_HANDLER_V1_CONTRACT.second_daemon, false);
  assert.equal(DEEPSEEK_GOVERNED_HANDOFF_HANDLER_V1_CONTRACT.prod_authorized, false);
  assert.equal(DEEPSEEK_GOVERNED_HANDOFF_HANDLER_V1_CONTRACT.trading_access, false);
});