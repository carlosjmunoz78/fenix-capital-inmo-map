import test from 'node:test';
import assert from 'node:assert/strict';
import{createJarvisOnlineFreeVoiceHttpLab}from'./jarvis-online-free-voice-http-v0.mjs';

const origin='https://app.fenixcapital.es';
const endpoint='https://private-gateway.example/voice/lab/generic-synthesize';
const token='LAB_FABRICATED_NON_SECRET_TOKEN_01234567890';
const data={surface:'JARVIS',session_id:'session-qa',request_id:'request-qa',consent_ref:'consent-qa',text:'Hola JARVIS'};
const body=(payload=data)=>JSON.stringify(payload);
function fixture(opts={}){
 const seen={calls:0,received:null,accessChecks:0};
 const port={synthesize:async r=>{seen.calls++;seen.received=r;return opts.result??{
  state:'AUDIO_BYTES_READY',bytes:new Uint8Array(180),canonicalJarvisV2:false
 }}};
 const handler=createJarvisOnlineFreeVoiceHttpLab({
  voicePort:port,allowedOrigins:[origin],
  accessVerified:async()=>{seen.accessChecks++;return opts.access??true}
 });
 const req=(method='POST',payload=data,from=origin,auth='Bearer '+token)=>new Request(endpoint,{
  method,headers:{Origin:from,Authorization:auth,'content-type':'application/json'},
  body:method==='GET'||method==='OPTIONS'?undefined:body(payload)
 });
 return {handler,seen,req};
}
test('cannot create an open public endpoint or omit Cloudflare Access',()=>{
 assert.throws(()=>createJarvisOnlineFreeVoiceHttpLab({voicePort:{synthesize:async()=>({})},allowedOrigins:[origin]}),/TRUSTED_DEPS/);
 assert.throws(()=>createJarvisOnlineFreeVoiceHttpLab({voicePort:{synthesize:async()=>({})},allowedOrigins:['http://insecure.test'],accessVerified:async()=>true}),/TRUSTED_DEPS/);
});
test('without Origin header, no auth or audio leaked',async()=>{
 const f=fixture();
 const r=await f.handler.handle(new Request(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'content-type':'application/json'},body:body()}));
 assert.equal(r.status,403);assert.equal(f.seen.calls,0);
});
test('wrong CORS origin cannot access',async()=>{
 const f=fixture();
 const r=await f.handler.handle(f.req('POST',data,'https://attacker.example'));
 assert.equal(r.status,403);assert.equal(f.seen.accessChecks,0);assert.equal(f.seen.calls,0);
});
test('CORS preflight only for registered App origin',async()=>{
 const f=fixture();const res=await f.handler.handle(f.req('OPTIONS'));
 assert.equal(res.status,204);assert.equal(res.headers.get('access-control-allow-origin'),origin);
 assert.equal(f.seen.calls,0);
});
test('GET never exposes audio and requires POST',async()=>{
 const f=fixture();const r=await f.handler.handle(f.req('GET'));
 assert.equal(r.status,405);assert.equal(f.seen.calls,0);
});
test('missing token and JSON content-type denied',async()=>{
 const f=fixture();
 assert.equal((await f.handler.handle(f.req('POST',data,origin,'bad'))).status,401);
 const r=await f.handler.handle(new Request(endpoint,{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'content-type':'text/plain'},body:body()}));
 assert.equal(r.status,415);assert.equal(f.seen.calls,0);
});
test('owner claimed roles, voice id and billing flags refused before Access',async()=>{
 const f=fixture();
 for(const forbidden of [{environment:'PROD'},{model:'paid-model'},{voiceId:'clone'},{role:'OWNER_ROOT'},{allowPaid:true},{jwt:token},{billing:'card'}]){
  const res=await f.handler.handle(f.req('POST',{...data,...forbidden}));
  assert.equal(res.status,400);assert.equal(f.seen.calls,0);
 }
});
test('unknown endpoint refused, even for authorized Owner',async()=>{
 const f=fixture();const r=await f.handler.handle(new Request('https://private-gateway.example/voice/lab/other',{
  method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'content-type':'application/json'},body:body()}));
 assert.equal(r.status,404);assert.equal(f.seen.calls,0);
});
test('Cloudflare Access check is mandatory, never rely solely on JWT',async()=>{
 const f=fixture({access:false});
 const r=await f.handler.handle(f.req());
 assert.equal(r.status,403);assert.equal(f.seen.calls,0);
 assert.equal(f.seen.accessChecks,1);
});
test('authorized short public phrase returns private generic MP3, never JARVIS clone',async()=>{
 const f=fixture();
 const r=await f.handler.handle(f.req());
 assert.equal(r.status,200);
 assert.equal(r.headers.get('content-type'),'audio/mpeg');
 assert.equal(r.headers.get('cache-control'),'private, no-store');
 assert.equal(r.headers.get('access-control-allow-origin'),origin);
 assert.equal(r.headers.get('x-jarvis-voice-kind'),'GENERIC_NOT_JARVIS_V2');
 assert.equal((await r.arrayBuffer()).byteLength,180);
 assert.equal(f.seen.calls,1);
 assert.equal(f.seen.received.company_id,'fenix');
 assert.equal(f.seen.received.engine_id,'VOICE-001');
 assert.equal(f.seen.received.jwt,token);
 assert.equal(f.seen.received.surface,'JARVIS');
});
test('server-port denial cannot send audio or details',async()=>{
 const f=fixture({result:{state:'DENY',reason:'UNVERIFIED_SHARED_FREE_QUOTA',providerCalled:false}});
 const r=await f.handler.handle(f.req());
 assert.equal(r.status,403);assert.equal((await r.json()).reason,'UNVERIFIED_SHARED_FREE_QUOTA');
 assert.equal(r.headers.get('content-type'),'application/json; charset=utf-8');
});
test('mislabelled canonical audio from free generic provider rejected',async()=>{
 const f=fixture({result:{state:'AUDIO_BYTES_READY',bytes:new Uint8Array(180),canonicalJarvisV2:true}});
 const r=await f.handler.handle(f.req());
 assert.equal(r.status,403);
});
test('invalid audio bytes cannot leak through HTTP success',async()=>{
 const f=fixture({result:{state:'AUDIO_BYTES_READY',bytes:new Uint8Array(7),canonicalJarvisV2:false}});
 const r=await f.handler.handle(f.req());
 assert.equal(r.status,503);
});
