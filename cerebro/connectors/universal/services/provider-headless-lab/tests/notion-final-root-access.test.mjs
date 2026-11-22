import test from 'node:test';
import assert from 'node:assert/strict';
import {probeFinalNotionRoot,FINAL_NOTION_ROOT_ID} from '../notion-final-root-access.mjs';
const token='CEREBRO_TEST_NOTION_VAULT_SCOPED_20261110_TOKEN';
test('only one fixed page can be checked by GET with independent token, without returning content',async()=>{
 let count=0;
 const v=await probeFinalNotionRoot({token,http:async(url,opts)=>{
  count++;assert.equal(url,'https://api.notion.com/v1/pages/'+FINAL_NOTION_ROOT_ID);
  assert.equal(opts.method,'GET');assert.equal(opts.headers.Authorization,'Bearer '+token);
  return {status:200,text:async()=>{throw Error('must not retrieve page content');}};
 }});
 assert.equal(count,1);assert.equal(v.accessible,1);assert.equal(v.checked,1);
 assert.equal(v.write_operations,0);assert.equal(v.content_returned,false);
 assert.ok(!JSON.stringify(v).includes(token));
});
test('404 is denied, non-404 errors remain inconclusive',async()=>{
 for(const [status,denied,inconclusive] of [[404,1,0],[429,0,1],[503,0,1]]){
 const v=await probeFinalNotionRoot({token,http:async()=>({status})});
 assert.equal(v.accessible,0);assert.equal(v.denied,denied);assert.equal(v.inconclusive,inconclusive);
 }
});
test('401 and 403 globally fail closed',async()=>{
 for(const status of [401,403])
 await assert.rejects(()=>probeFinalNotionRoot({token,http:async()=>({status})}),/NOTION_GLOBAL_AUTH_DENIED/);
});
test('invalid token rejected before request',async()=>{
 let count=0;
 await assert.rejects(()=>probeFinalNotionRoot({token:'x',http:async()=>{count++;return{status:200};}}),/NOTION_SERVICE_TOKEN_DENIED/);
 assert.equal(count,0);
});
test('network error is not treated as successful access',async()=>{
 const v=await probeFinalNotionRoot({token,http:async()=>{throw Error('secret');}});
 assert.equal(v.accessible,0);assert.equal(v.inconclusive,1);
 assert.ok(!JSON.stringify(v).includes('secret'));
});
