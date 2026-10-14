import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..','..');
const migration=fs.readFileSync(path.join(root,'cerebro/multicompany/sql/lrn001-autonomous-continuation-preprod-v1.sql'),'utf8');
const rollback=fs.readFileSync(path.join(root,'cerebro/multicompany/rollback/lrn001-autonomous-continuation-preprod-v1.rollback.sql'),'utf8');

test('LRN-001 durable layer is PREPROD-only, tenant-bound and service-role-only',()=>{
  assert.match(migration,/cerebro_lrn001_continuation_preprod/);
  assert.match(migration,/engine_id='LRN-001'/);
  assert.match(migration,/environment='PREPROD'/);
  assert.match(migration,/enable row level security/);
  assert.match(migration,/revoke all on table public\.cerebro_lrn001_continuation_preprod from public, anon, authenticated/);
  assert.match(migration,/grant all on table public\.cerebro_lrn001_continuation_preprod to service_role/);
  assert.match(migration,/cerebro_company_tenant_boundary_check_preprod/);
});

test('persistence requires all 17 onboarding engines GREEN before LRN continuation',()=>{
  assert.match(migration,/v_green_count<>17/);
  assert.match(migration,/full_17_engine_preprod_green_required/);
  assert.match(migration,/MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED/);
});

test('PREPROD continuation eligibility requires OLD-vs-NEW, tribunal, hard gates and rollback evidence',()=>{
  assert.match(migration,/PREPROD_CONTINUATION_ELIGIBLE/);
  assert.match(migration,/p_hard_gates_green/);
  assert.match(migration,/v_verdict<>'NEW_BETTER'/);
  assert.match(migration,/p_new_score<=p_old_score/);
  assert.match(migration,/p_evaluation_ref/);
  assert.match(migration,/p_tribunal_ref/);
  assert.match(migration,/p_rollback_ref/);
  assert.match(migration,/controlled_evaluation_evidence_required/);
});

test('only canonical HUMAN_REQUIRED reasons are persistable',()=>{
  for(const code of ['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'])assert.ok(migration.includes(`'${code}'`));
  assert.match(migration,/human_required_code_required/);
  assert.match(migration,/human_required_code_not_allowed/);
});

test('receipt layer stores bounded metadata and never expands authority',()=>{
  assert.match(migration,/canonical_knowledge_write_authorized=false/);
  assert.match(migration,/publish_authorized=false/);
  assert.match(migration,/prod_authorized=false/);
  assert.match(migration,/prod_write_authorized=false/);
  assert.match(migration,/trading_access=false/);
  assert.match(migration,/additional_cost_eur=0/);
  assert.doesNotMatch(migration,/fenix_prod\./i);
  assert.doesNotMatch(migration,/raw_message|raw_customer|transcript|audio_bytes/i);
});

test('migration has idempotency and exact rollback without destructive broad operations',()=>{
  assert.match(migration,/lrn_idempotency_key text not null unique/);
  assert.match(migration,/idempotency_scope_conflict/);
  assert.match(rollback,/drop function if exists public\.cerebro_lrn001_status_preprod/);
  assert.match(rollback,/drop function if exists public\.cerebro_lrn001_record_preprod/);
  assert.match(rollback,/drop table if exists public\.cerebro_lrn001_continuation_preprod/);
  assert.doesNotMatch(rollback,/cascade/i);
  assert.doesNotMatch(migration,/\btruncate\b|\bdelete\s+from\b/i);
});
