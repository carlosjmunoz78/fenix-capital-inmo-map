import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CEREBRO = path.resolve(HERE, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'evidence', 'gcp-live-inventory-evidence-envelope-v0.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'evidence', 'gcp-readonly-command-catalog-v0.json'), 'utf8'));

const PROJECTS = ['fenix-trading-lab','fenix-capital-455809','fenix-inmobiliaria','fenix-capital-make-web-y-seo'];
const DOMAINS = ['projects','enabled_apis','cloud_run','cloud_functions','compute','jobs','scheduler','pubsub','storage','databases','artifact_registry','service_accounts_and_iam','secret_references','networking','logging_monitoring','billing_cost','regions','deployments','resource_consumers'];
const RESULT_STATUS = ['SUCCESS','PERMISSION_DENIED','API_UNAVAILABLE','EMPTY','ERROR'];
const REQUIRED_COMMAND_RESULT_FIELDS = ['command_run_ref','command_template_id_or_ref','result_status','captured_at','principal_ref','evidence_ref','resolved_parameters'];

function derivedIds(domain){const row=catalog.domain_commands.find((x)=>x.domain===domain); return row.commands.map((_,i)=>`GCP-READONLY-CATALOG:${domain}:${i}`);}

test('scaffold/read-only/zero-cost and exact allowlists',()=>{
  assert.equal(cfg.status,'DEFINED_NOT_BUILT'); assert.equal(cfg.environment,'SCAFFOLD'); assert.equal(cfg.engine_id,'INT-001'); assert.equal(cfg.execution_mode,'READ_ONLY_CAPTURE_ONLY'); assert.equal(cfg.additional_cost_target_eur,0); assert.equal(cfg.prod_writes,false); assert.equal(cfg.autonomous_prod,false); assert.equal(cfg.trading_access,false); assert.deepEqual(cfg.project_allowlist,PROJECTS); assert.deepEqual(cfg.required_inventory_domains,DOMAINS);
});

test('all capture records inherit one exact scaffold context',()=>{
  const c=cfg.context_contract; assert.equal(c.engine_id_must_equal_envelope_engine_id,true); assert.equal(c.environment_must_equal_envelope_environment,true); assert.equal(c.version_must_be_uniform_across_all_records,true); assert.equal(c.company_id_must_be_uniform_across_all_records,true); assert.equal(c.record_context_must_not_override_envelope_context,true);
});

test('coverage is exactly 4x19 and RESOURCE does not count toward it',()=>{
  const c=cfg.coverage_contract; assert.equal(c.required_project_domain_pairs,76); assert.equal(c.exactly_one_domain_coverage_record_per_pair,true); assert.equal(c.missing_pairs_forbidden,true); assert.equal(c.duplicate_pairs_forbidden,true); assert.equal(c.resource_ref_value,'__DOMAIN__'); assert.equal(cfg.capture_contract.resource_records_must_not_count_toward_76_pair_coverage,true);
  const pairs=PROJECTS.flatMap((p)=>DOMAINS.map((d)=>`${p}::${d}`)); assert.equal(pairs.length,76); assert.equal(new Set(pairs).size,76);
});

test('template identities derive only from existing catalog domain_commands[].commands',()=>{
  const c=cfg.coverage_contract; assert.equal(c.catalog_ref,'gcp-readonly-command-catalog-v0.json'); assert.equal(c.catalog_source_field,'domain_commands[].commands'); assert.equal(c.template_identity_derivation,'GCP-READONLY-CATALOG:<domain>:<zero_based_command_index>'); assert.equal(c.required_command_templates_must_equal_derived_catalog_identities_in_order,true);
  assert.deepEqual(derivedIds('pubsub'),['GCP-READONLY-CATALOG:pubsub:0','GCP-READONLY-CATALOG:pubsub:1']);
  assert.deepEqual(derivedIds('databases'),['GCP-READONLY-CATALOG:databases:0','GCP-READONLY-CATALOG:databases:1']);
});

test('every required template and expansion must have its own command result',()=>{
  const c=cfg.coverage_contract; assert.equal(c.command_results_required_per_coverage_record,true); assert.equal(c.one_command_result_per_required_template,true); assert.equal(c.one_command_result_per_expansion,true); assert.equal(c.missing_required_template_result_forbidden,true); assert.deepEqual(c.command_result_required_fields,REQUIRED_COMMAND_RESULT_FIELDS); assert.deepEqual(c.command_result_status_values,RESULT_STATUS); assert.equal(c.resolved_parameters_must_include_project_id,true); assert.equal(c.resolved_project_id_must_equal_coverage_project_id,true);
  const coverageProject='fenix-inmobiliaria'; const result={resolved_parameters:{PROJECT_ID:'fenix-trading-lab'}}; assert.notEqual(result.resolved_parameters.PROJECT_ID,coverageProject);
});

test('scheduler location expansion is explicit one-to-one and fail-closed',()=>{
  const c=cfg.coverage_contract; assert.equal(c.scheduler_location_discovery_result_required,true); assert.equal(c.scheduler_expansion_parameter,'LOCATION'); assert.equal(c.scheduler_each_discovered_location_requires_exactly_one_jobs_result,true); assert.equal(c.scheduler_each_jobs_result_must_include_location_equal_to_discovered_value,true); assert.equal(c.scheduler_zero_jobs_results_allowed_when_no_locations_discovered,true); assert.equal(c.scheduler_failed_or_empty_discovery_requires_zero_jobs_expansions,true); assert.equal(c.scheduler_duplicate_or_missing_location_result_forbidden,true); assert.deepEqual(derivedIds('scheduler'),['GCP-READONLY-CATALOG:scheduler:0','GCP-READONLY-CATALOG:scheduler:1']);
});

test('capture remains fail-closed and Trading isolated',()=>{
  const c=cfg.capture_contract; assert.equal(c.raw_payload_stored,false); assert.equal(c.secret_payload_present,false); assert.equal(c.permission_gaps_must_be_recorded_not_bypassed,true); assert.equal(c.api_enablement_forbidden,true); assert.equal(c.mutation_forbidden,true); const g=cfg.fenix_trading_lab_guard; assert.equal(g.resource_ownership_status,'UNKNOWN_REQUIRES_AUDIT'); assert.equal(g.write_blocked_until_training_trading_separated,true); assert.equal(g.trading_mutation_forbidden,true);
});

test('reproducibility and live-auth gate remain explicit',()=>{
  assert.deepEqual(cfg.reproducibility_links,['inventory','dependency_map','backup_snapshot','current_contract','behavioral_tests','observability_references','cost_evidence','rebuild_runbook','rollback_runbook']); assert.equal(cfg.next_gate,'AUTHORIZED_GCP_READ_ONLY_CONTEXT_REQUIRED_BEFORE_LIVE_CAPTURE');
});
