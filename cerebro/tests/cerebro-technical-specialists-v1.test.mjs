import test from 'node:test';
import assert from 'node:assert/strict';
import {technicalSpecialistRegistry,evaluateSoftwareEngineeringSpecialist,evaluateSystemsSpecialist,evaluateDataSpecialist,evaluateSecuritySpecialist,SOFTWARE_ENGINEERING_SPECIALIST_CONTRACT,TECHNICAL_SPECIALIST_ALIASES} from '../runtime/cerebro-technical-specialists-v1.mjs';

const codeCapabilities=['software-engineering','debugging','script','analysis'];
const codeControls=Object.freeze({
  worktree_or_sandbox_isolation:true,
  deterministic_prechecks:true,
  unit_and_targeted_tests:true,
  static_analysis:true,
  regression_comparison:true,
  rollback_plan:true,
  qa_code_evidence:true,
  eva_regression:true,
  dry_run:false
});

test('technical layer exposes exactly eight essential aliases without creating engines',()=>{const r=technicalSpecialistRegistry();assert.deepEqual(TECHNICAL_SPECIALIST_ALIASES,['ARQUITECTO','CODE','SYSTEMS','MATH','DATA','SECURITY','QA','INTEGRATOR']);assert.equal(r.specialists.length,8);assert.equal(r.specialists.find((item)=>item.alias==='CODE')?.identity,'SOFTWARE_ENGINEERING');assert.equal(r.new_engine_required,false);assert.equal(r.additional_cost_eur,0);assert.equal(r.prod_authorized,false);assert.equal(r.trading_access,false);});

test('software-engineering-devops activates SOFTWARE_ENGINEERING using real existing capability groups',()=>{const r=evaluateSoftwareEngineeringSpecialist({company_id:'fenix',domain:'software-engineering-devops',capabilities:codeCapabilities,source_text:'Safe software engineering change with tests and rollback.',controls:codeControls});assert.equal(r.status,'SPECIALIST_GREEN');assert.equal(r.alias,'SOFTWARE_ENGINEERING');assert.equal(r.checks.code_capability_coverage,true);assert.equal(r.details.identity,'SOFTWARE_ENGINEERING');assert.equal(r.details.audit_route,'QA_EVA_JDG');assert.equal(r.details.normal_execution_route,'WORKTREE_SANDBOX');assert.equal(r.details.human_required,null);assert.equal(r.details.blocker_code,null);assert.equal(r.prod_authorized,false);assert.equal(SOFTWARE_ENGINEERING_SPECIALIST_CONTRACT.elevated_execution_route,'DRY_RUN_FIRST');});

test('SOFTWARE_ENGINEERING fails closed with explicit CODE blocker when real capabilities are insufficient',()=>{const r=evaluateSoftwareEngineeringSpecialist({company_id:'fenix',domain:'software-engineering-devops',capabilities:['analysis'],source_text:'Code review only.',controls:codeControls});assert.equal(r.status,'SPECIALIST_HOLD');assert.equal(r.checks.code_capability_coverage,false);assert.equal(r.details.blocker_code,'CODE_CAPABILITY_GAP');assert.deepEqual(r.details.missing_capability_groups,['ENGINEERING','EXECUTION']);assert.equal(r.details.human_required,null);});

test('destructive code action is HIGH_RISK and requires governed dry-run path instead of silent execution',()=>{const r=evaluateSoftwareEngineeringSpecialist({company_id:'fenix',domain:'software-engineering-devops',capabilities:codeCapabilities,source_text:'Destructive repository migration request.',controls:codeControls,action:{destructive:true}});assert.equal(r.status,'SPECIALIST_HOLD');assert.equal(r.checks.no_destructive_action,false);assert.equal(r.details.blocker_code,'HIGH_RISK_DESTRUCTIVE_CODE_ACTION');assert.equal(r.details.human_required,'HIGH_RISK');assert.equal(r.details.dry_run_required,true);assert.equal(r.details.elevated_execution_route,'DRY_RUN_FIRST');});

test('elevated reversible code action cannot advance without dry-run plus isolation',()=>{const blocked=evaluateSoftwareEngineeringSpecialist({company_id:'fenix',domain:'software-engineering-devops',capabilities:codeCapabilities,source_text:'Elevated but reversible engineering action.',controls:codeControls,action:{elevated:true}});assert.equal(blocked.status,'SPECIALIST_HOLD');assert.equal(blocked.details.blocker_code,'ELEVATED_DRY_RUN_OR_ISOLATION_REQUIRED');const green=evaluateSoftwareEngineeringSpecialist({company_id:'fenix',domain:'software-engineering-devops',capabilities:codeCapabilities,source_text:'Elevated but reversible engineering action.',controls:{...codeControls,dry_run:true},action:{elevated:true}});assert.equal(green.status,'SPECIALIST_GREEN');assert.equal(green.checks.elevated_route_safe,true);});

test('critical credential or secret manipulation is SECURITY_INCIDENT and never advances silently',()=>{const r=evaluateSoftwareEngineeringSpecialist({company_id:'fenix',domain:'software-engineering-devops',capabilities:codeCapabilities,source_text:'Rotate a privileged credential reference.',controls:codeControls,action:{critical_secret_write:true}});assert.equal(r.status,'SPECIALIST_HOLD');assert.equal(r.checks.no_critical_secret_manipulation,false);assert.equal(r.details.blocker_code,'SECURITY_CRITICAL_CREDENTIAL_OPERATION');assert.equal(r.details.human_required,'SECURITY_INCIDENT');});

test('SYSTEMS reuses durable worker and authorized execution contracts',()=>{const r=evaluateSystemsSpecialist({company_id:'fenix',source_text:'Platform engineering runtime for Linux and Docker with durable worker, bounded concurrency, checkpoint retry recovery, rollback and rebuild.'});assert.equal(r.status,'SPECIALIST_GREEN');assert.equal(r.checks.bounded_concurrency,true);assert.equal(r.checks.retry_checkpoint_recovery,true);assert.equal(r.checks.fail_closed_execution_route,true);assert.equal(r.prod_authorized,false);});

test('DATA reuses DB-SAFE-NATIVE and proves write RLS backup rollback gates',()=>{const r=evaluateDataSpecialist({company_id:'fenix',source_text:'PostgreSQL database schema and SQL query review with tenant RLS row level security, backup and rollback before any migration.'});assert.equal(r.status,'SPECIALIST_GREEN');assert.equal(r.checks.no_db_write,true);assert.equal(r.checks.rls_or_access_policy,true);assert.equal(r.checks.backup_rollback_for_mutation_plan,true);assert.equal(r.details.training_offload,true);});

test('SECURITY reuses IAM foundation and remains fail closed with no secrets or authority expansion',()=>{const r=evaluateSecuritySpecialist({company_id:'fenix',source_text:'Security engineering threat and risk review with IAM least privilege, credential protection, privacy hardening and fail closed policy.'});assert.equal(r.status,'SPECIALIST_GREEN');assert.equal(r.checks.no_secret_exposure,true);assert.equal(r.checks.least_privilege,true);assert.equal(r.checks.fail_closed,true);assert.equal(r.checks.no_authority_expansion,true);assert.equal(r.prod_write_authorized,false);});

test('SECURITY fails closed on raw-looking credential material and current foreign-company IAM gap',()=>{const raw=evaluateSecuritySpecialist({company_id:'fenix',source_text:'Security risk eyJaaaaaaaaaaa.bbbbbbbbbbb.ccccc'});assert.equal(raw.status,'SPECIALIST_HOLD');assert.equal(raw.checks.no_secret_exposure,false);const other=evaluateSecuritySpecialist({company_id:'otherco',source_text:'Security threat risk IAM least privilege'});assert.equal(other.status,'SPECIALIST_HOLD');assert.equal(other.details.reason,'CURRENT_IAM_FOUNDATION_IS_FENIX_SCOPED');});
