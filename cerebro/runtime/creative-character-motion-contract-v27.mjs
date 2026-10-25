import crypto from 'node:crypto';
import fs from 'node:fs';

export const CHARACTER_MOTION_CONTRACT_VERSION = '2.7.0';

function required(value, name) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`MISSING_${name}`);
  }
  return value;
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function buildCharacterMotionContract(input = {}) {
  const identityId = String(required(input.identity_id, 'IDENTITY_ID'));
  const referenceImage = String(required(input.reference_image, 'REFERENCE_IMAGE'));
  if (!fs.existsSync(referenceImage)) throw new Error('REFERENCE_IMAGE_NOT_FOUND');

  const shots = Array.isArray(input.shots) ? input.shots : [];
  if (shots.length < 3) throw new Error('CHARACTER_MOTION_MIN_3_SHOTS');

  const normalized = shots.map((shot, index) => {
    const duration = Number(shot.duration_sec ?? 0);
    if (!Number.isFinite(duration) || duration < 0.8 || duration > 8) {
      throw new Error(`SHOT_DURATION_INVALID:${index + 1}`);
    }
    return {
      shot_id: String(shot.shot_id || `shot-${index + 1}`),
      identity_id: identityId,
      driving_video: String(required(shot.driving_video, `SHOT_${index + 1}_DRIVING_VIDEO`)),
      camera_instruction: String(required(shot.camera_instruction, `SHOT_${index + 1}_CAMERA_INSTRUCTION`)),
      performance_instruction: String(required(shot.performance_instruction, `SHOT_${index + 1}_PERFORMANCE_INSTRUCTION`)),
      duration_sec: duration,
      allow_identity_change: false,
      allow_random_face_insertion: false,
    };
  });

  const referenceSha = sha256File(referenceImage);
  return {
    schema_version: '1.0.0',
    contract_version: CHARACTER_MOTION_CONTRACT_VERSION,
    company_id: input.company_id || 'fenix',
    engine_id: 'CREATIVE-CHARACTER-MOTION-V27',
    environment: input.environment || 'PREPROD',
    version: 'v2.7',
    identity: {
      identity_id: identityId,
      reference_image: referenceImage,
      reference_sha256: referenceSha,
      synthetic_or_owned_asset_required: true,
      real_person_mimicry_allowed: false,
      wardrobe_lock: input.wardrobe_lock || null,
      hair_lock: input.hair_lock || null,
      visual_style_lock: input.visual_style_lock || 'FENIX_CINEMATIC_REALISM',
    },
    shots: normalized,
    engine_priority: ['WAN_ANIMATE_2', 'LTX_2_X'],
    gates: {
      same_identity_all_shots: true,
      reference_hash_locked: true,
      no_stock_human_primary_cast: true,
      no_random_face_insertion: true,
      camera_instruction_required_each_shot: true,
      performance_instruction_required_each_shot: true,
      human_creative_review_required: true,
    },
    publish_authorized: false,
    promotion_eligible: false,
    additional_recurring_cost_eur: 0,
    baseline_preserved: 'Creative Studio V2.6.2',
  };
}

export function assertCharacterMotionContract(contract) {
  if (contract.publish_authorized !== false) throw new Error('CHARACTER_CONTRACT_PUBLISH_MUST_BE_FALSE');
  if (contract.promotion_eligible !== false) throw new Error('CHARACTER_CONTRACT_PROMOTION_MUST_BE_FALSE');
  if (contract.additional_recurring_cost_eur !== 0) throw new Error('CHARACTER_CONTRACT_COST_MUST_BE_ZERO');
  const ids = new Set(contract.shots.map((shot) => shot.identity_id));
  if (ids.size !== 1 || !ids.has(contract.identity.identity_id)) throw new Error('CHARACTER_IDENTITY_DRIFT');
  if (contract.shots.some((shot) => shot.allow_identity_change || shot.allow_random_face_insertion)) {
    throw new Error('CHARACTER_RANDOM_FACE_POLICY_VIOLATION');
  }
  return contract;
}
