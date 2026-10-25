import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const profile = JSON.parse(fs.readFileSync('voice/profiles/ESM05_CEREBRO_EXECUTIVE_AI_ES_ES_V0.json', 'utf8'));
const backend = fs.readFileSync('voice/VOICE_ES_ES_DEDICATED_BACKEND_V0.md', 'utf8');
const corpus = fs.readFileSync('voice/profiles/ESM05_QA_CORPUS_V0.txt', 'utf8');

test('ESM05 target is original, es-ES and still reference-required', () => {
  assert.equal(profile.engine_id, 'VOICE-001');
  assert.equal(profile.voice_id, 'ESM05');
  assert.equal(profile.locale, 'es-ES');
  assert.equal(profile.status, 'TARGET_DEFINED_REFERENCE_REQUIRED');
  assert.equal(profile.identity_policy.exact_person_identity_clone, false);
  assert.equal(profile.identity_policy.celebrity_or_actor_reference_allowed, false);
  assert.equal(profile.identity_policy.movie_or_broadcast_audio_as_reference_allowed, false);
  assert.equal(profile.identity_policy.authorized_reference_required, true);
});

test('ESM05 accent and authority gates fail closed', () => {
  assert.equal(profile.accent_hard_gate.latin_american_drift_allowed, false);
  assert.equal(profile.qa_thresholds.latin_american_drift_events_max, 0);
  assert.equal(profile.qa_thresholds.unintelligible_phrases_max, 0);
  assert.equal(profile.authority.automatic_promotion, false);
  assert.equal(profile.authority.prod_enabled, false);
  assert.equal(profile.authority.public_clone_enabled, false);
  assert.equal(profile.authority.voice_bank_ready, false);
});

test('dedicated Spain-Spanish backend remains PREPROD and authorized-reference only', () => {
  assert.match(backend, /ResembleAI\/Chatterbox-Multilingual-es-es/);
  assert.match(backend, /authorized `es-ES` reference/);
  assert.match(backend, /automatic_promotion=false/);
  assert.match(backend, /prod_enabled=false/);
  assert.match(backend, /0 EUR/);
});

test('fixed ESM05 corpus exercises peninsular-Spanish cues and long-form stability', () => {
  for (const token of ['vosotros', 'Zaragoza', 'cerveza', 'Córdoba', 'Lucena', 'Puente Genil', 'castellano natural de España']) {
    assert.ok(corpus.includes(token), `missing ${token}`);
  }
});
