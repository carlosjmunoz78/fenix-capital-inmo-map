// FACT-001 generic internal engine/department/company/website artifact generator.
// Generates FILE CONTENT, not infrastructure, tokens, commits, DNS or deployments.
import {createCloudflareOnboardingPlan,FACTORY_ARTIFACTS} from './cloudflare-onboarding.mjs';
const serialize=v=>JSON.stringify(v,null,2)+'\n';
const scope=p=>({...p.scope});
const artifact=(p,name)=>{
 const s=scope(p),resources=p.resources.map(r=>({name:r.name,type:r.type,provider:r.provider,mode:r.mode}));
 switch(name){
  case 'manifest':return {id:p.unit.slug,unit_type:p.unit.type,scope:s,status:'DEFINED_NOT_DEPLOYED',account_id:p.account_id,resources,shared_runtime:p.shared_runtime};
  case 'config':return {scope:s,public_routes:[],workers_dev:false,preview_urls:false,schedules:[],deploy_enabled:false,all_writes_enabled:false};
  case 'data_contracts':return {scope:s,inputs:[{name:'command',required:['company_id','engine_id','environment','version','capability','idempotency_key']}],outputs:[{name:'execution_receipt',required:['status','audit_id','resource_refs']}],secrets_in_payload:false};
  case 'permissions':return {scope:s,principals:['owner_signed_order','registered_automation'],grants:[],default:'DENY',required_permissions:[...new Set(p.resources.map(r=>r.permission))]};
  case 'policies':return {scope:s,default:'DENY',prod_writes:false,free_plan_only:true,unapproved_deletes:false,unverified_domain_updates:false,human_required:p.human_exception_codes};
  case 'events':return {scope:s,topics:['resource.created','resource.updated','resource.failed','resource.reconciled','resource.rolled_back'],subscriptions_enabled:false};
  case 'jobs':return {scope:s,queue_name:'fact001-shared-queue',worker_mode:'SHARED',active_jobs:[],cron:[],retries:'RECONCILE_BEFORE_RETRY'};
  case 'api':return {scope:s,transport:'CEREBRO_GATEWAY_SIGNED_ONLY',registered_routes:[],published:false};
  case 'tests':return {scope:s,required:['inventory','4d_scope','authorization','contract','idempotency','readback','cost_limit','backup','restore','rollback','security'],last_result:'NOT_RUN'};
  case 'evaluation':return {scope:s,grade:'NOT_EVALUATED',criteria:['zero_prod_regression','tenant_isolation','cost0','repeatable_rebuild']};
  case 'tribunal':return {scope:s,decision:'NOT_APPROVED',gates:p.must_attest,policy:'NO_PROMOTION_WITHOUT_EVIDENCE'};
  case 'observability':return {scope:s,redact:['authorization','cookie','token','secret','password','api_key'],audit_enabled:false,metrics:['run_count','error_rate','cost_eur','rollback_success'],alerts_enabled:false};
  case 'costs':return {scope:s,additional_budget_eur:0,usage_guard:'REQUIRES_VERIFIED_QUOTA',paid_services_enabled:false};
  case 'backup':return {scope:s,inventory_snapshot:null,resource_backups:[],restore_test:'NOT_RUN',prod_data_access:false};
  case 'rollback':return {scope:s,policy:'REVERT_NEW_RESOURCES_ONLY_WHEN_OWNERSHIP_VERIFIED',steps:[],tested:false};
  case 'rebuild':return {scope:s,source_manifest:'manifest.json',idempotent:true,verified:false};
  case 'documentation':return {scope:s,runbook_state:'DRAFT',changelog:[],dependencies:resources,operator:'FACT-001'};
  case 'training_hooks':return {scope:s,enabled:false,topics:['qa_failure','rebuild_result','cost_alert','policy_denial'],no_customer_data:true};
  default:throw Error('UNKNOWN_FACTORY_ARTIFACT');
 }
};
export function generateCloudflareFactoryScaffold(request){
 const p=createCloudflareOnboardingPlan(request);
 const root='engines/'+p.scope.company_id+'/'+p.unit.slug+'/'+p.scope.environment.toLowerCase()+'/';
 const files=FACTORY_ARTIFACTS.map(name=>Object.freeze({path:root+name+'.json',content:serialize(artifact(p,name))}));
 if(new Set(files.map(x=>x.path)).size!==FACTORY_ARTIFACTS.length)throw Error('SCAFFOLD_COLLISION');
 return Object.freeze({plan:p,files,write_effects:0,cost_eur:0,status:'FILES_GENERATED_IN_MEMORY'});
}
