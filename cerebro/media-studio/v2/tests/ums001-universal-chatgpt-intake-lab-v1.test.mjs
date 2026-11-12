import test from 'node:test';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {makeCanary,validate,consumerAllowed,jobKey} from '../cloudflare/ums001-universal-router-lab-eu/core.mjs';
function request(){const r=makeCanary('SOC-001','2026-11-12T13:00:00Z');
 return {...r,origin_engine_id:'CHATGPT-001',trigger:'CHATGPT'};}
test('Cloudflare account managed ChatGPT order can target Social and SEO but cannot authorize providers',()=>{
 const r=request();assert.equal(validate(r),r);assert.equal(consumerAllowed(r),true);
 assert.equal(r.budget.paid_execution_enabled,false);assert.equal(r.budget.publish_requested,false);
 const s=makeCanary('SEO-001','2026-11-12T13:00:00Z');
 const seo={...s,origin_engine_id:'CHATGPT-001',trigger:'CHATGPT'};
 assert.equal(validate(seo),seo);assert.equal(consumerAllowed(seo),true);
});
test('ChatGPT cannot claim trusted engine service identity or cross tenant',()=>{
 const r=request();assert.throws(()=>validate({...r,trigger:'ENGINE_EVENT'}),/TRIGGER/);
 assert.throws(()=>validate({...r,company_id:'other'}),/SCOPE/);
 assert.equal(consumerAllowed({...r,consumer_engine_id:'CRM-001'}),false);
 assert.equal(consumerAllowed({...r,channel_id:'SEO'}),false);
});
test('same ChatGPT item dedupes, cross origin cannot share identity',async()=>{
 const r=request();assert.equal(await jobKey(r),await jobKey(structuredClone(r)));
 assert.notEqual(await jobKey(r),await jobKey(makeCanary('SOC-001','2026-11-12T13:00:00Z')));
});
