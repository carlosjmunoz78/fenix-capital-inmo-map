import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'evidence/channel-intelligence-collectors-fenix-v1.json'), 'utf8'));
const routes = evidence.existing_zero_cost_read_routes;

function walk(value, visit, pathParts = []) {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      visit(String(index), item, [...pathParts, String(index)]);
      walk(item, visit, [...pathParts, String(index)]);
    });
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    visit(key, child, [...pathParts, key]);
    walk(child, visit, [...pathParts, key]);
  }
}

test('existing route evidence is PREPROD-only and records no credential export', () => {
  assert.equal(evidence.schema_version, '1.2.0');
  assert.equal(evidence.environment, 'PREPROD');
  assert.equal(routes.audit_state, 'EXISTING_CONNECTED_READ_ROUTES_VERIFIED_NOT_YET_BOUND_TO_CEREBRO_RUNTIME');
  assert.equal(routes.platform_role, 'TRANSITIONAL_EXISTING_READ_BRIDGE_ONLY');
  assert.equal(routes.hard_dependency, false);
  assert.equal(routes.credential_export_performed, false);
  assert.equal(routes.credential_values_recorded, false);
  assert.equal(routes.write_authority_inherited, false);
});

test('GSC GA4 LinkedIn Facebook and Instagram existing read surfaces are evidenced independently', () => {
  const byId = new Map(routes.routes.map(route => [route.route_id, route]));
  assert.deepEqual(new Set(byId.keys()), new Set([
    'existing:gsc:fenixcapital',
    'existing:ga4:fenixcapital',
    'existing:linkedin:fenixcapital',
    'existing:facebook:fenixcapital',
    'existing:instagram:fenixcapital'
  ]));
  for (const route of byId.values()) {
    assert.equal(route.existing_platform, 'Make');
    assert.equal(route.live_read_verified, true);
    assert.equal(route.cerebro_runtime_binding_verified, false);
    assert.equal(route.write_authorized, false);
    assert.equal(route.additional_cost_eur, 0);
    assert.match(route.scenario_ref, /^make:scenario:\d+$/);
    assert.match(route.execution_ref, /^make:execution:[0-9a-f]+$/);
  }
  assert.equal(byId.get('existing:facebook:fenixcapital').lifecycle_state, 'EXPIRING_AT_AUDIT');
  assert.equal(byId.get('existing:instagram:fenixcapital').lifecycle_state, 'EXPIRING_AT_AUDIT');
  assert.equal(byId.get('existing:instagram:fenixcapital').insights_report_execution_verified, false);
});

test('existing evidence never upgrades route proof into direct credential binding', () => {
  assert.equal(evidence.conclusion.existing_zero_cost_read_routes_verified, true);
  assert.equal(evidence.conclusion.existing_bridge_code_exists, true);
  assert.equal(evidence.conclusion.existing_bridge_runtime_binding_verified, false);
  assert.equal(evidence.conclusion.direct_read_credentials_verified, false);
  for (const route of routes.routes) assert.equal(route.cerebro_runtime_binding_verified, false);
});

test('evidence guardrails forbid writes publishing spend subscription changes and credential export', () => {
  assert.deepEqual(evidence.guardrails, {
    prod_write_authorized: false,
    publish_authorized: false,
    spend_authorized: false,
    credential_export_authorized: false,
    provider_reconfiguration_authorized: false,
    account_disconnection_authorized: false,
    new_subscription_authorized: false,
    trading_access: false
  });
  assert.equal(evidence.conclusion.human_required_now, false);
});

test('evidence contains references only and no raw credential-bearing keys', () => {
  const forbidden = new Set([
    'token','jwt','api_key','apikey','access_token','refresh_token','private_key','authorization',
    'password','secret','client_secret','cookie','set-cookie'
  ]);
  const violations = [];
  walk(evidence, (key, _value, parts) => {
    if (forbidden.has(key.toLowerCase())) violations.push(parts.join('.'));
  });
  assert.deepEqual(violations, []);
});

test('paid GSC Wizard remains rejected and Windsor plan limits do not become a subscription trigger', () => {
  assert.equal(evidence.secondary_connector_audit.provider, 'GSC Wizard');
  assert.equal(evidence.secondary_connector_audit.reason, 'SUBSCRIPTION_REQUIRED_TRIAL_ENDED');
  assert.equal(evidence.secondary_connector_audit.paid_subscription_authorized, false);
  assert.equal(evidence.secondary_connector_audit.selected_as_runtime_dependency, false);
  assert.equal(evidence.plan_constraint.additional_cost_authorized_eur, 0);
});
