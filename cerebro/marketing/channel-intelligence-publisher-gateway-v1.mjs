const CURRENT_PROVIDER = 'BUFFER';
const READ_ONLY_BRIDGES = new Set(['MAKE']);

const ADAPTERS = Object.freeze({
  BUFFER: Object.freeze({
    provider: 'BUFFER',
    state: 'CURRENT_EVIDENCED_PUBLISHER',
    channels: ['facebook', 'instagram', 'linkedin'],
    write_binding: 'EXTERNAL_EXISTING_RUNTIME',
    additional_cost_eur: 0
  }),
  META_DIRECT: Object.freeze({
    provider: 'META_DIRECT',
    state: 'PLANNED_NOT_BOUND',
    channels: ['facebook', 'instagram'],
    write_binding: 'NONE',
    additional_cost_eur: 0
  }),
  LINKEDIN_DIRECT: Object.freeze({
    provider: 'LINKEDIN_DIRECT',
    state: 'PLANNED_NOT_BOUND',
    channels: ['linkedin'],
    write_binding: 'NONE',
    additional_cost_eur: 0
  })
});

export function getPublisherTopology() {
  return {
    current_provider: CURRENT_PROVIDER,
    make_role: 'READ_METRICS_BRIDGE_ONLY',
    make_is_publisher: false,
    provider_neutral_gateway: true,
    adapters: structuredClone(ADAPTERS)
  };
}

export function resolvePublisherAdapter({ provider = CURRENT_PROVIDER, channel_id } = {}) {
  if (!channel_id || typeof channel_id !== 'string') {
    throw new TypeError('channel_id is required');
  }
  if (READ_ONLY_BRIDGES.has(provider)) {
    return {
      provider,
      state: 'READ_ONLY_BRIDGE_NOT_PUBLISHER',
      channel_id,
      publish_capable: false,
      reason: 'MAKE_IS_RESERVED_AS_TRANSITIONAL_READ_METRICS_BRIDGE'
    };
  }
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    return {
      provider,
      state: 'UNKNOWN_PROVIDER_FAIL_CLOSED',
      channel_id,
      publish_capable: false,
      reason: 'PROVIDER_NOT_REGISTERED'
    };
  }
  if (!adapter.channels.includes(channel_id)) {
    return {
      provider,
      state: 'UNSUPPORTED_CHANNEL_FAIL_CLOSED',
      channel_id,
      publish_capable: false,
      reason: 'CHANNEL_NOT_SUPPORTED_BY_ADAPTER'
    };
  }
  return {
    ...structuredClone(adapter),
    channel_id,
    publish_capable: adapter.state === 'CURRENT_EVIDENCED_PUBLISHER'
  };
}

export function planPublish({
  company_id,
  channel_id,
  provider = CURRENT_PROVIDER,
  environment = 'PREPROD',
  publication_ref,
  authorize_publish = false,
  spend_eur = 0
} = {}) {
  if (!company_id || !channel_id) throw new TypeError('company_id and channel_id are required');
  if (environment !== 'PREPROD') {
    return {
      state: 'BLOCKED',
      reason: 'PREPROD_ONLY',
      company_id,
      channel_id,
      provider,
      publish_executed: false
    };
  }
  if (Number(spend_eur) > 0) {
    return {
      state: 'HUMAN_REQUIRED',
      human_required_reason: 'MONEY_LIMIT',
      company_id,
      channel_id,
      provider,
      publish_executed: false
    };
  }
  const adapter = resolvePublisherAdapter({ provider, channel_id });
  if (!adapter.publish_capable) {
    return {
      state: 'BLOCKED',
      reason: adapter.reason || adapter.state,
      company_id,
      channel_id,
      provider,
      publication_ref: publication_ref || null,
      publish_executed: false
    };
  }
  return {
    state: authorize_publish ? 'BLOCKED' : 'PLANNED',
    reason: authorize_publish ? 'V1_DOES_NOT_AUTHORIZE_EXTERNAL_PUBLISH_WRITES' : 'DRY_PLAN_ONLY',
    company_id,
    channel_id,
    provider,
    publication_ref: publication_ref || null,
    adapter_state: adapter.state,
    publish_executed: false,
    next_gate: 'SEPARATE_PUBLISHER_PREPROD_E2E'
  };
}

export function planPublisherMigration({ channel_id, target_provider } = {}) {
  if (!channel_id || !target_provider) throw new TypeError('channel_id and target_provider are required');
  const current = resolvePublisherAdapter({ provider: CURRENT_PROVIDER, channel_id });
  const target = resolvePublisherAdapter({ provider: target_provider, channel_id });
  return {
    current,
    target,
    migration_state: target.state === 'PLANNED_NOT_BOUND' ? 'HOLD' : 'REVIEW',
    required_gates: [
      'DEPENDENCY_MAP',
      'BACKUP_SNAPSHOT',
      'PREPROD_E2E',
      'OLD_VS_NEW_AGAINST_BUFFER',
      'IDEMPOTENCY',
      'VERIFY_PHYSICAL_POST',
      'ROLLBACK_TEST',
      'GRADUAL_PROMOTION'
    ],
    disable_buffer_before_promotion: false
  };
}
