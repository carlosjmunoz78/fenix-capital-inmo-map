import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DurableJobRuntimeV1} from '../runtime/durable-job-runtime-v1.mjs';
import {
  WATCH_CADENCE_V1,
  buildChannelIntelligenceWatchPlan,
  enqueueChannelIntelligenceWatchPlan,
  runChannelIntelligenceWatchIngress,
  CHANNEL_INTELLIGENCE_JOB001_BRIDGE_V1_CONTRACT
} from '../marketing/channel-intelligence-job001-bridge-v1.mjs';

const company_id = 'fenix-capital';
const channels = ['instagram','facebook','linkedin'];
const site_ref = 'site:fenixcapital:official';
const now_ms = Date.parse('2026-10-21T12:00:00.000Z');

function tempRoot() {
  return mkdtempSync(path.join(tmpdir(), 'cerebro-channel-intelligence-'));
}

test('watch cadence prioritizes fast trend observation without creating a new scheduler', () => {
  assert.equal(WATCH_CADENCE_V1.TREND_RADAR.interval_ms, 3 * 60 * 60 * 1000);
  assert.equal(WATCH_CADENCE_V1.CHANNEL_HEALTH.interval_ms, 6 * 60 * 60 * 1000);
  assert.equal(CHANNEL_INTELLIGENCE_JOB001_BRIDGE_V1_CONTRACT.existing_job_runtime, 'JOB-001');
  assert.equal(CHANNEL_INTELLIGENCE_JOB001_BRIDGE_V1_CONTRACT.new_scheduler_created, false);
  assert.equal(CHANNEL_INTELLIGENCE_JOB001_BRIDGE_V1_CONTRACT.physical_collectors_bound, false);
});

test('plan schedules channel and global intelligence but blocks web visual radar until official baseline is stable', () => {
  const plan = buildChannelIntelligenceWatchPlan({company_id, channels, site_ref, official_web_baseline_ready: false, now_ms});
  assert.equal(plan.environment, 'PREPROD');
  assert.equal(plan.existing_job_runtime, 'JOB-001');
  assert.equal(plan.new_scheduler_created, false);
  assert.equal(plan.jobs.filter((job) => job.watch_type === 'TREND_RADAR').length, 3);
  assert.equal(plan.jobs.filter((job) => job.watch_type === 'COMPETITOR_RADAR').length, 3);
  assert.equal(plan.jobs.filter((job) => job.watch_type === 'CHANNEL_HEALTH').length, 3);
  assert.equal(plan.jobs.filter((job) => job.watch_type === 'PLATFORM_CAPABILITY_RADAR').length, 3);
  assert.equal(plan.jobs.filter((job) => job.watch_type === 'MARKET_RADAR').length, 1);
  assert.equal(plan.jobs.filter((job) => job.watch_type === 'SEARCH_RADAR').length, 1);
  assert.equal(plan.jobs.some((job) => job.watch_type === 'WEB_VISUAL_RADAR'), false);
  assert.equal(plan.web_visual_radar_status, 'BLOCKED_UNTIL_OFFICIAL_PROD_BASELINE_STABLE');
  assert.equal(plan.prod_authorized, false);
});

test('web visual radar becomes schedulable only after explicit baseline-ready evidence flag', () => {
  const plan = buildChannelIntelligenceWatchPlan({company_id, channels, site_ref, official_web_baseline_ready: true, now_ms});
  const visual = plan.jobs.filter((job) => job.watch_type === 'WEB_VISUAL_RADAR');
  assert.equal(visual.length, 1);
  assert.equal(visual[0].site_ref, site_ref);
  assert.equal(plan.web_visual_radar_status, 'READY_TO_SCHEDULE_PREPROD');
});

test('watch plan is enqueued into the existing durable JOB-001 runtime and duplicate cycles are deduped', () => {
  const root = tempRoot();
  try {
    const runtime = new DurableJobRuntimeV1({file_path: path.join(root, 'job001.v1.journal'), environment: 'PREPROD'});
    const plan = buildChannelIntelligenceWatchPlan({company_id, channels, site_ref, official_web_baseline_ready: false, now_ms});
    const first = enqueueChannelIntelligenceWatchPlan({job_runtime: runtime, plan, now_ms});
    const second = enqueueChannelIntelligenceWatchPlan({job_runtime: runtime, plan, now_ms: now_ms + 100});
    assert.equal(first.total, 14);
    assert.equal(first.accepted_total, 14);
    assert.equal(first.duplicate_total, 0);
    assert.equal(second.accepted_total, 0);
    assert.equal(second.duplicate_total, 14);
    assert.equal(first.worker_handler_registered, false);
    assert.equal(first.physical_collectors_bound, false);
    assert.equal(first.next_gate, 'BIND_READ_ONLY_COLLECTOR_ADAPTERS_AND_REGISTER_WATCH_WORKER_HANDLER');
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('next trend cycle generates a new idempotency key and can enqueue a fresh watch job set', () => {
  const first = buildChannelIntelligenceWatchPlan({company_id, channels: ['instagram'], site_ref, now_ms});
  const next = buildChannelIntelligenceWatchPlan({company_id, channels: ['instagram'], site_ref, now_ms: now_ms + WATCH_CADENCE_V1.TREND_RADAR.interval_ms});
  const firstTrend = first.jobs.find((job) => job.watch_type === 'TREND_RADAR');
  const nextTrend = next.jobs.find((job) => job.watch_type === 'TREND_RADAR');
  assert.notEqual(firstTrend.cycle_id, nextTrend.cycle_id);
  assert.notEqual(firstTrend.idempotency_key, nextTrend.idempotency_key);
});

test('ingress persists through durable JOB-001 journal and remains PREPROD only', () => {
  const root = tempRoot();
  try {
    const out = runChannelIntelligenceWatchIngress({company_root: root, company_id, channels, site_ref, official_web_baseline_ready: false, now_ms});
    assert.equal(out.plan.environment, 'PREPROD');
    assert.equal(out.dispatch.status, 'WATCH_JOBS_DISPATCHED_PREPROD');
    assert.equal(out.dispatch.accepted_total, 14);
    assert.equal(out.dispatch.prod_authorized, false);
    assert.equal(out.dispatch.prod_write_authorized, false);
    assert.equal(out.dispatch.publish_authorized, false);
    assert.equal(out.dispatch.spend_authorized, false);
    assert.equal(out.dispatch.additional_cost_eur, 0);
    assert.match(out.journal_path, /job001-channel-intelligence\.v1\.journal$/);
    assert.ok(out.operation_count >= 14);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('channels are normalized, deduped and sorted deterministically', () => {
  const plan = buildChannelIntelligenceWatchPlan({company_id, channels: ['LinkedIn','instagram','facebook','instagram'], site_ref, now_ms});
  assert.deepEqual(plan.channels, ['facebook','instagram','linkedin']);
});

test('plan refuses empty channels and unsafe site references', () => {
  assert.throws(() => buildChannelIntelligenceWatchPlan({company_id, channels: [], site_ref, now_ms}), /channels must be a non-empty array/);
  assert.throws(() => buildChannelIntelligenceWatchPlan({company_id, channels, site_ref: 'https:\/\/fenixcapital.es\/?token=secret', now_ms}), /opaque safe reference/);
});
