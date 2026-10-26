const SCORE_THRESHOLDS = Object.freeze({
  overall: 9.0,
  art_direction: 9.0,
  visual_richness: 9.0,
  shot_variety: 8.8,
  narrative_clarity: 8.8,
  originality: 8.7,
  audio_mix: 8.7,
});

export const CINEMATIC_BLOCKBUSTER_STUDIO_V1 = Object.freeze({
  id: 'CINEMATIC_BLOCKBUSTER_STUDIO_V1',
  applies_to: 'ALL_PREMIUM_UMS_PRODUCTIONS',
  creative_north_star: 'Top-tier global cinematic blockbuster studio craft across story, camera, performance, VFX, edit, sound and finishing.',
  imitation_policy: 'QUALITY_EQUIVALENCE_NOT_FRANCHISE_IMITATION',
  minimum_independent_reviews: 3,
  minimum_sampled_frames: 12,
  maximum_procedural_frame_ratio: 0.25,
  minimum_visual_asset_classes: 5,
  score_thresholds: SCORE_THRESHOLDS,
  mandatory_craft: Object.freeze([
    'story_intent', 'cinematic_camera', 'lighting', 'human_or_character_believability',
    'vfx_or_compositing_when_relevant', 'edit_rhythm', 'sound_design', 'music_or_score',
    'color_finish', 'mobile_legibility', 'brand_integrity',
  ]),
});

function push(reasons, code, detail) { reasons.push({ code, detail }); }

export function evaluateStudioQualityStandard(manifest = {}) {
  const standard = CINEMATIC_BLOCKBUSTER_STUDIO_V1;
  const reasons = [];
  const tribunal = manifest.creative_tribunal || {};
  const reviews = Array.isArray(tribunal.reviews) ? tribunal.reviews.filter((r) => r?.independent === true) : [];
  const sampledFrames = Number(tribunal.sampled_frames || 0);
  const provenance = manifest.visual_provenance || {};
  const assetClasses = new Set(Array.isArray(provenance.asset_classes) ? provenance.asset_classes.map(String) : []);
  const proceduralRatio = Number(provenance.procedural_frame_ratio);

  if (manifest.franchise_imitation_requested === true || manifest.copy_identifiable_ip === true) {
    push(reasons, 'FRANCHISE_IMITATION_FORBIDDEN', 'The quality target is blockbuster-level craft, not copying identifiable franchise characters, shots, logos, music or trade dress.');
  }
  if (reviews.length < standard.minimum_independent_reviews) {
    push(reasons, 'BLOCKBUSTER_TRIBUNAL_TOO_SMALL', `Expected at least ${standard.minimum_independent_reviews} independent reviews, found ${reviews.length}.`);
  }
  if (!Number.isFinite(sampledFrames) || sampledFrames < standard.minimum_sampled_frames) {
    push(reasons, 'BLOCKBUSTER_FRAME_SAMPLE_TOO_SMALL', `Expected at least ${standard.minimum_sampled_frames} sampled frames, found ${sampledFrames || 0}.`);
  }
  if (Number.isFinite(proceduralRatio) && proceduralRatio > standard.maximum_procedural_frame_ratio) {
    push(reasons, 'BLOCKBUSTER_PROCEDURAL_RATIO_TOO_HIGH', `Procedural/simple geometry ratio ${proceduralRatio.toFixed(2)} exceeds ${standard.maximum_procedural_frame_ratio.toFixed(2)}.`);
  }
  if (assetClasses.size < standard.minimum_visual_asset_classes) {
    push(reasons, 'BLOCKBUSTER_VISUAL_DIVERSITY_TOO_LOW', `Expected at least ${standard.minimum_visual_asset_classes} visual asset classes, found ${assetClasses.size}.`);
  }

  for (const [metric, threshold] of Object.entries(standard.score_thresholds)) {
    const values = reviews.map((review) => Number(review?.scores?.[metric])).filter(Number.isFinite);
    if (values.length !== reviews.length || values.length === 0) {
      push(reasons, 'BLOCKBUSTER_SCORECARD_INCOMPLETE', `Every independent review must score ${metric}.`);
      continue;
    }
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    if (average < threshold) push(reasons, 'BLOCKBUSTER_SCORE_BELOW_FLOOR', `${metric} average ${average.toFixed(2)} is below ${threshold.toFixed(2)}.`);
  }

  return Object.freeze({
    status: reasons.length ? 'BLOCKED' : 'PASS',
    creative_standard_id: standard.id,
    creative_status: reasons.length ? 'CREATIVE_REJECTED' : 'CREATIVE_ACCEPTED',
    reasons: Object.freeze(reasons),
    policy: standard,
  });
}
