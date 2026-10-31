#!/usr/bin/env node
import fs from 'node:fs';

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
const ELIGIBLE_EVIDENCE=new Set(['POST_MERGE_CERTIFIED','FIRST_REAL_DOMAIN_POST_MERGE_CERTIFIED','GOVERNED_PROD_PROMOTION_V1_ELIGIBLE']);
const DEFAULT_PROD_OVERRIDE='cerebro/registry/prod-promotion-policy-overrides.v1.json';

function policyFor(registry,engineId){
  if(!registry||registry.state_type!=='CEREBRO_RSI_DOMAIN_AUTONOMY_POLICY_REGISTRY')throw new Error('domain autonomy policy registry required');
  return (registry.policies??[]).find(p=>p.engine_id===engineId)??null;
}
function prodOverrideFor(registry,engineId){
  if(!registry)return null;
  if(registry.state_type!=='CEREBRO_PROD_PROMOTION_POLICY_OVERRIDES_V1')throw new Error('invalid PROD promotion policy override registry');
  if(registry.trading_access!==false||Number(registry.additional_cost_eur)!==0||registry.default!=='FAIL_CLOSED')throw new Error('unsafe PROD promotion override registry');
  return (registry.policies??[]).find(p=>p.engine_id===engineId)??null;
}
function humanReason(blockers){
  if(blockers.includes('DOMAIN_COST_LIMIT_NOT_ZERO'))return 'MONEY_LIMIT';
  if(blockers.some(b=>b==='PR_CREATION_BLOCKED_BY_REPOSITORY_POLICY'||b.startsWith('DOMAIN_AUTONOMY_MODE_')||b==='DOMAIN_PROD_AUTHORITY_NOT_GRANTED'||b==='DOMAIN_KILL_SWITCH_NOT_ARMED'||b==='DOMAIN_ROLLBACK_NOT_ALLOWED'))return 'POLICY_CONFLICT';
  return null;
}

export function assessQaPromotionReadiness({tribunal,prHandoff,policies,prodOverrides=null,owner_engine='HCI-001',domain_engine='APP-001',now=new Date().toISOString()}={}){
  if(!tribunal||tribunal.state_type!=='CEREBRO_AUTO001_REPAIR_TRIBUNAL_V0')throw new Error('verified tribunal required');
  if(!prHandoff||prHandoff.state_type!=='CEREBRO_AUTO001_PR_HANDOFF_V0')throw new Error('verified PR handoff required');
  const basePolicy=policyFor(policies,domain_engine);
  if(!basePolicy)throw new Error(`domain policy missing:${domain_engine}`);
  const override=prodOverrideFor(prodOverrides,domain_engine);
  const domainPolicy=override?{...basePolicy,...override}:basePolicy;
  const blockers=[];
  if(tribunal.approved!==true||tribunal.status!=='APPROVE_PREPROD_PATCH')blockers.push('TRIBUNAL_NOT_APPROVED');
  if(prHandoff.preprod_patch_validated!==true||prHandoff.tribunal_approved!==true)blockers.push('PREPROD_PATCH_NOT_CERTIFIED');
  if(prHandoff.status==='BLOCKED_REPOSITORY_ACTIONS_POLICY')blockers.push('PR_CREATION_BLOCKED_BY_REPOSITORY_POLICY');
  if(!['OPENED_AUTONOMOUSLY','ALREADY_OPEN'].includes(prHandoff.status))blockers.push('PROMOTION_CARRIER_NOT_AUTONOMOUSLY_AVAILABLE');
  if(domainPolicy.autonomy_mode!=='PREPROD_AUTONOMOUS')blockers.push(`DOMAIN_AUTONOMY_MODE_${domainPolicy.autonomy_mode}`);
  if(!ELIGIBLE_EVIDENCE.has(domainPolicy.evidence_state))blockers.push(`DOMAIN_EVIDENCE_${domainPolicy.evidence_state}`);
  if(domainPolicy.prod_authorized!==true||domainPolicy.prod_write_authorized!==true)blockers.push('DOMAIN_PROD_AUTHORITY_NOT_GRANTED');
  if(domainPolicy.kill_switch_enabled!==true||domainPolicy.kill_switch_state!=='ARMED')blockers.push('DOMAIN_KILL_SWITCH_NOT_ARMED');
  if(domainPolicy.automatic_rollback_allowed!==true)blockers.push('DOMAIN_ROLLBACK_NOT_ALLOWED');
  if(Number(domainPolicy.additional_cost_limit_eur)!==0)blockers.push('DOMAIN_COST_LIMIT_NOT_ZERO');
  const reason=humanReason(blockers);
  const autonomousReady=blockers.length===0;
  const status=autonomousReady?'AUTONOMOUS_PROMOTION_READY':reason?'HUMAN_REQUIRED':'REPAIR_REQUIRED';
  return {
    schema_version:'0.5.0',state_type:'CEREBRO_QA_PROMOTION_READINESS_V0',company_id:'fenix',engine_id:'QA-001',environment:'PREPROD_CONTROL_PLANE',version:'0.5.0',updated_at:now,
    status,
    human_required:reason?{reason,scope:'LOW_RISK_APP_PATCH_PROMOTION',owner_engine,domain_engine,blockers}:null,
    owner_engine,domain_engine,
    evidence:{tribunal_status:tribunal.status,tribunal_approved:tribunal.approved===true,pr_handoff_status:prHandoff.status,preprod_patch_validated:prHandoff.preprod_patch_validated===true,domain_autonomy_mode:domainPolicy.autonomy_mode,domain_evidence_state:domainPolicy.evidence_state,domain_prod_authorized:domainPolicy.prod_authorized===true,domain_prod_write_authorized:domainPolicy.prod_write_authorized===true,kill_switch_armed:domainPolicy.kill_switch_enabled===true&&domainPolicy.kill_switch_state==='ARMED',prod_override_applied:Boolean(override)},
    blockers,
    authority:{merge_authorized:autonomousReady,promotion_authorized:autonomousReady,prod_authorized:autonomousReady,prod_write_authorized:autonomousReady},
    next_gate:autonomousReady?'GOVERNED_PROMOTION_EXECUTOR_V1':reason?'HUMAN_EXCEPTION_RESOLUTION':'AUTONOMOUS_REPAIR_LOOP',
    safety:{prod_write:false,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0}
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const tribunal=req(arg('--tribunal'),'--tribunal');const handoff=req(arg('--pr-handoff'),'--pr-handoff');const policy=req(arg('--policies'),'--policies');const out=req(arg('--out'),'--out');
  const overridePath=arg('--prod-overrides')??DEFAULT_PROD_OVERRIDE;
  const prodOverrides=fs.existsSync(overridePath)?read(overridePath):null;
  const state=assessQaPromotionReadiness({tribunal:read(tribunal),prHandoff:read(handoff),policies:read(policy),prodOverrides});
  fs.writeFileSync(out,JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({status:state.status,reason:state.human_required?.reason??null,blockers:state.blockers,next_gate:state.next_gate,cost_eur:0}));
}
