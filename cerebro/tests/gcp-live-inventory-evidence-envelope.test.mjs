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
const REQUIRED_COMMAND_RESULT_FIELDS = ['command_run_ref','command_template_id_or_ref','result_status','captured_at','principal_ref','evidence_ref','resolved_parameters'];

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

test('coverage and resource records are separated and resource identity is cross-domain stable', () => {
  const m = cfg.record_model;
  assert.deepEqual(m.record_kind_values, ['COVERAGE','RESOURCE']);
  assert.deepEqual(m.coverage_uniqueness_key, ['project_id','domain']);
  assert.deepEqual(m.resource_uniqueness_key, ['project_id','resource_ref']);
  assert.equal(m.resource_identity_must_be_unique_across_domains, true);
  assert.equal(m.contradictory_classification_for_same_resource_forbidden, true);
});

test('coverage contract requires all 76 unique project-domain pairs', () => {
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

test('coverage is bound to every command template required by the canonical catalog', () => {
  const c = cfg.coverage_contract;
  assert.equal(c.catalog_binding_required, true);
  assert.equal(c.catalog_ref, 'gcp-readonly-command-catalog-v0.json');
  assert.equal(c.required_command_templates_field, 'required_command_templates');
  assert.equal(c.required_command_templates_must_match_catalog_domain_exactly, true);
  assert.equal(c.command_results_required_per_coverage_record, true);
  assert.equal(c.one_command_result_per_required_template, true);
  assert.equal(c.one_command_result_per_expansion, true);
  assert.equal(c.missing_required_template_result_forbidden, true);
  assert.equal(c.duplicate_required_template_without_distinct_expansion_forbidden, true);
  assert.deepEqual(c.command_result_required_fields, REQUIRED_COMMAND_RESULT_FIELDS);
  assert.deepEqual(c.command_result_status_values, RESULT_STATUS);
  assert.equal(c.command_run_ref_must_be_unique_within_coverage_record, true);
  assert.equal(c.resolved_parameters_must_include_project_id, true);

  const required = ['PUBSUB_TOPICS','PUBSUB_SUBSCRIPTIONS'];
  const results = [
    {command_run_ref:'topics-1', command_template_id_or_ref:'PUBSUB_TOPICS', result_status:'SUCCESS', captured_at:'2026-09-10T21:00:00Z', principal_ref:'credref:gcp-ro', evidence_ref:'evidence:1', resolved_parameters:{PROJECT_ID:'fenix-trading-lab'}},
    {command_run_ref:'subs-1', command_template_id_or_ref:'PUBSUB_SUBSCRIPTIONS', result_status:'PERMISSION_DENIED', captured_at:'2026-09-10T21:00:01Z', principal_ref:'credref:gcp-ro', evidence_ref:'evidence:2', resolved_parameters:{PROJECT_ID:'fenix-trading-lab'}},
  ];
  assert.deepEqual(new Set(results.map((r) => r.command_template_id_or_ref)), new Set(required));
  assert.notEqual(results[0].result_status, results[1].result_status);
});

test('scheduler expansions preserve each discovered location exactly once', () => {
  const c = cfg.coverage_contract;
  assert.equal(c.scheduler_location_expansions_are_distinct_command_results, true);
  assert.equal(c.scheduler_location_discovery_result_required, true);
  assert.equal(c.scheduler_expansion_parameter, 'LOCATION');
  assert.equal(c.scheduler_each_discovered_location_requires_exactly_one_jobs_result, true);
  assert.equal(c.scheduler_duplicate_or_missing_location_result_forbidden, true);

  const discovered = ['europe-west1','us-central1'];
  const expanded = [
    {command_template_id_or_ref:'SCHEDULER_JOBS_BY_LOCATION', resolved_parameters:{PROJECT_ID:'fenix-trading-lab',LOCATION:'europe-west1'}},
    {command_template_id_or_ref:'SCHEDULER_JOBS_BY_LOCATION', resolved_parameters:{PROJECT_ID:'fenix-trading-lab',LOCATION:'us-central1'}},
  ];
  const locations = expanded.map((r) => r.resolved_parameters.LOCATION);
  assert.deepEqual(new Set(locations), new Set(discovered));
  assert.equal(new Set(locations).size, discovered.length);
});

test('capture contract preserves provenance, fail-closed safety and Trading isolation', () => {
  const c = cfg.capture_contract;
  assert.deepEqual(c.required_fields_per_capture, REQUIRED_CAPTURE_FIELDS);
  assert.equal(c.capture_must_reference_source_command, true);
  assert.equal(c.capture_must_be_timestamped, true);
  assert.equal(c.principal_ref_only, true);
  assert.equal(c.raw_payload_stored, false);
  assert.equal(c.secret_payload_present, false);
  assert.equal(c.permission_gaps_must_be_recorded_not_bypassed, true);
  assert.equal(c.api_enablement_forbidden, true);
  assert.equal(c.mutation_forbidden, true);
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
