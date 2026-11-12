import test from 'node:test';import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {generatePng,validateCanary} from '../cloudflare/ums001-private-image-canary-lab-eu/core.mjs';
const r={schema_version:1,company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
 request_id:'UMS001-LAB-CANARY-ORIGINAL-20261112-V1',item_id:'SEO-HERO-01',
 asset_kind:'IMAGE',mode:'DETERMINISTIC_TECHNICAL_CANARY_ONLY',width_px:512,height_px:512};
test('genuine 512 x 512 PNG bytes and original content have consistent hash',async()=>{
 const a=await generatePng(r);assert.equal(a.mime,'image/png');
 assert.deepEqual([...a.bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.deepEqual([...a.bytes.subarray(16,24)],[0,0,2,0,0,0,2,0]);
 assert.match(a.sha256,/^[a-f0-9]{64}$/);
 const b=await generatePng(r);assert.equal(a.sha256,b.sha256);
 assert.equal(a.additional_cost_eur,0);assert.equal(a.publish_authorized,false);
 assert.equal(a.visual_qa,'NOT_RUN');assert.equal(a.commercial_delivery_authorized,false);
});
test('no arbitrary sizes, paid modes, video or PROD',()=>{
 for(const change of [{environment:'PROD'},{asset_kind:'VIDEO'},{width_px:1080},
 {mode:'AUTO_PAID'},{provider:'evil'},{request_id:'nope'}])
 assert.throws(()=>validateCanary({...r,...change}),/UMS001_RENDER_/);
});
