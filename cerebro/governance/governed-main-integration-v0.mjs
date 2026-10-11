#!/usr/bin/env node
import fs from 'node:fs';

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'))}

function certifiedClass(policy, transformId){
  if(!policy||policy.state_type!=='CEREBRO_QA_CERTIFIED_MAIN_INTEGRATION_POLICY_V0')throw new Error('certified main integration policy required');
  return (policy.classes??[]).find(x=>x.transform_id===transformId)??null;
}

export function assessGovernedMainIntegration({autoState,prFacts,policy,sourceText='',now=new Date().toISOString()}={}){
  if(!autoState||autoState.state_type!=='CEREBRO_AUTO001_REPAIR_AUTONOMY_STATE_V0')throw new Error('AUTO-001 repair autonomy state required');
  if(!prFacts||prFacts.state_type!=='CEREBRO_AUTO001_PR_FACTS_V0')throw new Error('verified PR facts required');
  const cls=certifiedClass(policy,autoState.transform_id);
  const blockers=[];
  if(!cls)blockers.push('TRANSFORM_NOT_CERTIFIED_FOR_MAIN_INTEGRATION');
  if(policy.main_integration_authorized!==true)blockers.push('MAIN_INTEGRATION_POLICY_DISABLED');
  if(policy.prod_deploy_authorized!==false||policy.prod_write_authorized!==false)blockers.push('POLICY_PROD_AUTHORITY_DRIFT');
  if(autoState.preprod_patch_validated!==true)blockers.push('PREPROD_PATCH_NOT_VALIDATED');
  if(autoState.regression_passed!==true)blockers.push('REGRESSION_NOT_GREEN');
  if(autoState.rebuild_passed!==true)blockers.push('REBUILD_NOT_GREEN');
  if(autoState.rollback_passed!==true)blockers.push('ROLLBACK_NOT_GREEN');
  if(autoState.tribunal_approved!==true||autoState.tribunal_status!=='APPROVE_PREPROD_PATCH')blockers.push('TRIBUNAL_NOT_APPROVED');
  if(autoState.safety?.prod_write!==false||autoState.safety?.customer_data!==false||autoState.safety?.trading!==false||Number(autoState.safety?.additional_subscription_eur??NaN)!==0)blockers.push('AUTO_STATE_SAFETY_DRIFT');
  if(prFacts.base_ref!=='main')blockers.push('BASE_NOT_MAIN');
  if(autoState.branch!==prFacts.head_ref)blockers.push('HEAD_BRANCH_STATE_MISMATCH');
  if(autoState.base_sha!==prFacts.base_sha)blockers.push('BASE_SHA_STATE_MISMATCH');
  if(cls){
    if(!String(prFacts.head_ref??'').startsWith(cls.head_prefix))blockers.push('HEAD_PREFIX_NOT_CERTIFIED');
    const files=Array.isArray(prFacts.changed_files)?prFacts.changed_files:[];
    if(files.length<1||files.length>cls.max_files_changed)blockers.push('FILE_COUNT_OUT_OF_BOUNDS');
    if(files.some(f=>!cls.allowed_files.includes(f)))blockers.push('UNAUTHORIZED_FILE_CHANGED');
    if(Number(prFacts.line_delta)>Number(cls.max_line_delta))blockers.push('LINE_DELTA_OUT_OF_BOUNDS');
    if(Number(prFacts.line_delta)<1)blockers.push('EMPTY_CHANGE');
    const commitText=String(prFacts.commit_messages??'');
    if((cls.forbidden_commit_markers??[]).some(m=>commitText.includes(m)))blockers.push('PROD_DEPLOY_MARKER_FORBIDDEN');
    if((cls.required_source_markers??[]).some(m=>!sourceText.includes(m)))blockers.push('CERTIFIED_SOURCE_MARKER_MISSING');
    if(cls.main_merge_authorized!==true)blockers.push('CLASS_MAIN_MERGE_DISABLED');
    if(cls.prod_deploy_authorized!==false)blockers.push('CLASS_PROD_AUTHORITY_DRIFT');
  }
  const ready=blockers.length===0;
  return {
    schema_version:'0.1.0',
    state_type:'CEREBRO_GOVERNED_MAIN_INTEGRATION_READINESS_V0',
    company_id:'fenix',engine_id:'AUTO-001',environment:'CONTROL_PLANE',version:'0.1.0',updated_at:now,
    status:ready?'MAIN_INTEGRATION_READY':'HUMAN_REQUIRED',
    human_required:ready?null:{reason:'POLICY_CONFLICT',scope:'CERTIFIED_LOW_RISK_MAIN_INTEGRATION',blockers},
    class_id:cls?.class_id??null,transform_id:autoState.transform_id??null,head_ref:prFacts.head_ref??null,base_sha:prFacts.base_sha??null,
    blockers,
    authority:{main_merge_authorized:ready,prod_deploy_authorized:false,prod_authorized:false,prod_write_authorized:false},
    next_gate:ready?'MERGE_TO_MAIN_WITHOUT_PROD_DEPLOY':'RESOLVE_POLICY_OR_EVIDENCE',
    safety:{prod_write:false,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0}
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const autoFile=req(arg('--auto-state'),'--auto-state');
  const factsFile=req(arg('--pr-facts'),'--pr-facts');
  const policyFile=req(arg('--policy'),'--policy');
  const sourceFile=req(arg('--source'),'--source');
  const out=req(arg('--out'),'--out');
  const state=assessGovernedMainIntegration({autoState:read(autoFile),prFacts:read(factsFile),policy:read(policyFile),sourceText:fs.readFileSync(sourceFile,'utf8')});
  fs.writeFileSync(out,JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({status:state.status,class_id:state.class_id,blockers:state.blockers,next_gate:state.next_gate,cost_eur:0}));
}
