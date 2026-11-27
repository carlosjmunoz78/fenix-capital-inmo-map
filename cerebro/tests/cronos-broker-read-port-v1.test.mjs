import assert from 'node:assert/strict';
import test from 'node:test';
import { createCronosBrokerReadPortV1 } from '../runtime/cronos-broker-read-port-v1.mjs';
import { SOURCE } from '../runtime/cronos-workflow-read-port-v1.mjs';

const evidenceResponse = () => Response.json({
  success: true,
  result: {
    status: 'complete',
    success: true,
    error: null,
    versionId: SOURCE.workflow_version,
    step_count: 3,
    steps: Array.from({ length: 3 }, () => ({ attempts: [{}], output: '{}' })),
  },
});

test('requests only the fixed broker resource through the host transport and normalizes evidence', async () => {
  const { signal } = new AbortController();
  let calls = 0;
  const readback = createCronosBrokerReadPortV1({ request: async (request) => {
    calls++;
    assert.deepEqual(request, {
      method: 'GET', path: '/v1/cronos/evidence/live005', redirect: 'manual', cache: 'no-store', signal,
    });
    return evidenceResponse();
  } });
  const result = await readback(SOURCE, { signal });
  assert.equal(calls, 1);
  assert.deepEqual(result.source, SOURCE);
  assert.equal(result.provider.steps.length, 3);
  assert.equal(result.provider.steps[0].attempt_count, 1);
});

test('missing transport, wrong resource, and cancelled jobs fail before sending', async () => {
  assert.throws(() => createCronosBrokerReadPortV1(), /MACHINE_TRANSPORT_REQUIRED/);
  const readback = createCronosBrokerReadPortV1({ request: () => assert.fail('network call') });
  await assert.rejects(readback({ ...SOURCE, instance_id: 'different' }), /SOURCE_DENIED/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(readback(SOURCE, { signal: controller.signal }), /CRONOS_ABORTED/);
});

test('rejects Access denial, redirect, replay denial, and modified response version', async () => {
  for (const status of [302, 403, 409]) {
    const readback = createCronosBrokerReadPortV1({ request: () => new Response(null, { status }) });
    await assert.rejects(readback(SOURCE), /READ_DENIED/);
  }
  const modified = await evidenceResponse().json();
  modified.result.versionId = 'wrong';
  const readback = createCronosBrokerReadPortV1({ request: () => Response.json(modified) });
  await assert.rejects(readback(SOURCE), /TERMINAL_DENIED/);
});

test('sanitizes transport errors and rejects a response after cancellation', async () => {
  const failing = createCronosBrokerReadPortV1({ request: () => { throw new Error('private detail'); } });
  await assert.rejects(failing(SOURCE), { message: 'CRONOS_BROKER_READ_FAILED' });
  const controller = new AbortController();
  const cancelled = createCronosBrokerReadPortV1({ request: () => {
    controller.abort();
    return evidenceResponse();
  } });
  await assert.rejects(cancelled(SOURCE, { signal: controller.signal }), /CRONOS_ABORTED/);
});
