import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryNotionSearchIndex} from '../notion-search-index-inventory.mjs';
const token='CEREBRO_NOTION_TEST_SCOPED_TOKEN_0123456789';
const ROOT='1c481b1a-756d-8002-813d-f3efdd4ecd89';
const NEW='11111111-1111-4111-8111-111111111111';
const sample=(id,object='page',parent='workspace')=>({object,id,parent:{type:parent},title:[{text:{content:'DO_NOT_LOG_CONTENT'}}]});
function provider(pages){
 const calls=[];return {calls,http:async (url,opts)=>{
  assert.equal(url,'https://api.notion.com/v1/search');assert.equal(opts.method,'POST');
  assert.equal(opts.headers.Authorization,'Bearer '+token);
  const body=JSON.parse(opts.body);assert.equal(body.page_size,100);
  const i=calls.length;calls.push(body);
  return {status:200,json:async()=>pages[i]};
 }};
}
test('paginates all search results and returns ONLY hashed aggregate metadata',async()=>{
 const p=provider([
  {results:[sample(ROOT,'page'),sample(NEW,'data_source','database_id')],has_more:true,next_cursor:'after-A'},
  {results:[],has_more:false,next_cursor:null}
 ]);
 const res=await inventoryNotionSearchIndex({token,http:p.http,maxPages:3});
 assert.equal(res.status,'SEARCH_INDEX_INVENTORY_COMPLETE');
 assert.equal(res.inventory.searchable_total,2);
 assert.equal(res.inventory.known_roots_appearing_in_search,1);
 assert.equal(res.inventory.other_searchable_objects,1);
 assert.equal(res.inventory.api_requests,2);assert.equal(p.calls[1].start_cursor,'after-A');
 assert.equal(res.complete_workspace_backup,false);
 assert.equal(res.data_content_returned,false);assert.equal(res.external_writes,0);
 assert.ok(!JSON.stringify(res).includes(ROOT));
 assert.ok(!JSON.stringify(res).includes('DO_NOT_LOG_CONTENT'));
 assert.match(res.inventory.search_index_sha256,/^[a-f0-9]{64}$/);
});
test('bounded pagination is PARTIAL, never claims full backup',async()=>{
 const a=provider([{results:[sample(ROOT)],has_more:true,next_cursor:'next'}]);
 const r=await inventoryNotionSearchIndex({token,http:a.http,maxPages:1});
 assert.equal(r.status,'PARTIAL_SEARCH_INDEX_LIMIT_REACHED');
 assert.equal(r.inventory.has_more,true);assert.equal(r.eligible_for_prod_promotion,false);
});
test('detects pagination loops, duplicate objects and malformed API shape',async()=>{
 const many=[
  [{results:[sample(ROOT)],has_more:true,next_cursor:'repeat'},
   {results:[sample(NEW)],has_more:true,next_cursor:'repeat'}],
  [{results:[sample(ROOT),sample(ROOT)],has_more:false,next_cursor:null}],
  [{results:[{object:'alien',id:ROOT}],has_more:false,next_cursor:null}],
  [{results:[],has_more:true,next_cursor:null}]
 ];
 for(const pages of many){
  const mock=provider(pages);
  await assert.rejects(()=>inventoryNotionSearchIndex({token,http:mock.http,maxPages:3}));
 }
});
test('authentication and provider failure are always fail-closed',async()=>{
 for(const code of [401,403,429,500]){
  await assert.rejects(()=>inventoryNotionSearchIndex({token,http:async()=>({status:code})}));
 }
});
test('scope and invalid tokens or max-pages rejected without network',async()=>{
 let calls=0;
 for(const args of [{token:'bad'},{token,maxPages:0},{token,maxPages:16}]){
  await assert.rejects(()=>inventoryNotionSearchIndex({...args,http:async()=>{calls++;return{status:200};}}));
 }
 assert.equal(calls,0);
});
