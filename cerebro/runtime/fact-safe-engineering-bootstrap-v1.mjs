import crypto from 'node:crypto';
import {planEngineeringChange,safeEngineeringProfile} from './cerebro-safe-engineering-profile-v1.mjs';

const PREPROD='PREPROD';
const VERSION='1.0.0';

export const FACT_ENGINEERING_TASK_KINDS=Object.freeze([
  'REPO_ANALYSIS',
  'ACTIVATION_PLAN',
  'WRAPPER_ADAPTER',
  'SEMANTIC_CONTRACT',
  'TEST_GENERATION',
  'DEBUG_FIX'
]);

const OUTPUTS=Object.freeze({
  REPO_ANALYSIS:Object.freeze(['capability_inventory','dependency_map','reuse_decision','risk_notes']),
  ACTIVATION_PLAN:Object.freeze(['candidate_profile','domain_bindings','engine_targets','gates','terminal_conditions']),
  WRAPPER_ADAPTER:Object.freeze(['wrapper_contract','adapter_plan','tests','rollback_rebuild_plan']),
  SEMANTIC_CONTRACT:Object.freeze(['semantic_contract','fixtures','old_vs_new_benchmark','acceptance_assertions']),
  TEST_GENERATION:Object.freeze(['focused_tests','regression_tests','negative_tests','evidence_contract']),
  DEBUG_FIX:Object.freeze(['root_cause','minimal_change_plan','regression_test','rollback_rebuild_plan'])
});

function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function stringList(value,label){
  if(value==null)return [];
  if(!Array.isArray(value))throw new Error(`${label} must be array`);
  const normalized=[...new Set(value.map((x)=>req(x,label)))];
  return normalized.sort();
}

function authority(){return Object.freeze({
  prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,
  permission_expansion_authorized:false,external_skill_code_execution:false,
  dependency_install_authorized:false,customer_data_authorized:false,
  paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0
});}

export function factSafeEngineeringCapability(){
  const profile=safeEngineeringProfile();
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_FACT_SAFE_ENGINEERING_CAPABILITY_V1',
    company_id:'GLOBAL',engine_id:'FACT-001',environment:PREPROD,version:VERSION,
    profile_id:profile.state_type,profile_version:'1.0.0',
    task_kinds:FACT_ENGINEERING_TASK_KINDS,
    purpose:'Expose the existing Safe Engineering Profile as a governed FACT-001 technical capability without creating a new engine.',
    execution_mode:'PLAN_AND_ARTIFACT_CONTRACT_ONLY_UNTIL_GOVERNED_EXECUTOR',
    new_engine_required:false,
    ...authority()
  });
}

export function planFactEngineeringTask(input={}){
  const task_kind=req(input.task_kind,'task_kind');
  if(!FACT_ENGINEERING_TASK_KINDS.includes(task_kind))throw new Error(`unsupported task_kind:${task_kind}`);
  const objective=req(input.objective,'objective');
  const company_id=req(input.company_id??'fenix','company_id');
  const source_refs=stringList(input.source_refs??[],'source_refs');
  const candidate_id=typeof input.candidate_id==='string'&&input.candidate_id.trim()?input.candidate_id.trim():null;
  const requested_outputs=stringList(input.requested_outputs??OUTPUTS[task_kind],'requested_outputs');
  const allowedOutputs=new Set(OUTPUTS[task_kind]);
  for(const output of requested_outputs)if(!allowedOutputs.has(output))throw new Error(`unsupported output:${task_kind}:${output}`);

  const mutation=input.mutation===true;
  const new_code=input.new_code===true;
  const engineering=planEngineeringChange({
    company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,
    inventory_complete:input.inventory_complete===true,
    dependencies_mapped:input.dependencies_mapped===true,
    reuse_checked:input.reuse_checked===true,
    new_code,new_code_justified:input.new_code_justified===true,
    mutation,worktree_isolated:input.worktree_isolated===true,
    tests_before_change:input.tests_before_change===true,
    rollback_ready:input.rollback_ready===true,
    rebuild_ready:input.rebuild_ready===true,
    backup_or_snapshot_ready:input.backup_or_snapshot_ready===true,
    destructive:input.destructive===true,explicit_destructive_approval:false,
    prod_write:input.prod_write===true,trading_access:input.trading_access===true,
    secret_exposure:input.secret_exposure===true,customer_data_in_test:input.customer_data_in_test===true,
    legal_required:input.legal_required===true,signature_required:input.signature_required===true,
    policy_conflict:input.policy_conflict===true,low_confidence:input.low_confidence===true,
    customer_human_request:input.customer_human_request===true,
    additional_cost_eur:Number(input.additional_cost_eur??0),
    planned_files_changed:Number(input.planned_files_changed??0),
    max_files_changed:Number(input.max_files_changed??10)
  });

  const status=engineering.decision==='PASS_PREPROD_PLAN'
    ?'FACT_ENGINEERING_READY'
    :engineering.decision==='HUMAN_REQUIRED'?'HUMAN_REQUIRED':'HOLD';

  const taskSeed={company_id,candidate_id,task_kind,objective,source_refs,requested_outputs,engineering_plan_id:engineering.plan_id};
  const task_id=`facteng_${hash(taskSeed).slice(0,24)}`;
  const execution_contract=Object.freeze({
    consumer_engine_id:'FACT-001',
    safe_engineering_profile_id:'CEREBRO_SAFE_ENGINEERING_PROFILE_V1',
    phases:engineering.phases,
    requested_outputs:Object.freeze(requested_outputs),
    evidence_required:true,
    old_vs_new_required:mutation,
    rollback_rebuild_required:mutation,
    direct_prod_execution:false,
    raw_external_code_execution:false
  });

  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_FACT_SAFE_ENGINEERING_TASK_V1',
    status,task_id,company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,
    candidate_id,task_kind,objective,source_refs:Object.freeze(source_refs),
    engineering_plan:engineering,execution_contract,
    human_required:Object.freeze([...(engineering.human_required??[])]),
    blockers:Object.freeze([...(engineering.blockers??[])]),
    next_gate:status==='FACT_ENGINEERING_READY'?'GOVERNED_ENGINEERING_EXECUTOR_OR_NEXT_FACTORY_STAGE':status,
    ...authority()
  });
}
