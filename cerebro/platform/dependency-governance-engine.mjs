import fs from 'node:fs';
const OWN=Object.prototype.hasOwnProperty;
const registry=JSON.parse(fs.readFileSync(new URL('../registry/engine-registry.seed.json',import.meta.url),'utf8'));
const CANONICAL=new Set(registry.engine_ids);
const TYPES=new Set(['READ','WRITE_PLAN','EVENT','JOB','API','DATA','CONTROL','OBSERVABILITY','BACKUP','REBUILD','GATEWAY']);
function human(reason){return Object.freeze({status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false});}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l}_REQUIRED`);return v.trim();}
function plain(v,l){if(!v||Object.getPrototypeOf(v)!==Object.prototype)throw new Error(`${l}_PLAIN_OBJECT_REQUIRED`);for(const [k,d] of Object.entries(Object.getOwnPropertyDescriptors(v)))if(d.get||d.set)throw new Error(`${l}.${k}_ACCESSOR_FORBIDDEN`);return v;}
function bool(v,l,def=false){if(v===undefined)return def;if(typeof v!=='boolean')throw new Error(`${l}_BOOLEAN_REQUIRED`);return v;}
export function assessDependency(input={}){
  plain(input,'INPUT');const context=plain(input.context??{},'CONTEXT');
  for(const k of ['company_id','engine_id','environment','version'])if(!OWN.call(context,k))throw new Error(`CONTEXT_${k}_REQUIRED`);
  const company_id=req(context.company_id,'CONTEXT_COMPANY_ID');if(req(context.engine_id,'CONTEXT_ENGINE_ID')!=='DEP-001')throw new Error('UNSAFE_CONTEXT');const environment=req(context.environment,'CONTEXT_ENVIRONMENT');req(context.version,'CONTEXT_VERSION');if(!['LAB','PREPROD'].includes(environment))throw new Error('UNSAFE_CONTEXT');
  const source_refs=input.source_refs;if(!Array.isArray(source_refs)||source_refs.length===0)throw new Error('EVIDENCE_REQUIRED');const refs=source_refs.map((x,i)=>req(x,`SOURCE_REFS_${i}`));
  if(bool(input.authorized,'AUTHORIZED',false)!==true)return human('POLICY_CONFLICT');if(bool(input.requires_prod_write,'REQUIRES_PROD_WRITE',false))return human('HIGH_RISK');
  const confidence=input.confidence;if(typeof confidence!=='number'||!Number.isFinite(confidence)||confidence<0||confidence>1)throw new Error('CONFIDENCE_INVALID');if(confidence<0.8)return human('LOW_CONFIDENCE');
  const dependency=plain(input.dependency??{},'DEPENDENCY');const from_engine=req(dependency.from_engine,'FROM_ENGINE');const to_engine=req(dependency.to_engine,'TO_ENGINE');const type=req(dependency.type,'TYPE');
  if(!CANONICAL.has(from_engine)||!CANONICAL.has(to_engine))throw new Error('NONCANONICAL_ENGINE');if(from_engine===to_engine)throw new Error('SELF_DEPENDENCY');if(!TYPES.has(type))throw new Error('INVALID_DEPENDENCY_TYPE');
  const cross_company=bool(dependency.cross_company,'CROSS_COMPANY',false);const critical=bool(dependency.critical,'CRITICAL',false);const rollback_defined=bool(dependency.rollback_defined,'ROLLBACK_DEFINED',false);if(cross_company)return human('POLICY_CONFLICT');if(critical&&!rollback_defined)return human('HIGH_RISK');
  return Object.freeze({status:'DEPENDENCY_VALID',engine_id:'DEP-001',company_id,environment,from_engine,to_engine,type,critical,rollback_defined,cross_company:false,canonical_engines_verified:true,mutation:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0,source_refs:Object.freeze(refs)});
}
