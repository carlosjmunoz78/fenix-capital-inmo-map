import crypto from 'node:crypto';

const ENV=new Set(['LAB','PREPROD']);
const req=(v,l)=>{if(typeof v!=='string'||!v.trim())throw new TypeError(`${l} required`);return v.trim()};
function ctx(c){if(!c||typeof c!=='object'||Array.isArray(c))throw new TypeError('context required');const o={company_id:req(c.company_id,'company_id'),engine_id:req(c.engine_id,'engine_id'),environment:req(c.environment,'environment'),version:req(c.version,'version')};if(o.engine_id!=='RAG-001')throw new Error('engine_id must be RAG-001');if(!ENV.has(o.environment))throw new Error('RAG-001 V0 is LAB/PREPROD only');return o;}
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const toks=s=>new Set(String(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
const score=(q,t)=>{const a=toks(q),b=toks(t);let n=0;for(const x of a)if(b.has(x))n++;return a.size? n/a.size:0};

export function retrieveEvidence({context,query,documents,limit=5,min_score=0.2}={}){
 const c=ctx(context); const q=req(query,'query');
 if(!Array.isArray(documents))throw new TypeError('documents array required');
 if(!Number.isInteger(limit)||limit<1||limit>20)throw new TypeError('limit must be 1..20');
 const rows=documents.map(d=>{if(!d||typeof d!=='object'||Array.isArray(d))throw new TypeError('document object required');if(d.company_id!==c.company_id)return null;const document_id=req(d.document_id,'document_id'),source_ref=req(d.source_ref,'source_ref'),text=req(d.text,'text');const s=score(q,text);return {document_id,source_ref,text,score:s,evidence_hash:digest({document_id,source_ref,text})};}).filter(Boolean).filter(r=>r.score>=min_score).sort((a,b)=>b.score-a.score||a.document_id.localeCompare(b.document_id)).slice(0,limit);
 if(rows.length===0)return Object.freeze({status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',ready:false,results:Object.freeze([]),knowledge_promotion:false,rule_promotion:false});
 return Object.freeze({status:'GREEN',ready:true,query:q,results:Object.freeze(rows.map(r=>Object.freeze(r))),result_count:rows.length,knowledge_promotion:false,rule_promotion:false,prod_write:false,audit_required:true,additional_cost_target_eur:0});
}

export function buildGroundedAnswerPlan({context,query,retrieval}={}){
 ctx(context); req(query,'query'); if(!retrieval||typeof retrieval!=='object'||Array.isArray(retrieval))throw new TypeError('retrieval required');
 if(retrieval.status!=='GREEN'||!Array.isArray(retrieval.results)||retrieval.results.length===0)return Object.freeze({status:'HUMAN_REQUIRED',reason:'LOW_CONFIDENCE',ready:false});
 const citations=[...new Set(retrieval.results.map(r=>r.source_ref))];
 return Object.freeze({status:'GROUNDING_READY',ready:true,citations:Object.freeze(citations),evidence_hashes:Object.freeze(retrieval.results.map(r=>r.evidence_hash)),answer_generation_allowed:true,knowledge_promotion:false,rule_promotion:false,executed:false});
}

export const RAG001_CONTRACT=Object.freeze({engine_id:'RAG-001',deterministic_retrieval:true,company_isolation:true,requires_source_refs:true,environments:['LAB','PREPROD'],knowledge_promotion:false,rule_promotion:false,prod_write:false,trading_access:false,additional_cost_target_eur:0,autonomous_prod:false});