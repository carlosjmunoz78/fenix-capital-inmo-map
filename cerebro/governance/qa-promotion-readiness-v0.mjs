#!/usr/bin/env node
import fs from 'node:fs';

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
const CANONICAL_REASON='POLICY_CONFLICT';

function policyFor(registry,engineId){
  if(!registry||registry.state_type!=='CEREBRO_RSI_DOMAIN_AUTONOMY_POLICY_REGISTRY')throw new Error('domain autonomy policy registry required');
  return (registry.policies??[]).find(p=>p.engine_id===engineId)??null;
}

export function assessQaPromotionReadiness({tribunal,prHandoff,policies,owner_engine='HCI-001',domain_engine='APP-001',now=new Date().toISOString()}={}){
  if(!tribunal||tribunal.state_type!=='CEREBRO_AUTO001_REPAIR_TRIBUNAL_V0')throw new Error('verified tribunal required');
  if(!prHandoff||prHandoff.state_type!=='CEREBRO_AUTO001_PR_HANDOFF_V0')throw new Error('verified PR handoff required');
  const domainPolicy=policyFor(policies,domain_engine);
  if(!domainPolicy)throw new Error(`domain policy missing:${domain_engine}`);
  const blockers=[];
  if(tribunal.approved!==true||tribunal.status!=='APPROVE_PREPROD_PATCH')blockers.push('TRIBUNAL_NOT_APPROVED');
  if(prHandoff.preprod_patch_validated!==true||prHandoff.tribunal_approved!==true)blockers.push('PREPROD_PATCH_NOT_CERTIFIED');
  if(prHandoff.status==='BLOCKED_REPOSITORY_ACTIONS_POLICY')blockers.push('PR_CREATION_BLOCKED_BY_REPOSITORY_POLICY');
  if(!['OPENED_AUTONOMOUSLY','ALREADY_OPEN'].includes(prHandoff.status))blockers.push('PROMOTION_CARRIER_NOT_AUTONOMOUSLY_AVAILABLE');
  if(domainPolicy.autonomy_mode!=='PREPROD_AUTONOMOUS')blockers.push(`DOMAIN_AUTONOMY_MODE_${domainPolicy.autonomy_mode}`);
  if(domainPolicy.evidence_state!=='POST_MERGE_CERTIFIED'&&domainPolicy.evidence_state!=='FIRST_REAL_DOMAIN_POST_MERGE_CERTIFIED')blockers.push(`DOMAIN_EVIDENCE_${domainPolicy.evidence_state}`);
  if(policies.prod_authorized!==true||policies.prod_write_authorized!==true)blockers.push('PROD_AUTHORITY_NOT_GRANTED');
  const autonomousReady=blockers.length===0;
  return {
    schema_version:'0.2.0',state_type:'CEREBRO_QA_PROMOTION_READINESS_V0',company_id:'fenix',engine_id:'QA-001',environment:'PREPROD_CONTROL_PLANE',version:'0.2.0',updated_at:now,
    status:autonomousReady?'AUTONOMOUS_PROMOTION_READY':'HUMAN_REQUIRED',
    human_required:autonomousReady?null:{reason:CANONICAL_REASON,scope:'LOW_RISK_APP_PATCH_PROMOTION',owner_engine,domain_engine,blockers},
    owner_engine,domain_engine,
    evidence:{tribunal_status:tribunal.status,tribunal_approved:tribunal.approved===true,pr_handoff_status:prHandoff.status,preprod_patch_validated:prHandoff.preprod_patch_validated===true,domain_autonomy_mode:domainPolicy.autonomy_mode,domain_evidence_state:domainPolicy.evidence_state,registry_prod_authorized:policies.prod_authorized===true,registry_prod_write_authorized:policies.prod_write_authorized===true},
    blockers,
    authority:{merge_authorized:autonomousReady,promotion_authorized:autonomousReady,prod_authorized:autonomousReady,prod_write_authorized:autonomousReady},
    next_gate:autonomousReady?'GOVERNED_PROMOTION_EXECUTOR_V1':'POLICY_AND_DOMAIN_EVIDENCE_REQUIRED',
    safety:{prod_write:false,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0}
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const tribunal=req(arg('--tribunal'),'--tribunal');const handoff=req(arg('--pr-handoff'),'--pr-handoff');const policy=req(arg('--policies'),'--policies');const out=req(arg('--out'),'--out');
  const state=assessQaPromotionReadiness({tribunal:read(tribunal),prHandoff:read(handoff),policies:read(policy)});
  fs.writeFileSync(out,JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({status:state.status,reason:state.human_required?.reason??null,blockers:state.blockers,next_gate:state.next_gate,cost_eur:0}));
}
