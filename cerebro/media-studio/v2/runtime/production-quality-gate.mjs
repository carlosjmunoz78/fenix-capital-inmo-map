const PREMIUM_TERMS = [
  'premium',
  'showcase',
  'cinematic',
  'spectacular',
  'hero film',
  'brand film',
  'presentacion de la productora',
  'presentación de la productora',
  'studio presentation',
];

const REQUIRED_SHOWCASE_COVERAGE = [
  'character_or_human',
  'photoreal_or_live_scene',
  'three_d_or_vfx',
  'design_or_illustration',
  'editing_and_camera',
  'audio_voice_music',
];

const REQUIRED_EXECUTION_DISCIPLINES = [
  'creative_direction',
  'story_or_script',
  'visual_generation',
  'camera_or_animation',
  'edit',
  'sound',
  'independent_qa',
];

const SCORE_THRESHOLDS = Object.freeze({
  overall: 8.0,
  art_direction: 8.0,
  visual_richness: 8.0,
  shot_variety: 8.0,
  narrative_clarity: 7.5,
  originality: 7.5,
  audio_mix: 7.0,
});

function textBlob(manifest = {}) {
  return JSON.stringify({
    title: manifest.title,
    request: manifest.request,
    brief: manifest.brief,
    intent: manifest.intent,
    intent_tags: manifest.intent_tags,
    creative_direction: manifest.creative_direction,
    deliverable_type: manifest.deliverable_type,
  }).toLowerCase();
}

function isPremiumShowcase(manifest = {}) {
  if (manifest.quality_profile === 'PREMIUM_SHOWCASE') return true;
  const blob = textBlob(manifest);
  return PREMIUM_TERMS.some((term) => blob.includes(term));
}

function isExplicitMotionGraphicsOnly(manifest = {}) {
  if (manifest.quality_profile === 'MOTION_GRAPHICS_ONLY') return true;
  const tags = Array.isArray(manifest.intent_tags) ? manifest.intent_tags.map(String) : [];
  return tags.includes('MOTION_GRAPHICS_ONLY') || manifest.motion_graphics_only === true;
}

function pushReason(reasons, code, detail) {
  reasons.push({ code, detail });
}

function validateExecutionEvidence(manifest, reasons) {
  const evidence = manifest.execution_evidence || {};
  if (evidence.orchestrator !== 'UMS_POD_FACTORY') {
    pushReason(
      reasons,
      'NO_UMS_POD_EXECUTION_EVIDENCE',
      'Premium productions must be executed through UMS Pod Factory; a standalone render script is not sufficient.',
    );
  }

  const podIds = Array.isArray(evidence.pod_manifest_ids) ? evidence.pod_manifest_ids : [];
  if (podIds.length < 3) {
    pushReason(
      reasons,
      'INSUFFICIENT_POD_EVIDENCE',
      `Expected at least 3 pod manifests for a premium showcase, found ${podIds.length}.`,
    );
  }

  const disciplines = new Set(
    (Array.isArray(evidence.role_runs) ? evidence.role_runs : [])
      .map((run) => String(run?.discipline || '').toLowerCase())
      .filter(Boolean),
  );

  for (const required of REQUIRED_EXECUTION_DISCIPLINES) {
    if (!disciplines.has(required)) {
      pushReason(
        reasons,
        'MISSING_SPECIALIST_EXECUTION',
        `Missing executed specialist discipline: ${required}. Registered roles alone do not count as execution evidence.`,
      );
    }
  }
}

function validateCapabilityClaims(manifest, reasons) {
  const claims = Array.isArray(manifest.demonstrated_capabilities)
    ? manifest.demonstrated_capabilities
    : [];
  const evidence = manifest.capability_evidence || {};

  for (const claim of claims) {
    const entries = Array.isArray(evidence[claim]) ? evidence[claim] : [];
    const hasConcreteEvidence = entries.some((entry) =>
      entry &&
      (entry.artifact_sha256 || entry.artifact_path) &&
      (entry.role_id || entry.tool_id || entry.model_id),
    );
    if (!hasConcreteEvidence) {
      pushReason(
        reasons,
        'CAPABILITY_CLAIM_UNPROVEN',
        `Capability "${claim}" is claimed but has no role/tool/model + artifact evidence. A title card cannot prove a capability.`,
      );
    }
  }
}

function validateVisualCoverage(manifest, reasons) {
  const coverage = manifest.showcase_coverage || {};
  for (const key of REQUIRED_SHOWCASE_COVERAGE) {
    if (coverage[key] !== true) {
      pushReason(
        reasons,
        'MISSING_SHOWCASE_COVERAGE',
        `Premium studio showcase must physically demonstrate ${key}; text labels or procedural placeholders do not count.`,
      );
    }
  }

  const provenance = manifest.visual_provenance || {};
  const proceduralRatio = Number(provenance.procedural_frame_ratio);
  if (Number.isFinite(proceduralRatio) && proceduralRatio > 0.5) {
    pushReason(
      reasons,
      'PROCEDURAL_DOMINANCE',
      `Procedural-only/simple geometric frames represent ${(proceduralRatio * 100).toFixed(0)}% of the piece; premium showcase maximum is 50%.`,
    );
  }

  const assetClasses = new Set(
    (Array.isArray(provenance.asset_classes) ? provenance.asset_classes : []).map(String),
  );
  if (assetClasses.size < 4) {
    pushReason(
      reasons,
      'INSUFFICIENT_VISUAL_DIVERSITY_EVIDENCE',
      `Expected at least 4 distinct visual asset classes, found ${assetClasses.size}.`,
    );
  }
}

function validatePerceptualTribunal(manifest, reasons) {
  const tribunal = manifest.creative_tribunal || {};
  const reviews = Array.isArray(tribunal.reviews) ? tribunal.reviews : [];
  const independentReviews = reviews.filter((review) => review?.independent === true);

  if (independentReviews.length < 2) {
    pushReason(
      reasons,
      'MISSING_INDEPENDENT_CREATIVE_TRIBUNAL',
      `Premium acceptance requires at least 2 independent perceptual reviews; found ${independentReviews.length}.`,
    );
    return;
  }

  for (const [metric, threshold] of Object.entries(SCORE_THRESHOLDS)) {
    const values = independentReviews
      .map((review) => Number(review?.scores?.[metric]))
      .filter(Number.isFinite);
    if (values.length !== independentReviews.length) {
      pushReason(
        reasons,
        'INCOMPLETE_CREATIVE_SCORECARD',
        `Every independent review must score ${metric}.`,
      );
      continue;
    }
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    if (average < threshold) {
      pushReason(
        reasons,
        'CREATIVE_SCORE_BELOW_THRESHOLD',
        `${metric} average ${average.toFixed(2)} is below required ${threshold.toFixed(2)}.`,
      );
    }
  }

  const sampledFrames = Number(tribunal.sampled_frames || 0);
  if (!Number.isFinite(sampledFrames) || sampledFrames < 8) {
    pushReason(
      reasons,
      'INSUFFICIENT_FRAME_REVIEW',
      `Perceptual review must inspect at least 8 distributed frames; found ${sampledFrames || 0}.`,
    );
  }
}

/**
 * Fail-closed creative acceptance gate for UMS.
 *
 * It deliberately separates TECHNICAL_VALID from CREATIVE_ACCEPTED. A file can
 * be perfectly encoded and still be rejected as a professional production.
 */
export function evaluateProductionQuality(manifest = {}) {
  const reasons = [];
  const warnings = [];
  const premium = isPremiumShowcase(manifest);
  const motionGraphicsOnly = isExplicitMotionGraphicsOnly(manifest);

  if (!premium) {
    return {
      status: 'NOT_APPLICABLE',
      technical_status: manifest.technical_status || 'UNKNOWN',
      creative_status: 'NOT_EVALUATED',
      reasons,
      warnings,
    };
  }

  if (motionGraphicsOnly) {
    warnings.push({
      code: 'MOTION_GRAPHICS_ONLY_PROFILE',
      detail: 'Procedural visuals are allowed because the brief explicitly requests motion graphics only.',
    });
  } else {
    validateExecutionEvidence(manifest, reasons);
    validateCapabilityClaims(manifest, reasons);
    validateVisualCoverage(manifest, reasons);
  }

  validatePerceptualTribunal(manifest, reasons);

  const status = reasons.length === 0 ? 'PASS' : 'BLOCKED';
  return {
    status,
    technical_status: manifest.technical_status || 'UNKNOWN',
    creative_status: status === 'PASS' ? 'CREATIVE_ACCEPTED' : 'CREATIVE_REJECTED',
    reasons,
    warnings,
    policy: {
      premium_showcase: true,
      registered_role_is_not_execution_evidence: true,
      title_card_is_not_capability_evidence: true,
      technical_pass_is_not_creative_pass: true,
      minimum_independent_reviews: 2,
      minimum_sampled_frames: 8,
      score_thresholds: SCORE_THRESHOLDS,
    },
  };
}

export const UMS_PRODUCTION_QUALITY_CONTRACT = Object.freeze({
  required_showcase_coverage: REQUIRED_SHOWCASE_COVERAGE,
  required_execution_disciplines: REQUIRED_EXECUTION_DISCIPLINES,
  score_thresholds: SCORE_THRESHOLDS,
});
