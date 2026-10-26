import { createPod } from './pod-factory.mjs';

const POD_SPECS = Object.freeze([
  ['PRODUCTION', ['Creative Direction', 'Narrative', 'Production Management']],
  ['SEQUENCE', ['Storyboarding', 'Shot Design', 'Camera Language', 'Lighting']],
  ['CHARACTER', ['Character Identity', 'Human Performance', 'Continuity']],
  ['ASSET', ['Image Generation', 'Design', 'Illustration', '3D Assets']],
  ['VFX', ['VFX Compositing', 'Particles', 'Simulation', 'Destruction']],
  ['MUSIC', ['Voice', 'Music', 'Sound Design', 'Audio Post']],
  ['VERSION_REVIEW', ['Editing', 'Color', 'Independent QA', 'Publishing Readiness']],
]);

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name}_REQUIRED`);
  return value.trim();
}

/**
 * Creates the governed specialist production plan for a general premium studio
 * showcase. It does not render a video itself.
 */
export function buildPremiumShowcaseProductionPlan(input = {}) {
  const company_id = required(input.company_id || 'GLOBAL', 'COMPANY_ID');
  const production_id = required(input.production_id, 'PRODUCTION_ID');
  const objective = required(input.objective, 'OBJECTIVE');
  const environment = String(input.environment || 'PREPROD').toUpperCase();

  if (environment !== 'PREPROD') {
    throw new Error('PREMIUM_SHOWCASE_ORCHESTRATOR_PREPROD_ONLY');
  }

  const pods = POD_SPECS.map(([pod_type, capabilities]) => createPod({
    pod_type,
    company_id,
    production_id,
    environment,
    objective: `${objective} · ${pod_type}`,
    capabilities,
  }));

  return Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_UMS_PREMIUM_SHOWCASE_PLAN_V1',
    company_id,
    engine_id: 'UMS-001',
    production_id,
    environment,
    objective,
    quality_profile: 'PREMIUM_SHOWCASE',
    status: 'PLANNED_NOT_EXECUTED',
    execution_entrypoint: 'UMS_POD_FACTORY',
    direct_procedural_renderer_allowed_as_primary: false,
    procedural_renderer_role: 'SUPPORTING_MOTION_GRAPHICS_OR_REGRESSION_ONLY',
    pods,
    delivery_contract: {
      must_collect_role_execution_evidence: true,
      must_collect_capability_artifact_evidence: true,
      must_collect_visual_provenance: true,
      must_run_independent_creative_tribunal: true,
      must_run_technical_validation: true,
      final_gate: 'production-quality-gate.mjs',
      fail_closed: true,
    },
    required_showcase_coverage: [
      'character_or_human',
      'photoreal_or_live_scene',
      'three_d_or_vfx',
      'design_or_illustration',
      'editing_and_camera',
      'audio_voice_music',
    ],
    authority: {
      prod_authorized: false,
      publish_authorized: false,
      spend_authorized: false,
      additional_cost_eur_authorized: 0,
    },
  });
}

export const PREMIUM_SHOWCASE_POD_TYPES = Object.freeze(POD_SPECS.map(([type]) => type));
