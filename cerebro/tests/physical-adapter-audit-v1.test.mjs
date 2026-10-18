import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const load = (relativeUrl) => JSON.parse(fs.readFileSync(new URL(relativeUrl, import.meta.url), 'utf8'));

const auditV1 = load('../registry/physical-adapter-audit-v1.json');
const audit = load('../registry/physical-adapter-audit-v2.json');
const auditV3 = load('../registry/physical-adapter-audit-v3.json');
const pointer = load('../registry/current-physical-adapter-audit.v1.json');
const iam = load('../registry/authorized-execution-device-profile.v1.json');
const intent = load('../registry/company-intent-resolution-profile.v1.json');
const lead = load('../registry/lead-scoring-contact-confidence-profile.v1.json');
const sales = load('../registry/sales-execution-agent-inbox-profile.v1.json');
const voice = load('../registry/voice001-outreach-profile.v0.json');
const agenda = load('../registry/sale001-agenda-commerce-profile.v0.json');
const reputation = load('../registry/ret-ref-rep-profile.v0.json');
const economic = load('../registry/phase12-economic-learning-profile.v0.json');
const marketing = load('../registry/phase13-marketing-seo-feedback-profile.v0.json');
const multimedia = load('../registry/multimedia-factory-profile.v0.json');
const multimediaInventory = load('../registry/multimedia-zero-cost-physical-inventory-v1.json');
const brand = load('../registry/brand-commerce-appfactory-profile.v0.json');
const android = load('../registry/fact001-android-staging-48-183.v0.json');
const watch = load('../registry/watch-learn-remote-observation.v0.json');
const competBase = load('../registry/compet-real-targets.v0.json');
const competAcceptance = load('../registry/compet-real-targets-acceptance.v1.json');
const cap = load('../registry/cap-ieca-cordoba.v0.json');
const evt74 = load('../registry/first-party-event-capture-core.v0.json');

const closedById = new Map(audit.newly_closed_since_v1.map((item) => [item.id, item]));
const openById = new Map(audit.genuine_physical_or_policy_gates_still_open.map((item) => [item.id, item]));

function assertNoAuthorityExpansion(authority) {
  for (const [key, value] of Object.entries(authority)) {
    if (key === 'additional_cost_eur') { assert.equal(value, 0); continue; }
    assert.notEqual(value, true, `authority expansion forbidden: ${key}`);
  }
}

test('current pointer selects V3 while V1 and V2 remain preserved historical evidence', () => {
  assert.equal(pointer.current, 'cerebro/registry/physical-adapter-audit-v3.json');
  assert.equal(pointer.current_version, 'v3');
  assert.ok(pointer.historical.includes('cerebro/registry/physical-adapter-audit-v1.json'));
  assert.ok(pointer.historical.includes('cerebro/registry/physical-adapter-audit-v2.json'));
  assert.equal(pointer.authority_change, false);
  assert.equal(pointer.additional_cost_eur, 0);
  assert.equal(auditV3.environment, 'PREPROD');
  assert.equal(auditV3.supersedes_for_current_reporting, 'cerebro/registry/physical-adapter-audit-v2.json');
  assert.equal(audit.supersedes_for_current_reporting, 'cerebro/registry/physical-adapter-audit-v1.json');
  assert.equal(auditV1.status, 'AUDITED_NO_BLIND_PHYSICAL_PROMOTION');
  assertNoAuthorityExpansion(audit.authority);
  assert.equal(audit.prod, 'NOT_AUTHORIZED');
  assert.equal(auditV3.autonomy.prod, 'NOT_AUTHORIZED');
  assert.equal(auditV3.autonomy.auto_merge, false);
  assert.equal(auditV3.autonomy.automatic_paid_fallback, false);
  assert.equal(auditV3.autonomy.trading_access, false);
  assert.equal(auditV3.autonomy.additional_cost_eur, 0);
});

test('V3 closes Core Guard only from live readiness while preserving the exact residual order', () => {
  assert.deepEqual(auditV3.mandatory_order, [
    'EVT74_GUARDED_SERVER_JOURNAL_BINDING',
    'ANDROID_48_183',
    'IAM_BROWSER_VAULT_PHYSICAL',
    'MULTIMEDIA_PHYSICAL_BINDINGS',
    'CORE_GUARD_SCHEMA_MARKER'
  ]);
  assert.equal(auditV3.blocks.CORE_GUARD_SCHEMA_MARKER.state, 'HECHO_STAGING_PHYSICAL_GREEN');
  assert.equal(auditV3.blocks.CORE_GUARD_SCHEMA_MARKER.live_readiness_generated_at_utc, '2026-10-18T23:41:13+00:00');
  assert.equal(auditV3.blocks.EVT74_GUARDED_SERVER_JOURNAL_BINDING.state, 'PARCIAL_POLICY_BOUND');
  assert.equal(auditV3.blocks.EVT74_GUARDED_SERVER_JOURNAL_BINDING.human_required, 'POLICY_CONFLICT');
  assert.equal(auditV3.blocks.ANDROID_48_183.state, 'PARCIAL_PHYSICAL_ATTESTATION_REQUIRED');
  assert.equal(auditV3.blocks.IAM_BROWSER_VAULT_PHYSICAL.state, 'PARCIAL_PHYSICAL_ATTESTATION_REQUIRED');
  assert.equal(auditV3.blocks.MULTIMEDIA_PHYSICAL_BINDINGS.state, 'PARCIAL_TARGET_RUNTIME_UNVERIFIED');
  assert.equal(auditV3.exact_head_baseline.observed_pull_request_workflows, 38);
  assert.equal(auditV3.exact_head_baseline.success, 38);
  assert.equal(auditV3.exact_head_baseline.failure, 0);
  assert.equal(auditV3.self_extending_runtime.state, 'PREPROD_GREEN');
  assert.equal(auditV3.self_extending_runtime.runtime_run, 39177521567);
  assert.equal(auditV3.self_extending_runtime.shared_worker, true);
  assert.equal(auditV3.self_extending_runtime.new_server_required, false);
});

test('Watch Learn, COMPET and CAP scheduled acceptance is closed only with current physical evidence', () => {
  assert.equal(watch.status, 'CONTINUOUS_PREPROD_ACCEPTANCE_GREEN');
  assert.equal(watch.verification.scheduled_soak_runs_verified, 3);
  assert.equal(watch.retention.review_status, 'GREEN');
  assert.equal(closedById.get('WATCH_LEARN_47')?.state, 'CONTINUOUS_PREPROD_ACCEPTANCE_GREEN');

  assert.equal(competBase.status, 'REAL_TARGETS_BASELINE_FROZEN_CONTINUOUS_PREPROD');
  assert.equal(competBase.scheduler.soak_complete, false);
  assert.equal(competAcceptance.status, 'REAL_TARGETS_CONTINUOUS_PREPROD_ACCEPTANCE_GREEN');
  assert.equal(competAcceptance.scheduled_acceptance.verified_scheduled_green_runs, 3);
  assert.equal(closedById.get('COMPET_REAL_SOURCE_SCHEDULED_SOAK')?.state, 'CONTINUOUS_PREPROD_ACCEPTANCE_GREEN');

  assert.equal(cap.status, 'REAL_OFFICIAL_COMPANY_DISCOVERY_CONTINUOUS_PREPROD_ACCEPTANCE_GREEN');
  assert.equal(cap.scheduled_soak_certification.verified_scheduled_green_runs, 3);
  assert.equal(closedById.get('CAP_REAL_SOURCE_SCHEDULED_SOAK')?.state, 'CONTINUOUS_PREPROD_ACCEPTANCE_GREEN');
});

test('IAM, Android, EVT74 and multimedia remain truthful physical or policy gates', () => {
  assert.equal(iam.items['43'].status, 'PARCIAL');
  assert.equal(iam.invariants.secret_values_in_registry_allowed, false);
  assert.equal(iam.execution_authorized, false);
  assert.equal(openById.get('IAM_BROWSER_VAULT_PHYSICAL')?.state, 'PARCIAL_PHYSICAL_ATTESTATION_REQUIRED');

  assert.equal(android.item_48.physical_device_bound, false);
  assert.equal(android.item_183.physical_device_installed, false);
  assert.equal(openById.get('ANDROID_48_183')?.state, 'PARCIAL_PHYSICAL_ATTESTATION_REQUIRED');

  assert.equal(evt74.core_scope.guarded_server_journal_binding_verified, false);
  assert.equal(evt74.human_required_gate, 'POLICY_CONFLICT');
  assert.equal(openById.get('EVT74_GUARDED_SERVER_JOURNAL_BINDING')?.human_required, 'POLICY_CONFLICT');

  assert.equal(multimedia.repository_audit.physical_installation_verified, false);
  assert.equal(multimedia.repository_audit.ffmpeg_binary_verified, false);
  assert.equal(multimedia.defaults.install_authorized, false);
  assert.equal(multimedia.defaults.model_download_authorized, false);
  assert.equal(multimediaInventory.authority.additional_cost_eur, 0);
  assert.equal(openById.get('MULTIMEDIA_PHYSICAL_BINDINGS')?.state, 'PARCIAL_PHYSICAL_BINDINGS_UNVERIFIED');
});

test('company intent and lead quality gates are not confused with missing runtime', () => {
  assert.equal(intent.invariants.company_level_default, true);
  assert.equal(intent.invariants.person_resolution_default, false);
  assert.equal(intent.invariants.device_fingerprinting_allowed, false);
  assert.equal(intent.invariants.person_level_third_party_resolution_requires_legal_review, true);
  assert.equal(lead.invariants.conversion_probability_calibrated, false);
  assert.equal(lead.invariants.active_smtp_probe_authorized, false);
  assert.equal(lead.invariants.crm_write_authorized, false);
  assert.ok(audit.safe_preprod_logic_closed_side_effects_still_gated.includes('COMPANY_INTENT_PRIVACY_PHYSICAL'));
  assert.ok(audit.safe_preprod_logic_closed_side_effects_still_gated.includes('LEAD_CONTACT_CALIBRATION_PHYSICAL'));
});

test('sales, voice, agenda and reputation preserve side-effect denial', () => {
  assert.equal(sales.defaults.delivery_enabled, false);
  assert.equal(sales.defaults.crm_write_authorized, false);
  assert.equal(voice.defaults.real_call_authorized, false);
  assert.equal(voice.defaults.recording_enabled, false);
  assert.equal(agenda.defaults.signature_execution_authorized, false);
  assert.equal(agenda.defaults.payment_execution_authorized, false);
  assert.equal(agenda.defaults.invoice_issue_authorized, false);
  assert.equal(reputation.defaults.public_review_post_authorized, false);
  assert.equal(reputation.defaults.google_business_write_authorized, false);
  for (const id of ['SALES_PHYSICAL_CHANNEL_DELIVERY','VOICE_LIVE_TELEPHONY','AGENDA_CONTRACT_PAYMENT_FULFILLMENT','REPUTATION_PUBLIC_REVIEW']) assert.ok(audit.safe_preprod_logic_closed_side_effects_still_gated.includes(id));
});

test('economic and marketing planning stay safe while live spend publish and write remain gated', () => {
  assert.equal(economic.defaults.real_ad_spend_authorized, false);
  assert.equal(economic.defaults.live_price_mutation_authorized, false);
  assert.equal(economic.free_parity_gate.purchase_execution_authorized, false);
  assert.equal(marketing.existing_seo_policy.replace_existing, false);
  assert.equal(marketing.existing_seo_policy.wrap_existing, true);
  assert.equal(marketing.defaults.ad_spend_authorized, false);
  assert.equal(marketing.defaults.website_write_authorized, false);
  assert.equal(marketing.defaults.seo_write_authorized, false);
  assert.equal(marketing.defaults.offline_conversion_upload_authorized, false);
  assert.ok(audit.safe_preprod_logic_closed_side_effects_still_gated.includes('ECONOMIC_ACTIONS'));
  assert.ok(audit.safe_preprod_logic_closed_side_effects_still_gated.includes('MARKETING_SEO_PHYSICAL_ADAPTERS'));
});

test('brand and app physical execution stays gated without inventing public deployment', () => {
  assert.equal(brand.safety.external_provider_execution, false);
  assert.equal(brand.safety.deploy_or_publish, false);
  assert.equal(openById.get('BRAND_COMMERCE_APP_PHYSICAL')?.state, 'PARCIAL_DEVICE_AND_SIDE_EFFECT_GATED');
});

test('V2 historical contract remains PREPROD zero-cost and names only safe next work', () => {
  assert.equal(audit.authority.additional_cost_eur, 0);
  assert.ok(audit.next_block.includes('KEEP_WATCH_COMPET_CAP_CONTINUOUS_MONITORING_READ_ONLY_AND_HOLD_ON_REGRESSION'));
  assert.ok(audit.next_block.includes('CONTINUE_ANDROID_PHYSICAL_E2E_ONLY_WHEN_AUTHORIZED_DEVICE_IS_AVAILABLE'));
  assert.ok(audit.next_block.includes('DO_NOT_OPEN_SIDE_EFFECT_GATES_WITHOUT_EXACT_POLICY_HUMAN_OR_MONEY_CONTRACT'));
});
