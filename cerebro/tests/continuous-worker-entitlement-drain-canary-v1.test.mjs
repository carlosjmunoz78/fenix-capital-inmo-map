import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../../.github/workflows/cerebro-cloud-useful-continuous-worker-v1.yml', import.meta.url), 'utf8');

test('continuous PREPROD worker preserves canonical safety and caps self-refill while enterprise is unverified', () => {
  assert.match(workflow, /CEREBRO_REARM_LANE_LIMIT: '16'/);
  assert.match(workflow, /CEREBRO_ENTERPRISE_ENTITLEMENT_VERIFIED: 'false'/);
  assert.match(workflow, /CEREBRO_SUPERVISOR_ENV: PREPROD/);
  assert.match(workflow, /CEREBRO_PROD_WRITE: 'false'/);
  assert.match(workflow, /CEREBRO_TRADING_ACCESS: 'false'/);
  assert.match(workflow, /CEREBRO_ALLOW_PAID_FANOUT: 'NO'/);
  assert.match(workflow, /if \[ "\$CEREBRO_ENTERPRISE_ENTITLEMENT_VERIFIED" != "true" \] && \[ "\$lane" -ge "\$CEREBRO_REARM_LANE_LIMIT" \]/);
  assert.match(workflow, /drain_reason=ENTERPRISE_ENTITLEMENT_UNVERIFIED/);
  assert.match(workflow, /exit 0/);
  assert.match(workflow, /job001-ledger-control-plane-cli-v1\.mjs contract/);
});

test('canary preserves old worker execution and rollback path instead of deleting it', () => {
  assert.match(workflow, /Execute sustained mission-derived lease with V0 fallback/);
  assert.match(workflow, /mission-derived-useful-work-v1\.mjs/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /gh api --method POST/);
});
