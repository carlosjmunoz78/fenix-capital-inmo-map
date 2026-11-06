import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {isApprovedJarvisB2LabOrigin} from './jarvis-b2-approved-lab-origins.mjs';
import {createJarvisB2DeviceSetup} from './jarvis-b2-device-setup.mjs';
import {createJarvisB2DeviceEnrollment} from './jarvis-b2-device-enrollment.mjs';

const old='https://cerebro-jarvis-lab-eu.carlosj-munozcabeza.workers.dev';
const stage='https://cerebro-jarvis-cut32-lab-eu.carlosj-munozcabeza.workers.dev';
const malicious='https://cerebro-jarvis-cut32-lab-eu.evil.workers.dev';
const email='synthetic.owner@example.invalid';
const aud='abcdef0123456789abcdef0123456789';
const id='11111111-2222-4333-8444-555555555555';
const now=Date.parse('2026-11-06T14:00:00Z');
const env=()=>({
 JARVIS_ENVIRONMENT:'LAB',
 JARVIS_B2_ENROLLMENT_ENABLED:'true',
 JARVIS_B2_ENROLLMENT_UNTIL_MS:String(now+100000),
 JARVIS_B2_B3_LIVE_ENABLED:'false',
 JARVIS_GATEWAY_ENABLED:'false',
 JARVIS_OWNER_EMAIL:email,
 JARVIS_ACCESS_AUD:aud,
 JARVIS_OWNER_ID:'zeus-owner:lab',
 JARVIS_B2_HMAC_KEY_HEX:'a1'.repeat(32)
});
const ctx={
 access:{aud,getIdentity:async()=>({email,user_uuid:id})}
};
const pageOrigin=o=>new Request(o+'/__jarvis/b2-device-setup');
const postOrigin=(o,headerOrigin=o)=>new Request(o+'/__jarvis/b2-device-enroll',{
 method:'POST',headers:{origin:headerOrigin,'sec-fetch-site':'same-origin','x-jarvis-enrollment':'1'}
});
const store=()=>({
 prepare:()=>({bind:()=>({})}),
 batch:async()=>[{success:true,meta:{changes:1}},{success:true,meta:{changes:1}}]
});
test('CUT33 exact two allowed LAB origins, never arbitrary or subdomain-like',()=>{
 for(const o of [old,stage])assert.equal(isApprovedJarvisB2LabOrigin(o),true);
 for(const o of [malicious,'https://app.fenixcapital.es',
   'http://'+new URL(stage).host,stage+'/other',stage+'.attacker.tld',
   '',null,undefined])assert.equal(isApprovedJarvisB2LabOrigin(o),false);
});
test('CUT33 parallel staging page renders only during authorized Access window',async()=>{
 const setup=createJarvisB2DeviceSetup({enabled:true,clock:()=>now});
 assert.equal((await setup.fetch(pageOrigin(stage),env(),ctx)).status,200);
 assert.equal((await setup.fetch(pageOrigin(old),env(),ctx)).status,200);
 assert.equal((await setup.fetch(pageOrigin(malicious),env(),ctx)).status,404);
 assert.equal((await setup.fetch(pageOrigin(stage),{
  ...env(),JARVIS_B2_ENROLLMENT_ENABLED:'false'
 },ctx)).status,503);
 assert.equal((await setup.fetch(pageOrigin(stage),env(),{})).status,403);
});
test('CUT33 staging host enroll requires matching real Origin, Access and window',async()=>{
 const enrollment=createJarvisB2DeviceEnrollment({
  db:store(),environment:'LAB',enabled:true,clock:()=>now,cryptoImpl:webcrypto
 });
 const success=await enrollment.enroll({request:postOrigin(stage),env:env(),ctx});
 assert.equal(success.status,201);
 const cookie=success.headers.get('set-cookie');
 assert.match(cookie,/^__Host-jarvis_b2=[A-Za-z0-9_-]{43}; Path=\/; Secure; HttpOnly; SameSite=Strict;/);
 const rejected=await enrollment.enroll({request:postOrigin(stage,old),env:env(),ctx});
 assert.equal(rejected.status,403);
 assert.equal(rejected.headers.get('set-cookie'),null);
 const hostile=await enrollment.enroll({request:postOrigin(malicious),env:env(),ctx});
 assert.equal(hostile.status,403);
});
test('CUT33 explicit OFF stage Wrangler config never rewires the existing CUT30 Worker',async()=>{
 const {readFileSync}=await import('node:fs');
 const {fileURLToPath}=await import('node:url');
 const cfg=JSON.parse(readFileSync(fileURLToPath(new URL('../cloudflare-lab/wrangler-b2-parallel.staging.lab.jsonc',import.meta.url)),'utf8'));
 assert.equal(cfg.name,'cerebro-jarvis-cut32-lab-eu');
 assert.notEqual(cfg.name,'cerebro-jarvis-lab-eu');
 assert.equal(cfg.workers_dev,false);
 assert.deepEqual(cfg.routes,[]);
 assert.equal(cfg.main,'./worker-b2-device-probe.mjs');
 assert.equal(cfg.vars.JARVIS_ACCESS_PROBE_ENABLED,'false');
 assert.equal(cfg.vars.JARVIS_B2_DEVICE_ENABLED,'false');
 assert.equal(cfg.vars.JARVIS_B2_ENROLLMENT_ENABLED,'false');
 assert.equal(cfg.vars.JARVIS_GATEWAY_ENABLED,'false');
 assert.equal(cfg.vars.JARVIS_B2_B3_LIVE_ENABLED,'false');
 assert.equal(cfg.d1_databases[0].database_id,'988b11e1-21aa-4cf9-8b9d-110319df7ccc');
 assert.ok(!JSON.stringify(cfg).includes('JARVIS_OWNER_EMAIL'));
 assert.ok(!JSON.stringify(cfg).includes('JARVIS_B2_HMAC_KEY_HEX'));
});
