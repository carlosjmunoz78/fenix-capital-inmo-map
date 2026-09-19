import { stableIdempotencyKey } from "./continuous-improvement-contract.mjs";

export function scopedKnowledge({company_id,engine_id,rule_id,scope="COMPANY",context_signature,evidence_refs}) {
  if(!company_id||!engine_id||!rule_id||!context_signature) throw new Error("scope identity required");
  if(!["COMPANY","GLOBAL_CANDIDATE"].includes(scope)) throw new Error("invalid scope");
  if(!Array.isArray(evidence_refs)||evidence_refs.length===0) throw new Error("evidence required");
  return {
    knowledge_id:stableIdempotencyKey({company_id,engine_id,rule_id,scope,context_signature}),
    company_id,engine_id,rule_id,scope,context_signature,evidence_refs,
    cross_company_secrets:false
  };
}

export function transferCandidate({source,target_company_id,target_context_signature,source_contains_secrets=false,context_compatible=false}) {
  if(!source?.knowledge_id||!target_company_id||!target_context_signature) throw new Error("transfer contract incomplete");
  if(source_contains_secrets) return {allowed:false,reason:"SECRET_ISOLATION"};
  if(!context_compatible) return {allowed:false,reason:"CONTEXT_MISMATCH"};
  if(source.scope!=="GLOBAL_CANDIDATE") return {allowed:false,reason:"SOURCE_NOT_TRANSFERABLE"};
  return {
    allowed:true,
    state:"TRANSFER_CANDIDATE",
    source_knowledge_id:source.knowledge_id,
    target_company_id,
    target_context_signature,
    requires_local_validation:true,
    may_copy_raw_company_data:false
  };
}

export function tenantIsolation({request_company_id,record_company_id}) {
  return {allowed:request_company_id===record_company_id,reason:request_company_id===record_company_id?null:"CROSS_COMPANY_DENY"};
}
