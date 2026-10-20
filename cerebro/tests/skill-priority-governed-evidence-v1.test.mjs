import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyPrioritySeedRouting,buildPrioritySeedCandidateEvidence} from '../runtime/skill-priority-governed-evidence-v1.mjs';
import {buildUniversalActivationPlan} from '../runtime/universal-skill-activation-planner-v1.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
const seeds=JSON.parse(fs.readFileSync(path.join(ROOT,'registry','skill-priority-seed-sources-v1.json'),'utf8'));

function locator(seed){return `github://${seed.repository}@${seed.pinned_sha}/${seed.subpath??''}`;}
function activation(seed,root,content){
  const rel='cerebro/intake/test/SKILL.md';
  const abs=path.join(root,rel);fs.mkdirSync(path.dirname(abs),{recursive:true});fs.writeFileSync(abs,content,'utf8');
  const input={company_id:'fenix',candidate_id:`test:${seed.technical_name}`,technical_name:seed.technical_name,source_refs:[rel],inventory_complete:true,dependencies_mapped:true,reuse_checked:true,provenance_license_green:true,additional_cost_eur:0,capabilities:[{capability_id:`cap:${seed.technical_name}`,technical_name:seed.technical_name,description:content,terms:[],declared_domains:[],domain_evidence:{}}]};
  const routed=applyPrioritySeedRouting(input,locator(seed));
  const plan=buildUniversalActivationPlan(routed.activation_input);
  return {plan,routed};
}

test('every vetted P0 seed routes deterministically to its declared governed domain and produces exact safe semantic evidence',()=>{
  for(const seed of seeds.sources){
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-p0-evidence-'));
    const content=`${seed.technical_name} ${seed.semantic_probe_terms.join(' ')} safe governed PREPROD source`;
    const {plan,routed}=activation(seed,root,content);
    assert.equal(routed.applied,true,seed.technical_name);
    assert.equal(plan.status,'ACTIVATION_PLAN_READY',seed.technical_name);
    assert.deepEqual([...plan.domain_ids].sort(),[...seed.declared_domains].sort(),seed.technical_name);
    const evidence=buildPrioritySeedCandidateEvidence({activation_plan:plan,source_locator:locator(seed),repo_root:root});
    assert.equal(evidence.status,'PRIORITY_SEMANTIC_EVIDENCE_GREEN',seed.technical_name);
    assert.equal(evidence.generated_bindings,evidence.expected_bindings,seed.technical_name);
    assert.ok(evidence.generated_bindings>0,seed.technical_name);
    for(const row of evidence.candidate_evidence.semantic_bindings){
      assert.equal(row.evidence_kind,'GOVERNED_READONLY_REMOTE');
      assert.equal(row.execution_kind,'DECLARATIVE');
      assert.equal(row.action_capable,false);
      assert.equal(row.real_consumption_proven,true);
      assert.equal(row.prod_write_authorized,false);
      assert.equal(row.prod_mutation_authorized,false);
      assert.equal(row.external_skill_code_execution,false);
      assert.equal(row.trading_access,false);
      assert.equal(row.additional_cost_eur,0);
    }
  }
});

test('priority seed semantic probe fails closed when source content does not substantiate the pinned capability',()=>{
  const seed=seeds.sources[0];
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-p0-evidence-hold-'));
  const {plan}=activation(seed,root,'unrelated text with no matching governed semantic evidence');
  const evidence=buildPrioritySeedCandidateEvidence({activation_plan:plan,source_locator:locator(seed),repo_root:root});
  assert.equal(evidence.status,'PRIORITY_SOURCE_SEMANTIC_HOLD');
  assert.equal(evidence.candidate_evidence.semantic_bindings.length,0);
});

test('unlisted remote source never receives priority evidence or priority routing',()=>{
  const input={company_id:'fenix',candidate_id:'other',technical_name:'other',source_refs:['cerebro/x'],inventory_complete:true,dependencies_mapped:true,reuse_checked:true,provenance_license_green:true,additional_cost_eur:0,capabilities:[{capability_id:'other-cap',technical_name:'other',description:'other',terms:[],declared_domains:[],domain_evidence:{}}]};
  const routed=applyPrioritySeedRouting(input,'github://unknown/repo@0000000000000000000000000000000000000000/skill');
  assert.equal(routed.applied,false);
  assert.equal(routed.activation_input,input);
});
