import { normalizeProductionJob } from './production-job-contract.mjs';
import { resolveRequiredCapabilities } from './physical-capability-registry.mjs';
import { evaluateProductionQuality } from './production-quality-gate.mjs';
import { evaluatePremiumCreativePreflight } from './premium-creative-preflight-gate.mjs';
import { evaluateStudioQualityStandard } from './studio-quality-standard.mjs';

function text(v) { return String(v ?? '').trim(); }
function now() { return new Date().toISOString(); }

function validateArtifactEvidence(output = {}, environment = 'PREPROD') {
  const reasons = [];
  if (!text(output.artifact_path || output.artifact_uri)) reasons.push('ARTIFACT_PATH_OR_URI_REQUIRED');
  if (!/^[a-f0-9]{64}$/i.test(text(output.artifact_sha256))) reasons.push('ARTIFACT_SHA256_REQUIRED');
  if (!text(output.tool_id || output.model_id)) reasons.push('TOOL_OR_MODEL_REQUIRED');
  if (!text(output.version)) reasons.push('TOOL_VERSION_REQUIRED');
  if (!text(output.role_id)) reasons.push('ROLE_ID_REQUIRED');
  if (!text(output.pod_id)) reasons.push('POD_ID_REQUIRED');
  if (!text(output.started_at) || !text(output.ended_at)) reasons.push('TIMESTAMPS_REQUIRED');
  if (String(output.environment || '').toUpperCase() !== environment) reasons.push('ENVIRONMENT_MISMATCH');
  if (output.provenance_verified !== true && output.artifact_provenance !== true) reasons.push('PROVENANCE_REQUIRED');
  const cost = Number(output.cost_eur ?? 0);
  if (!Number.isFinite(cost) || cost < 0) reasons.push('COST_INVALID');
  return Object.freeze({ ok: reasons.length === 0, reasons: Object.freeze(reasons), cost_eur: Number.isFinite(cost) ? cost : 0 });
}

function qualityManifest(job, executions, reviewEvidence = {}) {
  const request = job.request;
  const payload = request.creative_payload || {};
  const capabilityEvidence = {};
  for (const run of executions) capabilityEvidence[run.capability] = [run];
  return {
    title: request.brief?.objective || request.audit_id || job.production_id,
    request: request.brief,
    quality_profile: 'PREMIUM_SHOWCASE',
    quality_standard_id: job.quality_standard_id,
    technical_status: reviewEvidence.technical_validation?.status || 'UNKNOWN',
    demonstrated_capabilities: executions.map((run) => run.capability),
    capability_evidence: capabilityEvidence,
    execution_evidence: {
      orchestrator: 'UMS_POD_FACTORY',
      pod_manifest_ids: [...new Set(executions.map((run) => run.pod_id).filter(Boolean))],
      role_runs: executions.map((run) => ({ discipline: run.capability, role_id: run.role_id, pod_id: run.pod_id })),
    },
    // Acceptance evidence must come from execution/QA context, never from the requested plan.
    // This prevents a request from declaring itself photoreal, reviewed, or accepted.
    showcase_coverage: reviewEvidence.showcase_coverage || {},
    visual_provenance: reviewEvidence.visual_provenance || {},
    creative_tribunal: reviewEvidence.creative_tribunal || {},
    franchise_imitation_requested: payload.franchise_imitation_requested === true,
    copy_identifiable_ip: payload.copy_identifiable_ip === true,
  };
}

export async function executePremiumProduction(inputJob, {
  capability_registry,
  adapters = {},
  preflight_registry = {},
  context = {},
} = {}) {
  const job = normalizeProductionJob(inputJob);
  const preflight = evaluatePremiumCreativePreflight(job.request, { capability_registry: preflight_registry });
  if (!preflight.ok) {
    return Object.freeze({
      ok: false,
      status: preflight.status === 'WAITING_FOR_CAPABILITY' ? 'WAITING_FOR_CAPABILITY' : 'CREATIVE_REJECTED',
      job_id: job.job_id,
      preflight,
      artifacts: Object.freeze([]),
      cost_eur: 0,
      publish_authorized: false,
    });
  }

  const resolution = resolveRequiredCapabilities(job.required_capabilities, capability_registry);
  if (!resolution.ready) {
    return Object.freeze({ ok: false, status: 'WAITING_FOR_CAPABILITY', job_id: job.job_id, missing_capabilities: resolution.missing, artifacts: Object.freeze([]), cost_eur: 0, publish_authorized: false });
  }

  const executions = [];
  let totalCost = 0;
  for (const binding of resolution.resolved) {
    const adapter = adapters[binding.adapter_id];
    if (!adapter || typeof adapter.probe !== 'function' || typeof adapter.execute !== 'function') {
      return Object.freeze({ ok: false, status: 'WAITING_FOR_CAPABILITY', job_id: job.job_id, missing_capabilities: [{ capability: binding.capability, reasons: ['ADAPTER_RUNTIME_NOT_AVAILABLE'] }], artifacts: Object.freeze(executions), cost_eur: totalCost, publish_authorized: false });
    }
    const probe = await adapter.probe({ job, binding, context });
    if (probe?.status !== 'PASS') {
      return Object.freeze({ ok: false, status: 'WAITING_FOR_CAPABILITY', job_id: job.job_id, missing_capabilities: [{ capability: binding.capability, reasons: ['ADAPTER_PROBE_FAILED'] }], artifacts: Object.freeze(executions), cost_eur: totalCost, publish_authorized: false });
    }
    const started = now();
    const raw = await adapter.execute(job, { binding, context });
    const run = { capability: binding.capability, started_at: raw?.started_at || started, ended_at: raw?.ended_at || now(), environment: job.environment, ...raw };
    const evidence = validateArtifactEvidence(run, job.environment);
    if (!evidence.ok) return Object.freeze({ ok: false, status: 'BLOCKED', job_id: job.job_id, reason: 'INVALID_ARTIFACT_PROVENANCE', evidence_reasons: evidence.reasons, artifacts: Object.freeze(executions), cost_eur: totalCost, publish_authorized: false });
    totalCost += evidence.cost_eur;
    if (totalCost > job.spend_ceiling_eur) return Object.freeze({ ok: false, status: 'HUMAN_REQUIRED', human_exception_reason: 'MONEY_LIMIT', job_id: job.job_id, artifacts: Object.freeze(executions), cost_eur: totalCost, publish_authorized: false });
    executions.push(Object.freeze(run));
  }

  const manifest = qualityManifest(job, executions, context.review_evidence || {});
  const quality = evaluateProductionQuality(manifest);
  if (quality.status !== 'PASS') return Object.freeze({ ok: false, status: 'CREATIVE_REJECTED', job_id: job.job_id, artifacts: Object.freeze(executions), cost_eur: totalCost, quality, publish_authorized: false });

  const studioQuality = evaluateStudioQualityStandard(manifest);
  if (studioQuality.status !== 'PASS') return Object.freeze({ ok: false, status: 'CREATIVE_REJECTED', job_id: job.job_id, artifacts: Object.freeze(executions), cost_eur: totalCost, quality, studio_quality: studioQuality, publish_authorized: false });

  return Object.freeze({
    ok: true,
    status: 'DELIVERABLE_READY',
    job_id: job.job_id,
    production_id: job.production_id,
    artifacts: Object.freeze(executions),
    cost_eur: totalCost,
    quality,
    studio_quality: studioQuality,
    bm13_evidence_candidate: Object.freeze({ state: 'EVIDENCE_READY_FOR_BM13_GATE', physical_execution: true, creative_accepted: true, quality_standard_id: job.quality_standard_id }),
    publish_authorized: false,
  });
}

export const PREMIUM_PRODUCTION_EXECUTOR_V2_CONTRACT = Object.freeze({
  schema_version: '2.0.0', engine_id: 'UMS-001', environment: 'PREPROD',
  quality_standard_id: 'CINEMATIC_BLOCKBUSTER_STUDIO_V1',
  fail_closed: true, zero_cost_default: true, publish_authorized: false,
  states: Object.freeze(['WAITING_FOR_CAPABILITY', 'EXECUTING', 'QA_PENDING', 'CREATIVE_REJECTED', 'DELIVERABLE_READY', 'BLOCKED', 'HUMAN_REQUIRED']),
});
