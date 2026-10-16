import crypto from 'node:crypto';
import {serialize,deserialize} from 'node:v8';

const PREPROD='PREPROD';
const ENGINE='NOTIF-001';
const VERSION='notif-native-v1';
const PRIORITIES=new Set(['P0','P1','P2','P3']);
const HUMAN_CODES=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const FORBIDDEN=new Set(['email','phone','telephone','mobile','name','first_name','last_name','full_name','address','dni','nif','nie','iban','message','message_text','body','body_text','token','jwt','secret','password','api_key','recipient']);

const clone=v=>deserialize(serialize(v));
function text(v,l,max=200){if(typeof v!=='string'||!v.trim())throw new TypeError(`${l} required`);const x=v.trim();if(x.length>max)throw new TypeError(`${l} too long`);return x;}
function int(v,l,min=0,max=Number.MAX_SAFE_INTEGER){if(!Number.isSafeInteger(v)||v<min||v>max)throw new TypeError(`${l} invalid`);return v;}
function assertPlain(v,l='input',seen=new WeakSet()){
  if(v===null||['string','number','boolean','undefined'].includes(typeof v)){if(typeof v==='number'&&!Number.isFinite(v))throw new TypeError(`${l} nonfinite`);return;}
  if(typeof v!=='object')throw new TypeError(`${l} unsupported`);if(seen.has(v))throw new TypeError(`${l} circular`);seen.add(v);
  try{if(Array.isArray(v)){v.forEach((x,i)=>assertPlain(x,`${l}[${i}]`,seen));return;}const p=Object.getPrototypeOf(v);if(p!==Object.prototype&&p!==null)throw new TypeError(`${l} plain object required`);for(const [k,d] of Object.entries(Object.getOwnPropertyDescriptors(v))){if(d.get||d.set)throw new TypeError(`${l}.${k} accessor forbidden`);if(!d.enumerable)continue;if(FORBIDDEN.has(k.toLowerCase()))throw new Error(`raw PII/message/secret forbidden: ${l}.${k}`);assertPlain(d.value,`${l}.${k}`,seen);}}finally{seen.delete(v);}
}
function stableId(prefix,v){return `${prefix}_${crypto.createHash('sha256').update(serialize(v)).digest('hex').slice(0,24)}`;}
function context(v){assertPlain(v,'context');const c=Object.freeze({company_id:text(v?.company_id,'context.company_id',120),engine_id:text(v?.engine_id,'context.engine_id',80),environment:text(v?.environment,'context.environment',40),version:text(v?.version,'context.version',80)});if(c.environment!==PREPROD)throw new Error('NOTIF_NATIVE_PREPROD_ONLY');if(c.engine_id!==ENGINE)throw new Error('NOTIF_NATIVE_OWNER_MISMATCH');return c;}
function quiet(policy){const now=policy.minute_of_day,start=policy.quiet_start_minute,end=policy.quiet_end_minute;if(start===end)return false;return start<end?(now>=start&&now<end):(now>=start||now<end);}
function delay(policy){if(!quiet(policy))return 0;return policy.quiet_end_minute>policy.minute_of_day?policy.quiet_end_minute-policy.minute_of_day:(1440-policy.minute_of_day)+policy.quiet_end_minute;}
function candidate(raw,c,i){assertPlain(raw,`candidates[${i}]`);const company_id=raw.company_id??c.company_id;if(company_id!==c.company_id)throw new Error('CROSS_COMPANY_NOTIFICATION_DENIED');const priority=text(raw.priority,`candidates[${i}].priority`,10).toUpperCase();if(!PRIORITIES.has(priority))throw new Error('unsupported priority');const human_required=raw.human_required==null?null:text(raw.human_required,`candidates[${i}].human_required`,80).toUpperCase();if(human_required&&!HUMAN_CODES.has(human_required))throw new Error('unsupported human_required');return Object.freeze({notification_key:text(raw.notification_key,`candidates[${i}].notification_key`,200),company_id,source_engine:text(raw.source_engine,`candidates[${i}].source_engine`,80),subject_ref:text(raw.subject_ref,`candidates[${i}].subject_ref`,200),category:text(raw.category,`candidates[${i}].category`,80).toUpperCase(),priority,human_required,due_at_ms:int(raw.due_at_ms,`candidates[${i}].due_at_ms`),requires_attention:raw.requires_attention===true});}

export function planNotifications(input={}){
  assertPlain(input);const c=context(input.context);const raw=input.candidates??[];if(!Array.isArray(raw)||raw.length>500)throw new Error('candidates must be array <=500');const candidates=raw.map((x,i)=>candidate(x,c,i));
  const p=input.policy??{};assertPlain(p,'policy');const policy=Object.freeze({minute_of_day:int(p.minute_of_day??600,'policy.minute_of_day',0,1439),quiet_start_minute:int(p.quiet_start_minute??1260,'policy.quiet_start_minute',0,1439),quiet_end_minute:int(p.quiet_end_minute??540,'policy.quiet_end_minute',0,1439),digest_hour:int(p.digest_hour??8,'policy.digest_hour',0,23),max_digest_items:int(p.max_digest_items??50,'policy.max_digest_items',1,200)});
  const seenRaw=input.seen_notification_keys??[];if(!Array.isArray(seenRaw)||seenRaw.length>5000)throw new Error('seen_notification_keys invalid');const seen=new Set(seenRaw.map((x,i)=>text(x,`seen_notification_keys[${i}]`,200)));
  const decisions=[];for(const n of candidates){let mode,reason,deferred_minutes=0;if(seen.has(n.notification_key)){mode='SUPPRESSED_DUPLICATE';reason='ALREADY_SEEN';}else if(n.human_required||n.priority==='P0'){mode='IMMEDIATE_OPERATOR';reason=n.human_required??'P0_PRIORITY';}else if(quiet(policy)){mode='DEFERRED_QUIET_HOURS';reason='QUIET_HOURS';deferred_minutes=delay(policy);}else if(n.priority==='P1'&&n.requires_attention){mode='IMMEDIATE_OPERATOR';reason='P1_ATTENTION';}else{mode='DIGEST';reason='NON_URGENT_GROUPING';}decisions.push(Object.freeze({...n,mode,reason,deferred_minutes,dispatch_authorized:false,external_side_effect_executed:false}));}
  const digestItems=decisions.filter(x=>x.mode==='DIGEST').slice(0,policy.max_digest_items);const immediate=decisions.filter(x=>x.mode==='IMMEDIATE_OPERATOR');const deferred=decisions.filter(x=>x.mode==='DEFERRED_QUIET_HOURS');const suppressed=decisions.filter(x=>x.mode==='SUPPRESSED_DUPLICATE');
  const plan_id=stableId('notifplan',[c.company_id,VERSION,decisions.map(x=>[x.notification_key,x.mode,x.reason])]);
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_NOTIFICATION_PLAN',model_version:VERSION,context:Object.freeze({...c}),plan_id,summary:Object.freeze({total:decisions.length,immediate:immediate.length,digest:digestItems.length,deferred:deferred.length,suppressed:suppressed.length}),decisions:Object.freeze(decisions),digest:Object.freeze({item_count:digestItems.length,items:Object.freeze(digestItems),dispatch_authorized:false}),operator_interrupt_required:immediate.some(x=>Boolean(x.human_required)||x.priority==='P0'),dispatch_authorized:false,external_side_effect_executed:false,raw_pii_present:false,raw_message_text_present:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
}

export async function notifPlanJobHandler({context:ctx,payload}){return clone(planNotifications({...payload,context:ctx}));}

export const NOTIF_NATIVE_V1_CONTRACT=Object.freeze({engine_id:ENGINE,environment:PREPROD,model_version:VERSION,job_name:'notif.plan',upstream:Object.freeze(['COM-001','SALE-001','HEX-001','SUP-001']),grouping:true,priority:true,quiet_hours:true,dedupe:true,digest:true,human_exception_escalation:true,direct_dispatch_authorized:false,raw_pii_allowed:false,raw_message_text_allowed:false,deterministic_first:true,ai_required:false,prod_writes:false,trading_access:false,additional_cost_target_eur:0});
