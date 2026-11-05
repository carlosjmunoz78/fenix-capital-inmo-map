import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createJarvisB2HmacRegistry} from './jarvis-b2-hmac-registry.mjs';
import {ZeusGlobalIdentityProvider} from './jarvis-global-identity.mjs';
const secret=Buffer.alloc(32,7);
const digest=(channel,subject)=>createHmac('sha256',secret).update('jarvis-b2-v0\0').update(channel).update('\0').update(subject).digest('hex');
const row=(channel='fenix-app',subject='auth-uuid-1')=>({channel,subject_hmac:digest(channel,subject),owner_id:'zeus-owner-1',role:'OWNER_ROOT',active:true,authorized_companies:['fenix']});
const build=(lookup,opts={})=>createJarvisB2HmacRegistry({secret,lookup,...opts});
test('looks up HMAC only and resolves OWNER_ROOT with company scope',async()=>{
 let inspected;
 const registry=build(async input=>{inspected=input;return row()});
 const result=await registry.resolve({channel:'fenix-app',subject:'auth-uuid-1'});
 assert.deepEqual(inspected,{channel:'fenix-app',subjectHmac:digest('fenix-app','auth-uuid-1')});
 assert.equal(JSON.stringify(inspected).includes('auth-uuid-1'),false);
 assert.equal(result.ownerId,'zeus-owner-1');
 assert.deepEqual(result.authorizedCompanies,['fenix']);
 assert.equal(Object.isFrozen(result),true);
});
test('different subject or channel never resolves another owner',async()=>{
 const registry=build(async ({channel,subjectHmac})=>channel==='fenix-app'&&subjectHmac===digest('fenix-app','auth-uuid-1')?row():null);
 await assert.rejects(registry.resolve({channel:'fenix-app',subject:'other-uuid'}),/OWNER_ROOT_REQUIRED/);
 await assert.rejects(registry.resolve({channel:'external',subject:'auth-uuid-1'}),/OWNER_ROOT_REQUIRED/);
});
test('invalid secret or production configuration fails before lookup',()=>{
 assert.throws(()=>createJarvisB2HmacRegistry({secret:Buffer.alloc(12),lookup:async()=>row()}),/SERVER_VAULT/);
 assert.throws(()=>build(async()=>row(),{environment:'PROD'}),/LAB_ONLY/);
});
for(const [label,mutate] of [
 ['inactive',r=>({...r,active:false})],['wrong role',r=>({...r,role:'DIR-TEST'})],
 ['other HMAC',r=>({...r,subject_hmac:'f'.repeat(64)})],
 ['other channel',r=>({...r,channel:'other'})],
 ['wildcard scope',r=>({...r,authorized_companies:['*']})],
 ['empty scope',r=>({...r,authorized_companies:[]})],
 ['missing owner',r=>({...r,owner_id:''})],
 ['malformed company scope',r=>({...r,authorized_companies:'fenix'})]
])test('fail closed: '+label,async()=>{
 const registry=build(async()=>mutate(row()));
 await assert.rejects(registry.resolve({channel:'fenix-app',subject:'auth-uuid-1'}),/OWNER_ROOT_REQUIRED/);
});
test('failed database lookup cannot become an allow',async()=>{
 const registry=build(async()=>{throw Error('DB_SECRET_OR_CONNECTION')});
 await assert.rejects(registry.resolve({channel:'fenix-app',subject:'auth-uuid-1'}),/OWNER_ROOT_REQUIRED/);
});
test('integrates with existing global identity provider while preserving tenant intersection',async()=>{
 const registry=build(async()=>row());
 const channel={verify:async()=>({subject:'auth-uuid-1',sessionId:'session-a',authorizedCompanies:['fenix','aion']})};
 const identity=new ZeusGlobalIdentityProvider({channels:new Map([['fenix-app',channel]]),registry});
 const result=await identity.verify({channel:'fenix-app',accessToken:'synthetic-signed-token'});
 assert.deepEqual(result.authorizedCompanies,['fenix']);
 assert.deepEqual(result.roles,['OWNER_ROOT']);
});
