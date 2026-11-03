import test from 'node:test';import assert from 'node:assert/strict';
import {createJarvisB5SpeechPort as createPort} from './jarvis-b5-speech-port.mjs';
import {compileJarvisB5Intent} from './jarvis-b5-intent.mjs';
const task={token:'ok',companyId:'fenix',environment:'LAB',sessionId:'session-1',consentRef:'consent-1',audioRef:'audio:1'};
const setup=({locked=false,consent=true,grant='ALLOW',audit=true,sttText='Dime el estado',role='OWNER_ROOT',ownerCompany='fenix',session='session-1',local=true}={})=>{
 const calls=[];
 const identityProvider={verify:async()=>({ownerId:'owner-1',sessionId:session,roles:[role],authorizedCompanies:[ownerCompany]})};
 const consentStore={check:async args=>{calls.push({type:'consent',args});return consent;}};
 const controlStore={get:async args=>{calls.push({type:'gate',args});return{enabled:!locked,killSwitch:locked};}};
 const b3PolicyService={authorize:async args=>{calls.push({type:'policy',args});return {decision:grant};}};
 const auditStore={append:async args=>{calls.push({type:'audit',args});return audit;}};
 const sttAdapter={provider:local?'LOCAL':'EXTERNAL',transcribe:async args=>{calls.push({type:'stt',args});return{text:sttText};}};
 const ttsAdapter={provider:local?'LOCAL':'EXTERNAL',synthesize:async args=>{calls.push({type:'tts',args});return{audioRef:'synth:fixture'};}};
 return {port:createPort({identityProvider,consentStore,controlStore,b3PolicyService,auditStore,sttAdapter,ttsAdapter}),calls};
};
test('B5 voice transcript compiles as same status intent as text',async()=>{
 const {port}=setup();const result=await port.transcribe(task);
 const text=compileJarvisB5Intent({text:result.text,companyId:'fenix',projectId:'p-1'});
 const voice=compileJarvisB5Intent({text:result.text,channel:result.channel,companyId:'fenix',projectId:'p-1'});
 assert.equal(text.kind,voice.kind);assert.equal(voice.kind,'STATUS');assert.equal(result.persisted,false);
});
test('B5 voice TTS output is just an ephemeral reference, not a persisted recording',async()=>{
 const {port}=setup();const result=await port.synthesize({...task,text:'Estado revisado'});
 assert.equal(result.audioRef,'synth:fixture');assert.equal(result.persisted,false);
});
test('B5 speech port requires server adapters and rejects fake setup',()=>{
 assert.throws(()=>createPort(),/B5_SERVER_SECURITY_ADAPTERS_REQUIRED/);
});
test('B5 voice commands are denied before STT when consent absent',async()=>{
 const {port,calls}=setup({consent:false});
 await assert.rejects(port.transcribe(task),/VOICE_CONSENT_REQUIRED/);
 assert.equal(calls.some(c=>c.type==='stt'),false);
});
test('B5 feature OFF denies STT despite valid identity and consent',async()=>{
 const {port,calls}=setup({locked:true});
 await assert.rejects(port.transcribe(task),/B5_LOCKED/);
 assert.equal(calls.some(c=>c.type==='stt'),false);
});
test('B5 denies voice if B3 policy cannot authorize named action',async()=>{
 const {port,calls}=setup({grant:'DENY'});
 await assert.rejects(port.synthesize({...task,text:'ok'}),/B3_VOICE_POLICY_DENIED/);
 assert.deepEqual(calls.filter(c=>c.type==='policy').map(c=>c.args.actionName),['JARVIS_VOICE_TTS']);
 assert.equal(calls.some(c=>c.type==='tts'),false);
});
test('B5 owner tenant scope forbids cross company voice use',async()=>{
 const {port}=setup({ownerCompany:'other'});
 await assert.rejects(port.transcribe(task),/OWNER_SCOPE_DENIED/);
});
test('B5 session is verified server-side and not accepted from client claims',async()=>{
 const {port}=setup({session:'other-session'});
 await assert.rejects(port.transcribe(task),/OWNER_SCOPE_DENIED/);
});
test('B5 voice authorization cannot be forged using VIEWER role',async()=>{
 const {port}=setup({role:'VIEWER'});
 await assert.rejects(port.transcribe(task),/OWNER_SCOPE_DENIED/);
});
test('B5 pre-call audit outage fails closed before any adapter invocation',async()=>{
 const {port,calls}=setup({audit:false});
 await assert.rejects(port.transcribe(task),/AUDIT_UNAVAILABLE/);
 assert.equal(calls.some(c=>c.type==='stt'),false);
});
test('B5 STT rejects returned secret-like transcripts before downstream intent handling',async()=>{
 const {port}=setup({sttText:'mi contraseña es 12345'});
 await assert.rejects(port.transcribe(task),/STT_SENSITIVE_CONTENT_BLOCKED/);
});
test('B5 TTS rejects any credential-like text before adapter call',async()=>{
 const {port,calls}=setup();
 await assert.rejects(port.synthesize({...task,text:'password is secret'}),/TTS_TEXT_REJECTED/);
 assert.equal(calls.some(c=>c.type==='tts'),false);
});
test('B5 unapproved remote audio adapter cannot be called',async()=>{
 const {port,calls}=setup({local:false});
 await assert.rejects(port.transcribe(task),/SAFE_STT_ADAPTER_UNAVAILABLE/);
 assert.equal(calls.some(c=>c.type==='stt'),false);
});
test('B5 audit metadata never contains audio reference or raw transcript',async()=>{
 const {port,calls}=setup();await port.transcribe(task);
 const audits=calls.filter(c=>c.type==='audit');assert.equal(audits.length,1);
 const str=JSON.stringify(audits);assert.equal(str.includes('audio:1'),false);
 assert.equal(str.includes('Dime el estado'),false);
});
test('B5 rejects invalid audio handles; audio bytes are never embedded in the contract',async()=>{
 const {port}=setup();await assert.rejects(port.transcribe({...task,audioRef:'../../etc/passwd'}),/AUDIO_REF_INVALID/);
});
