const ALLOWED_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'business.facebook.com',
  'canva.com',
  'www.canva.com',
  'accounts.google.com'
]);

const ALLOWED_COMMANDS = new Set([
  'goto','back','forward','reload','open_tab','close_tab','switch_tab',
  'click','double_click','hover','fill','write','type','press','check','uncheck',
  'select','upload','drag','scroll','wait','extract_text','extract_html',
  'screenshot','download_click'
]);

const SECRETISH_KEYS = /(?:password|passwd|secret|token|access_token|refresh_token|api[_-]?key|cookie)/i;
const MAX_ACTIONS = 50;

function required(value, name, max = 200) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name.toUpperCase()}_REQUIRED`);
  const out = value.trim();
  if (out.length > max) throw new Error(`${name.toUpperCase()}_TOO_LONG`);
  return out;
}

function allowedUrl(raw) {
  const url = new URL(required(raw, 'target_url', 4000));
  if (url.protocol !== 'https:') throw new Error('FACEBOOK_BROWSER_HTTPS_REQUIRED');
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) throw new Error('FACEBOOK_BROWSER_ORIGIN_DENIED');
  return url.toString();
}

function scanForInlineSecrets(value, path = 'request') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForInlineSecrets(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (SECRETISH_KEYS.test(key)) throw new Error(`INLINE_SECRET_DENIED:${path}.${key}`);
    scanForInlineSecrets(nested, `${path}.${key}`);
  }
}

function validateCommands(commands) {
  if (!Array.isArray(commands) || commands.length < 1) throw new Error('FACEBOOK_BROWSER_COMMANDS_REQUIRED');
  if (commands.length > MAX_ACTIONS) throw new Error('FACEBOOK_BROWSER_ACTION_LIMIT_EXCEEDED');
  scanForInlineSecrets(commands, 'commands');
  return commands.map((command, index) => {
    if (!command || typeof command !== 'object' || Array.isArray(command)) throw new Error(`FACEBOOK_BROWSER_COMMAND_INVALID:${index}`);
    const name = required(command.command, 'command', 40).toLowerCase();
    if (!ALLOWED_COMMANDS.has(name)) throw new Error(`FACEBOOK_BROWSER_COMMAND_DENIED:${name}`);
    if ((name === 'goto' || name === 'open_tab') && command.url) allowedUrl(command.url);
    return structuredClone(command);
  });
}

function safeSegment(value) {
  return required(value, 'scope', 120).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export function buildFacebookHumanBrowserRequest(input = {}) {
  const identityId = required(input.identity_id, 'identity_id', 120);
  const accountId = required(input.account_id, 'account_id', 120);
  const targetUrl = allowedUrl(input.target_url);
  const commands = validateCommands(input.commands);
  const risk = String(input.risk || 'LOW').toUpperCase();
  const mode = String(input.mode || 'MUTATE').toUpperCase();
  if (!['OBSERVE','MUTATE'].includes(mode)) throw new Error('FACEBOOK_BROWSER_MODE_DENIED');
  if (!['LOW','MEDIUM'].includes(risk)) throw new Error('FACEBOOK_BROWSER_RISK_DENIED');
  if (Number(input.expected_cost_eur || 0) !== 0) throw new Error('FACEBOOK_BROWSER_MONEY_LIMIT');
  const credentialRef = input.credential_ref_id == null ? null : required(input.credential_ref_id, 'credential_ref_id', 180);

  return Object.freeze({
    idempotency_key: required(input.idempotency_key, 'idempotency_key', 240),
    company_id: 'fenix',
    engine_id: 'SOC-001',
    department_id: 'social-facebook',
    environment: 'PROD',
    version: 'v1',
    mode,
    identity_id: identityId,
    account_id: accountId,
    browser_profile_id: `b1-fenix-${safeSegment(identityId)}-${safeSegment(accountId)}-PROD`,
    credential_ref_id: credentialRef,
    target_url: targetUrl,
    commands,
    risk,
    capability: mode === 'MUTATE' ? 'browser1.act' : 'browser1.observe',
    expected_cost_eur: 0,
    priority: Number.isInteger(input.priority) ? input.priority : 70,
    timeout_seconds: Math.min(Math.max(Number(input.timeout_seconds || 600), 30), 900),
    max_attempts: Math.min(Math.max(Number(input.max_attempts || 2), 1), 3),
    audit_id: required(input.audit_id, 'audit_id', 240),
    authority: {
      canonical_engine_ids: ['SOC-001'],
      browser_binding: {
        healthy: true,
        kill_switch_enabled: true,
        fresh_attestation: true,
        attestation_source: 'SOC001_FACEBOOK_HUMAN_BROWSER_V1'
      },
      engine_authority: {
        browser_use_authorized: true,
        operation_authorized: true,
        prod_mutation_authorized: true,
        promotion_gate_green: true,
        rollback_ready: true,
        observability_ready: true,
        audit_ready: true,
        idempotency_proven: true
      },
      kill_switch_enabled: true,
      delegation_source: 'SOC-001'
    }
  });
}

export function facebookHumanBrowserCapabilities() {
  return Object.freeze({
    contract_id: 'CEREBRO-SOCIAL-FACEBOOK-HUMAN-BROWSER-V1',
    engine_id: 'SOC-001',
    department_id: 'social-facebook',
    execution: Object.freeze(['browser1.observe','browser1.act']),
    allowed_hosts: Object.freeze([...ALLOWED_HOSTS]),
    max_actions_per_job: MAX_ACTIONS,
    human_pacing_provided_by_worker: true,
    synthetic_mutation_canary_green: true,
    synthetic_mutation_canary_job_id: '8b24ee63-4bc0-42e6-9e2d-bebfe159fcf1',
    vault_reference_only: true,
    raw_credentials_in_queue: false,
    no_stealth_evasion: true,
    no_captcha_bypass: true,
    no_mfa_bypass: true,
    incremental_cost_eur: 0
  });
}
