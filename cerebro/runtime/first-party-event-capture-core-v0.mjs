import { PersistentEventBus } from './persistent-runtime.mjs';
import { normalizeFirstPartyEvent } from './first-party-account-signals-profile-v1.mjs';

const PREPROD = 'PREPROD';
const ENGINE_ID = 'EVT-001';
const EVENT_TYPE = 'FIRST_PARTY_EVENT_CAPTURED_V0';

function authority(extra = {}) {
  return Object.freeze({
    ...extra,
    prod_authorized: false,
    prod_write_authorized: false,
    provider_write_authorized: false,
    crm_write_authorized: false,
    external_dispatch_authorized: false,
    customer_data_authorized: false,
    trading_access: false,
    additional_cost_eur: 0
  });
}

function contextFrom(event) {
  return Object.freeze({
    company_id: event.company_id,
    engine_id: event.engine_id,
    environment: event.environment,
    version: event.version
  });
}

function persistedPayload(event) {
  return Object.freeze({
    normalized_event_id: event.event_id,
    source: event.source,
    event_type: event.event_type,
    occurred_at: event.occurred_at,
    page_url_origin: event.page_url_origin,
    route_path: event.route_path,
    page_category: event.page_category,
    account_id: event.account_id,
    company_domain: event.company_domain,
    evidence_ref: event.evidence_ref,
    consent_state: event.consent_state,
    raw_ip_stored: event.raw_ip_stored,
    user_agent_stored: event.user_agent_stored,
    cookies_stored: event.cookies_stored,
    form_values_stored: event.form_values_stored,
    query_parameters_stored: event.query_parameters_stored,
    person_identity_stored: event.person_identity_stored,
    device_fingerprint_stored: event.device_fingerprint_stored
  });
}

export function captureFirstPartyEventPreprod({ event_input, file_path } = {}) {
  const normalized = normalizeFirstPartyEvent(event_input ?? {});
  if (normalized.status !== 'NORMALIZED') {
    return authority({
      status: normalized.status,
      reason: normalized.reason ?? 'EVENT_NOT_NORMALIZED',
      human_required: normalized.human_required ?? null,
      persistence_status: 'NOT_PERSISTED',
      normalized_event: normalized
    });
  }
  if (normalized.environment !== PREPROD) {
    return authority({
      status: 'BLOCKED',
      reason: 'FIRST_PARTY_CAPTURE_CORE_PREPROD_ONLY',
      human_required: null,
      persistence_status: 'NOT_PERSISTED',
      normalized_event: normalized
    });
  }
  if (normalized.engine_id !== ENGINE_ID) {
    return authority({
      status: 'BLOCKED',
      reason: 'FIRST_PARTY_CAPTURE_ENGINE_SCOPE_MISMATCH',
      human_required: null,
      persistence_status: 'NOT_PERSISTED',
      normalized_event: normalized
    });
  }

  const bus = new PersistentEventBus({ file_path, environment: PREPROD });
  const published = bus.publish({
    type: EVENT_TYPE,
    context: contextFrom(normalized),
    payload: persistedPayload(normalized),
    idempotency_key: normalized.event_id
  });

  return authority({
    status: published.accepted ? 'CAPTURED_PREPROD' : 'DUPLICATE_NOOP',
    reason: published.accepted ? null : 'IDEMPOTENT_DUPLICATE',
    human_required: null,
    persistence_status: published.accepted ? 'PERSISTED_LOCAL_ATOMIC_JOURNAL' : 'ALREADY_PERSISTED',
    normalized_event: normalized,
    persisted_event: published.event ?? null,
    idempotency_key: normalized.event_id,
    operation_count: bus.operation_count,
    journal_path: bus.journal_path
  });
}

export function listCapturedFirstPartyEvents({ file_path, context } = {}) {
  if (!context || context.environment !== PREPROD) throw new Error('first-party capture listing accepts exact PREPROD context only');
  if (context.engine_id !== ENGINE_ID) throw new Error('first-party capture listing requires EVT-001 context');
  const bus = new PersistentEventBus({ file_path, environment: PREPROD });
  return bus.listForContext(context);
}

export const FIRST_PARTY_EVENT_CAPTURE_CORE_V0_CONTRACT = Object.freeze({
  schema_version: '1.0.0',
  state_type: 'CEREBRO_FIRST_PARTY_EVENT_CAPTURE_CORE_V0',
  company_scope: 'MULTIEMPRESA_CONTEXT_REQUIRED',
  engine_id: ENGINE_ID,
  supporting_engines: Object.freeze(['FACT-001', 'JOB-001', 'OBS-001']),
  environment: PREPROD,
  version: '0.1.0',
  event_type: EVENT_TYPE,
  persistence: 'EXISTING_PERSISTENT_EVT001_LOCAL_ATOMIC_V8_JOURNAL',
  normalization: 'EXISTING_FIRST_PARTY_ACCOUNT_SIGNALS_PROFILE_V1',
  deterministic_idempotency: true,
  consent_required: true,
  raw_ip_storage_allowed: false,
  user_agent_storage_allowed: false,
  cookie_value_storage_allowed: false,
  form_value_capture_allowed: false,
  query_parameter_storage_allowed: false,
  person_identity_storage_allowed: false,
  device_fingerprinting_allowed: false,
  supabase_required: false,
  external_provider_required: false,
  website_tag_deployed: false,
  physical_source_bound: false,
  prod_authorized: false,
  prod_write_authorized: false,
  customer_data_authorized: false,
  trading_access: false,
  additional_cost_target_eur: 0,
  rollback: 'remove additive capture adapter; existing first-party normalization profile and PersistentEventBus remain unchanged',
  rebuild: 'recreate adapter from normalizeFirstPartyEvent plus PersistentEventBus and replay the atomic EVT-001 journal',
  next_gate: 'EXACT_HEAD_CI_THEN_REAL_FIRST_PARTY_SOURCE_BINDING_PREPROD'
});
