import test from 'node:test';
import assert from 'node:assert/strict';
import {NOTION_OPENED_ROOTS,probeNotionOpenedRoots} from '../notion-root-access.mjs';
const token='CEREBRO_TEST_NOTION_SERVICE_TOKEN_0123456789';
test('root allowlist unique and fixed; queries only GET for explicitly opened 27 roots',async()=>{
 const seen=[];
 const r=await probeNotionOpenedRoots({token,http:async(url,options)=>{
  seen.push(url);
  assert.equal(options.method,'GET');
  assert.equal(options.headers.Authorization,'Bearer '+token);
  assert.ok(NOTION_OPENED_ROOTS.some(x=>url.endsWith('/'+x.id)));
  return {status:200};
 }});
 assert.equal(seen.length,27);assert.equal(new Set(seen).size,27);
 assert.equal(r.accessible,27);assert.equal(r.checked,27);
 assert.equal(r.write_operations,0);assert.equal(r.content_returned,false);
 assert.ok(!JSON.stringify(r).includes(token));
});
test('does not treat 404 pages as accessible, and distinguishes rate limits',async()=>{
 let counter=0;
 const r=await probeNotionOpenedRoots({token,http:async()=>({status:(++counter===1)?404:(counter===2)?429:200})});
 assert.equal(r.accessible,25);assert.equal(r.denied,1);assert.equal(r.inconclusive,1);
 assert.equal(r.results[0].status,'NO_INDEPENDENT_ACCESS');
});
test('rejects any alternative target list or token before making network calls',async()=>{
 let count=0;const http=async()=>{count++;return {status:200};};
 await assert.rejects(()=>probeNotionOpenedRoots({token,http,roots:[NOTION_OPENED_ROOTS[0]]}),/USER_SELECTION_DENIED/);
 await assert.rejects(()=>probeNotionOpenedRoots({token:'x',http}),/CREDENTIAL_INVALID/);
 assert.equal(count,0);
});
test('401 and 403 globally halt safely without exposing provider error body',async()=>{
 for(const status of [401,403]){
  await assert.rejects(()=>probeNotionOpenedRoots({token,http:async()=>({status})}),/GLOBAL_AUTH_DENIED/);
 }
});
test('network errors and unknown responses are not counted as authorized',async()=>{
 let count=0;
 const r=await probeNotionOpenedRoots({token,http:async()=>{
  count++;if(count===1)throw Error('do not log customer');return {status:503};
 }});
 assert.equal(r.accessible,0);
 assert.equal(r.inconclusive,27);
 assert.ok(!JSON.stringify(r).includes('customer'));
});
