import crypto from 'node:crypto';
import {serialize,deserialize} from 'node:v8';

const PREPROD='PREPROD';
const ENGINE='C360-001';
const VERSION='c360-native-v1';
const FORBIDDEN=new Set(['email','phone','telephone','mobile','name','first_name','last_name','full_name','address','postal_address','dni','nif','nie','iban','message','message_text','body','token','jwt','secret','password','api_key','recipient']);
const clone=v=>deserialize(serialize(v));
function text(v,l,max=200){if(typeof v!=='string'||!v.trim())throw new TypeError(`${l} required`);const x=v.trim();if(x.length>max)throw new TypeError(`${l} too long`);return x;}
function num(v,l,min=0,max=1){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw new TypeError(`${l} invalid`);return n;}
function money(v,l){const n=Number(v??0);if(!Number.isFinite(n)||n<0)throw new TypeError(`${l} invalid`);return n;}
function assertPlain(v,l='input',seen=new WeakSet()){
  if(v===null||['string','number','boolean','undefined'].includes(typeof v)){if(typeof v==='number'&&!Number.isFinite(v))throw new TypeError(`${l} nonfinite`);return;}
  if(typeof v!=='object')throw new TypeError(`${l} unsupported`);if(seen.has(v))throw new TypeError(`${l} circular`);seen.add(v);
  try{if(Array.isArray(v)){v.forEach((x,i)=>assertPlain(x,`${l}[${i}]`,seen));return;}const p=Object.getPrototypeOf(v);if(p!==Object.prototype&&p!==null)throw new TypeError(`${l} plain object required`);for(const [k,d] of Object.entries(Object.getOwnPropertyDescriptors(v))){if(d.get||d.set)throw new TypeError(`${l}.${k} accessor forbidden`);if(!d.enumerable)continue;if(FORBIDDEN.has(k.toLowerCase()))throw new Error(`raw PII/message/secret forbidden: ${l}.${k}`);assertPlain(d.value,`${l}.${k}`,seen);}}finally{seen.delete(v);}
}
function stableId(prefix,v){return `${prefix}_${crypto.createHash('sha256').update(serialize(v)).digest('hex').slice(0,24)}`;}
function context(v){assertPlain(v,'context');const c=Object.freeze({company_id:text(v?.company_id,'context.company_id',120),engine_id:text(v?.engine_id,'context.engine_id',80),environment:text(v?.environment,'context.environment',40),version:text(v?.version,'context.version',80)});if(c.environment!==PREPROD)throw new Error('C360_NATIVE_PREPROD_ONLY');if(c.engine_id!==ENGINE)throw new Error('C360_NATIVE_OWNER_MISMATCH');return c;}

export function buildCustomer360Projection(input={}){
  assertPlain(input);const c=context(input.context);const lead=input.lead_signal??{},sale=input.sale_signal??{},communication=input.communication_signal??{},notifications=input.notification_signal??{};
  for(const [label,obj] of [['lead_signal',lead],['sale_signal',sale],['communication_signal',communication],['notification_signal',notifications]])assertPlain(obj,label);
  const lead_ref=text(lead.lead_ref??sale.lead_ref,'lead_ref',200),opportunity_ref=text(sale.opportunity_ref,'opportunity_ref',200);
  const lead_priority=num(lead.lead_priority??sale.lead_priority,'lead_priority'),probability_conversion=num(lead.probability_conversion??sale.probability_conversion,'probability_conversion'),confidence=num(sale.confidence??lead.confidence,'confidence'),estimated_value_eur=money(sale.estimated_value_eur??lead.estimated_value_eur,'estimated_value_eur');
  const next_action=text(sale.next_action,'sale_signal.next_action',80).toUpperCase();const route_status=text(communication.route_status,'communication_signal.route_status',100).toUpperCase();const selected_channel=communication.selected_channel==null?null:text(communication.selected_channel,'communication_signal.selected_channel',80).toUpperCase();
  const notification_mode=text(notifications.notification_mode??'DIGEST','notification_signal.notification_mode',80).toUpperCase();const human_required=notifications.human_required==null?null:text(notifications.human_required,'notification_signal.human_required',80).toUpperCase();
  let lifecycle_stage='NURTURE';if(['CONTACT_NOW','FOLLOW_UP_FAST'].includes(next_action))lifecycle_stage='ACTIVE_SALES';else if(next_action==='FOLLOW_UP')lifecycle_stage='FOLLOW_UP';else if(next_action==='RECOVER_NO_SHOW')lifecycle_stage='RECOVERY';
  const communication_ready=route_status==='READY_FOR_ADAPTER_GATE';const attention_required=Boolean(human_required)||notification_mode==='IMMEDIATE_OPERATOR'||next_action==='RECOVER_NO_SHOW';
  const next_best_action=human_required?'HUMAN_REVIEW':next_action;
  const projection_id=stableId('c360',[c.company_id,lead_ref,opportunity_ref,lead_priority,probability_conversion,confidence,estimated_value_eur,next_action,route_status,selected_channel,notification_mode,human_required]);
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_CUSTOMER360_PROJECTION',model_version:VERSION,context:Object.freeze({...c}),projection_id,customer_ref:lead_ref,lead_ref,opportunity_ref,lifecycle_stage,lead_priority,probability_conversion,confidence,estimated_value_eur,next_action,next_best_action,communication:Object.freeze({route_status,selected_channel,ready:communication_ready,dispatch_authorized:false}),notifications:Object.freeze({mode:notification_mode,human_required,attention_required,dispatch_authorized:false}),attention_required,read_only:true,source_of_truth_replaced:false,crm_write_authorized:false,db_mutation_authorized:false,external_side_effect_executed:false,raw_pii_present:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
}

export function compareCustomer360Projection(a,b){assertPlain(a,'a');assertPlain(b,'b');const same=a?.projection_id===b?.projection_id&&a?.next_best_action===b?.next_best_action&&a?.lifecycle_stage===b?.lifecycle_stage&&a?.communication?.route_status===b?.communication?.route_status;return Object.freeze({status:same?'REPLAY_GREEN':'REPLAY_MISMATCH',replay_green:same,projection_id:a?.projection_id??null,comparison_projection_id:b?.projection_id??null,prod_authorized:false,additional_cost_eur:0});}
export async function c360ProjectionJobHandler({context:ctx,payload}){return clone(buildCustomer360Projection({...payload,context:ctx}));}
export const C360_NATIVE_V1_CONTRACT=Object.freeze({engine_id:ENGINE,environment:PREPROD,model_version:VERSION,job_name:'c360.project',upstream:Object.freeze(['LEAD-001','SALE-001','COM-001','NOTIF-001']),read_only:true,wrap_existing_app_crm_sources:true,source_of_truth_replacement:false,raw_pii_allowed:false,deterministic_first:true,ai_required:false,crm_writes:false,db_mutations:false,prod_writes:false,trading_access:false,additional_cost_target_eur:0});
