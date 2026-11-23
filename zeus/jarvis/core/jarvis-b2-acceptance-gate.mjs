/** B2 evidence gate. This does not self-certify infrastructure; external evidence is mandatory. */
export const B2_EVIDENCE_KEYS=Object.freeze([
 'owner_root_binding_live','session_a_authenticated','session_b_authenticated',
 'durable_store_live','atomic_idempotency_live','gateway_live_protected',
 'same_mission_cross_device','restart_recovered','concurrency_no_duplicate',
 'tenant_isolation','snapshot_restored','rollback_exercised','audit_evidence_persisted'
]);
export function evaluateB2OperationalAcceptance({evidence,environment='LAB'}={}){
 if(!['LAB','PREPROD','PROD'].includes(environment))throw new TypeError('ENVIRONMENT_INVALID');
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))throw new TypeError('EVIDENCE_REQUIRED');
 const missing=[],invalid=[];
 for(const key of B2_EVIDENCE_KEYS){
   const item=evidence[key];
   if(item===undefined||item===null){missing.push(key);continue;}
   if(typeof item!=='object'||Array.isArray(item)||item.passed!==true||
      typeof item.reference!=='string'||!item.reference.trim()||
      typeof item.observed_at!=='string'||!Number.isFinite(Date.parse(item.observed_at))||
      item.environment!==environment){invalid.push(key);}
 }
 return Object.freeze({block:'B2',environment,status:missing.length||invalid.length?'NO_GO':'EVIDENCE_COMPLETE_PENDING_INDEPENDENT_REVIEW',
  operational:false,missing:Object.freeze(missing),invalid:Object.freeze(invalid)});
}
