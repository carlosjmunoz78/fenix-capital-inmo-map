import { pathToFileURL } from 'node:url';
import { createBrowser1Tool } from './browser1-access-v1.mjs';

const DEFAULT_AUDIENCE = 'cerebro-browser-worker-v1';
const CREDENTIAL_PLACEHOLDER = /^\$CREDENTIAL\.([A-Za-z0-9_.-]{1,120})$/;

function required(value, name) {
  if (value === undefined || value === null || value === '') throw new Error(`MISSING_${name}`);
  return value;
}

function plainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

export async function getGitHubOidcToken({
  audience = process.env.CEREBRO_BROWSER_OIDC_AUDIENCE || DEFAULT_AUDIENCE,
  request_url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL,
  request_token = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
  fetch_impl = fetch
} = {}) {
  required(request_url, 'ACTIONS_ID_TOKEN_REQUEST_URL');
  required(request_token, 'ACTIONS_ID_TOKEN_REQUEST_TOKEN');
  const url = new URL(request_url);
  url.searchParams.set('audience', audience);
  const response = await fetch_impl(url, {
    headers: { authorization: `Bearer ${request_token}` },
    redirect: 'error'
  });
  if (!response.ok) throw new Error(`GITHUB_OIDC_TOKEN_REQUEST_FAILED:${response.status}`);
  const body = await response.json();
  if (!body?.value || typeof body.value !== 'string') throw new Error('GITHUB_OIDC_TOKEN_MISSING');
  return body.value;
}

async function callDispatch(endpoint, route, token, body = undefined, fetch_impl = fetch) {
  const url = `${endpoint.replace(/\/$/, '')}/${route}`;
  const response = await fetch_impl(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : {'content-type':'application/json'})
    },
    ...(body === undefined ? {} : {body:JSON.stringify(body)}),
    redirect: 'error'
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`BROWSER_DISPATCH_${route.toUpperCase()}_FAILED:${response.status}:${data?.error || 'UNKNOWN'}`);
  return data;
}

function resolveCredentialPath(secret, dottedPath) {
  let value = secret;
  for (const segment of dottedPath.split('.')) {
    if (!plainObject(value) || !Object.prototype.hasOwnProperty.call(value, segment)) throw new Error('CREDENTIAL_PLACEHOLDER_NOT_AVAILABLE');
    value = value[segment];
  }
  if (value === undefined || value === null || (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean')) {
    throw new Error('CREDENTIAL_PLACEHOLDER_VALUE_INVALID');
  }
  return String(value);
}

export function hydrateCredentialPlaceholders(value, secret) {
  if (typeof value === 'string') {
    const match = CREDENTIAL_PLACEHOLDER.exec(value);
    return match ? resolveCredentialPath(secret, match[1]) : value;
  }
  if (Array.isArray(value)) return value.map(item => hydrateCredentialPlaceholders(item, secret));
  if (plainObject(value)) return Object.fromEntries(Object.entries(value).map(([key,nested]) => [key,hydrateCredentialPlaceholders(nested,secret)]));
  return value;
}

function scrub(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) { for (const item of value) scrub(item,seen); return; }
  for (const key of Object.keys(value)) {
    const nested=value[key];
    if (nested && typeof nested === 'object') scrub(nested,seen);
    value[key]=null;
  }
}

function workerInput(job, commands = job.commands) {
  const authority = job.authority && typeof job.authority === 'object' ? job.authority : {};
  return {
    company_id: required(job.company_id, 'COMPANY_ID'),
    department_id: required(job.department_id, 'DEPARTMENT_ID'),
    engine_id: required(job.engine_id, 'ENGINE_ID'),
    environment: required(job.environment, 'ENVIRONMENT'),
    version: job.version || 'v1',
    identity_id: job.identity_id || 'public',
    account_id: job.account_id || 'public',
    commands: required(commands, 'COMMANDS'),
    request_id: String(job.job_id),
    audit_id: required(job.audit_id, 'AUDIT_ID'),
    canonical_engine_ids: authority.canonical_engine_ids || [],
    browser_binding: authority.browser_binding || {},
    engine_authority: authority.engine_authority || {},
    kill_switch_enabled: authority.kill_switch_enabled === true,
    capture_final_evidence: true,
    incremental_spend_eur: 0
  };
}

function resultSummary(result = {}, {credential_materialized=false} = {}) {
  const firstText = !credential_materialized && Array.isArray(result.results)
    ? result.results.find(value => typeof value === 'string')
    : null;
  return {
    ok: result.ok === true,
    authorization_status: result.authorization?.status || null,
    final_url: result.final_url || null,
    result_count: Array.isArray(result.results) ? result.results.length : 0,
    observed_text_sample: firstText ? firstText.slice(0, 300) : null,
    evidence_captured: Boolean(result.final_evidence),
    credential_materialized,
    secret_material_logged: false
  };
}

export async function runOneBrowserJob({
  endpoint = process.env.CEREBRO_BROWSER_DISPATCH_URL,
  seed_canary = process.env.CEREBRO_BROWSER_SEED_CANARY === 'true',
  seed_credential_canary = process.env.CEREBRO_BROWSER_SEED_CREDENTIAL_CANARY === 'true',
  browser1 = createBrowser1Tool({sessions:[]}),
  fetch_impl = fetch
} = {}) {
  required(endpoint, 'CEREBRO_BROWSER_DISPATCH_URL');
  if (seed_canary && seed_credential_canary) throw new Error('ONLY_ONE_CANARY_SEED_PER_RUN');
  const token = await getGitHubOidcToken({fetch_impl});

  if (seed_canary) await callDispatch(endpoint, 'canary-seed', token, {}, fetch_impl);
  if (seed_credential_canary) await callDispatch(endpoint, 'canary-credential-seed', token, {}, fetch_impl);
  const lease = await callDispatch(endpoint, 'lease', token, {}, fetch_impl);
  const job = lease?.job;
  if (!job) return Object.freeze({ok:true,status:'NO_JOB'});

  let secretPayload = null;
  let effectiveCommands = job.commands;
  let credentialMaterialized = false;
  try {
    if (job.credential_ref_id) {
      const materialized = await callDispatch(endpoint, 'credential-materialize', token, {
        job_id:job.job_id,
        lease_id:job.lease_id
      }, fetch_impl);
      if (!materialized?.ok || !plainObject(materialized.secret_payload)) throw new Error('CREDENTIAL_MATERIALIZATION_INVALID');
      secretPayload = materialized.secret_payload;
      effectiveCommands = hydrateCredentialPlaceholders(job.commands, secretPayload);
      credentialMaterialized = true;
    }

    const mode=String(job.mode||'OBSERVE').toUpperCase();
    if (mode!=='OBSERVE'&&mode!=='MUTATE') throw new Error('BROWSER_JOB_MODE_INVALID');
    const executeTool=mode==='MUTATE'?browser1.act:browser1.observe;
    if (typeof executeTool!=='function') throw new Error(`BROWSER1_${mode}_EXECUTOR_MISSING`);
    const result = await executeTool(workerInput(job,effectiveCommands));
    const status = result.ok === true ? 'SUCCEEDED' : 'HOLD';
    const summary = resultSummary(result,{credential_materialized:credentialMaterialized});
    await callDispatch(endpoint, 'complete', token, {
      job_id: job.job_id,
      lease_id: job.lease_id,
      status,
      result_summary: summary,
      error_code: result.ok === true ? null : (result.authorization?.status || 'BROWSER1_NOT_AUTHORIZED')
    }, fetch_impl);
    return Object.freeze({ok:result.ok===true,status,job_id:job.job_id,summary});
  } catch (error) {
    await callDispatch(endpoint, 'complete', token, {
      job_id: job.job_id,
      lease_id: job.lease_id,
      status:'FAILED',
      result_summary:{ok:false,credential_materialized:credentialMaterialized,secret_material_logged:false},
      error_code:String(error?.message || error).slice(0,240)
    }, fetch_impl).catch(()=>null);
    throw error;
  } finally {
    scrub(secretPayload);
    scrub(effectiveCommands);
  }
}

function safeConsoleResult(result) {
  return {
    ok: result.ok,
    status: result.status,
    job_id: result.job_id || null,
    final_url: result.summary?.final_url || null,
    authorization_status: result.summary?.authorization_status || null,
    credential_materialized: result.summary?.credential_materialized === true,
    secret_material_logged: false
  };
}

async function main() {
  const endpoint=process.env.CEREBRO_BROWSER_DISPATCH_URL;
  const runPublic=process.env.CEREBRO_BROWSER_SEED_CANARY==='true';
  const runCredential=process.env.CEREBRO_BROWSER_SEED_CREDENTIAL_CANARY==='true';
  const results=[];
  if (runPublic) results.push(await runOneBrowserJob({endpoint,seed_canary:true,seed_credential_canary:false}));
  if (runCredential) results.push(await runOneBrowserJob({endpoint,seed_canary:false,seed_credential_canary:true}));
  if (!runPublic&&!runCredential) results.push(await runOneBrowserJob({endpoint,seed_canary:false,seed_credential_canary:false}));
  console.log(JSON.stringify({runs:results.map(safeConsoleResult),secret_material_logged:false}));
  if (results.some(result=>result.status!=='NO_JOB'&&result.ok!==true)) process.exitCode=1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

export const BROWSER_JOB_RUNNER_V1_CONTRACT = Object.freeze({
  schema_version:'1.1.0',
  capability_id:'BROWSER-1',
  authentication:'GITHUB_ACTIONS_OIDC',
  audience:DEFAULT_AUDIENCE,
  raw_credentials_in_queue:false,
  vault_credential_materialization:true,
  credential_materialization_requires_live_lease:true,
  credential_values_logged:false,
  browser_session_storage_state_materialization:false,
  incremental_cost_eur:0,
  additional_cost_eur:0
});