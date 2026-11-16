import test from 'node:test';
import assert from 'node:assert/strict';
import {createNiaPageReadProviderV0, NIA_NOTION_PAGE_ID} from '../gateway/nia-notion-page-provider-v0.mjs';

const TITLE='NIA · Uso responsable de Notion Business en CEREBRO';
const PAGE={id:NIA_NOTION_PAGE_ID,archived:false,in_trash:false,
  properties:{title:{title:[{plain_text:TITLE}]}}};
test('provider uses one exact read-only endpoint and returns minimal Notion metadata',async()=>{
  let calls=0;let auth='';let body=false;
  const provider=createNiaPageReadProviderV0({
    token_provider:async()=>'test-placeholder-token-not-a-real-key',
    fetch_impl:async(url,options)=>{
      calls++;auth=options.headers.Authorization;
      assert.equal(url,'https://api.notion.com/v1/pages/'+NIA_NOTION_PAGE_ID);
      assert.equal(options.method,'GET');assert.equal(options.redirect,'error');
      assert.equal(options.headers['Notion-Version'],'2022-06-28');
      body=!!options.body;
      return {status:200,json:async()=>({...PAGE,secret:'must-never-echo',blocks:[{text:'sensitive'}]})};
    }
  });
  const result=await provider.readSkillPage(NIA_NOTION_PAGE_ID);
  assert.equal(calls,1);assert.equal(auth.startsWith('Bearer '),true);assert.equal(body,false);
  assert.equal(result.id,NIA_NOTION_PAGE_ID);
  assert.equal(result.properties.title.title[0].plain_text,TITLE);
  assert.equal(JSON.stringify(result).includes('secret'),false);
  assert.equal(JSON.stringify(result).includes('sensitive'),false);
});
test('wrong IDs fail closed before vault access or HTTP',async()=>{
  let reads=0;
  const p=createNiaPageReadProviderV0({
    token_provider:async()=>{reads++;throw new Error('must not access vault');},
    fetch_impl:async()=>{throw Error('must not fetch');}
  });
  await assert.rejects(p.readSkillPage('00000000-0000-0000-0000-000000000000'),/OUT_OF_SCOPE/);
  assert.equal(reads,0);
});
test('missing or bad token blocks before any network read',async()=>{
  let calls=0;
  const p=createNiaPageReadProviderV0({token_provider:async()=>'',fetch_impl:async()=>{calls++;return {status:200,json:async()=>PAGE};}});
  await assert.rejects(p.readSkillPage(NIA_NOTION_PAGE_ID),/TOKEN_UNAVAILABLE/);
  assert.equal(calls,0);
});
test('non-200 and network failures return generic non-secret errors',async()=>{
  for(const response of [401,403,404]){
    const p=createNiaPageReadProviderV0({
      token_provider:()=> 'test-placeholder-token-not-a-real-key',
      fetch_impl:async()=>({status:response,json:async()=>{throw Error('body must not be read');}})
    });
    await assert.rejects(p.readSkillPage(NIA_NOTION_PAGE_ID),/PAGE_ACCESS_DENIED/);
  }
  const p=createNiaPageReadProviderV0({token_provider:()=> 'test-placeholder-token-not-a-real-key',
    fetch_impl:async()=>{throw Error('should never log raw fetch exception');}});
  await assert.rejects(p.readSkillPage(NIA_NOTION_PAGE_ID),/NETWORK_UNAVAILABLE/);
});
test('provider does not accept invalid timeout or missing token provider',()=>{
  assert.throws(()=>createNiaPageReadProviderV0({}),/token_provider/);
  assert.throws(()=>createNiaPageReadProviderV0({token_provider:()=>'',timeout_ms:0}),/timeout_ms/);
  assert.throws(()=>createNiaPageReadProviderV0({token_provider:()=>'',timeout_ms:20000}),/timeout_ms/);
});
