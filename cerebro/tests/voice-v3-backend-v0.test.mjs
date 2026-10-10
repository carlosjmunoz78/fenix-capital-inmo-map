import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

const app=read('cerebro/voice/runtime/app.py');
const smoke=read('cerebro/voice/runtime/backend_model_smoke.py');
const requirements=read('cerebro/voice/runtime/requirements.txt');

test('VOICE-001 defaults Chatterbox multilingual to explicit V3 with bounded rollback to V2',()=>{
  assert.match(app,/CEREBRO_VOICE_T3_MODEL", "v3"/);
  assert.match(app,/ALLOWED_T3_MODELS = \{"v2", "v3"\}/);
  assert.match(app,/from_pretrained\(device=DEVICE, t3_model=T3_MODEL\)/);
  assert.match(app,/"t3_model": T3_MODEL/);
  assert.match(app,/"X-Cerebro-T3-Model": T3_MODEL/);
});

test('V3-capable external dependency is pinned to the reviewed official upstream commit',()=>{
  assert.match(requirements,/chatterbox-tts @ git\+https:\/\/github\.com\/resemble-ai\/chatterbox\.git@5de7a54aa4e5e2baadb0182dde554908b48b85c2/);
  assert.doesNotMatch(requirements,/^chatterbox-tts\s*$/m);
});

test('backend smoke proves only model load and Spanish waveform, never voice acceptance',()=>{
  assert.match(smoke,/GREEN_MODEL_SMOKE_ONLY/);
  assert.match(smoke,/model\.generate\(SMOKE_TEXT, language_id="es"\)/);
  assert.match(smoke,/human_reference_used": False/);
  assert.match(smoke,/voice_bank_mutated": False/);
  assert.match(smoke,/accent_es_es": "NOT_EVALUATED"/);
  assert.match(smoke,/automatic_promotion": False/);
  assert.match(smoke,/physical user-PC performance/);
});

test('V3 smoke remains non-PROD, no-reference and zero paid TTS API',()=>{
  assert.match(smoke,/backend model smoke refuses PROD/);
  assert.match(smoke,/model smoke evidence must remain outside Git\/repository/);
  assert.match(smoke,/human_reference_used": False/);
  assert.match(smoke,/paid_tts_api_used": False/);
  assert.doesNotMatch(smoke,/audio_prompt_path/);
  assert.doesNotMatch(smoke,/\/clone/);
  assert.doesNotMatch(smoke,/\/upload/);
});
