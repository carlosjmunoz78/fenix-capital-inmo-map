import test from 'node:test';
import assert from 'node:assert/strict';
import {createJarvisB2DeviceSetup} from './jarvis-b2-device-setup.mjs';
import worker from '../cloudflare-lab/worker-b2-device-probe.mjs';
const origin='https://cerebro-jarvis-lab-eu.carlosj-munozcabeza.workers.dev';
const aud='abcdef0123456789abcdef0123456789';
const email='synthetic-owner@example.invalid';
const now=Date.parse('2026-11-06T12:00:00Z');
const ctx=(address=email,app=aud)=>({
 access:{aud:app,getIdentity:async()=>({email:address})}
});
const env=(change={})=>({
 JARVIS_ENVIRONMENT:'LAB',
 JARVIS_B2_ENROLLMENT_ENABLED:'true',
 JARVIS_B2_ENROLLMENT_UNTIL_MS:String(now+300000),
 JARVIS_GATEWAY_ENABLED:'false',
 JARVIS_B2_B3_LIVE_ENABLED:'false',
 JARVIS_OWNER_EMAIL:email,
 JARVIS_ACCESS_AUD:aud,
 ...change
});
const req=(path='/__jarvis/b2-device-setup',method='GET')=>
 new Request(origin+path,{method,headers:{
  authorization:'Bearer synthetic-and-private',cookie:'secret=private-value'
 }});
const live=createJarvisB2DeviceSetup({enabled:true,clock:()=>now});
test('CUT32.1 is disabled by default, has no public route without explicit flag',async()=>{
 const off=createJarvisB2DeviceSetup();
 assert.equal((await off.fetch(req(),env(),ctx())).status,503);
 assert.equal((await live.fetch(req(),env({JARVIS_B2_ENROLLMENT_ENABLED:'false'}),ctx())).status,503);
 assert.throws(()=>createJarvisB2DeviceSetup({enabled:true,environment:'PROD'}),/LAB_ONLY/);
});
test('CUT32.1 denies unverified Access, different audience and non-owner identity',async()=>{
 for(const principal of [{},ctx(email,'other-cloudflare-access-app'),
  ctx('stranger@example.invalid'),
  {access:{aud,getIdentity:async()=>{throw Error('confidential JWT')}}}]){
  const res=await live.fetch(req(),env(),principal);
  assert.equal(res.status,403);
  assert.equal((await res.text()).includes('confidential JWT'),false);
 }
});
test('CUT32.1 limits setup HTML/JS to trusted ten-minute window',async()=>{
 for(const change of [
  {JARVIS_B2_ENROLLMENT_UNTIL_MS:String(now-1)},
  {JARVIS_B2_ENROLLMENT_UNTIL_MS:String(now+600001)},
  {JARVIS_B2_ENROLLMENT_UNTIL_MS:''}
 ]){
  assert.equal((await live.fetch(req(),env(change),ctx())).status,403);
 }
 for(const change of [
  {JARVIS_B2_B3_LIVE_ENABLED:'true'},
  {JARVIS_GATEWAY_ENABLED:'true'},
  {JARVIS_ENVIRONMENT:'PROD'}
 ]){
  assert.equal((await live.fetch(req(),env(change),ctx())).status,503);
 }
});
test('CUT32.1 authorized GET renders mobile tap button with external same-origin JS',async()=>{
 const response=await live.fetch(req(),env(),ctx());
 assert.equal(response.status,200);
 assert.equal(response.headers.get('content-type'),'text/html; charset=utf-8');
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);
 const html=await response.text();
 assert.match(html,/name="viewport"/);
 assert.match(html,/Autorizar este dispositivo/);
 assert.match(html,/src="\/__jarvis\/b2-device-setup.js"/);
 assert.doesNotMatch(html,/<script[^>]*>[^<]+<\/script>/);
 for(const privateValue of [email,aud,'private-value','synthetic-and-private']){
  assert.equal(html.includes(privateValue),false);
 }
});
test('CUT32.1 served JS requires user click and sends same-origin POST with no secrets',async()=>{
 const r=await live.fetch(req('/__jarvis/b2-device-setup.js'),env(),ctx());
 assert.equal(r.status,200);
 assert.match(r.headers.get('content-type'),/text\/javascript/);
 const js=await r.text();
 assert.match(js,/addEventListener\('click'/);
 assert.match(js,/method:'POST'/);
 assert.match(js,/credentials:'same-origin'/);
 assert.match(js,/x-jarvis-enrollment/);
 assert.match(js,/\/__jarvis\/b2-device-status/);
 assert.doesNotMatch(js,/document\.cookie|localStorage|Authorization/);
 for(const privateValue of [email,aud,'private-value','synthetic-and-private']){
  assert.equal(js.includes(privateValue),false);
 }
});
test('CUT32.1 refuses POST to setup page, querystring and unauthorized route',async()=>{
 assert.equal((await live.fetch(req('/__jarvis/b2-device-setup','POST'),env(),ctx())).status,405);
 assert.equal((await live.fetch(req('/__jarvis/b2-device-setup?token=bad'),env(),ctx())).status,404);
 assert.equal((await live.fetch(req('/v1/missions/private'),env(),ctx())).status,404);
});
test('CUT32.1 integration is available only in candidate Worker, no D1 operations for GET page',async()=>{
 const settings=env({JARVIS_B2_DEVICE_ENABLED:'false'});
 const page=await worker.fetch(req(),settings,ctx());
 assert.equal(page.status,200);
 assert.equal((await page.text()).includes('Autorizar este dispositivo'),true);
 const noSession=await worker.fetch(req('/__jarvis/b2-device-status'),settings,ctx());
 assert.equal(noSession.status,503);
 const noRoute=await worker.fetch(req('/v1/missions/private'),settings,ctx());
 assert.notEqual(noRoute.status,200);
});
