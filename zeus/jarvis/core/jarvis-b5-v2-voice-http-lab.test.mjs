import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB5V2VoiceHttpLab} from './jarvis-b5-v2-voice-http-lab.mjs';
const origin='https://lab.example.test';
const base='https://gateway.example.test/voice/v2/';
function fixture(){
 const called={tts:0,audio:0};
 const audioRef='private-audio-123';
 const voicePort={
  synthesize:async args=>{
   called.tts++;assert.equal(args.environment,'LAB');assert.equal(args.channel,'CEREBRO_CONSOLE');
   assert.equal(args.profileId,'JARVIS_V2_CLARA_ES_ES');assert.equal(args.token,'owner-opaque');
   return{state:'AUDIO_READY',audioRef,voiceProfileId:args.profileId,rate:1.1,
    pitchSemitones:0.6,mimeType:'audio/mpeg',ttlSeconds:600,prodAuthorized:false};
  },
  getAudio:async args=>{
   called.audio++;assert.equal(args.token,'owner-opaque');
   if(args.audioRef!==audioRef)return{state:'DENY'};
   return{state:'AUDIO_BYTES_AUTHORIZED',bytes:new Uint8Array(512),contentType:'audio/mpeg'}
  }
 };
 const handler=createJarvisB5V2VoiceHttpLab({voicePort,allowedOrigins:[origin]});
 const request=(path,body={},extra={})=>new Request(base+path,{
  method:extra.method||'POST',headers:{
   origin:extra.origin===undefined?origin:extra.origin,
   authorization:extra.auth===undefined?'Bearer owner-opaque':extra.auth,
   'content-type':extra.type===undefined?'application/json':extra.type
  },body:extra.method==='OPTIONS'?undefined:JSON.stringify(body)
 });
 const common={companyId:'fenix',sessionId:'session-123',requestId:'request-123',
  consentRef:'consent-123'};
 return{handler,called,request,common,audioRef};
}
test('isolated route returns private audio ticket then binary under B2/B3 port',async()=>{
 const{handler,called,request,common,audioRef}=fixture();
 const a=await handler.handle(request('synthesize',{...common,text:'Hola JARVIS'}));
 assert.equal(a.status,200);
 const ticket=await a.json();
 assert.equal(ticket.audioRef,audioRef);assert.equal(ticket.url,undefined);
 const b=await handler.handle(request('audio',{...common,audioRef}));
 assert.equal(b.status,200);assert.equal(b.headers.get('content-type'),'audio/mpeg');
 assert.equal(b.headers.get('cache-control'),'private, no-store');
 assert.equal((await b.arrayBuffer()).byteLength,512);
 assert.deepEqual(called,{tts:1,audio:1});
});
for(const [label,body,extra,expected] of [
 ['unknown origin',{}, {origin:'https://evil.example.test'},403],
 ['no token',{}, {auth:''},401],
 ['user supplied OWNER role',{roles:['OWNER_ROOT']},{},400],
 ['user supplied PROD env',{environment:'PROD'},{},400],
 ['user supplied voice ID',{voiceId:'ANA'},{},400],
 ['user supplied allowPaid',{allowPaid:true},{},400],
 ['bad content type',{}, {type:'text/plain'},415]
]){
 test('untrusted HTTP request fails closed: '+label,async()=>{
  const{handler,called,request,common}=fixture();
  const r=await handler.handle(request('synthesize',{...common,text:'hola',...body},extra));
  assert.equal(r.status,expected);
  assert.deepEqual(called,{tts:0,audio:0});
 });
}
test('unknown route denied and no provider call',async()=>{
 const{handler,request,called}=fixture();
 const r=await handler.handle(request('other',{}));
 assert.equal(r.status,404);assert.equal(called.tts,0);
});
test('CORS preflight uses explicit origin allowlist',async()=>{
 const{handler,request}=fixture();
 const r=await handler.handle(request('synthesize',{}, {method:'OPTIONS'}));
 assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),origin);
});
test('no default route wiring without server adapter',()=>{
 assert.throws(()=>createJarvisB5V2VoiceHttpLab(),/TRUSTED_LAB_HTTP_CONFIG_REQUIRED/);
});
