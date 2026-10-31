import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../../.github/workflows/cerebro-enterprise-global-fanout-v1.yml', import.meta.url), 'utf8');

test('canonical source changes still trigger validation without automatic heavy fanout', () => {
  assert.equal(workflow.includes('[CEREBRO-LIVE-FANOUT]'), false);
  assert.equal(workflow.includes('contains(github.event.head_commit.message'), false);
  for (const source of [
    '28_MACROFRENTES.md',
    'cerebro/registry/jarvis-project-registry.v1.json',
    'cerebro/runtime/mission-recursive-decomposer-v1.mjs',
    'cerebro/runtime/mission-derived-useful-work-v1.mjs',
  ]) assert.ok(workflow.includes(source), `missing canonical validation trigger source: ${source}`);
  assert.ok(workflow.includes("fanout-a:\n    if: ${{ github.event_name == 'workflow_dispatch' }}"));
  assert.ok(workflow.includes("fanout-b:\n    if: ${{ github.event_name == 'workflow_dispatch' }}"));
  assert.ok(workflow.includes("acceptance:\n    if: ${{ github.event_name == 'workflow_dispatch' }}"));
});

test('manual global burst preserves buffered refill and authority guards', () => {
  assert.ok(workflow.includes('actions: write'));
  assert.ok(workflow.includes('Self-refill next non-overlapping buffered wave'));
  assert.ok(workflow.includes('queue_buffer_cap'));
  assert.ok(workflow.includes("CEREBRO_ALLOW_PAID_FANOUT: 'NO'"));
  assert.ok(workflow.includes("CEREBRO_PROD_WRITE: 'false'"));
  assert.ok(workflow.includes("CEREBRO_TRADING_ACCESS: 'false'"));
  assert.ok(workflow.includes("github.event_name == 'workflow_dispatch' && needs.plan.outputs.has_more == 'true'"));
  assert.ok(workflow.includes('global_capacity_controller_is_primary_admission_owner=true'));
  assert.ok(workflow.includes('automatic_heavy_fanout=false'));
});

test('global fanout concurrency remains offset-aware for explicitly dispatched buffered waves', () => {
  assert.ok(workflow.includes("github.event_name == 'workflow_dispatch' && inputs.offset"));
  assert.ok(workflow.includes("|| 'validation'"));
  assert.ok(workflow.includes('cancel-in-progress: false'));
});
