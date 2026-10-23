import { pathToFileURL } from 'node:url';
import { createBrowser1Tool } from './browser1-access-v1.mjs';

const DEFAULT_AUDIENCE = 'cerebro-browser-worker-v1';

function required(value, name) {
  if (value === undefined || value === null || value === '') throw new Error(`MISSING_${name}`);
  return value;
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

function workerInput(job) {
  const authority = job.authority && typeof job.authority === 'object' ? job.authority : {};
  return {
    company_id: required(job.company_id, 'COMPANY_ID'),
    department_id: required(job.department_id, 'DEPARTMENT_ID'),
    engine_id: required(job.engine_id, 'ENGINE_ID'),
    environment: required(job.environment, 'ENVIRONMENT'),
    version: job.version || 'v1',
    identity_id: job.identity_id || 'public',
    account_id: job.account_id || 'public',
    commands: required(job.commands, 'COMMANDS'),
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

function resultSummary(result = {}) {
  const firstText = Array.isArray(result.results)
    ? result.results.find(value => typeof value === 'string')
    : null;
  return {
    ok: result.ok === true,
    authorization_status: result.authorization?.status || null,
    final_url: result.final_url || null,
    result_count: Array.isArray(result.results) ? result.results.length : 0,
    observed_text_sample: firstText ? firstText.slice(0, 300) : null,
    evidence_captured: Boolean(result.final_evidence),
    secret_material_logged: false
  };
}

export async function runOneBrowserJob({
  endpoint = process.env.CEREBRO_BROWSER_DISPATCH_URL,
  seed_canary = process.env.CEREBRO_BROWSER_SEED_CANARY === 'true',
  browser1 = createBrowser1Tool({sessions:[]}),
  fetch_impl = fetch
} = {}) {
  required(endpoint, 'CEREBRO_BROWSER_DISPATCH_URL');
  const token = await getGitHubOidcToken({fetch_impl});

  if (seed_canary) await callDispatch(endpoint, 'canary-seed', token, {}, fetch_impl);
  const lease = await callDispatch(endpoint, 'lease', token, {}, fetch_impl);
  const job = lease?.job;
  if (!job) return Object.freeze({ok:true,status:'NO_JOB'});

  try {
    if (job.credential_ref_id) {
      await callDispatch(endpoint, 'complete', token, {
        job_id: job.job_id,
        lease_id: job.lease_id,
        status: 'HOLD',
        result_summary: {ok:false,credential_ref_id:String(job.credential_ref_id),secret_material_logged:false},
        error_code: 'CREDENTIAL_MATERIALIZATION_NOT_ENABLED_IN_PHASE1'
      }, fetch_impl);
      return Object.freeze({ok:false,status:'HOLD_CREDENTIAL_MATERIALIZATION_NOT_ENABLED_IN_PHASE1',job_id:job.job_id});
    }

    const result = await browser1.observe(workerInput(job));
    const status = result.ok === true ? 'SUCCEEDED' : 'HOLD';
    await callDispatch(endpoint, 'complete', token, {
      job_id: job.job_id,
      lease_id: job.lease_id,
      status,
      result_summary: resultSummary(result),
      error_code: result.ok === true ? null : (result.authorization?.status || 'BROWSER1_NOT_AUTHORIZED')
    }, fetch_impl);
    return Object.freeze({ok:result.ok===true,status,job_id:job.job_id,summary:resultSummary(result)});
  } catch (error) {
    await callDispatch(endpoint, 'complete', token, {
      job_id: job.job_id,
      lease_id: job.lease_id,
      status:'FAILED',
      result_summary:{ok:false,secret_material_logged:false},
      error_code:String(error?.message || error).slice(0,240)
    }, fetch_impl).catch(()=>null);
    throw error;
  }
}

async function main() {
  const result = await runOneBrowserJob();
  console.log(JSON.stringify({
    ok: result.ok,
    status: result.status,
    job_id: result.job_id || null,
    final_url: result.summary?.final_url || null,
    authorization_status: result.summary?.authorization_status || null,
    secret_material_logged: false
  }));
  if (result.status !== 'NO_JOB' && result.ok !== true) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

export const BROWSER_JOB_RUNNER_V1_CONTRACT = Object.freeze({
  schema_version:'1.0.0',
  capability_id:'BROWSER-1',
  authentication:'GITHUB_ACTIONS_OIDC',
  audience:DEFAULT_AUDIENCE,
  raw_credentials_in_queue:false,
  phase1_authenticated_materialization:false,
  incremental_cost_eur:0,
  additional_cost_eur:0
});