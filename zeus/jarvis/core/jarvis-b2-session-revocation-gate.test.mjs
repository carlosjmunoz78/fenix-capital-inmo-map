import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB2SessionRevocationGate} from './jarvis-b2-session-revocation-gate.mjs';
const secret=Buffer.alloc(32,42);
const principal=Object.freeze({ownerId:'zeus-owner:alice',sessionId:'auth-session-123',
 roles:['OWNER_ROOT'],authorizedCompanies:['fenix','aion']});
const now=Date.parse('2026-11-05T22:00:00Z');
function rig({owner=principal,rowOverride={},failDb=false,failAuth=false}={}){
 const calls=[];
 const identityProvider={verify:async()=>{if(failAuth)throw Error('raw JWT invalid secret');return owner;}};
 const sessionStore={get:async args=>{
  calls.push(args);
  if(failDb)throw Error('database password secret');
  return {ownerId:args.ownerId,sessionHmac:args.sessionHmac,environment:'LAB',
   active:true,revoked:false,role:'OWNER_ROOT',expiresAt:now+60_000,
   authorizedCompanies:['fenix'],...rowOverride};
 }};
 const gate=createJarvisB2SessionRevocationGate({identityProvider,sessionStore,
  secret,clock:()=>now,enabled:true});
 return{gate,calls};
}
test('disabled by default: never calls original identity adapter',async()=>{
 let invoked=0;
 const gate=createJarvisB2SessionRevocationGate({identityProvider:{verify:async()=>{invoked++;return principal;}}});
 await assert.rejects(gate.verify('token'),/B2_SESSION_NOT_VERIFIED/);
 assert.equal(invoked,0);
});
test('cannot enable outside isolated LAB or without server-only key and stores',()=>{
 assert.throws(()=>createJarvisB2SessionRevocationGate({enabled:true,environment:'PROD'}),/LAB_ONLY/);
 assert.throws(()=>createJarvisB2SessionRevocationGate({enabled:true}),/B2_SERVER_SESSION_ADAPTERS_REQUIRED/);
});
test('valid owner session is narrowed to store-authorized company, never elevated',async()=>{
 const {gate}=rig();const p=await gate.verify({channel:'fenix-app',accessToken:'synthetic-bearer'});
 assert.equal(p.ownerId,principal.ownerId);assert.equal(p.sessionId,principal.sessionId);
 assert.deepEqual(p.authorizedCompanies,['fenix']);
 assert.ok(Object.isFrozen(p));
});
test('store sees only scoped HMAC, never bearer or raw session ID',async()=>{
 const {gate,calls}=rig();await gate.verify({accessToken:'synthetic-bearer'});
 assert.deepEqual(Object.keys(calls[0]).sort(),['environment','ownerId','sessionHmac']);
 assert.match(calls[0].sessionHmac,/^[a-f0-9]{64}$/);
 assert.equal(JSON.stringify(calls).includes('auth-session-123'),false);
 assert.equal(JSON.stringify(calls).includes('synthetic-bearer'),false);
});
for(const [label,opts] of [
 ['revoked',{rowOverride:{revoked:true}}],
 ['inactive',{rowOverride:{active:false}}],
 ['expired',{rowOverride:{expiresAt:now}}],
 ['owner mismatch',{rowOverride:{ownerId:'other-owner'}}],
 ['company mismatch',{rowOverride:{authorizedCompanies:['third-company']}}],
 ['environment mismatch',{rowOverride:{environment:'PROD'}}],
 ['session digest mismatch',{rowOverride:{sessionHmac:'a'.repeat(64)}}],
 ['role mismatch',{rowOverride:{role:'USER'}}],
 ['database unavailable',{failDb:true}],
 ['authentication denied',{failAuth:true}],
 ['missing owner identity',{owner:{...principal,ownerId:''}}]
])test('revocation gate fails closed on '+label,async()=>{
 const {gate}=rig(opts);await assert.rejects(gate.verify('opaque-token'),e=>e.message==='B2_SESSION_NOT_VERIFIED');
});
test('same owner session cannot be replayed across another company',async()=>{
 const {gate}=rig({owner:{...principal,authorizedCompanies:['aion']}});
 await assert.rejects(gate.verify('token'),/B2_SESSION_NOT_VERIFIED/);
});
test('session HMAC binds owner ID and session ID',async()=>{
 const a=rig();await a.gate.verify('a');
 const b=rig({owner:{...principal,sessionId:'other-session'}});await b.gate.verify('b');
 const c=rig({owner:{...principal,ownerId:'other-owner'}});await c.gate.verify('c');
 assert.notEqual(a.calls[0].sessionHmac,b.calls[0].sessionHmac);
 assert.notEqual(a.calls[0].sessionHmac,c.calls[0].sessionHmac);
});
