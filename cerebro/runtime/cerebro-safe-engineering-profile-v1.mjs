import {stableIdempotencyKey,validateCanonicalContext,HUMAN_REQUIRED_CODES} from './continuous-improvement-contract.mjs';

const ENVIRONMENT='PREPROD';

export const SAFE_ENGINEERING_PHASES=Object.freeze([
  'UNDERSTAND_EXISTING','DEFINE','PLAN','REUSE_BEFORE_BUILD','ISOLATE_WORKTREE','WRITE_TESTS_FIRST',
  'IMPLEMENT_MINIMAL_CHANGE','SYSTEMATIC_DEBUG','VERIFY','CODE_REVIEW','SECURITY_POLICY_REVIEW',
  'OLD_VS_NEW','ROLLBACK_REBUILD_CHECK','PROMOTION_REVIEW'
]);

export const SAFE_ENGINEERING_SOURCES=Object.freeze([
  Object.freeze({item:25,source:'anomalyco/opencode',license:'MIT',mode:'WRAP_CURRENT_UPSTREAM'}),
  Object.freeze({item:26,source:'obra/superpowers',license:'MIT',mode:'EXTRACT_WORKFLOW'}),
  Object.freeze({item:27,source:'addyosmani/agent-skills',license:'MIT',mode:'EXTRACT_PRODUCTION_LIFECYCLE'}),
  Object.freeze({item:28,source:'multica-ai/andrej-karpathy-skills',license:'MIT',mode:'PATTERNS_WITH_THIRD_PARTY_ATTRIBUTION'}),
  Object.freeze({item:29,source:'DietrichGebert/ponytail',license:'MIT',mode:'EXTRACT_YAGNI_GATE'}),
  Object.freeze({item:30,source:'msitarzewski/agency-agents',license:'MIT',mode:'ROLE_SPEC_SOURCE'}),
  Object.freeze({item:31,source:'CEREBRO_QA_001',license:'INTERNAL',mode:'EXTEND_EXISTING'}),
  Object.freeze({item:32,source:'git-worktrees',license:'NATIVE_TOOLING',mode:'EXECUTION_POLICY'}),
  Object.freeze({item:33,source:'openclaw/openclaw',license:'MIT',mode:'BENCHMARK_UNIQUE_PATTERNS'}),
  Object.freeze({item:34,source:'NousResearch/hermes-agent',license:'MIT',mode:'BENCHMARK_UNIQUE_PATTERNS'}),
  Object.freeze({item:35,source:'abacusai/abacusai-bot',license:'MIT',mode:'BENCHMARK_ONLY'}),
  Object.freeze({item:36,source:'thedotmack/claude-mem',license:'Apache-2.0-open-core',mode:'LAB_MEMORY_ONLY'}),
  Object.freeze({item:37,source:'EvoMap/evolver',license:'GPL-3.0-or-later/current;future-source-available',mode:'PATTERNS_ONLY'})
]);

function bool(value){return value===true;}
function finiteNonNegative(value){return Number.isFinite(value)&&value>=0;}
function unique(values){return [...new Set(values)];}

export function safeEngineeringProfile(){
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SAFE_ENGINEERING_PROFILE_V1',environment:ENVIRONMENT,
    phases:SAFE_ENGINEERING_PHASES,sources:SAFE_ENGINEERING_SOURCES,new_engine_required:false,
    paid_model_required:false,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,
    trading_access:false,external_skill_code_execution:false
  });
}

export function planEngineeringChange(input={}){
  const context={company_id:input.company_id??'fenix',engine_id:input.engine_id??'AUTO-001',environment:input.environment??ENVIRONMENT,version:input.version??'1.0.0'};
  const contextCheck=validateCanonicalContext(context,{allowProd:false});
  const blockers=[...contextCheck.errors];
  const human=[];

  if(!bool(input.inventory_complete)) blockers.push('inventory_required');
  if(!bool(input.dependencies_mapped)) blockers.push('dependency_map_required');
  if(!bool(input.reuse_checked)) blockers.push('reuse_before_build_required');
  if(input.new_code===true&&!bool(input.new_code_justified)) blockers.push('new_code_not_justified');
  if(input.mutation===true&&!bool(input.worktree_isolated)) blockers.push('worktree_or_equivalent_isolation_required');
  if(input.mutation===true&&!bool(input.tests_before_change)) blockers.push('tests_before_change_required');
  if(input.mutation===true&&!bool(input.rollback_ready)) blockers.push('rollback_required');
  if(input.mutation===true&&!bool(input.rebuild_ready)) blockers.push('rebuild_required');
  if(input.mutation===true&&!bool(input.backup_or_snapshot_ready)) blockers.push('backup_or_snapshot_required');
  if(input.destructive===true&&!bool(input.explicit_destructive_approval)) blockers.push('destructive_change_not_authorized');
  if(input.prod_write===true){blockers.push('prod_write_not_authorized_by_profile');human.push('HIGH_RISK');}
  if(input.trading_access===true){blockers.push('trading_isolation_required');human.push('HIGH_RISK');}
  if(input.secret_exposure===true){blockers.push('secret_exposure_forbidden');human.push('SECURITY_INCIDENT');}
  if(input.customer_data_in_test===true){blockers.push('customer_data_in_test_forbidden');human.push('SECURITY_INCIDENT');}
  if(input.legal_required===true) human.push('LEGAL_REQUIRED');
  if(input.signature_required===true) human.push('SIGNATURE_REQUIRED');
  if(input.policy_conflict===true) human.push('POLICY_CONFLICT');
  if(input.low_confidence===true) human.push('LOW_CONFIDENCE');
  if(input.customer_human_request===true) human.push('CUSTOMER_HUMAN_REQUEST');

  const cost=Number(input.additional_cost_eur??0);
  if(!finiteNonNegative(cost)) blockers.push('invalid_cost');
  else if(cost>0){blockers.push('zero_cost_gate_failed');human.push('MONEY_LIMIT');}

  const maxFiles=Number(input.max_files_changed??10);
  const plannedFiles=Number(input.planned_files_changed??0);
  if(!Number.isInteger(plannedFiles)||plannedFiles<0) blockers.push('invalid_planned_files_changed');
  if(!Number.isInteger(maxFiles)||maxFiles<1) blockers.push('invalid_max_files_changed');
  if(Number.isInteger(plannedFiles)&&Number.isInteger(maxFiles)&&plannedFiles>maxFiles) blockers.push('scope_too_large_split_change');

  const humanRequired=unique(human).filter((code)=>HUMAN_REQUIRED_CODES.includes(code));
  const decision=humanRequired.length?'HUMAN_REQUIRED':blockers.length?'HOLD':'PASS_PREPROD_PLAN';
  const plan={
    ...context,profile_version:'1.0.0',decision,blockers:unique(blockers),human_required:humanRequired,
    phases:SAFE_ENGINEERING_PHASES,execution_policy:Object.freeze({
      reuse_before_build:true,minimal_change:true,tests_first:true,systematic_debug:true,worktree_isolation:true,
      independent_review:true,old_vs_new:true,rollback_required:true,rebuild_required:true,evidence_before_claims:true
    }),
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
  };
  return Object.freeze({...plan,plan_id:stableIdempotencyKey(plan)});
}

export function compareEngineeringOutcomes({old_result,new_result}={}){
  if(!old_result||!new_result) throw new Error('OLD and NEW results required');
  const numeric=['tests_failed','security_regressions','policy_regressions','additional_cost_eur','files_changed','defects_found_postchange'];
  for(const key of numeric){
    if(!finiteNonNegative(Number(old_result[key]))||!finiteNonNegative(Number(new_result[key]))) throw new Error(`invalid metric:${key}`);
  }
  const hardRegressions=[];
  if(new_result.tests_failed>old_result.tests_failed) hardRegressions.push('tests_regressed');
  if(new_result.security_regressions>old_result.security_regressions) hardRegressions.push('security_regressed');
  if(new_result.policy_regressions>old_result.policy_regressions) hardRegressions.push('policy_regressed');
  if(new_result.additional_cost_eur>old_result.additional_cost_eur) hardRegressions.push('cost_regressed');
  if(new_result.prod_authority===true&&old_result.prod_authority!==true) hardRegressions.push('authority_expanded');
  if(new_result.trading_access===true&&old_result.trading_access!==true) hardRegressions.push('trading_boundary_regressed');

  const improvements=[];
  if(new_result.tests_failed<old_result.tests_failed) improvements.push('tests');
  if(new_result.defects_found_postchange<old_result.defects_found_postchange) improvements.push('defects');
  if(new_result.files_changed<old_result.files_changed) improvements.push('smaller_change');
  if(new_result.additional_cost_eur<old_result.additional_cost_eur) improvements.push('cost');
  if(Number(new_result.quality_score??0)>Number(old_result.quality_score??0)) improvements.push('quality');

  const decision=hardRegressions.length?'REJECT_NEW':improvements.length?'NEW_BETTER':'MORE_EVIDENCE';
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SAFE_ENGINEERING_OLD_NEW_V1',environment:ENVIRONMENT,
    decision,hard_regressions:Object.freeze(hardRegressions),improvements:Object.freeze(improvements),
    rollback_required:decision==='REJECT_NEW',prod_authorized:false,prod_write_authorized:false,trading_access:false
  });
}

export function sourceDisposition(item){
  const found=SAFE_ENGINEERING_SOURCES.find((entry)=>entry.item===item);
  if(!found) return Object.freeze({decision:'HOLD_UNKNOWN_SOURCE',item,prod_authorized:false});
  return found;
}
