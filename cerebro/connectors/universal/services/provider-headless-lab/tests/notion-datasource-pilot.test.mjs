import test from 'node:test';
import assert from 'node:assert/strict';
import {sealMarketingSource,verifyMarketingSource,MARKETING_SOURCE_ID} from '../notion-datasource-pilot.mjs';
const key='33'.repeat(32),token='CEREBRO_TEST_NOTION_VAULT_TOKEN_123456789';
const row='11111111-1111-4111-8111-111111111111';
const source=()=>({object:'data_source',id:MARKETING_SOURCE_ID,properties:{secret:{name:'private'}}});
const record=()=>({object:'page',id:row,properties:{name:{title:[{plain_text:'sensitive internal marketing'}]}}});
const provider=async(url,opts)=>{
 assert.equal(opts.headers.Authorization,'Bearer '+token);
 if(url.endsWith(MARKETING_SOURCE_ID)){assert.equal(opts.method,'GET');return{status:200,json:async()=>source()};}
 if(url.endsWith('/query')){assert.equal(opts.method,'POST');assert.equal(JSON.parse(opts.body).page_size,50);
 return{status:200,json:async()=>({results:[record()],has_more:false,next_cursor:null})};}
 throw Error('UNEXPECTED_ENDPOINT');
};
test('encrypts source schema and rows, decrypt/rebuild checks integrity, no data leakage',async()=>{
 const a=await sealMarketingSource({encryptionKey:key,notionToken:token,http:provider});
 assert.equal(a.rows,1);assert.equal(a.query_pages,1);assert.equal(a.has_more,false);
 assert.equal(a.row_properties_included,true);assert.equal(a.row_page_blocks_included,false);
 assert.equal(a.write_operations,0);assert.equal(a.full_workspace_backup,false);
 assert.ok(!JSON.stringify(a).includes('sensitive internal marketing'));
 assert.ok(!JSON.stringify(a).includes(token));
 const v=await verifyMarketingSource({artifact:a,encryptionKey:key});
 assert.equal(v.status,'FACT001_SOURCE_MEMORY_REBUILD_PASS');
 assert.equal(v.content_exposed,false);assert.equal(v.notion_physical_restore,false);
});
test('row query pagination limit is 4 pages with deferred cursor',async()=>{
 let n=0;
 const a=await sealMarketingSource({encryptionKey:key,notionToken:token,http:async(url,opts)=>{
  if(url.endsWith(MARKETING_SOURCE_ID))return{status:200,json:async()=>source()};
  n++;let hex=(n+100).toString(16).padStart(8,'0');
  return{status:200,json:async()=>({results:[{object:'page',id:hex+'-1111-4111-8111-111111111111'}],
    has_more:true,next_cursor:'next-'+n})};
 }});
 assert.equal(n,4);assert.equal(a.query_pages,4);assert.equal(a.has_more,true);assert.equal(a.rows,4);
});
test('tampering and wrong key fail authenticated decrypt',async()=>{
 const a=await sealMarketingSource({encryptionKey:key,notionToken:token,http:provider});
 await assert.rejects(()=>verifyMarketingSource({encryptionKey:'12'.repeat(32),artifact:a}),/AUTHENTICITY_FAILED/);
 await assert.rejects(()=>verifyMarketingSource({encryptionKey:key,artifact:{...a,plaintext_sha256:'a'.repeat(64)}}),/INTEGRITY_FAILED/);
});
test('source mismatch and malformed rows fail without archive',async()=>{
 await assert.rejects(()=>sealMarketingSource({encryptionKey:key,notionToken:token,http:async()=>({status:200,json:async()=>({object:'data_source',id:'bad'})})}),/SCHEMA_ID_MISMATCH/);
 let c=0;
 await assert.rejects(()=>sealMarketingSource({encryptionKey:key,notionToken:token,http:async()=>++c===1?
  {status:200,json:async()=>source()}:{status:200,json:async()=>({results:[{object:'block',id:row}],has_more:false})}}),/ROW_INVALID/);
});
test('global 401, invalid bearer and key reject before disclosure',async()=>{
 await assert.rejects(()=>sealMarketingSource({encryptionKey:key,notionToken:'bad',http:provider}),/TOKEN_DENIED/);
 await assert.rejects(()=>sealMarketingSource({encryptionKey:'bad',notionToken:token,http:provider}),/KEY_INVALID/);
 await assert.rejects(()=>sealMarketingSource({encryptionKey:key,notionToken:token,http:async()=>({status:401})}),/AUTH_DENIED/);
});
