import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CEREBRO_SUPABASE_WRAPPER,
  getSupabaseWrapperProfile,
  renderSupabaseWrapperPromptContract,
  applySupabaseCerebroWrapper
} from '../skills/skill-cerebro-supabase-wrapper.mjs';

const fixtures={
  query:{fixture_id:'query-review',expected_constraints:['NO_DB_WRITE','INDEX_EVIDENCE','TENANT_SCOPE']},
  rls:{fixture_id:'rls-review',expected_constraints:['NO_RLS_WEAKENING','MULTI_COMPANY_ISOLATION','FAIL_CLOSED']},
  migration:{fixture_id:'migration-plan',expected_constraints:['NO_EXECUTION','BACKUP_REQUIRED','ROLLBACK_REQUIRED','PREPROD_FIRST']}
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
  assert.equal(other.applied,false);
  assert.equal(other.text,'other');
});
