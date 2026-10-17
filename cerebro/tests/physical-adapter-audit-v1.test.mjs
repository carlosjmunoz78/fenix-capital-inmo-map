import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const load = (relativeUrl) => JSON.parse(fs.readFileSync(new URL(relativeUrl, import.meta.url), 'utf8'));

const audit = load('../registry/physical-adapter-audit-v1.json');
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
const multimediaPhysical = load('../registry/multimedia-zero-cost-physical-inventory-v1.json');
const brand = load('../registry/brand-commerce-appfactory-profile.v0.json');
const android = load('../registry/fact001-android-staging-48-183.v0.json');

const byId = new Map(audit.domains.map((item) => [item.id, item]));

function assertNoAuthorityExpansion(authority) {
  for (const [key, value] of Object.entries(authority)) {
    if (key === 'additional_cost_eur') {
      assert.equal(value, 0);
      continue;
    }
    assert.notEqual(value, true, `authority expansion forbidden: ${key}`);
  }
}

test('current pointer selects the additive physical audit and no authority expands', () => {
  assert.equal(pointer.current, 'cerebro/registry/physical-adapter-audit-v1.json');
  assert.equal(pointer.authority_change, false);
  assert.equal(pointer.additional_cost_eur, 0);
  assert.equal(audit.environment, 'PREPROD');
  assert.equal(audit.summary.legacy_domains_audited, 11);
  assert.equal(audit.summary.safe_preprod_logic_closed_domains, 11);
  assert.equal(audit.summary.no_new_engine_created, true);
  assert.equal(audit.summary.no_existing_relationship_replaced, true);
  assert.equal(audit.summary.no_prod_or_external_authority_added, true);
  assertNoAuthorityExpansion(audit.authority);
  assert.equal(audit.prod, 'NOT_AUTHORIZED');
});

test('IAM physical gap is not confused with logical IAM/browser policy closure', () => {
  assert.equal(iam.items['43'].status, 'PARCIAL');
  assert.equal(iam.invariants.secret_values_in_registry_allowed, false);
  assert.equal(iam.execution_authorized, false);
  assert.equal(byId.get('IAM_BROWSER_VAULT_PHYSICAL')?.state, 'PARCIAL_PHYSICAL_ATTESTATION_REQUIRED');
});

test('company intent remains safe at company level and person-level resolution stays legal-gated', () => {
  assert.equal(intent.invariants.company_level_default, true);
  assert.equal(intent.invariants.person_resolution_default, false);
  assert.equal(intent.invariants.device_fingerprinting_allowed, false);
  assert.equal(intent.invariants.person_level_third_party_resolution_requires_legal_review, true);
  assert.equal(byId.get('COMPANY_INTENT_PRIVACY_PHYSICAL')?.human_required, 'LEGAL_REQUIRED');
  assert.equal(byId.get('COMPANY_INTENT_PRIVACY_PHYSICAL')?.not_a_blocker_for_safe_preprod, true);
});

test('lead calibration is a data-quality gate, not a falsely missing runtime', () => {
  assert.equal(lead.invariants.conversion_probability_calibrated, false);
  assert.equal(lead.invariants.active_smtp_probe_authorized, false);
  assert.equal(lead.invariants.crm_write_authorized, false);
  assert.equal(byId.get('LEAD_CONTACT_CALIBRATION_PHYSICAL')?.state, 'PARCIAL_DATA_CALIBRATION_NOT_PHYSICAL_RUNTIME_FAILURE');
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
  assert.equal(byId.get('SALES_PHYSICAL_CHANNEL_DELIVERY')?.not_a_blocker_for_safe_preprod, true);
  assert.equal(byId.get('VOICE_LIVE_TELEPHONY')?.not_a_blocker_for_safe_preprod, true);
});

test('economic and marketing analytics/planning stay closed while live spend/publish/write remains gated', () => {
  assert.equal(economic.defaults.real_ad_spend_authorized, false);
  assert.equal(economic.defaults.live_price_mutation_authorized, false);
  assert.equal(economic.free_parity_gate.purchase_execution_authorized, false);
  assert.equal(marketing.existing_seo_policy.replace_existing, false);
  assert.equal(marketing.existing_seo_policy.wrap_existing, true);
  assert.equal(marketing.defaults.ad_spend_authorized, false);
  assert.equal(marketing.defaults.website_write_authorized, false);
  assert.equal(marketing.defaults.seo_write_authorized, false);
  assert.equal(marketing.defaults.offline_conversion_upload_authorized, false);
  assert.equal(byId.get('ECONOMIC_ACTIONS')?.not_a_blocker_for_safe_preprod, true);
  assert.equal(byId.get('MARKETING_SEO_PHYSICAL_ADAPTERS')?.not_a_blocker_for_safe_preprod, true);
});

test('multimedia physical inventory consumes the certified GitHub CI probe without inventing a local runtime', () => {
  assert.equal(multimedia.repository_audit.physical_installation_verified, false);
  assert.equal(multimedia.repository_audit.ffmpeg_binary_verified, false);
  assert.equal(multimedia.defaults.install_authorized, false);
  assert.equal(multimedia.defaults.model_download_authorized, false);

  assert.equal(multimediaPhysical.status, 'PARTIAL_ZERO_COST_MEDIA_CORE_PREPROD');
  assert.equal(multimediaPhysical.scope, 'GITHUB_HOSTED_UBUNTU_CI_PREPROD');
  assert.equal(multimediaPhysical.observed_result.ffmpeg, false);
  assert.equal(multimediaPhysical.observed_result.ffprobe, false);
  assert.equal(multimediaPhysical.observed_result.deterministic_media_core, false);
  assert.equal(multimediaPhysical.semantic_gate.absence_is_valid_evidence, true);
  assert.equal(multimediaPhysical.semantic_gate.absence_must_not_trigger_auto_install, true);
  assert.equal(multimediaPhysical.closure.github_hosted_ci_inventory, 'HECHO');
  assert.equal(multimediaPhysical.closure.github_hosted_ci_zero_cost_media_core, 'NOT_PRESENT');
  assert.equal(multimediaPhysical.closure.authorized_cerebro_runtime_inventory, 'POR_AUDITAR');
  assert.equal(multimediaPhysical.authority.install_authorized, false);
  assert.equal(multimediaPhysical.authority.model_download_authorized, false);
  assert.equal(multimediaPhysical.authority.additional_cost_eur, 0);

  const physicalDomain = byId.get('MULTIMEDIA_PHYSICAL_BINDINGS');
  assert.equal(physicalDomain?.state, 'PARCIAL_GITHUB_CI_INVENTORIED_AUTHORIZED_RUNTIME_STILL_OPEN');
  assert.ok(Array.isArray(physicalDomain?.evidence));
  assert.ok(physicalDomain.evidence.includes('cerebro/registry/multimedia-zero-cost-physical-inventory-v1.json'));
  assert.ok(physicalDomain.open_gates.includes('AUTHORIZED_CEREBRO_RUNTIME_ZERO_COST_TOOL_INVENTORY'));
});

test('brand/app physical bindings remain genuinely open without inventing device execution', () => {
  assert.equal(brand.safety.external_provider_execution, false);
  assert.equal(brand.safety.deploy_or_publish, false);
  assert.equal(android.item_48.physical_device_bound, false);
  assert.equal(android.item_183.physical_device_installed, false);
  assert.equal(byId.get('BRAND_COMMERCE_APP_PHYSICAL')?.not_a_blocker_for_safe_preprod, false);
});

test('all audited domains stay PREPROD and zero additional cost with the completed CI inventory removed from next work', () => {
  assert.equal(audit.summary.additional_cost_eur, 0);
  assert.equal(audit.summary.genuine_physical_binding_domains_still_open.length, 3);
  assert.equal(audit.summary.multimedia_github_hosted_ci_inventory, 'HECHO_NOT_PRESENT');
  assert.equal(audit.summary.multimedia_authorized_cerebro_runtime_inventory, 'POR_AUDITAR');
  assert.ok(audit.next_block.includes('AUDIT_AN_AUTHORIZED_CEREBRO_RUNTIME_FOR_EXISTING_ZERO_COST_MULTIMEDIA_TOOLS_WITHOUT_AUTO_INSTALL'));
  assert.equal(audit.next_block.includes('VERIFY_ZERO_COST_LOCAL_MULTIMEDIA_CAPABILITIES_WITHOUT_INSTALLING_OR_DOWNLOADING_ANYTHING'), false);
  assert.ok(audit.next_block.includes('DO_NOT_OPEN_SIDE_EFFECT_GATES_WITHOUT_THEIR_EXACT_POLICY_HUMAN_OR_MONEY_CONTRACT'));
});
