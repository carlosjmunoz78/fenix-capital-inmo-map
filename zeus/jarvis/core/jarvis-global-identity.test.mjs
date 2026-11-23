import test from 'node:test';
import assert from 'node:assert/strict';
import {ZeusGlobalIdentityProvider} from './jarvis-global-identity.mjs';
import {JarvisUniversalCore,MemoryEventStore} from './jarvis-universal-core.mjs';
function make() {
 const bindings=new Map([['fenix:uid-fenix',{ownerId:'zeus-root-001',role:'OWNER_ROOT',active:true,authorizedCompanies:['fenix','aion']}],['mobile:uid-mobile',{ownerId:'zeus-root-001',role:'OWNER_ROOT',active:true,authorizedCompanies:['fenix','aion']}],['mobile:revoked',{ownerId:'zeus-root-001',role:'OWNER_ROOT',active:false,authorizedCompanies:['fenix']}]]);
 const channels=new Map([
  ['fenix',{verify:async token => token==='fenix-key'?{subject:'uid-fenix',sessionId:'fenix-sess',authorizedCompanies:['fenix']}:null}],
  ['mobile',{verify:async token => token==='mobile-key'?{subject:'uid-mobile',sessionId:'mobile-sess',authorizedCompanies:['fenix','aion']}:token==='revoked-key'?{subject:'revoked',sessionId:'revoked-sess',authorizedCompanies:['fenix']}:null}],
 ]);
 const identity=new ZeusGlobalIdentityProvider({channels,registry:{resolve:async({channel,subject})=>bindings.get(`${channel}:${subject}`)}});
 return {identity,bindings};
}
test('different verified channels resolve exactly the same stable ZEUS owner',async()=>{
 const {identity}=make();const first=await identity.verify({channel:'fenix',accessToken:'fenix-key'}),second=await identity.verify({channel:'mobile',accessToken:'mobile-key'});
 assert.equal(first.ownerId,second.ownerId);assert.notEqual(first.sessionId,second.sessionId);
 assert.deepEqual(first.authorizedCompanies,['fenix']);assert.deepEqual(second.authorizedCompanies,['fenix','aion']);
});
test('global ZEUS binding never extends channel company scope',async()=>{
 const {identity}=make();const core=new JarvisUniversalCore({identityProvider:identity,store:new MemoryEventStore()});
 await assert.rejects(core.submit({token:{channel:'fenix',accessToken:'fenix-key'},companyId:'aion',projectId:'p',intent:'STATUS',idempotencyKey:'k'}),/COMPANY_SCOPE_DENIED/);
});
test('mission written via Fenix is readable from mobile on separate session',async()=>{
 const {identity}=make();const core=new JarvisUniversalCore({identityProvider:identity,store:new MemoryEventStore(),ids:()=> 'universal-001'});
 const a=await core.submit({token:{channel:'fenix',accessToken:'fenix-key'},companyId:'fenix',projectId:'p',intent:'STATUS',idempotencyKey:'same'});
 const b=await core.inspect({token:{channel:'mobile',accessToken:'mobile-key'},missionId:a.mission.id});
 assert.equal(b.id,'universal-001');assert.equal(a.mission.ownerId,b.ownerId);
});
test('unknown channel and revoked owner bindings fail closed',async()=>{
 const {identity}=make();await assert.rejects(identity.verify({channel:'hacker',accessToken:'x'}),/AUTH_DENIED/);
 await assert.rejects(identity.verify({channel:'mobile',accessToken:'revoked-key'}),/OWNER_ROOT_REQUIRED/);
});
test('malformed trusted channel scopes are denied even if ZEUS binding is valid',async()=>{
 const registry={resolve:async()=>({ownerId:'zeus-root-001',role:'OWNER_ROOT',active:true,authorizedCompanies:['fenix']})};
 for (const companies of [['fenix','*'],['fenix',null],['fenix','bad\ntenant'],[]]) {
  const identity=new ZeusGlobalIdentityProvider({channels:new Map([['fenix',{verify:async()=>({subject:'uid',sessionId:'session',authorizedCompanies:companies})}]]),registry});
  await assert.rejects(identity.verify({channel:'fenix',accessToken:'token'}),/AUTH_DENIED/);
 }
});
test('malformed ZEUS registry scopes fail closed before tenant intersection',async()=>{
 for (const companies of [['fenix','*'],['fenix',null],['fenix','bad\ntenant'],[]]) {
  const identity=new ZeusGlobalIdentityProvider({channels:new Map([['fenix',{verify:async()=>({subject:'uid',sessionId:'session',authorizedCompanies:['fenix']})}]]),registry:{resolve:async()=>({ownerId:'zeus-root-001',role:'OWNER_ROOT',active:true,authorizedCompanies:companies})}});
  await assert.rejects(identity.verify({channel:'fenix',accessToken:'token'}),/OWNER_ROOT_REQUIRED/);
 }
});
