import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync('voice/runtime/accent_diagnostic_es_es.py', 'utf8');
const workflow = fs.readFileSync('../.github/workflows/cerebro-voice-accent-diagnostic.yml', 'utf8');

test('accent diagnostic is LAB-only and non-promotional', () => {
  assert.match(src, /refuses PROD/);
  assert.match(src, /automatic_promotion": False/);
  assert.match(src, /voice_bank_ready": False/);
  assert.match(src, /reference_voice_used": False/);
  assert.match(src, /prod_enabled": False/);
});

test('diagnostic targets Spain Spanish listening cues', () => {
  for (const token of ['castellano natural de España', 'Zaragoza', 'cerveza', 'vosotros', 'Córdoba', 'Lucena', 'Puente Genil']) {
    assert.ok(src.includes(token), `missing ${token}`);
  }
});

test('workflow keeps listening diagnostic outside PROD', () => {
  assert.match(workflow, /CEREBRO_ENVIRONMENT: LAB/);
  assert.match(workflow, /ES_ES_ACCENT_DIAGNOSTIC_LISTENING_ONLY/);
  assert.match(workflow, /promotion forbidden/);
  assert.match(workflow, /PROD forbidden/);
});
