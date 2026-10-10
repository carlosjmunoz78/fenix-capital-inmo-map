import fs from 'node:fs';

function assert(condition,message){if(!condition)throw new Error(message)}
const bank=JSON.parse(fs.readFileSync('cerebro/voice/voice-bank.v0.json','utf8'));
const runtime=fs.readFileSync('cerebro/voice/runtime/app.py','utf8');
const register=fs.readFileSync('cerebro/voice/runtime/register_voice_reference.py','utf8');
const policy=fs.readFileSync('cerebro/voice/VOICE_CLONING_CONSENT_POLICY_V0.md','utf8');

assert(bank.engine_id==='VOICE-001','must extend existing VOICE-001');
assert(bank.environment==='PREPROD','bank must stay PREPROD');
assert(bank.prod_enabled===false,'PROD must be false');
assert(bank.public_clone_enabled===false,'public cloning must stay false');
assert(bank.locale==='es-ES','bank locale must be Spanish from Spain');
assert(bank.voices.length===20,'must define exactly 20 controlled voice slots');
assert(new Set(bank.voices.map(v=>v.voice_id)).size===20,'voice IDs must be unique');
assert(bank.voices.filter(v=>v.presentation==='feminine').length===10,'must contain 10 feminine voice slots');
assert(bank.voices.filter(v=>v.presentation==='masculine').length===10,'must contain 10 masculine voice slots');
assert(bank.voices.every(v=>/^ES[FM]\d{2}$/.test(v.voice_id)),'voice IDs must use controlled es-ES format');
assert(bank.voices.every(v=>v.status==='REFERENCE_REQUIRED'),'V0 must not fabricate ready voices');
assert(bank.voices.every(v=>v.reference_ref===null&&v.reference_sha256===null),'raw/reference audio must not be invented or committed');
assert(bank.voices.every(v=>v.consent_ref===null&&v.license===null),'consent/license must be supplied with real provenance');

for(const required of [
 'refuses PROD',
 'runtime_token_not_configured',
 'consent_or_license_missing',
 'reference_checksum_mismatch',
 'cross_company_voice_denied',
 'PRIVATE_REGISTRY_PATH',
 'public_clone_enabled',
 'paid_api_required'
])assert(runtime.includes(required),`runtime guard missing: ${required}`);

assert(!runtime.includes('@app.post("/clone"'),'must not expose a public clone route');
assert(!runtime.includes('@app.post("/upload"'),'must not expose a public upload route');
assert(register.includes('V0 accepts WAV references only'),'registration must constrain reference format');
assert(register.includes('explicit consent_ref required for a real recorded speaker'),'real recorded speakers require explicit consent');
assert(register.includes('registry.private.json'),'reference metadata must use the private registry');
assert(!register.includes('requests.')&&!register.includes('http://')&&!register.includes('https://'),'registration must stay local and make no network calls');
assert(policy.includes('scraped social/video/audio'),'policy must deny scraped voices');
assert(policy.includes('Raw reference audio must not be committed to Git.'),'policy must keep references out of Git');

console.log('GREEN CEREBRO owned voice V0: 20 es-ES slots, private registry, consent gate, fail-closed runtime, PROD false');
