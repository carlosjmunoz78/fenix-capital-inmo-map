import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../../.github/workflows/cerebro-cloud-useful-continuous-worker-v1.yml', import.meta.url), 'utf8');

test('continuous PREPROD worker rearms all 68 canonical lanes only while verified unique backlog remains', () => {
  assert.match(workflow, /CEREBRO_REARM_LANE_LIMIT: '68'/);
  assert.match(workflow, /CEREBRO_ENTERPRISE_ENTITLEMENT_VERIFIED: 'true'/);
  assert.match(workflow, /CEREBRO_MISSION_LANE_COUNT: '68'/);
  assert.match(workflow, /CEREBRO_INITIAL_CONCURRENCY: '180'/);
  assert.match(workflow, /CEREBRO_MAX_CONCURRENCY: '180'/);
  assert.match(workflow, /CEREBRO_MAX_PER_COMPANY: '180'/);
  assert.match(workflow, /CEREBRO_MAX_DEEPSEEK_CONCURRENCY: '8'/);
  assert.match(workflow, /CEREBRO_MAX_REPO_WRITE_CONCURRENCY: '1'/);
  assert.match(workflow, /CEREBRO_SUPERVISOR_ENV: PREPROD/);
  assert.match(workflow, /CEREBRO_PROD_WRITE: 'false'/);
  assert.match(workflow, /CEREBRO_TRADING_ACCESS: 'false'/);
  assert.match(workflow, /CEREBRO_ALLOW_PAID_FANOUT: 'NO'/);
  assert.match(workflow, /Self-refill sustained lane only while unique backlog remains/);
  assert.match(workflow, /UNIQUE_MISSION_BACKLOG_EXHAUSTED/);
  assert.match(workflow, /ENTERPRISE_CAPACITY_GUARD/);
  assert.match(workflow, /job001-ledger-control-plane-cli-v1\.mjs contract/);
});

test('canary preserves existing worker path and prevents fake infinite duplicate work', () => {
  assert.match(workflow, /Execute sustained unique mission-derived lease with V0 fallback/);
  assert.match(workflow, /mission-derived-useful-work-v1\.mjs/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /gh api --method POST/);
  assert.match(workflow, /atomic_count/);
  assert.match(workflow, /linear=\$\(\(current \* CEREBRO_MISSION_LANE_COUNT \+ lane\)\)/);
  assert.doesNotMatch(workflow, /current=0; else current=/);
  assert.match(workflow, /if \[ "\$exhausted" = "true" \]/);
});

test('verified Enterprise entitlement does not expand sensitive authorities', () => {
  assert.match(workflow, /CEREBRO_ENTERPRISE_ENTITLEMENT_VERIFIED: 'true'/);
  assert.match(workflow, /CEREBRO_MAX_DEEPSEEK_CONCURRENCY: '8'/);
  assert.match(workflow, /CEREBRO_MAX_REPO_WRITE_CONCURRENCY: '1'/);
  assert.match(workflow, /CEREBRO_ALLOW_PAID_FANOUT: 'NO'/);
  assert.match(workflow, /CEREBRO_PROD_WRITE: 'false'/);
  assert.match(workflow, /CEREBRO_TRADING_ACCESS: 'false'/);
});
