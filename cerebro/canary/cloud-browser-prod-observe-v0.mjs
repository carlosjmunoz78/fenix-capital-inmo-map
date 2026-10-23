import fs from 'node:fs/promises';
import path from 'node:path';
import { createCloudBrowserWorker } from '../runtime/cloud-browser-worker-v0.mjs';
import engineRegistry from '../registry/engine-registry.v1.json' with { type: 'json' };

const targetUrl = process.env.CEREBRO_BROWSER_CANARY_URL || 'https://fenixcapital.es/';
const artifactsRoot = process.env.CEREBRO_BROWSER_ARTIFACTS_ROOT || '.cerebro/browser-artifacts';
const profilesRoot = process.env.CEREBRO_BROWSER_PROFILES_ROOT || '.cerebro/browser-profiles';
const evidenceDir = path.resolve(artifactsRoot, 'prod-canary-summary');
const auditEvents = [];

await fs.mkdir(evidenceDir, { recursive: true });

const worker = createCloudBrowserWorker({
  profiles_root: profilesRoot,
  artifacts_root: artifactsRoot,
  headless: true,
  audit_sink: async event => auditEvents.push(event)
});

const job = {
  request_id: `prod-canary-${Date.now()}`,
  audit_id: `prod-canary-${Date.now()}`,
  company_id: 'fenix',
  identity_id: 'cloud-browser-prod-public-observer',
  environment: 'PROD',
  browser_profile_id: `fenix-prod-public-observer-${process.env.GITHUB_RUN_ID || 'local'}`,
  profile_scope: {
    company_id: 'fenix',
    identity_id: 'cloud-browser-prod-public-observer',
    environment: 'PROD'
  },
  engine_id: 'AUTO-001',
  canonical_engine_ids: engineRegistry.engine_ids,
  kill_switch_enabled: true,
  browser_binding: {
    healthy: true,
    kill_switch_enabled: true,
    fresh_attestation: true,
    binding_class: 'EPHEMERAL_GITHUB_ACTIONS_CHROMIUM',
    attested_in_same_execution: true
  },
  operation: {
    kind: 'OBSERVE',
    incremental_spend_eur: 0,
    customer_data_used: false,
    public_mutation: false,
    prod_mutation: false,
    trading_scope: false
  },
  engine_authority: {
    browser_use_authorized: true,
    session_binding_authorized: false,
    operation_authorized: false,
    prod_mutation_authorized: false,
    promotion_gate_green: false,
    rollback_ready: true,
    observability_ready: true,
    audit_ready: true,
    idempotency_proven: true
  },
  capture_final_evidence: true,
  actions: [
    { type: 'NAVIGATE', url: targetUrl, wait_until: 'domcontentloaded', timeout_ms: 45_000 },
    { type: 'EXTRACT_TEXT', target: { selector: 'h1' }, timeout_ms: 15_000 },
    { type: 'SCREENSHOT', label: 'fenixcapital-prod-home' }
  ]
};

let result;
try {
  result = await worker.execute(job);
  if (result.ok !== true) {
    throw new Error(`CANARY_NOT_AUTHORIZED:${result.authorization?.status || 'UNKNOWN'}`);
  }

  const h1 = String(result.results?.[1] || '').trim();
  const finalUrl = new URL(result.final_url);
  const expectedHost = new URL(targetUrl).hostname;

  if (finalUrl.hostname !== expectedHost) throw new Error(`CANARY_HOST_MISMATCH:${finalUrl.hostname}`);
  if (!h1) throw new Error('CANARY_H1_EMPTY');

  const summary = {
    schema_version: '1.0.0',
    state_type: 'CEREBRO_CLOUD_BROWSER_PROD_OBSERVE_CANARY',
    generated_at: new Date().toISOString(),
    company_id: 'fenix',
    engine_id: 'AUTO-001',
    environment: 'PROD',
    version: 'v0',
    target_origin: `${finalUrl.protocol}//${finalUrl.host}`,
    operation_kind: 'OBSERVE',
    authorization_status: result.authorization?.status || null,
    physical_browser: 'PLAYWRIGHT_CHROMIUM',
    execution_surface: 'GITHUB_ACTIONS_EPHEMERAL',
    final_url: result.final_url,
    observed_h1: h1,
    final_evidence: result.final_evidence,
    zero_customer_data: true,
    public_mutation: false,
    prod_mutation: false,
    incremental_cost_eur: 0,
    status: 'GREEN_PHYSICAL_PROD_OBSERVATION'
  };

  await fs.writeFile(path.join(evidenceDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  await fs.writeFile(path.join(evidenceDir, 'audit.json'), `${JSON.stringify(auditEvents, null, 2)}\n`);
  console.log(JSON.stringify(summary));
} catch (error) {
  const failure = {
    schema_version: '1.0.0',
    state_type: 'CEREBRO_CLOUD_BROWSER_PROD_OBSERVE_CANARY_FAILURE',
    generated_at: new Date().toISOString(),
    company_id: 'fenix',
    engine_id: 'AUTO-001',
    environment: 'PROD',
    target_url: targetUrl,
    error: String(error?.message || error),
    incremental_cost_eur: 0,
    status: 'RED'
  };
  await fs.writeFile(path.join(evidenceDir, 'failure.json'), `${JSON.stringify(failure, null, 2)}\n`);
  await fs.writeFile(path.join(evidenceDir, 'audit.json'), `${JSON.stringify(auditEvents, null, 2)}\n`);
  console.error(JSON.stringify(failure));
  process.exitCode = 1;
}
