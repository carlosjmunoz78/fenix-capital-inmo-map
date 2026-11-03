import test from 'node:test';
import assert from 'node:assert/strict';
import {compileJarvisB5Intent} from './jarvis-b5-intent.mjs';
import {adaptJarvisB5BrowserVoice} from './jarvis-b5-browser-voice-bridge.mjs';
import {createJarvisB5Dialogue} from './jarvis-b5-dialogue.mjs';
import {createJarvisB5GuardedPreview} from './jarvis-b5-guarded-preview.mjs';
const b={token:'verified',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001',environment:'LAB',sessionId:'s-01'};
const create=({enabled=true,scope='fenix',grant='ALLOW'}={})=>{
 let audioCalls=0,modelCalls=0,log=[],authCalls=0;
 const g=createJarvisB5GuardedPreview({
  identityProvider:{verify:async()=>{authCalls++;return{ownerId:'owner-real',sessionId:'s-01',roles:['OWNER_ROOT'],authorizedCompanies:[scope]};}},
  controlStore:{get:async()=>({enabled,killSwitch:!enabled})},
  b3PolicyService:{authorize:async()=>({decision:grant})},
  auditStore:{append:async entry=>{log.push(entry);return true;}},
  compileIntent:compileJarvisB5Intent,
  adaptVoice:adaptJarvisB5BrowserVoice,
  dialogue:createJarvisB5Dialogue()
 });
 return{g,stats:()=>({audioCalls,modelCalls,log,authCalls})};
};
test('B5 CUT03 actual intent compiler gives text/voice parity on verified status',async()=>{
 const {g}=create();
 const t=await g.preview({...b,channel:'TEXT',text:'Dime el estado del proyecto'});
 const v=await g.preview({...b,channel:'VOICE_STT',text:'Dime el estado del proyecto',confidence:.96});
 assert.equal(t.state,'PREVIEW_ONLY');assert.equal(v.state,'PREVIEW_ONLY');
 assert.equal(t.intentKind,'STATUS');assert.equal(v.intentKind,t.intentKind);
 assert.equal(t.dialogueStatus,'NO_EVIDENCE');assert.equal(v.answer,t.answer);
 assert.equal(t.mayExecute,false);assert.equal(v.modelCalled,false);
});
test('B5 CUT03 actual compiler classifies dangerous spoken and written actions HIGH_RISK',async()=>{
 const {g}=create();
 for(const channel of ['TEXT','VOICE_STT']){
  const x=await g.preview({...b,channel,text:'Borrar todos los datos',confidence:.99});
  assert.equal(x.state,'HUMAN_REQUIRED');
  assert.equal(x.reason,'HIGH_RISK');assert.equal(x.mayExecute,false);
 }
});
test('B5 CUT03 actual browser voice interruption stays local without identity',async()=>{
 const {g,stats}=create();
 const x=await g.preview({...b,channel:'VOICE_STT',text:'Oye cerebro, para por favor',confidence:.05,token:null});
 assert.equal(x.state,'STOP_AUDIO_LOCAL');assert.equal(stats().authCalls,0);
});
test('B5 CUT03 actual voice pending action confirmation requires B3 and never executes',async()=>{
 const {g}=create();
 const x=await g.preview({...b,channel:'VOICE_STT',text:'Sí adelante',confidence:.99,pendingAction:true});
 assert.equal(x.state,'CONFIRMATION_REQUIRED');assert.equal(x.mayExecute,false);
});
test('B5 CUT03 actual classifier needs mission for ambiguous follow-up',async()=>{
 const {g}=create();
 const x=await g.preview({...b,text:'Continúa'});
 assert.equal(x.state,'CLARIFY');assert.equal(x.intentKind,'CONTINUE');
});
test('B5 CUT03 actual classifier rejects transcript containing password',async()=>{
 const {g,stats}=create();
 const x=await g.preview({...b,channel:'VOICE_STT',text:'Mi contraseña es test123',confidence:1});
 assert.equal(x.state,'REJECTED');
 assert.equal(JSON.stringify(stats().log).includes('test123'),false);
});
test('B5 CUT03 real compiler inaccessible when owner company mismatch',async()=>{
 const {g,stats}=create({scope:'captacasa'});
 const x=await g.preview({...b,text:'Dime el estado'});
 assert.equal(x.state,'DENY');assert.equal(x.reason,'OWNER_SCOPE_DENIED');
 assert.equal(stats().log.length,0);
});
test('B5 CUT03 real B5 gate is OFF and cannot be forced by client',async()=>{
 const {g,stats}=create({enabled:false});
 const x=await g.preview({...b,text:'Dime el estado',enabled:true,killSwitch:false});
 assert.equal(x.reason,'B5_LOCKED');assert.equal(stats().log.length,0);
});
test('B5 CUT03 actual dialogue has no evidence and does not fabricate completion',async()=>{
 const {g}=create();
 const x=await g.preview({...b,text:'Dime el estado'});
 assert.match(x.answer,/evidencia verificada/);
 assert.equal(x.spentEuro,0);assert.equal(x.mayExecute,false);
});
