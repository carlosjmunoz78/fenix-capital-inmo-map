function clean(v){return typeof v==='string'?v.trim():'';}
function clone(v){return JSON.parse(JSON.stringify(v??{}));}

export function evaluateOwnerAuthorization({communicationState={},request={}}={}){
  const approvalId=clean(request.approval_id);
  const scope=clean(request.scope_fingerprint);
  const technicalId=clean(request.technical_id);
  const stage=clean(request.stage);
  if(!approvalId||!scope||!technicalId||!stage){
    return Object.freeze({authorized:false,reason:'INCOMPLETE_EXACT_REQUEST',source:null});
  }

  const decisions=Array.isArray(communicationState.decisions)?communicationState.decisions:[];
  const exact=decisions.find(d=>
    d?.approval_id===approvalId&&
    d?.decision==='AUTHORIZED'&&
    clean(d?.scope_fingerprint)===scope&&
    clean(d?.technical_id)===technicalId&&
    clean(d?.stage)===stage
  );
  if(exact){
    return Object.freeze({
      authorized:true,
      reason:'EXACT_OWNER_DECISION_MATCH',
      source:'OWNER_EMAIL_EXACT_COMMAND',
      approval_id:approvalId,
      scope_fingerprint:scope,
      one_time:true,
      policy_changed:false
    });
  }

  const standing=communicationState?.standing_authorizations?.[scope];
  if(standing?.status==='ACTIVE'&&standing?.exact_scope_only===true){
    return Object.freeze({
      authorized:true,
      reason:'ACTIVE_STANDING_AUTHORIZATION_EXACT_SCOPE',
      source:'STANDING_AUTHORIZATION',
      approval_id:standing.approval_id??null,
      scope_fingerprint:scope,
      one_time:false,
      policy_changed:true
    });
  }

  return Object.freeze({
    authorized:false,
    reason:'NO_MATCHING_OWNER_AUTHORIZATION',
    source:null,
    approval_id:approvalId,
    scope_fingerprint:scope
  });
}

export function buildOwnerDecisionAuditEvent({request={},authorization={},company_id='GLOBAL',environment='GLOBAL',version='1.0.0',now=new Date().toISOString()}={}){
  const decisionType=authorization?.source==='STANDING_AUTHORIZATION'?'explicit_policy_change':'human_decision';
  return Object.freeze({
    schema_version:'1.0.0',
    contract_id:'CONSOLE-OWNER-DECISION-V1',
    company_id,
    owner:'CEREBRO-CONSOLE-001',
    environment,
    version,
    decision_type:decisionType,
    state:authorization?.authorized===true?'CONFIRMED':'ACTION_PROPOSAL',
    confirmation_semantics:'EXPLICIT_YES_TO_CURRENT_EXACT_PROPOSAL',
    scope_change_invalidates_confirmation:true,
    approval_id:clean(request.approval_id)||null,
    scope_fingerprint:clean(request.scope_fingerprint)||null,
    technical_id:clean(request.technical_id)||null,
    stage:clean(request.stage)||null,
    authorization_source:authorization?.source??null,
    authorized:authorization?.authorized===true,
    reason:authorization?.reason??'UNKNOWN',
    idempotency_required_before_execution:true,
    questions_do_not_execute:true,
    permanent_policy_change:authorization?.source==='STANDING_AUTHORIZATION',
    recorded_at:now
  });
}

export function consumeOneTimeAuthorization(communicationState,{approval_id,scope_fingerprint,technical_id,stage,execution_id,now=new Date().toISOString()}={}){
  const out=clone(communicationState);
  const authorization=evaluateOwnerAuthorization({communicationState:out,request:{approval_id,scope_fingerprint,technical_id,stage}});
  if(!authorization.authorized) return Object.freeze({state:out,consumed:false,authorization});
  if(authorization.source==='STANDING_AUTHORIZATION') return Object.freeze({state:out,consumed:false,authorization});

  out.consumed_authorizations=out.consumed_authorizations??[];
  if(out.consumed_authorizations.some(x=>x.approval_id===approval_id)){
    return Object.freeze({state:out,consumed:false,authorization:Object.freeze({...authorization,authorized:false,reason:'ONE_TIME_AUTHORIZATION_ALREADY_CONSUMED'})});
  }
  out.consumed_authorizations.push({approval_id,scope_fingerprint,technical_id,stage,execution_id:clean(execution_id)||null,consumed_at:now});
  out.updated_at=now;
  return Object.freeze({state:out,consumed:true,authorization});
}
