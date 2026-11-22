import test from 'node:test';
import assert from 'node:assert/strict';
import {NOTION_BATCH3_ROOTS,probeNotionThirdBatch} from '../notion-batch3-access.mjs';
const token='CEREBRO_TEST_SECURE_INDEPENDENT_TOKEN_0123456789';
test('last 19 distinct fixed pages only GET, no content/secret/external writes',async()=>{
 const seen=[];
 const result=await probeNotionThirdBatch({token,http:async(url,options)=>{
  assert.equal(options.method,'GET');
  assert.equal(options.headers.Authorization,'Bearer '+token);
  assert.ok(NOTION_BATCH3_ROOTS.some(x=>url.endsWith('/'+x.id)));
  seen.push(url);return {status:200};
 }});
 assert.equal(new Set(seen).size,19);
 assert.equal(result.checked,19);assert.equal(result.accessible,19);assert.equal(result.denied,0);
 assert.equal(result.write_operations,0);assert.equal(result.content_returned,false);
 assert.ok(!JSON.stringify(result).includes(token));
});
test('404 inaccessible and 400 uncertain cannot count as connected',async()=>{
 let n=0;const r=await probeNotionThirdBatch({token,http:async()=>({status:(++n===1)?404:(n===2)?400:200})});
 assert.equal(r.accessible,17);assert.equal(r.denied,1);assert.equal(r.inconclusive,1);
});
test('weak Vault credential denied before provider call',async()=>{
 let calls=0;
 await assert.rejects(()=>probeNotionThirdBatch({token:'x',http:async()=>{calls++;return {status:200};}}),/TOKEN_DENIED/);
 assert.equal(calls,0);
});
test('global 401 or 403 stops without accepting remaining roots',async()=>{
 for(const status of [401,403])
  await assert.rejects(()=>probeNotionThirdBatch({token,http:async()=>({status})}),/AUTH_DENIED/);
});
test('network error remains inconclusive and does not log provider data',async()=>{
 const r=await probeNotionThirdBatch({token,http:async()=>{throw Error('sensitive data');}});
 assert.equal(r.accessible,0);assert.equal(r.inconclusive,19);assert.ok(!JSON.stringify(r).includes('sensitive'));
});
