import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildProdCapabilityFastLane,evaluateProdCapabilityCandidate,resolveProdSkillCapability} from '../runtime/skill-prod-capability-fastlane-v1.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const CEREBRO_ROOT=path.resolve(HERE,'..');

function load(rel){return JSON.parse(fs.readFileSync(path.join(CEREBRO_ROOT,rel),'utf8'));}

test('canonical queue exposes exactly the already proven PROD read-only canaries',()=>{
  const report=buildProdCapabilityFastLane();
  assert.equal(report.status,'GREEN_PROD_READONLY_CAPABILITY_SET');
  assert.equal(report.available_count,2);
  assert.deepEqual(report.available.map((x)=>x.technical_name).sort(),['github','skill-creator']);
  for(const row of report.available){
    assert.equal(row.status,'PROD_CAPABILITY_AVAILABLE_READONLY');
    assert.equal(row.authority.prod_capability_available_readonly,true);
    assert.equal(row.authority.prod_authorized,false);
    assert.equal(row.authority.prod_write_authorized,false);
    assert.equal(row.authority.prod_mutation_authorized,false);
    assert.equal(row.authority.external_skill_code_execution,false);
    assert.equal(row.authority.trading_access,false);
    assert.equal(row.authority.additional_cost_eur,0);
  }
});

test('resolver allows readonly advisory use only on governed target engine',()=>{
  const skillCreator='lobehub-skills:950cf07380d1daa6de69';
  const ok=resolveProdSkillCapability({candidate_id:skillCreator,engine_id:'FACT-001',requested_mode:'ANALYZE'});
  assert.equal(ok.allowed,true);
  assert.equal(ok.status,'PROD_CAPABILITY_AVAILABLE_READONLY');
  assert.equal(ok.action_authority_source,'ORIGIN_ENGINE_GOVERNED_POLICY_ONLY');
  assert.equal(ok.prod_write_authorized,false);

  const wrongEngine=resolveProdSkillCapability({candidate_id:skillCreator,engine_id:'CRM-001',requested_mode:'ANALYZE'});
  assert.equal(wrongEngine.allowed,false);
  assert.equal(wrongEngine.status,'DENY_ENGINE_BINDING_MISMATCH');

  const writeAttempt=resolveProdSkillCapability({candidate_id:skillCreator,engine_id:'FACT-001',requested_mode:'WRITE'});
  assert.equal(writeAttempt.allowed,false);
  assert.equal(writeAttempt.status,'DENY_MODE_NOT_READONLY');
});

test('FULL_SAFE_PREPROD without real PROD readonly canary remains held and does not block others',()=>{
  const report=buildProdCapabilityFastLane();
  const supabase=report.evaluated.find((x)=>x.technical_name==='supabase-postgres-best-practices');
  assert.ok(supabase);
  assert.equal(supabase.eligible,false);
  assert.ok(supabase.blockers.includes('NO_GREEN_PROD_READONLY_CANARY'));
  assert.equal(report.available_count,2);
});

test('eligibility rule is generic and fails closed on HUMAN_REQUIRED',()=>{
  const closure=load('registry/skill-creator-full-safe-preprod.v1.json');
  const base={
    candidate_id:'fixture:future-skill',alias_es:'Skill futura',technical_name:'future-skill',status:'FULL_SAFE_PREPROD',
    current_evidence:'GREEN_FUTURE_SKILL_PROD_READONLY_CANARY',current_scope:'READONLY_ADVISORY_PROVEN',human_required:null,additional_cost_eur:0
  };
  const eligible=evaluateProdCapabilityCandidate({row:base,closure});
  assert.equal(eligible.eligible,true);
  assert.equal(eligible.status,'PROD_CAPABILITY_AVAILABLE_READONLY');

  const held=evaluateProdCapabilityCandidate({row:{...base,human_required:'HIGH_RISK'},closure});
  assert.equal(held.eligible,false);
  assert.ok(held.blockers.includes('HUMAN_REQUIRED_ACTIVE'));
});
