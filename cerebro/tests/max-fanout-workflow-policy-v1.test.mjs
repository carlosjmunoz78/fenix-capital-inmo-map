import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../../.github/workflows/cerebro-max-fanout-24h-v1.yml', import.meta.url), 'utf8');

test('PR validation does not consume the 25 evidence workers', () => {
  assert.ok(workflow.includes("evidence-workers:\n    if: ${{ github.event_name != 'pull_request' }}"));
  assert.ok(workflow.includes('PRs run contract/policy validation only'));
});

test('DeepSeek fanout is explicit opt-in only and remains capped at 8', () => {
  assert.ok(workflow.includes('default: false'));
  assert.ok(workflow.includes("github.event_name == 'workflow_dispatch' && inputs.run_deepseek == true"));
  assert.equal(workflow.includes("github.event_name == 'push' && github.ref == 'refs/heads/main'"), false);
  assert.ok(workflow.includes('max-parallel: 8'));
  assert.ok(workflow.includes("CEREBRO_ALLOW_PAID_FANOUT: 'YES'"));
  assert.ok(workflow.includes('auto recharge=false'));
});
