import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runObsidianBehavioralProxy} from '../skills/skill-obsidian-behavioral-proxy-runner.mjs';
import {OBSIDIAN_FIXTURE_CONTRACTS} from '../skills/skill-cerebro-obsidian-wrapper.mjs';

const skillText='Synthetic Obsidian read/search/link guidance only.';
const skillSha=createHash('sha256').update(skillText).digest('hex');
const fixture={
  fixture_id:'knowledge-read-search',
  input:{request:'Search a synthetic vault read-only and return paths plus evidence.'},
  expected_constraints:[...OBSIDIAN_FIXTURE_CONTRACTS['knowledge-read-search']],
  rubric:{
    constraint_signal_groups:{
      READ_ONLY_DEFAULT:[{id:'read',any:['read-only','read/search semantics only']}],
      VAULT_SCOPE_EXPLICIT:[{id:'vault',any:['vault scope','synthetic vault']},{id:'path',any:['path']}],
      NO_EXTERNAL_CODE_EXECUTION:[{id:'exec',any:['do not execute','external_skill_code_execution=false']}],
      CANONICAL_KNOWLEDGE_UNCHANGED:[{id:'unchanged',any:['remain unchanged','advisory only']}]
    },
    task_signal_groups:[{id:'search',any:['search']},{id:'path',any:['path']}],
    evidence_signal_groups:[{id:'evidence',any:['evidence','path']},{id:'safe',any:['read-only','unchanged']}],
    expected_human_required:null
  }
};
const oldVsNew={packages:[{
  package_id:'oldnew:test',candidate_id:'obsidian-test',domain:'knowledge-research-training',admission_basis:'NORMALIZED_CEREBRO_WRAPPER',
  candidate:{upstream_full_name:'openclaw/openclaw',upstream_head_commit:'abc',manifest_path:'skills/obsidian/SKILL.md',manifest_sha256:skillSha},fixtures:[fixture]
}]};
const gate={allowed:true,blockers:[]};
const quotaPlan={executable:true,limits:{max_model_calls:2},planned_calls:{baseline:1,candidate:1,total:2}};
const routeAudit={selected_route:{provider_id:'mock-zero-cost'}};
const githubFetch=async()=>({ok:true,json:async()=>({encoding:'base64',content:Buffer.from(skillText).toString('base64')})});
const invokeProvider=async({prompt})=>({ok:true,provider_id:'mock-zero-cost',model:'mock',usage:{},output_sha256:createHash('sha256').update(prompt).digest('hex'),output_text:'Read-only search of the synthetic vault should return the note path and evidence. Do not mutate or execute live commands.'});

test('synthetic proxy executes paired baseline/wrapper evaluation only',async()=>{
  const r=await runObsidianBehavioralProxy({oldVsNew,gate,quotaPlan,routeAudit,githubFetch,invokeProvider,env:{}});
  assert.equal(r.status,'PROXY_COMPLETE');
  assert.equal(r.calls_executed,2);
  assert.equal(r.results[0].fixture_results.length,1);
  const arms=r.results[0].fixture_results[0].arms;
  assert.equal(arms.find(x=>x.arm==='BASELINE_PROXY').wrapper_applied,false);
  const candidate=arms.find(x=>x.arm==='CANDIDATE_SKILL_PROXY');
  assert.equal(candidate.wrapper_applied,true);
  assert.equal(candidate.wrapper_id,'skillwrap:cerebro-obsidian-v0.1.0');
  assert.equal(candidate.wrapper_external_skill_code_execution,false);
  assert.equal(candidate.wrapper_live_obsidian_cli_execution,false);
  assert.equal(candidate.wrapper_canonical_knowledge_migration_authorized,false);
  assert.equal(candidate.wrapper_prod_authorized,false);
  assert.equal(candidate.wrapper_prod_write_authorized,false);
  assert.equal(r.external_skill_code_executed,false);
  assert.equal(r.live_obsidian_cli_executed,false);
  assert.equal(r.filesystem_write_performed,false);
  assert.equal(r.canonical_knowledge_migration_performed,false);
  assert.equal(r.prod_authorized,false);
  assert.equal(r.prod_write,false);
  assert.equal(r.additional_cost_eur,0);
});

test('closed gate performs zero calls',async()=>{
  let calls=0;
  const r=await runObsidianBehavioralProxy({oldVsNew,gate:{allowed:false,blockers:['CLOSED']},quotaPlan,routeAudit,githubFetch,invokeProvider:async()=>{calls+=1;return invokeProvider({prompt:'x'});}});
  assert.equal(r.status,'BLOCKED_BY_EXECUTION_GATE');
  assert.equal(r.calls_executed,0);
  assert.equal(calls,0);
  assert.equal(r.prod_authorized,false);
});

test('wrong target package fails before provider execution',async()=>{
  let calls=0;
  const bad={packages:[{...oldVsNew.packages[0],domain:'other'}]};
  const r=await runObsidianBehavioralProxy({oldVsNew:bad,gate,quotaPlan,routeAudit,githubFetch,invokeProvider:async()=>{calls+=1;return invokeProvider({prompt:'x'});}});
  assert.equal(r.status,'BLOCKED_WRONG_TARGET_PACKAGE');
  assert.equal(calls,0);
});
