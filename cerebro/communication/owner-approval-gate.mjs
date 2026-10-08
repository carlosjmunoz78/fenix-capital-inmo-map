function clean(v){return typeof v==='string'?v.trim():'';}
function clone(v){return JSON.parse(JSON.stringify(v??{}));}

function exactMatch(row,{approvalId,scope,technicalId,stage}){
  return row?.approval_id===approvalId&&clean(row?.scope_fingerprint)===scope&&clean(row?.technical_id)===technicalId&&clean(row?.stage)===stage;
}

export function evaluateOwnerAuthorization({communicationState={},request={}}={}){
  const approvalId=clean(request.approval_id);
  const scope=clean(request.scope_fingerprint);
  const technicalId=clean(request.technical_id);
  const stage=clean(request.stage);
  if(!approvalId||!scope||!technicalId||!stage) return Object.freeze({authorized:false,reason:'INCOMPLETE_EXACT_REQUEST',source:null});

  const action=communicationState?.authorized_actions?.[approvalId];
  if(action?.status==='AUTHORIZED_WAITING_EXECUTION'&&exactMatch(action,{approvalId,scope,technicalId,stage})){
    return Object.freeze({authorized:true,reason:'EXACT_AUTHORIZED_ACTION_MATCH',source:'OWNER_EMAIL_EXACT_COMMAND',approval_id:approvalId,scope_fingerprint:scope,one_time:true,policy_changed:false});
  }

  const standing=communicationState?.standing_authorizations?.[scope];
  if(standing?.status==='ACTIVE'&&standing?.exact_scope_only===true){
    return Object.freeze({authorized:true,reason:'ACTIVE_STANDING_AUTHORIZATION_EXACT_SCOPE',source:'STANDING_AUTHORIZATION',approval_id:standing.approval_id??null,scope_fingerprint:scope,one_time:false,policy_changed:false,policy_basis_active:true});
  }

  return Object.freeze({authorized:false,reason:'NO_MATCHING_OWNER_AUTHORIZATION',source:null,approval_id:approvalId,scope_fingerprint:scope});
}

export function buildOwnerDecisionAuditEvent({request={},authorization={},company_id='GLOBAL',environment='GLOBAL',version='1.0.0',now=new Date().toISOString()}={}){
  return Object.freeze({
    schema_version:'1.0.0',contract_id:'CONSOLE-OWNER-DECISION-V1',company_id,owner:'CEREBRO-CONSOLE-001',environment,version,
    decision_type:'human_decision',
    state:authorization?.authorized===true?'CONFIRMED':'ACTION_PROPOSAL',
    confirmation_semantics:'EXPLICIT_YES_TO_CURRENT_EXACT_PROPOSAL',scope_change_invalidates_confirmation:true,
    approval_id:clean(request.approval_id)||null,scope_fingerprint:clean(request.scope_fingerprint)||null,technical_id:clean(request.technical_id)||null,stage:clean(request.stage)||null,
    authorization_source:authorization?.source??null,authorized:authorization?.authorized===true,reason:authorization?.reason??'UNKNOWN',idempotency_required_before_execution:true,questions_do_not_execute:true,
    permanent_policy_change:false,standing_policy_basis:authorization?.source==='STANDING_AUTHORIZATION',recorded_at:now
  });
}

export function consumeOneTimeAuthorization(communicationState,{approval_id,scope_fingerprint,technical_id,stage,execution_id,now=new Date().toISOString()}={}){
  const out=clone(communicationState);
  const authorization=evaluateOwnerAuthorization({communicationState:out,request:{approval_id,scope_fingerprint,technical_id,stage}});
  if(!authorization.authorized) return Object.freeze({state:out,consumed:false,authorization});
  if(authorization.source==='STANDING_AUTHORIZATION') return Object.freeze({state:out,consumed:false,authorization});

  const action=out.authorized_actions?.[approval_id];
  if(!action||action.status!=='AUTHORIZED_WAITING_EXECUTION'){
    return Object.freeze({state:out,consumed:false,authorization:Object.freeze({...authorization,authorized:false,reason:'ONE_TIME_AUTHORIZATION_NOT_AVAILABLE'})});
  }
  action.status='CONSUMED';
  action.execution_id=clean(execution_id)||null;
  action.consumed_at=now;
  out.consumed_authorizations=out.consumed_authorizations??[];
  out.consumed_authorizations.push({...action});
  if(out.pending) delete out.pending[approval_id];
  out.updated_at=now;
  return Object.freeze({state:out,consumed:true,authorization});
}
