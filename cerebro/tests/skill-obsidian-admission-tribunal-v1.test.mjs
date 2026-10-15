import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runObsidianNormalizedWrapperReview} from '../skills/skill-obsidian-normalized-wrapper-review.mjs';
import {evaluateObsidianOldVsNew} from '../skills/skill-obsidian-old-vs-new-v1.mjs';
import {judgeObsidianAdmission} from '../skills/skill-obsidian-admission-judge-v1.mjs';
import {tribunalObsidianAdmission} from '../skills/skill-obsidian-admission-tribunal-v1.mjs';

const surface=JSON.parse(fs.readFileSync(new URL('../human-intelligence/knowledge/knowledge-surface-map.v1.json',import.meta.url),'utf8'));

function evidence(){
  const staticReview=runObsidianNormalizedWrapperReview({observedAt:'2026-10-15T00:00:00.000Z'});
  const oldVsNew=evaluateObsidianOldVsNew({knowledgeSurface:surface});
  const judge=judgeObsidianAdmission({oldVsNew,staticReview});
  return {staticReview,oldVsNew,judge};
}

test('independent judge accepts only green static plus measurable synthetic improvement',()=>{
  const {staticReview,oldVsNew,judge}=evidence();
  assert.equal(staticReview.status,'GREEN_FOR_SYNTHETIC_BEHAVIORAL_REVIEW');
  assert.equal(oldVsNew.status,'GREEN_FOR_GOVERNED_ADMISSION_REVIEW');
  assert.equal(judge.decision,'GREEN_FOR_ADMISSION_TRIBUNAL');
  assert.equal(judge.green,true);
  assert.equal(judge.admission_authorized,false);
  assert.equal(judge.execution_authorized,false);
  assert.equal(judge.prod_authorized,false);
  assert.equal(judge.additional_cost_eur,0);
});

test('tribunal admits Obsidian only to FULL debt queue and grants no execution authority',()=>{
  const {staticReview,oldVsNew,judge}=evidence();
  const tribunal=tribunalObsidianAdmission({staticReview,oldVsNew,judge});
  assert.equal(tribunal.decision,'ADMIT_TO_FULL_DEBT_QUEUE');
  assert.equal(tribunal.green,true);
  assert.equal(tribunal.admission_authorized,true);
  assert.equal(tribunal.admission_scope,'DOCUMENTED_FULL_DEBT_QUEUE_ONLY');
  assert.deepEqual(tribunal.target_engine_bindings,['RSH-001','KNW-001','TRN-001','TRNBOOT-001','RAG-001','PRV-001']);
  assert.equal(tribunal.execution_authorized,false);
  assert.equal(tribunal.install_authorized,false);
  assert.equal(tribunal.live_obsidian_cli_execution,false);
  assert.equal(tribunal.canonical_knowledge_migration_authorized,false);
  assert.equal(tribunal.prod_authorized,false);
  assert.equal(tribunal.prod_write_authorized,false);
  assert.equal(tribunal.trading_access,false);
  assert.equal(tribunal.additional_cost_eur,0);
  assert.equal(tribunal.human_required,null);
  assert.equal(tribunal.next_gate,'PREPROD_BINDING_OLD_VS_NEW_PER_RELEVANT_ENGINE');
});

test('tribunal fails closed on provenance drift',()=>{
  const {staticReview,oldVsNew,judge}=evidence();
  const bad=structuredClone(staticReview);
  bad.target.manifest_sha256='bad';
  const tribunal=tribunalObsidianAdmission({staticReview:bad,oldVsNew,judge});
  assert.equal(tribunal.decision,'HOLD');
  assert.ok(tribunal.blockers.includes('PROVENANCE_MISMATCH:manifest_sha256'));
  assert.equal(tribunal.admission_authorized,false);
});

test('judge and tribunal fail closed on authority, cost or live-execution drift',()=>{
  const {staticReview,oldVsNew}=evidence();
  for(const [field,value] of [
    ['prod_authorized',true],['prod_write_authorized',true],['trading_access',true],
    ['external_skill_code_execution',true],['live_obsidian_cli_execution',true],['additional_cost_eur',1]
  ]){
    const bad=structuredClone(oldVsNew);
    bad[field]=value;
    const judge=judgeObsidianAdmission({oldVsNew:bad,staticReview});
    assert.equal(judge.decision,'HOLD');
    const tribunal=tribunalObsidianAdmission({oldVsNew:bad,staticReview,judge});
    assert.equal(tribunal.decision,'HOLD');
    assert.equal(tribunal.admission_authorized,false);
  }
});
