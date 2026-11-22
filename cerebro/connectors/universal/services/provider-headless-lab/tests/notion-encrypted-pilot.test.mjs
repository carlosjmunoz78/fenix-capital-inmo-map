import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptNotionPilot,verifyEncryptedNotionPilot,NOTION_PILOT_PAGE_ID} from '../notion-encrypted-pilot.mjs';
const token='CEREBRO_TEST_NOTION_TOKEN_12345678901234567890',key='42'.repeat(32);
const mock=async(url,opts)=>{
 assert.equal(opts.method,'GET');assert.equal(opts.headers.Authorization,'Bearer '+token);
 if(url.endsWith('/pages/'+NOTION_PILOT_PAGE_ID))
  return{status:200,json:async()=>({object:'page',id:NOTION_PILOT_PAGE_ID,properties:{Secret:{title:[{plain_text:'private customer name'}]}}})};
 if(url.endsWith('/blocks/'+NOTION_PILOT_PAGE_ID+'/children?page_size=100'))
  return{status:200,json:async()=>({results:[{id:'11111111-1111-4111-8111-111111111111',type:'paragraph',has_children:false,paragraph:{rich_text:[{plain_text:'Sensitive private text'}]}}],has_more:false,next_cursor:null})};
 throw Error('BAD_URL');
};
test('encrypts real shaped Notion content under AES-GCM and verifies in-memory reconstruct without disclosure',async()=>{
 const artifact=await encryptNotionPilot({notionToken:token,encryptionKey:key,http:mock});
 assert.equal(artifact.block_count,1);assert.equal(artifact.external_provider_writes,0);
 assert.equal(artifact.full_workspace_backup,false);assert.equal(artifact.remaining_blocks,false);
 assert.ok(!JSON.stringify(artifact).includes('Sensitive private text'));
 assert.ok(!JSON.stringify(artifact).includes('private customer name'));
 assert.ok(!JSON.stringify(artifact).includes(token));
 assert.ok(!JSON.stringify(artifact).includes(key));
 const restore=await verifyEncryptedNotionPilot({encryptionKey:key,artifact});
 assert.equal(restore.status,'FACT001_PILOT_ENCRYPTED_ROUNDTRIP_VERIFIED');
 assert.equal(restore.provider_restore_performed,false);
 assert.equal(restore.sensitive_content_returned,false);
});
test('two encryptions produce distinct authenticated envelopes for same plaintext',async()=>{
 const a=await encryptNotionPilot({notionToken:token,encryptionKey:key,http:mock});
 const b=await encryptNotionPilot({notionToken:token,encryptionKey:key,http:mock});
 assert.notEqual(a.envelope.nonce_b64,b.envelope.nonce_b64);
 assert.equal(a.plaintext_sha256,b.plaintext_sha256);
});
test('wrong key and tampering reject without returning plaintext',async()=>{
 const a=await encryptNotionPilot({notionToken:token,encryptionKey:key,http:mock});
 await assert.rejects(()=>verifyEncryptedNotionPilot({encryptionKey:'11'.repeat(32),artifact:a}),/AUTHENTICITY_FAILURE/);
 await assert.rejects(()=>verifyEncryptedNotionPilot({encryptionKey:key,artifact:{...a,plaintext_sha256:'a'.repeat(64)}}),/INTEGRITY_FAILURE/);
 const tampered={...a,envelope:{...a.envelope,nonce_b64:'AAAAAAAAAAAAAAAA'}};
 await assert.rejects(()=>verifyEncryptedNotionPilot({encryptionKey:key,artifact:tampered}),/AUTHENTICITY_FAILURE/);
});
test('nested and remaining child blocks are flagged as incomplete backup',async()=>{
 const http=async(url,opts)=>url.includes('/pages/')?mock(url,opts):
  ({status:200,json:async()=>({results:[{id:'11111111-1111-4111-8111-111111111111',type:'child_page',has_children:true}],has_more:true,next_cursor:'next'})});
 const a=await encryptNotionPilot({notionToken:token,encryptionKey:key,http});
 assert.equal(a.nested_block_count,1);assert.equal(a.remaining_blocks,true);
 assert.equal(a.full_workspace_backup,false);
});
test('bad token or missing page or provider 401 fails closed',async()=>{
 await assert.rejects(()=>encryptNotionPilot({notionToken:'bad',encryptionKey:key,http:mock}),/TOKEN_INVALID/);
 await assert.rejects(()=>encryptNotionPilot({notionToken:token,encryptionKey:'abc',http:mock}),/KEY_INVALID/);
 await assert.rejects(()=>encryptNotionPilot({notionToken:token,encryptionKey:key,http:async()=>({status:401})}),/AUTH_DENIED/);
 await assert.rejects(()=>encryptNotionPilot({notionToken:token,encryptionKey:key,http:async()=>({status:200,json:async()=>({object:'page',id:'wrong'})})}),/PAGE_ID_MISMATCH/);
});
