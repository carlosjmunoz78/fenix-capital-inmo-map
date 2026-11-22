import test from 'node:test';
import assert from 'node:assert/strict';
import {NOTION_BATCH2_ROOTS,probeNotionSecondBatch} from '../notion-batch2-access.mjs';
const token='CEREBRO_TEST_SECURE_INDEPENDENT_TOKEN_0123456789';
test('all 12 fixed distinct roots only GET no page contents',async()=>{
 const seen=[];
 const res=await probeNotionSecondBatch({token,http:async(url,options)=>{
  assert.equal(options.method,'GET');
  assert.equal(options.headers.Authorization,'Bearer '+token);
  assert.ok(NOTION_BATCH2_ROOTS.some(x=>url.endsWith('/'+x.id)));
  seen.push(url);return {status:200};
 }});
 assert.equal(new Set(seen).size,12);assert.equal(res.accessible,12);
 assert.equal(res.write_operations,0);assert.equal(res.content_returned,false);
 assert.ok(!JSON.stringify(res).includes(token));
});
test('404 Notion inaccessible is counted distinctly from 400 resource type mismatch',async()=>{
 let n=0;
 const res=await probeNotionSecondBatch({token,http:async()=>({status:(++n===1)?404:(n===2)?400:200})});
 assert.equal(res.accessible,10);assert.equal(res.denied,1);assert.equal(res.inconclusive,1);
});
test('invalid Vault token refuses before network',async()=>{
 let n=0;await assert.rejects(()=>probeNotionSecondBatch({token:'bad',http:async()=>{n++;return {status:200};}}),/TOKEN_DENIED/);
 assert.equal(n,0);
});
test('global Notion 401/403 authentication failure halts verification',async()=>{
 for(const code of [401,403])await assert.rejects(()=>probeNotionSecondBatch({token,http:async()=>({status:code})}),/SERVICE_AUTH_DENIED/);
});
test('network failure is inconclusive not green; no raw errors returned',async()=>{
 const res=await probeNotionSecondBatch({token,http:async()=>{throw Error('sensitive provider body');}});
 assert.equal(res.inconclusive,12);assert.equal(res.accessible,0);
 assert.ok(!JSON.stringify(res).includes('sensitive'));
});
