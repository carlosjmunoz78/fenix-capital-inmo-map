import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedPaths,checkPublicNavigation} from '../runtime/seo-public-navigation-health-v1.mjs';
test('exactly 26 public homepage destinations are unique and allowlisted',()=>{
 assert.equal(approvedPaths.length,26);assert.equal(new Set(approvedPaths).size,26);
 assert.ok(approvedPaths.every(x=>x.startsWith('/')&&!x.includes('staging')));
});
test('read-only HEAD 200 can be proven without posting, cookies or credentials',async()=>{
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});return {status:200}
 };
 const report=await checkPublicNavigation({paths:['/','/contacto/'],fetchImpl});
 assert.equal(report.status,'PASS');assert.equal(report.healthy,2);
 assert.equal(report.production_writes,0);assert.equal(report.customer_contacts,0);
 for(const c of calls){
  assert.equal(new URL(c.url).hostname,'fenixcapital.es');
  assert.equal(c.options.method,'HEAD');assert.equal(c.options.redirect,'manual');
  assert.equal(c.options.headers.cookie,undefined);
  assert.equal(c.options.headers.authorization,undefined);
 }
});
test('HTTP 404 is HOLD and never silently redirected to home',async()=>{
 const report=await checkPublicNavigation({paths:['/','/contacto/'],fetchImpl:async(url)=>({status:url.endsWith('/contacto/')?404:200})});
 assert.equal(report.status,'HOLD');assert.equal(report.http_errors,1);
 assert.deepEqual(report.audited_urls.map(x=>x.http),[200,404]);
});
test('3XX and network failures are unapproved and not called 404',async()=>{
 const urls=['/blog/','/hipotecas/'];
 const out=await checkPublicNavigation({paths:urls,fetchImpl:async(url)=>url.endsWith('/blog/')?{status:301}:Promise.reject(new Error('offline'))});
 assert.equal(out.status,'HOLD');assert.equal(out.redirects_to_review,1);
 assert.equal(out.unverified,1);assert.equal(out.http_errors,0);
});
test('reject unsafe target, duplicates and excessive concurrency',async()=>{
 await assert.rejects(()=>checkPublicNavigation({paths:['https://staging.fenixcapital.es/']}),/SCOPE/);
 await assert.rejects(()=>checkPublicNavigation({paths:['/','/']}),/SCOPE/);
 await assert.rejects(()=>checkPublicNavigation({paths:['/'],concurrency:20}),/BOUNDS/);
});

test('isolated network timeout retries once, remains degraded and never claims website fully checked',async()=>{
 let calls=0;
 const report=await checkPublicNavigation({paths:['/calculadora-hipotecaria/'],fetchImpl:async()=>{calls++;throw new Error('timeout')}});
 assert.equal(calls,2);
 assert.equal(report.status,'DEGRADED');
 assert.equal(report.healthy,0);
 assert.equal(report.unverified,1);
 assert.equal(report.audited_urls[0].attempts,2);
 assert.equal(report.audited_urls[0].issue,'NETWORK_UNVERIFIED');
});
