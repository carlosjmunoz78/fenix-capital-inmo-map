import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CEREBRO = path.resolve(HERE, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'evidence', 'gcp-live-inventory-evidence-envelope-v0.json'), 'utf8'));

const PROJECTS = ['fenix-trading-lab','fenix-capital-455809','fenix-inmobiliaria','fenix-capital-make-web-y-seo'];
const DOMAINS = ['projects','enabled_apis','cloud_run','cloud_functions','compute','jobs','scheduler','pubsub','storage','databases','artifact_registry','service_accounts_and_iam','secret_references','networking','logging_monitoring','billing_cost','regions','deployments','resource_consumers'];
const RESULT_STATUS = ['SUCCESS','PERMISSION_DENIED','API_UNAVAILABLE','EMPTY','ERROR'];
const REQUIRED_CAPTURE_FIELDS = ['capture_id','record_kind','captured_at','company_id','engine_id','environment','version','project_id','domain','command_template_id_or_ref','principal_ref','result_status','evidence_ref','raw_payload_stored','secret_payload_present','resource_ref','classification_status'];
const REQUIRED_COMMAND_RESULT_FIELDS = ['command_run_ref','command_template_id_or_ref','result_status','captured_at','principal_ref','evidence_ref'];

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

test('coverage and resource records are explicitly separated and resources are unique across domains', () => {
  const m = cfg.record_model;
  assert.deepEqual(m.record_kind_values, ['COVERAGE','RESOURCE']);
  assert.equal(m.coverage_records_collection, 'coverage_records');
  assert.equal(m.resource_records_collection, 'resource_records');
  assert.equal(m.collections_must_be_separate, true);
  assert.deepEqual(m.coverage_uniqueness_key, ['project_id','domain']);
  assert.deepEqual(m.resource_uniqueness_key, ['project_id','resource_ref']);
  assert.equal(m.resource_identity_must_be_unique_across_domains, true);
  assert.equal(m.contradictory_classification_for_same_resource_forbidden, true);
});

test('coverage contract requires all 76 unique project-domain pairs, including gaps', () => {
  const c = cfg.coverage_contract;
  assert.equal(c.project_count, 4);
  assert.equal(c.domain_count, 19);
  assert.equal(c.required_project_domain_pairs, 76);
  assert.equal(c.record_kind, 'COVERAGE');
  assert.equal(c.exactly_one_domain_coverage_record_per_pair, true);
  assert.equal(c.accept_envelope_only_when_all_pairs_present, true);
  assert.equal(c.missing_pairs_forbidden, true);
  assert.equal(c.duplicate_pairs_forbidden, true);
  assert.equal(c.non_success_pairs_must_still_be_recorded, true);
  assert.deepEqual(c.allowed_coverage_result_status, RESULT_STATUS);
  assert.equal(c.resource_ref_value, '__DOMAIN__');
  const coverageRecords = PROJECTS.flatMap((project_id) => DOMAINS.map((domain) => ({record_kind:'COVERAGE', project_id, domain, resource_ref:'__DOMAIN__'})));
  assert.equal(coverageRecords.length, 76);
  assert.equal(new Set(coverageRecords.map((r) => `${r.project_id}::${r.domain}`)).size, 76);
});

test('each coverage record preserves every executed command result independently', () => {
  const c = cfg.coverage_contract;
  assert.equal(c.command_results_required_per_coverage_record, true);
  assert.equal(c.one_command_result_per_executed_command_or_expansion, true);
  assert.equal(c.command_results_must_preserve_mixed_statuses, true);
  assert.deepEqual(c.command_result_required_fields, REQUIRED_COMMAND_RESULT_FIELDS);
  assert.deepEqual(c.command_result_status_values, RESULT_STATUS);
  assert.equal(c.command_run_ref_must_be_unique_within_coverage_record, true);
  assert.equal(c.scheduler_location_expansions_are_distinct_command_results, true);
  const example = [
    {command_run_ref:'pubsub-topics', command_template_id_or_ref:'PUBSUB_TOPICS', result_status:'SUCCESS', captured_at:'2026-09-10T21:00:00Z', principal_ref:'credref:gcp-ro', evidence_ref:'evidence:1'},
    {command_run_ref:'pubsub-subscriptions', command_template_id_or_ref:'PUBSUB_SUBSCRIPTIONS', result_status:'PERMISSION_DENIED', captured_at:'2026-09-10T21:00:01Z', principal_ref:'credref:gcp-ro', evidence_ref:'evidence:2'},
  ];
  assert.equal(example.length, 2);
  assert.notEqual(example[0].result_status, example[1].result_status);
  assert.equal(new Set(example.map((r) => r.command_run_ref)).size, 2);
});

test('capture contract preserves canonical context, source provenance and stable resource identity', () => {
  const c = cfg.capture_contract;
  assert.deepEqual(c.required_fields_per_capture, REQUIRED_CAPTURE_FIELDS);
  assert.equal(c.capture_must_reference_source_command, true);
  assert.equal(c.capture_must_be_timestamped, true);
  assert.equal(c.principal_ref_only, true);
  assert.equal(c.resource_record_kind, 'RESOURCE');
  assert.equal(c.resource_ref_required_for_each_resource_record, true);
  assert.equal(c.one_classification_record_per_returned_resource, true);
  assert.equal(c.domain_only_record_resource_ref_sentinel, '__DOMAIN__');
  assert.equal(c.domain_sentinel_must_not_be_treated_as_real_resource, true);
  assert.equal(c.resource_records_must_not_count_toward_76_pair_coverage, true);
});

test('capture remains fail-closed and Trading remains isolated', () => {
  const c = cfg.capture_contract;
  assert.equal(c.raw_payload_stored, false);
  assert.equal(c.secret_payload_present, false);
  assert.equal(c.permission_gaps_must_be_recorded_not_bypassed, true);
  assert.equal(c.api_enablement_forbidden, true);
  assert.equal(c.mutation_forbidden, true);
  assert.deepEqual(c.result_status_values, RESULT_STATUS);
  const g = cfg.fenix_trading_lab_guard;
  assert.equal(g.resource_ownership_status, 'UNKNOWN_REQUIRES_AUDIT');
  assert.equal(g.classification_required_per_resource, true);
  assert.equal(g.write_blocked_until_training_trading_separated, true);
  assert.equal(g.trading_mutation_forbidden, true);
});

test('reproducibility links and live auth gate are explicit', () => {
  assert.deepEqual(cfg.reproducibility_links, ['inventory','dependency_map','backup_snapshot','current_contract','behavioral_tests','observability_references','cost_evidence','rebuild_runbook','rollback_runbook']);
  assert.equal(cfg.next_gate, 'AUTHORIZED_GCP_READ_ONLY_CONTEXT_REQUIRED_BEFORE_LIVE_CAPTURE');
});
