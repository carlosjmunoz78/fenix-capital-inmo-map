import {runGitHubRepositoryActivation} from './universal-skill-github-intake-v1.mjs';
import {resolveBlockedCapability} from './self-extending-capability-resolver-v0.mjs';

const PREPROD='PREPROD';
const VERSION='0.1.0';
function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,host_external_code_execution:false,host_dependency_install:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0});}
function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const child of Object.values(v))freeze(child);}return v;}
function blockedRows(report){const fulfillment=report?.activation?.auto_engineering?.fulfillment??report?.auto_engineering?.fulfillment??null;return Array.isArray(fulfillment?.blocked_external)?fulfillment.blocked_external:[];}

export function upgradeActivationReportToSelfExtending(report,{company_id='fenix'}={}){
  if(!report||typeof report!=='object')throw new Error('activation report required');
  if(report.full_safe_preprod===true||report.status==='FULL_SAFE_PREPROD')return freeze({...report,self_extension:Object.freeze({status:'NOT_REQUIRED',reason:'ALREADY_FULL_SAFE_PREPROD'})});
  if(report.status==='REJECTED')return freeze({...report,self_extension:Object.freeze({status:'NOT_REQUIRED',reason:'TERMINAL_REJECTION_RETAINED'})});
  if(report.status==='HUMAN_REQUIRED')return freeze({...report,self_extension:Object.freeze({status:'HUMAN_REQUIRED',reason:report.human_required??'LOW_CONFIDENCE',resume_automatically:true})});
  const rows=blockedRows(report);
  const candidateId=report.activation?.candidate_id??report.candidate_id??report.activation?.activation?.candidate_id??'repository-candidate';
  const sourceRows=rows.length?rows:[{capability_id:candidateId,domain_id:null,engine_id:'FACT-001',decision:{reason:report.reason??report.status??'BLOCKED_EXTERNAL'}}];
  const resolutions=sourceRows.map((row,index)=>resolveBlockedCapability({company_id,candidate_id:candidateId,capability_id:String(row.capability_id??`${candidateId}:cap:${index+1}`),reason:'BLOCKED_EXTERNAL',useful:true,dependency:{kind:row.decision?.dependency_kind??row.decision?.reason??row.decision?.next_gate??report.reason??report.status??'BLOCKED_EXTERNAL',name:row.decision?.dependency_name??row.domain_id??row.engine_id??row.capability_id}}));
  const humans=resolutions.filter(r=>r.status==='HUMAN_REQUIRED');
  const status=humans.length===resolutions.length&&resolutions.length>0?'HUMAN_REQUIRED':'DEPENDENCY_RESOLUTION_REQUIRED';
  return freeze({schema_version:'1.0.0',state_type:'CEREBRO_SELF_EXTENDING_GITHUB_ACTIVATION_REPORT_V0',status,legacy_status:report.status,terminal_state:null,full_safe_preprod:false,company_id,engine_id:'FACT-001',environment:PREPROD,version:VERSION,source_report:report,resolutions:Object.freeze(resolutions),next_gate:status==='HUMAN_REQUIRED'?'EXACT_HUMAN_BINDING_THEN_AUTO_RESUME':'SEARCH_MORE_THEN_REUSE_WRAP_BUILD_AND_AUTO_RESUME',...authority()});
}

export async function runSelfExtendingGitHubRepositoryActivation(args={}){
  const report=await runGitHubRepositoryActivation(args);
  return upgradeActivationReportToSelfExtending(report,{company_id:args.company_id??'fenix'});
}

export const SELF_EXTENDING_GITHUB_INTAKE_V0_CONTRACT=Object.freeze({capability:'FACT-001/self-extending-github-intake-v0',wraps:'universal-skill-github-intake-v1',preserves_terminal_rejections:true,blocked_external_terminal:false,auto_resume_after_dependency:true,environment:PREPROD,prod:false,trading:false,customer_data:false,additional_cost_target_eur:0});
