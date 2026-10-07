import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CEREBRO_OBSIDIAN_WRAPPER,
  OBSIDIAN_FIXTURE_CONTRACTS,
  getObsidianWrapperProfile,
  applyObsidianCerebroWrapper,
  renderObsidianWrapperPromptContract
} from '../skills/skill-cerebro-obsidian-wrapper.mjs';

function fixture(id){return {fixture_id:id,expected_constraints:[...OBSIDIAN_FIXTURE_CONTRACTS[id]]};}

test('wrapper identity and economics remain fail-closed',()=>{
  assert.equal(CEREBRO_OBSIDIAN_WRAPPER.wrapper_id,'skillwrap:cerebro-obsidian-v0.1.0');
  assert.equal(CEREBRO_OBSIDIAN_WRAPPER.additional_cost_eur,0);
  assert.equal(CEREBRO_OBSIDIAN_WRAPPER.external_skill_code_execution,false);
  assert.equal(CEREBRO_OBSIDIAN_WRAPPER.live_obsidian_cli_execution,false);
  assert.equal(CEREBRO_OBSIDIAN_WRAPPER.canonical_knowledge_migration_authorized,false);
  assert.equal(CEREBRO_OBSIDIAN_WRAPPER.prod_authorized,false);
  assert.equal(CEREBRO_OBSIDIAN_WRAPPER.prod_write_authorized,false);
  assert.equal(CEREBRO_OBSIDIAN_WRAPPER.trading_access,false);
});

test('all three fixture contracts are exact and preserve existing knowledge',()=>{
  for(const id of Object.keys(OBSIDIAN_FIXTURE_CONTRACTS)){
    const p=getObsidianWrapperProfile(fixture(id));
    assert.equal(p.contract_exact,true);
    assert.equal(p.prod_authorized,false);
    assert.equal(p.prod_write_authorized,false);
    assert.equal(p.external_skill_code_execution,false);
    assert.ok(p.safeguards.some((line)=>/preserv|unchanged|existing/i.test(line)));
  }
});

test('contract mismatch is detected and application fails closed',()=>{
  const bad={fixture_id:'knowledge-read-search',expected_constraints:['READ_ONLY_DEFAULT']};
  const p=getObsidianWrapperProfile(bad);
  assert.equal(p.contract_exact,false);
  assert.throws(()=>applyObsidianCerebroWrapper({rawOutput:'read only',fixture:bad,domain:CEREBRO_OBSIDIAN_WRAPPER.domain,arm:'CANDIDATE_SKILL_PROXY'}),/CONTRACT_MISMATCH/);
});

test('nonmatching arm, domain or upstream does not apply wrapper',()=>{
  const f=fixture('knowledge-read-search');
  assert.equal(applyObsidianCerebroWrapper({rawOutput:'x',fixture:f,domain:'other',arm:'CANDIDATE_SKILL_PROXY'}).applied,false);
  assert.equal(applyObsidianCerebroWrapper({rawOutput:'x',fixture:f,domain:CEREBRO_OBSIDIAN_WRAPPER.domain,arm:'BASELINE'}).applied,false);
  assert.equal(applyObsidianCerebroWrapper({rawOutput:'x',fixture:f,domain:CEREBRO_OBSIDIAN_WRAPPER.domain,arm:'CANDIDATE_SKILL_PROXY',upstreamFullName:'evil/repo'}).applied,false);
});

test('safe read/search advisory is wrapped without leaking raw CLI command',()=>{
  const raw='Use obsidian read path="Research/Alpha.md" and obsidian search query="mortgage".';
  const r=applyObsidianCerebroWrapper({rawOutput:raw,fixture:fixture('knowledge-read-search'),domain:CEREBRO_OBSIDIAN_WRAPPER.domain,arm:'CANDIDATE_SKILL_PROXY'});
  assert.equal(r.applied,true);
  assert.equal(r.policy_conflict,false);
  assert.equal(r.text.includes(raw),false);
  assert.match(r.text,/Read\/search semantics only/i);
  assert.equal(r.external_skill_code_execution,false);
  assert.equal(r.live_obsidian_cli_execution,false);
  assert.equal(r.prod_authorized,false);
});

test('eval and delete requests are conflicts and never become executable output',()=>{
  for(const raw of ['obsidian eval "app.vault.getFiles()"','obsidian delete path="Critical.md"']){
    const r=applyObsidianCerebroWrapper({rawOutput:raw,fixture:fixture('knowledge-change-safety'),domain:CEREBRO_OBSIDIAN_WRAPPER.domain,arm:'CANDIDATE_SKILL_PROXY'});
    assert.equal(r.policy_conflict,true);
    assert.equal(r.text.includes(raw),false);
    assert.equal(r.external_skill_code_execution,false);
    assert.equal(r.prod_write_authorized,false);
  }
});

test('link-analysis mutation is rejected',()=>{
  const raw='obsidian property:set path="A.md" name="status" value="done"';
  const r=applyObsidianCerebroWrapper({rawOutput:raw,fixture:fixture('knowledge-link-analysis'),domain:CEREBRO_OBSIDIAN_WRAPPER.domain,arm:'CANDIDATE_SKILL_PROXY'});
  assert.equal(r.policy_conflict,true);
  assert.equal(r.text.includes(raw),false);
});

test('dry-run change plan is allowed as advisory but applying now is rejected',()=>{
  const f=fixture('knowledge-change-safety');
  const safe=applyObsidianCerebroWrapper({rawOutput:'Draft a dry-run plan for changing a synthetic note; include backup, rollback and OLD-vs-NEW evidence. Do not apply.',fixture:f,domain:CEREBRO_OBSIDIAN_WRAPPER.domain,arm:'CANDIDATE_SKILL_PROXY'});
  assert.equal(safe.policy_conflict,false);
  const unsafe=applyObsidianCerebroWrapper({rawOutput:'Apply the note changes now automatically.',fixture:f,domain:CEREBRO_OBSIDIAN_WRAPPER.domain,arm:'CANDIDATE_SKILL_PROXY'});
  assert.equal(unsafe.policy_conflict,true);
});

test('rendered contract explicitly subordinates upstream and blocks migration',()=>{
  const text=renderObsidianWrapperPromptContract(fixture('knowledge-change-safety'));
  assert.match(text,/untrusted subordinate guidance/i);
  assert.match(text,/no migration|do not bulk-migrate|no.*migration/i);
  assert.match(text,/rollback/i);
  assert.match(text,/separate authorization/i);
});
