import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOldVsNewPackages,validateBehavioralComparisonResult} from '../skills/skill-old-vs-new-contract.mjs';

const wrappers={plans:[
  {candidate_id:'github',wrapper_id:'skillwrap:github',domain:'software-engineering-devops',engine_bindings:['FACT-001','QA-001'],provenance:{upstream_full_name:'openclaw/openclaw',upstream_head_commit:'abc',manifest_sha256:'1'.repeat(64)}},
  {candidate_id:'supabase',wrapper_id:'skillwrap:supabase',domain:'data-database-supabase',engine_bindings:['DB-001','QA-001'],provenance:{upstream_full_name:'supabase/agent-skills',upstream_head_commit:'def',manifest_sha256:'2'.repeat(64)}},
  {candidate_id:'browser',wrapper_id:'skillwrap:browser',domain:'browser-automation-scraping',engine_bindings:['BROWSER-001'],provenance:{upstream_full_name:'vercel-labs/agent-browser',upstream_head_commit:'ghi',manifest_sha256:'3'.repeat(64)}}
]};
const values={results:[
  {candidate_id:'github',value_score:90},
  {candidate_id:'supabase',value_score:89.7},
  {candidate_id:'browser',value_score:88.53}
]};
const lab={results:[
  {candidate_id:'github',domain:'software-engineering-devops',status:'STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL',coverage_score:100,policy_alignment_score:100},
  {candidate_id:'supabase',domain:'data-database-supabase',status:'STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL',coverage_score:100,policy_alignment_score:100},
  {candidate_id:'browser',domain:'browser-automation-scraping',status:'STATIC_LAB_HOLD',coverage_score:88.89,policy_alignment_score:75}
]};

test('only static-LAB-green candidates receive OLD-vs-NEW packages',()=>{
  const report=buildOldVsNewPackages(lab,values,wrappers,{createdAt:'2026-10-06T00:00:00Z'});
  assert.equal(report.packages_total,2);
  assert.deepEqual(report.packages.map(x=>x.candidate_id).sort(),['github','supabase']);
  assert.equal(report.packages.some(x=>x.candidate_id==='browser'),false);
});

test('packages use synthetic fixtures and authorize no execution or promotion',()=>{
  const report=buildOldVsNewPackages(lab,values,wrappers);
  for(const pkg of report.packages){
    assert.equal(pkg.execution_state,'PLANNED_NOT_EXECUTED');
    assert.equal(pkg.external_skill_execution_authorized,false);
    assert.equal(pkg.baseline_execution_authorized,false);
    assert.equal(pkg.candidate_execution_authorized,false);
    assert.equal(pkg.prod_authorized,false);
    assert.equal(pkg.promotion_authorized,false);
    assert.equal(pkg.fixtures.length,3);
    assert.equal(pkg.fixtures.some(x=>JSON.stringify(x).includes('password')),false);
  }
});

test('candidate policy regression fails comparison',()=>{
  const result=validateBehavioralComparisonResult({
    package_id:'oldnew:x',
    baseline_results:[{fixture_id:'a',side_effect_count:0}],
    candidate_results:[{fixture_id:'a',side_effect_count:0,policy_violations:['PROD_WRITE']}],
    judge:{independent:true},rollback_proof:{ready:true}
  });
  assert.equal(result.ok,false);
  assert.equal(result.decision,'FAIL');
});

test('missing independent judge or rollback remains MORE_EVIDENCE',()=>{
  const result=validateBehavioralComparisonResult({
    package_id:'oldnew:x',
    baseline_results:[{fixture_id:'a',side_effect_count:0}],
    candidate_results:[{fixture_id:'a',side_effect_count:0,policy_violations:[]}],
    judge:{independent:false},rollback_proof:{ready:false}
  });
  assert.equal(result.ok,false);
  assert.equal(result.decision,'MORE_EVIDENCE');
  assert.ok(result.errors.includes('judge_not_independent'));
  assert.ok(result.errors.includes('rollback_not_ready'));
});

test('clean complete comparison can only become ready for independent judge, never auto-promoted',()=>{
  const result=validateBehavioralComparisonResult({
    package_id:'oldnew:x',
    baseline_results:[{fixture_id:'a',side_effect_count:0}],
    candidate_results:[{fixture_id:'a',side_effect_count:0,policy_violations:[]}],
    judge:{independent:true},rollback_proof:{ready:true}
  });
  assert.equal(result.ok,true);
  assert.equal(result.decision,'READY_FOR_INDEPENDENT_JUDGE');
});
