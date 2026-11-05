import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB5V2TtsOutputPort,JARVIS_V2_OUTPUT} from './jarvis-b5-v2-tts-output-port.mjs';

const request=()=>({companyId:'fenix',environment:'LAB',channel:'CEREBRO_CONSOLE',
 sessionId:'session-123',requestId:'request-123',consentRef:'consent-123',
 profileId:'JARVIS_V2_CLARA_ES_ES',token:'server-opaque-test-identity',
 text:'Buenas tardes. Esta respuesta es nueva.'});
function setup(o={}){
 const calls={provider:0,put:0,get:0,credits:0,settle:0,release:0,audit:0};
 const store=new Map();
 const d={
  identityProvider:{verify:async()=>o.principal??{ownerId:'owner-1',sessionId:'session-123',roles:['OWNER_ROOT'],authorizedCompanies:['fenix']}},
  controlStore:{get:async()=>o.control??{enabled:true,killSwitch:false,voiceV2Enabled:true}},
  consentStore:{check:async()=>o.consent??true},
  b3PolicyService:{authorize:async()=>({decision:o.policy??'ALLOW'})},
  privacyResolver:{classify:async()=>({privacy:o.privacy??'INTERNAL'})},
  rateLimiter:{allow:async()=>o.rateLimit??true},
  budgetLedger:{
   reserve:async()=>{calls.credits++;return o.hold??{state:'HELD',fresh:true,verifiedPrepaid:true,reservationId:'reservation-1',maxCredits:14}},
   settle:async()=>{calls.settle++;return o.settle??true},
   release:async()=>{calls.release++;return true}
  },
  auditStore:{append:async()=>{calls.audit++;return o.audit??true}},
  providerAdapter:{synthesize:async params=>{
   calls.provider++;
   assert.equal(params.voiceId,JARVIS_V2_OUTPUT.voiceId);
   assert.equal(params.requestedRate,1.1);
   assert.equal(params.requestedPitchSemitones,0.6);
   assert.equal(params.token,undefined);
   if(o.providerThrow)throw Error('UPSTREAM_FAILED');
   return o.audio??{voiceId:params.voiceId,mimeType:'audio/mpeg',rateApplied:1.1,
    pitchSemitonesApplied:0.6,creditsCharged:14,bytes:new Uint8Array(512)};
  }},
  audioStore:{
   put:async payload=>{calls.put++;const ref='private-audio-'+calls.put;store.set(ref,payload);return ref},
   get:async q=>{calls.get++;const audio=store.get(q.audioRef);
    if(!audio||audio.companyId!==q.companyId||audio.sessionId!==q.sessionId||
       audio.ownerId!==q.ownerId)return null;
    return{bytes:audio.bytes,contentType:audio.contentType}}
  }
 };
 return{port:createJarvisB5V2TtsOutputPort(d),calls,d};
}
test('constructor rejects missing trusted server adapters',()=>{
 assert.throws(()=>createJarvisB5V2TtsOutputPort(),/TRUSTED_SERVER_ADAPTERS_REQUIRED/);
});
test('approved text creates only private server audioRef and exact V2 profile',async()=>{
 const{port,calls}=setup();
 const r=await port.synthesize(request());
 assert.equal(r.state,'AUDIO_READY');
 assert.equal(r.voiceProfileId,'JARVIS_V2_CLARA_ES_ES');
 assert.equal(r.rate,1.10);assert.equal(r.pitchSemitones,0.6);
 assert.equal(r.creditsCharged,14);assert.equal(r.prodAuthorized,false);
 assert.equal(r.url,undefined);
 assert.equal(r.bytes,undefined);
 assert.equal(calls.provider,1);assert.equal(calls.put,1);assert.equal(calls.settle,1);
 const audio=await port.getAudio({...request(),audioRef:r.audioRef});
 assert.equal(audio.state,'AUDIO_BYTES_AUTHORIZED');
 assert.equal(audio.contentType,'audio/mpeg');
 assert.equal(audio.bytes.byteLength,512);
 assert.equal(audio.cacheControl,'private, no-store');
 assert.equal(Object.isFrozen(r),true);
});
for(const [label,overrides,req] of [
 ['PROD not allowed',{}, {environment:'PROD'}],
 ['PREPROD not allowed',{}, {environment:'PREPROD'}],
 ['App ANA channel denied',{}, {channel:'APP_ANA_VOICE'}],
 ['wrong company',{}, {companyId:'aion'}],
 ['bad company identifier',{}, {companyId:'fenix;DROP'}],
 ['missing token',{}, {token:null}],
 ['missing owner role',{principal:{ownerId:'owner-1',sessionId:'session-123',roles:['STAFF'],authorizedCompanies:['fenix']}},{}],
 ['string roles spoof',{principal:{ownerId:'owner-1',sessionId:'session-123',roles:'OWNER_ROOT',authorizedCompanies:['fenix']}},{}],
 ['wrong session',{principal:{ownerId:'owner-1',sessionId:'another',roles:['OWNER_ROOT'],authorizedCompanies:['fenix']}},{}],
 ['string companies spoof',{principal:{ownerId:'owner-1',sessionId:'session-123',roles:['OWNER_ROOT'],authorizedCompanies:'fenix'}},{}],
 ['feature OFF',{control:{enabled:false,killSwitch:true,voiceV2Enabled:false}},{}],
 ['voice OFF with engine active',{control:{enabled:true,killSwitch:false,voiceV2Enabled:false}},{}],
 ['consent denied',{consent:false},{}],
 ['B3 denies',{policy:'DENY'},{}],
 ['restricted text',{privacy:'RESTRICTED'},{}],
 ['confidential text',{privacy:'CONFIDENTIAL'},{}],
 ['rate limit',{rateLimit:false},{}],
 ['audit failure',{audit:false},{}],
 ['budget denied',{hold:{state:'DENY'}},{}],
 ['unverified prepaid hold',{hold:{state:'HELD',fresh:true,verifiedPrepaid:false,reservationId:'res-1',maxCredits:14}},{}],
 ['duplicate credit hold',{hold:{state:'HELD',fresh:false,verifiedPrepaid:true,reservationId:'res-1',maxCredits:14}},{}],
 ['wrong preset',{}, {profileId:'JARVIS_V1'}],
 ['sensitive content',{}, {text:'Mi contraseña es ABC'}],
 ['too long',{}, {text:'a'.repeat(901)}]
]){
 test('fails closed before provider: '+label,async()=>{
  const{port,calls}=setup(overrides);
  const r=await port.synthesize({...request(),...req});
  assert.equal(r.state,'DENY');
  assert.equal(calls.provider,0);
  assert.equal(calls.put,0);
  assert.equal(r.audioRef,null);
 });
}
for(const [label,audio] of [
 ['wrong clone',{voiceId:'OTHER',mimeType:'audio/mpeg',rateApplied:1.1,pitchSemitonesApplied:0.6,bytes:new Uint8Array(500),creditsCharged:14}],
 ['wrong rate',{voiceId:JARVIS_V2_OUTPUT.voiceId,mimeType:'audio/mpeg',rateApplied:1.0,pitchSemitonesApplied:0.6,bytes:new Uint8Array(500),creditsCharged:14}],
 ['wrong pitch',{voiceId:JARVIS_V2_OUTPUT.voiceId,mimeType:'audio/mpeg',rateApplied:1.1,pitchSemitonesApplied:0.3,bytes:new Uint8Array(500),creditsCharged:14}],
 ['URL instead of bytes',{voiceId:JARVIS_V2_OUTPUT.voiceId,mimeType:'audio/mpeg',rateApplied:1.1,pitchSemitonesApplied:0.6,url:'https://example.com',creditsCharged:14}],
 ['credit overcharge',{voiceId:JARVIS_V2_OUTPUT.voiceId,mimeType:'audio/mpeg',rateApplied:1.1,pitchSemitonesApplied:0.6,bytes:new Uint8Array(500),creditsCharged:15}],
 ['audio too large',{voiceId:JARVIS_V2_OUTPUT.voiceId,mimeType:'audio/mpeg',rateApplied:1.1,pitchSemitonesApplied:0.6,bytes:new Uint8Array(5_000_001),creditsCharged:14}]
]){
 test('unverified provider output fails: '+label,async()=>{
  const{port,calls}=setup({audio});
  const r=await port.synthesize(request());
  assert.equal(r.state,'DENY');assert.equal(r.reason,'TTS_DELIVERY_OR_ACCOUNTING_FAILED');
  assert.equal(calls.put,0);assert.equal(calls.release,1);
  assert.equal(r.creditsStatus,'RECONCILIATION_REQUIRED');
 });
}
test('provider failure is fail-closed and requests credit reconciliation',async()=>{
 const{port,calls}=setup({providerThrow:true});
 const r=await port.synthesize(request());
 assert.equal(r.state,'DENY');
 assert.equal(r.providerCalled,true);
 assert.equal(calls.release,1);
});
test('settlement failure cannot return audioRef as successful',async()=>{
 const{port,calls}=setup({settle:false});
 const r=await port.synthesize(request());
 assert.equal(r.state,'DENY');assert.equal(r.audioRef,null);assert.equal(calls.release,1);
});
test('private audio cannot be read from other tenant or other session',async()=>{
 const{port,calls}=setup();
 const r=await port.synthesize(request());
 const wrongCompany=await port.getAudio({...request(),companyId:'aion',audioRef:r.audioRef});
 assert.equal(wrongCompany.state,'DENY');
 const wrongSession=await port.getAudio({...request(),sessionId:'session-other',audioRef:r.audioRef});
 assert.equal(wrongSession.state,'DENY');
 const missing=await port.getAudio({...request(),audioRef:'private-audio-other'});
 assert.equal(missing.state,'DENY');
 assert.equal(calls.provider,1);
});
