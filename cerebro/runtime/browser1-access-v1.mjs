import { createGovernedCloudBrowserWorker } from './cloud-browser-governed-session-v1.mjs';
import { createEnvAesGcmBrowserSessionResolver } from './browser-session-secret-resolver-v1.mjs';

const DEFAULT_LIMITS = Object.freeze({
  max_active_sessions: 1,
  max_registered_sessions: 64,
  max_tabs_per_session: 8,
  max_actions_per_job: 50,
  default_action_timeout_ms: 30_000
});

const OBSERVE_ONLY = new Set([
  'goto','back','forward','reload','open_tab','close_tab','switch_tab','hover','scroll','wait',
  'extract_text','extract_html','screenshot','pdf'
]);

const COMMAND_MAP = Object.freeze({
  goto: 'NAVIGATE', back: 'BACK', forward: 'FORWARD', reload: 'RELOAD',
  open_tab: 'OPEN_TAB', close_tab: 'CLOSE_TAB', switch_tab: 'SWITCH_TAB',
  click: 'CLICK', double_click: 'DOUBLE_CLICK', hover: 'HOVER',
  fill: 'FILL', write: 'FILL', type: 'TYPE', press: 'PRESS',
  check: 'CHECK', uncheck: 'UNCHECK', select: 'SELECT', upload: 'UPLOAD',
  drag: 'DRAG', scroll: 'SCROLL', wait: 'WAIT', extract_text: 'EXTRACT_TEXT',
  extract_html: 'EXTRACT_HTML', screenshot: 'SCREENSHOT', pdf: 'PDF',
  download_click: 'DOWNLOAD_CLICK'
});

function req(value, name, max = 160) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name.toUpperCase()}_REQUIRED`);
  const out = value.trim();
  if (out.length > max) throw new Error(`${name.toUpperCase()}_TOO_LONG`);
  return out;
}

function safe(value) {
  return String(value ?? '').trim().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function normalizeLimits(input = {}) {
  const out = { ...DEFAULT_LIMITS, ...input };
  for (const [key, value] of Object.entries(out)) {
    if (!Number.isInteger(value) || value < 1) throw new Error(`INVALID_LIMIT:${key}`);
  }
  return Object.freeze(out);
}

export function browser1ProfileId({ company_id, identity_id, account_id, environment } = {}) {
  return `b1-${safe(req(company_id,'company_id'))}-${safe(req(identity_id,'identity_id'))}-${safe(req(account_id,'account_id'))}-${safe(req(environment,'environment',40))}`;
}

function normalizeSessionRecord(record = {}) {
  const company_id = req(record.company_id, 'company_id');
  const identity_id = req(record.identity_id, 'identity_id');
  const account_id = req(record.account_id, 'account_id');
  const environment = req(record.environment, 'environment', 40);
  const session_id = req(record.session_id, 'session_id');
  const browser_profile_id = record.browser_profile_id || browser1ProfileId({company_id,identity_id,account_id,environment});
  const allowed_departments = Array.isArray(record.allowed_departments)
    ? Object.freeze(record.allowed_departments.map(x => req(x,'department_id',120)))
    : Object.freeze([]);
  if (!record.session_bundle || typeof record.session_bundle !== 'object') throw new Error('SESSION_BUNDLE_REQUIRED');
  return Object.freeze({ session_id, company_id, identity_id, account_id, environment, browser_profile_id, allowed_departments, session_bundle: record.session_bundle });
}

function compileCommand(command = {}, mode = 'OBSERVE') {
  const name = req(command.command, 'command', 40).toLowerCase();
  const type = COMMAND_MAP[name];
  if (!type) throw new Error(`BROWSER1_COMMAND_UNSUPPORTED:${name}`);
  if (mode === 'OBSERVE' && !OBSERVE_ONLY.has(name)) throw new Error(`BROWSER1_MUTATION_MODE_REQUIRED:${name}`);
  const action = { ...command, type };
  delete action.command;
  if (name === 'goto') action.url = req(command.url, 'url', 4000);
  if (name === 'open_tab' && command.url) action.url = req(command.url, 'url', 4000);
  if (name === 'switch_tab') action.index = Number(command.index);
  if (name === 'write' || name === 'fill' || name === 'type') action.value = String(command.value ?? '');
  return Object.freeze(action);
}

export function compileBrowser1Commands(commands = [], { mode = 'OBSERVE', limits = DEFAULT_LIMITS } = {}) {
  if (!Array.isArray(commands) || commands.length < 1) throw new Error('BROWSER1_COMMANDS_REQUIRED');
  if (commands.length > limits.max_actions_per_job) throw new Error('BROWSER1_ACTION_LIMIT_EXCEEDED');
  const normalizedMode = String(mode || '').toUpperCase();
  if (!['OBSERVE','MUTATE'].includes(normalizedMode)) throw new Error('BROWSER1_MODE_INVALID');
  let tabs = 1;
  const actions = commands.map(command => {
    const action = compileCommand(command, normalizedMode);
    if (action.type === 'OPEN_TAB') tabs += 1;
    if (action.type === 'CLOSE_TAB') tabs = Math.max(0, tabs - 1);
    if (tabs > limits.max_tabs_per_session) throw new Error('BROWSER1_TAB_LIMIT_EXCEEDED');
    return action;
  });
  return Object.freeze(actions);
}

function publicProfileId(input) {
  return browser1ProfileId({
    company_id: input.company_id,
    identity_id: input.identity_id || 'public',
    account_id: input.account_id || 'public',
    environment: input.environment
  });
}

export function createBrowser1Tool({
  sessions = [],
  limits: limitOverrides = {},
  secret_resolver = createEnvAesGcmBrowserSessionResolver(),
  worker_factory = createGovernedCloudBrowserWorker,
  worker_options = {}
} = {}) {
  const limits = normalizeLimits(limitOverrides);
  if (!Array.isArray(sessions)) throw new Error('BROWSER1_SESSIONS_ARRAY_REQUIRED');
  if (sessions.length > limits.max_registered_sessions) throw new Error('BROWSER1_REGISTERED_SESSION_LIMIT_EXCEEDED');
  const registry = new Map();
  for (const raw of sessions) {
    const record = normalizeSessionRecord(raw);
    if (registry.has(record.session_id)) throw new Error('BROWSER1_DUPLICATE_SESSION_ID');
    registry.set(record.session_id, record);
  }
  const worker = worker_factory({ ...worker_options, secret_resolver, max_tabs: limits.max_tabs_per_session });
  let busy = false;

  function status() {
    return Object.freeze({
      schema_version: '1.0.0',
      capability_id: 'BROWSER-1',
      state: busy ? 'BUSY' : 'READY',
      limits,
      registered_sessions: Object.freeze([...registry.values()].map(x => Object.freeze({
        session_id:x.session_id, company_id:x.company_id, identity_id:x.identity_id,
        account_id:x.account_id, environment:x.environment, browser_profile_id:x.browser_profile_id,
        allowed_departments:x.allowed_departments
      })))
    });
  }

  async function execute(input = {}) {
    if (busy) return {ok:false,status:'HOLD_BROWSER1_BUSY',human_required:null,results:[]};
    const mode = String(input.mode || 'OBSERVE').toUpperCase();
    const company_id = req(input.company_id, 'company_id');
    const department_id = req(input.department_id, 'department_id');
    const engine_id = req(input.engine_id, 'engine_id', 80);
    const environment = req(input.environment, 'environment', 40);
    const version = req(input.version || 'v1', 'version', 40);
    const actions = compileBrowser1Commands(input.commands, {mode,limits});

    let session = null;
    if (input.session_id) {
      session = registry.get(String(input.session_id));
      if (!session) return {ok:false,status:'HOLD_BROWSER1_SESSION_NOT_REGISTERED',human_required:null,results:[]};
      if (session.company_id !== company_id) return {ok:false,status:'HOLD_BROWSER1_CROSS_COMPANY_SESSION_DENIED',human_required:null,results:[]};
      if (session.environment !== environment) return {ok:false,status:'HOLD_BROWSER1_CROSS_ENVIRONMENT_SESSION_DENIED',human_required:null,results:[]};
      if (session.allowed_departments.length && !session.allowed_departments.includes(department_id)) {
        return {ok:false,status:'HOLD_BROWSER1_DEPARTMENT_SESSION_DENIED',human_required:null,results:[]};
      }
    }

    const authenticated = Boolean(session);
    const browser_profile_id = authenticated ? session.browser_profile_id : publicProfileId({company_id,identity_id:input.identity_id,account_id:input.account_id,environment});
    const identity_id = authenticated ? session.identity_id : (input.identity_id || 'public');
    const account_id = authenticated ? session.account_id : (input.account_id || 'public');
    const operation = mode === 'MUTATE'
      ? { kind:'ROUTINE_MUTATION', authenticated_session_required:authenticated, incremental_spend_eur:Number(input.incremental_spend_eur || 0) }
      : authenticated
        ? { kind:'AUTHENTICATED_OBSERVE', authenticated_session_required:true, incremental_spend_eur:0 }
        : { kind:'OBSERVE', incremental_spend_eur:0 };

    const job = {
      request_id: input.request_id || `browser1-${Date.now()}`,
      audit_id: input.audit_id || `browser1-audit-${Date.now()}`,
      company_id, department_id, engine_id, environment, version,
      identity_id, account_id, browser_profile_id,
      profile_scope:{company_id,identity_id,environment},
      canonical_engine_ids: input.canonical_engine_ids || [],
      browser_binding: input.browser_binding || {},
      engine_authority: input.engine_authority || {},
      kill_switch_enabled: input.kill_switch_enabled === true,
      operation,
      actions,
      action_timeout_ms: input.action_timeout_ms || limits.default_action_timeout_ms,
      capture_final_evidence: input.capture_final_evidence !== false,
      keep_session_open:false,
      ...(authenticated ? {session_bundle:session.session_bundle,session_target_url:input.session_target_url || null} : {})
    };

    busy = true;
    try {
      const result = await worker.execute(job);
      return {
        ...result,
        browser1:Object.freeze({
          capability_id:'BROWSER-1', company_id, department_id, engine_id, environment,
          session_id:session?.session_id || null, identity_id, account_id, browser_profile_id,
          mode, serialized_execution:true, active_session_limit:limits.max_active_sessions
        })
      };
    } finally {
      busy = false;
    }
  }

  return Object.freeze({
    execute,
    observe: input => execute({...input,mode:'OBSERVE'}),
    act: input => execute({...input,mode:'MUTATE'}),
    status,
    limits
  });
}

export const BROWSER1_ACCESS_V1_CONTRACT = Object.freeze({
  schema_version:'1.0.0',
  capability_id:'BROWSER-1',
  transversal:true,
  logical_engine:false,
  execution_model:'SINGLE_ACTIVE_SESSION_SERIAL',
  initial_limits:DEFAULT_LIMITS,
  supports_multiple_accounts_same_company:true,
  supports_multiple_departments:true,
  supports_authenticated_sessions:true,
  supports_public_browsing:true,
  write_actions_supported:true,
  prod_write_requires_origin_engine_authority:true,
  live_viewer_included:false,
  orchestrator_pool_included:false,
  additional_cost_eur:0
});
