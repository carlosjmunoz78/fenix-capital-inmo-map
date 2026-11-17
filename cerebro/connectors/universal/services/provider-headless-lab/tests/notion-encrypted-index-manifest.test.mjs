import test from 'node:test';
import assert from 'node:assert/strict';
import {sealNotionIndexManifest,verifyNotionIndexManifest} from '../notion-encrypted-index-manifest.mjs';
const key='58'.repeat(32),token='CEREBRO_LAB_TEST_NOTION_BEARER_1234567890';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const row=(id,object='page')=>({id,object,parent:{type:'page_id',page_id:'33333333-3333-4333-8333-333333333333'},last_edited_time:'2026-11-10T21:00:00Z',properties:{Secret:{value:'DO_NOT_LOG_PRIVATE_VALUES'}}});
function server(pages){
 let calls=0;
 return {call:async(url,req)=>{
  assert.equal(url,'https://api.notion.com/v1/search');assert.equal(req.method,'POST');
  assert.equal(req.headers.Authorization,'Bearer '+token);
  assert.equal(JSON.parse(req.body).page_size,100);
  return {status:200,json:async()=>pages[calls++]};
 },count:()=>calls};
}
test('seals complete cursor-paginated inventory, metadata only, authenticates and reconstructs',async()=>{
 const mock=server([
  {results:[row(b,'data_source')],has_more:true,next_cursor:'next'},
  {results:[row(a)],has_more:false,next_cursor:null}
 ]);
 const x=await sealNotionIndexManifest({notionToken:token,encryptionKey:key,http:mock.call,maxPages:4});
 assert.equal(x.search_index_complete,true);assert.equal(x.object_count,2);
 assert.equal(x.page_count,1);assert.equal(x.data_source_count,1);
 assert.equal(x.search_api_requests,2);assert.equal(mock.count(),2);
 assert.equal(x.write_operations,0);assert.equal(x.contains_all_notions_contents,false);
 assert.ok(!JSON.stringify(x).includes('DO_NOT_LOG_PRIVATE_VALUES'));
 assert.ok(!JSON.stringify(x).includes(token));assert.ok(!JSON.stringify(x).includes(key));
 const y=await verifyNotionIndexManifest({encryptionKey:key,artifact:x});
 assert.equal(y.status,'FACT001_NOTION_INDEX_MEMORY_REBUILD_VERIFIED');
 assert.equal(y.object_count,2);assert.equal(y.content_exposed,false);
});
test('cap reached preserves partial and never claims full export',async()=>{
 const mock=server([{results:[row(a)],has_more:true,next_cursor:'still-more'}]);
 const result=await sealNotionIndexManifest({notionToken:token,encryptionKey:key,http:mock.call,maxPages:1});
 assert.equal(result.search_index_complete,false);assert.equal(result.requires_next_scan,true);
 assert.equal((await verifyNotionIndexManifest({artifact:result,encryptionKey:key})).search_index_complete,false);
});
test('AES wrong-key and mutated integrity hash fail',async()=>{
 const mock=server([{results:[row(a)],has_more:false,next_cursor:null}]);
 const x=await sealNotionIndexManifest({notionToken:token,encryptionKey:key,http:mock.call});
 await assert.rejects(()=>verifyNotionIndexManifest({artifact:x,encryptionKey:'11'.repeat(32)}),/AUTHENTICITY_FAILED/);
 await assert.rejects(()=>verifyNotionIndexManifest({artifact:{...x,id_list_sha256:'0'.repeat(64)},encryptionKey:key}),/OBJECT_ID_INTEGRITY_DENIED/);
});
test('never claims green with duplicate IDs or cursor loops',async()=>{
 const s=server([{results:[row(a),row(a)],has_more:false,next_cursor:null}]);
 await assert.rejects(()=>sealNotionIndexManifest({notionToken:token,encryptionKey:key,http:s.call}),/DUPLICATE/);
 const s2=server([{results:[row(a)],has_more:true,next_cursor:'same'},
  {results:[row(b)],has_more:true,next_cursor:'same'}]);
 await assert.rejects(()=>sealNotionIndexManifest({notionToken:token,encryptionKey:key,http:s2.call}),/CURSOR_LOOP/);
});
test('invalid bearer/secret/cap and upstream failures blocked',async()=>{
 let calls=0;
 const http=async()=>{calls++;return {status:200,json:async()=>({results:[],has_more:false})}};
 for(const arg of [{notionToken:'bad',encryptionKey:key},{notionToken:token,encryptionKey:'bad'},
   {notionToken:token,encryptionKey:key,maxPages:86}]){
  await assert.rejects(()=>sealNotionIndexManifest({...arg,http}));
 }
 assert.equal(calls,0);
 for(const status of [401,403,429,500]){
  await assert.rejects(()=>sealNotionIndexManifest({notionToken:token,encryptionKey:key,http:async()=>({status})}));
 }
});
