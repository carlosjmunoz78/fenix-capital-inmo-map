import crypto from 'node:crypto';

const ENV=new Set(['LAB','PREPROD']);
const req=(v,l)=>{if(typeof v!=='string'||!v.trim())throw new TypeError(`${l} required`);return v.trim()};
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function ctx(c){if(!c||typeof c!=='object'||Array.isArray(c))throw new TypeError('context required');const o={company_id:req(c.company_id,'company_id'),engine_id:req(c.engine_id,'engine_id'),environment:req(c.environment,'environment'),version:req(c.version,'version')};if(o.engine_id!=='OBS-001')throw new Error('engine_id must be OBS-001');if(!ENV.has(o.environment))throw new Error('OBS-001 V0 is LAB/PREPROD only');return o;}

export function normalizeObservation({context,observation_id,subject_ref,observed_at,source_ref,kind,payload,confidence,provenance_refs=[]}={}){
  const c=ctx(context);
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new TypeError('payload object required');
  if(!Array.isArray(provenance_refs)||provenance_refs.some(x=>typeof x!=='string'||!x.trim()))throw new TypeError('provenance_refs must be string array');
  const n=Number(confidence);
  if(!Number.isFinite(n)||n<0||n>1)throw new TypeError('confidence must be 0..1');
  const body={observation_id:req(observation_id,'observation_id'),company_id:c.company_id,subject_ref:req(subject_ref,'subject_ref'),observed_at:req(observed_at,'observed_at'),source_ref:req(source_ref,'source_ref'),kind:req(kind,'kind'),payload:structuredClone(payload),confidence:n,provenance_refs:[...provenance_refs]};
  return Object.freeze({...body,evidence_hash:hash(body),knowledge_promotion:false,rule_promotion:false,prod_write:false,audit_required:true,additional_cost_target_eur:0});
}

export class ObservationLedgerV0{
  #rows=new Map();
  append(input){const row=normalizeObservation(input);const old=this.#rows.get(row.observation_id);if(old){if(old.company_id!==row.company_id)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',detail:'cross_company_observation_id'});if(old.evidence_hash!==row.evidence_hash)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',detail:'immutable_observation_conflict'});return Object.freeze({status:'GREEN',decision:'OBSERVATION_IDEMPOTENT',row:structuredClone(old)});}this.#rows.set(row.observation_id,row);return Object.freeze({status:'GREEN',decision:'OBSERVATION_APPENDED',row:structuredClone(row)});}
  list({context,subject_ref}={}){const c=ctx(context);const s=req(subject_ref,'subject_ref');return [...this.#rows.values()].filter(r=>r.company_id===c.company_id&&r.subject_ref===s).map(structuredClone);}
}

export function assessObservationSet({context,observations,min_confidence=0.7,min_count=2}={}){
  ctx(context);
  if(!Array.isArray(observations))throw new TypeError('observations array required');
  if(observations.length<min_count)return Object.freeze({status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',ready:false,detail:'insufficient_observations'});
  if(observations.some(o=>o.company_id!==context.company_id))return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',ready:false,detail:'cross_company_observation'});
  const avg=observations.reduce((a,o)=>a+Number(o.confidence||0),0)/observations.length;
  if(avg<min_confidence)return Object.freeze({status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',ready:false,average_confidence:avg});
  return Object.freeze({status:'GREEN',ready:true,average_confidence:avg,count:observations.length,knowledge_promotion:false,rule_promotion:false});
}

export const OBS001_CONTRACT=Object.freeze({engine_id:'OBS-001',append_only:true,immutable:true,company_isolation:true,environments:['LAB','PREPROD'],knowledge_promotion:false,rule_promotion:false,prod_write:false,trading_access:false,additional_cost_target_eur:0,autonomous_prod:false});