import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessMultimediaZeroCostProbe,
  mutationChangesOutcome,
  INVENTORY_SCOPE
} from '../runtime/multimedia-zero-cost-physical-inventory-v1.mjs';

function probe({ ffmpeg = true, ffprobe = true, imagemagick = false, sox = false, espeak = false } = {}) {
  const tool = (id, present, version) => ({ id, present, version: present ? version : null });
  return {
    scope: INVENTORY_SCOPE,
    environment: 'PREPROD',
    company_id: 'GLOBAL',
    engine_id: 'FACT-001',
    capability_id: 'DIGITAL-BUILD-MULTIMEDIA',
    install_performed: false,
    model_download_performed: false,
    provider_call_performed: false,
    customer_data_used: false,
    prod_write_performed: false,
    spend_eur: 0,
    tools: {
      ffmpeg: tool('ffmpeg', ffmpeg, 'ffmpeg version 7.1'),
      ffprobe: tool('ffprobe', ffprobe, 'ffprobe version 7.1'),
      imagemagick: tool('imagemagick', imagemagick, 'ImageMagick 7.1'),
      sox: tool('sox', sox, 'SoX v14.4.2'),
      espeak_ng: tool('espeak_ng', espeak, 'eSpeak NG 1.52')
    }
  };
}

test('FFmpeg + FFprobe produce a verified zero-cost PREPROD media core without authority expansion', () => {
  const result = assessMultimediaZeroCostProbe(probe({ ffmpeg: true, ffprobe: true, imagemagick: true }));
  assert.equal(result.status, 'VERIFIED_ZERO_COST_MEDIA_CORE_PREPROD');
  assert.equal(result.verified_capabilities.deterministic_media_core, true);
  assert.equal(result.adapters.FFMPEG, 'PHYSICALLY_PRESENT_REUSE_CANDIDATE');
  assert.equal(result.safety.additional_cost_eur, 0);
  assert.equal(result.boundaries.proves_ci_runner_presence_only, true);
  assert.equal(result.boundaries.proves_user_pc_presence, false);
  assert.equal(result.boundaries.grants_external_process_execution_authority, false);
  assert.equal(result.boundaries.grants_prod_authority, false);
});

test('absence is evidence, not a reason to install or weaken policy', () => {
  const result = assessMultimediaZeroCostProbe(probe({ ffmpeg: false, ffprobe: false }));
  assert.equal(result.status, 'PARTIAL_ZERO_COST_MEDIA_CORE_PREPROD');
  assert.equal(result.adapters.FFMPEG, 'NOT_PRESENT_IN_THIS_RUNTIME');
  assert.equal(result.boundaries.install_authorized, false);
  assert.equal(result.boundaries.model_download_authorized, false);
  assert.equal(result.next_gate, 'KEEP_FFMPEG_REUSE_OPTIONAL_AND_AUDIT_AN_AUTHORIZED_RUNTIME_LATER');
});

test('mutation of a required physical primitive changes the semantic outcome', () => {
  const result = mutationChangesOutcome(probe({ ffmpeg: true, ffprobe: true }));
  assert.equal(result.baseline_status, 'VERIFIED_ZERO_COST_MEDIA_CORE_PREPROD');
  assert.equal(result.mutated_status, 'PARTIAL_ZERO_COST_MEDIA_CORE_PREPROD');
  assert.equal(result.changed, true);
});

test('probe is fail-closed for PROD, spend, installs, downloads, providers and customer data', () => {
  for (const patch of [
    { environment: 'PROD' },
    { spend_eur: 1 },
    { install_performed: true },
    { model_download_performed: true },
    { provider_call_performed: true },
    { customer_data_used: true },
    { prod_write_performed: true }
  ]) {
    assert.throws(() => assessMultimediaZeroCostProbe({ ...probe(), ...patch }));
  }
});

test('tool identity and version metadata are constrained', () => {
  const wrong = probe();
  wrong.tools.ffmpeg = { id: 'curl', present: true, version: 'curl 8' };
  assert.throws(() => assessMultimediaZeroCostProbe(wrong), /tool id mismatch/);

  const unsafe = probe();
  unsafe.tools.ffmpeg = { id: 'ffmpeg', present: true, version: 'ok\nmultiline' };
  assert.throws(() => assessMultimediaZeroCostProbe(unsafe), /version unsafe/);
});
