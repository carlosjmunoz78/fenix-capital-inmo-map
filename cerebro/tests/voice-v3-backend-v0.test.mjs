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
const verifier=read('cerebro/voice/runtime/verify_backend_provenance.py');
const installer=read('cerebro/voice/runtime/windows/Install-VoiceLab.ps1');

test('VOICE-001 defaults Chatterbox multilingual to explicit V3 with bounded rollback to V2',()=>{
  assert.match(app,/CEREBRO_VOICE_T3_MODEL", "v3"/);
  assert.match(app,/ALLOWED_T3_MODELS = \{"v2", "v3"\}/);
  assert.match(app,/from_pretrained\(device=DEVICE, t3_model=T3_MODEL\)/);
  assert.match(app,/"t3_model": T3_MODEL/);
  assert.match(app,/"X-Cerebro-T3-Model": T3_MODEL/);
});

test('Chatterbox source is pinned and mutable Perth master is guarded before install',()=>{
  assert.match(requirements,/chatterbox-tts @ git\+https:\/\/github\.com\/resemble-ai\/chatterbox\.git@5de7a54aa4e5e2baadb0182dde554908b48b85c2/);
  assert.doesNotMatch(requirements,/^chatterbox-tts\s*$/m);
  assert.doesNotMatch(requirements,/^resemble-perth\s+@/m);
  assert.match(installer,/ExpectedPerthCommit = "ff1c8ac55a976971245cdd53c18d6131ca00d993"/);
  assert.match(installer,/git ls-remote \$PerthRepository refs\/heads\/master/);
  assert.match(installer,/supply-chain HOLD/);
  const preflightIndex=installer.indexOf('Assert-ReviewedPerthMaster');
  const pipInstallIndex=installer.indexOf('-m pip install --disable-pip-version-check -r');
  assert.ok(preflightIndex>=0 && pipInstallIndex>preflightIndex,'Perth master must be checked before dependency installation');
});

test('installed VCS provenance is re-verified before Chatterbox import',()=>{
  assert.match(verifier,/5de7a54aa4e5e2baadb0182dde554908b48b85c2/);
  assert.match(verifier,/ff1c8ac55a976971245cdd53c18d6131ca00d993/);
  assert.match(verifier,/direct_url\.json/);
  assert.match(verifier,/commit_drift/);
  assert.match(verifier,/repository_drift/);
  const executeVerifierIndex=installer.indexOf('& $VenvPython $ProvenanceVerifier');
  const importIndex=installer.indexOf('from chatterbox.mtl_tts import ChatterboxMultilingualTTS');
  assert.ok(executeVerifierIndex>=0 && importIndex>executeVerifierIndex,'installed provenance must be checked before backend import');
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
