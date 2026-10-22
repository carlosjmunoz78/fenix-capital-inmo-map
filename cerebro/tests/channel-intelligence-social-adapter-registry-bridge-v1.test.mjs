import test from 'node:test';
import assert from 'node:assert/strict';
import {
  socialAdapterRowToCollectorDescriptor,
  buildCollectorRegistryFromExistingSocialAdapters,
  SOCIAL_ADAPTER_REGISTRY_BRIDGE_V1_CONTRACT
} from '../marketing/channel-intelligence-social-adapter-registry-bridge-v1.mjs';

const base = {
  company_id:'fenix-capital', engine_id:'SOC-001', environment:'PREPROD', version:'v1',
  enabled:true, cost_policy:'ZERO_ADDITIONAL_COST', updated_at:'2026-10-21T10:00:00Z'
};

test('Meta existing Make adapter becomes read-only derived own-performance collector', () => {
  const out = socialAdapterRowToCollectorDescriptor({
    ...base, channel:'instagram', adapter_key:'meta_native_make', transport:'MAKE_EXISTING', connection_ref:'14428711', capabilities:{metrics:true,native_identity:true}
  });
  assert.equal(out.state, 'VERIFIED_READY');
  assert.deepEqual(out.purposes, ['SOCIAL_OWN_PERFORMANCE']);
  assert.deepEqual(out.channels, ['instagram']);
  assert.equal(out.write_authorized, false);
  assert.equal(out.additional_cost_eur, 0);
  assert.match(out.account_scope_ref, /^make:connection:/);
});

test('LinkedIn existing adapter is reused without declaring Make publisher authority', () => {
  const registry = buildCollectorRegistryFromExistingSocialAdapters({
    evidence_at:'2026-10-21T10:05:00Z',
    rows:[
      {...base,channel:'facebook',adapter_key:'meta_native_make',transport:'MAKE_EXISTING',connection_ref:'14428711',capabilities:{metrics:true}},
      {...base,channel:'instagram',adapter_key:'meta_native_make',transport:'MAKE_EXISTING',connection_ref:'14428711',capabilities:{metrics:true}},
      {...base,channel:'linkedin',adapter_key:'linkedin_native_make',transport:'MAKE_EXISTING',connection_ref:'14435718',capabilities:{metrics:true}}
    ]
  });
  assert.equal(registry.verified_ready_total, 3);
  assert.equal(registry.write_authorized, false);
  assert.equal(registry.prod_authorized, false);
  assert.equal(SOCIAL_ADAPTER_REGISTRY_BRIDGE_V1_CONTRACT.make_publish_authorized, false);
  assert.equal(SOCIAL_ADAPTER_REGISTRY_BRIDGE_V1_CONTRACT.creates_parallel_social_adapter_database, false);
});

test('non-zero-cost or wrong-scope existing adapter fails closed', () => {
  assert.throws(() => socialAdapterRowToCollectorDescriptor({
    ...base, channel:'facebook', adapter_key:'meta_native_make', transport:'MAKE_EXISTING', connection_ref:'1', capabilities:{metrics:true}, cost_policy:'PAID'
  }), /MONEY_LIMIT/);
  assert.throws(() => socialAdapterRowToCollectorDescriptor({
    ...base, company_id:'other-company', channel:'facebook', adapter_key:'meta_native_make', transport:'MAKE_EXISTING', connection_ref:'1', capabilities:{metrics:true}
  }), /POLICY_CONFLICT/);
});

test('metrics-disabled adapter stays fail-closed', () => {
  const out = socialAdapterRowToCollectorDescriptor({
    ...base, channel:'facebook', adapter_key:'meta_native_make', transport:'MAKE_EXISTING', connection_ref:'1', capabilities:{metrics:false}
  });
  assert.equal(out.state, 'DISABLED_POLICY');
  assert.equal(out.block_reason, 'POLICY_DISABLED');
});
