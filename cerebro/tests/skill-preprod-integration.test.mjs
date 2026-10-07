import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runSkillPreprodIntegration} from '../skills/skill-preprod-integration.mjs';
import {judgeSkillPreprodEvidence} from '../skills/skill-preprod-judge.mjs';
import {runSkillPreprodTribunal} from '../skills/skill-preprod-tribunal.mjs';

const registry={capability_id:'cap:skill-supply-chain',owner_engine_id:'FACT-001',frozen_behavioral_evidence_head:'135fc29a9b41d7257381c08efea49015db1e71d9'};
const contract={contract_id:'contract:skill-supply-chain-v0',owner_engine_id:'FACT-001',invariants:{prod_write_default:false,external_skill_code_execution_default:false,paid_fallback_default:false}};
function tmp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-skill-preprod-test-'));}

test('PREPROD runtime integration executes OLD/NEW, physical rollback and disabled rebuild at zero cost',async()=>{
  const root=tmp();
  try{
    const report=await runSkillPreprodIntegration({rootDir:root,observedAt:'2026-10-07T00:00:00.000Z'});
    assert.equal(report.status,'PREPROD_INTEGRATION_COMPLETE');
    assert.equal(report.execution_mode,'PREPROD_REAL_CEREBRO_RUNTIME_BINDING_INTEGRATION');
    assert.equal(report.environment,'PREPROD');
    assert.equal(report.runtime_integration_real,true);
    assert.equal(report.calls_executed,18);
    assert.equal(report.packages.length,2);
    assert.equal(report.measured_additional_cost_eur,0);
    assert.equal(report.audit_chain_valid,true);
    assert.equal(report.prod_data_used,false);
    assert.equal(report.customer_data_used,false);
    assert.equal(report.external_skill_code_executed,false);
    assert.equal(report.prod_writes,false);
    assert.equal(report.trading_access,false);
    assert.equal(report.prod_authorized,false);
    for(const pkg of report.packages){
      assert.equal(pkg.status,'PREPROD_PACKAGE_COMPLETE');
      assert.equal(pkg.rollback_proof.ready,true);
      assert.equal(pkg.rollback_proof.rebuild_default_disabled,true);
      assert.equal(pkg.fixture_results.length,3);
      for(const fixture of pkg.fixture_results){
        assert.equal(fixture.candidate.constraint_compliance,100);
        assert.equal(fixture.candidate.side_effect_count,0);
        assert.equal(fixture.candidate.prod_write,false);
        assert.equal(fixture.candidate.external_action_executed,false);
      }
    }
    const judge=judgeSkillPreprodEvidence(report);
    assert.equal(judge.decision,'GREEN_FOR_PREPROD_TRIBUNAL');
    const tribunal=runSkillPreprodTribunal({preprod:report,judge,registry,contract});
    assert.equal(tribunal.decision,'GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW');
    assert.equal(tribunal.human_required,'HIGH_RISK');
    assert.equal(tribunal.prod_authorized,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('PREPROD harness fails closed for PROD, cost, data, writes, external skill code and Trading',async()=>{
  const cases=[
    {environment:'PROD'},
    {additionalCostEur:0.01},
    {allowProdData:true},
    {allowCustomerData:true},
    {allowProdWrite:true},
    {allowExternalSkillCode:true},
    {allowTrading:true}
  ];
  for(const options of cases){
    const root=tmp();
    try{await assert.rejects(()=>runSkillPreprodIntegration({rootDir:root,...options}));}
    finally{fs.rmSync(root,{recursive:true,force:true});}
  }
});

test('PREPROD judge and tribunal fail closed on rollback or cost tampering',async()=>{
  const root=tmp();
  try{
    const report=await runSkillPreprodIntegration({rootDir:root});
    const badRollback=structuredClone(report);
    badRollback.packages[0].rollback_proof.ready=false;
    const judge=judgeSkillPreprodEvidence(badRollback);
    assert.equal(judge.green,false);
    assert.ok(judge.blockers.includes('ONE_OR_MORE_PACKAGES_NOT_GREEN'));

    const cleanJudge=judgeSkillPreprodEvidence(report);
    const badCost=structuredClone(report);
    badCost.measured_additional_cost_eur=0.01;
    const tribunal=runSkillPreprodTribunal({preprod:badCost,judge:cleanJudge,registry,contract});
    assert.equal(tribunal.green,false);
    assert.ok(tribunal.blockers.includes('COST_NOT_ZERO'));
    assert.equal(tribunal.prod_authorized,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
