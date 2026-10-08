import {serialize,deserialize} from 'node:v8';
import {AtomicV8Journal} from './persistent-runtime.mjs';
import {stableIdempotencyKey} from './continuous-improvement-contract.mjs';

const KIND='METALEARN-METRICS-001';
const PREPROD='PREPROD';
const STAGES=Object.freeze(['collect','learn','evaluate']);
function clone(v){return deserialize(serialize(v));}
function finite(v,l){if(!Number.isFinite(v)||v<0)throw new Error(`invalid ${l}`);return v;}
function validate(sample){
  if(!sample||typeof sample!=='object')throw new Error('meta sample required');
  for(const k of ['company_id','engine_id','environment','version','observed_at'])if(typeof sample[k]!=='string'||!sample[k])throw new Error(`meta sample missing ${k}`);
  if(sample.environment!==PREPROD||sample.engine_id!=='LRN-001')throw new Error('meta metrics accept exact PREPROD LRN-001 only');
  if(Number.isNaN(Date.parse(sample.observed_at)))throw new Error('invalid observed_at');
  for(const stage of STAGES)finite(sample.stage_duration_ms?.[stage],`stage ${stage}`);
  if(sample.prod_authorized!==false||sample.trading_access!==false)throw new Error('meta sample authority expanded');
  return sample;
}
function percentile(values,p){if(values.length===0)return null;const xs=[...values].sort((a,b)=>a-b);return xs[Math.min(xs.length-1,Math.max(0,Math.ceil(p*xs.length)-1))];}

export class MetaObservabilityLedger{
  #journal;#items;
  constructor({file_path}){this.#journal=new AtomicV8Journal({file_path,kind:KIND});this.#items=this.#journal.load();for(const [i,item] of this.#items.entries()){if(item.sequence!==i+1)throw new Error('meta metrics sequence mismatch');validate(item.sample);if(item.sample_id!==stableIdempotencyKey(item.sample))throw new Error('meta sample hash mismatch');}}
  append(sample){
    const safe=clone(validate(sample));const sample_id=stableIdempotencyKey(safe);const prior=this.#items.find(x=>x.sample_id===sample_id);
    if(prior)return Object.freeze({accepted:false,duplicate:true,sequence:prior.sequence,sample_id});
    const item={sequence:this.#items.length+1,sample_id,sample:safe};const next=[...this.#items,item];this.#journal.commit(next);this.#items=next;return Object.freeze({accepted:true,duplicate:false,sequence:item.sequence,sample_id});
  }
  list({company_id,version,limit=100}={}){let xs=this.#items.map(x=>x.sample);if(company_id)xs=xs.filter(x=>x.company_id===company_id);if(version)xs=xs.filter(x=>x.version===version);return clone(xs.slice(-Math.max(1,Math.min(1000,limit))));}
  summarize({company_id,version,limit=100}={}){
    const samples=this.list({company_id,version,limit});const stage_metrics={};
    for(const stage of STAGES){const vals=samples.map(x=>x.stage_duration_ms[stage]);stage_metrics[stage]={mean_ms:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null,p95_ms:percentile(vals,0.95),max_ms:vals.length?Math.max(...vals):null,samples:vals.length};}
    return Object.freeze({schema_version:'1.0.0',company_id,engine_id:'LRN-001',environment:PREPROD,version,samples_total:samples.length,stage_metrics,raw_customer_data_included:false,additional_cost_eur:0,prod_authorized:false,trading_access:false});
  }
  get operation_count(){return this.#items.length;}
}

export function makeMetaTimingSample({company_id,version,observed_at,collect_ms,learn_ms,evaluate_ms,statuses={}}){return Object.freeze({schema_version:'1.0.0',company_id,engine_id:'LRN-001',environment:PREPROD,version,observed_at:new Date(observed_at).toISOString(),stage_duration_ms:{collect:finite(collect_ms,'collect_ms'),learn:finite(learn_ms,'learn_ms'),evaluate:finite(evaluate_ms,'evaluate_ms')},statuses:{...statuses},raw_customer_data_included:false,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false});}
