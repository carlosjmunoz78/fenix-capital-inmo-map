import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const TEST_DIR=path.dirname(fileURLToPath(import.meta.url));
const CEREBRO_ROOT=path.resolve(TEST_DIR,'..');
const read=(relative)=>fs.readFileSync(path.join(CEREBRO_ROOT,relative),'utf8');

const bank=JSON.parse(read('voice/voice-bank.v0.json'));
const runtime=read('voice/runtime/app.py');
const register=read('voice/runtime/register_voice_reference.py');
const policy=read('voice/VOICE_CLONING_CONSENT_POLICY_V0.md');

test('VOICE-001 owns exactly 20 controlled es-ES slots and fabricates no references',()=>{
 assert.equal(bank.engine_id,'VOICE-001');
 assert.equal(bank.environment,'PREPROD');
 assert.equal(bank.prod_enabled,false);
 assert.equal(bank.public_clone_enabled,false);
 assert.equal(bank.locale,'es-ES');
 assert.equal(bank.voices.length,20);
 assert.equal(new Set(bank.voices.map(v=>v.voice_id)).size,20);
 assert.equal(bank.voices.filter(v=>v.presentation==='feminine').length,10);
 assert.equal(bank.voices.filter(v=>v.presentation==='masculine').length,10);
 assert.ok(bank.voices.every(v=>/^ES[FM]\d{2}$/.test(v.voice_id)));
 assert.ok(bank.voices.every(v=>v.status==='REFERENCE_REQUIRED'));
 assert.ok(bank.voices.every(v=>v.reference_ref===null&&v.reference_sha256===null));
 assert.ok(bank.voices.every(v=>v.consent_ref===null&&v.license===null));
});

test('owned runtime stays fail-closed, private and cross-company isolated',()=>{
 for(const required of [
  'refuses PROD','runtime_token_not_configured','consent_or_license_missing',
  'reference_checksum_mismatch','cross_company_voice_denied','PRIVATE_REGISTRY_PATH',
  'public_clone_enabled','paid_api_required'
 ])assert.ok(runtime.includes(required),`runtime guard missing: ${required}`);
 assert.ok(!runtime.includes('@app.post("/clone"'));
 assert.ok(!runtime.includes('@app.post("/upload"'));
});

test('reference registration requires provenance and remains local',()=>{
 assert.ok(register.includes('V0 accepts WAV references only'));
 assert.ok(register.includes('explicit consent_ref required for a real recorded speaker'));
 assert.ok(register.includes('registry.private.json'));
 assert.ok(!register.includes('requests.'));
 assert.ok(!register.includes('http://'));
 assert.ok(!register.includes('https://'));
 assert.ok(policy.includes('scraped social/video/audio'));
 assert.ok(policy.includes('Raw reference audio must not be committed to Git.'));
});
