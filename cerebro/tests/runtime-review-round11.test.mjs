import test from 'node:test';
import assert from 'node:assert/strict';
import { SharedRuntime } from '../runtime/runtime.mjs';

test('SharedRuntime does not expose global inspection or queue mutation methods', async () => {
  const runtime = new SharedRuntime();
  for (const key of ['events','jobs','inspectContext','inspectEvents','claimJob','completeJob','failJob']) {
    assert.equal(typeof runtime[key], 'undefined');
  }

  runtime.registerEngine({
    engine_id: 'APP-001',
    version: '0.1.0',
    handler: ({ jobs, events }) => {
      jobs.enqueue({ name: 'safe-job', idempotency_key: 'safe-job' });
      events.publish({ type: 'SAFE_EVENT', idempotency_key: 'safe-event' });
      const claimed = jobs.claim();
      return { claimed_company: claimed.context.company_id, event_count: events.list().length };
    }
  });

  const result = await runtime.execute({
    company_id: 'fenix-capital',
    engine_id: 'APP-001',
    version: '0.1.0',
    command: 'surface-check'
  });
  assert.equal(result.status, 'OK');
  assert.equal(result.result.claimed_company, 'fenix-capital');
  assert.equal(result.result.event_count, 1);
});
