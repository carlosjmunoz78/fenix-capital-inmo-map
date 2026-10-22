import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DurableJobRuntimeV1} from '../runtime/durable-job-runtime-v1.mjs';
import {buildCollectorRegistry} from '../marketing/channel-intelligence-collector-registry-v1.mjs';
import {processOneChannelIntelligenceJob} from '../marketing/channel-intelligence-worker-v1.mjs';

const company_id = 'fenix-capital';
const now_ms = Date.parse('2026-10-21T17:00:00.000Z');
const context = {company_id, engine_id: 'MKT-001', environment: 'PREPROD', version: '1.0.0'};

function tempRuntime() {
  const root = mkdtempSync(path.join(tmpdir(), 'cerebro-ci-worker-'));
  const runtime = new DurableJobRuntimeV1({file_path: path.join(root, 'job001.v1.journal'), environment: 'PREPROD'});
  return {root, runtime};
}

function enqueue(runtime, {watch_type = 'SEARCH_RADAR', channel_id = null, max_attempts = 3} = {}) {
  return runtime.enqueue({
    name: 'CHANNEL_INTELLIGENCE_WATCH_V1',
    context,
    payload: {
      schema_version: '1.0.0',
      state_type: 'CHANNEL_INTELLIGENCE_WATCH_JOB_PAYLOAD_V1',
      capability_id: 'CHANNEL-INTELLIGENCE-V1',
      watch_type,
      channel_id,
      site_ref: null,
      scope: channel_id ? `channel:${channel_id}` : 'global',
      cycle_id: `${watch_type.toLowerCase()}:1`,
      data_access: 'AUTHORIZED_PUBLIC_OR_CONNECTED_READ_ONLY',
      collector_adapter_required: true,
      collector_binding_verified: false,
      analysis_only_until_binding: true,
      route_engines: ['MKT-001'],
      prod_authorized: false,
      prod_write_authorized: false,
      publish_authorized: false,
      spend_authorized: false,
      trading_access: false,
      additional_cost_eur: 0
    },
    priority: 10,
    max_attempts,
    timeout_ms: 120000,
    idempotency_key: `test:${watch_type}:${channel_id ?? 'global'}:${now_ms}`,
    correlation_id: `test:${watch_type}`,
    now_ms,
    retry: {base_delay_ms: 1000, max_delay_ms: 60000, jitter_ratio: 0}
  });
}

function registry({state = 'VERIFIED_READY', block_reason = 'NONE', purpose = 'SEARCH_DEMAND', channel = null} = {}) {
  return buildCollectorRegistry({
    company_id,
    evidence_at: '2026-10-21T16:59:00.000Z',
    collectors: [{
      collector_id: 'collector:test:read',
      provider: 'TEST',
      connector_id: 'test-read',
      state,
      block_reason,
      purposes: [purpose],
      channels: channel ? [channel] : [],
      account_scope_ref: 'account:test:read',
      evidence_ref: 'evidence:test:collector',
      evidence_at: '2026-10-21T16:59:00.000Z',
      read_only: true,
      write_authorized: false,
      additional_cost_eur: 0,
      priority: 1
    }]
  });
}

test('no verified collector completes a safe skip without retry storm', async () => {
  const {root, runtime} = tempRuntime();
  try {
    enqueue(runtime);
    const out = await processOneChannelIntelligenceJob({
      job_runtime: runtime,
      collector_registry: registry({state: 'CONNECTED_READ_BLOCKED', block_reason: 'ZERO_COST_PLAN_LIMIT'}),
      company_id,
      now_ms
    });
    assert.equal(out.status, 'SKIPPED_NO_VERIFIED_COLLECTOR');
    assert.equal(out.completed_status, 'SUCCEEDED');
    assert.equal(out.result.blocker.block_reason, 'ZERO_COST_PLAN_LIMIT');
    assert.equal(out.result.retry_immediately, false);
    assert.equal(out.result.human_required, false);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('verified collector with no physical adapter completes safe skip', async () => {
  const {root, runtime} = tempRuntime();
  try {
    enqueue(runtime);
    const out = await processOneChannelIntelligenceJob({
      job_runtime: runtime,
      collector_registry: registry(),
      collector_adapters: {},
      company_id,
      now_ms
    });
    assert.equal(out.status, 'SKIPPED_NO_BOUND_ADAPTER');
    assert.equal(out.completed_status, 'SUCCEEDED');
    assert.equal(out.result.prod_authorized, false);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('verified zero-cost read-only adapter can complete a JOB-001 watch', async () => {
  const {root, runtime} = tempRuntime();
  try {
    enqueue(runtime);
    const out = await processOneChannelIntelligenceJob({
      job_runtime: runtime,
      collector_registry: registry(),
      collector_adapters: {
        'collector:test:read': async (request) => ({
          company_id: request.company_id,
          collector_id: request.collector_id,
          watch_type: request.watch_type,
          channel_id: request.channel_id,
          observed_at: '2026-10-21T17:00:01.000Z',
          signal_count: 3,
          evidence_ref: 'evidence:test:collection:1',
          payload_ref: 'payload:test:collection:1',
          read_only: true,
          external_side_effect_executed: false,
          write_authorized: false,
          prod_authorized: false,
          additional_cost_eur: 0
        })
      },
      company_id,
      now_ms
    });
    assert.equal(out.status, 'READ_ONLY_COLLECTION_SUCCEEDED');
    assert.equal(out.completed_status, 'SUCCEEDED');
    assert.equal(out.result.collection.signal_count, 3);
    assert.match(out.result.collection.result_sha256, /^[a-f0-9]{64}$/);
    assert.equal(out.result.external_side_effect_executed, false);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('collector authority expansion is rejected and sent through JOB-001 retry policy', async () => {
  const {root, runtime} = tempRuntime();
  try {
    enqueue(runtime, {max_attempts: 2});
    const out = await processOneChannelIntelligenceJob({
      job_runtime: runtime,
      collector_registry: registry(),
      collector_adapters: {
        'collector:test:read': async (request) => ({
          company_id: request.company_id,
          collector_id: request.collector_id,
          watch_type: request.watch_type,
          channel_id: request.channel_id,
          observed_at: '2026-10-21T17:00:01.000Z',
          signal_count: 1,
          evidence_ref: 'evidence:test:bad',
          read_only: true,
          external_side_effect_executed: false,
          write_authorized: true,
          prod_authorized: false,
          additional_cost_eur: 0
        })
      },
      company_id,
      now_ms
    });
    assert.equal(out.status, 'JOB_RETRY_WAIT');
    assert.match(out.error, /COLLECTOR_RESULT_AUTHORITY/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('secret-shaped collector output is rejected before persistence', async () => {
  const {root, runtime} = tempRuntime();
  try {
    enqueue(runtime, {max_attempts: 1});
    const out = await processOneChannelIntelligenceJob({
      job_runtime: runtime,
      collector_registry: registry(),
      collector_adapters: {
        'collector:test:read': async (request) => ({
          company_id: request.company_id,
          collector_id: request.collector_id,
          watch_type: request.watch_type,
          channel_id: request.channel_id,
          observed_at: '2026-10-21T17:00:01.000Z',
          evidence_ref: 'evidence:test:bad-secret',
          access_token: 'hidden',
          read_only: true,
          external_side_effect_executed: false,
          write_authorized: false,
          prod_authorized: false,
          additional_cost_eur: 0
        })
      },
      company_id,
      now_ms
    });
    assert.equal(out.status, 'JOB_DEAD_LETTER');
    assert.match(out.error, /forbidden secret\/PII field/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('no job returns cleanly without side effects', async () => {
  const {root, runtime} = tempRuntime();
  try {
    const out = await processOneChannelIntelligenceJob({job_runtime: runtime, collector_registry: registry(), company_id, now_ms});
    assert.equal(out.status, 'NO_JOB');
    assert.equal(out.external_side_effect_executed, false);
  } finally { rmSync(root, {recursive: true, force: true}); }
});
