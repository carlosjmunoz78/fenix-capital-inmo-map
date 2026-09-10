import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CEREBRO = path.resolve(HERE, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'evidence', 'gcp-live-inventory-evidence-envelope-v0.json'), 'utf8'));

const PROJECTS = [
  'fenix-trading-lab',
  'fenix-capital-455809',
  'fenix-inmobiliaria',
  'fenix-capital-make-web-y-seo',
];

const DOMAINS = [
  'projects','enabled_apis','cloud_run','cloud_functions','compute','jobs','scheduler','pubsub','storage','databases','artifact_registry','service_accounts_and_iam','secret_references','networking','logging_monitoring','billing_cost','regions','deployments','resource_consumers'
];

const REQUIRED_CAPTURE_FIELDS = [
  'capture_id','captured_at','company_id','engine_id','environment','version','project_id','domain','command_template_id_or_ref','principal_ref','result_status','evidence_ref','raw_payload_stored','secret_payload_present','classification_status'
];

test('live inventory envelope is SCAFFOLD read-only capture and zero-cost', () => {
  assert.equal(cfg.status, 'DEFINED_NOT_BUILT');
  assert.equal(cfg.environment, 'SCAFFOLD');
  assert.equal(cfg.engine_id, 'INT-001');
  assert.equal(cfg.execution_mode, 'READ_ONLY_CAPTURE_ONLY');
  assert.equal(cfg.additional_cost_target_eur, 0);
  assert.equal(cfg.prod_writes, false);
  assert.equal(cfg.autonomous_prod, false);
  assert.equal(cfg.trading_access, false);
  assert.deepEqual(cfg.required_context, ['company_id','engine_id','environment','version']);
});

test('allowlist and inventory domains are exact', () => {
  assert.deepEqual(cfg.project_allowlist, PROJECTS);
  assert.deepEqual(cfg.required_inventory_domains, DOMAINS);
});

test('capture contract preserves canonical context and source provenance', () => {
  const c = cfg.capture_contract;
  assert.deepEqual(c.required_fields_per_capture, REQUIRED_CAPTURE_FIELDS);
  assert.equal(c.capture_must_reference_source_command, true);
  assert.equal(c.capture_must_be_timestamped, true);
  assert.equal(c.principal_ref_only, true);
});

test('capture is fail-closed for secrets, permission gaps, API enablement and mutations', () => {
  const c = cfg.capture_contract;
  assert.equal(c.raw_payload_stored, false);
  assert.equal(c.secret_payload_present, false);
  assert.equal(c.permission_gaps_must_be_recorded_not_bypassed, true);
  assert.equal(c.api_enablement_forbidden, true);
  assert.equal(c.mutation_forbidden, true);
  assert.deepEqual(c.result_status_values, ['SUCCESS','PERMISSION_DENIED','API_UNAVAILABLE','EMPTY','ERROR']);
});

test('resource classification includes Training and Trading separation states', () => {
  const c = cfg.capture_contract;
  assert.deepEqual(c.classification_status_values, ['UNCLASSIFIED','TRAINING','TRADING','APP_CRM','SHARED_REQUIRES_REVIEW','OTHER']);
  const g = cfg.fenix_trading_lab_guard;
  assert.equal(g.resource_ownership_status, 'UNKNOWN_REQUIRES_AUDIT');
  assert.equal(g.classification_required_per_resource, true);
  assert.equal(g.write_blocked_until_training_trading_separated, true);
  assert.equal(g.trading_mutation_forbidden, true);
});

test('reproducibility evidence links and live-auth gate are explicit', () => {
  assert.deepEqual(cfg.reproducibility_links, [
    'inventory','dependency_map','backup_snapshot','current_contract','behavioral_tests','observability_references','cost_evidence','rebuild_runbook','rollback_runbook'
  ]);
  assert.equal(cfg.next_gate, 'AUTHORIZED_GCP_READ_ONLY_CONTEXT_REQUIRED_BEFORE_LIVE_CAPTURE');
});
