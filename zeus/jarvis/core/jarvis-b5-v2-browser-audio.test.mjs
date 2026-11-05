import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const raw=readFileSync(new URL('../../../src/jarvisV2AudioDeliveryLab.ts',import.meta.url),'utf8');
const js=stripTypeScriptTypes(raw,{mode:'strip'});
const {validateJarvisV2Ticket,createJarvisV2LabAudioController}=
 await import('data:text/javascript,'+encodeURIComponent(js));
const good=()=>({state:'AUDIO_READY',audioRef:'private-audio-123',
 voiceProfileId:'JARVIS_V2_CLARA_ES_ES',rate:1.10,pitchSemitones:0.6,
 mimeType:'audio/mpeg',ttlSeconds:600,prodAuthorized:false});
function fixture(o={}){
 const counts={synth:0,download:0,create:0,revoke:0,play:0,pause:0};
 let player;
 const deps={
  synthesize:async(_text,signal)=>{counts.synth++;assert.equal(signal.aborted,false);return o.ticket??good()},
  download:async(ref)=>{counts.download++;assert.equal(ref,'private-audio-123');return o.blob??new Blob([new Uint8Array(512)],{type:'audio/mpeg'})},
  createObjectUrl:()=>{counts.create++;return 'blob:jarvis-test-'+counts.create},
  revokeObjectUrl:()=>{counts.revoke++},
  createPlayer:()=>{player={
    onended:null,onerror:null,currentTime:0,playbackRate:1,
    play:async()=>{counts.play++;if(o.playFails)throw Error('AUTOPLAY_DENIED')},
    pause:()=>{counts.pause++}
   };return player}
 };
 return{counts,controller:createJarvisV2LabAudioController(deps),getPlayer:()=>player};
}
test('only exact private approved ticket accepted',()=>{
 assert.equal(validateJarvisV2Ticket(good()),true);
 for(const overrides of [{state:'NO'}, {rate:1}, {pitchSemitones:0.3},
   {voiceProfileId:'ANA'}, {prodAuthorized:true},{ttlSeconds:601},
   {mimeType:'audio/wav'}, {audioRef:'https://example.com/voice.mp3'}]){
  assert.equal(validateJarvisV2Ticket({...good(),...overrides}),false);
 }
});
test('plays private audio without speeding up twice, supports pause/resume',async()=>{
 const {counts,controller,getPlayer}=fixture();
 assert.equal(await controller.speak('Buenas tardes'),true);
 assert.equal(controller.getState(),'SPEAKING');
 assert.equal(getPlayer().playbackRate,1);
 assert.equal(controller.pause(),true);assert.equal(controller.getState(),'PAUSED');
 assert.equal(await controller.resume(),true);assert.equal(controller.getState(),'SPEAKING');
 getPlayer().onended();
 assert.equal(controller.getState(),'ENDED');
 assert.equal(counts.synth,1);assert.equal(counts.download,1);
 assert.equal(counts.create,1);assert.equal(counts.revoke,1);
 assert.equal(counts.play,2);
});
test('explicit interrupt stops and revokes private audio',async()=>{
 const{counts,controller}=fixture();
 await controller.speak('Hola JARVIS');
 controller.stop();
 assert.equal(controller.getState(),'STOPPED');
 assert.equal(counts.revoke,1);
 assert.equal(counts.pause>=1,true);
});
test('unapproved voice cannot trigger download or playback',async()=>{
 const{counts,controller}=fixture({ticket:{...good(),voiceProfileId:'ANA'}});
 assert.equal(await controller.speak('Buenas'),false);
 assert.equal(controller.getState(),'ERROR');
 assert.equal(counts.download,0);assert.equal(counts.create,0);
});
test('invalid audio bytes cannot be played',async()=>{
 const{counts,controller}=fixture({blob:new Blob(['too small'],{type:'text/plain'})});
 assert.equal(await controller.speak('Buenas'),false);
 assert.equal(controller.getState(),'ERROR');
 assert.equal(counts.create,0);
});
test('browser autoplay failure releases audio',async()=>{
 const{counts,controller}=fixture({playFails:true});
 assert.equal(await controller.speak('Buenas'),false);
 assert.equal(controller.getState(),'ERROR');
 assert.equal(counts.revoke,1);
});
test('empty text never requests audio',async()=>{
 const{counts,controller}=fixture();
 assert.equal(await controller.speak('   '),false);
 assert.equal(counts.synth,0);
});
test('no adapter or provider connection rejects by default',()=>{
 assert.throws(()=>createJarvisV2LabAudioController({}),/TRUSTED_AUDIO_DELIVERY_DEPENDENCIES_REQUIRED/);
});
