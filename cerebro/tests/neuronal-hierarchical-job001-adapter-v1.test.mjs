import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NeuronalHierarchicalJob001SourceV1,
  NEURONAL_HIERARCHICAL_JOB001_ADAPTER_V1_CONTRACT,
  NEURONAL_QUEUE_HIERARCHY_V1,
  neuronalJob001ContextV1,
} from '../runtime/neuronal-hierarchical-job001-adapter-v1.mjs';

class FakeRuntime {
  constructor() { this.jobs = []; this.i = 0; }
  enqueue(spec) {
    const duplicate = this.jobs.find(job =>
      JSON.stringify(job.context) === JSON.stringify(spec.context) && job.idempotency_key === spec.idempotency_key);
    if (duplicate) return { accepted: false, duplicate: true, job: duplicate };
    const job = { ...spec, job_id: `j${++this.i}`, status: 'QUEUED', created_at_ms: this.i, result: null };
    this.jobs.push(job);
    return { accepted: true, duplicate: false, job };
  }
  listForContext(context) { return this.jobs.filter(job => JSON.stringify(job.context) === JSON.stringify(context)); }
}

const queueContext = neuronalJob001ContextV1();
const modelContext = Object.freeze({ company_id: 'fenix', engine_id: 'BOOST-001', environment: 'PREPROD', version: 'work-pump-v3-adaptive' });
const fixture = Object.freeze([
  Object.freeze({ submission_id:'FND-001', requirement_id:null, domain:'00_FOUNDATION', phase:'audit', title:'freeze state', priority:'P0', horizon:'NOW', dependencies:[], deepseek_allowed:false }),
  Object.freeze({ submission_id:'FND-002', requirement_id:null, domain:'00_FOUNDATION', phase:'contract', title:'contract', priority:'P0', horizon:'NOW', dependencies:['FND-001'], deepseek_allowed:true }),
  Object.freeze({ submission_id:'NREQ-0001-A_AUDIT', requirement_id:'NREQ-0001', domain:'01', phase:'audit', phase_code:'A_AUDIT', title:'audit req', priority:'P0', horizon:'NOW', dependencies:['FND-002'], deepseek_allowed:true }),
  Object.freeze({ submission_id:'NREQ-0001-B_CONTRACT', requirement_id:'NREQ-0001', domain:'01', phase:'contract', phase_code:'B_CONTRACT', title:'contract req', priority:'P0', horizon:'NOW', dependencies:['NREQ-0001-A_AUDIT'], deepseek_allowed:true }),
  Object.freeze({ submission_id:'NREQ-0001-F_BUILD', requirement_id:'NREQ-0001', domain:'01', phase:'implementation', phase_code:'F_BUILD', title:'build req', priority:'P0', horizon:'NOW', dependencies:['NREQ-0001-B_CONTRACT'], deepseek_allowed:true }),
]);

function source(runtime = new FakeRuntime()) {
  return { runtime, source: new NeuronalHierarchicalJob001SourceV1({
    job_runtime: runtime, queue_context: queueContext, model_context: modelContext, submissions: fixture,
    target_active: 4, max_enqueue_per_reconcile: 4, model_active_cap: 2, model_enabled: true,
  }) };
}

test('declares exactly 14 logical queues over one durable queue', () => {
  assert.equal(NEURONAL_QUEUE_HIERARCHY_V1.length, 14);
  assert.equal(NEURONAL_HIERARCHICAL_JOB001_ADAPTER_V1_CONTRACT.logical_queue_count, 14);
  assert.equal(NEURONAL_HIERARCHICAL_JOB001_ADAPTER_V1_CONTRACT.second_queue, false);
  assert.equal(NEURONAL_HIERARCHICAL_JOB001_ADAPTER_V1_CONTRACT.second_scheduler, false);
  assert.equal(NEURONAL_HIERARCHICAL_JOB001_ADAPTER_V1_CONTRACT.second_daemon, false);
});

test('normal NEURONAL JOB-001 queue may fill verified global 180 while DeepSeek remains hard-capped at 8', () => {
  assert.equal(NEURONAL_HIERARCHICAL_JOB001_ADAPTER_V1_CONTRACT.queue_active_cap_max, 180);
  assert.equal(NEURONAL_HIERARCHICAL_JOB001_ADAPTER_V1_CONTRACT.model_active_cap_max, 8);
  const runtime = new FakeRuntime();
  const submissions = Array.from({ length: 180 }, (_, i) => Object.freeze({
    submission_id: `AUD-${String(i).padStart(3,'0')}`,
    requirement_id: `REQ-${i}`,
    domain: '01',
    phase: 'audit',
    phase_code: 'A_AUDIT',
    title: `audit ${i}`,
    priority: 'P0',
    horizon: 'NOW',
    dependencies: [],
    deepseek_allowed: false,
  }));
  const s = new NeuronalHierarchicalJob001SourceV1({
    job_runtime: runtime, queue_context: queueContext, model_context: modelContext, submissions,
    target_active: 180, max_enqueue_per_reconcile: 180, model_active_cap: 8, model_enabled: true,
  });
  const snap = s.reconcile();
  assert.equal(snap.accepted_this_reconcile, 180);
  assert.equal(snap.active_jobs, 180);
  assert.equal(snap.active_model_jobs, 0);
  assert.equal(snap.model_active_cap, 8);
});

test('reconcile releases only dependency-ready work and progresses hierarchy', () => {
  const { runtime, source: s } = source();
  let snap = s.reconcile();
  assert.equal(snap.accepted_this_reconcile, 1);
  assert.equal(runtime.jobs[0].payload.__neuronal.submission_id, 'FND-001');
  runtime.jobs[0].status = 'SUCCEEDED'; runtime.jobs[0].result = { submission_completed: true };

  snap = s.reconcile();
  const f2 = runtime.jobs.find(job => job.payload?.__neuronal?.submission_id === 'FND-002');
  assert.equal(f2.name, 'model.deepseek.agent');
  f2.status = 'SUCCEEDED'; f2.result = { output_text: 'contract work product' };

  snap = s.reconcile();
  const audit = runtime.jobs.find(job => job.payload?.__neuronal?.submission_id === 'NREQ-0001-A_AUDIT');
  assert.equal(audit.name, 'neuronal.audit.evidence.v1');
  audit.status = 'SUCCEEDED'; audit.result = { submission_completed: true };

  snap = s.reconcile();
  const contract = runtime.jobs.find(job => job.payload?.__neuronal?.submission_id === 'NREQ-0001-B_CONTRACT');
  assert.equal(contract.name, 'model.deepseek.agent');
  contract.status = 'SUCCEEDED'; contract.result = { output_text: 'spec' };

  snap = s.reconcile();
  const build = runtime.jobs.find(job => job.payload?.__neuronal?.submission_id === 'NREQ-0001-F_BUILD');
  assert.equal(build.payload.__neuronal.execution_mode, 'MODEL_BUILD_PLAN');
  build.status = 'SUCCEEDED'; build.result = { output_text: 'implementation plan only' };

  snap = s.reconcile();
  assert.equal(snap.completed_submissions, 4);
  assert.equal(snap.waiting_capability, 1);
  assert.equal(snap.queues.Q60_BUILD.waiting_capability, 1);
});

test('HUMAN_REQUIRED money limit never counts as completion', () => {
  const { runtime, source: s } = source();
  s.reconcile();
  const first = runtime.jobs[0]; first.status = 'SUCCEEDED'; first.result = { submission_completed: true };
  s.reconcile();
  const model = runtime.jobs.find(job => job.name === 'model.deepseek.agent');
  model.status = 'SUCCEEDED'; model.result = { status: 'HUMAN_REQUIRED', reason: 'MONEY_LIMIT' };
  const snap = s.snapshot();
  assert.equal(snap.completed_submissions, 1);
  assert.equal(snap.human_required, 1);
});
