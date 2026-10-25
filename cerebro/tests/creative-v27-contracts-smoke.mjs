import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildCharacterMotionContract, assertCharacterMotionContract } from '../runtime/creative-character-motion-contract-v27.mjs';
import { planKineticCaptionsV27, renderKineticAssV27 } from '../runtime/creative-kinetic-captions-v27.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-v27-'));
const ref = path.join(temp, 'fenix-character-reference.bin');
fs.writeFileSync(ref, 'CEREBRO_V27_TEST_REFERENCE');

const character = assertCharacterMotionContract(buildCharacterMotionContract({
  company_id: 'fenix',
  environment: 'PREPROD',
  identity_id: 'FENIX-PRESENTER-001',
  reference_image: ref,
  wardrobe_lock: 'FENIX_PROFESSIONAL_SMART_CASUAL',
  hair_lock: 'LOCKED_FROM_REFERENCE',
  shots: [
    { shot_id: 'hook', driving_video: '/runtime/input/hook.mp4', camera_instruction: 'FAST_PUSH_IN', performance_instruction: 'DIRECT_EYE_CONTACT_STOP_SCROLL', duration_sec: 1.5 },
    { shot_id: 'proof', driving_video: '/runtime/input/proof.mp4', camera_instruction: 'ORBIT_LEFT_MICRO', performance_instruction: 'CALM_CONFIDENT_EXPLANATION', duration_sec: 2.4 },
    { shot_id: 'cta', driving_video: '/runtime/input/cta.mp4', camera_instruction: 'LOCKED_PUNCH', performance_instruction: 'WARM_DIRECT_INVITATION', duration_sec: 1.8 },
  ],
}));

if (character.identity.identity_id !== 'FENIX-PRESENTER-001') throw new Error('IDENTITY_LOCK_FAILED');
if (new Set(character.shots.map((s) => s.identity_id)).size !== 1) throw new Error('SHOT_IDENTITY_DRIFT');
if (character.publish_authorized !== false || character.promotion_eligible !== false) throw new Error('CHARACTER_GATE_MUST_FAIL_CLOSED');

const captionPlan = planKineticCaptionsV27({
  width: 1080,
  height: 1920,
  blocks: [
    { start_sec: 0.0, end_sec: 1.8, text: 'Para. No reserves por presión.' },
    { start_sec: 1.8, end_sec: 4.4, text: 'Primero comprobamos si la operación encaja.' },
    { start_sec: 4.4, end_sec: 6.6, text: 'Después decides con datos.' },
  ],
});

const ass = renderKineticAssV27(captionPlan);
if (captionPlan.events.length < 5) throw new Error('KINETIC_CAPTION_EVENT_DENSITY_TOO_LOW');
if (!captionPlan.events.some((e) => e.emphasis)) throw new Error('KINETIC_CAPTION_EMPHASIS_MISSING');
if (!ass.includes('Dialogue:')) throw new Error('ASS_DIALOGUE_MISSING');
if (captionPlan.sidecar_only_forbidden !== true || captionPlan.burned_in_required !== true) throw new Error('CAPTION_BURNIN_GATE_MISSING');
if (captionPlan.safe_area_required !== true) throw new Error('CAPTION_SAFE_AREA_GATE_MISSING');
if (captionPlan.events.some((e) => e.estimated_max_render_width_px > e.safe_width_px)) {
  throw new Error('CAPTION_SAFE_AREA_OVERFLOW');
}
if (captionPlan.events.some((e) => e.safe_margin_x_px < 86)) {
  throw new Error('CAPTION_SAFE_MARGIN_TOO_SMALL');
}

const out = process.env.CEREBRO_V27_REPORT || path.join(temp, 'report.json');
const outDir = path.dirname(out);
fs.mkdirSync(outDir, { recursive: true });
const assFile = process.env.CEREBRO_V27_ASS || path.join(outDir, 'captions.ass');
const planFile = process.env.CEREBRO_V27_CAPTION_PLAN || path.join(outDir, 'caption-plan.json');
fs.writeFileSync(assFile, ass);
fs.writeFileSync(planFile, JSON.stringify(captionPlan, null, 2) + '\n');

const report = {
  schema_version: '1.1.0',
  test: 'CREATIVE_V27_CONTRACTS_SMOKE',
  character_contract: {
    identity_id: character.identity.identity_id,
    shot_count: character.shots.length,
    reference_hash_locked: character.gates.reference_hash_locked,
    same_identity_all_shots: character.gates.same_identity_all_shots,
  },
  kinetic_captions: {
    event_count: captionPlan.events.length,
    motions: [...new Set(captionPlan.events.map((e) => e.motion))],
    emphasis_events: captionPlan.events.filter((e) => e.emphasis).length,
    burned_in_required: captionPlan.burned_in_required,
    safe_area_required: captionPlan.safe_area_required,
    safe_margin_x_px: captionPlan.safe_margin_x_px,
    max_estimated_width_px: Math.max(...captionPlan.events.map((e) => e.estimated_max_render_width_px)),
    safe_width_px: captionPlan.safe_width_px,
    ass_file: assFile,
    caption_plan_file: planFile,
  },
  publish_authorized: false,
  promotion_eligible: false,
  additional_recurring_cost_eur: 0,
};

fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
