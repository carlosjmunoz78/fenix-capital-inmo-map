import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyNotionLifeCycle,WIKI_PAGE_ID,WIKI_TITLE,TEST_TITLE,UPDATED_TITLE} from '../notion-lifecycle.mjs';
const childId='dba5321b-dbea-4825-97bc-b6b5f44bb051';
const token='FAKE_PRIVATE_NOTION_SERVICE_TOKEN_FOR_TEST_0123456789';
const title=t=>({title:{type:'title',title:[{plain_text:t}]}});
function fixture({noParent=false,noInsert=false,foreign=false,canUpdate=true,canTrash=true}={}){
 let exists=false,archived=false,current=TEST_TITLE;const calls=[];
 const pg=(id,t,root=false)=>({object:'page',id,archived:root?false:archived,in_trash:root?false:archived,
  parent:root?{type:'workspace',workspace:true}:{type:'page_id',page_id:foreign?'11111111-1111-4111-8111-111111111111':WIKI_PAGE_ID},properties:title(t)});
 const http=async(url,options)=>{
  const method=options.method;calls.push({method,url,body:options.body});
  assert.ok(url.startsWith('https://api.notion.com/v1/pages'));
  assert.equal(options.headers.Authorization,'Bearer '+token);
  if(method==='GET'&&url.endsWith('/'+WIKI_PAGE_ID))
   return {status:noParent?404:200,json:async()=>pg(WIKI_PAGE_ID,WIKI_TITLE,true)};
  if(method==='POST'){
   if(noInsert)return {status:403,json:async()=>({})};
   const body=JSON.parse(options.body);
   assert.equal(body.parent.page_id,WIKI_PAGE_ID);
   assert.equal(body.properties.title.title[0].text.content,TEST_TITLE);
   exists=true;
   return {status:200,json:async()=>pg(childId,current)};
  }
  if(method==='GET'&&url.endsWith('/'+childId))
   return {status:exists?200:404,json:async()=>pg(childId,current)};
  if(method==='PATCH'&&url.endsWith('/'+childId)){
   const body=JSON.parse(options.body);
   if(body.properties){
    if(!canUpdate)return {status:403,json:async()=>({})};
    current=body.properties.title.title[0].text.content;
   }
   if(body.in_trash===true){
    if(!canTrash)return {status:403,json:async()=>({})};
    archived=true;
   }
   return {status:200,json:async()=>pg(childId,current)};
  }
  throw Error('NON_ALLOWLISTED_HTTP_REQUEST');
 };
 return {http,calls,state:()=>({exists,archived,current})};
}
test('independent CEREBRO Notion CRUD creates and edits only its own child, then verifies Trash',async()=>{
 const f=fixture();const o=await verifyNotionLifeCycle({token,http:f.http});
 assert.equal(o.status,'NOTION_LAB_CREATE_READ_UPDATE_TRASH_VERIFIED');
 assert.equal(o.parent_verified,true);assert.equal(o.other_pages_modified,0);
 assert.equal(o.temporary_page_in_trash,true);assert.equal(o.credentials_exposed,false);
 assert.equal(f.state().archived,true);assert.equal(f.state().current,UPDATED_TITLE);
 assert.deepEqual(f.calls.map(v=>v.method),['GET','POST','GET','PATCH','GET','PATCH','GET']);
 assert.equal(f.calls.filter(v=>v.method==='POST').length,1);
 assert.equal(f.calls.filter(v=>v.method==='PATCH').length,2);
 assert.ok(!JSON.stringify(o).includes(token));
});
test('does not create if wiki is not independently accessible',async()=>{
 const f=fixture({noParent:true});
 await assert.rejects(()=>verifyNotionLifeCycle({token,http:f.http}),/NOTION_LAB_WIKI_UNVERIFIED/);
 assert.equal(f.calls.length,1);
});
test('no unwanted change if insert privilege denied',async()=>{
 const f=fixture({noInsert:true});
 await assert.rejects(()=>verifyNotionLifeCycle({token,http:f.http}),/NOTION_LAB_AUTH_403/);
 assert.equal(f.calls.filter(v=>v.method==='PATCH').length,0);
});
test('does not mutate a page with a foreign parent',async()=>{
 const f=fixture({foreign:true});
 await assert.rejects(()=>verifyNotionLifeCycle({token,http:f.http}),/NOTION_LAB_FOREIGN_PAGE/);
 assert.equal(f.calls.filter(v=>v.method==='PATCH').length,0);
});
test('if title change fails, finally still archives its own created child',async()=>{
 const f=fixture({canUpdate:false});
 await assert.rejects(()=>verifyNotionLifeCycle({token,http:f.http}),/NOTION_LAB_AUTH_403/);
 assert.equal(f.state().archived,true);
});
test('cannot falsely claim cleanup success when archive permission missing',async()=>{
 const f=fixture({canTrash:false});
 await assert.rejects(()=>verifyNotionLifeCycle({token,http:f.http}),/NOTION_LAB_AUTH_403/);
 assert.equal(f.state().archived,false);
});
test('credential unavailable fails before network',async()=>{
 let calls=0;await assert.rejects(()=>verifyNotionLifeCycle({token:'',http:async()=>{calls++}}),/NOTION_LAB_TOKEN_MISSING/);assert.equal(calls,0);
});
