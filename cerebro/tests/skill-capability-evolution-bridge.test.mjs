import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildSkillCapabilityEvolutionBridge} from '../skills/skill-capability-evolution-bridge.mjs';

function root(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-skill-hook-'));}
function subscribers(){return {subscribers:[
  {company_id:'fenix',environment:'PREPROD',version:'0.1.0',enabled:true,prod_authorized:false,trading_access:false},
  {company_id:'prod-tenant',environment:'PROD',version:'0.1.0',enabled:true,prod_authorized:true,trading_access:false},
  {company_id:'disabled',environment:'PREPROD',version:'0.1.0',enabled:false,prod_authorized:false,trading_access:false}
]};}
function wrappers(bindings=['MKT-001','SEO-001','NOT-REAL']){return {plans:[{
  wrapper_id:'skillwrap:abc',status:'WRAPPER_PLAN_ONLY',enabled:false,execution_authorized:false,install_authorized:false,prod_authorized:false,
  candidate_id:'video-audit-skill',domain:'marketing',engine_bindings:bindings,
  provenance:{upstream_head_commit:'1234567890abcdef1234567890abcdef12345678'},
  quality:{bundle_static_flags:[]}
}]};}
const engines={engine_ids:['MKT-001','SEO-001','FACT-001','LRN-001']};

test('automatic bridge fans admitted skill to safe OLD vs NEW plans for known bindings only',()=>{
  const dir=root();try{
    const out=buildSkillCapabilityEvolutionBridge({wrappers:wrappers(),subscribers:subscribers(),engineRegistry:engines,registryFile:path.join(dir,'registry.v8')});
    assert.equal(out.environment,'PREPROD');
    assert.equal(out.execution_mode,'AUTOMATIC_SAFE_PLANNING_ONLY');
    assert.equal(out.tenants_processed,1);
    assert.equal(out.admitted_wrappers_processed,1);
    assert.equal(out.old_vs_new_experiments_ready,2);
    assert.equal(out.capability_gaps,0);
    assert.equal(out.unknown_engine_bindings_rejected,1);
    assert.deepEqual(out.results[0].accepted_engine_bindings,['MKT-001','SEO-001']);
    assert.deepEqual(out.results[0].rejected_unknown_engine_bindings,['NOT-REAL']);
    assert.deepEqual(out.results[0].plans.map((x)=>x.engine_id).sort(),['MKT-001','SEO-001']);
    assert.equal(out.behavior_execution_authorized,false);
    assert.equal(out.factory_create_authorized,false);
    assert.equal(out.prod_authorized,false);
    assert.equal(out.additional_cost_eur,0);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('candidate with no valid existing binding becomes FACT-001 gap review, never direct engine creation',()=>{
  const dir=root();try{
    const out=buildSkillCapabilityEvolutionBridge({wrappers:wrappers([]),subscribers:subscribers(),engineRegistry:engines,registryFile:path.join(dir,'registry.v8')});
    assert.equal(out.old_vs_new_experiments_ready,0);
    assert.equal(out.capability_gaps,1);
    assert.equal(out.results[0].impact.factory_action,'FACT001_REGISTRY_CANDIDATE_REQUIRED');
    assert.equal(out.results[0].impact.create_new_engine_authorized,false);
    assert.equal(out.results[0].next_gate,'FACT001_CAPABILITY_GAP_REVIEW');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('unsafe or already-enabled wrappers are not admitted by automatic hook',()=>{
  const dir=root();try{
    const w=wrappers();w.plans[0].execution_authorized=true;
    const out=buildSkillCapabilityEvolutionBridge({wrappers:w,subscribers:subscribers(),engineRegistry:engines,registryFile:path.join(dir,'registry.v8')});
    assert.equal(out.admitted_wrappers_processed,0);
    assert.equal(out.old_vs_new_experiments_ready,0);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('same admitted skill/version is idempotent across repeated bridge calls',()=>{
  const dir=root();try{
    const file=path.join(dir,'registry.v8');
    const first=buildSkillCapabilityEvolutionBridge({wrappers:wrappers(['MKT-001']),subscribers:subscribers(),engineRegistry:engines,registryFile:file});
    const second=buildSkillCapabilityEvolutionBridge({wrappers:wrappers(['MKT-001']),subscribers:subscribers(),engineRegistry:engines,registryFile:file});
    assert.equal(first.results[0].registration.accepted,true);
    assert.equal(second.results[0].registration.duplicate,true);
    assert.equal(second.old_vs_new_experiments_ready,1);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
