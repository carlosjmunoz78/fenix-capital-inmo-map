import test from 'node:test';import assert from 'node:assert/strict';
import {createJarvisB5Dialogue} from './jarvis-b5-dialogue.mjs';
import {compileJarvisB5Intent as compile} from './jarvis-b5-intent.mjs';
const make=(text,x={})=>compile({companyId:'fenix',projectId:'PRJ-SUPERAGENT-001',text,...x});
const dialogue=createJarvisB5Dialogue();
test('B5 dialogue never says an unverified mission was completed',async()=>{
 const r=await dialogue.respond({intent:make('Publica el artículo')});
 assert.equal(r.executed,false);assert.equal(r.status,'READY');
 assert.match(r.text,/no he ejecutado/i);
});
test('B5 dialogue interruption limits itself to local voice interruption',async()=>{
 const r=await dialogue.respond({intent:make('Para',{channel:'VOICE_STT'})});
 assert.equal(r.status,'INTERRUPTED');assert.equal(r.executed,false);
});
test('B5 dialogue high-risk transfer returns HUMAN_REQUIRED, not an execution claim',async()=>{
 const r=await dialogue.respond({intent:make('Transferir fondos')});
 assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'HIGH_RISK');
});
test('B5 dialogue clarifies vague missing mission only when necessary',async()=>{
 const missing=await dialogue.respond({intent:make('Continúa')});
 const known=await dialogue.respond({intent:make('Continúa',{missionId:'mission-1'})});
 assert.equal(missing.status,'CLARIFY');assert.equal(known.status,'READY');
});
test('B5 dialogue without verified evidence refuses to invent status',async()=>{
 const r=await dialogue.respond({intent:make('Dime el estado'),evidence:[{summary:'Todo funciona'}]});
 assert.equal(r.status,'NO_EVIDENCE');
});
test('B5 dialogue supports server-confirmed evidence without exposing raw IDs',async()=>{
 const guarded=createJarvisB5Dialogue({evidenceVerifier:async x=>x.sourceId==='verified-local'});
 const r=await guarded.respond({intent:make('Dime el estado'),evidence:[{sourceId:'verified-local',summary:'Bloque en LAB'},{sourceId:'fake',summary:'PROD terminado'}]});
 assert.equal(r.status,'VERIFIED_STATUS');assert.match(r.text,/Bloque en LAB/);assert.doesNotMatch(r.text,/PROD terminado/);
});
test('B5 dialogue asks for proof before answering an open knowledge question',async()=>{
 const r=await dialogue.respond({intent:make('¿Qué es la fiscalidad?')});
 assert.equal(r.status,'NEEDS_KNOWLEDGE');assert.equal(r.executed,false);
});
test('B5 dialogue does not repeat passwords supplied as voice input',async()=>{
 const r=await dialogue.respond({intent:make('mi contraseña es FOO')});
 assert.equal(r.status,'REJECTED');assert.doesNotMatch(r.text,/FOO/);
});
test('B5 dialogue denies arbitrary objects claiming execution rights',async()=>{
 const r=await dialogue.respond({intent:{kind:'PUBLISH',mayExecute:true}});
 assert.equal(r.status,'DENY');assert.equal(r.executed,false);
});
test('B5 speech response is bounded and coherent for voice',async()=>{
 const guarded=createJarvisB5Dialogue({evidenceVerifier:async()=>true});
 const r=await guarded.respond({intent:make('Dime el estado'),evidence:[{summary:'V'.repeat(210)},{summary:'W'.repeat(210)}]});
 assert.ok(r.speech.length<=260);assert.equal(r.locale,'es-ES');
});
