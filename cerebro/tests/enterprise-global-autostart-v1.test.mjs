import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../../.github/workflows/cerebro-enterprise-global-fanout-v1.yml', import.meta.url), 'utf8');

test('global fanout autostarts from canonical portfolio sources without manual commit marker', () => {
  assert.equal(workflow.includes('[CEREBRO-LIVE-FANOUT]'), false);
  assert.equal(workflow.includes('contains(github.event.head_commit.message'), false);
  for (const source of [
    '28_MACROFRENTES.md',
    'cerebro/registry/jarvis-project-registry.v1.json',
    'cerebro/runtime/mission-recursive-decomposer-v1.mjs',
    'cerebro/runtime/mission-derived-useful-work-v1.mjs',
  ]) assert.ok(workflow.includes(source), `missing canonical trigger source: ${source}`);
});

test('global autostart preserves buffered continuous refill and authority guards', () => {
  assert.ok(workflow.includes('actions: write'));
  assert.ok(workflow.includes('Self-refill next non-overlapping buffered wave'));
  assert.ok(workflow.includes('queue_buffer_cap'));
  assert.ok(workflow.includes("CEREBRO_ALLOW_PAID_FANOUT: 'NO'"));
  assert.ok(workflow.includes("CEREBRO_PROD_WRITE: 'false'"));
  assert.ok(workflow.includes("CEREBRO_TRADING_ACCESS: 'false'"));
  assert.ok(workflow.includes("github.event_name != 'pull_request' && needs.plan.outputs.has_more == 'true'"));
});
