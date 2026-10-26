import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateProductionQuality } from '../runtime/production-quality-gate.mjs';

function technicalOnlyShowcaseFixture() {
  return {
    title: 'CEREBRO UMS Studio Showcase',
    request: 'Vídeo de presentación de la productora, espectacular y cinematográfico',
    quality_profile: 'PREMIUM_SHOWCASE',
    technical_status: 'PASS',
    demonstrated_capabilities: [
      'Character Identity',
      '3D',
      'VFX Compositing',
      'Camera Language',
      'Editing',
      'Audio Post',
    ],
    visual_provenance: {
      procedural_frame_ratio: 1,
      asset_classes: ['PIL_GEOMETRY', 'TEXT_CARD'],
    },
    creative_tribunal: {
      sampled_frames: 0,
      reviews: [],
    },
  };
}

test('rejects technically valid procedural showcase that bypassed UMS specialists', () => {
  const result = evaluateProductionQuality(technicalOnlyShowcaseFixture());
  assert.equal(result.technical_status, 'PASS');
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.creative_status, 'CREATIVE_REJECTED');

  const codes = new Set(result.reasons.map((reason) => reason.code));
  assert.ok(codes.has('NO_UMS_POD_EXECUTION_EVIDENCE'));
  assert.ok(codes.has('CAPABILITY_CLAIM_UNPROVEN'));
  assert.ok(codes.has('PROCEDURAL_DOMINANCE'));
  assert.ok(codes.has('MISSING_INDEPENDENT_CREATIVE_TRIBUNAL'));
});

test('a title card never proves a claimed capability', () => {
  const fixture = technicalOnlyShowcaseFixture();
  fixture.capability_evidence = {
    '3D': [{ artifact_path: 'frame-3d-title.png', role_id: null, tool_id: null }],
  };
  const result = evaluateProductionQuality(fixture);
  assert.ok(
    result.reasons.some(
      (reason) => reason.code === 'CAPABILITY_CLAIM_UNPROVEN' && reason.detail.includes('3D'),
    ),
  );
});

test('passes a premium showcase only with execution, provenance, coverage and independent creative review', () => {
  const capabilities = [
    'Character Identity',
    '3D',
    'VFX Compositing',
    'Camera Language',
    'Editing',
    'Audio Post',
  ];

  const capabilityEvidence = Object.fromEntries(
    capabilities.map((capability, index) => [
      capability,
      [{
        artifact_path: `evidence/${index}.json`,
        artifact_sha256: `sha-${index}`,
        role_id: `ROLE-${index}`,
        tool_id: `TOOL-${index}`,
      }],
    ]),
  );

  const result = evaluateProductionQuality({
    title: 'Premium cinematic studio showcase',
    quality_profile: 'PREMIUM_SHOWCASE',
    technical_status: 'PASS',
    demonstrated_capabilities: capabilities,
    capability_evidence: capabilityEvidence,
    execution_evidence: {
      orchestrator: 'UMS_POD_FACTORY',
      pod_manifest_ids: ['prod-pod', 'shot-pod', 'vfx-pod', 'review-pod'],
      role_runs: [
        { discipline: 'creative_direction', role_id: 'CD' },
        { discipline: 'story_or_script', role_id: 'WRITER' },
        { discipline: 'visual_generation', role_id: 'VISDEV' },
        { discipline: 'camera_or_animation', role_id: 'DP' },
        { discipline: 'edit', role_id: 'EDITOR' },
        { discipline: 'sound', role_id: 'MIXER' },
        { discipline: 'independent_qa', role_id: 'QA' },
      ],
    },
    showcase_coverage: {
      character_or_human: true,
      photoreal_or_live_scene: true,
      three_d_or_vfx: true,
      design_or_illustration: true,
      editing_and_camera: true,
      audio_voice_music: true,
    },
    visual_provenance: {
      procedural_frame_ratio: 0.2,
      asset_classes: [
        'GENERATED_VIDEO',
        'CHARACTER_SHOT',
        'THREE_D_RENDER',
        'ILLUSTRATION',
        'VFX_COMPOSITE',
      ],
    },
    creative_tribunal: {
      sampled_frames: 12,
      reviews: [
        {
          independent: true,
          reviewer_role: 'CREATIVE_QA_A',
          scores: {
            overall: 8.7,
            art_direction: 8.8,
            visual_richness: 8.6,
            shot_variety: 8.5,
            narrative_clarity: 8.2,
            originality: 8.0,
            audio_mix: 8.4,
          },
        },
        {
          independent: true,
          reviewer_role: 'CREATIVE_QA_B',
          scores: {
            overall: 8.5,
            art_direction: 8.4,
            visual_richness: 8.5,
            shot_variety: 8.3,
            narrative_clarity: 8.0,
            originality: 7.8,
            audio_mix: 8.1,
          },
        },
      ],
    },
  });

  assert.equal(result.status, 'PASS');
  assert.deepEqual(result.reasons, []);
});

test('procedural-only work is not globally banned when the brief explicitly asks for motion graphics', () => {
  const result = evaluateProductionQuality({
    title: 'Premium motion graphics ident',
    quality_profile: 'MOTION_GRAPHICS_ONLY',
    intent_tags: ['MOTION_GRAPHICS_ONLY'],
    technical_status: 'PASS',
    creative_tribunal: {
      sampled_frames: 8,
      reviews: [
        {
          independent: true,
          scores: {
            overall: 8.4,
            art_direction: 8.4,
            visual_richness: 8.3,
            shot_variety: 8.1,
            narrative_clarity: 8.0,
            originality: 7.8,
            audio_mix: 8.0,
          },
        },
        {
          independent: true,
          scores: {
            overall: 8.3,
            art_direction: 8.2,
            visual_richness: 8.1,
            shot_variety: 8.0,
            narrative_clarity: 7.9,
            originality: 7.7,
            audio_mix: 7.9,
          },
        },
      ],
    },
  });

  assert.equal(result.status, 'PASS');
  assert.ok(result.warnings.some((warning) => warning.code === 'MOTION_GRAPHICS_ONLY_PROFILE'));
});
