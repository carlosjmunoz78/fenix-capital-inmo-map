import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runEngineeringSpecialistsEvidenceSweep,evaluateArchitectSpecialist,evaluatePerformanceSpecialist} from '../runtime/cerebro-engineering-specializations-evidence-sweep-v1.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT=path.resolve(here,'../..');

test('all ten engineering specializations become FULL_SAFE_PREPROD without profession engines',async()=>{
  const perfRoot=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-engineering-sweep-'));
  try{
    const report=await runEngineeringSpecialistsEvidenceSweep({repo_root:REPO_ROOT,performance_root:perfRoot});
    assert.equal(report.status,'ALL_ENGINEERING_SPECIALISTS_FULL_SAFE_PREPROD');
    assert.deepEqual(report.expected_aliases,['ARQUITECTO','CODE','SYSTEMS','MATH','DATA','SECURITY','QA','INTEGRATOR','TECH_SCOUT','PERFORMANCE']);
    assert.equal(report.results.length,10);
    assert.deepEqual(report.missing_aliases,[]);
    assert.deepEqual(report.hold_aliases,[]);
    assert.equal(report.single_transversal_safe_engineering_profile,true);
    assert.equal(report.new_engine_required,false);
    for(const specialist of report.results){
      assert.equal(specialist.status,'FULL_SAFE_PREPROD',specialist.alias);
      assert.equal(specialist.prod_authorized,false,specialist.alias);
      assert.equal(specialist.prod_write_authorized,false,specialist.alias);
      assert.equal(specialist.trading_access,false,specialist.alias);
      assert.equal(specialist.additional_cost_eur,0,specialist.alias);
    }
    const architect=report.results.find((x)=>x.alias==='ARQUITECTO');
    assert.equal(architect.checks.rollback_rebuild_verified,true);
    assert.equal(architect.checks.old_vs_new_evidenced,true);
    assert.equal(architect.checks.canonical_contracts_present,true);
    const performance=report.results.find((x)=>x.alias==='PERFORMANCE');
    assert.equal(performance.checks.bounded_parallelism,true);
    assert.equal(performance.checks.durable_idempotent_rerun,true);
    assert.equal(performance.checks.preparation_cache_reused,true);
    assert.ok(performance.evidence.max_active_workers>=5);
  } finally { fs.rmSync(perfRoot,{recursive:true,force:true}); }
});

test('architect specialist fails closed if PROD authority appears or rollback evidence disappears',()=>{
  const state=JSON.parse(fs.readFileSync(path.join(REPO_ROOT,'cerebro/registry/universal-skill-activation-factory-v1.state.json'),'utf8'));
  const unsafe=structuredClone(state);
  unsafe.authority.prod_authorized=true;
  unsafe.b19.rollback_green=false;
  const result=evaluateArchitectSpecialist({repo_root:REPO_ROOT,state:unsafe});
  assert.equal(result.status,'SPECIALIST_HOLD');
  assert.equal(result.checks.no_prod_authority,false);
  assert.equal(result.checks.rollback_rebuild_verified,false);
});

test('performance specialist measures real bounded batch behavior and keeps validation enabled',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-performance-evidence-'));
  try{
    const result=await evaluatePerformanceSpecialist({root_dir:root});
    assert.equal(result.status,'FULL_SAFE_PREPROD');
    assert.equal(result.checks.latency_measured,true);
    assert.equal(result.checks.binding_validation_preserved,true);
    assert.equal(result.checks.zero_cost,true);
    assert.equal(result.checks.no_prod_or_trading,true);
    assert.equal(result.evidence.rerun_metrics.idempotent_rerun_rate,1);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});

test('sweep runtime contains no path to profession-specific engine creation or authority expansion',()=>{
  const runtime=fs.readFileSync(path.join(REPO_ROOT,'cerebro/runtime/cerebro-engineering-specializations-evidence-sweep-v1.mjs'),'utf8');
  assert.equal(/prod_authorized\s*:\s*true/.test(runtime),false);
  assert.equal(/prod_write_authorized\s*:\s*true/.test(runtime),false);
  assert.equal(/auto_merge_authorized\s*:\s*true/.test(runtime),false);
  assert.equal(/trading_access\s*:\s*true/.test(runtime),false);
  assert.equal(/new_engine_required\s*:\s*true/.test(runtime),false);
  assert.equal(runtime.includes('child_process'),false);
  assert.equal(runtime.includes('npm install'),false);
});
