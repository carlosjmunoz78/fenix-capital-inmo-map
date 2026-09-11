const STATES=['DEFINED','STRUCTURAL_GREEN','PREPROD_GREEN','LIVE_EVIDENCE','PROD_AUTONOMY'];
const STATE_RANK=new Map(STATES.map((s,i)=>[s,i]));
const REQUIRED_DOCS=['ENGINE_REGISTRY','DEPENDENCY_MAP','RUNBOOK','CHANGELOG','BACKUP_REBUILD','AUTONOMY_STATE'];
function req(v,l){if(typeof v!=='string'||!v.trim())throw new TypeError(`${l} required`);return v.trim()}
function obj(v,l){if(!v||typeof v!=='object'||Array.isArray(v))throw new TypeError(`${l} object required`);return v}
function bool(v,l){if(typeof v!=='boolean')throw new TypeError(`${l} boolean required`);return v}
export function deriveEngineState(input={}){
  const i=obj(input,'input');
  const engine_id=req(i.engine_id,'engine_id');
  const context=obj(i.context,'context');
  for(const k of ['company_id','environment','version'])req(context[k],`context.${k}`);
  if(i.trading_access===true)return Object.freeze({engine_id,state:'DEFINED',status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT'});
  if(i.prod_write===true&&i.prod_promotion_approved!==true)return Object.freeze({engine_id,state:'DEFINED',status:'HUMAN_REQUIRED',reason:'HIGH_RISK'});
  const structural=['scaffold_complete','contracts','permissions','tests'].every(k=>i[k]===true);
  const preprod=structural&&['evaluation','tribunal','observability','backup','rollback','rebuild','cost','policy','preprod'].every(k=>i[k]===true);
  const live=preprod&&Array.isArray(i.live_evidence_refs)&&i.live_evidence_refs.length>0&&i.live_evidence_refs.every(x=>typeof x==='string'&&x.trim());
  const prod=live&&i.autonomy_approved===true&&i.prod_promotion_approved===true;
  return Object.freeze({engine_id,state:prod?'PROD_AUTONOMY':live?'LIVE_EVIDENCE':preprod?'PREPROD_GREEN':structural?'STRUCTURAL_GREEN':'DEFINED',status:'OK',reason:null});
}
export function buildEngineStatusRegistry({canonical_engine_ids,records=[]}={}){
  if(!Array.isArray(canonical_engine_ids)||!canonical_engine_ids.length)throw new TypeError('canonical_engine_ids required');
  if(!Array.isArray(records))throw new TypeError('records array required');
  const ids=new Set(canonical_engine_ids.map((x,i)=>req(x,`canonical_engine_ids[${i}]`)));
  if(ids.size!==canonical_engine_ids.length)throw new Error('duplicate canonical engine id');
  const byId=new Map([...ids].map(id=>[id,{engine_id:id,state:'DEFINED',evidence_refs:[]} ]));
  for(const r0 of records){const r=obj(r0,'record');const id=req(r.engine_id,'record.engine_id');if(!ids.has(id))throw new Error(`unknown engine_id: ${id}`);const state=req(r.state,'record.state');if(!STATE_RANK.has(state))throw new Error(`invalid state: ${state}`);const prev=byId.get(id);if(STATE_RANK.get(state)<STATE_RANK.get(prev.state))throw new Error(`state regression forbidden for ${id}`);const refs=r.evidence_refs??[];if(!Array.isArray(refs)||refs.some(x=>typeof x!=='string'||!x.trim()))throw new TypeError('record.evidence_refs string array required');byId.set(id,{engine_id:id,state,evidence_refs:[...new Set([...prev.evidence_refs,...refs])]});}
  const engines=[...byId.values()].sort((a,b)=>a.engine_id.localeCompare(b.engine_id));
  const counts=Object.fromEntries(STATES.map(s=>[s,engines.filter(e=>e.state===s).length]));
  return Object.freeze({schema_version:'1.0.0',engine_count:engines.length,state_model:[...STATES],counts,engines,autonomous_prod:false});
}
export function buildDocumentationUpdatePlan({updated={}}={}){
  obj(updated,'updated');
  const status=Object.fromEntries(REQUIRED_DOCS.map(k=>[k,updated[k]===true]));
  const missing=REQUIRED_DOCS.filter(k=>status[k]!==true);
  return Object.freeze({status:missing.length?'BLOCKED':'DOCS_SYNC_READY',reason:missing.length?'POLICY_CONFLICT':null,required:[...REQUIRED_DOCS],missing,write_prod:false,auto_merge:false});
}
export function assertMonotonicTransition(from,to){req(from,'from');req(to,'to');if(!STATE_RANK.has(from)||!STATE_RANK.has(to))throw new Error('invalid state');if(STATE_RANK.get(to)<STATE_RANK.get(from))throw new Error('state regression forbidden');return true}
export const ENGINE_STATE_MODEL=Object.freeze([...STATES]);
