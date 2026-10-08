import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {runAutoHostIteration} from '../runtime/rsi-learning-auto-host.mjs';

const base='https://raw.githubusercontent.com/carlosjmunoz78/fenix-capital-inmo-map/cerebro-rsi-learning-outbox-v0/cerebro/runtime/rsi-outbox';
function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-rsi-auto-host-'));}
function sha(text){return crypto.createHash('sha256').update(text,'utf8').digest('hex');}
function config(root){return {company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.5.0',preprod_version:'0.5.0',data_dir:path.join(root,'data'),inbox_dir:path.join(root,'inbox'),backup_dir:path.join(root,'backups'),poll_interval_ms:5000,policy_pass:true,security_pass:true,local_persistence_enabled:true,remote_outbox:{enabled:true,base_url:base}};}
function remote(){
  const batch={schema_version:'1.0.0',state_type:'CEREBRO_RSI_LRN_EVENT_BATCH',batch_id:'lrn-batch:auto1',company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.5.0',source:{workflow:'CEREBRO Skill Discovery Scout',run_id:77,head_sha:'b'.repeat(40)},events_total:1,events:[{event_id:'evt:lrn:auto1',event_type:'SKILL_CANDIDATE_STATIC_LAB_GREEN',severity:'INFO',company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD_CANDIDATE',version:'0.1.0',candidate_id:'candidate:auto1',reason:'STATIC_LAB_GREEN',evidence_ref:{source_ref:'source:auto1'},payload:{domain:'seo'},target_engine_bindings:['SEO-001'],local_validation_required:true,publish_authorized:false,persistent_publish_authorized:false,rsi_publish_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0}],local_validation_required:true,persistent_publish_authorized:false,rsi_publish_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  const batchText=`${JSON.stringify(batch,null,2)}\n`;
  const index={schema_version:'1.0.0',state_type:'CEREBRO_RSI_LRN_OUTBOX_INDEX',company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.5.0',batches_total:1,batches:[{batch_id:batch.batch_id,path:'batches/lrn-batch_auto1.json',sha256:sha(batchText),events_total:1,source_run_id:77,source_head_sha:'b'.repeat(40)}],prod_authorized:false,trading_access:false,additional_cost_eur:0};
  const indexText=`${JSON.stringify(index,null,2)}\n`;
  const companyBase=`${base}/fenix`;
  return async url=>{if(url===`${companyBase}/index.json`)return {ok:true,status:200,text:async()=>indexText};if(url===`${companyBase}/batches/lrn-batch_auto1.json`)return {ok:true,status:200,text:async()=>batchText};return {ok:false,status:404,text:async()=>''};};
}

test('one autonomous iteration pulls verified outbox, learns and materializes one versioned candidate without manual JSON',async()=>{
  const root=temp();
  try{
    const result=await runAutoHostIteration({raw_config:config(root),fetch_impl:remote(),now:()=> '2026-10-08T14:00:00.000Z'});
    assert.equal(result.status,'GREEN');assert.equal(result.remote_outbox.status,'REMOTE_OUTBOX_GREEN');assert.equal(result.remote_outbox.downloaded_total,1);
    assert.equal(result.learning.last_result.persisted_total,1);assert.equal(result.prod_authorized,false);assert.equal(result.trading_access,false);
    assert.equal(result.candidates.status,'CANDIDATES_GREEN');assert.equal(result.candidates.persisted_total,1);assert.equal(result.candidates.candidate_total,1);assert.equal(result.candidates.next_gate,'OLD_VS_NEW_EXPERIMENT');
    assert.equal(fs.existsSync(path.join(root,'data','fenix','LRN-001','learning.v8')),true);
    assert.equal(fs.existsSync(path.join(root,'data','fenix','LRN-001','improvement-candidates.v8')),true);
    const rerun=await runAutoHostIteration({raw_config:config(root),fetch_impl:remote(),now:()=> '2026-10-08T14:01:00.000Z'});
    assert.equal(rerun.remote_outbox.skipped_total,1);assert.equal(rerun.learning.last_result.persisted_total,0);assert.ok(rerun.learning.last_result.skipped_receipts>=1);
    assert.equal(rerun.candidates.persisted_total,0);assert.equal(rerun.candidates.duplicates_total,1);assert.equal(rerun.candidates.candidate_total,1);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('kill switch skips remote pull and performs zero new persistence or candidate generation',async()=>{
  const root=temp();
  try{
    const cfg=config(root);const engineRoot=path.join(root,'data','fenix','LRN-001');fs.mkdirSync(engineRoot,{recursive:true});fs.writeFileSync(path.join(engineRoot,'KILL_SWITCH'),'enabled\n');
    let calls=0;const fetch=async()=>{calls+=1;throw new Error('must not call');};
    const result=await runAutoHostIteration({raw_config:cfg,fetch_impl:fetch,now:()=> '2026-10-08T14:00:00.000Z'});
    assert.equal(calls,0);assert.equal(result.status,'KILLED');assert.equal(result.learning.last_result.reason,'KILL_SWITCH');assert.equal(result.candidates.status,'CANDIDATES_KILLED');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('remote transient failures are visible twice then switch strategy on third identical failure',async()=>{
  const root=temp();
  try{
    const cfg=config(root);const bad=async()=>{throw new Error('network-down');};
    for(let i=1;i<=2;i++){
      const result=await runAutoHostIteration({raw_config:cfg,fetch_impl:bad,now:()=>`2026-10-08T14:0${i}:00.000Z`});
      assert.equal(result.status,'PARTIAL_REMOTE_ERROR');assert.equal(result.remote_outbox.status,'REMOTE_OUTBOX_ERROR');assert.equal(result.remote_outbox.consecutive_same_error,i);
    }
    await assert.rejects(()=>runAutoHostIteration({raw_config:cfg,fetch_impl:bad,now:()=> '2026-10-08T14:03:00.000Z'}),/HOLD_REMOTE_OUTBOX_SAME_ERROR_FAMILY/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
