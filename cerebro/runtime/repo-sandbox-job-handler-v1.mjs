import {
  executePinnedPublicRepositorySandbox,
  inspectUniversalRepoSandboxBackend,
} from './universal-repo-sandbox-executor-v0.mjs';

const PREPROD = 'PREPROD';
const JOB_NAME = 'repo.sandbox.public.readonly.v0';

function nonEmpty(value, label, max = 4096) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max || out.includes('\0')) throw new TypeError(`${label} invalid`);
  return out;
}

function safeCommand(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 64) throw new TypeError('payload.command must be a non-empty array');
  return Object.freeze(value.map((item, index) => nonEmpty(item, `payload.command[${index}]`, 8192)));
}

function safeContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('context required');
  const out = Object.freeze({
    company_id: nonEmpty(value.company_id, 'context.company_id', 128),
    engine_id: nonEmpty(value.engine_id, 'context.engine_id', 128),
    environment: nonEmpty(value.environment, 'context.environment', 32),
    version: nonEmpty(value.version, 'context.version', 128),
  });
  if (out.environment !== PREPROD) throw new Error('repo sandbox durable handler is PREPROD-only');
  return out;
}

function safePayload(payload, context) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('payload required');
  if ('image_ref' in payload || 'docker_bin' in payload || 'git_bin' in payload || 'workspace_root' in payload) {
    throw new Error('runtime-owned sandbox configuration cannot be overridden by job payload');
  }
  const plan = payload.plan;
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new TypeError('payload.plan required');
  if (plan.company_id !== context.company_id) throw new Error('repo sandbox plan company_id must match durable job context');
  if (plan.engine_id !== context.engine_id) throw new Error('repo sandbox plan engine_id must match durable job context');
  if (plan.environment !== context.environment) throw new Error('repo sandbox plan environment must match durable job context');
  return Object.freeze({
    plan,
    repository_url: nonEmpty(payload.repository_url, 'payload.repository_url', 512),
    command: safeCommand(payload.command),
  });
}

function authority() {
  return Object.freeze({
    prod_authorized: false,
    prod_write_authorized: false,
    prod_mutation_authorized: false,
    permission_expansion_authorized: false,
    host_code_execution_authorized: false,
    host_dependency_install_authorized: false,
    customer_data_used: false,
    trading_access: false,
    paid_fallback: false,
    spend_authorized: false,
    additional_cost_eur: 0,
  });
}

export function createRepoSandboxJobHandlerV1({
  workspace_root,
  image_ref,
  docker_bin = 'docker',
  git_bin = 'git',
  executor = executePinnedPublicRepositorySandbox,
  inspect_backend = inspectUniversalRepoSandboxBackend,
} = {}) {
  const workspaceRoot = nonEmpty(workspace_root, 'workspace_root');
  const imageRef = nonEmpty(image_ref, 'image_ref', 512);
  if (typeof executor !== 'function') throw new TypeError('executor must be a function');
  if (typeof inspect_backend !== 'function') throw new TypeError('inspect_backend must be a function');

  let executions = 0;
  let successes = 0;
  let failures = 0;
  let lastStatus = 'READY';
  let lastFinishedAt = null;

  const handler = async ({ context: rawContext, payload, signal, heartbeat, checkpoint } = {}) => {
    const context = safeContext(rawContext);
    const input = safePayload(payload, context);
    executions += 1;
    lastStatus = 'RUNNING';

    if (typeof checkpoint === 'function') checkpoint({ stage: 'BACKEND_CHECK', at: new Date().toISOString() });
    if (typeof heartbeat === 'function') heartbeat();
    try {
      const backend = await inspect_backend({ docker_bin, git_bin });
      if (!backend || backend.status !== 'BACKEND_READY') throw new Error('REPO_SANDBOX_BACKEND_UNAVAILABLE');
      if (signal?.aborted) throw new Error('REPO_SANDBOX_ABORTED');

      if (typeof checkpoint === 'function') checkpoint({ stage: 'PHYSICAL_EXECUTION', backend: backend.backend ?? null, at: new Date().toISOString() });
      const execution = await executor({
        plan: input.plan,
        repository_url: input.repository_url,
        workspace_root: workspaceRoot,
        image_ref: imageRef,
        command: input.command,
        docker_bin,
        git_bin,
        signal,
      });
      if (!execution || execution.status !== 'PHYSICAL_PREPROD_GREEN') {
        throw new Error(`REPO_SANDBOX_EXECUTION_FAILED:${execution?.status ?? 'NO_RESULT'}`);
      }

      successes += 1;
      lastStatus = 'GREEN';
      lastFinishedAt = new Date().toISOString();
      const result = Object.freeze({
        schema_version: '1.0.0',
        state_type: 'CEREBRO_REPO_SANDBOX_DURABLE_JOB_RESULT_V1',
        status: 'PHYSICAL_PREPROD_GREEN',
        job_name: JOB_NAME,
        company_id: context.company_id,
        engine_id: context.engine_id,
        environment: PREPROD,
        version: context.version,
        repository_url: input.repository_url,
        pinned_sha: input.plan.pinned_sha,
        backend: execution.execution?.backend ?? backend.backend ?? null,
        sandbox_status: execution.status,
        exit_code: execution.execution?.exit_code ?? null,
        timed_out: Boolean(execution.execution?.timed_out),
        evidence: Object.freeze({
          materialization_status: execution.materialization?.status ?? null,
          network: execution.execution?.network ?? null,
          workspace_mount: execution.execution?.workspace_mount ?? null,
          sandbox_user: execution.execution?.sandbox_user ?? null,
          secrets_bound: Boolean(execution.execution?.secrets_bound),
          host_mutated: Boolean(execution.execution?.host_mutated),
          prod_touched: Boolean(execution.execution?.prod_touched),
          trading_touched: Boolean(execution.execution?.trading_touched),
        }),
        completed_at: lastFinishedAt,
        ...authority(),
      });
      if (typeof checkpoint === 'function') checkpoint({ stage: 'PHYSICAL_PREPROD_GREEN', at: lastFinishedAt });
      return result;
    } catch (error) {
      failures += 1;
      lastStatus = 'FAILED';
      lastFinishedAt = new Date().toISOString();
      throw error;
    }
  };

  handler.snapshot = () => Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_REPO_SANDBOX_DURABLE_HANDLER_V1',
    status: lastStatus,
    job_name: JOB_NAME,
    environment: PREPROD,
    backend: 'DOCKER_CLI_OCI',
    execution_mode: 'PUBLIC_GITHUB_EXACT_SHA_READONLY',
    executions,
    successes,
    failures,
    last_finished_at: lastFinishedAt,
    ...authority(),
  });

  return handler;
}

export const REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT = Object.freeze({
  capability: 'FACT-001/JOB-001/repo-sandbox-durable-handler-v1',
  job_name: JOB_NAME,
  environment: PREPROD,
  queue: 'JOB-001/DurableJobRuntimeV1',
  worker: 'JOB-001/DurableWorkerRunnerV1',
  execution: 'FACT-001/universal-repo-sandbox-executor-v0',
  source: 'PUBLIC_GITHUB_EXACT_SHA',
  network: 'DENY',
  workspace: 'READ_ONLY',
  runtime_owned_image: true,
  runtime_owned_workspace_root: true,
  retries_and_backoff: 'DurableJobRuntimeV1',
  lease_and_heartbeat: 'DurableWorkerRunnerV1',
  additional_cost_target_eur: 0,
  prod_authorized: false,
  prod_writes: false,
  trading_access: false,
});