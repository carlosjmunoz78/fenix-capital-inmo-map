import test from 'node:test';
import assert from 'node:assert/strict';
import {NOTION_API,NOTION_SECRET,probeNotionWorkspace} from '../notion-access.mjs';
const fake='TEST_ONLY_FAKE_NOTION_INTEGRATION_CREDENTIAL_123456';
const stub=(status,body)=>{const calls=[];return {calls,http:async(url,opts)=>{calls.push({url,opts});return {status,json:async()=>body}}}};
test('search only lists accessible titles internally and returns aggregate, not page content',async()=>{
 const f=stub(200,{object:'list',results:[{object:'page',id:'p1',properties:{title:'PRIVATE'}},{object:'database',id:'d1',name:'PRIVATE'}],has_more:false,next_cursor:null});
 const out=await probeNotionWorkspace({token:fake,http:f.http});
 assert.equal(NOTION_SECRET,'cerebro_notion_service_token_v1');
 assert.equal(out.status,'NOTION_INDEPENDENT_WORKSPACE_READ');
 assert.equal(out.accessible_pages_returned,1);assert.equal(out.accessible_databases_returned,1);
 assert.equal(out.write_operations,0);assert.equal(out.content_returned,false);
 assert.ok(!JSON.stringify(out).includes('PRIVATE'));assert.ok(!JSON.stringify(out).includes(fake));
 assert.equal(f.calls[0].url,NOTION_API);assert.equal(f.calls[0].opts.method,'POST');
 assert.equal(JSON.parse(f.calls[0].opts.body).page_size,50);
 assert.equal(f.calls[0].opts.headers.Authorization,'Bearer '+fake);
});
test('no accessible pages is not considered authorization to write',async()=>{
 const f=stub(200,{object:'list',results:[],has_more:false,next_cursor:null});
 const x=await probeNotionWorkspace({token:fake,http:f.http});assert.equal(x.has_accessible_objects,false);
 assert.equal(x.write_operations,0);
});
test('Notion 403 or malformed JSON is fail closed',async()=>{
 for(const status of [401,403,500]){
  const f=stub(status,{});
  await assert.rejects(()=>probeNotionWorkspace({token:fake,http:f.http}),new RegExp(status===500?'NOTION_SEARCH_HTTP_500':'NOTION_SEARCH_PERMISSION_'+status));
 }
 const f=stub(200,{success:true});
 await assert.rejects(()=>probeNotionWorkspace({token:fake,http:f.http}),/NOTION_SEARCH_RESPONSE_INVALID/);
});
test('no token yields no network call',async()=>{
 let calls=0;
 await assert.rejects(()=>probeNotionWorkspace({token:'',http:async()=>{calls++}}),/NOTION_SERVICE_CREDENTIAL_INVALID/);
 assert.equal(calls,0);
});
