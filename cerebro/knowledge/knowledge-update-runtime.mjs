import crypto from 'node:crypto';

const ENV = new Set(['LAB','PREPROD']);
const req = (v,l) => { if(typeof v!=='string'||!v.trim()) throw new TypeError(`${l} required`); return v.trim(); };
const hash = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function ctx(c){
  if(!c||typeof c!=='object'||Array.isArray(c)) throw new TypeError('context required');
  const out={company_id:req(c.company_id,'company_id'),engine_id:req(c.engine_id,'engine_id'),environment:req(c.environment,'environment'),version:req(c.version,'version')};
  if(out.engine_id!=='UPD-001') throw new Error('engine_id must be UPD-001');
  if(!ENV.has(out.environment)) throw new Error('UPD-001 V0 is LAB/PREPROD only');
  return out;
}
function refs(v,l){ if(!Array.isArray(v)||v.length===0||v.some(x=>typeof x!=='string'||!x.trim())) throw new TypeError(`${l} must be non-empty string array`); return [...v]; }

export function proposeKnowledgeUpdate(input={}){
  const c=ctx(input.context);
  const confidence=Number(input.confidence);
  if(!Number.isFinite(confidence)||confidence<0||confidence>1) throw new TypeError('confidence must be 0..1');
  const provenance_refs=refs(input.provenance_refs,'provenance_refs');
  const source_knowledge_ref=req(input.source_knowledge_ref,'source_knowledge_ref');
  const research_dossier_ref=req(input.research_dossier_ref,'research_dossier_ref');
  const proposed_value=structuredClone(input.proposed_value);
  if(proposed_value===undefined) throw new TypeError('proposed_value required');
  if(input.trading_access===true) return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',ready:false});
  if(input.prod_write===true) return Object.freeze({status:'HUMAN_REQUIRED',reason:'HIGH_RISK',ready:false});
  if(input.policy_conflict===true||input.contradicts_validated_knowledge===true) return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',ready:false});
  if(confidence<0.8) return Object.freeze({status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',ready:false});
  const body={company_id:c.company_id,source_knowledge_ref,research_dossier_ref,provenance_refs,confidence,proposed_value,supersedes_ref:input.supersedes_ref?req(input.supersedes_ref,'supersedes_ref'):null,rollback_ref:req(input.rollback_ref,'rollback_ref')};
  return Object.freeze({status:'UPDATE_PROPOSAL_READY',reason:null,ready:true,proposal_hash:hash(body),...body,requires_knw_review:true,requires_prv_verification:true,knowledge_write:false,rule_write:false,prod_write:false,autonomous_prod:false,additional_cost_target_eur:0});
}

export function evaluateKnowledgeUpdatePromotion(input={}){
  const p=proposeKnowledgeUpdate(input);
  if(p.status!=='UPDATE_PROPOSAL_READY') return p;
  const gates={knw_reviewed:input.knw_reviewed===true,prv_verified:input.prv_verified===true,policy_passed:input.policy_passed===true,rollback_verified:input.rollback_verified===true,preprod_passed:input.preprod_passed===true};
  const missing=Object.entries(gates).filter(([,v])=>!v).map(([k])=>k);
  if(missing.length) return Object.freeze({status:'BLOCKED',reason:'POLICY_CONFLICT',ready:false,missing:Object.freeze(missing),proposal_hash:p.proposal_hash,executed:false});
  return Object.freeze({status:'KNOWLEDGE_UPDATE_APPROVED_FOR_KNW',reason:null,ready:true,proposal_hash:p.proposal_hash,target_engine:'KNW-001',executed:false,knowledge_write:false,prod_write:false,autonomous_prod:false,gates:Object.freeze(gates)});
}

export const UPD001_CONTRACT=Object.freeze({engine_id:'UPD-001',environments:['LAB','PREPROD'],minimum_confidence:0.8,requires_provenance:true,requires_research_dossier:true,requires_knw_review:true,requires_rollback:true,direct_knowledge_write:false,direct_rule_write:false,prod_write:false,trading_access:false,additional_cost_target_eur:0,autonomous_prod:false});
