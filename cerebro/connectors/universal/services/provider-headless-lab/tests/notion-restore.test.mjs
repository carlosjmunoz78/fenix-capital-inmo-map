import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyNotionTrashedChildRestore} from '../notion-restore-lab.mjs';
import {WIKI_PAGE_ID,WIKI_TITLE,UPDATED_TITLE} from '../notion-lifecycle.mjs';
const pageId='65a0cf34-24ec-4366-a699-55ab94d298d7';
const token='FAKE_NOTION_SERVICE_TOKEN_0123456789_0123456789';
const title=t=>({title:{type:'title',title:[{plain_text:t}]}});
function setup({wrongParent=false,alreadyLive=false,restoreThrowsAfterWrite=false,retrashDenied=false}={}){
 let inTrash=!alreadyLive,threw=false;const calls=[];
 const pg=(id)=>({object:'page',id,archived:id===pageId?inTrash:false,in_trash:id===pageId?inTrash:false,
  parent:id===pageId?{type:'page_id',page_id:wrongParent?'9a02ceba-9025-4414-b1aa-8fc43cf34123':WIKI_PAGE_ID}:{type:'workspace',workspace:true},
  properties:title(id===pageId?UPDATED_TITLE:WIKI_TITLE)});
 const http=async(url,opt)=>{
  assert.equal(opt.headers.Authorization,'Bearer '+token);
  assert.ok(url.startsWith('https://api.notion.com/v1/pages/'));
  const id=url.slice('https://api.notion.com/v1/pages/'.length);
  assert.ok([WIKI_PAGE_ID,pageId].includes(id));
  const body=opt.body?JSON.parse(opt.body):undefined;
  calls.push({method:opt.method,id,body});
  if(opt.method==='PATCH'){
   assert.equal(id,pageId);
   assert.deepEqual(Object.keys(body),['in_trash']);
   if(body.in_trash===true&&retrashDenied)return {status:403};
   inTrash=body.in_trash;
   if(body.in_trash===false&&restoreThrowsAfterWrite&&!threw){threw=true;throw Error('NETWORK_UNCERTAIN_AFTER_RESTORE');}
  }
  return {status:200,json:async()=>pg(id)};
 };
 return {http,calls,getState:()=>({inTrash})};
}
test('restores only its exact trashed child and re-trashes it after independent GET',async()=>{
 const f=setup();const out=await verifyNotionTrashedChildRestore({token,pageId,http:f.http});
 assert.equal(out.status,'NOTION_LAB_RESTORE_AND_RETRASH_VERIFIED');
 assert.equal(out.final_in_trash,true);assert.equal(out.other_pages_modified,0);
 assert.equal(out.credentials_exposed,false);assert.ok(!JSON.stringify(out).includes(token));
 assert.equal(f.getState().inTrash,true);
 assert.deepEqual(f.calls.map(x=>x.method),['GET','GET','PATCH','GET','GET','PATCH','GET']);
 assert.deepEqual(f.calls.filter(x=>x.method==='PATCH').map(x=>x.body),[{in_trash:false},{in_trash:true}]);
 assert.equal(f.calls.filter(x=>x.id===WIKI_PAGE_ID&&x.method!=='GET').length,0);
});
test('refuses a live page: no writes',async()=>{
 const f=setup({alreadyLive:true});
 await assert.rejects(()=>verifyNotionTrashedChildRestore({token,pageId,http:f.http}),/NOTION_RESTORE_SOURCE_NOT_IN_TRASH/);
 assert.equal(f.calls.filter(x=>x.method==='PATCH').length,0);
});
test('refuses foreign parent even when title matches: no writes',async()=>{
 const f=setup({wrongParent:true});
 await assert.rejects(()=>verifyNotionTrashedChildRestore({token,pageId,http:f.http}),/NOTION_RESTORE_FOREIGN_OR_UNVERIFIED_CHILD/);
 assert.equal(f.calls.filter(x=>x.method==='PATCH').length,0);
});
test('ambiguous network error after restore forces reconciliation and re-Trash, never claims PASS',async()=>{
 const f=setup({restoreThrowsAfterWrite:true});
 await assert.rejects(()=>verifyNotionTrashedChildRestore({token,pageId,http:f.http}),/NETWORK_UNCERTAIN_AFTER_RESTORE/);
 assert.equal(f.getState().inTrash,true);
 assert.deepEqual(f.calls.filter(x=>x.method==='PATCH').map(x=>x.body),[{in_trash:false},{in_trash:true}]);
});
test('re-Trash refusal returns error, never falsely claims cleanup',async()=>{
 const f=setup({retrashDenied:true});
 await assert.rejects(()=>verifyNotionTrashedChildRestore({token,pageId,http:f.http}),/NOTION_RESTORE_AUTH_403/);
 assert.equal(f.getState().inTrash,false);
});
test('denies missing ID, wiki as child, or missing service token before network',async()=>{
 let count=0;const http=async()=>{count++;throw Error('SHOULD_NOT_CALL');};
 for(const args of [{token,pageId:''},{token,pageId:WIKI_PAGE_ID},{token:'',pageId}]){
  await assert.rejects(()=>verifyNotionTrashedChildRestore({...args,http}));
 }
 assert.equal(count,0);
});
