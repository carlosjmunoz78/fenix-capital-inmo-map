import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB5GuardedPreview} from './jarvis-b5-guarded-preview.mjs';
const base={token:'server-token',companyId:'fenix',projectId:'PRJ-SUPERAGENT-001',sessionId:'s-1',text:'Dime el estado'};
const setup=({enabled=true,role='OWNER_ROOT',tenant='fenix',session='s-1',grant='ALLOW',audit=true,identityThrow=false}={})=>{
 const calls=[];
 const identityProvider={verify:async()=>{calls.push('identity');if(identityThrow)throw Error('network');
  return {ownerId:'owner',sessionId:session,authorizedCompanies:[tenant],roles:[role]};}};
 const controlStore={get:async()=>{calls.push('control');return{enabled,killSwitch:!enabled};}};
 const b3PolicyService={authorize:async()=>{calls.push('grant');return {decision:grant};}};
 const auditStore={append:async e=>{calls.push(['audit',e]);return audit;}};
 const compileIntent=({text,channel,companyId,projectId,missionId})=>{
  calls.push('compile');const high=/borrar|pagar|firmar/i.test(text),rejected=/contrase.n?a/i.test(text);
  return{kind:rejected?'REJECTED':high?'HIGH_RISK':'STATUS',channel,companyId,projectId,missionId,
   mayExecute:false,requiresHuman:high,needsClarification:false};};
 const adaptVoice=({transcript,confidence,pendingAction})=>{
  calls.push('voice');if(/^(para|stop)$/i.test(transcript))return{state:'STOP_AUDIO_LOCAL'};
  if(pendingAction&&/^(si|sí|confirmo)$/i.test(transcript))return{state:'CONFIRMATION_REQUIRED',reason:'B3_MANDATORY_APPROVAL'};
  return{state:confidence!==null&&confidence<0.6?'CLARIFY':'INTENT_READY',reason:'LOW_STT_CONFIDENCE'};};
 const dialogue={respond:async()=>{calls.push('dialogue');return{status:'NO_EVIDENCE',text:'Necesito evidencia.',executed:false};}};
 const gate=createJarvisB5GuardedPreview({identityProvider,controlStore,b3PolicyService,auditStore,compileIntent,adaptVoice,dialogue});
 return{gate,calls};
};
test('B5 CUT03 text and voice final produce same preview-only interpretation',async()=>{
 const {gate}=setup();const t=await gate.preview(base);
 const v=await gate.preview({...base,channel:'VOICE_STT',confidence:.93});
 assert.equal(t.state,'PREVIEW_ONLY');assert.equal(v.state,t.state);assert.equal(v.intentKind,t.intentKind);
 assert.equal(v.mayExecute,false);assert.equal(v.spentEuro,0);assert.equal(v.modelCalled,false);
});
test('B5 CUT03 final voice partial ignored before touching auth or models',async()=>{
 const {gate,calls}=setup();const r=await gate.preview({...base,channel:'VOICE_STT',isFinal:false});
 assert.equal(r.state,'INTERIM_IGNORED');assert.deepEqual(calls,[]);
});
test('B5 CUT03 local STOP works without access token or network',async()=>{
 const {gate,calls}=setup();const r=await gate.preview({...base,token:null,channel:'VOICE_STT',text:'para',confidence:0});
 assert.equal(r.state,'STOP_AUDIO_LOCAL');assert.equal(r.mayExecute,false);assert.deepEqual(calls,['voice']);
});
test('B5 CUT03 missing identity fails closed with no audit/transcript leakage',async()=>{
 const {gate,calls}=setup();const r=await gate.preview({...base,token:null});
 assert.equal(r.reason,'AUTH_REQUIRED');assert.deepEqual(calls,[]);
});
test('B5 CUT03 failed identity provider does not allow offline token inference',async()=>{
 const {gate,calls}=setup({identityThrow:true});const r=await gate.preview(base);
 assert.equal(r.reason,'AUTH_UNAVAILABLE');assert.deepEqual(calls,['identity']);
});
test('B5 CUT03 server-verified owner role required',async()=>{
 const {gate}=setup({role:'VIEWER'});assert.equal((await gate.preview(base)).reason,'OWNER_SCOPE_DENIED');
});
test('B5 CUT03 server-verified session required',async()=>{
 const {gate}=setup({session:'other'});assert.equal((await gate.preview(base)).reason,'OWNER_SCOPE_DENIED');
});
test('B5 CUT03 cross-company scope denied independent of client company claim',async()=>{
 const {gate,calls}=setup({tenant:'aion'});const r=await gate.preview(base);
 assert.equal(r.reason,'OWNER_SCOPE_DENIED');assert.equal(calls.includes('grant'),false);
});
test('B5 CUT03 kill switch OFF blocks even a verified owner',async()=>{
 const {gate,calls}=setup({enabled:false});assert.equal((await gate.preview(base)).reason,'B5_LOCKED');
 assert.equal(calls.includes('compile'),false);
});
test('B5 CUT03 B3 grant deny cannot be bypassed using chat or voice',async()=>{
 const {gate,calls}=setup({grant:'DENY'});assert.equal((await gate.preview(base)).reason,'B3_POLICY_DENIED');
 assert.equal((await gate.preview({...base,channel:'VOICE_STT'})).reason,'B3_POLICY_DENIED');
 assert.equal(calls.includes('dialogue'),false);
});
test('B5 CUT03 audit failure stops before reply generation',async()=>{
 const {gate,calls}=setup({audit:false});assert.equal((await gate.preview(base)).reason,'AUDIT_UNAVAILABLE');
 assert.equal(calls.includes('dialogue'),false);
});
test('B5 CUT03 audit metadata contains no secret, raw speech or token',async()=>{
 const {gate,calls}=setup();await gate.preview({...base,text:'Dime el estado de la misión secreta',token:'private-strong-token'});
 const events=calls.filter(Array.isArray).map(x=>x[1]);assert.equal(events.length,1);
 const log=JSON.stringify(events);assert.equal(log.includes('private-strong-token'),false);
 assert.equal(log.includes('misión secreta'),false);
});
test('B5 CUT03 monetary or destructive operation is HUMAN_REQUIRED never executable',async()=>{
 const {gate,calls}=setup();const r=await gate.preview({...base,text:'Borrar toda la empresa'});
 assert.equal(r.state,'HUMAN_REQUIRED');assert.equal(r.mayExecute,false);assert.equal(calls.includes('dialogue'),false);
});
test('B5 CUT03 voice confirmation with pending action never executes',async()=>{
 const {gate}=setup();const r=await gate.preview({...base,channel:'VOICE_STT',text:'Sí',confidence:1,pendingAction:true});
 assert.equal(r.state,'CONFIRMATION_REQUIRED');assert.equal(r.mayExecute,false);
});
test('B5 CUT03 low-quality STT stays in clarification and does not execute',async()=>{
 const {gate}=setup();const r=await gate.preview({...base,channel:'VOICE_STT',confidence:.3});
 assert.equal(r.state,'CLARIFY');assert.equal(r.reason,'LOW_STT_CONFIDENCE');
});
test('B5 CUT03 denies invalid tenant and request before effects',async()=>{
 const {gate,calls}=setup();assert.equal((await gate.preview({...base,companyId:'*'})).reason,'REQUEST_INVALID');
 assert.deepEqual(calls,[]);
});
test('B5 CUT03 no conversation text or model output can create side effects',async()=>{
 const {gate}=setup();const r=await gate.preview({...base,text:'Actualiza el sistema'});
 assert.equal(r.state,'PREVIEW_ONLY');assert.equal(r.modelCalled,false);assert.equal(r.spentEuro,0);
});
