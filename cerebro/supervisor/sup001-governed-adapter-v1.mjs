import { evaluateHealth, SUP_001 } from '../runtime/l2/sup001-v1.mjs';

const HUMAN_REQUIRED = new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);

function assertPolicy(policy){
  if(!policy || policy.engine_id!=='SUP-001' || policy.fail_closed!==true) throw new TypeError('invalid SUP-001 policy');
  if(!Array.isArray(policy.allowed_recovery_playbooks)) throw new TypeError('allowed_recovery_playbooks required');
  return policy;
}

export function evaluateSupervisorCycle(input, policy){
  const p=assertPolicy(policy);
  const expectedCompany=String(input?.expected_company_id||'').trim();
  const actualCompany=String(input?.context?.company_id||'').trim();
  if(!expectedCompany || actualCompany!==expectedCompany){
    return {engine_id:'SUP-001',status:'HUMAN_REQUIRED',human_exception_code:'POLICY_CONFLICT',reason:'CROSS_COMPANY_DENIED',recovery_execution:false,prod_write:false,additional_cost_eur:0};
  }
  const health=evaluateHealth({context:input.context,checks:input.checks});
  if(health.human_exception_code){
    if(!HUMAN_REQUIRED.has(health.human_exception_code)) throw new Error('non-canonical HUMAN_REQUIRED');
    return {...health,watchdog_status:'ESCALATED',recovery_candidates:[],recovery_execution:false,prod_write:false,additional_cost_eur:0};
  }
  const nowMs=Date.parse(input?.now);
  const heartbeatMs=Date.parse(input?.heartbeat_at);
  const maxAge=Number(p.watchdog?.max_heartbeat_age_ms);
  if(!Number.isFinite(nowMs)||!Number.isFinite(heartbeatMs)||!Number.isFinite(maxAge)||maxAge<1) throw new TypeError('invalid watchdog inputs');
  const stale=nowMs-heartbeatMs>maxAge;
  if(stale){
    return {...health,status:'HUMAN_REQUIRED',human_exception_code:'LOW_CONFIDENCE',watchdog_status:'STALE',recovery_candidates:[],recovery_execution:false,prod_write:false,additional_cost_eur:0};
  }
  const allowed=new Set(p.allowed_recovery_playbooks);
  const candidates=[];
  for(const check of health.red_checks||[]){
    if(check.known!==true || !check.recovery_playbook_id){
      return {...health,status:'HUMAN_REQUIRED',human_exception_code:'LOW_CONFIDENCE',watchdog_status:'GREEN',recovery_candidates:[],recovery_execution:false,prod_write:false,additional_cost_eur:0};
    }
    if(!allowed.has(check.recovery_playbook_id)){
      return {...health,status:'HUMAN_REQUIRED',human_exception_code:'POLICY_CONFLICT',watchdog_status:'GREEN',recovery_candidates:[],recovery_execution:false,prod_write:false,additional_cost_eur:0};
    }
    candidates.push({check_id:check.id,playbook_id:check.recovery_playbook_id,authorized:true,execution:false});
  }
  return {...health,status:candidates.length?'RECOVERY_CANDIDATE':'HEALTHY',watchdog_status:'GREEN',recovery_candidates:candidates,recovery_execution:false,prod_write:false,additional_cost_eur:0,contract:SUP_001.engine_id};
}
