import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMissionMetadata} from './jarvis-mission-metadata-guard.mjs';
import {JarvisUniversalCore,MemoryEventStore} from './jarvis-universal-core.mjs';
test('PROD and PREPROD accept bounded metadata-only payloads',()=>{
 for(const env of ['PROD','PREPROD'])assert.deepEqual(validateMissionMetadata({topic:'status',scope:'fenix',filters:['current'],labels:['B2']},{environment:env}),{topic:'status',scope:'fenix',filters:['current'],labels:['B2']});
});
test('reject free-text, tokens, unknown fields and oversized payloads in non-LAB environments',()=>{
 for(const env of ['PROD','PREPROD']){
  for(const payload of [{prompt:'send secret'},{topic:'Bearer example-secret'},{topic:'hello world'},{labels:['hello world']},{topic:'a'.repeat(2100)},{token:'hidden'},{filters:[12]},{topic:{a:1}}]){
   assert.throws(()=>validateMissionMetadata(payload,{environment:env}),/INVALID/);
  }
 }
});
test('LAB retains legacy test payload behavior with no PROD implication',()=>{
 const value={prompt:'legacy synthetic test',access_token:'not-live'};
 assert.equal(validateMissionMetadata(value,{environment:'LAB'}),value);
});
test('PROD-mode core rejects free-text before calling persistent store',async()=>{
 let writes=0;
 const store=new MemoryEventStore();
 const original=store.createIfAbsent.bind(store);
 store.createIfAbsent=async m=>{writes++;return original(m);};
 const core=new JarvisUniversalCore({environment:'PROD',identityProvider:{verify:async()=>({ownerId:'test-owner',roles:['OWNER_ROOT'],sessionId:'test-session',authorizedCompanies:['fenix']})},store,ids:()=> 'metadata-mission'});
 await assert.rejects(core.submit({token:'fake',companyId:'fenix',projectId:'p',intent:'STATUS',idempotencyKey:'one',payload:{message:'private free text'}}),/INVALID/);
 assert.equal(writes,0);
 const r=await core.submit({token:'fake',companyId:'fenix',projectId:'p',intent:'STATUS',idempotencyKey:'two',payload:{topic:'status'}});
 assert.equal(r.mission.environment,'PROD');
 assert.equal(writes,1);
});
