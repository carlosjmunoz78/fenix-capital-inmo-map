import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runAdmittedSkillLearningIngress} from '../skills/skill-full-adoption-learning-ingress-v1.mjs';

const registry=()=>JSON.parse(fs.readFileSync(new URL('../registry/skill-full-adoption-v1.json',import.meta.url),'utf8'));
const fixedObservedAt='2026-10-15T20:00:00.000Z';
const UNADMITTED_SYNTHETIC_CANDIDATE='synthetic-test:unadmitted-skill-v1';

function event({candidate_id,event_id,event_type='SKILL_CANDIDATE_STATIC_LAB_GREEN',severity='INFO',bindings=['FACT-001'],risk_class}){
  return {
    event_id,event_type,severity,company_id:'GLOBAL_ONLY',engine_id:'FACT-001',environment:'PREPROD_CANDIDATE',version:'0.1.0',
    candidate_id,target_engine_bindings:bindings,reason:'TEST_GOVERNED_SKILL_LEARNING',
    evidence_refs:[`candidate:${candidate_id}`,`test:${event_id}`],payload:{domain:'agent-ai-orchestration'},
    ...(risk_class?{risk_class}:{}),publish_authorized:false,prod_authorized:false
  };
}

function tmpLedger(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-admitted-learning-'));
  return {dir,file:path.join(dir,'learning-ledger.v8')};
}

function run({events,ledger,kill_switch=false}){
  return runAdmittedSkillLearningIngress({
    registry:registry(),event_report:{schema_version:'test',events},ledger_file:ledger,preprod_version:'skills-full-v1-test',
    policy_pass:true,security_pass:true,local_persistence_enabled:true,kill_switch,observed_at:fixedObservedAt
  });
}

test('admitted low-risk skill evidence persists once and replay is idempotent',()=>{
  const tmp=tmpLedger();
  try{
    const e=event({candidate_id:'lobehub-skills:950cf07380d1daa6de69',event_id:'evt:test:skill-creator-green'});
    const first=run({events:[e],ledger:tmp.file});
    assert.equal(first.status,'GREEN_PERSISTENT_PREPROD_LEARNING');
    assert.equal(first.admitted_events_total,1);
    assert.equal(first.persisted_total,1);
    assert.equal(first.duplicates_total,0);
    assert.equal(first.ledger_operation_count,1);
    assert.equal(first.persistence_scope,'LOCAL_PREPROD_LRN_LEDGER_ONLY');
    assert.equal(first.supabase_required,false);
    assert.equal(first.prod_write_authorized,false);
    assert.equal(first.trading_access,false);
    assert.equal(first.additional_cost_eur,0);

    const replay=run({events:[e],ledger:tmp.file});
    assert.equal(replay.status,'GREEN_PERSISTENT_PREPROD_LEARNING');
    assert.equal(replay.persisted_total,0);
    assert.equal(replay.duplicates_total,1);
    assert.equal(replay.ledger_operation_count,1);
  }finally{fs.rmSync(tmp.dir,{recursive:true,force:true});}
});

test('canonical HIGH_RISK admitted evidence is held and never persisted',()=>{
  const tmp=tmpLedger();
  try{
    const e=event({
      candidate_id:'mcpservers-agent-skills:4c2b2478f8fe3bed14df',event_id:'evt:test:database-high-risk',
      event_type:'SECURITY_ADVISORY',severity:'HIGH',risk_class:'HIGH',bindings:['FACT-001']
    });
    const out=run({events:[e],ledger:tmp.file});
    assert.equal(out.status,'PARTIAL_HELD');
    assert.equal(out.persisted_total,0);
    assert.equal(out.held_total,1);
    assert.deepEqual(out.human_required,['HIGH_RISK']);
    assert.equal(out.ledger_operation_count,0);
    assert.equal(out.prod_write_authorized,false);
  }finally{fs.rmSync(tmp.dir,{recursive:true,force:true});}
});

test('observed wrapper without governed admission is ignored, not promoted to learning debt',()=>{
  const tmp=tmpLedger();
  try{
    assert.equal(registry().queue.some((item)=>item.candidate_id===UNADMITTED_SYNTHETIC_CANDIDATE),false);
    const e=event({candidate_id:UNADMITTED_SYNTHETIC_CANDIDATE,event_id:'evt:test:unadmitted-static',bindings:['RSH-001','KNW-001']});
    const out=run({events:[e],ledger:tmp.file});
    assert.equal(out.status,'NO_ADMITTED_EVENTS');
    assert.equal(out.admitted_events_total,0);
    assert.equal(out.ignored_not_admitted_total,1);
    assert.equal(out.ignored[0].candidate_id,UNADMITTED_SYNTHETIC_CANDIDATE);
    assert.equal(out.ignored[0].reason,'CANDIDATE_NOT_IN_ADMITTED_FULL_QUEUE');
    assert.equal(out.persisted_total,0);
    assert.equal(fs.existsSync(tmp.file),false);
  }finally{fs.rmSync(tmp.dir,{recursive:true,force:true});}
});

test('mixed admitted and non-admitted events persist only admitted evidence',()=>{
  const tmp=tmpLedger();
  try{
    const good=event({candidate_id:'lobehub-skills:52441cd3d76607ffffab',event_id:'evt:test:github-green'});
    const ignored=event({candidate_id:UNADMITTED_SYNTHETIC_CANDIDATE,event_id:'evt:test:unadmitted-green',bindings:['RSH-001']});
    const out=run({events:[good,ignored],ledger:tmp.file});
    assert.equal(out.status,'GREEN_PERSISTENT_PREPROD_LEARNING');
    assert.equal(out.source_events_total,2);
    assert.equal(out.admitted_events_total,1);
    assert.equal(out.ignored_not_admitted_total,1);
    assert.equal(out.ignored[0].candidate_id,UNADMITTED_SYNTHETIC_CANDIDATE);
    assert.equal(out.persisted_total,1);
    assert.equal(out.ledger_operation_count,1);
  }finally{fs.rmSync(tmp.dir,{recursive:true,force:true});}
});

test('kill switch prevents persistence',()=>{
  const tmp=tmpLedger();
  try{
    const e=event({candidate_id:'lobehub-skills:950cf07380d1daa6de69',event_id:'evt:test:kill'});
    const out=runAdmittedSkillLearningIngress({
      registry:registry(),event_report:{events:[e]},ledger_file:tmp.file,preprod_version:'skills-full-v1-test',
      policy_pass:true,security_pass:true,local_persistence_enabled:true,kill_switch:true,observed_at:fixedObservedAt
    });
    assert.equal(out.status,'KILLED');
    assert.equal(out.persisted_total,0);
    assert.equal(fs.existsSync(tmp.file),false);
  }finally{fs.rmSync(tmp.dir,{recursive:true,force:true});}
});
