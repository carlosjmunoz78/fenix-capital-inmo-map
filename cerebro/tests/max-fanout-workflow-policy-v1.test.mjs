import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../../.github/workflows/cerebro-max-fanout-24h-v1.yml',import.meta.url),'utf8');
const neuronal=fs.readFileSync(new URL('../../.github/workflows/cerebro-neuronal-superparallel-v1.yml',import.meta.url),'utf8');

test('push schedule and PR validate only; legacy portfolio burst requires explicit dispatch',()=>{
  assert.ok(workflow.includes("portfolio-plan:\n    if: ${{ github.event_name == 'workflow_dispatch' }}"));
  assert.ok(workflow.includes("evidence-workers:\n    if: ${{ github.event_name == 'workflow_dispatch' && needs.portfolio-plan.outputs.planned != '0' }}"));
  assert.ok(workflow.includes('push_schedule_pr_validation_only=true'));
  assert.ok(workflow.includes('portfolio_heavy_fanout_requires_workflow_dispatch=true'));
  assert.ok(workflow.includes('global_capacity_controller_is_primary_admission_owner=true'));
});

test('portfolio fanout is capped at 250 and plans only non-empty shards',()=>{
  assert.ok(workflow.includes('max-parallel: 250'));
  assert.ok(workflow.includes('const shards = Math.min(requested,total);'));
  assert.ok(workflow.includes('if (include.length > 250)'));
  assert.ok(workflow.includes("empty_capacity_jobs=false"));
});

test('JARVIS superagent and interface are P0 and receive the largest desired share',()=>{
  assert.ok(workflow.includes('W13:30, W21:30'));
  assert.ok(workflow.includes("W13:'P0', W21:'P0'"));
  assert.ok(workflow.includes("W10:'P0'"));
  assert.ok(workflow.includes("W11:'P0'"));
  assert.ok(workflow.includes("W15:'P0'"));
  assert.ok(workflow.includes("W16:'P0'"));
  assert.ok(workflow.includes('priority_p0=JARVIS_SUPERAGENT+JARVIS_INTERFACE+KNOWLEDGE+AGENTS+MODEL_ROUTER+SKILL_ENGINE'));
});

test('actuation dependencies are P1, factories P2 and business fronts fall through to P3',()=>{
  assert.ok(workflow.includes("W01:'P1'"));
  assert.ok(workflow.includes("W20:'P1'"));
  assert.ok(workflow.includes("W22:'P2'"));
  assert.ok(workflow.includes("const level = priority[block.id] ?? 'P3';"));
});

test('NEURONAL preserves fair-share 100 logical units with 4x batching and self-refills with 100',()=>{
  assert.ok(neuronal.includes('max-parallel: 25'));
  assert.ok(neuronal.includes("CEREBRO_NEURONAL_INNER_PARALLELISM: '4'"));
  assert.ok(neuronal.includes("default: '100'"));
  assert.ok(neuronal.includes('"units":"100"'));
  assert.ok(neuronal.includes('enterprise_neuronal_logical_fair_share=100'));
  assert.ok(neuronal.includes('enterprise_neuronal_physical_runner_cap=25'));
  assert.ok(neuronal.includes('physical_runner_savings_at_100_logical=75'));
});

test('legacy allocation metadata remains bounded by the verified 360 live cap',()=>{
  assert.ok(workflow.includes('portfolio_parallel_cap=250'));
  assert.ok(workflow.includes('neuronal_reserved_parallel_cap=100'));
  assert.ok(workflow.includes('control_reserve=10'));
  assert.ok(workflow.includes('enterprise_live_cap=360'));
  assert.equal(250+100+10,360);
});

test('macOS entitlement is recorded but empty macOS jobs are not fabricated',()=>{
  assert.ok(workflow.includes('macos_live_cap=50'));
  assert.ok(workflow.includes('no empty capacity jobs'));
});

test('DeepSeek fanout is explicit opt-in only and remains capped at 8',()=>{
  assert.ok(neuronal.includes('default: false'));
  assert.ok(neuronal.includes("github.event_name == 'workflow_dispatch' && inputs.run_deepseek"));
  assert.equal(neuronal.includes("github.event_name == 'push' && github.ref == 'refs/heads/main'"),false);
  assert.ok(neuronal.includes('max-parallel: 8'));
  assert.ok(neuronal.includes("CEREBRO_ALLOW_PAID_FANOUT: 'YES'"));
});
