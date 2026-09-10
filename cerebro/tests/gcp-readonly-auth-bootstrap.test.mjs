import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CEREBRO = path.resolve(HERE, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(CEREBRO, 'evidence', 'gcp-readonly-auth-bootstrap-v0.json'), 'utf8'));

const PROJECTS = [
  'fenix-trading-lab',
  'fenix-capital-455809',
  'fenix-inmobiliaria',
  'fenix-capital-make-web-y-seo',
];

const HUMAN = [
  'LEGAL_REQUIRED',
  'SIGNATURE_REQUIRED',
  'LOW_CONFIDENCE',
  'HIGH_RISK',
  'POLICY_CONFLICT',
  'SECURITY_INCIDENT',
  'MONEY_LIMIT',
  'CUSTOMER_HUMAN_REQUEST',
];

const AUTH_ROUTES = [
  'EXISTING_AUTHENTICATED_GCLOUD_CONTEXT',
  'AUTHORIZED_WORKLOAD_IDENTITY_OR_FEDERATION_WITH_GCLOUD_CONTEXT',
  'AUTHORIZED_CREDENTIAL_REF_FROM_BROKER_WITH_GCLOUD_CONTEXT',
  'FACT_001_NEW_CONNECTOR_ONLY_IF_GAP_PROVEN',
];

const ALLOWED_READ_VERBS = new Set(['list', 'describe', 'get-iam-policy']);

function readVerb(command) {
  const tokens = command.trim().split(/\s+/);
  return tokens.find((token) => ALLOWED_READ_VERBS.has(token)) ?? null;
}

test('auth bootstrap remains SCAFFOLD PLAN_ONLY and zero-cost', () => {
  assert.equal(cfg.status, 'DEFINED_NOT_BUILT');
  assert.equal(cfg.environment, 'SCAFFOLD');
  assert.equal(cfg.engine_id, 'INT-001');
  assert.equal(cfg.execution_mode, 'PLAN_ONLY');
  assert.equal(cfg.additional_cost_target_eur, 0);
  assert.equal(cfg.prod_writes, false);
  assert.equal(cfg.autonomous_prod, false);
  assert.equal(cfg.trading_access, false);
  assert.deepEqual(cfg.required_context, ['company_id','engine_id','environment','version']);
});

test('bootstrap is restricted to the exact four registered GCP projects', () => {
  assert.deepEqual(cfg.known_project_ids, PROJECTS);
  assert.equal(cfg.execution_gate.requires_project_allowlist_match, true);
});

test('credential handling never stores or prints secret values', () => {
  const p = cfg.credential_policy;
  assert.equal(p.plaintext_secret_values_allowed, false);
  assert.equal(p.secrets_in_repo, false);
  assert.equal(p.secrets_in_logs, false);
  assert.equal(p.secrets_in_prompts, false);
  assert.equal(p.transport, 'CREDENTIAL_REFERENCE_OR_EXISTING_AUTH_CONTEXT_ONLY');
  assert.equal(p.least_privilege, true);
  assert.equal(p.read_only_first, true);
  assert.equal(cfg.execution_gate.forbid_token_printing, true);
  assert.equal(cfg.execution_gate.forbid_secret_payload_access, true);
});

test('only implemented auth routes are advertised; standalone ADC is fail-closed', () => {
  assert.deepEqual(cfg.auth_route_priority, AUTH_ROUTES);
  assert.equal(cfg.auth_route_priority.includes('EXISTING_GOOGLE_APPLICATION_DEFAULT_CREDENTIALS'), false);
  assert.equal(cfg.auth_route_constraints.google_application_default_credentials_only_supported_without_executor, false);
  assert.match(cfg.auth_route_constraints.reason, /standalone ADC is not advertised/i);
});

test('all preflight commands are restricted to canonical read-only verbs', () => {
  assert.deepEqual(cfg.preflight_policy.allowed_read_verbs, ['list','describe','get-iam-policy']);
  assert.equal(cfg.preflight_policy.command_prefix, 'gcloud');
  assert.equal(cfg.preflight_policy.fail_closed_on_unknown_verb, true);
  assert.ok(Array.isArray(cfg.preflight_checks) && cfg.preflight_checks.length === 3);

  for (const check of cfg.preflight_checks) {
    assert.match(check.command, /^gcloud\s/);
    const verb = readVerb(check.command);
    assert.ok(verb, `unknown or non-read-only verb in ${check.id}: ${check.command}`);

    const tokens = check.command.trim().split(/\s+/);
    const knownMutationTokens = [
      'create','update','delete','deploy','set-iam-policy','add-iam-policy-binding',
      'remove-iam-policy-binding','enable','disable','start','stop','restart','patch','write'
    ];
    for (const forbidden of knownMutationTokens) {
      assert.equal(tokens.includes(forbidden), false, `forbidden mutating verb ${forbidden} in ${check.id}`);
    }
  }

  assert.deepEqual(cfg.preflight_checks.map((check) => check.command), [
    'gcloud auth list --filter=status:ACTIVE --format=json(account,status)',
    'gcloud projects describe ${PROJECT_ID} --format=json(projectId,name,projectNumber,lifecycleState)',
    'gcloud projects get-iam-policy ${PROJECT_ID} --format=json',
  ]);
});

test('mutation gates are fail-closed before any authenticated discovery', () => {
  const g = cfg.execution_gate;
  assert.equal(g.execute_preflight, false);
  assert.equal(g.requires_explicit_authorized_auth_context, true);
  assert.equal(g.forbid_credential_creation, true);
  assert.equal(g.forbid_role_or_iam_mutation, true);
  assert.equal(g.forbid_api_enablement, true);
  assert.equal(g.forbid_project_mutation, true);
});

test('Training/Trading isolation remains mandatory', () => {
  const g = cfg.training_guard;
  assert.equal(g.training_project_id, 'fenix-trading-lab');
  assert.equal(g.resource_ownership_status, 'UNKNOWN_REQUIRES_AUDIT');
  assert.equal(g.read_only_metadata_audit_allowed, true);
  assert.equal(g.separate_training_from_trading_before_any_write, true);
  assert.equal(g.trading_mutation_forbidden, true);
});

test('handoff preserves audit-before-change sequence and canonical HUMAN_REQUIRED', () => {
  assert.deepEqual(cfg.human_required, HUMAN);
  assert.deepEqual(cfg.handoff_when_auth_available, [
    'RUN_AUTH_PREFLIGHT_READ_ONLY',
    'VERIFY_ALL_FOUR_PROJECTS_VISIBLE_OR_RECORD_PERMISSION_GAPS',
    'RUN_19_DOMAIN_DISCOVERY_PLAN_FROM_GCP_READONLY_COMMAND_CATALOG_V0',
    'CLASSIFY_RESOURCE_OWNERSHIP_TRAINING_TRADING_OTHER',
    'CAPTURE_DEPENDENCY_MAP',
    'CAPTURE_SNAPSHOT_BACKUP_PLAN_BEFORE_ANY_CHANGE',
    'REPRODUCE_CURRENT_TRAINING_FAILURES_BEFORE_FIX',
  ]);
});
