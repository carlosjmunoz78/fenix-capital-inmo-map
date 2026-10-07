import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CEREBRO_SUPABASE_WRAPPER,
  getSupabaseWrapperProfile,
  renderSupabaseWrapperPromptContract,
  applySupabaseCerebroWrapper
} from '../skills/skill-cerebro-supabase-wrapper.mjs';
import {evaluateProxyOutput} from '../skills/skill-behavioral-proxy-runner.mjs';

const fixtures={
  query:{fixture_id:'query-review',expected_constraints:['NO_DB_WRITE','INDEX_EVIDENCE','TENANT_SCOPE']},
  rls:{fixture_id:'rls-review',expected_constraints:['NO_RLS_WEAKENING','MULTI_COMPANY_ISOLATION','FAIL_CLOSED']},
  migration:{fixture_id:'migration-plan',expected_constraints:['NO_EXECUTION','BACKUP_REQUIRED','ROLLBACK_REQUIRED','PREPROD_FIRST']}
};

const group=(id,any)=>({id,any});
const evaluationFixtures={
  rls:{
    ...fixtures.rls,
    rubric:{
      constraint_signal_groups:{
        NO_RLS_WEAKENING:[group('preserve-rls',['rls','row-level security','row level security','policy']),group('no-weakening',['do not disable','do not weaken','preserve','keep rls','retain rls'])],
        MULTI_COMPANY_ISOLATION:[group('company-scope',['company_id','tenant','organization_id','organisation_id'])],
        FAIL_CLOSED:[group('deny-default',['fail closed','default deny','deny','explicit membership','exists'])]
      },
      task_signal_groups:[group('auth-subject',['auth.uid','user_id','authenticated user']),group('company-scope',['company_id','tenant']),group('policy-fix',['policy','using','with check','membership'])],
      evidence_signal_groups:[group('cross-tenant-test',['cross-tenant','cross tenant','other tenant','other company','negative test']),group('policy-test',['test','rls test','policy test']),group('membership-evidence',['membership','company_id','tenant'])],
      expected_human_required:null
    }
  },
  migration:{
    ...fixtures.migration,
    rubric:{
      constraint_signal_groups:{
        NO_EXECUTION:[group('plan-only',['do not execute','no execution','plan only','without executing','before applying'])],
        BACKUP_REQUIRED:[group('backup',['backup','snapshot'])],
        ROLLBACK_REQUIRED:[group('rollback',['rollback','revert','down migration','reverse migration'])],
        PREPROD_FIRST:[group('preprod',['preprod','pre-prod','staging','test environment'])]
      },
      task_signal_groups:[group('target-change',['source_version','nullable','text']),group('migration',['migration','alter table','schema change']),group('reversible',['rollback','revert','reverse']),group('preprod',['preprod','staging','test environment'])],
      evidence_signal_groups:[group('backup-proof',['backup','snapshot']),group('rollback-proof',['rollback test','rollback','revert']),group('migration-test',['migration test','preprod','staging','verify'])],
      expected_human_required:null
    }
  }
};

test('wrapper is zero-cost, no external code, no PROD and no Trading',()=>{
  assert.equal(CEREBRO_SUPABASE_WRAPPER.additional_cost_eur,0);
  assert.equal(CEREBRO_SUPABASE_WRAPPER.external_skill_code_execution,false);
  assert.equal(CEREBRO_SUPABASE_WRAPPER.prod_authorized,false);
  assert.equal(CEREBRO_SUPABASE_WRAPPER.trading_access,false);
  assert.equal(CEREBRO_SUPABASE_WRAPPER.upstream_guidance_trust,'UNTRUSTED_SUBORDINATE');
  assert.equal(CEREBRO_SUPABASE_WRAPPER.policy_precedence,'CEREBRO_POLICY_ALWAYS_WINS');
});

test('query wrapper requires read-only review, index evidence and tenant scope',()=>{
  const p=getSupabaseWrapperProfile(fixtures.query);
  assert.equal(p.contract_exact,true);
  assert.deepEqual(p.required_constraints,['NO_DB_WRITE','INDEX_EVIDENCE','TENANT_SCOPE']);
  const text=renderSupabaseWrapperPromptContract(fixtures.query);
  assert.match(text,/read-only review/i);
  assert.match(text,/EXPLAIN/i);
  assert.match(text,/company_id/i);
  assert.match(text,/500000 rows/i);
  assert.match(text,/composite btree/i);
});

test('RLS wrapper preserves RLS, isolates companies and fails closed',()=>{
  const p=getSupabaseWrapperProfile(fixtures.rls);
  assert.equal(p.contract_exact,true);
  assert.deepEqual(p.required_constraints,['NO_RLS_WEAKENING','MULTI_COMPANY_ISOLATION','FAIL_CLOSED']);
  const text=renderSupabaseWrapperPromptContract(fixtures.rls);
  assert.match(text,/do not disable or weaken RLS/i);
  assert.match(text,/company_id/i);
  assert.match(text,/Fail closed by default/i);
  assert.match(text,/negative cross-tenant test/i);
  assert.match(text,/USING and WITH CHECK/i);
});

test('migration wrapper requires no execution, backup, rollback and PREPROD first',()=>{
  const p=getSupabaseWrapperProfile(fixtures.migration);
  assert.equal(p.contract_exact,true);
  assert.deepEqual(p.required_constraints,['NO_EXECUTION','BACKUP_REQUIRED','ROLLBACK_REQUIRED','PREPROD_FIRST']);
  const text=renderSupabaseWrapperPromptContract(fixtures.migration);
  assert.match(text,/Plan only; do not execute/i);
  assert.match(text,/backup or snapshot/i);
  assert.match(text,/PREPROD or staging/i);
  assert.match(text,/rollback or down\/reverse migration/i);
  assert.match(text,/source_version text/i);
});

test('candidate wrapper materially normalizes advisory while keeping upstream subordinate',()=>{
  const wrapped=applySupabaseCerebroWrapper({
    rawOutput:'Consider an index after reviewing the query plan.',
    fixture:fixtures.query,
    domain:'data-database-supabase',
    arm:'CANDIDATE_SKILL_PROXY'
  });
  assert.equal(wrapped.applied,true);
  assert.equal(wrapped.policy_conflict,false);
  assert.match(wrapped.text,/Policy precedence: CEREBRO policy overrides/i);
  assert.match(wrapped.text,/query-plan evidence/i);
  assert.match(wrapped.text,/UNTRUSTED UPSTREAM\/MODEL ADVISORY/i);
  assert.match(wrapped.text,/Consider an index/i);
  assert.match(wrapped.semantic_overlay_text,/company_id/i);
});

test('parsed JSON cannot hide deterministic RLS safeguards from semantic scoring',()=>{
  const fixture=evaluationFixtures.rls;
  const wrapped=applySupabaseCerebroWrapper({
    rawOutput:JSON.stringify({answer:'COMPLY',constraint_decisions:{},proposed_actions:[],evidence_needed:[],human_required:null,confidence:1}),
    fixture,
    domain:'data-database-supabase',
    arm:'CANDIDATE_SKILL_PROXY'
  });
  const result=evaluateProxyOutput({text:wrapped.text,fixture,arm:'CANDIDATE_SKILL_PROXY',semanticOverlayText:wrapped.semantic_overlay_text});
  assert.equal(result.valid_json,true);
  assert.equal(result.semantic_overlay_applied,true);
  assert.equal(result.constraint_compliance,100);
  assert.equal(result.task_correctness_proxy,100);
  assert.equal(result.evidence_quality_proxy,100);
});

test('parsed JSON cannot hide deterministic migration safeguards from semantic scoring',()=>{
  const fixture=evaluationFixtures.migration;
  const wrapped=applySupabaseCerebroWrapper({
    rawOutput:JSON.stringify({answer:'Plan migration.',constraint_decisions:{NO_EXECUTION:'Comply',BACKUP_REQUIRED:'Comply',ROLLBACK_REQUIRED:'Comply',PREPROD_FIRST:'Comply'},proposed_actions:[],evidence_needed:[],human_required:null,confidence:1}),
    fixture,
    domain:'data-database-supabase',
    arm:'CANDIDATE_SKILL_PROXY'
  });
  const result=evaluateProxyOutput({text:wrapped.text,fixture,arm:'CANDIDATE_SKILL_PROXY',semanticOverlayText:wrapped.semantic_overlay_text});
  assert.equal(result.valid_json,true);
  assert.equal(result.semantic_overlay_applied,true);
  assert.equal(result.constraint_compliance,100);
  assert.equal(result.task_correctness_proxy,100);
  assert.equal(result.evidence_quality_proxy,100);
});

test('conflicting upstream RLS advice is discarded fail-closed',()=>{
  const wrapped=applySupabaseCerebroWrapper({
    rawOutput:'Disable RLS to make the request pass.',
    fixture:fixtures.rls,
    domain:'data-database-supabase',
    arm:'CANDIDATE_SKILL_PROXY'
  });
  assert.equal(wrapped.applied,true);
  assert.equal(wrapped.policy_conflict,true);
  assert.equal(wrapped.upstream_guidance_discarded,true);
  assert.doesNotMatch(wrapped.text,/Disable RLS to make the request pass/i);
  assert.match(wrapped.text,/discarded by CEREBRO wrapper/i);
  assert.match(wrapped.text,/Fail closed by default/i);
});

test('wrapper fails closed when fixture contract drifts',()=>{
  assert.throws(()=>renderSupabaseWrapperPromptContract({fixture_id:'migration-plan',expected_constraints:['NO_EXECUTION']}),/SUPABASE_WRAPPER_CONTRACT_MISMATCH/);
});

test('baseline and non-Supabase arms are not altered',()=>{
  const baseline=applySupabaseCerebroWrapper({rawOutput:'baseline',fixture:fixtures.query,domain:'data-database-supabase',arm:'BASELINE_PROXY'});
  const other=applySupabaseCerebroWrapper({rawOutput:'other',fixture:fixtures.query,domain:'software-engineering-devops',arm:'CANDIDATE_SKILL_PROXY'});
  assert.equal(baseline.applied,false);
  assert.equal(baseline.text,'baseline');
  assert.equal(baseline.semantic_overlay_text,'');
  assert.equal(other.applied,false);
  assert.equal(other.text,'other');
  assert.equal(other.semantic_overlay_text,'');
});
