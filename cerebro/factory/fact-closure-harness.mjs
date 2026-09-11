const HUMAN_REQUIRED = new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const STATES = ['DEFINED','STRUCTURAL_GREEN','PREPROD_GREEN','LIVE_EVIDENCE','PROD_AUTONOMY'];
const REQUIRED_DOCS = Object.freeze(['ENGINE_REGISTRY','DEPENDENCY_MAP','RUNBOOK','CHANGELOG','BACKUP_REBUILD','AUTONOMY_STATE']);

function reqString(v,l){if(typeof v!=='string'||!v.trim())throw new TypeError(`${l} required`);return v.trim()}
function plain(v,l){if(!v||typeof v!=='object'||Array.isArray(v))throw new TypeError(`${l} must be object`);return v}
function strictBool(v,l){if(typeof v!=='boolean')throw new TypeError(`${l} must be boolean`);return v}
function refs(v,l){if(v===undefined)return[];if(!Array.isArray(v)||v.some(x=>typeof x!=='string'||!x.trim()))throw new TypeError(`${l} must be string array`);return [...v]}

export function classifyEngineState(input={}){
  const i=plain(input,'input');
  const context=plain(i.context,'context');
  const company_id=reqString(context.company_id,'context.company_id');
  const engine_id=reqString(context.engine_id,'context.engine_id');
  const environment=reqString(context.environment,'context.environment');
  const version=reqString(context.version,'context.version');
  if(i.trading_access===true)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',state:'DEFINED',company_id,engine_id,environment,version});
  if(i.prod_write===true)return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',state:'DEFINED',company_id,engine_id,environment,version});

  const structural=['scaffold_complete','contracts','permissions','tests'].every(k=>i[k]===true);
  const preprod=structural&&['evaluation','tribunal','observability','backup','rollback','rebuild','cost','policy','preprod'].every(k=>i[k]===true);
  const liveRefs=refs(i.live_evidence_refs,'live_evidence_refs');
  const live=preprod&&liveRefs.length>0;
  const prod=live&&i.autonomy_approved===true&&i.prod_promotion_approved===true;
  const state=prod?'PROD_AUTONOMY':live?'LIVE_EVIDENCE':preprod?'PREPROD_GREEN':structural?'STRUCTURAL_GREEN':'DEFINED';
  return Object.freeze({status:'OK',reason:null,state,company_id,engine_id,environment,version,live_evidence_count:liveRefs.length,prod_execution:false});
}

export function buildFactoryDocumentationClosure(input={}){
  const i=plain(input,'input');
  const updated=plain(i.updated,'updated');
  const missing=REQUIRED_DOCS.filter(k=>updated[k]!==true);
  return Object.freeze({status:missing.length?'BLOCKED':'DOCUMENTATION_READY',reason:missing.length?'POLICY_CONFLICT':null,required:[...REQUIRED_DOCS],missing,auto_write:false});
}

export function evaluateFactoryClosure(input={}){
  const i=plain(input,'input');
  const context=plain(i.context,'context');
  for(const k of ['company_id','engine_id','environment','version'])reqString(context[k],`context.${k}`);
  if(context.engine_id!=='FACT-001')throw new Error('closure harness is FACT-001 only');
  if(context.environment!=='PREPROD')return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',ready:false});
  if(i.trading===true)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',ready:false});
  if(i.additional_cost_eur!==undefined){if(!Number.isFinite(i.additional_cost_eur)||i.additional_cost_eur<0)throw new TypeError('additional_cost_eur invalid');if(i.additional_cost_eur>0)return Object.freeze({status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT',ready:false})}
  const gates={
    factory_e2e:i.factory_e2e===true,
    self_test:i.self_test===true,
    rebuild_equivalent:i.rebuild_equivalent===true,
    old_vs_new:i.old_vs_new===true,
    rollback_verified:i.rollback_verified===true,
    registry_state_tracking:i.registry_state_tracking===true,
    dependency_map:i.dependency_map===true,
    docs_closure:i.docs_closure===true,
    promotion_gate:i.promotion_gate===true,
    cost_gate:i.cost_gate===true,
    preprod:i.preprod===true
  };
  const missing=Object.entries(gates).filter(([,v])=>!v).map(([k])=>k);
  if(missing.length)return Object.freeze({status:'BLOCKED',reason:'POLICY_CONFLICT',ready:false,missing:Object.freeze(missing),gates:Object.freeze(gates)});
  return Object.freeze({status:'FACTORY_CLOSURE_READY',reason:null,ready:true,gates:Object.freeze(gates),prod_execution:false,autonomous_prod:false,required_human_reasons:Object.freeze([...HUMAN_REQUIRED]),state_model:Object.freeze([...STATES])});
}

export const FACTORY_STATE_MODEL = Object.freeze([...STATES]);
export const FACTORY_REQUIRED_DOCS = REQUIRED_DOCS;