import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveCerebroVoiceSurface} from '../src/jarvisVoiceSurfacePolicy.ts';
import {inspectJarvisAudioDevice} from '../src/jarvisAudioDeviceProbe.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const c=(path,view='JARVIS',companyId='fenix',host='FENIX_APP')=>
 resolveCerebroVoiceSurface({pathname:path,view,host,companyId});
const base={secureContext:true,speechRecognitionSupported:true,speechSynthesisSupported:true,spanishVoiceCount:2};

test('CUT47 approved voice profile is invariant across all CEREBRO surfaces and companies',()=>{
 for(const companyId of ['fenix','otraempresa']){
  for(const view of ['JARVIS','OPERATIVA','NEURONAL','NAVEGADOR','V0']){
   const x=c('/cerebro',view,companyId);
   assert.equal(x.owner,'JARVIS_V2');
   assert.equal(x.preset,'MAS_CLARA_1_10X');
   assert.equal(x.rate,1.10);
   assert.equal(x.pitchSemitones,0.6);
   assert.equal(x.canSynthesize,false);
   assert.equal(x.providerCalled,false);
   assert.equal(x.prodAuthorized,false);
  }
 }
});

test('CUT47 ANA remains selected on every other App Fénix route',()=>{
 for(const path of ['/','/inicio','/clientes','/perfil','/crm','/cerebro-extra']){
  const x=c(path,'JARVIS');
  assert.equal(x.owner,'ANA');
  assert.equal(x.state,'LEGACY_ANA_PRESERVED');
  assert.equal(x.canSynthesize,false);
 }
});

test('CUT47 unknown surfaces and unrecognized host fail closed',()=>{
 assert.equal(c('/cerebro','UNKNOWN').owner,'DENY');
 assert.equal(c('/cerebro','JARVIS','fenix','OTHER_ORIGIN').owner,'DENY');
 assert.equal(c('/cerebro','JARVIS','').owner,'DENY');
 assert.equal(c('/cerebro','JARVIS','../../fenix').owner,'DENY');
 assert.equal(c('//cerebro').owner,'DENY');
});

test('CUT47 device probe is explicit and stops all obtained microphone tracks',async()=>{
 let stopped=0,calls=0;
 const getUserMedia=async constraints=>{
  calls++;
  assert.deepEqual(constraints,{audio:true,video:false});
  return {getTracks:()=>[
   {kind:'audio',stop:()=>{stopped++}},
   {kind:'video',stop:()=>{stopped++}}
  ]};
 };
 const result=await inspectJarvisAudioDevice({...base,getUserMedia});
 assert.equal(calls,1);
 assert.equal(stopped,2);
 assert.equal(result.status,'MIC_GRANTED');
 assert.equal(result.permission_granted,true);
 assert.equal(result.speech_recognition_api_present,true);
 assert.equal(result.spanish_voice_count,2);
 assert.equal(result.physical_transcription_verified,false);
 assert.equal(result.audible_playback_verified,false);
 assert.equal(result.approved_clone_connected,false);
});

test('CUT47 denied microphone never claims a working voice conversation',async()=>{
 const getUserMedia=async()=>{const err=new Error('denied');err.name='NotAllowedError';throw err};
 const result=await inspectJarvisAudioDevice({...base,getUserMedia});
 assert.equal(result.status,'MIC_PERMISSION_DENIED');
 assert.equal(result.permission_granted,false);
 assert.equal(result.audible_playback_verified,false);
});

test('CUT47 no microphone capability or insecure origin never requests audio',async()=>{
 let calls=0;
 const getUserMedia=async()=>{calls++;return{getTracks:()=>[]}};
 const insecure=await inspectJarvisAudioDevice({...base,secureContext:false,getUserMedia});
 assert.equal(insecure.status,'HTTPS_REQUIRED');
 assert.equal(calls,0);
 const missing=await inspectJarvisAudioDevice({...base,getUserMedia:null});
 assert.equal(missing.status,'MIC_UNAVAILABLE');
 assert.equal(calls,0);
});

test('CUT47 no audio track stops other tracks and does not claim mic success',async()=>{
 let stopped=0;
 const r=await inspectJarvisAudioDevice({...base,getUserMedia:async()=>({getTracks:()=>[{kind:'video',stop:()=>{stopped++}}]})});
 assert.equal(r.status,'NO_AUDIO_TRACK');
 assert.equal(stopped,1);
 assert.equal(r.permission_granted,false);
});

test('CUT47 no provider API call or secret in local browser device check',()=>{
 const probe=read('src/jarvisAudioDeviceProbe.ts');
 const ui=read('src/JarvisAudioDeviceCheck.tsx');
 const host=read('src/CerebroConsoleHost.tsx');
 const status=read('src/CerebroJarvisVoiceLabStatus.tsx');
 assert.match(ui,/onClick=\{\(\)=>void check\(\)\}/);
 assert.match(ui,/inspectJarvisAudioDevice\(browserJarvisAudioEnvironment\(\)\)/);
 assert.match(host,/<CerebroJarvisVoiceLabStatus view=\{primaryView\}/);
 assert.match(status,/import\.meta\.env\.DEV&&import\.meta\.env\.VITE_CEREBRO_JARVIS_V2_LAB==='1'/);
 assert.doesNotMatch(probe,/fetch\(|api\.deepseek\.com|service_role|api_key|MediaRecorder|localStorage/i);
 assert.doesNotMatch(ui,/MediaRecorder|fetch\(|vidIQ|api_key/);
});
