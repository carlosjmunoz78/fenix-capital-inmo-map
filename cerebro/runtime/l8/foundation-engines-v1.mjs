const ALLOWED_ENVIRONMENTS=new Set(['LAB','PREPROD']);
const HUMAN_CODES=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
export const ENGINE_DEFINITIONS=Object.freeze([
  {engine_id:'BMD-001',name:'Business Model Discovery',mode:'business_model'},
  {engine_id:'PROC-001',name:'Process Discovery',mode:'process'},
  {engine_id:'COMP-DEP-001',name:'Company Deployment',mode:'deployment'},
  {engine_id:'COMP-HLT-001',name:'Company Health',mode:'health'},
  {engine_id:'COMP-BKP-001',name:'Company Backup / Rebuild',mode:'backup'},
  {engine_id:'COMP-OFF-001',name:'Company Offboarding / Export',mode:'offboarding'}
].map(x=>Object.freeze(x)));
const BY_ID=new Map(ENGINE_DEFINITIONS.map(x=>[x.engine_id,x]));
function ctx(engineId,input={}){
  const company_id=String(input.company_id||'').trim();
  const principal_company_id=String(input.principal_company_id||company_id).trim();
  const environment=String(input.environment||'').trim().toUpperCase();
  const version=String(input.version||'0.1.0-foundation').trim();
  if(!company_id)throw new Error(`${engineId}: company_id required`);
  if(principal_company_id!==company_id)throw new Error(`${engineId}: CROSS_COMPANY_DENIED`);
  if(!ALLOWED_ENVIRONMENTS.has(environment))throw new Error(`${engineId}: environment must be LAB or PREPROD`);
  return Object.freeze({company_id,engine_id:engineId,environment,version,project_id:input.project_id??null,identity_id:input.identity_id??null,account_id:input.account_id??null});
}
function human(code,reason,context){if(!HUMAN_CODES.has(code))throw new Error(`Unsupported HUMAN_REQUIRED code: ${code}`);return {status:'HUMAN_REQUIRED',human_required:true,human_required_code:code,reason,context};}
const clamp=n=>Math.max(0,Math.min(100,Number.isFinite(Number(n))?Number(n):0));
export function foundationManifest(engineId){const d=BY_ID.get(engineId);if(!d)throw new Error(`Unknown L8 foundation engine ${engineId}`);return Object.freeze({engine_id:d.engine_id,name:d.name,layer:'L8',version:'0.1.0-foundation',environment:'LAB_PREPROD_ONLY',company_scope:'REQUIRED_DENY_CROSS_COMPANY',network_execution:false,external_actions:false,prod_writes:false,destructive_actions:false,secret_values:false,paid_ai_required:false,additional_cost_eur:0,promotion_authorized:false});}
export function executeFoundation(engineId,input={}){
  const d=BY_ID.get(engineId);if(!d)throw new Error(`Unknown L8 foundation engine ${engineId}`);const context=ctx(engineId,input);
  if(input.security_incident===true)return human('SECURITY_INCIDENT','Security incident requires human handling',context);
  if(input.high_risk===true)return human('HIGH_RISK','High-risk company operation requires review',context);
  if(input.low_confidence===true)return human('LOW_CONFIDENCE','Low-confidence result requires review',context);
  if(input.policy_conflict===true)return human('POLICY_CONFLICT','Policy conflict requires resolution',context);
  if(Number(input.requested_spend_eur||0)>Number(input.preauthorized_spend_eur||0))return human('MONEY_LIMIT','Requested spend exceeds preauthorized limit',context);
  switch(d.mode){
    case 'business_model':{
      const revenue=Array.isArray(input.revenue_streams)?input.revenue_streams.filter(Boolean):[];
      const segments=Array.isArray(input.customer_segments)?input.customer_segments.filter(Boolean):[];
      const costs=Array.isArray(input.cost_drivers)?input.cost_drivers.filter(Boolean):[];
      const completeness=Math.round(([revenue.length>0,segments.length>0,costs.length>0,Boolean(input.value_proposition)].filter(Boolean).length/4)*100);
      return {status:'FOUNDATION_OK',context,model:{value_proposition:String(input.value_proposition||''),revenue_streams:revenue,customer_segments:segments,cost_drivers:costs},completeness_pct:completeness,external_research_executed:false};
    }
    case 'process':{
      const steps=Array.isArray(input.steps)?input.steps.map((x,i)=>({id:String(x.id??`step-${i+1}`),name:String(x.name??''),owner:x.owner??null})):[];
      const duplicateIds=steps.map(x=>x.id).filter((id,i,a)=>a.indexOf(id)!==i);
      return {status:'FOUNDATION_OK',context,steps,valid:steps.length>0&&duplicateIds.length===0,duplicate_ids:[...new Set(duplicateIds)],writes_external_system:false};
    }
    case 'deployment':{
      const required=['registry','knowledge','seo','crm','app','automation','training','backup'];
      const ready=required.filter(k=>input[k]===true);
      return {status:'FOUNDATION_OK',context,ready_checks:ready,missing_checks:required.filter(k=>!ready.includes(k)),readiness_pct:Math.round((ready.length/required.length)*100),deployment_executed:false,prod_promotion:false};
    }
    case 'health':{
      const metrics=Array.isArray(input.metrics)?input.metrics.map(x=>clamp(x)):[];
      const score=metrics.length?Math.round(metrics.reduce((a,b)=>a+b,0)/metrics.length):0;
      return {status:'FOUNDATION_OK',context,health_score:score,metric_count:metrics.length,state:score>=80?'GREEN':score>=60?'AMBER':'RED',autonomous_remediation:false};
    }
    case 'backup':{
      const assets=Array.isArray(input.assets)?input.assets.filter(Boolean).map(String):[];
      return {status:'FOUNDATION_OK',context,backup_plan:assets.map(asset=>({asset,action:'SNAPSHOT_THEN_VERIFY'})),rebuild_plan:assets.map(asset=>({asset,action:'REBUILD_FROM_VERIFIED_SOURCE'})),backup_executed:false,rebuild_executed:false,destructive_action:false};
    }
    case 'offboarding':{
      const resources=Array.isArray(input.resources)?input.resources.filter(Boolean).map(String):[];
      return {status:'FOUNDATION_OK',context,export_plan:resources.map(resource=>({resource,action:'EXPORT_VERIFY_RETAIN'})),access_revocation_plan:resources.map(resource=>({resource,action:'REVIEW_THEN_REVOKE'})),deletion_executed:false,revocation_executed:false,signature_required_for_destructive_change:true};
    }
    default:throw new Error(`Unsupported L8 mode ${d.mode}`);
  }
}
