import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const evidence=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../registry/evt001-browser-staging-e2e.v0.json'),'utf8'));

test('EVT-001 browser STAGING evidence is scoped exactly to rollout item 74',()=>{
  assert.equal(evidence.rollout_item,74);
  assert.equal(evidence.engine_id,'EVT-001');
  assert.equal(evidence.environment,'PREPROD');
  assert.equal(evidence.status,'VERIFIED_BROWSER_FIRST_PARTY_EMITTER_PERSISTENCE_IDEMPOTENCY_GREEN_SERVER_JOURNAL_BINDING_PENDING');
});

test('synthetic event remains consented, first-party and non-personal',()=>{
  const e=evidence.event_contract;
  assert.equal(e.company_id,'fenix');
  assert.equal(e.engine_id,'EVT-001');
  assert.equal(e.environment,'PREPROD');
  assert.equal(e.consent.analytics,true);
  assert.equal(e.personal_data,false);
  assert.equal(e.third_party_network,false);
  assert.equal(e.prod_authorized,false);
  assert.match(e.idempotency_key,/^evt001-browser-/);
});

test('real browser persistence/idempotency evidence is present without claiming server persistence',()=>{
  const p=evidence.physical_evidence;
  assert.equal(p.stored_elementor_markup_rendered,true);
  assert.equal(p.browser_script_executed,true);
  assert.equal(p.first_load_marker_observed,'CEREBRO_EVT001_BROWSER_STORAGE_GREEN');
  assert.equal(p.second_load_marker,'CEREBRO_EVT001_BROWSER_STORAGE_GREEN');
  assert.equal(p.second_load_mode,'EVENT_REPLAY_IDEMPOTENT');
  assert.equal(p.second_load_readback.status,'GREEN');
  assert.equal(p.second_load_readback.consent_analytics,true);
  assert.equal(p.second_load_readback.personal_data,false);
  assert.equal(p.second_load_readback.third_party_network,false);
  assert.equal(p.second_load_readback.prod_authorized,false);
  assert.equal(p.server_side_event_persistence_claimed,false);
});

test('WordPress evidence is draft/noindex and rollbackable',()=>{
  const w=evidence.wordpress_staging;
  assert.equal(w.page_id,54765);
  assert.equal(w.page_status,'draft');
  assert.equal(w.rollback_snapshot_id,585);
  assert.equal(w.robots_noindex,true);
  assert.equal(w.robots_nofollow,true);
  assert.equal(w.authenticated_editor_preview_only,true);
  assert.equal(w.public_publish_performed,false);
  assert.equal(w.homepage_changed,false);
  assert.equal(w.navigation_changed,false);
  assert.equal(w.theme_changed,false);
});

test('server journal boundary remains explicit and no permission was weakened',()=>{
  const s=evidence.server_binding_audit;
  assert.equal(s.existing_guarded_routes_detected.includes('/cerebro-b3-journal-lab/v1/observe'),true);
  assert.equal(s.current_connected_mcp_get_observe_granted,false);
  assert.equal(s.permission_weakened_or_bypassed,false);
  assert.equal(s.server_journal_binding_verified,false);
  assert.match(s.remaining_gate,/EXPLICIT_MINIMUM_REQUIRED_GRANT/);
});

test('authority remains zero-cost and fail-closed',()=>{
  const a=evidence.authority;
  assert.equal(a.prod_authorized,false);
  assert.equal(a.prod_write_authorized,false);
  assert.equal(a.public_publish_authorized,false);
  assert.equal(a.customer_data_authorized,false);
  assert.equal(a.third_party_tracking_authorized,false);
  assert.equal(a.trading_access,false);
  assert.equal(a.automatic_paid_fallback,false);
  assert.equal(a.additional_cost_eur,0);
});
