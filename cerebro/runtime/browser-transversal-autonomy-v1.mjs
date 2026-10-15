const HUMAN_REQUIRED_CODES=Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

const ENVIRONMENTS=new Set(['LAB','PREPROD','PROD']);
const ACTION_KINDS=new Set(['OBSERVE','AUTHENTICATED_OBSERVE','ROUTINE_MUTATION']);

function bool(value){return value===true;}
function num(value){return Number.isFinite(value)?Number(value):0;}

function humanReason(operation={}){
  if(bool(operation.security_incident)) return 'SECURITY_INCIDENT';
  if(bool(operation.legal_required)) return 'LEGAL_REQUIRED';
  if(bool(operation.signature_required)) return 'SIGNATURE_REQUIRED';
  if(bool(operation.high_risk)) return 'HIGH_RISK';
  if(num(operation.incremental_spend_eur)>0) return 'MONEY_LIMIT';
  if(bool(operation.low_confidence)) return 'LOW_CONFIDENCE';
  if(bool(operation.policy_conflict)) return 'POLICY_CONFLICT';
  if(bool(operation.customer_human_request)) return 'CUSTOMER_HUMAN_REQUEST';
  return null;
}

export function evaluateBrowserExecution({
  engine_id,
  environment,
  canonical_engine_ids=[],
  route_needed=true,
  browser_binding={},
  operation={},
  engine_authority={}
}={}){
  const base={
    schema_version:'1.0.0',
    engine_id:engine_id??null,
    environment:environment??null,
    browser_is_tool_not_authority:true,
    browser_use_requires_separate_human_approval:false,
    authority_source:'ORIGIN_ENGINE_POLICY_AND_GOVERNED_ACTION_CONTRACT',
    external_skill_code_execution:false,
    additional_cost_eur:num(operation.incremental_spend_eur),
    human_required:null,
    browser_execution_authorized:false,
    action_execution_authorized:false
  };

  if(!canonical_engine_ids.includes(engine_id)) return Object.freeze({...base,status:'HOLD_UNKNOWN_ENGINE'});
  if(!ENVIRONMENTS.has(environment)) return Object.freeze({...base,status:'HOLD_INVALID_ENVIRONMENT'});
  if(route_needed!==true) return Object.freeze({...base,status:'HOLD_BROWSER_ROUTE_NOT_NEEDED'});
  if(browser_binding.healthy!==true||browser_binding.kill_switch_enabled!==true||browser_binding.fresh_attestation!==true){
    return Object.freeze({...base,status:'HOLD_BROWSER_BINDING_NOT_READY'});
  }
  if(operation.external_skill_code_execution===true){
    return Object.freeze({...base,status:'HUMAN_REQUIRED',human_required:'POLICY_CONFLICT'});
  }

  const reason=humanReason(operation);
  if(reason) return Object.freeze({...base,status:'HUMAN_REQUIRED',human_required:reason});

  const kind=operation.kind;
  if(!ACTION_KINDS.has(kind)) return Object.freeze({...base,status:'HOLD_UNKNOWN_ACTION_KIND'});
  if(engine_authority.browser_use_authorized!==true) return Object.freeze({...base,status:'HOLD_ORIGIN_ENGINE_BROWSER_NOT_AUTHORIZED'});

  if(kind==='AUTHENTICATED_OBSERVE'&&engine_authority.session_binding_authorized!==true){
    return Object.freeze({...base,status:'HOLD_SESSION_BINDING_NOT_AUTHORIZED'});
  }

  if(operation.trading_scope===true){
    const isolated=engine_authority.trading_scope_authorized===true&&engine_authority.isolated_trading_runtime===true;
    if(!isolated) return Object.freeze({...base,status:'HOLD_TRADING_ISOLATION_NOT_PROVEN'});
  }

  if(kind==='OBSERVE'||kind==='AUTHENTICATED_OBSERVE'){
    return Object.freeze({...base,status:'AUTHORIZED',browser_execution_authorized:true,action_execution_authorized:true});
  }

  if(engine_authority.operation_authorized!==true){
    return Object.freeze({...base,status:'HOLD_ORIGIN_ENGINE_ACTION_NOT_AUTHORIZED'});
  }

  if(environment==='PROD'){
    const prodReady=
      engine_authority.prod_mutation_authorized===true&&
      engine_authority.promotion_gate_green===true&&
      engine_authority.rollback_ready===true&&
      engine_authority.observability_ready===true&&
      engine_authority.audit_ready===true&&
      engine_authority.idempotency_proven===true;
    if(!prodReady) return Object.freeze({...base,status:'HOLD_PROD_ACTION_GATE_NOT_GREEN'});
  }

  return Object.freeze({...base,status:'AUTHORIZED',browser_execution_authorized:true,action_execution_authorized:true});
}

export function getBrowserHumanRequiredCodes(){return [...HUMAN_REQUIRED_CODES];}
