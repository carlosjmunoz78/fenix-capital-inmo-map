import crypto from 'node:crypto';
const ENV=new Set(['LAB','PREPROD']);
const req=(v,l)=>{if(typeof v!=='string'||!v.trim())throw new TypeError(`${l} required`);return v.trim()};
const h=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function ctx(c){if(!c||typeof c!=='object'||Array.isArray(c))throw new TypeError('context required');const o={company_id:req(c.company_id,'company_id'),engine_id:req(c.engine_id,'engine_id'),environment:req(c.environment,'environment'),version:req(c.version,'version')};if(o.engine_id!=='PRV-001')throw new Error('engine_id must be PRV-001');if(!ENV.has(o.environment))throw new Error('PRV-001 V0 is LAB/PREPROD only');return o;}
export function buildProvenance({context,provenance_id,source_type,source_uri,observed_at,validated_by,confidence,subject_ref,metadata={}}={}){
 const c=ctx(context); const n=Number(confidence); if(!Number.isFinite(n)||n<0||n>1)throw new TypeError('confidence must be 0..1');
 const body={provenance_id:req(provenance_id,'provenance_id'),company_id:c.company_id,source_type:req(source_type,'source_type'),source_uri:req(source_uri,'source_uri'),observed_at:req(observed_at,'observed_at'),validated_by:req(validated_by,'validated_by'),confidence:n,subject_ref:req(subject_ref,'subject_ref'),metadata:structuredClone(metadata)};
 return Object.freeze({...body,evidence_hash:h(body),audit_required:true,prod_write:false,additional_cost_target_eur:0});
}
export class ProvenanceLedgerV0{
 #rows=new Map();
 append(input){const row=buildProvenance(input);const old=this.#rows.get(row.provenance_id);if(old){if(old.company_id!==row.company_id)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',detail:'cross_company_provenance_id'});if(old.evidence_hash!==row.evidence_hash)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',detail:'immutable_provenance_conflict'});return Object.freeze({status:'GREEN',decision:'PROVENANCE_IDEMPOTENT',row:structuredClone(old)});}this.#rows.set(row.provenance_id,row);return Object.freeze({status:'GREEN',decision:'PROVENANCE_APPENDED',row:structuredClone(row)});}
 get({context,provenance_id}){const c=ctx(context);const row=this.#rows.get(req(provenance_id,'provenance_id'));if(!row)return null;if(row.company_id!==c.company_id)return Object.freeze({status:'HUMAN_REQUIRED',reason:'POLICY_CONFLICT',detail:'cross_company_read'});return structuredClone(row);}
 verify({context,provenance_id}){const row=this.get({context,provenance_id});if(!row||row.status==='HUMAN_REQUIRED')return row;const {evidence_hash,...rest}=row;delete rest.audit_required;delete rest.prod_write;delete rest.additional_cost_target_eur;return Object.freeze({status:h(rest)===evidence_hash?'GREEN':'HUMAN_REQUIRED',reason:h(rest)===evidence_hash?null:'SECURITY_INCIDENT',verified:h(rest)===evidence_hash});}
}
export const PRV001_CONTRACT=Object.freeze({engine_id:'PRV-001',append_only:true,immutable:true,company_isolation:true,evidence_hash:'SHA-256',environments:['LAB','PREPROD'],prod_write:false,trading_access:false,additional_cost_target_eur:0,autonomous_prod:false});
