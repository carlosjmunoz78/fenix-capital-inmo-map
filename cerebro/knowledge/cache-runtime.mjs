import crypto from 'node:crypto';

const ENV=new Set(['LAB','PREPROD']);
const req=(v,l)=>{if(typeof v!=='string'||!v.trim())throw new TypeError(`${l} required`);return v.trim()};
function ctx(c){if(!c||typeof c!=='object'||Array.isArray(c))throw new TypeError('context required');const o={company_id:req(c.company_id,'company_id'),engine_id:req(c.engine_id,'engine_id'),environment:req(c.environment,'environment'),version:req(c.version,'version')};if(o.engine_id!=='CACHE-001')throw new Error('engine_id must be CACHE-001');if(!ENV.has(o.environment))throw new Error('CACHE-001 V0 is LAB/PREPROD only');return o;}
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');

export class KnowledgeCacheV0{
  #rows=new Map();
  put({context,key,value,source_refs=[],ttl_seconds=300,now_ms=Date.now()}={}){
    const c=ctx(context),k=req(key,'key');
    if(!Array.isArray(source_refs)||source_refs.length===0||source_refs.some(x=>typeof x!=='string'||!x.trim()))throw new TypeError('source_refs required');
    if(!Number.isInteger(ttl_seconds)||ttl_seconds<1||ttl_seconds>86400)throw new TypeError('ttl_seconds must be 1..86400');
    if(value===undefined)throw new TypeError('value required');
    const id=`${c.company_id}:${k}`;
    const row={company_id:c.company_id,key:k,value:structuredClone(value),source_refs:[...source_refs],created_at_ms:Number(now_ms),expires_at_ms:Number(now_ms)+ttl_seconds*1000};
    row.evidence_hash=digest({company_id:row.company_id,key:row.key,value:row.value,source_refs:row.source_refs,created_at_ms:row.created_at_ms,expires_at_ms:row.expires_at_ms});
    this.#rows.set(id,row);
    return Object.freeze({status:'GREEN',decision:'CACHE_STORED',key:k,evidence_hash:row.evidence_hash,prod_write:false,additional_cost_target_eur:0});
  }
  get({context,key,now_ms=Date.now()}={}){
    const c=ctx(context),k=req(key,'key');const id=`${c.company_id}:${k}`;const row=this.#rows.get(id);if(!row)return Object.freeze({status:'MISS',key:k});
    if(Number(now_ms)>=row.expires_at_ms){this.#rows.delete(id);return Object.freeze({status:'EXPIRED',key:k});}
    return Object.freeze({status:'HIT',key:k,value:structuredClone(row.value),source_refs:Object.freeze([...row.source_refs]),evidence_hash:row.evidence_hash,expires_at_ms:row.expires_at_ms});
  }
  invalidate({context,key}={}){const c=ctx(context),k=req(key,'key');const id=`${c.company_id}:${k}`;return Object.freeze({status:'GREEN',decision:this.#rows.delete(id)?'CACHE_INVALIDATED':'CACHE_NOOP',key:k});}
}

export function validateCacheInputSafety({contains_secret=false,contains_credentials=false,contains_personal_sensitive=false}={}){
  if(contains_secret||contains_credentials||contains_personal_sensitive)return Object.freeze({status:'HUMAN_REQUIRED',reason:'SECURITY_INCIDENT',cache_allowed:false});
  return Object.freeze({status:'GREEN',cache_allowed:true});
}

export const CACHE001_CONTRACT=Object.freeze({engine_id:'CACHE-001',company_isolation:true,ttl_required:true,source_refs_required:true,max_ttl_seconds:86400,secrets_forbidden:true,credentials_forbidden:true,environments:['LAB','PREPROD'],knowledge_promotion:false,rule_promotion:false,prod_write:false,trading_access:false,additional_cost_target_eur:0,autonomous_prod:false});