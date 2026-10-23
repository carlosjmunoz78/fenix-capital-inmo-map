const FORBIDDEN_SECRET_KEYS = new Set([
  'password','passwd','secret','secret_value','token','access_token','refresh_token','id_token',
  'cookie','cookies','storage_state','storagestate','session_bundle','sessionbundle','authorization'
]);

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function`);
  return value;
}

function plainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${label} must be a plain object`);
  }
  return value;
}

function rejectRawSecrets(value, path = 'payload', seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectRawSecrets(item, `${path}[${index}]`, seen));
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_SECRET_KEYS.has(String(key).toLowerCase())) throw new Error(`BROWSER1_RAW_SECRET_FIELD_FORBIDDEN:${path}.${key}`);
    rejectRawSecrets(nested, `${path}.${key}`, seen);
  }
}

function canonicalAuthority(raw) {
  plainObject(raw, 'authority_provider result');
  const originEngineId = requiredString(raw.origin_engine_id, 'authority_provider.origin_engine_id');
  if (!Array.isArray(raw.canonical_engine_ids) || !raw.canonical_engine_ids.includes(originEngineId)) {
    throw new Error('BROWSER1_ORIGIN_ENGINE_NOT_CANONICAL');
  }
  plainObject(raw.browser_binding, 'authority_provider.browser_binding');
  plainObject(raw.engine_authority, 'authority_provider.engine_authority');
  if (raw.kill_switch_enabled !== true) throw new Error('BROWSER1_KILL_SWITCH_NOT_ARMED');
  return Object.freeze({
    origin_engine_id: originEngineId,
    canonical_engine_ids: Object.freeze([...raw.canonical_engine_ids]),
    browser_binding: Object.freeze({ ...raw.browser_binding }),
    engine_authority: Object.freeze({ ...raw.engine_authority }),
    kill_switch_enabled: true
  });
}

function browserInput({ context, payload, authority }) {
  return {
    company_id: context.company_id,
    department_id: requiredString(payload.department_id, 'payload.department_id'),
    engine_id: authority.origin_engine_id,
    environment: context.environment,
    version: context.version,
    session_id: payload.session_id || undefined,
    identity_id: payload.identity_id || undefined,
    account_id: payload.account_id || undefined,
    commands: payload.commands,
    request_id: payload.request_id || undefined,
    audit_id: payload.audit_id || undefined,
    session_target_url: payload.session_target_url || undefined,
    action_timeout_ms: payload.action_timeout_ms || undefined,
    capture_final_evidence: payload.capture_final_evidence !== false,
    incremental_spend_eur: 0,
    canonical_engine_ids: authority.canonical_engine_ids,
    browser_binding: authority.browser_binding,
    engine_authority: authority.engine_authority,
    kill_switch_enabled: authority.kill_switch_enabled
  };
}

export function bindBrowser1ToActionGatewayV1({
  actionGateway,
  browser1Tool,
  authority_provider,
  observe_capability = 'browser1.observe',
  act_capability = 'browser1.act'
} = {}) {
  if (!actionGateway || typeof actionGateway !== 'object') throw new TypeError('actionGateway required');
  if (!browser1Tool || typeof browser1Tool !== 'object') throw new TypeError('browser1Tool required');
  requiredFunction(actionGateway.registerCapability?.bind(actionGateway), 'actionGateway.registerCapability');
  requiredFunction(browser1Tool.observe?.bind(browser1Tool), 'browser1Tool.observe');
  requiredFunction(browser1Tool.act?.bind(browser1Tool), 'browser1Tool.act');
  requiredFunction(authority_provider, 'authority_provider');

  const observeName = requiredString(observe_capability, 'observe_capability');
  const actName = requiredString(act_capability, 'act_capability');
  if (observeName === actName) throw new Error('BROWSER1_CAPABILITY_NAMES_MUST_DIFFER');

  async function handler(mode, { context, payload }) {
    plainObject(payload, 'payload');
    rejectRawSecrets(payload);
    const authority = canonicalAuthority(await authority_provider(Object.freeze({
      company_id: context.company_id,
      environment: context.environment,
      version: context.version,
      department_id: payload.department_id || null,
      session_id: payload.session_id || null,
      requested_mode: mode
    })));
    const input = browserInput({ context, payload, authority });
    return mode === 'OBSERVE' ? browser1Tool.observe(input) : browser1Tool.act(input);
  }

  actionGateway.registerCapability(observeName, args => handler('OBSERVE', args));
  actionGateway.registerCapability(actName, args => handler('MUTATE', args));

  return Object.freeze({
    status: 'BOUND',
    gateway_engine_id: 'ACTGW-001',
    observe_capability: observeName,
    act_capability: actName,
    authority_source: 'SERVER_SIDE_PROVIDER',
    raw_secret_payloads: 'DENY',
    context_spoofing: 'DENY',
    additional_cost_eur: 0
  });
}
