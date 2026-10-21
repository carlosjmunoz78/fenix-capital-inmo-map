import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExistingReadIntent,
  createExistingReadBridge,
  createWorkerAdapterFromExistingReadBridge,
  EXISTING_READ_BRIDGE_V1_CONTRACT
} from '../marketing/channel-intelligence-existing-read-bridge-v1.mjs';

const company_id = 'fenix-capital';
const collector_id = 'collector:existing:gsc:fenixcapital';
const evidence_ref = 'make:scenario:9694039:execution:6f133835d4374d8ca88503c15429e8d5';

function intent(overrides = {}) {
  return buildExistingReadIntent({
    company_id,
    collector_id,
    watch_type: 'SEARCH_DEMAND',
    channel_id: null,
    scope: 'OWN_CONNECTED_READ_ONLY',
    cycle_id: 'cycle:2026-10-21:01',
    evidence_ref,
    ...overrides
  });
}

function greenResult(request, overrides = {}) {
  return {
    company_id: request.company_id,
    collector_id: request.collector_id,
    watch_type: request.watch_type,
    channel_id: request.channel_id,
    observed_at: '2026-10-21T13:55:00.000Z',
    signal_count: 12,
    evidence_ref: request.evidence_ref,
    payload_ref: 'opaque:normalized:gsc:20261021',
    read_only: true,
    external_write: false,
    prod_publication: false,
    spend_eur: 0,
    token_export: false,
    ...overrides
  };
}

test('existing read bridge is provider-neutral PREPROD zero-cost and non-PROD', () => {
  assert.deepEqual(EXISTING_READ_BRIDGE_V1_CONTRACT, {
    capability_id: 'CHANNEL-INTELLIGENCE-EXISTING-READ-BRIDGE-V1',
    version: '1.0.0',
    environment: 'PREPROD',
    provider_neutral: true,
    hard_provider_dependency: false,
    external_credentials_exported: false,
    read_only: true,
    external_write: false,
    prod_publication: false,
    spend_eur: 0,
    trading_access: false,
    purpose: 'WRAP_ALREADY_CONNECTED_READ_ROUTES_WITHOUT_COPYING_CREDENTIALS_OR_GRANTING_PROVIDER_WRITE_AUTHORITY'
  });
});

test('intent exposes only bounded read metadata and no provider credential material', () => {
  const built = intent();
  assert.equal(built.environment, 'PREPROD');
  assert.equal(built.read_only, true);
  assert.equal(built.external_write, false);
  assert.equal(built.prod_publication, false);
  assert.equal(built.spend_eur, 0);
  assert.equal(built.token_export, false);
  assert.equal(Object.prototype.hasOwnProperty.call(built, 'access_token'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(built, 'authorization'), false);
});

test('existing connected route is wrapped into worker-compatible read-only result', async () => {
  let seen;
  const bridge = createExistingReadBridge({
    company_id,
    invokeRead: async request => {
      seen = request;
      return greenResult(request);
    }
  });
  const result = await bridge.collect(intent());
  assert.equal(seen.company_id, company_id);
  assert.equal(seen.environment, 'PREPROD');
  assert.equal(seen.read_only, true);
  assert.equal(seen.external_write, false);
  assert.equal(seen.token_export, false);
  assert.equal(result.company_id, company_id);
  assert.equal(result.collector_id, collector_id);
  assert.equal(result.external_side_effect_executed, false);
  assert.equal(result.write_authorized, false);
  assert.equal(result.prod_authorized, false);
  assert.equal(result.additional_cost_eur, 0);
  assert.match(result.result_sha256, /^[0-9a-f]{64}$/);
});

test('worker adapter composes existing bridge without copying secrets', async () => {
  const bridge = createExistingReadBridge({
    company_id,
    invokeRead: async request => greenResult(request, {signal_count: 4})
  });
  const adapter = createWorkerAdapterFromExistingReadBridge({bridge, evidence_ref});
  const result = await adapter({
    company_id,
    collector_id,
    watch_type: 'SEARCH_DEMAND',
    channel_id: null,
    scope: 'OWN_CONNECTED_READ_ONLY',
    cycle_id: 'cycle:2026-10-21:02',
    connector_id: 'existing:gsc',
    data_access: 'AUTHORIZED_PUBLIC_OR_CONNECTED_READ_ONLY',
    write_authorized: false,
    publish_authorized: false,
    spend_authorized: false,
    prod_authorized: false,
    additional_cost_eur: 0
  });
  assert.equal(result.signal_count, 4);
  assert.equal(result.evidence_ref, evidence_ref);
  assert.equal(result.read_only, true);
});

test('bridge fails closed on cross-company use', async () => {
  const bridge = createExistingReadBridge({company_id, invokeRead: async request => greenResult(request)});
  const other = intent({company_id: 'other-company'});
  await assert.rejects(() => bridge.collect(other), /SECURITY_INCIDENT:BRIDGE_COMPANY_MISMATCH/);
});

test('bridge rejects write PROD spend and token-export authority expansion', async () => {
  const bridge = createExistingReadBridge({company_id, invokeRead: async request => greenResult(request)});
  const base = {...intent()};
  for (const mutated of [
    {...base, external_write: true},
    {...base, prod_publication: true},
    {...base, spend_eur: 0.01},
    {...base, token_export: true},
    {...base, environment: 'PROD'}
  ]) {
    await assert.rejects(() => bridge.collect(mutated), /POLICY_CONFLICT:BRIDGE_/);
  }
});

test('secret-shaped callback output is rejected before normalization', async () => {
  const bridge = createExistingReadBridge({
    company_id,
    invokeRead: async request => ({...greenResult(request), access_token: 'not-allowed'})
  });
  await assert.rejects(() => bridge.collect(intent()), /forbidden secret\/PII field/);
});

test('secret-looking values are rejected even under an innocent field name', async () => {
  const bridge = createExistingReadBridge({
    company_id,
    invokeRead: async request => ({...greenResult(request), note: 'Bearer abc.def.ghi'})
  });
  await assert.rejects(() => bridge.collect(intent()), /forbidden secret-shaped value/);
});

test('bridge result cannot claim provider write or paid execution', async () => {
  for (const overrides of [
    {external_write: true},
    {prod_publication: true},
    {spend_eur: 1},
    {token_export: true},
    {read_only: false}
  ]) {
    const bridge = createExistingReadBridge({
      company_id,
      invokeRead: async request => greenResult(request, overrides)
    });
    await assert.rejects(() => bridge.collect(intent()), /POLICY_CONFLICT:BRIDGE_RESULT_AUTHORITY_EXPANSION/);
  }
});
