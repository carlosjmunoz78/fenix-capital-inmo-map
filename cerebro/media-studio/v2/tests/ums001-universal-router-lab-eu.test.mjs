import test from 'node:test';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {validate,canonical,hash,fingerprint,jobKey,hmac,verifyHmac,secretBinding,consumerAllowed,makeCanary,REQUEST_FIELDS} from '../cloudflare/ums001-universal-router-lab-eu/core.mjs';
test('SOC and SEO canaries use same universal schema',()=>{
 for(const id of ['SOC-001','SEO-001']){const r=makeCanary(id,'2026-11-12T13:00:00Z');assert.deepEqual(Object.keys(r).sort(),[...REQUEST_FIELDS].sort());assert.equal(validate(r),r);assert.equal(consumerAllowed(r),true);}
});
test('future platform needs no new worker but sender scope is controlled',()=>{
 let r=makeCanary('SOC-001','2026-11-12T13:00:00Z');
 for(const channel of ['FACEBOOK','INSTAGRAM','LINKEDIN','YOUTUBE','TIKTOK'])assert.equal(consumerAllowed({...r,channel_id:channel}),true);
 assert.equal(consumerAllowed({...r,channel_id:'SEO'}),false);
});
test('HMAC genuine and tampered denied',async()=>{
 const r=makeCanary('SOC-001','2026-11-12T13:00:00Z');const secret='a'.repeat(64);
 const sig=await hmac(secret,canonical(r));assert.equal(sig.length,64);
 assert.equal(await verifyHmac(secret,canonical(r),sig),true);
 assert.equal(await verifyHmac(secret,canonical({...r,channel_id:'FACEBOOK'}),sig),false);
 assert.equal(await verifyHmac('b'.repeat(64),canonical(r),sig),false);
 assert.equal(await verifyHmac(secret,canonical(r),'abc'),false);
});
test('idempotent same item, different pieces separate',async()=>{
 const a=makeCanary('SOC-001','2026-11-12T13:00:00Z');const b={...a,item_id:'IG-FEED-02'};
 assert.equal(await jobKey(a),await jobKey({...a}));
 assert.notEqual(await jobKey(a),await jobKey(b));
 assert.equal(await fingerprint(a),await hash(canonical(a)));
});
test('additional request fields, payment, PROD, deadlines fail closed',()=>{
 const r=makeCanary('SEO-001','2026-11-12T13:00:00Z');
 for(const k of [{secret:'xx'},{environment:'PROD'},{trigger:'CONSOLE'},{engine_id:'BAD'}])
   assert.throws(()=>validate({...r,...k}),/UMS001_UNIVERSAL/);
 assert.throws(()=>validate({...r,budget:{...r.budget,paid_execution_enabled:true}}),/FINOPS/);
 assert.throws(()=>validate({...r,budget:{...r.budget,max_additional_cost_eur:0.01}}),/FINOPS/);
 assert.throws(()=>validate({...r,rights_profile:'AUTHORIZED_PERSON'}),/CONSENT/);
 assert.throws(()=>validate({...r,deadline_utc:'2026-11-12T12:00:00Z'}),/DEADLINE/);
});
test('each engine requires distinct scoped secret binding name',()=>{
 assert.equal(secretBinding('fenix','SOC-001'),'AUTH_FENIX_SOC_001');
 assert.equal(secretBinding('fenix','SEO-001'),'AUTH_FENIX_SEO_001');
});
