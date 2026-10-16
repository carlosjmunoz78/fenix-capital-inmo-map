import {stableIdempotencyKey,validateCanonicalContext} from './continuous-improvement-contract.mjs';

const ENGINE='SALE-001';
const CAP='SALE-NATIVE';
const PREPROD='PREPROD';
const OPS=new Set(['QUALIFY_OPPORTUNITY','BUILD_NEXT_ACTION','BUILD_CADENCE','CLASSIFY_OBJECTION','BUILD_DELIVERY_INTENT','REPLAY_VERIFY']);
const ACTIONS=new Set(['CONTACT_NOW','FOLLOW_UP_FAST','NURTURE','FOLLOW_UP','OBJECTION_RECOVERY','RECOVER_NO_SHOW']);
const OBJECTIONS=new Set(['PRICE','TRUST','TIMING','DOCUMENTATION','COMPETITOR','NO_RESPONSE','NO_SHOW','OTHER']);

const safe=x=>Object.freeze({...x,capability_id:CAP,owner_engine_id:ENGINE,prod_authorized:false,prod_write_authorized:false,crm_write_authorized:false,provider_write_authorized:false,spend_authorized:false,trading_access:false,additional_cost_eur:0});
const req=(v,l,m=300)=>{if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);const out=v.trim();if(out.length>m)throw new Error(`${l} too long`);return out;};
const unit=(v,l)=>{const n=Number(v);if(!Number.isFinite(n)||n<0||n>1)throw new Error(`${l} must be 0..1`);return n;};
const money=(v,l)=>{const n=Number(v??0);if(!Number.isFinite(n)||n<0)throw new Error(`${l} invalid`);return n;};
const integer=(v,l)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<0)throw new Error(`${l} must be a non-negative safe integer`);return n;};

function ctx(x){
  const c={company_id:req(x?.company_id,'company_id',120),engine_id:req(x?.engine_id,'engine_id',80),environment:req(x?.environment,'environment',40),version:req(x?.version,'version',80)};
  const r=validateCanonicalContext(c,{allowProd:false});
  if(!r.ok)throw new Error(`invalid context:${r.errors.join(',')}`);
  if(c.environment!==PREPROD)throw new Error('SALE_NATIVE_PREPROD_ONLY');
  if(c.engine_id!==ENGINE)throw new Error('SALE_NATIVE_OWNER_MISMATCH');
  return Object.freeze(c);
}

function opportunity(x,c){
  if(!x||typeof x!=='object'||Array.isArray(x))throw new Error('opportunity_snapshot required');
  if(x.company_id!=null&&x.company_id!==c.company_id)throw new Error('CROSS_COMPANY_SALE_DENIED');
  return Object.freeze({
    opportunity_ref:req(x.opportunity_ref,'opportunity_ref',200),
    lead_ref:req(x.lead_ref,'lead_ref',200),
    lead_priority:unit(x.lead_priority,'lead_priority'),
    probability_conversion:unit(x.probability_conversion,'probability_conversion'),
    fit:unit(x.fit,'fit'),
    urgency:unit(x.urgency,'urgency'),
    confidence:unit(x.confidence,'confidence'),
    estimated_value_eur:money(x.estimated_value_eur,'estimated_value_eur'),
    high_risk_flag:x.high_risk_flag===true,
    no_show_flag:x.no_show_flag===true
  });
}

const evt=(type,c,payload)=>Object.freeze({type,schema_version:'1.0.0',context:{...c},payload:Object.freeze({...payload}),prod_authorized:false,additional_cost_eur:0});

export function authorizeSaleNativeAction(input={}){
  let c;
  try{c=ctx(input);}catch(e){return safe({authorized:false,reason:String(e.message??e),human_required:null});}
  const operation=String(input.operation??'');
  if(!OPS.has(operation))return safe({authorized:false,reason:'OPERATION_DENIED',human_required:null,context:c});
  if(input.gateway_authorized!==true)return safe({authorized:false,reason:'GATEWAY_AUTH_REQUIRED',human_required:null,context:c});
  if(input.crm_write_requested||input.prod_write_requested||input.provider_write_requested)return safe({authorized:false,reason:'WRITE_NOT_AUTHORIZED_PREPROD',human_required:'HIGH_RISK',context:c});
  if(money(input.requested_spend_eur??0,'requested_spend_eur')>0)return safe({authorized:false,reason:'SPEND_NOT_AUTHORIZED',human_required:'MONEY_LIMIT',context:c});
  if(input.trading_requested)return safe({authorized:false,reason:'TRADING_ISOLATION_DENIED',human_required:null,context:c});
  return safe({authorized:true,reason:'AUTHORIZED_PREPROD',human_required:null,context:c,operation,idempotency_key:stableIdempotencyKey({capability_id:CAP,context:c,operation,request_key:input.request_key??null})});
}

export function qualifyOpportunity({context:raw,opportunity_snapshot}={}){
  const c=ctx(raw),o=opportunity(opportunity_snapshot,c);
  const score=Math.round((o.lead_priority*.30+o.probability_conversion*.30+o.fit*.20+o.urgency*.20)*1000)/1000;
  let next_action=score>=.80?'CONTACT_NOW':score>=.65?'FOLLOW_UP_FAST':score>=.45?'FOLLOW_UP':'NURTURE';
  if(o.no_show_flag)next_action='RECOVER_NO_SHOW';
  const qualification_id=`saleq_${stableIdempotencyKey({context:c,opportunity_ref:o.opportunity_ref,score,next_action,confidence:o.confidence}).slice(0,24)}`;
  if(o.high_risk_flag)return safe({schema_version:'1.0.0',state_type:'CEREBRO_SALE_QUALIFICATION',status:'HUMAN_REQUIRED',human_required:'HIGH_RISK',context:c,qualification_id,opportunity_ref:o.opportunity_ref,lead_ref:o.lead_ref,score,confidence:o.confidence,next_action,event:evt('sale.qualification.human_required',c,{opportunity_ref:o.opportunity_ref,reason:'HIGH_RISK'})});
  if(o.confidence<.5)return safe({schema_version:'1.0.0',state_type:'CEREBRO_SALE_QUALIFICATION',status:'HUMAN_REQUIRED',human_required:'LOW_CONFIDENCE',context:c,qualification_id,opportunity_ref:o.opportunity_ref,lead_ref:o.lead_ref,score,confidence:o.confidence,next_action,event:evt('sale.qualification.human_required',c,{opportunity_ref:o.opportunity_ref,reason:'LOW_CONFIDENCE'})});
  return safe({schema_version:'1.0.0',state_type:'CEREBRO_SALE_QUALIFICATION',status:'QUALIFIED',context:c,qualification_id,opportunity_ref:o.opportunity_ref,lead_ref:o.lead_ref,score,confidence:o.confidence,estimated_value_eur:o.estimated_value_eur,next_action,model:'DETERMINISTIC_HEURISTIC_V1',ai_used:false,event:evt('sale.qualified',c,{opportunity_ref:o.opportunity_ref,score,next_action})});
}

export function buildSalesNextAction({context:raw,qualification}={}){
  const c=ctx(raw);
  if(!qualification||qualification.state_type!=='CEREBRO_SALE_QUALIFICATION'||qualification.context?.company_id!==c.company_id)throw new Error('qualification context mismatch');
  if(qualification.status!=='QUALIFIED')return safe({schema_version:'1.0.0',state_type:'CEREBRO_SALE_NEXT_ACTION',status:'HUMAN_REQUIRED',human_required:qualification.human_required,context:c,opportunity_ref:qualification.opportunity_ref,lead_ref:qualification.lead_ref,action:null});
  if(!ACTIONS.has(qualification.next_action))throw new Error('unsupported next action');
  const action_id=`saleaction_${stableIdempotencyKey({context:c,qualification_id:qualification.qualification_id,next_action:qualification.next_action}).slice(0,24)}`;
  return safe({schema_version:'1.0.0',state_type:'CEREBRO_SALE_NEXT_ACTION',status:'READY',context:c,action_id,opportunity_ref:qualification.opportunity_ref,lead_ref:qualification.lead_ref,action:qualification.next_action,crm_write_authorized:false,event:evt('sale.next_action.ready',c,{action_id,lead_ref:qualification.lead_ref,action:qualification.next_action})});
}

function cadenceOffsets(action){
  if(action==='CONTACT_NOW')return [0,1440,4320];
  if(action==='FOLLOW_UP_FAST')return [0,720,2880];
  if(action==='FOLLOW_UP')return [0,2880,10080];
  if(action==='NURTURE')return [0,10080,30240];
  if(action==='RECOVER_NO_SHOW')return [0,180,1440];
  if(action==='OBJECTION_RECOVERY')return [0,1440,4320];
  throw new Error('unsupported cadence action');
}

export function buildSalesCadence({context:raw,action}={}){
  const c=ctx(raw);
  if(!action||action.state_type!=='CEREBRO_SALE_NEXT_ACTION'||action.context?.company_id!==c.company_id||action.status!=='READY')throw new Error('ready sale action required');
  const offsets=cadenceOffsets(action.action);
  const steps=Object.freeze(offsets.map((offset_minutes,index)=>Object.freeze({step:index+1,commercial_action:action.action,offset_minutes,dispatch_authorized:false,target_engine:'COM-001'})));
  const cadence_id=`salecad_${stableIdempotencyKey({context:c,action_id:action.action_id,steps}).slice(0,24)}`;
  return safe({schema_version:'1.0.0',state_type:'CEREBRO_SALE_CADENCE',status:'READY',context:c,cadence_id,lead_ref:action.lead_ref,opportunity_ref:action.opportunity_ref,steps,dispatch_authorized:false,event:evt('sale.cadence.ready',c,{cadence_id,lead_ref:action.lead_ref,step_count:steps.length})});
}

export function classifySalesObjection({context:raw,lead_ref,opportunity_ref,objection_code}={}){
  const c=ctx(raw),code=req(objection_code,'objection_code',80).toUpperCase();
  if(!OBJECTIONS.has(code))throw new Error('unsupported objection_code');
  const recovery_action=code==='NO_SHOW'?'RECOVER_NO_SHOW':'OBJECTION_RECOVERY';
  const objection_id=`saleobj_${stableIdempotencyKey({context:c,lead_ref:req(lead_ref,'lead_ref',200),opportunity_ref:req(opportunity_ref,'opportunity_ref',200),code}).slice(0,24)}`;
  return safe({schema_version:'1.0.0',state_type:'CEREBRO_SALE_OBJECTION',status:'CLASSIFIED',context:c,objection_id,lead_ref,opportunity_ref,objection_code:code,recovery_action,ai_used:false,event:evt('sale.objection.classified',c,{objection_id,objection_code:code,recovery_action})});
}

export function buildDeliveryIntent({context:raw,action,base_time_ms}={}){
  const c=ctx(raw),base=integer(base_time_ms,'base_time_ms');
  if(!action||action.state_type!=='CEREBRO_SALE_NEXT_ACTION'||action.context?.company_id!==c.company_id||action.status!=='READY')throw new Error('ready sale action required');
  if(!ACTIONS.has(action.action))throw new Error('unsupported delivery action');
  const due_at_ms=base;
  const delivery_intent_id=`delivery_${stableIdempotencyKey({context:c,action_id:action.action_id,due_at_ms,target_engine:'COM-001'}).slice(0,24)}`;
  return safe({schema_version:'1.0.0',state_type:'CEREBRO_SALE_DELIVERY_INTENT',status:'READY_FOR_COM_ROUTER',context:c,delivery_intent_id,lead_ref:action.lead_ref,opportunity_ref:action.opportunity_ref,target_engine:'COM-001',commercial_action:action.action,due_at_ms,dispatch_authorized:false,external_side_effect_executed:false,raw_contact_data_present:false,event:evt('sale.delivery_intent.ready',c,{delivery_intent_id,lead_ref:action.lead_ref,commercial_action:action.action})});
}

export function verifySaleAction(action,qualification){
  if(!action||action.state_type!=='CEREBRO_SALE_NEXT_ACTION'||action.status!=='READY')throw new Error('ready sale action required');
  const c=ctx(action.context);
  const expected=`saleaction_${stableIdempotencyKey({context:c,qualification_id:qualification.qualification_id,next_action:qualification.next_action}).slice(0,24)}`;
  const replay_green=expected===action.action_id;
  return safe({status:replay_green?'REPLAY_GREEN':'REPLAY_MISMATCH',context:c,replay_green,expected_action_id:expected,action_id:action.action_id});
}

export async function executeSaleNativeAction(input={}){
  const a=authorizeSaleNativeAction(input);
  if(!a.authorized)return a;
  const c=a.context;
  if(a.operation==='QUALIFY_OPPORTUNITY')return qualifyOpportunity({context:c,opportunity_snapshot:input.opportunity_snapshot});
  if(a.operation==='BUILD_NEXT_ACTION')return buildSalesNextAction({context:c,qualification:input.qualification});
  if(a.operation==='BUILD_CADENCE')return buildSalesCadence({context:c,action:input.action});
  if(a.operation==='CLASSIFY_OBJECTION')return classifySalesObjection({context:c,lead_ref:input.lead_ref,opportunity_ref:input.opportunity_ref,objection_code:input.objection_code});
  if(a.operation==='BUILD_DELIVERY_INTENT')return buildDeliveryIntent({context:c,action:input.action,base_time_ms:input.base_time_ms});
  if(a.operation==='REPLAY_VERIFY')return verifySaleAction(input.action,input.qualification);
  throw new Error('unreachable');
}

export const SALE_NATIVE_V1_CONTRACT=Object.freeze({
  schema_version:'1.0.0',capability_id:CAP,owner_engine_id:ENGINE,environment:PREPROD,version:'1.0.0',operations:Object.freeze([...OPS]),
  upstream:Object.freeze(['LEAD-001']),downstream:Object.freeze(['COM-001','NBA-001','C360-001','CRM-001','LRN-001','OBSERV-001','FINOPS-001']),
  method:'DETERMINISTIC_FIRST',ai_required:false,crm_write_authorized:false,provider_write_authorized:false,direct_dispatch_authorized:false,
  new_engine_created:false,new_paid_subscription_required:false,prod_authorized:false,trading_access:false,additional_cost_target_eur:0
});
