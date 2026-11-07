import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisOnlineFreeTtsPort,boundedMp3,JARVIS_CLOUDFLARE_GENERIC_FREE_V0 as profile} from './jarvis-online-free-tts-port-v0.mjs';

const jwt='LAB_FABRICATED_NON_SECRET_TOKEN_01234567890';
const request=Object.freeze({
  jwt,company_id:'fenix',engine_id:'VOICE-001',surface:'JARVIS',
  session_id:'fake-session',request_id:'fake-request',consent_ref:'fake-consent',
  text:'Hola. Soy tu asistente de pruebas.'
});
function fixture(overrides={}){
  const seen={calls:0,reserved:[],committed:[],released:[],audit:[],runArgs:[]};
  const deps={
    identity:{verifyOwner:async()=>({role:'OWNER_ROOT',owner_id:'owner-qa',session_id:'fake-session',company_ids:['fenix']})},
    policy:{authorize:async()=>({decision:'ALLOW'})},
    consent:{check:async()=>true},
    privacy:{classify:async()=>({classification:'PUBLIC'})},
    quota:{
      reserveFree:async(req)=>{
        seen.reserved.push(req);
        return{state:'HELD',fresh:true,accountWideFreeBudgetVerified:true,
          paidOverflowAllowed:false,reservation_id:'reservation-qa',
          reservedNeurons:req.maxNeurons};
      },
      commit:async req=>{seen.committed.push(req);return true},
      release:async id=>{seen.released.push(id);return true}
    },
    ai:{run:async (...args)=>{seen.calls++;seen.runArgs.push(args);return new Uint8Array(180)}},
    audit:{record:async event=>{seen.audit.push(event);return true}},
    control:{read:async()=>({enabled:true,kill_switch:false,generic_fallback_opt_in:true,allowPaid:false,cloudflare_account_plan:'FREE'})}
  };
  for(const[k,v]of Object.entries(overrides))deps[k]=v;
  return {port:createJarvisOnlineFreeTtsPort(deps),seen,deps};
}

test('default is OFF, never claims canonical voice, never permits paid overage',()=>{
 assert.equal(profile.defaultEnabled,false);
 assert.equal(profile.canonicalJarvisV2,false);
 assert.equal(profile.productionAuthorized,false);
 assert.equal(profile.allowPaidOverage,false);
 assert.equal(profile.noNewWorkerRequired,true);
 assert.equal(profile.model,'@cf/deepgram/aura-2-es');
 assert.equal(profile.speaker,'javier');
});
test('does not construct without all B2/B3, budget, privacy and AI gates',()=>{
 assert.throws(()=>createJarvisOnlineFreeTtsPort({}),/SERVER_GATES_MISSING/);
});
test('authorized owner, free-only atomically verified reservation returns private generic MP3',async()=>{
 const{port,seen}=fixture();
 const res=await port.synthesize(request);
 assert.equal(res.state,'AUDIO_BYTES_READY');
 assert.equal(res.canonicalJarvisV2,false);
 assert.equal(res.contentType,'audio/mpeg');
 assert.equal(res.cacheControl,'private, no-store');
 assert.match(res.voiceProfileId,/GENERIC/);
 assert.equal(res.spentEuro,0);
 assert.equal(res.bytes.length,180);
 assert.equal(seen.calls,1);
 assert.deepEqual(seen.runArgs[0],[profile.model,{text:request.text,speaker:'javier',encoding:'mp3'}]);
 assert.equal(seen.reserved[0].accountWide,true);
 assert.equal(seen.reserved[0].paidOverflowAllowed,false);
 assert.equal(seen.reserved[0].maxNeurons,request.text.length*3);
 assert.equal(seen.committed.length,1);
 assert.equal(seen.audit.length,2);
});
test('default kill-switch refuses even when user is Owner',async()=>{
 const f=fixture({control:{read:async()=>({enabled:false,kill_switch:true})}});
 const res=await f.port.synthesize(request);
 assert.equal(res.reason,'GENERIC_FALLBACK_OFF');
 assert.equal(f.seen.calls,0);
 assert.equal(f.seen.reserved.length,0);
});
test('paid cloudflare plan never meets zero-cost-only scope',async()=>{
 const f=fixture({control:{read:async()=>({enabled:true,kill_switch:false,generic_fallback_opt_in:true,cloudflare_account_plan:'PAID'})}});
 assert.equal((await f.port.synthesize(request)).reason,'GENERIC_FALLBACK_OFF');
 assert.equal(f.seen.calls,0);
});
test('unverified JWT / forged owner / company / forbidden surface all denied',async()=>{
 const scopes=[
  {...request,jwt:'bad'},
  {...request,company_id:'otraempresa'},
  {...request,engine_id:'ANA'},
  {...request,surface:'ANA'},
  {...request,surface:'UNKNOWN'},
  {...request,ownerId:'owner-qa'},
  {...request,allowPaid:true},
  {...request,voiceId:'cfkJwJs7cjrVgVLm3yvM'},
  {...request,environment:'PROD'}
 ];
 for(const data of scopes){
  const f=fixture();const res=await f.port.synthesize(data);
  assert.equal(res.state,'DENY');
  assert.equal(f.seen.calls,0);
 }
});
test('B2 forged identity rejected before free reservation',async()=>{
 const f=fixture({identity:{verifyOwner:async()=>({role:'OWNER',owner_id:'not-owner',session_id:'fake-session',company_ids:['fenix']})}});
 assert.equal((await f.port.synthesize(request)).reason,'OWNER_SCOPE_DENIED');
 assert.equal(f.seen.calls,0);
});
test('B3 refusal denies before inference',async()=>{
 const f=fixture({policy:{authorize:async()=>({decision:'DENY'})}});
 assert.equal((await f.port.synthesize(request)).reason,'B3_DENY');
 assert.equal(f.seen.calls,0);
});
test('no consent blocks remote voice',async()=>{
 const f=fixture({consent:{check:async()=>false}});
 assert.equal((await f.port.synthesize(request)).reason,'VOICE_CONSENT_REQUIRED');
 assert.equal(f.seen.calls,0);
});
test('internal or private speech text never gets sent to provider',async()=>{
 const f=fixture({privacy:{classify:async()=>({classification:'INTERNAL'})}});
 assert.equal((await f.port.synthesize(request)).reason,'PRIVATE_CONTENT_REQUIRES_CANONICAL_LOCAL');
 assert.equal(f.seen.calls,0);
});
test('potential secrets and overly long text do not reach provider',async()=>{
 const texts=['Mi contraseña es test', 'Bearer AAA', 'api_key=xyz', 'Mi IBAN es privado', 'a'.repeat(401),'   '];
 for(const text of texts){
  const f=fixture();const res=await f.port.synthesize({...request,text});
  assert.equal(res.state,'DENY');
  assert.equal(f.seen.calls,0);
 }
});
test('shared quota not independently attested: no inference and release held reservation',async()=>{
 const f=fixture({quota:{
  reserveFree:async()=>({state:'HELD',fresh:true,reservation_id:'held-qa',accountWideFreeBudgetVerified:false,
    paidOverflowAllowed:false,reservedNeurons:10}),
  commit:async()=>true,
  release:async id=>{f.seen.released.push(id);return true}
 }});
 assert.equal((await f.port.synthesize(request)).reason,'UNVERIFIED_SHARED_FREE_QUOTA');
 assert.deepEqual(f.seen.released,['held-qa']);
 assert.equal(f.seen.calls,0);
});
test('invalid or missing success audit never reports ready',async()=>{
 let count=0;
 const f=fixture({audit:{record:async()=>++count===1}});
 const res=await f.port.synthesize(request);
 assert.equal(res.state,'DENY');
 assert.equal(res.reconciliationRequired,true);
 assert.equal(res.providerCalled,true);
 assert.equal(f.seen.calls,1);
});
test('provider errors never claim zero consumption after inference has started',async()=>{
 let called=0;
 const f=fixture({ai:{run:async()=>{called++;throw Error('PROVIDER_OFFLINE')}}});
 const res=await f.port.synthesize(request);
 assert.equal(res.state,'DENY');
 assert.equal(res.providerCalled,true);
 assert.equal(res.spentEuro,null);
 assert.equal(res.reconciliationRequired,true);
 assert.equal(called,1);
});
test('bounded stream reads MP3 chunks and rejects overlarge body',async()=>{
 const bytes=new Uint8Array(180);
 const stream=new ReadableStream({start(c){c.enqueue(bytes.slice(0,90));c.enqueue(bytes.slice(90));c.close()}});
 const audio=await boundedMp3(stream);
 assert.equal(audio.length,180);
 const tooLarge=new ReadableStream({start(c){c.enqueue(new Uint8Array(250));c.close()}});
 await assert.rejects(()=>boundedMp3(tooLarge,200),/AUDIO_TOO_LARGE/);
});
