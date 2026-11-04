import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createJarvisB5SpeechPort} from './jarvis-b5-speech-port.mjs';
import {adaptJarvisB5BrowserVoice} from './jarvis-b5-browser-voice-bridge.mjs';
import {compileJarvisB5Intent} from './jarvis-b5-intent.mjs';

const voiceBase={companyId:'fenix',projectId:'PRJ-SUPERAGENT-001',channel:'VOICE_STT'};
const speechArgs={token:'opaque-server-session',companyId:'fenix',environment:'LAB',sessionId:'session-1',consentRef:'consent-1',audioRef:'audio:test1'};
function rig(principal){
 const effects=[];
 const p=createJarvisB5SpeechPort({
  identityProvider:{verify:async()=>principal},
  consentStore:{check:async()=>{effects.push('consent');return true;}},
  controlStore:{get:async()=>{effects.push('control');return {enabled:true,killSwitch:false};}},
  b3PolicyService:{authorize:async()=>{effects.push('b3');return{decision:'ALLOW'};}},
  auditStore:{append:async()=>{effects.push('audit');return true;}},
  sttAdapter:{provider:'LOCAL',transcribe:async()=>{effects.push('stt');return{text:'Dime el estado'};}},
  ttsAdapter:{provider:'LOCAL',synthesize:async()=>{effects.push('tts');return{audioRef:'audio:test2'};}}
 });
 return {port:p,effects};
}
const good={ownerId:'owner-1',sessionId:'session-1',roles:['OWNER_ROOT'],authorizedCompanies:['fenix']};
test('B5 CUT04 valid server array claims allow only explicitly granted local STT',async()=>{
 const {port,effects}=rig(good);const x=await port.transcribe(speechArgs);
 assert.equal(x.text,'Dime el estado');assert.equal(x.persisted,false);
 assert.deepEqual(effects,['control','consent','b3','audit','stt']);
});
test('B5 CUT04 string role membership spoof rejected before any downstream voice adapter',async()=>{
 const {port,effects}=rig({...good,roles:'FAKE_OWNER_ROOT'});
 await assert.rejects(port.transcribe(speechArgs),/OWNER_SCOPE_DENIED/);
 assert.deepEqual(effects,[]);
});
test('B5 CUT04 string tenant substring spoof rejected before any downstream voice adapter',async()=>{
 const {port,effects}=rig({...good,authorizedCompanies:'otherfenix'});
 await assert.rejects(port.transcribe(speechArgs),/OWNER_SCOPE_DENIED/);
 assert.deepEqual(effects,[]);
});
test('B5 CUT04 malformed roles object denied even if it implements includes()',async()=>{
 const {port,effects}=rig({...good,roles:{includes:()=>true}});
 await assert.rejects(port.transcribe(speechArgs),/OWNER_SCOPE_DENIED/);
 assert.deepEqual(effects,[]);
});
test('B5 CUT04 malformed company object denied even if it implements includes()',async()=>{
 const {port,effects}=rig({...good,authorizedCompanies:{includes:()=>true}});
 await assert.rejects(port.transcribe(speechArgs),/OWNER_SCOPE_DENIED/);
 assert.deepEqual(effects,[]);
});
test('B5 CUT04 malformed owner identity is not a valid authenticated principal',async()=>{
 const {port,effects}=rig({...good,ownerId:{}});
 await assert.rejects(port.transcribe(speechArgs),/OWNER_SCOPE_DENIED/);
 assert.deepEqual(effects,[]);
});
test('B5 CUT04 exact OWNER_ROOT cannot borrow rights from a different company',async()=>{
 const {port,effects}=rig({...good,authorizedCompanies:['aion','captacasa']});
 await assert.rejects(port.transcribe(speechArgs),/OWNER_SCOPE_DENIED/);
 assert.deepEqual(effects,[]);
});
test('B5 CUT04 no confidence STT cannot be treated as a verified voice query',()=>{
 const x=adaptJarvisB5BrowserVoice({...voiceBase,transcript:'Dime el estado',confidence:null});
 assert.equal(x.state,'CLARIFY');assert.equal(x.reason,'NO_STT_CONFIDENCE');assert.equal(x.mayExecute,false);
});
test('B5 CUT04 zero-confidence STOP remains available without B2 session',()=>{
 const x=adaptJarvisB5BrowserVoice({...voiceBase,transcript:'Cerebro, para ya',confidence:0});
 assert.equal(x.state,'STOP_AUDIO_LOCAL');assert.equal(x.mayExecute,false);
});
test('B5 CUT04 legacy STOP para ya, calla and detente remain equivalent in text and voice',()=>{
 const old=readFileSync(new URL('../../../src/cerebroVoice.ts',import.meta.url),'utf8');
 assert.match(old,/para ya/);assert.match(old,/calla/);
 for(const phrase of ['para ya','calla','cerebro detente','oye cerebro para ya']){
  const text=compileJarvisB5Intent({text:phrase,channel:'TEXT',companyId:'fenix',projectId:'p-1'});
  const voice=adaptJarvisB5BrowserVoice({...voiceBase,transcript:phrase,confidence:0});
  assert.equal(text.kind,'INTERRUPT',phrase);
  assert.equal(voice.state,'STOP_AUDIO_LOCAL',phrase);
 }
});
test('B5 CUT04 suspected destructive command with unknown confidence is still HIGH_RISK',()=>{
 const x=adaptJarvisB5BrowserVoice({...voiceBase,transcript:'Borrar el CRM',confidence:null});
 assert.equal(x.state,'HUMAN_REQUIRED');assert.equal(x.mayExecute,false);
});
test('B5 CUT04 pending action with missing confidence never confirms',()=>{
 const x=adaptJarvisB5BrowserVoice({...voiceBase,transcript:'confirmo',confidence:null,pendingAction:true});
 assert.equal(x.state,'CONFIRMATION_REQUIRED');assert.equal(x.reason,'LOW_STT_CONFIDENCE');
});
