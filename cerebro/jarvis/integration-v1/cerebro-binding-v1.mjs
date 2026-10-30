import {createJarvisCore} from '../core-v1/core-v1.mjs';
import {CerebroJarvisGatewayV1} from '../../console/jarvis-project-hub-binding-v1.mjs';
import {loadIdentityCredentialFoundation,identityCredentialAuditSummary} from '../../governance/identity-credential-broker.mjs';
import {routeWork} from '../../router/execution-model-router.mjs';

export class JarvisCerebroBindingV1{
 #core;#gateway;#iam;
 constructor({environment='PREPROD',version='1.0.0-preprod',project_state_dir}={}){
  if(environment!=='PREPROD')throw new Error('JARVIS_BINDING_PREPROD_ONLY');
  this.#core=createJarvisCore();
  this.#gateway=new CerebroJarvisGatewayV1({environment,version,project_state_dir});
  this.#iam=loadIdentityCredentialFoundation();
  for(const c of [
   {capability_id:'IAM-001',version:'existing',environments:['PREPROD'],company_ids:['fenix'],source:'cerebro/governance/identity-credential-broker.mjs'},
   {capability_id:'ROUTE-001',version:'existing',environments:['PREPROD'],company_ids:['fenix'],source:'cerebro/router/execution-model-router.mjs'},
   {capability_id:'CONSOLE-001',version:'existing',environments:['PREPROD'],source:'cerebro/console/gateway.mjs'},
   {capability_id:'JARVIS-PROJECT-HUB',version:'existing',environments:['PREPROD'],source:'cerebro/console/jarvis-project-hub-binding-v1.mjs'}
  ])this.#core.fabric.register(c);
 }
 get core(){return this.#core}
 createSession(input){return this.#gateway.createSession(input)}
 selectContext(input){return this.#gateway.selectContext(input)}
 inspectSession(id){return this.#gateway.inspectSession(id)}
 queryProjects(input){return this.#gateway.queryProjects(input)}
 queryEngines(){return this.#gateway.queryEngines()}
 iamSummary(){return identityCredentialAuditSummary({foundation:this.#iam})}
 compileContext(input){return this.#core.compileContext(input)}
 authorize(input){return this.#core.authorizeAction(input)}
 route({context,...input}){
  const auth=this.#core.authorizeAction({context,action:'route_work',risk:input.risk||'LOW',confidence:input.confidence??1,money_eur:input.estimated_paid_cost_eur||0});
  if(!auth.allowed)return{status:'HUMAN_REQUIRED',reason:auth.human_required,detail:auth.reason};
  if(context.company_id!=='fenix')return{status:'HOLD',reason:'MULTICOMPANY_ROUTE_NOT_YET_BOUND',human_required:null,company_id:context.company_id,implementation_state:'PARCIAL'};
  return routeWork({company_id:'fenix',task_type:input.task_type,environment:'PREPROD',confidence:input.confidence??1,risk:input.risk||'LOW',available_resources:input.available_resources||[],contains_customer_data:input.contains_customer_data===true,contains_secrets:false,prod_write_requested:false,trading_requested:false,paid_route_requested:input.paid_route_requested===true,estimated_paid_cost_eur:input.estimated_paid_cost_eur||0});
 }
 contract(){return Object.freeze({schema_version:'1.0',identity:'JARVIS',environment:'PREPROD',gateway:this.#gateway.contract(),core_version:this.#core.version,capabilities:this.#core.fabric.list(),iam_fail_closed:true,direct_model_access:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,multicompany_router_state:'PARCIAL_FENIX_EXISTING_OTHER_COMPANIES_NOT_BOUND'});}
}
