import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../../.github/workflows/cerebro-cloud-useful-continuous-worker-v1.yml', import.meta.url), 'utf8');

test('continuous PREPROD worker keeps all 68 canonical lanes rearmed under verified Enterprise 360', () => {
  assert.match(workflow, /CEREBRO_REARM_LANE_LIMIT: '68'/);
  assert.match(workflow, /CEREBRO_ENTERPRISE_ENTITLEMENT_VERIFIED: 'true'/);
  assert.match(workflow, /CEREBRO_MISSION_LANE_COUNT: '68'/);
  assert.match(workflow, /CEREBRO_INITIAL_CONCURRENCY: '360'/);
  assert.match(workflow, /CEREBRO_MAX_CONCURRENCY: '360'/);
  assert.match(workflow, /CEREBRO_MAX_PER_COMPANY: '360'/);
  assert.match(workflow, /CEREBRO_MAX_DEEPSEEK_CONCURRENCY: '8'/);
  assert.match(workflow, /CEREBRO_MAX_REPO_WRITE_CONCURRENCY: '1'/);
  assert.match(workflow, /CEREBRO_SUPERVISOR_ENV: PREPROD/);
  assert.match(workflow, /CEREBRO_PROD_WRITE: 'false'/);
  assert.match(workflow, /CEREBRO_TRADING_ACCESS: 'false'/);
  assert.match(workflow, /CEREBRO_ALLOW_PAID_FANOUT: 'NO'/);
  assert.match(workflow, /Self-refill sustained lane while a useful source is available/);
  assert.match(workflow, /continuous_source_available=true/);
  assert.match(workflow, /post_dag_source=continuous-useful-work-factory-v0/);
  assert.match(workflow, /ENTERPRISE_CAPACITY_GUARD/);
  assert.match(workflow, /job001-ledger-control-plane-cli-v1\.mjs contract/);
});

test('Mission DAG exhaustion switches to deterministic useful maintenance instead of draining the lane', () => {
  assert.match(workflow, /Execute sustained mission lease with continuous useful fallback/);
  assert.match(workflow, /mission-derived-useful-work-v1\.mjs/);
  assert.match(workflow, /continuous-useful-work-factory-v0\.mjs/);
  assert.match(workflow, /mission_exhausted=true/);
  assert.match(workflow, /maintenance_units=/);
  assert.doesNotMatch(workflow, /UNIQUE_MISSION_BACKLOG_EXHAUSTED/);
  assert.doesNotMatch(workflow, /if \[ "\$exhausted" = "true" \]/);
  assert.match(workflow, /gh api --method POST/);
});

test('continuous fallback is real bounded work, not idle runner padding', () => {
  assert.doesNotMatch(workflow, /\bsleep\s+[0-9]+/);
  assert.match(workflow, /CEREBRO_MAX_UNITS_PER_LEASE: '8192'/);
  assert.match(workflow, /test "\$CEREBRO_MAX_UNITS_PER_LEASE" -ge 256/);
  assert.match(workflow, /test "\$CEREBRO_MAX_UNITS_PER_LEASE" -le 8192/);
  assert.match(workflow, /CEREBRO_MAINTENANCE_INNER_PARALLELISM: '4'/);
  assert.match(workflow, /CEREBRO_WORKER_LEASE_SECONDS: '420'/);
  assert.match(workflow, /artifacts\/continuous-work-v0/);
});

test('verified Enterprise entitlement does not expand sensitive authorities', () => {
  assert.match(workflow, /CEREBRO_ENTERPRISE_ENTITLEMENT_VERIFIED: 'true'/);
  assert.match(workflow, /CEREBRO_MAX_DEEPSEEK_CONCURRENCY: '8'/);
  assert.match(workflow, /CEREBRO_MAX_REPO_WRITE_CONCURRENCY: '1'/);
  assert.match(workflow, /CEREBRO_ALLOW_PAID_FANOUT: 'NO'/);
  assert.match(workflow, /CEREBRO_PROD_WRITE: 'false'/);
  assert.match(workflow, /CEREBRO_TRADING_ACCESS: 'false'/);
});
