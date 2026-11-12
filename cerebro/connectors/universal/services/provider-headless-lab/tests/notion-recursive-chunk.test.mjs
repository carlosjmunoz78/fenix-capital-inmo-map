import test from 'node:test';
import assert from 'node:assert/strict';
import {sealRecursiveWiki,verifyRecursiveWiki,WIKI_RECURSIVE_ROOT} from '../notion-recursive-chunk.mjs';
const token='CEREBRO_NOTION_SERVICE_TEST_TOKEN_LAB_123456789',key='7f'.repeat(32);
const child='11111111-1111-4111-8111-111111111111',leaf='22222222-2222-4222-8222-222222222222';
const root=()=>({object:'page',id:WIKI_RECURSIVE_ROOT,properties:{title:{title:[{plain_text:'sensitive page data'}]}}});
const makeBlock=(id,has_children=false,type='paragraph')=>({object:'block',id,has_children,type,
 paragraph:{rich_text:[{plain_text:'sensitive block content'}]}});
const fake=async(url,opts)=>{
 assert.equal(opts.method,'GET');assert.equal(opts.headers.Authorization,'Bearer '+token);
 if(url.endsWith('/pages/'+WIKI_RECURSIVE_ROOT))return {status:200,json:async()=>root()};
 if(url.includes('/blocks/'+WIKI_RECURSIVE_ROOT+'/children?'))return {status:200,json:async()=>({
  results:[makeBlock(child,true)],has_more:false,next_cursor:null})};
 if(url.includes('/blocks/'+child+'/children?'))return {status:200,json:async()=>({
  results:[makeBlock(leaf)],has_more:false,next_cursor:null})};
 throw Error('unknown route');
};
test('physical-shaped root and nested child fully archived encrypted, no plaintext leakage',async()=>{
 const a=await sealRecursiveWiki({notionToken:token,encryptionKey:key,http:fake});
 assert.equal(a.api_requests,2);assert.equal(a.block_count,2);
 assert.equal(a.complete_root_block_tree,true);assert.equal(a.deferred_tasks,0);
 assert.equal(a.full_workspace_backup,false);assert.equal(a.external_provider_writes,0);
 assert.equal(a.media_reference_count,0);
 assert.ok(!JSON.stringify(a).includes('sensitive block content'));
 assert.ok(!JSON.stringify(a).includes('sensitive page data'));
 assert.ok(!JSON.stringify(a).includes(token));
 const r=await verifyRecursiveWiki({artifact:a,encryptionKey:key});
 assert.equal(r.status,'FACT001_RECURSIVE_MEMORY_RECONSTRUCTION_PASS');
 assert.equal(r.root_tree_complete,true);assert.equal(r.notion_physical_restore,false);
});
test('wrong key and edited ciphertext fail AES GCM integrity',async()=>{
 const a=await sealRecursiveWiki({notionToken:token,encryptionKey:key,http:fake});
 await assert.rejects(()=>verifyRecursiveWiki({artifact:a,encryptionKey:'11'.repeat(32)}),/AUTHENTICITY_FAILURE/);
 await assert.rejects(()=>verifyRecursiveWiki({artifact:{...a,plaintext_sha256:'b'.repeat(64)},encryptionKey:key}),/INTEGRITY_FAILURE/);
});
test('cursor pagination is persisted until all pages captured',async()=>{
 let rootPages=0;const http=async(url,opts)=>{
  if(url.includes('/pages/'))return {status:200,json:async()=>root()};
  if(url.includes('/blocks/'+WIKI_RECURSIVE_ROOT+'/children?')){
   rootPages++;const cursor=url.includes('start_cursor=');
   return {status:200,json:async()=>cursor?({results:[makeBlock(leaf)],has_more:false,next_cursor:null}):
    ({results:[makeBlock(child)],has_more:true,next_cursor:'cursor-next'})};
  }
  return {status:404};
 };
 const a=await sealRecursiveWiki({notionToken:token,encryptionKey:key,http});
 assert.equal(rootPages,2);assert.equal(a.api_requests,2);assert.equal(a.block_count,2);
 assert.equal(a.deferred_tasks,0);
});
test('does not claim completion if backlog exceeds bounded 12 requests',async()=>{
 let seq=0;const http=async(url)=>{
  if(url.includes('/pages/'))return {status:200,json:async()=>root()};
  return {status:200,json:async()=>({results:[makeBlock((++seq).toString(16).padStart(8,'0')+
   '-1111-4111-8111-111111111111',true)],has_more:false,next_cursor:null})};
 };
 const a=await sealRecursiveWiki({notionToken:token,encryptionKey:key,http});
 // Depending on depth cap, this is partial and must not claim full workspace.
 assert.equal(a.complete_root_block_tree,false);assert.ok(a.deferred_tasks>0);
 assert.equal(a.full_workspace_backup,false);assert.ok(a.api_requests<=12);
});
test('404, malformed page and broken blocks fail closed with no encrypted artifact',async()=>{
 await assert.rejects(()=>sealRecursiveWiki({notionToken:token,encryptionKey:key,http:async()=>({status:404})}),/NOTION_HTTP_404/);
 await assert.rejects(()=>sealRecursiveWiki({notionToken:token,encryptionKey:key,http:async()=>({status:200,json:async()=>({object:'page',id:'wrong'})})}),/ROOT_NOT_LIVE/);
 const http=async(url)=>url.includes('/pages/')?{status:200,json:async()=>root()}:
  {status:200,json:async()=>({results:[{object:'block',id:child,type:'paragraph',has_children:'yes'}],has_more:false})};
 await assert.rejects(()=>sealRecursiveWiki({notionToken:token,encryptionKey:key,http}),/BLOCK_INVALID/);
});
test('invalid or missing secrets denied before provider calls',async()=>{
 let count=0;const http=async()=>{count++;return {status:200};};
 await assert.rejects(()=>sealRecursiveWiki({notionToken:'bad',encryptionKey:key,http}),/TOKEN_DENIED/);
 await assert.rejects(()=>sealRecursiveWiki({notionToken:token,encryptionKey:'bad',http}),/AES_KEY_DENIED/);
 assert.equal(count,0);
});
