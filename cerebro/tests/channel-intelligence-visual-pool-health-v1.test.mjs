import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateVisualPoolHealth} from '../marketing/channel-intelligence-visual-pool-health-v1.mjs';

const company='fenix-capital';
const env='PREPROD';
const now=Date.parse('2026-10-21T14:00:00Z');

function asset(key,format='single-story',channel='facebook'){
  return {asset_key:key,company_id:company,environment:env,url:`https://fenixcapital.es/${key}.jpg`,channel_eligible:[channel],visual_format:format,character_key:`char-${key}`,cooldown_days:60,active:true};
}

test('detects exhausted visual pool before content due date',()=>{
  const a=asset('a');
  const queue=[
    {company_id:company,environment:env,content_key:'old',channel:'facebook',visual_format:'single-story',scheduled_at:'2026-10-20T16:30:00Z',state:'PUBLISHED',source_media_urls:[a.url],character_key:'char-a'},
    {company_id:company,environment:env,content_key:'next',channel:'facebook',visual_format:'single-story',scheduled_at:'2026-10-24T16:30:00Z',state:'CONTENT_READY_MEDIA_REQUIRED',source_media_urls:[],character_key:null}
  ];
  const result=evaluateVisualPoolHealth({company_id:company,queue,assets:[a],now_ms:now});
  assert.equal(result.overall_state,'POOL_EXHAUSTED');
  assert.equal(result.exhausted_count,1);
  assert.equal(result.next_action,'EXPAND_FIRST_PARTY_VISUAL_POOL_BEFORE_DUE_DATE');
});

test('new first-party assets clear exhaustion',()=>{
  const a=asset('a');
  const b=asset('b');
  const c=asset('c');
  const queue=[
    {company_id:company,environment:env,content_key:'old',channel:'facebook',visual_format:'single-story',scheduled_at:'2026-10-20T16:30:00Z',state:'PUBLISHED',source_media_urls:[a.url],character_key:'char-a'},
    {company_id:company,environment:env,content_key:'next',channel:'facebook',visual_format:'single-story',scheduled_at:'2026-10-24T16:30:00Z',state:'CONTENT_READY_MEDIA_REQUIRED',source_media_urls:[],character_key:null}
  ];
  const result=evaluateVisualPoolHealth({company_id:company,queue,assets:[a,b,c],now_ms:now,low_buffer:1});
  assert.equal(result.overall_state,'POOL_OK');
  assert.equal(result.checks[0].available_assets,2);
});

test('carousel requires three available assets',()=>{
  const assets=[asset('a','carousel-slide','instagram'),asset('b','carousel-slide','instagram')];
  const queue=[{company_id:company,environment:env,content_key:'ig',channel:'instagram',visual_format:'carousel-cover',scheduled_at:'2026-10-23T10:00:00Z',state:'CONTENT_READY_MEDIA_REQUIRED',source_media_urls:[],character_key:null}];
  const result=evaluateVisualPoolHealth({company_id:company,queue,assets,now_ms:now});
  assert.equal(result.overall_state,'POOL_EXHAUSTED');
  assert.equal(result.checks[0].needed_assets,3);
});

test('PROD use fails closed',()=>{
  assert.throws(()=>evaluateVisualPoolHealth({company_id:company,environment:'PROD',queue:[],assets:[],now_ms:now}),/PREPROD_ONLY/);
});
