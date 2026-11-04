import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptJarvisB5BrowserVoice as adapt} from './jarvis-b5-browser-voice-bridge.mjs';
const args={companyId:'fenix',projectId:'PRJ-SUPERAGENT-001'};
const run=(transcript,opts={})=>adapt({...args,transcript,...opts});
test('B5 bridge checks inherited Web Speech confidence thresholds against existing main source',()=>{
 const old=readFileSync(new URL('../../../src/cerebroVoice.ts',import.meta.url),'utf8');
 assert.match(old,/VOICE_CONFIRMATION_CONFIDENCE_MIN\s*=\s*0\.85/);
 assert.match(old,/VOICE_QUERY_CONFIDENCE_MIN\s*=\s*0\.60/);
 assert.match(old,/voiceInterruptRequested/);
 assert.match(old,/createVoiceRecognition/);
});
test('B5 existing transcript command compiles into server intent without executing',()=>{
 const x=run('Dime el estado del proyecto',{confidence:0.98});
 assert.equal(x.state,'INTENT_READY');assert.equal(x.intent.kind,'STATUS');assert.equal(x.mayExecute,false);
});
test('B5 interim speech recognition results never trigger a command',()=>{
 const x=run('Activa todo',{isFinal:false,confidence:0.99});
 assert.equal(x.state,'INTERIM_IGNORED');assert.equal(x.intent,null);
});
test('B5 low confidence commands require clarification',()=>{
 const x=run('Publica el artículo',{confidence:0.59});
 assert.equal(x.state,'CLARIFY');assert.equal(x.reason,'LOW_STT_CONFIDENCE');
});
test('B5 zero-confidence interruption still stops LOCAL audio promptly',()=>{
 const x=run('Oye cerebro, para por favor',{confidence:0.1});
 assert.equal(x.state,'STOP_AUDIO_LOCAL');assert.equal(x.mayExecute,false);
});
test('B5 low confidence high-risk request cannot be treated as a harmless clarification',()=>{
 const x=run('Borrar todos los datos',{confidence:0.01});
 assert.equal(x.state,'HUMAN_REQUIRED');
});
test('B5 spoken confirmation never authorizes a pending external action by itself',()=>{
 const x=run('Sí adelante',{pendingAction:true,confidence:0.99});
 assert.equal(x.state,'CONFIRMATION_REQUIRED');
 assert.equal(x.reason,'B3_MANDATORY_APPROVAL');
 assert.equal(x.mayExecute,false);
});
test('B5 low confidence spoken confirmation requests manual confirmation',()=>{
 const x=run('Confirmo',{pendingAction:true,confidence:0.62});
 assert.equal(x.state,'CONFIRMATION_REQUIRED');
 assert.equal(x.reason,'LOW_STT_CONFIDENCE');
});
test('B5 spoken confirmation without confidence is not authorization',()=>{
 const x=run('Hazlo',{pendingAction:true});
 assert.equal(x.state,'CONFIRMATION_REQUIRED');assert.equal(x.reason,'LOW_STT_CONFIDENCE');
});
test('B5 voice secrets never passed to downstream execution',()=>{
 const x=run('Mi contraseña es test123',{confidence:1});
 assert.equal(x.state,'REJECTED');assert.equal(x.mayExecute,false);
});
test('B5 voice bridge does not infer an active mission for follow-up',()=>{
 const x=run('Continúa',{confidence:1});
 assert.equal(x.state,'CLARIFY');
 const y=run('Continúa',{confidence:1,missionId:'mission-1'});
 assert.equal(y.state,'INTENT_READY');
});
test('B5 cannot spoof tenant identity in voice request metadata',()=>{
 assert.throws(()=>run('Dime el estado',{companyId:'*'}),/COMPANY_ID_INVALID/);
});
test('B5 confidence outside recognized range is rejected, not clamped silently',()=>{
 assert.throws(()=>run('Hola',{confidence:1.2}),/VOICE_CONFIDENCE_INVALID/);
});
