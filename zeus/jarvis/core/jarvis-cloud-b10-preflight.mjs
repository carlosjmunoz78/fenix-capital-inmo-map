/** CUT22 · Independent B10 preflight, never promotes autonomously.
 * Evidence values are proposed references, NOT independent verification.
 * In particular physical location EU jurisdiction is mandatory for real
 * OWNER_ROOT/session data. D1 region != jurisdiction and D1 has no RLS.
 */
export const JARVIS_CLOUD_B10_CHECKS=Object.freeze([
 'real_owner_root_enrolled','b2_session_revocation_live','vault_server_secret_bound',
 'b3_minimum_grant_live','d1_remote_backup_restored','gateway_live_readonly',
 'two_distinct_physical_devices','audit_log_persisted',
 'cost_below_limit_verified','rollback_exercised','old_new_parity',
 'independent_b10_tribunal'
]);
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const status=(s,details)=>Object.freeze({status:s,operational:false,
 prod:'NO_GO',...details});
export function evaluateJarvisCloudB10({
 inventory,evidence,environment='LAB'
}={}){
 if(environment!=='LAB')return status('DENY_NON_LAB',{blockers:['ENVIRONMENT_NOT_LAB']});
 if(!inventory||typeof inventory!=='object'||Array.isArray(inventory))
  return status('HOLD_INVENTORY',{blockers:['INVENTORY_MISSING']});
 const blockers=[];
 if(inventory.plan!=='FREE')blockers.push('CLOUD_COST_PLAN_NOT_FREE');
 if(inventory.name!=='cerebro-jarvis-lab-eu'&&
    inventory.name!=='cerebro-jarvis-lab-cut21')blockers.push('D1_RESOURCE_IDENTITY_UNVERIFIED');
 if(!UUID.test(inventory.databaseId??'')||
    inventory.databaseId==='00000000-0000-0000-0000-000000000000')
    blockers.push('REMOTE_D1_UUID_UNVERIFIED');
 if(inventory.jurisdiction!=='eu')
    blockers.push('EU_JURISDICTION_MISSING');
 if(inventory.remoteStoreVerified!==true)
    blockers.push('REMOTE_PERSISTENCE_UNVERIFIED');
 if(inventory.existingWorkersUntouched!==true)
    blockers.push('EXISTING_WORKERS_NOT_PROTECTED');
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence)){
    blockers.push('EVIDENCE_MISSING');
 }else{
  for(const key of JARVIS_CLOUD_B10_CHECKS){
   const item=evidence[key];
   if(item?.passed!==true||item.environment!=='LAB'||
      typeof item.reference!=='string'||!item.reference.trim()||
      typeof item.observed_at!=='string'||!Number.isFinite(Date.parse(item.observed_at)))
    blockers.push('EVIDENCE_'+key.toUpperCase()+'_MISSING');
  }
 }
 return blockers.length
  ?status('HOLD_GATES',{blockers:Object.freeze(blockers)})
  :status('EVIDENCE_COMPLETE_PENDING_INDEPENDENT_REVIEW',
    {blockers:Object.freeze(['B10_INDEPENDENT_REVIEW_REQUIRED'])});
}
