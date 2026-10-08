import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {normalizeRemoteOutboxConfig,syncRemoteOutboxOnce} from '../runtime/rsi-outbox-client.mjs';

const base='https://raw.githubusercontent.com/carlosjmunoz78/fenix-capital-inmo-map/cerebro-rsi-learning-outbox-v0/cerebro/runtime/rsi-outbox';
function tmp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-rsi-outbox-client-'));}
function sha(text){return crypto.createHash('sha256').update(text,'utf8').digest('hex');}
function batch(){return {schema_version:'1.0.0',state_type:'CEREBRO_RSI_LRN_EVENT_BATCH',batch_id:'lrn-batch:abc',company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.5.0',source:{workflow:'CEREBRO Skill Discovery Scout',run_id:1,head_sha:'a'.repeat(40)},events_total:1,events:[{event_id:'evt:lrn:1',event_type:'SKILL_CANDIDATE_STATIC_LAB_GREEN',company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD_CANDIDATE',version:'0.1.0',candidate_id:'c1',evidence_ref:{source_ref:'s1'},payload:{domain:'seo'},prod_authorized:false,prod_write_authorized:false,trading_access:false}],local_validation_required:true,persistent_publish_authorized:false,rsi_publish_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};}
function fixture(){const b=`${JSON.stringify(batch(),null,2)}\n`;const i={schema_version:'1.0.0',state_type:'CEREBRO_RSI_LRN_OUTBOX_INDEX',company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.5.0',batches_total:1,batches:[{batch_id:'lrn-batch:abc',path:'batches/lrn-batch_abc.json',sha256:sha(b),events_total:1,source_run_id:1,source_head_sha:'a'.repeat(40)}],prod_authorized:false,trading_access:false,additional_cost_eur:0};return {batchText:b,indexText:`${JSON.stringify(i,null,2)}\n`};}
function fakeFetch(routes){return async url=>{const value=routes[url];if(value===undefined)return {ok:false,status:404,text:async()=>''};return {ok:true,status:200,text:async()=>value};};}

test('remote outbox config is HTTPS, GitHub raw and dedicated state branch only',()=>{
  assert.equal(normalizeRemoteOutboxConfig({enabled:true,base_url:base}).enabled,true);
  assert.throws(()=>normalizeRemoteOutboxConfig({enabled:true,base_url:base.replace('https:','http:')}),/HTTPS/);
  assert.throws(()=>normalizeRemoteOutboxConfig({enabled:true,base_url:'https://example.com/x'}),/raw.githubusercontent.com/);
  assert.throws(()=>normalizeRemoteOutboxConfig({enabled:true,base_url:'https://raw.githubusercontent.com/carlosjmunoz78/fenix-capital-inmo-map/main/cerebro/runtime/rsi-outbox'}),/dedicated CEREBRO state branch/);
});

test('consumer downloads verified tenant batch once then remains idempotent',async()=>{
  const root=tmp();
  try{
    const f=fixture();const companyBase=`${base}/fenix`;
    const fetch=fakeFetch({[`${companyBase}/index.json`]:f.indexText,[`${companyBase}/batches/lrn-batch_abc.json`]:f.batchText});
    const first=await syncRemoteOutboxOnce({remote_outbox:{enabled:true,base_url:base},company_id:'fenix',inbox_dir:root,fetch_impl:fetch});
    assert.equal(first.status,'REMOTE_OUTBOX_GREEN');assert.equal(first.downloaded_total,1);assert.equal(first.skipped_total,0);
    const second=await syncRemoteOutboxOnce({remote_outbox:{enabled:true,base_url:base},company_id:'fenix',inbox_dir:root,fetch_impl:fetch});
    assert.equal(second.downloaded_total,0);assert.equal(second.skipped_total,1);
    assert.equal(fs.readdirSync(root).filter(x=>x.endsWith('.json')).length,1);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('404 before first published index is a safe empty state',async()=>{
  const root=tmp();
  try{const result=await syncRemoteOutboxOnce({remote_outbox:{enabled:true,base_url:base},company_id:'fenix',inbox_dir:root,fetch_impl:fakeFetch({})});assert.equal(result.status,'REMOTE_OUTBOX_EMPTY');assert.equal(result.downloaded_total,0);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('consumer fails closed on checksum tamper and tenant mismatch',async()=>{
  for(const mode of ['checksum','tenant']){
    const root=tmp();
    try{
      const f=fixture();const companyBase=`${base}/fenix`;let batchText=f.batchText;let indexText=f.indexText;
      if(mode==='checksum') batchText=batchText.replace('STATIC_LAB_GREEN','TAMPERED');
      if(mode==='tenant'){
        const changed=batch();changed.company_id='other';batchText=`${JSON.stringify(changed,null,2)}\n`;const idx=JSON.parse(indexText);idx.batches[0].sha256=sha(batchText);indexText=`${JSON.stringify(idx,null,2)}\n`;
      }
      const fetch=fakeFetch({[`${companyBase}/index.json`]:indexText,[`${companyBase}/batches/lrn-batch_abc.json`]:batchText});
      await assert.rejects(()=>syncRemoteOutboxOnce({remote_outbox:{enabled:true,base_url:base},company_id:'fenix',inbox_dir:root,fetch_impl:fetch}),mode==='checksum'?/CHECKSUM_MISMATCH/:/BATCH_CONTEXT_MISMATCH/);
    }finally{fs.rmSync(root,{recursive:true,force:true});}
  }
});

test('consumer rejects traversal paths before remote fetch',async()=>{
  const root=tmp();
  try{
    const f=fixture();const idx=JSON.parse(f.indexText);idx.batches[0].path='../secret.json';const companyBase=`${base}/fenix`;
    await assert.rejects(()=>syncRemoteOutboxOnce({remote_outbox:{enabled:true,base_url:base},company_id:'fenix',inbox_dir:root,fetch_impl:fakeFetch({[`${companyBase}/index.json`]:JSON.stringify(idx)})}),/INVALID_BATCH_PATH/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
