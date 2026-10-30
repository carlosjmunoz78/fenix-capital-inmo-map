import {createJarvisCore} from '../core-v1/core-v1.mjs';
import {CerebroJarvisGatewayV1} from '../../console/jarvis-project-hub-binding-v1.mjs';
import {loadIdentityCredentialFoundation,identityCredentialAuditSummary} from '../../governance/identity-credential-broker.mjs';
import {routeWork} from '../../router/execution-model-router.mjs';
import {loadEngineRegistryCapabilities,engineRegistryCapabilitySummary} from './engine-registry-adapter-v1.mjs';
import {buildJarvisDag} from '../../runtime/jarvis-mission-dag-v2.mjs';
import {MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT} from '../../runtime/mission-derived-job001-adapter-v1.mjs';
import {JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT} from '../../runtime/job001-ledger-control-plane-v1.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision,validateEvaluatorChange} from '../../runtime/evaluation-tribunal.mjs';

export class JarvisCerebroBindingV1{
 #core;#gateway;#iam;#registrySummary;
 constructor({environment='PREPROD',version='1.0.0-preprod',project_state_dir}={}){
  if(environment!=='PREPROD')throw new Error('JARVIS_BINDING_PREPROD_ONLY');
  this.#core=createJarvisCore();
  this.#gateway=new CerebroJarvisGatewayV1({environment,version,project_state_dir});
  this.#iam=loadIdentityCredentialFoundation();
  const explicit=['IAM-001','ROUTE-001','CONSOLE-001','ORCH-001','JOB-001','EVA-001','JDG-001'];
  const registered=loadEngineRegistryCapabilities({exclude:explicit});
  for(const c of registered)this.#core.fabric.register(c);
  for(const c of [
   {capability_id:'IAM-001',version:'existing',environments:['PREPROD'],company_ids:['fenix'],source:'cerebro/governance/identity-credential-broker.mjs',evidence_state:'EXISTING_PARTIAL',operational_claim:false,reuse_policy:'REUSE_EXISTING_FAIL_CLOSED'},
   {capability_id:'ROUTE-001',version:'existing',environments:['PREPROD'],company_ids:['fenix'],source:'cerebro/router/execution-model-router.mjs',evidence_state:'EXISTING_PARTIAL',operational_claim:false,reuse_policy:'REUSE_EXISTING_ZERO_COST_FIRST'},
   {capability_id:'CONSOLE-001',version:'existing',environments:['PREPROD'],source:'cerebro/console/gateway.mjs',evidence_state:'EXISTING_PARTIAL',operational_claim:false,reuse_policy:'REUSE_EXISTING_GATEWAY'},
   {capability_id:'ORCH-001',version:'jarvis-mission-dag-v2',environments:['PREPROD'],source:'cerebro/runtime/jarvis-mission-dag-v2.mjs',evidence_state:'CANDIDATE_GREEN_PLANNING_RUNTIME_BINDING_PARTIAL',operational_claim:false,reuse_policy:'REUSE_EXISTING_ORCHESTRATOR_AND_JOB001'},
   {capability_id:'JOB-001',version:'mission-derived-adapter-v1',environments:['PREPROD'],source:'cerebro/runtime/mission-derived-job001-adapter-v1.mjs',evidence_state:'EXISTING_DURABLE_RUNTIME_CONTRACT',operational_claim:false,reuse_policy:'REUSE_EXISTING_QUEUE_WORKER_NO_SECOND_DAEMON'},
   {capability_id:'EVA-001',version:'evaluation-tribunal-existing',environments:['PREPROD'],source:'cerebro/runtime/evaluation-tribunal.mjs',evidence_state:'CANDIDATE_GREEN_BOUND',operational_claim:false,reuse_policy:'REUSE_OLD_NEW_HOLDOUT_EVALUATION'},
   {capability_id:'JDG-001',version:'evaluation-tribunal-existing',environments:['PREPROD'],source:'cerebro/runtime/evaluation-tribunal.mjs',evidence_state:'CANDIDATE_GREEN_BOUND',operational_claim:false,reuse_policy:'REUSE_INDEPENDENT_TRIBUNAL'} ,
   {capability_id:'JARVIS-PROJECT-HUB',version:'existing',environments:['PREPROD'],source:'cerebro/console/jarvis-project-hub-binding-v1.mjs',evidence_state:'EXISTING_PARTIAL',operational_claim:false,reuse_policy:'REUSE_EXISTING_PROJECT_HUB'}
  ])this.#core.fabric.register(c);
  this.#registrySummary=engineRegistryCapabilitySummary({exclude:[]});
 }
 get core(){return this.#core}
 createSession(input){return this.#gateway.createSession(input)}
 selectContext(input){return this.#gateway.selectContext(input)}
 inspectSession(id){return this.#gateway.inspectSession(id)}
 queryProjects(input){return this.#gateway.queryProjects(input)}
 queryEngines(){return this.#gateway.queryEngines()}
 iamSummary(){return identityCredentialAuditSummary({foundation:this.#iam})}
 capabilitySummary(){return Object.freeze({...this.#registrySummary,fabric_capability_count:this.#core.fabric.list().length,rule:'REGISTERED_DOES_NOT_MEAN_OPERATIONAL'});}
 compileContext(input){return this.#core.compileContext(input)}
 authorize(input){return this.#core.authorizeAction(input)}
 orchestrationContract(){const dag=buildJarvisDag();return Object.freeze({mission_id:dag.mission_id,environment:dag.safeguards.environment,program_count:dag.program_count,master_section_count:dag.master_section_count,work_unit_count:dag.work_unit_count,task_count:dag.task_count,prod_write:dag.safeguards.prod_write,trading:dag.safeguards.trading,job_adapter:MISSION_DERIVED_JOB001_ADAPTER_V1_CONTRACT,control_plane:JOB001_LEDGER_CONTROL_PLANE_V1_CONTRACT,runtime_binding_state:'PARCIAL_JARVIS_V2_HANDLER_NOT_YET_BOUND'});}
 evaluateCandidate({benchmark,old_result,new_result,judge_id,candidate_actor_id,real_outcome_delta=null,metric_direction='higher'}){const evaluation=evaluateOldNew({benchmark,old_result,new_result});const tribunal=tribunalDecision({evaluation,judge_id,candidate_actor_id,real_outcome_delta,metric_direction});return Object.freeze({evaluation,tribunal});}
 defineBenchmark(input){return defineBenchmark({...input,environment:'PREPROD'});}
 validateEvaluatorChange(input){return validateEvaluatorChange(input);}
 route({context,...input}){
  const auth=this.#core.authorizeAction({context,action:'route_work',risk:input.risk||'LOW',confidence:input.confidence??1,money_eur:input.estimated_paid_cost_eur||0});
  if(!auth.allowed)return{status:'HUMAN_REQUIRED',reason:auth.human_required,detail:auth.reason};
  if(context.company_id!=='fenix')return{status:'HOLD',reason:'MULTICOMPANY_ROUTE_NOT_YET_BOUND',human_required:null,company_id:context.company_id,implementation_state:'PARCIAL'};
  return routeWork({company_id:'fenix',task_type:input.task_type,environment:'PREPROD',confidence:input.confidence??1,risk:input.risk||'LOW',available_resources:input.available_resources||[],contains_customer_data:input.contains_customer_data===true,contains_secrets:false,prod_write_requested:false,trading_requested:false,paid_route_requested:input.paid_route_requested===true,estimated_paid_cost_eur:input.estimated_paid_cost_eur||0});
 }
 contract(){return Object.freeze({schema_version:'1.2',identity:'JARVIS',environment:'PREPROD',gateway:this.#gateway.contract(),core_version:this.#core.version,capability_registry:this.capabilitySummary(),orchestration:this.orchestrationContract(),evaluation:{source:'cerebro/runtime/evaluation-tribunal.mjs',old_new:true,secret_holdout:true,independent_judge:true,goodhart_guard:true,prod_authorized:false},iam_fail_closed:true,direct_model_access:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_router_state:'PARCIAL_FENIX_EXISTING_OTHER_COMPANIES_NOT_BOUND'});}
}
