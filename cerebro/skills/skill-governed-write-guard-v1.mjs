import fs from 'node:fs';

const DEFAULT_POLICY_PATH = new URL('../governance/skill-governed-write-authorization.v1.json', import.meta.url);
const DEFAULT_REGISTRY_PATH = new URL('../registry/governed-write-skills.v1.json', import.meta.url);

const REQUIRED_FALSE_SAFETY_FLAGS = [
  'direct_main_write',
  'force_push',
  'auto_merge',
  'merge',
  'workflow_mutation',
  'governance_self_mutation',
  'customer_data',
  'prod_business_data',
  'external_skill_code_execution',
  'trading',
  'paid_fallback',
  'new_credentials',
  'app_fenix_deploy'
];

function readJson(url) {
  return JSON.parse(fs.readFileSync(url, 'utf8'));
}

export function loadGovernedWritePolicy() {
  return readJson(DEFAULT_POLICY_PATH);
}

export function loadGovernedWriteRegistry() {
  return readJson(DEFAULT_REGISTRY_PATH);
}

function isFortyHex(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
}

function validGovernedBranch(branch, allowedPrefix) {
  if (typeof branch !== 'string' || typeof allowedPrefix !== 'string') return false;
  if (!(branch.startsWith(`${allowedPrefix}/`) || branch.startsWith(`${allowedPrefix}-`))) return false;
  if (!/^[A-Za-z0-9._/-]+$/.test(branch)) return false;
  if (branch.includes('..') || branch.includes('//') || branch.endsWith('/') || branch.endsWith('.lock')) return false;
  return branch !== 'main';
}

function normalizedRepoPath(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (value.startsWith('/') || value.includes('\\') || value.includes('\0')) return null;
  const parts = value.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) return null;
  return parts.join('/');
}

function evaluatePath(targetPath, policy) {
  const normalized = normalizedRepoPath(targetPath);
  if (!normalized) return { ok: false, reason: 'INVALID_TARGET_PATH' };

  const lower = normalized.toLowerCase();
  const deniedFragments = policy?.path_policy?.denied_case_insensitive_fragments ?? [];
  if (deniedFragments.some((fragment) => lower.includes(String(fragment).toLowerCase()))) {
    return { ok: false, reason: 'DENIED_PATH_FRAGMENT' };
  }

  const deniedExact = policy?.path_policy?.denied_exact_paths ?? [];
  if (deniedExact.some((item) => lower === String(item).toLowerCase())) {
    return { ok: false, reason: 'DENIED_EXACT_PATH' };
  }

  const deniedPrefixes = policy?.path_policy?.denied_prefixes ?? [];
  if (deniedPrefixes.some((prefix) => lower.startsWith(String(prefix).toLowerCase()))) {
    return { ok: false, reason: 'DENIED_PATH_PREFIX' };
  }

  const allowedPrefixes = policy?.path_policy?.allowed_prefixes ?? [];
  if (!allowedPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return { ok: false, reason: 'PATH_OUTSIDE_ALLOWLIST' };
  }

  return { ok: true, normalized };
}

function registryEntryForCandidate(registry, candidateId) {
  return Object.values(registry?.entries ?? {}).find((entry) => entry?.candidate_id === candidateId) ?? null;
}

function pushReason(reasons, condition, reason) {
  if (condition) reasons.push(reason);
}

export function evaluateGovernedWriteRequest(request, options = {}) {
  const policy = options.policy ?? loadGovernedWritePolicy();
  const registry = options.registry ?? loadGovernedWriteRegistry();
  const activationMode = options.activation_mode ?? 'ACTIVE';
  const reasons = [];

  pushReason(reasons, request?.company_id !== policy.company_id, 'COMPANY_SCOPE_MISMATCH');
  pushReason(reasons, request?.engine_id !== policy.engine_id, 'ENGINE_SCOPE_MISMATCH');
  pushReason(reasons, request?.environment !== policy.environment, 'ENVIRONMENT_SCOPE_MISMATCH');
  pushReason(reasons, request?.version !== policy.version, 'VERSION_SCOPE_MISMATCH');

  const canaryPolicyStatuses = new Set([
    'ACTIVE_OWNER_AUTHORIZATION_PENDING_TECHNICAL_CANARY',
    'ACTIVE_GOVERNED_WRITE_AUTHORIZATION'
  ]);
  if (activationMode === 'CANARY') {
    pushReason(reasons, !canaryPolicyStatuses.has(policy.status), 'POLICY_NOT_CANARY_AUTHORIZED');
  } else {
    pushReason(reasons, policy.status !== 'ACTIVE_GOVERNED_WRITE_AUTHORIZATION', 'POLICY_NOT_ACTIVE');
    pushReason(reasons, registry?.status !== 'ACTIVE_GOVERNED_WRITE', 'REGISTRY_NOT_ACTIVE');
  }

  const candidateAllowed = (policy?.exact_candidate_allowlist ?? []).includes(request?.candidate_id);
  pushReason(reasons, !candidateAllowed, 'CANDIDATE_NOT_ALLOWLISTED');

  const operationAllowed = (policy?.allowed_operations ?? []).includes(request?.operation);
  pushReason(reasons, !operationAllowed, 'OPERATION_NOT_ALLOWLISTED');

  const entry = registryEntryForCandidate(registry, request?.candidate_id);
  pushReason(reasons, !entry, 'CANDIDATE_NOT_REGISTERED');
  if (entry && activationMode !== 'CANARY') {
    pushReason(reasons, entry.status !== 'ACTIVE_GOVERNED_WRITE', 'CANDIDATE_NOT_ACTIVE');
  }

  pushReason(reasons, request?.base_ref !== policy?.branch_policy?.base_ref, 'BASE_REF_NOT_ALLOWED');
  pushReason(reasons, !isFortyHex(request?.base_sha), 'BASE_SHA_REQUIRED');
  pushReason(
    reasons,
    !validGovernedBranch(request?.branch, policy?.branch_policy?.allowed_prefix),
    'GOVERNED_BRANCH_REQUIRED'
  );

  const safety = request?.safety;
  pushReason(reasons, !safety || typeof safety !== 'object', 'SAFETY_ENVELOPE_REQUIRED');
  if (safety && typeof safety === 'object') {
    for (const key of REQUIRED_FALSE_SAFETY_FLAGS) {
      pushReason(reasons, safety[key] !== false, `SAFETY_${key.toUpperCase()}_MUST_BE_FALSE`);
    }
    pushReason(reasons, Number(safety.additional_cost_eur) !== 0, 'ADDITIONAL_COST_MUST_BE_ZERO');
  }

  if (request?.operation === 'CREATE_OR_UPDATE_GOVERNED_BRANCH_FILE') {
    const pathCheck = evaluatePath(request?.target_path, policy);
    if (!pathCheck.ok) reasons.push(pathCheck.reason);
  }

  if (request?.operation === 'CREATE_GOVERNED_PULL_REQUEST') {
    pushReason(reasons, request?.pr_base_ref !== policy?.pull_request_policy?.base_ref, 'PR_BASE_REF_NOT_ALLOWED');
    pushReason(reasons, request?.pr_head_ref !== request?.branch, 'PR_HEAD_MUST_EQUAL_GOVERNED_BRANCH');
    pushReason(reasons, request?.auto_merge !== false, 'AUTO_MERGE_MUST_BE_FALSE');
  }

  if (request?.operation === 'UPDATE_GOVERNED_PULL_REQUEST_METADATA') {
    pushReason(reasons, !Number.isInteger(request?.pr_number) || request.pr_number <= 0, 'VALID_PR_NUMBER_REQUIRED');
  }

  const uniqueReasons = [...new Set(reasons)];
  const authorized = uniqueReasons.length === 0;
  return {
    schema_version: '1.0.0',
    state_type: 'CEREBRO_SKILL_GOVERNED_WRITE_GUARD_DECISION',
    company_id: request?.company_id ?? null,
    engine_id: request?.engine_id ?? null,
    environment: request?.environment ?? null,
    version: request?.version ?? null,
    candidate_id: request?.candidate_id ?? null,
    operation: request?.operation ?? null,
    branch: request?.branch ?? null,
    base_ref: request?.base_ref ?? null,
    base_sha: request?.base_sha ?? null,
    target_path: request?.target_path ?? null,
    activation_mode: activationMode,
    authorized,
    status: authorized ? 'AUTHORIZED_GOVERNED_WRITE_REQUEST' : 'DENIED_GOVERNED_WRITE_REQUEST',
    reasons: uniqueReasons,
    authority: {
      direct_main_write: false,
      force_push: false,
      auto_merge: false,
      merge: false,
      workflow_mutation: false,
      governance_self_mutation: false,
      customer_data: false,
      external_skill_code_execution: false,
      trading: false,
      paid_fallback: false,
      app_fenix_deploy: false,
      additional_cost_eur: 0
    }
  };
}

export function assertGovernedWriteAuthorized(request, options = {}) {
  const decision = evaluateGovernedWriteRequest(request, options);
  if (!decision.authorized) {
    const error = new Error(`GOVERNED_WRITE_DENIED:${decision.reasons.join(',')}`);
    error.code = 'GOVERNED_WRITE_DENIED';
    error.decision = decision;
    throw error;
  }
  return decision;
}
