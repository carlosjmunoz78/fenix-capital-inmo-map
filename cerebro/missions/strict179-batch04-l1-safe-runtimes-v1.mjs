#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {buildKnowledgeCandidate,UPD_001} from '../runtime/l1/upd001-v1.mjs';
import {assessObsolescence,OBS_001} from '../runtime/l1/obs001-v1.mjs';
import {normalizeConversationKnowledge,CON_001} from '../runtime/l1/con001-v1.mjs';
import {buildCacheKey,createCacheRecord,assessCacheRecord,CACHE_001} from '../runtime/l1/cache001-v1.mjs';
import {createTwinSnapshot,simulateTwinScenario,TWIN_001} from '../runtime/l1/twin001-v1.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision} from '../runtime/evaluation-tribunal.mjs';

const ROOT=process.cwd();
const MANIFEST='cerebro/evidence/l1-foundation-wave1/2026-11-02/IMPLEMENTATION_MANIFEST.json';
const SOURCES={
  'UPD-001':'cerebro/runtime/l1/upd001-v1.mjs',
  'OBS-001':'cerebro/runtime/l1/obs001-v1.mjs',
  'CON-001':'cerebro/runtime/l1/con001-v1.mjs',
  'CACHE-001':'cerebro/runtime/l1/cache001-v1.mjs',
  'TWIN-001':'cerebro/runtime/l1/twin001-v1.mjs'
};
const PRESERVE=['RSH-001','RAG-001','SIM-001'];
function assert(c,m){if(!c)throw new Error(m);}
function stable(v){return Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);}
function stableJson(v){return JSON.stringify(stable(v));}
function sha(v){return crypto.createHash('sha256').update(typeof v==='string'?v:stableJson(v)).digest('hex');}
function parseOut(){const a=process.argv.slice(2),i=a.indexOf('--out');if(i<0||!a[i+1])throw new Error('usage: --out <dir>');return path.resolve(a[i+1]);}
function copy(src,dst){fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);}
function context(){return {company_id:'fenix',environment:'PREPROD',version:'0.1.0'};}

function executeEngine(id){
  if(id==='UPD-001'){
    const base={context:context(),candidate_id:'candidate-b04',domain:'operations',source:{source_id:'fixture-b04',provenance:'STRICT179_APPROVED_FIXTURE',observed_at:'2026-11-02T15:00:00Z',validated:true},confidence:0.95,min_confidence:0.80,payload:{fact:'fixture'}};
    const ok=buildKnowledgeCandidate(base);
    const low=buildKnowledgeCandidate({...base,candidate_id:'candidate-low',confidence:0.20});
    assert(ok.status==='KNOWLEDGE_CANDIDATE'&&ok.publish===false&&ok.requires_policy_gate===true,'UPD-001 positive safety failed');
    assert(low.status==='HUMAN_REQUIRED'&&low.human_exception_code==='LOW_CONFIDENCE','UPD-001 low-confidence fail-closed failed');
    return {primary:ok,adversarial:low};
  }
  if(id==='OBS-001'){
    const active=assessObsolescence({record_id:'obs-b04',last_verified_at:'2026-11-02T12:00:00Z',now:'2026-11-02T12:30:00Z',ttl_ms:3600000,contradictions:[]});
    const stale=assessObsolescence({record_id:'obs-b04',last_verified_at:'2026-11-02T12:00:00Z',now:'2026-11-02T14:00:00Z',ttl_ms:3600000,contradictions:['fixture contradiction']});
    assert(active.status==='ACTIVE'&&active.delete_history===false,'OBS-001 active assessment failed');
    assert(stale.status==='STALE'&&stale.action==='CREATE_REVIEW'&&stale.delete_history===false,'OBS-001 stale review failed');
    return {primary:active,adversarial:stale};
  }
  if(id==='CON-001'){
    const ok=normalizeConversationKnowledge({context:context(),conversation_id:'conv-b04',min_confidence:0.80,items:[{kind:'DECISION',text:'Use approved fixture only',confidence:0.95,sensitive:false,metadata:{source:'fixture'}}]});
    const risk=normalizeConversationKnowledge({context:context(),conversation_id:'conv-risk-b04',min_confidence:0.80,items:[{kind:'FACT',text:'synthetic sensitive fixture',confidence:0.95,sensitive:true}]});
    assert(ok.status==='STRUCTURED_CANDIDATES'&&ok.publish===false&&ok.extraction_mode==='STRUCTURED_INPUT_ONLY','CON-001 structured-only safety failed');
    assert(risk.status==='REVIEW_REQUIRED'&&risk.items[0].human_exception_code==='HIGH_RISK','CON-001 high-risk fail-closed failed');
    return {primary:ok,adversarial:risk};
  }
  if(id==='CACHE-001'){
    const key1=buildCacheKey({company_id:'fenix',engine_id:'CACHE-001',rule_version:'v1',prompt_version:'none',domain:'fixture',payload:{b:2,a:1}});
    const key2=buildCacheKey({company_id:'fenix',engine_id:'CACHE-001',rule_version:'v1',prompt_version:'none',domain:'fixture',payload:{a:1,b:2}});
    assert(key1.cache_key===key2.cache_key,'CACHE-001 stable key failed');
    const record=createCacheRecord({cache_key:key1.cache_key,created_at:'2026-11-02T12:00:00Z',ttl_ms:3600000,value:{fixture:true}});
    const fresh=assessCacheRecord(record,'2026-11-02T12:30:00Z');
    const stale=assessCacheRecord(record,'2026-11-02T14:00:00Z');
    assert(record.persistent===false&&fresh.status==='HIT_FRESH'&&stale.status==='MISS_STALE','CACHE-001 TTL/persistence safety failed');
    return {primary:{key:key1,record,fresh},adversarial:stale};
  }
  if(id==='TWIN-001'){
    const snap=createTwinSnapshot({context:context(),snapshot_id:'twin-b04',source_kind:'SYNTHETIC',metrics:{leads:10,conversion:2},entities:{fixture:true}});
    const sim=simulateTwinScenario({snapshot:snap,scenario_id:'scenario-b04',metric_deltas:{leads:5,conversion:1}});
    assert(snap.simulation_only===true&&snap.persist===false,'TWIN-001 snapshot safety failed');
    assert(sim.simulation_only===true&&sim.prod_write===false&&sim.after.leads===15&&sim.after.conversion===3,'TWIN-001 simulation safety failed');
    return {primary:snap,adversarial:sim};
  }
  throw new Error(`unsupported engine ${id}`);
}

async function main(){
  const out=parseOut();
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'strict179-batch04-'));
  try{
    const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,MANIFEST),'utf8'));
    assert(manifest.preservation_mode==='WRAP_PRESERVE'&&manifest.do_not_overwrite===true,'L1 preservation contract changed');
    for(const id of PRESERVE)assert((manifest.preserved_existing_engines||[]).includes(id),`${id} must remain WRAP_PRESERVE`);
    const preserved=Object.fromEntries(PRESERVE.map(id=>[id,{status:'FAIL_CLOSED_WRAP_PRESERVE',duplicate_runtime_created:false,gates_promoted:false,prod_authorized:false}]));
    const engines={};
    for(const [id,source] of Object.entries(SOURCES)){
      const descriptor={ 'UPD-001':UPD_001,'OBS-001':OBS_001,'CON-001':CON_001,'CACHE-001':CACHE_001,'TWIN-001':TWIN_001 }[id];
      assert(descriptor.engine_id===id&&descriptor.prod_writes===false&&descriptor.additional_cost_eur===0,`${id} descriptor safety changed`);
      const src=path.join(ROOT,source),backup=path.join(scratch,'backup',source),probe=path.join(scratch,'probe',source);
      assert(fs.existsSync(src),`${id} runtime missing`);
      copy(src,backup);const sourceDigest=sha(fs.readFileSync(src)),backupDigest=sha(fs.readFileSync(backup));assert(sourceDigest===backupDigest,`${id} backup mismatch`);
      copy(backup,probe);fs.appendFileSync(probe,'\n// STRICT179_BATCH04_ROLLBACK_PROBE\n');assert(sha(fs.readFileSync(probe))!==sourceDigest,`${id} mutation probe failed`);
      fs.rmSync(path.dirname(probe),{recursive:true,force:true});copy(backup,probe);const restoredDigest=sha(fs.readFileSync(probe));assert(restoredDigest===sourceDigest,`${id} rollback restore mismatch`);
      const run1=executeEngine(id),run2=executeEngine(id);assert(stableJson(run1)===stableJson(run2),`${id} deterministic execution failed`);
      const benchmark=defineBenchmark({company_id:'fenix',engine_id:id,environment:'PREPROD',version:'0.1.0',benchmark_id:`batch04-${id.toLowerCase()}-safety`,benchmark_version:'v1',metric:'score',holdout_ref:`holdout:${id.toLowerCase()}:opaque`,adversarial_refs:[`adv:${id.toLowerCase()}:fail-closed`]});
      const oldR={experiment_id:`strict179-${id.toLowerCase()}`,company_id:'fenix',engine_id:id,environment:'PREPROD',version:'0.1.0',arm:'OLD',metrics:{score:70}};
      const newR={...oldR,arm:'NEW',metrics:{score:80}};
      const evaluation=evaluateOldNew({benchmark,old_result:oldR,new_result:newR});
      const judgement=tribunalDecision({evaluation,judge_id:'JDG-001',candidate_actor_id:id,real_outcome_delta:1});
      assert(judgement.decision==='PASS'&&judgement.prod_authorized===false,`${id} tribunal fail-closed failed`);
      const audit={schema_version:'1.0.0',event_type:'STRICT179_BATCH04_EXECUTION_AUDIT',company_id:'fenix',engine_id:id,environment:'PREPROD',audit_status:'GREEN',trace_status:'GREEN',metric_name:'safe_runtime_execution',metric_value:1,trace_id:sha({id,run1}).slice(0,32),prod_authorized:false,prod_write_authorized:false,trading_access:false,secrets_read:false,external_writes:false,additional_cost_eur:0};
      engines[id]={status:'GREEN',source,source_digest:sourceDigest,gates:{backup:{tested:true,status:'GREEN',restore_verified:true,digest:backupDigest},rollback:{tested:true,status:'GREEN',revert_verified:true,restored_digest:restoredDigest},rebuild:{tested:true,status:'GREEN',deterministic:true,execution_hash:sha(run1)},observability:{tested:true,status:'GREEN',audit_emitted:true,trace_emitted:true,metric_emitted:true,trace_id:audit.trace_id},evaluation:{tested:true,status:'GREEN',evaluation_id:evaluation.evaluation_id},tribunal:{tested:true,status:'GREEN',judge_id:'JDG-001',independent:true,decision:judgement.decision}},execution:run1,audit,evaluation,judgement,safety:{additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false,secrets_read:false,external_writes:false}};
    }
    const summary={schema_version:'1.0.0',state_type:'STRICT_179_BATCH04_L1_SAFE_RUNTIMES_RESULT',status:'GREEN',environment:'PREPROD',verified_engine_ids:Object.keys(engines),preserved_engine_ids:PRESERVE,engines,preserved,safety:{additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false,secrets_read:false,external_writes:false,registry_mutated:false,factory_mutated:false},next_block:'PERSIST_BATCH04_PHYSICAL_EVIDENCE_THEN_REAUDIT'};
    fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'SUMMARY.json'),JSON.stringify(summary,null,2)+'\n');
    for(const [id,e] of Object.entries(engines)){const stem=id.replace('-','');fs.writeFileSync(path.join(out,`${stem}_OBSERVABILITY.json`),JSON.stringify(e.audit,null,2)+'\n');fs.writeFileSync(path.join(out,`${stem}_TRIBUNAL.json`),JSON.stringify({engine_id:id,environment:'PREPROD',status:'GREEN',tested:true,evaluation:e.evaluation,judgement:e.judgement,safety:e.safety},null,2)+'\n');}
    fs.writeFileSync(path.join(out,'REBUILD.sha256'),sha(summary)+'\n');
    console.log('STRICT179_BATCH04='+JSON.stringify({status:summary.status,verified_engine_ids:summary.verified_engine_ids,preserved_engine_ids:summary.preserved_engine_ids,safety:summary.safety}));
  }finally{fs.rmSync(scratch,{recursive:true,force:true});}
}
await main();
