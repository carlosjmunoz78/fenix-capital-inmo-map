import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DurableJobRuntimeV1} from '../runtime/durable-job-runtime-v1.mjs';
import {buildCollectorRegistry} from '../marketing/channel-intelligence-collector-registry-v1.mjs';
import {processOneChannelIntelligenceJob} from '../marketing/channel-intelligence-worker-v1.mjs';
import {createExistingReadBridge, createWorkerAdapterFromExistingReadBridge} from '../marketing/channel-intelligence-existing-read-bridge-v1.mjs';

const company_id = 'fenix-capital';
const collector_id = 'collector:existing:gsc:fenixcapital';
const now_ms = Date.parse('2026-10-21T18:00:00.000Z');
const context = {company_id, engine_id: 'MKT-001', environment: 'PREPROD', version: '1.0.0'};
const evidence_ref = 'make:scenario:9694039:execution:6f133835d4374d8ca88503c15429e8d5';

function runtime() {
  const root = mkdtempSync(path.join(tmpdir(), 'cerebro-ci-existing-e2e-'));
  return {root, runtime: new DurableJobRuntimeV1({file_path: path.join(root, 'job001.v1.journal'), environment: 'PREPROD'})};
}

function enqueue(jobRuntime, suffix) {
  return jobRuntime.enqueue({
    name: 'CHANNEL_INTELLIGENCE_WATCH_V1',
    context,
    payload: {
      schema_version: '1.0.0',
      state_type: 'CHANNEL_INTELLIGENCE_WATCH_JOB_PAYLOAD_V1',
      capability_id: 'CHANNEL-INTELLIGENCE-V1',
      watch_type: 'SEARCH_RADAR',
      channel_id: null,
      site_ref: 'site:fenixcapital',
      scope: 'global',
      cycle_id: `existing-read-e2e:${suffix}`,
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
    max_attempts: 2,
    timeout_ms: 120000,
    idempotency_key: `existing-read-e2e:${suffix}`,
    correlation_id: 'existing-read-e2e',
    now_ms,
    retry: {base_delay_ms: 1000, max_delay_ms: 60000, jitter_ratio: 0}
  });
}

function registry() {
  return buildCollectorRegistry({
    company_id,
    evidence_at: '2026-10-21T17:59:00.000Z',
    collectors: [{
      collector_id,
      provider: 'EXISTING_CONNECTED_ROUTE',
      connector_id: 'existing-gsc-read',
      state: 'VERIFIED_READY',
      block_reason: 'NONE',
      purposes: ['SEARCH_DEMAND'],
      channels: [],
      account_scope_ref: 'site:fenixcapital',
      evidence_ref: 'evidence:existing:gsc:route',
      evidence_at: '2026-10-21T17:59:00.000Z',
      read_only: true,
      write_authorized: false,
      additional_cost_eur: 0,
      priority: 1
    }]
  });
}

function syntheticExistingRouteBridge() {
  return createExistingReadBridge({
    company_id,
    invokeRead: async request => ({
      company_id: request.company_id,
      collector_id: request.collector_id,
      watch_type: request.watch_type,
      channel_id: request.channel_id,
      observed_at: '2026-10-21T18:00:01.000Z',
      signal_count: 4,
      evidence_ref: request.evidence_ref,
      payload_ref: 'fixture:normalized:gsc:existing-route',
      read_only: true,
      external_write: false,
      prod_publication: false,
      spend_eur: 0,
      token_export: false
    })
  });
}

test('OLD no-adapter versus NEW existing-read bridge improves collection without authority or cost regression', async () => {
  const oldState = runtime();
  const newState = runtime();
  try {
    enqueue(oldState.runtime, 'old');
    const oldResult = await processOneChannelIntelligenceJob({
      job_runtime: oldState.runtime,
      collector_registry: registry(),
      collector_adapters: {},
      company_id,
      now_ms
    });
    assert.equal(oldResult.status, 'SKIPPED_NO_BOUND_ADAPTER');

    enqueue(newState.runtime, 'new');
    const bridge = syntheticExistingRouteBridge();
    const adapter = createWorkerAdapterFromExistingReadBridge({bridge, evidence_ref});
    const newResult = await processOneChannelIntelligenceJob({
      job_runtime: newState.runtime,
      collector_registry: registry(),
      collector_adapters: {[collector_id]: adapter},
      company_id,
      now_ms
    });
    assert.equal(newResult.status, 'READ_ONLY_COLLECTION_SUCCEEDED');
    assert.equal(newResult.result.collection.signal_count, 4);
    assert.equal(newResult.result.collection.evidence_ref, evidence_ref);
    assert.equal(newResult.result.collection.read_only, true);
    assert.equal(newResult.result.collection.external_side_effect_executed, false);
    assert.equal(newResult.result.collection.write_authorized, false);
    assert.equal(newResult.result.collection.prod_authorized, false);
    assert.equal(newResult.result.collection.additional_cost_eur, 0);

    const comparison = {
      old_collection_completed: oldResult.status === 'READ_ONLY_COLLECTION_SUCCEEDED',
      new_collection_completed: newResult.status === 'READ_ONLY_COLLECTION_SUCCEEDED',
      safety_regression: newResult.result.collection.external_side_effect_executed !== false || newResult.result.collection.prod_authorized !== false,
      cost_regression: Number(newResult.result.collection.additional_cost_eur) !== 0
    };
    assert.deepEqual(comparison, {
      old_collection_completed: false,
      new_collection_completed: true,
      safety_regression: false,
      cost_regression: false
    });
  } finally {
    rmSync(oldState.root, {recursive: true, force: true});
    rmSync(newState.root, {recursive: true, force: true});
  }
});

test('E2E fixture proves provider-neutral plumbing only and does not claim the external route is runtime-bound', () => {
  const bridge = syntheticExistingRouteBridge();
  assert.equal(bridge.environment, 'PREPROD');
  assert.equal(bridge.company_id, company_id);
  assert.equal(typeof bridge.collect, 'function');
  assert.equal(evidence_ref.startsWith('make:scenario:'), true);
});
