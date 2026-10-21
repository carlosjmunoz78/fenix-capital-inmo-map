import crypto from 'node:crypto';
import {buildCollectorRegistry} from './channel-intelligence-collector-registry-v1.mjs';

const PREPROD = 'PREPROD';

function text(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}

function sha(value, size = 24) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, size);
}

function normalizeChannel(value) {
  const out = text(value, 'channel', 80).toLowerCase().replaceAll('_','-').replaceAll(' ','-');
  if (!['facebook','instagram','linkedin'].includes(out)) throw new Error(`unsupported existing social channel: ${out}`);
  return out;
}

function providerFromAdapter(adapterKey, channel) {
  const key = text(adapterKey, 'adapter_key', 120).toLowerCase();
  if (key === 'meta_native_make' && ['facebook','instagram'].includes(channel)) return 'META_NATIVE_VIA_EXISTING_MAKE';
  if (key === 'linkedin_native_make' && channel === 'linkedin') return 'LINKEDIN_NATIVE_VIA_EXISTING_MAKE';
  return 'EXISTING_SOCIAL_ADAPTER';
}

export function socialAdapterRowToCollectorDescriptor(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new TypeError('social adapter row object required');
  const companyId = text(row.company_id, 'company_id', 160);
  const engineId = text(row.engine_id, 'engine_id', 80);
  const environment = text(row.environment, 'environment', 40).toUpperCase();
  const version = text(row.version, 'version', 40);
  const channel = normalizeChannel(row.channel);
  const adapterKey = text(row.adapter_key, 'adapter_key', 120);
  const transport = text(row.transport, 'transport', 80).toUpperCase();
  const connectionRef = text(String(row.connection_ref ?? ''), 'connection_ref', 120);
  const costPolicy = text(row.cost_policy, 'cost_policy', 80).toUpperCase();
  const capabilities = row.capabilities && typeof row.capabilities === 'object' && !Array.isArray(row.capabilities) ? row.capabilities : {};
  const updatedAt = text(row.updated_at, 'updated_at', 80);
  if (companyId !== 'fenix-capital' || engineId !== 'SOC-001' || environment !== PREPROD || version !== 'v1') throw new Error('POLICY_CONFLICT:EXISTING_SOCIAL_ADAPTER_SCOPE');
  if (Number.isNaN(Date.parse(updatedAt))) throw new Error('updated_at invalid');
  if (transport !== 'MAKE_EXISTING') throw new Error('existing social adapter bridge V1 supports MAKE_EXISTING read transport only');
  if (costPolicy !== 'ZERO_ADDITIONAL_COST') throw new Error('MONEY_LIMIT:existing social adapter is not zero-additional-cost');
  const metricsCapable = capabilities.metrics === true;
  const enabled = row.enabled === true;
  const ready = enabled && metricsCapable;
  return Object.freeze({
    collector_id: `collector:existing-social:${channel}:${sha([adapterKey, connectionRef], 16)}`,
    provider: providerFromAdapter(adapterKey, channel),
    connector_id: adapterKey,
    state: ready ? 'VERIFIED_READY' : 'DISABLED_POLICY',
    block_reason: ready ? 'NONE' : 'POLICY_DISABLED',
    purposes: ['SOCIAL_OWN_PERFORMANCE'],
    channels: [channel],
    account_scope_ref: `make:connection:${connectionRef}`,
    evidence_ref: `evidence:existing-social-adapter:${channel}:${sha([adapterKey, connectionRef, updatedAt], 16)}`,
    evidence_at: new Date(updatedAt).toISOString(),
    read_only: true,
    write_authorized: false,
    additional_cost_eur: 0,
    priority: 10
  });
}

export function buildCollectorRegistryFromExistingSocialAdapters({rows, evidence_at} = {}) {
  if (!Array.isArray(rows) || rows.length === 0) throw new TypeError('existing social adapter rows required');
  const descriptors = rows.map(socialAdapterRowToCollectorDescriptor);
  return buildCollectorRegistry({
    company_id: 'fenix-capital',
    collectors: descriptors,
    evidence_at
  });
}

export const SOCIAL_ADAPTER_REGISTRY_BRIDGE_V1_CONTRACT = Object.freeze({
  environment: PREPROD,
  existing_source_of_truth: 'public.cerebro_social_adapter_registry_preprod',
  derived_registry_only: true,
  creates_parallel_social_adapter_database: false,
  existing_transport_role: 'READ_IDENTITY_METRICS_ONLY',
  make_publish_authorized: false,
  credentials_exported: false,
  raw_credentials_in_output: false,
  additional_cost_eur: 0
});
