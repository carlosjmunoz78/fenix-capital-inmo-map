const REQUIRED=Object.freeze(['registry','contracts','dependency_map','runbook','changelog','backup','rebuild','autonomy_state']);
const OWN=Object.prototype.hasOwnProperty;
function human(reason){return Object.freeze({status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false});}
function plain(v,l){if(!v||Object.getPrototypeOf(v)!==Object.prototype)throw new Error(`${l}_PLAIN_OBJECT_REQUIRED`);for(const [k,d] of Object.entries(Object.getOwnPropertyDescriptors(v)))if(d.get||d.set)throw new Error(`${l}.${k}_ACCESSOR_FORBIDDEN`);return v;}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l}_REQUIRED`);return v.trim();}
function artifactDescriptor(value,key){if(typeof value==='string')return Object.freeze({ref:req(value,`ARTIFACT_${key}`),stale:false});plain(value,`ARTIFACT_${key}`);if(!OWN.call(value,'ref'))throw new Error(`ARTIFACT_${key}_REF_REQUIRED`);const ref=req(value.ref,`ARTIFACT_${key}_REF`);if(OWN.call(value,'stale')&&typeof value.stale!=='boolean')throw new Error(`ARTIFACT_${key}_STALE_BOOLEAN_REQUIRED`);return Object.freeze({ref,stale:value.stale===true});}
export function assessDocumentation(input={}){
  plain(input,'INPUT');
  const context=plain(input.context??{},'CONTEXT');
  for(const k of ['company_id','engine_id','environment','version'])if(!OWN.call(context,k))throw new Error(`CONTEXT_${k}_REQUIRED`);
  const company_id=req(context.company_id,'CONTEXT_COMPANY_ID');
  if(req(context.engine_id,'CONTEXT_ENGINE_ID')!=='DOCS-001')throw new Error('UNSAFE_CONTEXT');
  const environment=req(context.environment,'CONTEXT_ENVIRONMENT');
  req(context.version,'CONTEXT_VERSION');
  if(!['LAB','PREPROD'].includes(environment))throw new Error('UNSAFE_CONTEXT');
  if(OWN.call(input,'authorized')&&typeof input.authorized!=='boolean')throw new Error('AUTHORIZED_BOOLEAN_REQUIRED');
  if(input.authorized!==true)return human('POLICY_CONFLICT');
  if(OWN.call(input,'requires_prod_write')&&typeof input.requires_prod_write!=='boolean')throw new Error('REQUIRES_PROD_WRITE_BOOLEAN_REQUIRED');
  if(input.requires_prod_write===true)return human('HIGH_RISK');
  const confidence=input.confidence;
  if(typeof confidence!=='number'||!Number.isFinite(confidence)||confidence<0||confidence>1)throw new Error('CONFIDENCE_INVALID');
  if(confidence<0.75)return human('LOW_CONFIDENCE');
  const artifacts=plain(input.artifacts??{},'ARTIFACTS');
  const normalized={};const missing=[];const stale=[];
  for(const key of REQUIRED){if(!OWN.call(artifacts,key)||artifacts[key]==null||artifacts[key]===''){missing.push(key);continue;}const d=artifactDescriptor(artifacts[key],key);normalized[key]=d;if(d.stale)stale.push(key);}
  const unknown=Object.keys(artifacts).filter(k=>!REQUIRED.includes(k));
  return Object.freeze({status:missing.length||stale.length?'DOCUMENTATION_GAPS':'DOCUMENTATION_COMPLETE',engine_id:'DOCS-001',company_id,environment,required:REQUIRED,missing:Object.freeze(missing),stale:Object.freeze(stale),unknown:Object.freeze(unknown),artifacts:Object.freeze(normalized),msp_compatible:true,autowrite_execute:false,source_of_truth_preserved:true,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0});
}
