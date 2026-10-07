import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildObsidianOldVsNew} from '../skills/skill-obsidian-old-vs-new.mjs';

const profile=JSON.parse(fs.readFileSync(new URL('../skills/skill-obsidian-behavioral-lab.v0.json',import.meta.url),'utf8'));

function staticLab(overrides={}){
  return {results:[{candidate_id:profile.candidate_id,status:'STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL',upstream_head_commit:profile.upstream_head_commit,manifest_sha256:profile.manifest_sha256,coverage_score:88.89,policy_alignment_score:95,hard_blocks:[],...overrides}]};
}
function wrapperReview(overrides={}){
  return {status:'GREEN_FOR_SYNTHETIC_BEHAVIORAL_REVIEW',target:{candidate_id:profile.candidate_id,manifest_sha256:profile.manifest_sha256},...overrides};
}

test('builds exactly one fail-closed three-fixture OLD-vs-NEW package',()=>{
  const r=buildObsidianOldVsNew(staticLab(),wrapperReview(),profile,{createdAt:'2026-10-08T00:00:00.000Z'});
  assert.equal(r.status,'READY_FOR_SYNTHETIC_BEHAVIORAL_GATE');
  assert.equal(r.packages_total,1);
  assert.equal(r.packages[0].fixtures.length,3);
  assert.deepEqual(r.packages[0].fixtures.map(x=>x.fixture_id),['knowledge-read-search','knowledge-link-analysis','knowledge-change-safety']);
  assert.equal(r.external_skill_execution_authorized,false);
  assert.equal(r.live_obsidian_cli_execution_authorized,false);
  assert.equal(r.filesystem_write_authorized,false);
  assert.equal(r.canonical_knowledge_migration_authorized,false);
  assert.equal(r.prod_authorized,false);
  assert.equal(r.prod_write_authorized,false);
  assert.equal(r.trading_access,false);
  assert.equal(r.additional_cost_target_eur,0);
});

test('static or wrapper provenance drift fails closed',()=>{
  assert.equal(buildObsidianOldVsNew(staticLab({manifest_sha256:'0'.repeat(64)}),wrapperReview(),profile).status,'HOLD');
  assert.equal(buildObsidianOldVsNew(staticLab(),wrapperReview({target:{candidate_id:'wrong',manifest_sha256:profile.manifest_sha256}}),profile).status,'HOLD');
});

test('profile permission expansion fails closed',()=>{
  const unsafe={...profile,filesystem_write_authorized:true};
  const r=buildObsidianOldVsNew(staticLab(),wrapperReview(),unsafe);
  assert.equal(r.status,'HOLD');
  assert.ok(r.blockers.includes('PROFILE_NOT_FAIL_CLOSED'));
});
