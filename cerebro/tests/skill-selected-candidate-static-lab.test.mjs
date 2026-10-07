import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {evaluateSelectedManifest} from '../skills/skill-selected-candidate-static-lab.mjs';

const safeManifest=`---\nname: skill-creator\ndescription: test\n---\n# Skill Creator\n1. Establish the contract with a trigger, expected outcome, and persistence target.\n2. Model-discoverable, Manual-only, Direct tool command. Use disable-model-invocation, command-dispatch, command-tool, command-arg-mode.\n3. Put shared procedure in SKILL.md; details in references/, scripts/, assets/, agents/ and keep a direct pointer.\n4. Use a pending proposal and keep live files unchanged until apply. Repository-owned sources use the normal edit and review workflow.\n5. Run quick_validate.py and every focused test; done when frontmatter passes and resource pointers resolve.\n`;
const hash=(value)=>createHash('sha256').update(value).digest('hex');
function profile(overrides={}){
  return {
    candidate_id:'c1',declared_name:'skill-creator',upstream_full_name:'openclaw/openclaw',upstream_head_commit:'a'.repeat(40),manifest_path:'skills/skill-creator/SKILL.md',manifest_sha256:hash(safeManifest),
    prelab_state:'STATIC_PRELAB_READY_CODE_BUNDLE_REVIEWED_TEST_ONLY',test_only_review_status:'GREEN_FOR_WRAPPER_PLANNING_ONLY',value_score:68.12,minimum_coverage_score:90,minimum_case_score:75,
    required_safeguards:[
      {id:'UNCHANGED',any_of:['keep live files unchanged until apply']},
      {id:'REVIEW',any_of:['normal edit and review workflow']},
      {id:'VALIDATE',any_of:['quick_validate.py']}
    ],
    forbidden_text_patterns:[{id:'PROD_WRITE',pattern:'(?:deploy|write|push).{0,30}(?:prod|production)',flags:'i'}],
    test_cases:[
      {case_id:'contract',term_groups:[['establish the contract'],['trigger'],['expected outcome'],['persistence target']]},
      {case_id:'invocation',term_groups:[['model-discoverable'],['manual-only'],['direct tool command'],['disable-model-invocation'],['command-dispatch'],['command-tool'],['command-arg-mode']]},
      {case_id:'structure',term_groups:[['skill.md'],['references/'],['scripts/'],['assets/'],['agents/'],['direct pointer']]},
      {case_id:'persist',term_groups:[['pending proposal'],['live files unchanged until apply'],['normal edit and review workflow']]},
      {case_id:'validate',term_groups:[['quick_validate.py'],['focused test'],['frontmatter passes'],['resource pointers resolve']]}
    ],
    external_code_execution_authorized:false,sandbox_authorized:false,install_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,
    ...overrides
  };
}

test('exact safe skill-creator manifest becomes GREEN for normalized wrapper design only',()=>{
  const report=evaluateSelectedManifest(profile(),safeManifest,{observedAt:'2026-10-07T00:00:00Z'});
  assert.equal(report.status,'STATIC_LAB_GREEN_FOR_NORMALIZED_WRAPPER_DESIGN');
  assert.equal(report.provenance_exact,true);
  assert.equal(report.coverage_score,100);
  assert.deepEqual(report.blockers,[]);
  assert.equal(report.external_code_executed,false);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.additional_cost_eur,0);
});

test('provenance mismatch blocks admission',()=>{
  const report=evaluateSelectedManifest(profile({manifest_sha256:'b'.repeat(64)}),safeManifest);
  assert.equal(report.status,'STATIC_LAB_HOLD');
  assert.ok(report.blockers.includes('PROVENANCE_HASH_MISMATCH'));
});

test('missing live-file safeguard remains fail-closed',()=>{
  const modified=safeManifest.replace('keep live files unchanged until apply','change live files immediately');
  const report=evaluateSelectedManifest(profile({manifest_sha256:hash(modified)}),modified);
  assert.equal(report.status,'STATIC_LAB_HOLD');
  assert.ok(report.blockers.some((x)=>x.startsWith('SAFEGUARD_MISSING:')));
});

test('explicit production write text is blocked',()=>{
  const modified=`${safeManifest}\nPush directly to production.\n`;
  const report=evaluateSelectedManifest(profile({manifest_sha256:hash(modified)}),modified);
  assert.equal(report.status,'STATIC_LAB_HOLD');
  assert.ok(report.blockers.includes('FORBIDDEN_TEXT_PRESENT'));
});

test('profile cannot authorize external execution, sandbox, install or PROD',()=>{
  const report=evaluateSelectedManifest(profile({external_code_execution_authorized:true,sandbox_authorized:true,install_authorized:true,prod_authorized:true}),safeManifest);
  assert.equal(report.status,'STATIC_LAB_HOLD');
  assert.ok(report.blockers.includes('EXTERNAL_CODE_EXECUTION_MUST_BE_FALSE'));
  assert.ok(report.blockers.includes('SANDBOX_MUST_BE_FALSE'));
  assert.ok(report.blockers.includes('INSTALL_MUST_BE_FALSE'));
  assert.ok(report.blockers.includes('PROD_MUST_BE_FALSE'));
});
