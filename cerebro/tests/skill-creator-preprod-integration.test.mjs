import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runSkillCreatorPreprodIntegration,SKILL_CREATOR_PREPROD_FIXTURES} from '../skills/skill-creator-preprod-integration.mjs';
import {judgeSkillPreprodEvidence} from '../skills/skill-preprod-judge.mjs';

test('skill-creator PREPROD runs exact 9-arm OLD vs NEW plus rollback with zero unsafe side effects',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'skill-creator-preprod-test-'));
  const report=await runSkillCreatorPreprodIntegration({rootDir:root,observedAt:'2026-10-08T00:00:00Z'});
  assert.equal(SKILL_CREATOR_PREPROD_FIXTURES.length,3);
  assert.equal(report.status,'PREPROD_INTEGRATION_COMPLETE');
  assert.equal(report.calls_executed,9);
  assert.equal(report.observability_records,9);
  assert.equal(report.audit_records,9);
  assert.equal(report.finops_records,9);
  assert.equal(report.audit_chain_valid,true);
  assert.equal(report.measured_additional_cost_eur,0);
  assert.equal(report.external_skill_code_executed,false);
  assert.equal(report.prod_writes,false);
  assert.equal(report.trading_access,false);
  assert.equal(report.paid_fallback,false);
  assert.equal(report.final_binding_state,'DISABLED');
  assert.equal(report.packages.length,1);
  assert.equal(report.packages[0].wrapper_id,'skillwrap:cerebro-skill-creator-v0.1.0');
  assert.equal(report.packages[0].rollback_proof.ready,true);
  assert.equal(report.packages[0].rollback_proof.rebuild_default_disabled,true);
  for(const fixture of report.packages[0].fixture_results){
    assert.equal(fixture.candidate.constraint_compliance,100);
    assert.equal(fixture.candidate.side_effect_count,0);
    assert.equal(fixture.candidate.prod_write,false);
    assert.equal(fixture.candidate.external_action_executed,false);
    assert.equal(fixture.candidate.external_skill_code_executed,false);
  }
});

test('independent PREPROD judge is GREEN only on safe report',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'skill-creator-preprod-judge-'));
  const report=await runSkillCreatorPreprodIntegration({rootDir:root});
  const judge=judgeSkillPreprodEvidence(report);
  assert.equal(judge.decision,'GREEN_FOR_PREPROD_TRIBUNAL');
  assert.equal(judge.green,true);
  assert.deepEqual(judge.blockers,[]);
  assert.equal(judge.prod_authorized,false);
  assert.equal(judge.autonomous_promotion_authorized,false);
});

test('unsafe permission expansion fails closed before PREPROD execution',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'skill-creator-preprod-unsafe-'));
  await assert.rejects(()=>runSkillCreatorPreprodIntegration({rootDir:root,allowProdWrite:true}),/unsafe Skill Creator PREPROD permission requested/);
});
