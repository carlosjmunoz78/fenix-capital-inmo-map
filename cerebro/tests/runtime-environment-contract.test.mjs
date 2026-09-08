import test from 'node:test';
import assert from 'node:assert/strict';
import { SharedRuntime } from '../runtime/runtime.mjs';

test('RUNTIME-001 V0 accepts PREPROD only', () => {
  const runtime = new SharedRuntime({ environment: 'PREPROD' });
  assert.equal(runtime.environment, 'PREPROD');
});

test('RUNTIME-001 V0 rejects every non-PREPROD environment spelling', () => {
  for (const environment of ['PROD', 'prod', 'Production', 'PRODUCTION', 'preprod', 'DEV', 'TEST', 'STAGING', '']) {
    assert.throws(
      () => new SharedRuntime({ environment }),
      /PREPROD|environment/i,
      `expected environment ${JSON.stringify(environment)} to be rejected`
    );
  }
});
