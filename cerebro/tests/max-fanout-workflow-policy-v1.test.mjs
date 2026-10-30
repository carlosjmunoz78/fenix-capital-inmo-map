import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../../.github/workflows/cerebro-max-fanout-24h-v1.yml',import.meta.url),'utf8');
const neuronal=fs.readFileSync(new URL('../../.github/workflows/cerebro-neuronal-superparallel-v1.yml',import.meta.url),'utf8');

test('PR validation does not consume the 125 portfolio workers',()=>{
  assert.ok(workflow.includes("evidence-workers:\n    if: ${{ github.event_name != 'pull_request' }}"));
  assert.ok(workflow.includes('PRs run contract/policy validation only; no 125-worker portfolio fanout'));
});

test('portfolio fanout covers 25 blocks x 5 distinct shards with 125 cap',()=>{
  assert.ok(workflow.includes('max-parallel: 125'));
  assert.ok(workflow.includes('shard: [0,1,2,3,4]'));
  assert.ok(workflow.includes('--shards=5'));
  assert.ok(workflow.includes('portfolio_blocks=25'));
  assert.ok(workflow.includes('portfolio_parallel_cap=125'));
});

test('NEURONAL is fair-share capped at 50 and self-refills with 50',()=>{
  assert.ok(neuronal.includes('max-parallel: 50'));
  assert.ok(neuronal.includes("default: '50'"));
  assert.ok(neuronal.includes('"units":"50"'));
  assert.ok(neuronal.includes('enterprise_neuronal_fair_share_max_parallel=50'));
});

test('shared Enterprise allocation preserves 5 control slots under the 180 live cap',()=>{
  assert.ok(workflow.includes('portfolio_parallel_cap=125'));
  assert.ok(workflow.includes('neuronal_reserved_parallel_cap=50'));
  assert.ok(workflow.includes('control_reserve=5'));
  assert.ok(workflow.includes('enterprise_live_cap=180'));
});

test('DeepSeek fanout is explicit opt-in only and remains capped at 8',()=>{
  assert.ok(workflow.includes('default: false'));
  assert.ok(workflow.includes("github.event_name == 'workflow_dispatch' && inputs.run_deepseek == true"));
  assert.equal(workflow.includes("github.event_name == 'push' && github.ref == 'refs/heads/main'"),false);
  assert.ok(workflow.includes('max-parallel: 8'));
  assert.ok(workflow.includes("CEREBRO_ALLOW_PAID_FANOUT: 'YES'"));
  assert.ok(workflow.includes('auto recharge=false'));
});
