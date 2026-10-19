import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DurableJobRuntimeV1} from '../runtime/durable-job-runtime-v1.mjs';
import {buildFastEvolutionPlan} from '../runtime/cerebro-fast-evolution-planner-v1.mjs';
import {enqueueFastEvolutionPlan, runFastEvolutionIngress} from '../runtime/cerebro-fast-evolution-job001-bridge-v1.mjs';

function tmpdir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-fast-evolution-')); }

const signals = [
  {id:'security-1',type:'SECURITY_FINDING'},
  {id:'error-1',type:'ERROR'},
  {id:'human-1',type:'HUMAN_FEEDBACK'},
  {id:'perf-1',type:'PERFORMANCE_REGRESSION'},
  {id:'cap-1',type:'NEW_CAPABILITY'},
  {id:'market-1',type:'MARKET_SIGNAL'}
];

test('fast plan dispatches only the active bounded wave through existing durable JOB-001', () => {
  const dir = tmpdir();
  try {
    const runtime = new DurableJobRuntimeV1({file_path:path.join(dir,'jobs.journal'), environment:'PREPROD'});
    const plan = buildFastEvolutionPlan({signals, now:'2026-10-19T00:20:00Z'});
    const dispatch = enqueueFastEvolutionPlan({job_runtime:runtime, plan, company_id:'fenix', now_ms:1000});
    assert.equal(plan.active_wave.length, 5);
    assert.equal(dispatch.accepted_total, 5);
    assert.equal(dispatch.duplicate_total, 0);
    const jobs = runtime.listForContext({company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'1.0.0'});
    assert.equal(jobs.length, 5);
    assert.ok(jobs.every(job => job.name === 'CEREBRO_FAST_EVOLUTION_MICROCYCLE_V1'));
    assert.ok(jobs.every(job => job.payload.old_vs_new_required === true && job.payload.tribunal_required === true));
    assert.ok(jobs.every(job => job.payload.prod_authorized === false && job.payload.prod_write_authorized === false));
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('JOB-001 dispatch is idempotent and duplicate microcycles are not re-enqueued', () => {
  const dir = tmpdir();
  try {
    const runtime = new DurableJobRuntimeV1({file_path:path.join(dir,'jobs.journal'), environment:'PREPROD'});
    const plan = buildFastEvolutionPlan({signals:signals.slice(0,3), now:'2026-10-19T00:20:01Z'});
    const first = enqueueFastEvolutionPlan({job_runtime:runtime, plan, company_id:'fenix', now_ms:2000});
    const second = enqueueFastEvolutionPlan({job_runtime:runtime, plan, company_id:'fenix', now_ms:3000});
    assert.equal(first.accepted_total, 3);
    assert.equal(second.accepted_total, 0);
    assert.equal(second.duplicate_total, 3);
    assert.equal(runtime.listForContext({company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'1.0.0'}).length, 3);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('security and regression work reaches lower numeric JOB-001 priority than lower-risk work', () => {
  const dir = tmpdir();
  try {
    const runtime = new DurableJobRuntimeV1({file_path:path.join(dir,'jobs.journal'), environment:'PREPROD'});
    const plan = buildFastEvolutionPlan({signals:[
      {id:'market',type:'MARKET_SIGNAL'},
      {id:'security',type:'SECURITY_FINDING'},
      {id:'human',type:'HUMAN_FEEDBACK'}
    ], now:'2026-10-19T00:20:02Z'});
    enqueueFastEvolutionPlan({job_runtime:runtime, plan, company_id:'fenix', now_ms:4000});
    const claimed = runtime.claim({context:{company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'1.0.0'},worker_id:'test-worker',now_ms:5000,lease_ms:10000});
    assert.equal(claimed.payload.task.signal_type, 'SECURITY_FINDING');
    assert.equal(claimed.priority, 0);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});

test('one-call ingress persists the fast wave and never grants PROD/spend/trading authority', () => {
  const dir = tmpdir();
  try {
    const result = runFastEvolutionIngress({company_root:dir,company_id:'fenix',signals:signals.slice(0,2),now_ms:6000});
    assert.equal(result.dispatch.status, 'FAST_EVOLUTION_DISPATCHED_PREPROD');
    assert.equal(result.dispatch.prod_authorized, false);
    assert.equal(result.dispatch.prod_write_authorized, false);
    assert.equal(result.dispatch.spend_authorized, false);
    assert.equal(result.dispatch.trading_access, false);
    assert.equal(result.dispatch.additional_cost_eur, 0);
    assert.ok(fs.existsSync(result.journal_path));
    assert.ok(result.operation_count >= 2);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
